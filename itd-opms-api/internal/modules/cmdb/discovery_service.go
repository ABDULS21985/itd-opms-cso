package cmdb

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
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
// DiscoveryService
// ──────────────────────────────────────────────

// DiscoveryService handles business logic for CMDB discovery profiles, runs, and reconciliation.
type DiscoveryService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewDiscoveryService creates a new DiscoveryService.
func NewDiscoveryService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *DiscoveryService {
	return &DiscoveryService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

const discoveryProfileColumns = `
	id, tenant_id, name, description, scan_type, configuration,
	schedule, is_active, last_run_at, created_by,
	created_at, updated_at`

const discoveryProfileSelectColumns = `
	p.id, p.tenant_id, p.name, p.description, p.scan_type, p.configuration,
	p.schedule, p.is_active, p.last_run_at, p.created_by,
	p.created_at, p.updated_at,
	u.display_name AS created_by_name`

const discoveryRunColumns = `
	id, tenant_id, profile_id, status,
	started_at, completed_at,
	devices_found, new_cis, updated_cis,
	errors, created_at`

const discoveryRunSelectColumns = `
	r.id, r.tenant_id, r.profile_id, r.status,
	r.started_at, r.completed_at,
	r.devices_found, r.new_cis, r.updated_cis,
	r.errors, r.created_at,
	p.name AS profile_name`

const discoveredDeviceColumns = `
	id, run_id, hostname, ip_address, mac_address,
	device_type, os_name, os_version, manufacturer, model,
	serial_number, open_ports, attributes,
	matched_ci_id, match_confidence, action, created_at`

func scanDiscoveryProfile(row pgx.Row) (DiscoveryProfile, error) {
	var p DiscoveryProfile
	err := row.Scan(
		&p.ID, &p.TenantID, &p.Name, &p.Description, &p.ScanType, &p.Configuration,
		&p.Schedule, &p.IsActive, &p.LastRunAt, &p.CreatedBy,
		&p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

func scanDiscoveryProfileEnriched(row pgx.Row) (DiscoveryProfile, error) {
	var p DiscoveryProfile
	err := row.Scan(
		&p.ID, &p.TenantID, &p.Name, &p.Description, &p.ScanType, &p.Configuration,
		&p.Schedule, &p.IsActive, &p.LastRunAt, &p.CreatedBy,
		&p.CreatedAt, &p.UpdatedAt,
		&p.CreatedByName,
	)
	return p, err
}

func scanDiscoveryProfilesEnriched(rows pgx.Rows) ([]DiscoveryProfile, error) {
	var profiles []DiscoveryProfile
	for rows.Next() {
		var p DiscoveryProfile
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.Description, &p.ScanType, &p.Configuration,
			&p.Schedule, &p.IsActive, &p.LastRunAt, &p.CreatedBy,
			&p.CreatedAt, &p.UpdatedAt,
			&p.CreatedByName,
		); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if profiles == nil {
		profiles = []DiscoveryProfile{}
	}
	return profiles, nil
}

func scanDiscoveryRun(row pgx.Row) (DiscoveryRun, error) {
	var r DiscoveryRun
	err := row.Scan(
		&r.ID, &r.TenantID, &r.ProfileID, &r.Status,
		&r.StartedAt, &r.CompletedAt,
		&r.DevicesFound, &r.NewCIs, &r.UpdatedCIs,
		&r.Errors, &r.CreatedAt,
	)
	return r, err
}

func scanDiscoveryRunEnriched(row pgx.Row) (DiscoveryRun, error) {
	var r DiscoveryRun
	err := row.Scan(
		&r.ID, &r.TenantID, &r.ProfileID, &r.Status,
		&r.StartedAt, &r.CompletedAt,
		&r.DevicesFound, &r.NewCIs, &r.UpdatedCIs,
		&r.Errors, &r.CreatedAt,
		&r.ProfileName,
	)
	return r, err
}

func scanDiscoveryRunsEnriched(rows pgx.Rows) ([]DiscoveryRun, error) {
	var runs []DiscoveryRun
	for rows.Next() {
		var r DiscoveryRun
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.ProfileID, &r.Status,
			&r.StartedAt, &r.CompletedAt,
			&r.DevicesFound, &r.NewCIs, &r.UpdatedCIs,
			&r.Errors, &r.CreatedAt,
			&r.ProfileName,
		); err != nil {
			return nil, err
		}
		runs = append(runs, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if runs == nil {
		runs = []DiscoveryRun{}
	}
	return runs, nil
}

func scanDiscoveredDevice(row pgx.Row) (DiscoveredDevice, error) {
	var d DiscoveredDevice
	err := row.Scan(
		&d.ID, &d.RunID, &d.Hostname, &d.IPAddress, &d.MACAddress,
		&d.DeviceType, &d.OSName, &d.OSVersion, &d.Manufacturer, &d.Model,
		&d.SerialNumber, &d.OpenPorts, &d.Attributes,
		&d.MatchedCIID, &d.MatchConfidence, &d.Action, &d.CreatedAt,
	)
	return d, err
}

func scanDiscoveredDevices(rows pgx.Rows) ([]DiscoveredDevice, error) {
	var devices []DiscoveredDevice
	for rows.Next() {
		var d DiscoveredDevice
		if err := rows.Scan(
			&d.ID, &d.RunID, &d.Hostname, &d.IPAddress, &d.MACAddress,
			&d.DeviceType, &d.OSName, &d.OSVersion, &d.Manufacturer, &d.Model,
			&d.SerialNumber, &d.OpenPorts, &d.Attributes,
			&d.MatchedCIID, &d.MatchConfidence, &d.Action, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if devices == nil {
		devices = []DiscoveredDevice{}
	}
	return devices, nil
}

// ──────────────────────────────────────────────
// Profile CRUD
// ──────────────────────────────────────────────

// CreateProfile creates a new discovery profile.
func (s *DiscoveryService) CreateProfile(ctx context.Context, req CreateDiscoveryProfileRequest) (DiscoveryProfile, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryProfile{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	config := json.RawMessage("{}")
	if req.Configuration != nil {
		config = req.Configuration
	}

	query := `
		INSERT INTO discovery_profiles (
			id, tenant_id, name, description, scan_type, configuration,
			schedule, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING ` + discoveryProfileColumns

	profile, err := scanDiscoveryProfile(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.ScanType, config,
		req.Schedule, auth.UserID, now, now,
	))
	if err != nil {
		return DiscoveryProfile{}, apperrors.Internal("failed to create discovery profile", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name, "scan_type": req.ScanType})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:discovery_profile",
		EntityType: "discovery_profile",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return profile, nil
}

// GetProfile retrieves a single discovery profile by ID.
func (s *DiscoveryService) GetProfile(ctx context.Context, id uuid.UUID) (DiscoveryProfile, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryProfile{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + discoveryProfileSelectColumns + `
		FROM discovery_profiles p
		LEFT JOIN users u ON u.id = p.created_by
		WHERE p.id = $1 AND p.tenant_id = $2`

	profile, err := scanDiscoveryProfileEnriched(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return DiscoveryProfile{}, apperrors.NotFound("DiscoveryProfile", id.String())
		}
		return DiscoveryProfile{}, apperrors.Internal("failed to get discovery profile", err)
	}

	return profile, nil
}

// ListProfiles returns a filtered, paginated list of discovery profiles.
func (s *DiscoveryService) ListProfiles(ctx context.Context, scanType *string, isActive *bool, params types.PaginationParams) ([]DiscoveryProfile, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count query.
	countQuery := `SELECT COUNT(*) FROM discovery_profiles
		WHERE tenant_id = $1
		  AND ($2::text IS NULL OR scan_type = $2)
		  AND ($3::boolean IS NULL OR is_active = $3)`

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, scanType, isActive).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count discovery profiles", err)
	}

	// List query.
	query := `SELECT ` + discoveryProfileSelectColumns + `
		FROM discovery_profiles p
		LEFT JOIN users u ON u.id = p.created_by
		WHERE p.tenant_id = $1
		  AND ($2::text IS NULL OR p.scan_type = $2)
		  AND ($3::boolean IS NULL OR p.is_active = $3)
		ORDER BY p.created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, scanType, isActive, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list discovery profiles", err)
	}
	defer rows.Close()

	profiles, err := scanDiscoveryProfilesEnriched(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan discovery profiles", err)
	}

	return profiles, total, nil
}

// UpdateProfile updates an existing discovery profile.
func (s *DiscoveryService) UpdateProfile(ctx context.Context, id uuid.UUID, req UpdateDiscoveryProfileRequest) (DiscoveryProfile, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryProfile{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		UPDATE discovery_profiles SET
			name = COALESCE($3, name),
			description = COALESCE($4, description),
			scan_type = COALESCE($5, scan_type),
			configuration = COALESCE($6, configuration),
			schedule = COALESCE($7, schedule),
			is_active = COALESCE($8, is_active),
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING ` + discoveryProfileColumns

	profile, err := scanDiscoveryProfile(s.pool.QueryRow(ctx, query,
		id, auth.TenantID,
		req.Name, req.Description, req.ScanType, req.Configuration,
		req.Schedule, req.IsActive,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return DiscoveryProfile{}, apperrors.NotFound("DiscoveryProfile", id.String())
		}
		return DiscoveryProfile{}, apperrors.Internal("failed to update discovery profile", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:discovery_profile",
		EntityType: "discovery_profile",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return profile, nil
}

// DeleteProfile deletes a discovery profile if it has no runs.
func (s *DiscoveryService) DeleteProfile(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Check for existing runs.
	var runCount int
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM discovery_runs WHERE profile_id = $1`,
		id,
	).Scan(&runCount); err != nil {
		return apperrors.Internal("failed to check runs", err)
	}
	if runCount > 0 {
		return apperrors.BadRequest(fmt.Sprintf("cannot delete profile with %d existing runs", runCount))
	}

	tag, err := s.pool.Exec(ctx,
		`DELETE FROM discovery_profiles WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete discovery profile", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("DiscoveryProfile", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:discovery_profile",
		EntityType: "discovery_profile",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Run management
// ──────────────────────────────────────────────

// TriggerRun creates a new discovery run for the given profile.
// For 'csv_import' profiles, use ImportCSV instead. For 'network', 'ad_import', 'sccm'
// this creates a placeholder run marked as requiring agent deployment.
func (s *DiscoveryService) TriggerRun(ctx context.Context, profileID uuid.UUID) (DiscoveryRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryRun{}, apperrors.Unauthorized("authentication required")
	}

	// Verify profile exists and belongs to tenant.
	var scanType string
	if err := s.pool.QueryRow(ctx,
		`SELECT scan_type FROM discovery_profiles WHERE id = $1 AND tenant_id = $2`,
		profileID, auth.TenantID,
	).Scan(&scanType); err != nil {
		if err == pgx.ErrNoRows {
			return DiscoveryRun{}, apperrors.NotFound("DiscoveryProfile", profileID.String())
		}
		return DiscoveryRun{}, apperrors.Internal("failed to look up profile", err)
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Determine initial status based on scan type.
	status := "pending"
	var errorsJSON json.RawMessage

	switch scanType {
	case "csv_import":
		return DiscoveryRun{}, apperrors.BadRequest("use the CSV import endpoint for csv_import profiles")
	case "network":
		// Stub: network scanning requires agent deployment.
		errorsJSON, _ = json.Marshal([]map[string]string{
			{"type": "info", "message": "Network scan requires agent deployment. Configure the discovery agent with this profile ID."},
		})
		status = "pending"
	case "ad_import":
		// Stub: AD import would connect via MS Graph.
		errorsJSON, _ = json.Marshal([]map[string]string{
			{"type": "info", "message": "AD import requires MS Graph integration. Configure Graph service account."},
		})
		status = "pending"
	case "sccm":
		// Stub: SCCM import would connect to SCCM API.
		errorsJSON, _ = json.Marshal([]map[string]string{
			{"type": "info", "message": "SCCM import requires SCCM connector configuration."},
		})
		status = "pending"
	}

	if errorsJSON == nil {
		errorsJSON = json.RawMessage("[]")
	}

	query := `
		INSERT INTO discovery_runs (
			id, tenant_id, profile_id, status, started_at, errors, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING ` + discoveryRunColumns

	run, err := scanDiscoveryRun(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, profileID, status, now, errorsJSON, now,
	))
	if err != nil {
		return DiscoveryRun{}, apperrors.Internal("failed to create discovery run", err)
	}

	// Update profile's last_run_at.
	_, _ = s.pool.Exec(ctx,
		`UPDATE discovery_profiles SET last_run_at = $1, updated_at = $1 WHERE id = $2`,
		now, profileID,
	)

	changes, _ := json.Marshal(map[string]any{"profile_id": profileID, "scan_type": scanType})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:discovery_run",
		EntityType: "discovery_run",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return run, nil
}

// GetRun retrieves a single discovery run by ID with profile name enrichment.
func (s *DiscoveryService) GetRun(ctx context.Context, id uuid.UUID) (DiscoveryRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryRun{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + discoveryRunSelectColumns + `
		FROM discovery_runs r
		LEFT JOIN discovery_profiles p ON p.id = r.profile_id
		WHERE r.id = $1 AND r.tenant_id = $2`

	run, err := scanDiscoveryRunEnriched(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return DiscoveryRun{}, apperrors.NotFound("DiscoveryRun", id.String())
		}
		return DiscoveryRun{}, apperrors.Internal("failed to get discovery run", err)
	}

	return run, nil
}

// ListRuns returns a filtered, paginated list of discovery runs.
func (s *DiscoveryService) ListRuns(ctx context.Context, profileID *uuid.UUID, status *string, params types.PaginationParams) ([]DiscoveryRun, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `SELECT COUNT(*) FROM discovery_runs
		WHERE tenant_id = $1
		  AND ($2::uuid IS NULL OR profile_id = $2)
		  AND ($3::text IS NULL OR status = $3)`

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, profileID, status).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count discovery runs", err)
	}

	query := `SELECT ` + discoveryRunSelectColumns + `
		FROM discovery_runs r
		LEFT JOIN discovery_profiles p ON p.id = r.profile_id
		WHERE r.tenant_id = $1
		  AND ($2::uuid IS NULL OR r.profile_id = $2)
		  AND ($3::text IS NULL OR r.status = $3)
		ORDER BY r.created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, profileID, status, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list discovery runs", err)
	}
	defer rows.Close()

	runs, err := scanDiscoveryRunsEnriched(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan discovery runs", err)
	}

	return runs, total, nil
}

// GetRunDevices returns discovered devices for a run with pagination.
func (s *DiscoveryService) GetRunDevices(ctx context.Context, runID uuid.UUID, action *string, params types.PaginationParams) ([]DiscoveredDevice, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Verify run belongs to tenant.
	var exists bool
	if err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM discovery_runs WHERE id = $1 AND tenant_id = $2)`,
		runID, auth.TenantID,
	).Scan(&exists); err != nil || !exists {
		return nil, 0, apperrors.NotFound("DiscoveryRun", runID.String())
	}

	countQuery := `SELECT COUNT(*) FROM discovered_devices
		WHERE run_id = $1
		  AND ($2::text IS NULL OR action = $2)`

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, runID, action).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count discovered devices", err)
	}

	query := `SELECT ` + discoveredDeviceColumns + `
		FROM discovered_devices
		WHERE run_id = $1
		  AND ($2::text IS NULL OR action = $2)
		ORDER BY COALESCE(match_confidence, 0) DESC, hostname
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, query, runID, action, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list discovered devices", err)
	}
	defer rows.Close()

	devices, err := scanDiscoveredDevices(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan discovered devices", err)
	}

	return devices, total, nil
}

// ──────────────────────────────────────────────
// CSV Import
// ──────────────────────────────────────────────

const maxCSVFileSize = 10 << 20 // 10 MB

// ImportCSV parses a CSV file and creates a discovery run with discovered devices.
func (s *DiscoveryService) ImportCSV(ctx context.Context, file multipart.File, header *multipart.FileHeader, profileID *uuid.UUID) (DiscoveryRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryRun{}, apperrors.Unauthorized("authentication required")
	}

	if header.Size > maxCSVFileSize {
		return DiscoveryRun{}, apperrors.BadRequest("CSV file exceeds 10MB limit")
	}

	// If no profile specified, find or create an ad-hoc csv_import profile.
	actualProfileID := uuid.Nil
	if profileID != nil {
		actualProfileID = *profileID
	} else {
		// Look for existing ad-hoc csv profile.
		err := s.pool.QueryRow(ctx,
			`SELECT id FROM discovery_profiles
			 WHERE tenant_id = $1 AND scan_type = 'csv_import' AND name = 'Ad-hoc CSV Import'
			 LIMIT 1`,
			auth.TenantID,
		).Scan(&actualProfileID)
		if err != nil {
			// Create one.
			actualProfileID = uuid.New()
			now := time.Now().UTC()
			_, err = s.pool.Exec(ctx,
				`INSERT INTO discovery_profiles (id, tenant_id, name, scan_type, configuration, created_by, created_at, updated_at)
				 VALUES ($1, $2, 'Ad-hoc CSV Import', 'csv_import', '{}', $3, $4, $5)`,
				actualProfileID, auth.TenantID, auth.UserID, now, now,
			)
			if err != nil {
				return DiscoveryRun{}, apperrors.Internal("failed to create ad-hoc profile", err)
			}
		}
	}

	// Parse CSV.
	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	headers, err := reader.Read()
	if err != nil {
		return DiscoveryRun{}, apperrors.BadRequest("failed to read CSV headers: " + err.Error())
	}

	// Map headers to column indices.
	colMap := make(map[string]int)
	for i, h := range headers {
		colMap[strings.ToLower(strings.TrimSpace(h))] = i
	}

	// Require at least hostname or ip_address.
	hasHostname := colMap["hostname"] >= 0 || colMap["host_name"] >= 0 || colMap["host"] >= 0
	hasIP := colMap["ip_address"] >= 0 || colMap["ip"] >= 0 || colMap["ipaddress"] >= 0
	if !hasHostname && !hasIP {
		return DiscoveryRun{}, apperrors.BadRequest("CSV must contain at least a 'hostname' or 'ip_address' column")
	}

	// Create discovery run.
	runID := uuid.New()
	now := time.Now().UTC()
	_, err = s.pool.Exec(ctx,
		`INSERT INTO discovery_runs (id, tenant_id, profile_id, status, started_at, created_at)
		 VALUES ($1, $2, $3, 'scanning', $4, $5)`,
		runID, auth.TenantID, actualProfileID, now, now,
	)
	if err != nil {
		return DiscoveryRun{}, apperrors.Internal("failed to create discovery run", err)
	}

	// Parse rows and batch insert devices.
	var devices int
	var parseErrors []map[string]string

	for rowNum := 2; ; rowNum++ {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			parseErrors = append(parseErrors, map[string]string{
				"row": fmt.Sprintf("%d", rowNum), "error": err.Error(),
			})
			continue
		}

		d := s.csvRowToDevice(colMap, record)
		if d.Hostname == nil && d.IPAddress == nil {
			parseErrors = append(parseErrors, map[string]string{
				"row": fmt.Sprintf("%d", rowNum), "error": "missing hostname and ip_address",
			})
			continue
		}

		deviceID := uuid.New()
		_, err = s.pool.Exec(ctx,
			`INSERT INTO discovered_devices (
				id, run_id, hostname, ip_address, mac_address,
				device_type, os_name, os_version, manufacturer, model,
				serial_number, attributes
			) VALUES ($1, $2, $3, $4::inet, $5::macaddr, $6, $7, $8, $9, $10, $11, $12)`,
			deviceID, runID, d.Hostname, d.IPAddress, d.MACAddress,
			d.DeviceType, d.OSName, d.OSVersion, d.Manufacturer, d.Model,
			d.SerialNumber, json.RawMessage("{}"),
		)
		if err != nil {
			parseErrors = append(parseErrors, map[string]string{
				"row": fmt.Sprintf("%d", rowNum), "error": "insert failed: " + err.Error(),
			})
			continue
		}
		devices++
	}

	// Run CI matching.
	matchResult, err := s.matchDevices(ctx, runID, auth.TenantID)
	if err != nil {
		slog.ErrorContext(ctx, "device matching failed", "error", err)
	}

	// Update run with results.
	errorsJSON, _ := json.Marshal(parseErrors)
	if parseErrors == nil {
		errorsJSON = json.RawMessage("[]")
	}

	status := "reconciling"
	if devices == 0 {
		status = "failed"
	}

	_, _ = s.pool.Exec(ctx,
		`UPDATE discovery_runs
		 SET status = $2, devices_found = $3, new_cis = $4, updated_cis = $5,
		     errors = $6
		 WHERE id = $1`,
		runID, status, devices, matchResult.newCount, matchResult.updateCount, errorsJSON,
	)

	// Update profile's last_run_at.
	_, _ = s.pool.Exec(ctx,
		`UPDATE discovery_profiles SET last_run_at = $1, updated_at = $1 WHERE id = $2`,
		now, actualProfileID,
	)

	// Fetch the complete run.
	run, _ := s.GetRun(ctx, runID)

	changes, _ := json.Marshal(map[string]any{
		"profile_id":    actualProfileID,
		"filename":      header.Filename,
		"devices_found": devices,
		"parse_errors":  len(parseErrors),
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "import:discovery_csv",
		EntityType: "discovery_run",
		EntityID:   runID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return run, nil
}

// csvRowToDevice extracts device fields from a CSV row using the column map.
func (s *DiscoveryService) csvRowToDevice(colMap map[string]int, record []string) DiscoveredDevice {
	get := func(keys ...string) *string {
		for _, k := range keys {
			if idx, ok := colMap[k]; ok && idx < len(record) {
				v := strings.TrimSpace(record[idx])
				if v != "" {
					return &v
				}
			}
		}
		return nil
	}

	return DiscoveredDevice{
		Hostname:     get("hostname", "host_name", "host"),
		IPAddress:    get("ip_address", "ip", "ipaddress"),
		MACAddress:   get("mac_address", "mac", "macaddress"),
		DeviceType:   get("device_type", "type", "devicetype"),
		OSName:       get("os_name", "os", "osname", "operating_system"),
		OSVersion:    get("os_version", "osversion"),
		Manufacturer: get("manufacturer", "vendor", "make"),
		Model:        get("model"),
		SerialNumber: get("serial_number", "serial", "serialnumber"),
	}
}

// ──────────────────────────────────────────────
// CI Matching
// ──────────────────────────────────────────────

type matchResult struct {
	newCount    int
	updateCount int
	noChange    int
	conflicts   int
}

// matchDevices attempts to match discovered devices against existing cmdb_items.
func (s *DiscoveryService) matchDevices(ctx context.Context, runID, tenantID uuid.UUID) (matchResult, error) {
	var result matchResult

	// Fetch all discovered devices for this run.
	rows, err := s.pool.Query(ctx,
		`SELECT `+discoveredDeviceColumns+` FROM discovered_devices WHERE run_id = $1`,
		runID,
	)
	if err != nil {
		return result, err
	}
	defer rows.Close()

	devices, err := scanDiscoveredDevices(rows)
	if err != nil {
		return result, err
	}

	for _, d := range devices {
		ciID, confidence, action := s.matchSingleDevice(ctx, tenantID, d)

		switch action {
		case "new":
			result.newCount++
		case "update":
			result.updateCount++
		case "no_change":
			result.noChange++
		case "conflict":
			result.conflicts++
		}

		// Update the discovered device with match results.
		_, _ = s.pool.Exec(ctx,
			`UPDATE discovered_devices
			 SET matched_ci_id = $2, match_confidence = $3, action = $4
			 WHERE id = $1`,
			d.ID, ciID, confidence, action,
		)
	}

	return result, nil
}

// matchSingleDevice tries to match one discovered device against cmdb_items.
// Returns: (matched CI id or nil, confidence 0.00-1.00, action string).
func (s *DiscoveryService) matchSingleDevice(ctx context.Context, tenantID uuid.UUID, d DiscoveredDevice) (*uuid.UUID, float64, string) {
	// Strategy 1: Exact serial number match (confidence 1.0).
	if d.SerialNumber != nil && *d.SerialNumber != "" {
		var ciID uuid.UUID
		var ciAttrs json.RawMessage
		var ciName string
		err := s.pool.QueryRow(ctx,
			`SELECT id, name, attributes FROM cmdb_items
			 WHERE tenant_id = $1 AND attributes->>'serial_number' = $2 AND status = 'active'
			 LIMIT 1`,
			tenantID, *d.SerialNumber,
		).Scan(&ciID, &ciName, &ciAttrs)
		if err == nil {
			action := s.determineAction(d, ciName, ciAttrs)
			return &ciID, 1.00, action
		}
	}

	// Strategy 2: MAC address match (confidence 0.95).
	if d.MACAddress != nil && *d.MACAddress != "" {
		var ciID uuid.UUID
		var ciAttrs json.RawMessage
		var ciName string
		err := s.pool.QueryRow(ctx,
			`SELECT id, name, attributes FROM cmdb_items
			 WHERE tenant_id = $1 AND LOWER(attributes->>'mac_address') = LOWER($2) AND status = 'active'
			 LIMIT 1`,
			tenantID, *d.MACAddress,
		).Scan(&ciID, &ciName, &ciAttrs)
		if err == nil {
			action := s.determineAction(d, ciName, ciAttrs)
			return &ciID, 0.95, action
		}
	}

	// Strategy 3: Hostname + IP match (confidence 0.80).
	if d.Hostname != nil && d.IPAddress != nil && *d.Hostname != "" && *d.IPAddress != "" {
		var ciID uuid.UUID
		var ciAttrs json.RawMessage
		var ciName string
		err := s.pool.QueryRow(ctx,
			`SELECT id, name, attributes FROM cmdb_items
			 WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND attributes->>'ip_address' = $3 AND status = 'active'
			 LIMIT 1`,
			tenantID, *d.Hostname, *d.IPAddress,
		).Scan(&ciID, &ciName, &ciAttrs)
		if err == nil {
			action := s.determineAction(d, ciName, ciAttrs)
			return &ciID, 0.80, action
		}
	}

	// Strategy 4: Hostname only match (confidence 0.60).
	if d.Hostname != nil && *d.Hostname != "" {
		var ciID uuid.UUID
		var ciAttrs json.RawMessage
		var ciName string
		err := s.pool.QueryRow(ctx,
			`SELECT id, name, attributes FROM cmdb_items
			 WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND status = 'active'
			 LIMIT 1`,
			tenantID, *d.Hostname,
		).Scan(&ciID, &ciName, &ciAttrs)
		if err == nil {
			action := s.determineAction(d, ciName, ciAttrs)
			return &ciID, 0.60, action
		}
	}

	// No match found — new device.
	return nil, 0.00, "new"
}

// determineAction compares discovered attributes with existing CI attributes.
func (s *DiscoveryService) determineAction(d DiscoveredDevice, ciName string, ciAttrs json.RawMessage) string {
	var attrs map[string]any
	if err := json.Unmarshal(ciAttrs, &attrs); err != nil {
		return "conflict" // Can't parse existing attributes.
	}

	changes := 0
	conflicts := 0

	// Compare key fields.
	comparisons := []struct {
		discovered *string
		existing   string
	}{
		{d.OSName, fmt.Sprintf("%v", attrs["os_name"])},
		{d.OSVersion, fmt.Sprintf("%v", attrs["os_version"])},
		{d.Manufacturer, fmt.Sprintf("%v", attrs["manufacturer"])},
		{d.Model, fmt.Sprintf("%v", attrs["model"])},
	}

	for _, c := range comparisons {
		if c.discovered == nil || *c.discovered == "" {
			continue
		}
		existingVal := c.existing
		if existingVal == "<nil>" || existingVal == "" {
			changes++ // New data available.
			continue
		}
		if !strings.EqualFold(*c.discovered, existingVal) {
			conflicts++ // Values differ.
		}
	}

	// Check if hostname changed.
	if d.Hostname != nil && *d.Hostname != "" && !strings.EqualFold(*d.Hostname, ciName) {
		conflicts++
	}

	if conflicts > 0 {
		return "conflict"
	}
	if changes > 0 {
		return "update"
	}
	return "no_change"
}

// ──────────────────────────────────────────────
// Reconciliation
// ──────────────────────────────────────────────

// ReconcileRun applies approved discovery results to the CMDB.
func (s *DiscoveryService) ReconcileRun(ctx context.Context, runID uuid.UUID, req ReconcileDiscoveryRequest) (DiscoveryRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryRun{}, apperrors.Unauthorized("authentication required")
	}

	// Verify run belongs to tenant and is in reconciling status.
	var runStatus string
	if err := s.pool.QueryRow(ctx,
		`SELECT status FROM discovery_runs WHERE id = $1 AND tenant_id = $2`,
		runID, auth.TenantID,
	).Scan(&runStatus); err != nil {
		if err == pgx.ErrNoRows {
			return DiscoveryRun{}, apperrors.NotFound("DiscoveryRun", runID.String())
		}
		return DiscoveryRun{}, apperrors.Internal("failed to get run", err)
	}
	if runStatus != "reconciling" {
		return DiscoveryRun{}, apperrors.BadRequest("run must be in 'reconciling' status to reconcile")
	}

	now := time.Now().UTC()
	var newCount, updateCount int

	for _, deviceID := range req.DeviceIDs {
		var d DiscoveredDevice
		err := s.pool.QueryRow(ctx,
			`SELECT `+discoveredDeviceColumns+` FROM discovered_devices WHERE id = $1 AND run_id = $2`,
			deviceID, runID,
		).Scan(
			&d.ID, &d.RunID, &d.Hostname, &d.IPAddress, &d.MACAddress,
			&d.DeviceType, &d.OSName, &d.OSVersion, &d.Manufacturer, &d.Model,
			&d.SerialNumber, &d.OpenPorts, &d.Attributes,
			&d.MatchedCIID, &d.MatchConfidence, &d.Action, &d.CreatedAt,
		)
		if err != nil {
			continue
		}

		switch {
		case d.Action != nil && *d.Action == "new":
			// Create new cmdb_item.
			ciID := uuid.New()
			ciName := ""
			if d.Hostname != nil {
				ciName = *d.Hostname
			} else if d.IPAddress != nil {
				ciName = *d.IPAddress
			}

			ciType := "network_device"
			if d.DeviceType != nil {
				ciType = *d.DeviceType
			}

			attrs := s.buildCIAttributes(d)

			_, err = s.pool.Exec(ctx,
				`INSERT INTO cmdb_items (id, tenant_id, ci_type, name, status, attributes, version, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, 'active', $5, 1, $6, $7)`,
				ciID, auth.TenantID, ciType, ciName, attrs, now, now,
			)
			if err == nil {
				newCount++
				// Link device to new CI.
				_, _ = s.pool.Exec(ctx,
					`UPDATE discovered_devices SET matched_ci_id = $1 WHERE id = $2`,
					ciID, deviceID,
				)
			}

		case d.Action != nil && (*d.Action == "update" || *d.Action == "conflict"):
			if d.MatchedCIID == nil {
				continue
			}
			// Update existing cmdb_item attributes.
			attrs := s.buildCIAttributes(d)
			_, err = s.pool.Exec(ctx,
				`UPDATE cmdb_items SET attributes = $3, version = version + 1, updated_at = $4
				 WHERE id = $1 AND tenant_id = $2`,
				*d.MatchedCIID, auth.TenantID, attrs, now,
			)
			if err == nil {
				updateCount++
			}
		}
	}

	// Create a reconciliation_run record to link discovery with reconciliation.
	reconID := uuid.New()
	reconReport, _ := json.Marshal(map[string]any{
		"discovery_run_id": runID,
		"devices_approved": len(req.DeviceIDs),
		"new_cis":          newCount,
		"updated_cis":      updateCount,
	})
	_, _ = s.pool.Exec(ctx,
		`INSERT INTO reconciliation_runs (id, tenant_id, source, started_at, completed_at, matches, discrepancies, new_items, report, created_at)
		 VALUES ($1, $2, 'discovery', $3, $4, $5, 0, $6, $7, $8)`,
		reconID, auth.TenantID, now, now, updateCount, newCount, reconReport, now,
	)

	// Mark discovery run as completed.
	_, _ = s.pool.Exec(ctx,
		`UPDATE discovery_runs SET status = 'completed', completed_at = $2, new_cis = $3, updated_cis = $4 WHERE id = $1`,
		runID, now, newCount, updateCount,
	)

	changes, _ := json.Marshal(map[string]any{
		"run_id":      runID,
		"new_cis":     newCount,
		"updated_cis": updateCount,
		"approved":    len(req.DeviceIDs),
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "reconcile:discovery_run",
		EntityType: "discovery_run",
		EntityID:   runID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return s.GetRun(ctx, runID)
}

// buildCIAttributes creates a CMDB attributes JSON from discovered device data.
func (s *DiscoveryService) buildCIAttributes(d DiscoveredDevice) json.RawMessage {
	attrs := map[string]any{}
	if d.IPAddress != nil {
		attrs["ip_address"] = *d.IPAddress
	}
	if d.MACAddress != nil {
		attrs["mac_address"] = *d.MACAddress
	}
	if d.OSName != nil {
		attrs["os_name"] = *d.OSName
	}
	if d.OSVersion != nil {
		attrs["os_version"] = *d.OSVersion
	}
	if d.Manufacturer != nil {
		attrs["manufacturer"] = *d.Manufacturer
	}
	if d.Model != nil {
		attrs["model"] = *d.Model
	}
	if d.SerialNumber != nil {
		attrs["serial_number"] = *d.SerialNumber
	}
	if d.OpenPorts != nil && len(d.OpenPorts) > 0 {
		attrs["open_ports"] = d.OpenPorts
	}
	result, _ := json.Marshal(attrs)
	return result
}

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────

// GetDiscoveryStats returns aggregate discovery statistics for the dashboard.
func (s *DiscoveryService) GetDiscoveryStats(ctx context.Context) (DiscoveryStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DiscoveryStats{}, apperrors.Unauthorized("authentication required")
	}

	var stats DiscoveryStats

	err := s.pool.QueryRow(ctx,
		`SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE is_active = true)
		 FROM discovery_profiles WHERE tenant_id = $1`,
		auth.TenantID,
	).Scan(&stats.TotalProfiles, &stats.ActiveProfiles)
	if err != nil {
		return DiscoveryStats{}, apperrors.Internal("failed to get profile stats", err)
	}

	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*), MAX(started_at)
		 FROM discovery_runs WHERE tenant_id = $1`,
		auth.TenantID,
	).Scan(&stats.TotalRuns, &stats.LastRunAt)
	if err != nil {
		return DiscoveryStats{}, apperrors.Internal("failed to get run stats", err)
	}

	return stats, nil
}