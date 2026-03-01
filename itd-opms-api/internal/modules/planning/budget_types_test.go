package planning

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Entry type constants
// ──────────────────────────────────────────────

func TestEntryTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Actual", EntryTypeActual, "actual"},
		{"Committed", EntryTypeCommitted, "committed"},
		{"Forecast", EntryTypeForecast, "forecast"},
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
// CostEntry JSON round-trip
// ──────────────────────────────────────────────

func TestCostEntryJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	vendor := "ACME Corp"
	invoiceRef := "INV-2026-001"
	original := CostEntry{
		ID:           uuid.New(),
		TenantID:     uuid.New(),
		ProjectID:    uuid.New(),
		CategoryName: "Hardware",
		Description:  "Server purchase",
		Amount:       25000.50,
		EntryType:    EntryTypeActual,
		EntryDate:    now,
		VendorName:   &vendor,
		InvoiceRef:   &invoiceRef,
		CreatedBy:    uuid.New(),
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CostEntry: %v", err)
	}

	var decoded CostEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CostEntry: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Amount != original.Amount {
		t.Errorf("Amount mismatch: expected %f, got %f", original.Amount, decoded.Amount)
	}
	if decoded.EntryType != original.EntryType {
		t.Errorf("EntryType mismatch: expected %q, got %q", original.EntryType, decoded.EntryType)
	}
	if decoded.VendorName == nil || *decoded.VendorName != vendor {
		t.Errorf("VendorName mismatch")
	}
	if decoded.InvoiceRef == nil || *decoded.InvoiceRef != invoiceRef {
		t.Errorf("InvoiceRef mismatch")
	}
	if decoded.Description != original.Description {
		t.Errorf("Description mismatch")
	}
}

// ──────────────────────────────────────────────
// BudgetSummary JSON round-trip
// ──────────────────────────────────────────────

func TestBudgetSummaryJSONRoundTrip(t *testing.T) {
	original := BudgetSummary{
		ProjectID:             uuid.New(),
		ApprovedBudget:        500000.0,
		ActualSpend:           150000.0,
		CommittedSpend:        100000.0,
		ForecastTotal:         480000.0,
		RemainingBudget:       250000.0,
		VariancePct:           -4.0,
		BurnRate:              50000.0,
		MonthsRemaining:       5.0,
		EstimatedAtCompletion: 480000.0,
		CostPerformanceIndex:  1.04,
		ByCategory: []CategorySpend{
			{
				CategoryID:   uuid.New(),
				CategoryName: "Personnel",
				Actual:       100000,
				Committed:    50000,
				Forecast:     200000,
			},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal BudgetSummary: %v", err)
	}

	var decoded BudgetSummary
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal BudgetSummary: %v", err)
	}

	if decoded.ProjectID != original.ProjectID {
		t.Errorf("ProjectID mismatch")
	}
	if decoded.ApprovedBudget != original.ApprovedBudget {
		t.Errorf("ApprovedBudget mismatch")
	}
	if decoded.ActualSpend != original.ActualSpend {
		t.Errorf("ActualSpend mismatch")
	}
	if decoded.CostPerformanceIndex != original.CostPerformanceIndex {
		t.Errorf("CostPerformanceIndex mismatch")
	}
	if len(decoded.ByCategory) != 1 {
		t.Fatalf("ByCategory length mismatch: expected 1, got %d", len(decoded.ByCategory))
	}
	if decoded.ByCategory[0].CategoryName != "Personnel" {
		t.Errorf("ByCategory[0].CategoryName mismatch")
	}
}

// ──────────────────────────────────────────────
// BudgetSnapshot JSON round-trip
// ──────────────────────────────────────────────

func TestBudgetSnapshotJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	notes := "End of Q1 snapshot"
	original := BudgetSnapshot{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		ProjectID:      uuid.New(),
		SnapshotDate:   now,
		ApprovedBudget: 500000.0,
		ActualSpend:    150000.0,
		CommittedSpend: 100000.0,
		ForecastTotal:  480000.0,
		CompletionPct:  30.0,
		Notes:          &notes,
		CreatedBy:      uuid.New(),
		CreatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal BudgetSnapshot: %v", err)
	}

	var decoded BudgetSnapshot
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal BudgetSnapshot: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.CompletionPct != 30.0 {
		t.Errorf("CompletionPct mismatch: expected 30.0, got %f", decoded.CompletionPct)
	}
	if decoded.Notes == nil || *decoded.Notes != notes {
		t.Errorf("Notes mismatch")
	}
}

// ──────────────────────────────────────────────
// BurnRatePoint JSON round-trip
// ──────────────────────────────────────────────

func TestBurnRatePointJSONRoundTrip(t *testing.T) {
	original := BurnRatePoint{
		Period:           "2026-01",
		Actual:           50000.0,
		Committed:        30000.0,
		Forecast:         60000.0,
		CumulativeActual: 150000.0,
		BudgetLine:       41666.67,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal BurnRatePoint: %v", err)
	}

	var decoded BurnRatePoint
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal BurnRatePoint: %v", err)
	}

	if decoded.Period != "2026-01" {
		t.Errorf("Period mismatch")
	}
	if decoded.Actual != 50000.0 {
		t.Errorf("Actual mismatch")
	}
	if decoded.CumulativeActual != 150000.0 {
		t.Errorf("CumulativeActual mismatch")
	}
}

// ──────────────────────────────────────────────
// BudgetForecast JSON round-trip
// ──────────────────────────────────────────────

func TestBudgetForecastJSONRoundTrip(t *testing.T) {
	original := BudgetForecast{
		ProjectID:             uuid.New(),
		ApprovedBudget:        500000.0,
		ActualSpend:           150000.0,
		CompletionPct:         30.0,
		EstimatedAtCompletion: 500000.0,
		VarianceAtCompletion:  0.0,
		CostPerformanceIndex:  1.0,
		ForecastPoints: []BurnRatePoint{
			{Period: "2026-02", Forecast: 60000.0},
			{Period: "2026-03", Forecast: 55000.0},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal BudgetForecast: %v", err)
	}

	var decoded BudgetForecast
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal BudgetForecast: %v", err)
	}

	if decoded.ProjectID != original.ProjectID {
		t.Errorf("ProjectID mismatch")
	}
	if decoded.EstimatedAtCompletion != original.EstimatedAtCompletion {
		t.Errorf("EstimatedAtCompletion mismatch")
	}
	if len(decoded.ForecastPoints) != 2 {
		t.Fatalf("ForecastPoints length mismatch: expected 2, got %d", len(decoded.ForecastPoints))
	}
	if decoded.ForecastPoints[0].Period != "2026-02" {
		t.Errorf("ForecastPoints[0].Period mismatch")
	}
}

// ──────────────────────────────────────────────
// PortfolioBudgetSummary JSON round-trip
// ──────────────────────────────────────────────

func TestPortfolioBudgetSummaryJSONRoundTrip(t *testing.T) {
	original := PortfolioBudgetSummary{
		TotalApproved:  1000000.0,
		TotalSpent:     400000.0,
		TotalCommitted: 200000.0,
		TotalRemaining: 400000.0,
		AvgVariance:    -5.0,
		Projects: []PortfolioBudgetItem{
			{
				ProjectID:       uuid.New(),
				ProjectTitle:    "Project A",
				ProjectCode:     "PA-001",
				Status:          ProjectStatusActive,
				ApprovedBudget:  500000.0,
				ActualSpend:     200000.0,
				CommittedSpend:  100000.0,
				RemainingBudget: 200000.0,
				VariancePct:     -10.0,
			},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal PortfolioBudgetSummary: %v", err)
	}

	var decoded PortfolioBudgetSummary
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal PortfolioBudgetSummary: %v", err)
	}

	if decoded.TotalApproved != original.TotalApproved {
		t.Errorf("TotalApproved mismatch")
	}
	if decoded.TotalSpent != original.TotalSpent {
		t.Errorf("TotalSpent mismatch")
	}
	if len(decoded.Projects) != 1 {
		t.Fatalf("Projects length mismatch")
	}
	if decoded.Projects[0].ProjectTitle != "Project A" {
		t.Errorf("Projects[0].ProjectTitle mismatch")
	}
	if decoded.Projects[0].Status != ProjectStatusActive {
		t.Errorf("Projects[0].Status mismatch")
	}
}

// ──────────────────────────────────────────────
// CostCategory JSON round-trip
// ──────────────────────────────────────────────

func TestCostCategoryJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "Personnel costs"
	code := "PERS"
	original := CostCategory{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		Name:        "Personnel",
		Description: &desc,
		Code:        &code,
		IsActive:    true,
		CreatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CostCategory: %v", err)
	}

	var decoded CostCategory
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CostCategory: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != "Personnel" {
		t.Errorf("Name mismatch")
	}
	if decoded.IsActive != true {
		t.Errorf("IsActive mismatch")
	}
	if decoded.Code == nil || *decoded.Code != "PERS" {
		t.Errorf("Code mismatch")
	}
}

// ──────────────────────────────────────────────
// Budget request type JSON decoding
// ──────────────────────────────────────────────

func TestCreateCostEntryRequestJSON(t *testing.T) {
	body := `{
		"description": "Server license",
		"amount": 5000.0,
		"entryType": "actual"
	}`

	var req CreateCostEntryRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateCostEntryRequest: %v", err)
	}

	if req.Description != "Server license" {
		t.Errorf("Description mismatch")
	}
	if req.Amount != 5000.0 {
		t.Errorf("Amount mismatch")
	}
	if req.EntryType != "actual" {
		t.Errorf("EntryType mismatch")
	}
}

func TestCreateCostCategoryRequestJSON(t *testing.T) {
	body := `{"name": "Software", "code": "SW"}`

	var req CreateCostCategoryRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateCostCategoryRequest: %v", err)
	}

	if req.Name != "Software" {
		t.Errorf("Name mismatch")
	}
	if req.Code == nil || *req.Code != "SW" {
		t.Errorf("Code mismatch")
	}
}
