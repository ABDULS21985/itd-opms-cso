package itsm

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// CatalogSearchHandler
// ──────────────────────────────────────────────

// CatalogSearchHandler handles HTTP requests for catalog search,
// favorites, and popularity features.
type CatalogSearchHandler struct {
	svc *CatalogSearchService
}

// NewCatalogSearchHandler creates a new CatalogSearchHandler.
func NewCatalogSearchHandler(svc *CatalogSearchService) *CatalogSearchHandler {
	return &CatalogSearchHandler{svc: svc}
}

// Routes mounts catalog search endpoints on the given router.
func (h *CatalogSearchHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Get("/search", h.SearchItems)
	r.With(middleware.RequirePermission("itsm.view")).Get("/favorites", h.ListFavorites)
	r.With(middleware.RequirePermission("itsm.view")).Post("/favorites/{itemId}", h.ToggleFavorite)
	r.With(middleware.RequirePermission("itsm.view")).Get("/popular", h.ListPopularItems)
	r.With(middleware.RequirePermission("itsm.view")).Get("/recent", h.ListRecentlyRequested)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// SearchItems handles GET /search — performs full-text search across catalog items.
// Query params: q (search query), category_id (repeatable), approval_required, page, limit.
func (h *CatalogSearchHandler) SearchItems(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Query parameter 'q' is required")
		return
	}

	// Parse repeatable category_id query params.
	var categoryIDs []uuid.UUID
	for _, v := range r.URL.Query()["category_id"] {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category_id: "+v)
			return
		}
		categoryIDs = append(categoryIDs, parsed)
	}

	// Parse optional approval_required boolean.
	var approvalRequired *bool
	if v := r.URL.Query().Get("approval_required"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid approval_required value")
			return
		}
		approvalRequired = &parsed
	}

	params := types.ParsePagination(r)

	items, total, err := h.svc.SearchItems(r.Context(), q, categoryIDs, approvalRequired, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, types.NewMeta(total, params))
}

// ListFavorites handles GET /favorites — returns the item IDs the current user has favorited.
func (h *CatalogSearchHandler) ListFavorites(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	ids, err := h.svc.ListFavorites(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ids, nil)
}

// ToggleFavorite handles POST /favorites/{itemId} — adds or removes a catalog item
// from the current user's favorites. Returns {"favorited": true/false}.
func (h *CatalogSearchHandler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	itemID, err := uuid.Parse(chi.URLParam(r, "itemId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid item ID")
		return
	}

	favorited, err := h.svc.ToggleFavorite(r.Context(), itemID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]bool{"favorited": favorited}, nil)
}

// ListPopularItems handles GET /popular — returns the most requested catalog items.
// Query param: limit (default 5).
func (h *CatalogSearchHandler) ListPopularItems(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	limit := 5
	if v := r.URL.Query().Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 1 {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid limit value")
			return
		}
		limit = parsed
	}

	items, err := h.svc.ListPopularItems(r.Context(), limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}

// ListRecentlyRequested handles GET /recent — returns the most recently requested
// unique catalog items for the current user.
// Query param: limit (default 5).
func (h *CatalogSearchHandler) ListRecentlyRequested(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	limit := 5
	if v := r.URL.Query().Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 1 {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid limit value")
			return
		}
		limit = parsed
	}

	items, err := h.svc.ListRecentlyRequested(r.Context(), limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}
