package itsm

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// RequestHandler
// ──────────────────────────────────────────────

// RequestHandler handles HTTP requests for the service request lifecycle.
type RequestHandler struct {
	svc *RequestService
}

// NewRequestHandler creates a new RequestHandler.
func NewRequestHandler(svc *RequestService) *RequestHandler {
	return &RequestHandler{svc: svc}
}

// Routes mounts service request endpoints on the given router.
func (h *RequestHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Post("/", h.SubmitRequest)
	r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListMyRequests)
	r.With(middleware.RequirePermission("itsm.view")).Get("/pending-approvals", h.ListPendingApprovals)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetRequestDetail)
	r.With(middleware.RequirePermission("itsm.view")).Post("/{id}/approve", h.ApproveRequest)
	r.With(middleware.RequirePermission("itsm.view")).Post("/{id}/reject", h.RejectRequest)
	r.With(middleware.RequirePermission("itsm.view")).Post("/{id}/cancel", h.CancelRequest)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// SubmitRequest handles POST / — submits a new service request.
func (h *RequestHandler) SubmitRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req SubmitServiceRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.CatalogItemID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "catalogItemId is required")
		return
	}

	sr, err := h.svc.SubmitRequest(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, sr)
}

// ListMyRequests handles GET / — lists service requests submitted by the current user.
func (h *RequestHandler) ListMyRequests(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var statusParam *string
	if s := r.URL.Query().Get("status"); s != "" {
		statusParam = &s
	}

	params := types.ParsePagination(r)

	requests, total, err := h.svc.ListMyRequests(r.Context(), statusParam, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// ListPendingApprovals handles GET /pending-approvals — lists requests awaiting the current user's approval.
func (h *RequestHandler) ListPendingApprovals(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	requests, total, err := h.svc.ListPendingApprovals(r.Context(), params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// GetRequestDetail handles GET /{id} — retrieves a full service request with approvals and timeline.
func (h *RequestHandler) GetRequestDetail(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	detail, err := h.svc.GetRequestDetail(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, detail, nil)
}

// ApproveRequest handles POST /{id}/approve — approves a pending approval task.
func (h *RequestHandler) ApproveRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	var req ApproveRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	sr, err := h.svc.ApproveRequest(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, sr, nil)
}

// RejectRequest handles POST /{id}/reject — rejects a pending approval task.
func (h *RequestHandler) RejectRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	var req RejectRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Reason == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Reason is required")
		return
	}

	sr, err := h.svc.RejectRequest(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, sr, nil)
}

// CancelRequest handles POST /{id}/cancel — cancels a service request (requester only).
func (h *RequestHandler) CancelRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	sr, err := h.svc.CancelRequest(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, sr, nil)
}
