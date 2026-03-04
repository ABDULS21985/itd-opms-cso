package calendar

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Window type constants
// ──────────────────────────────────────────────

func TestWindowTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Maintenance", WindowTypeMaintenance, "maintenance"},
		{"Deployment", WindowTypeDeployment, "deployment"},
		{"Release", WindowTypeRelease, "release"},
		{"Freeze", WindowTypeFreeze, "freeze"},
		{"Outage", WindowTypeOutage, "outage"},
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
// Window status constants
// ──────────────────────────────────────────────

func TestWindowStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Scheduled", StatusScheduled, "scheduled"},
		{"InProgress", StatusInProgress, "in_progress"},
		{"Completed", StatusCompleted, "completed"},
		{"Cancelled", StatusCancelled, "cancelled"},
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
// Impact level constants
// ──────────────────────────────────────────────

func TestImpactLevelConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"None", ImpactNone, "none"},
		{"Low", ImpactLow, "low"},
		{"Medium", ImpactMedium, "medium"},
		{"High", ImpactHigh, "high"},
		{"Critical", ImpactCritical, "critical"},
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
// Event type color mapping
// ──────────────────────────────────────────────

func TestEventTypeColors(t *testing.T) {
	expected := map[string]string{
		"maintenance":      "#3B82F6",
		"deployment":       "#8B5CF6",
		"release":          "#10B981",
		"freeze":           "#EF4444",
		"outage":           "#F97316",
		"milestone":        "#F59E0B",
		"change_request":   "#6366F1",
		"ticket_change":    "#EC4899",
		"project_deadline": "#14B8A6",
	}

	for key, wantColor := range expected {
		got, ok := EventTypeColors[key]
		if !ok {
			t.Errorf("expected event type %q to have a color", key)
			continue
		}
		if got != wantColor {
			t.Errorf("color for %q: expected %q, got %q", key, wantColor, got)
		}
	}

	if len(EventTypeColors) != len(expected) {
		t.Errorf("expected %d event type colors, got %d", len(expected), len(EventTypeColors))
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestCalendarEventJSONRoundTrip(t *testing.T) {
	desc := "Scheduled maintenance for DB servers"
	now := time.Now().UTC().Truncate(time.Second)
	original := CalendarEvent{
		ID:          uuid.New().String(),
		Title:       "DB Maintenance",
		Description: &desc,
		StartTime:   now,
		EndTime:     now.Add(2 * time.Hour),
		IsAllDay:    false,
		EventType:   "maintenance",
		Status:      StatusScheduled,
		ImpactLevel: ImpactMedium,
		Source:      "maintenance_windows",
		SourceID:    uuid.New().String(),
		SourceURL:   "/calendar/maintenance-windows/" + uuid.New().String(),
		Color:       "#3B82F6",
		CreatedBy:   "admin@test.com",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CalendarEvent: %v", err)
	}

	var decoded CalendarEvent
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CalendarEvent: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: expected %q, got %q", original.Title, decoded.Title)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch")
	}
	if decoded.EventType != "maintenance" {
		t.Errorf("EventType mismatch")
	}
	if decoded.Status != StatusScheduled {
		t.Errorf("Status mismatch")
	}
	if decoded.ImpactLevel != ImpactMedium {
		t.Errorf("ImpactLevel mismatch")
	}
	if decoded.Color != "#3B82F6" {
		t.Errorf("Color mismatch")
	}
	if decoded.IsAllDay {
		t.Errorf("IsAllDay mismatch: expected false")
	}
}

func TestMaintenanceWindowJSONRoundTrip(t *testing.T) {
	desc := "Server patching"
	rule := "FREQ=WEEKLY"
	now := time.Now().UTC().Truncate(time.Second)
	original := MaintenanceWindow{
		ID:               uuid.New(),
		TenantID:         uuid.New(),
		Title:            "Weekly Patch Window",
		Description:      &desc,
		WindowType:       WindowTypeMaintenance,
		Status:           StatusScheduled,
		StartTime:        now,
		EndTime:          now.Add(4 * time.Hour),
		IsAllDay:         false,
		RecurrenceRule:   &rule,
		AffectedServices: []string{"database", "api"},
		ImpactLevel:      ImpactMedium,
		CreatedBy:        uuid.New(),
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal MaintenanceWindow: %v", err)
	}

	var decoded MaintenanceWindow
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal MaintenanceWindow: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch")
	}
	if decoded.WindowType != WindowTypeMaintenance {
		t.Errorf("WindowType mismatch")
	}
	if decoded.Status != StatusScheduled {
		t.Errorf("Status mismatch")
	}
	if decoded.RecurrenceRule == nil || *decoded.RecurrenceRule != rule {
		t.Errorf("RecurrenceRule mismatch")
	}
	if len(decoded.AffectedServices) != 2 || decoded.AffectedServices[0] != "database" {
		t.Errorf("AffectedServices mismatch: got %v", decoded.AffectedServices)
	}
	if decoded.ImpactLevel != ImpactMedium {
		t.Errorf("ImpactLevel mismatch")
	}
}

func TestChangeFreezePeriodJSONRoundTrip(t *testing.T) {
	reason := "Year-end freeze"
	now := time.Now().UTC().Truncate(time.Second)
	original := ChangeFreezePeriod{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		Name:       "Year-End Freeze",
		Reason:     &reason,
		StartTime:  now,
		EndTime:    now.Add(14 * 24 * time.Hour),
		Exceptions: json.RawMessage(`["critical-hotfixes"]`),
		CreatedBy:  uuid.New(),
		CreatedAt:  now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ChangeFreezePeriod: %v", err)
	}

	var decoded ChangeFreezePeriod
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ChangeFreezePeriod: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != "Year-End Freeze" {
		t.Errorf("Name mismatch")
	}
	if decoded.Reason == nil || *decoded.Reason != reason {
		t.Errorf("Reason mismatch")
	}
}

func TestConflictResultJSONRoundTrip(t *testing.T) {
	original := ConflictResult{
		OverlappingEvents: []CalendarEvent{
			{ID: "1", Title: "Event 1", EventType: "maintenance"},
		},
		FreezePeriods: []ChangeFreezePeriod{
			{ID: uuid.New(), Name: "Freeze 1"},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ConflictResult: %v", err)
	}

	var decoded ConflictResult
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ConflictResult: %v", err)
	}

	if len(decoded.OverlappingEvents) != 1 {
		t.Errorf("OverlappingEvents count mismatch: expected 1, got %d", len(decoded.OverlappingEvents))
	}
	if len(decoded.FreezePeriods) != 1 {
		t.Errorf("FreezePeriods count mismatch: expected 1, got %d", len(decoded.FreezePeriods))
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding
// ──────────────────────────────────────────────

func TestCreateMaintenanceWindowRequestJSON(t *testing.T) {
	body := `{
		"title": "DB Maintenance",
		"windowType": "maintenance",
		"startTime": "2026-03-15T02:00:00Z",
		"endTime": "2026-03-15T06:00:00Z",
		"impactLevel": "medium",
		"affectedServices": ["database", "api"]
	}`

	var req CreateMaintenanceWindowRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateMaintenanceWindowRequest: %v", err)
	}

	if req.Title != "DB Maintenance" {
		t.Errorf("Title mismatch")
	}
	if req.WindowType != "maintenance" {
		t.Errorf("WindowType mismatch")
	}
	if req.ImpactLevel != "medium" {
		t.Errorf("ImpactLevel mismatch")
	}
	if len(req.AffectedServices) != 2 {
		t.Errorf("AffectedServices mismatch")
	}
}

func TestCreateFreezePeriodRequestJSON(t *testing.T) {
	body := `{
		"name": "Holiday Freeze",
		"reason": "Year-end code freeze",
		"startTime": "2026-12-20T00:00:00Z",
		"endTime": "2027-01-03T00:00:00Z"
	}`

	var req CreateFreezePeriodRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateFreezePeriodRequest: %v", err)
	}

	if req.Name != "Holiday Freeze" {
		t.Errorf("Name mismatch")
	}
	if req.Reason == nil || *req.Reason != "Year-end code freeze" {
		t.Errorf("Reason mismatch")
	}
}
