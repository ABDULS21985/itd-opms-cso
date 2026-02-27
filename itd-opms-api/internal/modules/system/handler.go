package system

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

// Handler is the top-level HTTP handler for the System module.
// It composes sub-handlers for user management and role management.
type Handler struct {
	user *UserHandler
	role *RoleHandler
}

// NewHandler creates a new System Handler with all sub-handlers wired up.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	userSvc := NewUserService(pool, auditSvc)
	roleSvc := NewRoleService(pool, auditSvc)

	return &Handler{
		user: NewUserHandler(userSvc),
		role: NewRoleHandler(roleSvc),
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

	// Top-level permission catalog
	r.Get("/permissions", h.role.GetPermissionCatalog)
}
