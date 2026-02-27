package system

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// SettingsHandler
// ──────────────────────────────────────────────

// SettingsHandler handles HTTP requests for system settings management.
type SettingsHandler struct {
	svc *SettingsService
}

// NewSettingsHandler creates a new SettingsHandler.
func NewSettingsHandler(svc *SettingsService) *SettingsHandler {
	return &SettingsHandler{svc: svc}
}

// Routes mounts settings management endpoints on the given router.
func (h *SettingsHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.view")).Get("/", h.ListSettings)
	r.With(middleware.RequirePermission("system.view")).Get("/categories", h.GetCategories)
	r.With(middleware.RequirePermission("system.view")).Get("/{category}/{key}", h.GetSetting)
	r.With(middleware.RequirePermission("system.manage")).Put("/{category}/{key}", h.UpdateSetting)
	r.With(middleware.RequirePermission("system.manage")).Delete("/{category}/{key}", h.ResetSetting)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListSettings handles GET /system/settings — list settings by category.
func (h *SettingsHandler) ListSettings(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	category := r.URL.Query().Get("category")

	settings, err := h.svc.ListSettings(r.Context(), auth.TenantID, category)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, settings, nil)
}

// GetCategories handles GET /system/settings/categories — all distinct categories.
func (h *SettingsHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	categories, err := h.svc.GetAllCategories(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, categories, nil)
}

// GetSetting handles GET /system/settings/{category}/{key} — single setting.
func (h *SettingsHandler) GetSetting(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	category := chi.URLParam(r, "category")
	key := chi.URLParam(r, "key")

	setting, err := h.svc.GetSetting(r.Context(), auth.TenantID, category, key)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, setting, nil)
}

// UpdateSetting handles PUT /system/settings/{category}/{key} — upsert a setting.
func (h *SettingsHandler) UpdateSetting(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	category := chi.URLParam(r, "category")
	key := chi.URLParam(r, "key")

	var req UpdateSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	setting, err := h.svc.UpdateSetting(r.Context(), auth.TenantID, category, key, req.Value)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, setting, nil)
}

// ResetSetting handles DELETE /system/settings/{category}/{key} — reset tenant override.
func (h *SettingsHandler) ResetSetting(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	category := chi.URLParam(r, "category")
	key := chi.URLParam(r, "key")

	if err := h.svc.ResetSetting(r.Context(), auth.TenantID, category, key); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
