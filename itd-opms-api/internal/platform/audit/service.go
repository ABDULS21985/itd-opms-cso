package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/shared/helpers"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// AuditEntry represents a single audit log entry to be recorded.
type AuditEntry struct {
	TenantID      uuid.UUID       `json:"tenantId"`
	ActorID       uuid.UUID       `json:"actorId"`
	ActorRole     string          `json:"actorRole"`
	Action        string          `json:"action"`
	EntityType    string          `json:"entityType"`
	EntityID      uuid.UUID       `json:"entityId"`
	Changes       json.RawMessage `json:"changes,omitempty"`
	PreviousState json.RawMessage `json:"previousState,omitempty"`
	EvidenceRefs  []uuid.UUID     `json:"evidenceRefs,omitempty"`
	IPAddress     string          `json:"ipAddress"`
	UserAgent     string          `json:"userAgent"`
	CorrelationID string          `json:"correlationId"`
}

// AuditEvent represents a stored audit event returned from queries.
type AuditEvent struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenantId"`
	ActorID       uuid.UUID       `json:"actorId"`
	ActorRole     string          `json:"actorRole"`
	Action        string          `json:"action"`
	EntityType    string          `json:"entityType"`
	EntityID      uuid.UUID       `json:"entityId"`
	Changes       json.RawMessage `json:"changes,omitempty"`
	PreviousState json.RawMessage `json:"previousState,omitempty"`
	EvidenceRefs  []uuid.UUID     `json:"evidenceRefs,omitempty"`
	IPAddress     string          `json:"ipAddress"`
	UserAgent     string          `json:"userAgent"`
	CorrelationID string          `json:"correlationId"`
	Checksum      string          `json:"checksum"`
	CreatedAt     time.Time       `json:"createdAt"`
}

// AuditFilter defines the criteria for querying audit events.
type AuditFilter struct {
	TenantID   uuid.UUID  `json:"tenantId"`
	Action     string     `json:"action"`
	EntityType string     `json:"entityType"`
	EntityID   uuid.UUID  `json:"entityId"`
	ActorID    uuid.UUID  `json:"actorId"`
	DateFrom   *time.Time `json:"dateFrom"`
	DateTo     *time.Time `json:"dateTo"`
}

// AuditService provides audit logging and querying capabilities.
type AuditService struct {
	pool *pgxpool.Pool
}

// NewAuditService creates a new AuditService backed by the given connection pool.
func NewAuditService(pool *pgxpool.Pool) *AuditService {
	return &AuditService{pool: pool}
}

// Log inserts a new audit event into the audit_events table.
// The checksum is auto-computed by a DB trigger; this method does not set it.
func (s *AuditService) Log(ctx context.Context, entry AuditEntry) error {
	id := helpers.NewUUID()

	// Ensure evidence_refs is never nil (PostgreSQL can't parse "null" as UUID[]).
	evidenceRefs := entry.EvidenceRefs
	if evidenceRefs == nil {
		evidenceRefs = []uuid.UUID{}
	}

	query := `
		INSERT INTO audit_events (
			event_id, tenant_id, actor_id, actor_role, action,
			entity_type, entity_id, changes, previous_state,
			evidence_refs, ip_address, user_agent, correlation_id,
			timestamp
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14
		)`

	_, err := s.pool.Exec(ctx, query,
		id,
		entry.TenantID,
		entry.ActorID,
		entry.ActorRole,
		entry.Action,
		entry.EntityType,
		entry.EntityID,
		entry.Changes,
		entry.PreviousState,
		evidenceRefs,
		entry.IPAddress,
		entry.UserAgent,
		entry.CorrelationID,
		time.Now().UTC(),
	)
	if err != nil {
		return fmt.Errorf("insert audit event: %w", err)
	}

	slog.DebugContext(ctx, "audit event logged",
		"event_id", id.String(),
		"action", entry.Action,
		"entity_type", entry.EntityType,
		"entity_id", entry.EntityID.String(),
	)

	return nil
}

// Query returns a paginated list of audit events matching the given filters.
func (s *AuditService) Query(ctx context.Context, filter AuditFilter, pagination types.PaginationParams) ([]AuditEvent, int64, error) {
	var (
		conditions []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	// Tenant ID is always required for multi-tenant isolation.
	if filter.TenantID != uuid.Nil {
		conditions = append(conditions, "tenant_id = "+nextArg())
		args = append(args, filter.TenantID)
	}

	if filter.Action != "" {
		conditions = append(conditions, "action = "+nextArg())
		args = append(args, filter.Action)
	}

	if filter.EntityType != "" {
		conditions = append(conditions, "entity_type = "+nextArg())
		args = append(args, filter.EntityType)
	}

	if filter.EntityID != uuid.Nil {
		conditions = append(conditions, "entity_id = "+nextArg())
		args = append(args, filter.EntityID)
	}

	if filter.ActorID != uuid.Nil {
		conditions = append(conditions, "actor_id = "+nextArg())
		args = append(args, filter.ActorID)
	}

	if filter.DateFrom != nil {
		conditions = append(conditions, "timestamp >= "+nextArg())
		args = append(args, *filter.DateFrom)
	}

	if filter.DateTo != nil {
		conditions = append(conditions, "timestamp <= "+nextArg())
		args = append(args, *filter.DateTo)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total matching records.
	countQuery := "SELECT COUNT(*) FROM audit_events " + whereClause
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count audit events: %w", err)
	}

	// Fetch the page of results.
	dataQuery := fmt.Sprintf(`
		SELECT event_id, tenant_id, actor_id, actor_role, action,
			   entity_type, entity_id, changes, previous_state,
			   evidence_refs, ip_address, user_agent, correlation_id,
			   checksum, timestamp
		FROM audit_events
		%s
		ORDER BY timestamp %s
		LIMIT %s OFFSET %s`,
		whereClause,
		pagination.Order,
		nextArg(),
		nextArg(),
	)
	args = append(args, pagination.Limit, pagination.Offset())

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query audit events: %w", err)
	}
	defer rows.Close()

	var events []AuditEvent
	for rows.Next() {
		var (
			evt          AuditEvent
			evidenceJSON []byte
		)
		if err := rows.Scan(
			&evt.ID, &evt.TenantID, &evt.ActorID, &evt.ActorRole, &evt.Action,
			&evt.EntityType, &evt.EntityID, &evt.Changes, &evt.PreviousState,
			&evidenceJSON, &evt.IPAddress, &evt.UserAgent, &evt.CorrelationID,
			&evt.Checksum, &evt.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan audit event: %w", err)
		}

		if evidenceJSON != nil {
			if err := json.Unmarshal(evidenceJSON, &evt.EvidenceRefs); err != nil {
				return nil, 0, fmt.Errorf("unmarshal evidence refs: %w", err)
			}
		}

		events = append(events, evt)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate audit events: %w", err)
	}

	return events, total, nil
}

// GetByID retrieves a single audit event by its ID.
func (s *AuditService) GetByID(ctx context.Context, eventID uuid.UUID) (*AuditEvent, error) {
	query := `
		SELECT event_id, tenant_id, actor_id, actor_role, action,
			   entity_type, entity_id, changes, previous_state,
			   evidence_refs, ip_address, user_agent, correlation_id,
			   checksum, timestamp
		FROM audit_events
		WHERE event_id = $1`

	var (
		evt          AuditEvent
		evidenceJSON []byte
	)
	err := s.pool.QueryRow(ctx, query, eventID).Scan(
		&evt.ID, &evt.TenantID, &evt.ActorID, &evt.ActorRole, &evt.Action,
		&evt.EntityType, &evt.EntityID, &evt.Changes, &evt.PreviousState,
		&evidenceJSON, &evt.IPAddress, &evt.UserAgent, &evt.CorrelationID,
		&evt.Checksum, &evt.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get audit event: %w", err)
	}

	if evidenceJSON != nil {
		if err := json.Unmarshal(evidenceJSON, &evt.EvidenceRefs); err != nil {
			return nil, fmt.Errorf("unmarshal evidence refs: %w", err)
		}
	}

	return &evt, nil
}

// IntegrityResult contains the outcome of a checksum chain verification.
type IntegrityResult struct {
	Valid        bool   `json:"valid"`
	TotalEvents  int64  `json:"totalEvents"`
	Verified     int64  `json:"verified"`
	FirstInvalid string `json:"firstInvalid,omitempty"`
}

// VerifyIntegrity verifies the checksum chain for audit events belonging to
// the given tenant. An optional date range narrows the scope; when nil the
// entire tenant history is verified.
func (s *AuditService) VerifyIntegrity(ctx context.Context, tenantID uuid.UUID, dateFrom, dateTo *time.Time) (*IntegrityResult, error) {
	var (
		conditions []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	conditions = append(conditions, "tenant_id = "+nextArg())
	args = append(args, tenantID)

	if dateFrom != nil {
		conditions = append(conditions, "timestamp >= "+nextArg())
		args = append(args, *dateFrom)
	}
	if dateTo != nil {
		conditions = append(conditions, "timestamp <= "+nextArg())
		args = append(args, *dateTo)
	}

	query := fmt.Sprintf(`
		SELECT event_id, tenant_id, actor_id, action, entity_type,
			   entity_id, changes, checksum, timestamp
		FROM audit_events
		WHERE %s
		ORDER BY timestamp ASC`, strings.Join(conditions, " AND "))

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query audit events for integrity: %w", err)
	}
	defer rows.Close()

	result := &IntegrityResult{Valid: true}

	for rows.Next() {
		var (
			id         uuid.UUID
			tid        uuid.UUID
			actorID    uuid.UUID
			action     string
			entityType string
			entityID   uuid.UUID
			changes    json.RawMessage
			checksum   string
			createdAt  time.Time
		)

		if err := rows.Scan(&id, &tid, &actorID, &action, &entityType,
			&entityID, &changes, &checksum, &createdAt); err != nil {
			return nil, fmt.Errorf("scan audit event for integrity: %w", err)
		}

		result.TotalEvents++

		// Use Unix microseconds to match the DB trigger which computes:
		// ((EXTRACT(EPOCH FROM timestamp) * 1000000)::bigint)::text
		expected := helpers.ComputeAuditChecksum(
			tid.String(),
			actorID.String(),
			action,
			entityType,
			entityID.String(),
			changes,
			strconv.FormatInt(createdAt.UTC().UnixMicro(), 10),
		)

		if expected == checksum {
			result.Verified++
		} else {
			result.Valid = false
			if result.FirstInvalid == "" {
				result.FirstInvalid = id.String()
			}
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate audit events for integrity: %w", err)
	}

	return result, nil
}
