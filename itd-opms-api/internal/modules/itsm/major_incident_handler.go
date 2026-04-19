package itsm

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type MajorIncidentHandler struct {
	svc *MajorIncidentService
}

func NewMajorIncidentHandler(svc *MajorIncidentService) *MajorIncidentHandler {
	return &MajorIncidentHandler{svc: svc}
}

func (h *MajorIncidentHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.Declare)
	r.With(middleware.RequirePermission("itsm.view")).Get("/", h.List)
	r.With(middleware.RequirePermission("itsm.view")).Get("/active", h.ListActive)
	r.With(middleware.RequirePermission("itsm.view")).Get("/stats", h.Stats)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.Get)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/transition", h.Transition)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/update", h.PostUpdate)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/resolve", h.Resolve)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/pir", h.SubmitPIR)
	r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}/communication-plan", h.UpdateCommunicationPlan)
}

func (h *MajorIncidentHandler) Declare(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req DeclareMajorIncidentWorkflowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	record, err := h.svc.DeclareMajorIncident(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, record)
}

func (h *MajorIncidentHandler) List(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	status := optionalString(r, "status")
	severity := optionalString(r, "severity")
	dateFrom, err := optionalTime(r, "dateFrom", "date_from")
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	dateTo, err := optionalTime(r, "dateTo", "date_to")
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	ticketID := optionalUUIDAny(r, "ticketId", "ticket_id")

	records, total, err := h.svc.ListMajorIncidents(r.Context(), status, severity, dateFrom, dateTo, ticketID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, records, types.NewMeta(total, params))
}

func (h *MajorIncidentHandler) ListActive(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	records, err := h.svc.ListActiveMajorIncidents(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, records, nil)
}

func (h *MajorIncidentHandler) Stats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetMajorIncidentStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, stats, nil)
}

func (h *MajorIncidentHandler) Get(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid major incident ID")
		return
	}

	record, err := h.svc.GetMajorIncidentByID(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, record, nil)
}

func (h *MajorIncidentHandler) Transition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid major incident ID")
		return
	}

	var req TransitionMajorIncidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	record, err := h.svc.TransitionStatus(r.Context(), id, req.TargetStatus)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, record, nil)
}

func (h *MajorIncidentHandler) PostUpdate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid major incident ID")
		return
	}

	var req PostMajorIncidentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	record, err := h.svc.PostStakeholderUpdate(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, record, nil)
}

func (h *MajorIncidentHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid major incident ID")
		return
	}

	var req ResolveMajorIncidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	record, err := h.svc.ResolveMajorIncident(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, record, nil)
}

func (h *MajorIncidentHandler) SubmitPIR(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid major incident ID")
		return
	}

	var req SubmitMajorIncidentPIRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	record, err := h.svc.SubmitPIR(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, record, nil)
}

func (h *MajorIncidentHandler) UpdateCommunicationPlan(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid major incident ID")
		return
	}

	var req UpdateMajorIncidentCommunicationPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	record, err := h.svc.UpdateCommunicationPlan(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, record, nil)
}
