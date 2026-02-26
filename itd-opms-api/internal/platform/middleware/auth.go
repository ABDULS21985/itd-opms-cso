package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type authContextKey string

const publicRouteKey authContextKey = "public_route"

// Auth returns a middleware that validates JWT Bearer tokens from the
// Authorization header. On success it populates the request context with
// an AuthContext containing the user's identity, roles, and permissions.
// If the route is marked as public via the PublicRoute middleware, the
// auth check is skipped.
func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for routes marked as public.
			if isPublic, ok := r.Context().Value(publicRouteKey).(bool); ok && isPublic {
				next.ServeHTTP(w, r)
				return
			}

			tokenString := extractBearerToken(r)
			if tokenString == "" {
				slog.Warn("missing or malformed authorization header",
					"path", r.URL.Path,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusUnauthorized,
					"UNAUTHORIZED", "Missing or invalid authorization token",
				)
				return
			}

			claims, err := auth.ValidateToken(tokenString, jwtSecret)
			if err != nil {
				slog.Warn("invalid JWT token",
					"error", err.Error(),
					"path", r.URL.Path,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusUnauthorized,
					"UNAUTHORIZED", "Invalid or expired token",
				)
				return
			}

			authCtx := &types.AuthContext{
				UserID:      claims.UserID,
				TenantID:    claims.TenantID,
				Email:       claims.Email,
				Roles:       claims.Roles,
				Permissions: claims.Permissions,
			}

			ctx := types.SetAuthContext(r.Context(), authCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// PublicRoute marks the wrapped routes as public so the Auth middleware
// will skip token validation. Use this inside a chi.Route group:
//
//	r.Group(func(r chi.Router) {
//	    r.Use(middleware.PublicRoute)
//	    r.Post("/login", handler.Login)
//	})
func PublicRoute(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), publicRouteKey, true)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// extractBearerToken pulls the token from the "Authorization: Bearer <token>"
// header.
func extractBearerToken(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if header == "" {
		return ""
	}

	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}
