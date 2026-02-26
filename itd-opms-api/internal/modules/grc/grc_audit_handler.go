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
// AuditMgmtHandler
// ──────────────────────────────────────────────

// AuditMgmtHandler handles HTTP requests for GRC audit management,
// findings, and evidence collections.
type AuditMgmtHandler struct {
	svc *AuditMgmtService
}

// NewAuditMgmtHandler creates a new AuditMgmtHandler.
func NewAuditMgmtHandler(svc *AuditMgmtService) *AuditMgmtHandler {
	return &AuditMgmtHandler{svc: svc}
}

// Routes mounts audit management endpoints on the given router.
func (h *AuditMgmtHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("grc.view")).Get("/", h.ListAudits)
	r.With(middleware.RequirePermission("grc.view")).Get("/{id}", h.GetAudit)
	r.With(middleware.RequirePermission("grc.manage")).Post("/", h.CreateAudit)
	r.With(middleware.RequirePermission("grc.manage")).Put("/{id}", h.UpdateAudit)
	r.With(middleware.RequirePermission("grc.manage")).Delete("/{id}", h.DeleteAudit)

	// Findings
	r.Route("/{auditId}/findings", func(r chi.Router) {
		r.With(middleware.RequirePermission("grc.view")).Get("/", h.ListFindings)
		r.With(middleware.RequirePermission("grc.view")).Get("/{findingId}", h.GetFinding)
		r.With(middleware.RequirePermission("grc.manage")).Post("/", h.CreateFinding)
		r.With(middleware.RequirePermission("grc.manage")).Put("/{findingId}", h.UpdateFinding)
		r.With(middleware.RequirePermission("grc.manage")).Post("/{findingId}/close", h.CloseFinding)
	})

	// Evidence Collections
	r.Route("/{auditId}/evidence", func(r chi.Router) {
		r.With(middleware.RequirePermission("grc.view")).Get("/", h.ListEvidenceCollections)
		r.With(middleware.RequirePermission("grc.view")).Get("/{evidenceId}", h.GetEvidenceCollection)
		r.With(middleware.RequirePermission("grc.manage")).Post("/", h.CreateEvidenceCollection)
		r.With(middleware.RequirePermission("grc.manage")).Put("/{evidenceId}", h.UpdateEvidenceCollection)
		r.With(middleware.RequirePermission("grc.manage")).Post("/{evidenceId}/approve", h.ApproveEvidenceCollection)
	})

	// Readiness
	r.With(middleware.RequirePermission("grc.view")).Get("/{id}/readiness", h.GetReadinessScore)
}

// ──────────────────────────────────────────────
// Audit Handlers
// ──────────────────────────────────────────────

// ListAudits handles GET / — returns a paginated list of GRC audits.
func (h *AuditMgmtHandler) ListAudits(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	var auditType *string
	if v := r.URL.Query().Get("audit_type"); v != "" {
		auditType = &v
	}

	params := types.ParsePagination(r)

	audits, total, err := h.svc.ListAudits(r.Context(), status, auditType, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, audits, types.NewMeta(int64(total), params))
}

// GetAudit handles GET /{id} — retrieves a single GRC audit.
func (h *AuditMgmtHandler) GetAudit(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	audit, err := h.svc.GetAudit(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, audit, nil)
}

// CreateAudit handles POST / — creates a new GRC audit.
func (h *AuditMgmtHandler) CreateAudit(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateAuditRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.AuditType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title and audit type are required")
		return
	}

	audit, err := h.svc.CreateAudit(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, audit)
}

// UpdateAudit handles PUT /{id} — updates a GRC audit.
func (h *AuditMgmtHandler) UpdateAudit(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	var req UpdateAuditRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	audit, err := h.svc.UpdateAudit(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, audit, nil)
}

// DeleteAudit handles DELETE /{id} — deletes a GRC audit.
func (h *AuditMgmtHandler) DeleteAudit(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	if err := h.svc.DeleteAudit(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Finding Handlers
// ──────────────────────────────────────────────

// ListFindings handles GET /{auditId}/findings — returns findings for an audit.
func (h *AuditMgmtHandler) ListFindings(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	auditID, err := uuid.Parse(chi.URLParam(r, "auditId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	params := types.ParsePagination(r)

	findings, total, err := h.svc.ListFindings(r.Context(), auditID, status, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, findings, types.NewMeta(int64(total), params))
}

// GetFinding handles GET /{auditId}/findings/{findingId} — retrieves a single finding.
func (h *AuditMgmtHandler) GetFinding(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	findingID, err := uuid.Parse(chi.URLParam(r, "findingId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid finding ID")
		return
	}

	finding, err := h.svc.GetFinding(r.Context(), findingID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, finding, nil)
}

// CreateFinding handles POST /{auditId}/findings — creates a new finding.
func (h *AuditMgmtHandler) CreateFinding(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	auditID, err := uuid.Parse(chi.URLParam(r, "auditId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	var req CreateAuditFindingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.Severity == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title and severity are required")
		return
	}

	finding, err := h.svc.CreateFinding(r.Context(), auditID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, finding)
}

// UpdateFinding handles PUT /{auditId}/findings/{findingId} — updates a finding.
func (h *AuditMgmtHandler) UpdateFinding(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	findingID, err := uuid.Parse(chi.URLParam(r, "findingId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid finding ID")
		return
	}

	var req UpdateAuditFindingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	finding, err := h.svc.UpdateFinding(r.Context(), findingID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, finding, nil)
}

// CloseFinding handles POST /{auditId}/findings/{findingId}/close — closes a finding.
func (h *AuditMgmtHandler) CloseFinding(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	findingID, err := uuid.Parse(chi.URLParam(r, "findingId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid finding ID")
		return
	}

	if err := h.svc.CloseFinding(r.Context(), findingID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Evidence Collection Handlers
// ──────────────────────────────────────────────

// ListEvidenceCollections handles GET /{auditId}/evidence — returns evidence collections.
func (h *AuditMgmtHandler) ListEvidenceCollections(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	auditID, err := uuid.Parse(chi.URLParam(r, "auditId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	collections, err := h.svc.ListEvidenceCollections(r.Context(), auditID, status)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, collections, nil)
}

// GetEvidenceCollection handles GET /{auditId}/evidence/{evidenceId} — retrieves a collection.
func (h *AuditMgmtHandler) GetEvidenceCollection(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	evidenceID, err := uuid.Parse(chi.URLParam(r, "evidenceId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid evidence collection ID")
		return
	}

	collection, err := h.svc.GetEvidenceCollection(r.Context(), evidenceID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, collection, nil)
}

// CreateEvidenceCollection handles POST /{auditId}/evidence — creates a new evidence collection.
func (h *AuditMgmtHandler) CreateEvidenceCollection(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	auditID, err := uuid.Parse(chi.URLParam(r, "auditId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	var req CreateEvidenceCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	collection, err := h.svc.CreateEvidenceCollection(r.Context(), auditID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, collection)
}

// UpdateEvidenceCollection handles PUT /{auditId}/evidence/{evidenceId} — updates a collection.
func (h *AuditMgmtHandler) UpdateEvidenceCollection(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	evidenceID, err := uuid.Parse(chi.URLParam(r, "evidenceId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid evidence collection ID")
		return
	}

	var req UpdateEvidenceCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	collection, err := h.svc.UpdateEvidenceCollection(r.Context(), evidenceID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, collection, nil)
}

// ApproveEvidenceCollection handles POST /{auditId}/evidence/{evidenceId}/approve — approves a collection.
func (h *AuditMgmtHandler) ApproveEvidenceCollection(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	evidenceID, err := uuid.Parse(chi.URLParam(r, "evidenceId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid evidence collection ID")
		return
	}

	if err := h.svc.ApproveEvidenceCollection(r.Context(), evidenceID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Readiness Handler
// ──────────────────────────────────────────────

// GetReadinessScore handles GET /{id}/readiness — returns the audit readiness score.
func (h *AuditMgmtHandler) GetReadinessScore(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	auditID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit ID")
		return
	}

	score, err := h.svc.CalculateReadinessScore(r.Context(), auditID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]any{"auditId": auditID, "readinessScore": score}, nil)
}
