package itsm

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
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
// TicketService
// ──────────────────────────────────────────────

// TicketService handles business logic for ITSM tickets, comments, status history, and CSAT.
type TicketService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewTicketService creates a new TicketService.
func NewTicketService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *TicketService {
	return &TicketService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// ticketColumns is the canonical column list for the tickets table (used in RETURNING clauses).
const ticketColumns = `
	id, tenant_id, ticket_number, type,
	category, subcategory, title, description,
	priority, urgency, impact, status, channel,
	reporter_id, reporter_email, email_thread_id, email_message_ids,
	assignee_id, team_queue_id,
	sla_policy_id, sla_response_target, sla_resolution_target,
	sla_response_met, sla_resolution_met,
	sla_paused_at, sla_paused_duration_minutes,
	is_major_incident, related_ticket_ids, linked_problem_id,
	linked_asset_ids, linked_ci_ids, org_unit_id, parent_ticket_id, resolution_notes, resolved_at,
	closed_at, first_response_at, satisfaction_score,
	tags, custom_fields, created_at, updated_at,
	change_classification, change_type, risk_level, risk_assessment,
	implementation_plan, rollback_plan, test_plan,
	scheduled_start, scheduled_end, actual_start, actual_end,
	cab_required, cab_meeting_id, cab_decision, cab_decision_date,
	pir_required, pir_completed, pir_notes,
	cab_notes, change_success`

// ticketSelectColumns is the column list for SELECT queries with LEFT JOINs for user enrichment.
const ticketSelectColumns = `
	t.id, t.tenant_id, t.ticket_number, t.type,
	t.category, t.subcategory, t.title, t.description,
	t.priority, t.urgency, t.impact, t.status, t.channel,
	t.reporter_id, t.reporter_email, t.email_thread_id, t.email_message_ids,
	t.assignee_id, t.team_queue_id,
	t.sla_policy_id, t.sla_response_target, t.sla_resolution_target,
	t.sla_response_met, t.sla_resolution_met,
	t.sla_paused_at, t.sla_paused_duration_minutes,
	t.is_major_incident, t.related_ticket_ids, t.linked_problem_id,
	t.linked_asset_ids, t.linked_ci_ids, t.org_unit_id, t.parent_ticket_id, t.resolution_notes, t.resolved_at,
	t.closed_at, t.first_response_at, t.satisfaction_score,
	t.tags, t.custom_fields, t.created_at, t.updated_at,
	t.change_classification, t.change_type, t.risk_level, t.risk_assessment,
	t.implementation_plan, t.rollback_plan, t.test_plan,
	t.scheduled_start, t.scheduled_end, t.actual_start, t.actual_end,
	t.cab_required, t.cab_meeting_id, t.cab_decision, t.cab_decision_date,
	t.pir_required, t.pir_completed, t.pir_notes,
	t.cab_notes, t.change_success,
	reporter.display_name AS reporter_name,
	reporter.department AS reporter_department,
	assignee.display_name AS assignee_name,
	assignee.department AS assignee_department,
	sq.name AS team_queue_name,
	mir.id AS major_incident_record_id,
	mir.status AS major_incident_status,
	mir.severity AS major_incident_severity,
	(SELECT COUNT(*) FROM tickets sub WHERE sub.parent_ticket_id = t.id) AS subtask_count,
	ptkt.ticket_number AS parent_ticket_number`

// ticketFromJoins is the FROM clause with LEFT JOINs for user enrichment.
const ticketFromJoins = `
	FROM tickets t
	LEFT JOIN users reporter ON reporter.id = t.reporter_id
	LEFT JOIN users assignee ON assignee.id = t.assignee_id
	LEFT JOIN support_queues sq ON sq.id = t.team_queue_id
	LEFT JOIN major_incident_records mir ON mir.ticket_id = t.id
	LEFT JOIN tickets ptkt ON ptkt.id = t.parent_ticket_id`

// scanTicketChangeFields is the common change-field scan targets appended to every scan call.
func scanTicketChangeFields(t *Ticket) []any {
	return []any{
		&t.ChangeClassification, &t.ChangeType, &t.RiskLevel, &t.RiskAssessment,
		&t.ImplementationPlan, &t.RollbackPlan, &t.TestPlan,
		&t.ScheduledStart, &t.ScheduledEnd, &t.ActualStart, &t.ActualEnd,
		&t.CABRequired, &t.CABMeetingID, &t.CABDecision, &t.CABDecisionDate,
		&t.PIRRequired, &t.PIRCompleted, &t.PIRNotes,
		&t.CABNotes, &t.ChangeSuccess,
	}
}

// scanTicket scans a single ticket row into a Ticket struct (base columns only, for RETURNING clauses).
func scanTicket(row pgx.Row) (Ticket, error) {
	var t Ticket
	dest := []any{
		&t.ID, &t.TenantID, &t.TicketNumber, &t.Type,
		&t.Category, &t.Subcategory, &t.Title, &t.Description,
		&t.Priority, &t.Urgency, &t.Impact, &t.Status, &t.Channel,
		&t.ReporterID, &t.ReporterEmail, &t.EmailThreadID, &t.EmailMessageIDs,
		&t.AssigneeID, &t.TeamQueueID,
		&t.SLAPolicyID, &t.SLAResponseTarget, &t.SLAResolutionTarget,
		&t.SLAResponseMet, &t.SLAResolutionMet,
		&t.SLAPausedAt, &t.SLAPausedDurationMinutes,
		&t.IsMajorIncident, &t.RelatedTicketIDs, &t.LinkedProblemID,
		&t.LinkedAssetIDs, &t.LinkedCIIDs, &t.OrgUnitID, &t.ParentTicketID, &t.ResolutionNotes, &t.ResolvedAt,
		&t.ClosedAt, &t.FirstResponseAt, &t.SatisfactionScore,
		&t.Tags, &t.CustomFields, &t.CreatedAt, &t.UpdatedAt,
	}
	dest = append(dest, scanTicketChangeFields(&t)...)
	err := row.Scan(dest...)
	return t, err
}

// scanTicketEnriched scans a single ticket row with enrichment columns (reporter/assignee names).
func scanTicketEnriched(row pgx.Row) (Ticket, error) {
	var t Ticket
	dest := []any{
		&t.ID, &t.TenantID, &t.TicketNumber, &t.Type,
		&t.Category, &t.Subcategory, &t.Title, &t.Description,
		&t.Priority, &t.Urgency, &t.Impact, &t.Status, &t.Channel,
		&t.ReporterID, &t.ReporterEmail, &t.EmailThreadID, &t.EmailMessageIDs,
		&t.AssigneeID, &t.TeamQueueID,
		&t.SLAPolicyID, &t.SLAResponseTarget, &t.SLAResolutionTarget,
		&t.SLAResponseMet, &t.SLAResolutionMet,
		&t.SLAPausedAt, &t.SLAPausedDurationMinutes,
		&t.IsMajorIncident, &t.RelatedTicketIDs, &t.LinkedProblemID,
		&t.LinkedAssetIDs, &t.LinkedCIIDs, &t.OrgUnitID, &t.ParentTicketID, &t.ResolutionNotes, &t.ResolvedAt,
		&t.ClosedAt, &t.FirstResponseAt, &t.SatisfactionScore,
		&t.Tags, &t.CustomFields, &t.CreatedAt, &t.UpdatedAt,
	}
	dest = append(dest, scanTicketChangeFields(&t)...)
	dest = append(dest,
		&t.ReporterName, &t.ReporterDepartment,
		&t.AssigneeName, &t.AssigneeDepartment,
		&t.TeamQueueName,
		&t.MajorIncidentRecordID, &t.MajorIncidentStatus, &t.MajorIncidentSeverity,
		&t.SubtaskCount, &t.ParentTicketNumber,
	)
	err := row.Scan(dest...)
	return t, err
}

// scanTickets scans multiple ticket rows into a slice (base columns only).
func scanTickets(rows pgx.Rows) ([]Ticket, error) {
	var tickets []Ticket
	for rows.Next() {
		var t Ticket
		dest := []any{
			&t.ID, &t.TenantID, &t.TicketNumber, &t.Type,
			&t.Category, &t.Subcategory, &t.Title, &t.Description,
			&t.Priority, &t.Urgency, &t.Impact, &t.Status, &t.Channel,
			&t.ReporterID, &t.ReporterEmail, &t.EmailThreadID, &t.EmailMessageIDs,
			&t.AssigneeID, &t.TeamQueueID,
			&t.SLAPolicyID, &t.SLAResponseTarget, &t.SLAResolutionTarget,
			&t.SLAResponseMet, &t.SLAResolutionMet,
			&t.SLAPausedAt, &t.SLAPausedDurationMinutes,
			&t.IsMajorIncident, &t.RelatedTicketIDs, &t.LinkedProblemID,
			&t.LinkedAssetIDs, &t.LinkedCIIDs, &t.OrgUnitID, &t.ParentTicketID, &t.ResolutionNotes, &t.ResolvedAt,
			&t.ClosedAt, &t.FirstResponseAt, &t.SatisfactionScore,
			&t.Tags, &t.CustomFields, &t.CreatedAt, &t.UpdatedAt,
		}
		dest = append(dest, scanTicketChangeFields(&t)...)
		if err := rows.Scan(dest...); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tickets == nil {
		tickets = []Ticket{}
	}
	return tickets, nil
}

// scanTicketsEnriched scans multiple ticket rows with enrichment columns.
func scanTicketsEnriched(rows pgx.Rows) ([]Ticket, error) {
	var tickets []Ticket
	for rows.Next() {
		var t Ticket
		dest := []any{
			&t.ID, &t.TenantID, &t.TicketNumber, &t.Type,
			&t.Category, &t.Subcategory, &t.Title, &t.Description,
			&t.Priority, &t.Urgency, &t.Impact, &t.Status, &t.Channel,
			&t.ReporterID, &t.ReporterEmail, &t.EmailThreadID, &t.EmailMessageIDs,
			&t.AssigneeID, &t.TeamQueueID,
			&t.SLAPolicyID, &t.SLAResponseTarget, &t.SLAResolutionTarget,
			&t.SLAResponseMet, &t.SLAResolutionMet,
			&t.SLAPausedAt, &t.SLAPausedDurationMinutes,
			&t.IsMajorIncident, &t.RelatedTicketIDs, &t.LinkedProblemID,
			&t.LinkedAssetIDs, &t.LinkedCIIDs, &t.OrgUnitID, &t.ParentTicketID, &t.ResolutionNotes, &t.ResolvedAt,
			&t.ClosedAt, &t.FirstResponseAt, &t.SatisfactionScore,
			&t.Tags, &t.CustomFields, &t.CreatedAt, &t.UpdatedAt,
		}
		dest = append(dest, scanTicketChangeFields(&t)...)
		dest = append(dest,
			&t.ReporterName, &t.ReporterDepartment,
			&t.AssigneeName, &t.AssigneeDepartment,
			&t.TeamQueueName,
			&t.MajorIncidentRecordID, &t.MajorIncidentStatus, &t.MajorIncidentSeverity,
			&t.SubtaskCount, &t.ParentTicketNumber,
		)
		if err := rows.Scan(dest...); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tickets == nil {
		tickets = []Ticket{}
	}
	return tickets, nil
}

// ──────────────────────────────────────────────
// Core CRUD
// ──────────────────────────────────────────────

// CreateTicket creates a new ticket with reporter set from auth context.
func (s *TicketService) CreateTicket(ctx context.Context, req CreateTicketRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Auto-calculate priority from the tenant-configurable urgency x impact matrix unless explicitly set.
	priority := s.calculatePriority(ctx, auth.TenantID, req.Urgency, req.Impact)
	if req.Priority != nil {
		priority = *req.Priority
	}

	if err := s.validateMandatoryTicketFields(ctx, auth.TenantID, priority, req); err != nil {
		return Ticket{}, err
	}

	// Default channel to "portal" if not set.
	channel := "portal"
	if req.Channel != nil {
		channel = *req.Channel
	}

	// Default empty arrays for JSONB / array fields.
	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}

	customFields := req.CustomFields
	if customFields == nil {
		customFields = json.RawMessage("null")
	}

	linkedAssetIDs := req.LinkedAssetIDs
	if linkedAssetIDs == nil {
		linkedAssetIDs = []uuid.UUID{}
	}
	linkedCIIDs := req.LinkedCIIDs
	if linkedCIIDs == nil {
		linkedCIIDs = []uuid.UUID{}
	}

	assigneeID := req.AssigneeID
	if assigneeID == nil && req.TeamQueueID != nil {
		if selected, err := s.selectAutoAssignee(ctx, auth.TenantID, *req.TeamQueueID, priority, req.Category); err != nil {
			slog.WarnContext(ctx, "ticket auto-assignment skipped", "queue_id", req.TeamQueueID, "error", err)
		} else if selected != nil {
			assigneeID = selected
		}
	}

	// Derive org_unit_id from auth context; use NULL if not set.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		orgUnitID = &auth.OrgUnitID
	}

	query := `
		INSERT INTO tickets (
			id, tenant_id, type,
			category, subcategory, title, description,
			priority, urgency, impact, status, channel,
			reporter_id, assignee_id, team_queue_id,
			sla_policy_id,
			is_major_incident, related_ticket_ids,
			linked_asset_ids, linked_ci_ids, org_unit_id, parent_ticket_id, tags, custom_fields,
			created_at, updated_at
		) VALUES (
			$1, $2, $3,
			$4, $5, $6, $7,
			$8, $9, $10, 'logged', $11,
			$12, $13, $14,
			$15,
			false, '{}',
			$16, $17, $18, $19, $20, $21,
			$22, $23
		)
		RETURNING ` + ticketColumns

	ticket, err := scanTicket(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Type,
		req.Category, req.Subcategory, req.Title, req.Description,
		priority, req.Urgency, req.Impact, channel,
		auth.UserID, assigneeID, req.TeamQueueID,
		req.SLAPolicyID,
		linkedAssetIDs, linkedCIIDs, orgUnitID, req.ParentTicketID, tags, customFields,
		now, now,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to create ticket", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":    req.Title,
		"type":     req.Type,
		"priority": priority,
		"urgency":  req.Urgency,
		"impact":   req.Impact,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ticket, nil
}

func (s *TicketService) calculatePriority(ctx context.Context, tenantID uuid.UUID, urgency, impact string) string {
	var raw json.RawMessage
	err := s.pool.QueryRow(ctx, `
		SELECT value
		FROM system_settings
		WHERE category = 'itsm'
		  AND key = 'priority_matrix'
		  AND (tenant_id = $1 OR tenant_id IS NULL)
		ORDER BY tenant_id NULLS LAST
		LIMIT 1`, tenantID).Scan(&raw)
	if err != nil {
		return CalculatePriority(urgency, impact)
	}

	var matrix map[string]map[string]string
	if err := json.Unmarshal(raw, &matrix); err != nil {
		return CalculatePriority(urgency, impact)
	}
	if row, ok := matrix[urgency]; ok {
		if priority, ok := row[impact]; ok && priority != "" {
			return priority
		}
	}
	return CalculatePriority(urgency, impact)
}

func (s *TicketService) validateMandatoryTicketFields(ctx context.Context, tenantID uuid.UUID, priority string, req CreateTicketRequest) error {
	var raw json.RawMessage
	err := s.pool.QueryRow(ctx, `
		SELECT value
		FROM system_settings
		WHERE category = 'itsm'
		  AND key = 'ticket_mandatory_fields_by_priority'
		  AND (tenant_id = $1 OR tenant_id IS NULL)
		ORDER BY tenant_id NULLS LAST
		LIMIT 1`, tenantID).Scan(&raw)
	if err != nil {
		return nil
	}

	var byPriority map[string][]string
	if err := json.Unmarshal(raw, &byPriority); err != nil {
		return nil
	}

	fields := byPriority[priority]
	for _, field := range fields {
		if !ticketFieldPresent(req, field) {
			return apperrors.Validation(field, fmt.Sprintf("%s is required for priority %s", field, priority))
		}
	}
	return nil
}

func ticketFieldPresent(req CreateTicketRequest, field string) bool {
	switch field {
	case "type":
		return req.Type != ""
	case "category":
		return req.Category != nil && strings.TrimSpace(*req.Category) != ""
	case "subcategory":
		return req.Subcategory != nil && strings.TrimSpace(*req.Subcategory) != ""
	case "title":
		return strings.TrimSpace(req.Title) != ""
	case "description":
		return strings.TrimSpace(req.Description) != ""
	case "urgency":
		return strings.TrimSpace(req.Urgency) != ""
	case "impact":
		return strings.TrimSpace(req.Impact) != ""
	case "assigneeId":
		return req.AssigneeID != nil && *req.AssigneeID != uuid.Nil
	case "teamQueueId":
		return req.TeamQueueID != nil && *req.TeamQueueID != uuid.Nil
	case "linkedAssetIds":
		return len(req.LinkedAssetIDs) > 0
	case "linkedCiIds":
		return len(req.LinkedCIIDs) > 0
	default:
		if strings.HasPrefix(field, "customFields.") && len(req.CustomFields) > 0 {
			var data map[string]any
			if err := json.Unmarshal(req.CustomFields, &data); err == nil {
				key := strings.TrimPrefix(field, "customFields.")
				value, ok := data[key]
				return ok && value != nil && fmt.Sprint(value) != ""
			}
		}
	}
	return false
}

func nilIfEmptyUUIDSlice(values []uuid.UUID) any {
	if len(values) == 0 {
		return nil
	}
	return values
}

func (s *TicketService) selectAutoAssignee(ctx context.Context, tenantID, queueID uuid.UUID, priority string, category *string) (*uuid.UUID, error) {
	var teamID *uuid.UUID
	var rule string
	var priorityFilter []string
	err := s.pool.QueryRow(ctx, `
		SELECT team_id, auto_assign_rule, priority_filter
		FROM support_queues
		WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
		queueID, tenantID,
	).Scan(&teamID, &rule, &priorityFilter)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("SupportQueue", queueID.String())
		}
		return nil, apperrors.Internal("failed to load support queue", err)
	}

	if len(priorityFilter) > 0 {
		allowed := false
		for _, p := range priorityFilter {
			if p == priority {
				allowed = true
				break
			}
		}
		if !allowed {
			return nil, apperrors.Validation("priority", "ticket priority is not accepted by the selected queue")
		}
	}

	if rule == AutoAssignRuleManual {
		return nil, nil
	}

	categoryValue := ""
	if category != nil {
		categoryValue = *category
	}

	orderExpr := `COUNT(t.id) ASC, COALESCE(MAX(t.updated_at), 'epoch'::timestamptz) ASC, u.created_at ASC`
	joins := ""
	needsCategoryArg := false
	if rule == AutoAssignRuleRoundRobin {
		orderExpr = `COALESCE(MAX(t.created_at), 'epoch'::timestamptz) ASC, COUNT(t.id) ASC, u.created_at ASC`
	}
	if rule == AutoAssignRuleSkillsBased && categoryValue != "" {
		joins = `
			LEFT JOIN user_skills us ON us.user_id = u.id
			LEFT JOIN skills sk ON sk.id = us.skill_id`
		needsCategoryArg = true
		orderExpr = `MAX(CASE
				WHEN lower(sk.name) = lower($3)
				  OR lower(sk.name) LIKE '%' || lower($3) || '%'
				  OR lower($3) LIKE '%' || lower(sk.name) || '%'
				THEN 1 ELSE 0 END) DESC,
			COUNT(t.id) ASC,
			COALESCE(MAX(t.updated_at), 'epoch'::timestamptz) ASC,
			u.created_at ASC`
	}

	query := fmt.Sprintf(`
		SELECT u.id
		FROM users u
		%s
		LEFT JOIN tickets t ON t.assignee_id = u.id
			AND t.tenant_id = u.tenant_id
			AND t.status NOT IN ('resolved', 'closed', 'cancelled')
		WHERE u.tenant_id = $1
		  AND u.is_active = true
		  AND ($2::uuid IS NULL OR u.org_unit_id = $2)
		GROUP BY u.id, u.created_at
		ORDER BY %s
		LIMIT 1`, joins, orderExpr)

	args := []any{tenantID, teamID}
	if needsCategoryArg {
		args = append(args, categoryValue)
	}

	var assigneeID uuid.UUID
	if err := s.pool.QueryRow(ctx, query, args...).Scan(&assigneeID); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, apperrors.Internal("failed to select auto-assignee", err)
	}
	return &assigneeID, nil
}

// GetTicket retrieves a single ticket by ID.
func (s *TicketService) GetTicket(ctx context.Context, id uuid.UUID) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + ticketSelectColumns + ticketFromJoins + ` WHERE t.id = $1 AND t.tenant_id = $2`

	ticket, err := scanTicketEnriched(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Ticket{}, apperrors.NotFound("Ticket", id.String())
		}
		return Ticket{}, apperrors.Internal("failed to get ticket", err)
	}

	return ticket, nil
}

// ListTickets returns a filtered, paginated list of tickets.
func (s *TicketService) ListTickets(ctx context.Context, status, priority, ticketType *string, assigneeID, reporterID, teamQueueID *uuid.UUID, hideSubtasks *bool, limit, offset int) ([]Ticket, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter clauses (one for count query, one for data query with t. prefix).
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 8)
	orgClauseT, _ := types.BuildOrgFilter(auth, "t.org_unit_id", 8)

	subtaskClause := ""
	subtaskClauseT := ""
	if hideSubtasks != nil && *hideSubtasks {
		subtaskClause = " AND parent_ticket_id IS NULL"
		subtaskClauseT = " AND t.parent_ticket_id IS NULL"
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM tickets
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
			AND ($3::text IS NULL OR priority = $3)
			AND ($4::text IS NULL OR type = $4)
			AND ($5::uuid IS NULL OR assignee_id = $5)
			AND ($6::uuid IS NULL OR reporter_id = $6)
			AND ($7::uuid IS NULL OR team_queue_id = $7)` + subtaskClause

	countArgs := []interface{}{
		auth.TenantID, status, priority, ticketType,
		assigneeID, reporterID, teamQueueID,
	}
	if orgClause != "" {
		countQuery += ` AND ` + orgClause
		countArgs = append(countArgs, orgParam)
	}

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count tickets", err)
	}

	// Fetch paginated results.
	// Determine next param index after the org filter (if any).
	nextIdx := 8
	if orgClause != "" {
		nextIdx = 9
	}

	dataQuery := fmt.Sprintf(`
		SELECT `+ticketSelectColumns+ticketFromJoins+`
		WHERE t.tenant_id = $1
			AND ($2::text IS NULL OR t.status = $2)
			AND ($3::text IS NULL OR t.priority = $3)
			AND ($4::text IS NULL OR t.type = $4)
			AND ($5::uuid IS NULL OR t.assignee_id = $5)
			AND ($6::uuid IS NULL OR t.reporter_id = $6)
			AND ($7::uuid IS NULL OR t.team_queue_id = $7)%s%s
		ORDER BY t.created_at DESC
		LIMIT $%d OFFSET $%d`,
		func() string {
			if orgClauseT != "" {
				return " AND " + orgClauseT
			}
			return ""
		}(), subtaskClauseT, nextIdx, nextIdx+1)

	dataArgs := []interface{}{
		auth.TenantID, status, priority, ticketType,
		assigneeID, reporterID, teamQueueID,
	}
	if orgClause != "" {
		dataArgs = append(dataArgs, orgParam)
	}
	dataArgs = append(dataArgs, limit, offset)

	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list tickets", err)
	}
	defer rows.Close()

	tickets, err := scanTicketsEnriched(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan tickets", err)
	}

	return tickets, total, nil
}

// UpdateTicket updates an existing ticket using COALESCE partial update.
func (s *TicketService) UpdateTicket(ctx context.Context, id uuid.UUID, req UpdateTicketRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the ticket exists and belongs to the tenant.
	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE tickets SET
			category = COALESCE($1, category),
			subcategory = COALESCE($2, subcategory),
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			priority = COALESCE($5, priority),
			linked_asset_ids = COALESCE($6::uuid[], linked_asset_ids),
			linked_ci_ids = COALESCE($7::uuid[], linked_ci_ids),
			tags = COALESCE($8, tags),
			custom_fields = COALESCE($9, custom_fields),
			updated_at = $10
		WHERE id = $11 AND tenant_id = $12
		RETURNING ` + ticketColumns

	ticket, err := scanTicket(s.pool.QueryRow(ctx, updateQuery,
		req.Category, req.Subcategory, req.Title,
		req.Description, req.Priority, nilIfEmptyUUIDSlice(req.LinkedAssetIDs), nilIfEmptyUUIDSlice(req.LinkedCIIDs),
		req.Tags, req.CustomFields,
		now, id, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to update ticket", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ticket, nil
}

// ──────────────────────────────────────────────
// Status Transitions
// ──────────────────────────────────────────────

// TransitionStatus validates and performs a status transition on a ticket.
func (s *TicketService) TransitionStatus(ctx context.Context, id uuid.UUID, req TransitionTicketRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	// Validate status transition.
	if !IsValidTicketTransition(existing.Status, req.Status) {
		return Ticket{}, apperrors.BadRequest(
			fmt.Sprintf("invalid status transition from '%s' to '%s'", existing.Status, req.Status),
		)
	}

	now := time.Now().UTC()

	// Handle SLA pause/resume for pending_customer and pending_vendor transitions.
	var slaPausedAt *time.Time
	slaPausedDurationMinutes := existing.SLAPausedDurationMinutes
	isPending := req.Status == "pending_customer" || req.Status == "pending_vendor"
	wasPending := existing.Status == "pending_customer" || existing.Status == "pending_vendor"

	if isPending {
		// Pause SLA clock.
		slaPausedAt = &now
	} else if wasPending && existing.SLAPausedAt != nil {
		// Resume SLA clock — calculate how long it was paused.
		pausedMinutes := int(math.Round(now.Sub(*existing.SLAPausedAt).Minutes()))
		slaPausedDurationMinutes += pausedMinutes
		slaPausedAt = nil // clear the paused_at
	} else {
		slaPausedAt = existing.SLAPausedAt
	}

	query := `
		UPDATE tickets SET
			status = $1,
			sla_paused_at = $2,
			sla_paused_duration_minutes = $3,
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6
		RETURNING ` + ticketColumns

	ticket, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.Status, slaPausedAt, slaPausedDurationMinutes, now, id, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to transition ticket status", err)
	}

	// Insert status history record.
	historyID := uuid.New()
	_, err = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		historyID, id, existing.Status, req.Status, auth.UserID, req.Reason, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to insert ticket status history", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      req.Status,
		"reason":          req.Reason,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ticket, nil
}

// ──────────────────────────────────────────────
// Assignment & Escalation
// ──────────────────────────────────────────────

// AssignTicket assigns a ticket to a user and/or team queue.
func (s *TicketService) AssignTicket(ctx context.Context, id uuid.UUID, req AssignTicketRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketAssignmentAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	now := time.Now().UTC()

	// If this is the first assignment and first_response_at is NULL, record it.
	var firstResponseAt *time.Time
	var slaResponseMet *bool
	if existing.FirstResponseAt == nil && req.AssigneeID != nil {
		firstResponseAt = &now
		// Calculate whether SLA response target was met.
		if existing.SLAResponseTarget != nil {
			met := now.Before(*existing.SLAResponseTarget) || now.Equal(*existing.SLAResponseTarget)
			slaResponseMet = &met
		}
	}

	query := `
		UPDATE tickets SET
			assignee_id = COALESCE($1, assignee_id),
			team_queue_id = COALESCE($2, team_queue_id),
			first_response_at = COALESCE($3, first_response_at),
			sla_response_met = COALESCE($4, sla_response_met),
			status = CASE
				WHEN status = 'new' THEN 'assigned'
				ELSE status
			END,
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7
		RETURNING ` + ticketColumns

	ticket, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.AssigneeID, req.TeamQueueID, firstResponseAt, slaResponseMet,
		now, id, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to assign ticket", err)
	}

	// Insert status history if status changed to assigned.
	if existing.Status == "logged" {
		historyID := uuid.New()
		_, err = s.pool.Exec(ctx, `
			INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			historyID, id, existing.Status, "assigned", auth.UserID, nil, now,
		)
		if err != nil {
			slog.ErrorContext(ctx, "failed to insert ticket status history for assignment", "error", err)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"assignee_id":   req.AssigneeID,
		"team_queue_id": req.TeamQueueID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "assign:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ticket, nil
}

// EscalateTicket records a manual escalation audit event.
func (s *TicketService) EscalateTicket(ctx context.Context, id uuid.UUID, reason string) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Verify the ticket exists.
	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return err
	}

	// Log audit event for escalation.
	changes, _ := json.Marshal(map[string]any{
		"reason": reason,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "escalate:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Major Incident
// ──────────────────────────────────────────────

// DeclareMajorIncident marks a ticket as a major incident.
func (s *TicketService) DeclareMajorIncident(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Verify the ticket exists.
	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return err
	}

	now := time.Now().UTC()

	result, err := s.pool.Exec(ctx, `
		UPDATE tickets SET is_major_incident = true, updated_at = $1
		WHERE id = $2 AND tenant_id = $3`,
		now, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to declare major incident", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Ticket", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "declare_major_incident:ticket",
		EntityType: "ticket",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Linking
// ──────────────────────────────────────────────

// LinkTickets adds a bidirectional link between two tickets.
func (s *TicketService) LinkTickets(ctx context.Context, id, relatedID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Verify both tickets exist.
	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return err
	}
	related, err := s.GetTicket(ctx, relatedID)
	if err != nil {
		return err
	}
	if err := ensureTicketMutationAllowed(auth, related); err != nil {
		return err
	}

	now := time.Now().UTC()

	// Add forward link.
	_, err = s.pool.Exec(ctx, `
		UPDATE tickets SET
			related_ticket_ids = array_append(related_ticket_ids, $1),
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4
			AND NOT ($1 = ANY(related_ticket_ids))`,
		relatedID, now, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to link ticket (forward)", err)
	}

	// Add reverse link.
	_, err = s.pool.Exec(ctx, `
		UPDATE tickets SET
			related_ticket_ids = array_append(related_ticket_ids, $1),
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4
			AND NOT ($1 = ANY(related_ticket_ids))`,
		id, now, relatedID, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to link ticket (reverse)", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"related_ticket_id": relatedID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "link:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// LinkConfigurationItems links related CMDB assets and CIs to a ticket.
func (s *TicketService) LinkConfigurationItems(ctx context.Context, id uuid.UUID, req LinkTicketConfigurationRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	if err := s.ensureAssetsBelongToTenant(ctx, auth.TenantID, req.AssetIDs); err != nil {
		return Ticket{}, err
	}
	if err := s.ensureCIsBelongToTenant(ctx, auth.TenantID, req.CIIDs); err != nil {
		return Ticket{}, err
	}

	now := time.Now().UTC()
	query := `
		UPDATE tickets SET
			linked_asset_ids = CASE
				WHEN $1 THEN $2::uuid[]
				ELSE ARRAY(SELECT DISTINCT unnest(linked_asset_ids || $2::uuid[]))
			END,
			linked_ci_ids = CASE
				WHEN $1 THEN $3::uuid[]
				ELSE ARRAY(SELECT DISTINCT unnest(linked_ci_ids || $3::uuid[]))
			END,
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6
		RETURNING ` + ticketColumns

	ticket, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.Replace, req.AssetIDs, req.CIIDs, now, id, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to link ticket configuration items", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"asset_ids": req.AssetIDs,
		"ci_ids":    req.CIIDs,
		"replace":   req.Replace,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "link_configuration:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ticket, nil
}

func (s *TicketService) ensureAssetsBelongToTenant(ctx context.Context, tenantID uuid.UUID, assetIDs []uuid.UUID) error {
	if len(assetIDs) == 0 {
		return nil
	}
	var count int
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM assets WHERE tenant_id = $1 AND id = ANY($2)`,
		tenantID, assetIDs,
	).Scan(&count); err != nil {
		return apperrors.Internal("failed to validate linked assets", err)
	}
	if count != len(assetIDs) {
		return apperrors.NotFound("Asset", "one or more linked assets")
	}
	return nil
}

func (s *TicketService) ensureCIsBelongToTenant(ctx context.Context, tenantID uuid.UUID, ciIDs []uuid.UUID) error {
	if len(ciIDs) == 0 {
		return nil
	}
	var count int
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM cmdb_items WHERE tenant_id = $1 AND id = ANY($2)`,
		tenantID, ciIDs,
	).Scan(&count); err != nil {
		return apperrors.Internal("failed to validate linked CIs", err)
	}
	if count != len(ciIDs) {
		return apperrors.NotFound("CMDBItem", "one or more linked CIs")
	}
	return nil
}

// ──────────────────────────────────────────────
// Resolution & Closure
// ──────────────────────────────────────────────

// ResolveTicket sets the ticket to resolved status with resolution notes.
func (s *TicketService) ResolveTicket(ctx context.Context, id uuid.UUID, req ResolveTicketRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return Ticket{}, err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return Ticket{}, err
	}

	now := time.Now().UTC()

	// Calculate whether SLA resolution target was met.
	var slaResolutionMet *bool
	if existing.SLAResolutionTarget != nil {
		met := now.Before(*existing.SLAResolutionTarget) || now.Equal(*existing.SLAResolutionTarget)
		slaResolutionMet = &met
	}

	query := `
		UPDATE tickets SET
			status = 'resolved',
			resolution_notes = $1,
			resolved_at = $2,
			sla_resolution_met = COALESCE($3, sla_resolution_met),
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6
		RETURNING ` + ticketColumns

	ticket, err := scanTicket(s.pool.QueryRow(ctx, query,
		req.ResolutionNotes, now, slaResolutionMet, now, id, auth.TenantID,
	))
	if err != nil {
		return Ticket{}, apperrors.Internal("failed to resolve ticket", err)
	}

	// Insert status history record.
	historyID := uuid.New()
	_, err = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		historyID, id, existing.Status, "resolved", auth.UserID, &req.ResolutionNotes, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to insert ticket status history", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status":  existing.Status,
		"resolution_notes": req.ResolutionNotes,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "resolve:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ticket, nil
}

// CloseTicket sets the ticket to closed status.
func (s *TicketService) CloseTicket(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTicket(ctx, id)
	if err != nil {
		return err
	}
	if err := ensureTicketMutationAllowed(auth, existing); err != nil {
		return err
	}

	now := time.Now().UTC()

	result, err := s.pool.Exec(ctx, `
		UPDATE tickets SET status = 'closed', closed_at = $1, updated_at = $2
		WHERE id = $3 AND tenant_id = $4`,
		now, now, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to close ticket", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Ticket", id.String())
	}

	// Insert status history record.
	historyID := uuid.New()
	_, err = s.pool.Exec(ctx, `
		INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		historyID, id, existing.Status, "closed", auth.UserID, nil, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to insert ticket status history", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "close:ticket",
		EntityType: "ticket",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Queue Methods
// ──────────────────────────────────────────────

// priorityOrderSQL maps priority labels to sort order (P1 first).
const priorityOrderSQL = `
	CASE t.priority
		WHEN 'P1' THEN 1
		WHEN 'P2' THEN 2
		WHEN 'P3' THEN 3
		WHEN 'P4' THEN 4
		ELSE 5
	END`

// ListMyQueue returns tickets assigned to the current user, excluding closed/cancelled.
func (s *TicketService) ListMyQueue(ctx context.Context, limit, offset int) ([]Ticket, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter clauses.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 3)
	orgClauseT, _ := types.BuildOrgFilter(auth, "t.org_unit_id", 3)

	// Count total.
	countQuery := `
		SELECT COUNT(*)
		FROM tickets
		WHERE tenant_id = $1
			AND assignee_id = $2
			AND status NOT IN ('closed', 'cancelled')`

	countArgs := []interface{}{auth.TenantID, auth.UserID}
	if orgClause != "" {
		countQuery += ` AND ` + orgClause
		countArgs = append(countArgs, orgParam)
	}

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count my queue", err)
	}

	// Determine next param index after the org filter (if any).
	nextIdx := 3
	if orgClause != "" {
		nextIdx = 4
	}

	dataQuery := fmt.Sprintf(`
		SELECT `+ticketSelectColumns+ticketFromJoins+`
		WHERE t.tenant_id = $1
			AND t.assignee_id = $2
			AND t.status NOT IN ('closed', 'cancelled')%s
		ORDER BY `+priorityOrderSQL+`, t.created_at ASC
		LIMIT $%d OFFSET $%d`,
		func() string {
			if orgClauseT != "" {
				return " AND " + orgClauseT
			}
			return ""
		}(), nextIdx, nextIdx+1)

	dataArgs := []interface{}{auth.TenantID, auth.UserID}
	if orgClause != "" {
		dataArgs = append(dataArgs, orgParam)
	}
	dataArgs = append(dataArgs, limit, offset)

	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list my queue", err)
	}
	defer rows.Close()

	tickets, err := scanTicketsEnriched(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan my queue", err)
	}

	return tickets, total, nil
}

// ListTeamQueue returns tickets for a specific team queue, excluding closed/cancelled.
func (s *TicketService) ListTeamQueue(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]Ticket, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter clauses.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 3)
	orgClauseT, _ := types.BuildOrgFilter(auth, "t.org_unit_id", 3)

	// Count total.
	countQuery := `
		SELECT COUNT(*)
		FROM tickets
		WHERE tenant_id = $1
			AND team_queue_id = $2
			AND status NOT IN ('closed', 'cancelled')`

	countArgs := []interface{}{auth.TenantID, teamID}
	if orgClause != "" {
		countQuery += ` AND ` + orgClause
		countArgs = append(countArgs, orgParam)
	}

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count team queue", err)
	}

	// Determine next param index after the org filter (if any).
	nextIdx := 3
	if orgClause != "" {
		nextIdx = 4
	}

	dataQuery := fmt.Sprintf(`
		SELECT `+ticketSelectColumns+ticketFromJoins+`
		WHERE t.tenant_id = $1
			AND t.team_queue_id = $2
			AND t.status NOT IN ('closed', 'cancelled')%s
		ORDER BY `+priorityOrderSQL+`, t.created_at ASC
		LIMIT $%d OFFSET $%d`,
		func() string {
			if orgClauseT != "" {
				return " AND " + orgClauseT
			}
			return ""
		}(), nextIdx, nextIdx+1)

	dataArgs := []interface{}{auth.TenantID, teamID}
	if orgClause != "" {
		dataArgs = append(dataArgs, orgParam)
	}
	dataArgs = append(dataArgs, limit, offset)

	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list team queue", err)
	}
	defer rows.Close()

	tickets, err := scanTicketsEnriched(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan team queue", err)
	}

	return tickets, total, nil
}

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────

// GetTicketStats returns aggregate ticket statistics for the tenant.
func (s *TicketService) GetTicketStats(ctx context.Context) (TicketStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return TicketStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled', 'resolved')) AS open_count,
			COUNT(*) FILTER (WHERE (sla_response_met = false OR sla_resolution_met = false)) AS sla_breached_count,
			COALESCE((
				SELECT COUNT(*)
				FROM major_incident_records mir
				WHERE mir.tenant_id = $1
				  AND mir.status <> 'closed'
			), 0) AS major_incidents
		FROM tickets
		WHERE tenant_id = $1`

	var stats TicketStats
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&stats.Total, &stats.OpenCount, &stats.SLABreachedCount, &stats.MajorIncidents,
	)
	if err != nil {
		return TicketStats{}, apperrors.Internal("failed to get ticket stats", err)
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────

// AddComment adds a comment to a ticket.
func (s *TicketService) AddComment(ctx context.Context, ticketID uuid.UUID, req AddCommentRequest) (TicketComment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return TicketComment{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the ticket exists.
	existing, err := s.GetTicket(ctx, ticketID)
	if err != nil {
		return TicketComment{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO ticket_comments (id, ticket_id, author_id, content, is_internal, attachments, created_at)
		VALUES ($1, $2, $3, $4, $5, '{}', $6)
		RETURNING id, ticket_id, author_id, content, is_internal, attachments, created_at`

	var comment TicketComment
	err = s.pool.QueryRow(ctx, query,
		id, ticketID, auth.UserID, req.Content, req.IsInternal, now,
	).Scan(
		&comment.ID, &comment.TicketID, &comment.AuthorID,
		&comment.Content, &comment.IsInternal, &comment.Attachments, &comment.CreatedAt,
	)
	if err != nil {
		return TicketComment{}, apperrors.Internal("failed to add comment", err)
	}

	// If this is an external comment and the ticket is pending_customer,
	// auto-transition to in_progress (customer responded, SLA resumes).
	if (req.IsInternal == nil || !*req.IsInternal) && existing.Status == "pending_customer" {
		transReq := TransitionTicketRequest{
			Status: "in_progress",
			Reason: strPtr("Customer responded via comment"),
		}
		if _, transErr := s.TransitionStatus(ctx, ticketID, transReq); transErr != nil {
			slog.ErrorContext(ctx, "failed to auto-transition ticket from pending_customer", "error", transErr)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"ticket_id":   ticketID,
		"is_internal": req.IsInternal,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:ticket_comment",
		EntityType: "ticket_comment",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return comment, nil
}

// ListComments returns comments for a ticket, optionally filtering out internal comments.
func (s *TicketService) ListComments(ctx context.Context, ticketID uuid.UUID, includeInternal bool) ([]TicketComment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, ticket_id, author_id, content, is_internal, attachments, created_at
		FROM ticket_comments
		WHERE ticket_id = $1
			AND ($2::boolean OR is_internal = false)
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, ticketID, includeInternal)
	if err != nil {
		return nil, apperrors.Internal("failed to list comments", err)
	}
	defer rows.Close()

	var comments []TicketComment
	for rows.Next() {
		var c TicketComment
		if err := rows.Scan(
			&c.ID, &c.TicketID, &c.AuthorID,
			&c.Content, &c.IsInternal, &c.Attachments, &c.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan comment", err)
		}
		comments = append(comments, c)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate comments", err)
	}

	if comments == nil {
		comments = []TicketComment{}
	}

	// Suppress unused variable warning for auth — it's checked above.
	_ = auth

	return comments, nil
}

// ──────────────────────────────────────────────
// Status History
// ──────────────────────────────────────────────

// ListStatusHistory returns the status transition history for a ticket.
func (s *TicketService) ListStatusHistory(ctx context.Context, ticketID uuid.UUID) ([]TicketStatusHistory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, ticket_id, from_status, to_status, changed_by, reason, created_at
		FROM ticket_status_history
		WHERE ticket_id = $1
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, ticketID)
	if err != nil {
		return nil, apperrors.Internal("failed to list status history", err)
	}
	defer rows.Close()

	var history []TicketStatusHistory
	for rows.Next() {
		var h TicketStatusHistory
		if err := rows.Scan(
			&h.ID, &h.TicketID, &h.FromStatus, &h.ToStatus,
			&h.ChangedBy, &h.Reason, &h.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan status history", err)
		}
		history = append(history, h)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate status history", err)
	}

	if history == nil {
		history = []TicketStatusHistory{}
	}

	// Suppress unused variable warning for auth — it's checked above.
	_ = auth

	return history, nil
}

// ──────────────────────────────────────────────
// CSAT
// ──────────────────────────────────────────────

// CreateCSATSurvey records a customer satisfaction survey response.
func (s *TicketService) CreateCSATSurvey(ctx context.Context, req CreateCSATSurveyRequest) (CSATSurvey, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CSATSurvey{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO csat_surveys (id, ticket_id, respondent_id, rating, comment, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, ticket_id, respondent_id, rating, comment, created_at`

	var survey CSATSurvey
	err := s.pool.QueryRow(ctx, query,
		id, req.TicketID, auth.UserID, req.Rating, req.Comment, now,
	).Scan(
		&survey.ID, &survey.TicketID, &survey.RespondentID,
		&survey.Rating, &survey.Comment, &survey.CreatedAt,
	)
	if err != nil {
		return CSATSurvey{}, apperrors.Internal("failed to create CSAT survey", err)
	}

	// Also update the ticket's satisfaction_score.
	_, err = s.pool.Exec(ctx, `
		UPDATE tickets SET satisfaction_score = $1, updated_at = $2
		WHERE id = $3 AND tenant_id = $4`,
		req.Rating, now, req.TicketID, auth.TenantID,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to update ticket satisfaction score", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"ticket_id": req.TicketID,
		"rating":    req.Rating,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:csat_survey",
		EntityType: "csat_survey",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return survey, nil
}

// GetCSATStats returns aggregate CSAT statistics for the tenant.
func (s *TicketService) GetCSATStats(ctx context.Context) (CSATStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CSATStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COALESCE(AVG(cs.rating)::float8, 0) AS avg_rating
		FROM csat_surveys cs
		JOIN tickets t ON t.id = cs.ticket_id
		WHERE t.tenant_id = $1`

	var stats CSATStats
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&stats.Total, &stats.AvgRating,
	)
	if err != nil {
		return CSATStats{}, apperrors.Internal("failed to get CSAT stats", err)
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// strPtr returns a pointer to a string value.
func strPtr(s string) *string {
	return &s
}

// ──────────────────────────────────────────────
// Bulk Operations
// ──────────────────────────────────────────────

// columnForField maps a JSON field name to its database column name for tickets.
// Returns empty string if the field is not allowed for bulk update.
func ticketColumnForField(field string) string {
	switch field {
	case "status":
		return "status"
	case "priority":
		return "priority"
	case "assigneeId":
		return "assignee_id"
	default:
		return ""
	}
}

// partitionByValidTransition splits ids into those that can legally transition to newStatus
// (based on their current status in currentStatuses) and a count of those that cannot.
// IDs not present in currentStatuses are treated as invalid.
func partitionByValidTransition(currentStatuses map[uuid.UUID]string, newStatus string, ids []uuid.UUID) (valid []uuid.UUID, failedCount int64) {
	for _, id := range ids {
		current, ok := currentStatuses[id]
		if !ok || !IsValidTicketTransition(current, newStatus) {
			failedCount++
			continue
		}
		valid = append(valid, id)
	}
	return valid, failedCount
}

// BulkUpdateTickets updates multiple tickets matching the given IDs with the provided field values.
// Only allowed fields (status, priority, assigneeId) are accepted.
// When updating status, each ticket's current status is validated against the state machine;
// tickets with invalid transitions are skipped and counted in the returned failed count.
func (s *TicketService) BulkUpdateTickets(ctx context.Context, ids []uuid.UUID, fields map[string]string) (updated int64, failed int64, err error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return 0, 0, apperrors.Unauthorized("authentication required")
	}

	if len(ids) == 0 {
		return 0, 0, apperrors.BadRequest("ids must not be empty")
	}

	if len(fields) == 0 {
		return 0, 0, apperrors.BadRequest("fields must not be empty")
	}

	// Validate all field names upfront before touching the database.
	for field := range fields {
		if ticketColumnForField(field) == "" {
			return 0, 0, apperrors.BadRequest(fmt.Sprintf("field %q is not allowed for bulk update", field))
		}
	}

	// Fetch current ownership and state once so bulk updates honor object-level auth.
	rows, qErr := s.pool.Query(ctx,
		`SELECT id, status, reporter_id, assignee_id FROM tickets WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
		auth.TenantID, ids,
	)
	if qErr != nil {
		return 0, 0, apperrors.Internal("failed to fetch current ticket state", qErr)
	}
	currentStatuses := make(map[uuid.UUID]string, len(ids))
	authorizedIDs := make([]uuid.UUID, 0, len(ids))
	needsMutationAuth := false
	_, updatesAssignment := fields["assigneeId"]
	for field := range fields {
		if field != "assigneeId" {
			needsMutationAuth = true
			break
		}
	}

	for rows.Next() {
		var (
			tid        uuid.UUID
			status     string
			reporterID uuid.UUID
			assigneeID *uuid.UUID
		)
		if scanErr := rows.Scan(&tid, &status, &reporterID, &assigneeID); scanErr != nil {
			rows.Close()
			return 0, 0, apperrors.Internal("failed to scan ticket state", scanErr)
		}

		currentStatuses[tid] = status

		ticket := Ticket{
			ID:         tid,
			ReporterID: reporterID,
			AssigneeID: assigneeID,
		}
		allowed := true
		if needsMutationAuth && !canMutateTicket(auth, ticket) {
			allowed = false
		}
		if updatesAssignment && !canAssignTicket(auth, ticket) {
			allowed = false
		}
		if allowed {
			authorizedIDs = append(authorizedIDs, tid)
		} else {
			failed++
		}
	}
	rows.Close()
	if rowErr := rows.Err(); rowErr != nil {
		return 0, 0, apperrors.Internal("failed to read ticket state", rowErr)
	}

	targetIDs := authorizedIDs
	if newStatus, ok := fields["status"]; ok {
		var transitionFailures int64
		targetIDs, transitionFailures = partitionByValidTransition(currentStatuses, newStatus, authorizedIDs)
		failed += transitionFailures
		if len(targetIDs) == 0 {
			return 0, failed, nil
		}
	}

	// Build dynamic SET clause.
	setClauses := []string{}
	args := []any{auth.TenantID, targetIDs}
	argIdx := 3

	for field, value := range fields {
		col := ticketColumnForField(field)
		if col == "" {
			return 0, 0, apperrors.BadRequest(fmt.Sprintf("field %q is not allowed for bulk update", field))
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, argIdx))
		args = append(args, value)
		argIdx++
	}

	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argIdx))
	args = append(args, time.Now().UTC())

	query := fmt.Sprintf(`
		UPDATE tickets
		SET %s
		WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
		joinStrings(setClauses, ", "),
	)

	tag, execErr := s.pool.Exec(ctx, query, args...)
	if execErr != nil {
		return 0, failed, apperrors.Internal("failed to bulk update tickets", execErr)
	}

	return tag.RowsAffected(), failed, nil
}

// ListTicketsForExport returns up to maxRows tickets matching the given filters, for CSV export.
func (s *TicketService) ListTicketsForExport(ctx context.Context, status, priority, ticketType *string, maxRows int) ([]Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if maxRows <= 0 || maxRows > 10000 {
		maxRows = 10000
	}

	query := `
		SELECT ` + ticketSelectColumns + ticketFromJoins + `
		WHERE t.tenant_id = $1
			AND ($2::text IS NULL OR t.status = $2)
			AND ($3::text IS NULL OR t.priority = $3)
			AND ($4::text IS NULL OR t.type = $4)
		ORDER BY t.created_at DESC
		LIMIT $5`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, status, priority, ticketType, maxRows)
	if err != nil {
		return nil, apperrors.Internal("failed to list tickets for export", err)
	}
	defer rows.Close()

	tickets, err := scanTicketsEnriched(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan tickets for export", err)
	}

	return tickets, nil
}

// ──────────────────────────────────────────────
// Subtask (Parent-Child) Operations
// ──────────────────────────────────────────────

// ListSubtasks returns child tickets and completion progress for a parent ticket.
func (s *TicketService) ListSubtasks(ctx context.Context, parentID uuid.UUID) (SubtasksResponse, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SubtasksResponse{}, apperrors.Unauthorized("authentication required")
	}

	// Fetch child tickets.
	query := `
		SELECT t.id, t.ticket_number, t.title, t.type, t.status, t.priority,
		       t.assignee_id, u.display_name AS assignee_name, t.created_at
		FROM tickets t
		LEFT JOIN users u ON u.id = t.assignee_id
		WHERE t.parent_ticket_id = $1 AND t.tenant_id = $2
		ORDER BY t.created_at ASC`

	rows, err := s.pool.Query(ctx, query, parentID, auth.TenantID)
	if err != nil {
		return SubtasksResponse{}, apperrors.Internal("failed to list subtasks", err)
	}
	defer rows.Close()

	var subtasks []SubtaskSummary
	for rows.Next() {
		var st SubtaskSummary
		if err := rows.Scan(
			&st.ID, &st.TicketNumber, &st.Title, &st.Type, &st.Status, &st.Priority,
			&st.AssigneeID, &st.AssigneeName, &st.CreatedAt,
		); err != nil {
			return SubtasksResponse{}, apperrors.Internal("failed to scan subtask", err)
		}
		subtasks = append(subtasks, st)
	}
	if err := rows.Err(); err != nil {
		return SubtasksResponse{}, apperrors.Internal("failed to iterate subtasks", err)
	}
	if subtasks == nil {
		subtasks = []SubtaskSummary{}
	}

	// Fetch progress.
	var progress SubtaskProgress
	progressQuery := `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int,
			COUNT(*) FILTER (WHERE status = 'cancelled')::int
		FROM tickets
		WHERE parent_ticket_id = $1 AND tenant_id = $2`
	if err := s.pool.QueryRow(ctx, progressQuery, parentID, auth.TenantID).Scan(
		&progress.Total, &progress.Completed, &progress.Cancelled,
	); err != nil {
		return SubtasksResponse{}, apperrors.Internal("failed to get subtask progress", err)
	}

	return SubtasksResponse{Subtasks: subtasks, Progress: progress}, nil
}

// CreateSubtask creates a child ticket under the given parent.
func (s *TicketService) CreateSubtask(ctx context.Context, parentID uuid.UUID, req CreateSubtaskRequest) (Ticket, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Ticket{}, apperrors.Unauthorized("authentication required")
	}

	// Fetch parent ticket.
	parent, err := s.GetTicket(ctx, parentID)
	if err != nil {
		return Ticket{}, err
	}

	// A subtask cannot itself have subtasks (max 1 level of nesting).
	if parent.ParentTicketID != nil {
		return Ticket{}, apperrors.BadRequest("a subtask cannot have its own subtasks")
	}

	// Build a CreateTicketRequest inheriting parent properties.
	urgency := parent.Urgency
	impact := parent.Impact
	createReq := CreateTicketRequest{
		Type:           parent.Type,
		Category:       parent.Category,
		Subcategory:    parent.Subcategory,
		Title:          req.Title,
		Description:    req.Description,
		Priority:       req.Priority,
		Urgency:        urgency,
		Impact:         impact,
		AssigneeID:     req.AssigneeID,
		TeamQueueID:    parent.TeamQueueID,
		LinkedAssetIDs: parent.LinkedAssetIDs,
		LinkedCIIDs:    parent.LinkedCIIDs,
		ParentTicketID: &parentID,
	}

	return s.CreateTicket(ctx, createReq)
}

// UnlinkSubtask removes the parent-child relationship (does NOT delete the child).
func (s *TicketService) UnlinkSubtask(ctx context.Context, parentID, childID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Verify the child ticket actually belongs to this parent.
	var actualParent *uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT parent_ticket_id FROM tickets WHERE id = $1 AND tenant_id = $2`,
		childID, auth.TenantID,
	).Scan(&actualParent)
	if err != nil {
		return apperrors.NotFound("Ticket", childID.String())
	}
	if actualParent == nil || *actualParent != parentID {
		return apperrors.BadRequest("ticket is not a subtask of this parent")
	}

	_, err = s.pool.Exec(ctx,
		`UPDATE tickets SET parent_ticket_id = NULL, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		childID, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to unlink subtask", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"action":   "unlink_subtask",
		"parentId": parentID.String(),
		"childId":  childID.String(),
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "unlink:subtask",
		EntityType: "ticket",
		EntityID:   childID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// joinStrings joins a slice of strings with a separator.
func joinStrings(elems []string, sep string) string {
	if len(elems) == 0 {
		return ""
	}
	result := elems[0]
	for _, e := range elems[1:] {
		result += sep + e
	}
	return result
}
