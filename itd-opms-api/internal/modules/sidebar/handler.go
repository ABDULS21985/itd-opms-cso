// Package sidebar provides aggregated count badges for the portal sidebar nav.
//
// The endpoint is intentionally tolerant: any individual query failure logs and
// returns zero rather than failing the whole response, since these are
// best-effort UI hints, not authoritative data.
package sidebar

import (
	"context"
	"log/slog"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// Handler exposes /sidebar routes.
type Handler struct {
	pool *pgxpool.Pool
}

// NewHandler builds the sidebar handler.
func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// Routes mounts the /sidebar/* routes.
//
// The parent /api/v1 group already enforces authentication, so we simply
// require an auth context to be present.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/badges", h.GetBadges)
}

// BadgesResponse is the aggregated payload sent to the sidebar.
//
// Counts are keyed by stable identifiers so the frontend can map them to
// nav items without relying on labels.
type BadgesResponse struct {
	// Counts is a map of badge key → numeric count.
	// Keys mirror nav item href values (e.g. "/dashboard/itsm/my-queue").
	Counts map[string]int `json:"counts"`
	// Activity is a map of badge key → epoch millis of the most recent
	// activity, for the "blue dot since last visit" feature.
	Activity map[string]int64 `json:"activity"`
}

// GetBadges aggregates per-domain counts for sidebar rendering.
func (h *Handler) GetBadges(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	resp := BadgesResponse{
		Counts:   make(map[string]int),
		Activity: make(map[string]int64),
	}

	tenantID := auth.TenantID
	ctx := r.Context()

	type result struct {
		key      string
		count    int
		activity int64
	}

	queries := []func(context.Context) result{
		// ITSM: open tickets in user's queue (assigned + open).
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)) * 1000, 0)::bigint
				FROM tickets
				WHERE tenant_id = $1
				  AND assignee_id = $2
				  AND status NOT IN ('resolved', 'closed', 'cancelled')
			`, tenantID, auth.UserID).Scan(&c, &ts)
			return result{key: "/dashboard/itsm/my-queue", count: c, activity: ts}
		},
		// ITSM: major incidents (open).
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)) * 1000, 0)::bigint
				FROM tickets
				WHERE tenant_id = $1
				  AND is_major_incident = true
				  AND status NOT IN ('resolved', 'closed', 'cancelled')
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/itsm/major-incidents", count: c, activity: ts}
		},
		// ITSM: open problems.
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)) * 1000, 0)::bigint
				FROM problems
				WHERE tenant_id = $1
				  AND status NOT IN ('closed')
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/itsm/problems", count: c, activity: ts}
		},
		// Planning: change requests still in flight (submitted/review/approved).
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)) * 1000, 0)::bigint
				FROM change_requests
				WHERE tenant_id = $1
				  AND status IN ('submitted', 'under_review', 'approved')
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/planning/change-requests", count: c, activity: ts}
		},
		// Planning: open risks (anything not closed/accepted).
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)) * 1000, 0)::bigint
				FROM risks
				WHERE tenant_id = $1
				  AND status IN ('identified', 'assessed', 'mitigating')
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/planning/risks", count: c, activity: ts}
		},
		// Server allocation: requests in any pending-approval state.
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)) * 1000, 0)::bigint
				FROM ssa_requests
				WHERE tenant_id = $1
				  AND status IN (
				    'APPR_DC_PENDING', 'APPR_SSO_PENDING', 'APPR_IMD_PENDING',
				    'APPR_ASD_PENDING', 'APPR_SCAO_PENDING'
				  )
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/ssa/approvals", count: c, activity: ts}
		},
		// Generic approvals queue: steps assigned to me with no decision yet.
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(s.created_at)) * 1000, 0)::bigint
				FROM approval_steps s
				JOIN approval_chains c ON c.id = s.chain_id
				WHERE c.tenant_id = $1
				  AND s.approver_id = $2
				  AND s.decision IS NULL
			`, tenantID, auth.UserID).Scan(&c, &ts)
			return result{key: "/dashboard/governance/approvals", count: c, activity: ts}
		},
		// Assets: warranties expiring within 30 days (still active).
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(end_date)) * 1000, 0)::bigint
				FROM warranties
				WHERE tenant_id = $1
				  AND end_date > NOW()
				  AND end_date <= NOW() + INTERVAL '30 days'
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/cmdb/warranties", count: c, activity: ts}
		},
		// Assets: contracts expiring within 60 days.
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(end_date)) * 1000, 0)::bigint
				FROM contracts
				WHERE tenant_id = $1
				  AND end_date IS NOT NULL
				  AND end_date > NOW()
				  AND end_date <= NOW() + INTERVAL '60 days'
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/cmdb/contracts", count: c, activity: ts}
		},
		// GRC: active or in-review access review campaigns.
		func(ctx context.Context) result {
			var c int
			var ts int64
			_ = h.pool.QueryRow(ctx, `
				SELECT COUNT(*)::int,
				       COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)) * 1000, 0)::bigint
				FROM access_review_campaigns
				WHERE tenant_id = $1
				  AND status IN ('active', 'review')
			`, tenantID).Scan(&c, &ts)
			return result{key: "/dashboard/grc/access-reviews", count: c, activity: ts}
		},
	}

	// Run all queries in parallel; ignore individual failures (best-effort).
	var (
		mu sync.Mutex
		wg sync.WaitGroup
	)
	for _, q := range queries {
		wg.Add(1)
		go func(fn func(context.Context) result) {
			defer wg.Done()
			defer func() {
				if rec := recover(); rec != nil {
					slog.WarnContext(ctx, "sidebar badge query panicked", "panic", rec)
				}
			}()
			res := fn(ctx)
			if res.key == "" {
				return
			}
			mu.Lock()
			defer mu.Unlock()
			if res.count > 0 {
				resp.Counts[res.key] = res.count
			}
			if res.activity > 0 {
				resp.Activity[res.key] = res.activity
			}
		}(q)
	}
	wg.Wait()

	types.OK(w, resp, nil)
}
