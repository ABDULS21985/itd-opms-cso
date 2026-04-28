package itsm

import (
	"net/http"
	"net/url"
	"strings"
	"unicode"

	"github.com/go-chi/chi/v5"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ITSMWorkflowTransition is the backend source of truth for a permitted status move.
type ITSMWorkflowTransition struct {
	Value           string                      `json:"value"`
	Label           string                      `json:"label"`
	Reason          string                      `json:"reason,omitempty"`
	ResponsibleRole string                      `json:"responsibleRole,omitempty"`
	AccountableRole string                      `json:"accountableRole,omitempty"`
	RequiredFields  []string                    `json:"requiredFields,omitempty"`
	Checklist       []ITSMWorkflowChecklistItem `json:"checklist,omitempty"`
	SLAImpact       string                      `json:"slaImpact,omitempty"`
	DecisionTrail   []string                    `json:"decisionTrail,omitempty"`
}

// ITSMWorkflowChecklistItem describes a transition prerequisite the UI can render.
type ITSMWorkflowChecklistItem struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Required bool   `json:"required"`
}

// ITSMWorkflowStatus describes a known lifecycle state.
type ITSMWorkflowStatus struct {
	Value       string                   `json:"value"`
	Label       string                   `json:"label"`
	Terminal    bool                     `json:"terminal"`
	Transitions []ITSMWorkflowTransition `json:"transitions"`
}

// ITSMWorkflowDefinition exposes a complete lifecycle definition to clients.
type ITSMWorkflowDefinition struct {
	Entity   string               `json:"entity"`
	Statuses []ITSMWorkflowStatus `json:"statuses"`
}

// ITSMWorkflowTransitionResponse exposes valid transitions from a single state.
type ITSMWorkflowTransitionResponse struct {
	Entity             string                   `json:"entity"`
	Status             string                   `json:"status"`
	Transitions        []ITSMWorkflowTransition `json:"transitions"`
	BlockedTransitions []ITSMWorkflowTransition `json:"blockedTransitions"`
	NextAction         string                   `json:"nextAction,omitempty"`
}

type workflowMetadata struct {
	machine *workflow.StateMachine
	labels  map[string]string
	order   []string
}

var itsmWorkflowDefinitions = map[string]workflowMetadata{
	"ticket": {
		machine: workflow.TicketStateMachine,
		order: []string{
			workflow.TicketLogged,
			workflow.TicketClassified,
			workflow.TicketAssigned,
			workflow.TicketInProgress,
			workflow.TicketPendingCustomer,
			workflow.TicketPendingVendor,
			workflow.TicketResolved,
			workflow.TicketClosed,
			workflow.TicketCancelled,
		},
		labels: map[string]string{
			workflow.TicketClassified:      "Classify",
			workflow.TicketAssigned:        "Assign",
			workflow.TicketInProgress:      "Start Work",
			workflow.TicketPendingCustomer: "Pending Customer",
			workflow.TicketPendingVendor:   "Pending Vendor",
			workflow.TicketResolved:        "Resolve",
			workflow.TicketClosed:          "Close",
			workflow.TicketCancelled:       "Cancel",
		},
	},
	"problem": {
		machine: workflow.ProblemStateMachine,
		order: []string{
			workflow.ProblemLogged,
			workflow.ProblemInvestigating,
			workflow.ProblemRootCauseIdentified,
			workflow.ProblemKnownError,
			workflow.ProblemThirdPartyEscalated,
			workflow.ProblemResolved,
			workflow.ProblemClosed,
		},
		labels: map[string]string{
			workflow.ProblemInvestigating:       "Investigate",
			workflow.ProblemRootCauseIdentified: "Root Cause Found",
			workflow.ProblemKnownError:          "Known Error",
			workflow.ProblemThirdPartyEscalated: "Escalate to 3rd Party",
			workflow.ProblemResolved:            "Resolve",
			workflow.ProblemClosed:              "Close",
		},
	},
	"service_request": {
		machine: workflow.ServiceRequestStateMachine,
		order: []string{
			workflow.ServiceRequestPendingApproval,
			workflow.ServiceRequestApproved,
			workflow.ServiceRequestInProgress,
			workflow.ServiceRequestFulfilled,
			workflow.ServiceRequestClosed,
			workflow.ServiceRequestRejected,
			workflow.ServiceRequestCancelled,
		},
		labels: map[string]string{
			workflow.ServiceRequestApproved:   "Approve",
			workflow.ServiceRequestRejected:   "Reject",
			workflow.ServiceRequestInProgress: "Start Fulfillment",
			workflow.ServiceRequestFulfilled:  "Fulfill",
			workflow.ServiceRequestClosed:     "Close",
			workflow.ServiceRequestCancelled:  "Cancel",
		},
	},
	"change": {
		machine: workflow.ChangeStateMachine,
		order: []string{
			workflow.ChangeDraft,
			workflow.ChangeSubmitted,
			workflow.ChangeAssessing,
			workflow.ChangeCABReview,
			workflow.ChangeApproved,
			workflow.ChangeScheduled,
			workflow.ChangeImplementing,
			workflow.ChangeImplemented,
			workflow.ChangePIRPending,
			workflow.ChangeClosed,
			workflow.ChangeDeferred,
			workflow.ChangeRejected,
			workflow.ChangeFailed,
			workflow.ChangeRolledBack,
			workflow.ChangeInvestigating,
		},
		labels: map[string]string{
			workflow.ChangeSubmitted:     "Document RFC",
			workflow.ChangeAssessing:     "Risk Assessment",
			workflow.ChangeCABReview:     "Prepare for CAB",
			workflow.ChangeApproved:      "Approve RFC",
			workflow.ChangeRejected:      "Reject RFC",
			workflow.ChangeDeferred:      "Request More Information",
			workflow.ChangeScheduled:     "Schedule Implementation",
			workflow.ChangeImplementing:  "Authorize Implementation",
			workflow.ChangeImplemented:   "Review Implementation",
			workflow.ChangeFailed:        "Mark Unsuccessful",
			workflow.ChangeRolledBack:    "Rollback",
			workflow.ChangePIRPending:    "Post-Implementation Review",
			workflow.ChangeClosed:        "Close Request",
			workflow.ChangeInvestigating: "Rework Change",
		},
	},
	"major_incident": {
		machine: workflow.MajorIncidentStateMachine,
		order: []string{
			workflow.MajorIncidentDeclared,
			workflow.MajorIncidentInvestigating,
			workflow.MajorIncidentMitigating,
			workflow.MajorIncidentMitigated,
			workflow.MajorIncidentMonitoring,
			workflow.MajorIncidentResolved,
			workflow.MajorIncidentPIRPending,
			workflow.MajorIncidentClosed,
		},
		labels: map[string]string{
			workflow.MajorIncidentInvestigating: "Begin Investigation",
			workflow.MajorIncidentMitigating:    "Begin Mitigation",
			workflow.MajorIncidentMitigated:     "Confirm Mitigated",
			workflow.MajorIncidentMonitoring:    "Continue Monitoring",
			workflow.MajorIncidentResolved:      "Confirm Resolved",
			workflow.MajorIncidentPIRPending:    "Schedule PIR",
			workflow.MajorIncidentClosed:        "Close",
		},
	},
	"release": {
		machine: workflow.ReleaseStateMachine,
		order: []string{
			workflow.ReleasePlanning,
			workflow.ReleaseBuild,
			workflow.ReleaseTesting,
			workflow.ReleaseApproved,
			workflow.ReleaseScheduled,
			workflow.ReleaseDeploying,
			workflow.ReleaseDeployed,
			workflow.ReleaseClosed,
			workflow.ReleaseRolledBack,
			workflow.ReleaseCancelled,
		},
		labels: map[string]string{
			workflow.ReleaseBuild:      "Create Deployment Plan",
			workflow.ReleaseTesting:    "Set Up Deployment Team",
			workflow.ReleaseApproved:   "Obtain Deployment Approval",
			workflow.ReleaseScheduled:  "Authorize Deployment",
			workflow.ReleaseDeploying:  "Deploy Solution",
			workflow.ReleaseDeployed:   "Evaluate Results",
			workflow.ReleaseRolledBack: "Roll Back",
			workflow.ReleaseClosed:     "Conduct Close-Out",
			workflow.ReleaseCancelled:  "Cancel",
		},
	},
	"test_solution": {
		machine: workflow.TestSolutionStateMachine,
		order: []string{
			workflow.TestSolutionIntake,
			workflow.TestSolutionPlanning,
			workflow.TestSolutionAuthorized,
			workflow.TestSolutionSystemPrereq,
			workflow.TestSolutionSystemPlanning,
			workflow.TestSolutionSystemPreparation,
			workflow.TestSolutionSystemReadiness,
			workflow.TestSolutionSystemExecution,
			workflow.TestSolutionSystemReview,
			workflow.TestSolutionIntegrationPreparation,
			workflow.TestSolutionIntegrationExecution,
			workflow.TestSolutionStressPreparation,
			workflow.TestSolutionStressExecution,
			workflow.TestSolutionSecurityPreparation,
			workflow.TestSolutionSecurityExecution,
			workflow.TestSolutionDataConversionPreparation,
			workflow.TestSolutionDataConversionExecution,
			workflow.TestSolutionUATConfirmation,
			workflow.TestSolutionUATPreparation,
			workflow.TestSolutionUATNominees,
			workflow.TestSolutionUATExecution,
			workflow.TestSolutionUATReview,
			workflow.TestSolutionReleaseHandoff,
			workflow.TestSolutionBuildRework,
			workflow.TestSolutionClosed,
			workflow.TestSolutionCancelled,
		},
		labels: map[string]string{
			workflow.TestSolutionPlanning:                  "Plan Test Execution",
			workflow.TestSolutionAuthorized:                "Authorize Appropriate Testing",
			workflow.TestSolutionSystemPrereq:              "Receive System Test Prerequisites",
			workflow.TestSolutionSystemPlanning:            "Plan System Test",
			workflow.TestSolutionSystemPreparation:         "Prepare System Test",
			workflow.TestSolutionSystemReadiness:           "Check System Environment",
			workflow.TestSolutionSystemExecution:           "Execute System Test",
			workflow.TestSolutionSystemReview:              "Check System Test Results",
			workflow.TestSolutionIntegrationPreparation:    "Prepare Integration Test",
			workflow.TestSolutionIntegrationExecution:      "Execute Integration Test",
			workflow.TestSolutionStressPreparation:         "Prepare Stress/Performance Test",
			workflow.TestSolutionStressExecution:           "Execute Stress/Performance Test",
			workflow.TestSolutionSecurityPreparation:       "Prepare Security Test",
			workflow.TestSolutionSecurityExecution:         "Execute Security Test",
			workflow.TestSolutionDataConversionPreparation: "Prepare Data Conversion Test",
			workflow.TestSolutionDataConversionExecution:   "Execute Data Conversion Test",
			workflow.TestSolutionUATConfirmation:           "Confirm Initial Tests",
			workflow.TestSolutionUATPreparation:            "Prepare UAT",
			workflow.TestSolutionUATNominees:               "Request Test Nominees",
			workflow.TestSolutionUATExecution:              "Execute UAT",
			workflow.TestSolutionUATReview:                 "Confirm UAT",
			workflow.TestSolutionReleaseHandoff:            "Handoff to Release",
			workflow.TestSolutionBuildRework:               "Return to Build/Configure",
			workflow.TestSolutionClosed:                    "Close Test Run",
			workflow.TestSolutionCancelled:                 "Cancel",
		},
	},
	"catalog_item": {
		machine: workflow.CatalogItemStateMachine,
		order: []string{
			workflow.CatalogItemInactive,
			workflow.CatalogItemActive,
			workflow.CatalogItemDeprecated,
		},
		labels: map[string]string{
			workflow.CatalogItemActive:     "Activate",
			workflow.CatalogItemInactive:   "Deactivate",
			workflow.CatalogItemDeprecated: "Deprecate",
		},
	},
	"cab_meeting": {
		machine: workflow.CABMeetingStateMachine,
		order: []string{
			workflow.CABMeetingScheduled,
			workflow.CABMeetingInProgress,
			workflow.CABMeetingCompleted,
			workflow.CABMeetingCancelled,
		},
		labels: map[string]string{
			workflow.CABMeetingInProgress: "Start Meeting",
			workflow.CABMeetingCompleted:  "Complete",
			workflow.CABMeetingCancelled:  "Cancel",
		},
	},
}

func normalizeWorkflowEntity(entity string) (string, bool) {
	key := strings.TrimSpace(strings.ToLower(entity))
	switch key {
	case "incident", "incidents", "ticket", "tickets":
		key = "ticket"
	case "service-request", "service_requests", "request", "requests":
		key = "service_request"
	case "major-incident", "major_incidents":
		key = "major_incident"
	case "catalog-item", "catalog_items":
		key = "catalog_item"
	case "cab-meeting", "cab_meetings":
		key = "cab_meeting"
	case "changes":
		key = "change"
	case "problems":
		key = "problem"
	case "releases":
		key = "release"
	case "test-solution", "test-solutions", "test_solutions", "testing", "uat":
		key = "test_solution"
	}
	_, ok := itsmWorkflowDefinitions[key]
	return key, ok
}

func workflowDefinitionForEntity(entity string) (workflowMetadata, string, bool) {
	key, ok := normalizeWorkflowEntity(entity)
	if !ok {
		return workflowMetadata{}, "", false
	}
	return itsmWorkflowDefinitions[key], key, true
}

func workflowTransitionsForEntity(entity, status string) (ITSMWorkflowTransitionResponse, bool) {
	def, key, ok := workflowDefinitionForEntity(entity)
	if !ok {
		return ITSMWorkflowTransitionResponse{}, false
	}
	allowed := def.machine.AllowedFrom(status)
	decorated := decorateTransitions(key, def, allowed)
	nextAction := ""
	if len(decorated) > 0 {
		nextAction = decorated[0].Label
	}
	return ITSMWorkflowTransitionResponse{
		Entity:             key,
		Status:             status,
		Transitions:        decorated,
		BlockedTransitions: blockedTransitions(key, def, status, allowed),
		NextAction:         nextAction,
	}, true
}

func applyWorkflowTransitionContext(resp *ITSMWorkflowTransitionResponse, query url.Values) {
	if resp == nil {
		return
	}
	if resp.Entity == "test_solution" {
		uatSigned := strings.EqualFold(query.Get("uatSigned"), "true")
		if resp.Status == workflow.TestSolutionUATReview && !uatSigned {
			blockWorkflowTransition(resp, workflow.TestSolutionReleaseHandoff, "UAT sign-off is required before handoff to Release and Deployment Management.")
		}
		if len(resp.Transitions) > 0 {
			resp.NextAction = resp.Transitions[0].Label
		} else {
			resp.NextAction = ""
		}
		return
	}
	if resp.Entity != "change" {
		return
	}
	classification := strings.TrimSpace(strings.ToLower(query.Get("classification")))
	if resp.Status == workflow.ChangeAssessing && classification == ChangeClassificationNormal {
		blockWorkflowTransition(resp, workflow.ChangeApproved, "Normal changes must be prepared for CAB before approval.")
		blockWorkflowTransition(resp, workflow.ChangeRejected, "Normal changes must be reviewed by CAB before rejection.")
	}

	pirRequired := strings.EqualFold(query.Get("pirRequired"), "true")
	pirCompleted := strings.EqualFold(query.Get("pirCompleted"), "true")
	if resp.Status == workflow.ChangeImplemented && pirRequired && !pirCompleted {
		blockWorkflowTransition(resp, workflow.ChangeClosed, "PIR required before closure.")
	}

	if len(resp.Transitions) > 0 {
		resp.NextAction = resp.Transitions[0].Label
	} else {
		resp.NextAction = ""
	}
}

func blockWorkflowTransition(resp *ITSMWorkflowTransitionResponse, value, reason string) {
	next := resp.Transitions[:0]
	for _, transition := range resp.Transitions {
		if transition.Value == value {
			transition.Reason = reason
			resp.BlockedTransitions = append(resp.BlockedTransitions, transition)
			continue
		}
		next = append(next, transition)
	}
	resp.Transitions = next
}

func workflowSnapshotForEntity(entity string) (ITSMWorkflowDefinition, bool) {
	def, key, ok := workflowDefinitionForEntity(entity)
	if !ok {
		return ITSMWorkflowDefinition{}, false
	}

	orderedStates := workflowStates(def)
	statuses := make([]ITSMWorkflowStatus, 0, len(orderedStates))
	for _, state := range orderedStates {
		allowed := def.machine.AllowedFrom(state)
		statuses = append(statuses, ITSMWorkflowStatus{
			Value:       state,
			Label:       workflowLabel(def, state),
			Terminal:    len(allowed) == 0,
			Transitions: decorateTransitions(key, def, allowed),
		})
	}

	return ITSMWorkflowDefinition{Entity: key, Statuses: statuses}, true
}

func decorateTransitions(entity string, def workflowMetadata, statuses []string) []ITSMWorkflowTransition {
	transitions := make([]ITSMWorkflowTransition, 0, len(statuses))
	for _, status := range statuses {
		metadata := workflowTransitionMetadata(entity, status)
		transitions = append(transitions, ITSMWorkflowTransition{
			Value:           status,
			Label:           workflowLabel(def, status),
			ResponsibleRole: metadata.ResponsibleRole,
			AccountableRole: metadata.AccountableRole,
			RequiredFields:  metadata.RequiredFields,
			Checklist:       metadata.Checklist,
			SLAImpact:       metadata.SLAImpact,
			DecisionTrail:   metadata.DecisionTrail,
		})
	}
	return transitions
}

func blockedTransitions(entity string, def workflowMetadata, current string, allowed []string) []ITSMWorkflowTransition {
	allowedSet := map[string]struct{}{current: {}}
	for _, state := range allowed {
		allowedSet[state] = struct{}{}
	}

	states := workflowStates(def)
	blocked := make([]ITSMWorkflowTransition, 0, len(states))
	for _, state := range states {
		if _, ok := allowedSet[state]; ok {
			continue
		}
		if !def.machine.HasState(state) {
			continue
		}
		metadata := workflowTransitionMetadata(entity, state)
		blocked = append(blocked, ITSMWorkflowTransition{
			Value:           state,
			Label:           workflowLabel(def, state),
			Reason:          blockedTransitionReason(def, current, state),
			ResponsibleRole: metadata.ResponsibleRole,
			AccountableRole: metadata.AccountableRole,
			RequiredFields:  metadata.RequiredFields,
			Checklist:       metadata.Checklist,
			SLAImpact:       metadata.SLAImpact,
			DecisionTrail:   metadata.DecisionTrail,
		})
	}
	return blocked
}

func workflowStates(def workflowMetadata) []string {
	if len(def.order) == 0 {
		return def.machine.States()
	}
	seen := make(map[string]struct{}, len(def.order))
	states := make([]string, 0, len(def.order))
	for _, state := range def.order {
		if def.machine.HasState(state) {
			states = append(states, state)
			seen[state] = struct{}{}
		}
	}
	for _, state := range def.machine.States() {
		if _, ok := seen[state]; !ok {
			states = append(states, state)
		}
	}
	return states
}

func blockedTransitionReason(def workflowMetadata, current, target string) string {
	if current == "" || !def.machine.HasState(current) {
		return "Current workflow status is not recognized by this lifecycle."
	}
	if len(def.machine.AllowedFrom(current)) == 0 {
		return "This status is terminal and does not allow further workflow movement."
	}
	predecessors := make([]string, 0)
	for from, targets := range def.machine.Transitions() {
		for _, candidate := range targets {
			if candidate == target {
				predecessors = append(predecessors, from)
				break
			}
		}
	}
	if len(predecessors) > 0 {
		return "Move through " + workflowLabel(def, predecessors[0]) + " before " + workflowLabel(def, target) + "."
	}
	return "This action is not available from the current status."
}

type transitionUXMetadata struct {
	ResponsibleRole string
	AccountableRole string
	RequiredFields  []string
	Checklist       []ITSMWorkflowChecklistItem
	SLAImpact       string
	DecisionTrail   []string
}

func workflowTransitionMetadata(entity, target string) transitionUXMetadata {
	switch entity + ":" + target {
	case "ticket:" + workflow.TicketClassified:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			RequiredFields:  []string{"category", "impact", "urgency", "priority", "description"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "request_checked", Label: "Issue checked against Request Fulfillment criteria", Required: true},
				{Key: "incident_record_complete", Label: "Unique reference, requester, description, and activity notes recorded", Required: true},
				{Key: "priority_matrix_applied", Label: "Impact and urgency assessed to derive priority", Required: true},
				{Key: "known_errors_checked", Label: "Known errors, related problems, and validated workarounds reviewed", Required: false},
			},
			SLAImpact:     "Response SLA continues while the incident is categorized and prioritized.",
			DecisionTrail: []string{"service_desk_specialist", "request_check", "category", "impact", "urgency", "priority"},
		}
	case "ticket:" + workflow.TicketAssigned:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "support_group_selected", Label: "Appropriate technical support group or resolver queue selected", Required: true},
				{Key: "critical_priority_checked", Label: "Critical priority checked for Major Incident Handling Procedure", Required: true},
				{Key: "management_escalation_noted", Label: "Management escalation noted when resolution needs authorization or is taking too long", Required: false},
			},
			SLAImpact:     "First response is recorded on first assignment.",
			DecisionTrail: []string{"service_desk_specialist", "team_queue", "assignee", "first_response_at"},
		}
	case "ticket:" + workflow.TicketInProgress:
		return transitionUXMetadata{
			ResponsibleRole: EndUserSupportSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "initial_diagnosis", Label: "Initial diagnosis and troubleshooting started", Required: true},
				{Key: "change_need_checked", Label: "Change Management need assessed", Required: true},
				{Key: "problem_need_checked", Label: "Problem Management need assessed for recurring or unknown root cause", Required: false},
				{Key: "actions_recorded", Label: "Investigation actions and results are recorded", Required: true},
			},
			SLAImpact:     "Resolution SLA remains active while diagnosis and recovery work are in progress.",
			DecisionTrail: []string{"service_desk_specialist", "end_user_support_specialist", "diagnosis", "actions_taken"},
		}
	case "ticket:" + workflow.TicketPendingCustomer:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "customer_information_requested", Label: "Customer information, confirmation, or satisfaction response requested", Required: true},
				{Key: "next_contact_due", Label: "Next customer follow-up point recorded", Required: false},
			},
			SLAImpact:     "SLA clock pauses while waiting for customer response.",
			DecisionTrail: []string{"service_desk_specialist", "customer_request", "follow_up_due"},
		}
	case "ticket:" + workflow.TicketPendingVendor:
		return transitionUXMetadata{
			ResponsibleRole: SecondLevelSupportSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "third_party_identified", Label: "3rd party or vendor escalation owner identified", Required: true},
				{Key: "diagnostics_shared", Label: "Diagnostic evidence and impact summary shared", Required: true},
				{Key: "monitoring_plan", Label: "Monitoring plan until resolution recorded", Required: true},
			},
			SLAImpact:     "SLA clock pauses while waiting for vendor or 3rd party action.",
			DecisionTrail: []string{"second_level_support_specialist", "third_party", "diagnostic_evidence", "monitoring_plan"},
		}
	case "ticket:" + workflow.TicketResolved:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			RequiredFields:  []string{"resolution_notes"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "service_recovery_done", Label: "Resolution or workaround executed within agreed service level", Required: true},
				{Key: "resolution_activity_documented", Label: "Resolution and recovery activity documented in the incident record", Required: true},
				{Key: "customer_notified", Label: "Customer informed of incident resolution", Required: true},
				{Key: "knowledge_reviewed", Label: "Knowledge base updated with correct resolution where applicable", Required: false},
			},
			SLAImpact:     "Resolution SLA stops when the ticket is resolved.",
			DecisionTrail: []string{"service_desk_specialist", "resolver", "resolution_notes", "resolved_at"},
		}
	case "ticket:" + workflow.TicketClosed:
		return transitionUXMetadata{
			ResponsibleRole: "affected_staff",
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "customer_satisfaction_confirmed", Label: "Customer satisfaction with resolution confirmed", Required: true},
				{Key: "closure_time_recorded", Label: "Date, time, resolver, and time spent recorded", Required: true},
				{Key: "classification_quality", Label: "Classification complete and accurate according to root cause", Required: true},
			},
			SLAImpact:     "Closure locks the ticket lifecycle and finalizes reporting metrics.",
			DecisionTrail: []string{"affected_staff", "service_desk_specialist", "closed_at", "satisfaction"},
		}
	case "ticket:" + workflow.TicketCancelled:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			DecisionTrail:   []string{"service_desk_specialist", "cancel_reason", "cancelled_at"},
		}
	case "problem:" + workflow.ProblemInvestigating:
		return transitionUXMetadata{
			ResponsibleRole: ITServiceCenterSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "problem_record_complete", Label: "Problem record contains nature, symptoms, and linked incident evidence", Required: true},
				{Key: "category_priority_set", Label: "Category and priority reviewed using incident priority matrix", Required: true},
			},
			DecisionTrail: []string{"service_desk", "it_service_center_specialist", "linked_incidents", "priority"},
		}
	case "problem:" + workflow.ProblemRootCauseIdentified:
		return transitionUXMetadata{
			ResponsibleRole: ITServiceCenterSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			RequiredFields:  []string{"root_cause"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "rca_template", Label: "Structured RCA evidence captured", Required: true},
				{Key: "linked_incidents_reviewed", Label: "Linked incidents reviewed", Required: true},
				{Key: "configuration_items_reviewed", Label: "Associated CIs reviewed", Required: true},
			},
			DecisionTrail: []string{"it_service_center_specialist", "root_cause", "evidence", "linked_cis"},
		}
	case "problem:" + workflow.ProblemKnownError:
		return transitionUXMetadata{
			ResponsibleRole: ITServiceCenterSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "workaround_documented", Label: "Workaround documented", Required: true},
				{Key: "kedb_updated", Label: "Known Error Database updated", Required: true},
				{Key: "incident_process_ready", Label: "Incident Management handoff guidance prepared", Required: false},
			},
			DecisionTrail: []string{"it_service_center_specialist", "it_service_support_specialist", "workaround", "known_error_record"},
		}
	case "problem:" + workflow.ProblemThirdPartyEscalated:
		return transitionUXMetadata{
			ResponsibleRole: ITServiceCenterSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "no_workaround_confirmed", Label: "No viable workaround has been confirmed", Required: true},
				{Key: "third_party_owner_identified", Label: "3rd party owner and escalation path identified", Required: true},
				{Key: "impact_summary_shared", Label: "Impact and diagnostic evidence shared", Required: true},
			},
			DecisionTrail: []string{"senior_it_service_center_specialist", "third_party", "escalation_reason", "evidence"},
		}
	case "problem:" + workflow.ProblemResolved:
		return transitionUXMetadata{
			ResponsibleRole: ITServiceCenterSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "permanent_fix", Label: "Permanent fix validated", Required: true},
				{Key: "change_linked", Label: "Remediation change linked where required", Required: false},
				{Key: "problem_solved_confirmed", Label: "Problem solved confirmation captured", Required: true},
			},
			DecisionTrail: []string{"it_service_center_specialist", "permanent_fix", "linked_change", "validation"},
		}
	case "problem:" + workflow.ProblemClosed:
		return transitionUXMetadata{
			ResponsibleRole: ITServiceCenterSpecialistRole,
			AccountableRole: SeniorITServiceCenterSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "rca_report_produced", Label: "Root cause analysis report produced", Required: true},
				{Key: "related_incidents_closed", Label: "Related incidents closed or handed back to Incident Management", Required: true},
				{Key: "knowledge_base_updated", Label: "Knowledge base or KEDB updated", Required: true},
			},
			DecisionTrail: []string{"senior_it_service_center_specialist", "closure_summary", "rca_report", "knowledge_update"},
		}
	case "change:" + workflow.ChangeSubmitted:
		return transitionUXMetadata{
			ResponsibleRole: BusinessAnalystRole,
			AccountableRole: BusinessRelationshipManagerRole,
			RequiredFields:  []string{"title", "description", "classification", "change_type", "impact", "urgency"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "rfc_received", Label: "RFC received from business unit, incident, problem, or capacity process", Required: true},
				{Key: "rfc_form_complete", Label: "RFC form completed with required details", Required: true},
				{Key: "classification_ready", Label: "Emergency, standard, or normal classification ready", Required: true},
			},
			DecisionTrail: []string{"business_analyst", "change_requestor", "rfc_form", "classification"},
		}
	case "change:" + workflow.ChangeAssessing:
		return transitionUXMetadata{
			ResponsibleRole: BusinessAnalystRole,
			AccountableRole: BusinessRelationshipManagerRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "sme_identified", Label: "Subject matter expert identified where required", Required: true},
				{Key: "impact_scope_defined", Label: "Business, service, CI, and risk impact scope defined", Required: true},
			},
			DecisionTrail: []string{"business_analyst", "subject_matter_expert", "risk_scope"},
		}
	case "change:" + workflow.ChangeCABReview:
		return transitionUXMetadata{
			ResponsibleRole: ChangeRequestorRole,
			AccountableRole: CABMeetingSecretaryRole,
			RequiredFields:  []string{"risk_assessment", "risk_level"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "risk_assessment_done", Label: "Impact analysis and risk assessment completed", Required: true},
				{Key: "cab_pack_ready", Label: "RFC pack validated for CAB deliberation", Required: true},
				{Key: "cab_agenda_ready", Label: "CAB agenda or emergency approval route prepared", Required: true},
			},
			DecisionTrail: []string{"change_requestor", "cab_secretary", "risk_assessment", "cab_pack"},
		}
	case "change:" + workflow.ChangeApproved:
		return transitionUXMetadata{
			ResponsibleRole: CABMemberRole,
			AccountableRole: ChangeApproverRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "rfc_reviewed", Label: "RFC and risk assessment reviewed", Required: true},
				{Key: "release_reports_considered", Label: "Release and deployment reports considered where relevant", Required: false},
				{Key: "decision_recorded", Label: "Approval decision and notes recorded", Required: true},
			},
			SLAImpact:     "Approval allows scheduling and implementation planning to progress.",
			DecisionTrail: []string{"cab_member", "change_approver", "risk_level", "decision_notes"},
		}
	case "change:" + workflow.ChangeRejected:
		return transitionUXMetadata{
			ResponsibleRole: CABMemberRole,
			AccountableRole: ChangeApproverRole,
			RequiredFields:  []string{"comment"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "rejection_reason", Label: "Rejection reason captured", Required: true},
				{Key: "requestor_notification_ready", Label: "Requester notification prepared", Required: true},
			},
			DecisionTrail: []string{"cab_member", "change_approver", "rejection_reason"},
		}
	case "change:" + workflow.ChangeDeferred:
		return transitionUXMetadata{
			ResponsibleRole: CABMemberRole,
			AccountableRole: CABMeetingSecretaryRole,
			RequiredFields:  []string{"comment"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "further_information_defined", Label: "Further information request clearly defined", Required: true},
				{Key: "sme_followup_identified", Label: "SME or requester follow-up owner identified", Required: true},
			},
			DecisionTrail: []string{"cab_member", "cab_secretary", "information_request"},
		}
	case "change:" + workflow.ChangeScheduled:
		return transitionUXMetadata{
			ResponsibleRole: ChangeManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			RequiredFields:  []string{"implementation_plan", "rollback_plan", "test_plan", "scheduled_start", "scheduled_end"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "change_record_updated", Label: "Change record updated after approval", Required: true},
				{Key: "test_solution_ready", Label: "Test solution process completed or accepted", Required: true},
				{Key: "implementation_window_selected", Label: "Next available implementation window selected", Required: true},
			},
			DecisionTrail: []string{"change_manager", "test_management_specialist", "implementation_plan", "schedule"},
		}
	case "change:" + workflow.ChangeImplementing:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ChangeApproverRole,
			RequiredFields:  []string{"implementation_plan", "rollback_plan", "test_plan", "scheduled_start", "scheduled_end"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "components_built_tested", Label: "Required change components built and properly tested", Required: true},
				{Key: "final_authorization_confirmed", Label: "Final implementation authorization confirmed", Required: true},
				{Key: "release_handoff_ready", Label: "Release and deployment handoff ready where applicable", Required: false},
			},
			DecisionTrail: []string{"release_manager", "change_approver", "actual_start"},
		}
	case "change:" + workflow.ChangeImplemented:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ChangeManagerRole,
			RequiredFields:  []string{"notes"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "implementation_report", Label: "Implementation report reviewed", Required: true},
				{Key: "success_confirmed", Label: "Successful implementation confirmed", Required: true},
				{Key: "requestor_notified", Label: "Requester and stakeholders notified of status", Required: true},
			},
			DecisionTrail: []string{"release_manager", "change_manager", "actual_end", "implementation_report"},
		}
	case "change:" + workflow.ChangeFailed:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ChangeManagerRole,
			RequiredFields:  []string{"notes"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "failure_report", Label: "Implementation failure report captured", Required: true},
				{Key: "rollback_or_workaround_assessed", Label: "Rollback or temporary workaround assessed", Required: true},
			},
			DecisionTrail: []string{"release_manager", "change_manager", "failure_report"},
		}
	case "change:" + workflow.ChangeRolledBack:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ChangeManagerRole,
			RequiredFields:  []string{"reason"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "rollback_applied", Label: "Rollback or temporary workaround applied", Required: true},
				{Key: "business_impact_recorded", Label: "Residual business impact recorded", Required: true},
			},
			DecisionTrail: []string{"release_manager", "rollback_reason", "actual_end"},
		}
	case "change:" + workflow.ChangeInvestigating:
		return transitionUXMetadata{
			ResponsibleRole: ChangeManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "failure_investigation_started", Label: "Failed change investigation started", Required: true},
				{Key: "reschedule_plan_defined", Label: "Rework and reschedule plan defined", Required: true},
			},
			DecisionTrail: []string{"change_manager", "test_management_specialist", "failure_analysis"},
		}
	case "change:" + workflow.ChangePIRPending:
		return transitionUXMetadata{
			ResponsibleRole: BusinessAnalystRole,
			AccountableRole: BusinessRelationshipManagerRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "implementation_result", Label: "Implementation result documented", Required: true},
				{Key: "objectives_confirmed", Label: "Change objectives and requester satisfaction reviewed", Required: true},
				{Key: "cab_report_ready", Label: "CAB reporting input ready", Required: false},
			},
			DecisionTrail: []string{"business_analyst", "business_relationship_manager", "pir_notes", "requestor_satisfaction"},
		}
	case "change:" + workflow.ChangeClosed:
		return transitionUXMetadata{
			ResponsibleRole: ChangeManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "documentation_complete", Label: "Formal change documentation complete", Required: true},
				{Key: "cab_reported", Label: "Execution report submitted to CAB where required", Required: true},
				{Key: "management_reporting_ready", Label: "Management reporting data complete", Required: true},
			},
			DecisionTrail: []string{"change_manager", "test_management_specialist", "closed_at", "management_reporting"},
		}
	case "release:" + workflow.ReleaseBuild:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"deployment_plan"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "uat_signoff_received", Label: "UAT signoff received with signed test scripts", Required: true},
				{Key: "deployment_plan_defined", Label: "Deployment approach, team roles, environment, risk, and mitigation documented", Required: true},
				{Key: "rollback_plan_defined", Label: "Rollback path documented before deployment planning progresses", Required: true},
			},
			DecisionTrail: []string{"release_manager", "uat_signoff", "deployment_plan", "rollback_plan"},
		}
	case "release:" + workflow.ReleaseTesting:
		return transitionUXMetadata{
			ResponsibleRole: SolutionsDeliverySpecialistRole,
			AccountableRole: SolutionsDeliverySpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "deployment_team_set", Label: "Deployment team nominees received and responsibilities assigned", Required: true},
				{Key: "kickoff_completed", Label: "Deployment team kick-off completed", Required: true},
				{Key: "environment_prepared", Label: "Deployment environment and enabling infrastructure prepared", Required: true},
			},
			DecisionTrail: []string{"solutions_delivery_specialist", "deployment_team", "environment_readiness"},
		}
	case "release:" + workflow.ReleaseApproved:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: DITDApproverRole,
			RequiredFields:  []string{"comment"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "readiness_assessed", Label: "Environment readiness assessed and exceptions resolved", Required: true},
				{Key: "implementation_certificate_ready", Label: "Implementation certificate prepared for stakeholder sign-off", Required: true},
				{Key: "ditd_approval_recorded", Label: "DITD approval for solution deployment recorded", Required: true},
			},
			DecisionTrail: []string{"release_manager", "release_management_lead", "ditd_approval", "implementation_certificate"},
		}
	case "release:" + workflow.ReleaseScheduled:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "deployment_authorized", Label: "Deployment team authorized to roll out the solution release", Required: true},
				{Key: "deployment_option_selected", Label: "Deployment option selected: data migration, pilot, or full solution release", Required: true},
				{Key: "stakeholders_notified", Label: "Requester and relevant stakeholders notified of deployment timing", Required: true},
			},
			DecisionTrail: []string{"release_manager", "release_management_lead", "deployment_option", "schedule"},
		}
	case "release:" + workflow.ReleaseDeploying:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "deployment_authorized", Label: "Deployment authorization confirmed", Required: true},
				{Key: "deployment_window_ready", Label: "Deployment window and team availability confirmed", Required: true},
			},
			SLAImpact:     "Deployment execution starts and release actual start is recorded.",
			DecisionTrail: []string{"release_manager", "actual_start", "deployment_type"},
		}
	case "release:" + workflow.ReleaseDeployed:
		return transitionUXMetadata{
			ResponsibleRole: SolutionsDeliverySpecialistRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"notes"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "solution_deployed", Label: "Solution rolled out according to approval and deployment plan", Required: true},
				{Key: "results_evaluated", Label: "Release outcome evaluated against requirements and expectations", Required: true},
				{Key: "rollout_successful", Label: "Rollout confirmed successful or rollback decision recorded", Required: true},
			},
			DecisionTrail: []string{"solutions_delivery_specialist", "release_management_lead", "deployment_result", "evaluation_notes"},
		}
	case "release:" + workflow.ReleaseRolledBack:
		return transitionUXMetadata{
			ResponsibleRole: SolutionsDeliverySpecialistRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"reason"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "rollback_applied", Label: "Rollback to previous state completed", Required: true},
				{Key: "rollback_impact_recorded", Label: "Rollback impact and residual issues recorded", Required: true},
			},
			DecisionTrail: []string{"solutions_delivery_specialist", "release_management_lead", "rollback_reason", "actual_end"},
		}
	case "release:" + workflow.ReleaseClosed:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: SeniorReleaseManagementSpecialistRole,
			RequiredFields:  []string{"comment"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "close_out_report_prepared", Label: "Close-out report prepared", Required: true},
				{Key: "lessons_learned_recorded", Label: "Lessons learned and deployment outcome documented", Required: true},
				{Key: "relevant_processes_notified", Label: "Change Management, Service Portfolio, Project and Program Management notified", Required: true},
			},
			DecisionTrail: []string{"release_manager", "senior_release_management_specialist", "close_out_report", "lessons_learned"},
		}
	case "release:" + workflow.ReleaseCancelled:
		return transitionUXMetadata{
			ResponsibleRole: ReleaseManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"reason"},
			DecisionTrail:   []string{"release_manager", "release_management_lead", "cancel_reason"},
		}
	case "test_solution:" + workflow.TestSolutionPlanning:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"test_requirements", "test_types"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "notification_reviewed", Label: "Test request or release notification reviewed", Required: true},
				{Key: "test_types_selected", Label: "System, integration, performance, security, data conversion, and UAT scope determined", Required: true},
				{Key: "missing_information_requested", Label: "Outstanding documents, clarifications, or sign-offs requested where needed", Required: false},
			},
			DecisionTrail: []string{"test_manager", "release_management_lead", "test_types", "requirements"},
		}
	case "test_solution:" + workflow.TestSolutionAuthorized:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"test_plan", "test_lead"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "test_execution_order", Label: "Order of tests planned", Required: true},
				{Key: "requirements_documented", Label: "Functional, technical, security, and conversion requirements documented", Required: true},
				{Key: "test_leads_authorized", Label: "Test leads authorized to commence testing", Required: true},
			},
			DecisionTrail: []string{"test_manager", "release_management_lead", "test_plan", "test_lead"},
		}
	case "test_solution:" + workflow.TestSolutionSystemPrereq:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "unit_scripts_received", Label: "Signed unit test scripts, implementation procedure, and artefacts received", Required: true},
				{Key: "requirements_docs_received", Label: "Functional, technical, and security requirement documents received", Required: true},
				{Key: "prerequisites_complete", Label: "System test prerequisites reviewed for completeness", Required: true},
			},
			DecisionTrail: []string{"test_manager", "test_management_specialist", "unit_test_scripts", "requirements"},
		}
	case "test_solution:" + workflow.TestSolutionSystemPlanning:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "artefacts_moved", Label: "Test artefacts moved from development to test environment", Required: true},
				{Key: "system_test_team_selected", Label: "System test team members selected", Required: true},
			},
			DecisionTrail: []string{"test_manager", "solution_developer", "test_environment", "team_members"},
		}
	case "test_solution:" + workflow.TestSolutionSystemPreparation:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "system_test_scripts_ready", Label: "System test scripts prepared", Required: true},
				{Key: "stakeholders_notified", Label: "Environment owners and test stakeholders notified", Required: true},
				{Key: "test_schedule_confirmed", Label: "System test schedule and team briefing confirmed", Required: true},
			},
			DecisionTrail: []string{"test_manager", "test_scripts", "schedule", "stakeholders"},
		}
	case "test_solution:" + workflow.TestSolutionSystemReadiness:
		return transitionUXMetadata{
			ResponsibleRole: SolutionDeveloperRole,
			AccountableRole: SeniorSolutionDeveloperRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "environment_ready", Label: "Test environment and test data confirmed ready", Required: true},
				{Key: "dependencies_ready", Label: "Required integrations and supporting artefacts are available", Required: true},
			},
			DecisionTrail: []string{"solution_developer", "senior_solution_developer", "environment_readiness"},
		}
	case "test_solution:" + workflow.TestSolutionSystemExecution:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "system_test_executed", Label: "System test carried out according to schedule and plan", Required: true},
				{Key: "system_results_documented", Label: "System test results documented", Required: true},
				{Key: "system_signoff_obtained", Label: "Completed system test scripts or cases signed off", Required: true},
			},
			DecisionTrail: []string{"test_manager", "test_management_specialist", "system_test_results", "signoff"},
		}
	case "test_solution:" + workflow.TestSolutionSystemReview:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			RequiredFields:  []string{"test_result"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "system_results_reviewed", Label: "System test results reviewed", Required: true},
				{Key: "system_success_decision", Label: "System test success or rework decision recorded", Required: true},
			},
			DecisionTrail: []string{"test_manager", "system_test_result", "decision"},
		}
	case "test_solution:" + workflow.TestSolutionIntegrationPreparation:
		return transitionUXMetadata{
			ResponsibleRole: SolutionDeveloperRole,
			AccountableRole: SeniorSolutionDeveloperRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "integration_scripts_reviewed", Label: "Integration test scripts prepared or reviewed", Required: true},
				{Key: "components_assembled", Label: "Component modules assembled and environment prepared", Required: true},
				{Key: "integration_team_notified", Label: "Integration test team assembled or notified", Required: true},
			},
			DecisionTrail: []string{"test_manager", "solution_developer", "integration_scripts", "components"},
		}
	case "test_solution:" + workflow.TestSolutionIntegrationExecution:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "integration_test_executed", Label: "Integration test carried out as documented", Required: true},
				{Key: "integration_results_documented", Label: "Integration test results documented", Required: true},
				{Key: "integration_signoff_obtained", Label: "Integration test sign-off obtained", Required: true},
			},
			DecisionTrail: []string{"test_manager", "integration_test_result", "signoff"},
		}
	case "test_solution:" + workflow.TestSolutionStressPreparation:
		return transitionUXMetadata{
			ResponsibleRole: SolutionDeveloperRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "performance_scripts_ready", Label: "Stress/performance test scripts and targets prepared", Required: true},
				{Key: "load_environment_ready", Label: "Load environment, test data, and monitoring prepared", Required: true},
			},
			DecisionTrail: []string{"test_manager", "solution_developer", "performance_targets"},
		}
	case "test_solution:" + workflow.TestSolutionStressExecution:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "performance_test_executed", Label: "Stress/performance test executed", Required: true},
				{Key: "performance_results_documented", Label: "Performance results documented", Required: true},
				{Key: "performance_signoff_obtained", Label: "Performance test sign-off obtained", Required: true},
			},
			DecisionTrail: []string{"test_manager", "performance_result", "signoff"},
		}
	case "test_solution:" + workflow.TestSolutionSecurityPreparation:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: SolutionDeveloperRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "security_test_scope_ready", Label: "Security test scope and scripts prepared", Required: true},
				{Key: "security_environment_ready", Label: "Security test environment and access prepared", Required: true},
			},
			DecisionTrail: []string{"test_manager", "solution_developer", "security_scope"},
		}
	case "test_solution:" + workflow.TestSolutionSecurityExecution:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: SolutionDeveloperRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "security_test_executed", Label: "Security test executed as documented", Required: true},
				{Key: "security_results_documented", Label: "Security results documented", Required: true},
				{Key: "security_signoff_obtained", Label: "Security test sign-off obtained", Required: true},
			},
			DecisionTrail: []string{"test_manager", "security_result", "signoff"},
		}
	case "test_solution:" + workflow.TestSolutionDataConversionPreparation:
		return transitionUXMetadata{
			ResponsibleRole: TestAnalystRole,
			AccountableRole: SolutionDeveloperRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "conversion_scripts_ready", Label: "Data conversion scripts and reconciliation criteria prepared", Required: true},
				{Key: "conversion_data_ready", Label: "Source data, target environment, and rollback path prepared", Required: true},
			},
			DecisionTrail: []string{"test_manager", "test_analyst", "conversion_plan"},
		}
	case "test_solution:" + workflow.TestSolutionDataConversionExecution:
		return transitionUXMetadata{
			ResponsibleRole: TestAnalystRole,
			AccountableRole: SolutionDeveloperRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "conversion_test_executed", Label: "Data conversion test executed", Required: true},
				{Key: "conversion_results_documented", Label: "Data conversion results documented", Required: true},
				{Key: "conversion_signoff_obtained", Label: "Data conversion test sign-off obtained", Required: true},
			},
			DecisionTrail: []string{"test_analyst", "conversion_result", "signoff"},
		}
	case "test_solution:" + workflow.TestSolutionUATConfirmation:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "initial_tests_performed", Label: "All required initial tests have been performed", Required: true},
				{Key: "initial_test_evidence_reviewed", Label: "Initial test results and sign-offs reviewed", Required: true},
			},
			DecisionTrail: []string{"test_manager", "test_management_specialist", "initial_test_results"},
		}
	case "test_solution:" + workflow.TestSolutionUATPreparation:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "uat_plan_defined", Label: "UAT test plan and scripts defined", Required: true},
				{Key: "uat_success_criteria_defined", Label: "UAT success criteria and business validation scope defined", Required: true},
			},
			DecisionTrail: []string{"test_manager", "uat_plan", "uat_scripts"},
		}
	case "test_solution:" + workflow.TestSolutionUATNominees:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "nominees_requested", Label: "Test nominees requested from user groups", Required: true},
				{Key: "nominee_availability_confirmed", Label: "Nominee availability and business representation confirmed", Required: false},
			},
			DecisionTrail: []string{"test_manager", "user_groups", "test_nominees"},
		}
	case "test_solution:" + workflow.TestSolutionUATExecution:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "uat_executed", Label: "UAT carried out according to scripts", Required: true},
				{Key: "uat_results_documented", Label: "UAT results documented", Required: true},
				{Key: "uat_signoff_obtained", Label: "UAT sign-off obtained", Required: true},
			},
			DecisionTrail: []string{"test_manager", "uat_result", "uat_signoff"},
		}
	case "test_solution:" + workflow.TestSolutionUATReview:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			RequiredFields:  []string{"uat_result"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "uat_confirmed", Label: "UAT confirmed as carried out accordingly", Required: true},
				{Key: "uat_release_decision", Label: "Release handoff or build/configure rework decision recorded", Required: true},
			},
			DecisionTrail: []string{"test_manager", "uat_success", "release_handoff_decision"},
		}
	case "test_solution:" + workflow.TestSolutionReleaseHandoff:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"uat_signoff", "test_results"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "uat_signed", Label: "UAT sign-off is signed or approved", Required: true},
				{Key: "test_results_packaged", Label: "Test results packaged for Release and Deployment Management", Required: true},
				{Key: "release_manager_notified", Label: "Release Manager and relevant processes notified", Required: true},
			},
			DecisionTrail: []string{"test_manager", "release_management_lead", "uat_signoff", "test_results"},
		}
	case "test_solution:" + workflow.TestSolutionBuildRework:
		return transitionUXMetadata{
			ResponsibleRole: SolutionDeveloperRole,
			AccountableRole: SeniorSolutionDeveloperRole,
			RequiredFields:  []string{"failure_reason"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "failure_logged", Label: "Failed test result and root cause recorded", Required: true},
				{Key: "rework_owner_assigned", Label: "Build/configure rework owner assigned", Required: true},
			},
			DecisionTrail: []string{"test_manager", "solution_developer", "failure_reason", "rework_owner"},
		}
	case "test_solution:" + workflow.TestSolutionClosed:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: TestManagementSpecialistRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "evidence_complete", Label: "All test evidence, decisions, and sign-offs are complete", Required: true},
				{Key: "run_closed", Label: "Test run closed for audit and reporting", Required: true},
			},
			DecisionTrail: []string{"test_manager", "test_management_specialist", "closed_at"},
		}
	case "test_solution:" + workflow.TestSolutionCancelled:
		return transitionUXMetadata{
			ResponsibleRole: TestManagerRole,
			AccountableRole: ReleaseManagementLeadRole,
			RequiredFields:  []string{"reason"},
			DecisionTrail:   []string{"test_manager", "release_management_lead", "cancel_reason"},
		}
	case "major_incident:" + workflow.MajorIncidentResolved:
		return transitionUXMetadata{
			RequiredFields: []string{"resolution_summary", "root_cause"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "services_restored", Label: "Affected services restored", Required: true},
				{Key: "stakeholders_updated", Label: "Stakeholders received final operational update", Required: true},
				{Key: "pir_scheduled", Label: "PIR handoff is ready", Required: true},
			},
			SLAImpact:     "Major incident duration stops at resolution and PIR tracking begins.",
			DecisionTrail: []string{"incident_commander", "root_cause", "resolution_summary"},
		}
	case "major_incident:" + workflow.MajorIncidentClosed:
		return transitionUXMetadata{
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "pir_completed", Label: "PIR completed", Required: true},
				{Key: "corrective_actions", Label: "Corrective actions captured", Required: true},
			},
			DecisionTrail: []string{"pir_owner", "pir_report", "closed_at"},
		}
	case "service_request:" + workflow.ServiceRequestFulfilled:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskAnalystRole,
			AccountableRole: SeniorServiceDeskAnalystRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "fulfillment_confirmed", Label: "Fulfillment output confirmed", Required: true},
				{Key: "requester_notified", Label: "Requester notified", Required: true},
			},
			SLAImpact: "Fulfillment SLA stops when the request is fulfilled.",
		}
	case "service_request:" + workflow.ServiceRequestClosed:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskAnalystRole,
			AccountableRole: SeniorServiceDeskAnalystRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "requester_acceptance", Label: "Requester acceptance captured or timeout elapsed", Required: true},
			},
		}
	case "service_request:" + workflow.ServiceRequestApproved:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskAnalystRole,
			AccountableRole: SeniorServiceDeskAnalystRole,
			DecisionTrail:   []string{"approver", "approval_comment", "approved_at"},
		}
	case "service_request:" + workflow.ServiceRequestRejected:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskAnalystRole,
			AccountableRole: SeniorServiceDeskAnalystRole,
			DecisionTrail:   []string{"approver", "rejection_reason", "rejected_at"},
		}
	case "service_request:" + workflow.ServiceRequestInProgress:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskAnalystRole,
			AccountableRole: SeniorServiceDeskAnalystRole,
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "request_packaged", Label: "Request package reviewed and ready for provisioning", Required: true},
				{Key: "fulfillment_owner_confirmed", Label: "Service Desk or relevant IT division owner confirmed", Required: true},
			},
			SLAImpact:     "Fulfillment SLA ownership starts when provisioning begins.",
			DecisionTrail: []string{"service_desk_analyst", "assigned_to", "routing_note"},
		}
	case "service_request:" + workflow.ServiceRequestCancelled:
		return transitionUXMetadata{
			ResponsibleRole: ServiceDeskAnalystRole,
			AccountableRole: SeniorServiceDeskAnalystRole,
			DecisionTrail:   []string{"requester", "cancelled_at"},
		}
	}
	return transitionUXMetadata{}
}

func workflowLabel(def workflowMetadata, status string) string {
	if label, ok := def.labels[status]; ok {
		return label
	}
	parts := strings.Fields(strings.ReplaceAll(status, "_", " "))
	for i, part := range parts {
		runes := []rune(part)
		if len(runes) == 0 {
			continue
		}
		runes[0] = unicode.ToUpper(runes[0])
		parts[i] = string(runes)
	}
	return strings.Join(parts, " ")
}

// WorkflowHandler exposes ITSM lifecycle definitions to clients.
type WorkflowHandler struct{}

func NewWorkflowHandler() *WorkflowHandler {
	return &WorkflowHandler{}
}

func (h *WorkflowHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Get("/{entity}/transitions", h.GetAllowedTransitions)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{entity}", h.GetWorkflow)
}

func (h *WorkflowHandler) GetWorkflow(w http.ResponseWriter, r *http.Request) {
	if types.GetAuthContext(r.Context()) == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	def, ok := workflowSnapshotForEntity(chi.URLParam(r, "entity"))
	if !ok {
		types.ErrorMessage(w, http.StatusNotFound, "NOT_FOUND", "Unknown ITSM workflow entity")
		return
	}
	types.OK(w, def, nil)
}

func (h *WorkflowHandler) GetAllowedTransitions(w http.ResponseWriter, r *http.Request) {
	if types.GetAuthContext(r.Context()) == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "status query parameter is required")
		return
	}

	resp, ok := workflowTransitionsForEntity(chi.URLParam(r, "entity"), status)
	if !ok {
		types.ErrorMessage(w, http.StatusNotFound, "NOT_FOUND", "Unknown ITSM workflow entity")
		return
	}
	applyWorkflowTransitionContext(&resp, r.URL.Query())
	types.OK(w, resp, nil)
}
