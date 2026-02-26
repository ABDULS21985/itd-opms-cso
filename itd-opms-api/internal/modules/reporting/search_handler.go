package reporting

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// SearchHandler
// ──────────────────────────────────────────────

// SearchHandler handles HTTP requests for global search and saved searches.
type SearchHandler struct {
	svc *SearchService
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(svc *SearchService) *SearchHandler {
	return &SearchHandler{svc: svc}
}

// Routes mounts search endpoints on the given router.
func (h *SearchHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("reporting.view")).Get("/", h.GlobalSearch)
	r.Route("/saved", func(r chi.Router) {
		r.With(middleware.RequirePermission("reporting.view")).Get("/", h.ListSavedSearches)
		r.With(middleware.RequirePermission("reporting.view")).Get("/recent", h.ListRecentSearches)
		r.With(middleware.RequirePermission("reporting.view")).Post("/", h.SaveSearch)
		r.With(middleware.RequirePermission("reporting.view")).Delete("/{id}", h.DeleteSavedSearch)
	})
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// GlobalSearch handles GET / — searches across entity types.
func (h *SearchHandler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Query parameter 'q' is required")
		return
	}

	// Parse optional entity_types filter (comma-separated).
	var entityTypes []string
	if v := r.URL.Query().Get("entity_types"); v != "" {
		entityTypes = strings.Split(v, ",")
	}

	params := types.ParsePagination(r)

	results, err := h.svc.GlobalSearch(r.Context(), query, entityTypes, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, results, nil)
}

// ListSavedSearches handles GET /saved/ — returns the user's saved searches.
func (h *SearchHandler) ListSavedSearches(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	searches, err := h.svc.ListSavedSearches(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, searches, nil)
}

// ListRecentSearches handles GET /saved/recent — returns the user's recent searches.
func (h *SearchHandler) ListRecentSearches(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	searches, err := h.svc.ListRecentSearches(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, searches, nil)
}

// SaveSearch handles POST /saved/ — creates a saved search.
func (h *SearchHandler) SaveSearch(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateSavedSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Query == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Query is required")
		return
	}

	search, err := h.svc.SaveSearch(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, search)
}

// DeleteSavedSearch handles DELETE /saved/{id} — removes a saved search.
func (h *SearchHandler) DeleteSavedSearch(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid saved search ID")
		return
	}

	if err := h.svc.DeleteSavedSearch(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
