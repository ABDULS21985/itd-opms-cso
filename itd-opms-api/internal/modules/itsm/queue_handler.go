package itsm

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// QueueHandler
// ──────────────────────────────────────────────

// QueueHandler handles HTTP requests for support queue management.
type QueueHandler struct {
	svc *QueueService
}

// NewQueueHandler creates a new QueueHandler.
func NewQueueHandler(svc *QueueService) *QueueHandler {
	return &QueueHandler{svc: svc}
}

// Routes mounts queue endpoints on the given router.
func (h *QueueHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListQueues)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetQueue)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateQueue)
	r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateQueue)
	r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteQueue)
}

// ──────────────────────────────────────────────
// Queue Handlers
// ──────────────────────────────────────────────

// ListQueues handles GET / — returns support queues optionally filtered by active status.
func (h *QueueHandler) ListQueues(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var isActive *bool
	if v := r.URL.Query().Get("is_active"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid is_active parameter")
			return
		}
		isActive = &parsed
	}

	queues, err := h.svc.ListQueues(r.Context(), isActive)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, queues, nil)
}

// GetQueue handles GET /{id} — retrieves a single support queue.
func (h *QueueHandler) GetQueue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid queue ID")
		return
	}

	queue, err := h.svc.GetQueue(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, queue, nil)
}

// CreateQueue handles POST / — creates a new support queue.
func (h *QueueHandler) CreateQueue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateSupportQueueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	queue, err := h.svc.CreateQueue(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, queue)
}

// UpdateQueue handles PUT /{id} — updates an existing support queue.
func (h *QueueHandler) UpdateQueue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid queue ID")
		return
	}

	var req UpdateSupportQueueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	queue, err := h.svc.UpdateQueue(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, queue, nil)
}

// DeleteQueue handles DELETE /{id} — deletes a support queue.
func (h *QueueHandler) DeleteQueue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid queue ID")
		return
	}

	if err := h.svc.DeleteQueue(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
