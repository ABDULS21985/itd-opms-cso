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
// TenantHandler
// ──────────────────────────────────────────────

// TenantHandler handles HTTP requests for tenant management.
type TenantHandler struct {
	svc *TenantService
}

// NewTenantHandler creates a new TenantHandler.
func NewTenantHandler(svc *TenantService) *TenantHandler {
	return &TenantHandler{svc: svc}
}

// Routes mounts tenant management endpoints on the given router.
func (h *TenantHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.view")).Get("/", h.ListTenants)
	r.With(middleware.RequirePermission("system.view")).Get("/tree", h.GetTenantHierarchy)
	r.With(middleware.RequirePermission("system.view")).Get("/{id}", h.GetTenant)
	r.With(middleware.RequirePermission("system.manage")).Post("/", h.CreateTenant)
	r.With(middleware.RequirePermission("system.manage")).Patch("/{id}", h.UpdateTenant)
	r.With(middleware.RequirePermission("system.manage")).Post("/{id}/deactivate", h.DeactivateTenant)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListTenants handles GET /system/tenants — all tenants.
func (h *TenantHandler) ListTenants(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	tenants, err := h.svc.ListTenants(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tenants, nil)
}

// GetTenant handles GET /system/tenants/{id} — single tenant detail.
func (h *TenantHandler) GetTenant(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	tenantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid tenant ID")
		return
	}

	tenant, err := h.svc.GetTenant(r.Context(), tenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tenant, nil)
}

// CreateTenant handles POST /system/tenants — create a tenant.
func (h *TenantHandler) CreateTenant(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	tenant, err := h.svc.CreateTenant(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, tenant)
}

// UpdateTenant handles PATCH /system/tenants/{id} — update a tenant.
func (h *TenantHandler) UpdateTenant(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	tenantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid tenant ID")
		return
	}

	var req UpdateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	tenant, err := h.svc.UpdateTenant(r.Context(), tenantID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tenant, nil)
}

// DeactivateTenant handles POST /system/tenants/{id}/deactivate.
func (h *TenantHandler) DeactivateTenant(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	tenantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid tenant ID")
		return
	}

	if err := h.svc.DeactivateTenant(r.Context(), tenantID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetTenantHierarchy handles GET /system/tenants/tree — tenant tree.
func (h *TenantHandler) GetTenantHierarchy(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	tree, err := h.svc.GetTenantHierarchy(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tree, nil)
}
