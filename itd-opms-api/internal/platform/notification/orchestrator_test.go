package notification

import (
	"encoding/json"
	"testing"
)

// ──────────────────────────────────────────────
// resolveNotificationConfig
// ──────────────────────────────────────────────

func TestResolveNotificationConfig_KnownTypes(t *testing.T) {
	tests := []struct {
		eventType    string
		wantEmail    string
		wantPriority int
		wantChannels int
	}{
		{"itsm.sla.warning", "sla_breach_warning", 8, 3},
		{"itsm.sla.breached", "sla_breach_notification", 9, 3},
		{"governance.approval.required", "approval_request", 7, 3},
		{"itsm.ticket.assigned", "assignment_notification", 6, 2},
		{"itsm.ticket.escalated", "escalation_notification", 8, 3},
		{"cmdb.warranty.expiring", "license_renewal_reminder", 5, 2},
		{"cmdb.license.noncompliant", "license_renewal_reminder", 7, 2},
		{"grc.audit.scheduled", "audit_evidence_request", 6, 2},
		{"grc.access_review.required", "audit_evidence_request", 6, 2},
		{"itsm.incident.major", "major_incident", 10, 3},
		{"governance.action_due_soon", "action_due_reminder", 5, 2},
		{"governance.action_overdue", "action_overdue_reminder", 7, 3},
		{"governance.action_critical_overdue", "action_critical_overdue", 9, 3},
	}

	for _, tc := range tests {
		t.Run(tc.eventType, func(t *testing.T) {
			cfg := resolveNotificationConfig(tc.eventType)
			if cfg == nil {
				t.Fatalf("expected config for %q, got nil", tc.eventType)
			}
			if cfg.EmailTemplate != tc.wantEmail {
				t.Errorf("email template: expected %q, got %q", tc.wantEmail, cfg.EmailTemplate)
			}
			if cfg.Priority != tc.wantPriority {
				t.Errorf("priority: expected %d, got %d", tc.wantPriority, cfg.Priority)
			}
			if len(cfg.Channels) != tc.wantChannels {
				t.Errorf("channels count: expected %d, got %d", tc.wantChannels, len(cfg.Channels))
			}
		})
	}
}

func TestResolveNotificationConfig_UnknownType(t *testing.T) {
	cfg := resolveNotificationConfig("unknown.event.type")
	if cfg != nil {
		t.Errorf("expected nil for unknown event type, got %+v", cfg)
	}
}

func TestResolveNotificationConfig_EmptyType(t *testing.T) {
	cfg := resolveNotificationConfig("")
	if cfg != nil {
		t.Errorf("expected nil for empty event type, got %+v", cfg)
	}
}

// ──────────────────────────────────────────────
// notificationConfig.TemplateKey
// ──────────────────────────────────────────────

func TestTemplateKey(t *testing.T) {
	tests := []struct {
		name     string
		config   notificationConfig
		channel  string
		expected string
	}{
		{
			name: "email channel returns email template",
			config: notificationConfig{
				EmailTemplate: "email_tmpl",
				TeamsTemplate: "teams_tmpl",
				InAppTemplate: "inapp_tmpl",
			},
			channel:  "email",
			expected: "email_tmpl",
		},
		{
			name: "teams channel returns teams template",
			config: notificationConfig{
				EmailTemplate: "email_tmpl",
				TeamsTemplate: "teams_tmpl",
			},
			channel:  "teams",
			expected: "teams_tmpl",
		},
		{
			name: "in_app channel returns in-app template",
			config: notificationConfig{
				EmailTemplate: "email_tmpl",
				InAppTemplate: "inapp_tmpl",
			},
			channel:  "in_app",
			expected: "inapp_tmpl",
		},
		{
			name: "in_app channel falls back to email template when in-app is empty",
			config: notificationConfig{
				EmailTemplate: "email_tmpl",
				InAppTemplate: "",
			},
			channel:  "in_app",
			expected: "email_tmpl",
		},
		{
			name: "unknown channel falls back to email template",
			config: notificationConfig{
				EmailTemplate: "email_tmpl",
				TeamsTemplate: "teams_tmpl",
			},
			channel:  "sms",
			expected: "email_tmpl",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.config.TemplateKey(tc.channel)
			if got != tc.expected {
				t.Errorf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// isTypeDisabled
// ──────────────────────────────────────────────

func TestIsTypeDisabled(t *testing.T) {
	tests := []struct {
		name      string
		disabled  []string
		eventType string
		expected  bool
	}{
		{
			name:      "disabled type returns true",
			disabled:  []string{"itsm.sla.warning", "itsm.ticket.assigned"},
			eventType: "itsm.sla.warning",
			expected:  true,
		},
		{
			name:      "enabled type returns false",
			disabled:  []string{"itsm.sla.warning"},
			eventType: "itsm.ticket.assigned",
			expected:  false,
		},
		{
			name:      "empty disabled list returns false",
			disabled:  []string{},
			eventType: "itsm.sla.warning",
			expected:  false,
		},
		{
			name:      "nil disabled list returns false",
			disabled:  nil,
			eventType: "itsm.sla.warning",
			expected:  false,
		},
		{
			name:      "empty event type with empty disabled list",
			disabled:  []string{},
			eventType: "",
			expected:  false,
		},
		{
			name:      "exact match required - partial does not match",
			disabled:  []string{"itsm.sla"},
			eventType: "itsm.sla.warning",
			expected:  false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := isTypeDisabled(tc.disabled, tc.eventType)
			if got != tc.expected {
				t.Errorf("expected %v, got %v", tc.expected, got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// isInQuietHours
// ──────────────────────────────────────────────

func TestIsInQuietHours(t *testing.T) {
	strPtr := func(s string) *string { return &s }

	tests := []struct {
		name  string
		start *string
		end   *string
		// We can't control time.Now() easily without modifying production code,
		// so we test the edge cases we can: nil values, invalid formats.
	}{
		{
			name:  "nil start returns false",
			start: nil,
			end:   strPtr("07:00"),
		},
		{
			name:  "nil end returns false",
			start: strPtr("22:00"),
			end:   nil,
		},
		{
			name:  "both nil returns false",
			start: nil,
			end:   nil,
		},
		{
			name:  "invalid start format returns false",
			start: strPtr("not-a-time"),
			end:   strPtr("07:00"),
		},
		{
			name:  "invalid end format returns false",
			start: strPtr("22:00"),
			end:   strPtr("not-a-time"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := isInQuietHours(tc.start, tc.end)
			if got != false {
				t.Errorf("expected false, got %v", got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// extractActionURL
// ──────────────────────────────────────────────

func TestExtractActionURL(t *testing.T) {
	tests := []struct {
		name     string
		data     json.RawMessage
		wantNil  bool
		wantURL  string
	}{
		{
			name:    "extracts actionUrl from valid JSON",
			data:    json.RawMessage(`{"actionUrl": "https://example.com/ticket/123"}`),
			wantNil: false,
			wantURL: "https://example.com/ticket/123",
		},
		{
			name:    "returns nil when actionUrl is missing",
			data:    json.RawMessage(`{"foo": "bar"}`),
			wantNil: true,
		},
		{
			name:    "returns nil when actionUrl is empty",
			data:    json.RawMessage(`{"actionUrl": ""}`),
			wantNil: true,
		},
		{
			name:    "returns nil for invalid JSON",
			data:    json.RawMessage(`not-valid-json`),
			wantNil: true,
		},
		{
			name:    "returns nil for null data",
			data:    json.RawMessage(`null`),
			wantNil: true,
		},
		{
			name:    "returns nil when actionUrl is not a string",
			data:    json.RawMessage(`{"actionUrl": 42}`),
			wantNil: true,
		},
		{
			name:    "handles nested data with actionUrl at top level",
			data:    json.RawMessage(`{"actionUrl": "/tasks/abc", "nested": {"key": "val"}}`),
			wantNil: false,
			wantURL: "/tasks/abc",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractActionURL(tc.data)
			if tc.wantNil {
				if got != nil {
					t.Errorf("expected nil, got %q", *got)
				}
				return
			}
			if got == nil {
				t.Fatal("expected non-nil result, got nil")
			}
			if *got != tc.wantURL {
				t.Errorf("expected %q, got %q", tc.wantURL, *got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// DomainEvent JSON serialization
// ──────────────────────────────────────────────

func TestDomainEvent_JSONRoundTrip(t *testing.T) {
	original := DomainEvent{
		Type:          "itsm.ticket.assigned",
		EntityType:    "ticket",
		CorrelationID: "corr-123",
		Data:          json.RawMessage(`{"recipientId":"abc-123"}`),
	}

	b, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded DomainEvent
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Type != original.Type {
		t.Errorf("Type: expected %q, got %q", original.Type, decoded.Type)
	}
	if decoded.EntityType != original.EntityType {
		t.Errorf("EntityType: expected %q, got %q", original.EntityType, decoded.EntityType)
	}
	if decoded.CorrelationID != original.CorrelationID {
		t.Errorf("CorrelationID: expected %q, got %q", original.CorrelationID, decoded.CorrelationID)
	}
	if string(decoded.Data) != string(original.Data) {
		t.Errorf("Data: expected %s, got %s", original.Data, decoded.Data)
	}
}

// ──────────────────────────────────────────────
// NewOrchestrator
// ──────────────────────────────────────────────

func TestNewOrchestrator_NilJetStream(t *testing.T) {
	o := NewOrchestrator(nil, nil)
	if o == nil {
		t.Fatal("expected non-nil Orchestrator")
	}
	if o.stopCh == nil {
		t.Error("expected non-nil stopCh channel")
	}
}

// ──────────────────────────────────────────────
// Orchestrator.Start with nil JetStream
// ──────────────────────────────────────────────

func TestOrchestratorStart_NilJetStream(t *testing.T) {
	o := NewOrchestrator(nil, nil)
	err := o.Start(t.Context())
	if err != nil {
		t.Errorf("expected nil error for nil JetStream, got %v", err)
	}
}

// ──────────────────────────────────────────────
// eventSubjects configuration
// ──────────────────────────────────────────────

func TestEventSubjects_NotEmpty(t *testing.T) {
	if len(eventSubjects) == 0 {
		t.Error("eventSubjects should not be empty")
	}

	for i, es := range eventSubjects {
		if es.subject == "" {
			t.Errorf("eventSubjects[%d]: subject is empty", i)
		}
		if es.consumer == "" {
			t.Errorf("eventSubjects[%d]: consumer is empty", i)
		}
	}
}

// ──────────────────────────────────────────────
// resolveNotificationConfig: channel presence
// ──────────────────────────────────────────────

func TestResolveNotificationConfig_ChannelConsistency(t *testing.T) {
	// All three-channel events must include "teams" in their channel list.
	threeChannelEvents := []string{
		"itsm.sla.warning",
		"itsm.sla.breached",
		"governance.approval.required",
		"itsm.ticket.escalated",
		"itsm.incident.major",
		"governance.action_overdue",
		"governance.action_critical_overdue",
	}

	for _, eventType := range threeChannelEvents {
		t.Run(eventType, func(t *testing.T) {
			cfg := resolveNotificationConfig(eventType)
			if cfg == nil {
				t.Fatalf("expected config, got nil")
			}

			hasTeams := false
			for _, ch := range cfg.Channels {
				if ch == "teams" {
					hasTeams = true
					break
				}
			}
			if !hasTeams {
				t.Error("expected 'teams' in channels")
			}

			// Every event must have a non-empty EmailTemplate (used as fallback).
			if cfg.EmailTemplate == "" {
				t.Error("expected non-empty EmailTemplate")
			}
		})
	}
}

// ──────────────────────────────────────────────
// resolveNotificationConfig: events with explicit TeamsTemplate
// ──────────────────────────────────────────────

func TestResolveNotificationConfig_ExplicitTeamsTemplate(t *testing.T) {
	// These events have an explicit TeamsTemplate configured.
	eventsWithTeamsTemplate := []struct {
		eventType     string
		teamsTemplate string
	}{
		{"itsm.sla.warning", "teams_sla_breach_card"},
		{"itsm.sla.breached", "teams_sla_breach_card"},
		{"governance.approval.required", "teams_approval_card"},
		{"itsm.incident.major", "teams_major_incident_card"},
	}

	for _, tc := range eventsWithTeamsTemplate {
		t.Run(tc.eventType, func(t *testing.T) {
			cfg := resolveNotificationConfig(tc.eventType)
			if cfg == nil {
				t.Fatalf("expected config, got nil")
			}
			if cfg.TeamsTemplate != tc.teamsTemplate {
				t.Errorf("TeamsTemplate: expected %q, got %q", tc.teamsTemplate, cfg.TeamsTemplate)
			}
		})
	}
}

// ──────────────────────────────────────────────
// resolveNotificationConfig: all events include in_app
// ──────────────────────────────────────────────

func TestResolveNotificationConfig_AllEventsHaveInApp(t *testing.T) {
	allEvents := []string{
		"itsm.sla.warning",
		"itsm.sla.breached",
		"governance.approval.required",
		"itsm.ticket.assigned",
		"itsm.ticket.escalated",
		"cmdb.warranty.expiring",
		"cmdb.license.noncompliant",
		"grc.audit.scheduled",
		"grc.access_review.required",
		"itsm.incident.major",
		"governance.action_due_soon",
		"governance.action_overdue",
		"governance.action_critical_overdue",
	}

	for _, eventType := range allEvents {
		t.Run(eventType, func(t *testing.T) {
			cfg := resolveNotificationConfig(eventType)
			if cfg == nil {
				t.Fatalf("expected config, got nil")
			}

			hasInApp := false
			for _, ch := range cfg.Channels {
				if ch == "in_app" {
					hasInApp = true
					break
				}
			}
			if !hasInApp {
				t.Error("expected 'in_app' in channels for every event type")
			}
		})
	}
}
