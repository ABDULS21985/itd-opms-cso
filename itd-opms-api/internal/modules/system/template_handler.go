package system

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// EmailTemplateHandler
// ──────────────────────────────────────────────

// EmailTemplateHandler handles HTTP requests for email template management.
type EmailTemplateHandler struct {
	svc *EmailTemplateService
}

// NewEmailTemplateHandler creates a new EmailTemplateHandler.
func NewEmailTemplateHandler(svc *EmailTemplateService) *EmailTemplateHandler {
	return &EmailTemplateHandler{svc: svc}
}

// Routes mounts email template management endpoints on the given router.
func (h *EmailTemplateHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.view")).Get("/", h.ListTemplates)
	r.With(middleware.RequirePermission("system.view")).Get("/{id}", h.GetTemplate)
	r.With(middleware.RequirePermission("system.manage")).Post("/", h.CreateTemplate)
	r.With(middleware.RequirePermission("system.manage")).Patch("/{id}", h.UpdateTemplate)
	r.With(middleware.RequirePermission("system.manage")).Delete("/{id}", h.DeleteTemplate)
	r.With(middleware.RequirePermission("system.manage")).Post("/{id}/preview", h.PreviewTemplate)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListTemplates handles GET /system/email-templates — paginated list with optional category filter.
func (h *EmailTemplateHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pagination := types.ParsePagination(r)
	category := r.URL.Query().Get("category")

	templates, total, err := h.svc.ListTemplates(r.Context(), auth.TenantID, category, pagination.Page, pagination.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, templates, types.NewMeta(total, pagination))
}

// GetTemplate handles GET /system/email-templates/{id} — single template detail.
func (h *EmailTemplateHandler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid template ID")
		return
	}

	template, err := h.svc.GetTemplate(r.Context(), templateID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, template, nil)
}

// CreateTemplate handles POST /system/email-templates — create an email template.
func (h *EmailTemplateHandler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateEmailTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	template, err := h.svc.CreateTemplate(r.Context(), auth.TenantID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, template)
}

// UpdateTemplate handles PATCH /system/email-templates/{id} — update an email template.
func (h *EmailTemplateHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid template ID")
		return
	}

	var req UpdateEmailTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	template, err := h.svc.UpdateTemplate(r.Context(), templateID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, template, nil)
}

// DeleteTemplate handles DELETE /system/email-templates/{id} — delete an email template.
func (h *EmailTemplateHandler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid template ID")
		return
	}

	if err := h.svc.DeleteTemplate(r.Context(), templateID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// PreviewTemplate handles POST /system/email-templates/{id}/preview — render a template with variables.
func (h *EmailTemplateHandler) PreviewTemplate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	templateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid template ID")
		return
	}

	var req TemplatePreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	subject, bodyHTML, err := h.svc.PreviewTemplate(r.Context(), templateID, req.Variables)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{
		"subject":  subject,
		"bodyHtml": bodyHTML,
	}, nil)
}
