package grc

import (
	"context"
	"encoding/json"
	"fmt"
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
// RiskService
// ──────────────────────────────────────────────

// RiskService handles business logic for risk management, assessments, and escalation.
type RiskService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewRiskService creates a new RiskService.
func NewRiskService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *RiskService {
	return &RiskService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Risks
// ──────────────────────────────────────────────

// CreateRisk creates a new risk with an auto-generated risk number (RSK-NNNN).
func (s *RiskService) CreateRisk(ctx context.Context, req CreateRiskRequest) (Risk, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Risk{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Generate risk number RSK-NNNN
	var count int
	countQuery := `SELECT COUNT(*) FROM risks WHERE tenant_id = $1`
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID).Scan(&count); err != nil {
		return Risk{}, apperrors.Internal("failed to generate risk number", err)
	}
	riskNumber := fmt.Sprintf("RSK-%04d", count+1)

	query := `
		INSERT INTO risks (
			id, tenant_id, risk_number, title, description,
			category, likelihood, impact, risk_score, status,
			treatment_plan, contingency_plan, owner_id, reviewer_id,
			review_date, next_review_date, linked_project_id, linked_audit_id,
			escalation_threshold, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17, $18,
			$19, $20, $21
		)
		RETURNING id, tenant_id, risk_number, title, description,
			category, likelihood, impact, risk_score, status,
			treatment_plan, contingency_plan, owner_id, reviewer_id,
			review_date, next_review_date, linked_project_id, linked_audit_id,
			escalation_threshold, created_at, updated_at`

	// Calculate risk score from likelihood * impact mapping
	riskScore := likelihoodImpactScore(req.Likelihood, req.Impact)

	escalationThreshold := 0
	if req.EscalationThreshold != nil {
		escalationThreshold = *req.EscalationThreshold
	}

	var risk Risk
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, riskNumber, req.Title, req.Description,
		req.Category, req.Likelihood, req.Impact, riskScore, req.Status,
		req.TreatmentPlan, req.ContingencyPlan, req.OwnerID, req.ReviewerID,
		req.ReviewDate, req.NextReviewDate, req.LinkedProjectID, req.LinkedAuditID,
		escalationThreshold, now, now,
	).Scan(
		&risk.ID, &risk.TenantID, &risk.RiskNumber, &risk.Title, &risk.Description,
		&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
		&risk.TreatmentPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewerID,
		&risk.ReviewDate, &risk.NextReviewDate, &risk.LinkedProjectID, &risk.LinkedAuditID,
		&risk.EscalationThreshold, &risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		return Risk{}, apperrors.Internal("failed to create risk", err)
	}

	changes, _ := json.Marshal(map[string]any{"title": req.Title, "riskNumber": riskNumber})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:risk",
		EntityType: "risk",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return risk, nil
}

// GetRisk retrieves a single risk by ID.
func (s *RiskService) GetRisk(ctx context.Context, id uuid.UUID) (Risk, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Risk{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, risk_number, title, description,
			category, likelihood, impact, risk_score, status,
			treatment_plan, contingency_plan, owner_id, reviewer_id,
			review_date, next_review_date, linked_project_id, linked_audit_id,
			escalation_threshold, created_at, updated_at
		FROM risks
		WHERE id = $1 AND tenant_id = $2`

	var risk Risk
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&risk.ID, &risk.TenantID, &risk.RiskNumber, &risk.Title, &risk.Description,
		&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
		&risk.TreatmentPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewerID,
		&risk.ReviewDate, &risk.NextReviewDate, &risk.LinkedProjectID, &risk.LinkedAuditID,
		&risk.EscalationThreshold, &risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Risk{}, apperrors.NotFound("Risk", id.String())
		}
		return Risk{}, apperrors.Internal("failed to get risk", err)
	}

	return risk, nil
}

// ListRisks returns a filtered, paginated list of risks.
func (s *RiskService) ListRisks(ctx context.Context, status, category *string, ownerID *uuid.UUID, page, limit int) ([]Risk, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM risks
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
			AND ($3::text IS NULL OR category = $3)
			AND ($4::uuid IS NULL OR owner_id = $4)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, status, category, ownerID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count risks", err)
	}

	dataQuery := `
		SELECT id, tenant_id, risk_number, title, description,
			category, likelihood, impact, risk_score, status,
			treatment_plan, contingency_plan, owner_id, reviewer_id,
			review_date, next_review_date, linked_project_id, linked_audit_id,
			escalation_threshold, created_at, updated_at
		FROM risks
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
			AND ($3::text IS NULL OR category = $3)
			AND ($4::uuid IS NULL OR owner_id = $4)
		ORDER BY risk_score DESC, created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, status, category, ownerID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list risks", err)
	}
	defer rows.Close()

	var risks []Risk
	for rows.Next() {
		var risk Risk
		if err := rows.Scan(
			&risk.ID, &risk.TenantID, &risk.RiskNumber, &risk.Title, &risk.Description,
			&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
			&risk.TreatmentPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewerID,
			&risk.ReviewDate, &risk.NextReviewDate, &risk.LinkedProjectID, &risk.LinkedAuditID,
			&risk.EscalationThreshold, &risk.CreatedAt, &risk.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan risk", err)
		}
		risks = append(risks, risk)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate risks", err)
	}

	if risks == nil {
		risks = []Risk{}
	}

	return risks, total, nil
}

// UpdateRisk updates an existing risk using COALESCE partial update.
// Also checks the escalation threshold.
func (s *RiskService) UpdateRisk(ctx context.Context, id uuid.UUID, req UpdateRiskRequest) (Risk, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Risk{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetRisk(ctx, id); err != nil {
		return Risk{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE risks SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			category = COALESCE($3, category),
			likelihood = COALESCE($4, likelihood),
			impact = COALESCE($5, impact),
			status = COALESCE($6, status),
			treatment_plan = COALESCE($7, treatment_plan),
			contingency_plan = COALESCE($8, contingency_plan),
			owner_id = COALESCE($9, owner_id),
			reviewer_id = COALESCE($10, reviewer_id),
			review_date = COALESCE($11, review_date),
			next_review_date = COALESCE($12, next_review_date),
			linked_project_id = COALESCE($13, linked_project_id),
			linked_audit_id = COALESCE($14, linked_audit_id),
			escalation_threshold = COALESCE($15, escalation_threshold),
			updated_at = $16
		WHERE id = $17 AND tenant_id = $18
		RETURNING id, tenant_id, risk_number, title, description,
			category, likelihood, impact, risk_score, status,
			treatment_plan, contingency_plan, owner_id, reviewer_id,
			review_date, next_review_date, linked_project_id, linked_audit_id,
			escalation_threshold, created_at, updated_at`

	var risk Risk
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.Category,
		req.Likelihood, req.Impact, req.Status,
		req.TreatmentPlan, req.ContingencyPlan,
		req.OwnerID, req.ReviewerID,
		req.ReviewDate, req.NextReviewDate,
		req.LinkedProjectID, req.LinkedAuditID,
		req.EscalationThreshold,
		now, id, auth.TenantID,
	).Scan(
		&risk.ID, &risk.TenantID, &risk.RiskNumber, &risk.Title, &risk.Description,
		&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
		&risk.TreatmentPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewerID,
		&risk.ReviewDate, &risk.NextReviewDate, &risk.LinkedProjectID, &risk.LinkedAuditID,
		&risk.EscalationThreshold, &risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		return Risk{}, apperrors.Internal("failed to update risk", err)
	}

	// If risk score exceeds escalation threshold, log it
	if risk.EscalationThreshold > 0 && risk.RiskScore >= risk.EscalationThreshold {
		slog.WarnContext(ctx, "risk score exceeds escalation threshold",
			"riskId", risk.ID,
			"riskScore", risk.RiskScore,
			"threshold", risk.EscalationThreshold,
		)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:risk",
		EntityType: "risk",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return risk, nil
}

// DeleteRisk deletes a risk by ID.
func (s *RiskService) DeleteRisk(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM risks WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete risk", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Risk", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:risk",
		EntityType: "risk",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Risk Heat Map
// ──────────────────────────────────────────────

// GetRiskHeatMap returns aggregated risk counts grouped by likelihood and impact.
func (s *RiskService) GetRiskHeatMap(ctx context.Context) ([]RiskHeatMapEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT likelihood, impact, COUNT(*) AS count
		FROM risks
		WHERE tenant_id = $1
		GROUP BY likelihood, impact
		ORDER BY likelihood, impact`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get risk heat map", err)
	}
	defer rows.Close()

	var entries []RiskHeatMapEntry
	for rows.Next() {
		var entry RiskHeatMapEntry
		if err := rows.Scan(&entry.Likelihood, &entry.Impact, &entry.Count); err != nil {
			return nil, apperrors.Internal("failed to scan heat map entry", err)
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate heat map entries", err)
	}

	if entries == nil {
		entries = []RiskHeatMapEntry{}
	}

	return entries, nil
}

// ──────────────────────────────────────────────
// Risks Needing Review
// ──────────────────────────────────────────────

// GetRisksNeedingReview returns risks whose next_review_date has passed or is today.
func (s *RiskService) GetRisksNeedingReview(ctx context.Context) ([]Risk, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, risk_number, title, description,
			category, likelihood, impact, risk_score, status,
			treatment_plan, contingency_plan, owner_id, reviewer_id,
			review_date, next_review_date, linked_project_id, linked_audit_id,
			escalation_threshold, created_at, updated_at
		FROM risks
		WHERE tenant_id = $1
			AND next_review_date IS NOT NULL
			AND next_review_date <= CURRENT_DATE
			AND status NOT IN ('closed', 'archived')
		ORDER BY next_review_date ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get risks needing review", err)
	}
	defer rows.Close()

	var risks []Risk
	for rows.Next() {
		var risk Risk
		if err := rows.Scan(
			&risk.ID, &risk.TenantID, &risk.RiskNumber, &risk.Title, &risk.Description,
			&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
			&risk.TreatmentPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewerID,
			&risk.ReviewDate, &risk.NextReviewDate, &risk.LinkedProjectID, &risk.LinkedAuditID,
			&risk.EscalationThreshold, &risk.CreatedAt, &risk.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan risk needing review", err)
		}
		risks = append(risks, risk)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate risks needing review", err)
	}

	if risks == nil {
		risks = []Risk{}
	}

	return risks, nil
}

// ──────────────────────────────────────────────
// Risk Assessments
// ──────────────────────────────────────────────

// CreateRiskAssessment creates a new risk assessment and updates the risk's likelihood/impact.
func (s *RiskService) CreateRiskAssessment(ctx context.Context, riskID uuid.UUID, req CreateRiskAssessmentRequest) (RiskAssessment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return RiskAssessment{}, apperrors.Unauthorized("authentication required")
	}

	// Verify risk exists
	existingRisk, err := s.GetRisk(ctx, riskID)
	if err != nil {
		return RiskAssessment{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Capture previous values
	var prevLikelihood, prevImpact *string
	if existingRisk.Likelihood != "" {
		prevLikelihood = &existingRisk.Likelihood
	}
	if existingRisk.Impact != "" {
		prevImpact = &existingRisk.Impact
	}

	insertQuery := `
		INSERT INTO risk_assessments (
			id, risk_id, assessed_by, assessment_date,
			previous_likelihood, previous_impact,
			new_likelihood, new_impact,
			rationale, evidence_refs, created_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6,
			$7, $8,
			$9, $10, $11
		)
		RETURNING id, risk_id, assessed_by, assessment_date,
			previous_likelihood, previous_impact,
			new_likelihood, new_impact,
			rationale, evidence_refs, created_at`

	var assessment RiskAssessment
	err = s.pool.QueryRow(ctx, insertQuery,
		id, riskID, auth.UserID, now,
		prevLikelihood, prevImpact,
		req.NewLikelihood, req.NewImpact,
		req.Rationale, req.EvidenceRefs, now,
	).Scan(
		&assessment.ID, &assessment.RiskID, &assessment.AssessedBy, &assessment.AssessmentDate,
		&assessment.PreviousLikelihood, &assessment.PreviousImpact,
		&assessment.NewLikelihood, &assessment.NewImpact,
		&assessment.Rationale, &assessment.EvidenceRefs, &assessment.CreatedAt,
	)
	if err != nil {
		return RiskAssessment{}, apperrors.Internal("failed to create risk assessment", err)
	}

	// Update the risk's likelihood and impact
	newScore := likelihoodImpactScore(req.NewLikelihood, req.NewImpact)
	updateQuery := `
		UPDATE risks SET
			likelihood = $1,
			impact = $2,
			risk_score = $3,
			review_date = $4,
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7`

	if _, err := s.pool.Exec(ctx, updateQuery,
		req.NewLikelihood, req.NewImpact, newScore,
		now, now, riskID, auth.TenantID,
	); err != nil {
		slog.ErrorContext(ctx, "failed to update risk after assessment", "error", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"riskId":        riskID,
		"newLikelihood": req.NewLikelihood,
		"newImpact":     req.NewImpact,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:risk_assessment",
		EntityType: "risk_assessment",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return assessment, nil
}

// ListRiskAssessments returns all assessments for a given risk.
func (s *RiskService) ListRiskAssessments(ctx context.Context, riskID uuid.UUID) ([]RiskAssessment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT ra.id, ra.risk_id, ra.assessed_by, ra.assessment_date,
			ra.previous_likelihood, ra.previous_impact,
			ra.new_likelihood, ra.new_impact,
			ra.rationale, ra.evidence_refs, ra.created_at
		FROM risk_assessments ra
		JOIN risks r ON r.id = ra.risk_id
		WHERE ra.risk_id = $1 AND r.tenant_id = $2
		ORDER BY ra.assessment_date DESC`

	rows, err := s.pool.Query(ctx, query, riskID, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list risk assessments", err)
	}
	defer rows.Close()

	var assessments []RiskAssessment
	for rows.Next() {
		var a RiskAssessment
		if err := rows.Scan(
			&a.ID, &a.RiskID, &a.AssessedBy, &a.AssessmentDate,
			&a.PreviousLikelihood, &a.PreviousImpact,
			&a.NewLikelihood, &a.NewImpact,
			&a.Rationale, &a.EvidenceRefs, &a.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan risk assessment", err)
		}
		assessments = append(assessments, a)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate risk assessments", err)
	}

	if assessments == nil {
		assessments = []RiskAssessment{}
	}

	return assessments, nil
}

// ──────────────────────────────────────────────
// Risk Escalation
// ──────────────────────────────────────────────

// EscalateRisk marks a risk as escalated by setting its status to "escalated".
func (s *RiskService) EscalateRisk(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE risks SET
			status = 'escalated',
			updated_at = $1
		WHERE id = $2 AND tenant_id = $3`

	result, err := s.pool.Exec(ctx, query, now, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to escalate risk", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Risk", id.String())
	}

	changes, _ := json.Marshal(map[string]any{"status": "escalated"})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "escalate:risk",
		EntityType: "risk",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// likelihoodImpactScore maps likelihood and impact strings to a numeric score (1-25, 5x5 matrix).
func likelihoodImpactScore(likelihood, impact string) int {
	levelMap := map[string]int{
		"very_low":  1,
		"low":       2,
		"medium":    3,
		"high":      4,
		"very_high": 5,
	}

	l, ok1 := levelMap[likelihood]
	i, ok2 := levelMap[impact]
	if !ok1 || !ok2 {
		return 0
	}
	return l * i
}
