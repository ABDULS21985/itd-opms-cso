package system

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// OrgService
// ──────────────────────────────────────────────

// OrgService handles business logic for org unit management.
type OrgService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewOrgService creates a new OrgService.
func NewOrgService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *OrgService {
	return &OrgService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanOrgUnitDetail(row pgx.Row) (OrgUnitDetail, error) {
	var o OrgUnitDetail
	err := row.Scan(
		&o.ID, &o.TenantID, &o.Name, &o.Code, &o.Level,
		&o.ParentID, &o.ParentName,
		&o.ManagerUserID, &o.ManagerName,
		&o.IsActive, &o.Metadata,
		&o.CreatedAt, &o.UpdatedAt,
		&o.ChildCount, &o.UserCount,
	)
	return o, err
}

func scanOrgUnitDetails(rows pgx.Rows) ([]OrgUnitDetail, error) {
	var units []OrgUnitDetail
	for rows.Next() {
		var o OrgUnitDetail
		if err := rows.Scan(
			&o.ID, &o.TenantID, &o.Name, &o.Code, &o.Level,
			&o.ParentID, &o.ParentName,
			&o.ManagerUserID, &o.ManagerName,
			&o.IsActive, &o.Metadata,
			&o.CreatedAt, &o.UpdatedAt,
			&o.ChildCount, &o.UserCount,
		); err != nil {
			return nil, err
		}
		units = append(units, o)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if units == nil {
		units = []OrgUnitDetail{}
	}
	return units, nil
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────

// ListOrgUnits returns paginated org units for a tenant.
func (s *OrgService) ListOrgUnits(ctx context.Context, tenantID uuid.UUID, page, pageSize int) ([]OrgUnitDetail, int64, error) {
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT o.id, o.tenant_id, o.name, o.code, o.level::text,
		       o.parent_id, COALESCE(p.name, '') AS parent_name,
		       o.manager_user_id, COALESCE(m.display_name, '') AS manager_name,
		       o.is_active, o.metadata, o.created_at, o.updated_at,
		       (SELECT COUNT(*) FROM org_units c WHERE c.parent_id = o.id) AS child_count,
		       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = o.tenant_id AND u.department = o.name AND u.is_active = true) AS user_count
		FROM org_units o
		LEFT JOIN org_units p ON p.id = o.parent_id
		LEFT JOIN users m ON m.id = o.manager_user_id
		WHERE o.tenant_id = $1
		ORDER BY o.level, o.name ASC
		LIMIT $2 OFFSET $3`

	rows, err := s.pool.Query(ctx, query, tenantID, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list org units: %w", err)
	}
	defer rows.Close()

	units, err := scanOrgUnitDetails(rows)
	if err != nil {
		return nil, 0, err
	}

	var total int64
	err = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM org_units WHERE tenant_id = $1", tenantID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count org units: %w", err)
	}

	return units, total, nil
}

// GetOrgUnit returns a single org unit with detail.
func (s *OrgService) GetOrgUnit(ctx context.Context, tenantID, orgUnitID uuid.UUID) (*OrgUnitDetail, error) {
	query := `
		SELECT o.id, o.tenant_id, o.name, o.code, o.level::text,
		       o.parent_id, COALESCE(p.name, '') AS parent_name,
		       o.manager_user_id, COALESCE(m.display_name, '') AS manager_name,
		       o.is_active, o.metadata, o.created_at, o.updated_at,
		       (SELECT COUNT(*) FROM org_units c WHERE c.parent_id = o.id) AS child_count,
		       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = o.tenant_id AND u.department = o.name AND u.is_active = true) AS user_count
		FROM org_units o
		LEFT JOIN org_units p ON p.id = o.parent_id
		LEFT JOIN users m ON m.id = o.manager_user_id
		WHERE o.id = $1 AND o.tenant_id = $2`

	unit, err := scanOrgUnitDetail(s.pool.QueryRow(ctx, query, orgUnitID, tenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("org_unit", orgUnitID.String())
		}
		return nil, fmt.Errorf("get org unit: %w", err)
	}

	return &unit, nil
}

// GetOrgTree returns the full org tree for a tenant (flat list with parent_id for frontend tree building).
func (s *OrgService) GetOrgTree(ctx context.Context, tenantID uuid.UUID) ([]OrgTreeNode, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.name, o.code, o.level::text, o.parent_id,
		       COALESCE(m.display_name, '') AS manager_name,
		       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = o.tenant_id AND u.department = o.name AND u.is_active = true) AS user_count
		FROM org_units o
		LEFT JOIN users m ON m.id = o.manager_user_id
		WHERE o.tenant_id = $1 AND o.is_active = true
		ORDER BY o.level, o.name ASC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get org tree: %w", err)
	}
	defer rows.Close()

	type flatNode struct {
		OrgTreeNode
		ParentID *uuid.UUID
	}

	var nodes []flatNode
	nodeMap := make(map[uuid.UUID]*OrgTreeNode)

	for rows.Next() {
		var n flatNode
		if err := rows.Scan(&n.ID, &n.Name, &n.Code, &n.Level, &n.ParentID, &n.ManagerName, &n.UserCount); err != nil {
			return nil, err
		}
		n.Children = []OrgTreeNode{}
		nodes = append(nodes, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Build tree.
	var roots []OrgTreeNode
	for i := range nodes {
		nodeMap[nodes[i].ID] = &nodes[i].OrgTreeNode
	}
	for i := range nodes {
		if nodes[i].ParentID != nil {
			if parent, ok := nodeMap[*nodes[i].ParentID]; ok {
				parent.Children = append(parent.Children, nodes[i].OrgTreeNode)
				continue
			}
		}
		roots = append(roots, nodes[i].OrgTreeNode)
	}

	if roots == nil {
		roots = []OrgTreeNode{}
	}
	return roots, nil
}

// CreateOrgUnit creates a new org unit. The org_hierarchy closure table is
// populated automatically by the database trigger on org_units INSERT.
func (s *OrgService) CreateOrgUnit(ctx context.Context, tenantID uuid.UUID, req CreateOrgUnitRequest) (*OrgUnitDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validations.
	if req.Name == "" {
		return nil, apperrors.BadRequest("name is required")
	}
	if req.Code == "" {
		return nil, apperrors.BadRequest("code is required")
	}
	if req.Level == "" {
		return nil, apperrors.BadRequest("level is required")
	}
	validLevels := map[string]bool{
		"directorate": true, "department": true, "division": true,
		"office": true, "unit": true, "team": true, "section": true,
	}
	if !validLevels[req.Level] {
		return nil, apperrors.BadRequest("level must be one of: directorate, department, division, office, unit, team, section")
	}

	// Check for duplicate code within tenant.
	var existingID uuid.UUID
	err := s.pool.QueryRow(ctx, "SELECT id FROM org_units WHERE tenant_id = $1 AND code = $2", tenantID, req.Code).Scan(&existingID)
	if err == nil {
		return nil, apperrors.Conflict("org unit with code '" + req.Code + "' already exists in this tenant")
	}
	if err != pgx.ErrNoRows {
		return nil, fmt.Errorf("check org unit code: %w", err)
	}

	// Validate parent exists within same tenant if specified.
	if req.ParentID != nil {
		var parentTenant uuid.UUID
		err = s.pool.QueryRow(ctx, "SELECT tenant_id FROM org_units WHERE id = $1", *req.ParentID).Scan(&parentTenant)
		if err != nil {
			if err == pgx.ErrNoRows {
				return nil, apperrors.BadRequest("parent org unit not found")
			}
			return nil, fmt.Errorf("check parent org unit: %w", err)
		}
		if parentTenant != tenantID {
			return nil, apperrors.BadRequest("parent org unit must belong to the same tenant")
		}
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO org_units (tenant_id, name, code, level, parent_id, manager_user_id, metadata)
		VALUES ($1, $2, $3, $4::org_level_type, $5, $6, '{}')
		RETURNING id`,
		tenantID, req.Name, req.Code, req.Level, req.ParentID, req.ManagerUserID,
	)

	var newID uuid.UUID
	if err := row.Scan(&newID); err != nil {
		return nil, fmt.Errorf("create org unit: %w", err)
	}

	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "org_unit.created",
		EntityType:    "org_unit",
		EntityID:      newID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return s.GetOrgUnit(ctx, tenantID, newID)
}

// UpdateOrgUnit updates an org unit's name, manager, or active status.
func (s *OrgService) UpdateOrgUnit(ctx context.Context, tenantID, orgUnitID uuid.UUID, req UpdateOrgUnitRequest) (*OrgUnitDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetOrgUnit(ctx, tenantID, orgUnitID)
	if err != nil {
		return nil, err
	}

	name := ""
	if req.Name != nil {
		name = *req.Name
	}

	updateManager := req.ManagerUserID != nil
	updateActive := req.IsActive != nil
	isActive := false
	if updateActive {
		isActive = *req.IsActive
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE org_units SET
		  name = COALESCE(NULLIF($3, ''), name),
		  manager_user_id = CASE WHEN $4::boolean THEN $5 ELSE manager_user_id END,
		  is_active = CASE WHEN $6::boolean THEN $7 ELSE is_active END
		WHERE id = $1 AND tenant_id = $2`,
		orgUnitID, tenantID, name, updateManager, req.ManagerUserID, updateActive, isActive,
	)
	if err != nil {
		return nil, fmt.Errorf("update org unit: %w", err)
	}

	changes, _ := json.Marshal(req)
	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "org_unit.updated",
		EntityType:    "org_unit",
		EntityID:      orgUnitID,
		Changes:       changes,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return s.GetOrgUnit(ctx, tenantID, orgUnitID)
}

// MoveOrgUnit moves an org unit to a new parent, updating the org_hierarchy closure table.
func (s *OrgService) MoveOrgUnit(ctx context.Context, tenantID, orgUnitID, newParentID uuid.UUID) (*OrgUnitDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetOrgUnit(ctx, tenantID, orgUnitID)
	if err != nil {
		return nil, err
	}

	// Cannot move to self.
	if orgUnitID == newParentID {
		return nil, apperrors.BadRequest("cannot move org unit to itself")
	}

	// Validate new parent exists in same tenant.
	var parentTenant uuid.UUID
	err = s.pool.QueryRow(ctx, "SELECT tenant_id FROM org_units WHERE id = $1", newParentID).Scan(&parentTenant)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.BadRequest("new parent org unit not found")
		}
		return nil, fmt.Errorf("check new parent: %w", err)
	}
	if parentTenant != tenantID {
		return nil, apperrors.BadRequest("new parent must belong to the same tenant")
	}

	// Prevent circular reference: new parent cannot be a descendant of this org unit.
	var isDescendant bool
	err = s.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM org_hierarchy WHERE ancestor_id = $1 AND descendant_id = $2 AND depth > 0)",
		orgUnitID, newParentID,
	).Scan(&isDescendant)
	if err != nil {
		return nil, fmt.Errorf("check circular reference: %w", err)
	}
	if isDescendant {
		return nil, apperrors.BadRequest("cannot move org unit under its own descendant (circular reference)")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update parent_id.
	_, err = tx.Exec(ctx, "UPDATE org_units SET parent_id = $1 WHERE id = $2 AND tenant_id = $3",
		newParentID, orgUnitID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("move org unit: %w", err)
	}

	// Rebuild closure table: remove old ancestor paths (keep self-reference).
	_, err = tx.Exec(ctx,
		"DELETE FROM org_hierarchy WHERE descendant_id = $1 AND ancestor_id != $1",
		orgUnitID)
	if err != nil {
		return nil, fmt.Errorf("delete old hierarchy: %w", err)
	}

	// Insert new ancestor paths from new parent.
	_, err = tx.Exec(ctx, `
		INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
		SELECT h.ancestor_id, $1, h.depth + 1
		FROM org_hierarchy h
		WHERE h.descendant_id = $2`,
		orgUnitID, newParentID)
	if err != nil {
		return nil, fmt.Errorf("insert new hierarchy: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	prev, _ := json.Marshal(existing)
	changes, _ := json.Marshal(map[string]any{"newParentId": newParentID})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "org_unit.moved",
		EntityType:    "org_unit",
		EntityID:      orgUnitID,
		Changes:       changes,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return s.GetOrgUnit(ctx, tenantID, orgUnitID)
}

// DeleteOrgUnit soft-deletes an org unit (only if it has no children and no assigned users).
func (s *OrgService) DeleteOrgUnit(ctx context.Context, tenantID, orgUnitID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetOrgUnit(ctx, tenantID, orgUnitID)
	if err != nil {
		return err
	}

	// Check for children.
	var childCount int64
	err = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM org_units WHERE parent_id = $1", orgUnitID).Scan(&childCount)
	if err != nil {
		return fmt.Errorf("count children: %w", err)
	}
	if childCount > 0 {
		return apperrors.Conflict(fmt.Sprintf("cannot delete org unit with %d child unit(s)", childCount))
	}

	// Check for assigned users.
	var userCount int64
	err = s.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND department = $2 AND is_active = true",
		tenantID, existing.Name,
	).Scan(&userCount)
	if err != nil {
		return fmt.Errorf("count users: %w", err)
	}
	if userCount > 0 {
		return apperrors.Conflict(fmt.Sprintf("cannot delete org unit with %d assigned user(s)", userCount))
	}

	// Soft delete.
	_, err = s.pool.Exec(ctx, "UPDATE org_units SET is_active = false WHERE id = $1 AND tenant_id = $2",
		orgUnitID, tenantID)
	if err != nil {
		return fmt.Errorf("delete org unit: %w", err)
	}

	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "org_unit.deleted",
		EntityType:    "org_unit",
		EntityID:      orgUnitID,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// GetOrgUnitUsers returns active users assigned to a specific org unit (matched by department name).
func (s *OrgService) GetOrgUnitUsers(ctx context.Context, tenantID, orgUnitID uuid.UUID) ([]UserSearchResult, error) {
	// Get org unit name for matching.
	var orgUnitName string
	err := s.pool.QueryRow(ctx, "SELECT name FROM org_units WHERE id = $1 AND tenant_id = $2", orgUnitID, tenantID).Scan(&orgUnitName)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("org_unit", orgUnitID.String())
		}
		return nil, fmt.Errorf("get org unit name: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.display_name, u.email, u.photo_url, u.department, u.is_active
		FROM users u
		WHERE u.tenant_id = $1
		  AND u.department = $2
		  AND u.is_active = true
		ORDER BY u.display_name ASC`,
		tenantID, orgUnitName)
	if err != nil {
		return nil, fmt.Errorf("get org unit users: %w", err)
	}
	defer rows.Close()

	var users []UserSearchResult
	for rows.Next() {
		var u UserSearchResult
		if err := rows.Scan(&u.ID, &u.DisplayName, &u.Email, &u.PhotoURL, &u.Department, &u.IsActive); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if users == nil {
		users = []UserSearchResult{}
	}
	return users, nil
}

// ──────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────

// GetOrgAnalytics returns aggregated organizational analytics.
func (s *OrgService) GetOrgAnalytics(ctx context.Context, tenantID uuid.UUID) (*OrgAnalyticsResponse, error) {
	resp := &OrgAnalyticsResponse{}

	// 1. Basic counts
	err := s.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE is_active = true) AS active,
			COUNT(*) FILTER (WHERE is_active = false) AS inactive,
			COALESCE(SUM(CASE WHEN is_active THEN (SELECT COUNT(*) FROM users u WHERE u.department = o.name AND u.tenant_id = o.tenant_id AND u.is_active = true) ELSE 0 END), 0) AS headcount
		FROM org_units o
		WHERE o.tenant_id = $1
	`, tenantID).Scan(&resp.TotalUnits, &resp.ActiveUnits, &resp.InactiveUnits, &resp.TotalHeadcount)
	if err != nil {
		return nil, fmt.Errorf("analytics basic counts: %w", err)
	}

	// 2. Max depth from closure table
	err = s.pool.QueryRow(ctx, `
		SELECT COALESCE(MAX(depth), 0)
		FROM org_hierarchy h
		JOIN org_units o ON o.id = h.descendant_id
		WHERE o.tenant_id = $1
	`, tenantID).Scan(&resp.MaxDepth)
	if err != nil {
		return nil, fmt.Errorf("analytics max depth: %w", err)
	}

	// 3. Average span of control (avg children per non-leaf node)
	err = s.pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(child_count), 0)
		FROM (
			SELECT parent_id, COUNT(*) AS child_count
			FROM org_units
			WHERE tenant_id = $1 AND parent_id IS NOT NULL AND is_active = true
			GROUP BY parent_id
		) sub
	`, tenantID).Scan(&resp.AvgSpanOfControl)
	if err != nil {
		return nil, fmt.Errorf("analytics span of control: %w", err)
	}

	// 4. Vacant leadership (units without a manager)
	if resp.ActiveUnits > 0 {
		var vacantCount int
		err = s.pool.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM org_units
			WHERE tenant_id = $1 AND is_active = true AND manager_user_id IS NULL
		`, tenantID).Scan(&vacantCount)
		if err != nil {
			return nil, fmt.Errorf("analytics vacant leadership: %w", err)
		}
		resp.VacantLeadership = float64(vacantCount) / float64(resp.ActiveUnits) * 100
	}

	// 5. Headcount by level
	rows, err := s.pool.Query(ctx, `
		SELECT o.level::text,
			COALESCE(SUM((SELECT COUNT(*) FROM users u WHERE u.department = o.name AND u.tenant_id = o.tenant_id AND u.is_active = true)), 0) AS headcount,
			COUNT(*) AS unit_count
		FROM org_units o
		WHERE o.tenant_id = $1 AND o.is_active = true
		GROUP BY o.level
		ORDER BY
			CASE o.level::text
				WHEN 'directorate' THEN 1
				WHEN 'department' THEN 2
				WHEN 'division' THEN 3
				WHEN 'office' THEN 4
				WHEN 'unit' THEN 5
				WHEN 'team' THEN 6
				WHEN 'section' THEN 7
			END
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("analytics headcount by level: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var lh LevelHeadcount
		if err := rows.Scan(&lh.Level, &lh.Count, &lh.UnitCount); err != nil {
			return nil, fmt.Errorf("scan headcount by level: %w", err)
		}
		resp.HeadcountByLevel = append(resp.HeadcountByLevel, lh)
	}

	// 6. Units by level (for chart)
	resp.UnitsByLevel = make([]LevelCount, 0)
	for _, lh := range resp.HeadcountByLevel {
		resp.UnitsByLevel = append(resp.UnitsByLevel, LevelCount{Level: lh.Level, Count: lh.UnitCount})
	}

	// 7. Span of control distribution
	spanRows, err := s.pool.Query(ctx, `
		SELECT
			CASE
				WHEN child_count BETWEEN 1 AND 3 THEN '1-3'
				WHEN child_count BETWEEN 4 AND 6 THEN '4-6'
				WHEN child_count BETWEEN 7 AND 10 THEN '7-10'
				ELSE '10+'
			END AS range,
			COUNT(*) AS cnt
		FROM (
			SELECT parent_id, COUNT(*) AS child_count
			FROM org_units
			WHERE tenant_id = $1 AND parent_id IS NOT NULL AND is_active = true
			GROUP BY parent_id
		) sub
		GROUP BY range
		ORDER BY MIN(child_count)
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("analytics span distribution: %w", err)
	}
	defer spanRows.Close()
	for spanRows.Next() {
		var sr SpanRange
		if err := spanRows.Scan(&sr.Range, &sr.Count); err != nil {
			return nil, fmt.Errorf("scan span distribution: %w", err)
		}
		resp.SpanDistribution = append(resp.SpanDistribution, sr)
	}

	// 8. Growth timeline (units created per month)
	growthRows, err := s.pool.Query(ctx, `
		SELECT
			TO_CHAR(created_at, 'YYYY-MM') AS month,
			COUNT(*) AS cnt
		FROM org_units
		WHERE tenant_id = $1
		GROUP BY month
		ORDER BY month
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("analytics growth timeline: %w", err)
	}
	defer growthRows.Close()
	cumulative := 0
	for growthRows.Next() {
		var gp OrgGrowthPoint
		var monthCount int
		if err := growthRows.Scan(&gp.Month, &monthCount); err != nil {
			return nil, fmt.Errorf("scan growth timeline: %w", err)
		}
		cumulative += monthCount
		gp.Cumulative = cumulative
		resp.GrowthTimeline = append(resp.GrowthTimeline, gp)
	}

	// 9. Recent changes from audit log
	changeRows, err := s.pool.Query(ctx, `
		SELECT
			a.action,
			COALESCE(a.changes->>'name', a.entity_id::text) AS unit_name,
			COALESCE(u.display_name, a.actor_id::text) AS changed_by,
			TO_CHAR(a.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS changed_at
		FROM audit_events a
		LEFT JOIN users u ON u.id = a.actor_id
		WHERE a.tenant_id = $1
			AND a.entity_type = 'org_unit'
		ORDER BY a.timestamp DESC
		LIMIT 10
	`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("analytics recent changes: %w", err)
	}
	defer changeRows.Close()
	for changeRows.Next() {
		var rc OrgRecentChange
		if err := changeRows.Scan(&rc.Action, &rc.UnitName, &rc.ChangedBy, &rc.ChangedAt); err != nil {
			return nil, fmt.Errorf("scan recent changes: %w", err)
		}
		resp.RecentChanges = append(resp.RecentChanges, rc)
	}

	// Ensure slices are not nil for JSON
	if resp.HeadcountByLevel == nil {
		resp.HeadcountByLevel = []LevelHeadcount{}
	}
	if resp.SpanDistribution == nil {
		resp.SpanDistribution = []SpanRange{}
	}
	if resp.UnitsByLevel == nil {
		resp.UnitsByLevel = []LevelCount{}
	}
	if resp.RecentChanges == nil {
		resp.RecentChanges = []OrgRecentChange{}
	}
	if resp.GrowthTimeline == nil {
		resp.GrowthTimeline = []OrgGrowthPoint{}
	}

	return resp, nil
}
