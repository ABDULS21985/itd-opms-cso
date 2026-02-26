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
	asset    *AssetHandler
	cmdb     *CMDBCIHandler
	license  *LicenseHandler
	warranty *WarrantyHandler
}

// NewHandler creates a new CMDB Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	assetSvc := NewAssetService(pool, auditSvc)
	cmdbSvc := NewCMDBService(pool, auditSvc)
	licenseSvc := NewLicenseService(pool, auditSvc)
	warrantySvc := NewWarrantyService(pool, auditSvc)

	return &Handler{
		asset:    NewAssetHandler(assetSvc),
		cmdb:     NewCMDBCIHandler(cmdbSvc),
		license:  NewLicenseHandler(licenseSvc),
		warranty: NewWarrantyHandler(warrantySvc),
	}
}

// Routes mounts all CMDB sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Asset lifecycle management (FR-E001 to FR-E005)
	r.Route("/assets", func(r chi.Router) {
		h.asset.Routes(r)
	})

	// CMDB configuration items & relationships (FR-E006 to FR-E008)
	h.cmdb.Routes(r)

	// Software licenses & assignments (FR-E009 to FR-E010)
	r.Route("/licenses", func(r chi.Router) {
		h.license.Routes(r)
	})

	// Warranties (FR-E011)
	r.Route("/warranties", func(r chi.Router) {
		h.warranty.WarrantyRoutes(r)
	})

	// Renewal alerts (FR-E012)
	r.Route("/renewal-alerts", func(r chi.Router) {
		h.warranty.AlertRoutes(r)
	})
}
