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
// AccessReviewHandler
// ──────────────────────────────────────────────

// AccessReviewHandler handles HTTP requests for access review campaigns and entries.
type AccessReviewHandler struct {
	svc *AccessReviewService
}

// NewAccessReviewHandler creates a new AccessReviewHandler.
func NewAccessReviewHandler(svc *AccessReviewService) *AccessReviewHandler {
	return &AccessReviewHandler{svc: svc}
}

// Routes mounts access review endpoints on the given router.
func (h *AccessReviewHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("grc.view")).Get("/", h.ListCampaigns)
	r.With(middleware.RequirePermission("grc.view")).Get("/{id}", h.GetCampaign)
	r.With(middleware.RequirePermission("grc.manage")).Post("/", h.CreateCampaign)
	r.With(middleware.RequirePermission("grc.manage")).Put("/{id}", h.UpdateCampaign)

	r.Route("/{campaignId}/entries", func(r chi.Router) {
		r.With(middleware.RequirePermission("grc.view")).Get("/", h.ListEntries)
		r.With(middleware.RequirePermission("grc.manage")).Post("/", h.CreateEntry)
		r.With(middleware.RequirePermission("grc.manage")).Post("/{entryId}/decide", h.RecordDecision)
	})
}

// ──────────────────────────────────────────────
// Campaign Handlers
// ──────────────────────────────────────────────

// ListCampaigns handles GET / — returns a paginated list of access review campaigns.
func (h *AccessReviewHandler) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	params := types.ParsePagination(r)

	campaigns, total, err := h.svc.ListCampaigns(r.Context(), status, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, campaigns, types.NewMeta(int64(total), params))
}

// GetCampaign handles GET /{id} — retrieves a single access review campaign.
func (h *AccessReviewHandler) GetCampaign(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	campaign, err := h.svc.GetCampaign(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, campaign, nil)
}

// CreateCampaign handles POST / — creates a new access review campaign.
func (h *AccessReviewHandler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateAccessReviewCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	campaign, err := h.svc.CreateCampaign(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, campaign)
}

// UpdateCampaign handles PUT /{id} — updates an access review campaign.
func (h *AccessReviewHandler) UpdateCampaign(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	var req UpdateAccessReviewCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	campaign, err := h.svc.UpdateCampaign(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, campaign, nil)
}

// ──────────────────────────────────────────────
// Entry Handlers
// ──────────────────────────────────────────────

// ListEntries handles GET /{campaignId}/entries — returns entries for a campaign.
func (h *AccessReviewHandler) ListEntries(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	campaignID, err := uuid.Parse(chi.URLParam(r, "campaignId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	var decision *string
	if v := r.URL.Query().Get("decision"); v != "" {
		decision = &v
	}

	entries, err := h.svc.ListEntries(r.Context(), campaignID, decision)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entries, nil)
}

// CreateEntry handles POST /{campaignId}/entries — creates a new access review entry.
func (h *AccessReviewHandler) CreateEntry(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	campaignID, err := uuid.Parse(chi.URLParam(r, "campaignId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	var req CreateAccessReviewEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.UserID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "User ID is required")
		return
	}

	entry, err := h.svc.CreateEntry(r.Context(), campaignID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, entry)
}

// RecordDecision handles POST /{campaignId}/entries/{entryId}/decide — records a review decision.
func (h *AccessReviewHandler) RecordDecision(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entry ID")
		return
	}

	var req RecordDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Decision == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Decision is required")
		return
	}

	entry, err := h.svc.RecordDecision(r.Context(), entryID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entry, nil)
}
