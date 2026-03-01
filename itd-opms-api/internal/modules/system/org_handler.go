package system

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// OrgHandler
// ──────────────────────────────────────────────

// OrgHandler handles HTTP requests for org unit management.
type OrgHandler struct {
	svc *OrgService
}

// NewOrgHandler creates a new OrgHandler.
func NewOrgHandler(svc *OrgService) *OrgHandler {
	return &OrgHandler{svc: svc}
}

// Routes mounts org unit management endpoints on the given router.
func (h *OrgHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.view")).Get("/", h.ListOrgUnits)
	r.With(middleware.RequirePermission("system.view")).Get("/tree", h.GetOrgTree)
	r.With(middleware.RequirePermission("system.view")).Get("/{id}", h.GetOrgUnit)
	r.With(middleware.RequirePermission("system.manage")).Post("/", h.CreateOrgUnit)
	r.With(middleware.RequirePermission("system.manage")).Patch("/{id}", h.UpdateOrgUnit)
	r.With(middleware.RequirePermission("system.manage")).Post("/{id}/move", h.MoveOrgUnit)
	r.With(middleware.RequirePermission("system.manage")).Delete("/{id}", h.DeleteOrgUnit)
	r.With(middleware.RequirePermission("system.view")).Get("/{id}/users", h.GetOrgUnitUsers)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListOrgUnits handles GET /system/org-units — paginated org units.
func (h *OrgHandler) ListOrgUnits(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pagination := types.ParsePagination(r)
	units, total, err := h.svc.ListOrgUnits(r.Context(), auth.TenantID, pagination.Page, pagination.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, units, types.NewMeta(total, pagination))
}

// GetOrgUnit handles GET /system/org-units/{id} — single org unit.
func (h *OrgHandler) GetOrgUnit(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	orgUnitID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid org unit ID")
		return
	}

	unit, err := h.svc.GetOrgUnit(r.Context(), auth.TenantID, orgUnitID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, unit, nil)
}

// GetOrgTree handles GET /system/org-units/tree — org hierarchy tree.
func (h *OrgHandler) GetOrgTree(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	tree, err := h.svc.GetOrgTree(r.Context(), auth.TenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tree, nil)
}

// CreateOrgUnit handles POST /system/org-units — create an org unit.
func (h *OrgHandler) CreateOrgUnit(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateOrgUnitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	unit, err := h.svc.CreateOrgUnit(r.Context(), auth.TenantID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, unit)
}

// UpdateOrgUnit handles PATCH /system/org-units/{id} — update an org unit.
func (h *OrgHandler) UpdateOrgUnit(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	orgUnitID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid org unit ID")
		return
	}

	var req UpdateOrgUnitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	unit, err := h.svc.UpdateOrgUnit(r.Context(), auth.TenantID, orgUnitID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, unit, nil)
}

// MoveOrgUnit handles POST /system/org-units/{id}/move — move in hierarchy.
func (h *OrgHandler) MoveOrgUnit(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	orgUnitID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid org unit ID")
		return
	}

	var req MoveOrgUnitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	unit, err := h.svc.MoveOrgUnit(r.Context(), auth.TenantID, orgUnitID, req.NewParentID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, unit, nil)
}

// DeleteOrgUnit handles DELETE /system/org-units/{id} — soft delete.
func (h *OrgHandler) DeleteOrgUnit(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	orgUnitID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid org unit ID")
		return
	}

	if err := h.svc.DeleteOrgUnit(r.Context(), auth.TenantID, orgUnitID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetOrgUnitUsers handles GET /system/org-units/{id}/users — users in org unit.
func (h *OrgHandler) GetOrgUnitUsers(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	orgUnitID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid org unit ID")
		return
	}

	users, err := h.svc.GetOrgUnitUsers(r.Context(), auth.TenantID, orgUnitID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, users, nil)
}
