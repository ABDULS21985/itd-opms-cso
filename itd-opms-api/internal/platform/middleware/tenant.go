package middleware

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type tenantContextKey string

const tenantIDKey tenantContextKey = "tenant_id"

// SetTenantID stores the validated tenant ID in the context.
func SetTenantID(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, tenantIDKey, tenantID)
}

// GetTenantID retrieves the tenant ID from the context.
func GetTenantID(ctx context.Context) uuid.UUID {
	if id, ok := ctx.Value(tenantIDKey).(uuid.UUID); ok {
		return id
	}
	return uuid.Nil
}

// Tenant returns a middleware that extracts the tenant_id from the
// authenticated user's AuthContext, validates that the tenant exists in the
// database, and stores the validated tenant_id in the request context for
// downstream handlers.
func Tenant(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authCtx := types.GetAuthContext(r.Context())
			if authCtx == nil {
				slog.Warn("tenant middleware: no auth context found",
					"path", r.URL.Path,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusUnauthorized,
					"UNAUTHORIZED", "Authentication required",
				)
				return
			}

			if authCtx.TenantID == uuid.Nil {
				slog.Warn("tenant middleware: missing tenant_id in auth context",
					"user_id", authCtx.UserID,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusBadRequest,
					"BAD_REQUEST", "Tenant ID is required",
				)
				return
			}

			// Validate that the tenant exists and is active.
			var exists bool
			err := pool.QueryRow(r.Context(),
				"SELECT EXISTS(SELECT 1 FROM tenants WHERE id = $1 AND is_active = true)",
				authCtx.TenantID,
			).Scan(&exists)
			if err != nil {
				slog.Error("tenant middleware: database query failed",
					"error", err.Error(),
					"tenant_id", authCtx.TenantID,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusInternalServerError,
					"INTERNAL_ERROR", "Failed to validate tenant",
				)
				return
			}

			if !exists {
				slog.Warn("tenant middleware: tenant not found or inactive",
					"tenant_id", authCtx.TenantID,
					"user_id", authCtx.UserID,
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				types.ErrorMessage(w, http.StatusForbidden,
					"FORBIDDEN", "Tenant not found or inactive",
				)
				return
			}

			ctx := SetTenantID(r.Context(), authCtx.TenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
