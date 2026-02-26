package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/msgraph"
)

// Service manages the notification lifecycle: template rendering, outbox writes,
// delivery via email/Teams/in-app, and DLQ management.
type Service struct {
	pool  *pgxpool.Pool
	graph *msgraph.Client

	tmplCache map[string]*cachedTemplate
	tmplMu    sync.RWMutex
}

type cachedTemplate struct {
	SubjectTmpl *template.Template
	BodyTmpl    *template.Template
	Channel     string
	FetchedAt   time.Time
}

// NewService creates a new notification service.
func NewService(pool *pgxpool.Pool, graph *msgraph.Client) *Service {
	return &Service{
		pool:      pool,
		graph:     graph,
		tmplCache: make(map[string]*cachedTemplate),
	}
}

// Enqueue writes a notification into the outbox within the caller's transaction
// (or standalone). The outbox processor will pick it up and deliver it.
func (s *Service) Enqueue(ctx context.Context, req EnqueueRequest) (uuid.UUID, error) {
	id := uuid.New()

	// Render template eagerly if possible.
	subject, body, err := s.renderTemplate(ctx, req.TemplateKey, req.Channel, req.TemplateData)
	if err != nil {
		slog.Warn("failed to render template, will retry later",
			"template_key", req.TemplateKey, "error", err)
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO notification_outbox
			(id, tenant_id, channel, recipient_id, recipient_email, template_key,
			 template_data, subject, rendered_body, priority, correlation_id, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
		id, req.TenantID, req.Channel, req.RecipientID, req.RecipientEmail,
		req.TemplateKey, req.TemplateData,
		subject, body, req.Priority, req.CorrelationID,
	)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert outbox: %w", err)
	}

	// If channel is in_app, also create the in-app notification record.
	if req.Channel == "in_app" && req.RecipientID != nil {
		title := subject
		if title == "" {
			title = req.TemplateKey
		}
		message := body
		if message == "" {
			message = "You have a new notification"
		}
		_, err = s.pool.Exec(ctx,
			`INSERT INTO notifications
				(tenant_id, user_id, type, title, message, action_url, outbox_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			req.TenantID, *req.RecipientID, req.TemplateKey, title, message,
			req.ActionURL, id,
		)
		if err != nil {
			slog.Error("failed to create in-app notification", "error", err, "outbox_id", id)
		}
	}

	return id, nil
}

// EnqueueRequest contains all fields needed to enqueue a notification.
type EnqueueRequest struct {
	TenantID       uuid.UUID        `json:"tenantId"`
	Channel        string           `json:"channel"`
	RecipientID    *uuid.UUID       `json:"recipientId,omitempty"`
	RecipientEmail string           `json:"recipientEmail,omitempty"`
	TemplateKey    string           `json:"templateKey"`
	TemplateData   json.RawMessage  `json:"templateData"`
	Priority       int              `json:"priority"`
	CorrelationID  string           `json:"correlationId,omitempty"`
	ActionURL      *string          `json:"actionUrl,omitempty"`
}

// renderTemplate fetches and renders a notification template.
func (s *Service) renderTemplate(ctx context.Context, key, channel string, data json.RawMessage) (string, string, error) {
	cached, err := s.getTemplate(ctx, key)
	if err != nil {
		return "", "", err
	}

	var templateData map[string]any
	if err := json.Unmarshal(data, &templateData); err != nil {
		return "", "", fmt.Errorf("unmarshal template data: %w", err)
	}

	var subject string
	if cached.SubjectTmpl != nil {
		var buf bytes.Buffer
		if err := cached.SubjectTmpl.Execute(&buf, templateData); err != nil {
			return "", "", fmt.Errorf("render subject: %w", err)
		}
		subject = buf.String()
	}

	var body string
	if cached.BodyTmpl != nil {
		var buf bytes.Buffer
		if err := cached.BodyTmpl.Execute(&buf, templateData); err != nil {
			return "", "", fmt.Errorf("render body: %w", err)
		}
		body = buf.String()
	}

	return subject, body, nil
}

func (s *Service) getTemplate(ctx context.Context, key string) (*cachedTemplate, error) {
	s.tmplMu.RLock()
	cached, ok := s.tmplCache[key]
	s.tmplMu.RUnlock()

	if ok && time.Since(cached.FetchedAt) < 5*time.Minute {
		return cached, nil
	}

	var (
		channel        string
		subjectTmplStr *string
		bodyTmplStr    string
	)

	err := s.pool.QueryRow(ctx,
		`SELECT channel, subject_template, body_template
		 FROM notification_templates WHERE key = $1 AND is_active = true`,
		key,
	).Scan(&channel, &subjectTmplStr, &bodyTmplStr)
	if err != nil {
		return nil, fmt.Errorf("fetch template %s: %w", key, err)
	}

	ct := &cachedTemplate{
		Channel:   channel,
		FetchedAt: time.Now(),
	}

	if subjectTmplStr != nil && *subjectTmplStr != "" {
		ct.SubjectTmpl, err = template.New(key + "_subject").Parse(*subjectTmplStr)
		if err != nil {
			return nil, fmt.Errorf("parse subject template: %w", err)
		}
	}

	ct.BodyTmpl, err = template.New(key + "_body").Parse(bodyTmplStr)
	if err != nil {
		return nil, fmt.Errorf("parse body template: %w", err)
	}

	s.tmplMu.Lock()
	s.tmplCache[key] = ct
	s.tmplMu.Unlock()

	return ct, nil
}

// GetUserNotifications returns paginated in-app notifications for a user.
func (s *Service) GetUserNotifications(ctx context.Context, userID uuid.UUID, limit, offset int) ([]InAppNotification, int64, error) {
	var total int64
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1`,
		userID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count notifications: %w", err)
	}

	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, type, title, message, action_url, is_read, read_at, created_at
		 FROM notifications WHERE user_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("query notifications: %w", err)
	}
	defer rows.Close()

	var notifications []InAppNotification
	for rows.Next() {
		var n InAppNotification
		if err := rows.Scan(&n.ID, &n.TenantID, &n.Type, &n.Title, &n.Message,
			&n.ActionURL, &n.IsRead, &n.ReadAt, &n.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan notification: %w", err)
		}
		notifications = append(notifications, n)
	}

	return notifications, total, nil
}

// GetUnreadCount returns the number of unread notifications for a user.
func (s *Service) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
		userID,
	).Scan(&count)
	return count, err
}

// MarkAsRead marks a single notification as read.
func (s *Service) MarkAsRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE notifications SET is_read = true, read_at = NOW()
		 WHERE id = $1 AND user_id = $2 AND is_read = false`,
		notificationID, userID,
	)
	if err != nil {
		return fmt.Errorf("mark as read: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or already read")
	}
	return nil
}

// MarkAllAsRead marks all unread notifications as read for a user.
func (s *Service) MarkAllAsRead(ctx context.Context, userID uuid.UUID) (int64, error) {
	tag, err := s.pool.Exec(ctx,
		`UPDATE notifications SET is_read = true, read_at = NOW()
		 WHERE user_id = $1 AND is_read = false`,
		userID,
	)
	if err != nil {
		return 0, fmt.Errorf("mark all as read: %w", err)
	}
	return tag.RowsAffected(), nil
}

// GetUserPreferences returns the notification preferences for a user.
func (s *Service) GetUserPreferences(ctx context.Context, userID uuid.UUID) (*UserPreferences, error) {
	var prefs UserPreferences
	var channelJSON json.RawMessage
	var disabledTypes []string

	err := s.pool.QueryRow(ctx,
		`SELECT id, channel_preferences, digest_frequency, quiet_hours_start, quiet_hours_end, disabled_types, updated_at
		 FROM user_notification_preferences WHERE user_id = $1`,
		userID,
	).Scan(&prefs.ID, &channelJSON, &prefs.DigestFrequency,
		&prefs.QuietHoursStart, &prefs.QuietHoursEnd, &disabledTypes, &prefs.UpdatedAt)

	if err == pgx.ErrNoRows {
		// Return defaults.
		return &UserPreferences{
			ChannelPreferences: map[string]bool{"email": true, "teams": true, "in_app": true},
			DigestFrequency:    "immediate",
			DisabledTypes:      []string{},
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get preferences: %w", err)
	}

	if err := json.Unmarshal(channelJSON, &prefs.ChannelPreferences); err != nil {
		prefs.ChannelPreferences = map[string]bool{"email": true, "teams": true, "in_app": true}
	}
	prefs.DisabledTypes = disabledTypes
	prefs.UserID = userID

	return &prefs, nil
}

// UpdateUserPreferences creates or updates notification preferences for a user.
func (s *Service) UpdateUserPreferences(ctx context.Context, userID uuid.UUID, prefs UpdatePreferencesRequest) error {
	channelJSON, err := json.Marshal(prefs.ChannelPreferences)
	if err != nil {
		return fmt.Errorf("marshal channel preferences: %w", err)
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO user_notification_preferences
			(user_id, channel_preferences, digest_frequency, quiet_hours_start, quiet_hours_end, disabled_types)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (user_id) DO UPDATE SET
			channel_preferences = EXCLUDED.channel_preferences,
			digest_frequency = EXCLUDED.digest_frequency,
			quiet_hours_start = EXCLUDED.quiet_hours_start,
			quiet_hours_end = EXCLUDED.quiet_hours_end,
			disabled_types = EXCLUDED.disabled_types`,
		userID, channelJSON, prefs.DigestFrequency,
		prefs.QuietHoursStart, prefs.QuietHoursEnd, prefs.DisabledTypes,
	)
	if err != nil {
		return fmt.Errorf("upsert preferences: %w", err)
	}
	return nil
}

// InAppNotification represents a stored in-app notification.
type InAppNotification struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	ActionURL *string    `json:"actionUrl,omitempty"`
	IsRead    bool       `json:"isRead"`
	ReadAt    *time.Time `json:"readAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

// UserPreferences holds a user's notification preferences.
type UserPreferences struct {
	ID                 uuid.UUID        `json:"id"`
	UserID             uuid.UUID        `json:"userId"`
	ChannelPreferences map[string]bool  `json:"channelPreferences"`
	DigestFrequency    string           `json:"digestFrequency"`
	QuietHoursStart    *string          `json:"quietHoursStart,omitempty"`
	QuietHoursEnd      *string          `json:"quietHoursEnd,omitempty"`
	DisabledTypes      []string         `json:"disabledTypes"`
	UpdatedAt          *time.Time       `json:"updatedAt,omitempty"`
}

// UpdatePreferencesRequest is the request body for updating preferences.
type UpdatePreferencesRequest struct {
	ChannelPreferences map[string]bool `json:"channelPreferences"`
	DigestFrequency    string          `json:"digestFrequency"`
	QuietHoursStart    *string         `json:"quietHoursStart,omitempty"`
	QuietHoursEnd      *string         `json:"quietHoursEnd,omitempty"`
	DisabledTypes      []string        `json:"disabledTypes"`
}
