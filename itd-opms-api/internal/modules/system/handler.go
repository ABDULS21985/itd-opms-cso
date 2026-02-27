package system

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
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

	// Maintenance exposes the background worker for lifecycle management.
	Maintenance *MaintenanceWorker
}

// NewHandler creates a new System Handler with all sub-handlers wired up.
func NewHandler(
	pool *pgxpool.Pool,
	auditSvc *audit.AuditService,
	redisClient *redis.Client,
	natsConn *nats.Conn,
	minioClient *minio.Client,
) *Handler {
	userSvc := NewUserService(pool, auditSvc)
	roleSvc := NewRoleService(pool, auditSvc)
	tenantSvc := NewTenantService(pool, auditSvc)
	orgSvc := NewOrgService(pool, auditSvc)
	healthSvc := NewHealthService(pool, redisClient, natsConn, minioClient)
	settingsSvc := NewSettingsService(pool, auditSvc)
	auditExpSvc := NewAuditExplorerService(pool, auditSvc)
	sessionSvc := NewSessionService(pool, auditSvc)
	templateSvc := NewEmailTemplateService(pool, auditSvc)

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
		Maintenance: NewMaintenanceWorker(pool),
	}
}

// Routes mounts all System sub-routes on the given router, split into
// read-only (system.view) and admin (system.manage) permission groups.
func (h *Handler) Routes(r chi.Router) {
	// Read-only endpoints — requires system.view (SR-004)
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequirePermission("system.view"))

		// Platform health, stats, directory sync (NFR-009, NFR-022-026)
		r.Route("/health", func(r chi.Router) { h.health.Routes(r) })

		// Audit log explorer (SR-016–SR-020)
		r.Route("/audit-logs", func(r chi.Router) { h.auditExp.Routes(r) })

		// Permission catalog
		r.Get("/permissions", h.role.GetPermissionCatalog)
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

		// Email templates
		r.Route("/email-templates", func(r chi.Router) { h.template.Routes(r) })
	})
}
