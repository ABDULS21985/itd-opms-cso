package system

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// UserHandler
// ──────────────────────────────────────────────

// UserHandler handles HTTP requests for user management.
type UserHandler struct {
	svc *UserService
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(svc *UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

// Routes mounts user management endpoints on the given router.
func (h *UserHandler) Routes(r chi.Router) {
	// Read endpoints.
	r.With(middleware.RequirePermission("system.view")).Get("/", h.ListUsers)
	r.With(middleware.RequirePermission("system.view")).Get("/search", h.SearchUsers)
	r.With(middleware.RequirePermission("system.view")).Get("/stats", h.GetUserStats)
	r.With(middleware.RequirePermission("system.view")).Get("/{id}", h.GetUser)

	// Write endpoints.
	r.With(middleware.RequirePermission("system.manage")).Patch("/{id}", h.UpdateUser)
	r.With(middleware.RequirePermission("system.manage")).Post("/{id}/deactivate", h.DeactivateUser)
	r.With(middleware.RequirePermission("system.manage")).Post("/{id}/reactivate", h.ReactivateUser)

	// Role assignment.
	r.With(middleware.RequirePermission("system.manage")).Post("/{id}/roles", h.AssignRole)
	r.With(middleware.RequirePermission("system.manage")).Delete("/{id}/roles/{bindingId}", h.RevokeRole)

	// Delegations.
	r.With(middleware.RequirePermission("system.view")).Get("/{id}/delegations", h.GetDelegations)
	r.With(middleware.RequirePermission("system.manage")).Post("/{id}/delegations", h.CreateDelegation)
	r.With(middleware.RequirePermission("system.manage")).Delete("/{id}/delegations/{delegationId}", h.RevokeDelegation)
}

// ──────────────────────────────────────────────
// Shared error helper
// ──────────────────────────────────────────────

func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	status := apperrors.HTTPStatus(err)
	code := apperrors.Code(err)
	if status >= 500 {
		slog.ErrorContext(r.Context(), "internal error",
			"error", err.Error(),
			"path", r.URL.Path,
			"correlation_id", types.GetCorrelationID(r.Context()),
		)
	}
	types.ErrorMessage(w, status, code, err.Error())
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListUsers handles GET /system/users — paginated user list.
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pagination := types.ParsePagination(r)
	params := ListUsersParams{
		Page:       pagination.Page,
		PageSize:   pagination.Limit,
		Search:     r.URL.Query().Get("search"),
		RoleFilter: r.URL.Query().Get("role"),
		Status:     r.URL.Query().Get("status"),
		Department: r.URL.Query().Get("department"),
		SortBy:     pagination.Sort,
		SortOrder:  pagination.Order,
	}

	// Map "sort" values to service-friendly names.
	switch params.SortBy {
	case "display_name", "name":
		params.SortBy = "name"
	case "last_login_at":
		params.SortBy = "lastLoginAt"
	case "created_at":
		params.SortBy = "createdAt"
	}

	users, total, err := h.svc.ListUsers(r.Context(), auth.TenantID, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, users, types.NewMeta(total, pagination))
}

// GetUser handles GET /system/users/{id} — single user detail.
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	user, err := h.svc.GetUser(r.Context(), auth.TenantID, userID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, user, nil)
}

// UpdateUser handles PATCH /system/users/{id} — update user fields.
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.svc.UpdateUser(r.Context(), auth.TenantID, userID, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	// Return updated user.
	user, err := h.svc.GetUser(r.Context(), auth.TenantID, userID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, user, nil)
}

// DeactivateUser handles POST /system/users/{id}/deactivate.
func (h *UserHandler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	if err := h.svc.DeactivateUser(r.Context(), auth.TenantID, userID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ReactivateUser handles POST /system/users/{id}/reactivate.
func (h *UserHandler) ReactivateUser(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	if err := h.svc.ReactivateUser(r.Context(), auth.TenantID, userID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// AssignRole handles POST /system/users/{id}/roles.
func (h *UserHandler) AssignRole(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	var req AssignRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	binding, err := h.svc.AssignRole(r.Context(), auth.TenantID, userID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, binding)
}

// RevokeRole handles DELETE /system/users/{id}/roles/{bindingId}.
func (h *UserHandler) RevokeRole(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	bindingID, err := uuid.Parse(chi.URLParam(r, "bindingId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid binding ID")
		return
	}

	if err := h.svc.RevokeRole(r.Context(), auth.TenantID, userID, bindingID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetDelegations handles GET /system/users/{id}/delegations.
func (h *UserHandler) GetDelegations(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	delegations, err := h.svc.GetUserDelegations(r.Context(), auth.TenantID, userID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, delegations, nil)
}

// CreateDelegation handles POST /system/users/{id}/delegations.
func (h *UserHandler) CreateDelegation(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	var req CreateDelegationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	delegation, err := h.svc.CreateDelegation(r.Context(), auth.TenantID, userID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, delegation)
}

// RevokeDelegation handles DELETE /system/users/{id}/delegations/{delegationId}.
func (h *UserHandler) RevokeDelegation(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	delegationID, err := uuid.Parse(chi.URLParam(r, "delegationId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid delegation ID")
		return
	}

	if err := h.svc.RevokeDelegation(r.Context(), auth.TenantID, delegationID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// SearchUsers handles GET /system/users/search — autocomplete.
func (h *UserHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		types.OK(w, []UserSearchResult{}, nil)
		return
	}

	results, err := h.svc.SearchUsers(r.Context(), auth.TenantID, query)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, results, nil)
}

// GetUserStats handles GET /system/users/stats — active user count.
func (h *UserHandler) GetUserStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	count, err := h.svc.CountActiveUsers(r.Context(), auth.TenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]int64{"activeUsers": count}, nil)
}
