package itsm

import (
	"context"
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

func newTestChangeHandler() *ChangeHandler {
	svc := NewChangeService(nil, nil, nil)
	return NewChangeHandler(svc)
}

func newTestCABMeetingHandler() *CABMeetingHandler {
	svc := NewChangeService(nil, nil, nil)
	return NewCABMeetingHandler(svc)
}

func changeRouter() chi.Router {
	svc := NewChangeService(nil, nil, nil)
	ch := NewChangeHandler(svc)
	cb := NewCABMeetingHandler(svc)
	r := chi.NewRouter()
	r.Route("/changes", func(r chi.Router) {
		ch.Routes(r)
	})
	r.Route("/cab-meetings", func(r chi.Router) {
		cb.Routes(r)
	})
	return r
}

func changeWithAuth(r *http.Request) *http.Request {
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
// Auth guard tests — Change endpoints
// ──────────────────────────────────────────────

func TestChangeHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()

	endpoints := []struct {
		name     string
		body     string
		urlParam string
		urlKey   string
		handler  func(http.ResponseWriter, *http.Request)
	}{
		{"ListChanges", "", "", "", h.ListChanges},
		{"GetChange", "", validUUID, "id", h.GetChange},
		{"GetChangeStats", "", "", "", h.GetChangeStats},
		{"GetChangeCalendar", "", "", "", h.GetChangeCalendar},
		{"CreateChange", `{"title":"Test","description":"Desc","classification":"normal","changeType":"application","urgency":"medium","impact":"medium"}`, "", "", h.CreateChange},
		{"UpdateChange", `{"title":"Updated"}`, validUUID, "id", h.UpdateChange},
		{"TransitionChange", `{"targetStatus":"submitted"}`, validUUID, "id", h.TransitionChange},
		{"SubmitCABDecision", `{"decision":"approved"}`, validUUID, "id", h.SubmitCABDecision},
		{"CompletePIR", `{"pirNotes":"All good"}`, validUUID, "id", h.CompletePIR},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(http.MethodGet, "/changes/test", body)
			req.Header.Set("Content-Type", "application/json")

			if ep.urlParam != "" {
				rctx := chi.NewRouteContext()
				rctx.URLParams.Add(ep.urlKey, ep.urlParam)
				req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			}

			w := httptest.NewRecorder()
			ep.handler(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s: expected 401, got %d", ep.name, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Auth guard tests — CAB Meeting endpoints
// ──────────────────────────────────────────────

func TestCABMeetingHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestCABMeetingHandler()
	validUUID := uuid.New().String()

	endpoints := []struct {
		name     string
		body     string
		urlParam string
		urlKey   string
		handler  func(http.ResponseWriter, *http.Request)
	}{
		{"ListCABMeetings", "", "", "", h.ListCABMeetings},
		{"GetCABMeeting", "", validUUID, "id", h.GetCABMeeting},
		{"CreateCABMeeting", `{"title":"Test Meeting","scheduledDate":"2026-04-01T10:00:00Z"}`, "", "", h.CreateCABMeeting},
		{"UpdateCABMeeting", `{"title":"Updated"}`, validUUID, "id", h.UpdateCABMeeting},
		{"CompleteCABMeeting", "", validUUID, "id", h.CompleteCABMeeting},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(http.MethodGet, "/cab-meetings/test", body)
			req.Header.Set("Content-Type", "application/json")

			if ep.urlParam != "" {
				rctx := chi.NewRouteContext()
				rctx.URLParams.Add(ep.urlKey, ep.urlParam)
				req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			}

			w := httptest.NewRecorder()
			ep.handler(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s: expected 401, got %d", ep.name, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Invalid UUID tests — Change endpoints
// ──────────────────────────────────────────────

func TestChangeHandler_GetChange_InvalidUUID(t *testing.T) {
	h := newTestChangeHandler()
	req := httptest.NewRequest(http.MethodGet, "/changes/bad", nil)
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetChange(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_UpdateChange_InvalidUUID(t *testing.T) {
	h := newTestChangeHandler()
	req := httptest.NewRequest(http.MethodPut, "/changes/bad", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateChange(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_TransitionChange_InvalidUUID(t *testing.T) {
	h := newTestChangeHandler()
	req := httptest.NewRequest(http.MethodPost, "/changes/bad/transition",
		strings.NewReader(`{"targetStatus":"submitted"}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.TransitionChange(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_SubmitCABDecision_InvalidUUID(t *testing.T) {
	h := newTestChangeHandler()
	req := httptest.NewRequest(http.MethodPost, "/changes/bad/cab-decision",
		strings.NewReader(`{"decision":"approved"}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.SubmitCABDecision(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_CompletePIR_InvalidUUID(t *testing.T) {
	h := newTestChangeHandler()
	req := httptest.NewRequest(http.MethodPost, "/changes/bad/pir",
		strings.NewReader(`{"pirNotes":"All good"}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.CompletePIR(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Invalid UUID tests — CAB Meeting endpoints
// ──────────────────────────────────────────────

func TestCABMeetingHandler_GetCABMeeting_InvalidUUID(t *testing.T) {
	h := newTestCABMeetingHandler()
	req := httptest.NewRequest(http.MethodGet, "/cab-meetings/bad", nil)
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetCABMeeting(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCABMeetingHandler_UpdateCABMeeting_InvalidUUID(t *testing.T) {
	h := newTestCABMeetingHandler()
	req := httptest.NewRequest(http.MethodPut, "/cab-meetings/bad", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateCABMeeting(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCABMeetingHandler_CompleteCABMeeting_InvalidUUID(t *testing.T) {
	h := newTestCABMeetingHandler()
	req := httptest.NewRequest(http.MethodPost, "/cab-meetings/bad/complete", nil)
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.CompleteCABMeeting(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests — Change endpoints
// ──────────────────────────────────────────────

func TestChangeHandler_CreateChange_MalformedJSON(t *testing.T) {
	h := newTestChangeHandler()
	req := httptest.NewRequest(http.MethodPost, "/changes", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateChange(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_CreateChange_MissingRequiredFields(t *testing.T) {
	h := newTestChangeHandler()

	tests := []struct {
		name string
		body string
	}{
		{"MissingTitle", `{"description":"Desc","classification":"normal","changeType":"application","urgency":"medium","impact":"medium"}`},
		{"MissingDescription", `{"title":"Test","classification":"normal","changeType":"application","urgency":"medium","impact":"medium"}`},
		{"MissingClassification", `{"title":"Test","description":"Desc","changeType":"application","urgency":"medium","impact":"medium"}`},
		{"MissingChangeType", `{"title":"Test","description":"Desc","classification":"normal","urgency":"medium","impact":"medium"}`},
		{"MissingUrgency", `{"title":"Test","description":"Desc","classification":"normal","changeType":"application","impact":"medium"}`},
		{"MissingImpact", `{"title":"Test","description":"Desc","classification":"normal","changeType":"application","urgency":"medium"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/changes", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = changeWithAuth(req)

			w := httptest.NewRecorder()
			h.CreateChange(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %s, got %d", tt.name, w.Code)
			}
		})
	}
}

func TestChangeHandler_UpdateChange_MalformedJSON(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/changes/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateChange(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_TransitionChange_MalformedJSON(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/changes/"+validUUID+"/transition",
		strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.TransitionChange(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_TransitionChange_MissingTargetStatus(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/changes/"+validUUID+"/transition",
		strings.NewReader(`{"comment":"some comment"}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.TransitionChange(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_SubmitCABDecision_MalformedJSON(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/changes/"+validUUID+"/cab-decision",
		strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.SubmitCABDecision(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_SubmitCABDecision_MissingDecision(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/changes/"+validUUID+"/cab-decision",
		strings.NewReader(`{"notes":"some notes"}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.SubmitCABDecision(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_CompletePIR_MalformedJSON(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/changes/"+validUUID+"/pir",
		strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.CompletePIR(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChangeHandler_CompletePIR_MissingPIRNotes(t *testing.T) {
	h := newTestChangeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/changes/"+validUUID+"/pir",
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.CompletePIR(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests — CAB Meeting endpoints
// ──────────────────────────────────────────────

func TestCABMeetingHandler_CreateCABMeeting_MalformedJSON(t *testing.T) {
	h := newTestCABMeetingHandler()
	req := httptest.NewRequest(http.MethodPost, "/cab-meetings", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCABMeeting(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCABMeetingHandler_CreateCABMeeting_MissingTitle(t *testing.T) {
	h := newTestCABMeetingHandler()
	req := httptest.NewRequest(http.MethodPost, "/cab-meetings",
		strings.NewReader(`{"scheduledDate":"2026-04-01T10:00:00Z"}`))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCABMeeting(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestCABMeetingHandler_UpdateCABMeeting_MalformedJSON(t *testing.T) {
	h := newTestCABMeetingHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/cab-meetings/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = changeWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateCABMeeting(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Calendar-specific validation tests
// ──────────────────────────────────────────────

func TestChangeHandler_GetChangeCalendar_MissingParams(t *testing.T) {
	h := newTestChangeHandler()

	tests := []struct {
		name  string
		query string
	}{
		{"MissingBoth", ""},
		{"MissingEnd", "?start=2026-03-01T00:00:00Z"},
		{"MissingStart", "?end=2026-03-31T23:59:59Z"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/changes/calendar"+tt.query, nil)
			req = changeWithAuth(req)

			w := httptest.NewRecorder()
			h.GetChangeCalendar(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

func TestChangeHandler_GetChangeCalendar_InvalidDateFormat(t *testing.T) {
	h := newTestChangeHandler()

	tests := []struct {
		name  string
		query string
	}{
		{"InvalidStart", "?start=bad-date&end=2026-03-31T23:59:59Z"},
		{"InvalidEnd", "?start=2026-03-01T00:00:00Z&end=bad-date"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/changes/calendar"+tt.query, nil)
			req = changeWithAuth(req)

			w := httptest.NewRecorder()
			h.GetChangeCalendar(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestChangeRoutes_Registration(t *testing.T) {
	r := changeRouter()
	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		// Change endpoints
		{"ListChanges", http.MethodGet, "/changes/"},
		{"GetChangeStats", http.MethodGet, "/changes/stats"},
		{"GetChangeCalendar", http.MethodGet, "/changes/calendar"},
		{"GetChange", http.MethodGet, "/changes/" + validUUID},
		{"CreateChange", http.MethodPost, "/changes/"},
		{"UpdateChange", http.MethodPut, "/changes/" + validUUID},
		{"TransitionChange", http.MethodPost, "/changes/" + validUUID + "/transition"},
		{"SubmitCABDecision", http.MethodPost, "/changes/" + validUUID + "/cab-decision"},
		{"CompletePIR", http.MethodPost, "/changes/" + validUUID + "/pir"},

		// CAB Meeting endpoints
		{"ListCABMeetings", http.MethodGet, "/cab-meetings/"},
		{"GetCABMeeting", http.MethodGet, "/cab-meetings/" + validUUID},
		{"CreateCABMeeting", http.MethodPost, "/cab-meetings/"},
		{"UpdateCABMeeting", http.MethodPut, "/cab-meetings/" + validUUID},
		{"CompleteCABMeeting", http.MethodPost, "/cab-meetings/" + validUUID + "/complete"},
	}

	for _, rt := range routes {
		t.Run(rt.name, func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound {
				t.Errorf("route %s %s returned 404 — not registered", rt.method, rt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 — method not allowed", rt.method, rt.path)
			}
		})
	}
}
