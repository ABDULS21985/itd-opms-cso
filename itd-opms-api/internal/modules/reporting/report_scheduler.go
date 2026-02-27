package reporting

import (
	"context"
	"log/slog"
	"time"
)

const defaultReportScheduleInterval = time.Minute

// ReportScheduler periodically enqueues due scheduled report runs.
type ReportScheduler struct {
	svc      *ReportService
	interval time.Duration
}

// NewReportScheduler creates a report scheduler.
func NewReportScheduler(svc *ReportService, interval time.Duration) *ReportScheduler {
	if interval <= 0 {
		interval = defaultReportScheduleInterval
	}
	return &ReportScheduler{svc: svc, interval: interval}
}

// Start runs scheduler loop until context cancellation.
func (s *ReportScheduler) Start(ctx context.Context) {
	if s == nil || s.svc == nil {
		return
	}

	go func() {
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case t := <-ticker.C:
				enqueued, err := s.svc.EnqueueDueScheduledRuns(ctx, t)
				if err != nil {
					slog.ErrorContext(ctx, "scheduled report enqueue failed", "error", err)
					continue
				}
				if enqueued > 0 {
					slog.InfoContext(ctx, "scheduled report runs enqueued", "count", enqueued, "at", t.UTC())
				}
			}
		}
	}()
}
