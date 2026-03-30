package reporting

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
// QueryBuilderService
// ──────────────────────────────────────────────

// QueryBuilderService provides safe, parameterized ad-hoc query execution
// against whitelisted entity tables and columns.
type QueryBuilderService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewQueryBuilderService creates a new QueryBuilderService.
func NewQueryBuilderService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *QueryBuilderService {
	return &QueryBuilderService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Column list & scan helper
// ──────────────────────────────────────────────

const savedQueryColumns = `
	id, tenant_id, name, description, entity_type,
	filters, columns, sort_by, sort_order, group_by,
	chart_type, is_shared, schedule, email_recipients,
	created_by, created_at, updated_at`

func scanSavedQuery(row pgx.Row) (SavedQuery, error) {
	var sq SavedQuery
	err := row.Scan(
		&sq.ID, &sq.TenantID, &sq.Name, &sq.Description, &sq.EntityType,
		&sq.Filters, &sq.Columns, &sq.SortBy, &sq.SortOrder, &sq.GroupBy,
		&sq.ChartType, &sq.IsShared, &sq.Schedule, &sq.EmailRecipients,
		&sq.CreatedBy, &sq.CreatedAt, &sq.UpdatedAt,
	)
	return sq, err
}

// ──────────────────────────────────────────────
// Saved Query CRUD
// ──────────────────────────────────────────────

// CreateSavedQuery persists a new saved query.
func (s *QueryBuilderService) CreateSavedQuery(ctx context.Context, req CreateSavedQueryRequest) (SavedQuery, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SavedQuery{}, apperrors.Unauthorized("authentication required")
	}

	if err := s.validateQuerySpec(req.EntityType, req.Columns, req.Filters, req.SortBy, req.GroupBy); err != nil {
		return SavedQuery{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	filters, _ := json.Marshal(req.Filters)
	if req.Filters == nil {
		filters = []byte("[]")
	}
	recipients := req.EmailRecipients
	if recipients == nil {
		recipients = []string{}
	}

	query := `
		INSERT INTO saved_queries (
			id, tenant_id, name, description, entity_type,
			filters, columns, sort_by, sort_order, group_by,
			chart_type, is_shared, schedule, email_recipients,
			created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17
		)
		RETURNING ` + savedQueryColumns

	sq, err := scanSavedQuery(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.EntityType,
		filters, req.Columns, req.SortBy, req.SortOrder, req.GroupBy,
		req.ChartType, req.IsShared, req.Schedule, recipients,
		auth.UserID, now, now,
	))
	if err != nil {
		return SavedQuery{}, apperrors.Internal("failed to create saved query", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name, "entity_type": req.EntityType})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:saved_query",
		EntityType: "saved_query",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return sq, nil
}

// GetSavedQuery retrieves a saved query by ID.
func (s *QueryBuilderService) GetSavedQuery(ctx context.Context, id uuid.UUID) (SavedQuery, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SavedQuery{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + savedQueryColumns + ` FROM saved_queries WHERE id = $1 AND tenant_id = $2`
	sq, err := scanSavedQuery(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return SavedQuery{}, apperrors.NotFound("SavedQuery", id.String())
		}
		return SavedQuery{}, apperrors.Internal("failed to get saved query", err)
	}
	return sq, nil
}

// ListSavedQueries returns a filtered, paginated list of saved queries.
func (s *QueryBuilderService) ListSavedQueries(ctx context.Context, entityType *string, params types.PaginationParams) ([]SavedQuery, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Users see their own queries + shared queries from the same tenant.
	countQuery := `
		SELECT COUNT(*)
		FROM saved_queries
		WHERE tenant_id = $1
			AND (created_by = $2 OR is_shared = true)
			AND ($3::text IS NULL OR entity_type = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, auth.UserID, entityType).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count saved queries", err)
	}

	dataQuery := `
		SELECT ` + savedQueryColumns + `
		FROM saved_queries
		WHERE tenant_id = $1
			AND (created_by = $2 OR is_shared = true)
			AND ($3::text IS NULL OR entity_type = $3)
		ORDER BY updated_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, auth.UserID, entityType, params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list saved queries", err)
	}
	defer rows.Close()

	var queries []SavedQuery
	for rows.Next() {
		var sq SavedQuery
		if err := rows.Scan(
			&sq.ID, &sq.TenantID, &sq.Name, &sq.Description, &sq.EntityType,
			&sq.Filters, &sq.Columns, &sq.SortBy, &sq.SortOrder, &sq.GroupBy,
			&sq.ChartType, &sq.IsShared, &sq.Schedule, &sq.EmailRecipients,
			&sq.CreatedBy, &sq.CreatedAt, &sq.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan saved query", err)
		}
		queries = append(queries, sq)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate saved queries", err)
	}
	if queries == nil {
		queries = []SavedQuery{}
	}
	return queries, total, nil
}

// UpdateSavedQuery updates an existing saved query (partial update).
func (s *QueryBuilderService) UpdateSavedQuery(ctx context.Context, id uuid.UUID, req UpdateSavedQueryRequest) (SavedQuery, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SavedQuery{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetSavedQuery(ctx, id)
	if err != nil {
		return SavedQuery{}, err
	}
	if existing.CreatedBy != auth.UserID {
		return SavedQuery{}, apperrors.Forbidden("you can only update your own saved queries")
	}

	// Validate if entity_type or columns are changing.
	entityType := existing.EntityType
	if req.EntityType != nil {
		entityType = *req.EntityType
	}
	cols := existing.Columns
	if req.Columns != nil {
		cols = req.Columns
	}
	if err := s.validateQuerySpec(entityType, cols, req.Filters, req.SortBy, req.GroupBy); err != nil {
		return SavedQuery{}, err
	}

	var filtersJSON []byte
	if req.Filters != nil {
		filtersJSON, _ = json.Marshal(req.Filters)
	}

	now := time.Now().UTC()

	query := `
		UPDATE saved_queries SET
			name             = COALESCE($1, name),
			description      = COALESCE($2, description),
			entity_type      = COALESCE($3, entity_type),
			filters          = COALESCE($4, filters),
			columns          = COALESCE($5, columns),
			sort_by          = COALESCE($6, sort_by),
			sort_order       = COALESCE($7, sort_order),
			group_by         = COALESCE($8, group_by),
			chart_type       = COALESCE($9, chart_type),
			is_shared        = COALESCE($10, is_shared),
			schedule         = COALESCE($11, schedule),
			email_recipients = COALESCE($12, email_recipients),
			updated_at       = $13
		WHERE id = $14 AND tenant_id = $15
		RETURNING ` + savedQueryColumns

	sq, err := scanSavedQuery(s.pool.QueryRow(ctx, query,
		req.Name, req.Description, req.EntityType,
		filtersJSON, req.Columns, req.SortBy, req.SortOrder,
		req.GroupBy, req.ChartType, req.IsShared,
		req.Schedule, req.EmailRecipients,
		now, id, auth.TenantID,
	))
	if err != nil {
		return SavedQuery{}, apperrors.Internal("failed to update saved query", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:saved_query",
		EntityType: "saved_query",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return sq, nil
}

// DeleteSavedQuery deletes a saved query.
func (s *QueryBuilderService) DeleteSavedQuery(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx,
		`DELETE FROM saved_queries WHERE id = $1 AND tenant_id = $2 AND created_by = $3`,
		id, auth.TenantID, auth.UserID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete saved query", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("SavedQuery", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:saved_query",
		EntityType: "saved_query",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}
	return nil
}

// ──────────────────────────────────────────────
// Query Execution (safe parameterized builder)
// ──────────────────────────────────────────────

const queryPreviewLimit = 100
const queryMaxLimit = 10000

// PreviewQuery builds and executes a query, returning up to 100 rows.
func (s *QueryBuilderService) PreviewQuery(ctx context.Context, req ExecuteQueryRequest) (QueryResult, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return QueryResult{}, apperrors.Unauthorized("authentication required")
	}

	if err := s.validateQuerySpec(req.EntityType, req.Columns, req.Filters, req.SortBy, req.GroupBy); err != nil {
		return QueryResult{}, err
	}

	sql, args, err := s.buildQuery(auth.TenantID, req, queryPreviewLimit)
	if err != nil {
		return QueryResult{}, err
	}

	return s.executeQuery(ctx, sql, args, req.Columns)
}

// ExportQuery builds and executes a query with the full export row limit (up to 10 000 rows).
func (s *QueryBuilderService) ExportQuery(ctx context.Context, req ExecuteQueryRequest) (QueryResult, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return QueryResult{}, apperrors.Unauthorized("authentication required")
	}

	if err := s.validateQuerySpec(req.EntityType, req.Columns, req.Filters, req.SortBy, req.GroupBy); err != nil {
		return QueryResult{}, err
	}

	sql, args, err := s.buildQuery(auth.TenantID, req, queryMaxLimit)
	if err != nil {
		return QueryResult{}, err
	}

	return s.executeQuery(ctx, sql, args, req.Columns)
}

// RunSavedQuery loads a saved query and executes it.
func (s *QueryBuilderService) RunSavedQuery(ctx context.Context, id uuid.UUID, limit int) (QueryResult, error) {
	sq, err := s.GetSavedQuery(ctx, id)
	if err != nil {
		return QueryResult{}, err
	}

	var filters []QueryFilter
	if err := json.Unmarshal(sq.Filters, &filters); err != nil {
		return QueryResult{}, apperrors.BadRequest("invalid saved query filters")
	}

	maxRows := queryMaxLimit
	if limit > 0 && limit < maxRows {
		maxRows = limit
	}

	req := ExecuteQueryRequest{
		EntityType: sq.EntityType,
		Columns:    sq.Columns,
		Filters:    filters,
		SortBy:     sq.SortBy,
		SortOrder:  sq.SortOrder,
		GroupBy:    sq.GroupBy,
	}

	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return QueryResult{}, apperrors.Unauthorized("authentication required")
	}

	sql, args, err := s.buildQuery(auth.TenantID, req, maxRows)
	if err != nil {
		return QueryResult{}, err
	}

	return s.executeQuery(ctx, sql, args, sq.Columns)
}

// RunSavedQueryForScheduler executes a saved query without auth context (for background scheduler).
func (s *QueryBuilderService) RunSavedQueryForScheduler(ctx context.Context, sq SavedQuery) (QueryResult, error) {
	var filters []QueryFilter
	if err := json.Unmarshal(sq.Filters, &filters); err != nil {
		return QueryResult{}, fmt.Errorf("invalid saved query filters: %w", err)
	}

	req := ExecuteQueryRequest{
		EntityType: sq.EntityType,
		Columns:    sq.Columns,
		Filters:    filters,
		SortBy:     sq.SortBy,
		SortOrder:  sq.SortOrder,
		GroupBy:    sq.GroupBy,
	}

	sql, args, err := s.buildQuery(sq.TenantID, req, queryMaxLimit)
	if err != nil {
		return QueryResult{}, err
	}

	return s.executeQuery(ctx, sql, args, sq.Columns)
}

// ListScheduledQueries returns all saved queries with a schedule for a given tenant.
func (s *QueryBuilderService) ListScheduledQueries(ctx context.Context) ([]SavedQuery, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+savedQueryColumns+`
		FROM saved_queries
		WHERE schedule IS NOT NULL
			AND array_length(email_recipients, 1) > 0
		ORDER BY updated_at DESC
		LIMIT 500`,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list scheduled queries: %w", err)
	}
	defer rows.Close()

	var queries []SavedQuery
	for rows.Next() {
		var sq SavedQuery
		if err := rows.Scan(
			&sq.ID, &sq.TenantID, &sq.Name, &sq.Description, &sq.EntityType,
			&sq.Filters, &sq.Columns, &sq.SortBy, &sq.SortOrder, &sq.GroupBy,
			&sq.ChartType, &sq.IsShared, &sq.Schedule, &sq.EmailRecipients,
			&sq.CreatedBy, &sq.CreatedAt, &sq.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan scheduled query: %w", err)
		}
		queries = append(queries, sq)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate scheduled queries: %w", err)
	}
	return queries, nil
}

// ──────────────────────────────────────────────
// Safe query builder internals
// ──────────────────────────────────────────────

// buildQuery converts the filter spec into a safe, parameterized SQL query.
// All column and table references are validated against a whitelist.
func (s *QueryBuilderService) buildQuery(tenantID uuid.UUID, req ExecuteQueryRequest, limit int) (string, []any, error) {
	tableName, ok := entityTableMap[req.EntityType]
	if !ok {
		return "", nil, apperrors.BadRequest("unsupported entity type: " + req.EntityType)
	}

	allowed, ok := allowedFieldsMap[req.EntityType]
	if !ok {
		return "", nil, apperrors.BadRequest("no field whitelist for entity type: " + req.EntityType)
	}

	// Validate and whitelist columns.
	selectCols := make([]string, 0, len(req.Columns))
	for _, col := range req.Columns {
		dbCol, ok := allowed[col]
		if !ok {
			return "", nil, apperrors.BadRequest("field not allowed for " + req.EntityType + ": " + col)
		}
		selectCols = append(selectCols, dbCol+" AS \""+col+"\"")
	}
	if len(selectCols) == 0 {
		return "", nil, apperrors.BadRequest("at least one column is required")
	}

	// Start building. Arg index 1 = tenant_id.
	args := []any{tenantID}
	argIdx := 2

	var whereClauses []string
	whereClauses = append(whereClauses, "tenant_id = $1")

	// For entity types that share the tickets table, add an implicit type filter.
	if implicitType, ok := entityImplicitTypeFilter[req.EntityType]; ok {
		whereClauses = append(whereClauses, fmt.Sprintf("type = $%d", argIdx))
		args = append(args, implicitType)
		argIdx++
	}

	// Build filter WHERE clauses.
	for _, f := range req.Filters {
		dbCol, ok := allowed[f.Field]
		if !ok {
			return "", nil, apperrors.BadRequest("filter field not allowed for " + req.EntityType + ": " + f.Field)
		}

		clause, newArgs, newIdx, err := buildFilterClause(dbCol, f, argIdx)
		if err != nil {
			return "", nil, err
		}
		whereClauses = append(whereClauses, clause)
		args = append(args, newArgs...)
		argIdx = newIdx
	}

	// Build SELECT.
	var sb strings.Builder
	sb.WriteString("SELECT ")
	sb.WriteString(strings.Join(selectCols, ", "))
	sb.WriteString(" FROM ")
	sb.WriteString(tableName)
	sb.WriteString(" WHERE ")
	sb.WriteString(strings.Join(whereClauses, " AND "))

	// GROUP BY.
	if req.GroupBy != nil {
		gbCol, ok := allowed[*req.GroupBy]
		if !ok {
			return "", nil, apperrors.BadRequest("group_by field not allowed: " + *req.GroupBy)
		}
		sb.WriteString(" GROUP BY ")
		sb.WriteString(gbCol)
	}

	// ORDER BY.
	if req.SortBy != nil {
		sortCol, ok := allowed[*req.SortBy]
		if !ok {
			return "", nil, apperrors.BadRequest("sort_by field not allowed: " + *req.SortBy)
		}
		sb.WriteString(" ORDER BY ")
		sb.WriteString(sortCol)
		order := "DESC"
		if req.SortOrder != nil && strings.ToUpper(*req.SortOrder) == "ASC" {
			order = "ASC"
		}
		sb.WriteString(" " + order)
	} else {
		sb.WriteString(" ORDER BY created_at DESC")
	}

	// LIMIT.
	sb.WriteString(fmt.Sprintf(" LIMIT %d", limit))

	return sb.String(), args, nil
}

// buildFilterClause converts a single QueryFilter into a parameterized WHERE clause.
func buildFilterClause(dbCol string, f QueryFilter, argIdx int) (string, []any, int, error) {
	switch f.Operator {
	case "eq":
		return fmt.Sprintf("%s = $%d", dbCol, argIdx), []any{f.Value}, argIdx + 1, nil

	case "neq":
		return fmt.Sprintf("%s != $%d", dbCol, argIdx), []any{f.Value}, argIdx + 1, nil

	case "gt":
		return fmt.Sprintf("%s > $%d", dbCol, argIdx), []any{f.Value}, argIdx + 1, nil

	case "gte":
		return fmt.Sprintf("%s >= $%d", dbCol, argIdx), []any{f.Value}, argIdx + 1, nil

	case "lt":
		return fmt.Sprintf("%s < $%d", dbCol, argIdx), []any{f.Value}, argIdx + 1, nil

	case "lte":
		return fmt.Sprintf("%s <= $%d", dbCol, argIdx), []any{f.Value}, argIdx + 1, nil

	case "contains":
		return fmt.Sprintf("%s ILIKE $%d", dbCol, argIdx),
			[]any{"%" + fmt.Sprint(f.Value) + "%"}, argIdx + 1, nil

	case "is_null":
		return fmt.Sprintf("%s IS NULL", dbCol), nil, argIdx, nil

	case "is_not_null":
		return fmt.Sprintf("%s IS NOT NULL", dbCol), nil, argIdx, nil

	case "in":
		vals, ok := f.Value.([]any)
		if !ok {
			return "", nil, argIdx, apperrors.BadRequest("'in' operator requires an array value")
		}
		if len(vals) == 0 {
			return "FALSE", nil, argIdx, nil
		}
		placeholders := make([]string, len(vals))
		args := make([]any, len(vals))
		for i, v := range vals {
			placeholders[i] = fmt.Sprintf("$%d", argIdx+i)
			args[i] = v
		}
		return fmt.Sprintf("%s IN (%s)", dbCol, strings.Join(placeholders, ", ")),
			args, argIdx + len(vals), nil

	case "not_in":
		vals, ok := f.Value.([]any)
		if !ok {
			return "", nil, argIdx, apperrors.BadRequest("'not_in' operator requires an array value")
		}
		if len(vals) == 0 {
			return "TRUE", nil, argIdx, nil
		}
		placeholders := make([]string, len(vals))
		args := make([]any, len(vals))
		for i, v := range vals {
			placeholders[i] = fmt.Sprintf("$%d", argIdx+i)
			args[i] = v
		}
		return fmt.Sprintf("%s NOT IN (%s)", dbCol, strings.Join(placeholders, ", ")),
			args, argIdx + len(vals), nil

	case "between":
		vals, ok := f.Value.([]any)
		if !ok || len(vals) != 2 {
			return "", nil, argIdx, apperrors.BadRequest("'between' operator requires a 2-element array value")
		}
		return fmt.Sprintf("%s BETWEEN $%d AND $%d", dbCol, argIdx, argIdx+1),
			[]any{vals[0], vals[1]}, argIdx + 2, nil

	default:
		return "", nil, argIdx, apperrors.BadRequest("unsupported operator: " + f.Operator)
	}
}

// executeQuery runs the built SQL and returns results as maps.
func (s *QueryBuilderService) executeQuery(ctx context.Context, sql string, args []any, columns []string) (QueryResult, error) {
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		slog.ErrorContext(ctx, "query builder: query execution failed", "error", err, "sql", sql)
		return QueryResult{}, apperrors.Internal("query execution failed", err)
	}
	defer rows.Close()

	fieldDescs := rows.FieldDescriptions()
	var data []map[string]any

	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return QueryResult{}, apperrors.Internal("failed to read query row", err)
		}

		row := make(map[string]any, len(fieldDescs))
		for i, fd := range fieldDescs {
			row[string(fd.Name)] = vals[i]
		}
		data = append(data, row)
	}
	if err := rows.Err(); err != nil {
		return QueryResult{}, apperrors.Internal("failed to iterate query results", err)
	}
	if data == nil {
		data = []map[string]any{}
	}

	return QueryResult{
		Columns:  columns,
		Rows:     data,
		RowCount: len(data),
	}, nil
}

// validateQuerySpec validates that entity_type, columns, filters, sortBy, groupBy are all in the whitelist.
func (s *QueryBuilderService) validateQuerySpec(entityType string, columns []string, filters []QueryFilter, sortBy, groupBy *string) error {
	if _, ok := entityTableMap[entityType]; !ok {
		return apperrors.BadRequest("unsupported entity type: " + entityType)
	}

	allowed, ok := allowedFieldsMap[entityType]
	if !ok {
		return apperrors.BadRequest("no field whitelist for entity type: " + entityType)
	}

	if len(columns) == 0 {
		return apperrors.BadRequest("at least one column is required")
	}

	for _, col := range columns {
		if _, ok := allowed[col]; !ok {
			return apperrors.BadRequest("field not allowed for " + entityType + ": " + col)
		}
	}

	for _, f := range filters {
		if _, ok := allowed[f.Field]; !ok {
			return apperrors.BadRequest("filter field not allowed for " + entityType + ": " + f.Field)
		}
		if !isValidOperator(f.Operator) {
			return apperrors.BadRequest("unsupported operator: " + f.Operator)
		}
	}

	if sortBy != nil {
		if _, ok := allowed[*sortBy]; !ok {
			return apperrors.BadRequest("sort_by field not allowed: " + *sortBy)
		}
	}

	if groupBy != nil {
		if _, ok := allowed[*groupBy]; !ok {
			return apperrors.BadRequest("group_by field not allowed: " + *groupBy)
		}
	}

	return nil
}

var validOperators = map[string]bool{
	"eq": true, "neq": true,
	"in": true, "not_in": true,
	"gt": true, "gte": true,
	"lt": true, "lte": true,
	"between": true, "contains": true,
	"is_null": true, "is_not_null": true,
}

func isValidOperator(op string) bool {
	return validOperators[op]
}

// ──────────────────────────────────────────────
// Entity-to-table mapping & field whitelists
// ──────────────────────────────────────────────

// entityImplicitTypeFilter maps entity types that share the tickets table
// to the implicit WHERE type = ? clause value.
var entityImplicitTypeFilter = map[string]string{
	"tickets":          "incident",
	"changes":          "change",
	"service_requests": "service_request",
}

// entityTableMap maps entity_type → actual SQL table name.
var entityTableMap = map[string]string{
	"tickets":          "tickets",
	"assets":           "assets",
	"cmdb_items":       "ci_items",
	"problems":         "problems",
	"changes":          "tickets",
	"releases":         "releases",
	"service_requests": "tickets",
	"kb_articles":      "kb_articles",
}

// allowedFieldsMap maps entity_type → { frontend_field_name → SQL column expression }.
// Every value users can reference must appear here.
var allowedFieldsMap = map[string]map[string]string{
	"tickets": {
		"id":                "id",
		"ticket_number":     "ticket_number",
		"type":              "type",
		"category":          "category",
		"subcategory":       "subcategory",
		"title":             "title",
		"description":       "description",
		"priority":          "priority",
		"urgency":           "urgency",
		"impact":            "impact",
		"status":            "status",
		"channel":           "channel",
		"reporter_id":       "reporter_id",
		"assignee_id":       "assignee_id",
		"team_queue_id":     "team_queue_id",
		"org_unit_id":       "org_unit_id",
		"sla_policy_id":     "sla_policy_id",
		"created_at":        "created_at",
		"updated_at":        "updated_at",
		"resolved_at":       "resolved_at",
		"closed_at":         "closed_at",
		"first_response_at": "first_response_at",
	},
	"assets": {
		"id":            "id",
		"asset_tag":     "asset_tag",
		"name":          "name",
		"description":   "description",
		"asset_type":    "asset_type",
		"status":        "status",
		"manufacturer":  "manufacturer",
		"model":         "model",
		"serial_number": "serial_number",
		"location":      "location",
		"department":    "department",
		"owner_id":      "owner_id",
		"purchase_date": "purchase_date",
		"purchase_cost": "purchase_cost",
		"warranty_end":  "warranty_end",
		"org_unit_id":   "org_unit_id",
		"created_at":    "created_at",
		"updated_at":    "updated_at",
	},
	"cmdb_items": {
		"id":          "id",
		"name":        "name",
		"ci_type":     "ci_type",
		"status":      "status",
		"environment": "environment",
		"criticality": "criticality",
		"owner_id":    "owner_id",
		"description": "description",
		"org_unit_id": "org_unit_id",
		"created_at":  "created_at",
		"updated_at":  "updated_at",
	},
	"problems": {
		"id":                  "id",
		"problem_number":      "problem_number",
		"title":               "title",
		"description":         "description",
		"root_cause":          "root_cause",
		"status":              "status",
		"linked_incident_ids": "linked_incident_ids",
		"workaround":          "workaround",
		"permanent_fix":       "permanent_fix",
		"linked_change_id":    "linked_change_id",
		"owner_id":            "owner_id",
		"assigned_group_id":   "assigned_group_id",
		"created_at":          "created_at",
		"updated_at":          "updated_at",
	},
	"changes": {
		"id":            "id",
		"ticket_number": "ticket_number",
		"title":         "title",
		"description":   "description",
		"priority":      "priority",
		"status":        "status",
		"change_type":   "change_type",
		"risk_level":    "risk_level",
		"reporter_id":   "reporter_id",
		"assignee_id":   "assignee_id",
		"team_queue_id": "team_queue_id",
		"planned_start": "planned_start",
		"planned_end":   "planned_end",
		"created_at":    "created_at",
		"updated_at":    "updated_at",
	},
	"releases": {
		"id":                 "id",
		"release_number":     "release_number",
		"title":              "title",
		"description":        "description",
		"release_type":       "release_type",
		"status":             "status",
		"priority":           "priority",
		"planned_start":      "planned_start",
		"planned_end":        "planned_end",
		"release_manager_id": "release_manager_id",
		"created_at":         "created_at",
		"updated_at":         "updated_at",
	},
	"service_requests": {
		"id":            "id",
		"ticket_number": "ticket_number",
		"title":         "title",
		"description":   "description",
		"priority":      "priority",
		"status":        "status",
		"reporter_id":   "reporter_id",
		"assignee_id":   "assignee_id",
		"team_queue_id": "team_queue_id",
		"created_at":    "created_at",
		"updated_at":    "updated_at",
		"resolved_at":   "resolved_at",
	},
	"kb_articles": {
		"id":            "id",
		"title":         "title",
		"status":        "status",
		"category_id":   "category_id",
		"author_id":     "author_id",
		"view_count":    "view_count",
		"helpful_count": "helpful_count",
		"created_at":    "created_at",
		"updated_at":    "updated_at",
		"published_at":  "published_at",
	},
}

// GetFieldsForEntityType returns the allowed field names for the given entity type.
func GetFieldsForEntityType(entityType string) []string {
	allowed, ok := allowedFieldsMap[entityType]
	if !ok {
		return nil
	}
	fields := make([]string, 0, len(allowed))
	for k := range allowed {
		fields = append(fields, k)
	}
	return fields
}
