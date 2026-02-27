package system

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the System module.
// It composes sub-handlers for user, role, tenant, and org unit management.
type Handler struct {
	user   *UserHandler
	role   *RoleHandler
	tenant *TenantHandler
	org    *OrgHandler
}

// NewHandler creates a new System Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	userSvc := NewUserService(pool, auditSvc)
	roleSvc := NewRoleService(pool, auditSvc)
	tenantSvc := NewTenantService(pool, auditSvc)
	orgSvc := NewOrgService(pool, auditSvc)

	return &Handler{
		user:   NewUserHandler(userSvc),
		role:   NewRoleHandler(roleSvc),
		tenant: NewTenantHandler(tenantSvc),
		org:    NewOrgHandler(orgSvc),
	}
}

// Routes mounts all System sub-routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// User management (SR-004, SR-005, SR-007, SR-008, BR-014)
	r.Route("/users", func(r chi.Router) {
		h.user.Routes(r)
	})

	// Role management (SR-004, NFR-024)
	r.Route("/roles", func(r chi.Router) {
		h.role.Routes(r)
	})

	// Tenant management (BR-007, AP-06, DRA-001)
	r.Route("/tenants", func(r chi.Router) {
		h.tenant.Routes(r)
	})

	// Org unit management (FR-A020)
	r.Route("/org-units", func(r chi.Router) {
		h.org.Routes(r)
	})

	// Top-level permission catalog
	r.Get("/permissions", h.role.GetPermissionCatalog)
}
