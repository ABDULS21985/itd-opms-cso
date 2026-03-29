package ssa

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// BulkHandler handles HTTP requests for SSA bulk operations.
type BulkHandler struct {
	svc *BulkService
}

// NewBulkHandler creates a new BulkHandler.
func NewBulkHandler(svc *BulkService) *BulkHandler {
	return &BulkHandler{svc: svc}
}

// Routes mounts bulk operation routes.
func (h *BulkHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("ssa.manage")).Post("/approve/{stage}", h.BulkApprove)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/status", h.BulkUpdateStatus)
	r.With(middleware.RequirePermission("ssa.view")).Post("/export", h.BulkExport)
}

// BulkApprove handles POST /bulk/approve/{stage}
func (h *BulkHandler) BulkApprove(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stage := chi.URLParam(r, "stage")
	if stage == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Stage is required")
		return
	}

	var dto BulkApproveDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if len(dto.RequestIDs) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "At least one request ID is required")
		return
	}

	summary, err := h.svc.BulkApprove(r.Context(), stage, dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, summary, nil)
}

// BulkUpdateStatus handles POST /bulk/status
func (h *BulkHandler) BulkUpdateStatus(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var dto BulkStatusUpdateDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if len(dto.RequestIDs) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "At least one request ID is required")
		return
	}

	if dto.FromStatus == "" || dto.ToStatus == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "fromStatus and toStatus are required")
		return
	}

	summary, err := h.svc.BulkUpdateStatus(r.Context(), dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, summary, nil)
}

// BulkExport handles POST /bulk/export
func (h *BulkHandler) BulkExport(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var filter BulkExportFilter
	if err := json.NewDecoder(r.Body).Decode(&filter); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	exported, err := h.svc.BulkExport(r.Context(), filter)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, exported, nil)
}
