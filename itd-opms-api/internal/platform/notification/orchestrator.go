package notification

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

// Orchestrator listens for domain events via NATS JetStream and routes them
// to the appropriate notification channels based on event type and user preferences.
type Orchestrator struct {
	svc    *Service
	js     nats.JetStreamContext
	stopCh chan struct{}
	subs   []*nats.Subscription
}

// NewOrchestrator creates a new notification orchestrator.
func NewOrchestrator(svc *Service, js nats.JetStreamContext) *Orchestrator {
	return &Orchestrator{
		svc:    svc,
		js:     js,
		stopCh: make(chan struct{}),
	}
}

// DomainEvent represents a domain event published to NATS.
type DomainEvent struct {
	Type          string          `json:"type"`
	TenantID      uuid.UUID       `json:"tenantId"`
	ActorID       uuid.UUID       `json:"actorId"`
	EntityType    string          `json:"entityType"`
	EntityID      uuid.UUID       `json:"entityId"`
	Data          json.RawMessage `json:"data"`
	CorrelationID string          `json:"correlationId,omitempty"`
	Timestamp     time.Time       `json:"timestamp"`
}

// eventSubject maps NATS subjects to their consumer names.
var eventSubjects = []struct {
	subject  string
	consumer string
}{
	{"notify.itsm.>", "NOTIFY_ITSM"},
	{"notify.governance.>", "NOTIFY_GOVERNANCE"},
	{"notify.cmdb.>", "NOTIFY_CMDB"},
	{"notify.grc.>", "NOTIFY_GRC"},
}

// Start subscribes to domain event subjects and begins processing.
func (o *Orchestrator) Start(ctx context.Context) error {
	if o.js == nil {
		slog.Warn("NATS JetStream not available, orchestrator will not process events")
		return nil
	}

	// Ensure the NOTIFICATIONS stream covers our subjects.
	_, err := o.js.AddStream(&nats.StreamConfig{
		Name:     "NOTIFICATIONS",
		Subjects: []string{"notify.>"},
		Storage:  nats.FileStorage,
	})
	if err != nil {
		slog.Warn("stream may already exist", "stream", "NOTIFICATIONS", "error", err)
	}

	for _, es := range eventSubjects {
		sub, err := o.js.Subscribe(es.subject, func(msg *nats.Msg) {
			o.handleEvent(ctx, msg)
		}, nats.Durable(es.consumer), nats.AckExplicit())
		if err != nil {
			slog.Error("failed to subscribe", "subject", es.subject, "error", err)
			continue
		}
		o.subs = append(o.subs, sub)
		slog.Info("subscribed to NATS subject", "subject", es.subject, "consumer", es.consumer)
	}

	return nil
}

// Stop unsubscribes from all NATS subjects.
func (o *Orchestrator) Stop() {
	close(o.stopCh)
	for _, sub := range o.subs {
		if err := sub.Unsubscribe(); err != nil {
			slog.Warn("failed to unsubscribe", "error", err)
		}
	}
}

// handleEvent processes a single domain event from NATS.
func (o *Orchestrator) handleEvent(ctx context.Context, msg *nats.Msg) {
	var event DomainEvent
	if err := json.Unmarshal(msg.Data, &event); err != nil {
		slog.Error("failed to unmarshal domain event", "error", err, "subject", msg.Subject)
		msg.Ack()
		return
	}

	slog.Debug("processing domain event",
		"type", event.Type,
		"subject", msg.Subject,
		"entity_type", event.EntityType,
		"entity_id", event.EntityID,
	)

	// Resolve notification details from event type.
	notifConfig := resolveNotificationConfig(event.Type)
	if notifConfig == nil {
		slog.Debug("no notification config for event type", "type", event.Type)
		msg.Ack()
		return
	}

	// Resolve recipients.
	recipients, err := o.resolveRecipients(ctx, event, notifConfig)
	if err != nil {
		slog.Error("failed to resolve recipients", "error", err, "event_type", event.Type)
		msg.Nak()
		return
	}

	// Enqueue notifications for each recipient and channel.
	for _, recipient := range recipients {
		// Check user preferences.
		prefs, err := o.svc.GetUserPreferences(ctx, recipient.UserID)
		if err != nil {
			slog.Warn("failed to get user preferences", "error", err, "user_id", recipient.UserID)
			prefs = &UserPreferences{
				ChannelPreferences: map[string]bool{"email": true, "teams": true, "in_app": true},
				DigestFrequency:    "immediate",
			}
		}

		// Check if notification type is disabled.
		if isTypeDisabled(prefs.DisabledTypes, event.Type) {
			continue
		}

		// Check quiet hours.
		if isInQuietHours(prefs.QuietHoursStart, prefs.QuietHoursEnd) {
			// Only suppress email/teams, still deliver in-app.
			prefs.ChannelPreferences["email"] = false
			prefs.ChannelPreferences["teams"] = false
		}

		// Enqueue for each enabled channel.
		for _, channel := range notifConfig.Channels {
			if enabled, ok := prefs.ChannelPreferences[channel]; !ok || !enabled {
				continue
			}

			actionURL := extractActionURL(event.Data)
			req := EnqueueRequest{
				TenantID:       event.TenantID,
				Channel:        channel,
				RecipientID:    &recipient.UserID,
				RecipientEmail: recipient.Email,
				TemplateKey:    notifConfig.TemplateKey(channel),
				TemplateData:   event.Data,
				Priority:       notifConfig.Priority,
				CorrelationID:  event.CorrelationID,
				ActionURL:      actionURL,
			}

			if _, err := o.svc.Enqueue(ctx, req); err != nil {
				slog.Error("failed to enqueue notification",
					"error", err,
					"channel", channel,
					"recipient", recipient.Email,
					"template", notifConfig.TemplateKey(channel),
				)
			}
		}
	}

	msg.Ack()
}

// notificationConfig maps event types to notification templates and channels.
type notificationConfig struct {
	EmailTemplate string
	TeamsTemplate string
	InAppTemplate string
	Channels      []string
	Priority      int
}

func (nc *notificationConfig) TemplateKey(channel string) string {
	switch channel {
	case "email":
		return nc.EmailTemplate
	case "teams":
		return nc.TeamsTemplate
	case "in_app":
		if nc.InAppTemplate != "" {
			return nc.InAppTemplate
		}
		return nc.EmailTemplate
	default:
		return nc.EmailTemplate
	}
}

// resolveNotificationConfig returns the notification configuration for an event type.
func resolveNotificationConfig(eventType string) *notificationConfig {
	configs := map[string]*notificationConfig{
		"itsm.sla.warning": {
			EmailTemplate: "sla_breach_warning",
			TeamsTemplate: "teams_sla_breach_card",
			Channels:      []string{"email", "teams", "in_app"},
			Priority:      8,
		},
		"itsm.sla.breached": {
			EmailTemplate: "sla_breach_notification",
			TeamsTemplate: "teams_sla_breach_card",
			Channels:      []string{"email", "teams", "in_app"},
			Priority:      9,
		},
		"governance.approval.required": {
			EmailTemplate: "approval_request",
			TeamsTemplate: "teams_approval_card",
			Channels:      []string{"email", "teams", "in_app"},
			Priority:      7,
		},
		"itsm.ticket.assigned": {
			EmailTemplate: "assignment_notification",
			Channels:      []string{"email", "in_app"},
			Priority:      6,
		},
		"itsm.ticket.escalated": {
			EmailTemplate: "escalation_notification",
			Channels:      []string{"email", "teams", "in_app"},
			Priority:      8,
		},
		"cmdb.warranty.expiring": {
			EmailTemplate: "license_renewal_reminder",
			Channels:      []string{"email", "in_app"},
			Priority:      5,
		},
		"cmdb.license.noncompliant": {
			EmailTemplate: "license_renewal_reminder",
			Channels:      []string{"email", "in_app"},
			Priority:      7,
		},
		"grc.audit.scheduled": {
			EmailTemplate: "audit_evidence_request",
			Channels:      []string{"email", "in_app"},
			Priority:      6,
		},
		"grc.access_review.required": {
			EmailTemplate: "audit_evidence_request",
			Channels:      []string{"email", "in_app"},
			Priority:      6,
		},
		"itsm.incident.major": {
			EmailTemplate: "major_incident",
			TeamsTemplate: "teams_major_incident_card",
			Channels:      []string{"email", "teams", "in_app"},
			Priority:      10,
		},
		"governance.action_due_soon": {
			EmailTemplate: "action_due_reminder",
			Channels:      []string{"email", "in_app"},
			Priority:      5,
		},
		"governance.action_overdue": {
			EmailTemplate: "action_overdue_reminder",
			Channels:      []string{"email", "teams", "in_app"},
			Priority:      7,
		},
		"governance.action_critical_overdue": {
			EmailTemplate: "action_critical_overdue",
			Channels:      []string{"email", "teams", "in_app"},
			Priority:      9,
		},
	}

	return configs[eventType]
}

// recipient represents a resolved notification recipient.
type recipient struct {
	UserID uuid.UUID
	Email  string
}

// resolveRecipients determines who should receive a notification based on event type.
func (o *Orchestrator) resolveRecipients(ctx context.Context, event DomainEvent, _ *notificationConfig) ([]recipient, error) {
	var recipients []recipient

	// Try to extract recipient information from event data.
	var eventData map[string]any
	if err := json.Unmarshal(event.Data, &eventData); err == nil {
		// Direct recipient (e.g., assignee, approver).
		if recipientID, ok := eventData["recipientId"].(string); ok {
			uid, err := uuid.Parse(recipientID)
			if err == nil {
				var email string
				_ = o.svc.pool.QueryRow(ctx,
					`SELECT email FROM users WHERE id = $1 AND is_active = true`,
					uid,
				).Scan(&email)
				if email != "" {
					recipients = append(recipients, recipient{UserID: uid, Email: email})
				}
			}
		}

		// Multiple recipients (e.g., team members for major incident).
		if recipientIDs, ok := eventData["recipientIds"].([]any); ok {
			for _, rid := range recipientIDs {
				if ridStr, ok := rid.(string); ok {
					uid, err := uuid.Parse(ridStr)
					if err == nil {
						var email string
						_ = o.svc.pool.QueryRow(ctx,
							`SELECT email FROM users WHERE id = $1 AND is_active = true`,
							uid,
						).Scan(&email)
						if email != "" {
							recipients = append(recipients, recipient{UserID: uid, Email: email})
						}
					}
				}
			}
		}
	}

	return recipients, nil
}

// isTypeDisabled checks if a notification type is in the user's disabled list.
func isTypeDisabled(disabled []string, eventType string) bool {
	for _, d := range disabled {
		if d == eventType {
			return true
		}
	}
	return false
}

// isInQuietHours checks if the current time falls within quiet hours.
func isInQuietHours(start, end *string) bool {
	if start == nil || end == nil {
		return false
	}
	now := time.Now()
	startTime, err := time.Parse("15:04", *start)
	if err != nil {
		return false
	}
	endTime, err := time.Parse("15:04", *end)
	if err != nil {
		return false
	}

	currentMinutes := now.Hour()*60 + now.Minute()
	startMinutes := startTime.Hour()*60 + startTime.Minute()
	endMinutes := endTime.Hour()*60 + endTime.Minute()

	if startMinutes <= endMinutes {
		return currentMinutes >= startMinutes && currentMinutes <= endMinutes
	}
	// Overnight quiet hours (e.g., 22:00 - 07:00).
	return currentMinutes >= startMinutes || currentMinutes <= endMinutes
}

// extractActionURL extracts an action URL from event data.
func extractActionURL(data json.RawMessage) *string {
	var eventData map[string]any
	if err := json.Unmarshal(data, &eventData); err != nil {
		return nil
	}
	if url, ok := eventData["actionUrl"].(string); ok && url != "" {
		return &url
	}
	return nil
}
