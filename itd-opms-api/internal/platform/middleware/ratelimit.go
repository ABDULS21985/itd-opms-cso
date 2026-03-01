package middleware

import (
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// RateLimitConfig holds configuration for the token-bucket rate limiter.
type RateLimitConfig struct {
	// Rate is the number of requests allowed per window.
	Rate int
	// Window is the time window for the rate limit.
	Window time.Duration
	// KeyPrefix distinguishes different rate limit scopes (e.g. "rl:ip:", "rl:user:").
	KeyPrefix string
}

// rateLimitScript is a Lua script that implements a sliding-window token bucket
// in Redis. It atomically increments the counter and sets TTL on first use.
var rateLimitScript = redis.NewScript(`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call("INCR", key)
if current == 1 then
    redis.call("EXPIRE", key, window)
end

if current > limit then
    return 0
end
return 1
`)

// RateLimit returns a middleware that limits the request rate per client.
// If the user is authenticated (AuthContext is present), the rate limit is
// keyed by user ID. Otherwise it falls back to the client's IP address.
// When the limit is exceeded the middleware returns 429 Too Many Requests.
func RateLimit(rdb *redis.Client, cfg RateLimitConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			key := buildRateLimitKey(cfg.KeyPrefix, r)

			windowSec := int(cfg.Window.Seconds())
			if windowSec < 1 {
				windowSec = 60
			}

			allowed, err := rateLimitScript.Run(ctx, rdb, []string{key},
				cfg.Rate, windowSec,
			).Int()
			if err != nil {
				// If Redis is unavailable, log the error but allow the request
				// through to avoid a total outage.
				slog.Error("rate limiter: redis error, allowing request",
					"error", err.Error(),
					"key", key,
					"correlation_id", types.GetCorrelationID(ctx),
				)
				next.ServeHTTP(w, r)
				return
			}

			if allowed == 0 {
				slog.Warn("rate limit exceeded",
					"key", key,
					"rate", cfg.Rate,
					"window", cfg.Window.String(),
					"correlation_id", types.GetCorrelationID(ctx),
				)
				w.Header().Set("Retry-After", fmt.Sprintf("%d", windowSec))
				types.ErrorMessage(w, http.StatusTooManyRequests,
					"RATE_LIMITED", "Too many requests. Please try again later.",
				)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimitByIP is a convenience constructor for per-IP rate limiting.
func RateLimitByIP(rdb *redis.Client, rate int, window time.Duration) func(http.Handler) http.Handler {
	return RateLimit(rdb, RateLimitConfig{
		Rate:      rate,
		Window:    window,
		KeyPrefix: "rl:ip:",
	})
}

// RateLimitByUser is a convenience constructor for per-user rate limiting.
// Falls back to per-IP if the user is not authenticated.
func RateLimitByUser(rdb *redis.Client, rate int, window time.Duration) func(http.Handler) http.Handler {
	return RateLimit(rdb, RateLimitConfig{
		Rate:      rate,
		Window:    window,
		KeyPrefix: "rl:user:",
	})
}

// buildRateLimitKey constructs the Redis key for rate limiting.
// Uses user_id if authenticated, otherwise the client IP.
func buildRateLimitKey(prefix string, r *http.Request) string {
	if authCtx := types.GetAuthContext(r.Context()); authCtx != nil {
		return prefix + authCtx.UserID.String()
	}
	return prefix + clientIP(r)
}

// clientIP extracts the client's IP address from the request, preferring
// X-Forwarded-For and X-Real-IP headers over the direct remote address.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take the first IP in the chain.
		if ip, _, err := net.SplitHostPort(xff); err == nil {
			return ip
		}
		return xff
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
