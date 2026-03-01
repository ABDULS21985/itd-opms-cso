package governance

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
)

// PolicyService handles business logic for policy management.
type PolicyService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewPolicyService creates a new PolicyService.
func NewPolicyService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *PolicyService {
	return &PolicyService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// CreatePolicy creates a new policy and its initial version.
func (s *PolicyService) CreatePolicy(ctx context.Context, tenantID, createdBy uuid.UUID, req CreatePolicyRequest) (*Policy, error) {
	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO policies (
			id, tenant_id, title, description, category, content,
			tags, scope_type, scope_tenant_ids, owner_id,
			status, version, effective_date, review_date, expiry_date,
			created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14, $15,
			$16, $17, $18
		)
		RETURNING id, tenant_id, title, description, category, tags,
			scope_type, scope_tenant_ids, status, version, content,
			effective_date, review_date, expiry_date, owner_id,
			created_by, created_at, updated_at`

	var p Policy
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.Title, req.Description, req.Category, req.Content,
		req.Tags, req.ScopeType, req.ScopeTenantIDs, req.OwnerID,
		PolicyStatusDraft, 1, req.EffectiveDate, req.ReviewDate, req.ExpiryDate,
		createdBy, now, now,
	).Scan(
		&p.ID, &p.TenantID, &p.Title, &p.Description, &p.Category, &p.Tags,
		&p.ScopeType, &p.ScopeTenantIDs, &p.Status, &p.Version, &p.Content,
		&p.EffectiveDate, &p.ReviewDate, &p.ExpiryDate, &p.OwnerID,
		&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create policy", err)
	}

	// Insert initial version record.
	versionID := uuid.New()
	versionQuery := `
		INSERT INTO policy_versions (
			id, policy_id, version, title, content, changes_summary, created_by, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	initialSummary := "Initial version"
	_, err = s.pool.Exec(ctx, versionQuery,
		versionID, id, 1, req.Title, req.Content, &initialSummary, createdBy, now,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create policy version", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":    req.Title,
		"category": req.Category,
		"status":   PolicyStatusDraft,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    createdBy,
		Action:     "policy.created",
		EntityType: "policy",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &p, nil
}

// GetPolicy retrieves a single policy by ID.
func (s *PolicyService) GetPolicy(ctx context.Context, tenantID, policyID uuid.UUID) (*Policy, error) {
	query := `
		SELECT id, tenant_id, title, description, category, tags,
			scope_type, scope_tenant_ids, status, version, content,
			effective_date, review_date, expiry_date, owner_id,
			created_by, created_at, updated_at
		FROM policies
		WHERE id = $1 AND tenant_id = $2`

	var p Policy
	err := s.pool.QueryRow(ctx, query, policyID, tenantID).Scan(
		&p.ID, &p.TenantID, &p.Title, &p.Description, &p.Category, &p.Tags,
		&p.ScopeType, &p.ScopeTenantIDs, &p.Status, &p.Version, &p.Content,
		&p.EffectiveDate, &p.ReviewDate, &p.ExpiryDate, &p.OwnerID,
		&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("Policy", policyID.String())
		}
		return nil, apperrors.Internal("failed to get policy", err)
	}

	return &p, nil
}

// ListPolicies returns a filtered, paginated list of policies.
func (s *PolicyService) ListPolicies(ctx context.Context, tenantID uuid.UUID, category, status string, limit, offset int) ([]Policy, int64, error) {
	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM policies
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR category = $2)
			AND ($3::text IS NULL OR status = $3)`

	var categoryParam, statusParam *string
	if category != "" {
		categoryParam = &category
	}
	if status != "" {
		statusParam = &status
	}

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, tenantID, categoryParam, statusParam).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count policies", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, title, description, category, tags,
			scope_type, scope_tenant_ids, status, version, content,
			effective_date, review_date, expiry_date, owner_id,
			created_by, created_at, updated_at
		FROM policies
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR category = $2)
			AND ($3::text IS NULL OR status = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, tenantID, categoryParam, statusParam, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list policies", err)
	}
	defer rows.Close()

	var policies []Policy
	for rows.Next() {
		var p Policy
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.Title, &p.Description, &p.Category, &p.Tags,
			&p.ScopeType, &p.ScopeTenantIDs, &p.Status, &p.Version, &p.Content,
			&p.EffectiveDate, &p.ReviewDate, &p.ExpiryDate, &p.OwnerID,
			&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan policy", err)
		}
		policies = append(policies, p)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate policies", err)
	}

	if policies == nil {
		policies = []Policy{}
	}

	return policies, total, nil
}

// UpdatePolicy updates an existing policy and creates a new version record.
func (s *PolicyService) UpdatePolicy(ctx context.Context, tenantID, policyID, updatedBy uuid.UUID, req UpdatePolicyRequest) (*Policy, error) {
	// Verify the policy exists and belongs to the tenant.
	existing, err := s.GetPolicy(ctx, tenantID, policyID)
	if err != nil {
		return nil, err
	}

	// Only allow updates on draft or in_review policies.
	if existing.Status != PolicyStatusDraft && existing.Status != PolicyStatusInReview {
		return nil, apperrors.BadRequest(
			fmt.Sprintf("Cannot update policy in '%s' status; only draft or in_review policies can be edited", existing.Status),
		)
	}

	now := time.Now().UTC()
	newVersion := existing.Version + 1

	updateQuery := `
		UPDATE policies SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			category = COALESCE($3, category),
			content = COALESCE($4, content),
			tags = COALESCE($5, tags),
			scope_type = COALESCE($6, scope_type),
			scope_tenant_ids = COALESCE($7, scope_tenant_ids),
			owner_id = COALESCE($8, owner_id),
			effective_date = COALESCE($9, effective_date),
			review_date = COALESCE($10, review_date),
			expiry_date = COALESCE($11, expiry_date),
			version = $12,
			updated_at = $13
		WHERE id = $14 AND tenant_id = $15
		RETURNING id, tenant_id, title, description, category, tags,
			scope_type, scope_tenant_ids, status, version, content,
			effective_date, review_date, expiry_date, owner_id,
			created_by, created_at, updated_at`

	var p Policy
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.Category, req.Content,
		req.Tags, req.ScopeType, req.ScopeTenantIDs, req.OwnerID,
		req.EffectiveDate, req.ReviewDate, req.ExpiryDate,
		newVersion, now,
		policyID, tenantID,
	).Scan(
		&p.ID, &p.TenantID, &p.Title, &p.Description, &p.Category, &p.Tags,
		&p.ScopeType, &p.ScopeTenantIDs, &p.Status, &p.Version, &p.Content,
		&p.EffectiveDate, &p.ReviewDate, &p.ExpiryDate, &p.OwnerID,
		&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to update policy", err)
	}

	// Insert new version record.
	versionID := uuid.New()
	changeSummary := req.ChangesSummary
	if changeSummary == nil {
		defaultSummary := fmt.Sprintf("Updated to version %d", newVersion)
		changeSummary = &defaultSummary
	}

	versionQuery := `
		INSERT INTO policy_versions (
			id, policy_id, version, title, content, changes_summary, created_by, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err = s.pool.Exec(ctx, versionQuery,
		versionID, policyID, newVersion, p.Title, p.Content, changeSummary, updatedBy, now,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create policy version", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"version":         newVersion,
		"changes_summary": changeSummary,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    updatedBy,
		Action:     "policy.updated",
		EntityType: "policy",
		EntityID:   policyID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &p, nil
}

// UpdateStatus transitions a policy to a new status with validation.
func (s *PolicyService) UpdateStatus(ctx context.Context, tenantID, policyID, actorID uuid.UUID, newStatus string) (*Policy, error) {
	existing, err := s.GetPolicy(ctx, tenantID, policyID)
	if err != nil {
		return nil, err
	}

	// Validate state transition.
	if !isValidTransition(existing.Status, newStatus) {
		return nil, apperrors.BadRequest(
			fmt.Sprintf("Invalid status transition from '%s' to '%s'", existing.Status, newStatus),
		)
	}

	now := time.Now().UTC()
	query := `
		UPDATE policies SET status = $1, updated_at = $2
		WHERE id = $3 AND tenant_id = $4
		RETURNING id, tenant_id, title, description, category, tags,
			scope_type, scope_tenant_ids, status, version, content,
			effective_date, review_date, expiry_date, owner_id,
			created_by, created_at, updated_at`

	var p Policy
	err = s.pool.QueryRow(ctx, query, newStatus, now, policyID, tenantID).Scan(
		&p.ID, &p.TenantID, &p.Title, &p.Description, &p.Category, &p.Tags,
		&p.ScopeType, &p.ScopeTenantIDs, &p.Status, &p.Version, &p.Content,
		&p.EffectiveDate, &p.ReviewDate, &p.ExpiryDate, &p.OwnerID,
		&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to update policy status", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      newStatus,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    actorID,
		Action:     "policy.status_changed",
		EntityType: "policy",
		EntityID:   policyID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &p, nil
}

// isValidTransition checks whether a policy status transition is allowed.
func isValidTransition(from, to string) bool {
	allowed := map[string]string{
		PolicyStatusDraft:     PolicyStatusInReview,
		PolicyStatusInReview:  PolicyStatusApproved,
		PolicyStatusApproved:  PolicyStatusPublished,
		PolicyStatusPublished: PolicyStatusRetired,
	}
	return allowed[from] == to
}

// GetVersionHistory returns all versions of a policy ordered by version descending.
func (s *PolicyService) GetVersionHistory(ctx context.Context, policyID uuid.UUID) ([]PolicyVersion, error) {
	query := `
		SELECT id, policy_id, version, title, content, changes_summary, created_by, created_at
		FROM policy_versions
		WHERE policy_id = $1
		ORDER BY version DESC`

	rows, err := s.pool.Query(ctx, query, policyID)
	if err != nil {
		return nil, apperrors.Internal("failed to get version history", err)
	}
	defer rows.Close()

	var versions []PolicyVersion
	for rows.Next() {
		var v PolicyVersion
		if err := rows.Scan(
			&v.ID, &v.PolicyID, &v.Version, &v.Title, &v.Content,
			&v.ChangesSummary, &v.CreatedBy, &v.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan policy version", err)
		}
		versions = append(versions, v)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate policy versions", err)
	}

	if versions == nil {
		versions = []PolicyVersion{}
	}

	return versions, nil
}

// DiffVersions compares two versions of a policy.
func (s *PolicyService) DiffVersions(ctx context.Context, policyID uuid.UUID, v1, v2 int) (*VersionDiff, error) {
	query := `
		SELECT id, policy_id, version, title, content, changes_summary, created_by, created_at
		FROM policy_versions
		WHERE policy_id = $1 AND version = $2`

	var oldVer, newVer PolicyVersion

	// Fetch version v1.
	err := s.pool.QueryRow(ctx, query, policyID, v1).Scan(
		&oldVer.ID, &oldVer.PolicyID, &oldVer.Version, &oldVer.Title, &oldVer.Content,
		&oldVer.ChangesSummary, &oldVer.CreatedBy, &oldVer.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("PolicyVersion", fmt.Sprintf("%s/v%d", policyID, v1))
		}
		return nil, apperrors.Internal("failed to get policy version", err)
	}

	// Fetch version v2.
	err = s.pool.QueryRow(ctx, query, policyID, v2).Scan(
		&newVer.ID, &newVer.PolicyID, &newVer.Version, &newVer.Title, &newVer.Content,
		&newVer.ChangesSummary, &newVer.CreatedBy, &newVer.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("PolicyVersion", fmt.Sprintf("%s/v%d", policyID, v2))
		}
		return nil, apperrors.Internal("failed to get policy version", err)
	}

	diff := &VersionDiff{
		V1:         v1,
		V2:         v2,
		OldTitle:   oldVer.Title,
		NewTitle:   newVer.Title,
		OldContent: oldVer.Content,
		NewContent: newVer.Content,
	}

	return diff, nil
}

// LaunchAttestationCampaign creates an attestation campaign for a published policy.
func (s *PolicyService) LaunchAttestationCampaign(ctx context.Context, tenantID, policyID, createdBy uuid.UUID, req LaunchCampaignRequest) (*AttestationCampaign, error) {
	// Verify the policy exists and is published.
	policy, err := s.GetPolicy(ctx, tenantID, policyID)
	if err != nil {
		return nil, err
	}
	if policy.Status != PolicyStatusPublished {
		return nil, apperrors.BadRequest("Attestation campaigns can only be launched for published policies")
	}

	now := time.Now().UTC()
	campaignID := uuid.New()

	// Resolve target users based on scope.
	var targetUserIDs []uuid.UUID
	if req.TargetScope == "all_tenant" {
		userQuery := `SELECT id FROM users WHERE tenant_id = $1 AND is_active = true`
		rows, qErr := s.pool.Query(ctx, userQuery, tenantID)
		if qErr != nil {
			return nil, apperrors.Internal("failed to query tenant users", qErr)
		}
		defer rows.Close()

		for rows.Next() {
			var uid uuid.UUID
			if scanErr := rows.Scan(&uid); scanErr != nil {
				return nil, apperrors.Internal("failed to scan user id", scanErr)
			}
			targetUserIDs = append(targetUserIDs, uid)
		}
		if rowsErr := rows.Err(); rowsErr != nil {
			return nil, apperrors.Internal("failed to iterate users", rowsErr)
		}
	} else if len(req.TargetUserIDs) > 0 {
		targetUserIDs = req.TargetUserIDs
	}

	campaignQuery := `
		INSERT INTO attestation_campaigns (
			id, tenant_id, policy_id, policy_version, target_scope,
			target_user_ids, due_date, status, completion_rate,
			created_by, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, tenant_id, policy_id, policy_version, target_scope,
			target_user_ids, due_date, status, completion_rate,
			created_by, created_at`

	var campaign AttestationCampaign
	err = s.pool.QueryRow(ctx, campaignQuery,
		campaignID, tenantID, policyID, policy.Version, req.TargetScope,
		targetUserIDs, req.DueDate, CampaignStatusActive, float64(0),
		createdBy, now,
	).Scan(
		&campaign.ID, &campaign.TenantID, &campaign.PolicyID, &campaign.PolicyVersion,
		&campaign.TargetScope, &campaign.TargetUserIDs, &campaign.DueDate,
		&campaign.Status, &campaign.CompletionRate,
		&campaign.CreatedBy, &campaign.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create attestation campaign", err)
	}

	// Create attestation records for each target user.
	attestationQuery := `
		INSERT INTO policy_attestations (
			id, tenant_id, campaign_id, policy_id, policy_version,
			user_id, status, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	for _, userID := range targetUserIDs {
		attestID := uuid.New()
		_, insertErr := s.pool.Exec(ctx, attestationQuery,
			attestID, tenantID, campaignID, policyID, policy.Version,
			userID, AttestationPending, now,
		)
		if insertErr != nil {
			return nil, apperrors.Internal("failed to create attestation record", insertErr)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"campaign_id":    campaignID,
		"target_scope":   req.TargetScope,
		"target_count":   len(targetUserIDs),
		"policy_version": policy.Version,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    createdBy,
		Action:     "attestation.campaign_launched",
		EntityType: "policy",
		EntityID:   policyID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &campaign, nil
}

// GetAttestationStatus returns the attestation status summary for a policy.
func (s *PolicyService) GetAttestationStatus(ctx context.Context, policyID uuid.UUID) (*AttestationStatus, error) {
	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'attested') AS attested,
			COUNT(*) FILTER (WHERE status = 'pending') AS pending,
			COUNT(*) FILTER (WHERE status = 'overdue') AS overdue
		FROM policy_attestations
		WHERE policy_id = $1`

	var st AttestationStatus
	err := s.pool.QueryRow(ctx, query, policyID).Scan(
		&st.TotalUsers, &st.AttestedCount, &st.PendingCount, &st.OverdueCount,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to get attestation status", err)
	}

	if st.TotalUsers > 0 {
		st.CompletionRate = float64(st.AttestedCount) / float64(st.TotalUsers) * 100.0
	}

	return &st, nil
}

// AttestPolicy marks a specific attestation as attested by the user.
func (s *PolicyService) AttestPolicy(ctx context.Context, attestationID, userID uuid.UUID) error {
	now := time.Now().UTC()

	query := `
		UPDATE policy_attestations
		SET status = 'attested', attested_at = $1
		WHERE id = $2 AND user_id = $3 AND status = 'pending'`

	result, err := s.pool.Exec(ctx, query, now, attestationID, userID)
	if err != nil {
		return apperrors.Internal("failed to attest policy", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("PolicyAttestation", attestationID.String())
	}

	// Update campaign completion rate if campaign_id is set.
	updateCampaignQuery := `
		UPDATE attestation_campaigns ac
		SET completion_rate = (
			SELECT ROUND(
				COUNT(*) FILTER (WHERE pa.status = 'attested')::numeric /
				NULLIF(COUNT(*), 0) * 100, 2
			)
			FROM policy_attestations pa
			WHERE pa.campaign_id = ac.id
		)
		WHERE ac.id = (
			SELECT campaign_id FROM policy_attestations WHERE id = $1
		)`

	_, err = s.pool.Exec(ctx, updateCampaignQuery, attestationID)
	if err != nil {
		slog.ErrorContext(ctx, "failed to update campaign completion rate", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"attestation_id": attestationID,
		"status":         "attested",
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		ActorID:    userID,
		Action:     "policy.attested",
		EntityType: "policy_attestation",
		EntityID:   attestationID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}
