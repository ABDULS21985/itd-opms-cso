package planning

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// PIR domain types
// ──────────────────────────────────────────────

// PIR represents a Post-Implementation Review.
type PIR struct {
	ID                      uuid.UUID       `json:"id"`
	TenantID                uuid.UUID       `json:"tenantId"`
	ProjectID               uuid.UUID       `json:"projectId"`
	ProjectTitle            string          `json:"projectTitle"`
	Title                   string          `json:"title"`
	Status                  string          `json:"status"`
	ReviewType              string          `json:"reviewType"`
	ScheduledDate           *time.Time      `json:"scheduledDate"`
	CompletedDate           *time.Time      `json:"completedDate"`
	FacilitatorID           *uuid.UUID      `json:"facilitatorId"`
	FacilitatorName         *string         `json:"facilitatorName"`
	ObjectivesMet           *string         `json:"objectivesMet"`
	ScopeAdherence          *string         `json:"scopeAdherence"`
	TimelineAdherence       *string         `json:"timelineAdherence"`
	BudgetAdherence         *string         `json:"budgetAdherence"`
	QualityAssessment       *string         `json:"qualityAssessment"`
	StakeholderSatisfaction *string         `json:"stakeholderSatisfaction"`
	Successes               json.RawMessage `json:"successes"`
	Challenges              json.RawMessage `json:"challenges"`
	LessonsLearned          json.RawMessage `json:"lessonsLearned"`
	Recommendations         json.RawMessage `json:"recommendations"`
	OverallScore            *int            `json:"overallScore"`
	Participants            []uuid.UUID     `json:"participants"`
	CreatedBy               uuid.UUID       `json:"createdBy"`
	CreatedAt               time.Time       `json:"createdAt"`
	UpdatedAt               time.Time       `json:"updatedAt"`
}

// PIRTemplate represents a reusable review template.
type PIRTemplate struct {
	ID          uuid.UUID       `json:"id"`
	TenantID    uuid.UUID       `json:"tenantId"`
	Name        string          `json:"name"`
	Description *string         `json:"description"`
	ReviewType  string          `json:"reviewType"`
	Sections    json.RawMessage `json:"sections"`
	IsDefault   bool            `json:"isDefault"`
	CreatedBy   uuid.UUID       `json:"createdBy"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// PIRStats provides aggregate PIR statistics.
type PIRStats struct {
	TotalPIRs     int     `json:"totalPirs"`
	CompletedPIRs int     `json:"completedPirs"`
	AvgScore      float64 `json:"avgScore"`
	PendingPIRs   int     `json:"pendingPirs"`
}

// ──────────────────────────────────────────────
// PIR request types
// ──────────────────────────────────────────────

// CreatePIRRequest is the JSON body for creating a PIR.
type CreatePIRRequest struct {
	ProjectID               uuid.UUID       `json:"projectId"`
	Title                   string          `json:"title"`
	ReviewType              string          `json:"reviewType"`
	ScheduledDate           *time.Time      `json:"scheduledDate"`
	FacilitatorID           *uuid.UUID      `json:"facilitatorId"`
	ObjectivesMet           *string         `json:"objectivesMet"`
	ScopeAdherence          *string         `json:"scopeAdherence"`
	TimelineAdherence       *string         `json:"timelineAdherence"`
	BudgetAdherence         *string         `json:"budgetAdherence"`
	QualityAssessment       *string         `json:"qualityAssessment"`
	StakeholderSatisfaction *string         `json:"stakeholderSatisfaction"`
	Successes               json.RawMessage `json:"successes"`
	Challenges              json.RawMessage `json:"challenges"`
	LessonsLearned          json.RawMessage `json:"lessonsLearned"`
	Recommendations         json.RawMessage `json:"recommendations"`
	OverallScore            *int            `json:"overallScore"`
	Participants            []uuid.UUID     `json:"participants"`
}

// UpdatePIRRequest is the JSON body for updating a PIR.
type UpdatePIRRequest struct {
	Title                   *string         `json:"title"`
	ReviewType              *string         `json:"reviewType"`
	ScheduledDate           *time.Time      `json:"scheduledDate"`
	FacilitatorID           *uuid.UUID      `json:"facilitatorId"`
	ObjectivesMet           *string         `json:"objectivesMet"`
	ScopeAdherence          *string         `json:"scopeAdherence"`
	TimelineAdherence       *string         `json:"timelineAdherence"`
	BudgetAdherence         *string         `json:"budgetAdherence"`
	QualityAssessment       *string         `json:"qualityAssessment"`
	StakeholderSatisfaction *string         `json:"stakeholderSatisfaction"`
	Successes               json.RawMessage `json:"successes"`
	Challenges              json.RawMessage `json:"challenges"`
	LessonsLearned          json.RawMessage `json:"lessonsLearned"`
	Recommendations         json.RawMessage `json:"recommendations"`
	OverallScore            *int            `json:"overallScore"`
	Participants            []uuid.UUID     `json:"participants"`
}

// CreatePIRTemplateRequest is the JSON body for creating a PIR template.
type CreatePIRTemplateRequest struct {
	Name        string          `json:"name"`
	Description *string         `json:"description"`
	ReviewType  string          `json:"reviewType"`
	Sections    json.RawMessage `json:"sections"`
	IsDefault   bool            `json:"isDefault"`
}

// ──────────────────────────────────────────────
// PIRService
// ──────────────────────────────────────────────

// PIRService handles business logic for Post-Implementation Reviews.
type PIRService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewPIRService creates a new PIRService.
func NewPIRService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *PIRService {
	return &PIRService{pool: pool, auditSvc: auditSvc}
}

// CreatePIR creates a new Post-Implementation Review.
func (s *PIRService) CreatePIR(ctx context.Context, tenantID, createdBy uuid.UUID, req CreatePIRRequest) (*PIR, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if req.Title == "" {
		return nil, apperrors.BadRequest("title is required")
	}
	if req.ProjectID == uuid.Nil {
		return nil, apperrors.BadRequest("projectId is required")
	}

	// Default review_type to "project" if empty.
	reviewType := req.ReviewType
	if reviewType == "" {
		reviewType = "project"
	}

	// Default JSON arrays to [] if nil.
	successes := req.Successes
	if successes == nil {
		successes = json.RawMessage(`[]`)
	}
	challenges := req.Challenges
	if challenges == nil {
		challenges = json.RawMessage(`[]`)
	}
	lessonsLearned := req.LessonsLearned
	if lessonsLearned == nil {
		lessonsLearned = json.RawMessage(`[]`)
	}
	recommendations := req.Recommendations
	if recommendations == nil {
		recommendations = json.RawMessage(`[]`)
	}

	// Default participants to empty array if nil.
	participants := req.Participants
	if participants == nil {
		participants = []uuid.UUID{}
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO post_implementation_reviews (
			id, tenant_id, project_id, title, status, review_type,
			scheduled_date, facilitator_id,
			objectives_met, scope_adherence, timeline_adherence,
			budget_adherence, quality_assessment, stakeholder_satisfaction,
			successes, challenges, lessons_learned, recommendations,
			overall_score, participants, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, 'draft', $5,
			$6, $7,
			$8, $9, $10,
			$11, $12, $13,
			$14, $15, $16, $17,
			$18, $19, $20, $21, $22
		)
		RETURNING id, tenant_id, project_id, title, status, review_type,
			scheduled_date, completed_date, facilitator_id,
			objectives_met, scope_adherence, timeline_adherence,
			budget_adherence, quality_assessment, stakeholder_satisfaction,
			successes, challenges, lessons_learned, recommendations,
			overall_score, participants, created_by, created_at, updated_at`

	var p PIR
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.ProjectID, req.Title, reviewType,
		req.ScheduledDate, req.FacilitatorID,
		req.ObjectivesMet, req.ScopeAdherence, req.TimelineAdherence,
		req.BudgetAdherence, req.QualityAssessment, req.StakeholderSatisfaction,
		successes, challenges, lessonsLearned, recommendations,
		req.OverallScore, participants, createdBy, now, now,
	).Scan(
		&p.ID, &p.TenantID, &p.ProjectID, &p.Title, &p.Status, &p.ReviewType,
		&p.ScheduledDate, &p.CompletedDate, &p.FacilitatorID,
		&p.ObjectivesMet, &p.ScopeAdherence, &p.TimelineAdherence,
		&p.BudgetAdherence, &p.QualityAssessment, &p.StakeholderSatisfaction,
		&p.Successes, &p.Challenges, &p.LessonsLearned, &p.Recommendations,
		&p.OverallScore, &p.Participants, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create PIR", err)
	}

	// Fetch project title and facilitator name.
	s.enrichPIR(ctx, &p)

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":       req.Title,
		"project_id":  req.ProjectID,
		"review_type": reviewType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    createdBy,
		Action:     "pir.created",
		EntityType: "pir",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &p, nil
}

// GetPIR retrieves a single PIR by ID with project and facilitator info.
func (s *PIRService) GetPIR(ctx context.Context, tenantID, id uuid.UUID) (*PIR, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT p.id, p.tenant_id, p.project_id, pr.title, p.title, p.status, p.review_type,
			p.scheduled_date, p.completed_date, p.facilitator_id, u.display_name,
			p.objectives_met, p.scope_adherence, p.timeline_adherence,
			p.budget_adherence, p.quality_assessment, p.stakeholder_satisfaction,
			p.successes, p.challenges, p.lessons_learned, p.recommendations,
			p.overall_score, p.participants, p.created_by, p.created_at, p.updated_at
		FROM post_implementation_reviews p
		JOIN projects pr ON pr.id = p.project_id
		LEFT JOIN users u ON u.id = p.facilitator_id
		WHERE p.id = $1 AND p.tenant_id = $2`

	var pir PIR
	err := s.pool.QueryRow(ctx, query, id, tenantID).Scan(
		&pir.ID, &pir.TenantID, &pir.ProjectID, &pir.ProjectTitle, &pir.Title, &pir.Status, &pir.ReviewType,
		&pir.ScheduledDate, &pir.CompletedDate, &pir.FacilitatorID, &pir.FacilitatorName,
		&pir.ObjectivesMet, &pir.ScopeAdherence, &pir.TimelineAdherence,
		&pir.BudgetAdherence, &pir.QualityAssessment, &pir.StakeholderSatisfaction,
		&pir.Successes, &pir.Challenges, &pir.LessonsLearned, &pir.Recommendations,
		&pir.OverallScore, &pir.Participants, &pir.CreatedBy, &pir.CreatedAt, &pir.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("PIR", id.String())
		}
		return nil, apperrors.Internal("failed to get PIR", err)
	}

	return &pir, nil
}

// ListPIRs returns a filtered, paginated list of PIRs.
func (s *PIRService) ListPIRs(ctx context.Context, tenantID uuid.UUID, projectID *uuid.UUID, status string, limit, offset int) ([]PIR, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM post_implementation_reviews p
		WHERE p.tenant_id = $1
			AND ($2::uuid IS NULL OR p.project_id = $2)
			AND ($3::text = '' OR p.status = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, tenantID, projectID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count PIRs", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT p.id, p.tenant_id, p.project_id, pr.title, p.title, p.status, p.review_type,
			p.scheduled_date, p.completed_date, p.facilitator_id, u.display_name,
			p.objectives_met, p.scope_adherence, p.timeline_adherence,
			p.budget_adherence, p.quality_assessment, p.stakeholder_satisfaction,
			p.successes, p.challenges, p.lessons_learned, p.recommendations,
			p.overall_score, p.participants, p.created_by, p.created_at, p.updated_at
		FROM post_implementation_reviews p
		JOIN projects pr ON pr.id = p.project_id
		LEFT JOIN users u ON u.id = p.facilitator_id
		WHERE p.tenant_id = $1
			AND ($2::uuid IS NULL OR p.project_id = $2)
			AND ($3::text = '' OR p.status = $3)
		ORDER BY p.created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, tenantID, projectID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list PIRs", err)
	}
	defer rows.Close()

	var pirs []PIR
	for rows.Next() {
		var p PIR
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.ProjectID, &p.ProjectTitle, &p.Title, &p.Status, &p.ReviewType,
			&p.ScheduledDate, &p.CompletedDate, &p.FacilitatorID, &p.FacilitatorName,
			&p.ObjectivesMet, &p.ScopeAdherence, &p.TimelineAdherence,
			&p.BudgetAdherence, &p.QualityAssessment, &p.StakeholderSatisfaction,
			&p.Successes, &p.Challenges, &p.LessonsLearned, &p.Recommendations,
			&p.OverallScore, &p.Participants, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan PIR", err)
		}
		pirs = append(pirs, p)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate PIRs", err)
	}

	if pirs == nil {
		pirs = []PIR{}
	}

	return pirs, total, nil
}

// UpdatePIR partially updates a PIR using COALESCE for text fields
// and overwrites JSON fields when provided.
func (s *PIRService) UpdatePIR(ctx context.Context, tenantID, id uuid.UUID, req UpdatePIRRequest) (*PIR, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify existence.
	existing, err := s.GetPIR(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()

	// For JSON fields, use existing values if request does not provide them.
	successes := req.Successes
	if successes == nil {
		successes = existing.Successes
	}
	challenges := req.Challenges
	if challenges == nil {
		challenges = existing.Challenges
	}
	lessonsLearned := req.LessonsLearned
	if lessonsLearned == nil {
		lessonsLearned = existing.LessonsLearned
	}
	recommendations := req.Recommendations
	if recommendations == nil {
		recommendations = existing.Recommendations
	}

	// For participants, use existing if not provided.
	participants := req.Participants
	if participants == nil {
		participants = existing.Participants
	}

	// For overall_score, use existing if not provided.
	overallScore := req.OverallScore
	if overallScore == nil {
		overallScore = existing.OverallScore
	}

	updateQuery := `
		UPDATE post_implementation_reviews SET
			title = COALESCE($1, title),
			review_type = COALESCE($2, review_type),
			scheduled_date = COALESCE($3, scheduled_date),
			facilitator_id = COALESCE($4, facilitator_id),
			objectives_met = COALESCE($5, objectives_met),
			scope_adherence = COALESCE($6, scope_adherence),
			timeline_adherence = COALESCE($7, timeline_adherence),
			budget_adherence = COALESCE($8, budget_adherence),
			quality_assessment = COALESCE($9, quality_assessment),
			stakeholder_satisfaction = COALESCE($10, stakeholder_satisfaction),
			successes = $11,
			challenges = $12,
			lessons_learned = $13,
			recommendations = $14,
			overall_score = $15,
			participants = $16,
			updated_at = $17
		WHERE id = $18 AND tenant_id = $19
		RETURNING id, tenant_id, project_id, title, status, review_type,
			scheduled_date, completed_date, facilitator_id,
			objectives_met, scope_adherence, timeline_adherence,
			budget_adherence, quality_assessment, stakeholder_satisfaction,
			successes, challenges, lessons_learned, recommendations,
			overall_score, participants, created_by, created_at, updated_at`

	var p PIR
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.ReviewType, req.ScheduledDate, req.FacilitatorID,
		req.ObjectivesMet, req.ScopeAdherence, req.TimelineAdherence,
		req.BudgetAdherence, req.QualityAssessment, req.StakeholderSatisfaction,
		successes, challenges, lessonsLearned, recommendations,
		overallScore, participants,
		now, id, tenantID,
	).Scan(
		&p.ID, &p.TenantID, &p.ProjectID, &p.Title, &p.Status, &p.ReviewType,
		&p.ScheduledDate, &p.CompletedDate, &p.FacilitatorID,
		&p.ObjectivesMet, &p.ScopeAdherence, &p.TimelineAdherence,
		&p.BudgetAdherence, &p.QualityAssessment, &p.StakeholderSatisfaction,
		&p.Successes, &p.Challenges, &p.LessonsLearned, &p.Recommendations,
		&p.OverallScore, &p.Participants, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to update PIR", err)
	}

	// Enrich with project title and facilitator name.
	s.enrichPIR(ctx, &p)

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		Action:     "pir.updated",
		EntityType: "pir",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &p, nil
}

// CompletePIR marks a PIR as completed.
func (s *PIRService) CompletePIR(ctx context.Context, tenantID, id uuid.UUID) (*PIR, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		UPDATE post_implementation_reviews
		SET status = 'completed', completed_date = CURRENT_DATE, updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status != 'completed'
		RETURNING id, tenant_id, project_id, title, status, review_type,
			scheduled_date, completed_date, facilitator_id,
			objectives_met, scope_adherence, timeline_adherence,
			budget_adherence, quality_assessment, stakeholder_satisfaction,
			successes, challenges, lessons_learned, recommendations,
			overall_score, participants, created_by, created_at, updated_at`

	var p PIR
	err := s.pool.QueryRow(ctx, query, id, tenantID).Scan(
		&p.ID, &p.TenantID, &p.ProjectID, &p.Title, &p.Status, &p.ReviewType,
		&p.ScheduledDate, &p.CompletedDate, &p.FacilitatorID,
		&p.ObjectivesMet, &p.ScopeAdherence, &p.TimelineAdherence,
		&p.BudgetAdherence, &p.QualityAssessment, &p.StakeholderSatisfaction,
		&p.Successes, &p.Challenges, &p.LessonsLearned, &p.Recommendations,
		&p.OverallScore, &p.Participants, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("PIR", id.String())
		}
		return nil, apperrors.Internal("failed to complete PIR", err)
	}

	// Enrich with project title and facilitator name.
	s.enrichPIR(ctx, &p)

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{"status": "completed"})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		Action:     "pir.completed",
		EntityType: "pir",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &p, nil
}

// DeletePIR deletes a PIR by ID.
func (s *PIRService) DeletePIR(ctx context.Context, tenantID, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM post_implementation_reviews WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, tenantID)
	if err != nil {
		return apperrors.Internal("failed to delete PIR", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("PIR", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		Action:     "pir.deleted",
		EntityType: "pir",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ListPIRTemplates returns PIR templates optionally filtered by review type.
func (s *PIRService) ListPIRTemplates(ctx context.Context, tenantID uuid.UUID, reviewType string) ([]PIRTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, review_type, sections, is_default, created_by, created_at
		FROM pir_templates
		WHERE tenant_id = $1
			AND ($2::text = '' OR review_type = $2)
		ORDER BY is_default DESC, name ASC`

	rows, err := s.pool.Query(ctx, query, tenantID, reviewType)
	if err != nil {
		return nil, apperrors.Internal("failed to list PIR templates", err)
	}
	defer rows.Close()

	var templates []PIRTemplate
	for rows.Next() {
		var t PIRTemplate
		if err := rows.Scan(
			&t.ID, &t.TenantID, &t.Name, &t.Description, &t.ReviewType,
			&t.Sections, &t.IsDefault, &t.CreatedBy, &t.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan PIR template", err)
		}
		templates = append(templates, t)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate PIR templates", err)
	}

	if templates == nil {
		templates = []PIRTemplate{}
	}

	return templates, nil
}

// GetPIRTemplate retrieves a single PIR template by ID.
func (s *PIRService) GetPIRTemplate(ctx context.Context, id uuid.UUID) (*PIRTemplate, error) {
	query := `
		SELECT id, tenant_id, name, description, review_type, sections, is_default, created_by, created_at
		FROM pir_templates
		WHERE id = $1`

	var t PIRTemplate
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.TenantID, &t.Name, &t.Description, &t.ReviewType,
		&t.Sections, &t.IsDefault, &t.CreatedBy, &t.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("PIRTemplate", id.String())
		}
		return nil, apperrors.Internal("failed to get PIR template", err)
	}

	return &t, nil
}

// CreatePIRTemplate creates a new PIR template.
func (s *PIRService) CreatePIRTemplate(ctx context.Context, tenantID, createdBy uuid.UUID, req CreatePIRTemplateRequest) (*PIRTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if req.Name == "" {
		return nil, apperrors.BadRequest("name is required")
	}

	reviewType := req.ReviewType
	if reviewType == "" {
		reviewType = "project"
	}

	sections := req.Sections
	if sections == nil {
		sections = json.RawMessage(`[]`)
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO pir_templates (
			id, tenant_id, name, description, review_type, sections, is_default, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, tenant_id, name, description, review_type, sections, is_default, created_by, created_at`

	var t PIRTemplate
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.Name, req.Description, reviewType, sections, req.IsDefault, createdBy, now, now,
	).Scan(
		&t.ID, &t.TenantID, &t.Name, &t.Description, &t.ReviewType,
		&t.Sections, &t.IsDefault, &t.CreatedBy, &t.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create PIR template", err)
	}

	return &t, nil
}

// GetPIRStats returns aggregate PIR statistics for a tenant.
func (s *PIRService) GetPIRStats(ctx context.Context, tenantID uuid.UUID) (*PIRStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total_pirs,
			COUNT(*) FILTER (WHERE status = 'completed') AS completed_pirs,
			COALESCE(AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL), 0) AS avg_score,
			COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress')) AS pending_pirs
		FROM post_implementation_reviews
		WHERE tenant_id = $1`

	var stats PIRStats
	err := s.pool.QueryRow(ctx, query, tenantID).Scan(
		&stats.TotalPIRs,
		&stats.CompletedPIRs,
		&stats.AvgScore,
		&stats.PendingPIRs,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to get PIR stats", err)
	}

	return &stats, nil
}

// enrichPIR populates the ProjectTitle and FacilitatorName fields from related tables.
func (s *PIRService) enrichPIR(ctx context.Context, p *PIR) {
	// Fetch project title.
	var projectTitle string
	if err := s.pool.QueryRow(ctx,
		`SELECT title FROM projects WHERE id = $1`, p.ProjectID,
	).Scan(&projectTitle); err == nil {
		p.ProjectTitle = projectTitle
	}

	// Fetch facilitator name.
	if p.FacilitatorID != nil {
		var name string
		if err := s.pool.QueryRow(ctx,
			`SELECT display_name FROM users WHERE id = $1`, *p.FacilitatorID,
		).Scan(&name); err == nil {
			p.FacilitatorName = &name
		}
	}
}
