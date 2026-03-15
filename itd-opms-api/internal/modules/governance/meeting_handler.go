package governance

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// MeetingHandler handles HTTP requests for meeting management.
type MeetingHandler struct {
	svc *MeetingService
}

// NewMeetingHandler creates a new MeetingHandler.
func NewMeetingHandler(svc *MeetingService) *MeetingHandler {
	return &MeetingHandler{svc: svc}
}

// Routes mounts meeting endpoints on the given router.
func (h *MeetingHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("governance.view")).Get("/", h.ListMeetings)
	r.With(middleware.RequirePermission("governance.manage")).Post("/", h.CreateMeeting)

	r.Route("/{id}", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.view")).Get("/", h.GetMeeting)
		r.With(middleware.RequirePermission("governance.manage")).Put("/", h.UpdateMeeting)
		r.With(middleware.RequirePermission("governance.manage")).Post("/complete", h.CompleteMeeting)
		r.With(middleware.RequirePermission("governance.manage")).Post("/cancel", h.CancelMeeting)
		// Decisions
		r.With(middleware.RequirePermission("governance.view")).Get("/decisions", h.ListDecisions)
		r.With(middleware.RequirePermission("governance.manage")).Post("/decisions", h.CreateDecision)
	})

	// Action items (top-level since they can come from multiple sources)
	r.Route("/actions", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.view")).Get("/", h.ListActions)
		r.With(middleware.RequirePermission("governance.manage")).Post("/", h.CreateAction)
		r.With(middleware.RequirePermission("governance.view")).Get("/overdue", h.ListOverdue)
		r.With(middleware.RequirePermission("governance.view")).Get("/overdue/stats", h.OverdueStats)
		r.With(middleware.RequirePermission("governance.view")).Get("/overdue/mine", h.MyOverdueActions)
		r.Route("/{actionId}", func(r chi.Router) {
			r.With(middleware.RequirePermission("governance.view")).Get("/", h.GetAction)
			r.With(middleware.RequirePermission("governance.manage")).Put("/", h.UpdateAction)
			r.With(middleware.RequirePermission("governance.manage")).Post("/complete", h.CompleteAction)
		})
	})
}

// ListMeetings handles GET / -- returns a paginated list of meetings.
func (h *MeetingHandler) ListMeetings(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	status := r.URL.Query().Get("status")
	params := types.ParsePagination(r)

	meetings, total, err := h.svc.ListMeetings(r.Context(), authCtx.TenantID, status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, meetings, types.NewMeta(total, params))
}

// CreateMeeting handles POST / -- creates a new meeting.
func (h *MeetingHandler) CreateMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateMeetingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	if req.ScheduledAt.IsZero() {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "ScheduledAt is required")
		return
	}

	meeting, err := h.svc.CreateMeeting(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, meeting)
}

// GetMeeting handles GET /{id} -- retrieves a single meeting.
func (h *MeetingHandler) GetMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	meetingID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid meeting ID")
		return
	}

	meeting, err := h.svc.GetMeeting(r.Context(), authCtx.TenantID, meetingID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, meeting, nil)
}

// UpdateMeeting handles PUT /{id} -- updates an existing meeting.
func (h *MeetingHandler) UpdateMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	meetingID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid meeting ID")
		return
	}

	var req UpdateMeetingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	meeting, err := h.svc.UpdateMeeting(r.Context(), authCtx.TenantID, meetingID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, meeting, nil)
}

// CompleteMeeting handles POST /{id}/complete -- marks a meeting as completed.
func (h *MeetingHandler) CompleteMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	meetingID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid meeting ID")
		return
	}

	if err := h.svc.UpdateMeetingStatus(r.Context(), authCtx.TenantID, meetingID, MeetingStatusCompleted); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// CancelMeeting handles POST /{id}/cancel -- marks a meeting as cancelled.
func (h *MeetingHandler) CancelMeeting(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	meetingID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid meeting ID")
		return
	}

	if err := h.svc.UpdateMeetingStatus(r.Context(), authCtx.TenantID, meetingID, MeetingStatusCancelled); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ListDecisions handles GET /{id}/decisions -- returns decisions for a meeting.
func (h *MeetingHandler) ListDecisions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	meetingID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid meeting ID")
		return
	}

	decisions, err := h.svc.ListDecisions(r.Context(), meetingID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, decisions, nil)
}

// CreateDecision handles POST /{id}/decisions -- creates a new meeting decision.
func (h *MeetingHandler) CreateDecision(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	meetingID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid meeting ID")
		return
	}

	var req CreateDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.Description == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title and description are required")
		return
	}

	decision, err := h.svc.CreateDecision(r.Context(), authCtx.TenantID, meetingID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, decision)
}

// ListActions handles GET /actions -- returns a paginated list of action items.
func (h *MeetingHandler) ListActions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	status := r.URL.Query().Get("status")
	ownerID := r.URL.Query().Get("ownerId")
	params := types.ParsePagination(r)

	items, total, err := h.svc.ListActionItems(r.Context(), authCtx.TenantID, status, ownerID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, types.NewMeta(total, params))
}

// CreateAction handles POST /actions -- creates a new action item.
func (h *MeetingHandler) CreateAction(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateActionItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.OwnerID == uuid.Nil {
		req.OwnerID = authCtx.UserID
	}

	if req.Title == "" || req.SourceType == "" || req.SourceID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title, sourceType, and sourceId are required")
		return
	}

	if req.DueDate.IsZero() {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "DueDate is required")
		return
	}

	item, err := h.svc.CreateActionItem(r.Context(), authCtx.TenantID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, item)
}

// ListOverdue handles GET /actions/overdue -- returns overdue action items.
func (h *MeetingHandler) ListOverdue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	items, err := h.svc.ListOverdueActions(r.Context(), authCtx.TenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}

// GetAction handles GET /actions/{actionId} -- retrieves a single action item.
func (h *MeetingHandler) GetAction(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	actionID, err := uuid.Parse(chi.URLParam(r, "actionId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid action ID")
		return
	}

	item, err := h.svc.GetActionItem(r.Context(), authCtx.TenantID, actionID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// UpdateAction handles PUT /actions/{actionId} -- updates an action item.
func (h *MeetingHandler) UpdateAction(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	actionID, err := uuid.Parse(chi.URLParam(r, "actionId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid action ID")
		return
	}

	var req UpdateActionItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	item, err := h.svc.UpdateActionItem(r.Context(), authCtx.TenantID, actionID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// CompleteAction handles POST /actions/{actionId}/complete -- marks an action item as completed.
func (h *MeetingHandler) CompleteAction(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	actionID, err := uuid.Parse(chi.URLParam(r, "actionId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid action ID")
		return
	}

	var body struct {
		Evidence string `json:"evidence"`
	}
	// Body is optional — ignore EOF (empty body means no evidence provided).
	_ = json.NewDecoder(r.Body).Decode(&body)

	if err := h.svc.CompleteActionItem(r.Context(), authCtx.TenantID, actionID, body.Evidence); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// OverdueStats handles GET /actions/overdue/stats -- returns aggregated overdue action statistics.
func (h *MeetingHandler) OverdueStats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetOverdueActionStats(r.Context(), authCtx.TenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// MyOverdueActions handles GET /actions/overdue/mine -- returns overdue actions for the authenticated user.
func (h *MeetingHandler) MyOverdueActions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	items, err := h.svc.GetOverdueActionsByOwner(r.Context(), authCtx.TenantID, authCtx.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}
