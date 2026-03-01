package governance

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestMeetingHandler_ListMeetings_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.meeting.ListMeetings(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_CreateMeeting_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.meeting.CreateMeeting(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_GetMeeting_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.meeting.GetMeeting(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_UpdateMeeting_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.meeting.UpdateMeeting(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_CompleteMeeting_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/complete", nil)
	w := httptest.NewRecorder()
	h.meeting.CompleteMeeting(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_CancelMeeting_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/cancel", nil)
	w := httptest.NewRecorder()
	h.meeting.CancelMeeting(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_ListDecisions_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/decisions", nil)
	w := httptest.NewRecorder()
	h.meeting.ListDecisions(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_CreateDecision_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/decisions", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.meeting.CreateDecision(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_ListActions_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/actions", nil)
	w := httptest.NewRecorder()
	h.meeting.ListActions(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_CreateAction_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/actions", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.meeting.CreateAction(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_ListOverdue_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/actions/overdue", nil)
	w := httptest.NewRecorder()
	h.meeting.ListOverdue(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_OverdueStats_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/actions/overdue/stats", nil)
	w := httptest.NewRecorder()
	h.meeting.OverdueStats(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_MyOverdueActions_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/actions/overdue/mine", nil)
	w := httptest.NewRecorder()
	h.meeting.MyOverdueActions(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_GetAction_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/actions/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.meeting.GetAction(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_UpdateAction_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/actions/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.meeting.UpdateAction(w, req)
	govAssertUnauthorized(t, w)
}

func TestMeetingHandler_CompleteAction_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/actions/"+uuid.New().String()+"/complete", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.meeting.CompleteAction(w, req)
	govAssertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests — invalid UUIDs yield 400
// ──────────────────────────────────────────────

func TestMeetingHandler_GetMeeting_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.meeting.GetMeeting)

	req := govRequestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_UpdateMeeting_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.meeting.UpdateMeeting)

	req := govRequestWithAuth(http.MethodPut, "/not-a-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_UpdateMeeting_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.meeting.UpdateMeeting)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CompleteMeeting_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/complete", h.meeting.CompleteMeeting)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/complete", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CancelMeeting_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/cancel", h.meeting.CancelMeeting)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/cancel", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_ListDecisions_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/decisions", h.meeting.ListDecisions)

	req := govRequestWithAuth(http.MethodGet, "/bad-id/decisions", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CreateDecision_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/decisions", h.meeting.CreateDecision)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/decisions", `{"title":"t","description":"d"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CreateDecision_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/decisions", h.meeting.CreateDecision)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/decisions", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CreateDecision_MissingFields(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/decisions", h.meeting.CreateDecision)

	// Missing title and description
	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/decisions", `{"decisionNumber":"DEC-001"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestMeetingHandler_GetAction_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{actionId}", h.meeting.GetAction)

	req := govRequestWithAuth(http.MethodGet, "/bad-id", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_UpdateAction_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{actionId}", h.meeting.UpdateAction)

	req := govRequestWithAuth(http.MethodPut, "/bad-id", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_UpdateAction_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{actionId}", h.meeting.UpdateAction)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CompleteAction_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{actionId}/complete", h.meeting.CompleteAction)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/complete", `{"evidence":"done"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CompleteAction_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{actionId}/complete", h.meeting.CompleteAction)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/complete", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Input validation — CreateMeeting body
// ──────────────────────────────────────────────

func TestMeetingHandler_CreateMeeting_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{bad json}`)
	w := httptest.NewRecorder()
	h.meeting.CreateMeeting(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CreateMeeting_MissingTitle(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{"scheduledAt":"2026-06-15T10:00:00Z"}`)
	w := httptest.NewRecorder()
	h.meeting.CreateMeeting(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestMeetingHandler_CreateMeeting_MissingScheduledAt(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{"title":"Test Meeting"}`)
	w := httptest.NewRecorder()
	h.meeting.CreateMeeting(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Input validation — CreateAction body
// ──────────────────────────────────────────────

func TestMeetingHandler_CreateAction_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/actions", `{bad json}`)
	w := httptest.NewRecorder()
	h.meeting.CreateAction(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestMeetingHandler_CreateAction_MissingRequiredFields(t *testing.T) {
	h := newTestGovernanceHandler()
	// Missing title, sourceType, sourceId, ownerId
	req := govRequestWithAuth(http.MethodPost, "/actions", `{"description":"test"}`)
	w := httptest.NewRecorder()
	h.meeting.CreateAction(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestMeetingHandler_CreateAction_MissingDueDate(t *testing.T) {
	h := newTestGovernanceHandler()
	sourceID := uuid.New().String()
	ownerID := uuid.New().String()
	req := govRequestWithAuth(http.MethodPost, "/actions", `{"title":"Test","sourceType":"meeting","sourceId":"`+sourceID+`","ownerId":"`+ownerID+`"}`)
	w := httptest.NewRecorder()
	h.meeting.CreateAction(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestMeetingHandler_RouteRegistration(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			auth := &types.AuthContext{
				UserID:      uuid.New(),
				TenantID:    uuid.New(),
				Permissions: []string{"*"},
			}
			ctx := types.SetAuthContext(req.Context(), auth)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Route("/governance", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name          string
		method        string
		path          string
		body          string
		wantNotStatus int
	}{
		{"ListMeetings", http.MethodGet, "/governance/meetings/", "", http.StatusNotFound},
		{"CreateMeeting", http.MethodPost, "/governance/meetings/", `{"title":"t","scheduledAt":"2026-06-15T10:00:00Z"}`, http.StatusNotFound},
		{"GetMeeting", http.MethodGet, "/governance/meetings/" + validUUID, "", http.StatusNotFound},
		{"UpdateMeeting", http.MethodPut, "/governance/meetings/" + validUUID, `{}`, http.StatusNotFound},
		{"CompleteMeeting", http.MethodPost, "/governance/meetings/" + validUUID + "/complete", "", http.StatusNotFound},
		{"CancelMeeting", http.MethodPost, "/governance/meetings/" + validUUID + "/cancel", "", http.StatusNotFound},
		{"ListDecisions", http.MethodGet, "/governance/meetings/" + validUUID + "/decisions", "", http.StatusNotFound},
		{"CreateDecision", http.MethodPost, "/governance/meetings/" + validUUID + "/decisions", `{"title":"t","description":"d"}`, http.StatusNotFound},
		{"ListActions", http.MethodGet, "/governance/meetings/actions/", "", http.StatusNotFound},
		{"CreateAction", http.MethodPost, "/governance/meetings/actions/", `{"title":"t","sourceType":"meeting","sourceId":"` + validUUID + `","ownerId":"` + validUUID + `","dueDate":"2026-12-31T00:00:00Z"}`, http.StatusNotFound},
		{"ListOverdue", http.MethodGet, "/governance/meetings/actions/overdue", "", http.StatusNotFound},
		{"OverdueStats", http.MethodGet, "/governance/meetings/actions/overdue/stats", "", http.StatusNotFound},
		{"MyOverdueActions", http.MethodGet, "/governance/meetings/actions/overdue/mine", "", http.StatusNotFound},
		{"GetAction", http.MethodGet, "/governance/meetings/actions/" + validUUID, "", http.StatusNotFound},
		{"UpdateAction", http.MethodPut, "/governance/meetings/actions/" + validUUID, `{}`, http.StatusNotFound},
		{"CompleteAction", http.MethodPost, "/governance/meetings/actions/" + validUUID + "/complete", `{"evidence":"done"}`, http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != "" {
				req = httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}
			w := httptest.NewRecorder()

			// The handler may panic due to nil pool when the service layer
			// is reached. A panic means the route was found and the handler
			// was invoked, which is exactly what we want to verify.
			panicked := false
			func() {
				defer func() {
					if rec := recover(); rec != nil {
						panicked = true
					}
				}()
				r.ServeHTTP(w, req)
			}()

			if !panicked {
				if w.Code == tt.wantNotStatus {
					t.Errorf("route %s %s returned %d -- route not registered", tt.method, tt.path, w.Code)
				}
				if w.Code == http.StatusMethodNotAllowed {
					t.Errorf("route %s %s returned 405 -- method not allowed", tt.method, tt.path)
				}
			}
			// If panicked, the route was found (handler was invoked) — test passes.
		})
	}
}
