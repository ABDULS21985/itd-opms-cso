package cmdb

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/platform/msgraph"
)

// Handler is the top-level HTTP handler for the CMDB module.
// It composes all sub-handlers for assets, CMDB configuration items,
// licenses, warranties, renewal alerts, verification campaigns, and ERP integration.
type Handler struct {
	asset        *AssetHandler
	assetProcess *AssetProcessHandler
	cmdb         *CMDBCIHandler
	license      *LicenseHandler
	warranty     *WarrantyHandler
	discovery    *DiscoveryHandler
	verification *VerificationHandler
	verifSvc     *VerificationService
	erp          *ERPHandler
	mega         *MEGAHandler
}

// NewHandler creates a new CMDB Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService, extras ...any) *Handler {
	var graphClient *msgraph.Client
	var discoveryCfg config.DiscoveryConfig
	var js nats.JetStreamContext
	if len(extras) > 0 {
		if client, ok := extras[0].(*msgraph.Client); ok {
			graphClient = client
		}
	}
	if len(extras) > 1 {
		if cfg, ok := extras[1].(config.DiscoveryConfig); ok {
			discoveryCfg = cfg
		}
	}
	if len(extras) > 2 {
		if stream, ok := extras[2].(nats.JetStreamContext); ok {
			js = stream
		}
	}

	assetSvc := NewAssetService(pool, auditSvc)
	assetProcessSvc := NewAssetProcessService(pool, auditSvc, js)
	cmdbSvc := NewCMDBService(pool, auditSvc)
	licenseSvc := NewLicenseService(pool, auditSvc)
	warrantySvc := NewWarrantyService(pool, auditSvc)
	discoverySvc := NewDiscoveryService(pool, auditSvc, graphClient, discoveryCfg)
	verifSvc := NewVerificationService(pool, auditSvc)
	erpSvc := NewERPService(pool, auditSvc)
	megaSvc := NewMEGAService(pool, auditSvc)

	return &Handler{
		asset:        NewAssetHandler(assetSvc),
		assetProcess: NewAssetProcessHandler(assetProcessSvc),
		cmdb:         NewCMDBCIHandler(cmdbSvc),
		license:      NewLicenseHandler(licenseSvc),
		warranty:     NewWarrantyHandler(warrantySvc),
		discovery:    NewDiscoveryHandler(discoverySvc),
		verification: NewVerificationHandler(verifSvc),
		verifSvc:     verifSvc,
		erp:          NewERPHandler(erpSvc),
		mega:         NewMEGAHandler(megaSvc),
	}
}

// Routes mounts all CMDB sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Asset lifecycle management (FR-E001 to FR-E005)
	r.Route("/assets", func(r chi.Router) {
		h.asset.Routes(r)
	})

	// BRD §6.8 IT assets management process workflow.
	r.Route("/asset-process", func(r chi.Router) {
		h.assetProcess.Routes(r)
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

	// Discovery (automated CI discovery)
	r.Route("/discovery", func(r chi.Router) {
		h.discovery.Routes(r)
	})

	// Physical verification campaigns
	r.Route("/verification", func(r chi.Router) {
		h.verification.Routes(r)
	})

	// Verification status stats on assets path
	r.With(middleware.RequirePermission("cmdb.view")).Get("/assets/verification-status", VerificationStatsHandler(h.verifSvc))

	// ERP integration
	r.Route("/integrations/erp", func(r chi.Router) {
		h.erp.Routes(r)
	})

	// MEGA Enterprise Architecture XML integration
	r.Route("/integrations/mega", func(r chi.Router) {
		h.mega.Routes(r)
	})

	// Asset-level financial endpoints (mounted under /assets/{id}/...)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/assets/{id}/financials", h.erp.GetAssetFinancials)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/assets/{id}/financials/sync", h.erp.SyncSingleAssetFinancials)
}
