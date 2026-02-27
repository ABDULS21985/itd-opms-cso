package reporting

import (
	"context"
	"log/slog"
	"time"
)

const defaultDashboardRefreshInterval = 5 * time.Minute

// DashboardRefresher periodically refreshes dashboard materialized views.
type DashboardRefresher struct {
	svc      *DashboardService
	interval time.Duration
}

// NewDashboardRefresher creates a periodic dashboard refresher.
func NewDashboardRefresher(svc *DashboardService, interval time.Duration) *DashboardRefresher {
	if interval <= 0 {
		interval = defaultDashboardRefreshInterval
	}
	return &DashboardRefresher{svc: svc, interval: interval}
}

// Start runs the refresher loop until ctx is canceled.
func (r *DashboardRefresher) Start(ctx context.Context) {
	if r == nil || r.svc == nil {
		return
	}

	go func() {
		ticker := time.NewTicker(r.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := r.svc.RefreshExecutiveSummarySystem(ctx, "scheduled_refresh"); err != nil {
					slog.ErrorContext(ctx, "scheduled executive summary refresh failed", "error", err)
				}
			}
		}
	}()
}
