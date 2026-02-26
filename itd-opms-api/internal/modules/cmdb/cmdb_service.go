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
	id, tenant_id, ci_type, name, description,
	status, environment, criticality, owner_id,
	linked_asset_id, attributes, dependencies,
	version, created_at, updated_at`

// scanCMDBItem scans a single CMDB item row into a CMDBItem struct.
func scanCMDBItem(row pgx.Row) (CMDBItem, error) {
	var c CMDBItem
	err := row.Scan(
		&c.ID, &c.TenantID, &c.CIType, &c.Name, &c.Description,
		&c.Status, &c.Environment, &c.Criticality, &c.OwnerID,
		&c.LinkedAssetID, &c.Attributes, &c.Dependencies,
		&c.Version, &c.CreatedAt, &c.UpdatedAt,
	)
	return c, err
}

// scanCMDBItems scans multiple CMDB item rows into a slice.
func scanCMDBItems(rows pgx.Rows) ([]CMDBItem, error) {
	var items []CMDBItem
	for rows.Next() {
		var c CMDBItem
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.CIType, &c.Name, &c.Description,
			&c.Status, &c.Environment, &c.Criticality, &c.OwnerID,
			&c.LinkedAssetID, &c.Attributes, &c.Dependencies,
			&c.Version, &c.CreatedAt, &c.UpdatedAt,
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

	attributes := req.Attributes
	if attributes == nil {
		attributes = json.RawMessage("{}")
	}
	dependencies := req.Dependencies
	if dependencies == nil {
		dependencies = []uuid.UUID{}
	}

	query := `
		INSERT INTO cmdb_items (
			id, tenant_id, ci_type, name, description,
			status, environment, criticality, owner_id,
			linked_asset_id, attributes, dependencies,
			version, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			COALESCE($6, 'active'), $7, $8, $9,
			$10, $11, $12,
			1, $13, $14
		)
		RETURNING ` + cmdbItemColumns

	item, err := scanCMDBItem(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.CIType, req.Name, req.Description,
		req.Status, req.Environment, req.Criticality, req.OwnerID,
		req.LinkedAssetID, attributes, dependencies,
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
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			status = COALESCE($3, status),
			environment = COALESCE($4, environment),
			criticality = COALESCE($5, criticality),
			owner_id = COALESCE($6, owner_id),
			linked_asset_id = COALESCE($7, linked_asset_id),
			attributes = COALESCE($8, attributes),
			dependencies = COALESCE($9, dependencies),
			version = version + 1,
			updated_at = $10
		WHERE id = $11 AND tenant_id = $12
		RETURNING ` + cmdbItemColumns

	item, err := scanCMDBItem(s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Description, req.Status,
		req.Environment, req.Criticality, req.OwnerID,
		req.LinkedAssetID, req.Attributes, req.Dependencies,
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

// CreateRelationship creates a new relationship between two CIs.
func (s *CMDBService) CreateRelationship(ctx context.Context, req CreateRelationshipRequest) (CMDBRelationship, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CMDBRelationship{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO cmdb_relationships (id, tenant_id, source_ci_id, target_ci_id, relationship_type, description, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, tenant_id, source_ci_id, target_ci_id, relationship_type, description, created_at`

	var rel CMDBRelationship
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.SourceCIID, req.TargetCIID, req.RelationshipType, req.Description, now,
	).Scan(
		&rel.ID, &rel.TenantID, &rel.SourceCIID, &rel.TargetCIID,
		&rel.RelationshipType, &rel.Description, &rel.CreatedAt,
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
		SELECT id, tenant_id, source_ci_id, target_ci_id, relationship_type, description, created_at
		FROM cmdb_relationships
		WHERE tenant_id = $1
			AND (source_ci_id = $2 OR target_ci_id = $2)
		ORDER BY created_at DESC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, ciID)
	if err != nil {
		return nil, apperrors.Internal("failed to list relationships", err)
	}
	defer rows.Close()

	var rels []CMDBRelationship
	for rows.Next() {
		var rel CMDBRelationship
		if err := rows.Scan(
			&rel.ID, &rel.TenantID, &rel.SourceCIID, &rel.TargetCIID,
			&rel.RelationshipType, &rel.Description, &rel.CreatedAt,
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

	return rels, nil
}

// DeleteRelationship deletes a CI relationship.
func (s *CMDBService) DeleteRelationship(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM cmdb_relationships WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
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
	id, tenant_id, source_name, started_at, completed_at,
	status, items_scanned, items_matched, items_unmatched,
	items_new, summary, created_at`

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
			id, tenant_id, source_name, started_at,
			status, items_scanned, items_matched, items_unmatched,
			items_new, created_at
		) VALUES (
			$1, $2, $3, $4,
			'in_progress', 0, 0, 0,
			0, $5
		)
		RETURNING ` + reconciliationRunColumns

	var run ReconciliationRun
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.SourceName, now, now,
	).Scan(
		&run.ID, &run.TenantID, &run.SourceName, &run.StartedAt, &run.CompletedAt,
		&run.Status, &run.ItemsScanned, &run.ItemsMatched, &run.ItemsUnmatched,
		&run.ItemsNew, &run.Summary, &run.CreatedAt,
	)
	if err != nil {
		return ReconciliationRun{}, apperrors.Internal("failed to create reconciliation run", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"source_name": req.SourceName,
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

	var run ReconciliationRun
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&run.ID, &run.TenantID, &run.SourceName, &run.StartedAt, &run.CompletedAt,
		&run.Status, &run.ItemsScanned, &run.ItemsMatched, &run.ItemsUnmatched,
		&run.ItemsNew, &run.Summary, &run.CreatedAt,
	)
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
			&run.ID, &run.TenantID, &run.SourceName, &run.StartedAt, &run.CompletedAt,
			&run.Status, &run.ItemsScanned, &run.ItemsMatched, &run.ItemsUnmatched,
			&run.ItemsNew, &run.Summary, &run.CreatedAt,
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

	completedStatus := "completed"
	if req.Status != nil {
		completedStatus = *req.Status
	}

	query := `
		UPDATE reconciliation_runs SET
			completed_at = $1,
			status = $2,
			items_scanned = COALESCE($3, items_scanned),
			items_matched = COALESCE($4, items_matched),
			items_unmatched = COALESCE($5, items_unmatched),
			items_new = COALESCE($6, items_new),
			summary = COALESCE($7, summary)
		WHERE id = $8 AND tenant_id = $9
		RETURNING ` + reconciliationRunColumns

	var run ReconciliationRun
	err = s.pool.QueryRow(ctx, query,
		now, completedStatus,
		req.ItemsScanned, req.ItemsMatched, req.ItemsUnmatched,
		req.ItemsNew, req.Summary,
		id, auth.TenantID,
	).Scan(
		&run.ID, &run.TenantID, &run.SourceName, &run.StartedAt, &run.CompletedAt,
		&run.Status, &run.ItemsScanned, &run.ItemsMatched, &run.ItemsUnmatched,
		&run.ItemsNew, &run.Summary, &run.CreatedAt,
	)
	if err != nil {
		return ReconciliationRun{}, apperrors.Internal("failed to complete reconciliation run", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"status":          completedStatus,
		"items_scanned":   req.ItemsScanned,
		"items_matched":   req.ItemsMatched,
		"items_unmatched": req.ItemsUnmatched,
		"items_new":       req.ItemsNew,
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
