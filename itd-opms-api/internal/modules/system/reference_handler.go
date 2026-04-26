package system

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type ReferenceHandler struct {
	svc *ReferenceService
}

func NewReferenceHandler(svc *ReferenceService) *ReferenceHandler {
	return &ReferenceHandler{svc: svc}
}

func (h *ReferenceHandler) Routes(r chi.Router) {
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Deactivate)
}

func (h *ReferenceHandler) List(w http.ResponseWriter, r *http.Request) {
	domain := r.URL.Query().Get("domain")
	includeInactive := r.URL.Query().Get("includeInactive") == "true"
	items, err := h.svc.List(r.Context(), domain, includeInactive)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, items, nil)
}

func (h *ReferenceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateReferenceDataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	item, err := h.svc.Create(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, item)
}

func (h *ReferenceHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid reference data ID")
		return
	}
	var req UpdateReferenceDataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	item, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, item, nil)
}

func (h *ReferenceHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid reference data ID")
		return
	}
	if err := h.svc.Deactivate(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}
	types.NoContent(w)
}
