package itsm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func workflowTestRequest(entity, status string) (*httptest.ResponseRecorder, *http.Request) {
	req := httptest.NewRequest(http.MethodGet, "/workflows/"+entity+"/transitions?status="+status, nil)
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Permissions: []string{"*"},
	}
	req = req.WithContext(types.SetAuthContext(req.Context(), auth))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("entity", entity)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	return httptest.NewRecorder(), req
}

func TestWorkflowTransitions_Ticket(t *testing.T) {
	w, req := workflowTestRequest("ticket", TicketStatusInProgress)
	NewWorkflowHandler().GetAllowedTransitions(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	data, ok := resp.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected response data map, got %T", resp.Data)
	}
	rawTransitions, ok := data["transitions"].([]any)
	if !ok {
		t.Fatalf("expected transitions array, got %T", data["transitions"])
	}
	got := make(map[string]bool, len(rawTransitions))
	for _, raw := range rawTransitions {
		item := raw.(map[string]any)
		got[item["value"].(string)] = true
	}
	for _, want := range []string{
		TicketStatusPendingCustomer,
		TicketStatusPendingVendor,
		TicketStatusResolved,
		TicketStatusCancelled,
	} {
		if !got[want] {
			t.Fatalf("missing transition %q in %v", want, got)
		}
	}
}

func TestWorkflowTransitions_TicketExposeIncidentBRDRoles(t *testing.T) {
	classify, ok := workflowTransitionsForEntity("ticket", TicketStatusLogged)
	if !ok {
		t.Fatal("ticket workflow not found")
	}
	for _, tr := range classify.Transitions {
		if tr.Value == TicketStatusClassified {
			if tr.ResponsibleRole != ServiceDeskSpecialistRole {
				t.Fatalf("classified responsible role = %q, want %q", tr.ResponsibleRole, ServiceDeskSpecialistRole)
			}
			if tr.AccountableRole != SeniorITServiceCenterSpecialistRole {
				t.Fatalf("classified accountable role = %q, want %q", tr.AccountableRole, SeniorITServiceCenterSpecialistRole)
			}
			if len(tr.Checklist) == 0 {
				t.Fatal("classified transition should expose BRD checklist")
			}
			break
		}
	}

	inProgress, ok := workflowTransitionsForEntity("ticket", TicketStatusInProgress)
	if !ok {
		t.Fatal("ticket workflow not found")
	}
	gotVendor := false
	gotResolved := false
	for _, tr := range inProgress.Transitions {
		switch tr.Value {
		case TicketStatusPendingVendor:
			gotVendor = true
			if tr.ResponsibleRole != SecondLevelSupportSpecialistRole {
				t.Fatalf("pending vendor responsible role = %q, want %q", tr.ResponsibleRole, SecondLevelSupportSpecialistRole)
			}
		case TicketStatusResolved:
			gotResolved = true
			if tr.ResponsibleRole != ServiceDeskSpecialistRole {
				t.Fatalf("resolved responsible role = %q, want %q", tr.ResponsibleRole, ServiceDeskSpecialistRole)
			}
		}
	}
	if !gotVendor || !gotResolved {
		t.Fatalf("missing incident transitions from in_progress: pendingVendor=%v resolved=%v", gotVendor, gotResolved)
	}
}

func TestWorkflowTransitions_RejectsUnknownEntity(t *testing.T) {
	w, req := workflowTestRequest("unknown", "open")
	NewWorkflowHandler().GetAllowedTransitions(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestWorkflowSnapshot_ServiceRequestRejectedTerminal(t *testing.T) {
	def, ok := workflowSnapshotForEntity("service_request")
	if !ok {
		t.Fatal("service request workflow not found")
	}
	for _, status := range def.Statuses {
		if status.Value == RequestStatusRejected {
			if !status.Terminal {
				t.Fatal("rejected service request should be terminal")
			}
			return
		}
	}
	t.Fatal("rejected service request status missing")
}

func TestWorkflowTransitions_ServiceRequestExposeResponsibilityRoles(t *testing.T) {
	resp, ok := workflowTransitionsForEntity("service_request", RequestStatusApproved)
	if !ok {
		t.Fatal("service request workflow not found")
	}
	for _, tr := range resp.Transitions {
		if tr.Value == RequestStatusInProgress {
			if tr.ResponsibleRole != ServiceDeskAnalystRole {
				t.Fatalf("responsible role = %q, want %q", tr.ResponsibleRole, ServiceDeskAnalystRole)
			}
			if tr.AccountableRole != SeniorServiceDeskAnalystRole {
				t.Fatalf("accountable role = %q, want %q", tr.AccountableRole, SeniorServiceDeskAnalystRole)
			}
			return
		}
	}
	t.Fatal("start fulfillment transition missing")
}

func TestWorkflowTransitions_ProblemExposeBRDRolesAndClosure(t *testing.T) {
	resp, ok := workflowTransitionsForEntity("problem", ProblemStatusInvestigating)
	if !ok {
		t.Fatal("problem workflow not found")
	}
	gotThirdParty := false
	for _, tr := range resp.Transitions {
		if tr.Value == ProblemStatusThirdPartyEscalated {
			gotThirdParty = true
			if tr.ResponsibleRole != ITServiceCenterSpecialistRole {
				t.Fatalf("responsible role = %q, want %q", tr.ResponsibleRole, ITServiceCenterSpecialistRole)
			}
			if tr.AccountableRole != SeniorITServiceCenterSpecialistRole {
				t.Fatalf("accountable role = %q, want %q", tr.AccountableRole, SeniorITServiceCenterSpecialistRole)
			}
		}
	}
	if !gotThirdParty {
		t.Fatal("third-party escalation transition missing")
	}

	resolved, ok := workflowTransitionsForEntity("problem", ProblemStatusResolved)
	if !ok {
		t.Fatal("problem workflow not found")
	}
	for _, tr := range resolved.Transitions {
		if tr.Value == ProblemStatusClosed {
			if tr.AccountableRole != SeniorITServiceCenterSpecialistRole {
				t.Fatalf("closure accountable role = %q, want %q", tr.AccountableRole, SeniorITServiceCenterSpecialistRole)
			}
			return
		}
	}
	t.Fatal("closure transition missing")
}

func TestWorkflowTransitions_ChangeExposeBRDRoles(t *testing.T) {
	resp, ok := workflowTransitionsForEntity("change", "assessing")
	if !ok {
		t.Fatal("change workflow not found")
	}
	gotCAB := false
	for _, tr := range resp.Transitions {
		if tr.Value == "cab_review" {
			gotCAB = true
			if tr.ResponsibleRole != ChangeRequestorRole {
				t.Fatalf("CAB review responsible role = %q, want %q", tr.ResponsibleRole, ChangeRequestorRole)
			}
			if tr.AccountableRole != CABMeetingSecretaryRole {
				t.Fatalf("CAB review accountable role = %q, want %q", tr.AccountableRole, CABMeetingSecretaryRole)
			}
			if len(tr.Checklist) == 0 {
				t.Fatal("CAB review transition should expose BRD checklist")
			}
		}
	}
	if !gotCAB {
		t.Fatal("CAB review transition missing")
	}

	approved, ok := workflowTransitionsForEntity("change", "approved")
	if !ok {
		t.Fatal("change workflow not found")
	}
	for _, tr := range approved.Transitions {
		if tr.Value == "scheduled" {
			if tr.ResponsibleRole != ChangeManagerRole {
				t.Fatalf("schedule responsible role = %q, want %q", tr.ResponsibleRole, ChangeManagerRole)
			}
			if tr.AccountableRole != TestManagementSpecialistRole {
				t.Fatalf("schedule accountable role = %q, want %q", tr.AccountableRole, TestManagementSpecialistRole)
			}
			return
		}
	}
	t.Fatal("schedule transition missing")
}

func TestWorkflowTransitions_ChangeContextBlocksNormalDirectApproval(t *testing.T) {
	resp, ok := workflowTransitionsForEntity("change", "assessing")
	if !ok {
		t.Fatal("change workflow not found")
	}
	applyWorkflowTransitionContext(&resp, url.Values{"classification": []string{ChangeClassificationNormal}})

	for _, tr := range resp.Transitions {
		if tr.Value == "approved" || tr.Value == "rejected" {
			t.Fatalf("normal changes must not expose direct %s while assessing", tr.Value)
		}
	}
	gotApprovalBlock := false
	gotRejectionBlock := false
	for _, tr := range resp.BlockedTransitions {
		if tr.Value == "approved" && tr.Reason != "" {
			gotApprovalBlock = true
		}
		if tr.Value == "rejected" && tr.Reason != "" {
			gotRejectionBlock = true
		}
	}
	if !gotApprovalBlock || !gotRejectionBlock {
		t.Fatalf("expected direct approval and rejection to be blocked, approval=%v rejection=%v", gotApprovalBlock, gotRejectionBlock)
	}
}

func TestWorkflowTransitions_ReleaseExposeBRDRoles(t *testing.T) {
	resp, ok := workflowTransitionsForEntity("release", "planning")
	if !ok {
		t.Fatal("release workflow not found")
	}
	gotBuild := false
	for _, tr := range resp.Transitions {
		if tr.Value == "build" {
			gotBuild = true
			if tr.Label != "Create Deployment Plan" {
				t.Fatalf("build label = %q, want Create Deployment Plan", tr.Label)
			}
			if tr.ResponsibleRole != ReleaseManagerRole {
				t.Fatalf("build responsible role = %q, want %q", tr.ResponsibleRole, ReleaseManagerRole)
			}
			if tr.AccountableRole != ReleaseManagementLeadRole {
				t.Fatalf("build accountable role = %q, want %q", tr.AccountableRole, ReleaseManagementLeadRole)
			}
			if len(tr.Checklist) == 0 {
				t.Fatal("release build transition should expose BRD checklist")
			}
			break
		}
	}
	if !gotBuild {
		t.Fatal("release build transition missing")
	}

	deploying, ok := workflowTransitionsForEntity("release", "deploying")
	if !ok {
		t.Fatal("release workflow not found")
	}
	gotDeployed := false
	gotRollback := false
	for _, tr := range deploying.Transitions {
		switch tr.Value {
		case "deployed":
			gotDeployed = true
			if tr.ResponsibleRole != SolutionsDeliverySpecialistRole {
				t.Fatalf("deployed responsible role = %q, want %q", tr.ResponsibleRole, SolutionsDeliverySpecialistRole)
			}
		case "rolled_back":
			gotRollback = true
			if len(tr.RequiredFields) == 0 || tr.RequiredFields[0] != "reason" {
				t.Fatalf("rollback should require reason, got %v", tr.RequiredFields)
			}
		}
	}
	if !gotDeployed || !gotRollback {
		t.Fatalf("deploying transitions missing deployed=%v rollback=%v", gotDeployed, gotRollback)
	}
}
