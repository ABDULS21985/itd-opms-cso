package itsm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
