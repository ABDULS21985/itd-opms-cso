package governance

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level governance module handler that wires up all
// sub-domain handlers (policies, RACI, meetings, OKRs/KPIs).
type Handler struct {
	policy  *PolicyHandler
	raci    *RACIHandler
	meeting *MeetingHandler
	okr     *OKRHandler
}

// NewHandler creates a new governance Handler with all sub-domain services.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	return &Handler{
		policy:  NewPolicyHandler(NewPolicyService(pool, auditSvc)),
		raci:    NewRACIHandler(NewRACIService(pool, auditSvc)),
		meeting: NewMeetingHandler(NewMeetingService(pool, auditSvc)),
		okr:     NewOKRHandler(NewOKRService(pool, auditSvc)),
	}
}

// Routes mounts all governance sub-routes on the provided chi router.
// Called from server.go as: r.Route("/governance", func(r chi.Router) { governanceHandler.Routes(r) })
func (h *Handler) Routes(r chi.Router) {
	// Policy management (FR-A001 to FR-A007)
	r.Route("/policies", func(r chi.Router) {
		h.policy.Routes(r)
	})

	// RACI matrix management (FR-A008 to FR-A010)
	r.Route("/raci", func(r chi.Router) {
		h.raci.Routes(r)
	})

	// Meetings, decisions & action tracking (FR-A011 to FR-A015)
	r.Route("/meetings", func(r chi.Router) {
		h.meeting.Routes(r)
	})

	// OKRs, key results & KPIs (FR-A016 to FR-A022)
	// The OKR handler registers /okrs, /key-results, and /kpis sub-routes
	h.okr.Routes(r)
}
