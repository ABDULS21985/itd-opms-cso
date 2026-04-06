package people

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// RosterHandler
// ──────────────────────────────────────────────

// RosterHandler handles HTTP requests for rosters, leave records, and capacity allocations.
type RosterHandler struct {
	svc *RosterService
}

// NewRosterHandler creates a new RosterHandler.
func NewRosterHandler(svc *RosterService) *RosterHandler {
	return &RosterHandler{svc: svc}
}

// Routes mounts roster, leave, and capacity endpoints on the given router.
func (h *RosterHandler) Routes(r chi.Router) {
	// Rosters
	r.Route("/rosters", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/", h.ListRosters)
		r.With(middleware.RequirePermission("people.view")).Get("/{id}", h.GetRoster)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateRoster)
		r.With(middleware.RequirePermission("people.manage")).Put("/{id}", h.UpdateRoster)
	})

	// Leave Records
	r.Route("/leave", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/", h.ListLeaveRecords)
		r.With(middleware.RequirePermission("people.view")).Get("/{id}", h.GetLeaveRecord)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateLeaveRecord)
		r.With(middleware.RequirePermission("people.manage")).Put("/{id}/status", h.UpdateLeaveRecordStatus)
		r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteLeaveRecord)
	})

	// Capacity Allocations
	r.Route("/capacity", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/", h.ListCapacityAllocations)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateCapacityAllocation)
		r.With(middleware.RequirePermission("people.manage")).Put("/{id}", h.UpdateCapacityAllocation)
		r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteCapacityAllocation)
	})
}

// ──────────────────────────────────────────────
// Roster Handlers
// ──────────────────────────────────────────────

// ListRosters handles GET /rosters — returns a paginated list of rosters.
func (h *RosterHandler) ListRosters(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var teamID *uuid.UUID
	if v := r.URL.Query().Get("team_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid team_id")
			return
		}
		teamID = &parsed
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	params := types.ParsePagination(r)

	rosters, total, err := h.svc.ListRosters(r.Context(), teamID, status, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rosters, types.NewMeta(int64(total), params))
}

// GetRoster handles GET /rosters/{id} — retrieves a single roster.
func (h *RosterHandler) GetRoster(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid roster ID")
		return
	}

	roster, err := h.svc.GetRoster(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, roster, nil)
}

// CreateRoster handles POST /rosters — creates a new roster.
func (h *RosterHandler) CreateRoster(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRosterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	roster, err := h.svc.CreateRoster(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, roster)
}

// UpdateRoster handles PUT /rosters/{id} — updates a roster.
func (h *RosterHandler) UpdateRoster(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid roster ID")
		return
	}

	var req UpdateRosterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	roster, err := h.svc.UpdateRoster(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, roster, nil)
}

// ──────────────────────────────────────────────
// Leave Record Handlers
// ──────────────────────────────────────────────

// ListLeaveRecords handles GET /leave — returns a paginated list of leave records.
func (h *RosterHandler) ListLeaveRecords(w http.ResponseWriter, r *http.Request) {
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

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	var leaveType *string
	if v := r.URL.Query().Get("leave_type"); v != "" {
		leaveType = &v
	}

	params := types.ParsePagination(r)

	records, total, err := h.svc.ListLeaveRecords(r.Context(), userID, status, leaveType, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, records, types.NewMeta(int64(total), params))
}

// GetLeaveRecord handles GET /leave/{id} — retrieves a single leave record.
func (h *RosterHandler) GetLeaveRecord(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid leave record ID")
		return
	}

	record, err := h.svc.GetLeaveRecord(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, record, nil)
}

// CreateLeaveRecord handles POST /leave — creates a new leave record.
func (h *RosterHandler) CreateLeaveRecord(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateLeaveRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.LeaveType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Leave type is required")
		return
	}

	record, err := h.svc.CreateLeaveRecord(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, record)
}

// UpdateLeaveRecordStatus handles PUT /leave/{id}/status — updates leave record status.
func (h *RosterHandler) UpdateLeaveRecordStatus(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid leave record ID")
		return
	}

	var req UpdateLeaveRecordStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	if err := h.svc.UpdateLeaveRecordStatus(r.Context(), id, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// DeleteLeaveRecord handles DELETE /leave/{id} — deletes a leave record.
func (h *RosterHandler) DeleteLeaveRecord(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid leave record ID")
		return
	}

	if err := h.svc.DeleteLeaveRecord(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Capacity Allocation Handlers
// ──────────────────────────────────────────────

// ListCapacityAllocations handles GET /capacity — returns a paginated list of allocations.
func (h *RosterHandler) ListCapacityAllocations(w http.ResponseWriter, r *http.Request) {
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

	params := types.ParsePagination(r)

	allocations, total, err := h.svc.ListCapacityAllocations(r.Context(), userID, projectID, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, allocations, types.NewMeta(int64(total), params))
}

// CreateCapacityAllocation handles POST /capacity — creates a new capacity allocation.
func (h *RosterHandler) CreateCapacityAllocation(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCapacityAllocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	allocation, err := h.svc.CreateCapacityAllocation(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, allocation)
}

// UpdateCapacityAllocation handles PUT /capacity/{id} — updates a capacity allocation.
func (h *RosterHandler) UpdateCapacityAllocation(w http.ResponseWriter, r *http.Request) {
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

	var req UpdateCapacityAllocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	allocation, err := h.svc.UpdateCapacityAllocation(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, allocation, nil)
}

// DeleteCapacityAllocation handles DELETE /capacity/{id} — deletes a capacity allocation.
func (h *RosterHandler) DeleteCapacityAllocation(w http.ResponseWriter, r *http.Request) {
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

	if err := h.svc.DeleteCapacityAllocation(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
