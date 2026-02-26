package governance

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// PolicyHandler handles HTTP requests for policy management.
type PolicyHandler struct {
	svc *PolicyService
}

// NewPolicyHandler creates a new PolicyHandler.
func NewPolicyHandler(svc *PolicyService) *PolicyHandler {
	return &PolicyHandler{svc: svc}
}

// Routes mounts policy endpoints on the given router.
func (h *PolicyHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("governance.view")).Get("/", h.List)
	r.With(middleware.RequirePermission("governance.manage")).Post("/", h.Create)

	r.Route("/{id}", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.view")).Get("/", h.Get)
		r.With(middleware.RequirePermission("governance.manage")).Put("/", h.Update)
		r.With(middleware.RequirePermission("governance.manage")).Post("/submit", h.Submit)
		r.With(middleware.RequirePermission("governance.manage")).Post("/approve", h.Approve)
		r.With(middleware.RequirePermission("governance.manage")).Post("/publish", h.Publish)
		r.With(middleware.RequirePermission("governance.manage")).Post("/retire", h.Retire)
		r.With(middleware.RequirePermission("governance.view")).Get("/versions", h.ListVersions)
		r.With(middleware.RequirePermission("governance.view")).Get("/diff", h.DiffVersions)
		r.With(middleware.RequirePermission("governance.manage")).Post("/attestation-campaigns", h.LaunchCampaign)
		r.With(middleware.RequirePermission("governance.view")).Get("/attestation-status", h.GetAttestationStatus)
	})

	// Attestation by user (any authenticated user can attest).
	r.Post("/attestations/{attestationId}/attest", h.Attest)
}

// List handles GET / — returns a paginated list of policies.
func (h *PolicyHandler) List(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	category := r.URL.Query().Get("category")
	status := r.URL.Query().Get("status")
	params := types.ParsePagination(r)

	policies, total, err := h.svc.ListPolicies(r.Context(), authCtx.TenantID, category, status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policies, types.NewMeta(total, params))
}

// Create handles POST / — creates a new policy.
func (h *PolicyHandler) Create(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreatePolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	// Validate required fields.
	if req.Title == "" || req.Category == "" || req.Content == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title, category, and content are required")
		return
	}

	policy, err := h.svc.CreatePolicy(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, policy)
}

// Get handles GET /{id} — retrieves a single policy.
func (h *PolicyHandler) Get(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid policy ID")
		return
	}

	policy, err := h.svc.GetPolicy(r.Context(), authCtx.TenantID, policyID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policy, nil)
}

// Update handles PUT /{id} — updates an existing policy.
func (h *PolicyHandler) Update(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid policy ID")
		return
	}

	var req UpdatePolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	policy, err := h.svc.UpdatePolicy(r.Context(), authCtx.TenantID, policyID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policy, nil)
}

// Submit handles POST /{id}/submit — transitions policy to in_review.
func (h *PolicyHandler) Submit(w http.ResponseWriter, r *http.Request) {
	h.transitionStatus(w, r, PolicyStatusInReview)
}

// Approve handles POST /{id}/approve — transitions policy to approved.
func (h *PolicyHandler) Approve(w http.ResponseWriter, r *http.Request) {
	h.transitionStatus(w, r, PolicyStatusApproved)
}

// Publish handles POST /{id}/publish — transitions policy to published.
func (h *PolicyHandler) Publish(w http.ResponseWriter, r *http.Request) {
	h.transitionStatus(w, r, PolicyStatusPublished)
}

// Retire handles POST /{id}/retire — transitions policy to retired.
func (h *PolicyHandler) Retire(w http.ResponseWriter, r *http.Request) {
	h.transitionStatus(w, r, PolicyStatusRetired)
}

// transitionStatus is a shared helper for status transition handlers.
func (h *PolicyHandler) transitionStatus(w http.ResponseWriter, r *http.Request, newStatus string) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid policy ID")
		return
	}

	policy, err := h.svc.UpdateStatus(r.Context(), authCtx.TenantID, policyID, authCtx.UserID, newStatus)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policy, nil)
}

// ListVersions handles GET /{id}/versions — returns version history for a policy.
func (h *PolicyHandler) ListVersions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid policy ID")
		return
	}

	versions, err := h.svc.GetVersionHistory(r.Context(), policyID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, versions, nil)
}

// DiffVersions handles GET /{id}/diff?v1=X&v2=Y — compares two policy versions.
func (h *PolicyHandler) DiffVersions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid policy ID")
		return
	}

	v1Str := r.URL.Query().Get("v1")
	v2Str := r.URL.Query().Get("v2")
	if v1Str == "" || v2Str == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Query parameters v1 and v2 are required")
		return
	}

	v1, err := strconv.Atoi(v1Str)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid version number for v1")
		return
	}

	v2, err := strconv.Atoi(v2Str)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid version number for v2")
		return
	}

	diff, err := h.svc.DiffVersions(r.Context(), policyID, v1, v2)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, diff, nil)
}

// LaunchCampaign handles POST /{id}/attestation-campaigns — creates an attestation campaign.
func (h *PolicyHandler) LaunchCampaign(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid policy ID")
		return
	}

	var req LaunchCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.TargetScope == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Target scope is required")
		return
	}

	if req.DueDate.IsZero() {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Due date is required")
		return
	}

	campaign, err := h.svc.LaunchAttestationCampaign(r.Context(), authCtx.TenantID, policyID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, campaign)
}

// GetAttestationStatus handles GET /{id}/attestation-status — returns attestation summary.
func (h *PolicyHandler) GetAttestationStatus(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policyID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid policy ID")
		return
	}

	status, err := h.svc.GetAttestationStatus(r.Context(), policyID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, status, nil)
}

// Attest handles POST /attestations/{attestationId}/attest — user attests to a policy.
func (h *PolicyHandler) Attest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	attestationID, err := uuid.Parse(chi.URLParam(r, "attestationId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid attestation ID")
		return
	}

	if err := h.svc.AttestPolicy(r.Context(), attestationID, authCtx.UserID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

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
