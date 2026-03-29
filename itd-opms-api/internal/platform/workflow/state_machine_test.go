package workflow

import (
	"testing"
)

// ──────────────────────────────────────────────
// Generic StateMachine tests
// ──────────────────────────────────────────────

func TestStateMachine_IsValid(t *testing.T) {
	sm := NewStateMachine("test", map[string][]string{
		"a": {"b", "c"},
		"b": {"c"},
		"c": {},
	})

	tests := []struct {
		from string
		to   string
		want bool
	}{
		{"a", "b", true},
		{"a", "c", true},
		{"b", "c", true},
		// invalid
		{"c", "a", false},
		{"b", "a", false},
		{"a", "a", false}, // self-transition
	}

	for _, tt := range tests {
		name := tt.from + " -> " + tt.to
		t.Run(name, func(t *testing.T) {
			if got := sm.IsValid(tt.from, tt.to); got != tt.want {
				t.Errorf("IsValid(%q, %q) = %v, want %v", tt.from, tt.to, got, tt.want)
			}
		})
	}
}

func TestStateMachine_IsValid_UnknownState(t *testing.T) {
	sm := NewStateMachine("test", map[string][]string{
		"a": {"b"},
	})
	if sm.IsValid("unknown", "b") {
		t.Error("expected false for unknown 'from' state")
	}
	if sm.IsValid("a", "unknown") {
		t.Error("expected false for unknown 'to' state")
	}
}

func TestStateMachine_IsValid_EmptyStrings(t *testing.T) {
	sm := NewStateMachine("test", map[string][]string{
		"a": {"b"},
	})
	if sm.IsValid("", "") {
		t.Error("expected false for empty strings")
	}
}

func TestStateMachine_Validate_ReturnsNilOnValid(t *testing.T) {
	sm := NewStateMachine("test", map[string][]string{
		"a": {"b"},
	})
	if err := sm.Validate("a", "b"); err != nil {
		t.Errorf("expected nil error, got %v", err)
	}
}

func TestStateMachine_Validate_ReturnsErrorOnInvalid(t *testing.T) {
	sm := NewStateMachine("myfsm", map[string][]string{
		"a": {"b"},
	})
	err := sm.Validate("b", "a")
	if err == nil {
		t.Fatal("expected error for invalid transition")
	}
	if got := err.Error(); got != "myfsm: invalid transition from 'b' to 'a'" {
		t.Errorf("unexpected error message: %q", got)
	}
}

func TestStateMachine_AllowedFrom(t *testing.T) {
	sm := NewStateMachine("test", map[string][]string{
		"a": {"b", "c"},
		"b": {"c"},
		"c": {},
	})

	allowed := sm.AllowedFrom("a")
	if len(allowed) != 2 {
		t.Fatalf("expected 2 allowed transitions from 'a', got %d", len(allowed))
	}
	if allowed[0] != "b" || allowed[1] != "c" {
		t.Errorf("expected [b, c], got %v", allowed)
	}

	// Terminal state.
	terminal := sm.AllowedFrom("c")
	if len(terminal) != 0 {
		t.Errorf("expected 0 allowed transitions from 'c', got %d", len(terminal))
	}

	// Unknown state.
	unknown := sm.AllowedFrom("unknown")
	if unknown != nil {
		t.Errorf("expected nil for unknown state, got %v", unknown)
	}
}

// ──────────────────────────────────────────────
// ProblemStateMachine — valid transitions
// ──────────────────────────────────────────────

func TestProblemStateMachine_ValidTransitions(t *testing.T) {
	tests := []struct {
		from string
		to   string
	}{
		{ProblemLogged, ProblemInvestigating},
		{ProblemInvestigating, ProblemRootCauseIdentified},
		{ProblemInvestigating, ProblemKnownError},
		{ProblemRootCauseIdentified, ProblemKnownError},
		{ProblemRootCauseIdentified, ProblemResolved},
		{ProblemKnownError, ProblemResolved},
		{ProblemResolved, ProblemInvestigating}, // reopen
	}

	for _, tt := range tests {
		name := tt.from + " -> " + tt.to
		t.Run(name, func(t *testing.T) {
			if !ProblemStateMachine.IsValid(tt.from, tt.to) {
				t.Errorf("expected valid transition from %q to %q", tt.from, tt.to)
			}
		})
	}
}

// ──────────────────────────────────────────────
// ProblemStateMachine — invalid transitions
// ──────────────────────────────────────────────

func TestProblemStateMachine_InvalidTransitions(t *testing.T) {
	tests := []struct {
		from string
		to   string
	}{
		// Cannot skip investigation.
		{ProblemLogged, ProblemRootCauseIdentified},
		{ProblemLogged, ProblemKnownError},
		{ProblemLogged, ProblemResolved},
		// Cannot go backward.
		{ProblemInvestigating, ProblemLogged},
		{ProblemRootCauseIdentified, ProblemInvestigating},
		{ProblemRootCauseIdentified, ProblemLogged},
		{ProblemKnownError, ProblemInvestigating},
		{ProblemKnownError, ProblemLogged},
		// Self-transitions.
		{ProblemLogged, ProblemLogged},
		{ProblemInvestigating, ProblemInvestigating},
		{ProblemResolved, ProblemResolved},
	}

	for _, tt := range tests {
		name := tt.from + " -> " + tt.to
		t.Run(name, func(t *testing.T) {
			if ProblemStateMachine.IsValid(tt.from, tt.to) {
				t.Errorf("expected invalid transition from %q to %q", tt.from, tt.to)
			}
		})
	}
}

func TestProblemStateMachine_AllStatusesCovered(t *testing.T) {
	allStatuses := []string{
		ProblemLogged,
		ProblemInvestigating,
		ProblemRootCauseIdentified,
		ProblemKnownError,
		ProblemResolved,
	}
	for _, s := range allStatuses {
		if ProblemStateMachine.AllowedFrom(s) == nil {
			t.Errorf("status %q not in ProblemStateMachine", s)
		}
	}
}

func TestProblemStateMachine_ResolvedOnlyReopensToInvestigating(t *testing.T) {
	allowed := ProblemStateMachine.AllowedFrom(ProblemResolved)
	if len(allowed) != 1 {
		t.Fatalf("expected 1 transition from resolved, got %d", len(allowed))
	}
	if allowed[0] != ProblemInvestigating {
		t.Errorf("expected reopen to %q, got %q", ProblemInvestigating, allowed[0])
	}
}

// ──────────────────────────────────────────────
// TicketStateMachine — valid transitions
// ──────────────────────────────────────────────

func TestTicketStateMachine_ValidTransitions(t *testing.T) {
	tests := []struct {
		from string
		to   string
	}{
		{TicketLogged, TicketClassified},
		{TicketLogged, TicketAssigned},
		{TicketLogged, TicketCancelled},
		{TicketClassified, TicketAssigned},
		{TicketClassified, TicketCancelled},
		{TicketAssigned, TicketInProgress},
		{TicketAssigned, TicketCancelled},
		{TicketInProgress, TicketPendingCustomer},
		{TicketInProgress, TicketPendingVendor},
		{TicketInProgress, TicketResolved},
		{TicketInProgress, TicketCancelled},
		{TicketPendingCustomer, TicketInProgress},
		{TicketPendingCustomer, TicketResolved},
		{TicketPendingCustomer, TicketCancelled},
		{TicketPendingVendor, TicketInProgress},
		{TicketPendingVendor, TicketResolved},
		{TicketPendingVendor, TicketCancelled},
		{TicketResolved, TicketClosed},
		{TicketResolved, TicketInProgress}, // reopen
	}

	for _, tt := range tests {
		name := tt.from + " -> " + tt.to
		t.Run(name, func(t *testing.T) {
			if !TicketStateMachine.IsValid(tt.from, tt.to) {
				t.Errorf("expected valid transition from %q to %q", tt.from, tt.to)
			}
		})
	}
}

func TestTicketStateMachine_TerminalStates(t *testing.T) {
	for _, status := range []string{TicketClosed, TicketCancelled} {
		allowed := TicketStateMachine.AllowedFrom(status)
		if len(allowed) != 0 {
			t.Errorf("terminal state %q should have no transitions, got %v", status, allowed)
		}
	}
}

func TestTicketStateMachine_InvalidTransitions(t *testing.T) {
	tests := []struct {
		from string
		to   string
	}{
		{TicketLogged, TicketResolved},
		{TicketLogged, TicketClosed},
		{TicketLogged, TicketInProgress},
		{TicketClosed, TicketLogged},
		{TicketClosed, TicketInProgress},
		{TicketCancelled, TicketLogged},
		{TicketClassified, TicketLogged},
		{TicketAssigned, TicketLogged},
		{TicketResolved, TicketAssigned},
	}

	for _, tt := range tests {
		name := tt.from + " -> " + tt.to
		t.Run(name, func(t *testing.T) {
			if TicketStateMachine.IsValid(tt.from, tt.to) {
				t.Errorf("expected invalid transition from %q to %q", tt.from, tt.to)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Constant value tests
// ──────────────────────────────────────────────

func TestProblemStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Logged":              "logged",
		"Investigating":       "investigating",
		"RootCauseIdentified": "root_cause_identified",
		"KnownError":          "known_error",
		"Resolved":            "resolved",
	}
	actual := map[string]string{
		"Logged":              ProblemLogged,
		"Investigating":       ProblemInvestigating,
		"RootCauseIdentified": ProblemRootCauseIdentified,
		"KnownError":          ProblemKnownError,
		"Resolved":            ProblemResolved,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("Problem%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestTicketStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Logged":          "logged",
		"Classified":      "classified",
		"Assigned":        "assigned",
		"InProgress":      "in_progress",
		"PendingCustomer": "pending_customer",
		"PendingVendor":   "pending_vendor",
		"Resolved":        "resolved",
		"Closed":          "closed",
		"Cancelled":       "cancelled",
	}
	actual := map[string]string{
		"Logged":          TicketLogged,
		"Classified":      TicketClassified,
		"Assigned":        TicketAssigned,
		"InProgress":      TicketInProgress,
		"PendingCustomer": TicketPendingCustomer,
		"PendingVendor":   TicketPendingVendor,
		"Resolved":        TicketResolved,
		"Closed":          TicketClosed,
		"Cancelled":       TicketCancelled,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("Ticket%s = %q, want %q", name, actual[name], want)
		}
	}
}
