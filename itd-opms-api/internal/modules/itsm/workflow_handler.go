package itsm

import (
	"net/http"
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
			workflow.ChangeSubmitted:     "Submit",
			workflow.ChangeAssessing:     "Begin Assessment",
			workflow.ChangeCABReview:     "Send to CAB",
			workflow.ChangeApproved:      "Approve",
			workflow.ChangeRejected:      "Reject",
			workflow.ChangeDeferred:      "Defer",
			workflow.ChangeScheduled:     "Schedule",
			workflow.ChangeImplementing:  "Start Implementation",
			workflow.ChangeImplemented:   "Mark Implemented",
			workflow.ChangeFailed:        "Mark Failed",
			workflow.ChangeRolledBack:    "Rolled Back",
			workflow.ChangePIRPending:    "Proceed to PIR",
			workflow.ChangeClosed:        "Close",
			workflow.ChangeInvestigating: "Investigate",
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
			workflow.ReleaseBuild:      "Start Build",
			workflow.ReleaseTesting:    "Start Testing",
			workflow.ReleaseApproved:   "Approve",
			workflow.ReleaseScheduled:  "Schedule",
			workflow.ReleaseDeploying:  "Deploy",
			workflow.ReleaseDeployed:   "Mark Deployed",
			workflow.ReleaseRolledBack: "Roll Back",
			workflow.ReleaseClosed:     "Close",
			workflow.ReleaseCancelled:  "Cancel",
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
	case "ticket:" + workflow.TicketResolved:
		return transitionUXMetadata{
			RequiredFields: []string{"resolution_notes"},
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "customer_impact_confirmed", Label: "Customer impact has been confirmed", Required: true},
				{Key: "resolution_notes", Label: "Resolution notes are complete", Required: true},
				{Key: "knowledge_reviewed", Label: "KB article linked or not applicable reason captured", Required: true},
				{Key: "ci_reviewed", Label: "Related CI/asset reviewed for infrastructure incidents", Required: false},
			},
			SLAImpact:     "Resolution SLA stops when the ticket is resolved.",
			DecisionTrail: []string{"resolver", "resolution_notes", "resolved_at"},
		}
	case "ticket:" + workflow.TicketClosed:
		return transitionUXMetadata{
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "customer_notified", Label: "Customer has been notified", Required: true},
				{Key: "closure_quality", Label: "Closure details reviewed", Required: true},
			},
			SLAImpact:     "Closure locks the ticket lifecycle and finalizes reporting metrics.",
			DecisionTrail: []string{"closer", "closed_at"},
		}
	case "ticket:" + workflow.TicketPendingCustomer:
		return transitionUXMetadata{SLAImpact: "SLA clock pauses while waiting for customer response."}
	case "ticket:" + workflow.TicketPendingVendor:
		return transitionUXMetadata{SLAImpact: "SLA clock pauses while waiting for vendor action."}
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
	case "change:" + workflow.ChangeApproved:
		return transitionUXMetadata{
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "risk_assessed", Label: "Risk assessment reviewed", Required: true},
				{Key: "rollback_plan", Label: "Rollback plan accepted", Required: true},
				{Key: "test_plan", Label: "Test plan accepted", Required: true},
			},
			SLAImpact:     "Approval allows scheduling and CAB/reporting clocks to progress.",
			DecisionTrail: []string{"approver", "risk_level", "decision_notes"},
		}
	case "change:" + workflow.ChangePIRPending:
		return transitionUXMetadata{
			Checklist: []ITSMWorkflowChecklistItem{
				{Key: "implementation_result", Label: "Implementation result documented", Required: true},
				{Key: "success_criteria", Label: "Success criteria checked", Required: true},
			},
			DecisionTrail: []string{"implementer", "actual_start", "actual_end", "pir_required"},
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
	types.OK(w, resp, nil)
}
