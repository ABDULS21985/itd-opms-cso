package system

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
)

// ──────────────────────────────────────────────
// AuditExplorerService
// ──────────────────────────────────────────────

// AuditExplorerService handles business logic for the advanced audit log explorer.
type AuditExplorerService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewAuditExplorerService creates a new AuditExplorerService.
func NewAuditExplorerService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *AuditExplorerService {
	return &AuditExplorerService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanAuditEventDetail(row pgx.Row) (AuditEventDetail, error) {
	var e AuditEventDetail
	err := row.Scan(
		&e.ID, &e.TenantID, &e.ActorID, &e.ActorName,
		&e.ActorRole, &e.Action, &e.EntityType, &e.EntityID,
		&e.Changes, &e.PreviousState,
		&e.IPAddress, &e.UserAgent, &e.CorrelationID,
		&e.Checksum, &e.CreatedAt,
	)
	return e, err
}

func scanAuditEventDetails(rows pgx.Rows) ([]AuditEventDetail, error) {
	var events []AuditEventDetail
	for rows.Next() {
		var e AuditEventDetail
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.ActorID, &e.ActorName,
			&e.ActorRole, &e.Action, &e.EntityType, &e.EntityID,
			&e.Changes, &e.PreviousState,
			&e.IPAddress, &e.UserAgent, &e.CorrelationID,
			&e.Checksum, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if events == nil {
		events = []AuditEventDetail{}
	}
	return events, nil
}

// ──────────────────────────────────────────────
// Query builder helpers
// ──────────────────────────────────────────────

// auditSelectCols is the common SELECT column list for audit event detail queries.
const auditSelectCols = `ae.event_id, ae.tenant_id, ae.actor_id, COALESCE(u.display_name, '') AS actor_name,
	ae.actor_role, ae.action, ae.entity_type, ae.entity_id,
	ae.changes, ae.previous_state,
	COALESCE(ae.ip_address::text, '') AS ip_address,
	COALESCE(ae.user_agent, '') AS user_agent,
	COALESCE(ae.correlation_id::text, '') AS correlation_id,
	ae.checksum, ae.timestamp`

// auditFromJoin is the common FROM + JOIN clause.
const auditFromJoin = `FROM audit_events ae
	LEFT JOIN users u ON u.id = ae.actor_id`

// allowedAuditSortColumns maps sort parameter values to safe SQL column references.
var allowedAuditSortColumns = map[string]string{
	"created_at":  "ae.timestamp",
	"action":      "ae.action",
	"entity_type": "ae.entity_type",
	"actor_name":  "u.display_name",
}

// ──────────────────────────────────────────────
// Methods
// ──────────────────────────────────────────────

// ListEvents returns a paginated list of audit events matching the given filters.
func (s *AuditExplorerService) ListEvents(ctx context.Context, tenantID uuid.UUID, params AuditExplorerParams) ([]AuditEventDetail, int64, error) {
	// Defaults.
	if params.SortBy == "" {
		params.SortBy = "created_at"
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

	// Build dynamic WHERE clause.
	var (
		conditions []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	// Tenant isolation is always enforced.
	conditions = append(conditions, "ae.tenant_id = "+nextArg())
	args = append(args, tenantID)

	if params.DateFrom != nil {
		conditions = append(conditions, "ae.timestamp >= "+nextArg())
		args = append(args, *params.DateFrom)
	}

	if params.DateTo != nil {
		conditions = append(conditions, "ae.timestamp <= "+nextArg())
		args = append(args, *params.DateTo)
	}

	if params.ActorID != "" {
		actorUUID, err := uuid.Parse(params.ActorID)
		if err != nil {
			return nil, 0, apperrors.BadRequest("invalid actorId format")
		}
		conditions = append(conditions, "ae.actor_id = "+nextArg())
		args = append(args, actorUUID)
	}

	if params.EntityType != "" {
		conditions = append(conditions, "ae.entity_type = "+nextArg())
		args = append(args, params.EntityType)
	}

	if params.EntityID != "" {
		entityUUID, err := uuid.Parse(params.EntityID)
		if err != nil {
			return nil, 0, apperrors.BadRequest("invalid entityId format")
		}
		conditions = append(conditions, "ae.entity_id = "+nextArg())
		args = append(args, entityUUID)
	}

	if params.Action != "" {
		conditions = append(conditions, "ae.action = "+nextArg())
		args = append(args, params.Action)
	}

	if params.Search != "" {
		conditions = append(conditions, "ae.changes::text ILIKE "+nextArg())
		args = append(args, "%"+params.Search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total matching records.
	countQuery := fmt.Sprintf("SELECT COUNT(*) %s %s", auditFromJoin, whereClause)
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count audit events: %w", err)
	}

	// Resolve sort column safely.
	sortCol, ok := allowedAuditSortColumns[params.SortBy]
	if !ok {
		sortCol = "ae.timestamp"
	}
	sortOrder := "DESC"
	if strings.EqualFold(params.SortOrder, "asc") {
		sortOrder = "ASC"
	}

	offset := (params.Page - 1) * params.PageSize

	dataQuery := fmt.Sprintf(`SELECT %s %s %s ORDER BY %s %s LIMIT %s OFFSET %s`,
		auditSelectCols, auditFromJoin, whereClause,
		sortCol, sortOrder,
		nextArg(), nextArg(),
	)
	args = append(args, params.PageSize, offset)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query audit events: %w", err)
	}
	defer rows.Close()

	events, err := scanAuditEventDetails(rows)
	if err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

// GetEvent returns a single audit event by ID with actor name.
func (s *AuditExplorerService) GetEvent(ctx context.Context, eventID uuid.UUID) (*AuditEventDetail, error) {
	query := fmt.Sprintf(`SELECT %s %s WHERE ae.event_id = $1`, auditSelectCols, auditFromJoin)

	event, err := scanAuditEventDetail(s.pool.QueryRow(ctx, query, eventID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("audit_event", eventID.String())
		}
		return nil, fmt.Errorf("get audit event: %w", err)
	}

	return &event, nil
}

// GetEntityTimeline returns all audit events for a specific entity, ordered by created_at DESC.
func (s *AuditExplorerService) GetEntityTimeline(ctx context.Context, entityType string, entityID uuid.UUID) ([]AuditEventDetail, error) {
	query := fmt.Sprintf(`SELECT %s %s WHERE ae.entity_type = $1 AND ae.entity_id = $2 ORDER BY ae.timestamp DESC`,
		auditSelectCols, auditFromJoin)

	rows, err := s.pool.Query(ctx, query, entityType, entityID)
	if err != nil {
		return nil, fmt.Errorf("get entity timeline: %w", err)
	}
	defer rows.Close()

	events, err := scanAuditEventDetails(rows)
	if err != nil {
		return nil, err
	}

	return events, nil
}

// GetStats returns aggregated audit statistics for the given tenant and date range.
func (s *AuditExplorerService) GetStats(ctx context.Context, tenantID uuid.UUID, dateFrom, dateTo time.Time) (*AuditStatsResponse, error) {
	result := &AuditStatsResponse{}

	// Total count.
	err := s.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM audit_events WHERE tenant_id = $1 AND timestamp >= $2 AND timestamp <= $3",
		tenantID, dateFrom, dateTo,
	).Scan(&result.TotalEvents)
	if err != nil {
		return nil, fmt.Errorf("count total audit events: %w", err)
	}

	// Events per day.
	dayRows, err := s.pool.Query(ctx, `
		SELECT DATE(timestamp)::text AS day, COUNT(*)::int AS cnt
		FROM audit_events
		WHERE tenant_id = $1 AND timestamp >= $2 AND timestamp <= $3
		GROUP BY DATE(timestamp)
		ORDER BY day ASC`,
		tenantID, dateFrom, dateTo)
	if err != nil {
		return nil, fmt.Errorf("query events per day: %w", err)
	}
	defer dayRows.Close()

	for dayRows.Next() {
		var d AuditDayStat
		if err := dayRows.Scan(&d.Date, &d.Count); err != nil {
			return nil, fmt.Errorf("scan day stat: %w", err)
		}
		result.EventsPerDay = append(result.EventsPerDay, d)
	}
	if err := dayRows.Err(); err != nil {
		return nil, err
	}
	if result.EventsPerDay == nil {
		result.EventsPerDay = []AuditDayStat{}
	}

	// Top actors.
	actorRows, err := s.pool.Query(ctx, `
		SELECT ae.actor_id, COALESCE(u.display_name, '') AS actor_name, COUNT(*)::int AS cnt
		FROM audit_events ae
		LEFT JOIN users u ON u.id = ae.actor_id
		WHERE ae.tenant_id = $1 AND ae.timestamp >= $2 AND ae.timestamp <= $3
		GROUP BY ae.actor_id, u.display_name
		ORDER BY cnt DESC
		LIMIT 10`,
		tenantID, dateFrom, dateTo)
	if err != nil {
		return nil, fmt.Errorf("query top actors: %w", err)
	}
	defer actorRows.Close()

	for actorRows.Next() {
		var a AuditActorStat
		if err := actorRows.Scan(&a.ActorID, &a.ActorName, &a.Count); err != nil {
			return nil, fmt.Errorf("scan actor stat: %w", err)
		}
		result.TopActors = append(result.TopActors, a)
	}
	if err := actorRows.Err(); err != nil {
		return nil, err
	}
	if result.TopActors == nil {
		result.TopActors = []AuditActorStat{}
	}

	// Top entity types.
	entityRows, err := s.pool.Query(ctx, `
		SELECT entity_type, COUNT(*)::int AS cnt
		FROM audit_events
		WHERE tenant_id = $1 AND timestamp >= $2 AND timestamp <= $3
		GROUP BY entity_type
		ORDER BY cnt DESC
		LIMIT 10`,
		tenantID, dateFrom, dateTo)
	if err != nil {
		return nil, fmt.Errorf("query top entity types: %w", err)
	}
	defer entityRows.Close()

	for entityRows.Next() {
		var e AuditEntityStat
		if err := entityRows.Scan(&e.EntityType, &e.Count); err != nil {
			return nil, fmt.Errorf("scan entity stat: %w", err)
		}
		result.TopEntities = append(result.TopEntities, e)
	}
	if err := entityRows.Err(); err != nil {
		return nil, err
	}
	if result.TopEntities == nil {
		result.TopEntities = []AuditEntityStat{}
	}

	// Top actions.
	actionRows, err := s.pool.Query(ctx, `
		SELECT action, COUNT(*)::int AS cnt
		FROM audit_events
		WHERE tenant_id = $1 AND timestamp >= $2 AND timestamp <= $3
		GROUP BY action
		ORDER BY cnt DESC
		LIMIT 10`,
		tenantID, dateFrom, dateTo)
	if err != nil {
		return nil, fmt.Errorf("query top actions: %w", err)
	}
	defer actionRows.Close()

	for actionRows.Next() {
		var a AuditActionStat
		if err := actionRows.Scan(&a.Action, &a.Count); err != nil {
			return nil, fmt.Errorf("scan action stat: %w", err)
		}
		result.TopActions = append(result.TopActions, a)
	}
	if err := actionRows.Err(); err != nil {
		return nil, err
	}
	if result.TopActions == nil {
		result.TopActions = []AuditActionStat{}
	}

	return result, nil
}

// ExportEvents returns all audit events matching the given filters, limited to 10,000 records.
func (s *AuditExplorerService) ExportEvents(ctx context.Context, tenantID uuid.UUID, params AuditExplorerParams) ([]AuditEventDetail, error) {
	// Defaults.
	if params.SortBy == "" {
		params.SortBy = "created_at"
	}
	if params.SortOrder == "" {
		params.SortOrder = "desc"
	}

	// Build dynamic WHERE clause.
	var (
		conditions []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	// Tenant isolation is always enforced.
	conditions = append(conditions, "ae.tenant_id = "+nextArg())
	args = append(args, tenantID)

	if params.DateFrom != nil {
		conditions = append(conditions, "ae.timestamp >= "+nextArg())
		args = append(args, *params.DateFrom)
	}

	if params.DateTo != nil {
		conditions = append(conditions, "ae.timestamp <= "+nextArg())
		args = append(args, *params.DateTo)
	}

	if params.ActorID != "" {
		actorUUID, err := uuid.Parse(params.ActorID)
		if err != nil {
			return nil, apperrors.BadRequest("invalid actorId format")
		}
		conditions = append(conditions, "ae.actor_id = "+nextArg())
		args = append(args, actorUUID)
	}

	if params.EntityType != "" {
		conditions = append(conditions, "ae.entity_type = "+nextArg())
		args = append(args, params.EntityType)
	}

	if params.EntityID != "" {
		entityUUID, err := uuid.Parse(params.EntityID)
		if err != nil {
			return nil, apperrors.BadRequest("invalid entityId format")
		}
		conditions = append(conditions, "ae.entity_id = "+nextArg())
		args = append(args, entityUUID)
	}

	if params.Action != "" {
		conditions = append(conditions, "ae.action = "+nextArg())
		args = append(args, params.Action)
	}

	if params.Search != "" {
		conditions = append(conditions, "ae.changes::text ILIKE "+nextArg())
		args = append(args, "%"+params.Search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Resolve sort column safely.
	sortCol, ok := allowedAuditSortColumns[params.SortBy]
	if !ok {
		sortCol = "ae.timestamp"
	}
	sortOrder := "DESC"
	if strings.EqualFold(params.SortOrder, "asc") {
		sortOrder = "ASC"
	}

	dataQuery := fmt.Sprintf(`SELECT %s %s %s ORDER BY %s %s LIMIT 10000`,
		auditSelectCols, auditFromJoin, whereClause,
		sortCol, sortOrder,
	)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("export audit events: %w", err)
	}
	defer rows.Close()

	events, err := scanAuditEventDetails(rows)
	if err != nil {
		return nil, err
	}

	return events, nil
}

// VerifyIntegrity delegates checksum chain verification to the underlying audit service.
// dateFrom and dateTo narrow the scope; pass nil to verify the full tenant history.
func (s *AuditExplorerService) VerifyIntegrity(ctx context.Context, tenantID uuid.UUID, dateFrom, dateTo *time.Time) (*audit.IntegrityResult, error) {
	return s.auditSvc.VerifyIntegrity(ctx, tenantID, dateFrom, dateTo)
}
