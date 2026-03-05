package vault

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// VaultWorker runs periodic background tasks for document lifecycle enforcement.
type VaultWorker struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	stopCh   chan struct{}
}

// NewVaultWorker creates a new VaultWorker.
func NewVaultWorker(pool *pgxpool.Pool, auditSvc *audit.AuditService) *VaultWorker {
	return &VaultWorker{
		pool:     pool,
		auditSvc: auditSvc,
		stopCh:   make(chan struct{}),
	}
}

// Start launches the background worker goroutines.
func (w *VaultWorker) Start(ctx context.Context) {
	go w.runExpireDocuments(ctx)
	go w.runRetentionCheck(ctx)
	slog.Info("vault worker started")
}

// Stop signals the worker to shut down.
func (w *VaultWorker) Stop() {
	close(w.stopCh)
}

// runExpireDocuments periodically transitions documents past their expiry_date to 'expired'.
func (w *VaultWorker) runExpireDocuments(ctx context.Context) {
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()

	// Run once at startup.
	w.expireDocuments(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.expireDocuments(ctx)
		}
	}
}

// runRetentionCheck periodically checks for retention policy violations.
func (w *VaultWorker) runRetentionCheck(ctx context.Context) {
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.checkRetention(ctx)
		}
	}
}

// expireDocuments transitions documents past their expiry_date to 'expired' status.
func (w *VaultWorker) expireDocuments(ctx context.Context) {
	now := time.Now().UTC()

	// Find documents that need to be expired.
	rows, err := w.pool.Query(ctx, `
		SELECT id, tenant_id, status
		FROM documents
		WHERE expiry_date IS NOT NULL
			AND expiry_date < $1
			AND is_latest = true
			AND status NOT IN ('deleted', 'expired', 'archived')
		LIMIT 500`, now)
	if err != nil {
		slog.Error("vault worker: failed to query expirable documents", "error", err)
		return
	}
	defer rows.Close()

	type expirableDoc struct {
		ID       uuid.UUID
		TenantID uuid.UUID
		Status   string
	}

	var docs []expirableDoc
	for rows.Next() {
		var d expirableDoc
		if err := rows.Scan(&d.ID, &d.TenantID, &d.Status); err != nil {
			slog.Error("vault worker: failed to scan expirable document", "error", err)
			continue
		}
		docs = append(docs, d)
	}

	if len(docs) == 0 {
		return
	}

	slog.Info("vault worker: expiring documents", "count", len(docs))

	for _, d := range docs {
		_, err := w.pool.Exec(ctx, `
			UPDATE documents SET status = 'expired', updated_at = $1
			WHERE id = $2 AND tenant_id = $3`,
			now, d.ID, d.TenantID)
		if err != nil {
			slog.Error("vault worker: failed to expire document", "error", err, "documentId", d.ID)
			continue
		}

		// Log lifecycle transition.
		_, _ = w.pool.Exec(ctx, `
			INSERT INTO document_lifecycle_log (id, document_id, tenant_id, from_status, to_status, changed_by, reason, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			uuid.New(), d.ID, d.TenantID, d.Status, DocumentStatusExpired, uuid.Nil, "automatic: document expiry date reached", now)

		// Log audit event.
		_ = w.auditSvc.Log(ctx, audit.AuditEntry{
			TenantID:   d.TenantID,
			ActorID:    uuid.Nil,
			Action:     "expire:vault_document",
			EntityType: "vault_document",
			EntityID:   d.ID,
		})
	}

	slog.Info("vault worker: document expiry complete", "expired", len(docs))
}

// checkRetention logs warnings for documents past their retention_until date
// that are still in an active state (informational only, no auto-action).
func (w *VaultWorker) checkRetention(ctx context.Context) {
	now := time.Now().UTC()

	var count int
	err := w.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM documents
		WHERE retention_until IS NOT NULL
			AND retention_until < $1
			AND is_latest = true
			AND status NOT IN ('deleted', 'archived')`, now).Scan(&count)
	if err != nil {
		slog.Error("vault worker: failed to check retention", "error", err)
		return
	}

	if count > 0 {
		slog.Warn("vault worker: documents past retention period found",
			"count", count,
			"note", "these documents are past their retention_until date but still active")
	}
}
