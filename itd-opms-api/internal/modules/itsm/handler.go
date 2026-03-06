package itsm

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the ITSM module.
// It composes all sub-handlers for service catalog, tickets,
// SLA policies, problems, and support queues.
type Handler struct {
	catalog       *CatalogHandler
	catalogSearch *CatalogSearchHandler
	ticket        *TicketHandler
	sla           *SLAHandler
	problem       *ProblemHandler
	queue         *QueueHandler
	request       *RequestHandler
}

// NewHandler creates a new ITSM Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	catalogSvc := NewCatalogService(pool, auditSvc)
	catalogSearchSvc := NewCatalogSearchService(pool)
	ticketSvc := NewTicketService(pool, auditSvc)
	slaSvc := NewSLAService(pool, auditSvc)
	problemSvc := NewProblemService(pool, auditSvc)
	queueSvc := NewQueueService(pool, auditSvc)
	requestSvc := NewRequestService(pool, auditSvc)

	return &Handler{
		catalog:       NewCatalogHandler(catalogSvc),
		catalogSearch: NewCatalogSearchHandler(catalogSearchSvc),
		ticket:        NewTicketHandler(ticketSvc),
		sla:           NewSLAHandler(slaSvc),
		problem:       NewProblemHandler(problemSvc),
		queue:         NewQueueHandler(queueSvc),
		request:       NewRequestHandler(requestSvc),
	}
}

// Routes mounts all ITSM sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Service Catalog (FR-D001 to FR-D004)
	r.Route("/catalog", func(r chi.Router) {
		h.catalog.Routes(r)
	})

	// Catalog search, favorites, popularity
	r.Route("/catalog/search", func(r chi.Router) {
		h.catalogSearch.Routes(r)
	})

	// Tickets — incidents, service requests (FR-D005 to FR-D016)
	r.Route("/tickets", func(r chi.Router) {
		h.ticket.Routes(r)
	})

	// SLA policies, business hours, escalation rules (FR-D021 to FR-D027)
	h.sla.Routes(r)

	// Problems & known errors (FR-D017 to FR-D020)
	r.Route("/problems", func(r chi.Router) {
		h.problem.Routes(r)
	})

	// Support queues (FR-D030, FR-D031)
	r.Route("/queues", func(r chi.Router) {
		h.queue.Routes(r)
	})

	// Service requests — submission, approval workflow, cancellation
	r.Route("/catalog/requests", func(r chi.Router) {
		h.request.Routes(r)
	})
}
