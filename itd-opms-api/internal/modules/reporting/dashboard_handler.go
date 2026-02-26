package reporting

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// DashboardHandler
// ──────────────────────────────────────────────

// DashboardHandler handles HTTP requests for dashboard data and charts.
type DashboardHandler struct {
	svc *DashboardService
}

// NewDashboardHandler creates a new DashboardHandler.
func NewDashboardHandler(svc *DashboardService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

// Routes mounts dashboard endpoints on the given router.
func (h *DashboardHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("reporting.view")).Get("/executive", h.GetExecutiveSummary)
	r.With(middleware.RequirePermission("reporting.manage")).Post("/executive/refresh", h.RefreshExecutiveSummary)
	r.With(middleware.RequirePermission("reporting.view")).Get("/my", h.GetMyDashboard)
	r.With(middleware.RequirePermission("reporting.view")).Get("/charts/tickets-by-priority", h.GetTicketsByPriority)
	r.With(middleware.RequirePermission("reporting.view")).Get("/charts/tickets-by-status", h.GetTicketsByStatus)
	r.With(middleware.RequirePermission("reporting.view")).Get("/charts/projects-by-status", h.GetProjectsByStatus)
	r.With(middleware.RequirePermission("reporting.view")).Get("/charts/assets-by-type", h.GetAssetsByType)
	r.With(middleware.RequirePermission("reporting.view")).Get("/charts/assets-by-status", h.GetAssetsByStatus)
	r.With(middleware.RequirePermission("reporting.view")).Get("/charts/sla-compliance", h.GetSLAComplianceRate)
}

// ──────────────────────────────────────────────
// Shared error helper (only defined here)
// ──────────────────────────────────────────────

// writeAppError maps an application error to the appropriate HTTP response.
func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	status := apperrors.HTTPStatus(err)
	code := apperrors.Code(err)
	if status >= 500 {
		slog.ErrorContext(r.Context(), "internal error",
			"error", err.Error(),
			"path", r.URL.Path,
			"correlation_id", types.GetCorrelationID(r.Context()),
		)
	}
	types.ErrorMessage(w, status, code, err.Error())
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// GetExecutiveSummary handles GET /executive — returns the executive summary.
func (h *DashboardHandler) GetExecutiveSummary(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	summary, err := h.svc.GetExecutiveSummary(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, summary, nil)
}

// RefreshExecutiveSummary handles POST /executive/refresh — refreshes the materialized view.
func (h *DashboardHandler) RefreshExecutiveSummary(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	if err := h.svc.RefreshExecutiveSummary(r.Context()); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetMyDashboard handles GET /my — returns role-specific dashboard data for the current user.
func (h *DashboardHandler) GetMyDashboard(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	data, err := h.svc.GetMyDashboard(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, data, nil)
}

// GetTicketsByPriority handles GET /charts/tickets-by-priority.
func (h *DashboardHandler) GetTicketsByPriority(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	points, err := h.svc.GetTicketsByPriority(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, points, nil)
}

// GetTicketsByStatus handles GET /charts/tickets-by-status.
func (h *DashboardHandler) GetTicketsByStatus(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	points, err := h.svc.GetTicketsByStatus(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, points, nil)
}

// GetProjectsByStatus handles GET /charts/projects-by-status.
func (h *DashboardHandler) GetProjectsByStatus(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	points, err := h.svc.GetProjectsByStatus(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, points, nil)
}

// GetAssetsByType handles GET /charts/assets-by-type.
func (h *DashboardHandler) GetAssetsByType(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	points, err := h.svc.GetAssetsByType(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, points, nil)
}

// GetAssetsByStatus handles GET /charts/assets-by-status.
func (h *DashboardHandler) GetAssetsByStatus(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	points, err := h.svc.GetAssetsByStatus(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, points, nil)
}

// GetSLAComplianceRate handles GET /charts/sla-compliance.
func (h *DashboardHandler) GetSLAComplianceRate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Default to last 30 days if no "since" query parameter.
	since := time.Now().UTC().AddDate(0, 0, -30)
	if v := r.URL.Query().Get("since"); v != "" {
		parsed, err := time.Parse(time.RFC3339, v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid since parameter; use RFC3339 format")
			return
		}
		since = parsed
	}

	rate, err := h.svc.GetSLAComplianceRate(r.Context(), since)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, SLAComplianceRate{Rate: rate}, nil)
}
