package cmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type AssetProcessService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	js       nats.JetStreamContext
}

func NewAssetProcessService(pool *pgxpool.Pool, auditSvc *audit.AuditService, js nats.JetStreamContext) *AssetProcessService {
	return &AssetProcessService{pool: pool, auditSvc: auditSvc, js: js}
}

func (s *AssetProcessService) ListRuns(ctx context.Context, processType, status *string, limit, offset int) ([]AssetProcessRun, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}
	var total int64
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM asset_process_runs
		WHERE tenant_id = $1
		  AND ($2::text IS NULL OR process_type = $2)
		  AND ($3::text IS NULL OR status = $3)`,
		auth.TenantID, processType, status,
	).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count asset process runs", err)
	}
	rows, err := s.pool.Query(ctx, selectAssetProcessSQL()+`
		WHERE apr.tenant_id = $1
		  AND ($2::text IS NULL OR apr.process_type = $2)
		  AND ($3::text IS NULL OR apr.status = $3)
		ORDER BY apr.updated_at DESC
		LIMIT $4 OFFSET $5`,
		auth.TenantID, processType, status, limit, offset,
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list asset process runs", err)
	}
	defer rows.Close()
	runs := []AssetProcessRun{}
	for rows.Next() {
		run, err := scanAssetProcessRun(rows)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to scan asset process run", err)
		}
		runs = append(runs, run)
	}
	return runs, total, nil
}

func (s *AssetProcessService) GetRun(ctx context.Context, id uuid.UUID) (*AssetProcessRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	run, err := scanAssetProcessRun(s.pool.QueryRow(ctx, selectAssetProcessSQL()+` WHERE apr.id = $1 AND apr.tenant_id = $2`, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("asset_process_run", id.String())
		}
		return nil, apperrors.Internal("failed to get asset process run", err)
	}
	return &run, nil
}

func (s *AssetProcessService) CreateRun(ctx context.Context, req CreateAssetProcessRunRequest) (*AssetProcessRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	if err := ensureAssetProcessResponsibility(auth, "create asset process run"); err != nil {
		return nil, err
	}
	if strings.TrimSpace(req.Title) == "" {
		return nil, apperrors.Validation("title", "title is required")
	}
	if req.ProcessType == "" {
		req.ProcessType = AssetProcessTypeDeployment
	}
	if !validAssetProcessType(req.ProcessType) {
		return nil, apperrors.Validation("processType", "invalid asset process type")
	}
	sourceType := req.SourceType
	if sourceType == "" {
		sourceType = "manual"
	}
	status := initialAssetProcessStatus(req.ProcessType)
	approvalRequired := false
	if req.ApprovalRequired != nil {
		approvalRequired = *req.ApprovalRequired
	}
	if approvalRequired && req.ProcessType == AssetProcessTypeDeployment {
		status = workflow.AssetProcessApprovalReview
	}
	details := defaultAssetProcessJSON(req.Details, `{}`)
	evidence := defaultAssetProcessJSON(req.Evidence, `{}`)

	run, err := scanAssetProcessRunBasic(s.pool.QueryRow(ctx, `
		INSERT INTO asset_process_runs (
			tenant_id, process_type, title, description, source_type, source_id, ticket_id,
			service_request_id, asset_id, assigned_asset_id, stop_gap_asset_id, requested_for_id,
			status, approval_required, requester_status, responsible_user_id, accountable_user_id,
			details, evidence, created_by
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
		RETURNING `+assetProcessBasicColumns,
		auth.TenantID, req.ProcessType, req.Title, req.Description, sourceType, req.SourceID, req.TicketID,
		req.ServiceRequestID, req.AssetID, req.AssignedAssetID, req.StopGapAssetID, req.RequestedForID,
		status, approvalRequired, req.RequesterStatus, req.ResponsibleUserID, req.AccountableUserID,
		details, evidence, auth.UserID,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to create asset process run", err)
	}
	if err := s.insertEvent(ctx, nil, run.ID, nil, run.Status, "created", auth.UserID, nil, nil, evidence); err != nil {
		slog.ErrorContext(ctx, "failed to insert asset process creation event", "error", err)
	}
	s.logAudit(ctx, auth, "create:asset_process", run.ID, map[string]any{
		"processNumber": run.ProcessNumber,
		"processType":   run.ProcessType,
		"status":        run.Status,
	})
	s.publishEvent("notify.cmdb.asset_process.created", run.ID, auth, map[string]any{
		"processNumber": run.ProcessNumber,
		"title":         run.Title,
		"processType":   run.ProcessType,
		"status":        run.Status,
		"actionUrl":     fmt.Sprintf("/dashboard/cmdb/asset-process/%s", run.ID),
	})
	return &run, nil
}

func (s *AssetProcessService) UpdateRun(ctx context.Context, id uuid.UUID, req UpdateAssetProcessRunRequest) (*AssetProcessRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	if err := ensureAssetProcessResponsibility(auth, "update asset process run"); err != nil {
		return nil, err
	}
	run, err := scanAssetProcessRunBasic(s.pool.QueryRow(ctx, `
		UPDATE asset_process_runs SET
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			source_type = COALESCE($5, source_type),
			source_id = COALESCE($6, source_id),
			ticket_id = COALESCE($7, ticket_id),
			service_request_id = COALESCE($8, service_request_id),
			asset_id = COALESCE($9, asset_id),
			assigned_asset_id = COALESCE($10, assigned_asset_id),
			stop_gap_asset_id = COALESCE($11, stop_gap_asset_id),
			requested_for_id = COALESCE($12, requested_for_id),
			approval_required = COALESCE($13, approval_required),
			approval_status = COALESCE($14, approval_status),
			availability_status = COALESCE($15, availability_status),
			requester_status = COALESCE($16, requester_status),
			replacement_eligible = COALESCE($17, replacement_eligible),
			buyback_option = COALESCE($18, buyback_option),
			buyback_approved = COALESCE($19, buyback_approved),
			exit_reason = COALESCE($20, exit_reason),
			warranty_status = COALESCE($21, warranty_status),
			data_wipe_confirmed = COALESCE($22, data_wipe_confirmed),
			delivery_signed = COALESCE($23, delivery_signed),
			return_signed = COALESCE($24, return_signed),
			responsible_user_id = COALESCE($25, responsible_user_id),
			accountable_user_id = COALESCE($26, accountable_user_id),
			details = COALESCE($27, details),
			evidence = COALESCE($28, evidence),
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING `+assetProcessBasicColumns,
		id, auth.TenantID, req.Title, req.Description, req.SourceType, req.SourceID, req.TicketID,
		req.ServiceRequestID, req.AssetID, req.AssignedAssetID, req.StopGapAssetID, req.RequestedForID,
		req.ApprovalRequired, req.ApprovalStatus, req.AvailabilityStatus, req.RequesterStatus,
		req.ReplacementEligible, req.BuybackOption, req.BuybackApproved, req.ExitReason, req.WarrantyStatus,
		req.DataWipeConfirmed, req.DeliverySigned, req.ReturnSigned, req.ResponsibleUserID,
		req.AccountableUserID, nullableAssetProcessJSON(req.Details), nullableAssetProcessJSON(req.Evidence),
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("asset_process_run", id.String())
		}
		return nil, apperrors.Internal("failed to update asset process run", err)
	}
	s.logAudit(ctx, auth, "update:asset_process", id, map[string]any{"updated": true})
	return &run, nil
}

func (s *AssetProcessService) TransitionRun(ctx context.Context, id uuid.UUID, req TransitionAssetProcessRunRequest) (*AssetProcessRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	if req.TargetStatus == "" {
		return nil, apperrors.Validation("targetStatus", "targetStatus is required")
	}
	if err := ensureAssetProcessTransitionResponsibility(auth, req.TargetStatus); err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal("failed to begin asset process transition", err)
	}
	defer tx.Rollback(ctx)

	current, err := scanAssetProcessRunBasic(tx.QueryRow(ctx, `SELECT `+assetProcessBasicColumns+` FROM asset_process_runs WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("asset_process_run", id.String())
		}
		return nil, apperrors.Internal("failed to load asset process run", err)
	}
	if err := workflow.AssetProcessStateMachine.Validate(current.Status, req.TargetStatus); err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}
	if err := validateAssetProcessTransition(current, req); err != nil {
		return nil, err
	}

	updated, err := scanAssetProcessRunBasic(tx.QueryRow(ctx, `
		UPDATE asset_process_runs SET
			status = $3,
			asset_id = COALESCE($4, asset_id),
			assigned_asset_id = COALESCE($5, assigned_asset_id),
			stop_gap_asset_id = COALESCE($6, stop_gap_asset_id),
			responsible_user_id = COALESCE($7, responsible_user_id),
			accountable_user_id = COALESCE($8, accountable_user_id),
			approval_status = COALESCE($9, approval_status),
			availability_status = COALESCE($10, availability_status),
			requester_status = COALESCE($11, requester_status),
			replacement_eligible = COALESCE($12, replacement_eligible),
			buyback_option = COALESCE($13, buyback_option),
			buyback_approved = COALESCE($14, buyback_approved),
			exit_reason = COALESCE($15, exit_reason),
			warranty_status = COALESCE($16, warranty_status),
			data_wipe_confirmed = COALESCE($17, data_wipe_confirmed),
			delivery_signed = COALESCE($18, delivery_signed),
			return_signed = COALESCE($19, return_signed),
			details = COALESCE($20, details),
			evidence = COALESCE($21, evidence),
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING `+assetProcessBasicColumns,
		id, auth.TenantID, req.TargetStatus, req.AssetID, req.AssignedAssetID, req.StopGapAssetID,
		req.ResponsibleUserID, req.AccountableUserID, req.ApprovalStatus, req.AvailabilityStatus,
		req.RequesterStatus, req.ReplacementEligible, req.BuybackOption, req.BuybackApproved,
		req.ExitReason, req.WarrantyStatus, req.DataWipeConfirmed, req.DeliverySigned, req.ReturnSigned,
		nullableAssetProcessJSON(req.Details), nullableAssetProcessJSON(req.Evidence),
	))
	if err != nil {
		return nil, apperrors.Internal("failed to transition asset process run", err)
	}
	if err := s.insertEvent(ctx, tx, id, &current.Status, req.TargetStatus, "transition", auth.UserID, req.Comment, req.Decision, defaultAssetProcessJSON(req.Evidence, `{}`)); err != nil {
		return nil, err
	}
	if err := s.applyAssetProcessSideEffects(ctx, tx, updated, auth.UserID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal("failed to commit asset process transition", err)
	}

	s.logAudit(ctx, auth, "transition:asset_process", id, map[string]any{
		"status":   map[string]string{"from": current.Status, "to": req.TargetStatus},
		"comment":  req.Comment,
		"decision": req.Decision,
	})
	s.publishEvent("notify.cmdb.asset_process.transitioned", id, auth, map[string]any{
		"processNumber": updated.ProcessNumber,
		"title":         updated.Title,
		"processType":   updated.ProcessType,
		"fromStatus":    current.Status,
		"toStatus":      req.TargetStatus,
		"comment":       req.Comment,
		"actionUrl":     fmt.Sprintf("/dashboard/cmdb/asset-process/%s", id),
	})
	return &updated, nil
}

func (s *AssetProcessService) ListEvents(ctx context.Context, processID uuid.UUID) ([]AssetProcessEvent, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	rows, err := s.pool.Query(ctx, `
		SELECT e.id, e.tenant_id, e.process_id, e.from_status, e.to_status, e.action,
		       e.actor_id, e.comment, e.decision, e.evidence, e.created_at, u.display_name
		FROM asset_process_events e
		LEFT JOIN users u ON u.id = e.actor_id
		WHERE e.process_id = $1 AND e.tenant_id = $2
		ORDER BY e.created_at DESC`,
		processID, auth.TenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list asset process events", err)
	}
	defer rows.Close()
	events := []AssetProcessEvent{}
	for rows.Next() {
		var event AssetProcessEvent
		if err := rows.Scan(
			&event.ID, &event.TenantID, &event.ProcessID, &event.FromStatus, &event.ToStatus,
			&event.Action, &event.ActorID, &event.Comment, &event.Decision, &event.Evidence,
			&event.CreatedAt, &event.ActorName,
		); err != nil {
			return nil, apperrors.Internal("failed to scan asset process event", err)
		}
		events = append(events, event)
	}
	return events, nil
}

func (s *AssetProcessService) GetStats(ctx context.Context) (*AssetProcessStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	rows, err := s.pool.Query(ctx, `SELECT process_type, status, COUNT(*) FROM asset_process_runs WHERE tenant_id = $1 GROUP BY process_type, status`, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get asset process stats", err)
	}
	defer rows.Close()
	stats := &AssetProcessStats{
		ByStatus: map[string]int{},
		ByType:   map[string]int{},
	}
	for rows.Next() {
		var processType, status string
		var count int
		if err := rows.Scan(&processType, &status, &count); err != nil {
			return nil, apperrors.Internal("failed to scan asset process stats", err)
		}
		stats.Total += count
		stats.ByStatus[status] += count
		stats.ByType[processType] += count
		if status == workflow.AssetProcessClosed {
			stats.Closed += count
		} else if status != workflow.AssetProcessRejected && status != workflow.AssetProcessCancelled {
			stats.Open += count
		}
		if status == workflow.AssetProcessWaitingList {
			stats.WaitingList += count
		}
		switch processType {
		case AssetProcessTypeDeployment:
			stats.Deployment += count
		case AssetProcessTypeRedeployment:
			stats.Redeployment += count
		case AssetProcessTypeMaintenance:
			stats.Maintenance += count
		case AssetProcessTypeRetirementDisposal:
			stats.RetirementDisposal += count
		}
	}
	return stats, nil
}

func (s *AssetProcessService) applyAssetProcessSideEffects(ctx context.Context, tx pgx.Tx, run AssetProcessRun, actorID uuid.UUID) error {
	assetID := run.AssetID
	if assetID == nil {
		assetID = run.AssignedAssetID
	}
	switch run.Status {
	case workflow.AssetProcessConfiguration:
		if assetID != nil {
			if err := s.transitionAssetIfPossible(ctx, tx, *assetID, run.TenantID, AssetStatusReceived); err != nil {
				return err
			}
		}
	case workflow.AssetProcessIssuedToUser:
		if assetID != nil {
			_, err := tx.Exec(ctx, `
				UPDATE assets
				SET status = 'active',
				    owner_id = COALESCE($3, owner_id),
				    custodian_id = COALESCE($3, custodian_id),
				    updated_at = now()
				WHERE id = $1 AND tenant_id = $2 AND status <> 'disposed'`,
				*assetID, run.TenantID, run.RequestedForID,
			)
			if err != nil {
				return apperrors.Internal("failed to assign asset to user", err)
			}
			if err := s.insertAssetLifecycleEvent(ctx, tx, run.TenantID, *assetID, LifecycleEventDeployed, actorID, map[string]any{
				"assetProcessId": run.ID,
				"requestedForId": run.RequestedForID,
				"deliverySigned": run.DeliverySigned,
			}); err != nil {
				return err
			}
		}
	case workflow.AssetProcessMaintenanceIntake, workflow.AssetProcessWarrantyCheck:
		if assetID != nil {
			if err := s.transitionAssetIfPossible(ctx, tx, *assetID, run.TenantID, AssetStatusMaintenance); err != nil {
				return err
			}
			return s.insertAssetLifecycleEvent(ctx, tx, run.TenantID, *assetID, LifecycleEventMaintenanceStart, actorID, map[string]any{"assetProcessId": run.ID})
		}
	case workflow.AssetProcessMaintenanceSignoff, workflow.AssetProcessStopGapReturned:
		if assetID != nil {
			if err := s.transitionAssetIfPossible(ctx, tx, *assetID, run.TenantID, AssetStatusActive); err != nil {
				return err
			}
			return s.insertAssetLifecycleEvent(ctx, tx, run.TenantID, *assetID, LifecycleEventMaintenanceEnd, actorID, map[string]any{"assetProcessId": run.ID})
		}
	case workflow.AssetProcessOldAssetReturn, workflow.AssetProcessDataWipe, workflow.AssetProcessObsoleteIdentified:
		if assetID != nil {
			if err := s.transitionAssetIfPossible(ctx, tx, *assetID, run.TenantID, AssetStatusRetired); err != nil {
				return err
			}
			return s.insertAssetLifecycleEvent(ctx, tx, run.TenantID, *assetID, LifecycleEventRetired, actorID, map[string]any{
				"assetProcessId":    run.ID,
				"dataWipeConfirmed": run.DataWipeConfirmed,
			})
		}
	case workflow.AssetProcessClosed:
		if run.ProcessType == AssetProcessTypeRetirementDisposal && assetID != nil && run.DataWipeConfirmed {
			if err := s.transitionAssetIfPossible(ctx, tx, *assetID, run.TenantID, AssetStatusDisposed); err != nil {
				return err
			}
			return s.insertAssetLifecycleEvent(ctx, tx, run.TenantID, *assetID, LifecycleEventDisposed, actorID, map[string]any{"assetProcessId": run.ID})
		}
	}
	return nil
}

func (s *AssetProcessService) transitionAssetIfPossible(ctx context.Context, tx pgx.Tx, assetID, tenantID uuid.UUID, targetStatus string) error {
	var current string
	if err := tx.QueryRow(ctx, `SELECT status FROM assets WHERE id = $1 AND tenant_id = $2`, assetID, tenantID).Scan(&current); err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("asset", assetID.String())
		}
		return apperrors.Internal("failed to load asset status", err)
	}
	if current == targetStatus || current == AssetStatusDisposed {
		return nil
	}
	if !IsValidAssetTransition(current, targetStatus) {
		return nil
	}
	if _, err := tx.Exec(ctx, `UPDATE assets SET status = $3, updated_at = now() WHERE id = $1 AND tenant_id = $2`, assetID, tenantID, targetStatus); err != nil {
		return apperrors.Internal("failed to update asset lifecycle status", err)
	}
	return nil
}

func (s *AssetProcessService) insertAssetLifecycleEvent(ctx context.Context, tx pgx.Tx, tenantID, assetID uuid.UUID, eventType string, actorID uuid.UUID, details map[string]any) error {
	raw, _ := json.Marshal(details)
	_, err := tx.Exec(ctx, `
		INSERT INTO asset_lifecycle_events (id, asset_id, tenant_id, event_type, performed_by, details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())`,
		uuid.New(), assetID, tenantID, eventType, actorID, raw,
	)
	if err != nil {
		return apperrors.Internal("failed to record asset lifecycle event", err)
	}
	return nil
}

func (s *AssetProcessService) insertEvent(ctx context.Context, tx pgx.Tx, processID uuid.UUID, fromStatus *string, toStatus, action string, actorID uuid.UUID, comment, decision *string, evidence json.RawMessage) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}
	exec := func(query string, args ...any) (pgconn.CommandTag, error) {
		if tx != nil {
			return tx.Exec(ctx, query, args...)
		}
		return s.pool.Exec(ctx, query, args...)
	}
	_, err := exec(`
		INSERT INTO asset_process_events (id, tenant_id, process_id, from_status, to_status, action, actor_id, comment, decision, evidence, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())`,
		uuid.New(), auth.TenantID, processID, fromStatus, toStatus, action, actorID, comment, decision, evidence,
	)
	if err != nil {
		return apperrors.Internal("failed to record asset process event", err)
	}
	return nil
}

func validateAssetProcessTransition(current AssetProcessRun, req TransitionAssetProcessRunRequest) error {
	switch req.TargetStatus {
	case workflow.AssetProcessApprovalReview:
		if !current.ApprovalRequired {
			return apperrors.BadRequest("approval review is only required when approvalRequired is true")
		}
	case workflow.AssetProcessRejected:
		if req.Comment == nil || strings.TrimSpace(*req.Comment) == "" {
			return apperrors.Validation("comment", "comment is required when rejecting an asset request")
		}
	case workflow.AssetProcessIssueFromStore:
		if current.AssetID == nil && current.AssignedAssetID == nil && req.AssetID == nil && req.AssignedAssetID == nil {
			return apperrors.Validation("assetId", "an available asset must be selected before issuing from PSSD store")
		}
	case workflow.AssetProcessIssuedToUser:
		if !current.DeliverySigned && (req.DeliverySigned == nil || !*req.DeliverySigned) {
			return apperrors.Validation("deliverySigned", "delivery form sign-off is required before asset issuance")
		}
	case workflow.AssetProcessBuybackApproval:
		if !(boolValue(current.BuybackOption) || boolValue(req.BuybackOption)) {
			return apperrors.BadRequest("buyback approval only applies to replacement assets with buy-back option")
		}
	case workflow.AssetProcessDataWipe:
		if !current.DataWipeConfirmed && (req.DataWipeConfirmed == nil || !*req.DataWipeConfirmed) {
			return apperrors.Validation("dataWipeConfirmed", "data wipe confirmation is required")
		}
	case workflow.AssetProcessMaintenanceSignoff, workflow.AssetProcessStopGapReturned, workflow.AssetProcessOldAssetReturn:
		if !current.ReturnSigned && (req.ReturnSigned == nil || !*req.ReturnSigned) {
			return apperrors.Validation("returnSigned", "return or job completion sign-off is required")
		}
	}
	return nil
}

const assetProcessBasicColumns = `
	id, tenant_id, process_number, process_type, title, description, source_type, source_id,
	ticket_id, service_request_id, asset_id, assigned_asset_id, stop_gap_asset_id, requested_for_id,
	status, approval_required, approval_status, availability_status, requester_status,
	replacement_eligible, buyback_option, buyback_approved, exit_reason, warranty_status,
	data_wipe_confirmed, delivery_signed, return_signed, responsible_user_id, accountable_user_id,
	details, evidence, created_by, created_at, updated_at`

func selectAssetProcessSQL() string {
	return `
		SELECT apr.id, apr.tenant_id, apr.process_number, apr.process_type, apr.title, apr.description,
		       apr.source_type, apr.source_id, apr.ticket_id, apr.service_request_id, apr.asset_id,
		       apr.assigned_asset_id, apr.stop_gap_asset_id, apr.requested_for_id, apr.status,
		       apr.approval_required, apr.approval_status, apr.availability_status, apr.requester_status,
		       apr.replacement_eligible, apr.buyback_option, apr.buyback_approved, apr.exit_reason,
		       apr.warranty_status, apr.data_wipe_confirmed, apr.delivery_signed, apr.return_signed,
		       apr.responsible_user_id, apr.accountable_user_id, apr.details, apr.evidence,
		       apr.created_by, apr.created_at, apr.updated_at,
		       a.asset_tag, a.name, aa.asset_tag, sg.asset_tag, rf.display_name,
		       ru.display_name, au.display_name, cb.display_name, t.ticket_number, sr.request_number
		FROM asset_process_runs apr
		LEFT JOIN assets a ON a.id = apr.asset_id
		LEFT JOIN assets aa ON aa.id = apr.assigned_asset_id
		LEFT JOIN assets sg ON sg.id = apr.stop_gap_asset_id
		LEFT JOIN users rf ON rf.id = apr.requested_for_id
		LEFT JOIN users ru ON ru.id = apr.responsible_user_id
		LEFT JOIN users au ON au.id = apr.accountable_user_id
		LEFT JOIN users cb ON cb.id = apr.created_by
		LEFT JOIN tickets t ON t.id = apr.ticket_id
		LEFT JOIN service_requests sr ON sr.id = apr.service_request_id`
}

func scanAssetProcessRun(row pgx.Row) (AssetProcessRun, error) {
	run, err := scanAssetProcessRunBase(row, true)
	return run, err
}

func scanAssetProcessRunBasic(row pgx.Row) (AssetProcessRun, error) {
	run, err := scanAssetProcessRunBase(row, false)
	return run, err
}

func scanAssetProcessRunBase(row pgx.Row, enriched bool) (AssetProcessRun, error) {
	var run AssetProcessRun
	dest := []any{
		&run.ID, &run.TenantID, &run.ProcessNumber, &run.ProcessType, &run.Title, &run.Description,
		&run.SourceType, &run.SourceID, &run.TicketID, &run.ServiceRequestID, &run.AssetID,
		&run.AssignedAssetID, &run.StopGapAssetID, &run.RequestedForID, &run.Status,
		&run.ApprovalRequired, &run.ApprovalStatus, &run.AvailabilityStatus, &run.RequesterStatus,
		&run.ReplacementEligible, &run.BuybackOption, &run.BuybackApproved, &run.ExitReason,
		&run.WarrantyStatus, &run.DataWipeConfirmed, &run.DeliverySigned, &run.ReturnSigned,
		&run.ResponsibleUserID, &run.AccountableUserID, &run.Details, &run.Evidence,
		&run.CreatedBy, &run.CreatedAt, &run.UpdatedAt,
	}
	if enriched {
		dest = append(dest,
			&run.AssetTag, &run.AssetName, &run.AssignedAssetTag, &run.StopGapAssetTag,
			&run.RequestedForName, &run.ResponsibleUserName, &run.AccountableUserName,
			&run.CreatedByName, &run.TicketNumber, &run.RequestNumber,
		)
	}
	err := row.Scan(dest...)
	return run, err
}

func initialAssetProcessStatus(processType string) string {
	switch processType {
	case AssetProcessTypeRedeployment:
		return workflow.AssetProcessRedeploymentIntake
	case AssetProcessTypeMaintenance:
		return workflow.AssetProcessMaintenanceIntake
	case AssetProcessTypeRetirementDisposal:
		return workflow.AssetProcessObsoleteIdentified
	case AssetProcessTypeManagementReport:
		return workflow.AssetProcessManagementReported
	default:
		return workflow.AssetProcessRequestReceived
	}
}

func validAssetProcessType(processType string) bool {
	switch processType {
	case AssetProcessTypeDeployment, AssetProcessTypeRedeployment, AssetProcessTypeMaintenance, AssetProcessTypeRetirementDisposal, AssetProcessTypeManagementReport:
		return true
	default:
		return false
	}
}

func defaultAssetProcessJSON(value *json.RawMessage, fallback string) json.RawMessage {
	if value != nil && len(*value) > 0 {
		return *value
	}
	return json.RawMessage(fallback)
}

func nullableAssetProcessJSON(value *json.RawMessage) any {
	if value == nil || len(*value) == 0 {
		return nil
	}
	return *value
}

func boolValue(value *bool) bool {
	return value != nil && *value
}

func (s *AssetProcessService) logAudit(ctx context.Context, auth *types.AuthContext, action string, entityID uuid.UUID, data map[string]any) {
	if s.auditSvc == nil || auth == nil {
		return
	}
	changes, _ := json.Marshal(data)
	if err := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     action,
		EntityType: "asset_process",
		EntityID:   entityID,
		Changes:    changes,
	}); err != nil {
		slog.ErrorContext(ctx, "failed to log asset process audit event", "error", err)
	}
}

func (s *AssetProcessService) publishEvent(subject string, entityID uuid.UUID, auth *types.AuthContext, data map[string]any) {
	if s.js == nil || auth == nil {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"type":       strings.TrimPrefix(subject, "notify."),
		"tenantId":   auth.TenantID,
		"actorId":    auth.UserID,
		"entityType": "asset_process",
		"entityId":   entityID,
		"data":       data,
		"timestamp":  time.Now(),
	})
	if _, err := s.js.Publish(subject, payload); err != nil {
		slog.Error("failed to publish asset process event", "subject", subject, "error", err)
	}
}
