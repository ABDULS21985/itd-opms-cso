package middleware

import (
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// OrgScope resolves the authenticated user's organizational visibility scope
// and enriches the AuthContext with OrgUnitID, OrgLevel, VisibleOrgIDs, and
// IsGlobalScope. Must run after AuthDualMode (which populates AuthContext).
//
// During rollout this middleware is fail-open: if scope resolution fails,
// the request continues with tenant-only scope (no org filtering).
func OrgScope(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authCtx := types.GetAuthContext(r.Context())
			if authCtx == nil || pool == nil {
				next.ServeHTTP(w, r)
				return
			}

			scope, err := auth.ResolveOrgScope(r.Context(), pool, authCtx.UserID, authCtx.TenantID)
			if err != nil {
				slog.Warn("org scope resolution failed, falling back to tenant-only",
					"user_id", authCtx.UserID,
					"error", err.Error(),
					"correlation_id", types.GetCorrelationID(r.Context()),
				)
				// Fail-open: continue without org scope.
				next.ServeHTTP(w, r)
				return
			}

			// Enrich the existing AuthContext with org scope.
			authCtx.OrgUnitID = scope.OrgUnitID
			authCtx.OrgLevel = scope.OrgLevel
			authCtx.VisibleOrgIDs = scope.VisibleOrgIDs
			authCtx.IsGlobalScope = scope.IsGlobalScope

			// Re-set context with enriched AuthContext.
			ctx := types.SetAuthContext(r.Context(), authCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
