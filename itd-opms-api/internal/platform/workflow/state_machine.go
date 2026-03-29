package workflow

import "fmt"

// StateMachine defines a generic finite state machine with named transitions.
type StateMachine struct {
	name        string
	transitions map[string][]string
}

// NewStateMachine creates a StateMachine with the given name and transition map.
func NewStateMachine(name string, transitions map[string][]string) *StateMachine {
	return &StateMachine{name: name, transitions: transitions}
}

// IsValid returns true if transitioning from → to is allowed.
func (sm *StateMachine) IsValid(from, to string) bool {
	allowed, ok := sm.transitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// Validate returns an error if the transition is not allowed.
func (sm *StateMachine) Validate(from, to string) error {
	if !sm.IsValid(from, to) {
		return fmt.Errorf("%s: invalid transition from '%s' to '%s'", sm.name, from, to)
	}
	return nil
}

// AllowedFrom returns the list of valid target states from the given state.
func (sm *StateMachine) AllowedFrom(from string) []string {
	return sm.transitions[from]
}

// ──────────────────────────────────────────────
// Pre-built state machines
// ──────────────────────────────────────────────

// Problem statuses.
const (
	ProblemLogged              = "logged"
	ProblemInvestigating       = "investigating"
	ProblemRootCauseIdentified = "root_cause_identified"
	ProblemKnownError          = "known_error"
	ProblemResolved            = "resolved"
)

// ProblemStateMachine enforces the ITIL problem management lifecycle.
var ProblemStateMachine = NewStateMachine("problem", map[string][]string{
	ProblemLogged:              {ProblemInvestigating},
	ProblemInvestigating:       {ProblemRootCauseIdentified, ProblemKnownError},
	ProblemRootCauseIdentified: {ProblemKnownError, ProblemResolved},
	ProblemKnownError:          {ProblemResolved},
	ProblemResolved:            {ProblemInvestigating}, // reopen
})

// Ticket statuses.
const (
	TicketLogged          = "logged"
	TicketClassified      = "classified"
	TicketAssigned        = "assigned"
	TicketInProgress      = "in_progress"
	TicketPendingCustomer = "pending_customer"
	TicketPendingVendor   = "pending_vendor"
	TicketResolved        = "resolved"
	TicketClosed          = "closed"
	TicketCancelled       = "cancelled"
)

// TicketStateMachine enforces the ITSM ticket lifecycle.
var TicketStateMachine = NewStateMachine("ticket", map[string][]string{
	TicketLogged:          {TicketClassified, TicketAssigned, TicketCancelled},
	TicketClassified:      {TicketAssigned, TicketCancelled},
	TicketAssigned:        {TicketInProgress, TicketCancelled},
	TicketInProgress:      {TicketPendingCustomer, TicketPendingVendor, TicketResolved, TicketCancelled},
	TicketPendingCustomer: {TicketInProgress, TicketResolved, TicketCancelled},
	TicketPendingVendor:   {TicketInProgress, TicketResolved, TicketCancelled},
	TicketResolved:        {TicketClosed, TicketInProgress},
	TicketClosed:          {},
	TicketCancelled:       {},
})
