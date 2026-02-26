package cmdb

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
// LicenseService
// ──────────────────────────────────────────────

// LicenseService handles business logic for software licenses and assignments.
type LicenseService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewLicenseService creates a new LicenseService.
func NewLicenseService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *LicenseService {
	return &LicenseService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// licenseColumns is the canonical column list for the licenses table.
const licenseColumns = `
	id, tenant_id, software_name, vendor, license_type,
	total_entitlements, assigned_count,
	compliance_status, expiry_date,
	cost, renewal_contact,
	created_at, updated_at`

// scanLicense scans a single license row into a License struct.
func scanLicense(row pgx.Row) (License, error) {
	var l License
	err := row.Scan(
		&l.ID, &l.TenantID, &l.SoftwareName, &l.Vendor, &l.LicenseType,
		&l.TotalEntitlements, &l.AssignedCount,
		&l.ComplianceStatus, &l.ExpiryDate,
		&l.Cost, &l.RenewalContact,
		&l.CreatedAt, &l.UpdatedAt,
	)
	return l, err
}

// scanLicenses scans multiple license rows into a slice.
func scanLicenses(rows pgx.Rows) ([]License, error) {
	var licenses []License
	for rows.Next() {
		var l License
		if err := rows.Scan(
			&l.ID, &l.TenantID, &l.SoftwareName, &l.Vendor, &l.LicenseType,
			&l.TotalEntitlements, &l.AssignedCount,
			&l.ComplianceStatus, &l.ExpiryDate,
			&l.Cost, &l.RenewalContact,
			&l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, err
		}
		licenses = append(licenses, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if licenses == nil {
		licenses = []License{}
	}
	return licenses, nil
}

// ──────────────────────────────────────────────
// Compliance helper
// ──────────────────────────────────────────────

// calculateComplianceStatus returns compliant/over_deployed/under_utilized based on assignment ratio.
func calculateComplianceStatus(assigned, total int) string {
	if total <= 0 {
		if assigned > 0 {
			return ComplianceStatusOverDeployed
		}
		return ComplianceStatusCompliant
	}
	ratio := float64(assigned) / float64(total)
	if ratio > 1.0 {
		return ComplianceStatusOverDeployed
	}
	if ratio < 0.5 {
		return ComplianceStatusUnderUtilized
	}
	return ComplianceStatusCompliant
}

// ──────────────────────────────────────────────
// License CRUD
// ──────────────────────────────────────────────

// CreateLicense creates a new software license.
func (s *LicenseService) CreateLicense(ctx context.Context, req CreateLicenseRequest) (License, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return License{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	assignedCount := 0
	complianceStatus := calculateComplianceStatus(assignedCount, req.TotalEntitlements)

	query := `
		INSERT INTO licenses (
			id, tenant_id, software_name, vendor, license_type,
			total_entitlements, assigned_count,
			compliance_status, expiry_date,
			cost, renewal_contact,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7,
			$8, $9,
			$10, $11,
			$12, $13
		)
		RETURNING ` + licenseColumns

	license, err := scanLicense(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.SoftwareName, req.Vendor, req.LicenseType,
		req.TotalEntitlements, assignedCount,
		complianceStatus, req.ExpiryDate,
		req.Cost, req.RenewalContact,
		now, now,
	))
	if err != nil {
		return License{}, apperrors.Internal("failed to create license", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"software_name": req.SoftwareName,
		"license_type":  req.LicenseType,
		"vendor":        req.Vendor,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:license",
		EntityType: "license",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return license, nil
}

// GetLicense retrieves a single license by ID.
func (s *LicenseService) GetLicense(ctx context.Context, id uuid.UUID) (License, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return License{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + licenseColumns + ` FROM licenses WHERE id = $1 AND tenant_id = $2`

	license, err := scanLicense(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return License{}, apperrors.NotFound("License", id.String())
		}
		return License{}, apperrors.Internal("failed to get license", err)
	}

	return license, nil
}

// ListLicenses returns a filtered, paginated list of licenses.
func (s *LicenseService) ListLicenses(ctx context.Context, complianceStatus, licenseType *string, params types.PaginationParams) ([]License, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM licenses
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR compliance_status = $2)
			AND ($3::text IS NULL OR license_type = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery,
		auth.TenantID, complianceStatus, licenseType,
	).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count licenses", err)
	}

	dataQuery := `
		SELECT ` + licenseColumns + `
		FROM licenses
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR compliance_status = $2)
			AND ($3::text IS NULL OR license_type = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, complianceStatus, licenseType,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list licenses", err)
	}
	defer rows.Close()

	licenses, err := scanLicenses(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan licenses", err)
	}

	return licenses, total, nil
}

// UpdateLicense updates an existing license using COALESCE partial update.
func (s *LicenseService) UpdateLicense(ctx context.Context, id uuid.UUID, req UpdateLicenseRequest) (License, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return License{}, apperrors.Unauthorized("authentication required")
	}

	// Verify license exists.
	_, err := s.GetLicense(ctx, id)
	if err != nil {
		return License{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE licenses SET
			software_name = COALESCE($1, software_name),
			vendor = COALESCE($2, vendor),
			license_type = COALESCE($3, license_type),
			total_entitlements = COALESCE($4, total_entitlements),
			compliance_status = COALESCE($5, compliance_status),
			expiry_date = COALESCE($6, expiry_date),
			cost = COALESCE($7, cost),
			renewal_contact = COALESCE($8, renewal_contact),
			updated_at = $9
		WHERE id = $10 AND tenant_id = $11
		RETURNING ` + licenseColumns

	license, err := scanLicense(s.pool.QueryRow(ctx, updateQuery,
		req.SoftwareName, req.Vendor, req.LicenseType,
		req.TotalEntitlements, req.ComplianceStatus,
		req.ExpiryDate, req.Cost, req.RenewalContact,
		now, id, auth.TenantID,
	))
	if err != nil {
		return License{}, apperrors.Internal("failed to update license", err)
	}

	// Recalculate compliance status if total entitlements changed.
	if req.TotalEntitlements != nil {
		newStatus := calculateComplianceStatus(license.AssignedCount, license.TotalEntitlements)
		if newStatus != license.ComplianceStatus {
			_, err = s.pool.Exec(ctx, `
				UPDATE licenses SET compliance_status = $1, updated_at = $2
				WHERE id = $3 AND tenant_id = $4`,
				newStatus, now, id, auth.TenantID,
			)
			if err != nil {
				slog.ErrorContext(ctx, "failed to update compliance status", "error", err)
			}
			license.ComplianceStatus = newStatus
		}
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:license",
		EntityType: "license",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return license, nil
}

// DeleteLicense deletes a license.
func (s *LicenseService) DeleteLicense(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM licenses WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete license", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("License", id.String())
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:license",
		EntityType: "license",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// License Compliance Stats
// ──────────────────────────────────────────────

// GetLicenseComplianceStats returns aggregate license compliance statistics.
func (s *LicenseService) GetLicenseComplianceStats(ctx context.Context) (LicenseComplianceStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return LicenseComplianceStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS compliant,
			COUNT(*) FILTER (WHERE compliance_status = 'over_deployed') AS over_deployed,
			COUNT(*) FILTER (WHERE compliance_status = 'under_utilized') AS under_utilized
		FROM licenses
		WHERE tenant_id = $1`

	var stats LicenseComplianceStats
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&stats.Total, &stats.Compliant, &stats.OverDeployed, &stats.UnderUtilized,
	)
	if err != nil {
		return LicenseComplianceStats{}, apperrors.Internal("failed to get license compliance stats", err)
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// License Assignments
// ──────────────────────────────────────────────

// CreateLicenseAssignment creates a new license assignment and increments the assigned count.
func (s *LicenseService) CreateLicenseAssignment(ctx context.Context, req CreateLicenseAssignmentRequest) (LicenseAssignment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return LicenseAssignment{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the license exists.
	license, err := s.GetLicense(ctx, req.LicenseID)
	if err != nil {
		return LicenseAssignment{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO license_assignments (id, license_id, tenant_id, user_id, asset_id, assigned_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, license_id, tenant_id, user_id, asset_id, assigned_at`

	var assignment LicenseAssignment
	err = s.pool.QueryRow(ctx, query,
		id, req.LicenseID, auth.TenantID, req.UserID, req.AssetID, now,
	).Scan(
		&assignment.ID, &assignment.LicenseID, &assignment.TenantID,
		&assignment.UserID, &assignment.AssetID, &assignment.AssignedAt,
	)
	if err != nil {
		return LicenseAssignment{}, apperrors.Internal("failed to create license assignment", err)
	}

	// Increment assigned_count and recalculate compliance status.
	newAssigned := license.AssignedCount + 1
	newStatus := calculateComplianceStatus(newAssigned, license.TotalEntitlements)

	_, err = s.pool.Exec(ctx, `
		UPDATE licenses SET assigned_count = $1, compliance_status = $2, updated_at = $3
		WHERE id = $4 AND tenant_id = $5`,
		newAssigned, newStatus, now, req.LicenseID, auth.TenantID,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to update license assigned count", "error", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"license_id": req.LicenseID,
		"user_id":    req.UserID,
		"asset_id":   req.AssetID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:license_assignment",
		EntityType: "license_assignment",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return assignment, nil
}

// ListAssignmentsByLicense returns all assignments for a given license.
func (s *LicenseService) ListAssignmentsByLicense(ctx context.Context, licenseID uuid.UUID) ([]LicenseAssignment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, license_id, tenant_id, user_id, asset_id, assigned_at
		FROM license_assignments
		WHERE license_id = $1 AND tenant_id = $2
		ORDER BY assigned_at DESC`

	rows, err := s.pool.Query(ctx, query, licenseID, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list license assignments", err)
	}
	defer rows.Close()

	var assignments []LicenseAssignment
	for rows.Next() {
		var a LicenseAssignment
		if err := rows.Scan(
			&a.ID, &a.LicenseID, &a.TenantID,
			&a.UserID, &a.AssetID, &a.AssignedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan license assignment", err)
		}
		assignments = append(assignments, a)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate license assignments", err)
	}

	if assignments == nil {
		assignments = []LicenseAssignment{}
	}

	return assignments, nil
}

// DeleteLicenseAssignment removes a license assignment and decrements the assigned count.
func (s *LicenseService) DeleteLicenseAssignment(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Get the assignment to find the license ID.
	var licenseID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT license_id FROM license_assignments WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&licenseID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("LicenseAssignment", id.String())
		}
		return apperrors.Internal("failed to get license assignment", err)
	}

	// Delete the assignment.
	result, err := s.pool.Exec(ctx, `
		DELETE FROM license_assignments WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete license assignment", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("LicenseAssignment", id.String())
	}

	// Decrement assigned_count and recalculate compliance status.
	now := time.Now().UTC()
	var assignedCount, totalEntitlements int
	err = s.pool.QueryRow(ctx, `
		SELECT assigned_count, total_entitlements FROM licenses WHERE id = $1 AND tenant_id = $2`,
		licenseID, auth.TenantID,
	).Scan(&assignedCount, &totalEntitlements)
	if err != nil {
		slog.ErrorContext(ctx, "failed to get license for decrement", "error", err)
		return nil
	}

	newAssigned := assignedCount - 1
	if newAssigned < 0 {
		newAssigned = 0
	}
	newStatus := calculateComplianceStatus(newAssigned, totalEntitlements)

	_, err = s.pool.Exec(ctx, `
		UPDATE licenses SET assigned_count = $1, compliance_status = $2, updated_at = $3
		WHERE id = $4 AND tenant_id = $5`,
		newAssigned, newStatus, now, licenseID, auth.TenantID,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to update license assigned count after deletion", "error", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"license_id": licenseID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:license_assignment",
		EntityType: "license_assignment",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}
