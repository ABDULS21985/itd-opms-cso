package connectors

import (
	"encoding/json"
	"strings"
	"time"
)

// DiscoveredDevice is the connector-level representation of a discovered endpoint
// before it is persisted into CMDB discovery tables.
type DiscoveredDevice struct {
	Hostname     *string
	IPAddress    *string
	MACAddress   *string
	DeviceType   *string
	OSName       *string
	OSVersion    *string
	Manufacturer *string
	Model        *string
	SerialNumber *string
	OpenPorts    []int32
	Attributes   json.RawMessage
	Source       string
}

// SoftwareItem represents discovered software inventory from a connector.
type SoftwareItem struct {
	ResourceID  string          `json:"resourceId"`
	Name        string          `json:"name"`
	Version     *string         `json:"version,omitempty"`
	Publisher   *string         `json:"publisher,omitempty"`
	InstallDate *string         `json:"installDate,omitempty"`
	Attributes  json.RawMessage `json:"attributes"`
}

// DeviceDetails carries optional enrichment obtained from protocols such as SNMP.
type DeviceDetails struct {
	Hostname    *string
	Description *string
	ObjectID    *string
	Attributes  json.RawMessage
}

// ADConfig controls Microsoft Graph-backed device discovery.
type ADConfig struct {
	TenantID string `json:"tenantId"`
}

// NetworkConfig controls the pragmatic TCP/SNMP sweep implementation.
type NetworkConfig struct {
	SNMPCommunity string        `json:"snmpCommunity"`
	Timeout       time.Duration `json:"timeout"`
	MaxConcurrent int           `json:"maxConcurrent"`
}

// SCCMConfig controls live SCCM AdminService access and optional CSV fallback.
type SCCMConfig struct {
	Endpoint      string            `json:"endpoint"`
	APIKey        string            `json:"apiKey"`
	Username      string            `json:"username"`
	Password      string            `json:"password"`
	CSVData       string            `json:"csvData"`
	CSVPath       string            `json:"csvPath"`
	ColumnMapping SCCMColumnMapping `json:"columnMapping"`
}

func stringPtr(value string) *string {
	value = normalizeString(value)
	if value == "" {
		return nil
	}
	return &value
}

func normalizeString(value string) string {
	return strings.TrimSpace(value)
}

func mustRawJSON(value any) json.RawMessage {
	data, _ := json.Marshal(value)
	return data
}
