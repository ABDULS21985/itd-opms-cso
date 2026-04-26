package system

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// Handler is the top-level HTTP handler for the System module.
// It composes sub-handlers for user, role, tenant, org unit, health,
// settings, audit explorer, session, and email template management.
type Handler struct {
	user     *UserHandler
	role     *RoleHandler
	tenant   *TenantHandler
	org      *OrgHandler
	health   *SystemHealthHandler
	settings *SettingsHandler
	auditExp *AuditExplorerHandler
	session  *SessionHandler
	template *EmailTemplateHandler
	webhook  *WebhookHandler
	receiver *WebhookReceiverHandler
	reference *ReferenceHandler

	// Maintenance exposes the background worker for lifecycle management.
	Maintenance *MaintenanceWorker

	// External dependencies for ESM compliance endpoints.
	licenseEnforcer *auth.LicenseEnforcer
	siemExporter    *audit.SIEMExporter
}

// NewHandler creates a new System Handler with all sub-handlers wired up.
func NewHandler(
	pool *pgxpool.Pool,
	auditSvc *audit.AuditService,
	redisClient *redis.Client,
	natsConn *nats.Conn,
	minioClient *minio.Client,
	minioCfg config.MinIOConfig,
	licenseEnforcer *auth.LicenseEnforcer,
	siemExporter *audit.SIEMExporter,
	js nats.JetStreamContext,
) *Handler {
	userSvc := NewUserService(pool, auditSvc, minioClient, minioCfg)
	roleSvc := NewRoleService(pool, auditSvc)
	tenantSvc := NewTenantService(pool, auditSvc)
	orgSvc := NewOrgService(pool, auditSvc)
	healthSvc := NewHealthService(pool, redisClient, natsConn, minioClient)
	settingsSvc := NewSettingsService(pool, auditSvc)
	auditExpSvc := NewAuditExplorerService(pool, auditSvc)
	sessionSvc := NewSessionService(pool, auditSvc)
	templateSvc := NewEmailTemplateService(pool, auditSvc)
	webhookSvc := NewWebhookService(pool, auditSvc)
	webhookReceiver := NewWebhookReceiverHandler(pool, auditSvc, webhookSvc, js)
	referenceSvc := NewReferenceService(pool, auditSvc)

	return &Handler{
		user:        NewUserHandler(userSvc),
		role:        NewRoleHandler(roleSvc),
		tenant:      NewTenantHandler(tenantSvc),
		org:         NewOrgHandler(orgSvc),
		health:      NewSystemHealthHandler(healthSvc),
		settings:    NewSettingsHandler(settingsSvc),
		auditExp:    NewAuditExplorerHandler(auditExpSvc),
		session:     NewSessionHandler(sessionSvc),
		template:    NewEmailTemplateHandler(templateSvc),
		webhook:     NewWebhookHandler(webhookSvc, webhookReceiver),
		receiver:    webhookReceiver,
		reference:   NewReferenceHandler(referenceSvc),
		Maintenance:     NewMaintenanceWorker(pool),
		licenseEnforcer: licenseEnforcer,
		siemExporter:    siemExporter,
	}
}

// WebhookReceiver exposes the public webhook receiver for server.go routing.
func (h *Handler) WebhookReceiver() *WebhookReceiverHandler { return h.receiver }

// Routes mounts all System sub-routes on the given router, split into
// read-only (system.view) and admin (system.manage) permission groups.
func (h *Handler) Routes(r chi.Router) {
	// Cross-module endpoints — accessible to any authenticated user.
	// User search (autocomplete) is used by pickers across all modules.
	r.Get("/users/search", h.user.SearchUsers)

	// Read-only endpoints — requires system.view (SR-004)
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequirePermission("system.view"))

		// Platform health, stats, directory sync (NFR-009, NFR-022-026)
		r.Route("/health", func(r chi.Router) { h.health.Routes(r) })

		// Audit log explorer (SR-016–SR-020)
		r.Route("/audit-logs", func(r chi.Router) { h.auditExp.Routes(r) })

		// Permission catalog
		r.Get("/permissions", h.role.GetPermissionCatalog)

		// ESM: License utilization & SIEM export status
		r.Get("/license-utilization", h.getLicenseUtilization)
		r.Get("/siem-status", h.getSIEMStatus)
	})

	// Admin endpoints — requires system.manage (SR-004)
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequirePermission("system.manage"))

		// User management (SR-005, SR-007, SR-008, BR-014)
		r.Route("/users", func(r chi.Router) { h.user.Routes(r) })

		// Role management (NFR-024)
		r.Route("/roles", func(r chi.Router) { h.role.Routes(r) })

		// Tenant management (BR-007, AP-06, DRA-001)
		r.Route("/tenants", func(r chi.Router) { h.tenant.Routes(r) })

		// Org unit management (FR-A020)
		r.Route("/org-units", func(r chi.Router) { h.org.Routes(r) })

		// Session management (SR-002, SR-003)
		r.Route("/sessions", func(r chi.Router) { h.session.Routes(r) })

		// System settings (NFR-024)
		r.Route("/settings", func(r chi.Router) { h.settings.Routes(r) })

		// Unified reference data management (priorities, CI types, locations, resolver groups)
		r.Route("/reference-data", func(r chi.Router) { h.reference.Routes(r) })

		// Email templates
		r.Route("/email-templates", func(r chi.Router) { h.template.Routes(r) })

		// Webhook endpoint management
		r.Route("/webhooks", func(r chi.Router) { h.webhook.Routes(r) })
	})
}

// getLicenseUtilization returns the current license usage for the health dashboard.
func (h *Handler) getLicenseUtilization(w http.ResponseWriter, r *http.Request) {
	if h.licenseEnforcer == nil {
		types.OK(w, map[string]any{
			"current": 0, "max": 0, "ratio": 0.0, "lastSyncedAt": nil,
		}, nil)
		return
	}
	util, err := h.licenseEnforcer.Utilization(r.Context())
	if err != nil {
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}
	types.OK(w, util, nil)
}

// getSIEMStatus returns the current SIEM exporter state.
func (h *Handler) getSIEMStatus(w http.ResponseWriter, r *http.Request) {
	if h.siemExporter == nil {
		types.OK(w, audit.SIEMStatus{}, nil)
		return
	}
	types.OK(w, h.siemExporter.Status(), nil)
}
