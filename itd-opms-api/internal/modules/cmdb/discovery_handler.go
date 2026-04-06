package cmdb

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// DiscoveryHandler handles HTTP requests for CMDB discovery profiles, runs, and reconciliation.
type DiscoveryHandler struct {
	svc *DiscoveryService
}

// NewDiscoveryHandler creates a new DiscoveryHandler.
func NewDiscoveryHandler(svc *DiscoveryService) *DiscoveryHandler {
	return &DiscoveryHandler{svc: svc}
}

// Routes registers all discovery routes on the given chi.Router.
func (h *DiscoveryHandler) Routes(r chi.Router) {
	// Stats.
	r.With(middleware.RequirePermission("cmdb.view")).Get("/stats", h.GetDiscoveryStats)

	// CSV import.
	r.With(middleware.RequirePermission("cmdb.discovery")).Post("/import-csv", h.ImportCSV)

	// Profiles.
	r.Route("/profiles", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListProfiles)
		r.With(middleware.RequirePermission("cmdb.discovery")).Post("/", h.CreateProfile)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetProfile)
		r.With(middleware.RequirePermission("cmdb.discovery")).Put("/{id}", h.UpdateProfile)
		r.With(middleware.RequirePermission("cmdb.discovery")).Delete("/{id}", h.DeleteProfile)
		r.With(middleware.RequirePermission("cmdb.discovery")).Post("/{id}/run", h.TriggerRun)
	})

	// Runs.
	r.Route("/runs", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListRuns)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetRun)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}/devices", h.GetRunDevices)
		r.With(middleware.RequirePermission("cmdb.discovery")).Post("/{id}/reconcile", h.ReconcileRun)
	})
}

// ──────────────────────────────────────────────
// Profile handlers
// ──────────────────────────────────────────────

// ListProfiles handles GET /discovery/profiles — returns a paginated list of profiles.
func (h *DiscoveryHandler) ListProfiles(w http.ResponseWriter, r *http.Request) {
	params := types.ParsePagination(r)
	var scanType *string
	if v := r.URL.Query().Get("scanType"); v != "" {
		scanType = &v
	}
	var isActive *bool
	if v := r.URL.Query().Get("isActive"); v != "" {
		b := v == "true"
		isActive = &b
	}

	profiles, total, err := h.svc.ListProfiles(r.Context(), scanType, isActive, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, profiles, &types.Meta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: int((total + int64(params.Limit) - 1) / int64(params.Limit)),
	})
}

// CreateProfile handles POST /discovery/profiles — creates a new profile.
func (h *DiscoveryHandler) CreateProfile(w http.ResponseWriter, r *http.Request) {
	var req CreateDiscoveryProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION", "name is required")
		return
	}
	if req.ScanType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION", "scanType is required")
		return
	}

	profile, err := h.svc.CreateProfile(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, profile)
}

// GetProfile handles GET /discovery/profiles/{id} — retrieves a single profile.
func (h *DiscoveryHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid profile ID")
		return
	}

	profile, err := h.svc.GetProfile(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, profile, nil)
}

// UpdateProfile handles PUT /discovery/profiles/{id} — updates a profile.
func (h *DiscoveryHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid profile ID")
		return
	}

	var req UpdateDiscoveryProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}

	profile, err := h.svc.UpdateProfile(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, profile, nil)
}

// DeleteProfile handles DELETE /discovery/profiles/{id}.
func (h *DiscoveryHandler) DeleteProfile(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid profile ID")
		return
	}

	if err := h.svc.DeleteProfile(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// TriggerRun handles POST /discovery/profiles/{id}/run — triggers a discovery scan.
func (h *DiscoveryHandler) TriggerRun(w http.ResponseWriter, r *http.Request) {
	profileID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid profile ID")
		return
	}

	run, err := h.svc.TriggerRun(r.Context(), profileID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, run)
}

// ──────────────────────────────────────────────
// Run handlers
// ──────────────────────────────────────────────

// ListRuns handles GET /discovery/runs — returns a paginated list of runs.
func (h *DiscoveryHandler) ListRuns(w http.ResponseWriter, r *http.Request) {
	params := types.ParsePagination(r)

	var profileID *uuid.UUID
	if v := r.URL.Query().Get("profileId"); v != "" {
		parsed, err := uuid.Parse(v)
		if err == nil {
			profileID = &parsed
		}
	}
	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	runs, total, err := h.svc.ListRuns(r.Context(), profileID, status, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, runs, &types.Meta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: int((total + int64(params.Limit) - 1) / int64(params.Limit)),
	})
}

// GetRun handles GET /discovery/runs/{id} — retrieves a single run.
func (h *DiscoveryHandler) GetRun(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid run ID")
		return
	}

	run, err := h.svc.GetRun(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, run, nil)
}

// GetRunDevices handles GET /discovery/runs/{id}/devices — returns discovered devices.
func (h *DiscoveryHandler) GetRunDevices(w http.ResponseWriter, r *http.Request) {
	runID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid run ID")
		return
	}

	params := types.ParsePagination(r)
	var action *string
	if v := r.URL.Query().Get("action"); v != "" {
		action = &v
	}

	devices, total, err := h.svc.GetRunDevices(r.Context(), runID, action, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, devices, &types.Meta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: int((total + int64(params.Limit) - 1) / int64(params.Limit)),
	})
}

// ReconcileRun handles POST /discovery/runs/{id}/reconcile — applies changes to CMDB.
func (h *DiscoveryHandler) ReconcileRun(w http.ResponseWriter, r *http.Request) {
	runID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid run ID")
		return
	}

	var req ReconcileDiscoveryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	if len(req.DeviceIDs) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION", "deviceIds is required")
		return
	}

	run, err := h.svc.ReconcileRun(r.Context(), runID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, run, nil)
}

// ──────────────────────────────────────────────
// CSV Import handler
// ──────────────────────────────────────────────

// ImportCSV handles POST /discovery/import-csv — parses CSV and creates a discovery run.
func (h *DiscoveryHandler) ImportCSV(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxCSVFileSize+1024)
	if err := r.ParseMultipartForm(maxCSVFileSize); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid file upload")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "file is required")
		return
	}
	defer file.Close()

	// Optional profile ID.
	var profileID *uuid.UUID
	if v := r.FormValue("profileId"); v != "" {
		parsed, err := uuid.Parse(v)
		if err == nil {
			profileID = &parsed
		}
	}

	run, err := h.svc.ImportCSV(r.Context(), file, header, profileID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, run)
}

// ──────────────────────────────────────────────
// Stats handler
// ──────────────────────────────────────────────

// GetDiscoveryStats handles GET /discovery/stats — returns discovery dashboard stats.
func (h *DiscoveryHandler) GetDiscoveryStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetDiscoveryStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}
