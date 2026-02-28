package planning

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

// Handler is the top-level HTTP handler for the planning module.
// It composes all sub-handlers for portfolios, projects, work-items,
// milestones, risks/issues/change-requests, timeline views, and PIRs.
type Handler struct {
	portfolio    *PortfolioHandler
	project      *ProjectHandler
	workItem     *WorkItemHandler
	milestone    *MilestoneHandler
	risk         *RiskHandler
	timeline     *TimelineHandler
	pir          *PIRHandler
	budget       *BudgetHandler
	costCategory *CostCategoryHandler
}

// NewHandler creates a new planning Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService, minioClient *minio.Client, minioCfg config.MinIOConfig) *Handler {
	portfolioSvc := NewPortfolioService(pool, auditSvc)
	projectSvc := NewProjectService(pool, auditSvc)
	workItemSvc := NewWorkItemService(pool, auditSvc)
	riskSvc := NewRiskService(pool, auditSvc)
	timelineSvc := NewTimelineService(pool)
	pirSvc := NewPIRService(pool, auditSvc)
	documentSvc := NewDocumentService(pool, minioClient, minioCfg, auditSvc)
	budgetSvc := NewBudgetService(pool, auditSvc)

	projectHandler := NewProjectHandler(projectSvc)
	projectHandler.doc = NewDocumentHandler(documentSvc)
	projectHandler.budget = NewBudgetHandler(budgetSvc)

	return &Handler{
		portfolio:    NewPortfolioHandler(portfolioSvc),
		project:      projectHandler,
		workItem:     NewWorkItemHandler(workItemSvc),
		milestone:    NewMilestoneHandler(workItemSvc),
		risk:         NewRiskHandler(riskSvc),
		timeline:     NewTimelineHandler(timelineSvc),
		pir:          NewPIRHandler(pirSvc),
		budget:       NewBudgetHandler(budgetSvc),
		costCategory: NewCostCategoryHandler(budgetSvc),
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

	// Timeline / Gantt views (FR-C009)
	h.timeline.Routes(r)

	// Post-Implementation Reviews (FR-C016)
	r.Route("/pir", func(r chi.Router) {
		h.pir.Routes(r)
	})

	// Budget — cost categories & portfolio summary
	r.Route("/budget", func(r chi.Router) {
		h.costCategory.Routes(r)
	})
}
