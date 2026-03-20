package ssa

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// BulkService
// ──────────────────────────────────────────────

// BulkService handles batch operations on SSA requests.
type BulkService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	wfSvc    *WorkflowService
}

// NewBulkService creates a new BulkService.
func NewBulkService(pool *pgxpool.Pool, auditSvc *audit.AuditService, wfSvc *WorkflowService) *BulkService {
	return &BulkService{
		pool:     pool,
		auditSvc: auditSvc,
		wfSvc:    wfSvc,
	}
}

// ──────────────────────────────────────────────
// BulkApprove
// ──────────────────────────────────────────────

// BulkApprove approves multiple requests at the specified approval stage.
// Each request is processed independently; one failure does NOT abort the batch.
func (s *BulkService) BulkApprove(ctx context.Context, stage string, dto BulkApproveDTO) (BulkOperationSummary, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BulkOperationSummary{}, apperrors.Unauthorized("authentication required")
	}

	// Validate stage.
	if _, ok := approvalStageToNextStatus[stage]; !ok {
		return BulkOperationSummary{}, apperrors.BadRequest(fmt.Sprintf("invalid approval stage: %s", stage))
	}

	// Determine which request status corresponds to this approval stage.
	var expectedStatus string
	for status, s := range statusToApprovalStage {
		if s == stage {
			expectedStatus = status
			break
		}
	}
	if expectedStatus == "" {
		return BulkOperationSummary{}, apperrors.BadRequest(fmt.Sprintf("no request status maps to stage: %s", stage))
	}

	results := make([]BulkOperationResult, 0, len(dto.RequestIDs))
	succeeded := 0
	failed := 0

	for _, reqID := range dto.RequestIDs {
		err := s.approveSingle(ctx, auth, reqID, stage, expectedStatus, dto.Remarks)
		if err != nil {
			results = append(results, BulkOperationResult{
				RequestID: reqID,
				Success:   false,
				Error:     err.Error(),
			})
			failed++
		} else {
			results = append(results, BulkOperationResult{
				RequestID: reqID,
				Success:   true,
			})
			succeeded++
		}
	}

	summary := BulkOperationSummary{
		TotalRequested: len(dto.RequestIDs),
		Succeeded:      succeeded,
		Failed:         failed,
		Results:        results,
	}

	slog.InfoContext(ctx, "SSA bulk approve completed",
		"stage", stage,
		"total", summary.TotalRequested,
		"succeeded", succeeded,
		"failed", failed,
		"actor", auth.UserID.String(),
	)

	return summary, nil
}

// approveSingle approves one request within its own transaction.
func (s *BulkService) approveSingle(ctx context.Context, auth *types.AuthContext, requestID uuid.UUID, stage, expectedStatus string, remarks *string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.wfSvc.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return err
	}

	if req.Status != expectedStatus {
		return fmt.Errorf("request is in status %s, expected %s", req.Status, expectedStatus)
	}

	nextStatus := approvalStageToNextStatus[stage]

	// Check delegation.
	delegatedFromID, err := s.wfSvc.checkDelegation(ctx, auth.TenantID, auth.UserID, stage)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	slaTarget := s.wfSvc.calculateSLATarget(stage)
	slaBreached := now.After(slaTarget)

	// Transition state.
	if err := s.wfSvc.transitionState(ctx, tx, requestID, expectedStatus, nextStatus); err != nil {
		return err
	}

	// Insert approval record.
	approvalID := uuid.New()
	approvalQuery := `
		INSERT INTO ssa_approvals (
			id, tenant_id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id,
			sla_target_at, sla_breached, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`

	_, err = tx.Exec(ctx, approvalQuery,
		approvalID, auth.TenantID, requestID, stage, auth.UserID, auth.DisplayName, stage,
		DecisionApproved, remarks, now, delegatedFromID,
		slaTarget, slaBreached, now,
	)
	if err != nil {
		return fmt.Errorf("failed to insert approval record: %w", err)
	}

	// Log audit.
	fromState := expectedStatus
	metadata, _ := json.Marshal(map[string]any{
		"stage":          stage,
		"decision":       DecisionApproved,
		"bulk_operation": true,
		"delegated_from": delegatedFromID,
	})
	desc := fmt.Sprintf("Bulk approval stage %s: %s", stage, DecisionApproved)
	if err := s.wfSvc.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromState, &nextStatus, desc, metadata); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ──────────────────────────────────────────────
// BulkUpdateStatus
// ──────────────────────────────────────────────

// validBulkTransitions defines allowed manual status transitions for bulk operations.
var validBulkTransitions = map[string][]string{
	StatusRejected: {StatusDraft},     // Return rejected to draft for revision
	StatusDraft:    {StatusCancelled}, // Cancel draft requests
}

// BulkUpdateStatus transitions multiple requests from one status to another.
// Each request is processed independently; one failure does NOT abort the batch.
func (s *BulkService) BulkUpdateStatus(ctx context.Context, dto BulkStatusUpdateDTO) (BulkOperationSummary, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BulkOperationSummary{}, apperrors.Unauthorized("authentication required")
	}

	// Validate the transition is allowed.
	allowed, ok := validBulkTransitions[dto.FromStatus]
	if !ok {
		return BulkOperationSummary{}, apperrors.BadRequest(fmt.Sprintf("bulk transitions from status %s are not allowed", dto.FromStatus))
	}
	valid := false
	for _, s := range allowed {
		if s == dto.ToStatus {
			valid = true
			break
		}
	}
	if !valid {
		return BulkOperationSummary{}, apperrors.BadRequest(fmt.Sprintf("transition from %s to %s is not allowed", dto.FromStatus, dto.ToStatus))
	}

	results := make([]BulkOperationResult, 0, len(dto.RequestIDs))
	succeeded := 0
	failed := 0

	for _, reqID := range dto.RequestIDs {
		err := s.updateStatusSingle(ctx, auth, reqID, dto.FromStatus, dto.ToStatus, dto.Reason)
		if err != nil {
			results = append(results, BulkOperationResult{
				RequestID: reqID,
				Success:   false,
				Error:     err.Error(),
			})
			failed++
		} else {
			results = append(results, BulkOperationResult{
				RequestID: reqID,
				Success:   true,
			})
			succeeded++
		}
	}

	summary := BulkOperationSummary{
		TotalRequested: len(dto.RequestIDs),
		Succeeded:      succeeded,
		Failed:         failed,
		Results:        results,
	}

	slog.InfoContext(ctx, "SSA bulk status update completed",
		"from", dto.FromStatus,
		"to", dto.ToStatus,
		"total", summary.TotalRequested,
		"succeeded", succeeded,
		"failed", failed,
		"actor", auth.UserID.String(),
	)

	return summary, nil
}

// updateStatusSingle transitions one request within its own transaction.
func (s *BulkService) updateStatusSingle(ctx context.Context, auth *types.AuthContext, requestID uuid.UUID, fromStatus, toStatus string, reason *string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	req, err := s.wfSvc.getRequestForUpdate(ctx, tx, requestID, auth.TenantID)
	if err != nil {
		return err
	}

	if req.Status != fromStatus {
		return fmt.Errorf("request is in status %s, expected %s", req.Status, fromStatus)
	}

	// Transition state.
	if err := s.wfSvc.transitionState(ctx, tx, requestID, fromStatus, toStatus); err != nil {
		return err
	}

	// If returning to DRAFT, increment revision count and clear rejected_stage.
	if toStatus == StatusDraft {
		_, err := tx.Exec(ctx,
			`UPDATE ssa_requests SET revision_count = revision_count + 1, rejected_stage = NULL WHERE id = $1`,
			requestID,
		)
		if err != nil {
			return fmt.Errorf("failed to update revision count: %w", err)
		}
	}

	// Log audit.
	metadata, _ := json.Marshal(map[string]any{
		"bulk_operation": true,
		"reason":         reason,
	})
	desc := fmt.Sprintf("Bulk status update: %s → %s", fromStatus, toStatus)
	if err := s.wfSvc.logAudit(ctx, tx, auth.TenantID, requestID, auth.UserID, auth.DisplayName, EventStateChange, &fromStatus, &toStatus, desc, metadata); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ──────────────────────────────────────────────
// BulkExport
// ──────────────────────────────────────────────

// BulkExport retrieves full request details matching the given filters.
func (s *BulkService) BulkExport(ctx context.Context, filter BulkExportFilter) ([]ExportedRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Build dynamic WHERE clause.
	conditions := []string{"r.tenant_id = $1"}
	args := []any{auth.TenantID}
	argIdx := 2

	if filter.Status != nil && *filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("r.status = $%d", argIdx))
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.Division != nil && *filter.Division != "" {
		conditions = append(conditions, fmt.Sprintf("r.division_office ILIKE $%d", argIdx))
		args = append(args, "%"+*filter.Division+"%")
		argIdx++
	}
	if filter.FromDate != nil {
		conditions = append(conditions, fmt.Sprintf("r.created_at >= $%d", argIdx))
		args = append(args, *filter.FromDate)
		argIdx++
	}
	if filter.ToDate != nil {
		conditions = append(conditions, fmt.Sprintf("r.created_at <= $%d", argIdx))
		args = append(args, *filter.ToDate)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")
	query := fmt.Sprintf(`SELECT %s FROM ssa_requests r WHERE %s ORDER BY r.created_at DESC LIMIT 1000`, wfRequestColumns, where)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, apperrors.Internal("failed to query requests for export", err)
	}
	defer rows.Close()

	requests, err := scanWfRequests(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan requests for export", err)
	}

	if len(requests) == 0 {
		return []ExportedRequest{}, nil
	}

	// Collect all request IDs for batch child-record fetching.
	reqIDs := make([]uuid.UUID, len(requests))
	for i, r := range requests {
		reqIDs[i] = r.ID
	}

	// Batch-fetch child records.
	impactsMap, err := s.fetchServiceImpactsBatch(ctx, reqIDs)
	if err != nil {
		return nil, err
	}
	approvalsMap, err := s.fetchApprovalsBatch(ctx, reqIDs)
	if err != nil {
		return nil, err
	}
	asdMap, err := s.fetchASDAssessmentsBatch(ctx, reqIDs)
	if err != nil {
		return nil, err
	}
	qcmdMap, err := s.fetchQCMDAnalysesBatch(ctx, reqIDs)
	if err != nil {
		return nil, err
	}
	sanMap, err := s.fetchSANProvisioningsBatch(ctx, reqIDs)
	if err != nil {
		return nil, err
	}
	dcoMap, err := s.fetchDCOServersBatch(ctx, reqIDs)
	if err != nil {
		return nil, err
	}

	// Assemble exported requests.
	exported := make([]ExportedRequest, len(requests))
	for i, req := range requests {
		impacts := impactsMap[req.ID]
		if impacts == nil {
			impacts = []ServiceImpact{}
		}
		approvals := approvalsMap[req.ID]
		if approvals == nil {
			approvals = []Approval{}
		}

		exported[i] = ExportedRequest{
			SSARequest:      req,
			ServiceImpacts:  impacts,
			Approvals:       approvals,
			ASDAssessment:   asdMap[req.ID],
			QCMDAnalysis:    qcmdMap[req.ID],
			SANProvisioning: sanMap[req.ID],
			DCOServer:       dcoMap[req.ID],
		}
	}

	slog.InfoContext(ctx, "SSA bulk export completed",
		"count", len(exported),
		"actor", auth.UserID.String(),
	)

	return exported, nil
}

// ──────────────────────────────────────────────
// Batch child-record fetchers
// ──────────────────────────────────────────────

func (s *BulkService) fetchServiceImpactsBatch(ctx context.Context, reqIDs []uuid.UUID) (map[uuid.UUID][]ServiceImpact, error) {
	query := `SELECT id, request_id, risk_category, risk_description, mitigation_measures, severity, sequence_order, created_at, updated_at
		FROM ssa_service_impacts WHERE request_id = ANY($1) ORDER BY sequence_order ASC`
	rows, err := s.pool.Query(ctx, query, reqIDs)
	if err != nil {
		return nil, apperrors.Internal("failed to batch-fetch service impacts", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]ServiceImpact)
	for rows.Next() {
		var si ServiceImpact
		if err := rows.Scan(&si.ID, &si.RequestID, &si.RiskCategory, &si.RiskDescription, &si.MitigationMeasures, &si.Severity, &si.SequenceOrder, &si.CreatedAt, &si.UpdatedAt); err != nil {
			return nil, apperrors.Internal("failed to scan service impact", err)
		}
		result[si.RequestID] = append(result[si.RequestID], si)
	}
	return result, rows.Err()
}

func (s *BulkService) fetchApprovalsBatch(ctx context.Context, reqIDs []uuid.UUID) (map[uuid.UUID][]Approval, error) {
	query := `SELECT id, request_id, stage, approver_id, approver_name, approver_role,
		decision, remarks, decided_at, delegated_from_id, sla_target_at, sla_breached, created_at
		FROM ssa_approvals WHERE request_id = ANY($1) ORDER BY created_at ASC`
	rows, err := s.pool.Query(ctx, query, reqIDs)
	if err != nil {
		return nil, apperrors.Internal("failed to batch-fetch approvals", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]Approval)
	for rows.Next() {
		var a Approval
		if err := rows.Scan(
			&a.ID, &a.RequestID, &a.Stage, &a.ApproverID, &a.ApproverName, &a.ApproverRole,
			&a.Decision, &a.Remarks, &a.DecidedAt, &a.DelegatedFromID, &a.SLATargetAt, &a.SLABreached, &a.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan approval", err)
		}
		result[a.RequestID] = append(result[a.RequestID], a)
	}
	return result, rows.Err()
}

func (s *BulkService) fetchASDAssessmentsBatch(ctx context.Context, reqIDs []uuid.UUID) (map[uuid.UUID]*ASDAssessment, error) {
	query := `SELECT id, request_id, assessor_id, assessment_outcome,
		os_compatibility_check, resource_adequacy_check, security_compliance_check, ha_feasibility_check,
		conditions, technical_notes, assessed_at
		FROM ssa_asd_assessments WHERE request_id = ANY($1)`
	rows, err := s.pool.Query(ctx, query, reqIDs)
	if err != nil {
		return nil, apperrors.Internal("failed to batch-fetch ASD assessments", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*ASDAssessment)
	for rows.Next() {
		var a ASDAssessment
		if err := rows.Scan(
			&a.ID, &a.RequestID, &a.AssessorID, &a.AssessmentOutcome,
			&a.OSCompatibilityCheck, &a.ResourceAdequacyCheck, &a.SecurityComplianceCheck, &a.HAFeasibilityCheck,
			&a.Conditions, &a.TechnicalNotes, &a.AssessedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan ASD assessment", err)
		}
		result[a.RequestID] = &a
	}
	return result, rows.Err()
}

func (s *BulkService) fetchQCMDAnalysesBatch(ctx context.Context, reqIDs []uuid.UUID) (map[uuid.UUID]*QCMDAnalysis, error) {
	query := `SELECT id, request_id, analyst_id, server_reference,
		available_storage_tb, space_requested_gb, storage_after_allocation_tb,
		justification_notes, analysed_at
		FROM ssa_qcmd_analyses WHERE request_id = ANY($1)`
	rows, err := s.pool.Query(ctx, query, reqIDs)
	if err != nil {
		return nil, apperrors.Internal("failed to batch-fetch QCMD analyses", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*QCMDAnalysis)
	for rows.Next() {
		var q QCMDAnalysis
		if err := rows.Scan(
			&q.ID, &q.RequestID, &q.AnalystID, &q.ServerReference,
			&q.AvailableStorageTB, &q.SpaceRequestedGB, &q.StorageAfterAllocationTB,
			&q.JustificationNotes, &q.AnalysedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan QCMD analysis", err)
		}
		result[q.RequestID] = &q
	}
	return result, rows.Err()
}

func (s *BulkService) fetchSANProvisioningsBatch(ctx context.Context, reqIDs []uuid.UUID) (map[uuid.UUID]*SANProvisioning, error) {
	query := `SELECT id, request_id, administrator_id, port, cu, ldev, lun, acp,
		size_allocated, hba_type, hba_driver_version, wwn_no, host_name,
		san_switch_no_port, san_switch_zone_name, remarks, provisioned_at
		FROM ssa_san_provisionings WHERE request_id = ANY($1)`
	rows, err := s.pool.Query(ctx, query, reqIDs)
	if err != nil {
		return nil, apperrors.Internal("failed to batch-fetch SAN provisionings", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*SANProvisioning)
	for rows.Next() {
		var san SANProvisioning
		if err := rows.Scan(
			&san.ID, &san.RequestID, &san.AdministratorID, &san.Port, &san.CU,
			&san.LDEV, &san.LUN, &san.ACP, &san.SizeAllocated,
			&san.HBAType, &san.HBADriverVersion, &san.WWNNo, &san.HostName,
			&san.SANSwitchNoPort, &san.SANSwitchZoneName, &san.Remarks, &san.ProvisionedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan SAN provisioning", err)
		}
		result[san.RequestID] = &san
	}
	return result, rows.Err()
}

func (s *BulkService) fetchDCOServersBatch(ctx context.Context, reqIDs []uuid.UUID) (map[uuid.UUID]*DCOServer, error) {
	query := `SELECT id, request_id, creator_id, creator_name, creator_staff_id,
		server_name, ip_address, zone, created_server_at
		FROM ssa_dco_servers WHERE request_id = ANY($1)`
	rows, err := s.pool.Query(ctx, query, reqIDs)
	if err != nil {
		return nil, apperrors.Internal("failed to batch-fetch DCO servers", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*DCOServer)
	for rows.Next() {
		var d DCOServer
		if err := rows.Scan(
			&d.ID, &d.RequestID, &d.CreatorID, &d.CreatorName, &d.CreatorStaffID,
			&d.ServerName, &d.IPAddress, &d.Zone, &d.CreatedServerAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan DCO server", err)
		}
		result[d.RequestID] = &d
	}
	return result, rows.Err()
}
