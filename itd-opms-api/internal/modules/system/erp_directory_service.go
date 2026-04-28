package system

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type ERPDirectoryService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

func NewERPDirectoryService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ERPDirectoryService {
	return &ERPDirectoryService{pool: pool, auditSvc: auditSvc}
}

func (s *ERPDirectoryService) Preview(ctx context.Context, req ERPDirectoryImportRequest) (*ERPDirectoryImportPreview, error) {
	if req.SourcePath == "" {
		return nil, apperrors.BadRequest("sourcePath is required")
	}
	records, parseErrors, checksum, err := parseERPDirectoryFile(req.SourcePath)
	if err != nil {
		return nil, err
	}
	prepared := prepareERPDirectory(records, parseErrors, req.SourcePath, checksum)
	return &prepared.Preview, nil
}

func (s *ERPDirectoryService) Apply(ctx context.Context, tenantID uuid.UUID, req ERPDirectoryImportRequest) (*ERPDirectoryImportResult, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	if s.pool == nil {
		return nil, fmt.Errorf("database pool is not configured")
	}
	if req.SourcePath == "" {
		return nil, apperrors.BadRequest("sourcePath is required")
	}

	records, parseErrors, checksum, err := parseERPDirectoryFile(req.SourcePath)
	if err != nil {
		return nil, err
	}
	prepared := prepareERPDirectory(records, parseErrors, req.SourcePath, checksum)

	runID := uuid.New()
	summaryJSON, _ := json.Marshal(prepared.Preview)
	errorsJSON, _ := json.Marshal(prepared.Preview.Warnings)
	_, err = s.pool.Exec(ctx, `
		INSERT INTO erp_directory_import_runs (
			id, tenant_id, source_path, source_checksum, status, mode, triggered_by,
			total_rows, users_inactive, warnings_count, errors_count, summary, errors
		)
		VALUES ($1, $2, $3, $4, 'running', 'reset', $5, $6, $7, $8, $9, $10, $11)`,
		runID, tenantID, req.SourcePath, checksum, auth.UserID,
		prepared.Preview.TotalRows, prepared.Preview.InactiveEmployees,
		len(prepared.Preview.Warnings), prepared.Preview.ParseErrors, string(summaryJSON), string(errorsJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("create ERP import run: %w", err)
	}

	result := &ERPDirectoryImportResult{
		RunID:   runID,
		Preview: prepared.Preview,
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		s.failRun(ctx, runID, err)
		return nil, fmt.Errorf("begin ERP import transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	orgIDs, err := s.applyOrgUnits(ctx, tx, tenantID, prepared)
	if err != nil {
		s.failRun(ctx, runID, err)
		return nil, err
	}
	result.OrgUnitsUpserted = len(orgIDs)

	actualEmployeeIDs, created, updated, err := s.applyUsers(ctx, tx, tenantID, prepared, orgIDs)
	if err != nil {
		s.failRun(ctx, runID, err)
		return nil, err
	}
	result.UsersCreated = created
	result.UsersUpdated = updated

	if err := s.applySupervisors(ctx, tx, tenantID, prepared, actualEmployeeIDs); err != nil {
		s.failRun(ctx, runID, err)
		return nil, err
	}
	if err := s.applyOrgManagers(ctx, tx, tenantID, prepared, orgIDs, actualEmployeeIDs); err != nil {
		s.failRun(ctx, runID, err)
		return nil, err
	}

	deactivateUnmatched := true
	if req.DeactivateUnmatched != nil {
		deactivateUnmatched = *req.DeactivateUnmatched
	}
	if deactivateUnmatched {
		deactivated, err := s.deactivateUnmatchedUsers(ctx, tx, tenantID, actualEmployeeIDs, auth.UserID)
		if err != nil {
			s.failRun(ctx, runID, err)
			return nil, err
		}
		result.UsersDeactivated = deactivated
	}

	bindings, err := s.applyRoleBindings(ctx, tx, tenantID, prepared, orgIDs, actualEmployeeIDs, auth.UserID)
	if err != nil {
		s.failRun(ctx, runID, err)
		return nil, err
	}
	result.RoleBindingsAdded = bindings

	if err := s.insertStagingRows(ctx, tx, tenantID, runID, prepared, orgIDs); err != nil {
		s.failRun(ctx, runID, err)
		return nil, err
	}
	if err := s.rebuildOrgHierarchy(ctx, tx, tenantID); err != nil {
		s.failRun(ctx, runID, err)
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		s.failRun(ctx, runID, err)
		return nil, fmt.Errorf("commit ERP import transaction: %w", err)
	}

	result.CompletedAt = time.Now().UTC()
	_, err = s.pool.Exec(ctx, `
		UPDATE erp_directory_import_runs SET
			status = 'completed',
			completed_at = $2,
			users_created = $3,
			users_updated = $4,
			users_deactivated = $5,
			org_units_upserted = $6,
			role_bindings_added = $7
		WHERE id = $1`,
		runID, result.CompletedAt, result.UsersCreated, result.UsersUpdated,
		result.UsersDeactivated, result.OrgUnitsUpserted, result.RoleBindingsAdded,
	)
	if err != nil {
		return nil, fmt.Errorf("complete ERP import run: %w", err)
	}

	s.logERPImportAudit(ctx, tenantID, auth, runID, result)
	return result, nil
}

func (s *ERPDirectoryService) ListRuns(ctx context.Context, tenantID uuid.UUID, limit int) ([]ERPDirectoryImportRun, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, source_path, source_checksum, status, mode, started_at, completed_at,
		       triggered_by, total_rows, users_created, users_updated, users_deactivated,
		       users_inactive, org_units_upserted, role_bindings_added, warnings_count, errors_count
		FROM erp_directory_import_runs
		WHERE tenant_id = $1
		ORDER BY started_at DESC
		LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("list ERP import runs: %w", err)
	}
	defer rows.Close()

	runs := []ERPDirectoryImportRun{}
	for rows.Next() {
		var run ERPDirectoryImportRun
		if err := rows.Scan(
			&run.ID, &run.TenantID, &run.SourcePath, &run.SourceChecksum,
			&run.Status, &run.Mode, &run.StartedAt, &run.CompletedAt,
			&run.TriggeredBy, &run.TotalRows, &run.UsersCreated,
			&run.UsersUpdated, &run.UsersDeactivated, &run.UsersInactive,
			&run.OrgUnitsUpserted, &run.RoleBindingsAdded, &run.WarningsCount,
			&run.ErrorsCount,
		); err != nil {
			return nil, err
		}
		runs = append(runs, run)
	}
	return runs, rows.Err()
}

func (s *ERPDirectoryService) applyOrgUnits(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, prepared preparedERPDirectory) (map[string]uuid.UUID, error) {
	if _, err := tx.Exec(ctx, `
		UPDATE org_units
		SET is_active = false, updated_at = NOW(),
		    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('superseded_by_erp_import_at', NOW())
		WHERE tenant_id = $1 AND code <> 'CBN'`, tenantID); err != nil {
		return nil, fmt.Errorf("deactivate existing org units: %w", err)
	}

	orgIDs := make(map[string]uuid.UUID, len(prepared.OrgUnits))
	for _, unit := range prepared.OrgUnits {
		var parentID *uuid.UUID
		if unit.ParentCode != "" {
			if id, ok := orgIDs[unit.ParentCode]; ok {
				parentID = &id
			}
		}
		metadata := map[string]any{
			"source_system":         ERPDirectorySourceSystem,
			"source_level":          unit.SourceLevel,
			"active_employee_count": unit.ActiveEmployeeCount,
		}
		if unit.ERPDepartmentID != nil {
			metadata["erp_department_id"] = *unit.ERPDepartmentID
		}
		if unit.ERPDivisionID != nil {
			metadata["erp_division_id"] = *unit.ERPDivisionID
		}
		if unit.ERPOfficeID != nil {
			metadata["erp_office_id"] = *unit.ERPOfficeID
		}
		metaJSON, _ := json.Marshal(metadata)

		var actualID uuid.UUID
		err := tx.QueryRow(ctx, `
			INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, manager_user_id, is_active, metadata)
			VALUES ($1, $2, $3, $4, $5::org_level_type, $6, NULL, true, $7)
			ON CONFLICT (tenant_id, code) DO UPDATE SET
				name = EXCLUDED.name,
				level = EXCLUDED.level,
				parent_id = EXCLUDED.parent_id,
				is_active = true,
				metadata = EXCLUDED.metadata,
				updated_at = NOW()
			RETURNING id`,
			unit.ID, tenantID, unit.Name, unit.Code, unit.Level, parentID, string(metaJSON),
		).Scan(&actualID)
		if err != nil {
			return nil, fmt.Errorf("upsert ERP org unit %s: %w", unit.Code, err)
		}
		orgIDs[unit.Code] = actualID
	}
	return orgIDs, nil
}

func (s *ERPDirectoryService) applyUsers(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, prepared preparedERPDirectory, orgIDs map[string]uuid.UUID) (map[string]uuid.UUID, int, int, error) {
	actualEmployeeIDs := make(map[string]uuid.UUID, len(prepared.Employees))
	created := 0
	updated := 0
	for _, rec := range prepared.Employees {
		orgUnitID := orgIDs[rec.AssignedOrgUnitCode]
		userID, wasCreated, err := upsertERPUser(ctx, tx, tenantID, rec, orgUnitID)
		if err != nil {
			return nil, 0, 0, fmt.Errorf("upsert ERP user %s: %w", rec.EmployeeNumber, err)
		}
		actualEmployeeIDs[rec.EmployeeNumber] = userID
		if wasCreated {
			created++
		} else {
			updated++
		}
	}
	return actualEmployeeIDs, created, updated, nil
}

func upsertERPUser(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, rec erpEmployeeRecord, orgUnitID uuid.UUID) (uuid.UUID, bool, error) {
	metadata := map[string]any{
		"source_system":        ERPDirectorySourceSystem,
		"source_email":         rec.EmailAddress,
		"effective_email":      rec.EffectiveEmail,
		"email_quality":        rec.EmailQuality,
		"email_validation":     rec.EmailValidationErrors,
		"department_id":        rec.DepartmentID,
		"division_id":          rec.DivisionID,
		"office_id":            rec.OfficeID,
		"location_id":          rec.LocationID,
		"location_code":        rec.LocationCode,
		"user_name":            rec.UserName,
		"head_of_dept_id":      rec.HeadOfDeptID,
		"head_of_div_id":       rec.HeadOfDivID,
		"head_of_office_id":    rec.HeadOfOfficeID,
		"source_synced_at_utc": time.Now().UTC().Format(time.RFC3339),
	}
	metaJSON, _ := json.Marshal(metadata)
	displayName := rec.displayName()
	isActive := rec.isActiveAssignment()

	params := []any{
		rec.EffectiveEmail, displayName, rec.JobName, rec.DepartmentName, rec.OfficeName, rec.DivisionName,
		tenantID, isActive, string(metaJSON), orgUnitID, rec.EmployeeNumber, rec.AssignmentNumber,
		rec.PersonID, rec.OrganizationID, rec.Status, rec.Grade, rec.OriginalDateOfHire,
		ERPDirectorySourceSystem,
	}

	updateSQL := `
		UPDATE users SET
			email = $1,
			display_name = $2,
			job_title = NULLIF($3, ''),
			department = NULLIF($4, ''),
			office = NULLIF($5, ''),
			unit = NULLIF($6, ''),
			tenant_id = $7,
			is_active = $8,
			metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb,
			org_unit_id = $10,
			employee_number = $11,
			assignment_number = NULLIF($12, ''),
			person_id = $13,
			erp_organization_id = $14,
			employment_status = NULLIF($15, ''),
			grade = NULLIF($16, ''),
			hire_date = $17,
			source_system = $18,
			source_synced_at = NOW(),
			updated_at = NOW()
		WHERE tenant_id = $7 AND employee_number = $11
		RETURNING id`

	var id uuid.UUID
	err := tx.QueryRow(ctx, updateSQL, params...).Scan(&id)
	if err == nil {
		return id, false, nil
	}
	if err != pgx.ErrNoRows {
		return uuid.Nil, false, err
	}

	err = tx.QueryRow(ctx, `
		UPDATE users SET
			display_name = $2,
			job_title = NULLIF($3, ''),
			department = NULLIF($4, ''),
			office = NULLIF($5, ''),
			unit = NULLIF($6, ''),
			tenant_id = $7,
			is_active = $8,
			metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb,
			org_unit_id = $10,
			employee_number = $11,
			assignment_number = NULLIF($12, ''),
			person_id = $13,
			erp_organization_id = $14,
			employment_status = NULLIF($15, ''),
			grade = NULLIF($16, ''),
			hire_date = $17,
			source_system = $18,
			source_synced_at = NOW(),
			updated_at = NOW()
		WHERE tenant_id = $7 AND lower(email) = lower($1) AND employee_number IS NULL
		RETURNING id`, params...).Scan(&id)
	if err == nil {
		return id, false, nil
	}
	if err != pgx.ErrNoRows {
		return uuid.Nil, false, err
	}

	id = deterministicERPUUID("user", rec.EmployeeNumber)
	err = tx.QueryRow(ctx, `
		INSERT INTO users (
			id, email, display_name, job_title, department, office, unit, tenant_id, is_active,
			metadata, org_unit_id, employee_number, assignment_number, person_id, erp_organization_id,
			employment_status, grade, hire_date, source_system, source_synced_at
		)
		VALUES (
			$19, $1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''),
			$7, $8, $9::jsonb, $10, $11, NULLIF($12, ''), $13, $14, NULLIF($15, ''),
			NULLIF($16, ''), $17, $18, NOW()
		)
		RETURNING id`, append(params, id)...).Scan(&id)
	if err != nil {
		return uuid.Nil, false, err
	}
	return id, true, nil
}

func (s *ERPDirectoryService) applySupervisors(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, prepared preparedERPDirectory, employeeIDs map[string]uuid.UUID) error {
	for _, rec := range prepared.Employees {
		userID := employeeIDs[rec.EmployeeNumber]
		var supervisorID *uuid.UUID
		if rec.SupervisorID != "" {
			if id, ok := employeeIDs[rec.SupervisorID]; ok {
				supervisorID = &id
			}
		}
		if _, err := tx.Exec(ctx,
			`UPDATE users SET supervisor_user_id = $1 WHERE id = $2 AND tenant_id = $3`,
			supervisorID, userID, tenantID,
		); err != nil {
			return fmt.Errorf("set supervisor for employee %s: %w", rec.EmployeeNumber, err)
		}
	}
	return nil
}

func (s *ERPDirectoryService) applyOrgManagers(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, prepared preparedERPDirectory, orgIDs, employeeIDs map[string]uuid.UUID) error {
	for _, unit := range prepared.OrgUnits {
		orgID, ok := orgIDs[unit.Code]
		if !ok {
			continue
		}
		var managerID *uuid.UUID
		if unit.ManagerEmployeeNo != "" {
			if id, ok := employeeIDs[unit.ManagerEmployeeNo]; ok {
				managerID = &id
			}
		}
		_, err := tx.Exec(ctx,
			`UPDATE org_units SET manager_user_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
			managerID, orgID, tenantID,
		)
		if err != nil {
			return fmt.Errorf("set manager for org unit %s: %w", unit.Code, err)
		}
	}
	return nil
}

func (s *ERPDirectoryService) deactivateUnmatchedUsers(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, employeeIDs map[string]uuid.UUID, actorID uuid.UUID) (int, error) {
	ids := make([]uuid.UUID, 0, len(employeeIDs))
	for _, id := range employeeIDs {
		ids = append(ids, id)
	}
	protectedEmails := []string{"admin@itd.cbn.gov.ng"}
	tag, err := tx.Exec(ctx, `
		UPDATE users u SET
			is_active = false,
			updated_at = NOW(),
			metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('expunged_by_erp_import_at', NOW())
		WHERE u.tenant_id = $1
		  AND u.id <> ALL($2::uuid[])
		  AND u.is_active = true
		  AND NOT (
		    u.id = $3
		    OR lower(u.email) = ANY($4::text[])
		    OR EXISTS (
		      SELECT 1
		      FROM role_bindings rb
		      JOIN roles r ON r.id = rb.role_id
		      WHERE rb.user_id = u.id
		        AND rb.tenant_id = $1
		        AND rb.is_active = true
		        AND r.name = 'global_admin'
		    )
		  )`,
		tenantID, ids, actorID, protectedEmails,
	)
	if err != nil {
		return 0, fmt.Errorf("deactivate unmatched users: %w", err)
	}
	_, err = tx.Exec(ctx, `
		UPDATE role_bindings SET is_active = false
		WHERE tenant_id = $1
		  AND is_active = true
		  AND user_id IN (
		    SELECT u.id
		    FROM users u
		    WHERE u.tenant_id = $1
		      AND u.id <> ALL($2::uuid[])
		      AND NOT (
		        u.id = $3
		        OR lower(u.email) = ANY($4::text[])
		        OR EXISTS (
		          SELECT 1
		          FROM role_bindings rb
		          JOIN roles r ON r.id = rb.role_id
		          WHERE rb.user_id = u.id
		            AND rb.tenant_id = $1
		            AND rb.is_active = true
		            AND r.name = 'global_admin'
		        )
		      )
		  )`,
		tenantID, ids, actorID, protectedEmails,
	)
	if err != nil {
		return 0, fmt.Errorf("revoke roles for unmatched users: %w", err)
	}
	return int(tag.RowsAffected()), nil
}

func (s *ERPDirectoryService) applyRoleBindings(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, prepared preparedERPDirectory, orgIDs, employeeIDs map[string]uuid.UUID, grantedBy uuid.UUID) (int, error) {
	_, err := tx.Exec(ctx, `
		UPDATE role_bindings SET is_active = false
		WHERE tenant_id = $1
		  AND is_active = true
		  AND user_id IN (SELECT id FROM users WHERE tenant_id = $1 AND source_system = $2)`,
		tenantID, ERPDirectorySourceSystem,
	)
	if err != nil {
		return 0, fmt.Errorf("reset ERP role bindings: %w", err)
	}

	added := 0
	for _, rec := range prepared.Employees {
		if !rec.isActiveAssignment() {
			continue
		}
		userID := employeeIDs[rec.EmployeeNumber]
		scopeID := orgIDs[rec.AssignedOrgUnitCode]
		n, err := insertRoleBindingByName(ctx, tx, tenantID, userID, "staff", "unit", &scopeID, grantedBy)
		if err != nil {
			return added, err
		}
		added += n

		if _, ok := prepared.Supervisors[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "supervisor", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		if _, ok := prepared.DivHeads[rec.EmployeeNumber]; ok {
			divScope := orgIDs[firstNonEmptyString(rec.DivisionOrgUnitCode, rec.AssignedOrgUnitCode)]
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "head_of_division", "division", &divScope, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		if _, ok := prepared.Elevated[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "global_admin", "global", nil, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		if _, ok := prepared.SeniorServiceDeskAnalysts[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "senior_service_desk_analyst", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		} else if _, ok := prepared.ServiceDeskAnalysts[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "service_desk_analyst", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		if _, ok := prepared.ServiceDeskSpecialists[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "service_desk_specialist", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		if _, ok := prepared.EndUserSupportSpecialists[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "end_user_support_specialist", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		if _, ok := prepared.SecondLevelSupportSpecialists[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "second_level_support_specialist", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		if _, ok := prepared.SeniorITServiceCenterSpecialists[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "senior_it_service_center_specialist", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		} else if _, ok := prepared.ITServiceCenterSpecialists[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "it_service_center_specialist", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		} else if _, ok := prepared.ITServiceSupportSpecialists[rec.EmployeeNumber]; ok {
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, "it_service_support_specialist", "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
		changeRoleMaps := []struct {
			name   string
			values map[string]struct{}
		}{
			{"change_requestor", prepared.ChangeRequestors},
			{"business_analyst", prepared.BusinessAnalysts},
			{"business_relationship_manager", prepared.BusinessRelationshipManagers},
			{"change_manager", prepared.ChangeManagers},
			{"test_management_specialist", prepared.TestManagementSpecialists},
			{"subject_matter_expert", prepared.SubjectMatterExperts},
			{"it_compliance_specialist", prepared.ITComplianceSpecialists},
			{"cab_member", prepared.CABMembers},
			{"cab_meeting_secretary", prepared.CABMeetingSecretaries},
			{"release_manager", prepared.ReleaseManagers},
			{"change_approver", prepared.ChangeApprovers},
			{"support_analyst", prepared.SupportAnalysts},
		}
		for _, roleMap := range changeRoleMaps {
			if _, ok := roleMap.values[rec.EmployeeNumber]; !ok {
				continue
			}
			n, err = insertRoleBindingByName(ctx, tx, tenantID, userID, roleMap.name, "unit", &scopeID, grantedBy)
			if err != nil {
				return added, err
			}
			added += n
		}
	}
	return added, nil
}

func insertRoleBindingByName(ctx context.Context, tx pgx.Tx, tenantID, userID uuid.UUID, roleName, scopeType string, scopeID *uuid.UUID, grantedBy uuid.UUID) (int, error) {
	tag, err := tx.Exec(ctx, `
		INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
		SELECT $1, r.id, $2, $3::scope_type, $4, $5, true
		FROM roles r
		WHERE r.name = $6
		ON CONFLICT DO NOTHING`,
		userID, tenantID, scopeType, scopeID, grantedBy, roleName,
	)
	if err != nil {
		return 0, fmt.Errorf("insert %s role binding for user %s: %w", roleName, userID, err)
	}
	return int(tag.RowsAffected()), nil
}

func (s *ERPDirectoryService) insertStagingRows(ctx context.Context, tx pgx.Tx, tenantID, runID uuid.UUID, prepared preparedERPDirectory, _ map[string]uuid.UUID) error {
	for _, rec := range prepared.Employees {
		roleFlags := map[string]bool{
			"staff":                         rec.isActiveAssignment(),
			"supervisor":                    hasKey(prepared.Supervisors, rec.EmployeeNumber),
			"head_of_division":              hasKey(prepared.DivHeads, rec.EmployeeNumber),
			"global_admin":                  hasKey(prepared.Elevated, rec.EmployeeNumber),
			"change_requestor":              hasKey(prepared.ChangeRequestors, rec.EmployeeNumber),
			"business_analyst":              hasKey(prepared.BusinessAnalysts, rec.EmployeeNumber),
			"business_relationship_manager": hasKey(prepared.BusinessRelationshipManagers, rec.EmployeeNumber),
			"change_manager":                hasKey(prepared.ChangeManagers, rec.EmployeeNumber),
			"test_management_specialist":    hasKey(prepared.TestManagementSpecialists, rec.EmployeeNumber),
			"subject_matter_expert":         hasKey(prepared.SubjectMatterExperts, rec.EmployeeNumber),
			"it_compliance_specialist":      hasKey(prepared.ITComplianceSpecialists, rec.EmployeeNumber),
			"cab_member":                    hasKey(prepared.CABMembers, rec.EmployeeNumber),
			"cab_meeting_secretary":         hasKey(prepared.CABMeetingSecretaries, rec.EmployeeNumber),
			"release_manager":               hasKey(prepared.ReleaseManagers, rec.EmployeeNumber),
			"change_approver":               hasKey(prepared.ChangeApprovers, rec.EmployeeNumber),
			"support_analyst":               hasKey(prepared.SupportAnalysts, rec.EmployeeNumber),
		}
		roleJSON, _ := json.Marshal(roleFlags)
		errorsJSON, _ := json.Marshal(rec.EmailValidationErrors)
		_, err := tx.Exec(ctx, `
			INSERT INTO erp_employee_staging (
				import_run_id, tenant_id, row_number, employee_number, assignment_number, person_id,
				user_name, source_email, effective_email, email_quality, display_name, job_name,
				employment_status, is_active, department_id, department_name, division_id,
				division_name, office_id, office_name, location_code, grade,
				supervisor_employee_number, head_of_dept_employee_number, head_of_div_employee_number,
				head_of_office_employee_number, assigned_org_unit_code, role_flags, validation_errors
			)
			VALUES (
				$1, $2, $3, $4, NULLIF($5, ''), $6, NULLIF($7, ''), NULLIF($8, ''), $9, $10,
				$11, NULLIF($12, ''), $13, $14, $15, NULLIF($16, ''), $17, NULLIF($18, ''),
				$19, NULLIF($20, ''), NULLIF($21, ''), NULLIF($22, ''), NULLIF($23, ''),
				NULLIF($24, ''), NULLIF($25, ''), NULLIF($26, ''), $27, $28::jsonb, $29::jsonb
			)`,
			runID, tenantID, rec.RowNumber, rec.EmployeeNumber, rec.AssignmentNumber,
			rec.PersonID, rec.UserName, rec.EmailAddress, rec.EffectiveEmail,
			rec.EmailQuality, rec.displayName(), rec.JobName, rec.Status,
			rec.isActiveAssignment(), rec.DepartmentID, rec.DepartmentName,
			rec.DivisionID, rec.DivisionName, rec.OfficeID, rec.OfficeName,
			rec.LocationCode, rec.Grade, rec.SupervisorID, rec.HeadOfDeptID,
			rec.HeadOfDivID, rec.HeadOfOfficeID, rec.AssignedOrgUnitCode,
			string(roleJSON), string(errorsJSON),
		)
		if err != nil {
			return fmt.Errorf("insert ERP staging row %s: %w", rec.EmployeeNumber, err)
		}
	}
	return nil
}

func (s *ERPDirectoryService) rebuildOrgHierarchy(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID) error {
	_, err := tx.Exec(ctx, `
		DELETE FROM org_hierarchy
		WHERE ancestor_id IN (SELECT id FROM org_units WHERE tenant_id = $1)
		   OR descendant_id IN (SELECT id FROM org_units WHERE tenant_id = $1)`, tenantID)
	if err != nil {
		return fmt.Errorf("clear org hierarchy: %w", err)
	}
	_, err = tx.Exec(ctx, `
		WITH RECURSIVE tree AS (
			SELECT id AS ancestor_id, id AS descendant_id, 0 AS depth
			FROM org_units
			WHERE tenant_id = $1
			UNION ALL
			SELECT tree.ancestor_id, child.id AS descendant_id, tree.depth + 1
			FROM tree
			JOIN org_units child ON child.parent_id = tree.descendant_id
			WHERE child.tenant_id = $1 AND tree.depth < 20
		)
		INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
		SELECT ancestor_id, descendant_id, MIN(depth)
		FROM tree
		GROUP BY ancestor_id, descendant_id
		ON CONFLICT (ancestor_id, descendant_id) DO UPDATE SET depth = EXCLUDED.depth`, tenantID)
	if err != nil {
		return fmt.Errorf("rebuild org hierarchy: %w", err)
	}
	return nil
}

func (s *ERPDirectoryService) failRun(ctx context.Context, runID uuid.UUID, runErr error) {
	errJSON, _ := json.Marshal([]string{runErr.Error()})
	_, _ = s.pool.Exec(ctx, `
		UPDATE erp_directory_import_runs
		SET status = 'failed', completed_at = NOW(), errors = $2, errors_count = 1
		WHERE id = $1`, runID, string(errJSON))
}

func (s *ERPDirectoryService) logERPImportAudit(ctx context.Context, tenantID uuid.UUID, auth *types.AuthContext, runID uuid.UUID, result *ERPDirectoryImportResult) {
	if s.auditSvc == nil {
		return
	}
	changes, _ := json.Marshal(map[string]any{
		"runId":             runID,
		"sourcePath":        result.Preview.SourcePath,
		"totalRows":         result.Preview.TotalRows,
		"usersCreated":      result.UsersCreated,
		"usersUpdated":      result.UsersUpdated,
		"usersDeactivated":  result.UsersDeactivated,
		"orgUnitsUpserted":  result.OrgUnitsUpserted,
		"roleBindingsAdded": result.RoleBindingsAdded,
	})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "erp_directory.import_applied",
		EntityType:    "erp_directory_import_run",
		EntityID:      runID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})
}

func hasKey(values map[string]struct{}, key string) bool {
	_, ok := values[key]
	return ok
}
