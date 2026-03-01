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

// ──────────────────────────────────────────────
// UserService
// ──────────────────────────────────────────────

// UserService handles business logic for user management.
type UserService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewUserService creates a new UserService.
func NewUserService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *UserService {
	return &UserService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanUserDetail(row pgx.Row) (UserDetail, error) {
	var u UserDetail
	err := row.Scan(
		&u.ID, &u.EntraID, &u.Email, &u.DisplayName, &u.JobTitle,
		&u.Department, &u.Office, &u.Unit, &u.TenantID, &u.TenantName,
		&u.PhotoURL, &u.Phone, &u.IsActive, &u.LastLoginAt,
		&u.Metadata, &u.CreatedAt, &u.UpdatedAt,
	)
	return u, err
}

func scanUserDetails(rows pgx.Rows) ([]UserDetail, error) {
	var users []UserDetail
	for rows.Next() {
		var u UserDetail
		if err := rows.Scan(
			&u.ID, &u.EntraID, &u.Email, &u.DisplayName, &u.JobTitle,
			&u.Department, &u.Office, &u.Unit, &u.TenantID, &u.TenantName,
			&u.PhotoURL, &u.Phone, &u.IsActive, &u.LastLoginAt,
			&u.Metadata, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if users == nil {
		users = []UserDetail{}
	}
	return users, nil
}

func scanRoleBinding(row pgx.Row) (RoleBinding, error) {
	var rb RoleBinding
	err := row.Scan(
		&rb.ID, &rb.UserID, &rb.RoleID, &rb.RoleName,
		&rb.TenantID, &rb.ScopeType, &rb.ScopeID,
		&rb.GrantedBy, &rb.GrantedAt, &rb.ExpiresAt, &rb.IsActive,
	)
	return rb, err
}

func scanRoleBindings(rows pgx.Rows) ([]RoleBinding, error) {
	var bindings []RoleBinding
	for rows.Next() {
		var rb RoleBinding
		if err := rows.Scan(
			&rb.ID, &rb.UserID, &rb.RoleID, &rb.RoleName,
			&rb.TenantID, &rb.ScopeType, &rb.ScopeID,
			&rb.GrantedBy, &rb.GrantedAt, &rb.ExpiresAt, &rb.IsActive,
		); err != nil {
			return nil, err
		}
		bindings = append(bindings, rb)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if bindings == nil {
		bindings = []RoleBinding{}
	}
	return bindings, nil
}

func scanDelegations(rows pgx.Rows) ([]Delegation, error) {
	var delegations []Delegation
	for rows.Next() {
		var d Delegation
		if err := rows.Scan(
			&d.ID, &d.DelegatorID, &d.DelegatorName,
			&d.DelegateID, &d.DelegateName,
			&d.RoleID, &d.RoleName, &d.TenantID,
			&d.Reason, &d.ApprovedBy, &d.StartsAt, &d.EndsAt,
			&d.IsActive, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		delegations = append(delegations, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if delegations == nil {
		delegations = []Delegation{}
	}
	return delegations, nil
}

// ──────────────────────────────────────────────
// User CRUD
// ──────────────────────────────────────────────

// ListUsers returns a paginated list of users matching the given filters.
func (s *UserService) ListUsers(ctx context.Context, tenantID uuid.UUID, params ListUsersParams) ([]UserDetail, int64, error) {
	// Defaults.
	if params.Status == "" {
		params.Status = "all"
	}
	if params.SortBy == "" {
		params.SortBy = "createdAt"
	}
	if params.SortOrder == "" {
		params.SortOrder = "desc"
	}
	if params.PageSize <= 0 || params.PageSize > 100 {
		params.PageSize = 20
	}
	if params.Page <= 0 {
		params.Page = 1
	}

	offset := (params.Page - 1) * params.PageSize

	// Count.
	countQuery := `
		SELECT COUNT(*) FROM users u
		WHERE u.tenant_id = $1
		  AND ($2::text = 'all' OR ($2::text = 'active' AND u.is_active = true) OR ($2::text = 'inactive' AND u.is_active = false))
		  AND ($3::text = '' OR u.display_name ILIKE '%' || $3::text || '%' OR u.email ILIKE '%' || $3::text || '%')
		  AND ($4::text = '' OR u.department = $4::text)
		  AND ($5::text = '' OR EXISTS (
		       SELECT 1 FROM role_bindings rb JOIN roles r ON r.id = rb.role_id
		       WHERE rb.user_id = u.id AND rb.is_active = true AND r.name = $5::text))`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery,
		tenantID, params.Status, params.Search, params.Department, params.RoleFilter,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	// Data.
	dataQuery := `
		SELECT u.id, u.entra_id, u.email, u.display_name, u.job_title,
		       u.department, u.office, u.unit, u.tenant_id, t.name AS tenant_name,
		       u.photo_url, u.phone, u.is_active, u.last_login_at,
		       u.metadata, u.created_at, u.updated_at
		FROM users u
		JOIN tenants t ON t.id = u.tenant_id
		WHERE u.tenant_id = $1
		  AND ($2::text = 'all' OR ($2::text = 'active' AND u.is_active = true) OR ($2::text = 'inactive' AND u.is_active = false))
		  AND ($3::text = '' OR u.display_name ILIKE '%' || $3::text || '%' OR u.email ILIKE '%' || $3::text || '%')
		  AND ($4::text = '' OR u.department = $4::text)
		  AND ($5::text = '' OR EXISTS (
		       SELECT 1 FROM role_bindings rb JOIN roles r ON r.id = rb.role_id
		       WHERE rb.user_id = u.id AND rb.is_active = true AND r.name = $5::text))
		ORDER BY
		  CASE WHEN $6::text = 'name' AND $7::text = 'asc' THEN u.display_name END ASC,
		  CASE WHEN $6::text = 'name' AND $7::text = 'desc' THEN u.display_name END DESC,
		  CASE WHEN $6::text = 'email' AND $7::text = 'asc' THEN u.email END ASC,
		  CASE WHEN $6::text = 'email' AND $7::text = 'desc' THEN u.email END DESC,
		  CASE WHEN $6::text = 'lastLoginAt' AND $7::text = 'asc' THEN u.last_login_at END ASC,
		  CASE WHEN $6::text = 'lastLoginAt' AND $7::text = 'desc' THEN u.last_login_at END DESC,
		  CASE WHEN $6::text = 'createdAt' AND $7::text = 'asc' THEN u.created_at END ASC,
		  CASE WHEN $6::text = 'createdAt' AND $7::text = 'desc' THEN u.created_at END DESC,
		  u.created_at DESC
		LIMIT $8 OFFSET $9`

	rows, err := s.pool.Query(ctx, dataQuery,
		tenantID, params.Status, params.Search, params.Department, params.RoleFilter,
		params.SortBy, params.SortOrder,
		params.PageSize, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	users, err := scanUserDetails(rows)
	if err != nil {
		return nil, 0, fmt.Errorf("scan users: %w", err)
	}

	return users, total, nil
}

// CreateUser creates a new user with a default password hash.
func (s *UserService) CreateUser(ctx context.Context, tenantID uuid.UUID, req CreateUserRequest) (*UserDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validate required fields.
	if req.Email == "" {
		return nil, apperrors.BadRequest("email is required")
	}
	if req.DisplayName == "" {
		return nil, apperrors.BadRequest("displayName is required")
	}

	// Check for duplicate email.
	var exists bool
	err := s.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("check existing email: %w", err)
	}
	if exists {
		return nil, apperrors.Conflict("a user with this email already exists")
	}

	// Insert user with default password hash.
	defaultPwdHash := "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
	var newID uuid.UUID
	err = s.pool.QueryRow(ctx, `
		INSERT INTO users (email, display_name, entra_id, job_title, department, office, unit, tenant_id, password_hash)
		VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
		RETURNING id`,
		req.Email, req.DisplayName,
		ptrStr(req.JobTitle), ptrStr(req.Department),
		ptrStr(req.Office), ptrStr(req.Unit),
		tenantID, defaultPwdHash,
	).Scan(&newID)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "user.created",
		EntityType:    "user",
		EntityID:      newID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	// Return full user detail.
	return s.GetUser(ctx, tenantID, newID)
}

// GetUser returns a single user with their roles and delegations.
func (s *UserService) GetUser(ctx context.Context, tenantID, userID uuid.UUID) (*UserDetail, error) {
	query := `
		SELECT u.id, u.entra_id, u.email, u.display_name, u.job_title,
		       u.department, u.office, u.unit, u.tenant_id, t.name AS tenant_name,
		       u.photo_url, u.phone, u.is_active, u.last_login_at,
		       u.metadata, u.created_at, u.updated_at
		FROM users u
		JOIN tenants t ON t.id = u.tenant_id
		WHERE u.id = $1 AND u.tenant_id = $2`

	user, err := scanUserDetail(s.pool.QueryRow(ctx, query, userID, tenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("user", userID.String())
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	// Fetch role bindings.
	rbQuery := `
		SELECT rb.id, rb.user_id, rb.role_id, r.name AS role_name,
		       rb.tenant_id, rb.scope_type::text, rb.scope_id,
		       rb.granted_by, rb.granted_at, rb.expires_at, rb.is_active
		FROM role_bindings rb
		JOIN roles r ON r.id = rb.role_id
		WHERE rb.user_id = $1 AND rb.is_active = true
		  AND (rb.expires_at IS NULL OR rb.expires_at > NOW())
		ORDER BY rb.granted_at DESC`

	rbRows, err := s.pool.Query(ctx, rbQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("get user roles: %w", err)
	}
	defer rbRows.Close()

	user.Roles, err = scanRoleBindings(rbRows)
	if err != nil {
		return nil, fmt.Errorf("scan user roles: %w", err)
	}

	// Fetch delegations.
	dQuery := `
		SELECT d.id, d.delegator_id, delegator.display_name AS delegator_name,
		       d.delegate_id, delegate.display_name AS delegate_name,
		       d.role_id, r.name AS role_name, d.tenant_id,
		       d.reason, d.approved_by, d.starts_at, d.ends_at,
		       d.is_active, d.created_at
		FROM delegations d
		JOIN users delegator ON delegator.id = d.delegator_id
		JOIN users delegate ON delegate.id = d.delegate_id
		JOIN roles r ON r.id = d.role_id
		WHERE (d.delegator_id = $1 OR d.delegate_id = $1)
		  AND d.tenant_id = $2 AND d.is_active = true
		ORDER BY d.created_at DESC`

	dRows, err := s.pool.Query(ctx, dQuery, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get user delegations: %w", err)
	}
	defer dRows.Close()

	user.Delegations, err = scanDelegations(dRows)
	if err != nil {
		return nil, fmt.Errorf("scan user delegations: %w", err)
	}

	return &user, nil
}

// UpdateUser updates mutable user fields.
func (s *UserService) UpdateUser(ctx context.Context, tenantID, userID uuid.UUID, req UpdateUserRequest) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Verify user exists.
	existing, err := s.GetUser(ctx, tenantID, userID)
	if err != nil {
		return err
	}

	query := `
		UPDATE users SET
		  display_name = COALESCE(NULLIF($3, ''), display_name),
		  job_title = COALESCE(NULLIF($4, ''), job_title),
		  department = COALESCE(NULLIF($5, ''), department),
		  office = COALESCE(NULLIF($6, ''), office),
		  unit = COALESCE(NULLIF($7, ''), unit),
		  phone = COALESCE(NULLIF($8, ''), phone),
		  updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2`

	_, err = s.pool.Exec(ctx, query,
		userID, tenantID,
		ptrStr(req.DisplayName), ptrStr(req.JobTitle),
		ptrStr(req.Department), ptrStr(req.Office),
		ptrStr(req.Unit), ptrStr(req.Phone),
	)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "user.updated",
		EntityType:    "user",
		EntityID:      userID,
		Changes:       changes,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// DeactivateUser deactivates a user and revokes all their active role bindings.
func (s *UserService) DeactivateUser(ctx context.Context, tenantID, userID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Prevent self-deactivation.
	if auth.UserID == userID {
		return apperrors.BadRequest("cannot deactivate yourself")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		"UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2",
		userID, tenantID,
	)
	if err != nil {
		return fmt.Errorf("deactivate user: %w", err)
	}

	_, err = tx.Exec(ctx,
		"UPDATE role_bindings SET is_active = false WHERE user_id = $1 AND is_active = true",
		userID,
	)
	if err != nil {
		return fmt.Errorf("revoke user roles: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "user.deactivated",
		EntityType:    "user",
		EntityID:      userID,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// ReactivateUser reactivates a previously deactivated user.
func (s *UserService) ReactivateUser(ctx context.Context, tenantID, userID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	_, err := s.pool.Exec(ctx,
		"UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2",
		userID, tenantID,
	)
	if err != nil {
		return fmt.Errorf("reactivate user: %w", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "user.reactivated",
		EntityType:    "user",
		EntityID:      userID,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// ──────────────────────────────────────────────
// Role Binding Operations
// ──────────────────────────────────────────────

// AssignRole assigns a role to a user with scope.
func (s *UserService) AssignRole(ctx context.Context, tenantID, userID uuid.UUID, req AssignRoleRequest) (*RoleBinding, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if req.RoleID == uuid.Nil {
		return nil, apperrors.BadRequest("roleId is required")
	}

	// Default scope type.
	if req.ScopeType == "" {
		req.ScopeType = "tenant"
	}

	// Check for duplicate binding.
	var existing int64
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM role_bindings
		WHERE user_id = $1 AND role_id = $2 AND tenant_id = $3
		  AND scope_type = $4::scope_type
		  AND COALESCE(scope_id, '00000000-0000-0000-0000-000000000000') = COALESCE($5, '00000000-0000-0000-0000-000000000000')
		  AND is_active = true`,
		userID, req.RoleID, tenantID, req.ScopeType, req.ScopeID,
	).Scan(&existing)
	if err != nil {
		return nil, fmt.Errorf("check existing binding: %w", err)
	}
	if existing > 0 {
		return nil, apperrors.Conflict("user already has this role binding")
	}

	// Insert.
	row := s.pool.QueryRow(ctx, `
		INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, expires_at)
		VALUES ($1, $2, $3, $4::scope_type, $5, $6, $7)
		RETURNING id, user_id, role_id, tenant_id, scope_type::text, scope_id, granted_by, granted_at, expires_at, is_active`,
		userID, req.RoleID, tenantID, req.ScopeType, req.ScopeID, auth.UserID, req.ExpiresAt,
	)

	var rb RoleBinding
	err = row.Scan(
		&rb.ID, &rb.UserID, &rb.RoleID, &rb.TenantID,
		&rb.ScopeType, &rb.ScopeID, &rb.GrantedBy,
		&rb.GrantedAt, &rb.ExpiresAt, &rb.IsActive,
	)
	if err != nil {
		return nil, fmt.Errorf("assign role: %w", err)
	}

	// Fetch role name for response.
	_ = s.pool.QueryRow(ctx, "SELECT name FROM roles WHERE id = $1", req.RoleID).Scan(&rb.RoleName)

	changes, _ := json.Marshal(map[string]any{
		"roleId": req.RoleID, "scopeType": req.ScopeType, "scopeId": req.ScopeID,
	})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "role.assigned",
		EntityType:    "user",
		EntityID:      userID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return &rb, nil
}

// RevokeRole revokes a role binding from a user.
func (s *UserService) RevokeRole(ctx context.Context, tenantID, userID, bindingID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tag, err := s.pool.Exec(ctx,
		"UPDATE role_bindings SET is_active = false WHERE id = $1 AND user_id = $2 AND is_active = true",
		bindingID, userID,
	)
	if err != nil {
		return fmt.Errorf("revoke role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("role_binding", bindingID.String())
	}

	changes, _ := json.Marshal(map[string]any{"bindingId": bindingID})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "role.revoked",
		EntityType:    "user",
		EntityID:      userID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// ──────────────────────────────────────────────
// Delegation Operations
// ──────────────────────────────────────────────

// GetUserDelegations returns all active delegations involving the user.
func (s *UserService) GetUserDelegations(ctx context.Context, tenantID, userID uuid.UUID) ([]Delegation, error) {
	query := `
		SELECT d.id, d.delegator_id, delegator.display_name AS delegator_name,
		       d.delegate_id, delegate.display_name AS delegate_name,
		       d.role_id, r.name AS role_name, d.tenant_id,
		       d.reason, d.approved_by, d.starts_at, d.ends_at,
		       d.is_active, d.created_at
		FROM delegations d
		JOIN users delegator ON delegator.id = d.delegator_id
		JOIN users delegate ON delegate.id = d.delegate_id
		JOIN roles r ON r.id = d.role_id
		WHERE (d.delegator_id = $1 OR d.delegate_id = $1)
		  AND d.tenant_id = $2 AND d.is_active = true
		ORDER BY d.created_at DESC`

	rows, err := s.pool.Query(ctx, query, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get delegations: %w", err)
	}
	defer rows.Close()

	return scanDelegations(rows)
}

// CreateDelegation creates a time-bound role delegation.
func (s *UserService) CreateDelegation(ctx context.Context, tenantID, delegatorID uuid.UUID, req CreateDelegationRequest) (*Delegation, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validations.
	if req.DelegateID == uuid.Nil {
		return nil, apperrors.BadRequest("delegateId is required")
	}
	if req.RoleID == uuid.Nil {
		return nil, apperrors.BadRequest("roleId is required")
	}
	if req.Reason == "" {
		return nil, apperrors.BadRequest("reason is required")
	}
	if delegatorID == req.DelegateID {
		return nil, apperrors.BadRequest("cannot delegate to yourself")
	}
	if req.EndsAt.Before(req.StartsAt) {
		return nil, apperrors.BadRequest("endsAt must be after startsAt")
	}
	if req.EndsAt.Before(time.Now().UTC()) {
		return nil, apperrors.BadRequest("endsAt must be in the future")
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO delegations (delegator_id, delegate_id, role_id, tenant_id, reason, starts_at, ends_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, delegator_id, delegate_id, role_id, tenant_id, reason, approved_by, starts_at, ends_at, is_active, created_at`,
		delegatorID, req.DelegateID, req.RoleID, tenantID, req.Reason, req.StartsAt, req.EndsAt,
	)

	var d Delegation
	err := row.Scan(
		&d.ID, &d.DelegatorID, &d.DelegateID, &d.RoleID,
		&d.TenantID, &d.Reason, &d.ApprovedBy,
		&d.StartsAt, &d.EndsAt, &d.IsActive, &d.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create delegation: %w", err)
	}

	// Fetch display names for response.
	_ = s.pool.QueryRow(ctx, "SELECT display_name FROM users WHERE id = $1", delegatorID).Scan(&d.DelegatorName)
	_ = s.pool.QueryRow(ctx, "SELECT display_name FROM users WHERE id = $1", req.DelegateID).Scan(&d.DelegateName)
	_ = s.pool.QueryRow(ctx, "SELECT name FROM roles WHERE id = $1", req.RoleID).Scan(&d.RoleName)

	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "delegation.created",
		EntityType:    "delegation",
		EntityID:      d.ID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return &d, nil
}

// RevokeDelegation revokes an active delegation.
func (s *UserService) RevokeDelegation(ctx context.Context, tenantID, delegationID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tag, err := s.pool.Exec(ctx,
		"UPDATE delegations SET is_active = false WHERE id = $1 AND tenant_id = $2 AND is_active = true",
		delegationID, tenantID,
	)
	if err != nil {
		return fmt.Errorf("revoke delegation: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("delegation", delegationID.String())
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      tenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "delegation.revoked",
		EntityType:    "delegation",
		EntityID:      delegationID,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// ──────────────────────────────────────────────
// Search
// ──────────────────────────────────────────────

// SearchUsers performs a quick search for user autocomplete.
func (s *UserService) SearchUsers(ctx context.Context, tenantID uuid.UUID, query string) ([]UserSearchResult, error) {
	sqlQuery := `
		SELECT id, display_name, email, photo_url, department, is_active
		FROM users
		WHERE tenant_id = $1 AND is_active = true
		  AND (display_name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')
		ORDER BY display_name
		LIMIT 20`

	rows, err := s.pool.Query(ctx, sqlQuery, tenantID, query)
	if err != nil {
		return nil, fmt.Errorf("search users: %w", err)
	}
	defer rows.Close()

	var results []UserSearchResult
	for rows.Next() {
		var u UserSearchResult
		if err := rows.Scan(&u.ID, &u.DisplayName, &u.Email, &u.PhotoURL, &u.Department, &u.IsActive); err != nil {
			return nil, err
		}
		results = append(results, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []UserSearchResult{}
	}
	return results, nil
}

// CountActiveUsers returns the count of active users for the tenant.
func (s *UserService) CountActiveUsers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	var count int64
	err := s.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true",
		tenantID,
	).Scan(&count)
	return count, err
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func firstRole(roles []string) string {
	if len(roles) > 0 {
		return roles[0]
	}
	return "unknown"
}
