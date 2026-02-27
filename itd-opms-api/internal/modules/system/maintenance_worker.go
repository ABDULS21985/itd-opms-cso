package system

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MaintenanceWorker runs periodic background cleanup tasks.
type MaintenanceWorker struct {
	pool   *pgxpool.Pool
	stopCh chan struct{}
}

// NewMaintenanceWorker creates a new MaintenanceWorker.
func NewMaintenanceWorker(pool *pgxpool.Pool) *MaintenanceWorker {
	return &MaintenanceWorker{
		pool:   pool,
		stopCh: make(chan struct{}),
	}
}

// Start launches the background maintenance goroutines.
func (w *MaintenanceWorker) Start(ctx context.Context) {
	go w.sessionCleanup(ctx)
	go w.auditIntegrity(ctx)
	slog.Info("system maintenance worker started")
}

// Stop signals the worker to shut down.
func (w *MaintenanceWorker) Stop() {
	close(w.stopCh)
}

// sessionCleanup removes expired session records every hour.
func (w *MaintenanceWorker) sessionCleanup(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.cleanExpiredSessions(ctx)
		}
	}
}

// auditIntegrity runs an audit log integrity check weekly.
func (w *MaintenanceWorker) auditIntegrity(ctx context.Context) {
	ticker := time.NewTicker(7 * 24 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.verifyAuditIntegrity(ctx)
		}
	}
}

func (w *MaintenanceWorker) cleanExpiredSessions(ctx context.Context) {
	ct, err := w.pool.Exec(ctx,
		`DELETE FROM audit_log WHERE action = 'session.expired' AND created_at < NOW() - INTERVAL '90 days'`,
	)
	if err != nil {
		slog.Error("session cleanup failed", "error", err)
		return
	}
	if ct.RowsAffected() > 0 {
		slog.Info("session cleanup completed", "removed", ct.RowsAffected())
	}
}

func (w *MaintenanceWorker) verifyAuditIntegrity(ctx context.Context) {
	// Verify SHA-256 checksums on a sample of recent audit entries.
	var mismatchCount int
	err := w.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM (
			SELECT id FROM audit_log
			WHERE created_at > NOW() - INTERVAL '7 days'
			  AND checksum IS NOT NULL
			  AND checksum != encode(
				sha256(
					(COALESCE(tenant_id::text, '') || COALESCE(actor_id::text, '') ||
					 COALESCE(action, '') || COALESCE(entity_type, '') ||
					 COALESCE(entity_id::text, '') || COALESCE(created_at::text, ''))::bytea
				), 'hex')
			LIMIT 1000
		) AS mismatches`,
	).Scan(&mismatchCount)
	if err != nil {
		slog.Error("audit integrity check failed", "error", err)
		return
	}
	if mismatchCount > 0 {
		slog.Warn("audit integrity check found mismatches", "count", mismatchCount)
	} else {
		slog.Info("audit integrity check passed")
	}
}
