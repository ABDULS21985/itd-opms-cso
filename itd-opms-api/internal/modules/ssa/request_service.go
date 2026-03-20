package ssa

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Column constants
// ──────────────────────────────────────────────

const requestColumns = `
	id, tenant_id, reference_no, requestor_id, requestor_name,
	requestor_staff_id, requestor_email, requestor_status, division_office,
	status, extension, app_name, db_name, operating_system, server_type,
	vcpu_count, memory_gb, disk_count, space_gb, vlan_zone,
	special_requirements, justification,
	present_space_allocated_gb, present_space_in_use_gb,
	revision_count, rejected_stage,
	submitted_at, completed_at, created_at, updated_at`

const serviceImpactColumns = `
	id, request_id, risk_category, risk_description, mitigation_measures,
	severity, sequence_order, created_at, updated_at`

// ──────────────────────────────────────────────
// RequestService
// ──────────────────────────────────────────────

// RequestService handles business logic for SSA request CRUD and lifecycle.
type RequestService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewRequestService creates a new RequestService.
func NewRequestService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *RequestService {
	return &RequestService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// scanRequest scans a single row into an SSARequest struct.
func scanRequest(row pgx.Row) (SSARequest, error) {
	var r SSARequest
	err := row.Scan(
		&r.ID, &r.TenantID, &r.ReferenceNo, &r.RequestorID, &r.RequestorName,
		&r.RequestorStaffID, &r.RequestorEmail, &r.RequestorStatus, &r.DivisionOffice,
		&r.Status, &r.Extension, &r.AppName, &r.DBName, &r.OperatingSystem, &r.ServerType,
		&r.VCPUCount, &r.MemoryGB, &r.DiskCount, &r.SpaceGB, &r.VLANZone,
		&r.SpecialRequirements, &r.Justification,
		&r.PresentSpaceAllocated, &r.PresentSpaceInUse,
		&r.RevisionCount, &r.RejectedStage,
		&r.SubmittedAt, &r.CompletedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

// scanRequests scans multiple rows into a slice of SSARequest.
func scanRequests(rows pgx.Rows) ([]SSARequest, error) {
	var requests []SSARequest
	for rows.Next() {
		var r SSARequest
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.ReferenceNo, &r.RequestorID, &r.RequestorName,
			&r.RequestorStaffID, &r.RequestorEmail, &r.RequestorStatus, &r.DivisionOffice,
			&r.Status, &r.Extension, &r.AppName, &r.DBName, &r.OperatingSystem, &r.ServerType,
			&r.VCPUCount, &r.MemoryGB, &r.DiskCount, &r.SpaceGB, &r.VLANZone,
			&r.SpecialRequirements, &r.Justification,
			&r.PresentSpaceAllocated, &r.PresentSpaceInUse,
			&r.RevisionCount, &r.RejectedStage,
			&r.SubmittedAt, &r.CompletedAt, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if requests == nil {
		requests = []SSARequest{}
	}
	return requests, nil
}

// scanServiceImpact scans a single row into a ServiceImpact struct.
func scanServiceImpact(row pgx.Row) (ServiceImpact, error) {
	var si ServiceImpact
	err := row.Scan(
		&si.ID, &si.RequestID, &si.RiskCategory, &si.RiskDescription, &si.MitigationMeasures,
		&si.Severity, &si.SequenceOrder, &si.CreatedAt, &si.UpdatedAt,
	)
	return si, err
}

// scanServiceImpacts scans multiple rows into a slice of ServiceImpact.
func scanServiceImpacts(rows pgx.Rows) ([]ServiceImpact, error) {
	var impacts []ServiceImpact
	for rows.Next() {
		var si ServiceImpact
		if err := rows.Scan(
			&si.ID, &si.RequestID, &si.RiskCategory, &si.RiskDescription, &si.MitigationMeasures,
			&si.Severity, &si.SequenceOrder, &si.CreatedAt, &si.UpdatedAt,
		); err != nil {
			return nil, err
		}
		impacts = append(impacts, si)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if impacts == nil {
		impacts = []ServiceImpact{}
	}
	return impacts, nil
}

// ──────────────────────────────────────────────
// CreateRequest
// ──────────────────────────────────────────────

// CreateRequest creates a new SSA request in DRAFT status.
func (s *RequestService) CreateRequest(ctx context.Context, req CreateRequestDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Generate the next reference number via database function.
	var referenceNo string
	err := s.pool.QueryRow(ctx, `SELECT fn_ssa_next_reference()`).Scan(&referenceNo)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to generate reference number", err)
	}

	query := `
		INSERT INTO ssa_requests (
			id, tenant_id, reference_no, requestor_id, requestor_name,
			requestor_staff_id, requestor_email, requestor_status, division_office,
			status, extension, app_name, db_name, operating_system, server_type,
			vcpu_count, memory_gb, disk_count, space_gb, vlan_zone,
			special_requirements, justification,
			present_space_allocated_gb, present_space_in_use_gb,
			revision_count, rejected_stage,
			submitted_at, completed_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20,
			$21, $22,
			$23, $24,
			0, NULL,
			NULL, NULL, $25, $26
		)
		RETURNING ` + requestColumns

	request, err := scanRequest(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, referenceNo, auth.UserID, auth.DisplayName,
		"", auth.Email, req.RequestorStatus, req.DivisionOffice,
		StatusDraft, req.Extension, req.AppName, req.DBName, req.OperatingSystem, req.ServerType,
		req.VCPUCount, req.MemoryGB, req.DiskCount, req.SpaceGB, req.VLANZone,
		req.SpecialRequirements, req.Justification,
		req.PresentSpaceAllocated, req.PresentSpaceInUse,
		now, now,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to create ssa request", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"reference_no": referenceNo,
		"app_name":     req.AppName,
		"server_type":  req.ServerType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:ssa_request",
		EntityType: "ssa_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return request, nil
}

// ──────────────────────────────────────────────
// GetRequest
// ──────────────────────────────────────────────

// GetRequest retrieves a single SSA request by ID.
func (s *RequestService) GetRequest(ctx context.Context, id uuid.UUID) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + requestColumns + ` FROM ssa_requests WHERE id = $1 AND tenant_id = $2`

	request, err := scanRequest(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return SSARequest{}, apperrors.NotFound("SSARequest", id.String())
		}
		return SSARequest{}, apperrors.Internal("failed to get ssa request", err)
	}

	return request, nil
}

// ──────────────────────────────────────────────
// GetRequestDetail
// ──────────────────────────────────────────────

// GetRequestDetail retrieves a full SSA request with all related entities.
func (s *RequestService) GetRequestDetail(ctx context.Context, id uuid.UUID) (RequestDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return RequestDetail{}, apperrors.Unauthorized("authentication required")
	}

	// Fetch the base request.
	query := `SELECT ` + requestColumns + ` FROM ssa_requests WHERE id = $1 AND tenant_id = $2`
	request, err := scanRequest(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return RequestDetail{}, apperrors.NotFound("SSARequest", id.String())
		}
		return RequestDetail{}, apperrors.Internal("failed to get ssa request", err)
	}

	detail := RequestDetail{SSARequest: request}

	// Fetch service impacts.
	siRows, err := s.pool.Query(ctx,
		`SELECT `+serviceImpactColumns+` FROM ssa_service_impacts WHERE request_id = $1 ORDER BY sequence_order ASC`,
		id,
	)
	if err != nil {
		return RequestDetail{}, apperrors.Internal("failed to list service impacts", err)
	}
	defer siRows.Close()

	impacts, err := scanServiceImpacts(siRows)
	if err != nil {
		return RequestDetail{}, apperrors.Internal("failed to scan service impacts", err)
	}
	detail.ServiceImpacts = impacts

	// Fetch approvals.
	approvalRows, err := s.pool.Query(ctx,
		`SELECT id, request_id, stage, approver_id, approver_name, approver_role,
			decision, remarks, decided_at, delegated_from_id, sla_target_at, sla_breached, created_at
		FROM ssa_approvals WHERE request_id = $1 ORDER BY created_at ASC`,
		id,
	)
	if err != nil {
		return RequestDetail{}, apperrors.Internal("failed to list approvals", err)
	}
	defer approvalRows.Close()

	var approvals []Approval
	for approvalRows.Next() {
		var a Approval
		if err := approvalRows.Scan(
			&a.ID, &a.RequestID, &a.Stage, &a.ApproverID, &a.ApproverName, &a.ApproverRole,
			&a.Decision, &a.Remarks, &a.DecidedAt, &a.DelegatedFromID, &a.SLATargetAt, &a.SLABreached, &a.CreatedAt,
		); err != nil {
			return RequestDetail{}, apperrors.Internal("failed to scan approval", err)
		}
		approvals = append(approvals, a)
	}
	if err := approvalRows.Err(); err != nil {
		return RequestDetail{}, apperrors.Internal("failed to iterate approvals", err)
	}
	if approvals == nil {
		approvals = []Approval{}
	}
	detail.Approvals = approvals

	// Fetch ASD assessment.
	var asd ASDAssessment
	err = s.pool.QueryRow(ctx,
		`SELECT id, request_id, assessor_id, assessment_outcome,
			os_compatibility_check, resource_adequacy_check, security_compliance_check, ha_feasibility_check,
			conditions, technical_notes, assessed_at
		FROM ssa_asd_assessments WHERE request_id = $1`,
		id,
	).Scan(
		&asd.ID, &asd.RequestID, &asd.AssessorID, &asd.AssessmentOutcome,
		&asd.OSCompatibilityCheck, &asd.ResourceAdequacyCheck, &asd.SecurityComplianceCheck, &asd.HAFeasibilityCheck,
		&asd.Conditions, &asd.TechnicalNotes, &asd.AssessedAt,
	)
	if err != nil && err != pgx.ErrNoRows {
		return RequestDetail{}, apperrors.Internal("failed to get asd assessment", err)
	}
	if err == nil {
		detail.ASDAssessment = &asd
	}

	// Fetch QCMD analysis.
	var qcmd QCMDAnalysis
	err = s.pool.QueryRow(ctx,
		`SELECT id, request_id, analyst_id, server_reference,
			available_storage_tb, space_requested_gb, storage_after_allocation_tb,
			justification_notes, analysed_at
		FROM ssa_qcmd_analyses WHERE request_id = $1`,
		id,
	).Scan(
		&qcmd.ID, &qcmd.RequestID, &qcmd.AnalystID, &qcmd.ServerReference,
		&qcmd.AvailableStorageTB, &qcmd.SpaceRequestedGB, &qcmd.StorageAfterAllocationTB,
		&qcmd.JustificationNotes, &qcmd.AnalysedAt,
	)
	if err != nil && err != pgx.ErrNoRows {
		return RequestDetail{}, apperrors.Internal("failed to get qcmd analysis", err)
	}
	if err == nil {
		detail.QCMDAnalysis = &qcmd
	}

	// Fetch SAN provisioning.
	var san SANProvisioning
	err = s.pool.QueryRow(ctx,
		`SELECT id, request_id, administrator_id, port, cu, ldev, lun, acp,
			size_allocated, hba_type, hba_driver_version, wwn_no, host_name,
			san_switch_no_port, san_switch_zone_name, remarks, provisioned_at
		FROM ssa_san_provisionings WHERE request_id = $1`,
		id,
	).Scan(
		&san.ID, &san.RequestID, &san.AdministratorID, &san.Port, &san.CU, &san.LDEV, &san.LUN, &san.ACP,
		&san.SizeAllocated, &san.HBAType, &san.HBADriverVersion, &san.WWNNo, &san.HostName,
		&san.SANSwitchNoPort, &san.SANSwitchZoneName, &san.Remarks, &san.ProvisionedAt,
	)
	if err != nil && err != pgx.ErrNoRows {
		return RequestDetail{}, apperrors.Internal("failed to get san provisioning", err)
	}
	if err == nil {
		detail.SANProvisioning = &san
	}

	// Fetch DCO server.
	var dco DCOServer
	err = s.pool.QueryRow(ctx,
		`SELECT id, request_id, creator_id, creator_name, creator_staff_id,
			server_name, ip_address, zone, created_server_at
		FROM ssa_dco_servers WHERE request_id = $1`,
		id,
	).Scan(
		&dco.ID, &dco.RequestID, &dco.CreatorID, &dco.CreatorName, &dco.CreatorStaffID,
		&dco.ServerName, &dco.IPAddress, &dco.Zone, &dco.CreatedServerAt,
	)
	if err != nil && err != pgx.ErrNoRows {
		return RequestDetail{}, apperrors.Internal("failed to get dco server", err)
	}
	if err == nil {
		detail.DCOServer = &dco
	}

	return detail, nil
}

// ──────────────────────────────────────────────
// ListRequests
// ──────────────────────────────────────────────

// ListRequests returns a filtered, paginated list of SSA requests.
func (s *RequestService) ListRequests(ctx context.Context, status *string, division *string, search *string, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	var (
		conditions []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	// Tenant isolation is always required.
	conditions = append(conditions, "tenant_id = "+nextArg())
	args = append(args, auth.TenantID)

	if status != nil {
		conditions = append(conditions, "status = "+nextArg())
		args = append(args, *status)
	}

	if division != nil {
		conditions = append(conditions, "division_office = "+nextArg())
		args = append(args, *division)
	}

	if search != nil && *search != "" {
		searchPattern := "%" + *search + "%"
		p := nextArg()
		conditions = append(conditions, "(reference_no ILIKE "+p+" OR app_name ILIKE "+p+")")
		args = append(args, searchPattern)
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count total matching records.
	countQuery := "SELECT COUNT(*) FROM ssa_requests " + whereClause
	var total int64
	err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count ssa requests", err)
	}

	// Fetch paginated results.
	dataQuery := fmt.Sprintf(
		`SELECT `+requestColumns+` FROM ssa_requests %s ORDER BY created_at DESC LIMIT %s OFFSET %s`,
		whereClause, nextArg(), nextArg(),
	)
	args = append(args, params.Limit, params.Offset())

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list ssa requests", err)
	}
	defer rows.Close()

	requests, err := scanRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan ssa requests", err)
	}

	return requests, total, nil
}

// ──────────────────────────────────────────────
// ListMyRequests
// ──────────────────────────────────────────────

// ListMyRequests returns paginated SSA requests submitted by the current user.
func (s *RequestService) ListMyRequests(ctx context.Context, params types.PaginationParams) ([]SSARequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM ssa_requests
		WHERE tenant_id = $1 AND requestor_id = $2`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, auth.UserID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count my ssa requests", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT ` + requestColumns + `
		FROM ssa_requests
		WHERE tenant_id = $1 AND requestor_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, auth.UserID, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list my ssa requests", err)
	}
	defer rows.Close()

	requests, err := scanRequests(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan my ssa requests", err)
	}

	return requests, total, nil
}

// ──────────────────────────────────────────────
// UpdateRequest
// ──────────────────────────────────────────────

// UpdateRequest updates a DRAFT SSA request using COALESCE partial update.
func (s *RequestService) UpdateRequest(ctx context.Context, id uuid.UUID, req UpdateRequestDTO) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	// Verify request exists and is in DRAFT status.
	existing, err := s.GetRequest(ctx, id)
	if err != nil {
		return SSARequest{}, err
	}

	if existing.Status != StatusDraft {
		return SSARequest{}, apperrors.BadRequest("only DRAFT requests can be updated")
	}

	if existing.RequestorID != auth.UserID {
		return SSARequest{}, apperrors.Forbidden("only the requestor can update this request")
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE ssa_requests SET
			division_office = COALESCE($1, division_office),
			requestor_status = COALESCE($2, requestor_status),
			extension = COALESCE($3, extension),
			app_name = COALESCE($4, app_name),
			db_name = COALESCE($5, db_name),
			operating_system = COALESCE($6, operating_system),
			server_type = COALESCE($7, server_type),
			vcpu_count = COALESCE($8, vcpu_count),
			memory_gb = COALESCE($9, memory_gb),
			disk_count = COALESCE($10, disk_count),
			space_gb = COALESCE($11, space_gb),
			vlan_zone = COALESCE($12, vlan_zone),
			special_requirements = COALESCE($13, special_requirements),
			justification = COALESCE($14, justification),
			present_space_allocated_gb = COALESCE($15, present_space_allocated_gb),
			present_space_in_use_gb = COALESCE($16, present_space_in_use_gb),
			updated_at = $17
		WHERE id = $18 AND tenant_id = $19
		RETURNING ` + requestColumns

	request, err := scanRequest(s.pool.QueryRow(ctx, updateQuery,
		req.DivisionOffice, req.RequestorStatus, req.Extension,
		req.AppName, req.DBName, req.OperatingSystem,
		req.ServerType, req.VCPUCount, req.MemoryGB,
		req.DiskCount, req.SpaceGB, req.VLANZone,
		req.SpecialRequirements, req.Justification,
		req.PresentSpaceAllocated, req.PresentSpaceInUse,
		now, id, auth.TenantID,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to update ssa request", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:ssa_request",
		EntityType: "ssa_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return request, nil
}

// ──────────────────────────────────────────────
// SubmitRequest
// ──────────────────────────────────────────────

// SubmitRequest transitions a DRAFT request to SUBMITTED status.
// Requires at least one service impact entry.
func (s *RequestService) SubmitRequest(ctx context.Context, id uuid.UUID) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	// Verify request exists and is in DRAFT status.
	existing, err := s.GetRequest(ctx, id)
	if err != nil {
		return SSARequest{}, err
	}

	if existing.Status != StatusDraft {
		return SSARequest{}, apperrors.BadRequest("only DRAFT requests can be submitted")
	}

	if existing.RequestorID != auth.UserID {
		return SSARequest{}, apperrors.Forbidden("only the requestor can submit this request")
	}

	// Verify at least one service impact exists.
	var impactCount int
	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM ssa_service_impacts WHERE request_id = $1`,
		id,
	).Scan(&impactCount)
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to count service impacts", err)
	}
	if impactCount == 0 {
		return SSARequest{}, apperrors.BadRequest("at least one service impact is required before submission")
	}

	now := time.Now().UTC()

	query := `
		UPDATE ssa_requests SET
			status = $1,
			submitted_at = $2,
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5
		RETURNING ` + requestColumns

	request, err := scanRequest(s.pool.QueryRow(ctx, query,
		StatusSubmitted, now, now, id, auth.TenantID,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to submit ssa request", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"from_status": StatusDraft,
		"to_status":   StatusSubmitted,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "submit:ssa_request",
		EntityType: "ssa_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return request, nil
}

// ──────────────────────────────────────────────
// CancelRequest
// ──────────────────────────────────────────────

// CancelRequest cancels a DRAFT or SUBMITTED request.
func (s *RequestService) CancelRequest(ctx context.Context, id uuid.UUID, reason *string) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	// Verify request exists and is in a cancellable status.
	existing, err := s.GetRequest(ctx, id)
	if err != nil {
		return SSARequest{}, err
	}

	if existing.Status != StatusDraft && existing.Status != StatusSubmitted {
		return SSARequest{}, apperrors.BadRequest("only DRAFT or SUBMITTED requests can be cancelled")
	}

	if existing.RequestorID != auth.UserID {
		return SSARequest{}, apperrors.Forbidden("only the requestor can cancel this request")
	}

	now := time.Now().UTC()

	query := `
		UPDATE ssa_requests SET
			status = $1,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4
		RETURNING ` + requestColumns

	request, err := scanRequest(s.pool.QueryRow(ctx, query,
		StatusCancelled, now, id, auth.TenantID,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to cancel ssa request", err)
	}

	// Audit log.
	auditChanges := map[string]any{
		"from_status": existing.Status,
		"to_status":   StatusCancelled,
	}
	if reason != nil && *reason != "" {
		auditChanges["reason"] = *reason
	}
	changes, _ := json.Marshal(auditChanges)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "cancel:ssa_request",
		EntityType: "ssa_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return request, nil
}

// ──────────────────────────────────────────────
// ReviseRequest
// ──────────────────────────────────────────────

// ReviseRequest transitions a REJECTED request back to DRAFT for revision.
func (s *RequestService) ReviseRequest(ctx context.Context, id uuid.UUID) (SSARequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SSARequest{}, apperrors.Unauthorized("authentication required")
	}

	// Verify request exists and is REJECTED.
	existing, err := s.GetRequest(ctx, id)
	if err != nil {
		return SSARequest{}, err
	}

	if existing.Status != StatusRejected {
		return SSARequest{}, apperrors.BadRequest("only REJECTED requests can be revised")
	}

	if existing.RequestorID != auth.UserID {
		return SSARequest{}, apperrors.Forbidden("only the requestor can revise this request")
	}

	now := time.Now().UTC()

	query := `
		UPDATE ssa_requests SET
			status = $1,
			revision_count = revision_count + 1,
			rejected_stage = NULL,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4
		RETURNING ` + requestColumns

	request, err := scanRequest(s.pool.QueryRow(ctx, query,
		StatusDraft, now, id, auth.TenantID,
	))
	if err != nil {
		return SSARequest{}, apperrors.Internal("failed to revise ssa request", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"from_status":    StatusRejected,
		"to_status":      StatusDraft,
		"revision_count": existing.RevisionCount + 1,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "revise:ssa_request",
		EntityType: "ssa_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return request, nil
}

// ──────────────────────────────────────────────
// GetRequestStats
// ──────────────────────────────────────────────

// GetRequestStats returns dashboard statistics for SSA requests.
func (s *RequestService) GetRequestStats(ctx context.Context) (RequestStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return RequestStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft,
			COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS submitted,
			COUNT(*) FILTER (WHERE status IN (
				'HOO_ENDORSED', 'ASD_ASSESSED', 'QCMD_ANALYSED',
				'APPR_DC_PENDING', 'APPR_SSO_PENDING', 'APPR_IMD_PENDING',
				'APPR_ASD_PENDING', 'APPR_SCAO_PENDING',
				'SAN_PROVISIONED'
			)) AS in_progress,
			COUNT(*) FILTER (WHERE status = 'FULLY_APPROVED') AS approved,
			COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
			COUNT(*) FILTER (WHERE status = 'DCO_CREATED') AS completed,
			COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
		FROM ssa_requests
		WHERE tenant_id = $1`

	var stats RequestStats
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&stats.Total, &stats.Draft, &stats.Submitted,
		&stats.InProgress, &stats.Approved, &stats.Rejected,
		&stats.Completed, &stats.Cancelled,
	)
	if err != nil {
		return RequestStats{}, apperrors.Internal("failed to get ssa request stats", err)
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// Service Impact CRUD
// ──────────────────────────────────────────────

// ListServiceImpacts returns all service impacts for a request, ordered by sequence_order.
func (s *RequestService) ListServiceImpacts(ctx context.Context, requestID uuid.UUID) ([]ServiceImpact, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify the request exists and belongs to this tenant.
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM ssa_requests WHERE id = $1 AND tenant_id = $2)`,
		requestID, auth.TenantID,
	).Scan(&exists)
	if err != nil {
		return nil, apperrors.Internal("failed to verify ssa request", err)
	}
	if !exists {
		return nil, apperrors.NotFound("SSARequest", requestID.String())
	}

	query := `SELECT ` + serviceImpactColumns + `
		FROM ssa_service_impacts
		WHERE request_id = $1
		ORDER BY sequence_order ASC`

	rows, err := s.pool.Query(ctx, query, requestID)
	if err != nil {
		return nil, apperrors.Internal("failed to list service impacts", err)
	}
	defer rows.Close()

	impacts, err := scanServiceImpacts(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan service impacts", err)
	}

	return impacts, nil
}

// CreateServiceImpact adds a new service impact entry to a DRAFT request.
func (s *RequestService) CreateServiceImpact(ctx context.Context, requestID uuid.UUID, req CreateServiceImpactDTO) (ServiceImpact, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ServiceImpact{}, apperrors.Unauthorized("authentication required")
	}

	// Verify request exists and is in DRAFT status.
	existing, err := s.GetRequest(ctx, requestID)
	if err != nil {
		return ServiceImpact{}, err
	}

	if existing.Status != StatusDraft {
		return ServiceImpact{}, apperrors.BadRequest("service impacts can only be added to DRAFT requests")
	}

	if existing.RequestorID != auth.UserID {
		return ServiceImpact{}, apperrors.Forbidden("only the requestor can add service impacts")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO ssa_service_impacts (
			id, tenant_id, request_id, risk_category, risk_description, mitigation_measures,
			severity, sequence_order, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING ` + serviceImpactColumns

	impact, err := scanServiceImpact(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, requestID, req.RiskCategory, req.RiskDescription, req.MitigationMeasures,
		req.Severity, req.SequenceOrder, now, now,
	))
	if err != nil {
		return ServiceImpact{}, apperrors.Internal("failed to create service impact", err)
	}

	return impact, nil
}

// UpdateServiceImpact updates an existing service impact entry.
func (s *RequestService) UpdateServiceImpact(ctx context.Context, id uuid.UUID, req CreateServiceImpactDTO) (ServiceImpact, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ServiceImpact{}, apperrors.Unauthorized("authentication required")
	}

	// Look up the impact and its parent request to verify DRAFT status and tenant ownership.
	var requestID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT si.request_id
		FROM ssa_service_impacts si
		JOIN ssa_requests sr ON sr.id = si.request_id
		WHERE si.id = $1 AND sr.tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&requestID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceImpact{}, apperrors.NotFound("ServiceImpact", id.String())
		}
		return ServiceImpact{}, apperrors.Internal("failed to verify service impact", err)
	}

	// Verify the parent request is DRAFT.
	existing, err := s.GetRequest(ctx, requestID)
	if err != nil {
		return ServiceImpact{}, err
	}
	if existing.Status != StatusDraft {
		return ServiceImpact{}, apperrors.BadRequest("service impacts can only be updated on DRAFT requests")
	}
	if existing.RequestorID != auth.UserID {
		return ServiceImpact{}, apperrors.Forbidden("only the requestor can update service impacts")
	}

	now := time.Now().UTC()

	query := `
		UPDATE ssa_service_impacts SET
			risk_category = $1,
			risk_description = $2,
			mitigation_measures = $3,
			severity = $4,
			sequence_order = $5,
			updated_at = $6
		WHERE id = $7
		RETURNING ` + serviceImpactColumns

	impact, err := scanServiceImpact(s.pool.QueryRow(ctx, query,
		req.RiskCategory, req.RiskDescription, req.MitigationMeasures,
		req.Severity, req.SequenceOrder, now, id,
	))
	if err != nil {
		return ServiceImpact{}, apperrors.Internal("failed to update service impact", err)
	}

	return impact, nil
}

// DeleteServiceImpact removes a service impact entry.
func (s *RequestService) DeleteServiceImpact(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Look up the impact and its parent request to verify tenant ownership.
	var requestID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT si.request_id
		FROM ssa_service_impacts si
		JOIN ssa_requests sr ON sr.id = si.request_id
		WHERE si.id = $1 AND sr.tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&requestID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("ServiceImpact", id.String())
		}
		return apperrors.Internal("failed to verify service impact", err)
	}

	// Verify the parent request is DRAFT.
	existing, err := s.GetRequest(ctx, requestID)
	if err != nil {
		return err
	}
	if existing.Status != StatusDraft {
		return apperrors.BadRequest("service impacts can only be deleted from DRAFT requests")
	}
	if existing.RequestorID != auth.UserID {
		return apperrors.Forbidden("only the requestor can delete service impacts")
	}

	result, err := s.pool.Exec(ctx, `DELETE FROM ssa_service_impacts WHERE id = $1`, id)
	if err != nil {
		return apperrors.Internal("failed to delete service impact", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ServiceImpact", id.String())
	}

	return nil
}
