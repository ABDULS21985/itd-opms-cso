package governance

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// OverdueStats provides overdue action statistics for the tenant dashboard.
type OverdueStats struct {
	TotalOverdue       int                 `json:"totalOverdue"`
	OverdueByPriority  map[string]int      `json:"overdueByPriority"`
	OverdueByOwner     []OwnerOverdueCount `json:"overdueByOwner"`
	OldestOverdueDays  int                 `json:"oldestOverdueDays"`
	AvgDaysOverdue     float64             `json:"avgDaysOverdue"`
	DueThisWeek        int                 `json:"dueThisWeek"`
	CompletedThisMonth int                 `json:"completedThisMonth"`
}

// OwnerOverdueCount tracks overdue actions per owner.
type OwnerOverdueCount struct {
	OwnerID   uuid.UUID `json:"ownerId"`
	OwnerName string    `json:"ownerName"`
	Count     int       `json:"count"`
}

// MeetingService handles business logic for meeting management.
type MeetingService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewMeetingService creates a new MeetingService.
func NewMeetingService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *MeetingService {
	return &MeetingService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// CreateMeeting creates a new meeting.
func (s *MeetingService) CreateMeeting(ctx context.Context, tenantID, organizerID uuid.UUID, req CreateMeetingRequest) (*Meeting, error) {
	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO meetings (
			id, tenant_id, title, meeting_type, agenda, location,
			scheduled_at, duration_minutes, recurrence_rule, template_agenda,
			attendee_ids, organizer_id, status, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, tenant_id, title, meeting_type, agenda, minutes, location,
			scheduled_at, duration_minutes, recurrence_rule, template_agenda,
			attendee_ids, organizer_id, status, created_at`

	var m Meeting
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.Title, req.MeetingType, req.Agenda, req.Location,
		req.ScheduledAt, req.DurationMinutes, req.RecurrenceRule, req.TemplateAgenda,
		req.AttendeeIDs, organizerID, MeetingStatusScheduled, now,
	).Scan(
		&m.ID, &m.TenantID, &m.Title, &m.MeetingType, &m.Agenda, &m.Minutes, &m.Location,
		&m.ScheduledAt, &m.DurationMinutes, &m.RecurrenceRule, &m.TemplateAgenda,
		&m.AttendeeIDs, &m.OrganizerID, &m.Status, &m.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create meeting", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":        req.Title,
		"scheduled_at": req.ScheduledAt,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    organizerID,
		Action:     "meeting.created",
		EntityType: "meeting",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &m, nil
}

// GetMeeting retrieves a meeting by ID.
func (s *MeetingService) GetMeeting(ctx context.Context, tenantID, meetingID uuid.UUID) (*Meeting, error) {
	query := `
		SELECT id, tenant_id, title, meeting_type, agenda, minutes, location,
			scheduled_at, duration_minutes, recurrence_rule, template_agenda,
			attendee_ids, organizer_id, status, created_at
		FROM meetings
		WHERE id = $1 AND tenant_id = $2`

	var m Meeting
	err := s.pool.QueryRow(ctx, query, meetingID, tenantID).Scan(
		&m.ID, &m.TenantID, &m.Title, &m.MeetingType, &m.Agenda, &m.Minutes, &m.Location,
		&m.ScheduledAt, &m.DurationMinutes, &m.RecurrenceRule, &m.TemplateAgenda,
		&m.AttendeeIDs, &m.OrganizerID, &m.Status, &m.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("Meeting", meetingID.String())
		}
		return nil, apperrors.Internal("failed to get meeting", err)
	}

	return &m, nil
}

// ListMeetings returns a paginated list of meetings, optionally filtered by status.
func (s *MeetingService) ListMeetings(ctx context.Context, tenantID uuid.UUID, status string, limit, offset int) ([]Meeting, int64, error) {
	auth := types.GetAuthContext(ctx)

	var statusParam *string
	if status != "" {
		statusParam = &status
	}

	// Build base args: $1=tenantID, $2=status.
	args := []interface{}{tenantID, statusParam}
	nextIdx := 3

	// Add org scope filter.
	orgClause := ""
	orgFilter, orgParam := types.BuildOrgFilter(auth, "org_unit_id", nextIdx)
	if orgFilter != "" {
		orgClause = " AND " + orgFilter
		args = append(args, orgParam)
		nextIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM meetings
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)%s`, orgClause)

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count meetings", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, tenant_id, title, meeting_type, agenda, minutes, location,
			scheduled_at, duration_minutes, recurrence_rule, template_agenda,
			attendee_ids, organizer_id, status, created_at
		FROM meetings
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)%s
		ORDER BY scheduled_at DESC
		LIMIT $%d OFFSET $%d`, orgClause, nextIdx, nextIdx+1)

	dataArgs := append(args, limit, offset)
	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list meetings", err)
	}
	defer rows.Close()

	var meetings []Meeting
	for rows.Next() {
		var m Meeting
		if err := rows.Scan(
			&m.ID, &m.TenantID, &m.Title, &m.MeetingType, &m.Agenda, &m.Minutes, &m.Location,
			&m.ScheduledAt, &m.DurationMinutes, &m.RecurrenceRule, &m.TemplateAgenda,
			&m.AttendeeIDs, &m.OrganizerID, &m.Status, &m.CreatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan meeting", err)
		}
		meetings = append(meetings, m)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate meetings", err)
	}

	if meetings == nil {
		meetings = []Meeting{}
	}

	return meetings, total, nil
}

// UpdateMeeting updates an existing meeting (including minutes).
func (s *MeetingService) UpdateMeeting(ctx context.Context, tenantID, meetingID uuid.UUID, req UpdateMeetingRequest) (*Meeting, error) {
	query := `
		UPDATE meetings SET
			title = COALESCE($1, title),
			meeting_type = COALESCE($2, meeting_type),
			agenda = COALESCE($3, agenda),
			minutes = COALESCE($4, minutes),
			location = COALESCE($5, location),
			scheduled_at = COALESCE($6, scheduled_at),
			duration_minutes = COALESCE($7, duration_minutes),
			recurrence_rule = COALESCE($8, recurrence_rule),
			template_agenda = COALESCE($9, template_agenda),
			attendee_ids = COALESCE($10, attendee_ids),
			status = COALESCE($11, status)
		WHERE id = $12 AND tenant_id = $13
		RETURNING id, tenant_id, title, meeting_type, agenda, minutes, location,
			scheduled_at, duration_minutes, recurrence_rule, template_agenda,
			attendee_ids, organizer_id, status, created_at`

	var m Meeting
	err := s.pool.QueryRow(ctx, query,
		req.Title, req.MeetingType, req.Agenda, req.Minutes, req.Location,
		req.ScheduledAt, req.DurationMinutes, req.RecurrenceRule, req.TemplateAgenda,
		req.AttendeeIDs, req.Status,
		meetingID, tenantID,
	).Scan(
		&m.ID, &m.TenantID, &m.Title, &m.MeetingType, &m.Agenda, &m.Minutes, &m.Location,
		&m.ScheduledAt, &m.DurationMinutes, &m.RecurrenceRule, &m.TemplateAgenda,
		&m.AttendeeIDs, &m.OrganizerID, &m.Status, &m.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("Meeting", meetingID.String())
		}
		return nil, apperrors.Internal("failed to update meeting", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"meeting_id": meetingID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    m.OrganizerID,
		Action:     "meeting.updated",
		EntityType: "meeting",
		EntityID:   meetingID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &m, nil
}

// UpdateMeetingStatus transitions a meeting to a new status.
func (s *MeetingService) UpdateMeetingStatus(ctx context.Context, tenantID, meetingID uuid.UUID, status string) error {
	query := `
		UPDATE meetings SET status = $1
		WHERE id = $2 AND tenant_id = $3`

	result, err := s.pool.Exec(ctx, query, status, meetingID, tenantID)
	if err != nil {
		return apperrors.Internal("failed to update meeting status", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Meeting", meetingID.String())
	}

	// Log audit event.
	auth := types.GetAuthContext(ctx)
	changes, _ := json.Marshal(map[string]any{
		"new_status": status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "meeting.status_changed",
		EntityType: "meeting",
		EntityID:   meetingID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// CreateDecision creates a meeting decision with an auto-generated decision number.
func (s *MeetingService) CreateDecision(ctx context.Context, tenantID, meetingID uuid.UUID, req CreateDecisionRequest) (*MeetingDecision, error) {
	id := uuid.New()
	now := time.Now().UTC()

	// Auto-generate decision number: DEC-YYYY-NNN
	year := now.Year()
	var seqNum int
	seqQuery := `
		SELECT COUNT(*) + 1
		FROM meeting_decisions
		WHERE tenant_id = $1
			AND created_at >= $2
			AND created_at < $3`
	yearStart := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	yearEnd := time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC)

	if err := s.pool.QueryRow(ctx, seqQuery, tenantID, yearStart, yearEnd).Scan(&seqNum); err != nil {
		return nil, apperrors.Internal("failed to generate decision number", err)
	}

	decisionNumber := fmt.Sprintf("DEC-%d-%03d", year, seqNum)

	query := `
		INSERT INTO meeting_decisions (
			id, meeting_id, tenant_id, decision_number, title,
			description, rationale, impact_assessment,
			decided_by_ids, status, evidence_refs, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, meeting_id, tenant_id, decision_number, title,
			description, rationale, impact_assessment,
			decided_by_ids, status, evidence_refs, created_at`

	var d MeetingDecision
	err := s.pool.QueryRow(ctx, query,
		id, meetingID, tenantID, decisionNumber, req.Title,
		req.Description, req.Rationale, req.ImpactAssessment,
		req.DecidedByIDs, "active", req.EvidenceRefs, now,
	).Scan(
		&d.ID, &d.MeetingID, &d.TenantID, &d.DecisionNumber, &d.Title,
		&d.Description, &d.Rationale, &d.ImpactAssessment,
		&d.DecidedByIDs, &d.Status, &d.EvidenceRefs, &d.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create decision", err)
	}

	// Log audit event.
	auth := types.GetAuthContext(ctx)
	changes, _ := json.Marshal(map[string]any{
		"decision_number": decisionNumber,
		"title":           req.Title,
		"meeting_id":      meetingID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "meeting_decision.created",
		EntityType: "meeting_decision",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &d, nil
}

// ListDecisions returns all decisions for a given meeting.
func (s *MeetingService) ListDecisions(ctx context.Context, meetingID uuid.UUID) ([]MeetingDecision, error) {
	query := `
		SELECT id, meeting_id, tenant_id, decision_number, title,
			description, rationale, impact_assessment,
			decided_by_ids, status, evidence_refs, created_at
		FROM meeting_decisions
		WHERE meeting_id = $1
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, meetingID)
	if err != nil {
		return nil, apperrors.Internal("failed to list decisions", err)
	}
	defer rows.Close()

	var decisions []MeetingDecision
	for rows.Next() {
		var d MeetingDecision
		if err := rows.Scan(
			&d.ID, &d.MeetingID, &d.TenantID, &d.DecisionNumber, &d.Title,
			&d.Description, &d.Rationale, &d.ImpactAssessment,
			&d.DecidedByIDs, &d.Status, &d.EvidenceRefs, &d.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan decision", err)
		}
		decisions = append(decisions, d)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate decisions", err)
	}

	if decisions == nil {
		decisions = []MeetingDecision{}
	}

	return decisions, nil
}

// UpdateDecisionStatus updates the status of a meeting decision.
func (s *MeetingService) UpdateDecisionStatus(ctx context.Context, decisionID uuid.UUID, status string) error {
	query := `UPDATE meeting_decisions SET status = $1 WHERE id = $2`
	result, err := s.pool.Exec(ctx, query, status, decisionID)
	if err != nil {
		return apperrors.Internal("failed to update decision status", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("MeetingDecision", decisionID.String())
	}

	// Log audit event.
	auth := types.GetAuthContext(ctx)
	changes, _ := json.Marshal(map[string]any{
		"new_status": status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "meeting_decision.status_changed",
		EntityType: "meeting_decision",
		EntityID:   decisionID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// CreateActionItem creates a new action item.
func (s *MeetingService) CreateActionItem(ctx context.Context, tenantID uuid.UUID, req CreateActionItemRequest) (*ActionItem, error) {
	id := uuid.New()
	now := time.Now().UTC()

	priority := "medium"
	if req.Priority != nil {
		priority = *req.Priority
	}

	query := `
		INSERT INTO action_items (
			id, tenant_id, source_type, source_id, title,
			description, owner_id, due_date, status, priority, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, tenant_id, source_type, source_id, title,
			description, owner_id, due_date, status,
			completion_evidence, completed_at, priority, created_at`

	var a ActionItem
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.SourceType, req.SourceID, req.Title,
		req.Description, req.OwnerID, req.DueDate, ActionStatusOpen, priority, now,
	).Scan(
		&a.ID, &a.TenantID, &a.SourceType, &a.SourceID, &a.Title,
		&a.Description, &a.OwnerID, &a.DueDate, &a.Status,
		&a.CompletionEvidence, &a.CompletedAt, &a.Priority, &a.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create action item", err)
	}

	// Log audit event.
	auth := types.GetAuthContext(ctx)
	changes, _ := json.Marshal(map[string]any{
		"title":       req.Title,
		"source_type": req.SourceType,
		"source_id":   req.SourceID,
		"owner_id":    req.OwnerID,
		"due_date":    req.DueDate,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "action_item.created",
		EntityType: "action_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &a, nil
}

// GetActionItem retrieves an action item by ID.
func (s *MeetingService) GetActionItem(ctx context.Context, tenantID, actionID uuid.UUID) (*ActionItem, error) {
	query := `
		SELECT id, tenant_id, source_type, source_id, title,
			description, owner_id, due_date, status,
			completion_evidence, completed_at, priority, created_at
		FROM action_items
		WHERE id = $1 AND tenant_id = $2`

	var a ActionItem
	err := s.pool.QueryRow(ctx, query, actionID, tenantID).Scan(
		&a.ID, &a.TenantID, &a.SourceType, &a.SourceID, &a.Title,
		&a.Description, &a.OwnerID, &a.DueDate, &a.Status,
		&a.CompletionEvidence, &a.CompletedAt, &a.Priority, &a.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("ActionItem", actionID.String())
		}
		return nil, apperrors.Internal("failed to get action item", err)
	}

	return &a, nil
}

// ListActionItems returns a paginated list of action items, optionally filtered by status and owner.
func (s *MeetingService) ListActionItems(ctx context.Context, tenantID uuid.UUID, status, ownerID string, limit, offset int) ([]ActionItem, int64, error) {
	auth := types.GetAuthContext(ctx)

	var statusParam, ownerParam *string
	if status != "" {
		statusParam = &status
	}
	if ownerID != "" {
		ownerParam = &ownerID
	}

	// Build base args: $1=tenantID, $2=status, $3=ownerID.
	args := []interface{}{tenantID, statusParam, ownerParam}
	nextIdx := 4

	// Add org scope filter.
	orgClause := ""
	orgFilter, orgParam := types.BuildOrgFilter(auth, "org_unit_id", nextIdx)
	if orgFilter != "" {
		orgClause = " AND " + orgFilter
		args = append(args, orgParam)
		nextIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM action_items
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
			AND ($3::text IS NULL OR owner_id::text = $3)%s`, orgClause)

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count action items", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, tenant_id, source_type, source_id, title,
			description, owner_id, due_date, status,
			completion_evidence, completed_at, priority, created_at
		FROM action_items
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
			AND ($3::text IS NULL OR owner_id::text = $3)%s
		ORDER BY due_date ASC
		LIMIT $%d OFFSET $%d`, orgClause, nextIdx, nextIdx+1)

	dataArgs := append(args, limit, offset)
	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list action items", err)
	}
	defer rows.Close()

	var items []ActionItem
	for rows.Next() {
		var a ActionItem
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.SourceType, &a.SourceID, &a.Title,
			&a.Description, &a.OwnerID, &a.DueDate, &a.Status,
			&a.CompletionEvidence, &a.CompletedAt, &a.Priority, &a.CreatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan action item", err)
		}
		items = append(items, a)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate action items", err)
	}

	if items == nil {
		items = []ActionItem{}
	}

	return items, total, nil
}

// UpdateActionItem updates an existing action item.
func (s *MeetingService) UpdateActionItem(ctx context.Context, tenantID, actionID uuid.UUID, req UpdateActionItemRequest) (*ActionItem, error) {
	query := `
		UPDATE action_items SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			owner_id = COALESCE($3, owner_id),
			due_date = COALESCE($4, due_date),
			status = COALESCE($5, status),
			completion_evidence = COALESCE($6, completion_evidence),
			priority = COALESCE($7, priority)
		WHERE id = $8 AND tenant_id = $9
		RETURNING id, tenant_id, source_type, source_id, title,
			description, owner_id, due_date, status,
			completion_evidence, completed_at, priority, created_at`

	var a ActionItem
	err := s.pool.QueryRow(ctx, query,
		req.Title, req.Description, req.OwnerID, req.DueDate,
		req.Status, req.CompletionEvidence, req.Priority,
		actionID, tenantID,
	).Scan(
		&a.ID, &a.TenantID, &a.SourceType, &a.SourceID, &a.Title,
		&a.Description, &a.OwnerID, &a.DueDate, &a.Status,
		&a.CompletionEvidence, &a.CompletedAt, &a.Priority, &a.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("ActionItem", actionID.String())
		}
		return nil, apperrors.Internal("failed to update action item", err)
	}

	// Log audit event.
	auth := types.GetAuthContext(ctx)
	changes, _ := json.Marshal(map[string]any{
		"action_id": actionID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "action_item.updated",
		EntityType: "action_item",
		EntityID:   actionID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &a, nil
}

// ListOverdueActions returns all action items that are past their due date
// and still open or in progress.
func (s *MeetingService) ListOverdueActions(ctx context.Context, tenantID uuid.UUID) ([]ActionItem, error) {
	query := `
		SELECT id, tenant_id, source_type, source_id, title,
			description, owner_id, due_date, status,
			completion_evidence, completed_at, priority, created_at
		FROM action_items
		WHERE tenant_id = $1
			AND due_date < NOW()
			AND status IN ('open', 'in_progress')
		ORDER BY due_date ASC`

	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list overdue actions", err)
	}
	defer rows.Close()

	var items []ActionItem
	for rows.Next() {
		var a ActionItem
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.SourceType, &a.SourceID, &a.Title,
			&a.Description, &a.OwnerID, &a.DueDate, &a.Status,
			&a.CompletionEvidence, &a.CompletedAt, &a.Priority, &a.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan overdue action", err)
		}
		items = append(items, a)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate overdue actions", err)
	}

	if items == nil {
		items = []ActionItem{}
	}

	return items, nil
}

// CompleteActionItem marks an action item as completed with evidence.
func (s *MeetingService) CompleteActionItem(ctx context.Context, tenantID, actionID uuid.UUID, evidence string) error {
	now := time.Now().UTC()

	query := `
		UPDATE action_items
		SET status = 'completed', completed_at = $1, completion_evidence = $2
		WHERE id = $3 AND tenant_id = $4`

	result, err := s.pool.Exec(ctx, query, now, evidence, actionID, tenantID)
	if err != nil {
		return apperrors.Internal("failed to complete action item", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ActionItem", actionID.String())
	}

	// Log audit event.
	auth := types.GetAuthContext(ctx)
	changes, _ := json.Marshal(map[string]any{
		"status":       ActionStatusCompleted,
		"completed_at": now,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    auth.UserID,
		ActorRole:  firstRole(auth.Roles),
		Action:     "action_item.completed",
		EntityType: "action_item",
		EntityID:   actionID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// GetOverdueActionStats returns aggregated overdue action item statistics for a tenant.
func (s *MeetingService) GetOverdueActionStats(ctx context.Context, tenantID uuid.UUID) (*OverdueStats, error) {
	stats := &OverdueStats{
		OverdueByPriority: make(map[string]int),
		OverdueByOwner:    []OwnerOverdueCount{},
	}

	// Total overdue count.
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM action_items
		WHERE tenant_id = $1 AND status IN ('open', 'in_progress') AND due_date < CURRENT_DATE`,
		tenantID,
	).Scan(&stats.TotalOverdue)
	if err != nil {
		return nil, apperrors.Internal("failed to count overdue actions", err)
	}

	// Overdue by priority.
	rows, err := s.pool.Query(ctx, `
		SELECT priority, COUNT(*)
		FROM action_items
		WHERE tenant_id = $1 AND status IN ('open', 'in_progress') AND due_date < CURRENT_DATE
		GROUP BY priority`,
		tenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to query overdue by priority", err)
	}
	defer rows.Close()

	for rows.Next() {
		var priority string
		var count int
		if err := rows.Scan(&priority, &count); err != nil {
			return nil, apperrors.Internal("failed to scan overdue by priority", err)
		}
		stats.OverdueByPriority[priority] = count
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate overdue by priority", err)
	}

	// Overdue by owner (top 10).
	ownerRows, err := s.pool.Query(ctx, `
		SELECT a.owner_id, u.display_name, COUNT(*)
		FROM action_items a
		JOIN users u ON u.id = a.owner_id
		WHERE a.tenant_id = $1 AND a.status IN ('open', 'in_progress') AND a.due_date < CURRENT_DATE
		GROUP BY a.owner_id, u.display_name
		ORDER BY COUNT(*) DESC
		LIMIT 10`,
		tenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to query overdue by owner", err)
	}
	defer ownerRows.Close()

	for ownerRows.Next() {
		var oc OwnerOverdueCount
		if err := ownerRows.Scan(&oc.OwnerID, &oc.OwnerName, &oc.Count); err != nil {
			return nil, apperrors.Internal("failed to scan overdue by owner", err)
		}
		stats.OverdueByOwner = append(stats.OverdueByOwner, oc)
	}
	if err := ownerRows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate overdue by owner", err)
	}

	// Oldest overdue days and average days overdue.
	var oldestDays *int
	var avgDays *float64
	err = s.pool.QueryRow(ctx, `
		SELECT
			MAX(CURRENT_DATE - due_date),
			AVG(CURRENT_DATE - due_date)::float8
		FROM action_items
		WHERE tenant_id = $1 AND status IN ('open', 'in_progress') AND due_date < CURRENT_DATE`,
		tenantID,
	).Scan(&oldestDays, &avgDays)
	if err != nil {
		return nil, apperrors.Internal("failed to query overdue age stats", err)
	}
	if oldestDays != nil {
		stats.OldestOverdueDays = *oldestDays
	}
	if avgDays != nil {
		stats.AvgDaysOverdue = math.Round(*avgDays*100) / 100
	}

	// Due this week (open/in_progress items due within the next 7 days).
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM action_items
		WHERE tenant_id = $1
			AND status IN ('open', 'in_progress')
			AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
		tenantID,
	).Scan(&stats.DueThisWeek)
	if err != nil {
		return nil, apperrors.Internal("failed to count due this week", err)
	}

	// Completed this month.
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM action_items
		WHERE tenant_id = $1
			AND status = 'completed'
			AND completed_at >= date_trunc('month', CURRENT_DATE)`,
		tenantID,
	).Scan(&stats.CompletedThisMonth)
	if err != nil {
		return nil, apperrors.Internal("failed to count completed this month", err)
	}

	return stats, nil
}

// GetOverdueActionsByOwner returns all overdue action items for a specific owner within a tenant.
func (s *MeetingService) GetOverdueActionsByOwner(ctx context.Context, tenantID, ownerID uuid.UUID) ([]ActionItem, error) {
	query := `
		SELECT id, tenant_id, source_type, source_id, title,
			description, owner_id, due_date, status,
			completion_evidence, completed_at, priority, created_at
		FROM action_items
		WHERE tenant_id = $1 AND owner_id = $2
			AND status IN ('open', 'in_progress')
			AND due_date < CURRENT_DATE
		ORDER BY due_date ASC`

	rows, err := s.pool.Query(ctx, query, tenantID, ownerID)
	if err != nil {
		return nil, apperrors.Internal("failed to list overdue actions by owner", err)
	}
	defer rows.Close()

	var items []ActionItem
	for rows.Next() {
		var a ActionItem
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.SourceType, &a.SourceID, &a.Title,
			&a.Description, &a.OwnerID, &a.DueDate, &a.Status,
			&a.CompletionEvidence, &a.CompletedAt, &a.Priority, &a.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan overdue action", err)
		}
		items = append(items, a)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate overdue actions", err)
	}

	if items == nil {
		items = []ActionItem{}
	}

	return items, nil
}

// firstRole returns the first role from a slice, or "unknown" if empty.
func firstRole(roles []string) string {
	if len(roles) > 0 {
		return roles[0]
	}
	return "unknown"
}
