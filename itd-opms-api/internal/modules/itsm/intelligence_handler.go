package itsm

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// IntelligenceHandler exposes deterministic assistance APIs for ITSM operators.
type IntelligenceHandler struct {
	svc *IntelligenceService
}

func NewIntelligenceHandler(svc *IntelligenceService) *IntelligenceHandler {
	return &IntelligenceHandler{svc: svc}
}

func (h *IntelligenceHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Post("/triage", h.SuggestTriage)
	r.With(middleware.RequirePermission("itsm.view")).Post("/copilot", h.GenerateCopilot)
	r.With(middleware.RequirePermission("itsm.view")).Post("/workflow-simulation", h.SimulateWorkflow)
	r.With(middleware.RequirePermission("itsm.view")).Get("/impact-map", h.GetImpactMap)
	r.With(middleware.RequirePermission("itsm.view")).Get("/process-mining", h.GetProcessMining)
	r.With(middleware.RequirePermission("itsm.view")).Post("/evidence-pack", h.GenerateEvidencePack)
	r.With(middleware.RequirePermission("itsm.view")).Post("/sla-forecast", h.ForecastSLA)
	r.With(middleware.RequirePermission("itsm.view")).Post("/playbooks/preview", h.PreviewPlaybook)
	r.With(middleware.RequirePermission("itsm.view")).Get("/operations-snapshot", h.GetOperationsSnapshot)
}

func (h *IntelligenceHandler) SuggestTriage(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	var req TriageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	result, err := h.svc.SuggestTriage(r.Context(), auth, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) GenerateCopilot(w http.ResponseWriter, r *http.Request) {
	var req CopilotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	result, err := h.svc.GenerateCopilot(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) SimulateWorkflow(w http.ResponseWriter, r *http.Request) {
	var req WorkflowSimulationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	result, err := h.svc.SimulateWorkflow(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) GetImpactMap(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	entityType := r.URL.Query().Get("entityType")
	entityID, err := uuid.Parse(r.URL.Query().Get("entityId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entity ID")
		return
	}
	result, err := h.svc.BuildImpactMap(r.Context(), auth, entityType, entityID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) GetProcessMining(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	result, err := h.svc.GetProcessMining(r.Context(), auth)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) GenerateEvidencePack(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	var req ITSMEvidencePackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	result, err := h.svc.GenerateEvidencePack(r.Context(), auth, req)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid evidence pack request")
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) ForecastSLA(w http.ResponseWriter, r *http.Request) {
	var req SLAForecastRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	result, err := h.svc.ForecastSLA(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) PreviewPlaybook(w http.ResponseWriter, r *http.Request) {
	var req PlaybookPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	result, err := h.svc.PreviewPlaybook(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}

func (h *IntelligenceHandler) GetOperationsSnapshot(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	result, err := h.svc.GetOperationsSnapshot(r.Context(), auth)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, result, nil)
}
