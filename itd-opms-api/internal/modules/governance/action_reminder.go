package governance

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
)

// DomainEvent matches the notification orchestrator's event structure.
type DomainEvent struct {
	Type       string          `json:"type"`
	TenantID   uuid.UUID       `json:"tenantId"`
	ActorID    uuid.UUID       `json:"actorId"`
	EntityType string          `json:"entityType"`
	EntityID   uuid.UUID       `json:"entityId"`
	Data       json.RawMessage `json:"data"`
}

// ActionReminderService checks for overdue actions and publishes notification events.
type ActionReminderService struct {
	pool *pgxpool.Pool
	js   nats.JetStreamContext
}

// NewActionReminderService creates a new ActionReminderService.
func NewActionReminderService(pool *pgxpool.Pool, js nats.JetStreamContext) *ActionReminderService {
	return &ActionReminderService{pool: pool, js: js}
}

// RunReminders checks for actions that need reminders and publishes NATS events.
// Called periodically (every hour) from main.go.
func (s *ActionReminderService) RunReminders(ctx context.Context) {
	if s.js == nil {
		return
	}

	// Process actions due within 24 hours (approaching deadline).
	s.processApproaching(ctx)
	// Process overdue actions (1+ days past due).
	s.processOverdue(ctx)
}

func (s *ActionReminderService) processApproaching(ctx context.Context) {
	query := `
		SELECT a.id, a.tenant_id, a.title, a.owner_id, a.due_date, a.priority,
		       u.display_name AS owner_name
		FROM action_items a
		JOIN users u ON u.id = a.owner_id
		WHERE a.status IN ('open', 'in_progress')
		  AND a.due_date >= CURRENT_DATE
		  AND a.due_date <= CURRENT_DATE + INTERVAL '1 day'
		  AND (a.last_reminder_sent IS NULL OR a.last_reminder_sent < NOW() - INTERVAL '12 hours')`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		slog.Error("action reminder: failed to query approaching actions", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id        uuid.UUID
			tenantID  uuid.UUID
			title     string
			ownerID   uuid.UUID
			dueDate   time.Time
			priority  string
			ownerName string
		)
		if err := rows.Scan(&id, &tenantID, &title, &ownerID, &dueDate, &priority, &ownerName); err != nil {
			slog.Error("action reminder: failed to scan row", "error", err)
			continue
		}

		s.publishEvent(ctx, "governance.action_due_soon", tenantID, id, map[string]any{
			"actionId":    id,
			"title":       title,
			"ownerName":   ownerName,
			"dueDate":     dueDate.Format("2006-01-02"),
			"priority":    priority,
			"recipientId": ownerID,
		})

		// Update reminder tracking.
		_, _ = s.pool.Exec(ctx,
			`UPDATE action_items SET last_reminder_sent = NOW(), reminder_count = reminder_count + 1 WHERE id = $1`,
			id,
		)
	}
}

func (s *ActionReminderService) processOverdue(ctx context.Context) {
	query := `
		SELECT a.id, a.tenant_id, a.title, a.owner_id, a.due_date, a.priority,
		       u.display_name AS owner_name,
		       CURRENT_DATE - a.due_date AS days_overdue
		FROM action_items a
		JOIN users u ON u.id = a.owner_id
		WHERE a.status IN ('open', 'in_progress')
		  AND a.due_date < CURRENT_DATE
		  AND (a.last_reminder_sent IS NULL OR a.last_reminder_sent < NOW() - INTERVAL '24 hours')`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		slog.Error("action reminder: failed to query overdue actions", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id          uuid.UUID
			tenantID    uuid.UUID
			title       string
			ownerID     uuid.UUID
			dueDate     time.Time
			priority    string
			ownerName   string
			daysOverdue int
		)
		if err := rows.Scan(&id, &tenantID, &title, &ownerID, &dueDate, &priority, &ownerName, &daysOverdue); err != nil {
			slog.Error("action reminder: failed to scan row", "error", err)
			continue
		}

		eventType := "governance.action_overdue"
		if daysOverdue >= 7 {
			eventType = "governance.action_critical_overdue"
		}

		s.publishEvent(ctx, eventType, tenantID, id, map[string]any{
			"actionId":    id,
			"title":       title,
			"ownerName":   ownerName,
			"dueDate":     dueDate.Format("2006-01-02"),
			"daysOverdue": daysOverdue,
			"priority":    priority,
			"recipientId": ownerID,
		})

		_, _ = s.pool.Exec(ctx,
			`UPDATE action_items SET last_reminder_sent = NOW(), reminder_count = reminder_count + 1 WHERE id = $1`,
			id,
		)
	}
}

func (s *ActionReminderService) publishEvent(ctx context.Context, eventType string, tenantID, entityID uuid.UUID, data map[string]any) {
	dataBytes, _ := json.Marshal(data)
	event := DomainEvent{
		Type:       eventType,
		TenantID:   tenantID,
		ActorID:    uuid.Nil, // system-generated
		EntityType: "action_item",
		EntityID:   entityID,
		Data:       dataBytes,
	}
	payload, _ := json.Marshal(event)

	subject := "notify." + eventType
	if _, err := s.js.Publish(subject, payload); err != nil {
		slog.Error("action reminder: failed to publish NATS event", "error", err, "type", eventType, "entity", entityID)
	}
}
