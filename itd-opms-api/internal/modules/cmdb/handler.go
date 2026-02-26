package cmdb

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the CMDB module.
// It composes all sub-handlers for assets, CMDB configuration items,
// licenses, warranties, and renewal alerts.
type Handler struct {
	asset   *AssetHandler
	cmdbCI  *CMDBCIHandler
	license *LicenseHandler
}

// NewHandler creates a new CMDB Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	assetSvc := NewAssetService(pool, auditSvc)
	cmdbSvc := NewCMDBService(pool, auditSvc)
	licenseSvc := NewLicenseService(pool, auditSvc)

	return &Handler{
		asset:   NewAssetHandler(assetSvc),
		cmdbCI:  NewCMDBCIHandler(cmdbSvc),
		license: NewLicenseHandler(licenseSvc),
	}
}

// Routes mounts all CMDB sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Asset lifecycle management (FR-E001 to FR-E005)
	r.Route("/assets", func(r chi.Router) {
		h.asset.Routes(r)
	})

	// CMDB & Relationships (FR-E006 to FR-E008)
	h.cmdbCI.Routes(r)

	// Licenses, Warranties & Renewals (FR-E009 to FR-E012)
	h.license.Routes(r)
}
