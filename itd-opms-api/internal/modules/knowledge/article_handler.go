package knowledge

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

// ──────────────────────────────────────────────
// ArticleHandler
// ──────────────────────────────────────────────

// ArticleHandler handles HTTP requests for KB categories and articles.
type ArticleHandler struct {
	svc *ArticleService
}

// NewArticleHandler creates a new ArticleHandler.
func NewArticleHandler(svc *ArticleService) *ArticleHandler {
	return &ArticleHandler{svc: svc}
}

// Routes mounts KB category and article endpoints on the given router.
func (h *ArticleHandler) Routes(r chi.Router) {
	// Categories
	r.Route("/categories", func(r chi.Router) {
		r.With(middleware.RequirePermission("knowledge.view")).Get("/", h.ListCategories)
		r.With(middleware.RequirePermission("knowledge.view")).Get("/{id}", h.GetCategory)
		r.With(middleware.RequirePermission("knowledge.manage")).Post("/", h.CreateCategory)
		r.With(middleware.RequirePermission("knowledge.manage")).Put("/{id}", h.UpdateCategory)
		r.With(middleware.RequirePermission("knowledge.manage")).Delete("/{id}", h.DeleteCategory)
	})

	// Articles
	r.Route("/articles", func(r chi.Router) {
		r.With(middleware.RequirePermission("knowledge.view")).Get("/", h.ListArticles)
		r.With(middleware.RequirePermission("knowledge.view")).Get("/search", h.SearchArticles)
		r.With(middleware.RequirePermission("knowledge.view")).Get("/slug/{slug}", h.GetArticleBySlug)
		r.With(middleware.RequirePermission("knowledge.view")).Get("/{id}", h.GetArticle)
		r.With(middleware.RequirePermission("knowledge.manage")).Post("/", h.CreateArticle)
		r.With(middleware.RequirePermission("knowledge.manage")).Put("/{id}", h.UpdateArticle)
		r.With(middleware.RequirePermission("knowledge.manage")).Delete("/{id}", h.DeleteArticle)
		r.With(middleware.RequirePermission("knowledge.manage")).Post("/{id}/publish", h.PublishArticle)
		r.With(middleware.RequirePermission("knowledge.manage")).Post("/{id}/archive", h.ArchiveArticle)
		r.With(middleware.RequirePermission("knowledge.view")).Post("/{id}/view", h.IncrementViewCount)
	})
}

// ──────────────────────────────────────────────
// Category Handlers
// ──────────────────────────────────────────────

// ListCategories handles GET /categories — returns KB categories.
func (h *ArticleHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
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
func (h *ArticleHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
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
func (h *ArticleHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateKBCategoryRequest
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
func (h *ArticleHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
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

	var req UpdateKBCategoryRequest
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
func (h *ArticleHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
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
// Article Handlers
// ──────────────────────────────────────────────

// ListArticles handles GET /articles — returns a paginated list of articles.
func (h *ArticleHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
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

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	var articleType *string
	if v := r.URL.Query().Get("type"); v != "" {
		articleType = &v
	}

	var authorID *string
	if v := r.URL.Query().Get("author_id"); v != "" {
		authorID = &v
	}

	params := types.ParsePagination(r)

	articles, total, err := h.svc.ListArticles(r.Context(), categoryID, status, articleType, authorID, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, articles, types.NewMeta(int64(total), params))
}

// SearchArticles handles GET /articles/search — performs a full-text search.
func (h *ArticleHandler) SearchArticles(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Search query (q) is required")
		return
	}

	params := types.ParsePagination(r)

	articles, total, err := h.svc.SearchArticles(r.Context(), q, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, articles, types.NewMeta(int64(total), params))
}

// GetArticleBySlug handles GET /articles/slug/{slug} — retrieves an article by slug.
func (h *ArticleHandler) GetArticleBySlug(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	slug := chi.URLParam(r, "slug")
	if slug == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Slug is required")
		return
	}

	article, err := h.svc.GetArticleBySlug(r.Context(), slug)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, article, nil)
}

// GetArticle handles GET /articles/{id} — retrieves a single article.
func (h *ArticleHandler) GetArticle(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	article, err := h.svc.GetArticle(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, article, nil)
}

// CreateArticle handles POST /articles — creates a new article.
func (h *ArticleHandler) CreateArticle(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateKBArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.Slug == "" || req.Content == "" || req.Type == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title, slug, content, and type are required")
		return
	}

	article, err := h.svc.CreateArticle(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, article)
}

// UpdateArticle handles PUT /articles/{id} — updates an article.
func (h *ArticleHandler) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	var req UpdateKBArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	article, err := h.svc.UpdateArticle(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, article, nil)
}

// DeleteArticle handles DELETE /articles/{id} — deletes an article.
func (h *ArticleHandler) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	if err := h.svc.DeleteArticle(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// PublishArticle handles POST /articles/{id}/publish — publishes an article.
func (h *ArticleHandler) PublishArticle(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	article, err := h.svc.PublishArticle(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, article, nil)
}

// ArchiveArticle handles POST /articles/{id}/archive — archives an article.
func (h *ArticleHandler) ArchiveArticle(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	if err := h.svc.ArchiveArticle(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// IncrementViewCount handles POST /articles/{id}/view — increments view count.
func (h *ArticleHandler) IncrementViewCount(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	if err := h.svc.IncrementViewCount(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
