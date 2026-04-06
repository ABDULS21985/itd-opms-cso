package audit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/metrics"
)

// SIEMStatus represents the current state of the SIEM exporter.
type SIEMStatus struct {
	Enabled        bool      `json:"enabled"`
	Mode           string    `json:"mode"`
	LastExportedID int64     `json:"lastExportedId"`
	LastExportAt   time.Time `json:"lastExportAt"`
	ErrorCount     int64     `json:"errorCount"`
}

// SIEMExporter is a background worker that polls audit_events and exports
// them in CEF (Common Event Format) to a syslog endpoint or webhook.
type SIEMExporter struct {
	pool   *pgxpool.Pool
	cfg    config.SIEMConfig
	stopCh chan struct{}
	wg     sync.WaitGroup

	mu             sync.RWMutex
	lastExportedID int64
	lastExportAt   time.Time
	errorCount     int64
}

// NewSIEMExporter creates a new SIEMExporter.
func NewSIEMExporter(pool *pgxpool.Pool, cfg config.SIEMConfig) *SIEMExporter {
	return &SIEMExporter{
		pool:   pool,
		cfg:    cfg,
		stopCh: make(chan struct{}),
	}
}

// Start begins the background export loop. It restores the checkpoint from
// the database, then polls for new audit events at the configured interval.
func (e *SIEMExporter) Start(ctx context.Context) {
	if !e.cfg.Enabled {
		slog.Info("siem exporter disabled")
		return
	}

	// Restore checkpoint from DB.
	if err := e.restoreCheckpoint(ctx); err != nil {
		slog.ErrorContext(ctx, "siem: failed to restore checkpoint", "error", err)
	}

	e.wg.Add(1)
	go func() {
		defer e.wg.Done()
		ticker := time.NewTicker(e.cfg.PollInterval)
		defer ticker.Stop()

		slog.Info("siem exporter started",
			"mode", e.cfg.Mode,
			"poll_interval", e.cfg.PollInterval.String(),
			"batch_size", e.cfg.BatchSize,
		)

		for {
			select {
			case <-e.stopCh:
				return
			case <-ticker.C:
				if err := e.exportBatch(ctx); err != nil {
					slog.ErrorContext(ctx, "siem: export batch failed", "error", err)
					atomic.AddInt64(&e.errorCount, 1)
					metrics.SIEMExportErrorsTotal.Inc()
					e.recordError(ctx, err)
				}
			}
		}
	}()
}

// Stop signals the exporter to shut down and waits for it to finish.
func (e *SIEMExporter) Stop() {
	close(e.stopCh)
	e.wg.Wait()
}

// Status returns the current exporter state.
func (e *SIEMExporter) Status() SIEMStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return SIEMStatus{
		Enabled:        e.cfg.Enabled,
		Mode:           e.cfg.Mode,
		LastExportedID: e.lastExportedID,
		LastExportAt:   e.lastExportAt,
		ErrorCount:     atomic.LoadInt64(&e.errorCount),
	}
}

// restoreCheckpoint loads the last_exported_id from the siem_export_state table.
func (e *SIEMExporter) restoreCheckpoint(ctx context.Context) error {
	var lastID int64
	err := e.pool.QueryRow(ctx,
		`SELECT last_exported_id FROM siem_export_state WHERE id = 1`,
	).Scan(&lastID)
	if err != nil {
		return fmt.Errorf("read siem checkpoint: %w", err)
	}
	e.mu.Lock()
	e.lastExportedID = lastID
	e.mu.Unlock()
	slog.Info("siem: restored checkpoint", "last_exported_id", lastID)
	return nil
}

// exportBatch fetches the next batch of audit events and sends them.
func (e *SIEMExporter) exportBatch(ctx context.Context) error {
	e.mu.RLock()
	fromID := e.lastExportedID
	e.mu.RUnlock()

	rows, err := e.pool.Query(ctx, `
		SELECT event_id, tenant_id, actor_id, actor_role, action,
		       entity_type, entity_id, changes, previous_state,
		       ip_address, user_agent, correlation_id,
		       checksum, timestamp
		FROM audit_events
		WHERE sequence_id > $1
		ORDER BY sequence_id ASC
		LIMIT $2`, fromID, e.cfg.BatchSize)
	if err != nil {
		return fmt.Errorf("query audit events: %w", err)
	}
	defer rows.Close()

	var events []AuditEvent
	var maxSeqID int64
	for rows.Next() {
		var evt AuditEvent
		var seqID int64
		if err := rows.Scan(
			&evt.ID, &evt.TenantID, &evt.ActorID, &evt.ActorRole, &evt.Action,
			&evt.EntityType, &evt.EntityID, &evt.Changes, &evt.PreviousState,
			&evt.IPAddress, &evt.UserAgent, &evt.CorrelationID,
			&evt.Checksum, &evt.CreatedAt,
		); err != nil {
			return fmt.Errorf("scan audit event: %w", err)
		}
		// Use a monotonic sequence for checkpoint; fall back to row count offset.
		seqID = fromID + int64(len(events)) + 1
		events = append(events, evt)
		if seqID > maxSeqID {
			maxSeqID = seqID
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate audit events: %w", err)
	}

	if len(events) == 0 {
		return nil
	}

	// Export via the configured mode.
	switch e.cfg.Mode {
	case "webhook":
		if err := e.sendWebhook(ctx, events); err != nil {
			return err
		}
	default: // "syslog"
		if err := e.sendSyslog(ctx, events); err != nil {
			return err
		}
	}

	// Update checkpoint in DB and memory.
	now := time.Now().UTC()
	_, err = e.pool.Exec(ctx, `
		UPDATE siem_export_state
		SET last_exported_id = $1, last_export_at = $2, updated_at = $2
		WHERE id = 1`, maxSeqID, now)
	if err != nil {
		return fmt.Errorf("update siem checkpoint: %w", err)
	}

	e.mu.Lock()
	e.lastExportedID = maxSeqID
	e.lastExportAt = now
	e.mu.Unlock()

	metrics.SIEMEventsExportedTotal.Add(float64(len(events)))
	slog.Info("siem: exported batch", "count", len(events), "last_id", maxSeqID)

	return nil
}

// formatCEF converts an AuditEvent to CEF format.
// CEF:0|CBN-ITD|OPMS|1.0|{Action}|{Action}|{severity}|extension
func formatCEF(evt AuditEvent) string {
	severity := mapSeverity(evt.Action)
	ext := fmt.Sprintf(
		"src=%s suser=%s cs1Label=EntityType cs1=%s cs2Label=EntityID cs2=%s msg=%s rt=%d",
		escapeCEF(evt.IPAddress),
		escapeCEF(evt.ActorID.String()),
		escapeCEF(evt.EntityType),
		escapeCEF(evt.EntityID.String()),
		escapeCEF(truncate(string(evt.Changes), 512)),
		evt.CreatedAt.UnixMilli(),
	)
	return fmt.Sprintf("CEF:0|CBN-ITD|OPMS|1.0|%s|%s|%d|%s",
		escapeCEF(evt.Action),
		escapeCEF(evt.Action),
		severity,
		ext,
	)
}

// sendSyslog sends CEF messages to the configured syslog endpoint.
func (e *SIEMExporter) sendSyslog(ctx context.Context, events []AuditEvent) error {
	conn, err := net.DialTimeout(e.cfg.SyslogProto, e.cfg.SyslogAddr, 5*time.Second)
	if err != nil {
		return fmt.Errorf("syslog dial %s/%s: %w", e.cfg.SyslogProto, e.cfg.SyslogAddr, err)
	}
	defer conn.Close()

	for _, evt := range events {
		msg := formatCEF(evt) + "\n"
		if _, err := conn.Write([]byte(msg)); err != nil {
			return fmt.Errorf("syslog write: %w", err)
		}
	}
	return nil
}

// sendWebhook POSTs a batch of events as JSON to the webhook URL.
func (e *SIEMExporter) sendWebhook(ctx context.Context, events []AuditEvent) error {
	body, err := json.Marshal(events)
	if err != nil {
		return fmt.Errorf("marshal webhook payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.cfg.WebhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create webhook request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("webhook POST: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}
	return nil
}

// recordError persists the error count and message to the checkpoint table.
func (e *SIEMExporter) recordError(ctx context.Context, exportErr error) {
	_, err := e.pool.Exec(ctx, `
		UPDATE siem_export_state
		SET error_count = error_count + 1, last_error = $1, updated_at = now()
		WHERE id = 1`, exportErr.Error())
	if err != nil {
		slog.ErrorContext(ctx, "siem: failed to record error", "error", err)
	}
}

// mapSeverity returns a CEF severity (0-10) based on the audit action.
func mapSeverity(action string) int {
	switch {
	case strings.Contains(action, "delete"):
		return 7
	case strings.Contains(action, "create"):
		return 3
	case strings.Contains(action, "update"):
		return 3
	case strings.Contains(action, "login"):
		return 5
	case strings.Contains(action, "logout"):
		return 1
	default:
		return 3
	}
}

// escapeCEF escapes characters special to the CEF format.
func escapeCEF(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `|`, `\|`)
	s = strings.ReplaceAll(s, `=`, `\=`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	s = strings.ReplaceAll(s, "\r", `\r`)
	return s
}

// truncate limits a string to maxLen characters.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
