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

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/connectors"
	"github.com/itd-cbn/itd-opms-api/internal/platform/metrics"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type discoveryProfileConfig struct {
	IPRanges         []string                     `json:"ipRanges"`
	IPRangesAlt      []string                     `json:"ip_ranges"`
	SNMPCommunity    string                       `json:"snmpCommunity"`
	SNMPCommunityAlt string                       `json:"snmp_community"`
	TenantID         string                       `json:"tenantId"`
	TenantIDAlt      string                       `json:"tenant_id"`
	ServerURL        string                       `json:"serverUrl"`
	ServerURLAlt     string                       `json:"server_url"`
	Endpoint         string                       `json:"endpoint"`
	APIKey           string                       `json:"apiKey"`
	APIKeyAlt        string                       `json:"api_key"`
	Username         string                       `json:"username"`
	Password         string                       `json:"password"`
	CSVData          string                       `json:"csvData"`
	CSVDataAlt       string                       `json:"csv_data"`
	CSVPath          string                       `json:"csvPath"`
	CSVPathAlt       string                       `json:"csv_path"`
	ColumnMapping    connectors.SCCMColumnMapping `json:"columnMapping"`
	ColumnMappingAlt connectors.SCCMColumnMapping `json:"column_mapping"`
}

func (c discoveryProfileConfig) resolvedIPRanges() []string {
	if len(c.IPRanges) > 0 {
		return c.IPRanges
	}
	return c.IPRangesAlt
}

func (c discoveryProfileConfig) resolvedSNMPCommunity() string {
	if value := strings.TrimSpace(c.SNMPCommunity); value != "" {
		return value
	}
	return strings.TrimSpace(c.SNMPCommunityAlt)
}

func (c discoveryProfileConfig) resolvedTenantID() string {
	if value := strings.TrimSpace(c.TenantID); value != "" {
		return value
	}
	return strings.TrimSpace(c.TenantIDAlt)
}

func (c discoveryProfileConfig) resolvedEndpoint() string {
	switch {
	case strings.TrimSpace(c.Endpoint) != "":
		return strings.TrimSpace(c.Endpoint)
	case strings.TrimSpace(c.ServerURL) != "":
		return strings.TrimSpace(c.ServerURL)
	default:
		return strings.TrimSpace(c.ServerURLAlt)
	}
}

func (c discoveryProfileConfig) resolvedAPIKey() string {
	if value := strings.TrimSpace(c.APIKey); value != "" {
		return value
	}
	return strings.TrimSpace(c.APIKeyAlt)
}

func (c discoveryProfileConfig) resolvedCSVData() string {
	if value := strings.TrimSpace(c.CSVData); value != "" {
		return value
	}
	return strings.TrimSpace(c.CSVDataAlt)
}

func (c discoveryProfileConfig) resolvedCSVPath() string {
	if value := strings.TrimSpace(c.CSVPath); value != "" {
		return value
	}
	return strings.TrimSpace(c.CSVPathAlt)
}

func (c discoveryProfileConfig) resolvedColumnMapping() connectors.SCCMColumnMapping {
	if c.ColumnMapping != (connectors.SCCMColumnMapping{}) {
		return c.ColumnMapping
	}
	return c.ColumnMappingAlt
}

// RunDiscovery executes a non-CSV discovery profile end-to-end.
func (s *DiscoveryService) RunDiscovery(ctx context.Context, profileID uuid.UUID) (DiscoveryRun, error) {
	profile, actorID, run, err := s.beginDiscoveryRun(ctx, profileID)
	if err != nil {
		return DiscoveryRun{}, err
	}

	startedAt := time.Now().UTC()
	var (
		devices     []connectors.DiscoveredDevice
		warnings    []map[string]string
		matchResult matchResult
		status      = "reconciling"
	)

	switch profile.ScanType {
	case "network":
		devices, warnings, err = s.runNetworkDiscovery(ctx, profile)
	case "ad_import":
		devices, warnings, err = s.runADDiscovery(ctx, profile)
	case "sccm":
		devices, warnings, err = s.runSCCMDiscovery(ctx, profile)
	case "csv_import":
		err = apperrors.BadRequest("use the CSV import endpoint for csv_import profiles")
	default:
		err = apperrors.BadRequest("unsupported discovery scan type")
	}

	if err == nil {
		if err = s.insertConnectorDevices(ctx, run.ID, devices); err != nil {
			err = apperrors.Internal("failed to persist discovered devices", err)
		}
	}

	if err == nil && len(devices) > 0 {
		matchResult, err = s.matchDevices(ctx, run.ID, profile.TenantID)
		if err != nil {
			err = apperrors.Internal("failed to match discovered devices", err)
		}
	}

	if err != nil {
		status = "failed"
		warnings = append(warnings, map[string]string{
			"type":    "error",
			"message": err.Error(),
		})
	} else if len(devices) == 0 {
		status = "failed"
		warnings = append(warnings, map[string]string{
			"type":    "warning",
			"message": "no devices were discovered for this profile",
		})
	}

	if finalizeErr := s.finalizeDiscoveryRun(ctx, run.ID, status, len(devices), matchResult, warnings); finalizeErr != nil {
		return DiscoveryRun{}, finalizeErr
	}

	s.recordDiscoveryMetrics(profile.ScanType, status, len(devices), startedAt)
	s.logDiscoveryRunAudit(ctx, profile.TenantID, actorID, run.ID, profile.ID, profile.ScanType, len(devices), status)

	return s.getRunByTenant(ctx, run.ID, profile.TenantID)
}

func (s *DiscoveryService) beginDiscoveryRun(ctx context.Context, profileID uuid.UUID) (DiscoveryProfile, uuid.UUID, DiscoveryRun, error) {
	auth := types.GetAuthContext(ctx)
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.Internal("failed to start discovery transaction", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	query := `SELECT ` + discoveryProfileColumns + ` FROM discovery_profiles WHERE id = $1`
	args := []any{profileID}
	if auth != nil {
		query += ` AND tenant_id = $2`
		args = append(args, auth.TenantID)
	}
	query += ` FOR UPDATE`

	profile, err := scanDiscoveryProfile(tx.QueryRow(ctx, query, args...))
	if err != nil {
		if err == pgx.ErrNoRows {
			return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.NotFound("DiscoveryProfile", profileID.String())
		}
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.Internal("failed to load discovery profile", err)
	}
	if profile.ScanType == "csv_import" {
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.BadRequest("use the CSV import endpoint for csv_import profiles")
	}

	actorID := profile.CreatedBy
	if auth != nil {
		actorID = auth.UserID
	}

	var active bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM discovery_runs
			WHERE profile_id = $1
			  AND status IN ('pending', 'scanning', 'reconciling')
		)`,
		profile.ID,
	).Scan(&active); err != nil {
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.Internal("failed to check active discovery runs", err)
	}
	if active {
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.Conflict("a discovery run is already active for this profile")
	}

	now := time.Now().UTC()
	runID := uuid.New()
	run, err := scanDiscoveryRun(tx.QueryRow(ctx,
		`INSERT INTO discovery_runs (id, tenant_id, profile_id, status, started_at, errors, created_at)
		 VALUES ($1, $2, $3, 'scanning', $4, '[]'::jsonb, $5)
		 RETURNING `+discoveryRunColumns,
		runID, profile.TenantID, profile.ID, now, now,
	))
	if err != nil {
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.Internal("failed to create discovery run", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE discovery_profiles SET last_run_at = $1, updated_at = $1 WHERE id = $2`,
		now, profile.ID,
	); err != nil {
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.Internal("failed to update discovery profile run time", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return DiscoveryProfile{}, uuid.Nil, DiscoveryRun{}, apperrors.Internal("failed to commit discovery run", err)
	}

	return profile, actorID, run, nil
}

func (s *DiscoveryService) finalizeDiscoveryRun(
	ctx context.Context,
	runID uuid.UUID,
	status string,
	devicesFound int,
	matchResult matchResult,
	warnings []map[string]string,
) error {
	errorsJSON, _ := json.Marshal(warnings)
	if errorsJSON == nil {
		errorsJSON = json.RawMessage("[]")
	}

	query := `UPDATE discovery_runs
		SET status = $2,
		    devices_found = $3,
		    new_cis = $4,
		    updated_cis = $5,
		    errors = $6`
	args := []any{runID, status, devicesFound, matchResult.newCount, matchResult.updateCount, errorsJSON}
	if status == "failed" {
		query += `, completed_at = $7 WHERE id = $1`
		args = append(args, time.Now().UTC())
	} else {
		query += ` WHERE id = $1`
	}

	if _, err := s.pool.Exec(ctx, query, args...); err != nil {
		return apperrors.Internal("failed to finalize discovery run", err)
	}

	return nil
}

func (s *DiscoveryService) insertConnectorDevices(ctx context.Context, runID uuid.UUID, devices []connectors.DiscoveredDevice) error {
	for _, device := range devices {
		attrs := device.Attributes
		if len(attrs) == 0 {
			attrs = json.RawMessage("{}")
		}

		if _, err := s.pool.Exec(ctx,
			`INSERT INTO discovered_devices (
				id, run_id, hostname, ip_address, mac_address,
				device_type, os_name, os_version, manufacturer, model,
				serial_number, open_ports, attributes
			) VALUES ($1, $2, $3, $4::inet, $5::macaddr, $6, $7, $8, $9, $10, $11, $12, $13)`,
			uuid.New(), runID, device.Hostname, device.IPAddress, device.MACAddress,
			device.DeviceType, device.OSName, device.OSVersion, device.Manufacturer, device.Model,
			device.SerialNumber, device.OpenPorts, attrs,
		); err != nil {
			return err
		}
	}
	return nil
}

func (s *DiscoveryService) runADDiscovery(ctx context.Context, profile DiscoveryProfile) ([]connectors.DiscoveredDevice, []map[string]string, error) {
	if !s.discoveryCfg.ADEnabled {
		return nil, nil, apperrors.BadRequest("AD discovery is disabled")
	}
	if s.graphClient == nil {
		return nil, nil, apperrors.BadRequest("microsoft graph is not configured")
	}

	cfg := s.loadDiscoveryProfileConfig(profile.Configuration)
	tenantID := cfg.resolvedTenantID()
	if tenantID == "" {
		tenantID = s.discoveryCfg.ADTenantID
	}

	connector := connectors.NewADDiscoveryConnector(s.graphClient)
	devices, err := connector.FetchComputers(ctx, connectors.ADConfig{TenantID: tenantID})
	return devices, nil, err
}

func (s *DiscoveryService) runNetworkDiscovery(ctx context.Context, profile DiscoveryProfile) ([]connectors.DiscoveredDevice, []map[string]string, error) {
	if !s.discoveryCfg.NetworkEnabled {
		return nil, nil, apperrors.BadRequest("network discovery is disabled")
	}

	cfg := s.loadDiscoveryProfileConfig(profile.Configuration)
	ipRanges := cfg.resolvedIPRanges()
	if len(ipRanges) == 0 {
		return nil, nil, apperrors.BadRequest("network discovery requires at least one CIDR range")
	}

	connector := connectors.NewNetworkDiscoveryConnector(connectors.NetworkConfig{
		SNMPCommunity: firstNonEmpty(cfg.resolvedSNMPCommunity(), s.discoveryCfg.SNMPCommunity),
		Timeout:       s.discoveryCfg.ScanTimeout,
		MaxConcurrent: s.discoveryCfg.MaxConcurrent,
	})

	var (
		devices  []connectors.DiscoveredDevice
		warnings []map[string]string
	)
	for _, ipRange := range ipRanges {
		found, err := connector.PingSweep(ipRange)
		if err != nil {
			return nil, warnings, err
		}
		devices = append(devices, found...)
	}

	snmpCommunity := firstNonEmpty(cfg.resolvedSNMPCommunity(), s.discoveryCfg.SNMPCommunity)
	for i := range devices {
		if devices[i].IPAddress == nil || !containsPort(devices[i].OpenPorts, 161) {
			continue
		}
		details, err := connector.EnrichViaSNMP(*devices[i].IPAddress, snmpCommunity)
		if err != nil {
			warnings = append(warnings, map[string]string{
				"type":    "warning",
				"message": fmt.Sprintf("SNMP enrichment failed for %s: %v", *devices[i].IPAddress, err),
			})
			continue
		}
		mergeSNMPDetails(&devices[i], details)
	}

	return devices, warnings, nil
}

func (s *DiscoveryService) runSCCMDiscovery(ctx context.Context, profile DiscoveryProfile) ([]connectors.DiscoveredDevice, []map[string]string, error) {
	cfg := s.loadDiscoveryProfileConfig(profile.Configuration)
	connectorCfg := connectors.SCCMConfig{
		Endpoint:      firstNonEmpty(cfg.resolvedEndpoint(), s.discoveryCfg.SCCMEndpoint),
		APIKey:        firstNonEmpty(cfg.resolvedAPIKey(), s.discoveryCfg.SCCMAPIKey),
		Username:      firstNonEmpty(cfg.Username, s.discoveryCfg.SCCMUsername),
		Password:      firstNonEmpty(cfg.Password, s.discoveryCfg.SCCMPassword),
		CSVData:       cfg.resolvedCSVData(),
		CSVPath:       cfg.resolvedCSVPath(),
		ColumnMapping: cfg.resolvedColumnMapping(),
	}

	connector := connectors.NewSCCMAPIConnector()
	devices, err := connector.FetchHardwareInventory(ctx, connectorCfg)
	if err != nil {
		return nil, nil, err
	}

	var warnings []map[string]string
	software, softwareErr := connector.FetchSoftwareInventory(ctx, connectorCfg)
	if softwareErr != nil {
		warnings = append(warnings, map[string]string{
			"type":    "warning",
			"message": fmt.Sprintf("SCCM software inventory unavailable: %v", softwareErr),
		})
	} else if len(software) > 0 {
		devices = attachSCCMSoftware(devices, software)
	}

	return devices, warnings, nil
}

func (s *DiscoveryService) getRunByTenant(ctx context.Context, runID, tenantID uuid.UUID) (DiscoveryRun, error) {
	run, err := scanDiscoveryRunEnriched(s.pool.QueryRow(ctx,
		`SELECT `+discoveryRunSelectColumns+`
		 FROM discovery_runs r
		 LEFT JOIN discovery_profiles p ON p.id = r.profile_id
		 WHERE r.id = $1 AND r.tenant_id = $2`,
		runID, tenantID,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return DiscoveryRun{}, apperrors.NotFound("DiscoveryRun", runID.String())
		}
		return DiscoveryRun{}, apperrors.Internal("failed to load discovery run", err)
	}
	return run, nil
}

func (s *DiscoveryService) loadDiscoveryProfileConfig(raw json.RawMessage) discoveryProfileConfig {
	var cfg discoveryProfileConfig
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &cfg)
	}
	return cfg
}

func (s *DiscoveryService) logDiscoveryRunAudit(
	ctx context.Context,
	tenantID uuid.UUID,
	actorID uuid.UUID,
	runID uuid.UUID,
	profileID uuid.UUID,
	scanType string,
	devicesFound int,
	status string,
) {
	changes, _ := json.Marshal(map[string]any{
		"profile_id":    profileID,
		"scan_type":     scanType,
		"devices_found": devicesFound,
		"status":        status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    actorID,
		Action:     "create:discovery_run",
		EntityType: "discovery_run",
		EntityID:   runID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log discovery audit event", "error", auditErr)
	}
}

func (s *DiscoveryService) recordDiscoveryMetrics(scanType, status string, devicesFound int, startedAt time.Time) {
	metrics.DiscoveryRunsTotal.WithLabelValues(scanType, status).Inc()
	metrics.DiscoveryDevicesFound.WithLabelValues(scanType).Set(float64(devicesFound))
	metrics.DiscoveryDurationSeconds.WithLabelValues(scanType).Observe(time.Since(startedAt).Seconds())
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

func containsPort(ports []int32, target int32) bool {
	for _, port := range ports {
		if port == target {
			return true
		}
	}
	return false
}

func mergeSNMPDetails(device *connectors.DiscoveredDevice, details connectors.DeviceDetails) {
	if device == nil {
		return
	}
	if device.Hostname == nil && details.Hostname != nil {
		device.Hostname = details.Hostname
	}
	device.Attributes = mergeJSONObjects(device.Attributes, details.Attributes)
}

func mergeJSONObjects(base, extra json.RawMessage) json.RawMessage {
	if len(base) == 0 {
		if len(extra) == 0 {
			return json.RawMessage("{}")
		}
		return append(json.RawMessage(nil), extra...)
	}
	if len(extra) == 0 {
		return append(json.RawMessage(nil), base...)
	}

	var baseMap map[string]any
	var extraMap map[string]any
	if err := json.Unmarshal(base, &baseMap); err != nil {
		baseMap = map[string]any{}
	}
	if err := json.Unmarshal(extra, &extraMap); err != nil {
		extraMap = map[string]any{}
	}
	for key, value := range extraMap {
		baseMap[key] = value
	}
	merged, _ := json.Marshal(baseMap)
	return merged
}

func attachSCCMSoftware(devices []connectors.DiscoveredDevice, software []connectors.SoftwareItem) []connectors.DiscoveredDevice {
	softwareByResource := make(map[string][]map[string]any)
	for _, item := range software {
		softwareByResource[item.ResourceID] = append(softwareByResource[item.ResourceID], map[string]any{
			"name":        item.Name,
			"version":     item.Version,
			"publisher":   item.Publisher,
			"installDate": item.InstallDate,
		})
	}

	for i := range devices {
		var attrs map[string]any
		if err := json.Unmarshal(devices[i].Attributes, &attrs); err != nil {
			attrs = map[string]any{}
		}

		resourceID := ""
		switch value := attrs["ResourceId"].(type) {
		case float64:
			resourceID = fmt.Sprintf("%.0f", value)
		case string:
			resourceID = strings.TrimSpace(value)
		}
		if resourceID == "" {
			continue
		}
		if installed := softwareByResource[resourceID]; len(installed) > 0 {
			attrs["installedSoftware"] = installed
			devices[i].Attributes = mustMarshalJSON(attrs)
		}
	}

	return devices
}

func mustMarshalJSON(value any) json.RawMessage {
	data, _ := json.Marshal(value)
	return data
}
