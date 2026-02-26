package cmdb

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
// CMDBService
// ──────────────────────────────────────────────

// CMDBService handles business logic for CMDB configuration items, relationships, and reconciliation.
type CMDBService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewCMDBService creates a new CMDBService.
func NewCMDBService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *CMDBService {
	return &CMDBService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// cmdbItemColumns is the canonical column list for the cmdb_items table.
const cmdbItemColumns = `
	id, tenant_id, ci_type, name, status,
	asset_id, attributes, version,
	created_at, updated_at`

// scanCMDBItem scans a single CMDB item row into a CMDBItem struct.
func scanCMDBItem(row pgx.Row) (CMDBItem, error) {
	var c CMDBItem
	err := row.Scan(
		&c.ID, &c.TenantID, &c.CIType, &c.Name, &c.Status,
		&c.AssetID, &c.Attributes, &c.Version,
		&c.CreatedAt, &c.UpdatedAt,
	)
	return c, err
}

// scanCMDBItems scans multiple CMDB item rows into a slice.
func scanCMDBItems(rows pgx.Rows) ([]CMDBItem, error) {
	var items []CMDBItem
	for rows.Next() {
		var c CMDBItem
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.CIType, &c.Name, &c.Status,
			&c.AssetID, &c.Attributes, &c.Version,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if items == nil {
		items = []CMDBItem{}
	}
	return items, nil
}

// ──────────────────────────────────────────────
// CI CRUD
// ──────────────────────────────────────────────

// CreateCMDBItem creates a new configuration item.
func (s *CMDBService) CreateCMDBItem(ctx context.Context, req CreateCMDBItemRequest) (CMDBItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CMDBItem{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	defaultAttrs := json.RawMessage("{}")
	attributes := &defaultAttrs
	if req.Attributes != nil {
		attributes = req.Attributes
	}

	query := `
		INSERT INTO cmdb_items (
			id, tenant_id, ci_type, name, status,
			asset_id, attributes, version,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, COALESCE($5, 'active'),
			$6, $7, 1,
			$8, $9
		)
		RETURNING ` + cmdbItemColumns

	item, err := scanCMDBItem(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.CIType, req.Name, req.Status,
		req.AssetID, attributes,
		now, now,
	))
	if err != nil {
		return CMDBItem{}, apperrors.Internal("failed to create CMDB item", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"name":    req.Name,
		"ci_type": req.CIType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:cmdb_item",
		EntityType: "cmdb_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return item, nil
}

// GetCMDBItem retrieves a single configuration item by ID.
func (s *CMDBService) GetCMDBItem(ctx context.Context, id uuid.UUID) (CMDBItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CMDBItem{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + cmdbItemColumns + ` FROM cmdb_items WHERE id = $1 AND tenant_id = $2`

	item, err := scanCMDBItem(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return CMDBItem{}, apperrors.NotFound("CMDBItem", id.String())
		}
		return CMDBItem{}, apperrors.Internal("failed to get CMDB item", err)
	}

	return item, nil
}

// ListCMDBItems returns a filtered, paginated list of configuration items.
func (s *CMDBService) ListCMDBItems(ctx context.Context, ciType, status *string, params types.PaginationParams) ([]CMDBItem, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM cmdb_items
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR ci_type = $2)
			AND ($3::text IS NULL OR status = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery,
		auth.TenantID, ciType, status,
	).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count CMDB items", err)
	}

	dataQuery := `
		SELECT ` + cmdbItemColumns + `
		FROM cmdb_items
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR ci_type = $2)
			AND ($3::text IS NULL OR status = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, ciType, status,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list CMDB items", err)
	}
	defer rows.Close()

	items, err := scanCMDBItems(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan CMDB items", err)
	}

	return items, total, nil
}

// SearchCMDBItems performs a full-text search on configuration items by name, CI type, or description.
func (s *CMDBService) SearchCMDBItems(ctx context.Context, query string, params types.PaginationParams) ([]CMDBItem, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	searchPattern := "%" + query + "%"

	countQuery := `
		SELECT COUNT(*)
		FROM cmdb_items
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR ci_type ILIKE $2 OR description ILIKE $2)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, searchPattern).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count CMDB search results", err)
	}

	dataQuery := `
		SELECT ` + cmdbItemColumns + `
		FROM cmdb_items
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR ci_type ILIKE $2 OR description ILIKE $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, searchPattern,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to search CMDB items", err)
	}
	defer rows.Close()

	items, err := scanCMDBItems(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan CMDB search results", err)
	}

	return items, total, nil
}

// UpdateCMDBItem updates an existing configuration item using COALESCE partial update.
// Also increments the version number.
func (s *CMDBService) UpdateCMDBItem(ctx context.Context, id uuid.UUID, req UpdateCMDBItemRequest) (CMDBItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CMDBItem{}, apperrors.Unauthorized("authentication required")
	}

	// Verify CI exists.
	_, err := s.GetCMDBItem(ctx, id)
	if err != nil {
		return CMDBItem{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE cmdb_items SET
			ci_type = COALESCE($1, ci_type),
			name = COALESCE($2, name),
			status = COALESCE($3, status),
			asset_id = COALESCE($4, asset_id),
			attributes = COALESCE($5, attributes),
			version = version + 1,
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING ` + cmdbItemColumns

	item, err := scanCMDBItem(s.pool.QueryRow(ctx, updateQuery,
		req.CIType, req.Name, req.Status,
		req.AssetID, req.Attributes,
		now, id, auth.TenantID,
	))
	if err != nil {
		return CMDBItem{}, apperrors.Internal("failed to update CMDB item", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:cmdb_item",
		EntityType: "cmdb_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return item, nil
}

// DeleteCMDBItem deletes a configuration item.
func (s *CMDBService) DeleteCMDBItem(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM cmdb_items WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete CMDB item", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CMDBItem", id.String())
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:cmdb_item",
		EntityType: "cmdb_item",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Relationships
// ──────────────────────────────────────────────

// relationshipColumns is the canonical column list for the cmdb_relationships table.
const relationshipColumns = `
	id, source_ci_id, target_ci_id, relationship_type, description, is_active, created_at`

// CreateRelationship creates a new relationship between two CIs.
func (s *CMDBService) CreateRelationship(ctx context.Context, req CreateRelationshipRequest) (CMDBRelationship, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CMDBRelationship{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO cmdb_relationships (id, source_ci_id, target_ci_id, relationship_type, description, is_active, created_at)
		VALUES ($1, $2, $3, $4, $5, true, $6)
		RETURNING ` + relationshipColumns

	var rel CMDBRelationship
	err := s.pool.QueryRow(ctx, query,
		id, req.SourceCIID, req.TargetCIID, req.RelationshipType, req.Description, now,
	).Scan(
		&rel.ID, &rel.SourceCIID, &rel.TargetCIID,
		&rel.RelationshipType, &rel.Description, &rel.IsActive, &rel.CreatedAt,
	)
	if err != nil {
		return CMDBRelationship{}, apperrors.Internal("failed to create relationship", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"source_ci_id":      req.SourceCIID,
		"target_ci_id":      req.TargetCIID,
		"relationship_type": req.RelationshipType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:cmdb_relationship",
		EntityType: "cmdb_relationship",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return rel, nil
}

// ListRelationshipsByCI returns all relationships where a CI is either source or target.
func (s *CMDBService) ListRelationshipsByCI(ctx context.Context, ciID uuid.UUID) ([]CMDBRelationship, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT ` + relationshipColumns + `
		FROM cmdb_relationships
		WHERE (source_ci_id = $1 OR target_ci_id = $1)
		ORDER BY created_at DESC`

	rows, err := s.pool.Query(ctx, query, ciID)
	if err != nil {
		return nil, apperrors.Internal("failed to list relationships", err)
	}
	defer rows.Close()

	var rels []CMDBRelationship
	for rows.Next() {
		var rel CMDBRelationship
		if err := rows.Scan(
			&rel.ID, &rel.SourceCIID, &rel.TargetCIID,
			&rel.RelationshipType, &rel.Description, &rel.IsActive, &rel.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan relationship", err)
		}
		rels = append(rels, rel)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate relationships", err)
	}

	if rels == nil {
		rels = []CMDBRelationship{}
	}

	_ = auth

	return rels, nil
}

// DeleteRelationship deletes a CI relationship.
func (s *CMDBService) DeleteRelationship(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM cmdb_relationships WHERE id = $1`,
		id,
	)
	if err != nil {
		return apperrors.Internal("failed to delete relationship", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CMDBRelationship", id.String())
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:cmdb_relationship",
		EntityType: "cmdb_relationship",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Reconciliation
// ──────────────────────────────────────────────

// reconciliationRunColumns is the canonical column list for the reconciliation_runs table.
const reconciliationRunColumns = `
	id, tenant_id, source, started_at, completed_at,
	matches, discrepancies, new_items,
	report, created_at`

// scanReconciliationRun scans a single reconciliation run row.
func scanReconciliationRun(row pgx.Row) (ReconciliationRun, error) {
	var run ReconciliationRun
	err := row.Scan(
		&run.ID, &run.TenantID, &run.Source, &run.StartedAt, &run.CompletedAt,
		&run.Matches, &run.Discrepancies, &run.NewItems,
		&run.Report, &run.CreatedAt,
	)
	return run, err
}

// CreateReconciliationRun creates a new reconciliation run record.
func (s *CMDBService) CreateReconciliationRun(ctx context.Context, req CreateReconciliationRunRequest) (ReconciliationRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReconciliationRun{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO reconciliation_runs (
			id, tenant_id, source, started_at,
			matches, discrepancies, new_items,
			created_at
		) VALUES (
			$1, $2, $3, $4,
			0, 0, 0,
			$5
		)
		RETURNING ` + reconciliationRunColumns

	run, err := scanReconciliationRun(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Source, now, now,
	))
	if err != nil {
		return ReconciliationRun{}, apperrors.Internal("failed to create reconciliation run", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"source": req.Source,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:reconciliation_run",
		EntityType: "reconciliation_run",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return run, nil
}

// GetReconciliationRun retrieves a single reconciliation run by ID.
func (s *CMDBService) GetReconciliationRun(ctx context.Context, id uuid.UUID) (ReconciliationRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReconciliationRun{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + reconciliationRunColumns + ` FROM reconciliation_runs WHERE id = $1 AND tenant_id = $2`

	run, err := scanReconciliationRun(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return ReconciliationRun{}, apperrors.NotFound("ReconciliationRun", id.String())
		}
		return ReconciliationRun{}, apperrors.Internal("failed to get reconciliation run", err)
	}

	return run, nil
}

// ListReconciliationRuns returns a paginated list of reconciliation runs.
func (s *CMDBService) ListReconciliationRuns(ctx context.Context, params types.PaginationParams) ([]ReconciliationRun, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `SELECT COUNT(*) FROM reconciliation_runs WHERE tenant_id = $1`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count reconciliation runs", err)
	}

	dataQuery := `
		SELECT ` + reconciliationRunColumns + `
		FROM reconciliation_runs
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list reconciliation runs", err)
	}
	defer rows.Close()

	var runs []ReconciliationRun
	for rows.Next() {
		var run ReconciliationRun
		if err := rows.Scan(
			&run.ID, &run.TenantID, &run.Source, &run.StartedAt, &run.CompletedAt,
			&run.Matches, &run.Discrepancies, &run.NewItems,
			&run.Report, &run.CreatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan reconciliation run", err)
		}
		runs = append(runs, run)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate reconciliation runs", err)
	}

	if runs == nil {
		runs = []ReconciliationRun{}
	}

	return runs, total, nil
}

// CompleteReconciliationRun marks a reconciliation run as completed with results.
func (s *CMDBService) CompleteReconciliationRun(ctx context.Context, id uuid.UUID, req CompleteReconciliationRunRequest) (ReconciliationRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReconciliationRun{}, apperrors.Unauthorized("authentication required")
	}

	// Verify run exists.
	_, err := s.GetReconciliationRun(ctx, id)
	if err != nil {
		return ReconciliationRun{}, err
	}

	now := time.Now().UTC()

	query := `
		UPDATE reconciliation_runs SET
			completed_at = $1,
			matches = $2,
			discrepancies = $3,
			new_items = $4,
			report = COALESCE($5, report)
		WHERE id = $6 AND tenant_id = $7
		RETURNING ` + reconciliationRunColumns

	run, err := scanReconciliationRun(s.pool.QueryRow(ctx, query,
		now, req.Matches, req.Discrepancies, req.NewItems, req.Report,
		id, auth.TenantID,
	))
	if err != nil {
		return ReconciliationRun{}, apperrors.Internal("failed to complete reconciliation run", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"matches":       req.Matches,
		"discrepancies": req.Discrepancies,
		"new_items":     req.NewItems,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "complete:reconciliation_run",
		EntityType: "reconciliation_run",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return run, nil
}
