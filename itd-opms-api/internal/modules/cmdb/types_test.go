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

// ──────────────────────────────────────────────
// calculateComplianceStatus — exhaustive tests
// ──────────────────────────────────────────────

func TestCalculateComplianceStatus_Compliant(t *testing.T) {
	// Exactly at boundary: 50% utilization
	if got := calculateComplianceStatus(50, 100); got != ComplianceStatusCompliant {
		t.Errorf("expected %q at 50%% utilization, got %q", ComplianceStatusCompliant, got)
	}
	// 100% utilization
	if got := calculateComplianceStatus(100, 100); got != ComplianceStatusCompliant {
		t.Errorf("expected %q at 100%% utilization, got %q", ComplianceStatusCompliant, got)
	}
	// 75% utilization
	if got := calculateComplianceStatus(75, 100); got != ComplianceStatusCompliant {
		t.Errorf("expected %q at 75%% utilization, got %q", ComplianceStatusCompliant, got)
	}
}

func TestCalculateComplianceStatus_OverDeployed(t *testing.T) {
	// More assigned than total
	if got := calculateComplianceStatus(101, 100); got != ComplianceStatusOverDeployed {
		t.Errorf("expected %q when over-deployed, got %q", ComplianceStatusOverDeployed, got)
	}
	// Way over-deployed
	if got := calculateComplianceStatus(200, 50); got != ComplianceStatusOverDeployed {
		t.Errorf("expected %q when 400%% deployed, got %q", ComplianceStatusOverDeployed, got)
	}
}

func TestCalculateComplianceStatus_UnderUtilized(t *testing.T) {
	// Less than 50% utilization
	if got := calculateComplianceStatus(49, 100); got != ComplianceStatusUnderUtilized {
		t.Errorf("expected %q at 49%% utilization, got %q", ComplianceStatusUnderUtilized, got)
	}
	// Very low utilization
	if got := calculateComplianceStatus(1, 100); got != ComplianceStatusUnderUtilized {
		t.Errorf("expected %q at 1%% utilization, got %q", ComplianceStatusUnderUtilized, got)
	}
	// Zero assigned with total > 0
	if got := calculateComplianceStatus(0, 100); got != ComplianceStatusUnderUtilized {
		t.Errorf("expected %q at 0%% utilization, got %q", ComplianceStatusUnderUtilized, got)
	}
}

func TestCalculateComplianceStatus_ZeroTotal(t *testing.T) {
	// Zero total with zero assigned
	if got := calculateComplianceStatus(0, 0); got != ComplianceStatusCompliant {
		t.Errorf("expected %q when both zero, got %q", ComplianceStatusCompliant, got)
	}
	// Zero total with assigned > 0
	if got := calculateComplianceStatus(5, 0); got != ComplianceStatusOverDeployed {
		t.Errorf("expected %q when total=0 but assigned>0, got %q", ComplianceStatusOverDeployed, got)
	}
}

func TestCalculateComplianceStatus_NegativeTotal(t *testing.T) {
	// Negative total with zero assigned
	if got := calculateComplianceStatus(0, -1); got != ComplianceStatusCompliant {
		t.Errorf("expected %q with negative total and zero assigned, got %q", ComplianceStatusCompliant, got)
	}
	// Negative total with positive assigned
	if got := calculateComplianceStatus(5, -1); got != ComplianceStatusOverDeployed {
		t.Errorf("expected %q with negative total and positive assigned, got %q", ComplianceStatusOverDeployed, got)
	}
}

func TestCalculateComplianceStatus_BoundaryValues(t *testing.T) {
	tests := []struct {
		name     string
		assigned int
		total    int
		expected string
	}{
		{"exact_50_percent", 50, 100, ComplianceStatusCompliant},
		{"just_below_50", 49, 100, ComplianceStatusUnderUtilized},
		{"exact_100_percent", 100, 100, ComplianceStatusCompliant},
		{"just_over_100_percent", 101, 100, ComplianceStatusOverDeployed},
		{"one_of_two", 1, 2, ComplianceStatusCompliant},
		{"zero_of_one", 0, 1, ComplianceStatusUnderUtilized},
		{"one_of_one", 1, 1, ComplianceStatusCompliant},
		{"two_of_one", 2, 1, ComplianceStatusOverDeployed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateComplianceStatus(tt.assigned, tt.total)
			if got != tt.expected {
				t.Errorf("calculateComplianceStatus(%d, %d) = %q, want %q",
					tt.assigned, tt.total, got, tt.expected)
			}
		})
	}
}

// ──────────────────────────────────────────────
// JSON tag verification tests
// ──────────────────────────────────────────────

func TestAsset_JSONTagFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	asset := Asset{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		AssetTag:  "TAG-001",
		Type:      AssetTypeHardware,
		Name:      "Server",
		Status:    AssetStatusActive,
		Tags:      []string{},
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(asset)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "assetTag", "type", "name", "status",
		"category", "description", "manufacturer", "model", "serialNumber",
		"location", "building", "floor", "room",
		"ownerId", "custodianId",
		"purchaseDate", "purchaseCost", "currency", "classification",
		"attributes", "tags", "createdAt", "updatedAt",
	}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

func TestCMDBItem_JSONTagFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	item := CMDBItem{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		CIType:    "server",
		Name:      "Test",
		Status:    CIStatusActive,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "ciType", "name", "status",
		"assetId", "attributes", "version",
		"createdAt", "updatedAt",
	}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

func TestLicense_JSONTagFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	license := License{
		ID:                uuid.New(),
		TenantID:          uuid.New(),
		SoftwareName:      "Test",
		LicenseType:       LicenseTypePerpetual,
		TotalEntitlements: 10,
		ComplianceStatus:  ComplianceStatusCompliant,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	data, err := json.Marshal(license)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "softwareName", "vendor", "licenseType",
		"totalEntitlements", "assignedCount", "complianceStatus",
		"expiryDate", "cost", "renewalContact",
		"createdAt", "updatedAt",
	}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

func TestWarranty_JSONTagFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	warranty := Warranty{
		ID:            uuid.New(),
		AssetID:       uuid.New(),
		TenantID:      uuid.New(),
		StartDate:     now,
		EndDate:       now,
		RenewalStatus: WarrantyRenewalStatusActive,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	data, err := json.Marshal(warranty)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "assetId", "tenantId", "vendor", "contractNumber",
		"coverageType", "startDate", "endDate", "cost",
		"renewalStatus", "createdAt", "updatedAt",
	}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

func TestCMDBRelationship_JSONTagFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	rel := CMDBRelationship{
		ID:               uuid.New(),
		SourceCIID:       uuid.New(),
		TargetCIID:       uuid.New(),
		RelationshipType: CIRelationshipDependsOn,
		IsActive:         true,
		CreatedAt:        now,
	}

	data, err := json.Marshal(rel)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "sourceCiId", "targetCiId", "relationshipType",
		"description", "isActive", "createdAt",
	}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

func TestRenewalAlert_JSONTagFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	alert := RenewalAlert{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		EntityType: "warranty",
		EntityID:   uuid.New(),
		AlertDate:  now,
		Sent:       false,
		CreatedAt:  now,
	}

	data, err := json.Marshal(alert)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "entityType", "entityId",
		"alertDate", "sent", "createdAt",
	}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("expected JSON field %q to be present", f)
		}
	}
}

// ──────────────────────────────────────────────
// Update request type JSON parsing tests
// ──────────────────────────────────────────────

func TestUpdateAssetRequestJSON(t *testing.T) {
	body := `{"name":"Updated Server","status":"active","tags":["updated"]}`

	var req UpdateAssetRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateAssetRequest: %v", err)
	}

	if req.Name == nil || *req.Name != "Updated Server" {
		t.Errorf("Name mismatch: got %v", req.Name)
	}
	if req.Status == nil || *req.Status != "active" {
		t.Errorf("Status mismatch: got %v", req.Status)
	}
	if len(req.Tags) != 1 || req.Tags[0] != "updated" {
		t.Errorf("Tags mismatch: got %v", req.Tags)
	}
	// Fields not in JSON should remain nil.
	if req.AssetTag != nil {
		t.Errorf("expected AssetTag to be nil, got %v", req.AssetTag)
	}
	if req.Manufacturer != nil {
		t.Errorf("expected Manufacturer to be nil, got %v", req.Manufacturer)
	}
	if req.PurchaseCost != nil {
		t.Errorf("expected PurchaseCost to be nil, got %v", req.PurchaseCost)
	}
}

func TestUpdateAssetRequestJSON_AllFields(t *testing.T) {
	ownerID := uuid.New()
	body := `{
		"name":"Server-02","assetTag":"AST-002","type":"virtual",
		"status":"maintenance","category":"vm","description":"Updated desc",
		"manufacturer":"VMware","model":"vSphere","serialNumber":"VS-001",
		"location":"DC-2","building":"B2","floor":"1","room":"101",
		"classification":"internal","ownerId":"` + ownerID.String() + `",
		"purchaseCost":9999.99,"currency":"USD",
		"tags":["vm","prod"]
	}`

	var req UpdateAssetRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateAssetRequest: %v", err)
	}

	if req.Name == nil || *req.Name != "Server-02" {
		t.Errorf("Name mismatch")
	}
	if req.Type == nil || *req.Type != "virtual" {
		t.Errorf("Type mismatch")
	}
	if req.OwnerID == nil || *req.OwnerID != ownerID {
		t.Errorf("OwnerID mismatch")
	}
	if req.PurchaseCost == nil || *req.PurchaseCost != 9999.99 {
		t.Errorf("PurchaseCost mismatch")
	}
	if len(req.Tags) != 2 {
		t.Errorf("Tags mismatch: expected 2, got %d", len(req.Tags))
	}
}

func TestUpdateCMDBItemRequestJSON(t *testing.T) {
	body := `{"name":"Updated CI","status":"inactive"}`

	var req UpdateCMDBItemRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateCMDBItemRequest: %v", err)
	}

	if req.Name == nil || *req.Name != "Updated CI" {
		t.Errorf("Name mismatch: got %v", req.Name)
	}
	if req.Status == nil || *req.Status != "inactive" {
		t.Errorf("Status mismatch: got %v", req.Status)
	}
	// Fields not provided should be nil.
	if req.CIType != nil {
		t.Errorf("expected CIType to be nil, got %v", req.CIType)
	}
	if req.AssetID != nil {
		t.Errorf("expected AssetID to be nil, got %v", req.AssetID)
	}
}

func TestUpdateLicenseRequestJSON(t *testing.T) {
	body := `{"softwareName":"VS Code Pro","totalEntitlements":1000,"cost":5000.50}`

	var req UpdateLicenseRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateLicenseRequest: %v", err)
	}

	if req.SoftwareName == nil || *req.SoftwareName != "VS Code Pro" {
		t.Errorf("SoftwareName mismatch: got %v", req.SoftwareName)
	}
	if req.TotalEntitlements == nil || *req.TotalEntitlements != 1000 {
		t.Errorf("TotalEntitlements mismatch: got %v", req.TotalEntitlements)
	}
	if req.Cost == nil || *req.Cost != 5000.50 {
		t.Errorf("Cost mismatch: got %v", req.Cost)
	}
	// Fields not provided should be nil.
	if req.Vendor != nil {
		t.Errorf("expected Vendor to be nil, got %v", req.Vendor)
	}
	if req.LicenseType != nil {
		t.Errorf("expected LicenseType to be nil, got %v", req.LicenseType)
	}
	if req.ComplianceStatus != nil {
		t.Errorf("expected ComplianceStatus to be nil, got %v", req.ComplianceStatus)
	}
}

func TestUpdateWarrantyRequestJSON(t *testing.T) {
	body := `{"vendor":"Dell","renewalStatus":"renewed","cost":3500.00}`

	var req UpdateWarrantyRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateWarrantyRequest: %v", err)
	}

	if req.Vendor == nil || *req.Vendor != "Dell" {
		t.Errorf("Vendor mismatch: got %v", req.Vendor)
	}
	if req.RenewalStatus == nil || *req.RenewalStatus != "renewed" {
		t.Errorf("RenewalStatus mismatch: got %v", req.RenewalStatus)
	}
	if req.Cost == nil || *req.Cost != 3500.00 {
		t.Errorf("Cost mismatch: got %v", req.Cost)
	}
	// Fields not provided should be nil.
	if req.ContractNumber != nil {
		t.Errorf("expected ContractNumber to be nil, got %v", req.ContractNumber)
	}
	if req.StartDate != nil {
		t.Errorf("expected StartDate to be nil, got %v", req.StartDate)
	}
	if req.EndDate != nil {
		t.Errorf("expected EndDate to be nil, got %v", req.EndDate)
	}
}

func TestUpdateDisposalStatusRequestJSON(t *testing.T) {
	approver := uuid.New()
	body := `{
		"status":"approved",
		"approvedBy":"` + approver.String() + `",
		"disposalDate":"2025-12-01T00:00:00Z"
	}`

	var req UpdateDisposalStatusRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateDisposalStatusRequest: %v", err)
	}

	if req.Status != "approved" {
		t.Errorf("Status mismatch: expected %q, got %q", "approved", req.Status)
	}
	if req.ApprovedBy == nil || *req.ApprovedBy != approver {
		t.Errorf("ApprovedBy mismatch")
	}
	if req.DisposalDate == nil {
		t.Error("expected DisposalDate to be non-nil")
	}
	if req.DisposalCertificateDocID != nil {
		t.Errorf("expected DisposalCertificateDocID to be nil, got %v", req.DisposalCertificateDocID)
	}
}

func TestCreateDisposalRequestJSON(t *testing.T) {
	assetID := uuid.New()
	w1 := uuid.New()
	w2 := uuid.New()
	body := `{
		"assetId":"` + assetID.String() + `",
		"disposalMethod":"recycling",
		"reason":"End of life",
		"witnessIds":["` + w1.String() + `","` + w2.String() + `"],
		"dataWipeConfirmed":true
	}`

	var req CreateDisposalRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateDisposalRequest: %v", err)
	}

	if req.AssetID != assetID {
		t.Errorf("AssetID mismatch")
	}
	if req.DisposalMethod != "recycling" {
		t.Errorf("DisposalMethod mismatch: expected %q, got %q", "recycling", req.DisposalMethod)
	}
	if req.Reason != "End of life" {
		t.Errorf("Reason mismatch: expected %q, got %q", "End of life", req.Reason)
	}
	if len(req.WitnessIDs) != 2 {
		t.Errorf("WitnessIDs mismatch: expected 2, got %d", len(req.WitnessIDs))
	}
	if !req.DataWipeConfirmed {
		t.Error("expected DataWipeConfirmed to be true")
	}
	if req.ApprovalChainID != nil {
		t.Errorf("expected ApprovalChainID to be nil, got %v", req.ApprovalChainID)
	}
}

func TestCreateLifecycleEventRequestJSON(t *testing.T) {
	assetID := uuid.New()
	evidenceID := uuid.New()
	body := `{
		"assetId":"` + assetID.String() + `",
		"eventType":"deployed",
		"evidenceDocumentId":"` + evidenceID.String() + `"
	}`

	var req CreateLifecycleEventRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateLifecycleEventRequest: %v", err)
	}

	if req.AssetID != assetID {
		t.Errorf("AssetID mismatch")
	}
	if req.EventType != "deployed" {
		t.Errorf("EventType mismatch: expected %q, got %q", "deployed", req.EventType)
	}
	if req.EvidenceDocumentID == nil || *req.EvidenceDocumentID != evidenceID {
		t.Errorf("EvidenceDocumentID mismatch")
	}
}

func TestCreateReconciliationRunRequestJSON(t *testing.T) {
	body := `{"source":"network_scanner"}`

	var req CreateReconciliationRunRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateReconciliationRunRequest: %v", err)
	}

	if req.Source != "network_scanner" {
		t.Errorf("Source mismatch: expected %q, got %q", "network_scanner", req.Source)
	}
	if req.Report != nil {
		t.Errorf("expected Report to be nil, got %v", req.Report)
	}
}

func TestUpdateReconciliationRunRequestJSON(t *testing.T) {
	matches := 150
	discrepancies := 5
	newItems := 3
	body := `{
		"completedAt":"2025-06-01T12:00:00Z",
		"matches":150,
		"discrepancies":5,
		"newItems":3
	}`

	var req UpdateReconciliationRunRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateReconciliationRunRequest: %v", err)
	}

	if req.CompletedAt == nil {
		t.Error("expected CompletedAt to be non-nil")
	}
	if req.Matches == nil || *req.Matches != matches {
		t.Errorf("Matches mismatch: expected %d, got %v", matches, req.Matches)
	}
	if req.Discrepancies == nil || *req.Discrepancies != discrepancies {
		t.Errorf("Discrepancies mismatch: expected %d, got %v", discrepancies, req.Discrepancies)
	}
	if req.NewItems == nil || *req.NewItems != newItems {
		t.Errorf("NewItems mismatch: expected %d, got %v", newItems, req.NewItems)
	}
	if req.Report != nil {
		t.Errorf("expected Report to be nil, got %v", req.Report)
	}
}

func TestCreateLicenseAssignmentRequestJSON(t *testing.T) {
	licenseID := uuid.New()
	userID := uuid.New()
	body := `{
		"licenseId":"` + licenseID.String() + `",
		"userId":"` + userID.String() + `"
	}`

	var req CreateLicenseAssignmentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateLicenseAssignmentRequest: %v", err)
	}

	if req.LicenseID != licenseID {
		t.Errorf("LicenseID mismatch")
	}
	if req.UserID == nil || *req.UserID != userID {
		t.Errorf("UserID mismatch")
	}
	if req.AssetID != nil {
		t.Errorf("expected AssetID to be nil, got %v", req.AssetID)
	}
}

func TestCreateLicenseAssignmentRequestJSON_AssetOnly(t *testing.T) {
	licenseID := uuid.New()
	assetID := uuid.New()
	body := `{
		"licenseId":"` + licenseID.String() + `",
		"assetId":"` + assetID.String() + `"
	}`

	var req CreateLicenseAssignmentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateLicenseAssignmentRequest: %v", err)
	}

	if req.LicenseID != licenseID {
		t.Errorf("LicenseID mismatch")
	}
	if req.AssetID == nil || *req.AssetID != assetID {
		t.Errorf("AssetID mismatch")
	}
	if req.UserID != nil {
		t.Errorf("expected UserID to be nil, got %v", req.UserID)
	}
}

// ──────────────────────────────────────────────
// Domain type edge cases
// ──────────────────────────────────────────────

func TestAssetLifecycleEvent_NilEvidenceDoc(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	event := AssetLifecycleEvent{
		ID:          uuid.New(),
		AssetID:     uuid.New(),
		TenantID:    uuid.New(),
		EventType:   LifecycleEventProcured,
		PerformedBy: uuid.New(),
		Details:     json.RawMessage(`{}`),
		CreatedAt:   now,
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded AssetLifecycleEvent
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.EvidenceDocumentID != nil {
		t.Errorf("expected EvidenceDocumentID to be nil, got %v", decoded.EvidenceDocumentID)
	}
}

func TestAssetDisposal_EmptyWitnessIDs(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	disposal := AssetDisposal{
		ID:                uuid.New(),
		AssetID:           uuid.New(),
		TenantID:          uuid.New(),
		DisposalMethod:    DisposalMethodResale,
		DataWipeConfirmed: false,
		Status:            DisposalStatusPendingApproval,
		WitnessIDs:        []uuid.UUID{},
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	data, err := json.Marshal(disposal)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded AssetDisposal
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(decoded.WitnessIDs) != 0 {
		t.Errorf("expected empty WitnessIDs, got %d", len(decoded.WitnessIDs))
	}
	if decoded.DataWipeConfirmed {
		t.Error("expected DataWipeConfirmed to be false")
	}
}

func TestReconciliationRun_NilCompletedAt(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	run := ReconciliationRun{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Source:    "manual",
		StartedAt: now,
		Matches:   0,
		CreatedAt: now,
	}

	data, err := json.Marshal(run)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ReconciliationRun
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.CompletedAt != nil {
		t.Errorf("expected CompletedAt to be nil, got %v", decoded.CompletedAt)
	}
	if decoded.Source != "manual" {
		t.Errorf("Source mismatch: expected %q, got %q", "manual", decoded.Source)
	}
}

func TestLicenseAssignment_NilFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	// Neither UserID nor AssetID
	assignment := LicenseAssignment{
		ID:         uuid.New(),
		LicenseID:  uuid.New(),
		TenantID:   uuid.New(),
		AssignedAt: now,
	}

	data, err := json.Marshal(assignment)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded LicenseAssignment
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.UserID != nil {
		t.Errorf("expected UserID to be nil, got %v", decoded.UserID)
	}
	if decoded.AssetID != nil {
		t.Errorf("expected AssetID to be nil, got %v", decoded.AssetID)
	}
}

// ──────────────────────────────────────────────
// validAssetTransitions map completeness
// ──────────────────────────────────────────────

func TestValidAssetTransitions_AllStatesInMap(t *testing.T) {
	allStatuses := []string{
		AssetStatusProcured,
		AssetStatusReceived,
		AssetStatusActive,
		AssetStatusMaintenance,
		AssetStatusRetired,
		AssetStatusDisposed,
	}

	for _, s := range allStatuses {
		if _, ok := validAssetTransitions[s]; !ok {
			t.Errorf("status %q is not defined in validAssetTransitions map", s)
		}
	}
}

func TestValidAssetTransitions_NoUnknownTargets(t *testing.T) {
	knownStatuses := map[string]bool{
		AssetStatusProcured:    true,
		AssetStatusReceived:    true,
		AssetStatusActive:      true,
		AssetStatusMaintenance: true,
		AssetStatusRetired:     true,
		AssetStatusDisposed:    true,
	}

	for from, targets := range validAssetTransitions {
		for _, to := range targets {
			if !knownStatuses[to] {
				t.Errorf("transition %s -> %s references unknown status %q", from, to, to)
			}
		}
	}
}
