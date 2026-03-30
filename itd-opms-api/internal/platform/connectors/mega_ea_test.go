package connectors

import (
	"bytes"
	"strings"
	"testing"
)

func TestExportCIsToMEGA_Basic(t *testing.T) {
	items := []MEGAConfigurationItem{
		{
			ID:          "ci-001",
			Name:        "Core Router",
			CIType:      "network",
			Status:      "active",
			IPAddress:   "10.0.0.1",
			Manufacturer: "Cisco",
			Model:       "ISR 4431",
			SerialNumber: "FTX1234",
			OS: &MEGAOperatingSystem{
				Name:    "IOS-XE",
				Version: "17.6",
			},
			Attributes: []MEGAAttribute{
				{Name: "rack_unit", Value: "12"},
			},
			Relations: []MEGARelationship{
				{Type: "depends_on", TargetID: "ci-002", Name: "Uplink Switch"},
			},
		},
	}

	data, err := ExportCIsToMEGA(items)
	if err != nil {
		t.Fatalf("export failed: %v", err)
	}

	xml := string(data)
	if !strings.Contains(xml, `<?xml version="1.0" encoding="UTF-8"?>`) {
		t.Error("missing XML header")
	}
	if !strings.Contains(xml, `<CIExport`) {
		t.Error("missing CIExport root element")
	}
	if !strings.Contains(xml, `source="ITD-OPMS"`) {
		t.Error("missing source attribute")
	}
	if !strings.Contains(xml, `<Name>Core Router</Name>`) {
		t.Error("missing CI name")
	}
	if !strings.Contains(xml, `<IPAddress>10.0.0.1</IPAddress>`) {
		t.Error("missing IP address")
	}
	if !strings.Contains(xml, `<SerialNumber>FTX1234</SerialNumber>`) {
		t.Error("missing serial number")
	}
	if !strings.Contains(xml, `name="rack_unit"`) {
		t.Error("missing custom attribute")
	}
	if !strings.Contains(xml, `type="depends_on"`) {
		t.Error("missing relationship type")
	}
}

func TestExportCIsToMEGA_EmptyList(t *testing.T) {
	data, err := ExportCIsToMEGA(nil)
	if err != nil {
		t.Fatalf("export failed: %v", err)
	}
	if !strings.Contains(string(data), `<CIExport`) {
		t.Error("expected valid XML even with empty list")
	}
}

func TestImportFromMEGA_RoundTrip(t *testing.T) {
	items := []MEGAConfigurationItem{
		{
			ID:     "ci-100",
			Name:   "App Server",
			CIType: "server",
			Status: "active",
			OS: &MEGAOperatingSystem{
				Name:    "Ubuntu",
				Version: "22.04",
			},
		},
		{
			ID:     "ci-101",
			Name:   "DB Server",
			CIType: "server",
			Status: "active",
		},
	}

	data, err := ExportCIsToMEGA(items)
	if err != nil {
		t.Fatalf("export failed: %v", err)
	}

	imported, err := ImportFromMEGA(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("import failed: %v", err)
	}

	if len(imported) != 2 {
		t.Fatalf("expected 2 items, got %d", len(imported))
	}
	if imported[0].Name != "App Server" {
		t.Errorf("expected 'App Server', got %q", imported[0].Name)
	}
	if imported[0].OS == nil || imported[0].OS.Name != "Ubuntu" {
		t.Error("OS not preserved in round trip")
	}
	if imported[1].Name != "DB Server" {
		t.Errorf("expected 'DB Server', got %q", imported[1].Name)
	}
}

func TestImportFromMEGA_InvalidXML(t *testing.T) {
	_, err := ImportFromMEGA(strings.NewReader("<broken>"))
	if err == nil {
		t.Error("expected error for invalid XML")
	}
}

func TestImportFromMEGA_EmptyReader(t *testing.T) {
	_, err := ImportFromMEGA(strings.NewReader(""))
	if err == nil {
		t.Error("expected error for empty reader")
	}
}
