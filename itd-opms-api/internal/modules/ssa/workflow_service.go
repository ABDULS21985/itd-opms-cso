package ssa

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
// WorkflowService
// ──────────────────────────────────────────────

// WorkflowService handles the SSA workflow state machine: endorsements,
// assessments, multi-tier approvals, SAN provisioning, and DCO server creation.
type WorkflowService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewWorkflowService creates a new WorkflowService.
func NewWorkflowService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *WorkflowService {
	return &WorkflowService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Column definitions and scan helpers
// ──────────────────────────────────────────────

const wfRequestColumns = `id, tenant_id, reference_no, requestor_id, requestor_name, requestor_staff_id, requestor_email, requestor_status, division_office, status, extension, app_name, db_name, operating_system, server_type, vcpu_count, memory_gb, disk_count, space_gb, vlan_zone, special_requirements, justification, present_space_allocated_gb, present_space_in_use_gb, revision_count, rejected_stage, submitted_at, completed_at, created_at, updated_at`

func scanWfRequest(row pgx.Row) (SSARequest, error) {
	var r SSARequest
	err := row.Scan(
		&r.ID, &r.TenantID, &r.ReferenceNo, &r.RequestorID, &r.RequestorName,
		&r.RequestorStaffID, &r.RequestorEmail, &r.RequestorStatus, &r.DivisionOffice,
		&r.Status, &r.Extension, &r.AppName, &r.DBName, &r.OperatingSystem,
		&r.ServerType, &r.VCPUCount, &r.MemoryGB, &r.DiskCount, &r.SpaceGB,
		&r.VLANZone, &r.SpecialRequirements, &r.Justification,
		&r.PresentSpaceAllocated, &r.PresentSpaceInUse, &r.RevisionCount,
		&r.RejectedStage, &r.SubmittedAt, &r.CompletedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

func scanWfRequests(rows pgx.Rows) ([]SSARequest, error) {
	var results []SSARequest
	for rows.Next() {
		var r SSARequest
		err := rows.Scan(
			&r.ID, &r.TenantID, &r.ReferenceNo, &r.RequestorID, &r.RequestorName,
			&r.RequestorStaffID, &r.RequestorEmail, &r.RequestorStatus, &r.DivisionOffice,
			&r.Status, &r.Extension, &r.AppName, &r.DBName, &r.OperatingSystem,
			&r.ServerType, &r.VCPUCount, &r.MemoryGB, &r.DiskCount, &r.SpaceGB,
			&r.VLANZone, &r.SpecialRequirements, &r.Justification,
			&r.PresentSpaceAllocated, &r.PresentSpaceInUse, &r.RevisionCount,
			&r.RejectedStage, &r.SubmittedAt, &r.CompletedAt, &r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []SSARequest{}
	}
	return results, nil
}

func scanApproval(row pgx.Row) (Approval, error) {
	var a Approval
	err := row.Scan(
		&a.ID, &a.RequestID, &a.Stage, &a.ApproverID, &a.ApproverName,
		&a.ApproverRole, &a.Decision, &a.Remarks, &a.DecidedAt,
		&a.DelegatedFromID, &a.SLATargetAt, &a.SLABreached, &a.CreatedAt,
	)
	return a, err
}

func scanApprovals(rows pgx.Rows) ([]Approval, error) {
	var results []Approval
	for rows.Next() {
		var a Approval
		err := rows.Scan(
			&a.ID, &a.RequestID, &a.Stage, &a.ApproverID, &a.ApproverName,
			&a.ApproverRole, &a.Decision, &a.Remarks, &a.DecidedAt,
			&a.DelegatedFromID, &a.SLATargetAt, &a.SLABreached, &a.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []Approval{}
	}
	return results, nil
}

func scanASDAssessment(row pgx.Row) (ASDAssessment, error) {
	var a ASDAssessment
	err := row.Scan(
		&a.ID, &a.RequestID, &a.AssessorID, &a.AssessmentOutcome,
		&a.OSCompatibilityCheck, &a.ResourceAdequacyCheck,
		&a.SecurityComplianceCheck, &a.HAFeasibilityCheck,
		&a.Conditions, &a.TechnicalNotes, &a.AssessedAt,
	)
	return a, err
}

func scanQCMDAnalysis(row pgx.Row) (QCMDAnalysis, error) {
	var q QCMDAnalysis
	err := row.Scan(
		&q.ID, &q.RequestID, &q.AnalystID, &q.ServerReference,
		&q.AvailableStorageTB, &q.SpaceRequestedGB, &q.StorageAfterAllocationTB,
		&q.JustificationNotes, &q.AnalysedAt,
	)
	return q, err
}

func scanSANProvisioning(row pgx.Row) (SANProvisioning, error) {
	var s SANProvisioning
	err := row.Scan(
		&s.ID, &s.RequestID, &s.AdministratorID, &s.Port, &s.CU,
		&s.LDEV, &s.LUN, &s.ACP, &s.SizeAllocated,
		&s.HBAType, &s.HBADriverVersion, &s.WWNNo, &s.HostName,
		&s.SANSwitchNoPort, &s.SANSwitchZoneName, &s.Remarks, &s.ProvisionedAt,
	)
	return s, err
}

func scanDCOServer(row pgx.Row) (DCOServer, error) {
	var d DCOServer
	err := row.Scan(
		&d.ID, &d.RequestID, &d.CreatorID, &d.CreatorName, &d.CreatorStaffID,
		&d.ServerName, &d.IPAddress, &d.Zone, &d.CreatedServerAt,
	)
	return d, err
}

func scanAuditLog(row pgx.Row) (SSAAuditLog, error) {
	var l SSAAuditLog
	err := row.Scan(
		&l.ID, &l.RequestID, &l.EventType, &l.FromState, &l.ToState,
		&l.ActorID, &l.ActorName, &l.Description, &l.MetadataJSON,
		&l.IPAddress, &l.OccurredAt,
	)
	return l, err
}

func scanAuditLogs(rows pgx.Rows) ([]SSAAuditLog, error) {
	var results []SSAAuditLog
	for rows.Next() {
		var l SSAAuditLog
		err := rows.Scan(
			&l.ID, &l.RequestID, &l.EventType, &l.FromState, &l.ToState,
			&l.ActorID, &l.ActorName, &l.Description, &l.MetadataJSON,
			&l.IPAddress, &l.OccurredAt,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []SSAAuditLog{}
	}
	return results, nil
}

// ──────────────────────────────────────────────
// Internal helper methods
// ──────────────────────────────────────────────

// getRequestForUpdate retrieves a request within a transaction using SELECT ... FOR UPDATE.
func (s *WorkflowService) getRequestForUpdate(ctx context.Context, tx pgx.Tx, id uuid.UUID, tenantID uuid.UUID) (SSARequest, error) {
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, wfRequestColumns)
	row := tx.QueryRow(ctx, query, id, tenantID)
	r, err := scanWfRequest(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return SSARequest{}, apperrors.NotFound("SSARequest", id.String())
		}
		return SSARequest{}, apperrors.Internal("failed to get request for update", err)
	}
	return r, nil
}

// transitionState updates the request status within a transaction.
// Returns an error if the current status does not match fromStatus.
func (s *WorkflowService) transitionState(ctx context.Context, tx pgx.Tx, requestID uuid.UUID, fromStatus, toStatus string) error {
	query := `UPDATE ssa_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3`
	tag, err := tx.Exec(ctx, query, toStatus, requestID, fromStatus)
	if err != nil {
		return apperrors.Internal("failed to transition request state", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.Conflict(fmt.Sprintf("request %s is not in expected status %s", requestID, fromStatus))
	}
	return nil
}

// logAudit inserts an entry into the ssa_audit_logs table within a transaction.
func (s *WorkflowService) logAudit(
	ctx context.Context,
	tx pgx.Tx,
	tenantID, requestID, actorID uuid.UUID,
	actorName, eventType string,
	fromState, toState *string,
	description string,
	metadata json.RawMessage,
) error {
	ipAddress := types.GetClientIP(ctx)

	query := `
		INSERT INTO ssa_audit_logs (
			tenant_id, request_id, event_type, from_state, to_state,
			actor_id, actor_name, description, metadata_json,
			ip_address, occurred_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
		RETURNING id, request_id, event_type, from_state, to_state,
			actor_id, actor_name, description, metadata_json,
			ip_address, occurred_at`

	entry, err := scanAuditLog(tx.QueryRow(ctx, query,
		tenantID, requestID, eventType, fromState, toState,
		actorID, actorName, description, metadata,
		&ipAddress,
	))
	if err != nil {
		return apperrors.Internal("failed to log SSA audit entry", err)
	}

	slog.DebugContext(ctx, "SSA audit entry logged",
		"tenant_id", tenantID.String(),
		"audit_id", entry.ID,
		"event_type", entry.EventType,
	)
	return nil
}

// calculateSLATarget returns a target time based on the SLA hours configured for the given stage.
// Simplified: adds hours directly (no business-hours calculation).
func (s *WorkflowService) calculateSLATarget(stage string) time.Time {
	hours, ok := slaHoursByStage[stage]
	if !ok {
		hours = 8 // default fallback
	}
	return time.Now().UTC().Add(time.Duration(hours) * time.Hour)
}

// checkDelegation checks if the given user is acting as a delegate for the specified stage.
// Returns the delegator_id if an active delegation is found, or nil otherwise.
func (s *WorkflowService) checkDelegation(ctx context.Context, tenantID, userID uuid.UUID, stage string) (*uuid.UUID, error) {
	query := `
		SELECT delegator_id FROM ssa_delegations
		WHERE tenant_id = $1
		  AND delegate_id = $2
		  AND stage = $3
		  AND is_active = true
		  AND effective_from <= NOW()
		  AND effective_to >= NOW()
		LIMIT 1`

	var delegatorID uuid.UUID
	err := s.pool.QueryRow(ctx, query, tenantID, userID, stage).Scan(&delegatorID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, apperrors.Internal("failed to check delegation", err)
	}
	return &delegatorID, nil
}

// ──────────────────────────────────────────────
// Core workflow methods
// ──────────────────────────────────────────────

// SubmitEndorsement processes the HOO endorsement decision (approve or reject).
func (s *WorkflowService) SubmitEndorsement(ctx context.Context, requestID uuid.UUID, dto EndorsementDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return SSARequest{}, err
	}

	if req.Status != StatusSubmitted {
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("request must be in %s status for endorsement, currently %s", StatusSubmitted, req.Status))
	}

	now := time.Now().UTC()
	slaTarget := s.calculateSLATarget(StageHOOEndorsement)
	slaBreached := now.After(slaTarget)

	var toStatus string
	var rejectedStage *string
	decision := dto.Decision

	switch decision {
	case DecisionApproved:
		toStatus = StatusHOOEndorsed
	case DecisionRejected:
		if dto.Remarks == nil || *dto.Remarks == "" {
			return SSARequest{}, apperrors.BadRequest("remarks are mandatory when rejecting")
		}
		toStatus = StatusRejected
		stage := StageHOOEndorsement
		rejectedStage = &stage
	default:
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("invalid decision: %s", decision))
	}

	// Transition state.
	if err := s.transitionState(ctx, tx, requestID, StatusSubmitted, toStatus); err != nil {
		return SSARequest{}, err
	}

	// Set rejected_stage if rejecting.
	if rejectedStage != nil {
		_, err := tx.Exec(ctx, `UPDATE ssa_requests SET rejected_stage = $1 WHERE id = $2`, *rejectedStage, requestID)
		if err != nil {
			return SSARequest{}, apperrors.Internal("failed to set rejected stage", err)
		}
	}

	// Insert approval record.
	approvalID := uuid.New()
	approvalQuery := `
		INSERT INTO ssa_approvals (
			id, tenant_id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id,
			sla_target_at, sla_breached, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id,
			sla_target_at, sla_breached, created_at`

	approval, err := scanApproval(tx.QueryRow(ctx, approvalQuery,
		approvalID, auth.TenantID, requestID, StageHOOEndorsement, auth.UserID, auth.DisplayName, "HOO",
		decision, dto.Remarks, now, nil,
		slaTarget, slaBreached, now,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert endorsement approval", err)
	}

	// Log audit.
	fromState := StatusSubmitted
	metadata, _ := json.Marshal(map[string]any{
		"decision": decision,
		"stage":    StageHOOEndorsement,
	})
	desc := fmt.Sprintf("HOO endorsement: %s", decision)
	if err := s.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState, &toStatus, desc, metadata); err != nil {
		return SSARequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SSARequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	slog.InfoContext(ctx, "SSA endorsement submitted",
		"request_id", requestID.String(),
		"approval_id", approval.ID.String(),
		"decision", decision,
		"actor", auth.UserID.String(),
	)

	// Re-read the updated request.
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests WHERE id = $1 AND tenant_id = $2`, wfRequestColumns)
	updated, err := scanWfRequest(s.pool.QueryRow(ctx, query, requestID, auth.TenantID))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to read updated request", err)
	}
	return updated, nil
}

// SubmitASDAssessment processes the ASD technical feasibility assessment.
func (s *WorkflowService) SubmitASDAssessment(ctx context.Context, requestID uuid.UUID, dto ASDAssessmentDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return SSARequest{}, err
	}

	if req.Status != StatusHOOEndorsed {
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("request must be in %s status for ASD assessment, currently %s", StatusHOOEndorsed, req.Status))
	}

	now := time.Now().UTC()
	assessmentID := uuid.New()

	// Insert ASD assessment record.
	assessmentQuery := `
		INSERT INTO ssa_asd_assessments (
			id, tenant_id, request_id, assessor_id, assessment_outcome,
			os_compatibility_check, resource_adequacy_check,
			security_compliance_check, ha_feasibility_check,
			conditions, technical_notes, assessed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, request_id, assessor_id, assessment_outcome,
			os_compatibility_check, resource_adequacy_check,
			security_compliance_check, ha_feasibility_check,
			conditions, technical_notes, assessed_at`

	assessment, err := scanASDAssessment(tx.QueryRow(ctx, assessmentQuery,
		assessmentID, auth.TenantID, requestID, auth.UserID, dto.AssessmentOutcome,
		dto.OSCompatibilityCheck, dto.ResourceAdequacyCheck,
		dto.SecurityComplianceCheck, dto.HAFeasibilityCheck,
		dto.Conditions, dto.TechnicalNotes, now,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert ASD assessment", err)
	}

	// Determine transition.
	var toStatus string
	var rejectedStage *string
	var approvalDecision string

	if dto.AssessmentOutcome == OutcomeNotFeasible {
		toStatus = StatusRejected
		stage := StageASDAssessment
		rejectedStage = &stage
		approvalDecision = DecisionRejected
	} else {
		toStatus = StatusASDAssessed
		approvalDecision = DecisionApproved
	}

	// Transition state.
	if err := s.transitionState(ctx, tx, requestID, StatusHOOEndorsed, toStatus); err != nil {
		return SSARequest{}, err
	}

	// Set rejected_stage if not feasible.
	if rejectedStage != nil {
		_, err := tx.Exec(ctx, `UPDATE ssa_requests SET rejected_stage = $1 WHERE id = $2`, *rejectedStage, requestID)
		if err != nil {
			return SSARequest{}, apperrors.Internal("failed to set rejected stage", err)
		}
	}

	// Insert approval record.
	slaTarget := s.calculateSLATarget(StageASDAssessment)
	slaBreached := now.After(slaTarget)
	approvalID := uuid.New()

	approvalQuery := `
		INSERT INTO ssa_approvals (
			id, tenant_id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id,
			sla_target_at, sla_breached, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`

	var remarks *string
	if dto.Conditions != nil {
		remarks = dto.Conditions
	}

	_, err = tx.Exec(ctx, approvalQuery,
		approvalID, auth.TenantID, requestID, StageASDAssessment, auth.UserID, auth.DisplayName, "ASD",
		approvalDecision, remarks, now, nil,
		slaTarget, slaBreached, now,
	)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert ASD assessment approval", err)
	}

	// Log audit.
	fromState := StatusHOOEndorsed
	metadata, _ := json.Marshal(map[string]any{
		"assessment_outcome": dto.AssessmentOutcome,
		"stage":              StageASDAssessment,
		"decision":           approvalDecision,
	})
	desc := fmt.Sprintf("ASD assessment: %s (%s)", dto.AssessmentOutcome, approvalDecision)
	if err := s.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState, &toStatus, desc, metadata); err != nil {
		return SSARequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SSARequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	slog.InfoContext(ctx, "SSA ASD assessment submitted",
		"request_id", requestID.String(),
		"assessment_id", assessment.ID.String(),
		"outcome", assessment.AssessmentOutcome,
		"actor", auth.UserID.String(),
	)

	// Re-read the updated request.
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests WHERE id = $1 AND tenant_id = $2`, wfRequestColumns)
	updated, err := scanWfRequest(s.pool.QueryRow(ctx, query, requestID, auth.TenantID))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to read updated request", err)
	}
	return updated, nil
}

// SubmitQCMDAnalysis processes the QCMD capacity analysis and auto-transitions to approval pending.
func (s *WorkflowService) SubmitQCMDAnalysis(ctx context.Context, requestID uuid.UUID, dto QCMDAnalysisDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return SSARequest{}, err
	}

	if req.Status != StatusASDAssessed {
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("request must be in %s status for QCMD analysis, currently %s", StatusASDAssessed, req.Status))
	}

	now := time.Now().UTC()
	analysisID := uuid.New()

	// Insert QCMD analysis record.
	analysisQuery := `
		INSERT INTO ssa_qcmd_analyses (
			id, tenant_id, request_id, analyst_id, server_reference,
			available_storage_tb, space_requested_gb, storage_after_allocation_tb,
			justification_notes, analysed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, request_id, analyst_id, server_reference,
			available_storage_tb, space_requested_gb, storage_after_allocation_tb,
			justification_notes, analysed_at`

	analysis, err := scanQCMDAnalysis(tx.QueryRow(ctx, analysisQuery,
		analysisID, auth.TenantID, requestID, auth.UserID, dto.ServerReference,
		dto.AvailableStorageTB, dto.SpaceRequestedGB, dto.StorageAfterAllocationTB,
		dto.JustificationNotes, now,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert QCMD analysis", err)
	}

	// First transition: ASD_ASSESSED -> QCMD_ANALYSED.
	if err := s.transitionState(ctx, tx, requestID, StatusASDAssessed, StatusQCMDAnalysed); err != nil {
		return SSARequest{}, err
	}

	// Insert approval record for QCMD stage.
	slaTarget := s.calculateSLATarget(StageQCMDAnalysis)
	slaBreached := now.After(slaTarget)
	approvalID := uuid.New()

	approvalQuery := `
		INSERT INTO ssa_approvals (
			id, tenant_id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id,
			sla_target_at, sla_breached, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`

	_, err = tx.Exec(ctx, approvalQuery,
		approvalID, auth.TenantID, requestID, StageQCMDAnalysis, auth.UserID, auth.DisplayName, "QCMD",
		DecisionApproved, dto.JustificationNotes, now, nil,
		slaTarget, slaBreached, now,
	)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert QCMD approval", err)
	}

	// Log audit for QCMD analysis completion.
	fromState1 := StatusASDAssessed
	toState1 := StatusQCMDAnalysed
	metadata1, _ := json.Marshal(map[string]any{
		"stage":            StageQCMDAnalysis,
		"server_reference": dto.ServerReference,
		"decision":         DecisionApproved,
	})
	desc1 := fmt.Sprintf("QCMD analysis completed: server %s", dto.ServerReference)
	if err := s.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState1, &toState1, desc1, metadata1); err != nil {
		return SSARequest{}, err
	}

	// Auto-transition: QCMD_ANALYSED -> APPR_DC_PENDING.
	if err := s.transitionState(ctx, tx, requestID, StatusQCMDAnalysed, StatusApprDCPending); err != nil {
		return SSARequest{}, err
	}

	// Log audit for auto-transition to APPR_DC_PENDING.
	fromState2 := StatusQCMDAnalysed
	toState2 := StatusApprDCPending
	metadata2, _ := json.Marshal(map[string]any{
		"auto_transition": true,
		"reason":          "QCMD analysis complete, advancing to DC approval",
	})
	desc2 := "Auto-transition to DC approval pending"
	if err := s.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState2, &toState2, desc2, metadata2); err != nil {
		return SSARequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SSARequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	slog.InfoContext(ctx, "SSA QCMD analysis submitted",
		"request_id", requestID.String(),
		"analysis_id", analysis.ID.String(),
		"server_reference", analysis.ServerReference,
		"actor", auth.UserID.String(),
	)

	// Re-read the updated request.
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests WHERE id = $1 AND tenant_id = $2`, wfRequestColumns)
	updated, err := scanWfRequest(s.pool.QueryRow(ctx, query, requestID, auth.TenantID))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to read updated request", err)
	}
	return updated, nil
}

// SubmitApproval processes a multi-tier approval decision (DC, SSO, IMD, ASD, SCAO).
func (s *WorkflowService) SubmitApproval(ctx context.Context, requestID uuid.UUID, dto ApprovalDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return SSARequest{}, err
	}

	// Determine the current approval stage from the request status.
	stage, ok := statusToApprovalStage[req.Status]
	if !ok {
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("request status %s is not in an approval-pending state", req.Status))
	}

	// Check delegation for this stage.
	delegatedFromID, err := s.checkDelegation(ctx, auth.TenantID, auth.UserID, stage)
	if err != nil {
		return SSARequest{}, err
	}

	now := time.Now().UTC()
	slaTarget := s.calculateSLATarget(stage)
	slaBreached := now.After(slaTarget)

	var toStatus string
	var rejectedStage *string
	decision := dto.Decision

	switch decision {
	case DecisionApproved:
		nextStatus, exists := approvalStageToNextStatus[stage]
		if !exists {
			return SSARequest{}, apperrors.Internal("no next status configured for stage", fmt.Errorf("stage=%s", stage))
		}
		toStatus = nextStatus
	case DecisionRejected:
		if dto.Remarks == nil || *dto.Remarks == "" {
			return SSARequest{}, apperrors.BadRequest("remarks are mandatory when rejecting")
		}
		toStatus = StatusRejected
		rejectedStage = &stage
	default:
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("invalid decision: %s", decision))
	}

	// Transition state.
	if err := s.transitionState(ctx, tx, requestID, req.Status, toStatus); err != nil {
		return SSARequest{}, err
	}

	// Set rejected_stage if rejecting.
	if rejectedStage != nil {
		_, err := tx.Exec(ctx, `UPDATE ssa_requests SET rejected_stage = $1 WHERE id = $2`, *rejectedStage, requestID)
		if err != nil {
			return SSARequest{}, apperrors.Internal("failed to set rejected stage", err)
		}
	}

	// Derive approver role from stage.
	approverRole := stage // e.g. "APPR_DC", "APPR_SSO", etc.

	// Insert approval record.
	approvalID := uuid.New()
	approvalQuery := `
		INSERT INTO ssa_approvals (
			id, tenant_id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id,
			sla_target_at, sla_breached, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`

	_, err = tx.Exec(ctx, approvalQuery,
		approvalID, auth.TenantID, requestID, stage, auth.UserID, auth.DisplayName, approverRole,
		decision, dto.Remarks, now, delegatedFromID,
		slaTarget, slaBreached, now,
	)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert approval record", err)
	}

	// Log audit.
	fromState := req.Status
	metadata, _ := json.Marshal(map[string]any{
		"stage":          stage,
		"decision":       decision,
		"delegated_from": delegatedFromID,
	})
	desc := fmt.Sprintf("Approval stage %s: %s", stage, decision)
	if err := s.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState, &toStatus, desc, metadata); err != nil {
		return SSARequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SSARequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	slog.InfoContext(ctx, "SSA approval submitted",
		"request_id", requestID.String(),
		"stage", stage,
		"decision", decision,
		"actor", auth.UserID.String(),
	)

	// Re-read the updated request.
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests WHERE id = $1 AND tenant_id = $2`, wfRequestColumns)
	updated, err := scanWfRequest(s.pool.QueryRow(ctx, query, requestID, auth.TenantID))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to read updated request", err)
	}
	return updated, nil
}

// SubmitSANProvisioning records SAN provisioning details for a fully-approved request.
func (s *WorkflowService) SubmitSANProvisioning(ctx context.Context, requestID uuid.UUID, dto SANProvisioningDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return SSARequest{}, err
	}

	if req.Status != StatusFullyApproved {
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("request must be in %s status for SAN provisioning, currently %s", StatusFullyApproved, req.Status))
	}

	now := time.Now().UTC()
	provisioningID := uuid.New()

	// Insert SAN provisioning record.
	provisioningQuery := `
		INSERT INTO ssa_san_provisionings (
			id, tenant_id, request_id, administrator_id, port, cu, ldev, lun, acp,
			size_allocated, hba_type, hba_driver_version, wwn_no, host_name,
			san_switch_no_port, san_switch_zone_name, remarks, provisioned_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING id, request_id, administrator_id, port, cu, ldev, lun, acp,
			size_allocated, hba_type, hba_driver_version, wwn_no, host_name,
			san_switch_no_port, san_switch_zone_name, remarks, provisioned_at`

	provisioning, err := scanSANProvisioning(tx.QueryRow(ctx, provisioningQuery,
		provisioningID, auth.TenantID, requestID, auth.UserID, dto.Port, dto.CU, dto.LDEV, dto.LUN, dto.ACP,
		dto.SizeAllocated, dto.HBAType, dto.HBADriverVersion, dto.WWNNo, dto.HostName,
		dto.SANSwitchNoPort, dto.SANSwitchZoneName, dto.Remarks, now,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert SAN provisioning", err)
	}

	// Transition state.
	if err := s.transitionState(ctx, tx, requestID, StatusFullyApproved, StatusSANProvisioned); err != nil {
		return SSARequest{}, err
	}

	// Log audit.
	fromState := StatusFullyApproved
	toState := StatusSANProvisioned
	metadata, _ := json.Marshal(map[string]any{
		"stage":          StageSANProvisioning,
		"port":           dto.Port,
		"ldev":           dto.LDEV,
		"size_allocated": dto.SizeAllocated,
	})
	desc := fmt.Sprintf("SAN provisioned: port=%s, LDEV=%s, size=%s", dto.Port, dto.LDEV, dto.SizeAllocated)
	if err := s.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState, &toState, desc, metadata); err != nil {
		return SSARequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SSARequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	slog.InfoContext(ctx, "SSA SAN provisioning submitted",
		"request_id", requestID.String(),
		"provisioning_id", provisioning.ID.String(),
		"port", provisioning.Port,
		"ldev", provisioning.LDEV,
		"actor", auth.UserID.String(),
	)

	// Re-read the updated request.
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests WHERE id = $1 AND tenant_id = $2`, wfRequestColumns)
	updated, err := scanWfRequest(s.pool.QueryRow(ctx, query, requestID, auth.TenantID))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to read updated request", err)
	}
	return updated, nil
}

// SubmitDCOServer records DCO server creation and marks the request as completed.
func (s *WorkflowService) SubmitDCOServer(ctx context.Context, requestID uuid.UUID, dto DCOServerDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return SSARequest{}, err
	}

	if req.Status != StatusSANProvisioned {
		return SSARequest{}, apperrors.BadRequest(fmt.Sprintf("request must be in %s status for DCO server creation, currently %s", StatusSANProvisioned, req.Status))
	}

	now := time.Now().UTC()
	serverID := uuid.New()

	// Insert DCO server record.
	serverQuery := `
		INSERT INTO ssa_dco_servers (
			id, tenant_id, request_id, creator_id, creator_name, creator_staff_id,
			server_name, ip_address, zone, created_server_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, request_id, creator_id, creator_name, creator_staff_id,
			server_name, ip_address, zone, created_server_at`

	dcoServer, err := scanDCOServer(tx.QueryRow(ctx, serverQuery,
		serverID, auth.TenantID, requestID, auth.UserID, auth.DisplayName, "",
		dto.ServerName, dto.IPAddress, dto.Zone, now,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to insert DCO server", err)
	}

	// Transition state.
	if err := s.transitionState(ctx, tx, requestID, StatusSANProvisioned, StatusDCOCreated); err != nil {
		return SSARequest{}, err
	}

	// Set completed_at.
	_, err = tx.Exec(ctx, `UPDATE ssa_requests SET completed_at = NOW() WHERE id = $1`, requestID)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to set completed_at", err)
	}

	// Log audit.
	fromState := StatusSANProvisioned
	toState := StatusDCOCreated
	metadata, _ := json.Marshal(map[string]any{
		"stage":       StageDCOServer,
		"server_name": dto.ServerName,
		"ip_address":  dto.IPAddress,
		"zone":        dto.Zone,
	})
	desc := fmt.Sprintf("DCO server created: %s (%s)", dto.ServerName, dto.IPAddress)
	if err := s.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState, &toState, desc, metadata); err != nil {
		return SSARequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SSARequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	slog.InfoContext(ctx, "SSA DCO server created",
		"request_id", requestID.String(),
		"dco_server_id", dcoServer.ID.String(),
		"server_name", dcoServer.ServerName,
		"ip_address", dcoServer.IPAddress,
		"actor", auth.UserID.String(),
	)

	// Re-read the updated request.
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests WHERE id = $1 AND tenant_id = $2`, wfRequestColumns)
	updated, err := scanWfRequest(s.pool.QueryRow(ctx, query, requestID, auth.TenantID))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to read updated request", err)
	}
	return updated, nil
}

// ──────────────────────────────────────────────
// Query methods
// ──────────────────────────────────────────────

// ListApprovals returns all approval records for a given request, ordered by created_at.
func (s *WorkflowService) ListApprovals(ctx context.Context, requestID uuid.UUID) ([]Approval, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id,
			sla_target_at, sla_breached, created_at
		FROM ssa_approvals
		WHERE request_id = $1
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, requestID)
	if err != nil {
		return nil, apperrors.Internal("failed to list approvals", err)
	}
	defer rows.Close()

	approvals, err := scanApprovals(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan approvals", err)
	}
	return approvals, nil
}

// ListAuditLog returns all audit log entries for a given request, ordered by occurred_at DESC.
func (s *WorkflowService) ListAuditLog(ctx context.Context, requestID uuid.UUID) ([]SSAAuditLog, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, request_id, event_type, from_state, to_state,
			actor_id, actor_name, description, metadata_json,
			ip_address, occurred_at
		FROM ssa_audit_logs
		WHERE request_id = $1
		ORDER BY occurred_at DESC`

	rows, err := s.pool.Query(ctx, query, requestID)
	if err != nil {
		return nil, apperrors.Internal("failed to list audit log", err)
	}
	defer rows.Close()

	logs, err := scanAuditLogs(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan audit logs", err)
	}
	return logs, nil
}

// ──────────────────────────────────────────────
// Queue methods
// ──────────────────────────────────────────────

// ListEndorsementQueue returns requests awaiting HOO endorsement (status=SUBMITTED).
func (s *WorkflowService) ListEndorsementQueue(ctx context.Context, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `SELECT COUNT(*) FROM ssa_requests WHERE tenant_id = $1 AND status = $2`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, StatusSubmitted).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count endorsement queue", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT %s FROM ssa_requests
		WHERE tenant_id = $1 AND status = $2
		ORDER BY submitted_at ASC
		LIMIT $3 OFFSET $4`, wfRequestColumns)

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, StatusSubmitted, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query endorsement queue", err)
	}
	defer rows.Close()

	requests, err := scanWfRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan endorsement queue", err)
	}
	return requests, total, nil
}

// ListASDQueue returns requests awaiting ASD assessment (status=HOO_ENDORSED).
func (s *WorkflowService) ListASDQueue(ctx context.Context, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `SELECT COUNT(*) FROM ssa_requests WHERE tenant_id = $1 AND status = $2`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, StatusHOOEndorsed).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count ASD queue", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT %s FROM ssa_requests
		WHERE tenant_id = $1 AND status = $2
		ORDER BY updated_at ASC
		LIMIT $3 OFFSET $4`, wfRequestColumns)

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, StatusHOOEndorsed, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query ASD queue", err)
	}
	defer rows.Close()

	requests, err := scanWfRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan ASD queue", err)
	}
	return requests, total, nil
}

// ListQCMDQueue returns requests awaiting QCMD analysis (status=ASD_ASSESSED).
func (s *WorkflowService) ListQCMDQueue(ctx context.Context, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `SELECT COUNT(*) FROM ssa_requests WHERE tenant_id = $1 AND status = $2`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, StatusASDAssessed).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count QCMD queue", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT %s FROM ssa_requests
		WHERE tenant_id = $1 AND status = $2
		ORDER BY updated_at ASC
		LIMIT $3 OFFSET $4`, wfRequestColumns)

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, StatusASDAssessed, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query QCMD queue", err)
	}
	defer rows.Close()

	requests, err := scanWfRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan QCMD queue", err)
	}
	return requests, total, nil
}

// ListApprovalQueue returns requests in approval-pending states, optionally filtered by a specific stage.
func (s *WorkflowService) ListApprovalQueue(ctx context.Context, stage *string, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build the status filter based on the optional stage parameter.
	var statusFilter []string
	if stage != nil && *stage != "" {
		// Map the requested stage back to its corresponding status.
		found := false
		for status, stg := range statusToApprovalStage {
			if stg == *stage {
				statusFilter = append(statusFilter, status)
				found = true
				break
			}
		}
		if !found {
			return nil, 0, apperrors.BadRequest(fmt.Sprintf("invalid approval stage: %s", *stage))
		}
	} else {
		// All approval-pending statuses.
		statusFilter = []string{
			StatusApprDCPending,
			StatusApprSSOPending,
			StatusApprIMDPending,
			StatusApprASDPending,
			StatusApprSCAOPending,
		}
	}

	countQuery := `SELECT COUNT(*) FROM ssa_requests WHERE tenant_id = $1 AND status = ANY($2)`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, statusFilter).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count approval queue", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT %s FROM ssa_requests
		WHERE tenant_id = $1 AND status = ANY($2)
		ORDER BY updated_at ASC
		LIMIT $3 OFFSET $4`, wfRequestColumns)

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, statusFilter, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query approval queue", err)
	}
	defer rows.Close()

	requests, err := scanWfRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan approval queue", err)
	}
	return requests, total, nil
}

// ListSANQueue returns requests awaiting SAN provisioning (status=FULLY_APPROVED).
func (s *WorkflowService) ListSANQueue(ctx context.Context, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `SELECT COUNT(*) FROM ssa_requests WHERE tenant_id = $1 AND status = $2`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, StatusFullyApproved).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count SAN queue", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT %s FROM ssa_requests
		WHERE tenant_id = $1 AND status = $2
		ORDER BY updated_at ASC
		LIMIT $3 OFFSET $4`, wfRequestColumns)

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, StatusFullyApproved, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query SAN queue", err)
	}
	defer rows.Close()

	requests, err := scanWfRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan SAN queue", err)
	}
	return requests, total, nil
}

// ListDCOQueue returns requests awaiting DCO server creation (status=SAN_PROVISIONED).
func (s *WorkflowService) ListDCOQueue(ctx context.Context, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `SELECT COUNT(*) FROM ssa_requests WHERE tenant_id = $1 AND status = $2`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, StatusSANProvisioned).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count DCO queue", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT %s FROM ssa_requests
		WHERE tenant_id = $1 AND status = $2
		ORDER BY updated_at ASC
		LIMIT $3 OFFSET $4`, wfRequestColumns)

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, StatusSANProvisioned, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to query DCO queue", err)
	}
	defer rows.Close()

	requests, err := scanWfRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan DCO queue", err)
	}
	return requests, total, nil
}
