package grc

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the GRC module.
// It composes all sub-handlers for risk management, audit management,
// access reviews, and compliance controls.
type Handler struct {
	risk         *RiskHandler
	auditMgmt    *AuditMgmtHandler
	accessReview *AccessReviewHandler
	compliance   *ComplianceHandler
}

// NewHandler creates a new GRC Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	return &Handler{
		risk:         NewRiskHandler(NewRiskService(pool, auditSvc)),
		auditMgmt:    NewAuditMgmtHandler(NewAuditMgmtService(pool, auditSvc)),
		accessReview: NewAccessReviewHandler(NewAccessReviewService(pool, auditSvc)),
		compliance:   NewComplianceHandler(NewComplianceService(pool, auditSvc)),
	}
}

// Routes mounts all GRC sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Risk Management (FR-G001 to FR-G004)
	r.Route("/risks", func(r chi.Router) {
		h.risk.Routes(r)
	})

	// Audit Management (FR-G005 to FR-G008)
	r.Route("/audits", func(r chi.Router) {
		h.auditMgmt.Routes(r)
	})

	// Access Reviews (FR-G009 to FR-G010)
	r.Route("/access-reviews", func(r chi.Router) {
		h.accessReview.Routes(r)
	})

	// Compliance Controls (FR-G011 to FR-G014)
	r.Route("/compliance", func(r chi.Router) {
		h.compliance.Routes(r)
	})
}
