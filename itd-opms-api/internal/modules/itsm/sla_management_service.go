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

// SLAManagementService handles OLA, UC, and dependency chain operations.
type SLAManagementService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewSLAManagementService creates a new SLAManagementService.
func NewSLAManagementService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *SLAManagementService {
	return &SLAManagementService{pool: pool, auditSvc: auditSvc}
}

/* ================================================================== */
/*  OLA CRUD                                                           */
/* ================================================================== */

const olaColumns = `o.id, o.tenant_id, o.name, o.description,
	o.support_team_id, o.service_catalog_item_id, o.parent_sla_id,
	o.response_target_minutes, o.resolution_target_minutes,
	o.business_hours_calendar_id, o.escalation_contact_id,
	o.status, o.effective_from, o.effective_to, o.review_date,
	o.created_by, o.created_at, o.updated_at,
	sq.name, sp.name, u.display_name`

func scanOLA(row pgx.Row) (OperationalLevelAgreement, error) {
	var ola OperationalLevelAgreement
	err := row.Scan(
		&ola.ID, &ola.TenantID, &ola.Name, &ola.Description,
		&ola.SupportTeamID, &ola.ServiceCatalogItemID, &ola.ParentSLAID,
		&ola.ResponseTargetMinutes, &ola.ResolutionTargetMinutes,
		&ola.BusinessHoursCalendarID, &ola.EscalationContactID,
		&ola.Status, &ola.EffectiveFrom, &ola.EffectiveTo, &ola.ReviewDate,
		&ola.CreatedBy, &ola.CreatedAt, &ola.UpdatedAt,
		&ola.SupportTeamName, &ola.ParentSLAName, &ola.EscalationContactName,
	)
	return ola, err
}

func (s *SLAManagementService) CreateOLA(ctx context.Context, req CreateOLARequest) (OperationalLevelAgreement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return OperationalLevelAgreement{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()
	status := "draft"
	if req.Status != nil {
		status = *req.Status
	}

	query := `
		INSERT INTO operational_level_agreements (
			id, tenant_id, name, description,
			support_team_id, service_catalog_item_id, parent_sla_id,
			response_target_minutes, resolution_target_minutes,
			business_hours_calendar_id, escalation_contact_id,
			status, effective_from, effective_to, review_date,
			created_by, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id`

	_, err := s.pool.Exec(ctx, query,
		id, auth.TenantID, req.Name, req.Description,
		req.SupportTeamID, req.ServiceCatalogItemID, req.ParentSLAID,
		req.ResponseTargetMinutes, req.ResolutionTargetMinutes,
		req.BusinessHoursCalendarID, req.EscalationContactID,
		status, req.EffectiveFrom, req.EffectiveTo, req.ReviewDate,
		auth.UserID, now, now,
	)
	if err != nil {
		return OperationalLevelAgreement{}, apperrors.Internal("failed to create OLA", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name, "status": status})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "create:ola", EntityType: "ola", EntityID: id, Changes: changes,
	})

	return s.GetOLA(ctx, id)
}

func (s *SLAManagementService) GetOLA(ctx context.Context, id uuid.UUID) (OperationalLevelAgreement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return OperationalLevelAgreement{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + olaColumns + `
		FROM operational_level_agreements o
		LEFT JOIN support_queues sq ON sq.id = o.support_team_id
		LEFT JOIN sla_policies sp ON sp.id = o.parent_sla_id
		LEFT JOIN users u ON u.id = o.escalation_contact_id
		WHERE o.id = $1 AND o.tenant_id = $2`

	ola, err := scanOLA(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return OperationalLevelAgreement{}, apperrors.NotFound("OLA", id.String())
		}
		return OperationalLevelAgreement{}, apperrors.Internal("failed to get OLA", err)
	}
	return ola, nil
}

func (s *SLAManagementService) ListOLAs(ctx context.Context, status string) ([]OperationalLevelAgreement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + olaColumns + `
		FROM operational_level_agreements o
		LEFT JOIN support_queues sq ON sq.id = o.support_team_id
		LEFT JOIN sla_policies sp ON sp.id = o.parent_sla_id
		LEFT JOIN users u ON u.id = o.escalation_contact_id
		WHERE o.tenant_id = $1
		  AND ($2::text IS NULL OR o.status = $2)
		ORDER BY o.created_at DESC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, nilIfEmpty(status))
	if err != nil {
		return nil, apperrors.Internal("failed to list OLAs", err)
	}
	defer rows.Close()

	var result []OperationalLevelAgreement
	for rows.Next() {
		ola, err := scanOLA(rows)
		if err != nil {
			return nil, apperrors.Internal("failed to scan OLA", err)
		}
		result = append(result, ola)
	}
	return result, nil
}

func (s *SLAManagementService) UpdateOLA(ctx context.Context, id uuid.UUID, req UpdateOLARequest) (OperationalLevelAgreement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return OperationalLevelAgreement{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		UPDATE operational_level_agreements SET
			name = COALESCE($3, name),
			description = COALESCE($4, description),
			support_team_id = COALESCE($5, support_team_id),
			service_catalog_item_id = COALESCE($6, service_catalog_item_id),
			parent_sla_id = COALESCE($7, parent_sla_id),
			response_target_minutes = COALESCE($8, response_target_minutes),
			resolution_target_minutes = COALESCE($9, resolution_target_minutes),
			business_hours_calendar_id = COALESCE($10, business_hours_calendar_id),
			escalation_contact_id = COALESCE($11, escalation_contact_id),
			status = COALESCE($12, status),
			effective_from = COALESCE($13, effective_from),
			effective_to = COALESCE($14, effective_to),
			review_date = COALESCE($15, review_date)
		WHERE id = $1 AND tenant_id = $2`

	_, err := s.pool.Exec(ctx, query,
		id, auth.TenantID,
		req.Name, req.Description,
		req.SupportTeamID, req.ServiceCatalogItemID, req.ParentSLAID,
		req.ResponseTargetMinutes, req.ResolutionTargetMinutes,
		req.BusinessHoursCalendarID, req.EscalationContactID,
		req.Status, req.EffectiveFrom, req.EffectiveTo, req.ReviewDate,
	)
	if err != nil {
		return OperationalLevelAgreement{}, apperrors.Internal("failed to update OLA", err)
	}

	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "update:ola", EntityType: "ola", EntityID: id, Changes: changes,
	})

	return s.GetOLA(ctx, id)
}

func (s *SLAManagementService) DeleteOLA(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	_, err := s.pool.Exec(ctx,
		`DELETE FROM operational_level_agreements WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete OLA", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "delete:ola", EntityType: "ola", EntityID: id,
	})
	return nil
}

/* ================================================================== */
/*  UC CRUD                                                            */
/* ================================================================== */

const ucColumns = `uc.id, uc.tenant_id, uc.name,
	uc.vendor_id, uc.contract_id, uc.parent_sla_id,
	uc.response_target_minutes, uc.resolution_target_minutes,
	uc.penalty_clause, uc.status,
	uc.effective_from, uc.effective_to, uc.review_date,
	uc.created_by, uc.created_at, uc.updated_at,
	v.name, c.title, sp.name`

func scanUC(row pgx.Row) (UnderpinningContract, error) {
	var uc UnderpinningContract
	err := row.Scan(
		&uc.ID, &uc.TenantID, &uc.Name,
		&uc.VendorID, &uc.ContractID, &uc.ParentSLAID,
		&uc.ResponseTargetMinutes, &uc.ResolutionTargetMinutes,
		&uc.PenaltyClause, &uc.Status,
		&uc.EffectiveFrom, &uc.EffectiveTo, &uc.ReviewDate,
		&uc.CreatedBy, &uc.CreatedAt, &uc.UpdatedAt,
		&uc.VendorName, &uc.ContractTitle, &uc.ParentSLAName,
	)
	return uc, err
}

func (s *SLAManagementService) CreateUC(ctx context.Context, req CreateUCRequest) (UnderpinningContract, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return UnderpinningContract{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()
	status := "draft"
	if req.Status != nil {
		status = *req.Status
	}

	query := `
		INSERT INTO underpinning_contracts (
			id, tenant_id, name, vendor_id, contract_id, parent_sla_id,
			response_target_minutes, resolution_target_minutes,
			penalty_clause, status,
			effective_from, effective_to, review_date,
			created_by, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING id`

	_, err := s.pool.Exec(ctx, query,
		id, auth.TenantID, req.Name, req.VendorID, req.ContractID, req.ParentSLAID,
		req.ResponseTargetMinutes, req.ResolutionTargetMinutes,
		req.PenaltyClause, status,
		req.EffectiveFrom, req.EffectiveTo, req.ReviewDate,
		auth.UserID, now, now,
	)
	if err != nil {
		return UnderpinningContract{}, apperrors.Internal("failed to create UC", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name, "status": status})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "create:uc", EntityType: "underpinning_contract", EntityID: id, Changes: changes,
	})

	return s.GetUC(ctx, id)
}

func (s *SLAManagementService) GetUC(ctx context.Context, id uuid.UUID) (UnderpinningContract, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return UnderpinningContract{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + ucColumns + `
		FROM underpinning_contracts uc
		LEFT JOIN vendors v ON v.id = uc.vendor_id
		LEFT JOIN contracts c ON c.id = uc.contract_id
		LEFT JOIN sla_policies sp ON sp.id = uc.parent_sla_id
		WHERE uc.id = $1 AND uc.tenant_id = $2`

	uc, err := scanUC(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return UnderpinningContract{}, apperrors.NotFound("UC", id.String())
		}
		return UnderpinningContract{}, apperrors.Internal("failed to get UC", err)
	}
	return uc, nil
}

func (s *SLAManagementService) ListUCs(ctx context.Context, status string) ([]UnderpinningContract, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + ucColumns + `
		FROM underpinning_contracts uc
		LEFT JOIN vendors v ON v.id = uc.vendor_id
		LEFT JOIN contracts c ON c.id = uc.contract_id
		LEFT JOIN sla_policies sp ON sp.id = uc.parent_sla_id
		WHERE uc.tenant_id = $1
		  AND ($2::text IS NULL OR uc.status = $2)
		ORDER BY uc.created_at DESC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, nilIfEmpty(status))
	if err != nil {
		return nil, apperrors.Internal("failed to list UCs", err)
	}
	defer rows.Close()

	var result []UnderpinningContract
	for rows.Next() {
		uc, err := scanUC(rows)
		if err != nil {
			return nil, apperrors.Internal("failed to scan UC", err)
		}
		result = append(result, uc)
	}
	return result, nil
}

func (s *SLAManagementService) UpdateUC(ctx context.Context, id uuid.UUID, req UpdateUCRequest) (UnderpinningContract, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return UnderpinningContract{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		UPDATE underpinning_contracts SET
			name = COALESCE($3, name),
			vendor_id = COALESCE($4, vendor_id),
			contract_id = COALESCE($5, contract_id),
			parent_sla_id = COALESCE($6, parent_sla_id),
			response_target_minutes = COALESCE($7, response_target_minutes),
			resolution_target_minutes = COALESCE($8, resolution_target_minutes),
			penalty_clause = COALESCE($9, penalty_clause),
			status = COALESCE($10, status),
			effective_from = COALESCE($11, effective_from),
			effective_to = COALESCE($12, effective_to),
			review_date = COALESCE($13, review_date)
		WHERE id = $1 AND tenant_id = $2`

	_, err := s.pool.Exec(ctx, query,
		id, auth.TenantID,
		req.Name, req.VendorID, req.ContractID, req.ParentSLAID,
		req.ResponseTargetMinutes, req.ResolutionTargetMinutes,
		req.PenaltyClause, req.Status,
		req.EffectiveFrom, req.EffectiveTo, req.ReviewDate,
	)
	if err != nil {
		return UnderpinningContract{}, apperrors.Internal("failed to update UC", err)
	}

	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "update:uc", EntityType: "underpinning_contract", EntityID: id, Changes: changes,
	})

	return s.GetUC(ctx, id)
}

func (s *SLAManagementService) DeleteUC(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	_, err := s.pool.Exec(ctx,
		`DELETE FROM underpinning_contracts WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete UC", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "delete:uc", EntityType: "underpinning_contract", EntityID: id,
	})
	return nil
}

/* ================================================================== */
/*  Dependency Chain                                                    */
/* ================================================================== */

func (s *SLAManagementService) GetDependencyChain(ctx context.Context, slaID uuid.UUID) ([]SLADependencyChainEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT dc.id, dc.sla_policy_id, dc.ola_id, dc.uc_id, dc.notes, dc.created_at,
			sp.name,
			o.name, uc.name,
			NULL::int, NULL::int,
			o.response_target_minutes, o.resolution_target_minutes,
			uc.response_target_minutes, uc.resolution_target_minutes
		FROM sla_dependency_chain dc
		JOIN sla_policies sp ON sp.id = dc.sla_policy_id
		LEFT JOIN operational_level_agreements o ON o.id = dc.ola_id
		LEFT JOIN underpinning_contracts uc ON uc.id = dc.uc_id
		WHERE dc.sla_policy_id = $1 AND sp.tenant_id = $2
		ORDER BY dc.created_at`

	rows, err := s.pool.Query(ctx, query, slaID, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get dependency chain", err)
	}
	defer rows.Close()

	var result []SLADependencyChainEntry
	for rows.Next() {
		var e SLADependencyChainEntry
		if err := rows.Scan(
			&e.ID, &e.SLAPolicyID, &e.OLAID, &e.UCID, &e.Notes, &e.CreatedAt,
			&e.SLAName,
			&e.OLAName, &e.UCName,
			&e.SLAResponseMinutes, &e.SLAResolutionMinutes,
			&e.OLAResponseMinutes, &e.OLAResolutionMinutes,
			&e.UCResponseMinutes, &e.UCResolutionMinutes,
		); err != nil {
			return nil, apperrors.Internal("failed to scan chain entry", err)
		}
		result = append(result, e)
	}
	return result, nil
}

func (s *SLAManagementService) CreateDependencyChainEntry(ctx context.Context, req CreateDependencyChainRequest) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	_, err := s.pool.Exec(ctx,
		`INSERT INTO sla_dependency_chain (id, sla_policy_id, ola_id, uc_id, notes)
		 VALUES ($1, $2, $3, $4, $5)`,
		id, req.SLAPolicyID, req.OLAID, req.UCID, req.Notes,
	)
	if err != nil {
		return apperrors.Internal("failed to create dependency chain entry", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "create:sla_dependency_chain", EntityType: "sla_dependency_chain", EntityID: id,
	})
	return nil
}

func (s *SLAManagementService) DeleteDependencyChainEntry(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	_, err := s.pool.Exec(ctx, `DELETE FROM sla_dependency_chain WHERE id = $1`, id)
	if err != nil {
		return apperrors.Internal("failed to delete dependency chain entry", err)
	}
	return nil
}

/* ================================================================== */
/*  Consistency Check                                                  */
/* ================================================================== */

// CheckConsistency verifies OLA/UC targets don't exceed parent SLA targets.
func (s *SLAManagementService) CheckConsistency(ctx context.Context) ([]ConsistencyViolation, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Check OLAs where response or resolution target exceeds parent SLA.
	olaQuery := `
		SELECT o.id, o.name, o.parent_sla_id, sp.name,
			o.response_target_minutes, o.resolution_target_minutes,
			sp.priority_targets
		FROM operational_level_agreements o
		JOIN sla_policies sp ON sp.id = o.parent_sla_id
		WHERE o.tenant_id = $1 AND o.status = 'active' AND sp.is_active = true`

	rows, err := s.pool.Query(ctx, olaQuery, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to check OLA consistency", err)
	}
	defer rows.Close()

	var violations []ConsistencyViolation
	for rows.Next() {
		var olaID, slaID uuid.UUID
		var olaName, slaName string
		var olaResp, olaRes int
		var priorityTargets json.RawMessage
		if err := rows.Scan(&olaID, &olaName, &slaID, &slaName, &olaResp, &olaRes, &priorityTargets); err != nil {
			slog.ErrorContext(ctx, "failed to scan OLA consistency row", "error", err)
			continue
		}
		slaResp, slaRes := extractMinTargets(priorityTargets)
		if slaResp > 0 && olaResp > slaResp {
			violations = append(violations, ConsistencyViolation{
				Type: "ola", EntityID: olaID.String(), EntityName: olaName,
				ParentSLAID: slaID.String(), ParentSLAName: slaName,
				Field: "response", SLATargetMinutes: slaResp, EntityTargetMinutes: olaResp,
			})
		}
		if slaRes > 0 && olaRes > slaRes {
			violations = append(violations, ConsistencyViolation{
				Type: "ola", EntityID: olaID.String(), EntityName: olaName,
				ParentSLAID: slaID.String(), ParentSLAName: slaName,
				Field: "resolution", SLATargetMinutes: slaRes, EntityTargetMinutes: olaRes,
			})
		}
	}

	// Check UCs similarly.
	ucQuery := `
		SELECT uc.id, uc.name, uc.parent_sla_id, sp.name,
			uc.response_target_minutes, uc.resolution_target_minutes,
			sp.priority_targets
		FROM underpinning_contracts uc
		JOIN sla_policies sp ON sp.id = uc.parent_sla_id
		WHERE uc.tenant_id = $1 AND uc.status = 'active' AND sp.is_active = true`

	ucRows, err := s.pool.Query(ctx, ucQuery, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to check UC consistency", err)
	}
	defer ucRows.Close()

	for ucRows.Next() {
		var ucID, slaID uuid.UUID
		var ucName, slaName string
		var ucResp, ucRes int
		var priorityTargets json.RawMessage
		if err := ucRows.Scan(&ucID, &ucName, &slaID, &slaName, &ucResp, &ucRes, &priorityTargets); err != nil {
			slog.ErrorContext(ctx, "failed to scan UC consistency row", "error", err)
			continue
		}
		slaResp, slaRes := extractMinTargets(priorityTargets)
		if slaResp > 0 && ucResp > slaResp {
			violations = append(violations, ConsistencyViolation{
				Type: "uc", EntityID: ucID.String(), EntityName: ucName,
				ParentSLAID: slaID.String(), ParentSLAName: slaName,
				Field: "response", SLATargetMinutes: slaResp, EntityTargetMinutes: ucResp,
			})
		}
		if slaRes > 0 && ucRes > slaRes {
			violations = append(violations, ConsistencyViolation{
				Type: "uc", EntityID: ucID.String(), EntityName: ucName,
				ParentSLAID: slaID.String(), ParentSLAName: slaName,
				Field: "resolution", SLATargetMinutes: slaRes, EntityTargetMinutes: ucRes,
			})
		}
	}

	return violations, nil
}

/* ================================================================== */
/*  Expiring OLAs/UCs                                                  */
/* ================================================================== */

// ListExpiring returns OLAs and UCs expiring within the given number of days.
func (s *SLAManagementService) ListExpiring(ctx context.Context, withinDays int) ([]OperationalLevelAgreement, []UnderpinningContract, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, nil, apperrors.Unauthorized("authentication required")
	}

	cutoff := time.Now().AddDate(0, 0, withinDays).Format("2006-01-02")

	olaQuery := `SELECT ` + olaColumns + `
		FROM operational_level_agreements o
		LEFT JOIN support_queues sq ON sq.id = o.support_team_id
		LEFT JOIN sla_policies sp ON sp.id = o.parent_sla_id
		LEFT JOIN users u ON u.id = o.escalation_contact_id
		WHERE o.tenant_id = $1 AND o.status = 'active'
		  AND o.effective_to IS NOT NULL AND o.effective_to <= $2
		ORDER BY o.effective_to ASC`

	olaRows, err := s.pool.Query(ctx, olaQuery, auth.TenantID, cutoff)
	if err != nil {
		return nil, nil, apperrors.Internal("failed to list expiring OLAs", err)
	}
	defer olaRows.Close()

	var olas []OperationalLevelAgreement
	for olaRows.Next() {
		ola, err := scanOLA(olaRows)
		if err != nil {
			return nil, nil, apperrors.Internal("failed to scan expiring OLA", err)
		}
		olas = append(olas, ola)
	}

	ucQuery := `SELECT ` + ucColumns + `
		FROM underpinning_contracts uc
		LEFT JOIN vendors v ON v.id = uc.vendor_id
		LEFT JOIN contracts c ON c.id = uc.contract_id
		LEFT JOIN sla_policies sp ON sp.id = uc.parent_sla_id
		WHERE uc.tenant_id = $1 AND uc.status = 'active'
		  AND uc.effective_to IS NOT NULL AND uc.effective_to <= $2
		ORDER BY uc.effective_to ASC`

	ucRows, err := s.pool.Query(ctx, ucQuery, auth.TenantID, cutoff)
	if err != nil {
		return nil, nil, apperrors.Internal("failed to list expiring UCs", err)
	}
	defer ucRows.Close()

	var ucs []UnderpinningContract
	for ucRows.Next() {
		uc, err := scanUC(ucRows)
		if err != nil {
			return nil, nil, apperrors.Internal("failed to scan expiring UC", err)
		}
		ucs = append(ucs, uc)
	}

	return olas, ucs, nil
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

// extractMinTargets parses priority_targets JSONB and returns the tightest
// (minimum) response and resolution targets across all priorities.
func extractMinTargets(priorityTargets json.RawMessage) (int, int) {
	var targets map[string]struct {
		ResponseMinutes   int `json:"response_minutes"`
		ResolutionMinutes int `json:"resolution_minutes"`
	}
	if err := json.Unmarshal(priorityTargets, &targets); err != nil {
		return 0, 0
	}

	minResp, minRes := 0, 0
	for _, t := range targets {
		if minResp == 0 || (t.ResponseMinutes > 0 && t.ResponseMinutes < minResp) {
			minResp = t.ResponseMinutes
		}
		if minRes == 0 || (t.ResolutionMinutes > 0 && t.ResolutionMinutes < minRes) {
			minRes = t.ResolutionMinutes
		}
	}
	return minResp, minRes
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
