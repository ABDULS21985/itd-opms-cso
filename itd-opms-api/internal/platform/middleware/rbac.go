package middleware

import (
	"log/slog"
	"net/http"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// RequirePermission returns a chi-compatible middleware that verifies the
// authenticated user has the specified permission. Returns 403 Forbidden
// if the permission is not present.
func RequirePermission(permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authCtx := types.GetAuthContext(r.Context())
			if authCtx == nil {
				types.ErrorMessage(w, http.StatusUnauthorized,
					"UNAUTHORIZED", "Authentication required",
				)
				return
			}

			if !authCtx.HasPermission(permission) {
				slog.Warn("permission denied",
					"required_permission", permission,
					"user_id", authCtx.UserID,
					"user_permissions", authCtx.Permissions,
					"path", r.URL.Path,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusForbidden,
					"FORBIDDEN", "You do not have the required permission: "+permission,
				)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireRole returns a chi-compatible middleware that verifies the
// authenticated user has the specified role. Returns 403 Forbidden
// if the role is not present.
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authCtx := types.GetAuthContext(r.Context())
			if authCtx == nil {
				types.ErrorMessage(w, http.StatusUnauthorized,
					"UNAUTHORIZED", "Authentication required",
				)
				return
			}

			if !authCtx.HasRole(role) {
				slog.Warn("role check failed",
					"required_role", role,
					"user_id", authCtx.UserID,
					"user_roles", authCtx.Roles,
					"path", r.URL.Path,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusForbidden,
					"FORBIDDEN", "You do not have the required role: "+role,
				)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
