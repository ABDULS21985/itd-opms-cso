package notification

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// NewService
// ──────────────────────────────────────────────

func TestNewService_ReturnsNonNil(t *testing.T) {
	svc := NewService(nil, nil)
	if svc == nil {
		t.Fatal("expected non-nil Service")
	}
	if svc.tmplCache == nil {
		t.Error("expected initialized tmplCache map")
	}
}

// ──────────────────────────────────────────────
// EnqueueRequest JSON serialization
// ──────────────────────────────────────────────

func TestEnqueueRequest_JSONRoundTrip(t *testing.T) {
	tenantID := uuid.New()
	recipientID := uuid.New()
	actionURL := "/tickets/123"

	original := EnqueueRequest{
		TenantID:       tenantID,
		Channel:        "email",
		RecipientID:    &recipientID,
		RecipientEmail: "user@example.com",
		TemplateKey:    "sla_breach_warning",
		TemplateData:   json.RawMessage(`{"ticketId":"T-001"}`),
		Priority:       8,
		CorrelationID:  "corr-456",
		ActionURL:      &actionURL,
	}

	b, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded EnqueueRequest
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.TenantID != tenantID {
		t.Errorf("TenantID: expected %s, got %s", tenantID, decoded.TenantID)
	}
	if decoded.Channel != "email" {
		t.Errorf("Channel: expected 'email', got %q", decoded.Channel)
	}
	if decoded.RecipientID == nil || *decoded.RecipientID != recipientID {
		t.Errorf("RecipientID: expected %s", recipientID)
	}
	if decoded.RecipientEmail != "user@example.com" {
		t.Errorf("RecipientEmail: expected 'user@example.com', got %q", decoded.RecipientEmail)
	}
	if decoded.TemplateKey != "sla_breach_warning" {
		t.Errorf("TemplateKey: expected 'sla_breach_warning', got %q", decoded.TemplateKey)
	}
	if decoded.Priority != 8 {
		t.Errorf("Priority: expected 8, got %d", decoded.Priority)
	}
	if decoded.CorrelationID != "corr-456" {
		t.Errorf("CorrelationID: expected 'corr-456', got %q", decoded.CorrelationID)
	}
	if decoded.ActionURL == nil || *decoded.ActionURL != "/tickets/123" {
		t.Error("ActionURL: expected '/tickets/123'")
	}
}

func TestEnqueueRequest_JSONOmitsEmpty(t *testing.T) {
	req := EnqueueRequest{
		TenantID:    uuid.New(),
		Channel:     "in_app",
		TemplateKey: "test",
	}

	b, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(b, &raw); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	// recipientId and actionUrl should be omitted when nil.
	if _, exists := raw["recipientId"]; exists {
		t.Error("expected recipientId to be omitted when nil")
	}
	if _, exists := raw["actionUrl"]; exists {
		t.Error("expected actionUrl to be omitted when nil")
	}
}

// ──────────────────────────────────────────────
// InAppNotification JSON serialization
// ──────────────────────────────────────────────

func TestInAppNotification_JSONRoundTrip(t *testing.T) {
	id := uuid.New()
	tenantID := uuid.New()
	now := time.Now().Truncate(time.Second)
	actionURL := "/dashboard"

	original := InAppNotification{
		ID:        id,
		TenantID:  tenantID,
		Type:      "itsm.ticket.assigned",
		Title:     "Ticket Assigned",
		Message:   "You have been assigned ticket INC-001",
		ActionURL: &actionURL,
		IsRead:    false,
		CreatedAt: now,
	}

	b, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded InAppNotification
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ID != id {
		t.Errorf("ID: expected %s, got %s", id, decoded.ID)
	}
	if decoded.Type != "itsm.ticket.assigned" {
		t.Errorf("Type: expected 'itsm.ticket.assigned', got %q", decoded.Type)
	}
	if decoded.Title != "Ticket Assigned" {
		t.Errorf("Title: expected 'Ticket Assigned', got %q", decoded.Title)
	}
	if decoded.ActionURL == nil || *decoded.ActionURL != "/dashboard" {
		t.Error("ActionURL: expected '/dashboard'")
	}
	if decoded.IsRead != false {
		t.Error("IsRead: expected false")
	}
}

func TestInAppNotification_OmitsActionURLWhenNil(t *testing.T) {
	n := InAppNotification{
		ID:    uuid.New(),
		Title: "Test",
	}

	b, err := json.Marshal(n)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(b, &raw); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if _, exists := raw["actionUrl"]; exists {
		t.Error("expected actionUrl to be omitted when nil")
	}
}

// ──────────────────────────────────────────────
// UserPreferences
// ──────────────────────────────────────────────

func TestUserPreferences_JSONRoundTrip(t *testing.T) {
	prefs := UserPreferences{
		ID:     uuid.New(),
		UserID: uuid.New(),
		ChannelPreferences: map[string]bool{
			"email":  true,
			"teams":  false,
			"in_app": true,
		},
		DigestFrequency: "daily",
		DisabledTypes:   []string{"itsm.sla.warning"},
	}

	b, err := json.Marshal(prefs)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded UserPreferences
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.DigestFrequency != "daily" {
		t.Errorf("DigestFrequency: expected 'daily', got %q", decoded.DigestFrequency)
	}
	if len(decoded.ChannelPreferences) != 3 {
		t.Errorf("ChannelPreferences: expected 3 entries, got %d", len(decoded.ChannelPreferences))
	}
	if decoded.ChannelPreferences["email"] != true {
		t.Error("ChannelPreferences[email]: expected true")
	}
	if decoded.ChannelPreferences["teams"] != false {
		t.Error("ChannelPreferences[teams]: expected false")
	}
	if len(decoded.DisabledTypes) != 1 || decoded.DisabledTypes[0] != "itsm.sla.warning" {
		t.Errorf("DisabledTypes: expected [itsm.sla.warning], got %v", decoded.DisabledTypes)
	}
}

// ──────────────────────────────────────────────
// UpdatePreferencesRequest
// ──────────────────────────────────────────────

func TestUpdatePreferencesRequest_JSONDecode(t *testing.T) {
	input := `{
		"channelPreferences": {"email": true, "teams": false, "in_app": true},
		"digestFrequency": "weekly",
		"quietHoursStart": "22:00",
		"quietHoursEnd": "07:00",
		"disabledTypes": ["itsm.sla.warning", "cmdb.warranty.expiring"]
	}`

	var req UpdatePreferencesRequest
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if req.DigestFrequency != "weekly" {
		t.Errorf("DigestFrequency: expected 'weekly', got %q", req.DigestFrequency)
	}
	if req.QuietHoursStart == nil || *req.QuietHoursStart != "22:00" {
		t.Error("QuietHoursStart: expected '22:00'")
	}
	if req.QuietHoursEnd == nil || *req.QuietHoursEnd != "07:00" {
		t.Error("QuietHoursEnd: expected '07:00'")
	}
	if len(req.DisabledTypes) != 2 {
		t.Errorf("DisabledTypes: expected 2, got %d", len(req.DisabledTypes))
	}
	if req.ChannelPreferences["email"] != true {
		t.Error("ChannelPreferences[email]: expected true")
	}
}

// ──────────────────────────────────────────────
// cachedTemplate
// ──────────────────────────────────────────────

func TestCachedTemplate_FetchedAtTracking(t *testing.T) {
	ct := &cachedTemplate{
		Channel:   "email",
		FetchedAt: time.Now(),
	}
	if ct.Channel != "email" {
		t.Errorf("Channel: expected 'email', got %q", ct.Channel)
	}
	if time.Since(ct.FetchedAt) > time.Second {
		t.Error("FetchedAt should be very recent")
	}
}
