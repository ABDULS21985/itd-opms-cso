package itsm

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ChangeHandler
// ──────────────────────────────────────────────

// ChangeHandler handles HTTP requests for change management.
type ChangeHandler struct {
	svc *ChangeService
}

// NewChangeHandler creates a new ChangeHandler.
func NewChangeHandler(svc *ChangeService) *ChangeHandler {
	return &ChangeHandler{svc: svc}
}

// Routes mounts change management endpoints on the given router.
func (h *ChangeHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListChanges)
	r.With(middleware.RequirePermission("itsm.view")).Get("/stats", h.GetChangeStats)
	r.With(middleware.RequirePermission("itsm.view")).Get("/calendar", h.GetChangeCalendar)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetChange)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateChange)
	r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateChange)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/transition", h.TransitionChange)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/cab-decision", h.SubmitCABDecision)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/pir", h.CompletePIR)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/risk-assessment", h.SubmitRiskAssessment)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/implement", h.ImplementChange)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/complete", h.CompleteChange)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/rollback", h.RollbackChange)
}

// ──────────────────────────────────────────────
// Change Handlers
// ──────────────────────────────────────────────

// ListChanges handles GET / — returns a paginated list of changes.
func (h *ChangeHandler) ListChanges(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var classification, status *string
	if c := r.URL.Query().Get("classification"); c != "" {
		classification = &c
	}
	if s := r.URL.Query().Get("status"); s != "" {
		status = &s
	}

	params := types.ParsePagination(r)

	changes, total, err := h.svc.ListChanges(r.Context(), classification, status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, changes, types.NewMeta(total, params))
}

// GetChange handles GET /{id} — retrieves a single change.
func (h *ChangeHandler) GetChange(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	change, err := h.svc.GetChange(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// CreateChange handles POST / — creates a new change.
func (h *ChangeHandler) CreateChange(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.Description == "" || req.Classification == "" || req.ChangeType == "" || req.Urgency == "" || req.Impact == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Missing required fields")
		return
	}

	change, err := h.svc.CreateChange(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, change)
}

// UpdateChange handles PUT /{id} — updates a change.
func (h *ChangeHandler) UpdateChange(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req UpdateChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	change, err := h.svc.UpdateChange(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// TransitionChange handles POST /{id}/transition — transitions a change status.
func (h *ChangeHandler) TransitionChange(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req TransitionChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.TargetStatus == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "targetStatus is required")
		return
	}

	change, err := h.svc.TransitionChange(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// SubmitCABDecision handles POST /{id}/cab-decision — records a CAB decision.
func (h *ChangeHandler) SubmitCABDecision(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req SubmitCABDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Decision == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "decision is required")
		return
	}

	change, err := h.svc.SubmitCABDecision(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// CompletePIR handles POST /{id}/pir — completes a post-implementation review.
func (h *ChangeHandler) CompletePIR(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req CompletePIRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.PIRNotes == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "pirNotes is required")
		return
	}

	change, err := h.svc.CompletePIR(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// SubmitRiskAssessment handles POST /{id}/risk-assessment.
func (h *ChangeHandler) SubmitRiskAssessment(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req SubmitRiskAssessmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.RiskAssessment == nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "riskAssessment is required")
		return
	}

	change, err := h.svc.SubmitRiskAssessment(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// ImplementChange handles POST /{id}/implement.
func (h *ChangeHandler) ImplementChange(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req ImplementChangeRequest
	json.NewDecoder(r.Body).Decode(&req) // body is optional

	change, err := h.svc.ImplementChange(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// CompleteChange handles POST /{id}/complete.
func (h *ChangeHandler) CompleteChange(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req CompleteChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	change, err := h.svc.CompleteChange(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// RollbackChange handles POST /{id}/rollback.
func (h *ChangeHandler) RollbackChange(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change ID")
		return
	}

	var req RollbackChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Reason == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "reason is required")
		return
	}

	change, err := h.svc.RollbackChange(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, change, nil)
}

// GetChangeStats handles GET /stats — returns aggregate change statistics.
func (h *ChangeHandler) GetChangeStats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetChangeStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// GetChangeCalendar handles GET /calendar — returns calendar events for a date range.
func (h *ChangeHandler) GetChangeCalendar(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr == "" || endStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "start and end query parameters are required")
		return
	}

	rangeStart, err := time.Parse(time.RFC3339, startStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid start date format (use RFC3339)")
		return
	}

	rangeEnd, err := time.Parse(time.RFC3339, endStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid end date format (use RFC3339)")
		return
	}

	events, err := h.svc.GetChangeCalendar(r.Context(), rangeStart, rangeEnd)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, events, nil)
}

// ──────────────────────────────────────────────
// CABMeetingHandler
// ──────────────────────────────────────────────

// CABMeetingHandler handles HTTP requests for CAB meetings.
type CABMeetingHandler struct {
	svc *ChangeService
}

// NewCABMeetingHandler creates a new CABMeetingHandler.
func NewCABMeetingHandler(svc *ChangeService) *CABMeetingHandler {
	return &CABMeetingHandler{svc: svc}
}

// Routes mounts CAB meeting endpoints on the given router.
func (h *CABMeetingHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListCABMeetings)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetCABMeeting)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateCABMeeting)
	r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateCABMeeting)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/complete", h.CompleteCABMeeting)
}

// ListCABMeetings handles GET / — returns a paginated list of CAB meetings.
func (h *CABMeetingHandler) ListCABMeetings(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var status *string
	if s := r.URL.Query().Get("status"); s != "" {
		status = &s
	}

	params := types.ParsePagination(r)

	meetings, total, err := h.svc.ListCABMeetings(r.Context(), status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, meetings, types.NewMeta(total, params))
}

// GetCABMeeting handles GET /{id} — retrieves a single CAB meeting.
func (h *CABMeetingHandler) GetCABMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid CAB meeting ID")
		return
	}

	meeting, err := h.svc.GetCABMeeting(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, meeting, nil)
}

// CreateCABMeeting handles POST / — creates a new CAB meeting.
func (h *CABMeetingHandler) CreateCABMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCABMeetingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "title is required")
		return
	}

	meeting, err := h.svc.CreateCABMeeting(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, meeting)
}

// UpdateCABMeeting handles PUT /{id} — updates a CAB meeting.
func (h *CABMeetingHandler) UpdateCABMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid CAB meeting ID")
		return
	}

	var req UpdateCABMeetingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	meeting, err := h.svc.UpdateCABMeeting(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, meeting, nil)
}

// CompleteCABMeeting handles POST /{id}/complete — marks a CAB meeting as completed.
func (h *CABMeetingHandler) CompleteCABMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid CAB meeting ID")
		return
	}

	meeting, err := h.svc.CompleteCABMeeting(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, meeting, nil)
}
