package ssa

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the SSA module.
type Handler struct {
	request    *RequestHandler
	workflow   *WorkflowHandler
	delegation *DelegationHandler
	bulk       *BulkHandler
}

// NewHandler creates a new SSA Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	requestSvc := NewRequestService(pool, auditSvc)
	workflowSvc := NewWorkflowService(pool, auditSvc)
	delegationSvc := NewDelegationService(pool, auditSvc)
	bulkSvc := NewBulkService(pool, auditSvc, workflowSvc)

	return &Handler{
		request:    NewRequestHandler(requestSvc),
		workflow:   NewWorkflowHandler(workflowSvc, requestSvc),
		delegation: NewDelegationHandler(delegationSvc),
		bulk:       NewBulkHandler(bulkSvc),
	}
}

// Routes mounts all SSA routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Request CRUD
	r.Route("/requests", func(r chi.Router) {
		h.request.Routes(r)
		h.workflow.RequestRoutes(r)
	})

	// Work queues
	r.Route("/queue", func(r chi.Router) {
		h.workflow.QueueRoutes(r)
	})

	// Delegations
	r.Route("/delegations", func(r chi.Router) {
		h.delegation.Routes(r)
	})

	// Bulk operations
	r.Route("/bulk", func(r chi.Router) {
		h.bulk.Routes(r)
	})
}
