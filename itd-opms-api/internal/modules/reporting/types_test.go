package reporting

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Constant value tests
// ──────────────────────────────────────────────

func TestReportTypeConstants(t *testing.T) {
	expected := map[string]string{
		"ExecutivePack": "executive_pack",
		"SLAReport":     "sla_report",
		"AssetReport":   "asset_report",
		"GRCReport":     "grc_report",
		"PMOReport":     "pmo_report",
		"Custom":        "custom",
	}
	actual := map[string]string{
		"ExecutivePack": ReportTypeExecutivePack,
		"SLAReport":     ReportTypeSLAReport,
		"AssetReport":   ReportTypeAssetReport,
		"GRCReport":     ReportTypeGRCReport,
		"PMOReport":     ReportTypePMOReport,
		"Custom":        ReportTypeCustom,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("ReportType%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestRunStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Pending":    "pending",
		"Generating": "generating",
		"Completed":  "completed",
		"Failed":     "failed",
	}
	actual := map[string]string{
		"Pending":    RunStatusPending,
		"Generating": RunStatusGenerating,
		"Completed":  RunStatusCompleted,
		"Failed":     RunStatusFailed,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("RunStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestRunTriggerConstants(t *testing.T) {
	expected := map[string]string{
		"Manual":   "manual",
		"Schedule": "schedule",
		"System":   "system",
	}
	actual := map[string]string{
		"Manual":   RunTriggerManual,
		"Schedule": RunTriggerSchedule,
		"System":   RunTriggerSystem,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("RunTrigger%s = %q, want %q", name, actual[name], want)
		}
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestReportDefinitionJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	createdBy := uuid.New()
	recipientID := uuid.New()
	desc := "Monthly executive pack report"
	cron := "0 0 1 * *"

	original := ReportDefinition{
		ID:           id,
		TenantID:     tenantID,
		Name:         "Executive Pack Report",
		Description:  &desc,
		Type:         ReportTypeExecutivePack,
		Template:     json.RawMessage(`{"sections":["summary","tickets","projects"]}`),
		ScheduleCron: &cron,
		Recipients:   []uuid.UUID{recipientID},
		IsActive:     true,
		CreatedBy:    createdBy,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ReportDefinition: %v", err)
	}

	var decoded ReportDefinition
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ReportDefinition: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch: got %s, want %s", decoded.TenantID, original.TenantID)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch: got %v, want %q", decoded.Description, desc)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: got %q, want %q", decoded.Type, original.Type)
	}
	if decoded.ScheduleCron == nil || *decoded.ScheduleCron != cron {
		t.Errorf("ScheduleCron mismatch: got %v, want %q", decoded.ScheduleCron, cron)
	}
	if len(decoded.Recipients) != 1 {
		t.Errorf("Recipients length mismatch: got %d, want 1", len(decoded.Recipients))
	}
	if decoded.IsActive != original.IsActive {
		t.Errorf("IsActive mismatch: got %v, want %v", decoded.IsActive, original.IsActive)
	}
	if decoded.CreatedBy != original.CreatedBy {
		t.Errorf("CreatedBy mismatch: got %s, want %s", decoded.CreatedBy, original.CreatedBy)
	}
}

func TestReportDefinitionJSON_FieldNames(t *testing.T) {
	def := ReportDefinition{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Name:      "Test",
		Type:      ReportTypeCustom,
		Template:  json.RawMessage(`{}`),
		IsActive:  true,
		CreatedBy: uuid.New(),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(def)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "name", "description", "type", "template",
		"scheduleCron", "recipients", "isActive", "createdBy",
		"createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized ReportDefinition", field)
		}
	}
}

func TestReportRunJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	defID := uuid.New()
	tenantID := uuid.New()
	docID := uuid.New()
	errMsg := "timeout"

	original := ReportRun{
		ID:            id,
		DefinitionID:  defID,
		TenantID:      tenantID,
		Status:        RunStatusFailed,
		TriggerSource: RunTriggerManual,
		ScheduledFor:  &now,
		GeneratedAt:   &now,
		CompletedAt:   &now,
		DocumentID:    &docID,
		DataSnapshot:  json.RawMessage(`{"key":"value"}`),
		ErrorMessage:  &errMsg,
		CreatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ReportRun: %v", err)
	}

	var decoded ReportRun
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ReportRun: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.DefinitionID != original.DefinitionID {
		t.Errorf("DefinitionID mismatch: got %s, want %s", decoded.DefinitionID, original.DefinitionID)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, original.Status)
	}
	if decoded.TriggerSource != original.TriggerSource {
		t.Errorf("TriggerSource mismatch: got %q, want %q", decoded.TriggerSource, original.TriggerSource)
	}
	if decoded.DocumentID == nil || *decoded.DocumentID != docID {
		t.Errorf("DocumentID mismatch: got %v, want %v", decoded.DocumentID, &docID)
	}
	if decoded.ErrorMessage == nil || *decoded.ErrorMessage != errMsg {
		t.Errorf("ErrorMessage mismatch: got %v, want %q", decoded.ErrorMessage, errMsg)
	}
	if decoded.ScheduledFor == nil {
		t.Error("ScheduledFor should not be nil")
	}
	if decoded.GeneratedAt == nil {
		t.Error("GeneratedAt should not be nil")
	}
	if decoded.CompletedAt == nil {
		t.Error("CompletedAt should not be nil")
	}
}

func TestDashboardCacheJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	expiresAt := now.Add(5 * time.Minute)

	original := DashboardCache{
		ID:        id,
		TenantID:  tenantID,
		CacheKey:  "executive_summary:tenant1",
		Data:      json.RawMessage(`{"openTickets":42}`),
		ExpiresAt: expiresAt,
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal DashboardCache: %v", err)
	}

	var decoded DashboardCache
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal DashboardCache: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.CacheKey != original.CacheKey {
		t.Errorf("CacheKey mismatch: got %q, want %q", decoded.CacheKey, original.CacheKey)
	}
}

func TestSavedSearchJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	userID := uuid.New()

	original := SavedSearch{
		ID:          id,
		TenantID:    tenantID,
		UserID:      userID,
		Query:       "server outage",
		EntityTypes: []string{"ticket", "article"},
		IsSaved:     true,
		LastUsedAt:  now,
		CreatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SavedSearch: %v", err)
	}

	var decoded SavedSearch
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SavedSearch: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch: got %s, want %s", decoded.TenantID, original.TenantID)
	}
	if decoded.UserID != original.UserID {
		t.Errorf("UserID mismatch: got %s, want %s", decoded.UserID, original.UserID)
	}
	if decoded.Query != original.Query {
		t.Errorf("Query mismatch: got %q, want %q", decoded.Query, original.Query)
	}
	if len(decoded.EntityTypes) != 2 {
		t.Errorf("EntityTypes length mismatch: got %d, want 2", len(decoded.EntityTypes))
	}
	if decoded.IsSaved != original.IsSaved {
		t.Errorf("IsSaved mismatch: got %v, want %v", decoded.IsSaved, original.IsSaved)
	}
}

func TestSavedSearchJSON_FieldNames(t *testing.T) {
	search := SavedSearch{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		UserID:     uuid.New(),
		Query:      "test",
		IsSaved:    false,
		LastUsedAt: time.Now().UTC(),
		CreatedAt:  time.Now().UTC(),
	}

	data, err := json.Marshal(search)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "userId", "query", "entityTypes",
		"isSaved", "lastUsedAt", "createdAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized SavedSearch", field)
		}
	}
}

func TestExecutiveSummaryJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	tenantID := uuid.New()

	original := ExecutiveSummary{
		TenantID:                   tenantID,
		ActivePolicies:             12,
		OverdueActions:             3,
		PendingAttestations:        5,
		AvgOKRProgress:             0.72,
		OpenTickets:                45,
		CriticalTickets:            2,
		OpenTicketsP1:              2,
		OpenTicketsP2:              8,
		OpenTicketsP3:              20,
		OpenTicketsP4:              15,
		SLACompliancePct:           95.5,
		MTTRMinutes:                120.3,
		MTTAMinutes:                15.7,
		BacklogOver30Days:          7,
		ActiveProjects:             10,
		ProjectsRAGGreen:           6,
		ProjectsRAGAmber:           3,
		ProjectsRAGRed:             1,
		OnTimeDeliveryPct:          85.0,
		MilestoneBurnDownPct:       60.5,
		ActiveAssets:               500,
		AssetCountsByType:          map[string]int{"laptop": 200, "server": 50, "network": 100},
		AssetCountsByStatus:        map[string]int{"active": 400, "retired": 100},
		OverDeployedLicenses:       5,
		LicenseCompliancePct:       98.2,
		WarrantiesExpiring90Days:   12,
		HighRisks:                  3,
		CriticalRisks:              1,
		AuditReadinessScore:        87.5,
		AccessReviewCompletionPct:  92.0,
		TeamCapacityUtilizationPct: 78.3,
		OverdueTrainingCerts:       4,
		ExpiringCerts:              8,
		OpenP1Incidents:            2,
		SLABreaches24h:             1,
		RefreshedAt:                now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ExecutiveSummary: %v", err)
	}

	var decoded ExecutiveSummary
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ExecutiveSummary: %v", err)
	}

	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch: got %s, want %s", decoded.TenantID, original.TenantID)
	}
	if decoded.ActivePolicies != original.ActivePolicies {
		t.Errorf("ActivePolicies mismatch: got %d, want %d", decoded.ActivePolicies, original.ActivePolicies)
	}
	if decoded.OpenTickets != original.OpenTickets {
		t.Errorf("OpenTickets mismatch: got %d, want %d", decoded.OpenTickets, original.OpenTickets)
	}
	if decoded.CriticalTickets != original.CriticalTickets {
		t.Errorf("CriticalTickets mismatch: got %d, want %d", decoded.CriticalTickets, original.CriticalTickets)
	}
	if decoded.SLACompliancePct != original.SLACompliancePct {
		t.Errorf("SLACompliancePct mismatch: got %f, want %f", decoded.SLACompliancePct, original.SLACompliancePct)
	}
	if decoded.MTTRMinutes != original.MTTRMinutes {
		t.Errorf("MTTRMinutes mismatch: got %f, want %f", decoded.MTTRMinutes, original.MTTRMinutes)
	}
	if decoded.ActiveProjects != original.ActiveProjects {
		t.Errorf("ActiveProjects mismatch: got %d, want %d", decoded.ActiveProjects, original.ActiveProjects)
	}
	if decoded.ProjectsRAGGreen != original.ProjectsRAGGreen {
		t.Errorf("ProjectsRAGGreen mismatch: got %d, want %d", decoded.ProjectsRAGGreen, original.ProjectsRAGGreen)
	}
	if decoded.ActiveAssets != original.ActiveAssets {
		t.Errorf("ActiveAssets mismatch: got %d, want %d", decoded.ActiveAssets, original.ActiveAssets)
	}
	if len(decoded.AssetCountsByType) != 3 {
		t.Errorf("AssetCountsByType length mismatch: got %d, want 3", len(decoded.AssetCountsByType))
	}
	if len(decoded.AssetCountsByStatus) != 2 {
		t.Errorf("AssetCountsByStatus length mismatch: got %d, want 2", len(decoded.AssetCountsByStatus))
	}
	if decoded.HighRisks != original.HighRisks {
		t.Errorf("HighRisks mismatch: got %d, want %d", decoded.HighRisks, original.HighRisks)
	}
	if decoded.CriticalRisks != original.CriticalRisks {
		t.Errorf("CriticalRisks mismatch: got %d, want %d", decoded.CriticalRisks, original.CriticalRisks)
	}
	if decoded.OpenP1Incidents != original.OpenP1Incidents {
		t.Errorf("OpenP1Incidents mismatch: got %d, want %d", decoded.OpenP1Incidents, original.OpenP1Incidents)
	}
	if decoded.SLABreaches24h != original.SLABreaches24h {
		t.Errorf("SLABreaches24h mismatch: got %d, want %d", decoded.SLABreaches24h, original.SLABreaches24h)
	}
}

func TestExecutiveSummaryJSON_FieldNames(t *testing.T) {
	summary := ExecutiveSummary{
		TenantID:    uuid.New(),
		RefreshedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(summary)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"tenantId", "activePolicies", "overdueActions", "pendingAttestations",
		"avgOkrProgress", "openTickets", "criticalTickets",
		"openTicketsP1", "openTicketsP2", "openTicketsP3", "openTicketsP4",
		"slaCompliancePct", "mttrMinutes", "mttaMinutes", "backlogOver30Days",
		"activeProjects", "projectsRagGreen", "projectsRagAmber", "projectsRagRed",
		"onTimeDeliveryPct", "milestoneBurnDownPct",
		"activeAssets", "assetCountsByType", "assetCountsByStatus",
		"overDeployedLicenses", "licenseCompliancePct", "warrantiesExpiring90Days",
		"highRisks", "criticalRisks", "auditReadinessScore", "accessReviewCompletionPct",
		"teamCapacityUtilizationPct", "overdueTrainingCerts", "expiringCerts",
		"openP1Incidents", "slaBreaches24h", "refreshedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized ExecutiveSummary", field)
		}
	}
}

func TestChartDataPointJSON_RoundTrip(t *testing.T) {
	original := ChartDataPoint{
		Label: "P1_critical",
		Value: 5,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ChartDataPoint: %v", err)
	}

	var decoded ChartDataPoint
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ChartDataPoint: %v", err)
	}

	if decoded.Label != original.Label {
		t.Errorf("Label mismatch: got %q, want %q", decoded.Label, original.Label)
	}
	if decoded.Value != original.Value {
		t.Errorf("Value mismatch: got %d, want %d", decoded.Value, original.Value)
	}
}

func TestSLAComplianceRateJSON_RoundTrip(t *testing.T) {
	original := SLAComplianceRate{Rate: 95.7}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SLAComplianceRate: %v", err)
	}

	var decoded SLAComplianceRate
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SLAComplianceRate: %v", err)
	}

	if decoded.Rate != original.Rate {
		t.Errorf("Rate mismatch: got %f, want %f", decoded.Rate, original.Rate)
	}
}

// ──────────────────────────────────────────────
// Request type JSON tests
// ──────────────────────────────────────────────

func TestCreateReportDefinitionRequestJSON_RoundTrip(t *testing.T) {
	recipientID := uuid.New()
	desc := "Monthly SLA report"
	cron := "0 0 * * 1"

	original := CreateReportDefinitionRequest{
		Name:         "SLA Report",
		Description:  &desc,
		Type:         ReportTypeSLAReport,
		Template:     json.RawMessage(`{"format":"pdf"}`),
		ScheduleCron: &cron,
		Recipients:   []uuid.UUID{recipientID},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateReportDefinitionRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: got %q, want %q", decoded.Type, original.Type)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch")
	}
	if decoded.ScheduleCron == nil || *decoded.ScheduleCron != cron {
		t.Errorf("ScheduleCron mismatch")
	}
	if len(decoded.Recipients) != 1 {
		t.Errorf("Recipients length mismatch: got %d, want 1", len(decoded.Recipients))
	}
}

func TestCreateSavedSearchRequestJSON_RoundTrip(t *testing.T) {
	original := CreateSavedSearchRequest{
		Query:       "network outage",
		EntityTypes: []string{"ticket", "project"},
		IsSaved:     true,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateSavedSearchRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Query != original.Query {
		t.Errorf("Query mismatch: got %q, want %q", decoded.Query, original.Query)
	}
	if len(decoded.EntityTypes) != 2 {
		t.Errorf("EntityTypes length mismatch: got %d, want 2", len(decoded.EntityTypes))
	}
	if decoded.IsSaved != original.IsSaved {
		t.Errorf("IsSaved mismatch: got %v, want %v", decoded.IsSaved, original.IsSaved)
	}
}

func TestReportDefinitionJSON_NilOptionalFields(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	original := ReportDefinition{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Name:      "Minimal",
		Type:      ReportTypeCustom,
		Template:  json.RawMessage(`{}`),
		IsActive:  false,
		CreatedBy: uuid.New(),
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ReportDefinition
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Description != nil {
		t.Errorf("expected nil Description, got %v", decoded.Description)
	}
	if decoded.ScheduleCron != nil {
		t.Errorf("expected nil ScheduleCron, got %v", decoded.ScheduleCron)
	}
}

// ──────────────────────────────────────────────
// UpdateReportDefinitionRequest JSON tests
// ──────────────────────────────────────────────

func TestUpdateReportDefinitionRequestJSON_FullParse(t *testing.T) {
	name := "Updated Report"
	desc := "Updated description"
	typ := ReportTypeSLAReport
	cron := "0 0 * * 1"
	isActive := false
	recipientID := uuid.New()

	original := UpdateReportDefinitionRequest{
		Name:         &name,
		Description:  &desc,
		Type:         &typ,
		Template:     json.RawMessage(`{"sections":["new"]}`),
		ScheduleCron: &cron,
		Recipients:   []uuid.UUID{recipientID},
		IsActive:     &isActive,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal UpdateReportDefinitionRequest: %v", err)
	}

	var decoded UpdateReportDefinitionRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal UpdateReportDefinitionRequest: %v", err)
	}

	if decoded.Name == nil || *decoded.Name != name {
		t.Errorf("Name mismatch: got %v, want %q", decoded.Name, name)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch")
	}
	if decoded.Type == nil || *decoded.Type != typ {
		t.Errorf("Type mismatch: got %v, want %q", decoded.Type, typ)
	}
	if decoded.ScheduleCron == nil || *decoded.ScheduleCron != cron {
		t.Errorf("ScheduleCron mismatch")
	}
	if decoded.IsActive == nil || *decoded.IsActive != isActive {
		t.Errorf("IsActive mismatch: got %v, want %v", decoded.IsActive, isActive)
	}
	if len(decoded.Recipients) != 1 || decoded.Recipients[0] != recipientID {
		t.Errorf("Recipients mismatch: got %v", decoded.Recipients)
	}
}

func TestUpdateReportDefinitionRequestJSON_PartialUpdate(t *testing.T) {
	input := `{"name":"Only Name"}`
	var req UpdateReportDefinitionRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name == nil || *req.Name != "Only Name" {
		t.Errorf("Name mismatch: got %v", req.Name)
	}
	// All other fields should be nil.
	if req.Description != nil {
		t.Errorf("expected nil Description, got %v", req.Description)
	}
	if req.Type != nil {
		t.Errorf("expected nil Type, got %v", req.Type)
	}
	if req.ScheduleCron != nil {
		t.Errorf("expected nil ScheduleCron, got %v", req.ScheduleCron)
	}
	if req.IsActive != nil {
		t.Errorf("expected nil IsActive, got %v", req.IsActive)
	}
	if req.Recipients != nil {
		t.Errorf("expected nil Recipients, got %v", req.Recipients)
	}
	if req.Template != nil {
		t.Errorf("expected nil Template, got %v", req.Template)
	}
}

func TestUpdateReportDefinitionRequestJSON_EmptyObject(t *testing.T) {
	input := `{}`
	var req UpdateReportDefinitionRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// All fields should be nil for empty JSON.
	if req.Name != nil {
		t.Errorf("expected nil Name")
	}
	if req.IsActive != nil {
		t.Errorf("expected nil IsActive")
	}
}

// ──────────────────────────────────────────────
// OfficeAnalytics JSON tests
// ──────────────────────────────────────────────

func TestOfficeAnalyticsJSON_RoundTrip(t *testing.T) {
	divID := uuid.New()
	original := OfficeAnalytics{
		DivisionID:         divID,
		DivisionName:       "Engineering Office",
		DivisionCode:       "ENG",
		TotalProjects:      15,
		ActiveProjects:     10,
		CompletedProjects:  5,
		AvgCompletionPct:   68.5,
		BudgetApproved:     1000000.50,
		BudgetSpent:        750000.25,
		RAGGreen:           6,
		RAGAmber:           3,
		RAGRed:             1,
		OpenRisks:          4,
		OpenIssues:         2,
		TotalWorkItems:     100,
		CompletedWorkItems: 70,
		OverdueWorkItems:   5,
		StaffCount:         25,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal OfficeAnalytics: %v", err)
	}

	var decoded OfficeAnalytics
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal OfficeAnalytics: %v", err)
	}

	if decoded.DivisionID != divID {
		t.Errorf("DivisionID mismatch: got %s, want %s", decoded.DivisionID, divID)
	}
	if decoded.DivisionName != "Engineering Office" {
		t.Errorf("DivisionName mismatch: got %q", decoded.DivisionName)
	}
	if decoded.DivisionCode != "ENG" {
		t.Errorf("DivisionCode mismatch: got %q", decoded.DivisionCode)
	}
	if decoded.TotalProjects != 15 {
		t.Errorf("TotalProjects mismatch: got %d, want 15", decoded.TotalProjects)
	}
	if decoded.ActiveProjects != 10 {
		t.Errorf("ActiveProjects mismatch: got %d, want 10", decoded.ActiveProjects)
	}
	if decoded.CompletedProjects != 5 {
		t.Errorf("CompletedProjects mismatch: got %d, want 5", decoded.CompletedProjects)
	}
	if decoded.AvgCompletionPct != 68.5 {
		t.Errorf("AvgCompletionPct mismatch: got %f, want 68.5", decoded.AvgCompletionPct)
	}
	if decoded.BudgetApproved != 1000000.50 {
		t.Errorf("BudgetApproved mismatch: got %f", decoded.BudgetApproved)
	}
	if decoded.BudgetSpent != 750000.25 {
		t.Errorf("BudgetSpent mismatch: got %f", decoded.BudgetSpent)
	}
	if decoded.RAGGreen != 6 || decoded.RAGAmber != 3 || decoded.RAGRed != 1 {
		t.Errorf("RAG mismatch: green=%d amber=%d red=%d", decoded.RAGGreen, decoded.RAGAmber, decoded.RAGRed)
	}
	if decoded.OpenRisks != 4 {
		t.Errorf("OpenRisks mismatch: got %d, want 4", decoded.OpenRisks)
	}
	if decoded.OpenIssues != 2 {
		t.Errorf("OpenIssues mismatch: got %d, want 2", decoded.OpenIssues)
	}
	if decoded.TotalWorkItems != 100 {
		t.Errorf("TotalWorkItems mismatch: got %d, want 100", decoded.TotalWorkItems)
	}
	if decoded.CompletedWorkItems != 70 {
		t.Errorf("CompletedWorkItems mismatch: got %d, want 70", decoded.CompletedWorkItems)
	}
	if decoded.OverdueWorkItems != 5 {
		t.Errorf("OverdueWorkItems mismatch: got %d, want 5", decoded.OverdueWorkItems)
	}
	if decoded.StaffCount != 25 {
		t.Errorf("StaffCount mismatch: got %d, want 25", decoded.StaffCount)
	}
}

func TestOfficeAnalyticsJSON_FieldNames(t *testing.T) {
	analytics := OfficeAnalytics{
		DivisionID:   uuid.New(),
		DivisionName: "Test",
		DivisionCode: "TST",
	}

	data, err := json.Marshal(analytics)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"divisionId", "divisionName", "divisionCode",
		"totalProjects", "activeProjects", "completedProjects",
		"avgCompletionPct", "budgetApproved", "budgetSpent",
		"ragGreen", "ragAmber", "ragRed",
		"openRisks", "openIssues",
		"totalWorkItems", "completedWorkItems", "overdueWorkItems",
		"staffCount",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized OfficeAnalytics", field)
		}
	}
}

// ──────────────────────────────────────────────
// ReportRun JSON field names test
// ──────────────────────────────────────────────

func TestReportRunJSON_FieldNames(t *testing.T) {
	now := time.Now().UTC()
	docID := uuid.New()
	errMsg := "timeout"
	run := ReportRun{
		ID:            uuid.New(),
		DefinitionID:  uuid.New(),
		TenantID:      uuid.New(),
		Status:        RunStatusCompleted,
		TriggerSource: RunTriggerManual,
		ScheduledFor:  &now,
		GeneratedAt:   &now,
		CompletedAt:   &now,
		DocumentID:    &docID,
		DataSnapshot:  json.RawMessage(`{}`),
		ErrorMessage:  &errMsg,
		CreatedAt:     now,
	}

	data, err := json.Marshal(run)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "definitionId", "tenantId", "status", "triggerSource",
		"scheduledFor", "generatedAt", "completedAt", "documentId",
		"dataSnapshot", "errorMessage", "createdAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized ReportRun", field)
		}
	}
}

// ──────────────────────────────────────────────
// DashboardCache JSON field names test
// ──────────────────────────────────────────────

func TestDashboardCacheJSON_FieldNames(t *testing.T) {
	cache := DashboardCache{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		CacheKey:  "test_key",
		Data:      json.RawMessage(`{}`),
		ExpiresAt: time.Now().UTC(),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(cache)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "cacheKey", "data",
		"expiresAt", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized DashboardCache", field)
		}
	}
}

// ──────────────────────────────────────────────
// ReportRun minimal values (nil optional fields)
// ──────────────────────────────────────────────

func TestReportRunJSON_NilOptionalFields(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	original := ReportRun{
		ID:            uuid.New(),
		DefinitionID:  uuid.New(),
		TenantID:      uuid.New(),
		Status:        RunStatusPending,
		TriggerSource: RunTriggerManual,
		DataSnapshot:  json.RawMessage(`{}`),
		CreatedAt:     now,
		// ScheduledFor, GeneratedAt, CompletedAt, DocumentID, ErrorMessage all nil
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ReportRun
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.ScheduledFor != nil {
		t.Errorf("expected nil ScheduledFor, got %v", decoded.ScheduledFor)
	}
	if decoded.GeneratedAt != nil {
		t.Errorf("expected nil GeneratedAt, got %v", decoded.GeneratedAt)
	}
	if decoded.CompletedAt != nil {
		t.Errorf("expected nil CompletedAt, got %v", decoded.CompletedAt)
	}
	if decoded.DocumentID != nil {
		t.Errorf("expected nil DocumentID, got %v", decoded.DocumentID)
	}
	if decoded.ErrorMessage != nil {
		t.Errorf("expected nil ErrorMessage, got %v", decoded.ErrorMessage)
	}
}

// ──────────────────────────────────────────────
// ExecutiveSummary with zero-value maps
// ──────────────────────────────────────────────

func TestExecutiveSummaryJSON_EmptyMaps(t *testing.T) {
	original := ExecutiveSummary{
		TenantID:            uuid.New(),
		AssetCountsByType:   map[string]int{},
		AssetCountsByStatus: map[string]int{},
		RefreshedAt:         time.Now().UTC(),
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ExecutiveSummary
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(decoded.AssetCountsByType) != 0 {
		t.Errorf("expected empty AssetCountsByType, got %v", decoded.AssetCountsByType)
	}
	if len(decoded.AssetCountsByStatus) != 0 {
		t.Errorf("expected empty AssetCountsByStatus, got %v", decoded.AssetCountsByStatus)
	}
}

func TestExecutiveSummaryJSON_NilMaps(t *testing.T) {
	original := ExecutiveSummary{
		TenantID:    uuid.New(),
		RefreshedAt: time.Now().UTC(),
		// AssetCountsByType and AssetCountsByStatus are nil
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ExecutiveSummary
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// nil maps should marshal as null and unmarshal as nil
	if decoded.AssetCountsByType != nil {
		t.Errorf("expected nil AssetCountsByType, got %v", decoded.AssetCountsByType)
	}
	if decoded.AssetCountsByStatus != nil {
		t.Errorf("expected nil AssetCountsByStatus, got %v", decoded.AssetCountsByStatus)
	}
}

// ──────────────────────────────────────────────
// CreateSavedSearchRequest with nil entity types
// ──────────────────────────────────────────────

func TestCreateSavedSearchRequestJSON_NilEntityTypes(t *testing.T) {
	input := `{"query":"test search"}`
	var req CreateSavedSearchRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Query != "test search" {
		t.Errorf("Query mismatch: got %q", req.Query)
	}
	if req.EntityTypes != nil {
		t.Errorf("expected nil EntityTypes, got %v", req.EntityTypes)
	}
	if req.IsSaved != false {
		t.Errorf("expected IsSaved false, got %v", req.IsSaved)
	}
}

// ──────────────────────────────────────────────
// ChartDataPoint zero value
// ──────────────────────────────────────────────

func TestChartDataPointJSON_ZeroValue(t *testing.T) {
	original := ChartDataPoint{
		Label: "",
		Value: 0,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ChartDataPoint
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Label != "" {
		t.Errorf("expected empty label, got %q", decoded.Label)
	}
	if decoded.Value != 0 {
		t.Errorf("expected zero value, got %d", decoded.Value)
	}
}

// ──────────────────────────────────────────────
// SavedSearch with empty entity types
// ──────────────────────────────────────────────

func TestSavedSearchJSON_EmptyEntityTypes(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	original := SavedSearch{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		UserID:      uuid.New(),
		Query:       "test",
		EntityTypes: []string{},
		IsSaved:     false,
		LastUsedAt:  now,
		CreatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded SavedSearch
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(decoded.EntityTypes) != 0 {
		t.Errorf("expected empty EntityTypes, got %v", decoded.EntityTypes)
	}
}

// ──────────────────────────────────────────────
// CreateReportDefinitionRequest minimal
// ──────────────────────────────────────────────

func TestCreateReportDefinitionRequestJSON_Minimal(t *testing.T) {
	input := `{"name":"Quick Report","type":"custom"}`
	var req CreateReportDefinitionRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name != "Quick Report" {
		t.Errorf("Name mismatch: got %q", req.Name)
	}
	if req.Type != "custom" {
		t.Errorf("Type mismatch: got %q", req.Type)
	}
	if req.Description != nil {
		t.Errorf("expected nil Description, got %v", req.Description)
	}
	if req.Template != nil {
		t.Errorf("expected nil Template, got %v", req.Template)
	}
	if req.ScheduleCron != nil {
		t.Errorf("expected nil ScheduleCron, got %v", req.ScheduleCron)
	}
	if req.Recipients != nil {
		t.Errorf("expected nil Recipients, got %v", req.Recipients)
	}
}

// ──────────────────────────────────────────────
// ReportDefinition with multiple recipients
// ──────────────────────────────────────────────

func TestReportDefinitionJSON_MultipleRecipients(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	r1 := uuid.New()
	r2 := uuid.New()
	r3 := uuid.New()

	original := ReportDefinition{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		Name:       "Multi Recipient Report",
		Type:       ReportTypeSLAReport,
		Template:   json.RawMessage(`{}`),
		Recipients: []uuid.UUID{r1, r2, r3},
		IsActive:   true,
		CreatedBy:  uuid.New(),
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded ReportDefinition
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(decoded.Recipients) != 3 {
		t.Fatalf("expected 3 recipients, got %d", len(decoded.Recipients))
	}
	if decoded.Recipients[0] != r1 || decoded.Recipients[1] != r2 || decoded.Recipients[2] != r3 {
		t.Error("recipients order mismatch")
	}
}
