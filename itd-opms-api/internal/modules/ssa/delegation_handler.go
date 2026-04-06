package ssa

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// DelegationHandler handles HTTP requests for SSA delegation management.
type DelegationHandler struct {
	svc *DelegationService
}

// NewDelegationHandler creates a new DelegationHandler.
func NewDelegationHandler(svc *DelegationService) *DelegationHandler {
	return &DelegationHandler{svc: svc}
}

// Routes mounts delegation endpoints on the given router.
func (h *DelegationHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("ssa.view")).Get("/", h.ListDelegations)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/", h.CreateDelegation)
	r.With(middleware.RequirePermission("ssa.manage")).Delete("/{id}", h.DeleteDelegation)
}

// ListDelegations handles GET /delegations
func (h *DelegationHandler) ListDelegations(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	delegations, err := h.svc.ListDelegations(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, delegations, nil)
}

// CreateDelegation handles POST /delegations
func (h *DelegationHandler) CreateDelegation(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var dto CreateDelegationDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if dto.DelegateID == uuid.Nil || dto.Stage == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Delegate ID and stage are required")
		return
	}

	delegation, err := h.svc.CreateDelegation(r.Context(), dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, delegation)
}

// DeleteDelegation handles DELETE /delegations/{id}
func (h *DelegationHandler) DeleteDelegation(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid delegation ID")
		return
	}

	if err := h.svc.DeleteDelegation(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
