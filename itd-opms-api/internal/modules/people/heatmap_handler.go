package people

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
// HeatmapHandler
// ──────────────────────────────────────────────

// HeatmapHandler handles HTTP requests for the resource capacity heatmap.
type HeatmapHandler struct {
	svc *HeatmapService
}

// NewHeatmapHandler creates a new HeatmapHandler.
func NewHeatmapHandler(svc *HeatmapService) *HeatmapHandler {
	return &HeatmapHandler{svc: svc}
}

// Routes mounts heatmap and allocation endpoints on the given router (assumes /capacity prefix).
func (h *HeatmapHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("people.view")).Get("/heatmap", h.GetHeatmap)
	r.With(middleware.RequirePermission("people.view")).Get("/allocations", h.ListAllocations)
	r.With(middleware.RequirePermission("people.manage")).Post("/allocations", h.CreateAllocation)
	r.With(middleware.RequirePermission("people.manage")).Put("/allocations/{id}", h.UpdateAllocation)
	r.With(middleware.RequirePermission("people.manage")).Delete("/allocations/{id}", h.DeleteAllocation)
}

// MountRoutes registers heatmap routes on the parent router under /capacity.
// This is used instead of Routes when the /capacity route group is already
// registered by the RosterHandler (avoids duplicate route group creation).
func (h *HeatmapHandler) MountRoutes(r chi.Router) {
	r.With(middleware.RequirePermission("people.view")).Get("/capacity/heatmap", h.GetHeatmap)
	r.With(middleware.RequirePermission("people.view")).Get("/capacity/allocations", h.ListAllocations)
	r.With(middleware.RequirePermission("people.manage")).Post("/capacity/allocations", h.CreateAllocation)
	r.With(middleware.RequirePermission("people.manage")).Put("/capacity/allocations/{id}", h.UpdateAllocation)
	r.With(middleware.RequirePermission("people.manage")).Delete("/capacity/allocations/{id}", h.DeleteAllocation)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// GetHeatmap handles GET /capacity/heatmap — builds the resource heatmap grid.
// Query params: start (date), end (date), group_by (user|project), granularity (week|month).
func (h *HeatmapHandler) GetHeatmap(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr == "" || endStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "start and end query parameters are required (YYYY-MM-DD)")
		return
	}

	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid start date format, expected YYYY-MM-DD")
		return
	}

	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid end date format, expected YYYY-MM-DD")
		return
	}

	if end.Before(start) {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "end date must be after start date")
		return
	}

	groupBy := r.URL.Query().Get("group_by")
	if groupBy == "" {
		groupBy = "user"
	}

	granularity := r.URL.Query().Get("granularity")
	if granularity == "" {
		granularity = "month"
	}

	heatmap, err := h.svc.GetHeatmap(r.Context(), start, end, groupBy, granularity)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, heatmap, nil)
}

// ListAllocations handles GET /capacity/allocations — returns a paginated list of enriched allocations.
func (h *HeatmapHandler) ListAllocations(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var userID *uuid.UUID
	if v := r.URL.Query().Get("user_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user_id")
			return
		}
		userID = &parsed
	}

	var projectID *uuid.UUID
	if v := r.URL.Query().Get("project_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
			return
		}
		projectID = &parsed
	}

	var start *time.Time
	if v := r.URL.Query().Get("start"); v != "" {
		parsed, err := time.Parse("2006-01-02", v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid start date format")
			return
		}
		start = &parsed
	}

	var end *time.Time
	if v := r.URL.Query().Get("end"); v != "" {
		parsed, err := time.Parse("2006-01-02", v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid end date format")
			return
		}
		end = &parsed
	}

	params := types.ParsePagination(r)

	entries, total, err := h.svc.ListAllocations(r.Context(), userID, projectID, start, end, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entries, types.NewMeta(total, params))
}

// CreateAllocation handles POST /capacity/allocations — creates a new allocation.
func (h *HeatmapHandler) CreateAllocation(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateAllocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.UserID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "userId is required")
		return
	}
	if req.ProjectID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "projectId is required")
		return
	}
	if req.AllocationPct <= 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "allocationPct must be greater than 0")
		return
	}
	if req.PeriodStart.IsZero() || req.PeriodEnd.IsZero() {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "periodStart and periodEnd are required")
		return
	}

	entry, err := h.svc.CreateAllocation(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, entry)
}

// UpdateAllocation handles PUT /capacity/allocations/{id} — partially updates an allocation.
func (h *HeatmapHandler) UpdateAllocation(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid allocation ID")
		return
	}

	var req UpdateAllocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	entry, err := h.svc.UpdateAllocation(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entry, nil)
}

// DeleteAllocation handles DELETE /capacity/allocations/{id} — deletes an allocation.
func (h *HeatmapHandler) DeleteAllocation(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid allocation ID")
		return
	}

	if err := h.svc.DeleteAllocation(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
