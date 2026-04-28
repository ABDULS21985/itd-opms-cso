package workflow

import (
	"fmt"
	"sort"
)

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
	allowed, ok := sm.transitions[from]
	if !ok {
		return nil
	}
	if len(allowed) == 0 {
		return []string{}
	}
	return append([]string(nil), allowed...)
}

// HasState returns true if the state is known to the machine.
func (sm *StateMachine) HasState(state string) bool {
	if _, ok := sm.transitions[state]; ok {
		return true
	}
	for _, allowed := range sm.transitions {
		for _, target := range allowed {
			if target == state {
				return true
			}
		}
	}
	return false
}

// States returns all known states in stable lexical order.
func (sm *StateMachine) States() []string {
	seen := make(map[string]struct{}, len(sm.transitions))
	for from, allowed := range sm.transitions {
		seen[from] = struct{}{}
		for _, target := range allowed {
			seen[target] = struct{}{}
		}
	}
	states := make([]string, 0, len(seen))
	for state := range seen {
		states = append(states, state)
	}
	sort.Strings(states)
	return states
}

// Transitions returns a defensive copy of the transition map.
func (sm *StateMachine) Transitions() map[string][]string {
	out := make(map[string][]string, len(sm.transitions))
	for from, allowed := range sm.transitions {
		out[from] = append([]string(nil), allowed...)
	}
	return out
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
	ProblemThirdPartyEscalated = "third_party_escalated"
	ProblemResolved            = "resolved"
	ProblemClosed              = "closed"
)

// ProblemStateMachine enforces the ITIL problem management lifecycle.
var ProblemStateMachine = NewStateMachine("problem", map[string][]string{
	ProblemLogged:              {ProblemInvestigating},
	ProblemInvestigating:       {ProblemRootCauseIdentified, ProblemKnownError, ProblemThirdPartyEscalated},
	ProblemThirdPartyEscalated: {ProblemInvestigating, ProblemRootCauseIdentified, ProblemKnownError},
	ProblemRootCauseIdentified: {ProblemKnownError, ProblemResolved},
	ProblemKnownError:          {ProblemResolved},
	ProblemResolved:            {ProblemClosed, ProblemInvestigating}, // close or reopen
	ProblemClosed:              {},
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

// Change statuses.
const (
	ChangeDraft         = "draft"
	ChangeSubmitted     = "submitted"
	ChangeAssessing     = "assessing"
	ChangeCABReview     = "cab_review"
	ChangeApproved      = "approved"
	ChangeRejected      = "rejected"
	ChangeDeferred      = "deferred"
	ChangeScheduled     = "scheduled"
	ChangeImplementing  = "implementing"
	ChangeImplemented   = "implemented"
	ChangeFailed        = "failed"
	ChangeRolledBack    = "rolled_back"
	ChangePIRPending    = "pir_pending"
	ChangeClosed        = "closed"
	ChangeInvestigating = "investigating"
)

// ChangeStateMachine enforces the ITSM change management lifecycle.
var ChangeStateMachine = NewStateMachine("change", map[string][]string{
	ChangeDraft:         {ChangeSubmitted},
	ChangeSubmitted:     {ChangeAssessing},
	ChangeAssessing:     {ChangeCABReview, ChangeApproved, ChangeRejected},
	ChangeCABReview:     {ChangeApproved, ChangeRejected, ChangeDeferred},
	ChangeApproved:      {ChangeScheduled},
	ChangeDeferred:      {ChangeAssessing},
	ChangeScheduled:     {ChangeImplementing},
	ChangeImplementing:  {ChangeImplemented, ChangeFailed, ChangeRolledBack},
	ChangeImplemented:   {ChangePIRPending, ChangeClosed},
	ChangeFailed:        {ChangeInvestigating},
	ChangeRolledBack:    {ChangeClosed},
	ChangePIRPending:    {ChangeClosed},
	ChangeInvestigating: {ChangeScheduled},
	ChangeRejected:      {},
	ChangeClosed:        {},
})

// Release statuses.
const (
	ReleasePlanning   = "planning"
	ReleaseBuild      = "build"
	ReleaseTesting    = "testing"
	ReleaseApproved   = "approved"
	ReleaseScheduled  = "scheduled"
	ReleaseDeploying  = "deploying"
	ReleaseDeployed   = "deployed"
	ReleaseRolledBack = "rolled_back"
	ReleaseClosed     = "closed"
	ReleaseCancelled  = "cancelled"
)

// ReleaseStateMachine enforces the release management lifecycle (BRD §6.5).
var ReleaseStateMachine = NewStateMachine("release", map[string][]string{
	ReleasePlanning:   {ReleaseBuild, ReleaseCancelled},
	ReleaseBuild:      {ReleaseTesting, ReleaseCancelled},
	ReleaseTesting:    {ReleaseApproved, ReleaseBuild, ReleaseCancelled},
	ReleaseApproved:   {ReleaseScheduled, ReleaseCancelled},
	ReleaseScheduled:  {ReleaseDeploying, ReleaseCancelled},
	ReleaseDeploying:  {ReleaseDeployed, ReleaseRolledBack},
	ReleaseDeployed:   {ReleaseRolledBack, ReleaseClosed},
	ReleaseRolledBack: {ReleasePlanning, ReleaseClosed},
	ReleaseClosed:     {},
	ReleaseCancelled:  {},
})

// Test solution statuses.
const (
	TestSolutionIntake                    = "intake"
	TestSolutionPlanning                  = "planning"
	TestSolutionAuthorized                = "authorized"
	TestSolutionSystemPrereq              = "system_prereq"
	TestSolutionSystemPlanning            = "system_planning"
	TestSolutionSystemPreparation         = "system_preparation"
	TestSolutionSystemReadiness           = "system_readiness"
	TestSolutionSystemExecution           = "system_execution"
	TestSolutionSystemReview              = "system_review"
	TestSolutionIntegrationPreparation    = "integration_preparation"
	TestSolutionIntegrationExecution      = "integration_execution"
	TestSolutionStressPreparation         = "stress_preparation"
	TestSolutionStressExecution           = "stress_execution"
	TestSolutionSecurityPreparation       = "security_preparation"
	TestSolutionSecurityExecution         = "security_execution"
	TestSolutionDataConversionPreparation = "data_conversion_preparation"
	TestSolutionDataConversionExecution   = "data_conversion_execution"
	TestSolutionUATConfirmation           = "uat_confirmation"
	TestSolutionUATPreparation            = "uat_preparation"
	TestSolutionUATNominees               = "uat_nominees"
	TestSolutionUATExecution              = "uat_execution"
	TestSolutionUATReview                 = "uat_review"
	TestSolutionReleaseHandoff            = "release_handoff"
	TestSolutionBuildRework               = "build_rework"
	TestSolutionClosed                    = "closed"
	TestSolutionCancelled                 = "cancelled"
)

// TestSolutionStateMachine enforces the ITD Test Solution lifecycle (BRD §6.6-6.7).
var TestSolutionStateMachine = NewStateMachine("test_solution", map[string][]string{
	TestSolutionIntake:                    {TestSolutionPlanning, TestSolutionCancelled},
	TestSolutionPlanning:                  {TestSolutionAuthorized, TestSolutionIntake, TestSolutionCancelled},
	TestSolutionAuthorized:                {TestSolutionSystemPrereq, TestSolutionIntegrationPreparation, TestSolutionStressPreparation, TestSolutionSecurityPreparation, TestSolutionDataConversionPreparation, TestSolutionUATConfirmation, TestSolutionCancelled},
	TestSolutionSystemPrereq:              {TestSolutionSystemPlanning, TestSolutionIntake, TestSolutionCancelled},
	TestSolutionSystemPlanning:            {TestSolutionSystemPreparation, TestSolutionCancelled},
	TestSolutionSystemPreparation:         {TestSolutionSystemReadiness, TestSolutionCancelled},
	TestSolutionSystemReadiness:           {TestSolutionSystemExecution, TestSolutionSystemPreparation, TestSolutionCancelled},
	TestSolutionSystemExecution:           {TestSolutionSystemReview, TestSolutionCancelled},
	TestSolutionSystemReview:              {TestSolutionAuthorized, TestSolutionBuildRework, TestSolutionCancelled},
	TestSolutionIntegrationPreparation:    {TestSolutionIntegrationExecution, TestSolutionCancelled},
	TestSolutionIntegrationExecution:      {TestSolutionAuthorized, TestSolutionBuildRework, TestSolutionCancelled},
	TestSolutionStressPreparation:         {TestSolutionStressExecution, TestSolutionCancelled},
	TestSolutionStressExecution:           {TestSolutionAuthorized, TestSolutionBuildRework, TestSolutionCancelled},
	TestSolutionSecurityPreparation:       {TestSolutionSecurityExecution, TestSolutionCancelled},
	TestSolutionSecurityExecution:         {TestSolutionAuthorized, TestSolutionBuildRework, TestSolutionCancelled},
	TestSolutionDataConversionPreparation: {TestSolutionDataConversionExecution, TestSolutionCancelled},
	TestSolutionDataConversionExecution:   {TestSolutionAuthorized, TestSolutionBuildRework, TestSolutionCancelled},
	TestSolutionUATConfirmation:           {TestSolutionUATPreparation, TestSolutionBuildRework, TestSolutionCancelled},
	TestSolutionUATPreparation:            {TestSolutionUATNominees, TestSolutionCancelled},
	TestSolutionUATNominees:               {TestSolutionUATExecution, TestSolutionCancelled},
	TestSolutionUATExecution:              {TestSolutionUATReview, TestSolutionCancelled},
	TestSolutionUATReview:                 {TestSolutionReleaseHandoff, TestSolutionBuildRework, TestSolutionCancelled},
	TestSolutionReleaseHandoff:            {TestSolutionClosed},
	TestSolutionBuildRework:               {TestSolutionPlanning, TestSolutionCancelled},
	TestSolutionClosed:                    {},
	TestSolutionCancelled:                 {},
})

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

// Service request statuses.
const (
	ServiceRequestPendingApproval = "pending_approval"
	ServiceRequestApproved        = "approved"
	ServiceRequestRejected        = "rejected"
	ServiceRequestInProgress      = "in_progress"
	ServiceRequestFulfilled       = "fulfilled"
	ServiceRequestClosed          = "closed"
	ServiceRequestCancelled       = "cancelled"
)

// ServiceRequestStateMachine enforces service catalog request fulfillment.
var ServiceRequestStateMachine = NewStateMachine("service_request", map[string][]string{
	ServiceRequestPendingApproval: {ServiceRequestApproved, ServiceRequestRejected, ServiceRequestCancelled},
	ServiceRequestApproved:        {ServiceRequestInProgress, ServiceRequestFulfilled, ServiceRequestCancelled},
	ServiceRequestInProgress:      {ServiceRequestFulfilled, ServiceRequestCancelled},
	ServiceRequestFulfilled:       {ServiceRequestClosed},
	ServiceRequestRejected:        {},
	ServiceRequestClosed:          {},
	ServiceRequestCancelled:       {},
})

// Major incident statuses.
const (
	MajorIncidentDeclared      = "declared"
	MajorIncidentInvestigating = "investigating"
	MajorIncidentMitigating    = "mitigating"
	MajorIncidentMitigated     = "mitigated"
	MajorIncidentMonitoring    = "monitoring"
	MajorIncidentResolved      = "resolved"
	MajorIncidentPIRPending    = "pir_pending"
	MajorIncidentClosed        = "closed"
)

// MajorIncidentStateMachine enforces the dedicated major incident workflow.
var MajorIncidentStateMachine = NewStateMachine("major_incident", map[string][]string{
	MajorIncidentDeclared:      {MajorIncidentInvestigating},
	MajorIncidentInvestigating: {MajorIncidentMitigating},
	MajorIncidentMitigating:    {MajorIncidentMitigated},
	MajorIncidentMitigated:     {MajorIncidentMonitoring, MajorIncidentResolved},
	MajorIncidentMonitoring:    {MajorIncidentResolved},
	MajorIncidentResolved:      {MajorIncidentPIRPending},
	MajorIncidentPIRPending:    {MajorIncidentClosed},
	MajorIncidentClosed:        {},
})

// Service catalog item statuses.
const (
	CatalogItemActive     = "active"
	CatalogItemInactive   = "inactive"
	CatalogItemDeprecated = "deprecated"
)

// CatalogItemStateMachine protects catalog item availability states.
var CatalogItemStateMachine = NewStateMachine("catalog_item", map[string][]string{
	CatalogItemActive:     {CatalogItemInactive, CatalogItemDeprecated},
	CatalogItemInactive:   {CatalogItemActive, CatalogItemDeprecated},
	CatalogItemDeprecated: {CatalogItemInactive},
})

// CAB meeting statuses.
const (
	CABMeetingScheduled  = "scheduled"
	CABMeetingInProgress = "in_progress"
	CABMeetingCompleted  = "completed"
	CABMeetingCancelled  = "cancelled"
)

// CABMeetingStateMachine enforces CAB meeting lifecycle transitions.
var CABMeetingStateMachine = NewStateMachine("cab_meeting", map[string][]string{
	CABMeetingScheduled:  {CABMeetingInProgress, CABMeetingCancelled},
	CABMeetingInProgress: {CABMeetingCompleted, CABMeetingCancelled},
	CABMeetingCompleted:  {},
	CABMeetingCancelled:  {},
})
