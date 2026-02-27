package reporting

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the Reporting & Analytics module.
// It composes all sub-handlers for dashboards, reports, and search.
type Handler struct {
	dashboardSvc *DashboardService
	reportSvc    *ReportService
	searchSvc    *SearchService

	dashboard *DashboardHandler
	report    *ReportHandler
	search    *SearchHandler
}

// NewHandler creates a new Reporting Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, redisClient *redis.Client, auditSvc *audit.AuditService) *Handler {
	dashboardSvc := NewDashboardService(pool, redisClient, auditSvc)
	reportSvc := NewReportService(pool, auditSvc)
	searchSvc := NewSearchService(pool, auditSvc)

	return &Handler{
		dashboardSvc: dashboardSvc,
		reportSvc:    reportSvc,
		searchSvc:    searchSvc,
		dashboard:    NewDashboardHandler(dashboardSvc),
		report:       NewReportHandler(reportSvc),
		search:       NewSearchHandler(searchSvc),
	}
}

// Routes mounts all Reporting sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Dashboard & charts
	r.Route("/dashboards", func(r chi.Router) { h.dashboard.Routes(r) })

	// Report definitions & runs
	r.Route("/reports", func(r chi.Router) { h.report.Routes(r) })

	// Global search
	r.Route("/search", func(r chi.Router) { h.search.Routes(r) })
}

// DashboardRoutes mounts only dashboard endpoints.
func (h *Handler) DashboardRoutes(r chi.Router) {
	h.dashboard.Routes(r)
}

// SearchRoutes mounts only search endpoints.
func (h *Handler) SearchRoutes(r chi.Router) {
	h.search.Routes(r)
}

// DashboardRefresher returns a background refresher for executive dashboard data.
func (h *Handler) DashboardRefresher(interval time.Duration) *DashboardRefresher {
	return NewDashboardRefresher(h.dashboardSvc, interval)
}

// ReportScheduler returns a background scheduler stub for scheduled report runs.
func (h *Handler) ReportScheduler(interval time.Duration) *ReportScheduler {
	return NewReportScheduler(h.reportSvc, interval)
}
