package middleware

import (
	"log/slog"
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// Logging is a middleware that logs structured information about every HTTP
// request and its response using slog. It records the method, path, status
// code, duration, remote address, and correlation ID.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		correlationID := types.GetCorrelationID(r.Context())
		statusCode := wrapped.Status()
		if statusCode == 0 {
			statusCode = http.StatusOK
		}

		attrs := []slog.Attr{
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", statusCode),
			slog.String("duration", duration.String()),
			slog.String("remote_addr", r.RemoteAddr),
			slog.String("correlation_id", correlationID),
		}

		level := slog.LevelInfo
		if statusCode >= 500 {
			level = slog.LevelError
		} else if statusCode >= 400 {
			level = slog.LevelWarn
		}

		slog.LogAttrs(r.Context(), level, "http request",
			attrs...,
		)
	})
}
