package cmdb

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// IsValidAssetTransition — exhaustive tests
// ──────────────────────────────────────────────

func TestIsValidAssetTransition_AllValidTransitions(t *testing.T) {
	valid := []struct {
		from string
		to   string
	}{
		{AssetStatusProcured, AssetStatusReceived},
		{AssetStatusReceived, AssetStatusActive},
		{AssetStatusActive, AssetStatusMaintenance},
		{AssetStatusActive, AssetStatusRetired},
		{AssetStatusMaintenance, AssetStatusActive},
		{AssetStatusMaintenance, AssetStatusRetired},
		{AssetStatusRetired, AssetStatusDisposed},
	}

	for _, tt := range valid {
		t.Run(tt.from+"->"+tt.to, func(t *testing.T) {
			if !IsValidAssetTransition(tt.from, tt.to) {
				t.Errorf("expected transition %s -> %s to be valid", tt.from, tt.to)
			}
		})
	}
}

func TestIsValidAssetTransition_AllInvalidTransitions(t *testing.T) {
	allStatuses := []string{
		AssetStatusProcured,
		AssetStatusReceived,
		AssetStatusActive,
		AssetStatusMaintenance,
		AssetStatusRetired,
		AssetStatusDisposed,
	}

	// Build set of valid transitions for quick lookup.
	type transition struct{ from, to string }
	validSet := map[transition]bool{
		{AssetStatusProcured, AssetStatusReceived}:      true,
		{AssetStatusReceived, AssetStatusActive}:        true,
		{AssetStatusActive, AssetStatusMaintenance}:     true,
		{AssetStatusActive, AssetStatusRetired}:         true,
		{AssetStatusMaintenance, AssetStatusActive}:     true,
		{AssetStatusMaintenance, AssetStatusRetired}:    true,
		{AssetStatusRetired, AssetStatusDisposed}:       true,
	}

	for _, from := range allStatuses {
		for _, to := range allStatuses {
			if from == to {
				continue // self-transition is always invalid (not in the map)
			}
			if validSet[transition{from, to}] {
				continue // skip valid ones; tested above
			}
			t.Run(from+"->"+to+"_invalid", func(t *testing.T) {
				if IsValidAssetTransition(from, to) {
					t.Errorf("expected transition %s -> %s to be invalid", from, to)
				}
			})
		}
	}
}

func TestIsValidAssetTransition_SelfTransitions(t *testing.T) {
	statuses := []string{
		AssetStatusProcured,
		AssetStatusReceived,
		AssetStatusActive,
		AssetStatusMaintenance,
		AssetStatusRetired,
		AssetStatusDisposed,
	}
	for _, s := range statuses {
		t.Run(s+"->"+s, func(t *testing.T) {
			if IsValidAssetTransition(s, s) {
				t.Errorf("expected self-transition %s -> %s to be invalid", s, s)
			}
		})
	}
}

func TestIsValidAssetTransition_DisposedHasNoOutgoing(t *testing.T) {
	statuses := []string{
		AssetStatusProcured,
		AssetStatusReceived,
		AssetStatusActive,
		AssetStatusMaintenance,
		AssetStatusRetired,
		AssetStatusDisposed,
	}
	for _, to := range statuses {
		t.Run("disposed->"+to, func(t *testing.T) {
			if IsValidAssetTransition(AssetStatusDisposed, to) {
				t.Errorf("expected disposed -> %s to be invalid (disposed is terminal)", to)
			}
		})
	}
}

func TestIsValidAssetTransition_UnknownStatus(t *testing.T) {
	if IsValidAssetTransition("unknown", AssetStatusActive) {
		t.Error("expected unknown -> active to be invalid")
	}
	if IsValidAssetTransition(AssetStatusActive, "unknown") {
		t.Error("expected active -> unknown to be invalid")
	}
	if IsValidAssetTransition("", "") {
		t.Error("expected empty -> empty to be invalid")
	}
	if IsValidAssetTransition("foo", "bar") {
		t.Error("expected foo -> bar to be invalid")
	}
}

func TestIsValidAssetTransition_ReverseTransitions(t *testing.T) {
	// procured -> received is valid, but received -> procured should not be
	if IsValidAssetTransition(AssetStatusReceived, AssetStatusProcured) {
		t.Error("expected received -> procured to be invalid (no backward transition)")
	}
	// retired -> active should not be valid
	if IsValidAssetTransition(AssetStatusRetired, AssetStatusActive) {
		t.Error("expected retired -> active to be invalid")
	}
	// disposed -> retired should not be valid
	if IsValidAssetTransition(AssetStatusDisposed, AssetStatusRetired) {
		t.Error("expected disposed -> retired to be invalid")
	}
}

// ──────────────────────────────────────────────
// Asset type constants
// ──────────────────────────────────────────────

func TestAssetTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Hardware", AssetTypeHardware, "hardware"},
		{"Software", AssetTypeSoftware, "software"},
		{"Virtual", AssetTypeVirtual, "virtual"},
		{"Cloud", AssetTypeCloud, "cloud"},
		{"Network", AssetTypeNetwork, "network"},
		{"Peripheral", AssetTypePeripheral, "peripheral"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Asset status constants
// ──────────────────────────────────────────────

func TestAssetStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Procured", AssetStatusProcured, "procured"},
		{"Received", AssetStatusReceived, "received"},
		{"Active", AssetStatusActive, "active"},
		{"Maintenance", AssetStatusMaintenance, "maintenance"},
		{"Retired", AssetStatusRetired, "retired"},
		{"Disposed", AssetStatusDisposed, "disposed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Lifecycle event type constants
// ──────────────────────────────────────────────

func TestLifecycleEventConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Procured", LifecycleEventProcured, "procured"},
		{"Received", LifecycleEventReceived, "received"},
		{"Deployed", LifecycleEventDeployed, "deployed"},
		{"Transferred", LifecycleEventTransferred, "transferred"},
		{"MaintenanceStart", LifecycleEventMaintenanceStart, "maintenance_start"},
		{"MaintenanceEnd", LifecycleEventMaintenanceEnd, "maintenance_end"},
		{"Retired", LifecycleEventRetired, "retired"},
		{"Disposed", LifecycleEventDisposed, "disposed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Disposal method/status constants
// ──────────────────────────────────────────────

func TestDisposalMethodConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Resale", DisposalMethodResale, "resale"},
		{"Donation", DisposalMethodDonation, "donation"},
		{"Recycling", DisposalMethodRecycling, "recycling"},
		{"Destruction", DisposalMethodDestruction, "destruction"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestDisposalStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"PendingApproval", DisposalStatusPendingApproval, "pending_approval"},
		{"Approved", DisposalStatusApproved, "approved"},
		{"Completed", DisposalStatusCompleted, "completed"},
		{"Cancelled", DisposalStatusCancelled, "cancelled"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// CI status constants
// ──────────────────────────────────────────────

func TestCIStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Active", CIStatusActive, "active"},
		{"Inactive", CIStatusInactive, "inactive"},
		{"Planned", CIStatusPlanned, "planned"},
		{"Decommissioned", CIStatusDecommissioned, "decommissioned"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// CI relationship type constants
// ──────────────────────────────────────────────

func TestCIRelationshipTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"RunsOn", CIRelationshipRunsOn, "runs_on"},
		{"DependsOn", CIRelationshipDependsOn, "depends_on"},
		{"ConnectedTo", CIRelationshipConnectedTo, "connected_to"},
		{"ManagedBy", CIRelationshipManagedBy, "managed_by"},
		{"Contains", CIRelationshipContains, "contains"},
		{"Uses", CIRelationshipUses, "uses"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// License type constants
// ──────────────────────────────────────────────

func TestLicenseTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Perpetual", LicenseTypePerpetual, "perpetual"},
		{"Subscription", LicenseTypeSubscription, "subscription"},
		{"PerUser", LicenseTypePerUser, "per_user"},
		{"PerDevice", LicenseTypePerDevice, "per_device"},
		{"Site", LicenseTypeSite, "site"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Compliance status constants
// ──────────────────────────────────────────────

func TestComplianceStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Compliant", ComplianceStatusCompliant, "compliant"},
		{"OverDeployed", ComplianceStatusOverDeployed, "over_deployed"},
		{"UnderUtilized", ComplianceStatusUnderUtilized, "under_utilized"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Warranty renewal status constants
// ──────────────────────────────────────────────

func TestWarrantyRenewalStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Active", WarrantyRenewalStatusActive, "active"},
		{"ExpiringSoon", WarrantyRenewalStatusExpiringSoon, "expiring_soon"},
		{"Expired", WarrantyRenewalStatusExpired, "expired"},
		{"Renewed", WarrantyRenewalStatusRenewed, "renewed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: Asset
// ──────────────────────────────────────────────

func TestAssetJSONRoundTrip(t *testing.T) {
	desc := "Test server"
	mfr := "Dell"
	model := "R740"
	serial := "SN12345"
	loc := "DC-1"
	bldg := "Building A"
	floor := "3"
	room := "301"
	cost := 5000.0
	currency := "USD"
	classification := "critical"
	category := "server"
	ownerID := uuid.New()
	custodianID := uuid.New()
	now := time.Now().UTC().Truncate(time.Second)
	purchaseDate := now.Add(-24 * time.Hour)

	original := Asset{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		AssetTag:       "ASSET-001",
		Type:           AssetTypeHardware,
		Category:       &category,
		Name:           "Production Server",
		Description:    &desc,
		Manufacturer:   &mfr,
		Model:          &model,
		SerialNumber:   &serial,
		Status:         AssetStatusActive,
		Location:       &loc,
		Building:       &bldg,
		Floor:          &floor,
		Room:           &room,
		OwnerID:        &ownerID,
		CustodianID:    &custodianID,
		PurchaseDate:   &purchaseDate,
		PurchaseCost:   &cost,
		Currency:       &currency,
		Classification: &classification,
		Attributes:     json.RawMessage(`{"rack":"A1"}`),
		Tags:           []string{"production", "critical"},
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Asset: %v", err)
	}

	var decoded Asset
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Asset: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch")
	}
	if decoded.AssetTag != original.AssetTag {
		t.Errorf("AssetTag mismatch: expected %q, got %q", original.AssetTag, decoded.AssetTag)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: expected %q, got %q", original.Type, decoded.Type)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.Description == nil || *decoded.Description != *original.Description {
		t.Errorf("Description mismatch")
	}
	if decoded.Manufacturer == nil || *decoded.Manufacturer != *original.Manufacturer {
		t.Errorf("Manufacturer mismatch")
	}
	if decoded.Model == nil || *decoded.Model != *original.Model {
		t.Errorf("Model mismatch")
	}
	if decoded.SerialNumber == nil || *decoded.SerialNumber != *original.SerialNumber {
		t.Errorf("SerialNumber mismatch")
	}
	if decoded.OwnerID == nil || *decoded.OwnerID != ownerID {
		t.Errorf("OwnerID mismatch")
	}
	if decoded.CustodianID == nil || *decoded.CustodianID != custodianID {
		t.Errorf("CustodianID mismatch")
	}
	if decoded.PurchaseCost == nil || *decoded.PurchaseCost != cost {
		t.Errorf("PurchaseCost mismatch")
	}
	if len(decoded.Tags) != 2 || decoded.Tags[0] != "production" || decoded.Tags[1] != "critical" {
		t.Errorf("Tags mismatch: got %v", decoded.Tags)
	}
}

func TestAssetJSONRoundTrip_NilOptionalFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	original := Asset{
		ID:       uuid.New(),
		TenantID: uuid.New(),
		AssetTag: "ASSET-002",
		Type:     AssetTypeSoftware,
		Name:     "Test Software",
		Status:   AssetStatusProcured,
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Asset: %v", err)
	}

	var decoded Asset
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Asset: %v", err)
	}

	if decoded.Description != nil {
		t.Errorf("expected nil Description, got %v", decoded.Description)
	}
	if decoded.Manufacturer != nil {
		t.Errorf("expected nil Manufacturer, got %v", decoded.Manufacturer)
	}
	if decoded.OwnerID != nil {
		t.Errorf("expected nil OwnerID, got %v", decoded.OwnerID)
	}
	if decoded.PurchaseCost != nil {
		t.Errorf("expected nil PurchaseCost, got %v", decoded.PurchaseCost)
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: CMDBItem
// ──────────────────────────────────────────────

func TestCMDBItemJSONRoundTrip(t *testing.T) {
	assetID := uuid.New()
	now := time.Now().UTC().Truncate(time.Second)
	original := CMDBItem{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		CIType:     "server",
		Name:       "Web Server 01",
		Status:     CIStatusActive,
		AssetID:    &assetID,
		Attributes: json.RawMessage(`{"os":"linux"}`),
		Version:    3,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CMDBItem: %v", err)
	}

	var decoded CMDBItem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CMDBItem: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.CIType != original.CIType {
		t.Errorf("CIType mismatch: expected %q, got %q", original.CIType, decoded.CIType)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.Version != 3 {
		t.Errorf("Version mismatch: expected 3, got %d", decoded.Version)
	}
	if decoded.AssetID == nil || *decoded.AssetID != assetID {
		t.Errorf("AssetID mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: CMDBRelationship
// ──────────────────────────────────────────────

func TestCMDBRelationshipJSONRoundTrip(t *testing.T) {
	desc := "Primary dependency"
	now := time.Now().UTC().Truncate(time.Second)
	original := CMDBRelationship{
		ID:               uuid.New(),
		SourceCIID:       uuid.New(),
		TargetCIID:       uuid.New(),
		RelationshipType: CIRelationshipDependsOn,
		Description:      &desc,
		IsActive:         true,
		CreatedAt:        now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CMDBRelationship: %v", err)
	}

	var decoded CMDBRelationship
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CMDBRelationship: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.SourceCIID != original.SourceCIID {
		t.Errorf("SourceCIID mismatch")
	}
	if decoded.TargetCIID != original.TargetCIID {
		t.Errorf("TargetCIID mismatch")
	}
	if decoded.RelationshipType != original.RelationshipType {
		t.Errorf("RelationshipType mismatch: expected %q, got %q", original.RelationshipType, decoded.RelationshipType)
	}
	if !decoded.IsActive {
		t.Errorf("expected IsActive to be true")
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: License
// ──────────────────────────────────────────────

func TestLicenseJSONRoundTrip(t *testing.T) {
	vendor := "Microsoft"
	expiry := time.Now().UTC().Truncate(time.Second).Add(365 * 24 * time.Hour)
	cost := 12000.0
	contact := "license@vendor.com"
	now := time.Now().UTC().Truncate(time.Second)

	original := License{
		ID:                uuid.New(),
		TenantID:          uuid.New(),
		SoftwareName:      "Office 365",
		Vendor:            &vendor,
		LicenseType:       LicenseTypeSubscription,
		TotalEntitlements: 100,
		AssignedCount:     75,
		ComplianceStatus:  ComplianceStatusCompliant,
		ExpiryDate:        &expiry,
		Cost:              &cost,
		RenewalContact:    &contact,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal License: %v", err)
	}

	var decoded License
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal License: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.SoftwareName != original.SoftwareName {
		t.Errorf("SoftwareName mismatch: expected %q, got %q", original.SoftwareName, decoded.SoftwareName)
	}
	if decoded.LicenseType != original.LicenseType {
		t.Errorf("LicenseType mismatch: expected %q, got %q", original.LicenseType, decoded.LicenseType)
	}
	if decoded.TotalEntitlements != 100 {
		t.Errorf("TotalEntitlements mismatch: expected 100, got %d", decoded.TotalEntitlements)
	}
	if decoded.AssignedCount != 75 {
		t.Errorf("AssignedCount mismatch: expected 75, got %d", decoded.AssignedCount)
	}
	if decoded.ComplianceStatus != ComplianceStatusCompliant {
		t.Errorf("ComplianceStatus mismatch: expected %q, got %q", ComplianceStatusCompliant, decoded.ComplianceStatus)
	}
	if decoded.Vendor == nil || *decoded.Vendor != vendor {
		t.Errorf("Vendor mismatch")
	}
	if decoded.Cost == nil || *decoded.Cost != cost {
		t.Errorf("Cost mismatch")
	}
	if decoded.RenewalContact == nil || *decoded.RenewalContact != contact {
		t.Errorf("RenewalContact mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: Warranty
// ──────────────────────────────────────────────

func TestWarrantyJSONRoundTrip(t *testing.T) {
	vendor := "HP"
	contractNum := "WRN-2025-001"
	coverage := "full"
	cost := 2500.0
	now := time.Now().UTC().Truncate(time.Second)
	start := now.Add(-30 * 24 * time.Hour)
	end := now.Add(335 * 24 * time.Hour)

	original := Warranty{
		ID:             uuid.New(),
		AssetID:        uuid.New(),
		TenantID:       uuid.New(),
		Vendor:         &vendor,
		ContractNumber: &contractNum,
		CoverageType:   &coverage,
		StartDate:      start,
		EndDate:        end,
		Cost:           &cost,
		RenewalStatus:  WarrantyRenewalStatusActive,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Warranty: %v", err)
	}

	var decoded Warranty
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Warranty: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.AssetID != original.AssetID {
		t.Errorf("AssetID mismatch")
	}
	if decoded.RenewalStatus != WarrantyRenewalStatusActive {
		t.Errorf("RenewalStatus mismatch: expected %q, got %q", WarrantyRenewalStatusActive, decoded.RenewalStatus)
	}
	if decoded.Vendor == nil || *decoded.Vendor != vendor {
		t.Errorf("Vendor mismatch")
	}
	if decoded.ContractNumber == nil || *decoded.ContractNumber != contractNum {
		t.Errorf("ContractNumber mismatch")
	}
	if decoded.Cost == nil || *decoded.Cost != cost {
		t.Errorf("Cost mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: AssetLifecycleEvent
// ──────────────────────────────────────────────

func TestAssetLifecycleEventJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	evidenceID := uuid.New()
	original := AssetLifecycleEvent{
		ID:                 uuid.New(),
		AssetID:            uuid.New(),
		TenantID:           uuid.New(),
		EventType:          LifecycleEventDeployed,
		PerformedBy:        uuid.New(),
		Details:            json.RawMessage(`{"location":"DC-1"}`),
		EvidenceDocumentID: &evidenceID,
		CreatedAt:          now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AssetLifecycleEvent: %v", err)
	}

	var decoded AssetLifecycleEvent
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AssetLifecycleEvent: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.EventType != LifecycleEventDeployed {
		t.Errorf("EventType mismatch: expected %q, got %q", LifecycleEventDeployed, decoded.EventType)
	}
	if decoded.EvidenceDocumentID == nil || *decoded.EvidenceDocumentID != evidenceID {
		t.Errorf("EvidenceDocumentID mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: AssetDisposal
// ──────────────────────────────────────────────

func TestAssetDisposalJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	reason := "End of life"
	approver := uuid.New()
	chainID := uuid.New()
	dispDate := now.Add(24 * time.Hour)
	certID := uuid.New()
	w1, w2 := uuid.New(), uuid.New()

	original := AssetDisposal{
		ID:                       uuid.New(),
		AssetID:                  uuid.New(),
		TenantID:                 uuid.New(),
		DisposalMethod:           DisposalMethodRecycling,
		Reason:                   &reason,
		ApprovedBy:               &approver,
		ApprovalChainID:          &chainID,
		DisposalDate:             &dispDate,
		DisposalCertificateDocID: &certID,
		WitnessIDs:               []uuid.UUID{w1, w2},
		DataWipeConfirmed:        true,
		Status:                   DisposalStatusApproved,
		CreatedAt:                now,
		UpdatedAt:                now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AssetDisposal: %v", err)
	}

	var decoded AssetDisposal
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AssetDisposal: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.DisposalMethod != DisposalMethodRecycling {
		t.Errorf("DisposalMethod mismatch: expected %q, got %q", DisposalMethodRecycling, decoded.DisposalMethod)
	}
	if decoded.Status != DisposalStatusApproved {
		t.Errorf("Status mismatch: expected %q, got %q", DisposalStatusApproved, decoded.Status)
	}
	if !decoded.DataWipeConfirmed {
		t.Errorf("expected DataWipeConfirmed to be true")
	}
	if len(decoded.WitnessIDs) != 2 {
		t.Errorf("WitnessIDs mismatch: expected 2, got %d", len(decoded.WitnessIDs))
	}
	if decoded.Reason == nil || *decoded.Reason != reason {
		t.Errorf("Reason mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: LicenseAssignment
// ──────────────────────────────────────────────

func TestLicenseAssignmentJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	userID := uuid.New()
	assetID := uuid.New()
	original := LicenseAssignment{
		ID:         uuid.New(),
		LicenseID:  uuid.New(),
		TenantID:   uuid.New(),
		UserID:     &userID,
		AssetID:    &assetID,
		AssignedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal LicenseAssignment: %v", err)
	}

	var decoded LicenseAssignment
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal LicenseAssignment: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.LicenseID != original.LicenseID {
		t.Errorf("LicenseID mismatch")
	}
	if decoded.UserID == nil || *decoded.UserID != userID {
		t.Errorf("UserID mismatch")
	}
	if decoded.AssetID == nil || *decoded.AssetID != assetID {
		t.Errorf("AssetID mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: RenewalAlert
// ──────────────────────────────────────────────

func TestRenewalAlertJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	alertDate := now.Add(30 * 24 * time.Hour)
	original := RenewalAlert{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		EntityType: "warranty",
		EntityID:   uuid.New(),
		AlertDate:  alertDate,
		Sent:       false,
		CreatedAt:  now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal RenewalAlert: %v", err)
	}

	var decoded RenewalAlert
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RenewalAlert: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.EntityType != "warranty" {
		t.Errorf("EntityType mismatch: expected %q, got %q", "warranty", decoded.EntityType)
	}
	if decoded.Sent {
		t.Errorf("expected Sent to be false")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: ReconciliationRun
// ──────────────────────────────────────────────

func TestReconciliationRunJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	completed := now.Add(10 * time.Minute)
	original := ReconciliationRun{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		Source:        "network_scanner",
		StartedAt:     now,
		CompletedAt:   &completed,
		Matches:       150,
		Discrepancies: 5,
		NewItems:      3,
		Report:        json.RawMessage(`{"summary":"ok"}`),
		CreatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ReconciliationRun: %v", err)
	}

	var decoded ReconciliationRun
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ReconciliationRun: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Source != "network_scanner" {
		t.Errorf("Source mismatch: expected %q, got %q", "network_scanner", decoded.Source)
	}
	if decoded.Matches != 150 {
		t.Errorf("Matches mismatch: expected 150, got %d", decoded.Matches)
	}
	if decoded.Discrepancies != 5 {
		t.Errorf("Discrepancies mismatch: expected 5, got %d", decoded.Discrepancies)
	}
	if decoded.NewItems != 3 {
		t.Errorf("NewItems mismatch: expected 3, got %d", decoded.NewItems)
	}
	if decoded.CompletedAt == nil {
		t.Error("expected CompletedAt to be non-nil")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: Stats types
// ──────────────────────────────────────────────

func TestAssetStatsJSONRoundTrip(t *testing.T) {
	original := AssetStats{
		Total:            200,
		ActiveCount:      150,
		MaintenanceCount: 30,
		RetiredCount:     20,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AssetStats: %v", err)
	}

	var decoded AssetStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AssetStats: %v", err)
	}

	if decoded.Total != 200 {
		t.Errorf("Total mismatch: expected 200, got %d", decoded.Total)
	}
	if decoded.ActiveCount != 150 {
		t.Errorf("ActiveCount mismatch: expected 150, got %d", decoded.ActiveCount)
	}
	if decoded.MaintenanceCount != 30 {
		t.Errorf("MaintenanceCount mismatch: expected 30, got %d", decoded.MaintenanceCount)
	}
	if decoded.RetiredCount != 20 {
		t.Errorf("RetiredCount mismatch: expected 20, got %d", decoded.RetiredCount)
	}
}

func TestLicenseComplianceStatsJSONRoundTrip(t *testing.T) {
	original := LicenseComplianceStats{
		Total:         50,
		Compliant:     40,
		OverDeployed:  7,
		UnderUtilized: 3,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal LicenseComplianceStats: %v", err)
	}

	var decoded LicenseComplianceStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal LicenseComplianceStats: %v", err)
	}

	if decoded.Total != 50 {
		t.Errorf("Total mismatch: expected 50, got %d", decoded.Total)
	}
	if decoded.Compliant != 40 {
		t.Errorf("Compliant mismatch: expected 40, got %d", decoded.Compliant)
	}
	if decoded.OverDeployed != 7 {
		t.Errorf("OverDeployed mismatch: expected 7, got %d", decoded.OverDeployed)
	}
	if decoded.UnderUtilized != 3 {
		t.Errorf("UnderUtilized mismatch: expected 3, got %d", decoded.UnderUtilized)
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding tests
// ──────────────────────────────────────────────

func TestCreateAssetRequestJSON(t *testing.T) {
	body := `{
		"name": "Server-01",
		"assetTag": "AST-001",
		"type": "hardware",
		"status": "procured",
		"tags": ["prod", "dc1"]
	}`

	var req CreateAssetRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateAssetRequest: %v", err)
	}

	if req.Name != "Server-01" {
		t.Errorf("Name mismatch: expected %q, got %q", "Server-01", req.Name)
	}
	if req.AssetTag != "AST-001" {
		t.Errorf("AssetTag mismatch: expected %q, got %q", "AST-001", req.AssetTag)
	}
	if req.Type != "hardware" {
		t.Errorf("Type mismatch: expected %q, got %q", "hardware", req.Type)
	}
	if req.Status != "procured" {
		t.Errorf("Status mismatch: expected %q, got %q", "procured", req.Status)
	}
	if len(req.Tags) != 2 {
		t.Errorf("Tags mismatch: expected 2, got %d", len(req.Tags))
	}
}

func TestCreateCMDBItemRequestJSON(t *testing.T) {
	body := `{
		"ciType": "application",
		"name": "ERP System",
		"status": "active"
	}`

	var req CreateCMDBItemRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateCMDBItemRequest: %v", err)
	}

	if req.CIType != "application" {
		t.Errorf("CIType mismatch: expected %q, got %q", "application", req.CIType)
	}
	if req.Name != "ERP System" {
		t.Errorf("Name mismatch: expected %q, got %q", "ERP System", req.Name)
	}
	if req.Status == nil || *req.Status != "active" {
		t.Errorf("Status mismatch")
	}
}

func TestCreateRelationshipRequestJSON(t *testing.T) {
	src := uuid.New()
	tgt := uuid.New()
	body := `{
		"sourceCiId": "` + src.String() + `",
		"targetCiId": "` + tgt.String() + `",
		"relationshipType": "depends_on"
	}`

	var req CreateRelationshipRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateRelationshipRequest: %v", err)
	}

	if req.SourceCIID != src {
		t.Errorf("SourceCIID mismatch")
	}
	if req.TargetCIID != tgt {
		t.Errorf("TargetCIID mismatch")
	}
	if req.RelationshipType != "depends_on" {
		t.Errorf("RelationshipType mismatch: expected %q, got %q", "depends_on", req.RelationshipType)
	}
}

func TestCreateLicenseRequestJSON(t *testing.T) {
	body := `{
		"softwareName": "VS Code",
		"vendor": "Microsoft",
		"licenseType": "perpetual",
		"totalEntitlements": 500
	}`

	var req CreateLicenseRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateLicenseRequest: %v", err)
	}

	if req.SoftwareName != "VS Code" {
		t.Errorf("SoftwareName mismatch")
	}
	if req.Vendor != "Microsoft" {
		t.Errorf("Vendor mismatch")
	}
	if req.LicenseType != "perpetual" {
		t.Errorf("LicenseType mismatch")
	}
	if req.TotalEntitlements != 500 {
		t.Errorf("TotalEntitlements mismatch: expected 500, got %d", req.TotalEntitlements)
	}
}

func TestCreateWarrantyRequestJSON(t *testing.T) {
	assetID := uuid.New()
	body := `{
		"assetId": "` + assetID.String() + `",
		"startDate": "2025-01-01T00:00:00Z",
		"endDate": "2026-01-01T00:00:00Z"
	}`

	var req CreateWarrantyRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateWarrantyRequest: %v", err)
	}

	if req.AssetID != assetID {
		t.Errorf("AssetID mismatch")
	}
	if req.StartDate.Year() != 2025 {
		t.Errorf("StartDate year mismatch: expected 2025, got %d", req.StartDate.Year())
	}
	if req.EndDate.Year() != 2026 {
		t.Errorf("EndDate year mismatch: expected 2026, got %d", req.EndDate.Year())
	}
}

func TestCreateRenewalAlertRequestJSON(t *testing.T) {
	entityID := uuid.New()
	body := `{
		"entityType": "license",
		"entityId": "` + entityID.String() + `",
		"alertDate": "2025-06-01T00:00:00Z"
	}`

	var req CreateRenewalAlertRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateRenewalAlertRequest: %v", err)
	}

	if req.EntityType != "license" {
		t.Errorf("EntityType mismatch")
	}
	if req.EntityID != entityID {
		t.Errorf("EntityID mismatch")
	}
}
