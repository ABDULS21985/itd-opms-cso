// Package connectors provides adapters for importing CI data from external
// systems into the ITD-OPMS CMDB discovery pipeline.
package connectors

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

// SCCMDevice represents a single device from an SCCM hardware inventory export.
type SCCMDevice struct {
	Hostname     string
	IPAddress    string
	MACAddress   string
	DeviceType   string
	OSName       string
	OSVersion    string
	Manufacturer string
	Model        string
	SerialNumber string
}

// SCCMColumnMapping defines which CSV header names map to device fields.
// If empty, the default SCCM column names are used.
type SCCMColumnMapping struct {
	Hostname     string `json:"hostname"`
	IPAddress    string `json:"ip_address"`
	MACAddress   string `json:"mac_address"`
	DeviceType   string `json:"device_type"`
	OSName       string `json:"os_name"`
	OSVersion    string `json:"os_version"`
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	SerialNumber string `json:"serial_number"`
}

// DefaultSCCMMapping returns the default SCCM export column headers.
func DefaultSCCMMapping() SCCMColumnMapping {
	return SCCMColumnMapping{
		Hostname:     "Name",
		IPAddress:    "IPAddresses",
		MACAddress:   "MACAddress",
		DeviceType:   "ChassisTypes",
		OSName:       "OperatingSystemNameandVersion",
		OSVersion:    "BuildNumber",
		Manufacturer: "Manufacturer",
		Model:        "Model",
		SerialNumber: "SerialNumber",
	}
}

// ParseSCCMExport reads an SCCM hardware inventory CSV and returns devices.
// Rows without a hostname or IP are silently skipped. Per-row parse errors
// are collected and returned alongside successfully parsed devices.
func ParseSCCMExport(reader io.Reader, mapping SCCMColumnMapping) ([]SCCMDevice, []error) {
	csvReader := csv.NewReader(reader)
	csvReader.LazyQuotes = true
	csvReader.TrimLeadingSpace = true

	headers, err := csvReader.Read()
	if err != nil {
		return nil, []error{fmt.Errorf("read CSV headers: %w", err)}
	}

	// Build a case-insensitive header index.
	headerIdx := make(map[string]int, len(headers))
	for i, h := range headers {
		headerIdx[strings.TrimSpace(strings.ToLower(h))] = i
	}

	// Resolve each mapping field to a column index.
	fieldIdx := map[string]int{}
	resolve := func(name, csvCol string) {
		if csvCol == "" {
			return
		}
		if idx, ok := headerIdx[strings.ToLower(csvCol)]; ok {
			fieldIdx[name] = idx
		}
	}
	resolve("hostname", mapping.Hostname)
	resolve("ip_address", mapping.IPAddress)
	resolve("mac_address", mapping.MACAddress)
	resolve("device_type", mapping.DeviceType)
	resolve("os_name", mapping.OSName)
	resolve("os_version", mapping.OSVersion)
	resolve("manufacturer", mapping.Manufacturer)
	resolve("model", mapping.Model)
	resolve("serial_number", mapping.SerialNumber)

	var devices []SCCMDevice
	var errs []error
	lineNum := 1

	for {
		record, readErr := csvReader.Read()
		if readErr == io.EOF {
			break
		}
		lineNum++
		if readErr != nil {
			errs = append(errs, fmt.Errorf("line %d: %w", lineNum, readErr))
			continue
		}

		getField := func(name string) string {
			if idx, ok := fieldIdx[name]; ok && idx < len(record) {
				return strings.TrimSpace(record[idx])
			}
			return ""
		}

		dev := SCCMDevice{
			Hostname:     getField("hostname"),
			IPAddress:    getField("ip_address"),
			MACAddress:   getField("mac_address"),
			DeviceType:   getField("device_type"),
			OSName:       getField("os_name"),
			OSVersion:    getField("os_version"),
			Manufacturer: getField("manufacturer"),
			Model:        getField("model"),
			SerialNumber: getField("serial_number"),
		}

		// SCCM sometimes exports IPs as semicolon-separated — take the first.
		if strings.Contains(dev.IPAddress, ";") {
			dev.IPAddress = strings.SplitN(dev.IPAddress, ";", 2)[0]
		}

		if dev.Hostname == "" && dev.IPAddress == "" {
			continue
		}
		devices = append(devices, dev)
	}

	return devices, errs
}

// SCCMAPIConnector reads SCCM inventory through the AdminService REST API.
type SCCMAPIConnector struct {
	httpClient *http.Client
}

// NewSCCMAPIConnector creates an SCCM API connector.
func NewSCCMAPIConnector() *SCCMAPIConnector {
	return &SCCMAPIConnector{
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type sccmPage struct {
	Value []json.RawMessage `json:"value"`
}

type sccmSystem struct {
	Name                          string          `json:"Name"`
	IPAddresses                   json.RawMessage `json:"IPAddresses"`
	MACAddresses                  json.RawMessage `json:"MACAddresses"`
	OperatingSystemNameAndVersion string          `json:"OperatingSystemNameAndVersion"`
	Manufacturer                  string          `json:"Manufacturer"`
	Model                         string          `json:"Model"`
	SerialNumber                  string          `json:"SerialNumber"`
	ResourceID                    int64           `json:"ResourceId"`
}

type sccmSoftware struct {
	DisplayName string  `json:"DisplayName"`
	Version     *string `json:"Version"`
	Publisher   *string `json:"Publisher"`
	InstallDate *string `json:"InstallDate"`
	ResourceID  int64   `json:"ResourceId"`
}

// FetchHardwareInventory loads SCCM hardware inventory and falls back to CSV if configured.
func (c *SCCMAPIConnector) FetchHardwareInventory(ctx context.Context, cfg SCCMConfig) ([]DiscoveredDevice, error) {
	devices, err := c.fetchHardwareInventoryFromAPI(ctx, cfg)
	if err == nil {
		return devices, nil
	}

	if cfg.CSVData != "" || cfg.CSVPath != "" {
		slog.Warn("SCCM AdminService unavailable, falling back to CSV import", "error", err)
		return c.fetchHardwareInventoryFromCSV(cfg)
	}

	return nil, err
}

// FetchSoftwareInventory loads SCCM software inventory for CMDB/license reconciliation.
func (c *SCCMAPIConnector) FetchSoftwareInventory(ctx context.Context, cfg SCCMConfig) ([]SoftwareItem, error) {
	endpoint := strings.TrimRight(strings.TrimSpace(cfg.Endpoint), "/")
	if endpoint == "" {
		if cfg.CSVData != "" || cfg.CSVPath != "" {
			slog.Warn("SCCM AdminService not configured; software inventory unavailable when using CSV fallback")
			return []SoftwareItem{}, nil
		}
		return nil, fmt.Errorf("sccm endpoint is not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		endpoint+"/AdminService/wmi/SMS_G_System_ADD_REMOVE_PROGRAMS?$select=DisplayName,Version,Publisher,InstallDate,ResourceId",
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("create SCCM software request: %w", err)
	}
	applySCCMAuth(req, cfg)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch SCCM software inventory: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("SCCM software inventory returned %d: %s", resp.StatusCode, string(body))
	}

	var page sccmPage
	if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
		return nil, fmt.Errorf("decode SCCM software inventory: %w", err)
	}

	items := make([]SoftwareItem, 0, len(page.Value))
	for _, raw := range page.Value {
		var software sccmSoftware
		if err := json.Unmarshal(raw, &software); err != nil {
			return nil, fmt.Errorf("decode SCCM software row: %w", err)
		}
		if strings.TrimSpace(software.DisplayName) == "" {
			continue
		}

		items = append(items, SoftwareItem{
			ResourceID:  fmt.Sprintf("%d", software.ResourceID),
			Name:        software.DisplayName,
			Version:     software.Version,
			Publisher:   software.Publisher,
			InstallDate: software.InstallDate,
			Attributes:  append(json.RawMessage(nil), raw...),
		})
	}

	return items, nil
}

func (c *SCCMAPIConnector) fetchHardwareInventoryFromAPI(ctx context.Context, cfg SCCMConfig) ([]DiscoveredDevice, error) {
	endpoint := strings.TrimRight(strings.TrimSpace(cfg.Endpoint), "/")
	if endpoint == "" {
		return nil, fmt.Errorf("sccm endpoint is not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		endpoint+"/AdminService/wmi/SMS_R_System?$select=Name,IPAddresses,MACAddresses,OperatingSystemNameAndVersion,Manufacturer,Model,SerialNumber,ResourceId",
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("create SCCM hardware request: %w", err)
	}
	applySCCMAuth(req, cfg)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch SCCM hardware inventory: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("SCCM hardware inventory returned %d: %s", resp.StatusCode, string(body))
	}

	var page sccmPage
	if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
		return nil, fmt.Errorf("decode SCCM hardware inventory: %w", err)
	}

	devices := make([]DiscoveredDevice, 0, len(page.Value))
	for _, raw := range page.Value {
		var system sccmSystem
		if err := json.Unmarshal(raw, &system); err != nil {
			return nil, fmt.Errorf("decode SCCM hardware row: %w", err)
		}
		if strings.TrimSpace(system.Name) == "" {
			continue
		}

		osName, osVersion := splitOperatingSystem(system.OperatingSystemNameAndVersion)
		ipAddress := firstSCCMString(system.IPAddresses)
		macAddress := firstSCCMString(system.MACAddresses)

		devices = append(devices, DiscoveredDevice{
			Hostname:     stringPtr(system.Name),
			IPAddress:    stringPtr(ipAddress),
			MACAddress:   stringPtr(macAddress),
			DeviceType:   stringPtr(inferADDeviceType(osName)),
			OSName:       stringPtr(osName),
			OSVersion:    stringPtr(osVersion),
			Manufacturer: stringPtr(system.Manufacturer),
			Model:        stringPtr(system.Model),
			SerialNumber: stringPtr(system.SerialNumber),
			Attributes:   append(json.RawMessage(nil), raw...),
			Source:       "sccm",
		})
	}

	return devices, nil
}

func (c *SCCMAPIConnector) fetchHardwareInventoryFromCSV(cfg SCCMConfig) ([]DiscoveredDevice, error) {
	var reader io.Reader
	if cfg.CSVData != "" {
		reader = strings.NewReader(cfg.CSVData)
	} else {
		file, err := os.Open(cfg.CSVPath)
		if err != nil {
			return nil, fmt.Errorf("open SCCM CSV fallback: %w", err)
		}
		defer file.Close()
		reader = file
	}

	devices, errs := ParseSCCMExport(reader, cfg.ColumnMapping)
	if len(errs) > 0 {
		slog.Warn("SCCM CSV fallback completed with parse warnings", "warnings", len(errs))
	}

	result := make([]DiscoveredDevice, 0, len(devices))
	for _, device := range devices {
		result = append(result, DiscoveredDevice{
			Hostname:     stringPtr(device.Hostname),
			IPAddress:    stringPtr(device.IPAddress),
			MACAddress:   stringPtr(device.MACAddress),
			DeviceType:   stringPtr(device.DeviceType),
			OSName:       stringPtr(device.OSName),
			OSVersion:    stringPtr(device.OSVersion),
			Manufacturer: stringPtr(device.Manufacturer),
			Model:        stringPtr(device.Model),
			SerialNumber: stringPtr(device.SerialNumber),
			Attributes: mustRawJSON(map[string]any{
				"source": "csv_fallback",
			}),
			Source: "sccm",
		})
	}

	return result, nil
}

func applySCCMAuth(req *http.Request, cfg SCCMConfig) {
	if req == nil {
		return
	}
	if apiKey := strings.TrimSpace(cfg.APIKey); apiKey != "" {
		req.Header.Set("X-API-Key", apiKey)
		return
	}
	if username := strings.TrimSpace(cfg.Username); username != "" {
		req.SetBasicAuth(username, cfg.Password)
	}
}

func firstSCCMString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}

	var values []string
	if err := json.Unmarshal(raw, &values); err == nil {
		for _, value := range values {
			value = normalizeString(value)
			if value != "" {
				return value
			}
		}
		return ""
	}

	var value string
	if err := json.Unmarshal(raw, &value); err == nil {
		return normalizeString(value)
	}

	return normalizeString(string(raw))
}

func splitOperatingSystem(value string) (string, string) {
	value = normalizeString(value)
	if value == "" {
		return "", ""
	}
	if strings.Contains(value, "|") {
		parts := strings.SplitN(value, "|", 2)
		return normalizeString(parts[0]), normalizeString(parts[1])
	}

	fields := strings.Fields(value)
	if len(fields) >= 2 {
		last := fields[len(fields)-1]
		if isNumericToken(last) {
			return normalizeString(strings.Join(fields[:len(fields)-1], " ")), last
		}
	}

	return value, ""
}

func isNumericToken(value string) bool {
	for _, ch := range value {
		if (ch < '0' || ch > '9') && ch != '.' {
			return false
		}
	}
	return value != ""
}
