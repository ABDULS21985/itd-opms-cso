package connectors

import (
	"strings"
	"testing"
)

func TestDefaultSCCMMapping(t *testing.T) {
	m := DefaultSCCMMapping()
	if m.Hostname != "Name" {
		t.Errorf("expected Hostname='Name', got %q", m.Hostname)
	}
	if m.SerialNumber != "SerialNumber" {
		t.Errorf("expected SerialNumber='SerialNumber', got %q", m.SerialNumber)
	}
}

func TestParseSCCMExport_BasicCSV(t *testing.T) {
	csv := `Name,IPAddresses,MACAddress,ChassisTypes,OperatingSystemNameandVersion,BuildNumber,Manufacturer,Model,SerialNumber
WS-001,10.0.0.1,AA:BB:CC:DD:EE:01,Desktop,Windows 11 Enterprise,22621,Dell Inc.,OptiPlex 7090,SN001
WS-002,10.0.0.2,AA:BB:CC:DD:EE:02,Laptop,Windows 11 Pro,22631,Lenovo,ThinkPad T14,SN002
`
	devices, errs := ParseSCCMExport(strings.NewReader(csv), DefaultSCCMMapping())
	if len(errs) > 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if len(devices) != 2 {
		t.Fatalf("expected 2 devices, got %d", len(devices))
	}

	d := devices[0]
	if d.Hostname != "WS-001" {
		t.Errorf("expected hostname WS-001, got %q", d.Hostname)
	}
	if d.IPAddress != "10.0.0.1" {
		t.Errorf("expected IP 10.0.0.1, got %q", d.IPAddress)
	}
	if d.SerialNumber != "SN001" {
		t.Errorf("expected serial SN001, got %q", d.SerialNumber)
	}
	if d.Manufacturer != "Dell Inc." {
		t.Errorf("expected manufacturer Dell Inc., got %q", d.Manufacturer)
	}
}

func TestParseSCCMExport_SemicolonIPs(t *testing.T) {
	csv := `Name,IPAddresses,MACAddress
SRV-01,192.168.1.1;10.0.0.5,FF:00:11:22:33:44
`
	devices, errs := ParseSCCMExport(strings.NewReader(csv), DefaultSCCMMapping())
	if len(errs) > 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if len(devices) != 1 {
		t.Fatalf("expected 1 device, got %d", len(devices))
	}
	if devices[0].IPAddress != "192.168.1.1" {
		t.Errorf("expected first IP 192.168.1.1, got %q", devices[0].IPAddress)
	}
}

func TestParseSCCMExport_SkipEmptyRows(t *testing.T) {
	csv := `Name,IPAddresses
,
WS-005,10.0.0.5
`
	devices, _ := ParseSCCMExport(strings.NewReader(csv), DefaultSCCMMapping())
	if len(devices) != 1 {
		t.Fatalf("expected 1 device (empty row skipped), got %d", len(devices))
	}
	if devices[0].Hostname != "WS-005" {
		t.Errorf("expected WS-005, got %q", devices[0].Hostname)
	}
}

func TestParseSCCMExport_CaseInsensitiveHeaders(t *testing.T) {
	csv := `name,ipaddresses
HOST-CI,172.16.0.10
`
	devices, errs := ParseSCCMExport(strings.NewReader(csv), DefaultSCCMMapping())
	if len(errs) > 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if len(devices) != 1 || devices[0].Hostname != "HOST-CI" {
		t.Errorf("case-insensitive header parse failed, devices=%v", devices)
	}
}

func TestParseSCCMExport_CustomMapping(t *testing.T) {
	csv := `Device Name,IP,MAC
MY-PC,10.1.1.1,AA:00:00:00:00:01
`
	mapping := SCCMColumnMapping{
		Hostname:  "Device Name",
		IPAddress: "IP",
		MACAddress: "MAC",
	}
	devices, errs := ParseSCCMExport(strings.NewReader(csv), mapping)
	if len(errs) > 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if len(devices) != 1 {
		t.Fatalf("expected 1 device, got %d", len(devices))
	}
	if devices[0].Hostname != "MY-PC" {
		t.Errorf("expected MY-PC, got %q", devices[0].Hostname)
	}
	if devices[0].MACAddress != "AA:00:00:00:00:01" {
		t.Errorf("expected MAC AA:00:00:00:00:01, got %q", devices[0].MACAddress)
	}
}

func TestParseSCCMExport_EmptyInput(t *testing.T) {
	_, errs := ParseSCCMExport(strings.NewReader(""), DefaultSCCMMapping())
	if len(errs) == 0 {
		t.Error("expected error for empty input")
	}
}
