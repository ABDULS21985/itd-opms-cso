// Package connectors provides adapters for importing CI data from external
// systems into the ITD-OPMS CMDB discovery pipeline.
package connectors

import (
	"encoding/csv"
	"fmt"
	"io"
	"strings"
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
