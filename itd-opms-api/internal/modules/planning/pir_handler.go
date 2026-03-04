package planning

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// PIRHandler
// ──────────────────────────────────────────────

// PIRHandler handles HTTP requests for Post-Implementation Reviews.
type PIRHandler struct {
	svc *PIRService
}

// NewPIRHandler creates a new PIRHandler.
func NewPIRHandler(svc *PIRService) *PIRHandler {
	return &PIRHandler{svc: svc}
}

// Routes mounts PIR endpoints on the given router.
func (h *PIRHandler) Routes(r chi.Router) {
	// Collection endpoints
	r.With(middleware.RequirePermission("planning.view")).Get("/", h.List)
	r.With(middleware.RequirePermission("planning.view")).Get("/stats", h.Stats)
	r.With(middleware.RequirePermission("planning.view")).Get("/templates", h.ListTemplates)
	r.With(middleware.RequirePermission("planning.manage")).Post("/", h.Create)
	r.With(middleware.RequirePermission("planning.manage")).Post("/templates", h.CreateTemplate)

	// Individual PIR endpoints
	r.Route("/{id}", func(r chi.Router) {
		r.With(middleware.RequirePermission("planning.view")).Get("/", h.Get)
		r.With(middleware.RequirePermission("planning.manage")).Put("/", h.Update)
		r.With(middleware.RequirePermission("planning.manage")).Post("/complete", h.Complete)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/", h.Delete)
	})
}

// List handles GET / — returns a paginated list of PIRs.
func (h *PIRHandler) List(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var projectID *uuid.UUID
	if pid := r.URL.Query().Get("projectId"); pid != "" {
		parsed, err := uuid.Parse(pid)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid projectId")
			return
		}
		projectID = &parsed
	}

	status := r.URL.Query().Get("status")

	params := types.ParsePagination(r)

	pirs, total, err := h.svc.ListPIRs(r.Context(), authCtx.TenantID, projectID, status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, pirs, types.NewMeta(total, params))
}

// Create handles POST / — creates a new PIR.
func (h *PIRHandler) Create(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreatePIRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	pir, err := h.svc.CreatePIR(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, pir)
}

// Get handles GET /{id} — retrieves a single PIR.
func (h *PIRHandler) Get(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pirID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid PIR ID")
		return
	}

	pir, err := h.svc.GetPIR(r.Context(), authCtx.TenantID, pirID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, pir, nil)
}

// Update handles PUT /{id} — updates an existing PIR.
func (h *PIRHandler) Update(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pirID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid PIR ID")
		return
	}

	var req UpdatePIRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	pir, err := h.svc.UpdatePIR(r.Context(), authCtx.TenantID, pirID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, pir, nil)
}

// Complete handles POST /{id}/complete — marks a PIR as completed.
func (h *PIRHandler) Complete(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pirID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid PIR ID")
		return
	}

	pir, err := h.svc.CompletePIR(r.Context(), authCtx.TenantID, pirID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, pir, nil)
}

// Delete handles DELETE /{id} — deletes a PIR.
func (h *PIRHandler) Delete(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pirID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid PIR ID")
		return
	}

	if err := h.svc.DeletePIR(r.Context(), authCtx.TenantID, pirID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// Stats handles GET /stats — returns aggregate PIR statistics.
func (h *PIRHandler) Stats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetPIRStats(r.Context(), authCtx.TenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// ListTemplates handles GET /templates — returns PIR templates.
func (h *PIRHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	reviewType := r.URL.Query().Get("reviewType")

	templates, err := h.svc.ListPIRTemplates(r.Context(), authCtx.TenantID, reviewType)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, templates, nil)
}

// CreateTemplate handles POST /templates — creates a new PIR template.
func (h *PIRHandler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreatePIRTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	tmpl, err := h.svc.CreatePIRTemplate(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, tmpl)
}
