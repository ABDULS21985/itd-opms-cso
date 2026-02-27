package planning

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// TimelineHandler handles HTTP requests for timeline/Gantt views.
type TimelineHandler struct {
	svc *TimelineService
}

// NewTimelineHandler creates a new TimelineHandler.
func NewTimelineHandler(svc *TimelineService) *TimelineHandler {
	return &TimelineHandler{svc: svc}
}

// Routes mounts timeline endpoints on the given router.
func (h *TimelineHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("planning.view")).
		Get("/projects/{id}/timeline", h.ProjectTimeline)
	r.With(middleware.RequirePermission("planning.view")).
		Get("/portfolios/{id}/timeline", h.PortfolioTimeline)
}

// ProjectTimeline handles GET /projects/{id}/timeline
func (h *TimelineHandler) ProjectTimeline(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	timeline, err := h.svc.GetProjectTimeline(r.Context(), authCtx.TenantID, projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, timeline, nil)
}

// PortfolioTimeline handles GET /portfolios/{id}/timeline
func (h *TimelineHandler) PortfolioTimeline(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio ID")
		return
	}

	items, err := h.svc.GetPortfolioTimeline(r.Context(), authCtx.TenantID, portfolioID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}
