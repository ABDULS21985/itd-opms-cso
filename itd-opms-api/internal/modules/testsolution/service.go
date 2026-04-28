package testsolution

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
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type Service struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	js       nats.JetStreamContext
}

func NewService(pool *pgxpool.Pool, auditSvc *audit.AuditService, js nats.JetStreamContext) *Service {
	return &Service{pool: pool, auditSvc: auditSvc, js: js}
}

func (s *Service) ListRuns(ctx context.Context, status, sourceType *string, releaseID *uuid.UUID, limit, offset int) ([]TestSolutionRun, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Forbidden("authentication required")
	}

	var total int64
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM test_solution_runs
		WHERE tenant_id = $1
		  AND ($2::text IS NULL OR status = $2)
		  AND ($3::text IS NULL OR source_type = $3)
		  AND ($4::uuid IS NULL OR release_id = $4)`,
		auth.TenantID, status, sourceType, releaseID,
	).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count test solution runs", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT tsr.id, tsr.tenant_id, tsr.run_number, tsr.title, tsr.description,
		       tsr.source_type, tsr.source_id, tsr.release_id, tsr.change_ticket_id,
		       tsr.status, tsr.required_test_types, tsr.authorized_test_types,
		       tsr.test_manager_id, tsr.test_lead_id, tsr.release_management_lead_id,
		       tsr.requirements, tsr.test_plan, tsr.readiness_checklist, tsr.evidence,
		       tsr.uat_signoff, tsr.overall_outcome, tsr.failure_reason,
		       tsr.created_by, tsr.created_at, tsr.updated_at,
		       tm.display_name, tl.display_name, rml.display_name, cb.display_name,
		       rel.release_number, ch.ticket_number
		FROM test_solution_runs tsr
		LEFT JOIN users tm ON tm.id = tsr.test_manager_id
		LEFT JOIN users tl ON tl.id = tsr.test_lead_id
		LEFT JOIN users rml ON rml.id = tsr.release_management_lead_id
		LEFT JOIN users cb ON cb.id = tsr.created_by
		LEFT JOIN releases rel ON rel.id = tsr.release_id
		LEFT JOIN tickets ch ON ch.id = tsr.change_ticket_id
		WHERE tsr.tenant_id = $1
		  AND ($2::text IS NULL OR tsr.status = $2)
		  AND ($3::text IS NULL OR tsr.source_type = $3)
		  AND ($4::uuid IS NULL OR tsr.release_id = $4)
		ORDER BY tsr.created_at DESC
		LIMIT $5 OFFSET $6`,
		auth.TenantID, status, sourceType, releaseID, limit, offset,
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list test solution runs", err)
	}
	defer rows.Close()

	runs := []TestSolutionRun{}
	for rows.Next() {
		run, err := scanRun(rows)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to scan test solution run", err)
		}
		runs = append(runs, run)
	}
	return runs, total, nil
}

func (s *Service) GetRun(ctx context.Context, id uuid.UUID) (*TestSolutionRunWithDetails, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	run, err := s.getRunInternal(ctx, id, auth.TenantID)
	if err != nil {
		return nil, err
	}
	cases, err := s.ListCases(ctx, id)
	if err != nil {
		return nil, err
	}
	signoffs, err := s.ListSignoffs(ctx, id)
	if err != nil {
		return nil, err
	}
	return &TestSolutionRunWithDetails{TestSolutionRun: *run, Cases: cases, Signoffs: signoffs}, nil
}

func (s *Service) CreateRun(ctx context.Context, req CreateTestSolutionRunRequest) (*TestSolutionRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	if err := ensureTestPlanningResponsibility(auth, "create test solution run"); err != nil {
		return nil, err
	}
	if strings.TrimSpace(req.Title) == "" {
		return nil, apperrors.BadRequest("title is required")
	}

	sourceType := req.SourceType
	if sourceType == "" {
		sourceType = "manual"
	}
	requiredTypes := req.RequiredTestTypes
	if len(requiredTypes) == 0 {
		requiredTypes = []string{"system", "integration", "stress_performance", "security", "data_conversion", "uat"}
	}
	authorizedTypes := req.AuthorizedTestTypes
	if authorizedTypes == nil {
		authorizedTypes = []string{}
	}
	requirements := defaultJSON(req.Requirements, `{}`)
	testPlan := defaultJSON(req.TestPlan, `{}`)

	run, err := scanRunBasic(s.pool.QueryRow(ctx, `
		INSERT INTO test_solution_runs (
			tenant_id, title, description, source_type, source_id, release_id, change_ticket_id,
			required_test_types, authorized_test_types, test_manager_id, test_lead_id,
			release_management_lead_id, requirements, test_plan, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, tenant_id, run_number, title, description, source_type, source_id,
		          release_id, change_ticket_id, status, required_test_types, authorized_test_types,
		          test_manager_id, test_lead_id, release_management_lead_id, requirements, test_plan,
		          readiness_checklist, evidence, uat_signoff, overall_outcome, failure_reason,
		          created_by, created_at, updated_at`,
		auth.TenantID, req.Title, req.Description, sourceType, req.SourceID, req.ReleaseID, req.ChangeTicketID,
		requiredTypes, authorizedTypes, req.TestManagerID, req.TestLeadID, req.ReleaseManagementLeadID,
		requirements, testPlan, auth.UserID,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to create test solution run", err)
	}

	s.logAudit(ctx, auth, "create:test_solution_run", run.ID, map[string]any{
		"runNumber":  run.RunNumber,
		"sourceType": sourceType,
		"status":     run.Status,
	})
	s.publishEvent("notify.test_solution.created", run.ID, auth, map[string]any{
		"runNumber": run.RunNumber,
		"title":     run.Title,
		"actionUrl": fmt.Sprintf("/dashboard/test-solutions/%s", run.ID),
	})
	return &run, nil
}

func (s *Service) UpdateRun(ctx context.Context, id uuid.UUID, req UpdateTestSolutionRunRequest) (*TestSolutionRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	if err := ensureTestSolutionResponsibility(auth, "update test solution run"); err != nil {
		return nil, err
	}

	run, err := scanRunBasic(s.pool.QueryRow(ctx, `
		UPDATE test_solution_runs SET
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			source_type = COALESCE($5, source_type),
			source_id = COALESCE($6, source_id),
			release_id = COALESCE($7, release_id),
			change_ticket_id = COALESCE($8, change_ticket_id),
			required_test_types = COALESCE($9, required_test_types),
			authorized_test_types = COALESCE($10, authorized_test_types),
			test_manager_id = COALESCE($11, test_manager_id),
			test_lead_id = COALESCE($12, test_lead_id),
			release_management_lead_id = COALESCE($13, release_management_lead_id),
			requirements = COALESCE($14, requirements),
			test_plan = COALESCE($15, test_plan),
			readiness_checklist = COALESCE($16, readiness_checklist),
			evidence = COALESCE($17, evidence),
			uat_signoff = COALESCE($18, uat_signoff),
			overall_outcome = COALESCE($19, overall_outcome),
			failure_reason = COALESCE($20, failure_reason),
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, run_number, title, description, source_type, source_id,
		          release_id, change_ticket_id, status, required_test_types, authorized_test_types,
		          test_manager_id, test_lead_id, release_management_lead_id, requirements, test_plan,
		          readiness_checklist, evidence, uat_signoff, overall_outcome, failure_reason,
		          created_by, created_at, updated_at`,
		id, auth.TenantID, req.Title, req.Description, req.SourceType, req.SourceID, req.ReleaseID,
		req.ChangeTicketID, nullableTextArray(req.RequiredTestTypes), nullableTextArray(req.AuthorizedTestTypes),
		req.TestManagerID, req.TestLeadID, req.ReleaseManagementLeadID, nullableJSON(req.Requirements),
		nullableJSON(req.TestPlan), nullableJSON(req.ReadinessChecklist), nullableJSON(req.Evidence),
		nullableJSON(req.UATSignoff), req.OverallOutcome, req.FailureReason,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("test_solution_run", id.String())
		}
		return nil, apperrors.Internal("failed to update test solution run", err)
	}
	s.logAudit(ctx, auth, "update:test_solution_run", id, map[string]any{"updated": true})
	return &run, nil
}

func (s *Service) TransitionRun(ctx context.Context, id uuid.UUID, req TransitionTestSolutionRunRequest) (*TestSolutionRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	if req.TargetStatus == "" {
		return nil, apperrors.BadRequest("targetStatus is required")
	}
	if err := ensureTransitionResponsibility(auth, req.TargetStatus); err != nil {
		return nil, err
	}

	var currentStatus string
	err := s.pool.QueryRow(ctx, `SELECT status FROM test_solution_runs WHERE id = $1 AND tenant_id = $2`, id, auth.TenantID).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("test_solution_run", id.String())
		}
		return nil, apperrors.Internal("failed to get test solution status", err)
	}
	if err := workflow.TestSolutionStateMachine.Validate(currentStatus, req.TargetStatus); err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}
	if req.TargetStatus == workflow.TestSolutionReleaseHandoff {
		ok, err := s.hasSignedUAT(ctx, id, auth.TenantID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, apperrors.BadRequest("UAT sign-off is required before handoff to Release and Deployment Management")
		}
	}
	if req.TargetStatus == workflow.TestSolutionBuildRework && (req.FailureReason == nil || strings.TrimSpace(*req.FailureReason) == "") {
		return nil, apperrors.BadRequest("failureReason is required when returning to Build/Configure")
	}

	outcome := req.Outcome
	if outcome == nil {
		switch req.TargetStatus {
		case workflow.TestSolutionReleaseHandoff:
			success := "successful"
			outcome = &success
		case workflow.TestSolutionBuildRework:
			failed := "failed"
			outcome = &failed
		case workflow.TestSolutionCancelled:
			cancelled := "cancelled"
			outcome = &cancelled
		}
	}

	run, err := scanRunBasic(s.pool.QueryRow(ctx, `
		UPDATE test_solution_runs SET
			status = $3,
			evidence = COALESCE($4, evidence),
			uat_signoff = COALESCE($5, uat_signoff),
			failure_reason = COALESCE($6, failure_reason),
			overall_outcome = COALESCE($7, overall_outcome),
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, run_number, title, description, source_type, source_id,
		          release_id, change_ticket_id, status, required_test_types, authorized_test_types,
		          test_manager_id, test_lead_id, release_management_lead_id, requirements, test_plan,
		          readiness_checklist, evidence, uat_signoff, overall_outcome, failure_reason,
		          created_by, created_at, updated_at`,
		id, auth.TenantID, req.TargetStatus, nullableJSON(req.Evidence), nullableJSON(req.UATSignoff),
		req.FailureReason, outcome,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to transition test solution run", err)
	}

	s.logAudit(ctx, auth, "transition:test_solution_run", id, map[string]any{
		"status":  map[string]string{"from": currentStatus, "to": req.TargetStatus},
		"comment": req.Comment,
	})
	s.publishEvent("notify.test_solution.transitioned", id, auth, map[string]any{
		"runNumber":  run.RunNumber,
		"title":      run.Title,
		"fromStatus": currentStatus,
		"toStatus":   req.TargetStatus,
		"comment":    req.Comment,
		"actionUrl":  fmt.Sprintf("/dashboard/test-solutions/%s", id),
	})
	if req.TargetStatus == workflow.TestSolutionReleaseHandoff {
		s.publishEvent("notify.test_solution.release_handoff", id, auth, map[string]any{
			"runNumber": run.RunNumber,
			"title":     run.Title,
			"releaseId": run.ReleaseID,
			"actionUrl": fmt.Sprintf("/dashboard/test-solutions/%s", id),
		})
	}
	return &run, nil
}

func (s *Service) GetStats(ctx context.Context) (*TestSolutionStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	rows, err := s.pool.Query(ctx, `SELECT status, COUNT(*) FROM test_solution_runs WHERE tenant_id = $1 GROUP BY status`, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get test solution stats", err)
	}
	defer rows.Close()

	stats := &TestSolutionStats{}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, apperrors.Internal("failed to scan test solution stats", err)
		}
		stats.Total += count
		switch status {
		case workflow.TestSolutionIntake:
			stats.Intake = count
		case workflow.TestSolutionPlanning:
			stats.Planning = count
		case workflow.TestSolutionAuthorized:
			stats.Authorized = count
		case workflow.TestSolutionReleaseHandoff:
			stats.ReleaseHandoff = count
		case workflow.TestSolutionBuildRework:
			stats.BuildRework = count
		case workflow.TestSolutionClosed:
			stats.Closed = count
		case workflow.TestSolutionCancelled:
			stats.Cancelled = count
		default:
			stats.InExecution += count
		}
	}
	return stats, nil
}

func (s *Service) CreateCase(ctx context.Context, runID uuid.UUID, req CreateTestSolutionCaseRequest) (*TestSolutionCase, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	if err := ensureTestExecutionResponsibility(auth, "create test case"); err != nil {
		return nil, err
	}
	if strings.TrimSpace(req.TestType) == "" || strings.TrimSpace(req.Title) == "" {
		return nil, apperrors.BadRequest("testType and title are required")
	}
	if err := s.ensureRunExists(ctx, runID, auth.TenantID); err != nil {
		return nil, err
	}
	status := req.Status
	if status == "" {
		status = "draft"
	}
	evidence := defaultJSON(req.Evidence, `{}`)

	c, err := scanCaseBasic(s.pool.QueryRow(ctx, `
		INSERT INTO test_solution_cases (tenant_id, run_id, test_type, title, script_reference, status, assigned_to, evidence)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, tenant_id, run_id, test_type, title, script_reference, status, assigned_to, evidence, started_at, completed_at, created_at, updated_at`,
		auth.TenantID, runID, req.TestType, req.Title, req.ScriptReference, status, req.AssignedTo, evidence,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to create test case", err)
	}
	s.logAudit(ctx, auth, "create:test_solution_case", c.ID, map[string]any{"runId": runID, "testType": c.TestType})
	return &c, nil
}

func (s *Service) ListCases(ctx context.Context, runID uuid.UUID) ([]TestSolutionCase, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	rows, err := s.pool.Query(ctx, `
		SELECT c.id, c.tenant_id, c.run_id, c.test_type, c.title, c.script_reference,
		       c.status, c.assigned_to, c.evidence, c.started_at, c.completed_at,
		       c.created_at, c.updated_at, u.display_name
		FROM test_solution_cases c
		LEFT JOIN users u ON u.id = c.assigned_to
		WHERE c.run_id = $1 AND c.tenant_id = $2
		ORDER BY c.test_type, c.created_at`,
		runID, auth.TenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list test cases", err)
	}
	defer rows.Close()
	cases := []TestSolutionCase{}
	for rows.Next() {
		c, err := scanCase(rows)
		if err != nil {
			return nil, apperrors.Internal("failed to scan test case", err)
		}
		cases = append(cases, c)
	}
	return cases, nil
}

func (s *Service) UpdateCase(ctx context.Context, runID, caseID uuid.UUID, req UpdateTestSolutionCaseRequest) (*TestSolutionCase, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	if err := ensureTestExecutionResponsibility(auth, "update test case"); err != nil {
		return nil, err
	}
	c, err := scanCaseBasic(s.pool.QueryRow(ctx, `
		UPDATE test_solution_cases SET
			title = COALESCE($4, title),
			script_reference = COALESCE($5, script_reference),
			status = COALESCE($6, status),
			assigned_to = COALESCE($7, assigned_to),
			evidence = COALESCE($8, evidence),
			started_at = CASE WHEN $6 = 'executing' THEN COALESCE(started_at, now()) ELSE started_at END,
			completed_at = CASE WHEN $6 IN ('passed', 'failed', 'blocked', 'skipped') THEN COALESCE(completed_at, now()) ELSE completed_at END,
			updated_at = now()
		WHERE id = $1 AND run_id = $2 AND tenant_id = $3
		RETURNING id, tenant_id, run_id, test_type, title, script_reference, status, assigned_to, evidence, started_at, completed_at, created_at, updated_at`,
		caseID, runID, auth.TenantID, req.Title, req.ScriptReference, req.Status, req.AssignedTo, nullableJSON(req.Evidence),
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("test_solution_case", caseID.String())
		}
		return nil, apperrors.Internal("failed to update test case", err)
	}
	s.logAudit(ctx, auth, "update:test_solution_case", caseID, map[string]any{"runId": runID, "status": c.Status})
	return &c, nil
}

func (s *Service) CreateSignoff(ctx context.Context, runID uuid.UUID, req CreateTestSolutionSignoffRequest) (*TestSolutionSignoff, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	if err := ensureTestPlanningResponsibility(auth, "request test sign-off"); err != nil {
		return nil, err
	}
	if req.SignerID == uuid.Nil || strings.TrimSpace(req.TestType) == "" || strings.TrimSpace(req.RoleName) == "" {
		return nil, apperrors.BadRequest("testType, signerId, and roleName are required")
	}
	if err := s.ensureRunExists(ctx, runID, auth.TenantID); err != nil {
		return nil, err
	}
	evidence := defaultJSON(req.Evidence, `{}`)

	signoff, err := scanSignoffBasic(s.pool.QueryRow(ctx, `
		INSERT INTO test_solution_signoffs (tenant_id, run_id, test_type, signer_id, role_name, comments, evidence)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, tenant_id, run_id, test_type, signer_id, role_name, status, comments, evidence, signed_at, created_at, updated_at`,
		auth.TenantID, runID, req.TestType, req.SignerID, req.RoleName, req.Comments, evidence,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to create test sign-off", err)
	}
	s.publishEvent("notify.test_solution.signoff_requested", runID, auth, map[string]any{
		"recipientId": req.SignerID.String(),
		"testType":    req.TestType,
		"actionUrl":   fmt.Sprintf("/dashboard/test-solutions/%s", runID),
	})
	return &signoff, nil
}

func (s *Service) ListSignoffs(ctx context.Context, runID uuid.UUID) ([]TestSolutionSignoff, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	rows, err := s.pool.Query(ctx, `
		SELECT so.id, so.tenant_id, so.run_id, so.test_type, so.signer_id, so.role_name,
		       so.status, so.comments, so.evidence, so.signed_at, so.created_at, so.updated_at,
		       u.display_name
		FROM test_solution_signoffs so
		LEFT JOIN users u ON u.id = so.signer_id
		WHERE so.run_id = $1 AND so.tenant_id = $2
		ORDER BY so.created_at`,
		runID, auth.TenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list test sign-offs", err)
	}
	defer rows.Close()
	signoffs := []TestSolutionSignoff{}
	for rows.Next() {
		signoff, err := scanSignoff(rows)
		if err != nil {
			return nil, apperrors.Internal("failed to scan test sign-off", err)
		}
		signoffs = append(signoffs, signoff)
	}
	return signoffs, nil
}

func (s *Service) DecideSignoff(ctx context.Context, runID, signoffID uuid.UUID, req DecideTestSolutionSignoffRequest) (*TestSolutionSignoff, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	if req.Status != "signed" && req.Status != "rejected" {
		return nil, apperrors.BadRequest("status must be signed or rejected")
	}
	var signerID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT signer_id FROM test_solution_signoffs
		WHERE id = $1 AND run_id = $2 AND tenant_id = $3`,
		signoffID, runID, auth.TenantID,
	).Scan(&signerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("test_solution_signoff", signoffID.String())
		}
		return nil, apperrors.Internal("failed to get test sign-off", err)
	}
	if !isTestSolutionPrivileged(auth) && !hasTestPlanningResponsibility(auth) && auth.UserID != signerID {
		return nil, apperrors.Forbidden("test sign-off decision requires the assigned signer, test manager, test management specialist, or release management lead role")
	}

	var signedAt any
	if req.Status == "signed" {
		signedAt = time.Now()
	}
	signoff, err := scanSignoffBasic(s.pool.QueryRow(ctx, `
		UPDATE test_solution_signoffs SET
			status = $4,
			comments = COALESCE($5, comments),
			evidence = COALESCE($6, evidence),
			signed_at = COALESCE($7, signed_at),
			updated_at = now()
		WHERE id = $1 AND run_id = $2 AND tenant_id = $3
		RETURNING id, tenant_id, run_id, test_type, signer_id, role_name, status, comments, evidence, signed_at, created_at, updated_at`,
		signoffID, runID, auth.TenantID, req.Status, req.Comments, nullableJSON(req.Evidence), signedAt,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to decide test sign-off", err)
	}
	s.logAudit(ctx, auth, "decide:test_solution_signoff", signoffID, map[string]any{
		"runId":    runID,
		"testType": signoff.TestType,
		"status":   req.Status,
	})
	return &signoff, nil
}

func (s *Service) getRunInternal(ctx context.Context, id, tenantID uuid.UUID) (*TestSolutionRun, error) {
	run, err := scanRun(s.pool.QueryRow(ctx, `
		SELECT tsr.id, tsr.tenant_id, tsr.run_number, tsr.title, tsr.description,
		       tsr.source_type, tsr.source_id, tsr.release_id, tsr.change_ticket_id,
		       tsr.status, tsr.required_test_types, tsr.authorized_test_types,
		       tsr.test_manager_id, tsr.test_lead_id, tsr.release_management_lead_id,
		       tsr.requirements, tsr.test_plan, tsr.readiness_checklist, tsr.evidence,
		       tsr.uat_signoff, tsr.overall_outcome, tsr.failure_reason,
		       tsr.created_by, tsr.created_at, tsr.updated_at,
		       tm.display_name, tl.display_name, rml.display_name, cb.display_name,
		       rel.release_number, ch.ticket_number
		FROM test_solution_runs tsr
		LEFT JOIN users tm ON tm.id = tsr.test_manager_id
		LEFT JOIN users tl ON tl.id = tsr.test_lead_id
		LEFT JOIN users rml ON rml.id = tsr.release_management_lead_id
		LEFT JOIN users cb ON cb.id = tsr.created_by
		LEFT JOIN releases rel ON rel.id = tsr.release_id
		LEFT JOIN tickets ch ON ch.id = tsr.change_ticket_id
		WHERE tsr.id = $1 AND tsr.tenant_id = $2`, id, tenantID,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("test_solution_run", id.String())
		}
		return nil, apperrors.Internal("failed to get test solution run", err)
	}
	return &run, nil
}

func (s *Service) ensureRunExists(ctx context.Context, id, tenantID uuid.UUID) error {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM test_solution_runs WHERE id = $1 AND tenant_id = $2)`, id, tenantID).Scan(&exists)
	if err != nil {
		return apperrors.Internal("failed to check test solution run", err)
	}
	if !exists {
		return apperrors.NotFound("test_solution_run", id.String())
	}
	return nil
}

func (s *Service) hasSignedUAT(ctx context.Context, id, tenantID uuid.UUID) (bool, error) {
	var ok bool
	err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM test_solution_signoffs
			WHERE run_id = $1 AND tenant_id = $2 AND test_type = 'uat' AND status = 'signed'
		)
		OR lower(coalesce((SELECT uat_signoff->>'status' FROM test_solution_runs WHERE id = $1 AND tenant_id = $2), '')) IN ('signed', 'approved')`,
		id, tenantID,
	).Scan(&ok)
	if err != nil {
		return false, apperrors.Internal("failed to check UAT sign-off", err)
	}
	return ok, nil
}

func scanRun(row pgx.Row) (TestSolutionRun, error) {
	run, err := scanRunBase(row, true)
	return run, err
}

func scanRunBasic(row pgx.Row) (TestSolutionRun, error) {
	run, err := scanRunBase(row, false)
	return run, err
}

func scanRunBase(row pgx.Row, enriched bool) (TestSolutionRun, error) {
	var r TestSolutionRun
	dest := []any{
		&r.ID, &r.TenantID, &r.RunNumber, &r.Title, &r.Description,
		&r.SourceType, &r.SourceID, &r.ReleaseID, &r.ChangeTicketID,
		&r.Status, &r.RequiredTestTypes, &r.AuthorizedTestTypes,
		&r.TestManagerID, &r.TestLeadID, &r.ReleaseManagementLeadID,
		&r.Requirements, &r.TestPlan, &r.ReadinessChecklist, &r.Evidence,
		&r.UATSignoff, &r.OverallOutcome, &r.FailureReason,
		&r.CreatedBy, &r.CreatedAt, &r.UpdatedAt,
	}
	if enriched {
		dest = append(dest, &r.TestManagerName, &r.TestLeadName, &r.ReleaseManagementLeadName, &r.CreatedByName, &r.ReleaseNumber, &r.ChangeTicketNumber)
	}
	return r, row.Scan(dest...)
}

func scanCase(row pgx.Row) (TestSolutionCase, error) {
	c, err := scanCaseBase(row, true)
	return c, err
}

func scanCaseBasic(row pgx.Row) (TestSolutionCase, error) {
	c, err := scanCaseBase(row, false)
	return c, err
}

func scanCaseBase(row pgx.Row, enriched bool) (TestSolutionCase, error) {
	var c TestSolutionCase
	dest := []any{
		&c.ID, &c.TenantID, &c.RunID, &c.TestType, &c.Title, &c.ScriptReference,
		&c.Status, &c.AssignedTo, &c.Evidence, &c.StartedAt, &c.CompletedAt,
		&c.CreatedAt, &c.UpdatedAt,
	}
	if enriched {
		dest = append(dest, &c.AssignedToName)
	}
	return c, row.Scan(dest...)
}

func scanSignoff(row pgx.Row) (TestSolutionSignoff, error) {
	so, err := scanSignoffBase(row, true)
	return so, err
}

func scanSignoffBasic(row pgx.Row) (TestSolutionSignoff, error) {
	so, err := scanSignoffBase(row, false)
	return so, err
}

func scanSignoffBase(row pgx.Row, enriched bool) (TestSolutionSignoff, error) {
	var so TestSolutionSignoff
	dest := []any{
		&so.ID, &so.TenantID, &so.RunID, &so.TestType, &so.SignerID, &so.RoleName,
		&so.Status, &so.Comments, &so.Evidence, &so.SignedAt, &so.CreatedAt, &so.UpdatedAt,
	}
	if enriched {
		dest = append(dest, &so.SignerName)
	}
	return so, row.Scan(dest...)
}

func defaultJSON(value json.RawMessage, fallback string) json.RawMessage {
	if len(value) > 0 {
		return value
	}
	return json.RawMessage(fallback)
}

func nullableJSON(value json.RawMessage) any {
	if len(value) == 0 {
		return nil
	}
	return value
}

func nullableTextArray(value []string) any {
	if value == nil {
		return nil
	}
	return value
}

func (s *Service) logAudit(ctx context.Context, auth *types.AuthContext, action string, entityID uuid.UUID, data map[string]any) {
	if s.auditSvc == nil || auth == nil {
		return
	}
	changes, _ := json.Marshal(data)
	if err := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     action,
		EntityType: "test_solution",
		EntityID:   entityID,
		Changes:    changes,
	}); err != nil {
		slog.ErrorContext(ctx, "failed to log test solution audit event", "error", err)
	}
}

func (s *Service) publishEvent(subject string, entityID uuid.UUID, auth *types.AuthContext, data map[string]any) {
	if s.js == nil || auth == nil {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"type":       strings.TrimPrefix(subject, "notify."),
		"tenantId":   auth.TenantID,
		"actorId":    auth.UserID,
		"entityType": "test_solution",
		"entityId":   entityID,
		"data":       data,
		"timestamp":  time.Now(),
	})
	if _, err := s.js.Publish(subject, payload); err != nil {
		slog.Error("failed to publish test solution event", "subject", subject, "error", err)
	}
}
