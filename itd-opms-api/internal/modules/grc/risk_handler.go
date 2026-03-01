package grc

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
// Shared error helper (defined ONCE here)
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
// RiskHandler
// ──────────────────────────────────────────────

// RiskHandler handles HTTP requests for risk management.
type RiskHandler struct {
	svc *RiskService
}

// NewRiskHandler creates a new RiskHandler.
func NewRiskHandler(svc *RiskService) *RiskHandler {
	return &RiskHandler{svc: svc}
}

// Routes mounts risk endpoints on the given router.
func (h *RiskHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("grc.view")).Get("/", h.ListRisks)
	r.With(middleware.RequirePermission("grc.view")).Get("/heat-map", h.GetRiskHeatMap)
	r.With(middleware.RequirePermission("grc.view")).Get("/review-needed", h.GetRisksNeedingReview)
	r.With(middleware.RequirePermission("grc.view")).Get("/{id}", h.GetRisk)
	r.With(middleware.RequirePermission("grc.manage")).Post("/", h.CreateRisk)
	r.With(middleware.RequirePermission("grc.manage")).Put("/{id}", h.UpdateRisk)
	r.With(middleware.RequirePermission("grc.manage")).Delete("/{id}", h.DeleteRisk)
	r.With(middleware.RequirePermission("grc.manage")).Post("/{id}/assess", h.CreateRiskAssessment)
	r.With(middleware.RequirePermission("grc.view")).Get("/{id}/assessments", h.ListRiskAssessments)
	r.With(middleware.RequirePermission("grc.manage")).Post("/{id}/escalate", h.EscalateRisk)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListRisks handles GET / — returns a paginated list of risks.
func (h *RiskHandler) ListRisks(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	var category *string
	if v := r.URL.Query().Get("category"); v != "" {
		category = &v
	}

	var ownerID *uuid.UUID
	if v := r.URL.Query().Get("owner_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid owner_id")
			return
		}
		ownerID = &parsed
	}

	params := types.ParsePagination(r)

	risks, total, err := h.svc.ListRisks(r.Context(), status, category, ownerID, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, risks, types.NewMeta(int64(total), params))
}

// GetRisk handles GET /{id} — retrieves a single risk.
func (h *RiskHandler) GetRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	risk, err := h.svc.GetRisk(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, risk, nil)
}

// CreateRisk handles POST / — creates a new risk.
func (h *RiskHandler) CreateRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.Category == "" || req.Likelihood == "" || req.Impact == "" || req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title, category, likelihood, impact, and status are required")
		return
	}

	risk, err := h.svc.CreateRisk(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, risk)
}

// UpdateRisk handles PUT /{id} — updates a risk.
func (h *RiskHandler) UpdateRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	var req UpdateRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	risk, err := h.svc.UpdateRisk(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, risk, nil)
}

// DeleteRisk handles DELETE /{id} — deletes a risk.
func (h *RiskHandler) DeleteRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	if err := h.svc.DeleteRisk(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetRiskHeatMap handles GET /heat-map — returns risk heat map data.
func (h *RiskHandler) GetRiskHeatMap(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entries, err := h.svc.GetRiskHeatMap(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entries, nil)
}

// GetRisksNeedingReview handles GET /review-needed — returns risks due for review.
func (h *RiskHandler) GetRisksNeedingReview(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	risks, err := h.svc.GetRisksNeedingReview(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, risks, nil)
}

// CreateRiskAssessment handles POST /{id}/assess — creates a risk assessment.
func (h *RiskHandler) CreateRiskAssessment(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	riskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	var req CreateRiskAssessmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.NewLikelihood == "" || req.NewImpact == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "New likelihood and impact are required")
		return
	}

	assessment, err := h.svc.CreateRiskAssessment(r.Context(), riskID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, assessment)
}

// ListRiskAssessments handles GET /{id}/assessments — returns assessments for a risk.
func (h *RiskHandler) ListRiskAssessments(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	riskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	assessments, err := h.svc.ListRiskAssessments(r.Context(), riskID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, assessments, nil)
}

// EscalateRisk handles POST /{id}/escalate — escalates a risk.
func (h *RiskHandler) EscalateRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	if err := h.svc.EscalateRisk(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
