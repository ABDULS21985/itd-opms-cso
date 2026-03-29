package people

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
// RosterService
// ──────────────────────────────────────────────

// RosterService handles business logic for rosters, leave records, and capacity allocations.
type RosterService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewRosterService creates a new RosterService.
func NewRosterService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *RosterService {
	return &RosterService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Rosters
// ──────────────────────────────────────────────

// CreateRoster creates a new roster.
func (s *RosterService) CreateRoster(ctx context.Context, req CreateRosterRequest) (Roster, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Roster{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	var shifts json.RawMessage
	if req.Shifts != nil {
		shifts = *req.Shifts
	} else {
		shifts = json.RawMessage("[]")
	}

	query := `
		INSERT INTO rosters (
			id, tenant_id, team_id, name, period_start,
			period_end, status, shifts, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, 'draft', $7, $8, $9
		)
		RETURNING id, tenant_id, team_id, name, period_start,
			period_end, status, shifts, created_at, updated_at`

	var roster Roster
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.TeamID, req.Name, req.PeriodStart,
		req.PeriodEnd, shifts, now, now,
	).Scan(
		&roster.ID, &roster.TenantID, &roster.TeamID, &roster.Name, &roster.PeriodStart,
		&roster.PeriodEnd, &roster.Status, &roster.Shifts, &roster.CreatedAt, &roster.UpdatedAt,
	)
	if err != nil {
		return Roster{}, apperrors.Internal("failed to create roster", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:roster",
		EntityType: "roster",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return roster, nil
}

// GetRoster retrieves a single roster by ID.
func (s *RosterService) GetRoster(ctx context.Context, id uuid.UUID) (Roster, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Roster{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, team_id, name, period_start,
			period_end, status, shifts, created_at, updated_at
		FROM rosters
		WHERE id = $1 AND tenant_id = $2`

	var roster Roster
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&roster.ID, &roster.TenantID, &roster.TeamID, &roster.Name, &roster.PeriodStart,
		&roster.PeriodEnd, &roster.Status, &roster.Shifts, &roster.CreatedAt, &roster.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Roster{}, apperrors.NotFound("Roster", id.String())
		}
		return Roster{}, apperrors.Internal("failed to get roster", err)
	}

	return roster, nil
}

// ListRosters returns a filtered, paginated list of rosters.
func (s *RosterService) ListRosters(ctx context.Context, teamID *uuid.UUID, status *string, page, limit int) ([]Roster, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM rosters
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR team_id = $2)
			AND ($3::text IS NULL OR status = $3)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, teamID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count rosters", err)
	}

	dataQuery := `
		SELECT id, tenant_id, team_id, name, period_start,
			period_end, status, shifts, created_at, updated_at
		FROM rosters
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR team_id = $2)
			AND ($3::text IS NULL OR status = $3)
		ORDER BY period_start DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, teamID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list rosters", err)
	}
	defer rows.Close()

	var rosters []Roster
	for rows.Next() {
		var roster Roster
		if err := rows.Scan(
			&roster.ID, &roster.TenantID, &roster.TeamID, &roster.Name, &roster.PeriodStart,
			&roster.PeriodEnd, &roster.Status, &roster.Shifts, &roster.CreatedAt, &roster.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan roster", err)
		}
		rosters = append(rosters, roster)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate rosters", err)
	}

	if rosters == nil {
		rosters = []Roster{}
	}

	return rosters, total, nil
}

// UpdateRoster updates an existing roster using COALESCE partial update.
func (s *RosterService) UpdateRoster(ctx context.Context, id uuid.UUID, req UpdateRosterRequest) (Roster, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Roster{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetRoster(ctx, id); err != nil {
		return Roster{}, err
	}

	now := time.Now().UTC()

	// Dereference Shifts pointer for COALESCE.
	var shifts json.RawMessage
	if req.Shifts != nil {
		shifts = *req.Shifts
	}

	updateQuery := `
		UPDATE rosters SET
			name = COALESCE($1, name),
			status = COALESCE($2, status),
			period_start = COALESCE($3, period_start),
			period_end = COALESCE($4, period_end),
			shifts = COALESCE($5, shifts),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, team_id, name, period_start,
			period_end, status, shifts, created_at, updated_at`

	var roster Roster
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Status, req.PeriodStart,
		req.PeriodEnd, shifts,
		now, id, auth.TenantID,
	).Scan(
		&roster.ID, &roster.TenantID, &roster.TeamID, &roster.Name, &roster.PeriodStart,
		&roster.PeriodEnd, &roster.Status, &roster.Shifts, &roster.CreatedAt, &roster.UpdatedAt,
	)
	if err != nil {
		return Roster{}, apperrors.Internal("failed to update roster", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:roster",
		EntityType: "roster",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return roster, nil
}

// ──────────────────────────────────────────────
// Leave Records
// ──────────────────────────────────────────────

// CreateLeaveRecord creates a new leave record.
func (s *RosterService) CreateLeaveRecord(ctx context.Context, req CreateLeaveRecordRequest) (LeaveRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return LeaveRecord{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO leave_records (
			id, tenant_id, user_id, leave_type, start_date,
			end_date, status, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, 'pending', $7, $8, $9
		)
		RETURNING id, tenant_id, user_id, leave_type, start_date,
			end_date, status, approved_by, notes, created_at, updated_at`

	var lr LeaveRecord
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.UserID, req.LeaveType, req.StartDate,
		req.EndDate, req.Notes, now, now,
	).Scan(
		&lr.ID, &lr.TenantID, &lr.UserID, &lr.LeaveType, &lr.StartDate,
		&lr.EndDate, &lr.Status, &lr.ApprovedBy, &lr.Notes, &lr.CreatedAt, &lr.UpdatedAt,
	)
	if err != nil {
		return LeaveRecord{}, apperrors.Internal("failed to create leave record", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"userId":    req.UserID,
		"leaveType": req.LeaveType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:leave_record",
		EntityType: "leave_record",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return lr, nil
}

// GetLeaveRecord retrieves a single leave record by ID.
func (s *RosterService) GetLeaveRecord(ctx context.Context, id uuid.UUID) (LeaveRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return LeaveRecord{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, user_id, leave_type, start_date,
			end_date, status, approved_by, notes, created_at, updated_at
		FROM leave_records
		WHERE id = $1 AND tenant_id = $2`

	var lr LeaveRecord
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&lr.ID, &lr.TenantID, &lr.UserID, &lr.LeaveType, &lr.StartDate,
		&lr.EndDate, &lr.Status, &lr.ApprovedBy, &lr.Notes, &lr.CreatedAt, &lr.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return LeaveRecord{}, apperrors.NotFound("LeaveRecord", id.String())
		}
		return LeaveRecord{}, apperrors.Internal("failed to get leave record", err)
	}

	return lr, nil
}

// ListLeaveRecords returns a filtered, paginated list of leave records.
func (s *RosterService) ListLeaveRecords(ctx context.Context, userID *uuid.UUID, status *string, leaveType *string, page, limit int) ([]LeaveRecord, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	// Build org-scope filter. Next param index after $4 (leave_type) is 5.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 5)

	// Build args: tenant_id, userID, status, leaveType [, orgParam]
	countArgs := []interface{}{auth.TenantID, userID, status, leaveType}
	orgSQL := ""
	nextIdx := 5
	if orgClause != "" {
		orgSQL = " AND " + orgClause
		if orgParam != nil {
			countArgs = append(countArgs, orgParam)
			nextIdx = 6
		}
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM leave_records
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR user_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR leave_type = $4)%s`, orgSQL)

	var total int
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count leave records", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, tenant_id, user_id, leave_type, start_date,
			end_date, status, approved_by, notes, created_at, updated_at
		FROM leave_records
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR user_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR leave_type = $4)%s
		ORDER BY start_date DESC
		LIMIT $%d OFFSET $%d`, orgSQL, nextIdx, nextIdx+1)

	dataArgs := append(countArgs, limit, offset)
	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list leave records", err)
	}
	defer rows.Close()

	var records []LeaveRecord
	for rows.Next() {
		var lr LeaveRecord
		if err := rows.Scan(
			&lr.ID, &lr.TenantID, &lr.UserID, &lr.LeaveType, &lr.StartDate,
			&lr.EndDate, &lr.Status, &lr.ApprovedBy, &lr.Notes, &lr.CreatedAt, &lr.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan leave record", err)
		}
		records = append(records, lr)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate leave records", err)
	}

	if records == nil {
		records = []LeaveRecord{}
	}

	return records, total, nil
}

// UpdateLeaveRecordStatus updates a leave record's status (approve/reject).
func (s *RosterService) UpdateLeaveRecordStatus(ctx context.Context, id uuid.UUID, req UpdateLeaveRecordStatusRequest) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	// Default approved_by to the current user if approving and not specified.
	approvedBy := req.ApprovedBy
	if approvedBy == nil && req.Status == LeaveStatusApproved {
		approvedBy = &auth.UserID
	}

	query := `
		UPDATE leave_records SET
			status = $1,
			approved_by = COALESCE($2, approved_by),
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5`

	result, err := s.pool.Exec(ctx, query, req.Status, approvedBy, now, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to update leave record status", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("LeaveRecord", id.String())
	}

	changes, _ := json.Marshal(map[string]any{"status": req.Status})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:leave_record_status",
		EntityType: "leave_record",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// DeleteLeaveRecord deletes a leave record by ID.
func (s *RosterService) DeleteLeaveRecord(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM leave_records WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete leave record", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("LeaveRecord", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:leave_record",
		EntityType: "leave_record",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Capacity Allocations
// ──────────────────────────────────────────────

// CreateCapacityAllocation creates a new capacity allocation.
func (s *RosterService) CreateCapacityAllocation(ctx context.Context, req CreateCapacityAllocationRequest) (CapacityAllocation, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CapacityAllocation{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO capacity_allocations (
			id, tenant_id, user_id, project_id, allocation_pct,
			period_start, period_end, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9
		)
		RETURNING id, tenant_id, user_id, project_id, allocation_pct,
			period_start, period_end, created_at, updated_at`

	var ca CapacityAllocation
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.UserID, req.ProjectID, req.AllocationPct,
		req.PeriodStart, req.PeriodEnd, now, now,
	).Scan(
		&ca.ID, &ca.TenantID, &ca.UserID, &ca.ProjectID, &ca.AllocationPct,
		&ca.PeriodStart, &ca.PeriodEnd, &ca.CreatedAt, &ca.UpdatedAt,
	)
	if err != nil {
		return CapacityAllocation{}, apperrors.Internal("failed to create capacity allocation", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"userId":        req.UserID,
		"allocationPct": req.AllocationPct,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:capacity_allocation",
		EntityType: "capacity_allocation",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ca, nil
}

// ListCapacityAllocations returns a filtered, paginated list of capacity allocations.
func (s *RosterService) ListCapacityAllocations(ctx context.Context, userID, projectID *uuid.UUID, page, limit int) ([]CapacityAllocation, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM capacity_allocations
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR user_id = $2)
			AND ($3::uuid IS NULL OR project_id = $3)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, userID, projectID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count capacity allocations", err)
	}

	dataQuery := `
		SELECT id, tenant_id, user_id, project_id, allocation_pct,
			period_start, period_end, created_at, updated_at
		FROM capacity_allocations
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR user_id = $2)
			AND ($3::uuid IS NULL OR project_id = $3)
		ORDER BY period_start DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, userID, projectID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list capacity allocations", err)
	}
	defer rows.Close()

	var allocations []CapacityAllocation
	for rows.Next() {
		var ca CapacityAllocation
		if err := rows.Scan(
			&ca.ID, &ca.TenantID, &ca.UserID, &ca.ProjectID, &ca.AllocationPct,
			&ca.PeriodStart, &ca.PeriodEnd, &ca.CreatedAt, &ca.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan capacity allocation", err)
		}
		allocations = append(allocations, ca)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate capacity allocations", err)
	}

	if allocations == nil {
		allocations = []CapacityAllocation{}
	}

	return allocations, total, nil
}

// UpdateCapacityAllocation updates a capacity allocation using COALESCE partial update.
func (s *RosterService) UpdateCapacityAllocation(ctx context.Context, id uuid.UUID, req UpdateCapacityAllocationRequest) (CapacityAllocation, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CapacityAllocation{}, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE capacity_allocations SET
			project_id = COALESCE($1, project_id),
			allocation_pct = COALESCE($2, allocation_pct),
			period_start = COALESCE($3, period_start),
			period_end = COALESCE($4, period_end),
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7
		RETURNING id, tenant_id, user_id, project_id, allocation_pct,
			period_start, period_end, created_at, updated_at`

	var ca CapacityAllocation
	err := s.pool.QueryRow(ctx, updateQuery,
		req.ProjectID, req.AllocationPct, req.PeriodStart,
		req.PeriodEnd, now, id, auth.TenantID,
	).Scan(
		&ca.ID, &ca.TenantID, &ca.UserID, &ca.ProjectID, &ca.AllocationPct,
		&ca.PeriodStart, &ca.PeriodEnd, &ca.CreatedAt, &ca.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return CapacityAllocation{}, apperrors.NotFound("CapacityAllocation", id.String())
		}
		return CapacityAllocation{}, apperrors.Internal("failed to update capacity allocation", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:capacity_allocation",
		EntityType: "capacity_allocation",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ca, nil
}

// DeleteCapacityAllocation deletes a capacity allocation by ID.
func (s *RosterService) DeleteCapacityAllocation(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM capacity_allocations WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete capacity allocation", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CapacityAllocation", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:capacity_allocation",
		EntityType: "capacity_allocation",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}
