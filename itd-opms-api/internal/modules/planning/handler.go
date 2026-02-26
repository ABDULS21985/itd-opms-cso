package planning

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the planning module.
// It composes all sub-handlers for portfolios, projects, work-items,
// milestones, and risks/issues/change-requests.
type Handler struct {
	portfolio *PortfolioHandler
	project   *ProjectHandler
	workItem  *WorkItemHandler
	milestone *MilestoneHandler
	risk      *RiskHandler
}

// NewHandler creates a new planning Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	portfolioSvc := NewPortfolioService(pool, auditSvc)
	projectSvc := NewProjectService(pool, auditSvc)
	workItemSvc := NewWorkItemService(pool, auditSvc)
	riskSvc := NewRiskService(pool, auditSvc)

	return &Handler{
		portfolio: NewPortfolioHandler(portfolioSvc),
		project:   NewProjectHandler(projectSvc),
		workItem:  NewWorkItemHandler(workItemSvc),
		milestone: NewMilestoneHandler(workItemSvc),
		risk:      NewRiskHandler(riskSvc),
	}
}

// Routes mounts all planning sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Portfolio management (FR-C001 to FR-C004)
	r.Route("/portfolios", func(r chi.Router) {
		h.portfolio.Routes(r)
	})

	// Project management
	r.Route("/projects", func(r chi.Router) {
		h.project.Routes(r)
	})

	// Work items & task management (FR-C005 to FR-C010)
	r.Route("/work-items", func(r chi.Router) {
		h.workItem.Routes(r)
	})

	// Milestones
	r.Route("/milestones", func(r chi.Router) {
		h.milestone.Routes(r)
	})

	// Risks, Issues & Change Requests (FR-C011 to FR-C016)
	h.risk.Routes(r)
}
