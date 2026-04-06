package reporting

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/notification"
)

const (
	queryScheduleLockKey            = int64(82001503)
	defaultQueryScheduleInterval    = time.Minute
)

// QueryScheduler periodically executes saved queries that have a cron schedule
// and emails the results as a CSV attachment to the configured recipients.
type QueryScheduler struct {
	querySvc    *QueryBuilderService
	reportSvc   *ReportService
	emailSender notification.EmailSender
	frontendURL string
	interval    time.Duration
}

// NewQueryScheduler creates a query scheduler.
func NewQueryScheduler(
	querySvc *QueryBuilderService,
	reportSvc *ReportService,
	emailSender notification.EmailSender,
	frontendURL string,
	interval time.Duration,
) *QueryScheduler {
	if interval <= 0 {
		interval = defaultQueryScheduleInterval
	}
	return &QueryScheduler{
		querySvc:    querySvc,
		reportSvc:   reportSvc,
		emailSender: emailSender,
		frontendURL: frontendURL,
		interval:    interval,
	}
}

// Start runs the scheduler loop until context cancellation.
func (s *QueryScheduler) Start(ctx context.Context) {
	if s == nil || s.querySvc == nil {
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
				executed, err := s.runDueQueries(ctx, t)
				if err != nil {
					slog.ErrorContext(ctx, "query scheduler: run failed", "error", err)
					continue
				}
				if executed > 0 {
					slog.InfoContext(ctx, "query scheduler: queries executed", "count", executed, "at", t.UTC())
				}
			}
		}
	}()
}

// runDueQueries checks all saved queries with schedules and executes any that match the current time.
func (s *QueryScheduler) runDueQueries(ctx context.Context, at time.Time) (int, error) {
	scheduledAt := at.UTC().Truncate(time.Minute)

	// Acquire advisory lock to prevent concurrent runs across instances.
	var locked bool
	if err := s.querySvc.pool.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, queryScheduleLockKey).Scan(&locked); err != nil {
		return 0, fmt.Errorf("failed to acquire query scheduler lock: %w", err)
	}
	if !locked {
		return 0, nil
	}
	defer func() {
		if _, err := s.querySvc.pool.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, queryScheduleLockKey); err != nil {
			slog.Warn("failed to release query scheduler lock", "error", err)
		}
	}()

	queries, err := s.querySvc.ListScheduledQueries(ctx)
	if err != nil {
		return 0, err
	}

	executed := 0
	for _, sq := range queries {
		if sq.Schedule == nil || len(sq.EmailRecipients) == 0 {
			continue
		}

		match, err := cronMatches(*sq.Schedule, scheduledAt)
		if err != nil {
			slog.WarnContext(ctx, "query scheduler: invalid cron",
				"query_id", sq.ID, "schedule", *sq.Schedule, "error", err)
			continue
		}
		if !match {
			continue
		}

		if err := s.executeAndEmail(ctx, sq); err != nil {
			slog.ErrorContext(ctx, "query scheduler: execute+email failed",
				"query_id", sq.ID, "name", sq.Name, "error", err)
			continue
		}

		executed++
	}

	return executed, nil
}

// executeAndEmail runs a saved query, sends the CSV result to all recipients,
// and logs the run in the report_runs table.
func (s *QueryScheduler) executeAndEmail(ctx context.Context, sq SavedQuery) error {
	runID := uuid.New()
	now := time.Now().UTC()

	result, err := s.querySvc.RunSavedQueryForScheduler(ctx, sq)
	if err != nil {
		s.logQueryRun(ctx, runID, sq, now, RunStatusFailed, err.Error(), 0)
		return fmt.Errorf("query execution failed: %w", err)
	}

	csvData, err := queryResultToCSV(result)
	if err != nil {
		s.logQueryRun(ctx, runID, sq, now, RunStatusFailed, err.Error(), result.RowCount)
		return fmt.Errorf("CSV generation failed: %w", err)
	}

	subject := fmt.Sprintf("Scheduled Report: %s", sq.Name)
	body := fmt.Sprintf(
		`<p>Hello,</p>
<p>Your scheduled report <strong>%s</strong> has been generated.</p>
<p><strong>Entity type:</strong> %s</p>
<p><strong>Rows returned:</strong> %d</p>
<p>The report data is included below.</p>
<p>You can also view and re-run this query in the <a href="%s/dashboard/reports/query-builder">Query Builder</a>.</p>
<hr>
<pre>%s</pre>
<p>This is an automated message from ITD-OPMS.</p>`,
		sq.Name,
		sq.EntityType,
		result.RowCount,
		s.frontendURL,
		string(csvData),
	)

	if s.emailSender == nil {
		slog.WarnContext(ctx, "query scheduler: no email sender configured, skipping delivery",
			"query_id", sq.ID)
		s.logQueryRun(ctx, runID, sq, now, RunStatusCompleted, "", result.RowCount)
		return nil
	}

	for _, recipient := range sq.EmailRecipients {
		if err := s.emailSender.SendMail(ctx, recipient, subject, body); err != nil {
			slog.ErrorContext(ctx, "query scheduler: email send failed",
				"query_id", sq.ID, "recipient", recipient, "error", err)
		}
	}

	s.logQueryRun(ctx, runID, sq, now, RunStatusCompleted, "", result.RowCount)

	slog.InfoContext(ctx, "query scheduler: report emailed",
		"query_id", sq.ID, "name", sq.Name, "recipients", len(sq.EmailRecipients), "rows", result.RowCount)

	return nil
}

// logQueryRun inserts a record into query_runs to track scheduled query execution.
func (s *QueryScheduler) logQueryRun(
	ctx context.Context,
	runID uuid.UUID,
	sq SavedQuery,
	scheduledAt time.Time,
	status string,
	errMsg string,
	rowCount int,
) {
	now := time.Now().UTC()

	var completedAt *time.Time
	var errMsgPtr *string
	if status == RunStatusCompleted || status == RunStatusFailed {
		completedAt = &now
	}
	if errMsg != "" {
		errMsgPtr = &errMsg
	}

	_, err := s.querySvc.pool.Exec(ctx, `
		INSERT INTO query_runs (
			id, saved_query_id, tenant_id, status, trigger_source, scheduled_for,
			generated_at, completed_at, row_count, error_message, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11
		)`,
		runID, sq.ID, sq.TenantID, status, RunTriggerSchedule, scheduledAt,
		now, completedAt, rowCount, errMsgPtr, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "query scheduler: failed to log run in query_runs",
			"run_id", runID, "query_id", sq.ID, "error", err)
	}
}

// queryResultToCSV is a standalone CSV generator for the scheduler (no HTTP dependency).
func queryResultToCSV(result QueryResult) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	if err := w.Write(result.Columns); err != nil {
		return nil, fmt.Errorf("CSV header write: %w", err)
	}

	for _, row := range result.Rows {
		record := make([]string, len(result.Columns))
		for i, col := range result.Columns {
			v := row[col]
			if v == nil {
				record[i] = ""
			} else {
				record[i] = fmt.Sprint(v)
			}
		}
		if err := w.Write(record); err != nil {
			return nil, fmt.Errorf("CSV row write: %w", err)
		}
	}

	w.Flush()
	return buf.Bytes(), w.Error()
}
