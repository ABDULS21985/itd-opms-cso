package itsm

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ChangeService
// ──────────────────────────────────────────────

// ChangeService handles business logic for ITSM change management.
type ChangeService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	js       nats.JetStreamContext
}

// NewChangeService creates a new ChangeService.
func NewChangeService(pool *pgxpool.Pool, auditSvc *audit.AuditService, js nats.JetStreamContext) *ChangeService {
	return &ChangeService{
		pool:     pool,
		auditSvc: auditSvc,
		js:       js,
	}
}

// ──────────────────────────────────────────────
// Create
// ──────────────────────────────────────────────

// CreateChange creates a new change ticket.
func (s *ChangeService) CreateChange(ctx context.Context, req CreateChangeRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	// Validate classification.
	switch req.Classification {
	case ChangeClassificationEmergency, ChangeClassificationStandard, ChangeClassificationNormal:
	default:
		return Ticket{}, apperrors.BadRequest("invalid change classification: " + req.Classification)
	}

	// Check freeze periods for non-emergency changes.
	if req.Classification != ChangeClassificationEmergency && req.ScheduledStart != nil && req.ScheduledEnd != nil {
		freeze, err := s.CheckFreezePeriod(ctx, *req.ScheduledStart, *req.ScheduledEnd)
		if err != nil {
			return Ticket{}, err
		}
		if freeze.IsFrozen {
			return Ticket{}, apperrors.BadRequest(fmt.Sprintf("change blocked by freeze period: %s", *freeze.FreezeName))
		}
	}

	id := uuid.New()
	now := time.Now().UTC()
	priority := CalculatePriority(req.Urgency, req.Impact)

	// Determine initial status, CAB requirement, PIR requirement per classification.
	initialStatus := workflow.ChangeDraft
	cabRequired := false
	pirRequired := false

	switch req.Classification {
	case ChangeClassificationEmergency:
		initialStatus = workflow.ChangeApproved
		cabRequired = false
		pirRequired = true // Emergency always needs PIR
	case ChangeClassificationStandard:
		cabRequired = false
		riskLevel := "low"
		if req.RiskLevel != nil {
			riskLevel = *req.RiskLevel
		}
		if riskLevel == RiskLevelLow {
			initialStatus = workflow.ChangeApproved
		}
		pirRequired = false
	case ChangeClassificationNormal:
		cabRequired = true
		pirRequired = true
	}

	riskLevel := RiskLevelMedium
	if req.RiskLevel != nil {
		riskLevel = *req.RiskLevel
	}

	query := `
		INSERT INTO tickets (
			id, tenant_id, type, title, description,
			priority, urgency, impact, status, channel,
			reporter_id, assignee_id, team_queue_id,
			category, tags, custom_fields,
			is_major_incident, related_ticket_ids, linked_asset_ids,
			sla_paused_duration_minutes,
			change_classification, change_type, risk_level, risk_assessment,
			implementation_plan, rollback_plan, test_plan,
			scheduled_start, scheduled_end,
			cab_required, pir_required,
			created_at, updated_at
		) VALUES (
			$1, $2, 'change', $3, $4,
			$5, $6, $7, $8, 'portal',
			$9, $10, $11,
			$12, $13, $14,
			false, '{}', '{}',
			0,
			$15, $16, $17, $18,
			$19, $20, $21,
			$22, $23,
			$24, $25,
			$26, $27
		)
		RETURNING ` + ticketColumns

	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Title, req.Description,
		priority, req.Urgency, req.Impact, initialStatus,
		auth.UserID, req.AssigneeID, req.TeamQueueID,
		req.Category, tags, json.RawMessage("{}"),
		req.Classification, req.ChangeType, riskLevel, req.RiskAssessment,
		req.ImplementationPlan, req.RollbackPlan, req.TestPlan,
		req.ScheduledStart, req.ScheduledEnd,
		cabRequired, pirRequired,
		now, now,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to create change", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":          req.Title,
		"classification": req.Classification,
		"status":         initialStatus,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:change",
		EntityType: "change",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return t, nil
}

// ──────────────────────────────────────────────
// Read
// ──────────────────────────────────────────────

// GetChange retrieves a single change ticket by ID.
func (s *ChangeService) GetChange(ctx context.Context, id uuid.UUID) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + ticketSelectColumns + ` ` + ticketFromJoins + `
		WHERE t.id = $1 AND t.tenant_id = $2 AND t.type = 'change'`

	t, err := scanTicketEnriched(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Ticket{}, apperrors.NotFound("Change", id.String())
		}
		return Ticket{}, apperrors.Internal("failed to get change", err)
	}
	return t, nil
}

// ListChanges returns a filtered, paginated list of change tickets.
func (s *ChangeService) ListChanges(ctx context.Context, classification, status *string, limit, offset int) ([]Ticket, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM tickets
		WHERE tenant_id = $1 AND type = 'change'
			AND ($2::text IS NULL OR change_classification = $2)
			AND ($3::text IS NULL OR status = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, classification, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count changes", err)
	}

	dataQuery := `SELECT ` + ticketSelectColumns + ` ` + ticketFromJoins + `
		WHERE t.tenant_id = $1 AND t.type = 'change'
			AND ($2::text IS NULL OR t.change_classification = $2)
			AND ($3::text IS NULL OR t.status = $3)
		ORDER BY t.created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, classification, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list changes", err)
	}
	defer rows.Close()

	tickets, err := scanTicketsEnriched(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan changes", err)
	}
	return tickets, total, nil
}

// ──────────────────────────────────────────────
// Update
// ──────────────────────────────────────────────

// UpdateChange updates change-specific fields on a change ticket.
func (s *ChangeService) UpdateChange(ctx context.Context, id uuid.UUID, req UpdateChangeRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}
	existing, err := s.GetChange(ctx, id)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	now := time.Now().UTC()

	query := `
		UPDATE tickets SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			change_type = COALESCE($3, change_type),
			risk_level = COALESCE($4, risk_level),
			risk_assessment = COALESCE($5, risk_assessment),
			implementation_plan = COALESCE($6, implementation_plan),
			rollback_plan = COALESCE($7, rollback_plan),
			test_plan = COALESCE($8, test_plan),
			scheduled_start = COALESCE($9, scheduled_start),
			scheduled_end = COALESCE($10, scheduled_end),
			assignee_id = COALESCE($11, assignee_id),
			category = COALESCE($12, category),
			updated_at = $13
		WHERE id = $14 AND tenant_id = $15 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.Title, req.Description,
		req.ChangeType, req.RiskLevel, req.RiskAssessment,
		req.ImplementationPlan, req.RollbackPlan, req.TestPlan,
		req.ScheduledStart, req.ScheduledEnd,
		req.AssigneeID, req.Category,
		now, id, auth.TenantID,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Ticket{}, apperrors.NotFound("Change", id.String())
		}
		return Ticket{}, apperrors.Internal("failed to update change", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:change",
		EntityType: "change",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return t, nil
}

// ──────────────────────────────────────────────
// Risk Assessment
// ──────────────────────────────────────────────

// SubmitRiskAssessment updates the risk assessment data on a change ticket.
func (s *ChangeService) SubmitRiskAssessment(ctx context.Context, changeID uuid.UUID, req SubmitRiskAssessmentRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}
	existing, err := s.GetChange(ctx, changeID)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	now := time.Now().UTC()

	query := `
		UPDATE tickets SET
			risk_assessment = $1,
			risk_level = COALESCE($2, risk_level),
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.RiskAssessment, req.RiskLevel, now, changeID, auth.TenantID,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Ticket{}, apperrors.NotFound("Change", changeID.String())
		}
		return Ticket{}, apperrors.Internal("failed to submit risk assessment", err)
	}

	changes, _ := json.Marshal(map[string]any{"riskAssessment": "updated", "riskLevel": req.RiskLevel})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "risk_assessment:change",
		EntityType: "change",
		EntityID:   changeID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return t, nil
}

// ──────────────────────────────────────────────
// Implement / Complete / Rollback
// ──────────────────────────────────────────────

// ImplementChange transitions a change to implementing and records actual_start.
func (s *ChangeService) ImplementChange(ctx context.Context, changeID uuid.UUID, req ImplementChangeRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetChange(ctx, changeID)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	if err := workflow.ChangeStateMachine.Validate(existing.Status, workflow.ChangeImplementing); err != nil {
		return Ticket{}, apperrors.BadRequest(err.Error())
	}

	now := time.Now().UTC()

	query := `
		UPDATE tickets SET
			status = $1,
			actual_start = $2,
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		workflow.ChangeImplementing, now, now, changeID, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to implement change", err)
	}

	_, _ = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New(), changeID, existing.Status, workflow.ChangeImplementing, auth.UserID, req.Comment, now,
	)

	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status, "new_status": workflow.ChangeImplementing, "comment": req.Comment,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "implement:change", EntityType: "change", EntityID: changeID, Changes: changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	if s.js != nil {
		eventData, _ := json.Marshal(map[string]any{
			"changeId": changeID, "ticketNumber": t.TicketNumber, "title": t.Title,
			"previousStatus": existing.Status, "newStatus": workflow.ChangeImplementing, "actorId": auth.UserID,
		})
		payload, _ := json.Marshal(map[string]any{
			"type": "itsm.change.implementing", "tenantId": auth.TenantID,
			"actorId": auth.UserID, "entityType": "change", "entityId": changeID,
			"data": json.RawMessage(eventData),
		})
		if _, pubErr := s.js.Publish("notify.itsm.change.implementing", payload); pubErr != nil {
			slog.ErrorContext(ctx, "failed to publish change implement event", "error", pubErr)
		}
	}

	return t, nil
}

// CompleteChange marks a change as implemented or failed and sets actual_end + change_success.
func (s *ChangeService) CompleteChange(ctx context.Context, changeID uuid.UUID, req CompleteChangeRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetChange(ctx, changeID)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	var targetStatus string
	if req.Success {
		targetStatus = workflow.ChangeImplemented
	} else {
		targetStatus = workflow.ChangeFailed
	}

	if err := workflow.ChangeStateMachine.Validate(existing.Status, targetStatus); err != nil {
		return Ticket{}, apperrors.BadRequest(err.Error())
	}

	now := time.Now().UTC()

	pirRequired := existing.PIRRequired
	if !req.Success {
		pirRequired = true
	}

	query := `
		UPDATE tickets SET
			status = $1,
			actual_end = $2,
			change_success = $3,
			cab_notes = COALESCE($4, cab_notes),
			pir_required = $5,
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		targetStatus, now, req.Success, req.Notes, pirRequired, now, changeID, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to complete change", err)
	}

	_, _ = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New(), changeID, existing.Status, targetStatus, auth.UserID, req.Notes, now,
	)

	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status, "new_status": targetStatus,
		"success": req.Success, "notes": req.Notes,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "complete:change", EntityType: "change", EntityID: changeID, Changes: changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	if s.js != nil {
		eventData, _ := json.Marshal(map[string]any{
			"changeId": changeID, "ticketNumber": t.TicketNumber, "title": t.Title,
			"previousStatus": existing.Status, "newStatus": targetStatus,
			"success": req.Success, "actorId": auth.UserID,
		})
		payload, _ := json.Marshal(map[string]any{
			"type": "itsm.change.completed", "tenantId": auth.TenantID,
			"actorId": auth.UserID, "entityType": "change", "entityId": changeID,
			"data": json.RawMessage(eventData),
		})
		if _, pubErr := s.js.Publish("notify.itsm.change.completed", payload); pubErr != nil {
			slog.ErrorContext(ctx, "failed to publish change complete event", "error", pubErr)
		}
	}

	return t, nil
}

// RollbackChange transitions a change to rolled_back and sets actual_end.
func (s *ChangeService) RollbackChange(ctx context.Context, changeID uuid.UUID, req RollbackChangeRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetChange(ctx, changeID)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	if err := workflow.ChangeStateMachine.Validate(existing.Status, workflow.ChangeRolledBack); err != nil {
		return Ticket{}, apperrors.BadRequest(err.Error())
	}

	now := time.Now().UTC()

	query := `
		UPDATE tickets SET
			status = $1,
			actual_end = $2,
			change_success = false,
			cab_notes = COALESCE($3, cab_notes),
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		workflow.ChangeRolledBack, now, &req.Reason, now, changeID, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to rollback change", err)
	}

	_, _ = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New(), changeID, existing.Status, workflow.ChangeRolledBack, auth.UserID, &req.Reason, now,
	)

	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status, "new_status": workflow.ChangeRolledBack, "reason": req.Reason,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "rollback:change", EntityType: "change", EntityID: changeID, Changes: changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	if s.js != nil {
		eventData, _ := json.Marshal(map[string]any{
			"changeId": changeID, "ticketNumber": t.TicketNumber, "title": t.Title,
			"previousStatus": existing.Status, "newStatus": workflow.ChangeRolledBack,
			"reason": req.Reason, "actorId": auth.UserID,
		})
		payload, _ := json.Marshal(map[string]any{
			"type": "itsm.change.rolled_back", "tenantId": auth.TenantID,
			"actorId": auth.UserID, "entityType": "change", "entityId": changeID,
			"data": json.RawMessage(eventData),
		})
		if _, pubErr := s.js.Publish("notify.itsm.change.rolled_back", payload); pubErr != nil {
			slog.ErrorContext(ctx, "failed to publish change rollback event", "error", pubErr)
		}
	}

	return t, nil
}

// ──────────────────────────────────────────────
// Transition
// ──────────────────────────────────────────────

// TransitionChange transitions a change ticket to a new status.
func (s *ChangeService) TransitionChange(ctx context.Context, id uuid.UUID, req TransitionChangeRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetChange(ctx, id)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	// Validate transition.
	if err := workflow.ChangeStateMachine.Validate(existing.Status, req.TargetStatus); err != nil {
		return Ticket{}, apperrors.BadRequest(err.Error())
	}

	now := time.Now().UTC()

	// Set actual_start/actual_end based on status.
	var actualStart, actualEnd *time.Time
	if req.TargetStatus == workflow.ChangeImplementing {
		actualStart = &now
	}
	if req.TargetStatus == workflow.ChangeImplemented || req.TargetStatus == workflow.ChangeFailed || req.TargetStatus == workflow.ChangeRolledBack {
		actualEnd = &now
	}

	// Auto-set PIR required on failure.
	pirRequired := existing.PIRRequired
	if req.TargetStatus == workflow.ChangeFailed {
		pirRequired = true
	}

	query := `
		UPDATE tickets SET
			status = $1,
			actual_start = COALESCE($2, actual_start),
			actual_end = COALESCE($3, actual_end),
			pir_required = $4,
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.TargetStatus, actualStart, actualEnd, pirRequired, now, id, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to transition change status", err)
	}

	// Record status history.
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New(), id, existing.Status, req.TargetStatus, auth.UserID, req.Comment, now,
	)

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      req.TargetStatus,
		"comment":         req.Comment,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:change",
		EntityType: "change",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Publish NATS event.
	if s.js != nil {
		eventData, _ := json.Marshal(map[string]any{
			"changeId":       id,
			"ticketNumber":   t.TicketNumber,
			"title":          t.Title,
			"classification": t.ChangeClassification,
			"previousStatus": existing.Status,
			"newStatus":      req.TargetStatus,
			"comment":        req.Comment,
			"actorId":        auth.UserID,
			"assigneeId":     t.AssigneeID,
		})
		payload, _ := json.Marshal(map[string]any{
			"type":       "itsm.change.transitioned",
			"tenantId":   auth.TenantID,
			"actorId":    auth.UserID,
			"entityType": "change",
			"entityId":   id,
			"data":       json.RawMessage(eventData),
		})
		if _, pubErr := s.js.Publish("notify.itsm.change.transitioned", payload); pubErr != nil {
			slog.ErrorContext(ctx, "failed to publish change transition event", "error", pubErr)
		}
	}

	return t, nil
}

// ──────────────────────────────────────────────
// CAB Decision
// ──────────────────────────────────────────────

// SubmitCABDecision records a CAB decision on a change and auto-transitions it.
func (s *ChangeService) SubmitCABDecision(ctx context.Context, changeID uuid.UUID, req SubmitCABDecisionRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	// Validate decision value.
	switch req.Decision {
	case CABDecisionApproved, CABDecisionRejected, CABDecisionDeferred, CABDecisionConditionallyApproved:
	default:
		return Ticket{}, apperrors.BadRequest("invalid CAB decision: " + req.Decision)
	}

	existing, err := s.GetChange(ctx, changeID)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	if existing.Status != workflow.ChangeCABReview {
		return Ticket{}, apperrors.BadRequest("change must be in cab_review status to receive a CAB decision")
	}

	now := time.Now().UTC()

	// Determine target status based on decision.
	var targetStatus string
	switch req.Decision {
	case CABDecisionApproved, CABDecisionConditionallyApproved:
		targetStatus = workflow.ChangeApproved
	case CABDecisionRejected:
		targetStatus = workflow.ChangeRejected
	case CABDecisionDeferred:
		targetStatus = workflow.ChangeDeferred
	}

	query := `
		UPDATE tickets SET
			cab_decision = $1,
			cab_decision_date = $2,
			status = $3,
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.Decision, now, targetStatus, now, changeID, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to submit CAB decision", err)
	}

	// Record status history.
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New(), changeID, existing.Status, targetStatus, auth.UserID, req.Notes, now,
	)

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"decision":        req.Decision,
		"notes":           req.Notes,
		"previous_status": existing.Status,
		"new_status":      targetStatus,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "cab_decision:change",
		EntityType: "change",
		EntityID:   changeID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Publish NATS event.
	if s.js != nil {
		eventData, _ := json.Marshal(map[string]any{
			"changeId":     changeID,
			"ticketNumber": t.TicketNumber,
			"title":        t.Title,
			"decision":     req.Decision,
			"notes":        req.Notes,
			"actorId":      auth.UserID,
		})
		payload, _ := json.Marshal(map[string]any{
			"type":       "itsm.cab.decision",
			"tenantId":   auth.TenantID,
			"actorId":    auth.UserID,
			"entityType": "change",
			"entityId":   changeID,
			"data":       json.RawMessage(eventData),
		})
		if _, pubErr := s.js.Publish("notify.itsm.cab.decision", payload); pubErr != nil {
			slog.ErrorContext(ctx, "failed to publish CAB decision event", "error", pubErr)
		}
	}

	return t, nil
}

// ──────────────────────────────────────────────
// PIR (Post-Implementation Review)
// ──────────────────────────────────────────────

// CompletePIR records the PIR and transitions the change to closed.
func (s *ChangeService) CompletePIR(ctx context.Context, changeID uuid.UUID, req CompletePIRRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetChange(ctx, changeID)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	if existing.Status != workflow.ChangePIRPending {
		return Ticket{}, apperrors.BadRequest("change must be in pir_pending status to complete PIR")
	}

	now := time.Now().UTC()

	query := `
		UPDATE tickets SET
			pir_completed = true,
			pir_notes = $1,
			status = $2,
			closed_at = $3,
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6 AND type = 'change'
		RETURNING ` + ticketColumns

	t, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.PIRNotes, workflow.ChangeClosed, now, now, changeID, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to complete PIR", err)
	}

	// Record status history.
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New(), changeID, existing.Status, workflow.ChangeClosed, auth.UserID, &req.PIRNotes, now,
	)

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"pir_notes":       req.PIRNotes,
		"previous_status": existing.Status,
		"new_status":      workflow.ChangeClosed,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "complete_pir:change",
		EntityType: "change",
		EntityID:   changeID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return t, nil
}

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────

// GetChangeStats returns aggregate statistics for changes.
func (s *ChangeService) GetChangeStats(ctx context.Context) (ChangeStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChangeStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE change_classification = 'emergency'),
			COUNT(*) FILTER (WHERE change_classification = 'standard'),
			COUNT(*) FILTER (WHERE change_classification = 'normal'),
			COUNT(*) FILTER (WHERE status = 'cab_review'),
			COUNT(*) FILTER (WHERE status = 'implementing'),
			COUNT(*) FILTER (WHERE status = 'pir_pending')
		FROM tickets
		WHERE tenant_id = $1 AND type = 'change'`

	var stats ChangeStats
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&stats.Total, &stats.Emergency, &stats.Standard, &stats.Normal,
		&stats.PendingCAB, &stats.Implementing, &stats.PendingPIR,
	)
	if err != nil {
		return ChangeStats{}, apperrors.Internal("failed to get change stats", err)
	}
	return stats, nil
}

// ──────────────────────────────────────────────
// Calendar
// ──────────────────────────────────────────────

// GetChangeCalendar returns scheduled changes, freeze periods, and maintenance windows for a date range.
func (s *ChangeService) GetChangeCalendar(ctx context.Context, rangeStart, rangeEnd time.Time) ([]ChangeCalendarEvent, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	var events []ChangeCalendarEvent

	// Scheduled changes.
	changeQuery := `
		SELECT id, title, change_classification, risk_level, status, scheduled_start, scheduled_end
		FROM tickets
		WHERE tenant_id = $1 AND type = 'change'
			AND scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL
			AND scheduled_start <= $3 AND scheduled_end >= $2`

	rows, err := s.pool.Query(ctx, changeQuery, auth.TenantID, rangeStart, rangeEnd)
	if err != nil {
		return nil, apperrors.Internal("failed to query change calendar", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e ChangeCalendarEvent
		if err := rows.Scan(&e.ID, &e.Title, &e.Classification, &e.RiskLevel, &e.Status, &e.StartTime, &e.EndTime); err != nil {
			return nil, apperrors.Internal("failed to scan change calendar event", err)
		}
		e.EventType = "change"
		events = append(events, e)
	}
	rows.Close()

	// Freeze periods.
	freezeQuery := `
		SELECT id, name, start_time, end_time
		FROM change_freeze_periods
		WHERE tenant_id = $1 AND start_time <= $3 AND end_time >= $2`

	fRows, err := s.pool.Query(ctx, freezeQuery, auth.TenantID, rangeStart, rangeEnd)
	if err != nil {
		return nil, apperrors.Internal("failed to query freeze periods", err)
	}
	defer fRows.Close()

	for fRows.Next() {
		var e ChangeCalendarEvent
		if err := fRows.Scan(&e.ID, &e.Title, &e.StartTime, &e.EndTime); err != nil {
			return nil, apperrors.Internal("failed to scan freeze period", err)
		}
		e.EventType = "freeze"
		e.Status = "active"
		events = append(events, e)
	}
	fRows.Close()

	// Maintenance windows.
	mwQuery := `
		SELECT id, title, status, start_time, end_time
		FROM maintenance_windows
		WHERE tenant_id = $1 AND start_time <= $3 AND end_time >= $2`

	mRows, err := s.pool.Query(ctx, mwQuery, auth.TenantID, rangeStart, rangeEnd)
	if err != nil {
		return nil, apperrors.Internal("failed to query maintenance windows", err)
	}
	defer mRows.Close()

	for mRows.Next() {
		var e ChangeCalendarEvent
		if err := mRows.Scan(&e.ID, &e.Title, &e.Status, &e.StartTime, &e.EndTime); err != nil {
			return nil, apperrors.Internal("failed to scan maintenance window", err)
		}
		e.EventType = "maintenance"
		events = append(events, e)
	}

	if events == nil {
		events = []ChangeCalendarEvent{}
	}
	return events, nil
}

// ──────────────────────────────────────────────
// Freeze period check
// ──────────────────────────────────────────────

// CheckFreezePeriod checks whether a given time range overlaps with any active freeze period.
func (s *ChangeService) CheckFreezePeriod(ctx context.Context, startTime, endTime time.Time) (ChangeFreezeCheck, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChangeFreezeCheck{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT name, end_time
		FROM change_freeze_periods
		WHERE tenant_id = $1 AND start_time <= $3 AND end_time >= $2
		LIMIT 1`

	var name string
	var freezeEnd time.Time
	err := s.pool.QueryRow(ctx, query, auth.TenantID, startTime, endTime).Scan(&name, &freezeEnd)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ChangeFreezeCheck{IsFrozen: false}, nil
		}
		return ChangeFreezeCheck{}, apperrors.Internal("failed to check freeze periods", err)
	}
	return ChangeFreezeCheck{
		IsFrozen:   true,
		FreezeName: &name,
		FreezeEnd:  &freezeEnd,
	}, nil
}

// ──────────────────────────────────────────────
// CAB Meeting CRUD
// ──────────────────────────────────────────────

const cabMeetingColumns = `id, tenant_id, title, description, scheduled_date, status,
	chair_id, attendees, minutes, decisions,
	duration_minutes, location, meeting_type, secretary_user_id, agenda, change_ticket_ids,
	created_by, created_at, updated_at`

func scanCABMeeting(row pgx.Row) (CABMeeting, error) {
	var m CABMeeting
	err := row.Scan(
		&m.ID, &m.TenantID, &m.Title, &m.Description, &m.ScheduledDate, &m.Status,
		&m.ChairID, &m.Attendees, &m.Minutes, &m.Decisions,
		&m.DurationMinutes, &m.Location, &m.MeetingType, &m.SecretaryUserID, &m.Agenda, &m.ChangeTicketIDs,
		&m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
	)
	return m, err
}

// CreateCABMeeting creates a new CAB meeting.
func (s *ChangeService) CreateCABMeeting(ctx context.Context, req CreateCABMeetingRequest) (CABMeeting, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CABMeeting{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	attendees := req.Attendees
	if attendees == nil {
		attendees = []uuid.UUID{}
	}

	changeTicketIDs := req.ChangeTicketIDs
	if changeTicketIDs == nil {
		changeTicketIDs = []uuid.UUID{}
	}

	query := `
		INSERT INTO cab_meetings (
			id, tenant_id, title, description, scheduled_date,
			chair_id, attendees,
			duration_minutes, location, meeting_type, secretary_user_id, agenda, change_ticket_ids,
			created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'regular'), $11, COALESCE($12, '[]'), $13, $14, $15, $16)
		RETURNING ` + cabMeetingColumns

	m, err := scanCABMeeting(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Title, req.Description, req.ScheduledDate,
		req.ChairID, attendees,
		req.DurationMinutes, req.Location, req.MeetingType, req.SecretaryUserID, req.Agenda, changeTicketIDs,
		auth.UserID, now, now,
	))
	if err != nil {
		return CABMeeting{}, apperrors.Internal("failed to create CAB meeting", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{"title": req.Title})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:cab_meeting",
		EntityType: "cab_meeting",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return m, nil
}

// GetCABMeeting retrieves a single CAB meeting by ID.
func (s *ChangeService) GetCABMeeting(ctx context.Context, id uuid.UUID) (CABMeeting, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CABMeeting{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + cabMeetingColumns + ` FROM cab_meetings WHERE id = $1 AND tenant_id = $2`

	m, err := scanCABMeeting(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return CABMeeting{}, apperrors.NotFound("CABMeeting", id.String())
		}
		return CABMeeting{}, apperrors.Internal("failed to get CAB meeting", err)
	}
	return m, nil
}

// ListCABMeetings returns a paginated list of CAB meetings.
func (s *ChangeService) ListCABMeetings(ctx context.Context, status *string, limit, offset int) ([]CABMeeting, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM cab_meetings
		WHERE tenant_id = $1 AND ($2::text IS NULL OR status = $2)`

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, status).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count CAB meetings", err)
	}

	dataQuery := `SELECT ` + cabMeetingColumns + `
		FROM cab_meetings
		WHERE tenant_id = $1 AND ($2::text IS NULL OR status = $2)
		ORDER BY scheduled_date DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list CAB meetings", err)
	}
	defer rows.Close()

	var meetings []CABMeeting
	for rows.Next() {
		m, err := scanCABMeeting(rows)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to scan CAB meeting", err)
		}
		meetings = append(meetings, m)
	}
	if meetings == nil {
		meetings = []CABMeeting{}
	}
	return meetings, total, nil
}

// UpdateCABMeeting updates a CAB meeting.
func (s *ChangeService) UpdateCABMeeting(ctx context.Context, id uuid.UUID, req UpdateCABMeetingRequest) (CABMeeting, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CABMeeting{}, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE cab_meetings SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			scheduled_date = COALESCE($3, scheduled_date),
			chair_id = COALESCE($4, chair_id),
			attendees = COALESCE($5, attendees),
			minutes = COALESCE($6, minutes),
			status = COALESCE($7, status),
			duration_minutes = COALESCE($8, duration_minutes),
			location = COALESCE($9, location),
			meeting_type = COALESCE($10, meeting_type),
			secretary_user_id = COALESCE($11, secretary_user_id),
			agenda = COALESCE($12, agenda),
			change_ticket_ids = COALESCE($13, change_ticket_ids),
			updated_at = $14
		WHERE id = $15 AND tenant_id = $16
		RETURNING ` + cabMeetingColumns

	m, err := scanCABMeeting(s.pool.QueryRow(ctx, query,
		req.Title, req.Description, req.ScheduledDate,
		req.ChairID, req.Attendees, req.Minutes, req.Status,
		req.DurationMinutes, req.Location, req.MeetingType, req.SecretaryUserID, req.Agenda, req.ChangeTicketIDs,
		now, id, auth.TenantID,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return CABMeeting{}, apperrors.NotFound("CABMeeting", id.String())
		}
		return CABMeeting{}, apperrors.Internal("failed to update CAB meeting", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:cab_meeting",
		EntityType: "cab_meeting",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return m, nil
}

// CompleteCABMeeting marks a CAB meeting as completed.
func (s *ChangeService) CompleteCABMeeting(ctx context.Context, id uuid.UUID) (CABMeeting, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CABMeeting{}, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE cab_meetings SET
			status = 'completed',
			updated_at = $1
		WHERE id = $2 AND tenant_id = $3 AND status = 'in_progress'
		RETURNING ` + cabMeetingColumns

	m, err := scanCABMeeting(s.pool.QueryRow(ctx, query, now, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return CABMeeting{}, apperrors.BadRequest("CAB meeting must be in_progress to complete")
		}
		return CABMeeting{}, apperrors.Internal("failed to complete CAB meeting", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{"status": "completed"})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "complete:cab_meeting",
		EntityType: "cab_meeting",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return m, nil
}
