package ssa

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// WorkflowHandler handles HTTP requests for SSA workflow transitions.
type WorkflowHandler struct {
	wfSvc  *WorkflowService
	reqSvc *RequestService
}

// NewWorkflowHandler creates a new WorkflowHandler.
func NewWorkflowHandler(wfSvc *WorkflowService, reqSvc *RequestService) *WorkflowHandler {
	return &WorkflowHandler{wfSvc: wfSvc, reqSvc: reqSvc}
}

// RequestRoutes mounts workflow action routes under /requests/{id}.
func (h *WorkflowHandler) RequestRoutes(r chi.Router) {
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/endorse", h.SubmitEndorsement)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/asd-assessment", h.SubmitASDAssessment)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/qcmd-analysis", h.SubmitQCMDAnalysis)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/approve", h.SubmitApproval)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/san-provisioning", h.SubmitSANProvisioning)
	r.With(middleware.RequirePermission("ssa.manage")).Post("/{id}/dco-server", h.SubmitDCOServer)
	r.With(middleware.RequirePermission("ssa.view")).Get("/{id}/approvals", h.ListApprovals)
	r.With(middleware.RequirePermission("ssa.view")).Get("/{id}/audit-log", h.ListAuditLog)
}

// QueueRoutes mounts queue endpoints under /queue.
func (h *WorkflowHandler) QueueRoutes(r chi.Router) {
	r.With(middleware.RequirePermission("ssa.manage")).Get("/endorsements", h.ListEndorsementQueue)
	r.With(middleware.RequirePermission("ssa.manage")).Get("/asd-assessments", h.ListASDQueue)
	r.With(middleware.RequirePermission("ssa.manage")).Get("/qcmd-analyses", h.ListQCMDQueue)
	r.With(middleware.RequirePermission("ssa.manage")).Get("/approvals", h.ListApprovalQueue)
	r.With(middleware.RequirePermission("ssa.manage")).Get("/san-provisioning", h.ListSANQueue)
	r.With(middleware.RequirePermission("ssa.manage")).Get("/dco-servers", h.ListDCOQueue)
}

// SubmitEndorsement handles POST /requests/{id}/endorse
func (h *WorkflowHandler) SubmitEndorsement(w http.ResponseWriter, r *http.Request) {
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

	var dto EndorsementDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if dto.Decision == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Decision is required")
		return
	}

	request, err := h.wfSvc.SubmitEndorsement(r.Context(), id, dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// SubmitASDAssessment handles POST /requests/{id}/asd-assessment
func (h *WorkflowHandler) SubmitASDAssessment(w http.ResponseWriter, r *http.Request) {
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

	var dto ASDAssessmentDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if dto.AssessmentOutcome == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Assessment outcome is required")
		return
	}

	request, err := h.wfSvc.SubmitASDAssessment(r.Context(), id, dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// SubmitQCMDAnalysis handles POST /requests/{id}/qcmd-analysis
func (h *WorkflowHandler) SubmitQCMDAnalysis(w http.ResponseWriter, r *http.Request) {
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

	var dto QCMDAnalysisDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if dto.ServerReference == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Server reference is required")
		return
	}

	request, err := h.wfSvc.SubmitQCMDAnalysis(r.Context(), id, dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// SubmitApproval handles POST /requests/{id}/approve
func (h *WorkflowHandler) SubmitApproval(w http.ResponseWriter, r *http.Request) {
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

	var dto ApprovalDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if dto.Decision == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Decision is required")
		return
	}

	request, err := h.wfSvc.SubmitApproval(r.Context(), id, dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// SubmitSANProvisioning handles POST /requests/{id}/san-provisioning
func (h *WorkflowHandler) SubmitSANProvisioning(w http.ResponseWriter, r *http.Request) {
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

	var dto SANProvisioningDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if dto.Port == "" || dto.CU == "" || dto.LDEV == "" || dto.LUN == "" || dto.ACP == "" || dto.SizeAllocated == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "All SAN provisioning fields are required")
		return
	}

	request, err := h.wfSvc.SubmitSANProvisioning(r.Context(), id, dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// SubmitDCOServer handles POST /requests/{id}/dco-server
func (h *WorkflowHandler) SubmitDCOServer(w http.ResponseWriter, r *http.Request) {
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

	var dto DCOServerDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if dto.ServerName == "" || dto.IPAddress == "" || dto.Zone == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Server name, IP address, and zone are required")
		return
	}

	request, err := h.wfSvc.SubmitDCOServer(r.Context(), id, dto)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, request, nil)
}

// ListApprovals handles GET /requests/{id}/approvals
func (h *WorkflowHandler) ListApprovals(w http.ResponseWriter, r *http.Request) {
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

	approvals, err := h.wfSvc.ListApprovals(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, approvals, nil)
}

// ListAuditLog handles GET /requests/{id}/audit-log
func (h *WorkflowHandler) ListAuditLog(w http.ResponseWriter, r *http.Request) {
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

	logs, err := h.wfSvc.ListAuditLog(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, logs, nil)
}

// ──────────────────────────────────────────────
// Queue endpoints
// ──────────────────────────────────────────────

// ListEndorsementQueue handles GET /queue/endorsements
func (h *WorkflowHandler) ListEndorsementQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	requests, total, err := h.wfSvc.ListEndorsementQueue(r.Context(), params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// ListASDQueue handles GET /queue/asd-assessments
func (h *WorkflowHandler) ListASDQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	requests, total, err := h.wfSvc.ListASDQueue(r.Context(), params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// ListQCMDQueue handles GET /queue/qcmd-analyses
func (h *WorkflowHandler) ListQCMDQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	requests, total, err := h.wfSvc.ListQCMDQueue(r.Context(), params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// ListApprovalQueue handles GET /queue/approvals
func (h *WorkflowHandler) ListApprovalQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	stage := optionalString(r, "stage")
	requests, total, err := h.wfSvc.ListApprovalQueue(r.Context(), stage, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// ListSANQueue handles GET /queue/san-provisioning
func (h *WorkflowHandler) ListSANQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	requests, total, err := h.wfSvc.ListSANQueue(r.Context(), params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}

// ListDCOQueue handles GET /queue/dco-servers
func (h *WorkflowHandler) ListDCOQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	requests, total, err := h.wfSvc.ListDCOQueue(r.Context(), params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, requests, types.NewMeta(total, params))
}
