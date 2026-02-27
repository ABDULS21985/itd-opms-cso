package system

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// EmailTemplateService
// ──────────────────────────────────────────────

// EmailTemplateService handles business logic for email template management.
type EmailTemplateService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewEmailTemplateService creates a new EmailTemplateService.
func NewEmailTemplateService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *EmailTemplateService {
	return &EmailTemplateService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanEmailTemplate(row pgx.Row) (EmailTemplate, error) {
	var t EmailTemplate
	err := row.Scan(
		&t.ID, &t.TenantID, &t.Name, &t.Subject, &t.BodyHTML, &t.BodyText,
		&t.Variables, &t.Category, &t.IsActive, &t.UpdatedBy, &t.CreatedAt, &t.UpdatedAt,
	)
	return t, err
}

func scanEmailTemplates(rows pgx.Rows) ([]EmailTemplate, error) {
	var templates []EmailTemplate
	for rows.Next() {
		var t EmailTemplate
		if err := rows.Scan(
			&t.ID, &t.TenantID, &t.Name, &t.Subject, &t.BodyHTML, &t.BodyText,
			&t.Variables, &t.Category, &t.IsActive, &t.UpdatedBy, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if templates == nil {
		templates = []EmailTemplate{}
	}
	return templates, nil
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────

// ListTemplates returns email templates with optional category filter and pagination.
func (s *EmailTemplateService) ListTemplates(ctx context.Context, tenantID uuid.UUID, category string, page, pageSize int) ([]EmailTemplate, int64, error) {
	args := []interface{}{tenantID}
	where := "(tenant_id IS NULL OR tenant_id = $1)"
	argIdx := 2

	if category != "" {
		where += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}

	// Count query.
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM email_templates WHERE %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count email templates: %w", err)
	}

	// Data query.
	offset := (page - 1) * pageSize
	dataQuery := fmt.Sprintf(`
		SELECT id, tenant_id, name, subject, body_html, body_text, variables,
		       category, is_active, updated_by, created_at, updated_at
		FROM email_templates
		WHERE %s
		ORDER BY category, name ASC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, pageSize, offset)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list email templates: %w", err)
	}
	defer rows.Close()

	templates, err := scanEmailTemplates(rows)
	if err != nil {
		return nil, 0, fmt.Errorf("scan email templates: %w", err)
	}

	return templates, total, nil
}

// GetTemplate returns a single email template by ID.
func (s *EmailTemplateService) GetTemplate(ctx context.Context, templateID uuid.UUID) (*EmailTemplate, error) {
	query := `
		SELECT id, tenant_id, name, subject, body_html, body_text, variables,
		       category, is_active, updated_by, created_at, updated_at
		FROM email_templates
		WHERE id = $1`

	t, err := scanEmailTemplate(s.pool.QueryRow(ctx, query, templateID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("email_template", templateID.String())
		}
		return nil, fmt.Errorf("get email template: %w", err)
	}

	return &t, nil
}

// GetTemplateByName returns an email template by name with tenant override resolution.
// Tenant-specific templates take priority over global (tenant_id IS NULL) templates.
func (s *EmailTemplateService) GetTemplateByName(ctx context.Context, tenantID uuid.UUID, name string) (*EmailTemplate, error) {
	query := `
		SELECT id, tenant_id, name, subject, body_html, body_text, variables,
		       category, is_active, updated_by, created_at, updated_at
		FROM email_templates
		WHERE name = $1 AND (tenant_id IS NULL OR tenant_id = $2)
		ORDER BY tenant_id NULLS LAST
		LIMIT 1`

	t, err := scanEmailTemplate(s.pool.QueryRow(ctx, query, name, tenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("email_template", name)
		}
		return nil, fmt.Errorf("get email template by name: %w", err)
	}

	return &t, nil
}

// CreateTemplate creates a new email template.
func (s *EmailTemplateService) CreateTemplate(ctx context.Context, tenantID uuid.UUID, req CreateEmailTemplateRequest) (*EmailTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validations.
	if req.Name == "" {
		return nil, apperrors.BadRequest("name is required")
	}
	if req.Subject == "" {
		return nil, apperrors.BadRequest("subject is required")
	}
	if req.BodyHTML == "" {
		return nil, apperrors.BadRequest("bodyHtml is required")
	}
	if req.Category == "" {
		return nil, apperrors.BadRequest("category is required")
	}

	// Check for duplicate name within tenant.
	var existingID uuid.UUID
	err := s.pool.QueryRow(ctx,
		"SELECT id FROM email_templates WHERE name = $1 AND (tenant_id IS NULL OR tenant_id = $2)",
		req.Name, tenantID,
	).Scan(&existingID)
	if err == nil {
		return nil, apperrors.Conflict("email template with name '"+req.Name+"' already exists")
	}
	if err != pgx.ErrNoRows {
		return nil, fmt.Errorf("check template name: %w", err)
	}

	variables := req.Variables
	if variables == nil {
		variables = json.RawMessage(`[]`)
	}

	var bodyText *string
	if req.BodyText != "" {
		bodyText = &req.BodyText
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO email_templates (tenant_id, name, subject, body_html, body_text, variables, category, updated_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, tenant_id, name, subject, body_html, body_text, variables,
		          category, is_active, updated_by, created_at, updated_at`,
		tenantID, req.Name, req.Subject, req.BodyHTML, bodyText, variables, req.Category, auth.UserID,
	)

	t, err := scanEmailTemplate(row)
	if err != nil {
		return nil, fmt.Errorf("create email template: %w", err)
	}

	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "email_template.created",
		EntityType:    "email_template",
		EntityID:      t.ID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return &t, nil
}

// UpdateTemplate updates an existing email template with partial updates.
func (s *EmailTemplateService) UpdateTemplate(ctx context.Context, templateID uuid.UUID, req UpdateEmailTemplateRequest) (*EmailTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTemplate(ctx, templateID)
	if err != nil {
		return nil, err
	}

	subject := ""
	if req.Subject != nil {
		subject = *req.Subject
	}

	bodyHTML := ""
	if req.BodyHTML != nil {
		bodyHTML = *req.BodyHTML
	}

	updateBodyText := req.BodyText != nil
	var bodyText *string
	if updateBodyText {
		bodyText = req.BodyText
	}

	updateVariables := req.Variables != nil
	var variables json.RawMessage
	if updateVariables {
		variables = *req.Variables
	}

	updateActive := req.IsActive != nil
	isActive := false
	if updateActive {
		isActive = *req.IsActive
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE email_templates SET
		  subject = COALESCE(NULLIF($2, ''), subject),
		  body_html = COALESCE(NULLIF($3, ''), body_html),
		  body_text = CASE WHEN $4::boolean THEN $5 ELSE body_text END,
		  variables = CASE WHEN $6::boolean THEN $7 ELSE variables END,
		  is_active = CASE WHEN $8::boolean THEN $9 ELSE is_active END,
		  updated_by = $10,
		  updated_at = NOW()
		WHERE id = $1`,
		templateID, subject, bodyHTML,
		updateBodyText, bodyText,
		updateVariables, variables,
		updateActive, isActive,
		auth.UserID,
	)
	if err != nil {
		return nil, fmt.Errorf("update email template: %w", err)
	}

	changes, _ := json.Marshal(req)
	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "email_template.updated",
		EntityType:    "email_template",
		EntityID:      templateID,
		Changes:       changes,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return s.GetTemplate(ctx, templateID)
}

// DeleteTemplate deletes an email template by ID.
func (s *EmailTemplateService) DeleteTemplate(ctx context.Context, templateID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTemplate(ctx, templateID)
	if err != nil {
		return err
	}

	tag, err := s.pool.Exec(ctx, "DELETE FROM email_templates WHERE id = $1", templateID)
	if err != nil {
		return fmt.Errorf("delete email template: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("email_template", templateID.String())
	}

	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "email_template.deleted",
		EntityType:    "email_template",
		EntityID:      templateID,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// PreviewTemplate renders an email template with the given variable substitutions.
func (s *EmailTemplateService) PreviewTemplate(ctx context.Context, templateID uuid.UUID, variables map[string]string) (string, string, error) {
	t, err := s.GetTemplate(ctx, templateID)
	if err != nil {
		return "", "", err
	}

	subject := t.Subject
	bodyHTML := t.BodyHTML

	for key, value := range variables {
		placeholder := "{{" + key + "}}"
		subject = strings.ReplaceAll(subject, placeholder, value)
		bodyHTML = strings.ReplaceAll(bodyHTML, placeholder, value)
	}

	return subject, bodyHTML, nil
}
