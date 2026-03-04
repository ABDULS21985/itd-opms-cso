package customfields

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────

// Handler handles HTTP requests for custom field management.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler with its own Service wired up internally.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	return &Handler{
		svc: NewService(pool, auditSvc),
	}
}

// Routes mounts custom field endpoints on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Route("/definitions", func(r chi.Router) {
		r.With(middleware.RequirePermission("custom_fields.manage")).Get("/", h.ListDefinitions)
		r.With(middleware.RequirePermission("custom_fields.manage")).Post("/", h.CreateDefinition)
		r.With(middleware.RequirePermission("custom_fields.manage")).Post("/reorder", h.ReorderDefinitions)
		r.With(middleware.RequirePermission("custom_fields.manage")).Get("/{id}", h.GetDefinition)
		r.With(middleware.RequirePermission("custom_fields.manage")).Put("/{id}", h.UpdateDefinition)
		r.With(middleware.RequirePermission("custom_fields.manage")).Delete("/{id}", h.DeleteDefinition)
	})
	r.Route("/entity/{entityType}/{entityId}", func(r chi.Router) {
		r.With(middleware.RequirePermission("custom_fields.manage")).Get("/values", h.GetValues)
		r.With(middleware.RequirePermission("custom_fields.manage")).Put("/values", h.UpdateValues)
	})
}

// ──────────────────────────────────────────────
// Error helper
// ──────────────────────────────────────────────

// writeAppError maps an application error to the appropriate HTTP response.
func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		status := apperrors.HTTPStatus(err)
		code := apperrors.Code(err)
		if status >= 500 {
			slog.ErrorContext(r.Context(), "internal error",
				"error", err.Error(),
				"path", r.URL.Path,
				"correlation_id", types.GetCorrelationID(r.Context()),
			)
		}
		types.ErrorMessage(w, status, code, appErr.Message)
		return
	}
	slog.ErrorContext(r.Context(), "unhandled error", "error", err)
	types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
}

// ──────────────────────────────────────────────
// Definition Handlers
// ──────────────────────────────────────────────

// ListDefinitions handles GET /definitions — returns active definitions for an entity type.
func (h *Handler) ListDefinitions(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := r.URL.Query().Get("entityType")
	if entityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "entityType query parameter is required")
		return
	}

	defs, err := h.svc.ListDefinitions(r.Context(), entityType)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, defs, nil)
}

// GetDefinition handles GET /definitions/{id} — retrieves a single definition.
func (h *Handler) GetDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid definition ID")
		return
	}

	def, err := h.svc.GetDefinition(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, def, nil)
}

// CreateDefinition handles POST /definitions — creates a new custom field definition.
func (h *Handler) CreateDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCustomFieldDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.FieldLabel == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Field label is required")
		return
	}

	if req.EntityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entity type is required")
		return
	}

	if req.FieldType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Field type is required")
		return
	}

	def, err := h.svc.CreateDefinition(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, def)
}

// UpdateDefinition handles PUT /definitions/{id} — updates a custom field definition.
func (h *Handler) UpdateDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid definition ID")
		return
	}

	var req UpdateCustomFieldDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	def, err := h.svc.UpdateDefinition(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, def, nil)
}

// DeleteDefinition handles DELETE /definitions/{id} — soft-deletes a definition.
func (h *Handler) DeleteDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid definition ID")
		return
	}

	if err := h.svc.DeleteDefinition(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ReorderDefinitions handles POST /definitions/reorder — batch-updates display order.
func (h *Handler) ReorderDefinitions(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := r.URL.Query().Get("entityType")
	if entityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "entityType query parameter is required")
		return
	}

	var req ReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if len(req.Items) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "At least one item is required")
		return
	}

	if err := h.svc.ReorderDefinitions(r.Context(), entityType, req.Items); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Entity Values Handlers
// ──────────────────────────────────────────────

// GetValues handles GET /entity/{entityType}/{entityId}/values — reads custom field values.
func (h *Handler) GetValues(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := chi.URLParam(r, "entityType")
	if entityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entity type is required")
		return
	}

	entityID, err := uuid.Parse(chi.URLParam(r, "entityId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entity ID")
		return
	}

	values, err := h.svc.GetValues(r.Context(), entityType, entityID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, values, nil)
}

// UpdateValues handles PUT /entity/{entityType}/{entityId}/values — writes custom field values.
func (h *Handler) UpdateValues(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := chi.URLParam(r, "entityType")
	if entityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entity type is required")
		return
	}

	entityID, err := uuid.Parse(chi.URLParam(r, "entityId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entity ID")
		return
	}

	var values map[string]any
	if err := json.NewDecoder(r.Body).Decode(&values); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.svc.UpdateValues(r.Context(), entityType, entityID, values); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
