package itsm

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// CatalogHandler
// ──────────────────────────────────────────────

// CatalogHandler handles HTTP requests for the service catalog.
type CatalogHandler struct {
	svc *CatalogService
}

// NewCatalogHandler creates a new CatalogHandler.
func NewCatalogHandler(svc *CatalogService) *CatalogHandler {
	return &CatalogHandler{svc: svc}
}

// Routes mounts catalog endpoints on the given router.
func (h *CatalogHandler) Routes(r chi.Router) {
	// Categories
	r.Route("/categories", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListCategories)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetCategory)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateCategory)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateCategory)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteCategory)
	})
	// Items
	r.Route("/items", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListItems)
		r.With(middleware.RequirePermission("itsm.view")).Get("/entitled", h.ListEntitledItems)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetItem)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateItem)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateItem)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteItem)
	})
}

// ──────────────────────────────────────────────
// Category Handlers
// ──────────────────────────────────────────────

// ListCategories handles GET /categories — returns catalog categories.
func (h *CatalogHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var parentID *uuid.UUID
	if v := r.URL.Query().Get("parent_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid parent_id")
			return
		}
		parentID = &parsed
	}

	categories, err := h.svc.ListCategories(r.Context(), parentID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, categories, nil)
}

// GetCategory handles GET /categories/{id} — retrieves a single category.
func (h *CatalogHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	category, err := h.svc.GetCategory(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, category, nil)
}

// CreateCategory handles POST /categories — creates a new category.
func (h *CatalogHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCatalogCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	category, err := h.svc.CreateCategory(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, category)
}

// UpdateCategory handles PUT /categories/{id} — updates a category.
func (h *CatalogHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	var req UpdateCatalogCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	category, err := h.svc.UpdateCategory(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, category, nil)
}

// DeleteCategory handles DELETE /categories/{id} — deletes a category.
func (h *CatalogHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	if err := h.svc.DeleteCategory(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Item Handlers
// ──────────────────────────────────────────────

// ListItems handles GET /items — returns a paginated list of catalog items.
func (h *CatalogHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var categoryID *uuid.UUID
	if v := r.URL.Query().Get("category_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category_id")
			return
		}
		categoryID = &parsed
	}

	var statusParam *string
	if s := r.URL.Query().Get("status"); s != "" {
		statusParam = &s
	}

	params := types.ParsePagination(r)

	items, total, err := h.svc.ListItems(r.Context(), categoryID, statusParam, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, types.NewMeta(total, params))
}

// ListEntitledItems handles GET /items/entitled — returns active items the user is entitled to.
func (h *CatalogHandler) ListEntitledItems(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	items, err := h.svc.ListItemsByEntitlement(r.Context(), authCtx.Roles)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}

// GetItem handles GET /items/{id} — retrieves a single catalog item.
func (h *CatalogHandler) GetItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid item ID")
		return
	}

	item, err := h.svc.GetItem(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// CreateItem handles POST /items — creates a new catalog item.
func (h *CatalogHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCatalogItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	item, err := h.svc.CreateItem(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, item)
}

// UpdateItem handles PUT /items/{id} — updates an existing catalog item.
func (h *CatalogHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid item ID")
		return
	}

	var req UpdateCatalogItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	item, err := h.svc.UpdateItem(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// DeleteItem handles DELETE /items/{id} — deletes a catalog item.
func (h *CatalogHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid item ID")
		return
	}

	if err := h.svc.DeleteItem(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Shared error helper
// ──────────────────────────────────────────────

// writeAppError maps an application error to the appropriate HTTP response.
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
