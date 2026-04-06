package email

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"log/slog"
	"mime/multipart"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

// ticketRefRe matches ticket references like [INC-000123] or [SR-000456] in the subject.
var ticketRefRe = regexp.MustCompile(`\[(INC|SR|CHG|PRB)-(\d+)\]`)

// InboundHandler handles SendGrid Inbound Parse webhook requests.
type InboundHandler struct {
	pool     *pgxpool.Pool
	minio    *minio.Client
	minioCfg config.MinIOConfig
	emailCfg config.InboundEmailConfig
	auditSvc *audit.AuditService
}

// NewInboundHandler creates a new handler for processing inbound emails.
func NewInboundHandler(
	pool *pgxpool.Pool,
	minioClient *minio.Client,
	minioCfg config.MinIOConfig,
	emailCfg config.InboundEmailConfig,
	auditSvc *audit.AuditService,
) *InboundHandler {
	return &InboundHandler{
		pool:     pool,
		minio:    minioClient,
		minioCfg: minioCfg,
		emailCfg: emailCfg,
		auditSvc: auditSvc,
	}
}

// HandleInbound processes a SendGrid Inbound Parse webhook POST.
// POST /api/v1/webhooks/email/inbound
func (h *InboundHandler) HandleInbound(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Verify webhook secret if configured.
	// SendGrid Inbound Parse supports basic-auth or a shared secret in a custom header / query param.
	if h.emailCfg.WebhookSecret != "" {
		provided := r.Header.Get("X-Webhook-Secret")
		if provided == "" {
			provided = r.URL.Query().Get("secret")
		}
		if !secureCompare(provided, h.emailCfg.WebhookSecret) {
			slog.WarnContext(ctx, "inbound email: invalid webhook secret")
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	// SendGrid sends multipart/form-data.
	if err := r.ParseMultipartForm(25 << 20); err != nil { // 25 MB max
		slog.ErrorContext(ctx, "failed to parse inbound email form", "error", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	from := r.FormValue("from")
	to := r.FormValue("to")
	subject := r.FormValue("subject")
	textBody := r.FormValue("text")
	htmlBody := r.FormValue("html")
	messageID := r.FormValue("Message-ID")

	// Extract sender email from "Name <email>" format.
	senderEmail := extractEmail(from)
	if senderEmail == "" {
		slog.WarnContext(ctx, "inbound email: no sender email found", "from", from)
		w.WriteHeader(http.StatusOK) // Return 200 to avoid retries.
		return
	}

	slog.InfoContext(ctx, "inbound email received",
		"from", senderEmail,
		"to", to,
		"subject", subject,
		"message_id", messageID,
	)

	// Look up the sender in our users table.
	senderUserID, tenantID, err := h.findUserByEmail(ctx, senderEmail)
	if err != nil {
		slog.WarnContext(ctx, "inbound email: sender not found, using system fallback",
			"email", senderEmail,
			"error", err,
		)
		// Look up a fallback system user.
		senderUserID, tenantID, err = h.getSystemUser(ctx)
		if err != nil {
			slog.ErrorContext(ctx, "inbound email: no system user found", "error", err)
			w.WriteHeader(http.StatusOK)
			return
		}
	}

	// Check if this is a reply to an existing ticket (subject contains ticket ref).
	if match := ticketRefRe.FindStringSubmatch(subject); len(match) == 3 {
		ticketNumber := match[1] + "-" + match[2]
		if h.handleReply(ctx, ticketNumber, senderUserID, tenantID, senderEmail, textBody, messageID) {
			w.WriteHeader(http.StatusOK)
			return
		}
		// If ticket not found, fall through to create a new ticket.
	}

	// Create a new ticket from the email.
	h.handleNewTicket(ctx, w, senderUserID, tenantID, senderEmail, subject, textBody, htmlBody, messageID, r.MultipartForm)
}

// handleReply adds a comment to an existing ticket. Returns true if handled.
func (h *InboundHandler) handleReply(
	ctx context.Context,
	ticketNumber string,
	senderUserID, tenantID uuid.UUID,
	senderEmail, body, messageID string,
) bool {
	// Find the ticket by number.
	var ticketID uuid.UUID
	err := h.pool.QueryRow(ctx,
		`SELECT id FROM tickets WHERE ticket_number = $1 AND tenant_id = $2`,
		ticketNumber, tenantID,
	).Scan(&ticketID)
	if err != nil {
		if err == pgx.ErrNoRows {
			slog.WarnContext(ctx, "inbound email: ticket not found for reply",
				"ticket_number", ticketNumber,
			)
			return false
		}
		slog.ErrorContext(ctx, "inbound email: failed to look up ticket", "error", err)
		return false
	}

	// Clean the email body (strip quoted reply text).
	cleanBody := stripQuotedReply(body)
	if strings.TrimSpace(cleanBody) == "" {
		cleanBody = "(empty reply)"
	}

	commentID := uuid.New()
	now := time.Now().UTC()

	_, err = h.pool.Exec(ctx,
		`INSERT INTO ticket_comments (id, ticket_id, author_id, content, is_internal, attachments, created_at)
		 VALUES ($1, $2, $3, $4, false, '{}', $5)`,
		commentID, ticketID, senderUserID, cleanBody, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "inbound email: failed to add reply comment", "error", err)
		return false
	}

	// Append message ID to the ticket's email_message_ids.
	if messageID != "" {
		_, _ = h.pool.Exec(ctx,
			`UPDATE tickets SET email_message_ids = array_append(email_message_ids, $1) WHERE id = $2`,
			messageID, ticketID,
		)
	}

	// Auto-transition pending_customer -> in_progress.
	_, _ = h.pool.Exec(ctx,
		`UPDATE tickets SET status = 'in_progress', updated_at = $1
		 WHERE id = $2 AND status = 'pending_customer'`,
		now, ticketID,
	)

	slog.InfoContext(ctx, "inbound email: reply comment added",
		"ticket_number", ticketNumber,
		"ticket_id", ticketID,
		"comment_id", commentID,
		"sender", senderEmail,
	)

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"ticket_id": ticketID,
		"source":    "email_inbound",
		"sender":    senderEmail,
	})
	_ = h.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    senderUserID,
		Action:     "create:ticket_comment",
		EntityType: "ticket_comment",
		EntityID:   commentID,
		Changes:    changes,
	})

	return true
}

// handleNewTicket creates a new ticket from an inbound email.
func (h *InboundHandler) handleNewTicket(
	ctx context.Context,
	w http.ResponseWriter,
	senderUserID, tenantID uuid.UUID,
	senderEmail, subject, textBody, htmlBody, messageID string,
	form *multipart.Form,
) {
	if strings.TrimSpace(subject) == "" {
		subject = "(No subject)"
	}

	// Use text body; fall back to html body stripped of tags.
	description := textBody
	if strings.TrimSpace(description) == "" {
		description = stripHTML(htmlBody)
	}
	if strings.TrimSpace(description) == "" {
		description = "(No content)"
	}

	ticketID := uuid.New()
	now := time.Now().UTC()

	// Generate a thread ID for email threading.
	threadID := fmt.Sprintf("<%s@%s>", ticketID, h.emailCfg.Domain)

	// Look up the user's org_unit_id.
	var orgUnitID *uuid.UUID
	var tmpOrgUnit uuid.UUID
	err := h.pool.QueryRow(ctx,
		`SELECT org_unit_id FROM users WHERE id = $1 AND org_unit_id IS NOT NULL`,
		senderUserID,
	).Scan(&tmpOrgUnit)
	if err == nil {
		orgUnitID = &tmpOrgUnit
	}

	query := `
		INSERT INTO tickets (
			id, tenant_id, type,
			category, subcategory, title, description,
			priority, urgency, impact, status, channel,
			reporter_id, reporter_email, email_thread_id, email_message_ids,
			org_unit_id, tags, custom_fields,
			created_at, updated_at
		) VALUES (
			$1, $2, 'incident',
			NULL, NULL, $3, $4,
			'P3_medium', 'medium', 'medium', 'logged', 'email',
			$5, $6, $7, $8,
			$9, '{}', 'null',
			$10, $11
		)
		RETURNING ticket_number`

	emailMsgIDs := []string{}
	if messageID != "" {
		emailMsgIDs = []string{messageID}
	}

	var ticketNumber string
	err = h.pool.QueryRow(ctx, query,
		ticketID, tenantID, subject, description,
		senderUserID, senderEmail, threadID, emailMsgIDs,
		orgUnitID,
		now, now,
	).Scan(&ticketNumber)
	if err != nil {
		slog.ErrorContext(ctx, "inbound email: failed to create ticket", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// Upload any attachments to MinIO.
	if form != nil && form.File != nil {
		h.uploadAttachments(ctx, ticketID, tenantID, form)
	}

	slog.InfoContext(ctx, "inbound email: ticket created",
		"ticket_number", ticketNumber,
		"ticket_id", ticketID,
		"sender", senderEmail,
		"subject", subject,
	)

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"title":    subject,
		"channel":  "email",
		"sender":   senderEmail,
		"priority": "P3_medium",
	})
	_ = h.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    senderUserID,
		Action:     "create:ticket",
		EntityType: "ticket",
		EntityID:   ticketID,
		Changes:    changes,
	})

	w.WriteHeader(http.StatusOK)
}

// uploadAttachments stores email attachments in MinIO.
func (h *InboundHandler) uploadAttachments(
	ctx context.Context,
	ticketID, tenantID uuid.UUID,
	form *multipart.Form,
) {
	for _, fileHeaders := range form.File {
		for _, fh := range fileHeaders {
			f, err := fh.Open()
			if err != nil {
				slog.WarnContext(ctx, "inbound email: failed to open attachment",
					"filename", fh.Filename, "error", err)
				continue
			}

			buf := new(bytes.Buffer)
			if _, err := buf.ReadFrom(f); err != nil {
				f.Close()
				slog.WarnContext(ctx, "inbound email: failed to read attachment",
					"filename", fh.Filename, "error", err)
				continue
			}
			f.Close()

			contentType := fh.Header.Get("Content-Type")
			if contentType == "" {
				contentType = "application/octet-stream"
			}

			objectKey := fmt.Sprintf("tenants/%s/tickets/%s/attachments/%s/%s",
				tenantID, ticketID, uuid.New(), fh.Filename)

			_, err = h.minio.PutObject(ctx, h.minioCfg.BucketAttachment, objectKey,
				bytes.NewReader(buf.Bytes()), int64(buf.Len()),
				minio.PutObjectOptions{ContentType: contentType},
			)
			if err != nil {
				slog.ErrorContext(ctx, "inbound email: failed to upload attachment",
					"filename", fh.Filename, "error", err)
				continue
			}

			slog.DebugContext(ctx, "inbound email: attachment uploaded",
				"filename", fh.Filename,
				"object_key", objectKey,
			)
		}
	}
}

// findUserByEmail looks up a user by their email address.
func (h *InboundHandler) findUserByEmail(ctx context.Context, email string) (uuid.UUID, uuid.UUID, error) {
	var userID, tenantID uuid.UUID
	err := h.pool.QueryRow(ctx,
		`SELECT id, tenant_id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true LIMIT 1`,
		email,
	).Scan(&userID, &tenantID)
	if err != nil {
		return uuid.Nil, uuid.Nil, fmt.Errorf("user not found: %w", err)
	}
	return userID, tenantID, nil
}

// getSystemUser returns the first global_admin user as a fallback reporter.
func (h *InboundHandler) getSystemUser(ctx context.Context) (uuid.UUID, uuid.UUID, error) {
	var userID, tenantID uuid.UUID
	err := h.pool.QueryRow(ctx,
		`SELECT u.id, u.tenant_id
		 FROM users u
		 JOIN role_bindings rb ON rb.user_id = u.id
		 JOIN roles r ON r.id = rb.role_id
		 WHERE r.name = 'global_admin' AND u.is_active = true
		 LIMIT 1`,
	).Scan(&userID, &tenantID)
	if err != nil {
		return uuid.Nil, uuid.Nil, fmt.Errorf("system user not found: %w", err)
	}
	return userID, tenantID, nil
}

// extractEmail extracts the email address from a "Name <email>" string.
func extractEmail(from string) string {
	from = strings.TrimSpace(from)
	if from == "" {
		return ""
	}

	// Try to parse "Name <email>" format.
	if idx := strings.LastIndex(from, "<"); idx >= 0 {
		end := strings.Index(from[idx:], ">")
		if end > 0 {
			return strings.TrimSpace(from[idx+1 : idx+end])
		}
	}

	// Might already be a plain email.
	if strings.Contains(from, "@") {
		return strings.TrimSpace(from)
	}

	return ""
}

// stripQuotedReply removes quoted reply text from an email body.
// Looks for common reply markers like "On ... wrote:" or "> " prefixed lines.
func stripQuotedReply(body string) string {
	lines := strings.Split(body, "\n")
	var result []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Stop at "On ... wrote:" line.
		if strings.HasPrefix(trimmed, "On ") && strings.HasSuffix(trimmed, "wrote:") {
			break
		}

		// Stop at "---------- Forwarded message ----------".
		if strings.Contains(trimmed, "---------- Forwarded message") {
			break
		}

		// Stop at "> From:" (quoted header).
		if strings.HasPrefix(trimmed, "> From:") {
			break
		}

		// Skip lines that are just ">" (empty quote).
		if trimmed == ">" {
			continue
		}

		// Skip quoted lines (but keep the first few in case it's inline quoting).
		if strings.HasPrefix(trimmed, ">") {
			continue
		}

		result = append(result, line)
	}

	return strings.TrimSpace(strings.Join(result, "\n"))
}

// stripHTML removes HTML tags from a string (basic).
func stripHTML(s string) string {
	// Remove script/style blocks.
	s = regexp.MustCompile(`(?is)<script.*?</script>`).ReplaceAllString(s, "")
	s = regexp.MustCompile(`(?is)<style.*?</style>`).ReplaceAllString(s, "")

	// Replace <br> and <p> with newlines.
	s = regexp.MustCompile(`(?i)<br\s*/?>|</p>`).ReplaceAllString(s, "\n")

	// Remove remaining tags.
	s = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(s, "")

	// Decode common entities.
	s = strings.ReplaceAll(s, "&amp;", "&")
	s = strings.ReplaceAll(s, "&lt;", "<")
	s = strings.ReplaceAll(s, "&gt;", ">")
	s = strings.ReplaceAll(s, "&quot;", `"`)
	s = strings.ReplaceAll(s, "&#39;", "'")
	s = strings.ReplaceAll(s, "&nbsp;", " ")

	return strings.TrimSpace(s)
}

// secureCompare performs a constant-time comparison to prevent timing attacks.
func secureCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

