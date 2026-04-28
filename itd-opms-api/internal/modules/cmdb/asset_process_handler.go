package cmdb

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type AssetProcessHandler struct {
	svc *AssetProcessService
}

func NewAssetProcessHandler(svc *AssetProcessService) *AssetProcessHandler {
	return &AssetProcessHandler{svc: svc}
}

func (h *AssetProcessHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListRuns)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/stats", h.GetStats)
	r.With(middleware.RequirePermission("cmdb.asset_process.manage")).Post("/", h.CreateRun)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetRun)
	r.With(middleware.RequirePermission("cmdb.asset_process.manage")).Put("/{id}", h.UpdateRun)
	r.With(middleware.RequirePermission("cmdb.asset_process.manage")).Post("/{id}/transition", h.TransitionRun)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}/events", h.ListEvents)
}

func (h *AssetProcessHandler) ListRuns(w http.ResponseWriter, r *http.Request) {
	params := types.ParsePagination(r)
	var processType, status *string
	if value := r.URL.Query().Get("processType"); value != "" {
		processType = &value
	}
	if value := r.URL.Query().Get("status"); value != "" {
		status = &value
	}
	runs, total, err := h.svc.ListRuns(r.Context(), processType, status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, runs, types.NewMeta(total, params))
}

func (h *AssetProcessHandler) GetRun(w http.ResponseWriter, r *http.Request) {
	id, ok := parseAssetProcessID(w, r, "id")
	if !ok {
		return
	}
	run, err := h.svc.GetRun(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, run, nil)
}

func (h *AssetProcessHandler) CreateRun(w http.ResponseWriter, r *http.Request) {
	var req CreateAssetProcessRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	run, err := h.svc.CreateRun(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, run)
}

func (h *AssetProcessHandler) UpdateRun(w http.ResponseWriter, r *http.Request) {
	id, ok := parseAssetProcessID(w, r, "id")
	if !ok {
		return
	}
	var req UpdateAssetProcessRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	run, err := h.svc.UpdateRun(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, run, nil)
}

func (h *AssetProcessHandler) TransitionRun(w http.ResponseWriter, r *http.Request) {
	id, ok := parseAssetProcessID(w, r, "id")
	if !ok {
		return
	}
	var req TransitionAssetProcessRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	run, err := h.svc.TransitionRun(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, run, nil)
}

func (h *AssetProcessHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	id, ok := parseAssetProcessID(w, r, "id")
	if !ok {
		return
	}
	events, err := h.svc.ListEvents(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, events, nil)
}

func (h *AssetProcessHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, stats, nil)
}

func parseAssetProcessID(w http.ResponseWriter, r *http.Request, key string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, key))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return uuid.Nil, false
	}
	return id, true
}
