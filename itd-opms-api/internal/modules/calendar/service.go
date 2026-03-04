package calendar

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
// CalendarService
// ──────────────────────────────────────────────

// CalendarService handles business logic for the change calendar module.
type CalendarService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewCalendarService creates a new CalendarService.
func NewCalendarService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *CalendarService {
	return &CalendarService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Calendar Events (Aggregate)
// ──────────────────────────────────────────────

// GetCalendarEvents aggregates events from multiple sources within the given date range.
// The optional eventTypes parameter filters results to specific event types.
func (s *CalendarService) GetCalendarEvents(ctx context.Context, start, end time.Time, eventTypes []string) ([]CalendarEvent, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	var events []CalendarEvent

	// Build a set of requested event types for filtering.
	typeFilter := make(map[string]bool)
	for _, t := range eventTypes {
		typeFilter[t] = true
	}
	noFilter := len(typeFilter) == 0

	// 1. Maintenance windows
	if noFilter || typeFilter["maintenance"] || typeFilter["deployment"] || typeFilter["release"] || typeFilter["outage"] {
		mwEvents, err := s.getMaintenanceWindowEvents(ctx, auth, auth.TenantID, start, end)
		if err != nil {
			slog.ErrorContext(ctx, "failed to fetch maintenance window events", "error", err)
		} else {
			for _, e := range mwEvents {
				if noFilter || typeFilter[e.EventType] {
					events = append(events, e)
				}
			}
		}
	}

	// 2. Change freeze periods
	if noFilter || typeFilter["freeze"] {
		fpEvents, err := s.getFreezePeriodEvents(ctx, auth, auth.TenantID, start, end)
		if err != nil {
			slog.ErrorContext(ctx, "failed to fetch freeze period events", "error", err)
		} else {
			events = append(events, fpEvents...)
		}
	}

	// 3. Change requests (from planning module)
	if noFilter || typeFilter["change_request"] {
		crEvents, err := s.getChangeRequestEvents(ctx, auth.TenantID, start, end)
		if err != nil {
			slog.ErrorContext(ctx, "failed to fetch change request events", "error", err)
		} else {
			events = append(events, crEvents...)
		}
	}

	// 4. Milestones (from planning module)
	if noFilter || typeFilter["milestone"] {
		msEvents, err := s.getMilestoneEvents(ctx, auth.TenantID, start, end)
		if err != nil {
			slog.ErrorContext(ctx, "failed to fetch milestone events", "error", err)
		} else {
			events = append(events, msEvents...)
		}
	}

	// 5. Project deadlines
	if noFilter || typeFilter["project_deadline"] {
		pdEvents, err := s.getProjectDeadlineEvents(ctx, auth.TenantID, start, end)
		if err != nil {
			slog.ErrorContext(ctx, "failed to fetch project deadline events", "error", err)
		} else {
			events = append(events, pdEvents...)
		}
	}

	if events == nil {
		events = []CalendarEvent{}
	}

	return events, nil
}

// getMaintenanceWindowEvents fetches maintenance windows as calendar events.
func (s *CalendarService) getMaintenanceWindowEvents(ctx context.Context, auth *types.AuthContext, tenantID uuid.UUID, start, end time.Time) ([]CalendarEvent, error) {
	// Build org-scope filter.
	orgClause, orgParam := types.BuildOrgFilter(auth, "mw.org_unit_id", 4)

	query := `
		SELECT mw.id, mw.title, mw.description, mw.window_type, mw.status,
			mw.start_time, mw.end_time, mw.is_all_day, mw.impact_level,
			COALESCE(u.display_name, '')
		FROM maintenance_windows mw
		LEFT JOIN users u ON u.id = mw.created_by
		WHERE mw.tenant_id = $1
			AND mw.start_time < $3
			AND mw.end_time > $2`

	args := []interface{}{tenantID, start, end}
	if orgClause != "" {
		query += " AND " + orgClause
		if orgParam != nil {
			args = append(args, orgParam)
		}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query maintenance windows: %w", err)
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var (
			id          uuid.UUID
			title       string
			description *string
			windowType  string
			status      string
			startTime   time.Time
			endTime     time.Time
			isAllDay    bool
			impactLevel string
			createdBy   string
		)
		if err := rows.Scan(&id, &title, &description, &windowType, &status,
			&startTime, &endTime, &isAllDay, &impactLevel, &createdBy); err != nil {
			return nil, fmt.Errorf("scan maintenance window: %w", err)
		}

		color := EventTypeColors[windowType]
		if color == "" {
			color = EventTypeColors["maintenance"]
		}

		events = append(events, CalendarEvent{
			ID:          id.String(),
			Title:       title,
			Description: description,
			StartTime:   startTime,
			EndTime:     endTime,
			IsAllDay:    isAllDay,
			EventType:   windowType,
			Status:      status,
			ImpactLevel: impactLevel,
			Source:      "calendar",
			SourceID:    id.String(),
			SourceURL:   fmt.Sprintf("/dashboard/planning/calendar?event=%s", id.String()),
			Color:       color,
			CreatedBy:   createdBy,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate maintenance windows: %w", err)
	}

	return events, nil
}

// getFreezePeriodEvents fetches change freeze periods as calendar events.
func (s *CalendarService) getFreezePeriodEvents(ctx context.Context, auth *types.AuthContext, tenantID uuid.UUID, start, end time.Time) ([]CalendarEvent, error) {
	// Build org-scope filter.
	orgClause, orgParam := types.BuildOrgFilter(auth, "cfp.org_unit_id", 4)

	query := `
		SELECT cfp.id, cfp.name, cfp.reason, cfp.start_time, cfp.end_time,
			COALESCE(u.display_name, '')
		FROM change_freeze_periods cfp
		LEFT JOIN users u ON u.id = cfp.created_by
		WHERE cfp.tenant_id = $1
			AND cfp.start_time < $3
			AND cfp.end_time > $2`

	args := []interface{}{tenantID, start, end}
	if orgClause != "" {
		query += " AND " + orgClause
		if orgParam != nil {
			args = append(args, orgParam)
		}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query freeze periods: %w", err)
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var (
			id        uuid.UUID
			name      string
			reason    *string
			startTime time.Time
			endTime   time.Time
			createdBy string
		)
		if err := rows.Scan(&id, &name, &reason, &startTime, &endTime, &createdBy); err != nil {
			return nil, fmt.Errorf("scan freeze period: %w", err)
		}

		events = append(events, CalendarEvent{
			ID:          id.String(),
			Title:       name,
			Description: reason,
			StartTime:   startTime,
			EndTime:     endTime,
			IsAllDay:    true,
			EventType:   "freeze",
			Status:      "active",
			ImpactLevel: "critical",
			Source:      "calendar",
			SourceID:    id.String(),
			SourceURL:   fmt.Sprintf("/dashboard/planning/calendar?freeze=%s", id.String()),
			Color:       EventTypeColors["freeze"],
			CreatedBy:   createdBy,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate freeze periods: %w", err)
	}

	return events, nil
}

// getChangeRequestEvents fetches change requests as calendar events.
func (s *CalendarService) getChangeRequestEvents(ctx context.Context, tenantID uuid.UUID, start, end time.Time) ([]CalendarEvent, error) {
	query := `
		SELECT cr.id, cr.title, cr.description, cr.status, cr.created_at,
			COALESCE(u.display_name, '')
		FROM change_requests cr
		LEFT JOIN users u ON u.id = cr.requested_by
		WHERE cr.tenant_id = $1
			AND cr.created_at >= $2
			AND cr.created_at < $3`

	rows, err := s.pool.Query(ctx, query, tenantID, start, end)
	if err != nil {
		return nil, fmt.Errorf("query change requests: %w", err)
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var (
			id          uuid.UUID
			title       string
			description *string
			status      string
			createdAt   time.Time
			createdBy   string
		)
		if err := rows.Scan(&id, &title, &description, &status, &createdAt, &createdBy); err != nil {
			return nil, fmt.Errorf("scan change request: %w", err)
		}

		endTime := createdAt.Add(1 * time.Hour)

		events = append(events, CalendarEvent{
			ID:          id.String(),
			Title:       fmt.Sprintf("CR: %s", title),
			Description: description,
			StartTime:   createdAt,
			EndTime:     endTime,
			IsAllDay:    false,
			EventType:   "change_request",
			Status:      status,
			ImpactLevel: "medium",
			Source:      "planning",
			SourceID:    id.String(),
			SourceURL:   fmt.Sprintf("/dashboard/planning/change-requests/%s", id.String()),
			Color:       EventTypeColors["change_request"],
			CreatedBy:   createdBy,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate change requests: %w", err)
	}

	return events, nil
}

// getMilestoneEvents fetches milestones as calendar events.
func (s *CalendarService) getMilestoneEvents(ctx context.Context, tenantID uuid.UUID, start, end time.Time) ([]CalendarEvent, error) {
	query := `
		SELECT m.id, m.title, m.description, m.target_date, m.status,
			p.title AS project_title
		FROM milestones m
		JOIN projects p ON p.id = m.project_id
		WHERE m.tenant_id = $1
			AND m.target_date >= $2
			AND m.target_date < $3`

	rows, err := s.pool.Query(ctx, query, tenantID, start, end)
	if err != nil {
		return nil, fmt.Errorf("query milestones: %w", err)
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var (
			id           uuid.UUID
			title        string
			description  *string
			targetDate   time.Time
			status       string
			projectTitle string
		)
		if err := rows.Scan(&id, &title, &description, &targetDate, &status, &projectTitle); err != nil {
			return nil, fmt.Errorf("scan milestone: %w", err)
		}

		eventTitle := fmt.Sprintf("Milestone: %s (%s)", title, projectTitle)

		events = append(events, CalendarEvent{
			ID:          id.String(),
			Title:       eventTitle,
			Description: description,
			StartTime:   targetDate,
			EndTime:     targetDate.Add(24 * time.Hour),
			IsAllDay:    true,
			EventType:   "milestone",
			Status:      status,
			ImpactLevel: "none",
			Source:      "planning",
			SourceID:    id.String(),
			SourceURL:   fmt.Sprintf("/dashboard/planning/milestones?id=%s", id.String()),
			Color:       EventTypeColors["milestone"],
			CreatedBy:   "",
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate milestones: %w", err)
	}

	return events, nil
}

// getProjectDeadlineEvents fetches project planned end dates as calendar events.
func (s *CalendarService) getProjectDeadlineEvents(ctx context.Context, tenantID uuid.UUID, start, end time.Time) ([]CalendarEvent, error) {
	query := `
		SELECT p.id, p.title, p.planned_end, p.status,
			COALESCE(u.display_name, '')
		FROM projects p
		LEFT JOIN users u ON u.id = p.project_manager_id
		WHERE p.tenant_id = $1
			AND p.planned_end IS NOT NULL
			AND p.planned_end >= $2
			AND p.planned_end < $3
			AND p.status NOT IN ('completed', 'cancelled')`

	rows, err := s.pool.Query(ctx, query, tenantID, start, end)
	if err != nil {
		return nil, fmt.Errorf("query project deadlines: %w", err)
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var (
			id         uuid.UUID
			title      string
			plannedEnd time.Time
			status     string
			pmName     string
		)
		if err := rows.Scan(&id, &title, &plannedEnd, &status, &pmName); err != nil {
			return nil, fmt.Errorf("scan project deadline: %w", err)
		}

		desc := fmt.Sprintf("Project deadline for %s", title)
		if pmName != "" {
			desc += fmt.Sprintf(" (PM: %s)", pmName)
		}

		events = append(events, CalendarEvent{
			ID:          id.String(),
			Title:       fmt.Sprintf("Deadline: %s", title),
			Description: &desc,
			StartTime:   plannedEnd,
			EndTime:     plannedEnd.Add(24 * time.Hour),
			IsAllDay:    true,
			EventType:   "project_deadline",
			Status:      status,
			ImpactLevel: "high",
			Source:      "planning",
			SourceID:    id.String(),
			SourceURL:   fmt.Sprintf("/dashboard/planning/projects/%s", id.String()),
			Color:       EventTypeColors["project_deadline"],
			CreatedBy:   pmName,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate project deadlines: %w", err)
	}

	return events, nil
}

// ──────────────────────────────────────────────
// Maintenance Windows
// ──────────────────────────────────────────────

// CreateMaintenanceWindow creates a new maintenance window.
func (s *CalendarService) CreateMaintenanceWindow(ctx context.Context, req CreateMaintenanceWindowRequest) (MaintenanceWindow, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MaintenanceWindow{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	windowType := req.WindowType
	if windowType == "" {
		windowType = WindowTypeMaintenance
	}

	impactLevel := req.ImpactLevel
	if impactLevel == "" {
		impactLevel = ImpactNone
	}

	affectedServices := req.AffectedServices
	if affectedServices == nil {
		affectedServices = []string{}
	}

	// Derive org_unit_id from auth context; use NULL if not set.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		id := auth.OrgUnitID
		orgUnitID = &id
	}

	query := `
		INSERT INTO maintenance_windows (
			id, tenant_id, title, description, window_type, status,
			start_time, end_time, is_all_day, recurrence_rule,
			affected_services, impact_level, change_request_id,
			ticket_id, project_id, org_unit_id, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13,
			$14, $15, $16, $17, $18, $19
		)
		RETURNING id, tenant_id, title, description, window_type, status,
			start_time, end_time, is_all_day, recurrence_rule,
			affected_services, impact_level, change_request_id,
			ticket_id, project_id, org_unit_id, created_by, created_at, updated_at`

	var mw MaintenanceWindow
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Title, req.Description, windowType, StatusScheduled,
		req.StartTime, req.EndTime, req.IsAllDay, req.RecurrenceRule,
		affectedServices, impactLevel, req.ChangeRequestID,
		req.TicketID, req.ProjectID, orgUnitID, auth.UserID, now, now,
	).Scan(
		&mw.ID, &mw.TenantID, &mw.Title, &mw.Description, &mw.WindowType, &mw.Status,
		&mw.StartTime, &mw.EndTime, &mw.IsAllDay, &mw.RecurrenceRule,
		&mw.AffectedServices, &mw.ImpactLevel, &mw.ChangeRequestID,
		&mw.TicketID, &mw.ProjectID, &mw.OrgUnitID, &mw.CreatedBy, &mw.CreatedAt, &mw.UpdatedAt,
	)
	if err != nil {
		return MaintenanceWindow{}, apperrors.Internal("failed to create maintenance window", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":       req.Title,
		"window_type": windowType,
		"start_time":  req.StartTime,
		"end_time":    req.EndTime,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:maintenance_window",
		EntityType: "maintenance_window",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return mw, nil
}

// GetMaintenanceWindow retrieves a single maintenance window by ID.
func (s *CalendarService) GetMaintenanceWindow(ctx context.Context, id uuid.UUID) (MaintenanceWindow, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MaintenanceWindow{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, title, description, window_type, status,
			start_time, end_time, is_all_day, recurrence_rule,
			affected_services, impact_level, change_request_id,
			ticket_id, project_id, org_unit_id, created_by, created_at, updated_at
		FROM maintenance_windows
		WHERE id = $1 AND tenant_id = $2`

	var mw MaintenanceWindow
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&mw.ID, &mw.TenantID, &mw.Title, &mw.Description, &mw.WindowType, &mw.Status,
		&mw.StartTime, &mw.EndTime, &mw.IsAllDay, &mw.RecurrenceRule,
		&mw.AffectedServices, &mw.ImpactLevel, &mw.ChangeRequestID,
		&mw.TicketID, &mw.ProjectID, &mw.OrgUnitID, &mw.CreatedBy, &mw.CreatedAt, &mw.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return MaintenanceWindow{}, apperrors.NotFound("MaintenanceWindow", id.String())
		}
		return MaintenanceWindow{}, apperrors.Internal("failed to get maintenance window", err)
	}

	// Org-scope access check.
	if mw.OrgUnitID != nil && !auth.HasOrgAccess(*mw.OrgUnitID) {
		return MaintenanceWindow{}, apperrors.NotFound("MaintenanceWindow", id.String())
	}

	return mw, nil
}

// UpdateMaintenanceWindow updates an existing maintenance window using COALESCE partial update.
func (s *CalendarService) UpdateMaintenanceWindow(ctx context.Context, id uuid.UUID, req UpdateMaintenanceWindowRequest) (MaintenanceWindow, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MaintenanceWindow{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the maintenance window exists and belongs to the tenant.
	_, err := s.GetMaintenanceWindow(ctx, id)
	if err != nil {
		return MaintenanceWindow{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE maintenance_windows SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			window_type = COALESCE($3, window_type),
			status = COALESCE($4, status),
			start_time = COALESCE($5, start_time),
			end_time = COALESCE($6, end_time),
			is_all_day = COALESCE($7, is_all_day),
			recurrence_rule = COALESCE($8, recurrence_rule),
			impact_level = COALESCE($9, impact_level),
			change_request_id = COALESCE($10, change_request_id),
			ticket_id = COALESCE($11, ticket_id),
			project_id = COALESCE($12, project_id),
			updated_at = $13
		WHERE id = $14 AND tenant_id = $15
		RETURNING id, tenant_id, title, description, window_type, status,
			start_time, end_time, is_all_day, recurrence_rule,
			affected_services, impact_level, change_request_id,
			ticket_id, project_id, org_unit_id, created_by, created_at, updated_at`

	var mw MaintenanceWindow
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.WindowType,
		req.Status, req.StartTime, req.EndTime,
		req.IsAllDay, req.RecurrenceRule, req.ImpactLevel,
		req.ChangeRequestID, req.TicketID, req.ProjectID,
		now, id, auth.TenantID,
	).Scan(
		&mw.ID, &mw.TenantID, &mw.Title, &mw.Description, &mw.WindowType, &mw.Status,
		&mw.StartTime, &mw.EndTime, &mw.IsAllDay, &mw.RecurrenceRule,
		&mw.AffectedServices, &mw.ImpactLevel, &mw.ChangeRequestID,
		&mw.TicketID, &mw.ProjectID, &mw.OrgUnitID, &mw.CreatedBy, &mw.CreatedAt, &mw.UpdatedAt,
	)
	if err != nil {
		return MaintenanceWindow{}, apperrors.Internal("failed to update maintenance window", err)
	}

	// Handle affected_services update separately since it's an array type.
	if req.AffectedServices != nil {
		svcQuery := `
			UPDATE maintenance_windows
			SET affected_services = $1
			WHERE id = $2 AND tenant_id = $3
			RETURNING affected_services`
		err = s.pool.QueryRow(ctx, svcQuery, req.AffectedServices, id, auth.TenantID).Scan(&mw.AffectedServices)
		if err != nil {
			slog.ErrorContext(ctx, "failed to update affected services", "error", err)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:maintenance_window",
		EntityType: "maintenance_window",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return mw, nil
}

// DeleteMaintenanceWindow deletes a maintenance window by ID.
func (s *CalendarService) DeleteMaintenanceWindow(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM maintenance_windows WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete maintenance window", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("MaintenanceWindow", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:maintenance_window",
		EntityType: "maintenance_window",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Change Freeze Periods
// ──────────────────────────────────────────────

// CreateFreezePeriod creates a new change freeze period.
func (s *CalendarService) CreateFreezePeriod(ctx context.Context, req CreateFreezePeriodRequest) (ChangeFreezePeriod, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChangeFreezePeriod{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	exceptions := req.Exceptions
	if exceptions == nil {
		exceptions = json.RawMessage("[]")
	}

	// Derive org_unit_id from auth context; use NULL if not set.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		oid := auth.OrgUnitID
		orgUnitID = &oid
	}

	query := `
		INSERT INTO change_freeze_periods (
			id, tenant_id, name, reason, start_time, end_time,
			exceptions, org_unit_id, created_by, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10
		)
		RETURNING id, tenant_id, name, reason, start_time, end_time,
			exceptions, org_unit_id, created_by, created_at`

	var fp ChangeFreezePeriod
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Reason, req.StartTime, req.EndTime,
		exceptions, orgUnitID, auth.UserID, now,
	).Scan(
		&fp.ID, &fp.TenantID, &fp.Name, &fp.Reason, &fp.StartTime, &fp.EndTime,
		&fp.Exceptions, &fp.OrgUnitID, &fp.CreatedBy, &fp.CreatedAt,
	)
	if err != nil {
		return ChangeFreezePeriod{}, apperrors.Internal("failed to create freeze period", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":       req.Name,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:freeze_period",
		EntityType: "change_freeze_period",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return fp, nil
}

// ListFreezePeriods returns all active freeze periods for the tenant.
func (s *CalendarService) ListFreezePeriods(ctx context.Context) ([]ChangeFreezePeriod, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 2)

	query := `
		SELECT id, tenant_id, name, reason, start_time, end_time,
			exceptions, org_unit_id, created_by, created_at
		FROM change_freeze_periods
		WHERE tenant_id = $1`

	args := []interface{}{auth.TenantID}
	if orgClause != "" {
		query += " AND " + orgClause
		if orgParam != nil {
			args = append(args, orgParam)
		}
	}
	query += ` ORDER BY start_time DESC`

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, apperrors.Internal("failed to list freeze periods", err)
	}
	defer rows.Close()

	var periods []ChangeFreezePeriod
	for rows.Next() {
		var fp ChangeFreezePeriod
		if err := rows.Scan(
			&fp.ID, &fp.TenantID, &fp.Name, &fp.Reason, &fp.StartTime, &fp.EndTime,
			&fp.Exceptions, &fp.OrgUnitID, &fp.CreatedBy, &fp.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan freeze period", err)
		}
		periods = append(periods, fp)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate freeze periods", err)
	}

	if periods == nil {
		periods = []ChangeFreezePeriod{}
	}

	return periods, nil
}

// DeleteFreezePeriod deletes a change freeze period by ID.
func (s *CalendarService) DeleteFreezePeriod(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM change_freeze_periods WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete freeze period", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ChangeFreezePeriod", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:freeze_period",
		EntityType: "change_freeze_period",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Conflict Check
// ──────────────────────────────────────────────

// CheckConflicts finds overlapping maintenance windows and freeze periods
// for the given time range.
func (s *CalendarService) CheckConflicts(ctx context.Context, start, end time.Time) (ConflictResult, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ConflictResult{}, apperrors.Unauthorized("authentication required")
	}

	result := ConflictResult{
		OverlappingEvents: []CalendarEvent{},
		FreezePeriods:     []ChangeFreezePeriod{},
	}

	// Build org-scope filter for maintenance windows.
	mwOrgClause, mwOrgParam := types.BuildOrgFilter(auth, "mw.org_unit_id", 4)

	// Find overlapping maintenance windows.
	mwQuery := `
		SELECT mw.id, mw.title, mw.description, mw.window_type, mw.status,
			mw.start_time, mw.end_time, mw.is_all_day, mw.impact_level,
			COALESCE(u.display_name, '')
		FROM maintenance_windows mw
		LEFT JOIN users u ON u.id = mw.created_by
		WHERE mw.tenant_id = $1
			AND mw.status != 'cancelled'
			AND mw.start_time < $3
			AND mw.end_time > $2`

	mwArgs := []interface{}{auth.TenantID, start, end}
	if mwOrgClause != "" {
		mwQuery += " AND " + mwOrgClause
		if mwOrgParam != nil {
			mwArgs = append(mwArgs, mwOrgParam)
		}
	}

	rows, err := s.pool.Query(ctx, mwQuery, mwArgs...)
	if err != nil {
		return ConflictResult{}, apperrors.Internal("failed to check maintenance window conflicts", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id          uuid.UUID
			title       string
			description *string
			windowType  string
			status      string
			startTime   time.Time
			endTime     time.Time
			isAllDay    bool
			impactLevel string
			createdBy   string
		)
		if err := rows.Scan(&id, &title, &description, &windowType, &status,
			&startTime, &endTime, &isAllDay, &impactLevel, &createdBy); err != nil {
			return ConflictResult{}, apperrors.Internal("failed to scan conflict", err)
		}

		color := EventTypeColors[windowType]
		if color == "" {
			color = EventTypeColors["maintenance"]
		}

		result.OverlappingEvents = append(result.OverlappingEvents, CalendarEvent{
			ID:          id.String(),
			Title:       title,
			Description: description,
			StartTime:   startTime,
			EndTime:     endTime,
			IsAllDay:    isAllDay,
			EventType:   windowType,
			Status:      status,
			ImpactLevel: impactLevel,
			Source:      "calendar",
			SourceID:    id.String(),
			SourceURL:   fmt.Sprintf("/dashboard/planning/calendar?event=%s", id.String()),
			Color:       color,
			CreatedBy:   createdBy,
		})
	}

	if err := rows.Err(); err != nil {
		return ConflictResult{}, apperrors.Internal("failed to iterate conflicts", err)
	}

	// Build org-scope filter for freeze periods.
	fpOrgClause, fpOrgParam := types.BuildOrgFilter(auth, "org_unit_id", 4)

	// Find overlapping freeze periods.
	fpQuery := `
		SELECT id, tenant_id, name, reason, start_time, end_time,
			exceptions, org_unit_id, created_by, created_at
		FROM change_freeze_periods
		WHERE tenant_id = $1
			AND start_time < $3
			AND end_time > $2`

	fpArgs := []interface{}{auth.TenantID, start, end}
	if fpOrgClause != "" {
		fpQuery += " AND " + fpOrgClause
		if fpOrgParam != nil {
			fpArgs = append(fpArgs, fpOrgParam)
		}
	}

	fpRows, err := s.pool.Query(ctx, fpQuery, fpArgs...)
	if err != nil {
		return ConflictResult{}, apperrors.Internal("failed to check freeze period conflicts", err)
	}
	defer fpRows.Close()

	for fpRows.Next() {
		var fp ChangeFreezePeriod
		if err := fpRows.Scan(
			&fp.ID, &fp.TenantID, &fp.Name, &fp.Reason, &fp.StartTime, &fp.EndTime,
			&fp.Exceptions, &fp.OrgUnitID, &fp.CreatedBy, &fp.CreatedAt,
		); err != nil {
			return ConflictResult{}, apperrors.Internal("failed to scan freeze period conflict", err)
		}
		result.FreezePeriods = append(result.FreezePeriods, fp)
	}

	if err := fpRows.Err(); err != nil {
		return ConflictResult{}, apperrors.Internal("failed to iterate freeze period conflicts", err)
	}

	return result, nil
}

// parseEventTypes splits a comma-separated string into a slice of event types.
func parseEventTypes(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	var result []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
