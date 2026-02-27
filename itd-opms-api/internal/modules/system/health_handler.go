package system

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// SystemHealthHandler
// ──────────────────────────────────────────────

// SystemHealthHandler handles platform health, stats, and directory sync endpoints.
type SystemHealthHandler struct {
	svc *HealthService
}

// NewSystemHealthHandler creates a new SystemHealthHandler.
func NewSystemHealthHandler(svc *HealthService) *SystemHealthHandler {
	return &SystemHealthHandler{svc: svc}
}

// Routes mounts health/stats/sync endpoints on the given router.
func (h *SystemHealthHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.view")).Get("/", h.GetPlatformHealth)
	r.With(middleware.RequirePermission("system.view")).Get("/stats", h.GetSystemStats)
	r.With(middleware.RequirePermission("system.view")).Get("/directory-sync", h.GetDirectorySyncStatus)
}

// GetPlatformHealth returns detailed health status of all infrastructure services.
func (h *SystemHealthHandler) GetPlatformHealth(w http.ResponseWriter, r *http.Request) {
	health := h.svc.GetPlatformHealth(r.Context())
	types.OK(w, health, nil)
}

// GetSystemStats returns aggregated cross-module statistics.
func (h *SystemHealthHandler) GetSystemStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetSystemStats(r.Context())
	if err != nil {
		types.ErrorMessage(w, http.StatusInternalServerError, "STATS_FAILED", "Failed to retrieve system statistics")
		return
	}
	types.OK(w, stats, nil)
}

// GetDirectorySyncStatus returns directory sync status with paginated history.
func (h *SystemHealthHandler) GetDirectorySyncStatus(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	status, total, err := h.svc.GetDirectorySyncStatus(r.Context(), page, pageSize)
	if err != nil {
		types.ErrorMessage(w, http.StatusInternalServerError, "SYNC_STATUS_FAILED", "Failed to retrieve sync status")
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	types.OK(w, status, &types.Meta{
		Page:       page,
		Limit:      pageSize,
		Total:      total,
		TotalPages: totalPages,
	})
}
