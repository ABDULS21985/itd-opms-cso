package people

import (
	"context"
	"encoding/json"
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
// Proficiency level ordering
// ──────────────────────────────────────────────

var proficiencyOrder = map[string]int{
	"beginner":     1,
	"intermediate": 2,
	"advanced":     3,
	"expert":       4,
}

// ──────────────────────────────────────────────
// SkillService
// ──────────────────────────────────────────────

// SkillService handles business logic for skills, user skills, role requirements, and gap analysis.
type SkillService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewSkillService creates a new SkillService.
func NewSkillService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *SkillService {
	return &SkillService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Skill Categories
// ──────────────────────────────────────────────

// CreateSkillCategory creates a new skill category.
func (s *SkillService) CreateSkillCategory(ctx context.Context, req CreateSkillCategoryRequest) (SkillCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SkillCategory{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO skill_categories (
			id, tenant_id, name, description, parent_id,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7
		)
		RETURNING id, tenant_id, name, description, parent_id,
			created_at, updated_at`

	var cat SkillCategory
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.ParentID,
		now, now,
	).Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.ParentID,
		&cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		return SkillCategory{}, apperrors.Internal("failed to create skill category", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:skill_category",
		EntityType: "skill_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cat, nil
}

// GetSkillCategory retrieves a single skill category by ID.
func (s *SkillService) GetSkillCategory(ctx context.Context, id uuid.UUID) (SkillCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SkillCategory{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, parent_id,
			created_at, updated_at
		FROM skill_categories
		WHERE id = $1 AND tenant_id = $2`

	var cat SkillCategory
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.ParentID,
		&cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return SkillCategory{}, apperrors.NotFound("SkillCategory", id.String())
		}
		return SkillCategory{}, apperrors.Internal("failed to get skill category", err)
	}

	return cat, nil
}

// ListSkillCategories returns skill categories, optionally filtered by parent. No pagination (tree).
func (s *SkillService) ListSkillCategories(ctx context.Context, parentID *uuid.UUID) ([]SkillCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, parent_id,
			created_at, updated_at
		FROM skill_categories
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR parent_id = $2)
		ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, parentID)
	if err != nil {
		return nil, apperrors.Internal("failed to list skill categories", err)
	}
	defer rows.Close()

	var categories []SkillCategory
	for rows.Next() {
		var cat SkillCategory
		if err := rows.Scan(
			&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.ParentID,
			&cat.CreatedAt, &cat.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan skill category", err)
		}
		categories = append(categories, cat)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate skill categories", err)
	}

	if categories == nil {
		categories = []SkillCategory{}
	}

	return categories, nil
}

// UpdateSkillCategory updates an existing skill category using COALESCE partial update.
func (s *SkillService) UpdateSkillCategory(ctx context.Context, id uuid.UUID, req UpdateSkillCategoryRequest) (SkillCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SkillCategory{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetSkillCategory(ctx, id); err != nil {
		return SkillCategory{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE skill_categories SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			parent_id = COALESCE($3, parent_id),
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6
		RETURNING id, tenant_id, name, description, parent_id,
			created_at, updated_at`

	var cat SkillCategory
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Description, req.ParentID,
		now, id, auth.TenantID,
	).Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.ParentID,
		&cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		return SkillCategory{}, apperrors.Internal("failed to update skill category", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:skill_category",
		EntityType: "skill_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cat, nil
}

// DeleteSkillCategory deletes a skill category by ID.
func (s *SkillService) DeleteSkillCategory(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM skill_categories WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete skill category", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("SkillCategory", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:skill_category",
		EntityType: "skill_category",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Skills
// ──────────────────────────────────────────────

// CreateSkill creates a new skill.
func (s *SkillService) CreateSkill(ctx context.Context, req CreateSkillRequest) (Skill, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Skill{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO skills (
			id, tenant_id, category_id, name, description,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7
		)
		RETURNING id, tenant_id, category_id, name, description,
			created_at, updated_at`

	var skill Skill
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.CategoryID, req.Name, req.Description,
		now, now,
	).Scan(
		&skill.ID, &skill.TenantID, &skill.CategoryID, &skill.Name, &skill.Description,
		&skill.CreatedAt, &skill.UpdatedAt,
	)
	if err != nil {
		return Skill{}, apperrors.Internal("failed to create skill", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name, "categoryId": req.CategoryID})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:skill",
		EntityType: "skill",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return skill, nil
}

// GetSkill retrieves a single skill by ID.
func (s *SkillService) GetSkill(ctx context.Context, id uuid.UUID) (Skill, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Skill{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, category_id, name, description,
			created_at, updated_at
		FROM skills
		WHERE id = $1 AND tenant_id = $2`

	var skill Skill
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&skill.ID, &skill.TenantID, &skill.CategoryID, &skill.Name, &skill.Description,
		&skill.CreatedAt, &skill.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Skill{}, apperrors.NotFound("Skill", id.String())
		}
		return Skill{}, apperrors.Internal("failed to get skill", err)
	}

	return skill, nil
}

// ListSkills returns a filtered, paginated list of skills.
func (s *SkillService) ListSkills(ctx context.Context, categoryID *uuid.UUID, page, limit int) ([]Skill, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM skills
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR category_id = $2)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, categoryID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count skills", err)
	}

	dataQuery := `
		SELECT id, tenant_id, category_id, name, description,
			created_at, updated_at
		FROM skills
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR category_id = $2)
		ORDER BY name ASC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, categoryID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list skills", err)
	}
	defer rows.Close()

	var skills []Skill
	for rows.Next() {
		var skill Skill
		if err := rows.Scan(
			&skill.ID, &skill.TenantID, &skill.CategoryID, &skill.Name, &skill.Description,
			&skill.CreatedAt, &skill.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan skill", err)
		}
		skills = append(skills, skill)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate skills", err)
	}

	if skills == nil {
		skills = []Skill{}
	}

	return skills, total, nil
}

// UpdateSkill updates an existing skill using COALESCE partial update.
func (s *SkillService) UpdateSkill(ctx context.Context, id uuid.UUID, req UpdateSkillRequest) (Skill, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Skill{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetSkill(ctx, id); err != nil {
		return Skill{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE skills SET
			category_id = COALESCE($1, category_id),
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6
		RETURNING id, tenant_id, category_id, name, description,
			created_at, updated_at`

	var skill Skill
	err := s.pool.QueryRow(ctx, updateQuery,
		req.CategoryID, req.Name, req.Description,
		now, id, auth.TenantID,
	).Scan(
		&skill.ID, &skill.TenantID, &skill.CategoryID, &skill.Name, &skill.Description,
		&skill.CreatedAt, &skill.UpdatedAt,
	)
	if err != nil {
		return Skill{}, apperrors.Internal("failed to update skill", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:skill",
		EntityType: "skill",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return skill, nil
}

// DeleteSkill deletes a skill by ID.
func (s *SkillService) DeleteSkill(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM skills WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete skill", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Skill", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:skill",
		EntityType: "skill",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// User Skills
// ──────────────────────────────────────────────

// CreateUserSkill creates a new user skill record.
func (s *SkillService) CreateUserSkill(ctx context.Context, req CreateUserSkillRequest) (UserSkill, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return UserSkill{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	certified := false
	if req.Certified != nil {
		certified = *req.Certified
	}

	certExpiry := req.CertificationExpiry

	query := `
		INSERT INTO user_skills (
			id, tenant_id, user_id, skill_id, proficiency_level,
			certified, certification_name, certification_expiry,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10
		)
		RETURNING id, tenant_id, user_id, skill_id, proficiency_level,
			certified, certification_name, certification_expiry,
			verified_by, verified_at, created_at, updated_at`

	var us UserSkill
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.UserID, req.SkillID, req.ProficiencyLevel,
		certified, req.CertificationName, certExpiry,
		now, now,
	).Scan(
		&us.ID, &us.TenantID, &us.UserID, &us.SkillID, &us.ProficiencyLevel,
		&us.Certified, &us.CertificationName, &us.CertificationExpiry,
		&us.VerifiedBy, &us.VerifiedAt, &us.CreatedAt, &us.UpdatedAt,
	)
	if err != nil {
		return UserSkill{}, apperrors.Internal("failed to create user skill", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"userId":           req.UserID,
		"skillId":          req.SkillID,
		"proficiencyLevel": req.ProficiencyLevel,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:user_skill",
		EntityType: "user_skill",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return us, nil
}

// ListUserSkills returns all skills for a given user.
func (s *SkillService) ListUserSkills(ctx context.Context, userID uuid.UUID) ([]UserSkill, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, user_id, skill_id, proficiency_level,
			certified, certification_name, certification_expiry,
			verified_by, verified_at, created_at, updated_at
		FROM user_skills
		WHERE tenant_id = $1 AND user_id = $2
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, userID)
	if err != nil {
		return nil, apperrors.Internal("failed to list user skills", err)
	}
	defer rows.Close()

	var skills []UserSkill
	for rows.Next() {
		var us UserSkill
		if err := rows.Scan(
			&us.ID, &us.TenantID, &us.UserID, &us.SkillID, &us.ProficiencyLevel,
			&us.Certified, &us.CertificationName, &us.CertificationExpiry,
			&us.VerifiedBy, &us.VerifiedAt, &us.CreatedAt, &us.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan user skill", err)
		}
		skills = append(skills, us)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate user skills", err)
	}

	if skills == nil {
		skills = []UserSkill{}
	}

	return skills, nil
}

// ListUsersBySkill returns all user skills for a given skill, optionally filtered by proficiency.
func (s *SkillService) ListUsersBySkill(ctx context.Context, skillID uuid.UUID, proficiency *string) ([]UserSkill, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, user_id, skill_id, proficiency_level,
			certified, certification_name, certification_expiry,
			verified_by, verified_at, created_at, updated_at
		FROM user_skills
		WHERE tenant_id = $1 AND skill_id = $2
			AND ($3::text IS NULL OR proficiency_level = $3)
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, skillID, proficiency)
	if err != nil {
		return nil, apperrors.Internal("failed to list users by skill", err)
	}
	defer rows.Close()

	var skills []UserSkill
	for rows.Next() {
		var us UserSkill
		if err := rows.Scan(
			&us.ID, &us.TenantID, &us.UserID, &us.SkillID, &us.ProficiencyLevel,
			&us.Certified, &us.CertificationName, &us.CertificationExpiry,
			&us.VerifiedBy, &us.VerifiedAt, &us.CreatedAt, &us.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan user skill", err)
		}
		skills = append(skills, us)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate users by skill", err)
	}

	if skills == nil {
		skills = []UserSkill{}
	}

	return skills, nil
}

// UpdateUserSkill updates a user skill record using COALESCE partial update.
func (s *SkillService) UpdateUserSkill(ctx context.Context, id uuid.UUID, req UpdateUserSkillRequest) (UserSkill, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return UserSkill{}, apperrors.Unauthorized("authentication required")
	}

	certExpiry := req.CertificationExpiry

	now := time.Now().UTC()

	updateQuery := `
		UPDATE user_skills SET
			proficiency_level = COALESCE($1, proficiency_level),
			certified = COALESCE($2, certified),
			certification_name = COALESCE($3, certification_name),
			certification_expiry = COALESCE($4, certification_expiry),
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7
		RETURNING id, tenant_id, user_id, skill_id, proficiency_level,
			certified, certification_name, certification_expiry,
			verified_by, verified_at, created_at, updated_at`

	var us UserSkill
	err := s.pool.QueryRow(ctx, updateQuery,
		req.ProficiencyLevel, req.Certified, req.CertificationName,
		certExpiry, now, id, auth.TenantID,
	).Scan(
		&us.ID, &us.TenantID, &us.UserID, &us.SkillID, &us.ProficiencyLevel,
		&us.Certified, &us.CertificationName, &us.CertificationExpiry,
		&us.VerifiedBy, &us.VerifiedAt, &us.CreatedAt, &us.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return UserSkill{}, apperrors.NotFound("UserSkill", id.String())
		}
		return UserSkill{}, apperrors.Internal("failed to update user skill", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:user_skill",
		EntityType: "user_skill",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return us, nil
}

// DeleteUserSkill deletes a user skill record by ID.
func (s *SkillService) DeleteUserSkill(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM user_skills WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete user skill", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("UserSkill", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:user_skill",
		EntityType: "user_skill",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// VerifyUserSkill marks a user skill as verified by the given verifier.
func (s *SkillService) VerifyUserSkill(ctx context.Context, id uuid.UUID, verifierID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE user_skills SET
			verified_by = $1,
			verified_at = $2,
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5`

	result, err := s.pool.Exec(ctx, query, verifierID, now, now, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to verify user skill", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("UserSkill", id.String())
	}

	changes, _ := json.Marshal(map[string]any{"verifiedBy": verifierID})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "verify:user_skill",
		EntityType: "user_skill",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Role Skill Requirements
// ──────────────────────────────────────────────

// CreateRoleSkillRequirement creates a new role skill requirement.
func (s *SkillService) CreateRoleSkillRequirement(ctx context.Context, req CreateRoleSkillRequirementRequest) (RoleSkillRequirement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return RoleSkillRequirement{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO role_skill_requirements (
			id, tenant_id, role_type, skill_id, required_level,
			created_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6
		)
		RETURNING id, tenant_id, role_type, skill_id, required_level,
			created_at`

	var rsr RoleSkillRequirement
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.RoleType, req.SkillID, req.RequiredLevel,
		now,
	).Scan(
		&rsr.ID, &rsr.TenantID, &rsr.RoleType, &rsr.SkillID, &rsr.RequiredLevel,
		&rsr.CreatedAt,
	)
	if err != nil {
		return RoleSkillRequirement{}, apperrors.Internal("failed to create role skill requirement", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"roleType":      req.RoleType,
		"skillId":       req.SkillID,
		"requiredLevel": req.RequiredLevel,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:role_skill_requirement",
		EntityType: "role_skill_requirement",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return rsr, nil
}

// ListRoleSkillRequirements returns all skill requirements for a given role type.
func (s *SkillService) ListRoleSkillRequirements(ctx context.Context, roleType string) ([]RoleSkillRequirement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, role_type, skill_id, required_level,
			created_at
		FROM role_skill_requirements
		WHERE tenant_id = $1 AND role_type = $2
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, roleType)
	if err != nil {
		return nil, apperrors.Internal("failed to list role skill requirements", err)
	}
	defer rows.Close()

	var reqs []RoleSkillRequirement
	for rows.Next() {
		var rsr RoleSkillRequirement
		if err := rows.Scan(
			&rsr.ID, &rsr.TenantID, &rsr.RoleType, &rsr.SkillID, &rsr.RequiredLevel,
			&rsr.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan role skill requirement", err)
		}
		reqs = append(reqs, rsr)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate role skill requirements", err)
	}

	if reqs == nil {
		reqs = []RoleSkillRequirement{}
	}

	return reqs, nil
}

// DeleteRoleSkillRequirement deletes a role skill requirement by ID.
func (s *SkillService) DeleteRoleSkillRequirement(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM role_skill_requirements WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete role skill requirement", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("RoleSkillRequirement", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:role_skill_requirement",
		EntityType: "role_skill_requirement",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Skill Gap Analysis
// ──────────────────────────────────────────────

// GetSkillGapAnalysis compares a user's skills against the requirements for a role type.
func (s *SkillService) GetSkillGapAnalysis(ctx context.Context, roleType string, userID uuid.UUID) ([]SkillGapEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			rsr.skill_id,
			sk.name AS skill_name,
			rsr.required_level,
			us.proficiency_level AS current_level
		FROM role_skill_requirements rsr
		JOIN skills sk ON sk.id = rsr.skill_id
		LEFT JOIN user_skills us ON us.skill_id = rsr.skill_id AND us.user_id = $1
		WHERE rsr.tenant_id = $2 AND rsr.role_type = $3
		ORDER BY sk.name ASC`

	rows, err := s.pool.Query(ctx, query, userID, auth.TenantID, roleType)
	if err != nil {
		return nil, apperrors.Internal("failed to run skill gap analysis", err)
	}
	defer rows.Close()

	var entries []SkillGapEntry
	for rows.Next() {
		var entry SkillGapEntry
		var currentLevel *string
		if err := rows.Scan(
			&entry.SkillName, &entry.RequiredLevel, &currentLevel,
		); err != nil {
			return nil, apperrors.Internal("failed to scan skill gap entry", err)
		}
		if currentLevel != nil {
			entry.CurrentLevel = *currentLevel
		} else {
			entry.CurrentLevel = "none"
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate skill gap entries", err)
	}

	if entries == nil {
		entries = []SkillGapEntry{}
	}

	return entries, nil
}
