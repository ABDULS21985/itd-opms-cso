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

// LicenseService handles business logic for software licenses, assignments, warranties, and renewal alerts.
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

// ──────────────────────────────────────────────
// Warranties
// ──────────────────────────────────────────────

// warrantyColumns is the canonical column list for the warranties table.
const warrantyColumns = `
	id, asset_id, tenant_id, vendor, contract_number,
	coverage_type, start_date, end_date,
	cost, renewal_status,
	created_at, updated_at`

// scanWarranty scans a single warranty row into a Warranty struct.
func scanWarranty(row pgx.Row) (Warranty, error) {
	var w Warranty
	err := row.Scan(
		&w.ID, &w.AssetID, &w.TenantID, &w.Vendor, &w.ContractNumber,
		&w.CoverageType, &w.StartDate, &w.EndDate,
		&w.Cost, &w.RenewalStatus,
		&w.CreatedAt, &w.UpdatedAt,
	)
	return w, err
}

// scanWarranties scans multiple warranty rows into a slice.
func scanWarranties(rows pgx.Rows) ([]Warranty, error) {
	var warranties []Warranty
	for rows.Next() {
		var w Warranty
		if err := rows.Scan(
			&w.ID, &w.AssetID, &w.TenantID, &w.Vendor, &w.ContractNumber,
			&w.CoverageType, &w.StartDate, &w.EndDate,
			&w.Cost, &w.RenewalStatus,
			&w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, err
		}
		warranties = append(warranties, w)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if warranties == nil {
		warranties = []Warranty{}
	}
	return warranties, nil
}

// determineRenewalStatus returns active/expiring_soon/expired based on end_date.
func determineRenewalStatus(endDate time.Time) string {
	now := time.Now().UTC()
	if endDate.Before(now) {
		return WarrantyRenewalStatusExpired
	}
	if endDate.Before(now.AddDate(0, 0, 90)) {
		return WarrantyRenewalStatusExpiringSoon
	}
	return WarrantyRenewalStatusActive
}

// CreateWarranty creates a new warranty record with auto-set renewal_status.
func (s *LicenseService) CreateWarranty(ctx context.Context, req CreateWarrantyRequest) (Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Warranty{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	renewalStatus := determineRenewalStatus(req.EndDate)
	if req.RenewalStatus != nil {
		renewalStatus = *req.RenewalStatus
	}

	query := `
		INSERT INTO warranties (
			id, asset_id, tenant_id, vendor, contract_number,
			coverage_type, start_date, end_date,
			cost, renewal_status,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10,
			$11, $12
		)
		RETURNING ` + warrantyColumns

	warranty, err := scanWarranty(s.pool.QueryRow(ctx, query,
		id, req.AssetID, auth.TenantID, req.Vendor, req.ContractNumber,
		req.CoverageType, req.StartDate, req.EndDate,
		req.Cost, renewalStatus,
		now, now,
	))
	if err != nil {
		return Warranty{}, apperrors.Internal("failed to create warranty", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"asset_id": req.AssetID,
		"vendor":   req.Vendor,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:warranty",
		EntityType: "warranty",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return warranty, nil
}

// GetWarranty retrieves a single warranty by ID.
func (s *LicenseService) GetWarranty(ctx context.Context, id uuid.UUID) (Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Warranty{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + warrantyColumns + ` FROM warranties WHERE id = $1 AND tenant_id = $2`

	warranty, err := scanWarranty(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Warranty{}, apperrors.NotFound("Warranty", id.String())
		}
		return Warranty{}, apperrors.Internal("failed to get warranty", err)
	}

	return warranty, nil
}

// ListWarranties returns a filtered, paginated list of warranties.
func (s *LicenseService) ListWarranties(ctx context.Context, renewalStatus *string, assetID *uuid.UUID, params types.PaginationParams) ([]Warranty, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM warranties
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR renewal_status = $2)
			AND ($3::uuid IS NULL OR asset_id = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery,
		auth.TenantID, renewalStatus, assetID,
	).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count warranties", err)
	}

	dataQuery := `
		SELECT ` + warrantyColumns + `
		FROM warranties
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR renewal_status = $2)
			AND ($3::uuid IS NULL OR asset_id = $3)
		ORDER BY end_date ASC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, renewalStatus, assetID,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list warranties", err)
	}
	defer rows.Close()

	warranties, err := scanWarranties(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan warranties", err)
	}

	return warranties, total, nil
}

// UpdateWarranty updates an existing warranty using COALESCE partial update.
func (s *LicenseService) UpdateWarranty(ctx context.Context, id uuid.UUID, req UpdateWarrantyRequest) (Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Warranty{}, apperrors.Unauthorized("authentication required")
	}

	// Verify warranty exists.
	_, err := s.GetWarranty(ctx, id)
	if err != nil {
		return Warranty{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE warranties SET
			vendor = COALESCE($1, vendor),
			contract_number = COALESCE($2, contract_number),
			coverage_type = COALESCE($3, coverage_type),
			start_date = COALESCE($4, start_date),
			end_date = COALESCE($5, end_date),
			cost = COALESCE($6, cost),
			renewal_status = COALESCE($7, renewal_status),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING ` + warrantyColumns

	warranty, err := scanWarranty(s.pool.QueryRow(ctx, updateQuery,
		req.Vendor, req.ContractNumber, req.CoverageType,
		req.StartDate, req.EndDate,
		req.Cost, req.RenewalStatus,
		now, id, auth.TenantID,
	))
	if err != nil {
		return Warranty{}, apperrors.Internal("failed to update warranty", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:warranty",
		EntityType: "warranty",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return warranty, nil
}

// DeleteWarranty deletes a warranty.
func (s *LicenseService) DeleteWarranty(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM warranties WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete warranty", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Warranty", id.String())
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:warranty",
		EntityType: "warranty",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ListExpiringWarranties returns warranties expiring within the given number of days.
func (s *LicenseService) ListExpiringWarranties(ctx context.Context, days int) ([]Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT ` + warrantyColumns + `
		FROM warranties
		WHERE tenant_id = $1
			AND end_date > NOW()
			AND end_date <= NOW() + ($2 || ' days')::interval
		ORDER BY end_date ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, days)
	if err != nil {
		return nil, apperrors.Internal("failed to list expiring warranties", err)
	}
	defer rows.Close()

	warranties, err := scanWarranties(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan expiring warranties", err)
	}

	return warranties, nil
}

// ──────────────────────────────────────────────
// Renewal Alerts
// ──────────────────────────────────────────────

// CreateRenewalAlert creates a new renewal alert.
func (s *LicenseService) CreateRenewalAlert(ctx context.Context, req CreateRenewalAlertRequest) (RenewalAlert, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return RenewalAlert{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO renewal_alerts (
			id, tenant_id, entity_type, entity_id,
			alert_date, sent, created_at
		) VALUES (
			$1, $2, $3, $4,
			$5, false, $6
		)
		RETURNING id, tenant_id, entity_type, entity_id, alert_date, sent, created_at`

	var alert RenewalAlert
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.EntityType, req.EntityID,
		req.AlertDate, now,
	).Scan(
		&alert.ID, &alert.TenantID, &alert.EntityType, &alert.EntityID,
		&alert.AlertDate, &alert.Sent, &alert.CreatedAt,
	)
	if err != nil {
		return RenewalAlert{}, apperrors.Internal("failed to create renewal alert", err)
	}

	return alert, nil
}

// ListPendingAlerts returns all unsent renewal alerts for the tenant.
func (s *LicenseService) ListPendingAlerts(ctx context.Context) ([]RenewalAlert, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, entity_type, entity_id, alert_date, sent, created_at
		FROM renewal_alerts
		WHERE tenant_id = $1 AND sent = false
		ORDER BY alert_date ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list pending alerts", err)
	}
	defer rows.Close()

	var alerts []RenewalAlert
	for rows.Next() {
		var a RenewalAlert
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.EntityType, &a.EntityID,
			&a.AlertDate, &a.Sent, &a.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan renewal alert", err)
		}
		alerts = append(alerts, a)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate renewal alerts", err)
	}

	if alerts == nil {
		alerts = []RenewalAlert{}
	}

	return alerts, nil
}

// MarkAlertSent marks a renewal alert as sent.
func (s *LicenseService) MarkAlertSent(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		UPDATE renewal_alerts SET sent = true
		WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to mark alert as sent", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("RenewalAlert", id.String())
	}

	return nil
}
