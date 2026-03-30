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

// SLAManagementHandler handles OLA, UC, and dependency chain HTTP endpoints.
type SLAManagementHandler struct {
	svc *SLAManagementService
}

// NewSLAManagementHandler creates a new SLAManagementHandler.
func NewSLAManagementHandler(svc *SLAManagementService) *SLAManagementHandler {
	return &SLAManagementHandler{svc: svc}
}

// Routes mounts OLA/UC endpoints on the given router.
func (h *SLAManagementHandler) Routes(r chi.Router) {
	// Operational Level Agreements
	r.Route("/olas", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListOLAs)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetOLA)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateOLA)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateOLA)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteOLA)
	})

	// Underpinning Contracts
	r.Route("/underpinning-contracts", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListUCs)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetUC)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateUC)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateUC)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteUC)
	})

	// SLA Dependency Chain
	r.Route("/sla/dependency-chain", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/{slaId}", h.GetDependencyChain)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateDependencyChainEntry)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteDependencyChainEntry)
	})

	// Consistency check & expiring
	r.With(middleware.RequirePermission("itsm.view")).Get("/sla/consistency-check", h.CheckConsistency)
	r.With(middleware.RequirePermission("itsm.view")).Get("/sla/expiring", h.ListExpiring)
}

/* ================================================================== */
/*  OLA Handlers                                                       */
/* ================================================================== */

func (h *SLAManagementHandler) ListOLAs(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	olas, err := h.svc.ListOLAs(r.Context(), status)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, olas, nil)
}

func (h *SLAManagementHandler) GetOLA(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid OLA ID")
		return
	}
	ola, err := h.svc.GetOLA(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, ola, nil)
}

func (h *SLAManagementHandler) CreateOLA(w http.ResponseWriter, r *http.Request) {
	var req CreateOLARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.Name == "" || req.ResponseTargetMinutes <= 0 || req.ResolutionTargetMinutes <= 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Name, responseTargetMinutes, and resolutionTargetMinutes are required")
		return
	}

	ola, err := h.svc.CreateOLA(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, ola)
}

func (h *SLAManagementHandler) UpdateOLA(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid OLA ID")
		return
	}
	var req UpdateOLARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	ola, err := h.svc.UpdateOLA(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, ola, nil)
}

func (h *SLAManagementHandler) DeleteOLA(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid OLA ID")
		return
	}
	if err := h.svc.DeleteOLA(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}
	types.NoContent(w)
}

/* ================================================================== */
/*  UC Handlers                                                        */
/* ================================================================== */

func (h *SLAManagementHandler) ListUCs(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	ucs, err := h.svc.ListUCs(r.Context(), status)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, ucs, nil)
}

func (h *SLAManagementHandler) GetUC(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid UC ID")
		return
	}
	uc, err := h.svc.GetUC(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, uc, nil)
}

func (h *SLAManagementHandler) CreateUC(w http.ResponseWriter, r *http.Request) {
	var req CreateUCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.Name == "" || req.ResponseTargetMinutes <= 0 || req.ResolutionTargetMinutes <= 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Name, responseTargetMinutes, and resolutionTargetMinutes are required")
		return
	}

	uc, err := h.svc.CreateUC(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, uc)
}

func (h *SLAManagementHandler) UpdateUC(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid UC ID")
		return
	}
	var req UpdateUCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	uc, err := h.svc.UpdateUC(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, uc, nil)
}

func (h *SLAManagementHandler) DeleteUC(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid UC ID")
		return
	}
	if err := h.svc.DeleteUC(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}
	types.NoContent(w)
}

/* ================================================================== */
/*  Dependency Chain / Consistency / Expiring                           */
/* ================================================================== */

func (h *SLAManagementHandler) GetDependencyChain(w http.ResponseWriter, r *http.Request) {
	slaID, err := uuid.Parse(chi.URLParam(r, "slaId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid SLA ID")
		return
	}
	chain, err := h.svc.GetDependencyChain(r.Context(), slaID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, chain, nil)
}

func (h *SLAManagementHandler) CreateDependencyChainEntry(w http.ResponseWriter, r *http.Request) {
	var req CreateDependencyChainRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.SLAPolicyID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "slaPolicyId is required")
		return
	}
	if err := h.svc.CreateDependencyChainEntry(r.Context(), req); err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, map[string]string{"message": "dependency chain entry created"})
}

func (h *SLAManagementHandler) DeleteDependencyChainEntry(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return
	}
	if err := h.svc.DeleteDependencyChainEntry(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}
	types.NoContent(w)
}

func (h *SLAManagementHandler) CheckConsistency(w http.ResponseWriter, r *http.Request) {
	violations, err := h.svc.CheckConsistency(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, violations, nil)
}

func (h *SLAManagementHandler) ListExpiring(w http.ResponseWriter, r *http.Request) {
	days := 30
	if v := r.URL.Query().Get("days"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			days = parsed
		}
	}

	olas, ucs, err := h.svc.ListExpiring(r.Context(), days)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]any{
		"olas": olas,
		"ucs":  ucs,
		"days": days,
	}, nil)
}
