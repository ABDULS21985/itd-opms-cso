package itsm

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestTicketHandler() *TicketHandler {
	svc := NewTicketService(nil, nil)
	return NewTicketHandler(svc)
}

func ticketRouter() (*TicketHandler, chi.Router) {
	h := newTestTicketHandler()
	r := chi.NewRouter()
	r.Route("/tickets", func(r chi.Router) {
		h.Routes(r)
	})
	return h, r
}

func withAuth(r *http.Request) *http.Request {
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@example.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(r.Context(), auth)
	return r.WithContext(ctx)
}

// ──────────────────────────────────────────────
// Auth guard tests — every endpoint must return 401 without auth
// ──────────────────────────────────────────────

func TestTicketHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestTicketHandler()

	validUUID := uuid.New().String()

	endpoints := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListTickets", http.MethodGet, "/tickets/", ""},
		{"GetTicket", http.MethodGet, "/tickets/" + validUUID, ""},
		{"CreateTicket", http.MethodPost, "/tickets/", `{"type":"incident","title":"test","description":"test","urgency":"high","impact":"high"}`},
		{"UpdateTicket", http.MethodPut, "/tickets/" + validUUID, `{"title":"updated"}`},
		{"TransitionStatus", http.MethodPost, "/tickets/" + validUUID + "/transition", `{"status":"assigned"}`},
		{"AssignTicket", http.MethodPost, "/tickets/" + validUUID + "/assign", `{"assigneeId":"` + uuid.New().String() + `"}`},
		{"EscalateTicket", http.MethodPost, "/tickets/" + validUUID + "/escalate", `{"reason":"urgent"}`},
		{"DeclareMajorIncident", http.MethodPost, "/tickets/" + validUUID + "/major-incident", `{}`},
		{"LinkTickets", http.MethodPost, "/tickets/" + validUUID + "/link", `{"relatedTicketId":"` + uuid.New().String() + `"}`},
		{"ResolveTicket", http.MethodPost, "/tickets/" + validUUID + "/resolve", `{"resolutionNotes":"fixed"}`},
		{"CloseTicket", http.MethodPost, "/tickets/" + validUUID + "/close", ""},
		{"ListMyQueue", http.MethodGet, "/tickets/my-queue", ""},
		{"ListTeamQueue", http.MethodGet, "/tickets/team-queue/" + validUUID, ""},
		{"AddComment", http.MethodPost, "/tickets/" + validUUID + "/comments", `{"content":"test comment"}`},
		{"ListComments", http.MethodGet, "/tickets/" + validUUID + "/comments", ""},
		{"ListStatusHistory", http.MethodGet, "/tickets/" + validUUID + "/history", ""},
		{"GetStats", http.MethodGet, "/tickets/stats", ""},
		{"GetCSATStats", http.MethodGet, "/tickets/csat-stats", ""},
		{"CreateCSATSurvey", http.MethodPost, "/tickets/csat", `{"ticketId":"` + uuid.New().String() + `","rating":5}`},
		{"BulkUpdate", http.MethodPost, "/tickets/bulk/update", `{"ids":["` + uuid.New().String() + `"],"fields":{"status":"resolved"}}`},
		{"ExportTickets", http.MethodGet, "/tickets/export", ""},
	}

	// Build a chi router with auth middleware that sets auth context when present.
	// Since we don't add any auth, the handler should see nil auth and return 401.
	// However, the handler also has RequirePermission middleware.
	// We directly call the handler methods to test the auth guard within each handler.
	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(ep.method, ep.path, body)
			req.Header.Set("Content-Type", "application/json")

			// Set up chi URL params for routes that need them.
			rctx := chi.NewRouteContext()
			switch ep.name {
			case "GetTicket", "UpdateTicket", "TransitionStatus", "AssignTicket",
				"EscalateTicket", "DeclareMajorIncident", "LinkTickets",
				"ResolveTicket", "CloseTicket", "AddComment", "ListComments",
				"ListStatusHistory":
				rctx.URLParams.Add("id", validUUID)
			case "ListTeamQueue":
				rctx.URLParams.Add("teamId", validUUID)
			}
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			w := httptest.NewRecorder()

			// Call the handler method directly.
			switch ep.name {
			case "ListTickets":
				h.ListTickets(w, req)
			case "GetTicket":
				h.GetTicket(w, req)
			case "CreateTicket":
				h.CreateTicket(w, req)
			case "UpdateTicket":
				h.UpdateTicket(w, req)
			case "TransitionStatus":
				h.TransitionStatus(w, req)
			case "AssignTicket":
				h.AssignTicket(w, req)
			case "EscalateTicket":
				h.EscalateTicket(w, req)
			case "DeclareMajorIncident":
				h.DeclareMajorIncident(w, req)
			case "LinkTickets":
				h.LinkTickets(w, req)
			case "ResolveTicket":
				h.ResolveTicket(w, req)
			case "CloseTicket":
				h.CloseTicket(w, req)
			case "ListMyQueue":
				h.ListMyQueue(w, req)
			case "ListTeamQueue":
				h.ListTeamQueue(w, req)
			case "AddComment":
				h.AddComment(w, req)
			case "ListComments":
				h.ListComments(w, req)
			case "ListStatusHistory":
				h.ListStatusHistory(w, req)
			case "GetStats":
				h.GetStats(w, req)
			case "GetCSATStats":
				h.GetCSATStats(w, req)
			case "CreateCSATSurvey":
				h.CreateCSATSurvey(w, req)
			case "BulkUpdate":
				h.BulkUpdate(w, req)
			case "ExportTickets":
				h.ExportTickets(w, req)
			}

			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s: expected 401, got %d", ep.name, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Invalid UUID path parameter tests
// ──────────────────────────────────────────────

func TestTicketHandler_GetTicket_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodGet, "/tickets/not-a-uuid", nil)
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestTicketHandler_UpdateTicket_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPut, "/tickets/bad-uuid", strings.NewReader(`{"title":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestTicketHandler_TransitionStatus_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/transition", strings.NewReader(`{"status":"resolved"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.TransitionStatus(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_AssignTicket_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/assign", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.AssignTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_EscalateTicket_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/escalate", strings.NewReader(`{"reason":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.EscalateTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_DeclareMajorIncident_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/major-incident", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeclareMajorIncident(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_LinkTickets_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/link", strings.NewReader(`{"relatedTicketId":"`+uuid.New().String()+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.LinkTickets(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_ResolveTicket_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/resolve", strings.NewReader(`{"resolutionNotes":"fixed"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.ResolveTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_CloseTicket_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/close", nil)
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.CloseTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_ListComments_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodGet, "/tickets/xyz/comments", nil)
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.ListComments(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_AddComment_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/xyz/comments", strings.NewReader(`{"content":"hello"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.AddComment(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_ListStatusHistory_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodGet, "/tickets/xyz/history", nil)
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.ListStatusHistory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_ListTeamQueue_InvalidUUID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodGet, "/tickets/team-queue/bad", nil)
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("teamId", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.ListTeamQueue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestTicketHandler_CreateTicket_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/", strings.NewReader("{invalid json"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.CreateTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

func TestTicketHandler_CreateTicket_MissingRequiredFields(t *testing.T) {
	h := newTestTicketHandler()

	tests := []struct {
		name string
		body string
	}{
		{"missing type", `{"title":"test","description":"test","urgency":"high","impact":"high"}`},
		{"missing title", `{"type":"incident","description":"test","urgency":"high","impact":"high"}`},
		{"missing description", `{"type":"incident","title":"test","urgency":"high","impact":"high"}`},
		{"missing urgency", `{"type":"incident","title":"test","description":"test","impact":"high"}`},
		{"missing impact", `{"type":"incident","title":"test","description":"test","urgency":"high"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/tickets/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = withAuth(req)

			w := httptest.NewRecorder()
			h.CreateTicket(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %s, got %d", tt.name, w.Code)
			}
		})
	}
}

func TestTicketHandler_UpdateTicket_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/tickets/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_TransitionStatus_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/transition", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.TransitionStatus(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_TransitionStatus_EmptyStatus(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/transition", strings.NewReader(`{"status":""}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.TransitionStatus(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty status, got %d", w.Code)
	}
}

func TestTicketHandler_AssignTicket_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/assign", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.AssignTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_EscalateTicket_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/escalate", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.EscalateTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_AddComment_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/comments", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.AddComment(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_AddComment_EmptyContent(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/comments", strings.NewReader(`{"content":""}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.AddComment(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty content, got %d", w.Code)
	}
}

func TestTicketHandler_LinkTickets_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/link", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.LinkTickets(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_LinkTickets_NilRelatedTicketID(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/link", strings.NewReader(`{"relatedTicketId":"00000000-0000-0000-0000-000000000000"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.LinkTickets(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for nil UUID, got %d", w.Code)
	}
}

func TestTicketHandler_ResolveTicket_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/resolve", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.ResolveTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_ResolveTicket_EmptyResolutionNotes(t *testing.T) {
	h := newTestTicketHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/tickets/"+validUUID+"/resolve", strings.NewReader(`{"resolutionNotes":""}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.ResolveTicket(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty resolution notes, got %d", w.Code)
	}
}

func TestTicketHandler_CreateCSATSurvey_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/csat", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.CreateCSATSurvey(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_CreateCSATSurvey_NilTicketID(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/csat", strings.NewReader(`{"ticketId":"00000000-0000-0000-0000-000000000000","rating":5}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.CreateCSATSurvey(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for nil ticket ID, got %d", w.Code)
	}
}

func TestTicketHandler_CreateCSATSurvey_InvalidRating(t *testing.T) {
	h := newTestTicketHandler()

	tests := []struct {
		name   string
		rating int
	}{
		{"rating 0", 0},
		{"rating 6", 6},
		{"rating -1", -1},
		{"rating 100", 100},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bodyStr := strings.NewReader(fmt.Sprintf(`{"ticketId":"%s","rating":%d}`, uuid.New().String(), tt.rating))
			req := httptest.NewRequest(http.MethodPost, "/tickets/csat", bodyStr)
			req.Header.Set("Content-Type", "application/json")
			req = withAuth(req)

			w := httptest.NewRecorder()
			h.CreateCSATSurvey(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %s, got %d", tt.name, w.Code)
			}
		})
	}
}

func TestTicketHandler_BulkUpdate_MalformedJSON(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/bulk/update", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTicketHandler_BulkUpdate_EmptyIDs(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/bulk/update", strings.NewReader(`{"ids":[],"fields":{"status":"resolved"}}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty IDs, got %d", w.Code)
	}
}

func TestTicketHandler_BulkUpdate_EmptyFields(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/bulk/update", strings.NewReader(`{"ids":["`+uuid.New().String()+`"],"fields":{}}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty fields, got %d", w.Code)
	}
}

func TestTicketHandler_BulkUpdate_DisallowedField(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/bulk/update", strings.NewReader(`{"ids":["`+uuid.New().String()+`"],"fields":{"title":"hacked"}}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for disallowed field, got %d", w.Code)
	}
}

func TestTicketHandler_BulkUpdate_InvalidUUIDInIDs(t *testing.T) {
	h := newTestTicketHandler()
	req := httptest.NewRequest(http.MethodPost, "/tickets/bulk/update", strings.NewReader(`{"ids":["not-a-uuid"],"fields":{"status":"resolved"}}`))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req)

	w := httptest.NewRecorder()
	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID in IDs, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestTicketRoutes_Registration(t *testing.T) {
	_, r := ticketRouter()

	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListTickets", http.MethodGet, "/tickets/"},
		{"GetStats", http.MethodGet, "/tickets/stats"},
		{"ListMyQueue", http.MethodGet, "/tickets/my-queue"},
		{"ListTeamQueue", http.MethodGet, "/tickets/team-queue/" + validUUID},
		{"GetCSATStats", http.MethodGet, "/tickets/csat-stats"},
		{"GetTicket", http.MethodGet, "/tickets/" + validUUID},
		{"ListComments", http.MethodGet, "/tickets/" + validUUID + "/comments"},
		{"ListStatusHistory", http.MethodGet, "/tickets/" + validUUID + "/history"},
		{"CreateTicket", http.MethodPost, "/tickets/"},
		{"UpdateTicket", http.MethodPut, "/tickets/" + validUUID},
		{"TransitionStatus", http.MethodPost, "/tickets/" + validUUID + "/transition"},
		{"AssignTicket", http.MethodPost, "/tickets/" + validUUID + "/assign"},
		{"EscalateTicket", http.MethodPost, "/tickets/" + validUUID + "/escalate"},
		{"AddComment", http.MethodPost, "/tickets/" + validUUID + "/comments"},
		{"DeclareMajorIncident", http.MethodPost, "/tickets/" + validUUID + "/major-incident"},
		{"LinkTickets", http.MethodPost, "/tickets/" + validUUID + "/link"},
		{"ResolveTicket", http.MethodPost, "/tickets/" + validUUID + "/resolve"},
		{"CloseTicket", http.MethodPost, "/tickets/" + validUUID + "/close"},
		{"CreateCSATSurvey", http.MethodPost, "/tickets/csat"},
		{"BulkUpdate", http.MethodPost, "/tickets/bulk/update"},
		{"ExportTickets", http.MethodGet, "/tickets/export"},
	}

	for _, rt := range routes {
		t.Run(rt.name, func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			// Should NOT be 404 (route not found) or 405 (method not allowed).
			if w.Code == http.StatusNotFound {
				t.Errorf("route %s %s returned 404 — route not registered", rt.method, rt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 — method not allowed", rt.method, rt.path)
			}
		})
	}
}

