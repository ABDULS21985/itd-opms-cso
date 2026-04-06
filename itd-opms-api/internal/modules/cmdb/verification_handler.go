package cmdb

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// VerificationHandler handles HTTP requests for verification campaigns.
type VerificationHandler struct {
	svc *VerificationService
}

// NewVerificationHandler creates a new VerificationHandler.
func NewVerificationHandler(svc *VerificationService) *VerificationHandler {
	return &VerificationHandler{svc: svc}
}

// Routes mounts verification endpoints on the given router.
func (h *VerificationHandler) Routes(r chi.Router) {
	// Campaign CRUD
	r.Route("/campaigns", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListCampaigns)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateCampaign)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetCampaign)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/{id}/start", h.StartCampaign)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/{id}/complete", h.CompleteCampaign)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}/assets", h.GetCampaignAssets)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/{id}/assets/{assetId}/verify", h.VerifyCampaignAsset)
	})

	// Bulk verify (outside campaigns too)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/bulk-verify", h.BulkVerify)
}

// ListCampaigns handles GET /verification/campaigns.
func (h *VerificationHandler) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	status := optionalString(r, "status")
	params := types.ParsePagination(r)

	campaigns, total, err := h.svc.ListCampaigns(r.Context(), status, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, campaigns, types.NewMeta(total, params))
}

// CreateCampaign handles POST /verification/campaigns.
func (h *VerificationHandler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Name is required")
		return
	}

	campaign, err := h.svc.CreateCampaign(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, campaign)
}

// GetCampaign handles GET /verification/campaigns/{id}.
func (h *VerificationHandler) GetCampaign(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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

// StartCampaign handles POST /verification/campaigns/{id}/start.
func (h *VerificationHandler) StartCampaign(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	campaign, err := h.svc.StartCampaign(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, campaign, nil)
}

// CompleteCampaign handles POST /verification/campaigns/{id}/complete.
func (h *VerificationHandler) CompleteCampaign(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	campaign, err := h.svc.CompleteCampaign(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, campaign, nil)
}

// GetCampaignAssets handles GET /verification/campaigns/{id}/assets.
func (h *VerificationHandler) GetCampaignAssets(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	pendingOnly := r.URL.Query().Get("pendingOnly") == "true"
	params := types.ParsePagination(r)

	assets, total, err := h.svc.GetCampaignAssets(r.Context(), id, pendingOnly, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, assets, types.NewMeta(total, params))
}

// VerifyCampaignAsset handles POST /verification/campaigns/{id}/assets/{assetId}/verify.
func (h *VerificationHandler) VerifyCampaignAsset(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	campaignID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid campaign ID")
		return
	}

	assetID, err := uuid.Parse(chi.URLParam(r, "assetId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	var req CampaignVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	v, err := h.svc.RecordCampaignVerification(r.Context(), campaignID, assetID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, v)
}

// BulkVerify handles POST /verification/bulk-verify.
func (h *VerificationHandler) BulkVerify(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req BulkVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	count, err := h.svc.BulkVerify(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]int{"verified": count}, nil)
}

// VerificationStatsHandler handles GET /assets/verification-status on the asset handler.
// It's a standalone function to be wired into AssetHandler routes.
func VerificationStatsHandler(svc *VerificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := types.GetAuthContext(r.Context())
		if auth == nil {
			types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
			return
		}

		stats, err := svc.GetVerificationStats(r.Context())
		if err != nil {
			writeAppError(w, r, err)
			return
		}

		types.OK(w, stats, nil)
	}
}
