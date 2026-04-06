package cmdb

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ERPHandler
// ──────────────────────────────────────────────

// ERPHandler handles HTTP requests for ERP integration endpoints.
type ERPHandler struct {
	svc *ERPService
}

// NewERPHandler creates a new ERPHandler.
func NewERPHandler(svc *ERPService) *ERPHandler {
	return &ERPHandler{svc: svc}
}

// Routes mounts ERP integration endpoints on the given router.
func (h *ERPHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/sync", h.TriggerSync)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/status", h.GetSyncStatus)
}

// TriggerSync handles POST /sync — triggers ERP sync for all assets.
func (h *ERPHandler) TriggerSync(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	result, err := h.svc.TriggerSync(r.Context())
	if err != nil {
		writeERPAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}

// GetSyncStatus handles GET /status — returns last sync status.
func (h *ERPHandler) GetSyncStatus(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	status, err := h.svc.GetSyncStatus(r.Context())
	if err != nil {
		writeERPAppError(w, r, err)
		return
	}

	types.OK(w, status, nil)
}

// GetAssetFinancials handles GET /cmdb/assets/{id}/financials — asset financial details.
func (h *ERPHandler) GetAssetFinancials(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	fin, err := h.svc.GetAssetFinancials(r.Context(), id)
	if err != nil {
		writeERPAppError(w, r, err)
		return
	}

	types.OK(w, fin, nil)
}

// SyncSingleAssetFinancials handles POST /cmdb/assets/{id}/financials/sync.
func (h *ERPHandler) SyncSingleAssetFinancials(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	fin, err := h.svc.SyncSingleAsset(r.Context(), id)
	if err != nil {
		writeERPAppError(w, r, err)
		return
	}

	types.OK(w, fin, nil)
}

// writeERPAppError maps application errors to HTTP responses.
func writeERPAppError(w http.ResponseWriter, r *http.Request, err error) {
	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		status := apperrors.HTTPStatus(err)
		code := apperrors.Code(err)
		if status >= 500 {
			slog.ErrorContext(r.Context(), "internal error", "code", code, "error", err)
		}
		types.ErrorMessage(w, status, code, appErr.Message)
		return
	}
	slog.ErrorContext(r.Context(), "unexpected error", "error", err)
	types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
}
