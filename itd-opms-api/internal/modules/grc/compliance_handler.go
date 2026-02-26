package grc

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ComplianceHandler
// ──────────────────────────────────────────────

// ComplianceHandler handles HTTP requests for compliance controls and framework tracking.
type ComplianceHandler struct {
	svc *ComplianceService
}

// NewComplianceHandler creates a new ComplianceHandler.
func NewComplianceHandler(svc *ComplianceService) *ComplianceHandler {
	return &ComplianceHandler{svc: svc}
}

// Routes mounts compliance endpoints on the given router.
func (h *ComplianceHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("grc.view")).Get("/", h.ListControls)
	r.With(middleware.RequirePermission("grc.view")).Get("/stats", h.GetComplianceStats)
	r.With(middleware.RequirePermission("grc.view")).Get("/{id}", h.GetControl)
	r.With(middleware.RequirePermission("grc.manage")).Post("/", h.CreateControl)
	r.With(middleware.RequirePermission("grc.manage")).Put("/{id}", h.UpdateControl)
	r.With(middleware.RequirePermission("grc.manage")).Delete("/{id}", h.DeleteControl)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListControls handles GET / — returns a paginated list of compliance controls.
func (h *ComplianceHandler) ListControls(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var framework *string
	if v := r.URL.Query().Get("framework"); v != "" {
		framework = &v
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	params := types.ParsePagination(r)

	controls, total, err := h.svc.ListControls(r.Context(), framework, status, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, controls, types.NewMeta(int64(total), params))
}

// GetComplianceStats handles GET /stats — returns compliance statistics grouped by framework.
func (h *ComplianceHandler) GetComplianceStats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetComplianceStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// GetControl handles GET /{id} — retrieves a single compliance control.
func (h *ComplianceHandler) GetControl(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid control ID")
		return
	}

	control, err := h.svc.GetControl(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, control, nil)
}

// CreateControl handles POST / — creates a new compliance control.
func (h *ComplianceHandler) CreateControl(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateComplianceControlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Framework == "" || req.ControlID == "" || req.ControlName == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Framework, control ID, and control name are required")
		return
	}

	control, err := h.svc.CreateControl(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, control)
}

// UpdateControl handles PUT /{id} — updates a compliance control.
func (h *ComplianceHandler) UpdateControl(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid control ID")
		return
	}

	var req UpdateComplianceControlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	control, err := h.svc.UpdateControl(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, control, nil)
}

// DeleteControl handles DELETE /{id} — deletes a compliance control.
func (h *ComplianceHandler) DeleteControl(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid control ID")
		return
	}

	if err := h.svc.DeleteControl(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
