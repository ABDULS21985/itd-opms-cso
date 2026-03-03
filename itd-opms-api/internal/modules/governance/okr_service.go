package governance

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

// OKRService handles business logic for OKR, Key Result, and KPI management.
type OKRService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewOKRService creates a new OKRService.
func NewOKRService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *OKRService {
	return &OKRService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// OKR CRUD
// ──────────────────────────────────────────────

// CreateOKR creates a new OKR. If parentId is set, verifies the parent exists.
func (s *OKRService) CreateOKR(ctx context.Context, tenantID, createdBy uuid.UUID, req CreateOKRRequest) (*OKR, error) {
	if s.pool == nil {
		return nil, apperrors.Internal("database pool not available", nil)
	}

	// Verify parent exists if specified.
	if req.ParentID != nil && *req.ParentID != uuid.Nil {
		var exists bool
		err := s.pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM okrs WHERE id = $1 AND tenant_id = $2)`,
			*req.ParentID, tenantID,
		).Scan(&exists)
		if err != nil {
			return nil, apperrors.Internal("failed to verify parent OKR", err)
		}
		if !exists {
			return nil, apperrors.NotFound("ParentOKR", req.ParentID.String())
		}
	}

	id := uuid.New()
	now := time.Now().UTC()

	scoringMethod := "percentage"
	if req.ScoringMethod != nil {
		scoringMethod = *req.ScoringMethod
	}

	query := `
		INSERT INTO okrs (
			id, tenant_id, parent_id, level, scope_id,
			objective, period, owner_id, status,
			progress_pct, scoring_method, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, tenant_id, parent_id, level, scope_id,
			objective, period, owner_id, status,
			progress_pct, scoring_method, created_at`

	var o OKR
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.ParentID, req.Level, req.ScopeID,
		req.Objective, req.Period, req.OwnerID, OKRStatusDraft,
		0.0, scoringMethod, now,
	).Scan(
		&o.ID, &o.TenantID, &o.ParentID, &o.Level, &o.ScopeID,
		&o.Objective, &o.Period, &o.OwnerID, &o.Status,
		&o.ProgressPct, &o.ScoringMethod, &o.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create OKR", err)
	}

	o.KeyResults = []KeyResult{}
	o.Children = []OKR{}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"objective": req.Objective,
		"level":     req.Level,
		"period":    req.Period,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    createdBy,
		Action:     "okr.created",
		EntityType: "okr",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &o, nil
}

// GetOKR retrieves an OKR by ID, including its key results.
func (s *OKRService) GetOKR(ctx context.Context, tenantID, okrID uuid.UUID) (*OKR, error) {
	query := `
		SELECT id, tenant_id, parent_id, level, scope_id,
			objective, period, owner_id, status,
			progress_pct, scoring_method, created_at
		FROM okrs
		WHERE id = $1 AND tenant_id = $2`

	var o OKR
	err := s.pool.QueryRow(ctx, query, okrID, tenantID).Scan(
		&o.ID, &o.TenantID, &o.ParentID, &o.Level, &o.ScopeID,
		&o.Objective, &o.Period, &o.OwnerID, &o.Status,
		&o.ProgressPct, &o.ScoringMethod, &o.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("OKR", okrID.String())
		}
		return nil, apperrors.Internal("failed to get OKR", err)
	}

	// Fetch key results.
	krs, err := s.fetchKeyResults(ctx, okrID)
	if err != nil {
		return nil, err
	}
	o.KeyResults = krs
	o.Children = []OKR{}

	return &o, nil
}

// ListOKRs returns a paginated list of OKRs, optionally filtered by level, period, and status.
func (s *OKRService) ListOKRs(ctx context.Context, tenantID uuid.UUID, level, period, status string, limit, offset int) ([]OKR, int64, error) {
	var levelParam, periodParam, statusParam *string
	if level != "" {
		levelParam = &level
	}
	if period != "" {
		periodParam = &period
	}
	if status != "" {
		statusParam = &status
	}

	countQuery := `
		SELECT COUNT(*)
		FROM okrs
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR level = $2)
			AND ($3::text IS NULL OR period = $3)
			AND ($4::text IS NULL OR status = $4)`

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, tenantID, levelParam, periodParam, statusParam).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count OKRs", err)
	}

	dataQuery := `
		SELECT id, tenant_id, parent_id, level, scope_id,
			objective, period, owner_id, status,
			progress_pct, scoring_method, created_at
		FROM okrs
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR level = $2)
			AND ($3::text IS NULL OR period = $3)
			AND ($4::text IS NULL OR status = $4)
		ORDER BY created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := s.pool.Query(ctx, dataQuery, tenantID, levelParam, periodParam, statusParam, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list OKRs", err)
	}
	defer rows.Close()

	var okrs []OKR
	for rows.Next() {
		var o OKR
		if err := rows.Scan(
			&o.ID, &o.TenantID, &o.ParentID, &o.Level, &o.ScopeID,
			&o.Objective, &o.Period, &o.OwnerID, &o.Status,
			&o.ProgressPct, &o.ScoringMethod, &o.CreatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan OKR", err)
		}
		o.KeyResults = []KeyResult{}
		o.Children = []OKR{}
		okrs = append(okrs, o)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate OKRs", err)
	}

	if okrs == nil {
		okrs = []OKR{}
	}

	return okrs, total, nil
}

// UpdateOKR updates an existing OKR.
func (s *OKRService) UpdateOKR(ctx context.Context, tenantID, okrID uuid.UUID, req UpdateOKRRequest) (*OKR, error) {
	auth := types.GetAuthContext(ctx)

	query := `
		UPDATE okrs SET
			objective = COALESCE($1, objective),
			status = COALESCE($2, status),
			progress_pct = COALESCE($3, progress_pct),
			scoring_method = COALESCE($4, scoring_method)
		WHERE id = $5 AND tenant_id = $6
		RETURNING id, tenant_id, parent_id, level, scope_id,
			objective, period, owner_id, status,
			progress_pct, scoring_method, created_at`

	var o OKR
	err := s.pool.QueryRow(ctx, query,
		req.Objective, req.Status, req.ProgressPct, req.ScoringMethod,
		okrID, tenantID,
	).Scan(
		&o.ID, &o.TenantID, &o.ParentID, &o.Level, &o.ScopeID,
		&o.Objective, &o.Period, &o.OwnerID, &o.Status,
		&o.ProgressPct, &o.ScoringMethod, &o.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("OKR", okrID.String())
		}
		return nil, apperrors.Internal("failed to update OKR", err)
	}

	// Fetch key results.
	krs, err := s.fetchKeyResults(ctx, okrID)
	if err != nil {
		return nil, err
	}
	o.KeyResults = krs
	o.Children = []OKR{}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"okr_id": okrID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "okr.updated",
		EntityType: "okr",
		EntityID:   okrID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &o, nil
}

// UpdateProgress updates the progress percentage of an OKR and propagates to its parent.
func (s *OKRService) UpdateProgress(ctx context.Context, okrID uuid.UUID, progressPct float64) error {
	query := `UPDATE okrs SET progress_pct = $1 WHERE id = $2 RETURNING parent_id`
	var parentID *uuid.UUID
	err := s.pool.QueryRow(ctx, query, progressPct, okrID).Scan(&parentID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("OKR", okrID.String())
		}
		return apperrors.Internal("failed to update OKR progress", err)
	}

	// Propagate to parent if one exists.
	if parentID != nil && *parentID != uuid.Nil {
		if err := s.recalculateParentProgress(ctx, *parentID); err != nil {
			slog.ErrorContext(ctx, "failed to propagate progress to parent", "parent_id", parentID, "error", err)
		}
	}

	return nil
}

// GetOKRTree recursively fetches an OKR with all its children and key results.
func (s *OKRService) GetOKRTree(ctx context.Context, tenantID, rootID uuid.UUID) (*OKR, error) {
	// Use a recursive CTE to fetch the entire tree.
	query := `
		WITH RECURSIVE okr_tree AS (
			SELECT id, tenant_id, parent_id, level, scope_id,
				objective, period, owner_id, status,
				progress_pct, scoring_method, created_at, 0 AS depth
			FROM okrs
			WHERE id = $1 AND tenant_id = $2

			UNION ALL

			SELECT o.id, o.tenant_id, o.parent_id, o.level, o.scope_id,
				o.objective, o.period, o.owner_id, o.status,
				o.progress_pct, o.scoring_method, o.created_at, ot.depth + 1
			FROM okrs o
			INNER JOIN okr_tree ot ON o.parent_id = ot.id
		)
		SELECT id, tenant_id, parent_id, level, scope_id,
			objective, period, owner_id, status,
			progress_pct, scoring_method, created_at
		FROM okr_tree
		ORDER BY depth, created_at`

	rows, err := s.pool.Query(ctx, query, rootID, tenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to fetch OKR tree", err)
	}
	defer rows.Close()

	// Collect all OKRs into a map keyed by ID.
	okrMap := make(map[uuid.UUID]*OKR)
	var root *OKR
	var orderedIDs []uuid.UUID

	for rows.Next() {
		var o OKR
		if err := rows.Scan(
			&o.ID, &o.TenantID, &o.ParentID, &o.Level, &o.ScopeID,
			&o.Objective, &o.Period, &o.OwnerID, &o.Status,
			&o.ProgressPct, &o.ScoringMethod, &o.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan OKR tree node", err)
		}
		o.KeyResults = []KeyResult{}
		o.Children = []OKR{}
		okrMap[o.ID] = &o
		orderedIDs = append(orderedIDs, o.ID)

		if o.ID == rootID {
			root = &o
			okrMap[o.ID] = root
		}
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate OKR tree", err)
	}

	if root == nil {
		return nil, apperrors.NotFound("OKR", rootID.String())
	}

	// Fetch key results for all OKRs in the tree.
	for _, id := range orderedIDs {
		krs, err := s.fetchKeyResults(ctx, id)
		if err != nil {
			return nil, err
		}
		okrMap[id].KeyResults = krs
	}

	// Build the tree by attaching children to parents.
	for _, id := range orderedIDs {
		node := okrMap[id]
		if node.ParentID != nil && *node.ParentID != uuid.Nil {
			if parent, ok := okrMap[*node.ParentID]; ok {
				parent.Children = append(parent.Children, *node)
			}
		}
	}

	// Re-resolve root's children since the root pointer may have stale child slice
	// after children were appended to okrMap entries.
	if rootNode, ok := okrMap[rootID]; ok {
		root = rootNode
	}

	return root, nil
}

// ──────────────────────────────────────────────
// Key Results
// ──────────────────────────────────────────────

// CreateKeyResult adds a new key result to an OKR.
func (s *OKRService) CreateKeyResult(ctx context.Context, okrID uuid.UUID, req CreateKeyResultRequest) (*KeyResult, error) {
	auth := types.GetAuthContext(ctx)

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO key_results (
			id, okr_id, title, target_value, current_value,
			unit, status, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, okr_id, title, target_value, current_value,
			unit, status, updated_at`

	var kr KeyResult
	err := s.pool.QueryRow(ctx, query,
		id, okrID, req.Title, req.TargetValue, 0.0,
		req.Unit, KRStatusOnTrack, now,
	).Scan(
		&kr.ID, &kr.OKRID, &kr.Title, &kr.TargetValue, &kr.CurrentValue,
		&kr.Unit, &kr.Status, &kr.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create key result", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":  req.Title,
		"okr_id": okrID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "key_result.created",
		EntityType: "key_result",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &kr, nil
}

// UpdateKeyResult updates a key result. When current_value changes, recalculates
// the parent OKR's progress percentage.
func (s *OKRService) UpdateKeyResult(ctx context.Context, krID uuid.UUID, req UpdateKeyResultRequest) (*KeyResult, error) {
	auth := types.GetAuthContext(ctx)

	query := `
		UPDATE key_results SET
			title = COALESCE($1, title),
			target_value = COALESCE($2, target_value),
			current_value = COALESCE($3, current_value),
			unit = COALESCE($4, unit),
			status = COALESCE($5, status)
		WHERE id = $6
		RETURNING id, okr_id, title, target_value, current_value,
			unit, status, updated_at`

	var kr KeyResult
	err := s.pool.QueryRow(ctx, query,
		req.Title, req.TargetValue, req.CurrentValue, req.Unit, req.Status,
		krID,
	).Scan(
		&kr.ID, &kr.OKRID, &kr.Title, &kr.TargetValue, &kr.CurrentValue,
		&kr.Unit, &kr.Status, &kr.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("KeyResult", krID.String())
		}
		return nil, apperrors.Internal("failed to update key result", err)
	}

	// If current_value was updated, recalculate OKR progress.
	if req.CurrentValue != nil {
		if err := s.recalculateOKRProgress(ctx, kr.OKRID); err != nil {
			slog.ErrorContext(ctx, "failed to recalculate OKR progress", "okr_id", kr.OKRID, "error", err)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"key_result_id": krID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "key_result.updated",
		EntityType: "key_result",
		EntityID:   krID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &kr, nil
}

// DeleteKeyResult deletes a key result.
func (s *OKRService) DeleteKeyResult(ctx context.Context, krID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)

	// Get the OKR ID before deleting so we can recalculate.
	var okrID uuid.UUID
	err := s.pool.QueryRow(ctx, `SELECT okr_id FROM key_results WHERE id = $1`, krID).Scan(&okrID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("KeyResult", krID.String())
		}
		return apperrors.Internal("failed to look up key result", err)
	}

	result, err := s.pool.Exec(ctx, `DELETE FROM key_results WHERE id = $1`, krID)
	if err != nil {
		return apperrors.Internal("failed to delete key result", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("KeyResult", krID.String())
	}

	// Recalculate OKR progress after removing a key result.
	if err := s.recalculateOKRProgress(ctx, okrID); err != nil {
		slog.ErrorContext(ctx, "failed to recalculate OKR progress after key result deletion", "okr_id", okrID, "error", err)
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "key_result.deleted",
		EntityType: "key_result",
		EntityID:   krID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// KPIs
// ──────────────────────────────────────────────

// CreateKPI creates a new KPI.
func (s *OKRService) CreateKPI(ctx context.Context, tenantID uuid.UUID, req CreateKPIRequest) (*KPI, error) {
	id := uuid.New()

	frequency := "monthly"
	if req.Frequency != nil {
		frequency = *req.Frequency
	}

	query := `
		INSERT INTO kpis (
			id, tenant_id, name, description, formula,
			target_value, warning_threshold, critical_threshold,
			current_value, unit, frequency, owner_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, tenant_id, name, description, formula,
			target_value, warning_threshold, critical_threshold,
			current_value, unit, frequency, owner_id, last_updated_at`

	var k KPI
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.Name, req.Description, req.Formula,
		req.TargetValue, req.WarningThreshold, req.CriticalThreshold,
		nil, req.Unit, frequency, req.OwnerID,
	).Scan(
		&k.ID, &k.TenantID, &k.Name, &k.Description, &k.Formula,
		&k.TargetValue, &k.WarningThreshold, &k.CriticalThreshold,
		&k.CurrentValue, &k.Unit, &k.Frequency, &k.OwnerID, &k.LastUpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create KPI", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":      req.Name,
		"frequency": frequency,
	})
	authKPI := types.GetAuthContext(ctx)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    authKPI.UserID,
		ActorRole:  firstRole(authKPI.Roles),
		Action:     "kpi.created",
		EntityType: "kpi",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &k, nil
}

// GetKPI retrieves a KPI by ID.
func (s *OKRService) GetKPI(ctx context.Context, tenantID, kpiID uuid.UUID) (*KPI, error) {
	query := `
		SELECT id, tenant_id, name, description, formula,
			target_value, warning_threshold, critical_threshold,
			current_value, unit, frequency, owner_id, last_updated_at
		FROM kpis
		WHERE id = $1 AND tenant_id = $2`

	var k KPI
	err := s.pool.QueryRow(ctx, query, kpiID, tenantID).Scan(
		&k.ID, &k.TenantID, &k.Name, &k.Description, &k.Formula,
		&k.TargetValue, &k.WarningThreshold, &k.CriticalThreshold,
		&k.CurrentValue, &k.Unit, &k.Frequency, &k.OwnerID, &k.LastUpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("KPI", kpiID.String())
		}
		return nil, apperrors.Internal("failed to get KPI", err)
	}

	return &k, nil
}

// ListKPIs returns a paginated list of KPIs.
func (s *OKRService) ListKPIs(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]KPI, int64, error) {
	countQuery := `SELECT COUNT(*) FROM kpis WHERE tenant_id = $1`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, tenantID).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count KPIs", err)
	}

	dataQuery := `
		SELECT id, tenant_id, name, description, formula,
			target_value, warning_threshold, critical_threshold,
			current_value, unit, frequency, owner_id, last_updated_at
		FROM kpis
		WHERE tenant_id = $1
		ORDER BY name ASC
		LIMIT $2 OFFSET $3`

	rows, err := s.pool.Query(ctx, dataQuery, tenantID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list KPIs", err)
	}
	defer rows.Close()

	var kpis []KPI
	for rows.Next() {
		var k KPI
		if err := rows.Scan(
			&k.ID, &k.TenantID, &k.Name, &k.Description, &k.Formula,
			&k.TargetValue, &k.WarningThreshold, &k.CriticalThreshold,
			&k.CurrentValue, &k.Unit, &k.Frequency, &k.OwnerID, &k.LastUpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan KPI", err)
		}
		kpis = append(kpis, k)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate KPIs", err)
	}

	if kpis == nil {
		kpis = []KPI{}
	}

	return kpis, total, nil
}

// UpdateKPI updates an existing KPI.
func (s *OKRService) UpdateKPI(ctx context.Context, tenantID, kpiID uuid.UUID, req UpdateKPIRequest) (*KPI, error) {
	now := time.Now().UTC()

	query := `
		UPDATE kpis SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			formula = COALESCE($3, formula),
			target_value = COALESCE($4, target_value),
			warning_threshold = COALESCE($5, warning_threshold),
			critical_threshold = COALESCE($6, critical_threshold),
			current_value = COALESCE($7, current_value),
			unit = COALESCE($8, unit),
			frequency = COALESCE($9, frequency),
			owner_id = COALESCE($10, owner_id),
			last_updated_at = $11
		WHERE id = $12 AND tenant_id = $13
		RETURNING id, tenant_id, name, description, formula,
			target_value, warning_threshold, critical_threshold,
			current_value, unit, frequency, owner_id, last_updated_at`

	var k KPI
	err := s.pool.QueryRow(ctx, query,
		req.Name, req.Description, req.Formula,
		req.TargetValue, req.WarningThreshold, req.CriticalThreshold,
		req.CurrentValue, req.Unit, req.Frequency, req.OwnerID,
		now, kpiID, tenantID,
	).Scan(
		&k.ID, &k.TenantID, &k.Name, &k.Description, &k.Formula,
		&k.TargetValue, &k.WarningThreshold, &k.CriticalThreshold,
		&k.CurrentValue, &k.Unit, &k.Frequency, &k.OwnerID, &k.LastUpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("KPI", kpiID.String())
		}
		return nil, apperrors.Internal("failed to update KPI", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"kpi_id": kpiID,
	})
	authUpd := types.GetAuthContext(ctx)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    authUpd.UserID,
		ActorRole:  firstRole(authUpd.Roles),
		Action:     "kpi.updated",
		EntityType: "kpi",
		EntityID:   kpiID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &k, nil
}

// DeleteKPI deletes a KPI.
func (s *OKRService) DeleteKPI(ctx context.Context, tenantID, kpiID uuid.UUID) error {
	query := `DELETE FROM kpis WHERE id = $1 AND tenant_id = $2`
	result, err := s.pool.Exec(ctx, query, kpiID, tenantID)
	if err != nil {
		return apperrors.Internal("failed to delete KPI", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("KPI", kpiID.String())
	}

	// Log audit event.
	authDel := types.GetAuthContext(ctx)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    authDel.UserID,
		ActorRole:  firstRole(authDel.Roles),
		Action:     "kpi.deleted",
		EntityType: "kpi",
		EntityID:   kpiID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

// fetchKeyResults returns all key results for a given OKR.
func (s *OKRService) fetchKeyResults(ctx context.Context, okrID uuid.UUID) ([]KeyResult, error) {
	query := `
		SELECT id, okr_id, title, target_value, current_value,
			unit, status, updated_at
		FROM key_results
		WHERE okr_id = $1
		ORDER BY title`

	rows, err := s.pool.Query(ctx, query, okrID)
	if err != nil {
		return nil, apperrors.Internal("failed to fetch key results", err)
	}
	defer rows.Close()

	var krs []KeyResult
	for rows.Next() {
		var kr KeyResult
		if err := rows.Scan(
			&kr.ID, &kr.OKRID, &kr.Title, &kr.TargetValue, &kr.CurrentValue,
			&kr.Unit, &kr.Status, &kr.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan key result", err)
		}
		krs = append(krs, kr)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate key results", err)
	}

	if krs == nil {
		krs = []KeyResult{}
	}

	return krs, nil
}

// recalculateOKRProgress computes progress as the average of
// (current_value / target_value * 100) across all key results, then propagates to parent.
func (s *OKRService) recalculateOKRProgress(ctx context.Context, okrID uuid.UUID) error {
	query := `
		SELECT COALESCE(
			AVG(
				CASE WHEN target_value IS NOT NULL AND target_value != 0
					THEN LEAST(current_value / target_value * 100, 100)
					ELSE 0
				END
			), 0
		)
		FROM key_results
		WHERE okr_id = $1`

	var progress float64
	if err := s.pool.QueryRow(ctx, query, okrID).Scan(&progress); err != nil {
		return apperrors.Internal("failed to calculate OKR progress from key results", err)
	}

	updateQuery := `UPDATE okrs SET progress_pct = $1 WHERE id = $2 RETURNING parent_id`
	var parentID *uuid.UUID
	if err := s.pool.QueryRow(ctx, updateQuery, progress, okrID).Scan(&parentID); err != nil {
		return apperrors.Internal("failed to update OKR progress", err)
	}

	// Propagate to parent.
	if parentID != nil && *parentID != uuid.Nil {
		return s.recalculateParentProgress(ctx, *parentID)
	}

	return nil
}

// recalculateParentProgress recalculates a parent OKR's progress as the average
// of all its children's progress_pct values, then recursively propagates upward.
func (s *OKRService) recalculateParentProgress(ctx context.Context, parentID uuid.UUID) error {
	query := `
		SELECT COALESCE(AVG(progress_pct), 0)
		FROM okrs
		WHERE parent_id = $1`

	var avgProgress float64
	if err := s.pool.QueryRow(ctx, query, parentID).Scan(&avgProgress); err != nil {
		return apperrors.Internal("failed to calculate parent OKR progress", err)
	}

	updateQuery := `UPDATE okrs SET progress_pct = $1 WHERE id = $2 RETURNING parent_id`
	var grandparentID *uuid.UUID
	if err := s.pool.QueryRow(ctx, updateQuery, avgProgress, parentID).Scan(&grandparentID); err != nil {
		return apperrors.Internal("failed to update parent OKR progress", err)
	}

	// Recursively propagate upward.
	if grandparentID != nil && *grandparentID != uuid.Nil {
		return s.recalculateParentProgress(ctx, *grandparentID)
	}

	return nil
}
