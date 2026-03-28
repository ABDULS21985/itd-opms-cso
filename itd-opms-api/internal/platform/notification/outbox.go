package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EmailSender is the interface satisfied by both msgraph.Client and sendgrid.Client.
type EmailSender interface {
	SendMail(ctx context.Context, to, subject, htmlBody string) error
}

// OutboxProcessor polls the notification_outbox table and delivers notifications.
type OutboxProcessor struct {
	pool      *pgxpool.Pool
	email     EmailSender // Graph or SendGrid
	teams     TeamsSender // Graph for Teams (may be nil)
	pollRate  time.Duration
	batchSize int
	stopCh    chan struct{}
}

// TeamsSender is used for Microsoft Teams channel posts (Graph-only feature).
type TeamsSender interface {
	PostTeamsMessage(ctx context.Context, teamID, channelID, body string, adaptiveCard json.RawMessage) error
}

// NewOutboxProcessor creates a new outbox processor.
func NewOutboxProcessor(pool *pgxpool.Pool, email EmailSender, teams TeamsSender) *OutboxProcessor {
	return &OutboxProcessor{
		pool:      pool,
		email:     email,
		teams:     teams,
		pollRate:  5 * time.Second,
		batchSize: 20,
		stopCh:    make(chan struct{}),
	}
}

// Start begins the outbox polling loop in a goroutine.
func (p *OutboxProcessor) Start(ctx context.Context) {
	go func() {
		slog.Info("outbox processor started", "poll_rate", p.pollRate)
		ticker := time.NewTicker(p.pollRate)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				slog.Info("outbox processor stopped (context cancelled)")
				return
			case <-p.stopCh:
				slog.Info("outbox processor stopped")
				return
			case <-ticker.C:
				if err := p.processBatch(ctx); err != nil {
					slog.Error("outbox processor batch error", "error", err)
				}
			}
		}
	}()
}

// Stop signals the processor to stop.
func (p *OutboxProcessor) Stop() {
	close(p.stopCh)
}

// outboxItem represents a row from notification_outbox being processed.
type outboxItem struct {
	ID             uuid.UUID
	TenantID       uuid.UUID
	Channel        string
	RecipientID    *uuid.UUID
	RecipientEmail *string
	TemplateKey    string
	TemplateData   json.RawMessage
	Subject        *string
	RenderedBody   *string
	Priority       int
	Attempts       int
	CorrelationID  *string
}

// processBatch fetches a batch of pending outbox items and delivers them.
func (p *OutboxProcessor) processBatch(ctx context.Context) error {
	// Claim a batch of pending items by marking them as 'processing'.
	rows, err := p.pool.Query(ctx,
		`UPDATE notification_outbox
		 SET status = 'processing', last_attempt_at = NOW(), attempts = attempts + 1
		 WHERE id IN (
			SELECT id FROM notification_outbox
			WHERE status = 'pending'
			   OR (status = 'failed' AND attempts < 3 AND last_attempt_at < NOW() - make_interval(secs => power(2, attempts) * 30))
			ORDER BY priority DESC, created_at ASC
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		 )
		 RETURNING id, tenant_id, channel, recipient_id, recipient_email,
				   template_key, template_data, subject, rendered_body,
				   priority, attempts, correlation_id`,
		p.batchSize,
	)
	if err != nil {
		return fmt.Errorf("claim outbox batch: %w", err)
	}
	defer rows.Close()

	var items []outboxItem
	for rows.Next() {
		var item outboxItem
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.Channel, &item.RecipientID,
			&item.RecipientEmail, &item.TemplateKey, &item.TemplateData,
			&item.Subject, &item.RenderedBody, &item.Priority, &item.Attempts,
			&item.CorrelationID,
		); err != nil {
			return fmt.Errorf("scan outbox item: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate outbox items: %w", err)
	}

	for _, item := range items {
		if err := p.deliver(ctx, item); err != nil {
			p.handleDeliveryFailure(ctx, item, err)
		} else {
			p.markDelivered(ctx, item.ID)
		}
	}

	return nil
}

// deliver dispatches the notification to the appropriate channel.
func (p *OutboxProcessor) deliver(ctx context.Context, item outboxItem) error {
	switch item.Channel {
	case "email":
		return p.deliverEmail(ctx, item)
	case "teams":
		return p.deliverTeams(ctx, item)
	case "in_app":
		// In-app notifications are created at enqueue time; mark as delivered.
		return nil
	default:
		return fmt.Errorf("unknown channel: %s", item.Channel)
	}
}

// deliverEmail sends an email via the configured email provider (SendGrid or Graph).
func (p *OutboxProcessor) deliverEmail(ctx context.Context, item outboxItem) error {
	if p.email == nil {
		return fmt.Errorf("email sender not configured (set SENDGRID_API_KEY or enable Graph API)")
	}

	recipientEmail := ""
	if item.RecipientEmail != nil {
		recipientEmail = *item.RecipientEmail
	}

	if recipientEmail == "" && item.RecipientID != nil {
		// Look up email from users table.
		err := p.pool.QueryRow(ctx,
			`SELECT email FROM users WHERE id = $1`,
			*item.RecipientID,
		).Scan(&recipientEmail)
		if err != nil {
			return fmt.Errorf("lookup recipient email: %w", err)
		}
	}

	if recipientEmail == "" {
		return fmt.Errorf("no recipient email available")
	}

	subject := "ITD-OPMS Notification"
	if item.Subject != nil && *item.Subject != "" {
		subject = *item.Subject
	}

	body := ""
	if item.RenderedBody != nil {
		body = *item.RenderedBody
	}

	if err := p.email.SendMail(ctx, recipientEmail, subject, body); err != nil {
		return fmt.Errorf("send email: %w", err)
	}

	slog.Info("email delivered",
		"outbox_id", item.ID,
		"recipient", recipientEmail,
		"template", item.TemplateKey,
	)
	return nil
}

// deliverTeams posts a message (potentially with Adaptive Card) to a Teams channel.
func (p *OutboxProcessor) deliverTeams(ctx context.Context, item outboxItem) error {
	if p.teams == nil {
		return fmt.Errorf("teams sender not configured (requires Graph API)")
	}

	// Look up Teams channel mapping for this tenant and notification type.
	var teamID, channelID string
	err := p.pool.QueryRow(ctx,
		`SELECT team_id, channel_id FROM teams_channel_mappings
		 WHERE tenant_id = $1 AND $2 = ANY(notification_types) AND is_active = true
		 LIMIT 1`,
		item.TenantID, item.TemplateKey,
	).Scan(&teamID, &channelID)
	if err != nil {
		return fmt.Errorf("no teams channel mapping for %s: %w", item.TemplateKey, err)
	}

	body := ""
	if item.RenderedBody != nil {
		body = *item.RenderedBody
	}

	// Check if the body looks like an Adaptive Card JSON.
	var adaptiveCard json.RawMessage
	if len(body) > 0 && body[0] == '{' {
		var cardCheck map[string]any
		if err := json.Unmarshal([]byte(body), &cardCheck); err == nil {
			if cardCheck["type"] == "AdaptiveCard" {
				adaptiveCard = json.RawMessage(body)
				body = "" // Will use attachment reference instead.
			}
		}
	}

	if err := p.teams.PostTeamsMessage(ctx, teamID, channelID, body, adaptiveCard); err != nil {
		return fmt.Errorf("post teams message: %w", err)
	}

	slog.Info("teams message delivered",
		"outbox_id", item.ID,
		"team", teamID,
		"channel", channelID,
		"template", item.TemplateKey,
	)
	return nil
}

// markDelivered updates an outbox item as successfully delivered.
func (p *OutboxProcessor) markDelivered(ctx context.Context, id uuid.UUID) {
	_, err := p.pool.Exec(ctx,
		`UPDATE notification_outbox SET status = 'delivered', delivered_at = NOW() WHERE id = $1`,
		id,
	)
	if err != nil {
		slog.Error("failed to mark outbox item as delivered", "error", err, "id", id)
	}
}

// handleDeliveryFailure updates the outbox item status and moves to DLQ after max retries.
func (p *OutboxProcessor) handleDeliveryFailure(ctx context.Context, item outboxItem, deliveryErr error) {
	errMsg := deliveryErr.Error()

	// Max retries: 3 attempts with exponential backoff (30s, 2min, 10min).
	if item.Attempts >= 3 {
		// Move to dead letter queue.
		slog.Error("notification permanently failed, moving to DLQ",
			"outbox_id", item.ID,
			"template", item.TemplateKey,
			"channel", item.Channel,
			"attempts", item.Attempts,
			"error", errMsg,
		)

		errDetails, _ := json.Marshal(map[string]any{
			"lastError": errMsg,
			"attempts":  item.Attempts,
			"channel":   item.Channel,
			"template":  item.TemplateKey,
		})

		_, _ = p.pool.Exec(ctx,
			`UPDATE notification_outbox SET status = 'dlq', error_message = $2 WHERE id = $1`,
			item.ID, errMsg,
		)
		_, _ = p.pool.Exec(ctx,
			`INSERT INTO notification_dlq (outbox_id, error_details) VALUES ($1, $2)`,
			item.ID, errDetails,
		)
	} else {
		// Mark as failed for retry.
		slog.Warn("notification delivery failed, will retry",
			"outbox_id", item.ID,
			"attempt", item.Attempts,
			"error", errMsg,
		)

		_, _ = p.pool.Exec(ctx,
			`UPDATE notification_outbox SET status = 'failed', error_message = $2 WHERE id = $1`,
			item.ID, errMsg,
		)
	}
}

// GetDLQDepth returns the number of items in the dead letter queue.
func (p *OutboxProcessor) GetDLQDepth(ctx context.Context) (int64, error) {
	var count int64
	err := p.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notification_dlq`,
	).Scan(&count)
	return count, err
}
