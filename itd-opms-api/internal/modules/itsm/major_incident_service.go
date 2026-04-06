package itsm

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/metrics"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type MajorIncidentService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	js       nats.JetStreamContext
}

type majorIncidentTicket struct {
	ID              uuid.UUID
	TenantID        uuid.UUID
	TicketNumber    string
	Type            string
	Title           string
	Status          string
	Priority        string
	ReporterID      uuid.UUID
	ReporterName    *string
	AssigneeID      *uuid.UUID
	AssigneeName    *string
	LinkedProblemID *uuid.UUID
	IsMajorIncident bool
}

const majorIncidentBaseColumns = `
	mir.id, mir.tenant_id, mir.ticket_id, mir.severity,
	mir.incident_commander_id, mir.communication_lead_id,
	mir.bridge_url, mir.bridge_phone,
	mir.affected_services, mir.affected_ci_ids,
	mir.estimated_affected_users, mir.business_impact,
	mir.status, mir.stakeholder_updates,
	mir.resolution_summary, mir.root_cause_summary,
	mir.pir_scheduled_date, mir.pir_completed_date,
	mir.pir_report, mir.communication_plan,
	mir.declared_at, mir.resolved_at, mir.closed_at,
	mir.total_duration_minutes, mir.created_at, mir.updated_at`

const majorIncidentSelectColumns = majorIncidentBaseColumns + `,
	t.id, t.ticket_number, t.title, t.status, t.priority,
	t.reporter_id, reporter.display_name,
	t.assignee_id, assignee.display_name,
	t.linked_problem_id,
	ic.id, ic.display_name, ic.email, ic.phone, ic.photo_url, ic.department, ic.job_title,
	cl.id, cl.display_name, cl.email, cl.phone, cl.photo_url, cl.department, cl.job_title`

const majorIncidentFromJoins = `
	FROM major_incident_records mir
	JOIN tickets t ON t.id = mir.ticket_id
	LEFT JOIN users reporter ON reporter.id = t.reporter_id
	LEFT JOIN users assignee ON assignee.id = t.assignee_id
	LEFT JOIN users ic ON ic.id = mir.incident_commander_id
	LEFT JOIN users cl ON cl.id = mir.communication_lead_id`

func NewMajorIncidentService(pool *pgxpool.Pool, auditSvc *audit.AuditService, js nats.JetStreamContext) *MajorIncidentService {
	return &MajorIncidentService{
		pool:     pool,
		auditSvc: auditSvc,
		js:       js,
	}
}

func (s *MajorIncidentService) DeclareMajorIncident(ctx context.Context, req DeclareMajorIncidentWorkflowRequest) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	if req.TicketID == uuid.Nil {
		return MajorIncidentRecord{}, apperrors.BadRequest("ticketId is required")
	}

	normalizedSeverity, err := normalizeMajorIncidentSeverity(req.Severity)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	commPlan := normalizeMajorIncidentCommunicationPlan(req.CommunicationPlan)
	if err := validateMajorIncidentBusinessImpact(req.BusinessImpact); err != nil {
		return MajorIncidentRecord{}, err
	}

	now := time.Now().UTC()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to start major incident transaction", err)
	}
	defer tx.Rollback(ctx)

	ticket, err := s.getMajorIncidentTicket(ctx, tx, auth.TenantID, req.TicketID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	if ticket.Type != "incident" {
		return MajorIncidentRecord{}, apperrors.BadRequest("major incident workflow can only be declared on incident tickets")
	}
	if ticket.IsMajorIncident {
		return MajorIncidentRecord{}, apperrors.BadRequest("ticket is already declared as a major incident")
	}

	initialUpdate := MajorIncidentStakeholderUpdate{
		Timestamp: now,
		AuthorID:  auth.UserID,
		Message:   fmt.Sprintf("Major incident declared as %s.", majorIncidentSeverityLabel(normalizedSeverity)),
		Type:      MajorIncidentUpdateTypeStatus,
	}
	stakeholderUpdatesJSON, err := json.Marshal([]MajorIncidentStakeholderUpdate{initialUpdate})
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to serialize stakeholder updates", err)
	}
	communicationPlanJSON, err := json.Marshal(commPlan)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to serialize communication plan", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE tickets
		SET is_major_incident = true,
			priority = CASE
				WHEN $1 = 'sev1' AND priority <> $2 THEN $2
				ELSE priority
			END,
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5`,
		normalizedSeverity, TicketPriorityP1Critical, now, req.TicketID, auth.TenantID,
	); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to mark ticket as major incident", err)
	}

	recordID := uuid.New()
	estimatedAffectedUsers := 0
	if req.EstimatedAffectedUsers != nil {
		estimatedAffectedUsers = max(*req.EstimatedAffectedUsers, 0)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO major_incident_records (
			id, tenant_id, ticket_id, severity, incident_commander_id,
			communication_lead_id, bridge_url, bridge_phone, affected_services,
			affected_ci_ids, estimated_affected_users, business_impact, status,
			stakeholder_updates, communication_plan, declared_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14, $15, $16, $17, $18
		)`,
		recordID, auth.TenantID, req.TicketID, normalizedSeverity, req.IncidentCommanderID,
		req.CommunicationLeadID, req.BridgeURL, req.BridgePhone, normalizeStringSlice(req.AffectedServices),
		req.AffectedCIIDs, estimatedAffectedUsers, req.BusinessImpact, MajorIncidentStatusDeclared,
		stakeholderUpdatesJSON, communicationPlanJSON, now, now, now,
	)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to create major incident record", err)
	}

	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "declare:major_incident",
		EntityType: "major_incident",
		EntityID:   recordID,
		Changes: mustJSON(map[string]any{
			"ticketId":               req.TicketID,
			"severity":               normalizedSeverity,
			"incidentCommanderId":    req.IncidentCommanderID,
			"communicationLeadId":    req.CommunicationLeadID,
			"businessImpact":         req.BusinessImpact,
			"communicationPlan":      commPlan,
			"estimatedAffectedUsers": estimatedAffectedUsers,
		}),
	}); err != nil {
		return MajorIncidentRecord{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to commit major incident transaction", err)
	}

	record, err := s.GetMajorIncidentByID(ctx, recordID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	roleRecipients, resolveErr := s.resolveRoleRecipients(ctx, auth.TenantID, []string{"tenant_admin", "service_owner"})
	if resolveErr != nil {
		slog.WarnContext(ctx, "failed to resolve major incident role recipients", "error", resolveErr)
	}
	recipients := appendMajorIncidentStakeholders(record, roleRecipients...)

	s.publishMajorIncidentEvent(
		ctx,
		"notify.itsm.major_incident.declared",
		"itsm.major_incident.declared",
		record,
		recipients,
		record.CommunicationPlan.ExternalStakeholders,
		record.CommunicationPlan.Channels,
		fmt.Sprintf("%s has been declared and the response workflow is now active.", record.Ticket.Title),
	)

	metrics.MajorIncidentsTotal.WithLabelValues(record.Severity).Inc()
	s.refreshMajorIncidentMetrics(ctx)

	return record, nil
}

func (s *MajorIncidentService) PostStakeholderUpdate(ctx context.Context, majorIncidentID uuid.UUID, req PostMajorIncidentUpdateRequest) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	if majorIncidentID == uuid.Nil {
		return MajorIncidentRecord{}, apperrors.BadRequest("major incident id is required")
	}
	if strings.TrimSpace(req.Message) == "" {
		return MajorIncidentRecord{}, apperrors.BadRequest("message is required")
	}
	if err := validateMajorIncidentUpdateType(req.UpdateType); err != nil {
		return MajorIncidentRecord{}, err
	}

	now := time.Now().UTC()
	update := MajorIncidentStakeholderUpdate{
		Timestamp: now,
		AuthorID:  auth.UserID,
		Message:   strings.TrimSpace(req.Message),
		Type:      req.UpdateType,
	}
	payload, err := json.Marshal(update)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to serialize stakeholder update", err)
	}

	if _, err := s.pool.Exec(ctx, `
		UPDATE major_incident_records
		SET stakeholder_updates = COALESCE(stakeholder_updates, '[]'::jsonb) || jsonb_build_array($3::jsonb),
			updated_at = $4
		WHERE id = $1 AND tenant_id = $2`,
		majorIncidentID, auth.TenantID, payload, now,
	); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to append stakeholder update", err)
	}

	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:major_incident",
		EntityType: "major_incident",
		EntityID:   majorIncidentID,
		Changes: mustJSON(map[string]any{
			"message":    update.Message,
			"updateType": update.Type,
		}),
	}); err != nil {
		return MajorIncidentRecord{}, err
	}

	record, err := s.GetMajorIncidentByID(ctx, majorIncidentID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	recipients := appendMajorIncidentStakeholders(record)
	s.publishMajorIncidentEvent(
		ctx,
		"notify.itsm.major_incident.update",
		"itsm.major_incident.update",
		record,
		recipients,
		record.CommunicationPlan.ExternalStakeholders,
		record.CommunicationPlan.Channels,
		update.Message,
	)

	return record, nil
}

func (s *MajorIncidentService) TransitionStatus(ctx context.Context, majorIncidentID uuid.UUID, targetStatus string) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	normalizedTarget, err := normalizeMajorIncidentStatus(targetStatus)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	now := time.Now().UTC()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to start major incident transition", err)
	}
	defer tx.Rollback(ctx)

	current, err := s.getMajorIncidentForUpdate(ctx, tx, auth.TenantID, majorIncidentID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	if err := validateMajorIncidentTransition(current.Status, normalizedTarget); err != nil {
		return MajorIncidentRecord{}, err
	}

	var resolvedAt *time.Time
	var closedAt *time.Time
	var pirScheduledDate *time.Time
	var totalDurationMinutes *int

	if normalizedTarget == MajorIncidentStatusResolved && current.ResolvedAt == nil {
		resolvedAt = &now
		duration := int(now.Sub(current.DeclaredAt).Minutes())
		totalDurationMinutes = &duration
	}
	if normalizedTarget == MajorIncidentStatusPIRPending {
		baseDate := now
		if current.ResolvedAt != nil {
			baseDate = *current.ResolvedAt
		}
		scheduled := addBusinessDays(baseDate, 5)
		pirScheduledDate = &scheduled
		if current.PIRScheduledDate == nil {
			if err := s.ensurePIRActionItem(ctx, tx, current, auth.UserID, scheduled); err != nil {
				return MajorIncidentRecord{}, err
			}
		}
	}
	if normalizedTarget == MajorIncidentStatusClosed {
		closedAt = &now
	}

	if err := s.updateMajorIncidentStatus(ctx, tx, auth.TenantID, majorIncidentID, normalizedTarget, resolvedAt, closedAt, pirScheduledDate, totalDurationMinutes, now); err != nil {
		return MajorIncidentRecord{}, err
	}
	statusMessage := fmt.Sprintf(
		"Status changed from %s to %s.",
		humanizeSnakeCase(current.Status),
		humanizeSnakeCase(normalizedTarget),
	)
	if err := s.appendSystemStakeholderUpdate(ctx, tx, auth.TenantID, majorIncidentID, auth.UserID, statusMessage, MajorIncidentUpdateTypeStatus, now); err != nil {
		return MajorIncidentRecord{}, err
	}
	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:major_incident",
		EntityType: "major_incident",
		EntityID:   majorIncidentID,
		Changes: mustJSON(map[string]any{
			"previousStatus": current.Status,
			"targetStatus":   normalizedTarget,
		}),
	}); err != nil {
		return MajorIncidentRecord{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to commit major incident transition", err)
	}

	record, err := s.GetMajorIncidentByID(ctx, majorIncidentID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	if normalizedTarget == MajorIncidentStatusResolved {
		s.publishMajorIncidentEvent(
			ctx,
			"notify.itsm.major_incident.resolved",
			"itsm.major_incident.resolved",
			record,
			appendMajorIncidentStakeholders(record),
			record.CommunicationPlan.ExternalStakeholders,
			record.CommunicationPlan.Channels,
			"Service has been restored and the incident is now resolved.",
		)
		if record.TotalDurationMinutes != nil {
			metrics.MajorIncidentDurationMinutes.Observe(float64(*record.TotalDurationMinutes))
		}
	}
	if normalizedTarget == MajorIncidentStatusPIRPending {
		s.publishMajorIncidentEvent(
			ctx,
			"notify.itsm.major_incident.pir.reminder",
			"itsm.major_incident.pir.reminder",
			record,
			appendMajorIncidentStakeholders(record),
			record.CommunicationPlan.ExternalStakeholders,
			record.CommunicationPlan.Channels,
			"PIR follow-up has been scheduled. Please complete the review by the due date.",
		)
	}

	s.refreshMajorIncidentMetrics(ctx)
	return record, nil
}

func (s *MajorIncidentService) ResolveMajorIncident(ctx context.Context, majorIncidentID uuid.UUID, req ResolveMajorIncidentRequest) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	if strings.TrimSpace(req.ResolutionSummary) == "" {
		return MajorIncidentRecord{}, apperrors.BadRequest("resolutionSummary is required")
	}
	if strings.TrimSpace(req.RootCause) == "" {
		return MajorIncidentRecord{}, apperrors.BadRequest("rootCause is required")
	}

	now := time.Now().UTC()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to start major incident resolution", err)
	}
	defer tx.Rollback(ctx)

	current, err := s.getMajorIncidentForUpdate(ctx, tx, auth.TenantID, majorIncidentID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	if current.Status != MajorIncidentStatusMitigated && current.Status != MajorIncidentStatusMonitoring {
		return MajorIncidentRecord{}, apperrors.BadRequest("major incident can only be resolved from mitigated or monitoring status")
	}

	duration := int(now.Sub(current.DeclaredAt).Minutes())
	scheduled := addBusinessDays(now, 5)

	if _, err := tx.Exec(ctx, `
		UPDATE major_incident_records
		SET status = $3,
			resolution_summary = $4,
			root_cause_summary = $5,
			resolved_at = $6,
			pir_scheduled_date = $7,
			total_duration_minutes = $8,
			updated_at = $9
		WHERE id = $1 AND tenant_id = $2`,
		majorIncidentID, auth.TenantID, MajorIncidentStatusPIRPending,
		strings.TrimSpace(req.ResolutionSummary), strings.TrimSpace(req.RootCause),
		now, scheduled, duration, now,
	); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to resolve major incident", err)
	}

	if err := s.ensurePIRActionItem(ctx, tx, current, auth.UserID, scheduled); err != nil {
		return MajorIncidentRecord{}, err
	}
	if err := s.appendSystemStakeholderUpdate(ctx, tx, auth.TenantID, majorIncidentID, auth.UserID, "Resolution confirmed and PIR scheduled.", MajorIncidentUpdateTypeStatus, now); err != nil {
		return MajorIncidentRecord{}, err
	}
	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "resolve:major_incident",
		EntityType: "major_incident",
		EntityID:   majorIncidentID,
		Changes: mustJSON(map[string]any{
			"previousStatus":    current.Status,
			"targetStatus":      MajorIncidentStatusResolved,
			"resolutionSummary": strings.TrimSpace(req.ResolutionSummary),
			"rootCause":         strings.TrimSpace(req.RootCause),
		}),
	}); err != nil {
		return MajorIncidentRecord{}, err
	}
	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:major_incident",
		EntityType: "major_incident",
		EntityID:   majorIncidentID,
		Changes: mustJSON(map[string]any{
			"previousStatus": MajorIncidentStatusResolved,
			"targetStatus":   MajorIncidentStatusPIRPending,
		}),
	}); err != nil {
		return MajorIncidentRecord{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to commit major incident resolution", err)
	}

	record, err := s.GetMajorIncidentByID(ctx, majorIncidentID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	s.publishMajorIncidentEvent(
		ctx,
		"notify.itsm.major_incident.resolved",
		"itsm.major_incident.resolved",
		record,
		appendMajorIncidentStakeholders(record),
		record.CommunicationPlan.ExternalStakeholders,
		record.CommunicationPlan.Channels,
		strings.TrimSpace(req.ResolutionSummary),
	)
	s.publishMajorIncidentEvent(
		ctx,
		"notify.itsm.major_incident.pir.reminder",
		"itsm.major_incident.pir.reminder",
		record,
		appendMajorIncidentStakeholders(record),
		record.CommunicationPlan.ExternalStakeholders,
		record.CommunicationPlan.Channels,
		"PIR follow-up has been scheduled and is awaiting completion.",
	)

	metrics.MajorIncidentDurationMinutes.Observe(float64(duration))
	s.refreshMajorIncidentMetrics(ctx)
	return record, nil
}

func (s *MajorIncidentService) SubmitPIR(ctx context.Context, majorIncidentID uuid.UUID, req SubmitMajorIncidentPIRRequest) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	if len(req.PIRReport) == 0 || string(req.PIRReport) == "null" {
		return MajorIncidentRecord{}, apperrors.BadRequest("pirReport is required")
	}

	now := time.Now().UTC()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to start PIR submission", err)
	}
	defer tx.Rollback(ctx)

	current, err := s.getMajorIncidentForUpdate(ctx, tx, auth.TenantID, majorIncidentID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	if current.Status != MajorIncidentStatusPIRPending && current.Status != MajorIncidentStatusResolved {
		return MajorIncidentRecord{}, apperrors.BadRequest("major incident must be resolved or pir_pending before submitting PIR")
	}

	if _, err := tx.Exec(ctx, `
		UPDATE major_incident_records
		SET pir_report = $3,
			pir_completed_date = $4,
			status = $5,
			closed_at = $6,
			updated_at = $7
		WHERE id = $1 AND tenant_id = $2`,
		majorIncidentID, auth.TenantID, req.PIRReport, now, MajorIncidentStatusClosed, now, now,
	); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to submit PIR", err)
	}
	if err := s.appendSystemStakeholderUpdate(ctx, tx, auth.TenantID, majorIncidentID, auth.UserID, "PIR submitted and major incident closed.", MajorIncidentUpdateTypeStatus, now); err != nil {
		return MajorIncidentRecord{}, err
	}
	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "submit_pir:major_incident",
		EntityType: "major_incident",
		EntityID:   majorIncidentID,
		Changes:    req.PIRReport,
	}); err != nil {
		return MajorIncidentRecord{}, err
	}
	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:major_incident",
		EntityType: "major_incident",
		EntityID:   majorIncidentID,
		Changes: mustJSON(map[string]any{
			"previousStatus": current.Status,
			"targetStatus":   MajorIncidentStatusClosed,
		}),
	}); err != nil {
		return MajorIncidentRecord{}, err
	}

	ticket, ticketErr := s.getMajorIncidentTicket(ctx, tx, auth.TenantID, current.TicketID)
	if ticketErr == nil {
		if _, createErr := s.createProblemFromPIR(ctx, tx, auth.TenantID, ticket, current, auth.UserID, req.PIRReport, now); createErr != nil {
			slog.WarnContext(ctx, "failed to auto-create problem record from PIR", "major_incident_id", majorIncidentID, "error", createErr)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to commit PIR submission", err)
	}

	record, err := s.GetMajorIncidentByID(ctx, majorIncidentID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	s.refreshMajorIncidentMetrics(ctx)
	return record, nil
}

func (s *MajorIncidentService) UpdateCommunicationPlan(ctx context.Context, majorIncidentID uuid.UUID, req UpdateMajorIncidentCommunicationPlanRequest) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	if majorIncidentID == uuid.Nil {
		return MajorIncidentRecord{}, apperrors.BadRequest("major incident id is required")
	}

	plan := normalizeMajorIncidentCommunicationPlan(&req.CommunicationPlan)
	payload, err := json.Marshal(plan)
	if err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to serialize communication plan", err)
	}
	now := time.Now().UTC()

	if _, err := s.pool.Exec(ctx, `
		UPDATE major_incident_records
		SET communication_plan = $3,
			updated_at = $4
		WHERE id = $1 AND tenant_id = $2`,
		majorIncidentID, auth.TenantID, payload, now,
	); err != nil {
		return MajorIncidentRecord{}, apperrors.Internal("failed to update communication plan", err)
	}

	if err := s.logAudit(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update_communication_plan:major_incident",
		EntityType: "major_incident",
		EntityID:   majorIncidentID,
		Changes:    payload,
	}); err != nil {
		return MajorIncidentRecord{}, err
	}

	return s.GetMajorIncidentByID(ctx, majorIncidentID)
}

func (s *MajorIncidentService) GetMajorIncidentByID(ctx context.Context, id uuid.UUID) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	record, err := s.getMajorIncidentJoined(ctx, auth.TenantID, "mir.id = $1", id)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	timeline, err := s.buildTimeline(ctx, auth.TenantID, record.ID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	record.Timeline = timeline

	enriched, err := s.enrichMajorIncidentUsers(ctx, auth.TenantID, record)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	return enriched, nil
}

func (s *MajorIncidentService) GetMajorIncidentByTicketID(ctx context.Context, ticketID uuid.UUID) (MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentRecord{}, apperrors.Unauthorized("authentication required")
	}
	record, err := s.getMajorIncidentJoined(ctx, auth.TenantID, "mir.ticket_id = $1", ticketID)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	return s.enrichMajorIncidentUsers(ctx, auth.TenantID, record)
}

func (s *MajorIncidentService) ListActiveMajorIncidents(ctx context.Context) ([]MajorIncidentRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+majorIncidentSelectColumns+majorIncidentFromJoins+`
		WHERE mir.tenant_id = $1
		  AND mir.status <> 'closed'
		ORDER BY mir.declared_at DESC`,
		auth.TenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list active major incidents", err)
	}
	defer rows.Close()

	records, err := scanMajorIncidentRows(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan active major incidents", err)
	}
	return s.enrichMajorIncidentUserLists(ctx, auth.TenantID, records)
}

func (s *MajorIncidentService) ListMajorIncidents(ctx context.Context, status, severity *string, dateFrom, dateTo *time.Time, ticketID *uuid.UUID, limit, offset int) ([]MajorIncidentRecord, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	var total int64
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM major_incident_records
		WHERE tenant_id = $1
		  AND ($2::text IS NULL OR status = $2)
		  AND ($3::text IS NULL OR severity = $3)
		  AND ($4::timestamptz IS NULL OR declared_at >= $4)
		  AND ($5::timestamptz IS NULL OR declared_at <= $5)
		  AND ($6::uuid IS NULL OR ticket_id = $6)`,
		auth.TenantID, status, severity, dateFrom, dateTo, ticketID,
	).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count major incidents", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT `+majorIncidentSelectColumns+majorIncidentFromJoins+`
		WHERE mir.tenant_id = $1
		  AND ($2::text IS NULL OR mir.status = $2)
		  AND ($3::text IS NULL OR mir.severity = $3)
		  AND ($4::timestamptz IS NULL OR mir.declared_at >= $4)
		  AND ($5::timestamptz IS NULL OR mir.declared_at <= $5)
		  AND ($6::uuid IS NULL OR mir.ticket_id = $6)
		ORDER BY mir.declared_at DESC
		LIMIT $7 OFFSET $8`,
		auth.TenantID, status, severity, dateFrom, dateTo, ticketID, limit, offset,
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list major incidents", err)
	}
	defer rows.Close()

	records, err := scanMajorIncidentRows(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan major incidents", err)
	}
	records, err = s.enrichMajorIncidentUserLists(ctx, auth.TenantID, records)
	if err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

func (s *MajorIncidentService) GetMajorIncidentStats(ctx context.Context) (MajorIncidentStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return MajorIncidentStats{}, apperrors.Unauthorized("authentication required")
	}

	var (
		stats          MajorIncidentStats
		statusCounts   json.RawMessage
		severityCounts json.RawMessage
	)
	if err := s.pool.QueryRow(ctx, `
		SELECT
			COUNT(*)::int AS total,
			COUNT(*) FILTER (WHERE status <> 'closed')::int AS active,
			COALESCE(AVG(total_duration_minutes), 0)::float8 AS avg_duration_minutes,
			jsonb_build_object(
				'declared', COUNT(*) FILTER (WHERE status = 'declared'),
				'investigating', COUNT(*) FILTER (WHERE status = 'investigating'),
				'mitigating', COUNT(*) FILTER (WHERE status = 'mitigating'),
				'mitigated', COUNT(*) FILTER (WHERE status = 'mitigated'),
				'monitoring', COUNT(*) FILTER (WHERE status = 'monitoring'),
				'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
				'pir_pending', COUNT(*) FILTER (WHERE status = 'pir_pending'),
				'closed', COUNT(*) FILTER (WHERE status = 'closed')
			),
			jsonb_build_object(
				'sev1', COUNT(*) FILTER (WHERE severity = 'sev1'),
				'sev2', COUNT(*) FILTER (WHERE severity = 'sev2'),
				'sev3', COUNT(*) FILTER (WHERE severity = 'sev3')
			)
		FROM major_incident_records
		WHERE tenant_id = $1`,
		auth.TenantID,
	).Scan(&stats.Total, &stats.Active, &stats.AvgDurationMinutes, &statusCounts, &severityCounts); err != nil {
		return MajorIncidentStats{}, apperrors.Internal("failed to fetch major incident stats", err)
	}

	stats.ByStatus = map[string]int{}
	stats.BySeverity = map[string]int{}
	if len(statusCounts) > 0 {
		_ = json.Unmarshal(statusCounts, &stats.ByStatus)
	}
	if len(severityCounts) > 0 {
		_ = json.Unmarshal(severityCounts, &stats.BySeverity)
	}
	return stats, nil
}

func (s *MajorIncidentService) getMajorIncidentJoined(ctx context.Context, tenantID uuid.UUID, predicate string, arg any) (MajorIncidentRecord, error) {
	query := `SELECT ` + majorIncidentSelectColumns + majorIncidentFromJoins + ` WHERE mir.tenant_id = $2 AND ` + predicate
	record, err := scanMajorIncidentJoined(s.pool.QueryRow(ctx, query, arg, tenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return MajorIncidentRecord{}, apperrors.NotFound("MajorIncident", fmt.Sprint(arg))
		}
		return MajorIncidentRecord{}, apperrors.Internal("failed to load major incident", err)
	}
	return record, nil
}

func (s *MajorIncidentService) getMajorIncidentForUpdate(ctx context.Context, tx pgx.Tx, tenantID, majorIncidentID uuid.UUID) (MajorIncidentRecord, error) {
	record, err := scanMajorIncidentBase(tx.QueryRow(ctx, `
		SELECT `+majorIncidentBaseColumns+`
		FROM major_incident_records mir
		WHERE mir.id = $1 AND mir.tenant_id = $2
		FOR UPDATE`,
		majorIncidentID, tenantID,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return MajorIncidentRecord{}, apperrors.NotFound("MajorIncident", majorIncidentID.String())
		}
		return MajorIncidentRecord{}, apperrors.Internal("failed to lock major incident record", err)
	}
	return record, nil
}

func (s *MajorIncidentService) getMajorIncidentTicket(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, tenantID, ticketID uuid.UUID) (majorIncidentTicket, error) {
	var ticket majorIncidentTicket
	err := q.QueryRow(ctx, `
		SELECT
			t.id, t.tenant_id, t.ticket_number, t.type, t.title,
			t.status, t.priority, t.reporter_id, reporter.display_name,
			t.assignee_id, assignee.display_name, t.linked_problem_id,
			t.is_major_incident
		FROM tickets t
		LEFT JOIN users reporter ON reporter.id = t.reporter_id
		LEFT JOIN users assignee ON assignee.id = t.assignee_id
		WHERE t.id = $1 AND t.tenant_id = $2`,
		ticketID, tenantID,
	).Scan(
		&ticket.ID, &ticket.TenantID, &ticket.TicketNumber, &ticket.Type, &ticket.Title,
		&ticket.Status, &ticket.Priority, &ticket.ReporterID, &ticket.ReporterName,
		&ticket.AssigneeID, &ticket.AssigneeName, &ticket.LinkedProblemID,
		&ticket.IsMajorIncident,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return majorIncidentTicket{}, apperrors.NotFound("Ticket", ticketID.String())
		}
		return majorIncidentTicket{}, apperrors.Internal("failed to load related ticket", err)
	}
	return ticket, nil
}

func (s *MajorIncidentService) updateMajorIncidentStatus(ctx context.Context, tx pgx.Tx, tenantID, majorIncidentID uuid.UUID, status string, resolvedAt, closedAt, pirScheduledDate *time.Time, totalDurationMinutes *int, updatedAt time.Time) error {
	_, err := tx.Exec(ctx, `
		UPDATE major_incident_records
		SET status = $3,
			resolved_at = COALESCE($4, resolved_at),
			closed_at = COALESCE($5, closed_at),
			pir_scheduled_date = COALESCE($6, pir_scheduled_date),
			total_duration_minutes = COALESCE($7, total_duration_minutes),
			updated_at = $8
		WHERE id = $1 AND tenant_id = $2`,
		majorIncidentID, tenantID, status, resolvedAt, closedAt, pirScheduledDate, totalDurationMinutes, updatedAt,
	)
	if err != nil {
		return apperrors.Internal("failed to transition major incident status", err)
	}
	return nil
}

func (s *MajorIncidentService) appendSystemStakeholderUpdate(ctx context.Context, tx pgx.Tx, tenantID, majorIncidentID, authorID uuid.UUID, message, updateType string, at time.Time) error {
	update := MajorIncidentStakeholderUpdate{
		Timestamp: at,
		AuthorID:  authorID,
		Message:   message,
		Type:      updateType,
	}
	payload, err := json.Marshal(update)
	if err != nil {
		return apperrors.Internal("failed to serialize system stakeholder update", err)
	}
	_, err = tx.Exec(ctx, `
		UPDATE major_incident_records
		SET stakeholder_updates = COALESCE(stakeholder_updates, '[]'::jsonb) || jsonb_build_array($3::jsonb),
			updated_at = $4
		WHERE id = $1 AND tenant_id = $2`,
		majorIncidentID, tenantID, payload, at,
	)
	if err != nil {
		return apperrors.Internal("failed to append system stakeholder update", err)
	}
	return nil
}

func (s *MajorIncidentService) ensurePIRActionItem(ctx context.Context, tx pgx.Tx, current MajorIncidentRecord, fallbackOwnerID uuid.UUID, dueDate time.Time) error {
	var exists bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM action_items
			WHERE tenant_id = $1
			  AND source_type = 'major_incident_pir'
			  AND source_id = $2
			  AND status IN ('open', 'in_progress')
		)`,
		current.TenantID, current.ID,
	).Scan(&exists); err != nil {
		return apperrors.Internal("failed to check PIR action item", err)
	}
	if exists {
		return nil
	}

	ownerID := fallbackOwnerID
	if current.IncidentCommanderID != nil {
		ownerID = *current.IncidentCommanderID
	} else if current.CommunicationLeadID != nil {
		ownerID = *current.CommunicationLeadID
	}

	title := fmt.Sprintf("Complete PIR for major incident %s", current.ID.String()[:8])
	description := "Complete the structured post-incident review and capture corrective actions."
	_, err := tx.Exec(ctx, `
		INSERT INTO action_items (
			tenant_id, source_type, source_id, title, description,
			owner_id, due_date, status, priority, created_at
		) VALUES (
			$1, 'major_incident_pir', $2, $3, $4,
			$5, $6, 'open', 'high', $7
		)`,
		current.TenantID, current.ID, title, description, ownerID, dueDate, time.Now().UTC(),
	)
	if err != nil {
		return apperrors.Internal("failed to create PIR action item", err)
	}
	return nil
}

func (s *MajorIncidentService) createProblemFromPIR(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, ticket majorIncidentTicket, current MajorIncidentRecord, actorID uuid.UUID, pirReport json.RawMessage, now time.Time) (*uuid.UUID, error) {
	if ticket.LinkedProblemID != nil {
		return ticket.LinkedProblemID, nil
	}
	rootCause := extractPIRRootCause(pirReport)
	if rootCause == "" && current.RootCauseSummary != nil {
		rootCause = *current.RootCauseSummary
	}
	if rootCause == "" {
		return nil, nil
	}

	ownerID := actorID
	if current.IncidentCommanderID != nil {
		ownerID = *current.IncidentCommanderID
	}

	var problemID uuid.UUID
	if err := tx.QueryRow(ctx, `
		INSERT INTO problems (
			tenant_id, title, description, root_cause, status,
			linked_incident_ids, owner_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, 'logged',
			$5, $6, $7, $8
		)
		RETURNING id`,
		tenantID,
		fmt.Sprintf("Problem follow-up for %s", ticket.TicketNumber),
		fmt.Sprintf("Auto-created from major incident %s (%s).", ticket.TicketNumber, ticket.Title),
		rootCause,
		[]uuid.UUID{ticket.ID},
		ownerID,
		now,
		now,
	).Scan(&problemID); err != nil {
		return nil, apperrors.Internal("failed to create linked problem record", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE tickets
		SET linked_problem_id = $1,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4`,
		problemID, now, ticket.ID, tenantID,
	); err != nil {
		return nil, apperrors.Internal("failed to link problem record to ticket", err)
	}

	return &problemID, nil
}

func (s *MajorIncidentService) buildTimeline(ctx context.Context, tenantID, majorIncidentID uuid.UUID) ([]MajorIncidentTimelineEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT event_id, action, actor_id, changes, timestamp
		FROM audit_events
		WHERE tenant_id = $1
		  AND entity_type = 'major_incident'
		  AND entity_id = $2
		ORDER BY timestamp ASC`,
		tenantID, majorIncidentID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to load major incident timeline", err)
	}
	defer rows.Close()

	var (
		entries  []MajorIncidentTimelineEntry
		actorIDs []uuid.UUID
	)
	for rows.Next() {
		var (
			eventID uuid.UUID
			action  string
			actorID uuid.UUID
			changes json.RawMessage
			ts      time.Time
		)
		if err := rows.Scan(&eventID, &action, &actorID, &changes, &ts); err != nil {
			return nil, apperrors.Internal("failed to scan timeline entry", err)
		}
		entry := MajorIncidentTimelineEntry{
			ID:        eventID.String(),
			Action:    action,
			Label:     humanizeMajorIncidentAuditAction(action),
			ActorID:   &actorID,
			Timestamp: ts,
			Metadata:  changes,
		}
		if description := timelineDescription(action, changes); description != "" {
			entry.Description = &description
		}
		entries = append(entries, entry)
		actorIDs = append(actorIDs, actorID)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate timeline entries", err)
	}

	userMap, err := s.loadUserDirectory(ctx, tenantID, actorIDs)
	if err != nil {
		return nil, err
	}
	for i := range entries {
		if entries[i].ActorID != nil {
			if person, ok := userMap[*entries[i].ActorID]; ok {
				entries[i].ActorName = &person.DisplayName
			}
		}
	}
	if entries == nil {
		entries = []MajorIncidentTimelineEntry{}
	}
	return entries, nil
}

func (s *MajorIncidentService) enrichMajorIncidentUsers(ctx context.Context, tenantID uuid.UUID, record MajorIncidentRecord) (MajorIncidentRecord, error) {
	records, err := s.enrichMajorIncidentUserLists(ctx, tenantID, []MajorIncidentRecord{record})
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	if len(records) == 0 {
		return MajorIncidentRecord{}, nil
	}
	return records[0], nil
}

func (s *MajorIncidentService) enrichMajorIncidentUserLists(ctx context.Context, tenantID uuid.UUID, records []MajorIncidentRecord) ([]MajorIncidentRecord, error) {
	userIDs := make([]uuid.UUID, 0)
	for _, record := range records {
		if record.IncidentCommander != nil {
			userIDs = append(userIDs, record.IncidentCommander.ID)
		}
		if record.CommunicationLead != nil {
			userIDs = append(userIDs, record.CommunicationLead.ID)
		}
		for _, update := range record.StakeholderUpdates {
			userIDs = append(userIDs, update.AuthorID)
		}
	}
	userMap, err := s.loadUserDirectory(ctx, tenantID, userIDs)
	if err != nil {
		return nil, err
	}
	for i := range records {
		for j := range records[i].StakeholderUpdates {
			update := &records[i].StakeholderUpdates[j]
			if person, ok := userMap[update.AuthorID]; ok {
				update.AuthorName = &person.DisplayName
				update.AuthorPhotoURL = person.PhotoURL
			}
		}
	}
	if records == nil {
		records = []MajorIncidentRecord{}
	}
	return records, nil
}

func (s *MajorIncidentService) loadUserDirectory(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) (map[uuid.UUID]MajorIncidentPerson, error) {
	uniqueIDs := uniqueUUIDs(ids)
	userMap := make(map[uuid.UUID]MajorIncidentPerson, len(uniqueIDs))
	if len(uniqueIDs) == 0 {
		return userMap, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, display_name, email, phone, photo_url, department, job_title
		FROM users
		WHERE tenant_id = $1
		  AND id = ANY($2)
		  AND is_active = true`,
		tenantID, uniqueIDs,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to load major incident users", err)
	}
	defer rows.Close()

	for rows.Next() {
		var person MajorIncidentPerson
		if err := rows.Scan(&person.ID, &person.DisplayName, &person.Email, &person.Phone, &person.PhotoURL, &person.Department, &person.JobTitle); err != nil {
			return nil, apperrors.Internal("failed to scan major incident user", err)
		}
		userMap[person.ID] = person
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate major incident users", err)
	}
	return userMap, nil
}

func (s *MajorIncidentService) resolveRoleRecipients(ctx context.Context, tenantID uuid.UUID, roles []string) ([]uuid.UUID, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT DISTINCT rb.user_id
		FROM role_bindings rb
		JOIN roles r ON r.id = rb.role_id
		JOIN users u ON u.id = rb.user_id
		WHERE rb.tenant_id = $1
		  AND rb.is_active = true
		  AND u.is_active = true
		  AND r.name = ANY($2)`,
		tenantID, roles,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to resolve role recipients", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, apperrors.Internal("failed to scan role recipient", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate role recipients", err)
	}
	return uniqueUUIDs(ids), nil
}

func (s *MajorIncidentService) publishMajorIncidentEvent(ctx context.Context, subject, eventType string, record MajorIncidentRecord, recipientIDs []uuid.UUID, externalEmails, channels []string, message string) {
	if s.js == nil {
		return
	}
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return
	}

	eventData, err := json.Marshal(map[string]any{
		"majorIncidentId":   record.ID.String(),
		"ticketId":          record.TicketID.String(),
		"ticketNumber":      derefMajorIncidentTicketField(record.Ticket, func(t *MajorIncidentTicketSummary) string { return t.TicketNumber }),
		"ticketTitle":       derefMajorIncidentTicketField(record.Ticket, func(t *MajorIncidentTicketSummary) string { return t.Title }),
		"severity":          record.Severity,
		"severityLabel":     majorIncidentSeverityLabel(record.Severity),
		"currentStatus":     humanizeSnakeCase(record.Status),
		"businessImpact":    defaultString(record.BusinessImpact, "Not classified"),
		"bridgeUrl":         defaultString(record.BridgeURL, "Bridge not set"),
		"bridgePhone":       defaultString(record.BridgePhone, "Bridge phone not set"),
		"incidentCommander": majorIncidentPersonName(record.IncidentCommander),
		"communicationLead": majorIncidentPersonName(record.CommunicationLead),
		"summary":           message,
		"message":           message,
		"resolutionSummary": defaultString(record.ResolutionSummary, "Resolution summary pending"),
		"rootCauseSummary":  defaultString(record.RootCauseSummary, "Root cause summary pending"),
		"pirScheduledDate":  formatOptionalTime(record.PIRScheduledDate),
		"declaredAt":        record.DeclaredAt.Format(time.RFC3339),
		"affectedServices":  strings.Join(record.AffectedServices, ", "),
		"actionUrl":         fmt.Sprintf("/dashboard/itsm/major-incidents/%s", record.ID),
		"cardTitle":         majorIncidentCardTitle(eventType, record.Severity),
		"recipientIds":      uuidStrings(recipientIDs),
		"recipientEmails":   uniqueStrings(externalEmails),
		"channels":          normalizeChannels(channels),
	})
	if err != nil {
		slog.ErrorContext(ctx, "failed to serialize major incident event payload", "subject", subject, "error", err)
		return
	}

	payload, err := json.Marshal(map[string]any{
		"type":          eventType,
		"tenantId":      record.TenantID,
		"actorId":       auth.UserID,
		"entityType":    "major_incident",
		"entityId":      record.ID,
		"correlationId": types.GetCorrelationID(ctx),
		"timestamp":     time.Now().UTC(),
		"data":          json.RawMessage(eventData),
	})
	if err != nil {
		slog.ErrorContext(ctx, "failed to serialize major incident event envelope", "subject", subject, "error", err)
		return
	}

	if _, err := s.js.Publish(subject, payload); err != nil {
		slog.ErrorContext(ctx, "failed to publish major incident event", "subject", subject, "error", err)
	}
}

func (s *MajorIncidentService) refreshMajorIncidentMetrics(ctx context.Context) {
	var active int
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM major_incident_records
		WHERE status <> 'closed'`,
	).Scan(&active); err != nil {
		slog.WarnContext(ctx, "failed to refresh major incident metrics", "error", err)
		return
	}
	metrics.MajorIncidentsActive.Set(float64(active))
}

func (s *MajorIncidentService) logAudit(ctx context.Context, entry audit.AuditEntry) error {
	if s.auditSvc == nil {
		return nil
	}
	if err := s.auditSvc.Log(ctx, entry); err != nil {
		slog.ErrorContext(ctx, "failed to log major incident audit event", "error", err)
		return apperrors.Internal("failed to write audit event", err)
	}
	return nil
}

func scanMajorIncidentBase(row pgx.Row) (MajorIncidentRecord, error) {
	var (
		record                MajorIncidentRecord
		stakeholderUpdatesRaw json.RawMessage
		communicationPlanRaw  json.RawMessage
		pirReportRaw          json.RawMessage
	)
	err := row.Scan(
		&record.ID, &record.TenantID, &record.TicketID, &record.Severity,
		&record.IncidentCommanderID, &record.CommunicationLeadID,
		&record.BridgeURL, &record.BridgePhone,
		&record.AffectedServices, &record.AffectedCIIDs,
		&record.EstimatedAffectedUsers, &record.BusinessImpact,
		&record.Status, &stakeholderUpdatesRaw,
		&record.ResolutionSummary, &record.RootCauseSummary,
		&record.PIRScheduledDate, &record.PIRCompletedDate,
		&pirReportRaw, &communicationPlanRaw,
		&record.DeclaredAt, &record.ResolvedAt, &record.ClosedAt,
		&record.TotalDurationMinutes, &record.CreatedAt, &record.UpdatedAt,
	)
	if err != nil {
		return MajorIncidentRecord{}, err
	}
	applyMajorIncidentJSON(&record, stakeholderUpdatesRaw, communicationPlanRaw, pirReportRaw)
	return record, nil
}

func scanMajorIncidentJoined(row pgx.Row) (MajorIncidentRecord, error) {
	var (
		record                MajorIncidentRecord
		stakeholderUpdatesRaw json.RawMessage
		communicationPlanRaw  json.RawMessage
		pirReportRaw          json.RawMessage
		ticket                MajorIncidentTicketSummary
		commanderID           *uuid.UUID
		commanderName         *string
		commanderEmail        *string
		commanderPhone        *string
		commanderPhotoURL     *string
		commanderDepartment   *string
		commanderJobTitle     *string
		leadID                *uuid.UUID
		leadName              *string
		leadEmail             *string
		leadPhone             *string
		leadPhotoURL          *string
		leadDepartment        *string
		leadJobTitle          *string
	)
	err := row.Scan(
		&record.ID, &record.TenantID, &record.TicketID, &record.Severity,
		&record.IncidentCommanderID, &record.CommunicationLeadID,
		&record.BridgeURL, &record.BridgePhone,
		&record.AffectedServices, &record.AffectedCIIDs,
		&record.EstimatedAffectedUsers, &record.BusinessImpact,
		&record.Status, &stakeholderUpdatesRaw,
		&record.ResolutionSummary, &record.RootCauseSummary,
		&record.PIRScheduledDate, &record.PIRCompletedDate,
		&pirReportRaw, &communicationPlanRaw,
		&record.DeclaredAt, &record.ResolvedAt, &record.ClosedAt,
		&record.TotalDurationMinutes, &record.CreatedAt, &record.UpdatedAt,
		&ticket.ID, &ticket.TicketNumber, &ticket.Title, &ticket.Status, &ticket.Priority,
		&ticket.ReporterID, &ticket.ReporterName,
		&ticket.AssigneeID, &ticket.AssigneeName,
		&ticket.LinkedProblemID,
		&commanderID, &commanderName, &commanderEmail, &commanderPhone, &commanderPhotoURL, &commanderDepartment, &commanderJobTitle,
		&leadID, &leadName, &leadEmail, &leadPhone, &leadPhotoURL, &leadDepartment, &leadJobTitle,
	)
	if err != nil {
		return MajorIncidentRecord{}, err
	}

	record.Ticket = &ticket
	if commanderID != nil {
		record.IncidentCommander = &MajorIncidentPerson{
			ID:          *commanderID,
			DisplayName: defaultString(commanderName, "Unassigned"),
			Email:       commanderEmail,
			Phone:       commanderPhone,
			PhotoURL:    commanderPhotoURL,
			Department:  commanderDepartment,
			JobTitle:    commanderJobTitle,
		}
	}
	if leadID != nil {
		record.CommunicationLead = &MajorIncidentPerson{
			ID:          *leadID,
			DisplayName: defaultString(leadName, "Unassigned"),
			Email:       leadEmail,
			Phone:       leadPhone,
			PhotoURL:    leadPhotoURL,
			Department:  leadDepartment,
			JobTitle:    leadJobTitle,
		}
	}
	applyMajorIncidentJSON(&record, stakeholderUpdatesRaw, communicationPlanRaw, pirReportRaw)
	return record, nil
}

func scanMajorIncidentRows(rows pgx.Rows) ([]MajorIncidentRecord, error) {
	var records []MajorIncidentRecord
	for rows.Next() {
		record, err := scanMajorIncidentJoined(rows)
		if err != nil {
			return nil, err
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if records == nil {
		records = []MajorIncidentRecord{}
	}
	return records, nil
}

func applyMajorIncidentJSON(record *MajorIncidentRecord, stakeholderUpdatesRaw, communicationPlanRaw, pirReportRaw json.RawMessage) {
	record.CommunicationPlan = MajorIncidentCommunicationPlan{
		InternalStakeholders:   []uuid.UUID{},
		ExternalStakeholders:   []string{},
		UpdateFrequencyMinutes: 30,
		Channels:               normalizeChannels(nil),
	}
	record.StakeholderUpdates = []MajorIncidentStakeholderUpdate{}
	record.PIRReport = json.RawMessage("{}")

	if len(stakeholderUpdatesRaw) > 0 && string(stakeholderUpdatesRaw) != "null" {
		_ = json.Unmarshal(stakeholderUpdatesRaw, &record.StakeholderUpdates)
	}
	if len(communicationPlanRaw) > 0 && string(communicationPlanRaw) != "null" && string(communicationPlanRaw) != "" {
		_ = json.Unmarshal(communicationPlanRaw, &record.CommunicationPlan)
		record.CommunicationPlan = normalizeMajorIncidentCommunicationPlan(&record.CommunicationPlan)
	}
	if len(pirReportRaw) > 0 && string(pirReportRaw) != "null" {
		record.PIRReport = pirReportRaw
	}

	if count := len(record.StakeholderUpdates); count > 0 {
		last := record.StakeholderUpdates[count-1]
		record.LastUpdateAt = &last.Timestamp
		record.LastUpdateMessage = &last.Message
	}
}

func normalizeMajorIncidentSeverity(severity string) (string, error) {
	switch strings.TrimSpace(strings.ToLower(severity)) {
	case "", MajorIncidentSeveritySev1:
		return MajorIncidentSeveritySev1, nil
	case MajorIncidentSeveritySev2:
		return MajorIncidentSeveritySev2, nil
	case MajorIncidentSeveritySev3:
		return MajorIncidentSeveritySev3, nil
	default:
		return "", apperrors.BadRequest("severity must be one of sev1, sev2, or sev3")
	}
}

func normalizeMajorIncidentStatus(status string) (string, error) {
	normalized := strings.TrimSpace(strings.ToLower(status))
	switch normalized {
	case MajorIncidentStatusDeclared,
		MajorIncidentStatusInvestigating,
		MajorIncidentStatusMitigating,
		MajorIncidentStatusMitigated,
		MajorIncidentStatusMonitoring,
		MajorIncidentStatusResolved,
		MajorIncidentStatusPIRPending,
		MajorIncidentStatusClosed:
		return normalized, nil
	default:
		return "", apperrors.BadRequest("invalid major incident status")
	}
}

func validateMajorIncidentTransition(current, target string) error {
	allowed := map[string][]string{
		MajorIncidentStatusDeclared:      {MajorIncidentStatusInvestigating},
		MajorIncidentStatusInvestigating: {MajorIncidentStatusMitigating},
		MajorIncidentStatusMitigating:    {MajorIncidentStatusMitigated},
		MajorIncidentStatusMitigated:     {MajorIncidentStatusMonitoring, MajorIncidentStatusResolved},
		MajorIncidentStatusMonitoring:    {MajorIncidentStatusResolved},
		MajorIncidentStatusResolved:      {MajorIncidentStatusPIRPending},
		MajorIncidentStatusPIRPending:    {MajorIncidentStatusClosed},
		MajorIncidentStatusClosed:        {},
	}
	if slices.Contains(allowed[current], target) {
		return nil
	}
	return apperrors.BadRequest(fmt.Sprintf("invalid major incident transition: %s -> %s", current, target))
}

func validateMajorIncidentUpdateType(updateType string) error {
	switch updateType {
	case MajorIncidentUpdateTypeStatus, MajorIncidentUpdateTypeComms, MajorIncidentUpdateTypeTechnical:
		return nil
	default:
		return apperrors.BadRequest("updateType must be one of status_update, comms, or technical")
	}
}

func validateMajorIncidentBusinessImpact(impact *string) error {
	if impact == nil || strings.TrimSpace(*impact) == "" {
		return nil
	}
	switch strings.TrimSpace(strings.ToLower(*impact)) {
	case "critical", "high", "medium", "low":
		return nil
	default:
		return apperrors.BadRequest("businessImpact must be one of critical, high, medium, or low")
	}
}

func normalizeMajorIncidentCommunicationPlan(plan *MajorIncidentCommunicationPlan) MajorIncidentCommunicationPlan {
	if plan == nil {
		return MajorIncidentCommunicationPlan{
			InternalStakeholders:   []uuid.UUID{},
			ExternalStakeholders:   []string{},
			UpdateFrequencyMinutes: 30,
			Channels:               normalizeChannels(nil),
		}
	}
	normalized := MajorIncidentCommunicationPlan{
		InternalStakeholders:   uniqueUUIDs(plan.InternalStakeholders),
		ExternalStakeholders:   uniqueStrings(plan.ExternalStakeholders),
		UpdateFrequencyMinutes: plan.UpdateFrequencyMinutes,
		Channels:               normalizeChannels(plan.Channels),
	}
	if normalized.UpdateFrequencyMinutes <= 0 {
		normalized.UpdateFrequencyMinutes = 30
	}
	return normalized
}

func normalizeChannels(channels []string) []string {
	supported := map[string]bool{"email": true, "teams": true, "in_app": true}
	if len(channels) == 0 {
		return []string{"email", "teams", "in_app"}
	}
	normalized := make([]string, 0, len(channels))
	for _, channel := range channels {
		channel = strings.TrimSpace(strings.ToLower(channel))
		if supported[channel] && !slices.Contains(normalized, channel) {
			normalized = append(normalized, channel)
		}
	}
	if len(normalized) == 0 {
		return []string{"email", "teams", "in_app"}
	}
	return normalized
}

func uniqueUUIDs(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(ids))
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func normalizeStringSlice(values []string) []string {
	return uniqueStrings(values)
}

func uuidStrings(ids []uuid.UUID) []string {
	out := make([]string, 0, len(ids))
	for _, id := range uniqueUUIDs(ids) {
		out = append(out, id.String())
	}
	return out
}

func addBusinessDays(from time.Time, days int) time.Time {
	current := from
	added := 0
	for added < days {
		current = current.AddDate(0, 0, 1)
		if current.Weekday() != time.Saturday && current.Weekday() != time.Sunday {
			added++
		}
	}
	return current
}

func humanizeSnakeCase(value string) string {
	if value == "" {
		return ""
	}
	return strings.ReplaceAll(value, "_", " ")
}

func humanizeMajorIncidentAuditAction(action string) string {
	switch action {
	case "declare:major_incident":
		return "Declared"
	case "update:major_incident":
		return "Stakeholder update posted"
	case "transition:major_incident":
		return "Status transitioned"
	case "resolve:major_incident":
		return "Resolved"
	case "submit_pir:major_incident":
		return "PIR submitted"
	case "update_communication_plan:major_incident":
		return "Communication plan updated"
	default:
		return humanizeSnakeCase(strings.ReplaceAll(action, ":", " "))
	}
}

func timelineDescription(action string, changes json.RawMessage) string {
	if len(changes) == 0 || string(changes) == "null" {
		return ""
	}
	var payload map[string]any
	if err := json.Unmarshal(changes, &payload); err != nil {
		return ""
	}
	switch action {
	case "transition:major_incident":
		previous := stringValue(payload["previousStatus"])
		target := stringValue(payload["targetStatus"])
		if previous != "" || target != "" {
			return fmt.Sprintf("%s -> %s", humanizeSnakeCase(previous), humanizeSnakeCase(target))
		}
	case "update:major_incident":
		message := stringValue(payload["message"])
		updateType := stringValue(payload["updateType"])
		if message != "" {
			if updateType != "" {
				return fmt.Sprintf("%s: %s", humanizeSnakeCase(updateType), message)
			}
			return message
		}
	case "resolve:major_incident":
		summary := stringValue(payload["resolutionSummary"])
		if summary != "" {
			return summary
		}
	}
	return ""
}

func appendMajorIncidentStakeholders(record MajorIncidentRecord, extra ...uuid.UUID) []uuid.UUID {
	ids := make([]uuid.UUID, 0)
	if record.IncidentCommanderID != nil {
		ids = append(ids, *record.IncidentCommanderID)
	}
	if record.CommunicationLeadID != nil {
		ids = append(ids, *record.CommunicationLeadID)
	}
	ids = append(ids, record.CommunicationPlan.InternalStakeholders...)
	ids = append(ids, extra...)
	return uniqueUUIDs(ids)
}

func majorIncidentSeverityLabel(severity string) string {
	switch severity {
	case MajorIncidentSeveritySev1:
		return "SEV-1"
	case MajorIncidentSeveritySev2:
		return "SEV-2"
	case MajorIncidentSeveritySev3:
		return "SEV-3"
	default:
		return strings.ToUpper(severity)
	}
}

func majorIncidentCardTitle(eventType, severity string) string {
	switch eventType {
	case "itsm.major_incident.declared":
		return fmt.Sprintf("%s major incident declared", majorIncidentSeverityLabel(severity))
	case "itsm.major_incident.update":
		return fmt.Sprintf("%s major incident update", majorIncidentSeverityLabel(severity))
	case "itsm.major_incident.resolved":
		return fmt.Sprintf("%s major incident resolved", majorIncidentSeverityLabel(severity))
	case "itsm.major_incident.pir.reminder":
		return fmt.Sprintf("%s PIR follow-up scheduled", majorIncidentSeverityLabel(severity))
	default:
		return fmt.Sprintf("%s major incident", majorIncidentSeverityLabel(severity))
	}
}

func defaultString(value *string, fallback string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return fallback
	}
	return *value
}

func defaultStringValue(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func majorIncidentPersonName(person *MajorIncidentPerson) string {
	if person == nil || strings.TrimSpace(person.DisplayName) == "" {
		return "Unassigned"
	}
	return person.DisplayName
}

func formatOptionalTime(value *time.Time) string {
	if value == nil {
		return "Not scheduled"
	}
	return value.Format(time.RFC3339)
}

func stringValue(value any) string {
	str, _ := value.(string)
	return str
}

func extractPIRRootCause(pirReport json.RawMessage) string {
	var payload map[string]any
	if err := json.Unmarshal(pirReport, &payload); err != nil {
		return ""
	}
	if rootCause := stringValue(payload["rootCause"]); rootCause != "" {
		return rootCause
	}
	return stringValue(payload["root_cause"])
}

func mustJSON(value any) json.RawMessage {
	data, _ := json.Marshal(value)
	return data
}

func derefMajorIncidentTicketField(ticket *MajorIncidentTicketSummary, fn func(*MajorIncidentTicketSummary) string) string {
	if ticket == nil {
		return ""
	}
	return fn(ticket)
}
