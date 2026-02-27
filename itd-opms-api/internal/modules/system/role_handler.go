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
// RoleHandler
// ──────────────────────────────────────────────

// RoleHandler handles HTTP requests for role management.
type RoleHandler struct {
	svc *RoleService
}

// NewRoleHandler creates a new RoleHandler.
func NewRoleHandler(svc *RoleService) *RoleHandler {
	return &RoleHandler{svc: svc}
}

// Routes mounts role management endpoints on the given router.
func (h *RoleHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.view")).Get("/", h.ListRoles)
	r.With(middleware.RequirePermission("system.view")).Get("/stats", h.GetRoleStats)
	r.With(middleware.RequirePermission("system.view")).Get("/{id}", h.GetRole)
	r.With(middleware.RequirePermission("system.manage")).Post("/", h.CreateRole)
	r.With(middleware.RequirePermission("system.manage")).Patch("/{id}", h.UpdateRole)
	r.With(middleware.RequirePermission("system.manage")).Delete("/{id}", h.DeleteRole)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListRoles handles GET /system/roles — all roles with user counts.
func (h *RoleHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	roles, err := h.svc.ListRoles(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, roles, nil)
}

// GetRole handles GET /system/roles/{id} — single role detail.
func (h *RoleHandler) GetRole(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	roleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid role ID")
		return
	}

	role, err := h.svc.GetRole(r.Context(), roleID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, role, nil)
}

// CreateRole handles POST /system/roles — create a custom role.
func (h *RoleHandler) CreateRole(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	role, err := h.svc.CreateRole(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, role)
}

// UpdateRole handles PATCH /system/roles/{id} — update a custom role.
func (h *RoleHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	roleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid role ID")
		return
	}

	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	role, err := h.svc.UpdateRole(r.Context(), roleID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, role, nil)
}

// DeleteRole handles DELETE /system/roles/{id} — delete a custom role.
func (h *RoleHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	roleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid role ID")
		return
	}

	if err := h.svc.DeleteRole(r.Context(), roleID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetPermissionCatalog handles GET /system/permissions — all permissions grouped by module.
func (h *RoleHandler) GetPermissionCatalog(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	catalog, err := h.svc.GetPermissionCatalog(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, catalog, nil)
}

// GetRoleStats handles GET /system/roles/stats — user counts per role.
func (h *RoleHandler) GetRoleStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.CountUsersByRole(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}
