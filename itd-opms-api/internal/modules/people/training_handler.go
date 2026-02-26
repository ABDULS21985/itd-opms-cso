package people

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// TrainingHandler
// ──────────────────────────────────────────────

// TrainingHandler handles HTTP requests for training records and certification tracking.
type TrainingHandler struct {
	svc *TrainingService
}

// NewTrainingHandler creates a new TrainingHandler.
func NewTrainingHandler(svc *TrainingService) *TrainingHandler {
	return &TrainingHandler{svc: svc}
}

// Routes mounts training endpoints on the given router.
func (h *TrainingHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("people.view")).Get("/", h.ListTrainingRecords)
	r.With(middleware.RequirePermission("people.view")).Get("/expiring", h.GetExpiringCertifications)
	r.With(middleware.RequirePermission("people.view")).Get("/{id}", h.GetTrainingRecord)
	r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateTrainingRecord)
	r.With(middleware.RequirePermission("people.manage")).Put("/{id}", h.UpdateTrainingRecord)
	r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteTrainingRecord)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListTrainingRecords handles GET / — returns a paginated list of training records.
func (h *TrainingHandler) ListTrainingRecords(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var userID *uuid.UUID
	if v := r.URL.Query().Get("user_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user_id")
			return
		}
		userID = &parsed
	}

	var trainingType *string
	if v := r.URL.Query().Get("type"); v != "" {
		trainingType = &v
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	params := types.ParsePagination(r)

	records, total, err := h.svc.ListTrainingRecords(r.Context(), userID, trainingType, status, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, records, types.NewMeta(int64(total), params))
}

// GetExpiringCertifications handles GET /expiring — returns certifications expiring within N days.
func (h *TrainingHandler) GetExpiringCertifications(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	days := 90
	if v := r.URL.Query().Get("days"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			days = parsed
		}
	}

	records, err := h.svc.GetExpiringCertifications(r.Context(), days)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, records, nil)
}

// GetTrainingRecord handles GET /{id} — retrieves a single training record.
func (h *TrainingHandler) GetTrainingRecord(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid training record ID")
		return
	}

	record, err := h.svc.GetTrainingRecord(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, record, nil)
}

// CreateTrainingRecord handles POST / — creates a new training record.
func (h *TrainingHandler) CreateTrainingRecord(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateTrainingRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.Type == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title and type are required")
		return
	}

	record, err := h.svc.CreateTrainingRecord(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, record)
}

// UpdateTrainingRecord handles PUT /{id} — updates a training record.
func (h *TrainingHandler) UpdateTrainingRecord(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid training record ID")
		return
	}

	var req UpdateTrainingRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	record, err := h.svc.UpdateTrainingRecord(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, record, nil)
}

// DeleteTrainingRecord handles DELETE /{id} — deletes a training record.
func (h *TrainingHandler) DeleteTrainingRecord(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid training record ID")
		return
	}

	if err := h.svc.DeleteTrainingRecord(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
