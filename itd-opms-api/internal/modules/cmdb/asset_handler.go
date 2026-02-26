package cmdb

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// AssetHandler
// ──────────────────────────────────────────────

// AssetHandler handles HTTP requests for asset lifecycle management.
type AssetHandler struct {
	svc *AssetService
}

// NewAssetHandler creates a new AssetHandler.
func NewAssetHandler(svc *AssetService) *AssetHandler {
	return &AssetHandler{svc: svc}
}

// Routes mounts asset endpoints on the given router.
func (h *AssetHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListAssets)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/stats", h.GetAssetStats)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetAsset)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateAsset)
	r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}", h.UpdateAsset)
	r.With(middleware.RequirePermission("cmdb.manage")).Delete("/{id}", h.DeleteAsset)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/{id}/transition", h.TransitionStatus)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}/lifecycle", h.ListLifecycleEvents)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/{id}/lifecycle", h.CreateLifecycleEvent)

	// Disposals
	r.Route("/disposals", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListDisposals)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetDisposal)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateDisposal)
		r.With(middleware.RequirePermission("cmdb.manage")).Put("/{disposalId}/status", h.UpdateDisposalStatus)
	})
}

// ──────────────────────────────────────────────
// Query-string helpers
// ──────────────────────────────────────────────

func optionalString(r *http.Request, key string) *string {
	if v := r.URL.Query().Get(key); v != "" {
		return &v
	}
	return nil
}

func optionalUUID(r *http.Request, key string) *uuid.UUID {
	if v := r.URL.Query().Get(key); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			return &id
		}
	}
	return nil
}

func optionalInt(r *http.Request, key string, defaultVal int) int {
	if v := r.URL.Query().Get(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return defaultVal
}

// ──────────────────────────────────────────────
// Shared error helper
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
// Handlers
// ──────────────────────────────────────────────

// ListAssets handles GET / — returns a filtered, paginated list of assets.
func (h *AssetHandler) ListAssets(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	assetType := optionalString(r, "assetType")
	status := optionalString(r, "status")
	ownerID := optionalString(r, "ownerId")

	assets, total, err := h.svc.ListAssets(r.Context(), assetType, status, ownerID, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, assets, types.NewMeta(total, params))
}

// GetAssetStats handles GET /stats — returns aggregate asset statistics.
func (h *AssetHandler) GetAssetStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetAssetStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// GetAsset handles GET /{id} — retrieves a single asset.
func (h *AssetHandler) GetAsset(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	asset, err := h.svc.GetAsset(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, asset, nil)
}

// CreateAsset handles POST / — creates a new asset.
func (h *AssetHandler) CreateAsset(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	if req.AssetType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Asset type is required")
		return
	}

	asset, err := h.svc.CreateAsset(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, asset)
}

// UpdateAsset handles PUT /{id} — updates an existing asset.
func (h *AssetHandler) UpdateAsset(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	var req UpdateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	asset, err := h.svc.UpdateAsset(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, asset, nil)
}

// DeleteAsset handles DELETE /{id} — soft-deletes an asset.
func (h *AssetHandler) DeleteAsset(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	if err := h.svc.DeleteAsset(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// TransitionStatus handles POST /{id}/transition — transitions asset status.
func (h *AssetHandler) TransitionStatus(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if body.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	asset, err := h.svc.TransitionAssetStatus(r.Context(), id, body.Status)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, asset, nil)
}

// ListLifecycleEvents handles GET /{id}/lifecycle — returns lifecycle events for an asset.
func (h *AssetHandler) ListLifecycleEvents(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	events, err := h.svc.ListLifecycleEvents(r.Context(), assetID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, events, nil)
}

// CreateLifecycleEvent handles POST /{id}/lifecycle — creates a lifecycle event for an asset.
func (h *AssetHandler) CreateLifecycleEvent(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid asset ID")
		return
	}

	var body struct {
		EventType     string           `json:"eventType"`
		Details       json.RawMessage  `json:"details"`
		EvidenceDocID *uuid.UUID       `json:"evidenceDocId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if body.EventType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Event type is required")
		return
	}

	event, err := h.svc.CreateLifecycleEvent(r.Context(), assetID, body.EventType, body.Details, body.EvidenceDocID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, event)
}

// ──────────────────────────────────────────────
// Disposal Handlers
// ──────────────────────────────────────────────

// ListDisposals handles GET /disposals — returns a filtered, paginated list of disposals.
func (h *AssetHandler) ListDisposals(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	status := optionalString(r, "status")

	disposals, total, err := h.svc.ListDisposals(r.Context(), status, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, disposals, types.NewMeta(total, params))
}

// GetDisposal handles GET /disposals/{id} — retrieves a single disposal.
func (h *AssetHandler) GetDisposal(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid disposal ID")
		return
	}

	disposal, err := h.svc.GetDisposal(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, disposal, nil)
}

// CreateDisposal handles POST /disposals — creates a new disposal request.
func (h *AssetHandler) CreateDisposal(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateDisposalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.AssetID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Asset ID is required")
		return
	}

	if req.DisposalMethod == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Disposal method is required")
		return
	}

	disposal, err := h.svc.CreateDisposal(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, disposal)
}

// UpdateDisposalStatus handles PUT /disposals/{disposalId}/status — updates a disposal's status.
func (h *AssetHandler) UpdateDisposalStatus(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "disposalId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid disposal ID")
		return
	}

	var req UpdateDisposalStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	disposal, err := h.svc.UpdateDisposalStatus(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, disposal, nil)
}
