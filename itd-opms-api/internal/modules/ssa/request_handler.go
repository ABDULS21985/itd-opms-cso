package ssa

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// RequestHandler handles HTTP requests for SSA request CRUD operations.
type RequestHandler struct {
	svc *RequestService
}

// NewRequestHandler creates a new RequestHandler.
func NewRequestHandler(svc *RequestService) *RequestHandler {
	return &RequestHandler{svc: svc}
}

// Routes mounts request endpoints on the given router.
func (h *RequestHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("ssa.view")).Get("/", h.ListRequests)
	r.With(middleware.RequirePermission("ssa.view")).Get("/my", h.ListMyRequests)
	r.With(middleware.RequirePermission("ssa.view")).Get("/stats", h.GetStats)
	r.With(middleware.RequirePermission("ssa.view")).Get("/search", h.SearchRequests)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/", h.CreateRequest)
	r.With(middleware.RequirePermission("ssa.view")).Get("/{id}", h.GetRequest)
	r.With(middleware.RequirePermission("ssa.manage")).Put("/{id}", h.UpdateRequest)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/submit", h.SubmitRequest)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/cancel", h.CancelRequest)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/revise", h.ReviseRequest)

	// Service impact sub-routes
	r.Route("/{id}/impacts", func(r chi.Router) {
		r.With(middleware.RequirePermission("ssa.view")).Get("/", h.ListServiceImpacts)
		r.With(middleware.RequirePermission("ssa.manage")).Post("/", h.CreateServiceImpact)
		r.With(middleware.RequirePermission("ssa.manage")).Put("/{impactId}", h.UpdateServiceImpact)
		r.With(middleware.RequirePermission("ssa.manage")).Delete("/{impactId}", h.DeleteServiceImpact)
	})
}

// ListRequests handles GET /requests
func (h *RequestHandler) ListRequests(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	status := optionalString(r, "status")
	division := optionalString(r, "division")
	search := optionalString(r, "search")

	requests, total, err := h.svc.ListRequests(r.Context(), status, division, search, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// ListMyRequests handles GET /requests/my
func (h *RequestHandler) ListMyRequests(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	requests, total, err := h.svc.ListMyRequests(r.Context(), params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// GetStats handles GET /requests/stats
func (h *RequestHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetRequestStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// SearchRequests handles GET /requests/search
func (h *RequestHandler) SearchRequests(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	q := r.URL.Query().Get("q")
	if q == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Search query is required")
		return
	}

	requests, total, err := h.svc.ListRequests(r.Context(), nil, nil, &q, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// CreateRequest handles POST /requests
func (h *RequestHandler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.AppName == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Application name is required")
		return
	}
	if req.DBName == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Database name is required")
		return
	}
	if req.OperatingSystem == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Operating system is required")
		return
	}
	if req.DivisionOffice == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Division/Office is required")
		return
	}

	request, err := h.svc.CreateRequest(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, request)
}

// GetRequest handles GET /requests/{id}
func (h *RequestHandler) GetRequest(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	detail, err := h.svc.GetRequestDetail(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, detail, nil)
}

// UpdateRequest handles PUT /requests/{id}
func (h *RequestHandler) UpdateRequest(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	var req UpdateRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	request, err := h.svc.UpdateRequest(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// SubmitRequest handles POST /requests/{id}/submit
func (h *RequestHandler) SubmitRequest(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	request, err := h.svc.SubmitRequest(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// CancelRequest handles POST /requests/{id}/cancel
func (h *RequestHandler) CancelRequest(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	// Decode optional cancel reason from body.
	var dto CancelRequestDTO
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&dto) // ignore error — body is optional
	}

	request, err := h.svc.CancelRequest(r.Context(), id, dto.Reason)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// ReviseRequest handles POST /requests/{id}/revise
func (h *RequestHandler) ReviseRequest(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	request, err := h.svc.ReviseRequest(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// ListServiceImpacts handles GET /requests/{id}/impacts
func (h *RequestHandler) ListServiceImpacts(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	impacts, err := h.svc.ListServiceImpacts(r.Context(), requestID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, impacts, nil)
}

// CreateServiceImpact handles POST /requests/{id}/impacts
func (h *RequestHandler) CreateServiceImpact(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request ID")
		return
	}

	var req CreateServiceImpactDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.RiskCategory == "" || req.Severity == "" || req.RiskDescription == "" || req.MitigationMeasures == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "All service impact fields are required")
		return
	}

	impact, err := h.svc.CreateServiceImpact(r.Context(), requestID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, impact)
}

// UpdateServiceImpact handles PUT /requests/{id}/impacts/{impactId}
func (h *RequestHandler) UpdateServiceImpact(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	impactID, err := uuid.Parse(chi.URLParam(r, "impactId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid impact ID")
		return
	}

	var req CreateServiceImpactDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	impact, err := h.svc.UpdateServiceImpact(r.Context(), impactID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, impact, nil)
}

// DeleteServiceImpact handles DELETE /requests/{id}/impacts/{impactId}
func (h *RequestHandler) DeleteServiceImpact(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	impactID, err := uuid.Parse(chi.URLParam(r, "impactId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid impact ID")
		return
	}

	if err := h.svc.DeleteServiceImpact(r.Context(), impactID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

func optionalString(r *http.Request, key string) *string {
	if v := r.URL.Query().Get(key); v != "" {
		return &v
	}
	return nil
}

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
