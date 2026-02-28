package approval

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
)

// Service handles business logic for the approval workflow engine.
type Service struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewService creates a new approval Service.
func NewService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Service {
	return &Service{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Workflow Definitions
// ──────────────────────────────────────────────

// ListWorkflowDefinitions returns all active workflow definitions, optionally filtered by entity type.
func (s *Service) ListWorkflowDefinitions(ctx context.Context, tenantID uuid.UUID, entityType string) ([]WorkflowDefinition, error) {
	var conditions []string
	var args []any
	argIdx := 0
	nextArg := func() string { argIdx++; return fmt.Sprintf("$%d", argIdx) }

	conditions = append(conditions, fmt.Sprintf("tenant_id = %s", nextArg()))
	args = append(args, tenantID)

	if entityType != "" {
		conditions = append(conditions, fmt.Sprintf("entity_type = %s", nextArg()))
		args = append(args, entityType)
	}

	whereClause := ""
	for i, c := range conditions {
		if i == 0 {
			whereClause = "WHERE " + c
		} else {
			whereClause += " AND " + c
		}
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, description, entity_type, steps, is_active,
			version, auto_assign_rules, created_by, created_at, updated_at
		FROM workflow_definitions
		%s
		ORDER BY created_at DESC`, whereClause)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, apperrors.Internal("failed to list workflow definitions", err)
	}
	defer rows.Close()

	var defs []WorkflowDefinition
	for rows.Next() {
		var d WorkflowDefinition
		var stepsJSON []byte
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.Name, &d.Description, &d.EntityType, &stepsJSON,
			&d.IsActive, &d.Version, &d.AutoAssignRules, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan workflow definition", err)
		}
		if stepsJSON != nil {
			if err := json.Unmarshal(stepsJSON, &d.Steps); err != nil {
				return nil, apperrors.Internal("failed to parse workflow steps", err)
			}
		}
		if d.Steps == nil {
			d.Steps = []WorkflowStepDef{}
		}
		defs = append(defs, d)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate workflow definitions", err)
	}

	if defs == nil {
		defs = []WorkflowDefinition{}
	}

	return defs, nil
}

// GetWorkflowDefinition retrieves a single workflow definition by ID.
func (s *Service) GetWorkflowDefinition(ctx context.Context, tenantID, id uuid.UUID) (*WorkflowDefinition, error) {
	query := `
		SELECT id, tenant_id, name, description, entity_type, steps, is_active,
			version, auto_assign_rules, created_by, created_at, updated_at
		FROM workflow_definitions
		WHERE id = $1 AND tenant_id = $2`

	var d WorkflowDefinition
	var stepsJSON []byte
	err := s.pool.QueryRow(ctx, query, id, tenantID).Scan(
		&d.ID, &d.TenantID, &d.Name, &d.Description, &d.EntityType, &stepsJSON,
		&d.IsActive, &d.Version, &d.AutoAssignRules, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("WorkflowDefinition", id.String())
		}
		return nil, apperrors.Internal("failed to get workflow definition", err)
	}
	if stepsJSON != nil {
		if err := json.Unmarshal(stepsJSON, &d.Steps); err != nil {
			return nil, apperrors.Internal("failed to parse workflow steps", err)
		}
	}
	if d.Steps == nil {
		d.Steps = []WorkflowStepDef{}
	}

	return &d, nil
}

// CreateWorkflowDefinition creates a new workflow definition.
func (s *Service) CreateWorkflowDefinition(ctx context.Context, tenantID, createdBy uuid.UUID, req CreateWorkflowDefinitionRequest) (*WorkflowDefinition, error) {
	if req.Name == "" {
		return nil, apperrors.BadRequest("Name is required")
	}
	if req.EntityType == "" {
		return nil, apperrors.BadRequest("Entity type is required")
	}
	if len(req.Steps) == 0 {
		return nil, apperrors.BadRequest("At least one step is required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	stepsJSON, err := json.Marshal(req.Steps)
	if err != nil {
		return nil, apperrors.Internal("failed to marshal workflow steps", err)
	}

	query := `
		INSERT INTO workflow_definitions (
			id, tenant_id, name, description, entity_type, steps, is_active,
			version, auto_assign_rules, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, tenant_id, name, description, entity_type, steps, is_active,
			version, auto_assign_rules, created_by, created_at, updated_at`

	var d WorkflowDefinition
	var returnedStepsJSON []byte
	err = s.pool.QueryRow(ctx, query,
		id, tenantID, req.Name, req.Description, req.EntityType, stepsJSON,
		true, 1, req.AutoAssignRules, createdBy, now, now,
	).Scan(
		&d.ID, &d.TenantID, &d.Name, &d.Description, &d.EntityType, &returnedStepsJSON,
		&d.IsActive, &d.Version, &d.AutoAssignRules, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create workflow definition", err)
	}
	if returnedStepsJSON != nil {
		if err := json.Unmarshal(returnedStepsJSON, &d.Steps); err != nil {
			return nil, apperrors.Internal("failed to parse workflow steps", err)
		}
	}
	if d.Steps == nil {
		d.Steps = []WorkflowStepDef{}
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"name":        req.Name,
		"entity_type": req.EntityType,
		"steps_count": len(req.Steps),
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    createdBy,
		Action:     "create:workflow",
		EntityType: "workflow_definition",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &d, nil
}

// UpdateWorkflowDefinition updates an existing workflow definition.
func (s *Service) UpdateWorkflowDefinition(ctx context.Context, tenantID, id, updatedBy uuid.UUID, req UpdateWorkflowDefinitionRequest) (*WorkflowDefinition, error) {
	existing, err := s.GetWorkflowDefinition(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	newVersion := existing.Version + 1

	var stepsJSON []byte
	if req.Steps != nil {
		stepsJSON, err = json.Marshal(req.Steps)
		if err != nil {
			return nil, apperrors.Internal("failed to marshal workflow steps", err)
		}
	}

	query := `
		UPDATE workflow_definitions SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			entity_type = COALESCE($3, entity_type),
			steps = COALESCE($4, steps),
			is_active = COALESCE($5, is_active),
			auto_assign_rules = COALESCE($6, auto_assign_rules),
			version = $7,
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING id, tenant_id, name, description, entity_type, steps, is_active,
			version, auto_assign_rules, created_by, created_at, updated_at`

	var d WorkflowDefinition
	var returnedStepsJSON []byte
	err = s.pool.QueryRow(ctx, query,
		req.Name, req.Description, req.EntityType, stepsJSON,
		req.IsActive, req.AutoAssignRules, newVersion, now,
		id, tenantID,
	).Scan(
		&d.ID, &d.TenantID, &d.Name, &d.Description, &d.EntityType, &returnedStepsJSON,
		&d.IsActive, &d.Version, &d.AutoAssignRules, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to update workflow definition", err)
	}
	if returnedStepsJSON != nil {
		if err := json.Unmarshal(returnedStepsJSON, &d.Steps); err != nil {
			return nil, apperrors.Internal("failed to parse workflow steps", err)
		}
	}
	if d.Steps == nil {
		d.Steps = []WorkflowStepDef{}
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"version": newVersion,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    updatedBy,
		Action:     "update:workflow",
		EntityType: "workflow_definition",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &d, nil
}

// DeleteWorkflowDefinition soft-deletes a workflow definition by setting is_active to false.
func (s *Service) DeleteWorkflowDefinition(ctx context.Context, tenantID, id, deletedBy uuid.UUID) error {
	now := time.Now().UTC()
	query := `
		UPDATE workflow_definitions
		SET is_active = false, updated_at = $1
		WHERE id = $2 AND tenant_id = $3`

	result, err := s.pool.Exec(ctx, query, now, id, tenantID)
	if err != nil {
		return apperrors.Internal("failed to deactivate workflow definition", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("WorkflowDefinition", id.String())
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"is_active": false,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    deletedBy,
		Action:     "delete:workflow",
		EntityType: "workflow_definition",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Approval Chains
// ──────────────────────────────────────────────

// StartApproval creates a new approval chain for the given entity.
// It finds the matching workflow definition, creates the chain record,
// and creates the initial step(s) for the first step order.
func (s *Service) StartApproval(ctx context.Context, tenantID, createdBy uuid.UUID, req StartApprovalRequest) (*ApprovalChain, error) {
	if req.EntityType == "" {
		return nil, apperrors.BadRequest("Entity type is required")
	}
	if req.EntityID == uuid.Nil {
		return nil, apperrors.BadRequest("Entity ID is required")
	}

	// Check for an existing active chain for this entity.
	var existingCount int
	checkQuery := `
		SELECT COUNT(*) FROM approval_chains
		WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3
			AND status NOT IN ('approved', 'rejected', 'cancelled')`
	if err := s.pool.QueryRow(ctx, checkQuery, req.EntityType, req.EntityID, tenantID).Scan(&existingCount); err != nil {
		return nil, apperrors.Internal("failed to check existing chains", err)
	}
	if existingCount > 0 {
		return nil, apperrors.BadRequest("An active approval chain already exists for this entity")
	}

	// Find the workflow definition.
	var wfID uuid.UUID
	if req.WorkflowDefinitionID != nil {
		wfID = *req.WorkflowDefinitionID
	} else {
		// Auto-find active workflow for entity type.
		findQuery := `
			SELECT id FROM workflow_definitions
			WHERE entity_type = $1 AND tenant_id = $2 AND is_active = true
			ORDER BY created_at DESC LIMIT 1`
		err := s.pool.QueryRow(ctx, findQuery, req.EntityType, tenantID).Scan(&wfID)
		if err != nil {
			if err == pgx.ErrNoRows {
				return nil, apperrors.NotFound("WorkflowDefinition", "entity_type="+req.EntityType)
			}
			return nil, apperrors.Internal("failed to find workflow definition", err)
		}
	}

	// Load the workflow definition.
	wfDef, err := s.GetWorkflowDefinition(ctx, tenantID, wfID)
	if err != nil {
		return nil, err
	}
	if !wfDef.IsActive {
		return nil, apperrors.BadRequest("Workflow definition is not active")
	}
	if len(wfDef.Steps) == 0 {
		return nil, apperrors.BadRequest("Workflow definition has no steps")
	}

	urgency := req.Urgency
	if urgency == "" {
		urgency = UrgencyNormal
	}

	now := time.Now().UTC()
	chainID := uuid.New()

	// Create the chain.
	chainQuery := `
		INSERT INTO approval_chains (
			id, entity_type, entity_id, tenant_id, workflow_definition_id,
			status, current_step, deadline, urgency, metadata,
			created_by, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, entity_type, entity_id, tenant_id, workflow_definition_id,
			status, current_step, deadline, urgency, metadata,
			created_by, created_at, completed_at`

	var chain ApprovalChain
	err = s.pool.QueryRow(ctx, chainQuery,
		chainID, req.EntityType, req.EntityID, tenantID, wfID,
		ChainStatusInProgress, 1, req.Deadline, urgency, req.Metadata,
		createdBy, now,
	).Scan(
		&chain.ID, &chain.EntityType, &chain.EntityID, &chain.TenantID,
		&chain.WorkflowDefinitionID, &chain.Status, &chain.CurrentStep,
		&chain.Deadline, &chain.Urgency, &chain.Metadata,
		&chain.CreatedBy, &chain.CreatedAt, &chain.CompletedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create approval chain", err)
	}

	// Create steps for the first step order.
	firstStep := wfDef.Steps[0]
	chain.Steps, err = s.createStepsForOrder(ctx, chainID, firstStep, now)
	if err != nil {
		return nil, err
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"entity_type":  req.EntityType,
		"entity_id":    req.EntityID,
		"workflow_id":  wfID,
		"urgency":      urgency,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    createdBy,
		Action:     "create:approval_chain",
		EntityType: "approval_chain",
		EntityID:   chainID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &chain, nil
}

// createStepsForOrder creates approval_steps rows for a given workflow step definition.
func (s *Service) createStepsForOrder(ctx context.Context, chainID uuid.UUID, stepDef WorkflowStepDef, now time.Time) ([]ApprovalStep, error) {
	stepQuery := `
		INSERT INTO approval_steps (
			id, chain_id, step_order, approver_id, decision,
			comments, decided_at, evidence_refs, delegated_from,
			reminder_sent_at, deadline, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, chain_id, step_order, approver_id, decision,
			comments, decided_at, delegated_from,
			reminder_sent_at, deadline, created_at`

	var steps []ApprovalStep
	var stepDeadline *time.Time
	if stepDef.TimeoutHours > 0 {
		d := now.Add(time.Duration(stepDef.TimeoutHours) * time.Hour)
		stepDeadline = &d
	}

	for _, approverIDStr := range stepDef.ApproverIDs {
		approverID, err := uuid.Parse(approverIDStr)
		if err != nil {
			return nil, apperrors.BadRequest(fmt.Sprintf("Invalid approver ID: %s", approverIDStr))
		}

		stepID := uuid.New()
		var step ApprovalStep
		err = s.pool.QueryRow(ctx, stepQuery,
			stepID, chainID, stepDef.StepOrder, approverID, DecisionPending,
			nil, nil, nil, nil, nil, stepDeadline, now,
		).Scan(
			&step.ID, &step.ChainID, &step.StepOrder, &step.ApproverID,
			&step.Decision, &step.Comments, &step.DecidedAt,
			&step.DelegatedFrom, &step.ReminderSentAt, &step.Deadline, &step.CreatedAt,
		)
		if err != nil {
			return nil, apperrors.Internal("failed to create approval step", err)
		}
		step.EvidenceRefs = []string{}
		steps = append(steps, step)
	}

	if steps == nil {
		steps = []ApprovalStep{}
	}

	return steps, nil
}

// GetApprovalChain retrieves an approval chain with all its steps (joined with user names).
func (s *Service) GetApprovalChain(ctx context.Context, tenantID, chainID uuid.UUID) (*ApprovalChain, error) {
	chainQuery := `
		SELECT id, entity_type, entity_id, tenant_id, workflow_definition_id,
			status, current_step, deadline, urgency, metadata,
			created_by, created_at, completed_at
		FROM approval_chains
		WHERE id = $1 AND tenant_id = $2`

	var chain ApprovalChain
	err := s.pool.QueryRow(ctx, chainQuery, chainID, tenantID).Scan(
		&chain.ID, &chain.EntityType, &chain.EntityID, &chain.TenantID,
		&chain.WorkflowDefinitionID, &chain.Status, &chain.CurrentStep,
		&chain.Deadline, &chain.Urgency, &chain.Metadata,
		&chain.CreatedBy, &chain.CreatedAt, &chain.CompletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("ApprovalChain", chainID.String())
		}
		return nil, apperrors.Internal("failed to get approval chain", err)
	}

	// Load steps with approver names.
	chain.Steps, err = s.loadChainSteps(ctx, chainID)
	if err != nil {
		return nil, err
	}

	return &chain, nil
}

// GetApprovalChainForEntity retrieves the most recent approval chain for an entity.
func (s *Service) GetApprovalChainForEntity(ctx context.Context, tenantID uuid.UUID, entityType string, entityID uuid.UUID) (*ApprovalChain, error) {
	chainQuery := `
		SELECT id, entity_type, entity_id, tenant_id, workflow_definition_id,
			status, current_step, deadline, urgency, metadata,
			created_by, created_at, completed_at
		FROM approval_chains
		WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3
		ORDER BY created_at DESC
		LIMIT 1`

	var chain ApprovalChain
	err := s.pool.QueryRow(ctx, chainQuery, entityType, entityID, tenantID).Scan(
		&chain.ID, &chain.EntityType, &chain.EntityID, &chain.TenantID,
		&chain.WorkflowDefinitionID, &chain.Status, &chain.CurrentStep,
		&chain.Deadline, &chain.Urgency, &chain.Metadata,
		&chain.CreatedBy, &chain.CreatedAt, &chain.CompletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("ApprovalChain", fmt.Sprintf("%s/%s", entityType, entityID))
		}
		return nil, apperrors.Internal("failed to get approval chain for entity", err)
	}

	// Load steps with approver names.
	chain.Steps, err = s.loadChainSteps(ctx, chain.ID)
	if err != nil {
		return nil, err
	}

	return &chain, nil
}

// loadChainSteps loads all steps for a chain, with approver display names.
func (s *Service) loadChainSteps(ctx context.Context, chainID uuid.UUID) ([]ApprovalStep, error) {
	stepsQuery := `
		SELECT s.id, s.chain_id, s.step_order, s.approver_id,
			COALESCE(u.display_name, u.email, s.approver_id::text) AS approver_name,
			s.decision, s.comments, s.decided_at, s.evidence_refs,
			s.delegated_from, s.reminder_sent_at, s.deadline, s.created_at
		FROM approval_steps s
		LEFT JOIN users u ON u.id = s.approver_id
		WHERE s.chain_id = $1
		ORDER BY s.step_order ASC, s.created_at ASC`

	rows, err := s.pool.Query(ctx, stepsQuery, chainID)
	if err != nil {
		return nil, apperrors.Internal("failed to load chain steps", err)
	}
	defer rows.Close()

	var steps []ApprovalStep
	for rows.Next() {
		var step ApprovalStep
		if err := rows.Scan(
			&step.ID, &step.ChainID, &step.StepOrder, &step.ApproverID,
			&step.ApproverName, &step.Decision, &step.Comments, &step.DecidedAt,
			&step.EvidenceRefs, &step.DelegatedFrom, &step.ReminderSentAt,
			&step.Deadline, &step.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan approval step", err)
		}
		if step.EvidenceRefs == nil {
			step.EvidenceRefs = []string{}
		}
		steps = append(steps, step)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate approval steps", err)
	}

	if steps == nil {
		steps = []ApprovalStep{}
	}

	return steps, nil
}

// ──────────────────────────────────────────────
// Decision processing
// ──────────────────────────────────────────────

// ProcessDecision records an approver's decision on a step and advances the chain if appropriate.
func (s *Service) ProcessDecision(ctx context.Context, tenantID, userID uuid.UUID, stepID uuid.UUID, req ApprovalDecisionRequest) error {
	if req.Decision != DecisionApproved && req.Decision != DecisionRejected {
		return apperrors.BadRequest("Decision must be 'approved' or 'rejected'")
	}

	// Load the step and verify the user is the assigned approver.
	stepQuery := `
		SELECT s.id, s.chain_id, s.step_order, s.approver_id, s.decision,
			c.tenant_id, c.status, c.current_step, c.workflow_definition_id
		FROM approval_steps s
		JOIN approval_chains c ON c.id = s.chain_id
		WHERE s.id = $1`

	var (
		sID, sChainID, sApproverID, wfDefID uuid.UUID
		sStepOrder                          int
		sDecision, cStatus                  string
		cCurrentStep                        int
		cTenantID                           uuid.UUID
	)
	err := s.pool.QueryRow(ctx, stepQuery, stepID).Scan(
		&sID, &sChainID, &sStepOrder, &sApproverID, &sDecision,
		&cTenantID, &cStatus, &cCurrentStep, &wfDefID,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("ApprovalStep", stepID.String())
		}
		return apperrors.Internal("failed to load approval step", err)
	}

	// Validate tenant.
	if cTenantID != tenantID {
		return apperrors.NotFound("ApprovalStep", stepID.String())
	}

	// Validate the step belongs to the current user.
	if sApproverID != userID {
		return apperrors.Forbidden("You are not the assigned approver for this step")
	}

	// Validate step is pending.
	if sDecision != DecisionPending {
		return apperrors.BadRequest("This step has already been decided")
	}

	// Validate chain is in progress.
	if cStatus != ChainStatusInProgress {
		return apperrors.BadRequest(fmt.Sprintf("Cannot process decision on a chain with status '%s'", cStatus))
	}

	now := time.Now().UTC()

	// Record the decision.
	updateQuery := `
		UPDATE approval_steps
		SET decision = $1, comments = $2, decided_at = $3, evidence_refs = $4
		WHERE id = $5`

	var evidenceRefs []string
	if req.EvidenceRefs != nil {
		evidenceRefs = req.EvidenceRefs
	}

	_, err = s.pool.Exec(ctx, updateQuery, req.Decision, req.Comments, now, evidenceRefs, stepID)
	if err != nil {
		return apperrors.Internal("failed to record decision", err)
	}

	// Audit log for the decision.
	changes, _ := json.Marshal(map[string]any{
		"step_id":    stepID,
		"decision":   req.Decision,
		"step_order": sStepOrder,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    userID,
		Action:     "decide:approval_step",
		EntityType: "approval_step",
		EntityID:   stepID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Handle rejection — immediately reject the chain.
	if req.Decision == DecisionRejected {
		return s.rejectChain(ctx, sChainID, now)
	}

	// Handle approval — check if all steps at the current step_order are approved.
	return s.tryAdvanceChain(ctx, tenantID, sChainID, sStepOrder, wfDefID, now)
}

// rejectChain sets the chain to rejected and skips all remaining pending steps.
func (s *Service) rejectChain(ctx context.Context, chainID uuid.UUID, now time.Time) error {
	// Set chain status to rejected.
	chainUpdate := `UPDATE approval_chains SET status = $1, completed_at = $2 WHERE id = $3`
	_, err := s.pool.Exec(ctx, chainUpdate, ChainStatusRejected, now, chainID)
	if err != nil {
		return apperrors.Internal("failed to reject chain", err)
	}

	// Skip all remaining pending steps.
	skipQuery := `UPDATE approval_steps SET decision = $1 WHERE chain_id = $2 AND decision = $3`
	_, err = s.pool.Exec(ctx, skipQuery, DecisionSkipped, chainID, DecisionPending)
	if err != nil {
		return apperrors.Internal("failed to skip pending steps", err)
	}

	return nil
}

// tryAdvanceChain checks if the current step order is fully approved and advances to the next step or completes the chain.
func (s *Service) tryAdvanceChain(ctx context.Context, tenantID, chainID uuid.UUID, currentStepOrder int, wfDefID uuid.UUID, now time.Time) error {
	// Load the workflow definition to know step details.
	wfDef, err := s.GetWorkflowDefinition(ctx, tenantID, wfDefID)
	if err != nil {
		return err
	}

	// Find the current step definition.
	var currentStepDef *WorkflowStepDef
	for i := range wfDef.Steps {
		if wfDef.Steps[i].StepOrder == currentStepOrder {
			currentStepDef = &wfDef.Steps[i]
			break
		}
	}
	if currentStepDef == nil {
		return apperrors.Internal("workflow step definition not found for current step order", nil)
	}

	// Count approved and total steps at the current order.
	countQuery := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE decision = 'approved') AS approved_count,
			COUNT(*) FILTER (WHERE decision = 'pending') AS pending_count
		FROM approval_steps
		WHERE chain_id = $1 AND step_order = $2`

	var total, approvedCount, pendingCount int
	err = s.pool.QueryRow(ctx, countQuery, chainID, currentStepOrder).Scan(&total, &approvedCount, &pendingCount)
	if err != nil {
		return apperrors.Internal("failed to count step decisions", err)
	}

	// Determine if the current step order is satisfied.
	stepSatisfied := false
	switch currentStepDef.Mode {
	case StepModeSequential, StepModeParallel:
		// All approvers must have approved.
		stepSatisfied = approvedCount == total
	case StepModeAnyOf:
		// At least Quorum approvers must have approved.
		quorum := currentStepDef.Quorum
		if quorum <= 0 {
			quorum = 1
		}
		stepSatisfied = approvedCount >= quorum
		if stepSatisfied && pendingCount > 0 {
			// Skip the remaining pending steps since quorum is met.
			skipQuery := `UPDATE approval_steps SET decision = $1 WHERE chain_id = $2 AND step_order = $3 AND decision = $4`
			_, err = s.pool.Exec(ctx, skipQuery, DecisionSkipped, chainID, currentStepOrder, DecisionPending)
			if err != nil {
				return apperrors.Internal("failed to skip remaining steps after quorum", err)
			}
		}
	default:
		// Default to requiring all.
		stepSatisfied = approvedCount == total
	}

	if !stepSatisfied {
		return nil // Not yet ready to advance.
	}

	// Find the next step order.
	var nextStepDef *WorkflowStepDef
	for i := range wfDef.Steps {
		if wfDef.Steps[i].StepOrder > currentStepOrder {
			nextStepDef = &wfDef.Steps[i]
			break
		}
	}

	if nextStepDef == nil {
		// No more steps — approve the chain.
		chainUpdate := `UPDATE approval_chains SET status = $1, completed_at = $2 WHERE id = $3`
		_, err = s.pool.Exec(ctx, chainUpdate, ChainStatusApproved, now, chainID)
		if err != nil {
			return apperrors.Internal("failed to approve chain", err)
		}
		return nil
	}

	// Create the next set of steps and advance current_step.
	_, err = s.createStepsForOrder(ctx, chainID, *nextStepDef, now)
	if err != nil {
		return err
	}

	advanceQuery := `UPDATE approval_chains SET current_step = $1 WHERE id = $2`
	_, err = s.pool.Exec(ctx, advanceQuery, nextStepDef.StepOrder, chainID)
	if err != nil {
		return apperrors.Internal("failed to advance chain step", err)
	}

	return nil
}

// ──────────────────────────────────────────────
// Delegation
// ──────────────────────────────────────────────

// DelegateStep delegates the current user's approval step to another user.
func (s *Service) DelegateStep(ctx context.Context, tenantID, userID uuid.UUID, stepID uuid.UUID, req DelegateApprovalRequest) error {
	if req.ToUserID == uuid.Nil {
		return apperrors.BadRequest("Delegate user ID is required")
	}
	if req.ToUserID == userID {
		return apperrors.BadRequest("Cannot delegate to yourself")
	}

	// Load the step and verify ownership and delegation permission.
	stepQuery := `
		SELECT s.id, s.chain_id, s.step_order, s.approver_id, s.decision, s.deadline,
			c.tenant_id, c.status
		FROM approval_steps s
		JOIN approval_chains c ON c.id = s.chain_id
		WHERE s.id = $1`

	var (
		sID, sChainID, sApproverID uuid.UUID
		sStepOrder                 int
		sDecision, cStatus         string
		sDeadline                  *time.Time
		cTenantID                  uuid.UUID
	)
	err := s.pool.QueryRow(ctx, stepQuery, stepID).Scan(
		&sID, &sChainID, &sStepOrder, &sApproverID, &sDecision, &sDeadline,
		&cTenantID, &cStatus,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("ApprovalStep", stepID.String())
		}
		return apperrors.Internal("failed to load approval step for delegation", err)
	}

	if cTenantID != tenantID {
		return apperrors.NotFound("ApprovalStep", stepID.String())
	}
	if sApproverID != userID {
		return apperrors.Forbidden("You are not the assigned approver for this step")
	}
	if sDecision != DecisionPending {
		return apperrors.BadRequest("Cannot delegate a step that has already been decided")
	}
	if cStatus != ChainStatusInProgress {
		return apperrors.BadRequest("Cannot delegate on a chain that is not in progress")
	}

	now := time.Now().UTC()

	// Mark the original step as skipped.
	skipQuery := `UPDATE approval_steps SET decision = $1, comments = $2, decided_at = $3 WHERE id = $4`
	delegatedComment := "Delegated to another approver"
	_, err = s.pool.Exec(ctx, skipQuery, DecisionSkipped, &delegatedComment, now, stepID)
	if err != nil {
		return apperrors.Internal("failed to skip delegated step", err)
	}

	// Create a new step for the delegate.
	newStepID := uuid.New()
	createQuery := `
		INSERT INTO approval_steps (
			id, chain_id, step_order, approver_id, decision,
			delegated_from, deadline, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err = s.pool.Exec(ctx, createQuery,
		newStepID, sChainID, sStepOrder, req.ToUserID, DecisionPending,
		&userID, sDeadline, now,
	)
	if err != nil {
		return apperrors.Internal("failed to create delegated step", err)
	}

	// Create a delegation log record.
	delegationID := uuid.New()
	delegationQuery := `
		INSERT INTO approval_delegations (
			id, tenant_id, from_user_id, to_user_id, step_id, chain_id, reason, delegated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err = s.pool.Exec(ctx, delegationQuery,
		delegationID, tenantID, userID, req.ToUserID, newStepID, sChainID, req.Reason, now,
	)
	if err != nil {
		return apperrors.Internal("failed to create delegation log", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"original_step_id": stepID,
		"new_step_id":      newStepID,
		"from_user":        userID,
		"to_user":          req.ToUserID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    userID,
		Action:     "delegate:approval_step",
		EntityType: "approval_step",
		EntityID:   newStepID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Cancel
// ──────────────────────────────────────────────

// CancelChain cancels an in-progress approval chain.
func (s *Service) CancelChain(ctx context.Context, tenantID, cancelledBy, chainID uuid.UUID) error {
	// Verify the chain exists and is in progress.
	var cStatus string
	var cTenantID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT status, tenant_id FROM approval_chains WHERE id = $1`, chainID,
	).Scan(&cStatus, &cTenantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("ApprovalChain", chainID.String())
		}
		return apperrors.Internal("failed to load chain for cancellation", err)
	}
	if cTenantID != tenantID {
		return apperrors.NotFound("ApprovalChain", chainID.String())
	}
	if cStatus != ChainStatusInProgress && cStatus != ChainStatusPending {
		return apperrors.BadRequest(fmt.Sprintf("Cannot cancel a chain with status '%s'", cStatus))
	}

	now := time.Now().UTC()

	// Update chain status.
	_, err = s.pool.Exec(ctx,
		`UPDATE approval_chains SET status = $1, completed_at = $2 WHERE id = $3`,
		ChainStatusCancelled, now, chainID,
	)
	if err != nil {
		return apperrors.Internal("failed to cancel chain", err)
	}

	// Skip all pending steps.
	_, err = s.pool.Exec(ctx,
		`UPDATE approval_steps SET decision = $1 WHERE chain_id = $2 AND decision = $3`,
		DecisionSkipped, chainID, DecisionPending,
	)
	if err != nil {
		return apperrors.Internal("failed to skip pending steps", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"status": ChainStatusCancelled,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    cancelledBy,
		Action:     "cancel:approval_chain",
		EntityType: "approval_chain",
		EntityID:   chainID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// My pending approvals
// ──────────────────────────────────────────────

// GetMyPendingApprovals returns pending approval items for the current user.
func (s *Service) GetMyPendingApprovals(ctx context.Context, tenantID, userID uuid.UUID, limit, offset int) ([]PendingApprovalItem, int64, error) {
	countQuery := `
		SELECT COUNT(*)
		FROM approval_steps s
		JOIN approval_chains c ON c.id = s.chain_id
		WHERE s.approver_id = $1 AND s.decision = 'pending'
			AND c.tenant_id = $2 AND c.status = 'in_progress'`

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, userID, tenantID).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count pending approvals", err)
	}

	dataQuery := `
		SELECT s.id AS step_id, c.id AS chain_id, c.entity_type, c.entity_id,
			s.step_order,
			COALESCE(
				(SELECT wd.steps FROM workflow_definitions wd WHERE wd.id = c.workflow_definition_id),
				'[]'::jsonb
			) AS wf_steps,
			c.urgency, s.deadline,
			COALESCE(u.display_name, u.email, c.created_by::text) AS requested_by,
			c.created_at, c.status
		FROM approval_steps s
		JOIN approval_chains c ON c.id = s.chain_id
		LEFT JOIN users u ON u.id = c.created_by
		WHERE s.approver_id = $1 AND s.decision = 'pending'
			AND c.tenant_id = $2 AND c.status = 'in_progress'
		ORDER BY
			CASE c.urgency
				WHEN 'critical' THEN 1
				WHEN 'high' THEN 2
				WHEN 'normal' THEN 3
				WHEN 'low' THEN 4
				ELSE 5
			END,
			s.deadline ASC NULLS LAST,
			c.created_at ASC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, userID, tenantID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query pending approvals", err)
	}
	defer rows.Close()

	var items []PendingApprovalItem
	for rows.Next() {
		var item PendingApprovalItem
		var wfStepsJSON []byte
		if err := rows.Scan(
			&item.StepID, &item.ChainID, &item.EntityType, &item.EntityID,
			&item.StepOrder, &wfStepsJSON,
			&item.Urgency, &item.Deadline,
			&item.RequestedBy, &item.RequestedAt, &item.ChainStatus,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan pending approval", err)
		}

		// Extract step name from the workflow definition steps JSON.
		item.StepName = fmt.Sprintf("Step %d", item.StepOrder)
		if wfStepsJSON != nil {
			var wfSteps []WorkflowStepDef
			if err := json.Unmarshal(wfStepsJSON, &wfSteps); err == nil {
				for _, ws := range wfSteps {
					if ws.StepOrder == item.StepOrder {
						item.StepName = ws.Name
						break
					}
				}
			}
		}

		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate pending approvals", err)
	}

	if items == nil {
		items = []PendingApprovalItem{}
	}

	return items, total, nil
}

// CountMyPendingApprovals returns the count of pending approval items for badge display.
func (s *Service) CountMyPendingApprovals(ctx context.Context, tenantID, userID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM approval_steps s
		JOIN approval_chains c ON c.id = s.chain_id
		WHERE s.approver_id = $1 AND s.decision = 'pending'
			AND c.tenant_id = $2 AND c.status = 'in_progress'`

	var count int
	if err := s.pool.QueryRow(ctx, query, userID, tenantID).Scan(&count); err != nil {
		return 0, apperrors.Internal("failed to count pending approvals", err)
	}

	return count, nil
}

// ──────────────────────────────────────────────
// History
// ──────────────────────────────────────────────

// GetApprovalHistory returns a paginated list of approval chains for the given entity type.
func (s *Service) GetApprovalHistory(ctx context.Context, tenantID uuid.UUID, entityType string, limit, offset int) ([]ApprovalHistoryItem, int64, error) {
	var conditions []string
	var args []any
	argIdx := 0
	nextArg := func() string { argIdx++; return fmt.Sprintf("$%d", argIdx) }

	conditions = append(conditions, fmt.Sprintf("c.tenant_id = %s", nextArg()))
	args = append(args, tenantID)

	if entityType != "" {
		conditions = append(conditions, fmt.Sprintf("c.entity_type = %s", nextArg()))
		args = append(args, entityType)
	}

	whereClause := ""
	for i, cond := range conditions {
		if i == 0 {
			whereClause = "WHERE " + cond
		} else {
			whereClause += " AND " + cond
		}
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM approval_chains c %s`, whereClause)
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count approval history", err)
	}

	// Add limit/offset args.
	limitArg := nextArg()
	args = append(args, limit)
	offsetArg := nextArg()
	args = append(args, offset)

	dataQuery := fmt.Sprintf(`
		SELECT c.id, c.entity_type, c.entity_id, c.status, c.current_step,
			(SELECT COUNT(*) FROM approval_steps s WHERE s.chain_id = c.id) AS total_steps,
			c.urgency,
			COALESCE(u.display_name, u.email, c.created_by::text) AS created_by_name,
			c.created_at, c.completed_at
		FROM approval_chains c
		LEFT JOIN users u ON u.id = c.created_by
		%s
		ORDER BY c.created_at DESC
		LIMIT %s OFFSET %s`, whereClause, limitArg, offsetArg)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query approval history", err)
	}
	defer rows.Close()

	var items []ApprovalHistoryItem
	for rows.Next() {
		var item ApprovalHistoryItem
		if err := rows.Scan(
			&item.ChainID, &item.EntityType, &item.EntityID, &item.Status,
			&item.CurrentStep, &item.TotalSteps, &item.Urgency,
			&item.CreatedBy, &item.CreatedAt, &item.CompletedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan approval history item", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate approval history", err)
	}

	if items == nil {
		items = []ApprovalHistoryItem{}
	}

	return items, total, nil
}
