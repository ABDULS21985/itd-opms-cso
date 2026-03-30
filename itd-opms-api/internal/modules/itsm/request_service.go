package itsm

import (
	"context"
	"encoding/json"
	"fmt"
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
// Approval chain config (internal parsing types)
// ──────────────────────────────────────────────

type approvalChainConfig struct {
	Type      string             `json:"type"` // "sequential" or "parallel"
	Approvers []approvalApprover `json:"approvers"`
}

type approvalApprover struct {
	UserID uuid.UUID `json:"user_id"`
	Order  int       `json:"order"` // only meaningful for sequential
}

// ──────────────────────────────────────────────
// RequestService
// ──────────────────────────────────────────────

// RequestService handles business logic for the service request lifecycle,
// including submission, approval workflows, and cancellation.
type RequestService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewRequestService creates a new RequestService.
func NewRequestService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *RequestService {
	return &RequestService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Timeline helper
// ──────────────────────────────────────────────

// addTimelineEntry inserts a timeline entry for a service request.
func (s *RequestService) addTimelineEntry(ctx context.Context, tx pgx.Tx, requestID, actorID uuid.UUID, eventType string, description *string, metadata json.RawMessage) error {
	query := `
		INSERT INTO request_timeline (
			id, request_id, event_type, actor_id,
			description, metadata, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)`

	if metadata == nil {
		metadata = json.RawMessage("null")
	}

	_, err := tx.Exec(ctx, query,
		uuid.New(), requestID, eventType, actorID,
		description, metadata, time.Now().UTC(),
	)
	return err
}

// ──────────────────────────────────────────────
// SubmitRequest
// ──────────────────────────────────────────────

// SubmitRequest creates a new service request. If the catalog item requires
// approval, approval tasks are created based on the approval_chain_config.
// Otherwise the request status is set directly to "approved".
func (s *RequestService) SubmitRequest(ctx context.Context, req SubmitServiceRequestRequest) (ServiceRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ServiceRequest{}, apperrors.Unauthorized("authentication required")
	}

	// Look up catalog item to check approval requirements and SLA policy.
	itemQuery := `
		SELECT id, approval_required, approval_chain_config, name,
			COALESCE(approval_mode, 'sequential'), sla_policy_id
		FROM service_catalog_items
		WHERE id = $1 AND tenant_id = $2 AND status = 'active'`

	var itemID uuid.UUID
	var approvalRequired bool
	var chainConfigRaw json.RawMessage
	var itemName string
	var approvalMode string
	var catalogSLAPolicyID *uuid.UUID
	err := s.pool.QueryRow(ctx, itemQuery, req.CatalogItemID, auth.TenantID).Scan(
		&itemID, &approvalRequired, &chainConfigRaw, &itemName, &approvalMode,
		&catalogSLAPolicyID,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequest{}, apperrors.NotFound("CatalogItem", req.CatalogItemID.String())
		}
		return ServiceRequest{}, apperrors.Internal("failed to look up catalog item", err)
	}

	// Determine initial status.
	status := RequestStatusApproved
	if approvalRequired {
		status = RequestStatusPendingApproval
	}

	formData := req.FormData
	if formData == nil {
		formData = json.RawMessage("null")
	}

	id := uuid.New()
	now := time.Now().UTC()
	requestPriority := "P3_medium"

	// Calculate SLA targets if catalog item has an SLA policy.
	var slaPolicyID *uuid.UUID
	var slaResolutionTarget *time.Time // approval deadline
	var slaFulfillmentTarget *time.Time // fulfillment deadline
	if catalogSLAPolicyID != nil {
		var priorityTargetsRaw json.RawMessage
		err := s.pool.QueryRow(ctx,
			`SELECT priority_targets FROM sla_policies
			 WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
			*catalogSLAPolicyID, auth.TenantID,
		).Scan(&priorityTargetsRaw)
		if err == nil {
			// Parse priority_targets JSONB: {"P3_medium": {"response_minutes": 60, "resolution_minutes": 480}, ...}
			var targets map[string]struct {
				ResponseMinutes   int `json:"response_minutes"`
				ResolutionMinutes int `json:"resolution_minutes"`
			}
			if json.Unmarshal(priorityTargetsRaw, &targets) == nil {
				if t, ok := targets[requestPriority]; ok {
					slaPolicyID = catalogSLAPolicyID
					if t.ResponseMinutes > 0 {
						rt := now.Add(time.Duration(t.ResponseMinutes) * time.Minute)
						slaResolutionTarget = &rt
					}
					if t.ResolutionMinutes > 0 {
						ft := now.Add(time.Duration(t.ResolutionMinutes) * time.Minute)
						slaFulfillmentTarget = &ft
					}
				}
			}
		}
	}

	// Begin transaction.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Insert service request. The request_number is auto-generated by a DB trigger.
	insertQuery := `
		INSERT INTO service_requests (
			id, tenant_id, catalog_item_id, requester_id,
			status, form_data, priority,
			sla_policy_id, sla_resolution_target, sla_fulfillment_target,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7,
			$8, $9, $10,
			$11, $12
		)
		RETURNING id, tenant_id, request_number, catalog_item_id, requester_id,
			status, form_data, assigned_to, priority, ticket_id,
			rejection_reason, fulfillment_notes, fulfilled_at, cancelled_at,
			created_at, updated_at,
			sla_policy_id, sla_resolution_target, sla_resolution_met,
			sla_fulfillment_target, sla_fulfillment_met,
			sla_paused_at, sla_paused_duration_minutes`

	var sr ServiceRequest
	err = tx.QueryRow(ctx, insertQuery,
		id, auth.TenantID, req.CatalogItemID, auth.UserID,
		status, formData, requestPriority,
		slaPolicyID, slaResolutionTarget, slaFulfillmentTarget,
		now, now,
	).Scan(
		&sr.ID, &sr.TenantID, &sr.RequestNumber, &sr.CatalogItemID, &sr.RequesterID,
		&sr.Status, &sr.FormData, &sr.AssignedTo, &sr.Priority, &sr.TicketID,
		&sr.RejectionReason, &sr.FulfillmentNotes, &sr.FulfilledAt, &sr.CancelledAt,
		&sr.CreatedAt, &sr.UpdatedAt,
		&sr.SLAPolicyID, &sr.SLAResolutionTarget, &sr.SLAResolutionMet,
		&sr.SLAFulfillmentTarget, &sr.SLAFulfillmentMet,
		&sr.SLAPausedAt, &sr.SLAPausedDurationMinutes,
	)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to create service request", err)
	}

	// Add "submitted" timeline entry.
	desc := fmt.Sprintf("Service request submitted for %s", itemName)
	if err := s.addTimelineEntry(ctx, tx, id, auth.UserID, "submitted", &desc, nil); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to add timeline entry", err)
	}

	// If approval is required, parse the chain config and create approval tasks.
	if approvalRequired && len(chainConfigRaw) > 0 && string(chainConfigRaw) != "null" {
		var chainCfg approvalChainConfig
		if err := json.Unmarshal(chainConfigRaw, &chainCfg); err != nil {
			return ServiceRequest{}, apperrors.Internal("failed to parse approval chain config", err)
		}

		// Use the catalog item's approval_mode (overrides legacy chain config type).
		effectiveMode := approvalMode

		for i, approver := range chainCfg.Approvers {
			taskID := uuid.New()

			// For parallel mode: all tasks start as "pending" (all approvers notified at once).
			// For sequential mode: only the first task starts as "pending"; rest as "pending"
			// but ApproveRequest will enforce sequence order.
			taskStatus := ApprovalTaskStatusPending
			order := approver.Order
			if order == 0 {
				order = i + 1
			}

			taskQuery := `
				INSERT INTO approval_tasks (
					id, tenant_id, request_id, approver_id,
					sequence_order, status, created_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7)`

			_, err := tx.Exec(ctx, taskQuery,
				taskID, auth.TenantID, id, approver.UserID,
				order, taskStatus, now,
			)
			if err != nil {
				return ServiceRequest{}, apperrors.Internal("failed to create approval task", err)
			}
		}

		// Add "approval_requested" timeline entry.
		approvalDesc := fmt.Sprintf("Approval requested (%s mode with %d approver(s))", effectiveMode, len(chainCfg.Approvers))
		if err := s.addTimelineEntry(ctx, tx, id, auth.UserID, "approval_requested", &approvalDesc, nil); err != nil {
			return ServiceRequest{}, apperrors.Internal("failed to add approval timeline entry", err)
		}

		// Pause the SLA fulfillment clock during the approval phase.
		if slaFulfillmentTarget != nil {
			_, err := tx.Exec(ctx,
				`UPDATE service_requests SET sla_paused_at = $1 WHERE id = $2`,
				now, id,
			)
			if err != nil {
				return ServiceRequest{}, apperrors.Internal("failed to pause SLA clock", err)
			}
			sr.SLAPausedAt = &now
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"catalog_item_id":   req.CatalogItemID,
		"approval_required": approvalRequired,
		"status":            status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "submit:service_request",
		EntityType: "service_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	sr.CatalogItemName = &itemName
	return sr, nil
}

// ──────────────────────────────────────────────
// ListMyRequests
// ──────────────────────────────────────────────

// ListMyRequests returns paginated service requests submitted by the current user.
func (s *RequestService) ListMyRequests(ctx context.Context, status *string, limit, offset int) ([]ServiceRequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM service_requests
		WHERE tenant_id = $1
			AND requester_id = $2
			AND ($3::text IS NULL OR status = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, auth.UserID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count service requests", err)
	}

	// Fetch paginated results with catalog item name.
	dataQuery := `
		SELECT sr.id, sr.tenant_id, sr.request_number, sr.catalog_item_id, sr.requester_id,
			sr.status, sr.form_data, sr.assigned_to, sr.priority, sr.ticket_id,
			sr.rejection_reason, sr.fulfillment_notes, sr.fulfilled_at, sr.cancelled_at,
			sr.created_at, sr.updated_at,
			sr.sla_policy_id, sr.sla_resolution_target, sr.sla_resolution_met,
			sr.sla_fulfillment_target, sr.sla_fulfillment_met,
			sr.sla_paused_at, sr.sla_paused_duration_minutes,
			ci.name AS catalog_item_name
		FROM service_requests sr
		LEFT JOIN service_catalog_items ci ON ci.id = sr.catalog_item_id
		WHERE sr.tenant_id = $1
			AND sr.requester_id = $2
			AND ($3::text IS NULL OR sr.status = $3)
		ORDER BY sr.created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, auth.UserID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list service requests", err)
	}
	defer rows.Close()

	var requests []ServiceRequest
	for rows.Next() {
		var sr ServiceRequest
		if err := rows.Scan(
			&sr.ID, &sr.TenantID, &sr.RequestNumber, &sr.CatalogItemID, &sr.RequesterID,
			&sr.Status, &sr.FormData, &sr.AssignedTo, &sr.Priority, &sr.TicketID,
			&sr.RejectionReason, &sr.FulfillmentNotes, &sr.FulfilledAt, &sr.CancelledAt,
			&sr.CreatedAt, &sr.UpdatedAt,
			&sr.SLAPolicyID, &sr.SLAResolutionTarget, &sr.SLAResolutionMet,
			&sr.SLAFulfillmentTarget, &sr.SLAFulfillmentMet,
			&sr.SLAPausedAt, &sr.SLAPausedDurationMinutes,
			&sr.CatalogItemName,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan service request", err)
		}
		requests = append(requests, sr)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate service requests", err)
	}

	if requests == nil {
		requests = []ServiceRequest{}
	}

	return requests, total, nil
}

// ──────────────────────────────────────────────
// GetRequestDetail
// ──────────────────────────────────────────────

// GetRequestDetail retrieves a full service request with its approval tasks and timeline.
func (s *RequestService) GetRequestDetail(ctx context.Context, id uuid.UUID) (ServiceRequestDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ServiceRequestDetail{}, apperrors.Unauthorized("authentication required")
	}

	// Fetch the service request with catalog item name.
	srQuery := `
		SELECT sr.id, sr.tenant_id, sr.request_number, sr.catalog_item_id, sr.requester_id,
			sr.status, sr.form_data, sr.assigned_to, sr.priority, sr.ticket_id,
			sr.rejection_reason, sr.fulfillment_notes, sr.fulfilled_at, sr.cancelled_at,
			sr.created_at, sr.updated_at,
			sr.sla_policy_id, sr.sla_resolution_target, sr.sla_resolution_met,
			sr.sla_fulfillment_target, sr.sla_fulfillment_met,
			sr.sla_paused_at, sr.sla_paused_duration_minutes,
			ci.name AS catalog_item_name
		FROM service_requests sr
		LEFT JOIN service_catalog_items ci ON ci.id = sr.catalog_item_id
		WHERE sr.id = $1 AND sr.tenant_id = $2`

	var detail ServiceRequestDetail
	err := s.pool.QueryRow(ctx, srQuery, id, auth.TenantID).Scan(
		&detail.ID, &detail.TenantID, &detail.RequestNumber, &detail.CatalogItemID, &detail.RequesterID,
		&detail.Status, &detail.FormData, &detail.AssignedTo, &detail.Priority, &detail.TicketID,
		&detail.RejectionReason, &detail.FulfillmentNotes, &detail.FulfilledAt, &detail.CancelledAt,
		&detail.CreatedAt, &detail.UpdatedAt,
		&detail.SLAPolicyID, &detail.SLAResolutionTarget, &detail.SLAResolutionMet,
		&detail.SLAFulfillmentTarget, &detail.SLAFulfillmentMet,
		&detail.SLAPausedAt, &detail.SLAPausedDurationMinutes,
		&detail.CatalogItemName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequestDetail{}, apperrors.NotFound("ServiceRequest", id.String())
		}
		return ServiceRequestDetail{}, apperrors.Internal("failed to get service request", err)
	}

	// Fetch approval tasks.
	tasksQuery := `
		SELECT id, tenant_id, request_id, approver_id,
			sequence_order, status, decision_at, comment,
			delegated_to, created_at
		FROM approval_tasks
		WHERE request_id = $1 AND tenant_id = $2
		ORDER BY sequence_order ASC, created_at ASC`

	taskRows, err := s.pool.Query(ctx, tasksQuery, id, auth.TenantID)
	if err != nil {
		return ServiceRequestDetail{}, apperrors.Internal("failed to list approval tasks", err)
	}
	defer taskRows.Close()

	var tasks []ApprovalTask
	for taskRows.Next() {
		var t ApprovalTask
		if err := taskRows.Scan(
			&t.ID, &t.TenantID, &t.RequestID, &t.ApproverID,
			&t.SequenceOrder, &t.Status, &t.DecisionAt, &t.Comment,
			&t.DelegatedTo, &t.CreatedAt,
		); err != nil {
			return ServiceRequestDetail{}, apperrors.Internal("failed to scan approval task", err)
		}
		tasks = append(tasks, t)
	}
	if err := taskRows.Err(); err != nil {
		return ServiceRequestDetail{}, apperrors.Internal("failed to iterate approval tasks", err)
	}
	if tasks == nil {
		tasks = []ApprovalTask{}
	}
	detail.ApprovalTasks = tasks

	// Fetch timeline entries.
	timelineQuery := `
		SELECT id, request_id, event_type, actor_id,
			description, metadata, created_at
		FROM request_timeline
		WHERE request_id = $1
		ORDER BY created_at ASC`

	tlRows, err := s.pool.Query(ctx, timelineQuery, id)
	if err != nil {
		return ServiceRequestDetail{}, apperrors.Internal("failed to list timeline entries", err)
	}
	defer tlRows.Close()

	var timeline []RequestTimelineEntry
	for tlRows.Next() {
		var entry RequestTimelineEntry
		if err := tlRows.Scan(
			&entry.ID, &entry.RequestID, &entry.EventType, &entry.ActorID,
			&entry.Description, &entry.Metadata, &entry.CreatedAt,
		); err != nil {
			return ServiceRequestDetail{}, apperrors.Internal("failed to scan timeline entry", err)
		}
		timeline = append(timeline, entry)
	}
	if err := tlRows.Err(); err != nil {
		return ServiceRequestDetail{}, apperrors.Internal("failed to iterate timeline entries", err)
	}
	if timeline == nil {
		timeline = []RequestTimelineEntry{}
	}
	detail.Timeline = timeline

	return detail, nil
}

// ──────────────────────────────────────────────
// ListPendingApprovals
// ──────────────────────────────────────────────

// ListPendingApprovals returns paginated service requests where the current
// user has a pending approval task.
func (s *RequestService) ListPendingApprovals(ctx context.Context, limit, offset int) ([]ServiceRequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total pending approvals for this user.
	countQuery := `
		SELECT COUNT(DISTINCT sr.id)
		FROM service_requests sr
		INNER JOIN approval_tasks at ON at.request_id = sr.id
		WHERE sr.tenant_id = $1
			AND at.approver_id = $2
			AND at.status = 'pending'
			AND sr.status = 'pending_approval'`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, auth.UserID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count pending approvals", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT DISTINCT ON (sr.id)
			sr.id, sr.tenant_id, sr.request_number, sr.catalog_item_id, sr.requester_id,
			sr.status, sr.form_data, sr.assigned_to, sr.priority, sr.ticket_id,
			sr.rejection_reason, sr.fulfillment_notes, sr.fulfilled_at, sr.cancelled_at,
			sr.created_at, sr.updated_at,
			sr.sla_policy_id, sr.sla_resolution_target, sr.sla_resolution_met,
			sr.sla_fulfillment_target, sr.sla_fulfillment_met,
			sr.sla_paused_at, sr.sla_paused_duration_minutes,
			ci.name AS catalog_item_name
		FROM service_requests sr
		INNER JOIN approval_tasks at ON at.request_id = sr.id
		LEFT JOIN service_catalog_items ci ON ci.id = sr.catalog_item_id
		WHERE sr.tenant_id = $1
			AND at.approver_id = $2
			AND at.status = 'pending'
			AND sr.status = 'pending_approval'
		ORDER BY sr.id, sr.created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, auth.UserID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list pending approvals", err)
	}
	defer rows.Close()

	var requests []ServiceRequest
	for rows.Next() {
		var sr ServiceRequest
		if err := rows.Scan(
			&sr.ID, &sr.TenantID, &sr.RequestNumber, &sr.CatalogItemID, &sr.RequesterID,
			&sr.Status, &sr.FormData, &sr.AssignedTo, &sr.Priority, &sr.TicketID,
			&sr.RejectionReason, &sr.FulfillmentNotes, &sr.FulfilledAt, &sr.CancelledAt,
			&sr.CreatedAt, &sr.UpdatedAt,
			&sr.SLAPolicyID, &sr.SLAResolutionTarget, &sr.SLAResolutionMet,
			&sr.SLAFulfillmentTarget, &sr.SLAFulfillmentMet,
			&sr.SLAPausedAt, &sr.SLAPausedDurationMinutes,
			&sr.CatalogItemName,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan pending approval", err)
		}
		requests = append(requests, sr)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate pending approvals", err)
	}

	if requests == nil {
		requests = []ServiceRequest{}
	}

	return requests, total, nil
}

// ──────────────────────────────────────────────
// ApproveRequest
// ──────────────────────────────────────────────

// ApproveRequest marks the current user's pending approval task as approved.
// For sequential chains, it checks whether all tasks at the current sequence
// are done and activates the next sequence. If all approval tasks are approved,
// the request transitions to "approved" status.
func (s *RequestService) ApproveRequest(ctx context.Context, requestID uuid.UUID, req ApproveRequestRequest) (ServiceRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ServiceRequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Verify the request exists and is pending approval; also look up the catalog item's approval_mode.
	var currentStatus string
	var tenantID uuid.UUID
	var reqApprovalMode string
	err = tx.QueryRow(ctx,
		`SELECT sr.tenant_id, sr.status, COALESCE(ci.approval_mode, 'sequential')
		 FROM service_requests sr
		 JOIN service_catalog_items ci ON ci.id = sr.catalog_item_id
		 WHERE sr.id = $1 AND sr.tenant_id = $2
		 FOR UPDATE OF sr`,
		requestID, auth.TenantID,
	).Scan(&tenantID, &currentStatus, &reqApprovalMode)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequest{}, apperrors.NotFound("ServiceRequest", requestID.String())
		}
		return ServiceRequest{}, apperrors.Internal("failed to lock service request", err)
	}
	if currentStatus != RequestStatusPendingApproval {
		return ServiceRequest{}, apperrors.Validation("status", fmt.Sprintf("request is not pending approval (current: %s)", currentStatus))
	}

	// Find the user's pending approval task for this request.
	var taskID uuid.UUID
	var sequenceOrder int
	err = tx.QueryRow(ctx,
		`SELECT id, sequence_order FROM approval_tasks
		 WHERE request_id = $1 AND approver_id = $2 AND status = 'pending' AND tenant_id = $3
		 LIMIT 1`,
		requestID, auth.UserID, auth.TenantID,
	).Scan(&taskID, &sequenceOrder)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequest{}, apperrors.Validation("approver", "no pending approval task found for this user")
		}
		return ServiceRequest{}, apperrors.Internal("failed to find approval task", err)
	}

	// For sequential mode, ensure all tasks with a lower sequence_order are already approved.
	if reqApprovalMode == "sequential" {
		var blockedCount int
		err = tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM approval_tasks
			 WHERE request_id = $1 AND sequence_order < $2 AND status NOT IN ('approved', 'skipped')`,
			requestID, sequenceOrder,
		).Scan(&blockedCount)
		if err != nil {
			return ServiceRequest{}, apperrors.Internal("failed to check sequential order", err)
		}
		if blockedCount > 0 {
			return ServiceRequest{}, apperrors.Validation("sequence", "earlier approval steps must be completed first")
		}
	}

	// Mark the task as approved.
	now := time.Now().UTC()
	_, err = tx.Exec(ctx,
		`UPDATE approval_tasks SET status = $1, decision_at = $2, comment = $3 WHERE id = $4`,
		ApprovalTaskStatusApproved, now, req.Comment, taskID,
	)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to update approval task", err)
	}

	// Check if all approval tasks are now approved.
	var pendingCount int
	err = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM approval_tasks WHERE request_id = $1 AND status = 'pending'`,
		requestID,
	).Scan(&pendingCount)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to count pending approvals", err)
	}

	// If all tasks are approved, transition request to "approved".
	if pendingCount == 0 {
		// Mark SLA resolution (approval phase) as met and resume the SLA clock.
		_, err = tx.Exec(ctx,
			`UPDATE service_requests
			 SET status = $1, updated_at = $2,
			     sla_resolution_met = CASE WHEN sla_resolution_target IS NOT NULL
			         THEN ($2 <= sla_resolution_target) ELSE sla_resolution_met END,
			     sla_paused_duration_minutes = sla_paused_duration_minutes +
			         COALESCE(EXTRACT(EPOCH FROM ($2::timestamptz - sla_paused_at))::int / 60, 0),
			     sla_paused_at = NULL
			 WHERE id = $3`,
			RequestStatusApproved, now, requestID,
		)
		if err != nil {
			return ServiceRequest{}, apperrors.Internal("failed to update request status", err)
		}
	}

	// Add timeline entry.
	desc := "Approval task approved"
	if req.Comment != nil && *req.Comment != "" {
		desc = fmt.Sprintf("Approval task approved: %s", *req.Comment)
	}
	if err := s.addTimelineEntry(ctx, tx, requestID, auth.UserID, "approved", &desc, nil); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to add timeline entry", err)
	}

	if pendingCount == 0 {
		allApprovedDesc := "All approvals completed — request approved"
		if err := s.addTimelineEntry(ctx, tx, requestID, auth.UserID, "all_approved", &allApprovedDesc, nil); err != nil {
			return ServiceRequest{}, apperrors.Internal("failed to add timeline entry", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"task_id":  taskID,
		"decision": "approved",
		"comment":  req.Comment,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "approve:service_request",
		EntityType: "service_request",
		EntityID:   requestID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Return the updated request.
	return s.getRequestByID(ctx, requestID, auth.TenantID)
}

// ──────────────────────────────────────────────
// RejectRequest
// ──────────────────────────────────────────────

// RejectRequest marks the current user's pending approval task as rejected,
// transitions the request to "rejected" status, and skips all remaining
// approval tasks.
func (s *RequestService) RejectRequest(ctx context.Context, requestID uuid.UUID, req RejectRequestRequest) (ServiceRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ServiceRequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Verify the request exists and is pending approval.
	var currentStatus string
	err = tx.QueryRow(ctx,
		`SELECT status FROM service_requests WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
		requestID, auth.TenantID,
	).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequest{}, apperrors.NotFound("ServiceRequest", requestID.String())
		}
		return ServiceRequest{}, apperrors.Internal("failed to lock service request", err)
	}
	if currentStatus != RequestStatusPendingApproval {
		return ServiceRequest{}, apperrors.Validation("status", fmt.Sprintf("request is not pending approval (current: %s)", currentStatus))
	}

	// Find the user's pending approval task.
	var taskID uuid.UUID
	err = tx.QueryRow(ctx,
		`SELECT id FROM approval_tasks
		 WHERE request_id = $1 AND approver_id = $2 AND status = 'pending' AND tenant_id = $3
		 LIMIT 1`,
		requestID, auth.UserID, auth.TenantID,
	).Scan(&taskID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequest{}, apperrors.Validation("approver", "no pending approval task found for this user")
		}
		return ServiceRequest{}, apperrors.Internal("failed to find approval task", err)
	}

	now := time.Now().UTC()

	// Mark the task as rejected.
	_, err = tx.Exec(ctx,
		`UPDATE approval_tasks SET status = $1, decision_at = $2, comment = $3 WHERE id = $4`,
		ApprovalTaskStatusRejected, now, &req.Reason, taskID,
	)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to update approval task", err)
	}

	// Skip all remaining pending approval tasks.
	_, err = tx.Exec(ctx,
		`UPDATE approval_tasks SET status = $1 WHERE request_id = $2 AND status = 'pending'`,
		ApprovalTaskStatusSkipped, requestID,
	)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to skip remaining approval tasks", err)
	}

	// Transition request to rejected; mark SLA resolution as met/breached and clear pause.
	_, err = tx.Exec(ctx,
		`UPDATE service_requests
		 SET status = $1, rejection_reason = $2, updated_at = $3,
		     sla_resolution_met = CASE WHEN sla_resolution_target IS NOT NULL
		         THEN ($3 <= sla_resolution_target) ELSE sla_resolution_met END,
		     sla_fulfillment_met = CASE WHEN sla_fulfillment_target IS NOT NULL
		         THEN true ELSE sla_fulfillment_met END,
		     sla_paused_at = NULL
		 WHERE id = $4`,
		RequestStatusRejected, req.Reason, now, requestID,
	)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to reject service request", err)
	}

	// Add timeline entry.
	desc := fmt.Sprintf("Request rejected: %s", req.Reason)
	if err := s.addTimelineEntry(ctx, tx, requestID, auth.UserID, "rejected", &desc, nil); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to add timeline entry", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"task_id":  taskID,
		"decision": "rejected",
		"reason":   req.Reason,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "reject:service_request",
		EntityType: "service_request",
		EntityID:   requestID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Return the updated request.
	return s.getRequestByID(ctx, requestID, auth.TenantID)
}

// ──────────────────────────────────────────────
// CancelRequest
// ──────────────────────────────────────────────

// CancelRequest allows the original requester to cancel their service request.
func (s *RequestService) CancelRequest(ctx context.Context, requestID uuid.UUID) (ServiceRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ServiceRequest{}, apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Verify the request exists and belongs to the current user.
	var currentStatus string
	var requesterID uuid.UUID
	err = tx.QueryRow(ctx,
		`SELECT status, requester_id FROM service_requests WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
		requestID, auth.TenantID,
	).Scan(&currentStatus, &requesterID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequest{}, apperrors.NotFound("ServiceRequest", requestID.String())
		}
		return ServiceRequest{}, apperrors.Internal("failed to lock service request", err)
	}

	if requesterID != auth.UserID {
		return ServiceRequest{}, apperrors.Unauthorized("only the requester can cancel this request")
	}

	if currentStatus == RequestStatusFulfilled || currentStatus == RequestStatusCancelled {
		return ServiceRequest{}, apperrors.Validation("status", fmt.Sprintf("cannot cancel a request that is %s", currentStatus))
	}

	now := time.Now().UTC()

	// Transition request to cancelled; mark SLA as N/A and clear pause.
	_, err = tx.Exec(ctx,
		`UPDATE service_requests
		 SET status = $1, cancelled_at = $2, updated_at = $3,
		     sla_paused_at = NULL
		 WHERE id = $4`,
		RequestStatusCancelled, now, now, requestID,
	)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to cancel service request", err)
	}

	// Skip any remaining pending approval tasks.
	_, err = tx.Exec(ctx,
		`UPDATE approval_tasks SET status = $1 WHERE request_id = $2 AND status = 'pending'`,
		ApprovalTaskStatusSkipped, requestID,
	)
	if err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to skip approval tasks", err)
	}

	// Add timeline entry.
	desc := "Request cancelled by requester"
	if err := s.addTimelineEntry(ctx, tx, requestID, auth.UserID, "cancelled", &desc, nil); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to add timeline entry", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return ServiceRequest{}, apperrors.Internal("failed to commit transaction", err)
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "cancel:service_request",
		EntityType: "service_request",
		EntityID:   requestID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Return the updated request.
	return s.getRequestByID(ctx, requestID, auth.TenantID)
}

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

// getRequestByID fetches a single service request by ID (used after mutations).
func (s *RequestService) getRequestByID(ctx context.Context, id, tenantID uuid.UUID) (ServiceRequest, error) {
	query := `
		SELECT sr.id, sr.tenant_id, sr.request_number, sr.catalog_item_id, sr.requester_id,
			sr.status, sr.form_data, sr.assigned_to, sr.priority, sr.ticket_id,
			sr.rejection_reason, sr.fulfillment_notes, sr.fulfilled_at, sr.cancelled_at,
			sr.created_at, sr.updated_at,
			sr.sla_policy_id, sr.sla_resolution_target, sr.sla_resolution_met,
			sr.sla_fulfillment_target, sr.sla_fulfillment_met,
			sr.sla_paused_at, sr.sla_paused_duration_minutes,
			ci.name AS catalog_item_name
		FROM service_requests sr
		LEFT JOIN service_catalog_items ci ON ci.id = sr.catalog_item_id
		WHERE sr.id = $1 AND sr.tenant_id = $2`

	var sr ServiceRequest
	err := s.pool.QueryRow(ctx, query, id, tenantID).Scan(
		&sr.ID, &sr.TenantID, &sr.RequestNumber, &sr.CatalogItemID, &sr.RequesterID,
		&sr.Status, &sr.FormData, &sr.AssignedTo, &sr.Priority, &sr.TicketID,
		&sr.RejectionReason, &sr.FulfillmentNotes, &sr.FulfilledAt, &sr.CancelledAt,
		&sr.CreatedAt, &sr.UpdatedAt,
		&sr.SLAPolicyID, &sr.SLAResolutionTarget, &sr.SLAResolutionMet,
		&sr.SLAFulfillmentTarget, &sr.SLAFulfillmentMet,
		&sr.SLAPausedAt, &sr.SLAPausedDurationMinutes,
		&sr.CatalogItemName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ServiceRequest{}, apperrors.NotFound("ServiceRequest", id.String())
		}
		return ServiceRequest{}, apperrors.Internal("failed to get service request", err)
	}

	return sr, nil
}
