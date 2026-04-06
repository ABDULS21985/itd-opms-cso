package itsm

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// KBLinkHandler handles HTTP requests for ticket ↔ KB article links.
type KBLinkHandler struct {
	svc *KBLinkService
}

// NewKBLinkHandler creates a new KBLinkHandler.
func NewKBLinkHandler(svc *KBLinkService) *KBLinkHandler {
	return &KBLinkHandler{svc: svc}
}

// Routes mounts KB link endpoints on a ticket-scoped router.
// These are mounted under /tickets/{id}/kb-links and /tickets/{id}/kb-suggestions.
func (h *KBLinkHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}/kb-links", h.GetTicketKBLinks)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}/kb-suggestions", h.GetKBSuggestions)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}/kb-search", h.SearchArticles)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/kb-links", h.LinkArticle)
	r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}/kb-links/{linkId}", h.UnlinkArticle)
}

// GetTicketKBLinks handles GET /tickets/{id}/kb-links — list linked KB articles.
func (h *KBLinkHandler) GetTicketKBLinks(w http.ResponseWriter, r *http.Request) {
	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	links, err := h.svc.GetTicketKBLinks(r.Context(), ticketID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, links, nil)
}

// LinkArticle handles POST /tickets/{id}/kb-links — link an article to a ticket.
func (h *KBLinkHandler) LinkArticle(w http.ResponseWriter, r *http.Request) {
	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var req LinkArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ArticleID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "articleId is required")
		return
	}

	link, err := h.svc.LinkArticle(r.Context(), ticketID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, link)
}

// UnlinkArticle handles DELETE /tickets/{id}/kb-links/{linkId} — remove a KB link.
func (h *KBLinkHandler) UnlinkArticle(w http.ResponseWriter, r *http.Request) {
	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	linkID, err := uuid.Parse(chi.URLParam(r, "linkId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid link ID")
		return
	}

	if err := h.svc.UnlinkArticle(r.Context(), ticketID, linkID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetKBSuggestions handles GET /tickets/{id}/kb-suggestions — auto-suggest articles.
func (h *KBLinkHandler) GetKBSuggestions(w http.ResponseWriter, r *http.Request) {
	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	suggestions, err := h.svc.SuggestArticles(r.Context(), ticketID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, suggestions, nil)
}

// SearchArticles handles GET /tickets/{id}/kb-search?q=...&limit=... — search KB for linking.
func (h *KBLinkHandler) SearchArticles(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Search query (q) is required")
		return
	}

	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	results, err := h.svc.SearchArticles(r.Context(), q, limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, results, nil)
}
