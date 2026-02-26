package knowledge

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// FeedbackHandler
// ──────────────────────────────────────────────

// FeedbackHandler handles HTTP requests for KB article feedback.
type FeedbackHandler struct {
	svc *FeedbackService
}

// NewFeedbackHandler creates a new FeedbackHandler.
func NewFeedbackHandler(svc *FeedbackService) *FeedbackHandler {
	return &FeedbackHandler{svc: svc}
}

// Routes mounts feedback endpoints on the given router.
func (h *FeedbackHandler) Routes(r chi.Router) {
	r.Route("/articles/{articleId}/feedback", func(r chi.Router) {
		r.With(middleware.RequirePermission("knowledge.view")).Get("/", h.ListFeedback)
		r.With(middleware.RequirePermission("knowledge.view")).Get("/stats", h.GetFeedbackStats)
		r.With(middleware.RequirePermission("knowledge.view")).Post("/", h.CreateFeedback)
		r.With(middleware.RequirePermission("knowledge.manage")).Delete("/{id}", h.DeleteFeedback)
	})
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListFeedback handles GET /articles/{articleId}/feedback — returns all feedback for an article.
func (h *FeedbackHandler) ListFeedback(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	articleID, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	feedbacks, err := h.svc.ListFeedback(r.Context(), articleID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, feedbacks, nil)
}

// GetFeedbackStats handles GET /articles/{articleId}/feedback/stats — returns feedback statistics.
func (h *FeedbackHandler) GetFeedbackStats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	articleID, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	stats, err := h.svc.GetFeedbackStats(r.Context(), articleID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// CreateFeedback handles POST /articles/{articleId}/feedback — creates feedback for an article.
func (h *FeedbackHandler) CreateFeedback(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	articleID, err := uuid.Parse(chi.URLParam(r, "articleId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid article ID")
		return
	}

	var req CreateFeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	feedback, err := h.svc.CreateFeedback(r.Context(), articleID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, feedback)
}

// DeleteFeedback handles DELETE /articles/{articleId}/feedback/{id} — deletes a feedback entry.
func (h *FeedbackHandler) DeleteFeedback(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid feedback ID")
		return
	}

	if err := h.svc.DeleteFeedback(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
