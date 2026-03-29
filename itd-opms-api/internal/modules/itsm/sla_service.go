package itsm

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
// SLAService
// ──────────────────────────────────────────────

// SLAService handles business logic for SLA policies, business hours,
// breach tracking, compliance stats, and escalation rules.
type SLAService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewSLAService creates a new SLAService.
func NewSLAService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *SLAService {
	return &SLAService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// SLA Policies
// ──────────────────────────────────────────────

// CreatePolicy creates a new SLA policy.
func (s *SLAService) CreatePolicy(ctx context.Context, req CreateSLAPolicyRequest) (SLAPolicy, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SLAPolicy{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	isDefault := false
	if req.IsDefault != nil {
		isDefault = *req.IsDefault
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	query := `
		INSERT INTO sla_policies (
			id, tenant_id, name, description, priority_targets,
			business_hours_calendar_id, is_default, is_active,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10
		)
		RETURNING id, tenant_id, name, description, priority_targets,
			business_hours_calendar_id, is_default, is_active,
			created_at, updated_at`

	var policy SLAPolicy
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.PriorityTargets,
		req.BusinessHoursCalendarID, isDefault, isActive,
		now, now,
	).Scan(
		&policy.ID, &policy.TenantID, &policy.Name, &policy.Description, &policy.PriorityTargets,
		&policy.BusinessHoursCalendarID, &policy.IsDefault, &policy.IsActive,
		&policy.CreatedAt, &policy.UpdatedAt,
	)
	if err != nil {
		return SLAPolicy{}, apperrors.Internal("failed to create SLA policy", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":       req.Name,
		"is_default": isDefault,
		"is_active":  isActive,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:sla_policy",
		EntityType: "sla_policy",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return policy, nil
}

// GetPolicy retrieves a single SLA policy by ID.
func (s *SLAService) GetPolicy(ctx context.Context, id uuid.UUID) (SLAPolicy, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SLAPolicy{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, priority_targets,
			business_hours_calendar_id, is_default, is_active,
			created_at, updated_at
		FROM sla_policies
		WHERE id = $1 AND tenant_id = $2`

	var policy SLAPolicy
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&policy.ID, &policy.TenantID, &policy.Name, &policy.Description, &policy.PriorityTargets,
		&policy.BusinessHoursCalendarID, &policy.IsDefault, &policy.IsActive,
		&policy.CreatedAt, &policy.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return SLAPolicy{}, apperrors.NotFound("SLAPolicy", id.String())
		}
		return SLAPolicy{}, apperrors.Internal("failed to get SLA policy", err)
	}

	return policy, nil
}

// ListPolicies returns a filtered, paginated list of SLA policies.
func (s *SLAService) ListPolicies(ctx context.Context, isActive *bool, limit, offset int) ([]SLAPolicy, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM sla_policies
		WHERE tenant_id = $1
			AND ($2::boolean IS NULL OR is_active = $2)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, isActive).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count SLA policies", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, name, description, priority_targets,
			business_hours_calendar_id, is_default, is_active,
			created_at, updated_at
		FROM sla_policies
		WHERE tenant_id = $1
			AND ($2::boolean IS NULL OR is_active = $2)
		ORDER BY is_default DESC, name ASC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, isActive, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list SLA policies", err)
	}
	defer rows.Close()

	var policies []SLAPolicy
	for rows.Next() {
		var policy SLAPolicy
		if err := rows.Scan(
			&policy.ID, &policy.TenantID, &policy.Name, &policy.Description, &policy.PriorityTargets,
			&policy.BusinessHoursCalendarID, &policy.IsDefault, &policy.IsActive,
			&policy.CreatedAt, &policy.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan SLA policy", err)
		}
		policies = append(policies, policy)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate SLA policies", err)
	}

	if policies == nil {
		policies = []SLAPolicy{}
	}

	return policies, total, nil
}

// UpdatePolicy updates an existing SLA policy using COALESCE partial update.
func (s *SLAService) UpdatePolicy(ctx context.Context, id uuid.UUID, req UpdateSLAPolicyRequest) (SLAPolicy, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SLAPolicy{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the policy exists and belongs to the tenant.
	_, err := s.GetPolicy(ctx, id)
	if err != nil {
		return SLAPolicy{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE sla_policies SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			priority_targets = COALESCE($3, priority_targets),
			business_hours_calendar_id = COALESCE($4, business_hours_calendar_id),
			is_default = COALESCE($5, is_default),
			is_active = COALESCE($6, is_active),
			updated_at = $7
		WHERE id = $8 AND tenant_id = $9
		RETURNING id, tenant_id, name, description, priority_targets,
			business_hours_calendar_id, is_default, is_active,
			created_at, updated_at`

	var policy SLAPolicy
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Description, req.PriorityTargets,
		req.BusinessHoursCalendarID, req.IsDefault, req.IsActive,
		now, id, auth.TenantID,
	).Scan(
		&policy.ID, &policy.TenantID, &policy.Name, &policy.Description, &policy.PriorityTargets,
		&policy.BusinessHoursCalendarID, &policy.IsDefault, &policy.IsActive,
		&policy.CreatedAt, &policy.UpdatedAt,
	)
	if err != nil {
		return SLAPolicy{}, apperrors.Internal("failed to update SLA policy", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:sla_policy",
		EntityType: "sla_policy",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return policy, nil
}

// DeletePolicy deletes an SLA policy by ID.
func (s *SLAService) DeletePolicy(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM sla_policies WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete SLA policy", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("SLAPolicy", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:sla_policy",
		EntityType: "sla_policy",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// GetDefaultPolicy retrieves the default active SLA policy for the tenant.
func (s *SLAService) GetDefaultPolicy(ctx context.Context) (SLAPolicy, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SLAPolicy{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, priority_targets,
			business_hours_calendar_id, is_default, is_active,
			created_at, updated_at
		FROM sla_policies
		WHERE tenant_id = $1 AND is_default = true AND is_active = true
		LIMIT 1`

	var policy SLAPolicy
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&policy.ID, &policy.TenantID, &policy.Name, &policy.Description, &policy.PriorityTargets,
		&policy.BusinessHoursCalendarID, &policy.IsDefault, &policy.IsActive,
		&policy.CreatedAt, &policy.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return SLAPolicy{}, apperrors.NotFound("SLAPolicy", "default")
		}
		return SLAPolicy{}, apperrors.Internal("failed to get default SLA policy", err)
	}

	return policy, nil
}

// ──────────────────────────────────────────────
// Business Hours Calendars
// ──────────────────────────────────────────────

// CreateCalendar creates a new business hours calendar.
func (s *SLAService) CreateCalendar(ctx context.Context, req CreateBusinessHoursCalendarRequest) (BusinessHoursCalendar, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BusinessHoursCalendar{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO business_hours_calendars (
			id, tenant_id, name, timezone, schedule,
			holidays, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8
		)
		RETURNING id, tenant_id, name, timezone, schedule,
			holidays, created_at, updated_at`

	var cal BusinessHoursCalendar
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Timezone, req.Schedule,
		req.Holidays, now, now,
	).Scan(
		&cal.ID, &cal.TenantID, &cal.Name, &cal.Timezone, &cal.Schedule,
		&cal.Holidays, &cal.CreatedAt, &cal.UpdatedAt,
	)
	if err != nil {
		return BusinessHoursCalendar{}, apperrors.Internal("failed to create business hours calendar", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":     req.Name,
		"timezone": req.Timezone,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:business_hours_calendar",
		EntityType: "business_hours_calendar",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cal, nil
}

// GetCalendar retrieves a single business hours calendar by ID.
func (s *SLAService) GetCalendar(ctx context.Context, id uuid.UUID) (BusinessHoursCalendar, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BusinessHoursCalendar{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, timezone, schedule,
			holidays, created_at, updated_at
		FROM business_hours_calendars
		WHERE id = $1 AND tenant_id = $2`

	var cal BusinessHoursCalendar
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&cal.ID, &cal.TenantID, &cal.Name, &cal.Timezone, &cal.Schedule,
		&cal.Holidays, &cal.CreatedAt, &cal.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return BusinessHoursCalendar{}, apperrors.NotFound("BusinessHoursCalendar", id.String())
		}
		return BusinessHoursCalendar{}, apperrors.Internal("failed to get business hours calendar", err)
	}

	return cal, nil
}

// ListCalendars returns all business hours calendars for the tenant.
func (s *SLAService) ListCalendars(ctx context.Context) ([]BusinessHoursCalendar, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, timezone, schedule,
			holidays, created_at, updated_at
		FROM business_hours_calendars
		WHERE tenant_id = $1
		ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list business hours calendars", err)
	}
	defer rows.Close()

	var calendars []BusinessHoursCalendar
	for rows.Next() {
		var cal BusinessHoursCalendar
		if err := rows.Scan(
			&cal.ID, &cal.TenantID, &cal.Name, &cal.Timezone, &cal.Schedule,
			&cal.Holidays, &cal.CreatedAt, &cal.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan business hours calendar", err)
		}
		calendars = append(calendars, cal)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate business hours calendars", err)
	}

	if calendars == nil {
		calendars = []BusinessHoursCalendar{}
	}

	return calendars, nil
}

// UpdateCalendar updates an existing business hours calendar using COALESCE partial update.
func (s *SLAService) UpdateCalendar(ctx context.Context, id uuid.UUID, req UpdateBusinessHoursCalendarRequest) (BusinessHoursCalendar, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BusinessHoursCalendar{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the calendar exists and belongs to the tenant.
	_, err := s.GetCalendar(ctx, id)
	if err != nil {
		return BusinessHoursCalendar{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE business_hours_calendars SET
			name = COALESCE($1, name),
			timezone = COALESCE($2, timezone),
			schedule = COALESCE($3, schedule),
			holidays = COALESCE($4, holidays),
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7
		RETURNING id, tenant_id, name, timezone, schedule,
			holidays, created_at, updated_at`

	var cal BusinessHoursCalendar
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Timezone, req.Schedule,
		req.Holidays,
		now, id, auth.TenantID,
	).Scan(
		&cal.ID, &cal.TenantID, &cal.Name, &cal.Timezone, &cal.Schedule,
		&cal.Holidays, &cal.CreatedAt, &cal.UpdatedAt,
	)
	if err != nil {
		return BusinessHoursCalendar{}, apperrors.Internal("failed to update business hours calendar", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:business_hours_calendar",
		EntityType: "business_hours_calendar",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cal, nil
}

// DeleteCalendar deletes a business hours calendar by ID.
func (s *SLAService) DeleteCalendar(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM business_hours_calendars WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete business hours calendar", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("BusinessHoursCalendar", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:business_hours_calendar",
		EntityType: "business_hours_calendar",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// SLA Breach Tracking
// ──────────────────────────────────────────────

// LogBreach records an SLA breach for a ticket.
func (s *SLAService) LogBreach(ctx context.Context, ticketID uuid.UUID, breachType string, targetWas time.Time, durationMins *int) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO sla_breaches (
			id, ticket_id, breach_type, breached_at,
			target_was, actual_duration_minutes, created_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7
		)`

	_, err := s.pool.Exec(ctx, query,
		id, ticketID, breachType, now,
		targetWas, durationMins, now,
	)
	if err != nil {
		return apperrors.Internal("failed to log SLA breach", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"ticket_id":   ticketID,
		"breach_type": breachType,
		"target_was":  targetWas,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:sla_breach",
		EntityType: "sla_breach",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ListBreaches returns all SLA breaches for a specific ticket.
func (s *SLAService) ListBreaches(ctx context.Context, ticketID uuid.UUID) ([]SLABreachEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, ticket_id, breach_type, breached_at,
			target_was, actual_duration_minutes, created_at
		FROM sla_breaches
		WHERE ticket_id = $1
		ORDER BY breached_at DESC`

	rows, err := s.pool.Query(ctx, query, ticketID)
	if err != nil {
		return nil, apperrors.Internal("failed to list SLA breaches", err)
	}
	defer rows.Close()

	var breaches []SLABreachEntry
	for rows.Next() {
		var b SLABreachEntry
		if err := rows.Scan(
			&b.ID, &b.TicketID, &b.BreachType, &b.BreachedAt,
			&b.TargetWas, &b.ActualDurationMinutes, &b.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan SLA breach", err)
		}
		breaches = append(breaches, b)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate SLA breaches", err)
	}

	if breaches == nil {
		breaches = []SLABreachEntry{}
	}

	// Suppress unused variable warning for auth.
	_ = auth

	return breaches, nil
}

// GetComplianceStats returns SLA compliance statistics for the tenant,
// optionally filtered by priority.
func (s *SLAService) GetComplianceStats(ctx context.Context, priority *string) (SLAComplianceStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SLAComplianceStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total_tickets,
			COUNT(*) FILTER (WHERE sla_response_met = true) AS response_met,
			COUNT(*) FILTER (WHERE sla_resolution_met = true) AS resolution_met
		FROM tickets
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR priority = $2)`

	var stats SLAComplianceStats
	err := s.pool.QueryRow(ctx, query, auth.TenantID, priority).Scan(
		&stats.TotalTickets,
		&stats.ResponseMet,
		&stats.ResolutionMet,
	)
	if err != nil {
		return SLAComplianceStats{}, apperrors.Internal("failed to get SLA compliance stats", err)
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// Escalation Rules
// ──────────────────────────────────────────────

// CreateEscalationRule creates a new escalation rule.
func (s *SLAService) CreateEscalationRule(ctx context.Context, req CreateEscalationRuleRequest) (EscalationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return EscalationRule{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	query := `
		INSERT INTO escalation_rules (
			id, tenant_id, name, trigger_type, trigger_config,
			escalation_chain, is_active, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9
		)
		RETURNING id, tenant_id, name, trigger_type, trigger_config,
			escalation_chain, is_active, created_at, updated_at`

	var rule EscalationRule
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.TriggerType, req.TriggerConfig,
		req.EscalationChain, isActive, now, now,
	).Scan(
		&rule.ID, &rule.TenantID, &rule.Name, &rule.TriggerType, &rule.TriggerConfig,
		&rule.EscalationChain, &rule.IsActive, &rule.CreatedAt, &rule.UpdatedAt,
	)
	if err != nil {
		return EscalationRule{}, apperrors.Internal("failed to create escalation rule", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":         req.Name,
		"trigger_type": req.TriggerType,
		"is_active":    isActive,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:escalation_rule",
		EntityType: "escalation_rule",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return rule, nil
}

// GetEscalationRule retrieves a single escalation rule by ID.
func (s *SLAService) GetEscalationRule(ctx context.Context, id uuid.UUID) (EscalationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return EscalationRule{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, trigger_type, trigger_config,
			escalation_chain, is_active, created_at, updated_at
		FROM escalation_rules
		WHERE id = $1 AND tenant_id = $2`

	var rule EscalationRule
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&rule.ID, &rule.TenantID, &rule.Name, &rule.TriggerType, &rule.TriggerConfig,
		&rule.EscalationChain, &rule.IsActive, &rule.CreatedAt, &rule.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return EscalationRule{}, apperrors.NotFound("EscalationRule", id.String())
		}
		return EscalationRule{}, apperrors.Internal("failed to get escalation rule", err)
	}

	return rule, nil
}

// ListEscalationRules returns escalation rules, optionally filtered by active status.
func (s *SLAService) ListEscalationRules(ctx context.Context, isActive *bool) ([]EscalationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, trigger_type, trigger_config,
			escalation_chain, is_active, created_at, updated_at
		FROM escalation_rules
		WHERE tenant_id = $1
			AND ($2::boolean IS NULL OR is_active = $2)
		ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, isActive)
	if err != nil {
		return nil, apperrors.Internal("failed to list escalation rules", err)
	}
	defer rows.Close()

	var rules []EscalationRule
	for rows.Next() {
		var rule EscalationRule
		if err := rows.Scan(
			&rule.ID, &rule.TenantID, &rule.Name, &rule.TriggerType, &rule.TriggerConfig,
			&rule.EscalationChain, &rule.IsActive, &rule.CreatedAt, &rule.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan escalation rule", err)
		}
		rules = append(rules, rule)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate escalation rules", err)
	}

	if rules == nil {
		rules = []EscalationRule{}
	}

	return rules, nil
}

// UpdateEscalationRule updates an existing escalation rule using COALESCE partial update.
func (s *SLAService) UpdateEscalationRule(ctx context.Context, id uuid.UUID, req UpdateEscalationRuleRequest) (EscalationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return EscalationRule{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the rule exists and belongs to the tenant.
	_, err := s.GetEscalationRule(ctx, id)
	if err != nil {
		return EscalationRule{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE escalation_rules SET
			name = COALESCE($1, name),
			trigger_type = COALESCE($2, trigger_type),
			trigger_config = COALESCE($3, trigger_config),
			escalation_chain = COALESCE($4, escalation_chain),
			is_active = COALESCE($5, is_active),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, name, trigger_type, trigger_config,
			escalation_chain, is_active, created_at, updated_at`

	var rule EscalationRule
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.TriggerType, req.TriggerConfig,
		req.EscalationChain, req.IsActive,
		now, id, auth.TenantID,
	).Scan(
		&rule.ID, &rule.TenantID, &rule.Name, &rule.TriggerType, &rule.TriggerConfig,
		&rule.EscalationChain, &rule.IsActive, &rule.CreatedAt, &rule.UpdatedAt,
	)
	if err != nil {
		return EscalationRule{}, apperrors.Internal("failed to update escalation rule", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:escalation_rule",
		EntityType: "escalation_rule",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return rule, nil
}

// DeleteEscalationRule deletes an escalation rule by ID.
func (s *SLAService) DeleteEscalationRule(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM escalation_rules WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete escalation rule", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("EscalationRule", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:escalation_rule",
		EntityType: "escalation_rule",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}
