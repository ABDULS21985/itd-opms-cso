package system

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type ERPDirectoryHandler struct {
	svc *ERPDirectoryService
}

func NewERPDirectoryHandler(svc *ERPDirectoryService) *ERPDirectoryHandler {
	return &ERPDirectoryHandler{svc: svc}
}

func (h *ERPDirectoryHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.manage")).Post("/preview", h.Preview)
	r.With(middleware.RequirePermission("system.manage")).Post("/apply", h.Apply)
	r.With(middleware.RequirePermission("system.view")).Get("/runs", h.ListRuns)
}

func (h *ERPDirectoryHandler) Preview(w http.ResponseWriter, r *http.Request) {
	if types.GetAuthContext(r.Context()) == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req ERPDirectoryImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	preview, err := h.svc.Preview(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, preview, nil)
}

func (h *ERPDirectoryHandler) Apply(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req ERPDirectoryImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	result, err := h.svc.Apply(r.Context(), auth.TenantID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *ERPDirectoryHandler) ListRuns(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	limit := 25
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	runs, err := h.svc.ListRuns(r.Context(), auth.TenantID, limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, runs, nil)
}
