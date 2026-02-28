package calendar

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────

// Handler is the HTTP handler for the calendar module.
type Handler struct {
	svc *CalendarService
}

// NewHandler creates a new calendar Handler.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	return &Handler{
		svc: NewCalendarService(pool, auditSvc),
	}
}

// Routes mounts all calendar endpoints on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("planning.view")).Get("/events", h.GetCalendarEvents)

	r.Route("/maintenance-windows", func(r chi.Router) {
		r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateMaintenanceWindow)
		r.With(middleware.RequirePermission("planning.view")).Get("/{id}", h.GetMaintenanceWindow)
		r.With(middleware.RequirePermission("planning.manage")).Put("/{id}", h.UpdateMaintenanceWindow)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeleteMaintenanceWindow)
	})

	r.Route("/freeze-periods", func(r chi.Router) {
		r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateFreezePeriod)
		r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListFreezePeriods)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeleteFreezePeriod)
	})

	r.With(middleware.RequirePermission("planning.view")).Get("/conflicts", h.CheckConflicts)
}

// writeAppError maps an application error to an appropriate HTTP response.
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

// ──────────────────────────────────────────────
// Calendar Events Handlers
// ──────────────────────────────────────────────

// GetCalendarEvents handles GET /events — returns aggregated calendar events.
func (h *Handler) GetCalendarEvents(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Parse start and end date query parameters.
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr == "" || endStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "start and end query parameters are required")
		return
	}

	start, err := time.Parse(time.RFC3339, startStr)
	if err != nil {
		// Try date-only format.
		start, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid start date format. Use ISO 8601 (YYYY-MM-DD or RFC3339)")
			return
		}
	}

	end, err := time.Parse(time.RFC3339, endStr)
	if err != nil {
		// Try date-only format.
		end, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid end date format. Use ISO 8601 (YYYY-MM-DD or RFC3339)")
			return
		}
		// When using date-only, set end to end of day.
		end = end.Add(24*time.Hour - time.Second)
	}

	// Parse optional event types filter.
	typesParam := r.URL.Query().Get("types")
	eventTypes := parseEventTypes(typesParam)

	events, err := h.svc.GetCalendarEvents(r.Context(), start, end, eventTypes)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, events, nil)
}

// ──────────────────────────────────────────────
// Maintenance Window Handlers
// ──────────────────────────────────────────────

// CreateMaintenanceWindow handles POST /maintenance-windows — creates a new maintenance window.
func (h *Handler) CreateMaintenanceWindow(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateMaintenanceWindowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	if req.StartTime.IsZero() || req.EndTime.IsZero() {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Start time and end time are required")
		return
	}

	if req.EndTime.Before(req.StartTime) {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "End time must be after start time")
		return
	}

	mw, err := h.svc.CreateMaintenanceWindow(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, mw)
}

// GetMaintenanceWindow handles GET /maintenance-windows/{id} — retrieves a single maintenance window.
func (h *Handler) GetMaintenanceWindow(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid maintenance window ID")
		return
	}

	mw, err := h.svc.GetMaintenanceWindow(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, mw, nil)
}

// UpdateMaintenanceWindow handles PUT /maintenance-windows/{id} — updates a maintenance window.
func (h *Handler) UpdateMaintenanceWindow(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid maintenance window ID")
		return
	}

	var req UpdateMaintenanceWindowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	// Validate time range if both are provided.
	if req.StartTime != nil && req.EndTime != nil {
		if req.EndTime.Before(*req.StartTime) {
			types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "End time must be after start time")
			return
		}
	}

	mw, err := h.svc.UpdateMaintenanceWindow(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, mw, nil)
}

// DeleteMaintenanceWindow handles DELETE /maintenance-windows/{id} — deletes a maintenance window.
func (h *Handler) DeleteMaintenanceWindow(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid maintenance window ID")
		return
	}

	if err := h.svc.DeleteMaintenanceWindow(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Freeze Period Handlers
// ──────────────────────────────────────────────

// CreateFreezePeriod handles POST /freeze-periods — creates a new freeze period.
func (h *Handler) CreateFreezePeriod(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateFreezePeriodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	if req.StartTime.IsZero() || req.EndTime.IsZero() {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Start time and end time are required")
		return
	}

	if req.EndTime.Before(req.StartTime) {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "End time must be after start time")
		return
	}

	fp, err := h.svc.CreateFreezePeriod(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, fp)
}

// ListFreezePeriods handles GET /freeze-periods — returns all freeze periods.
func (h *Handler) ListFreezePeriods(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	periods, err := h.svc.ListFreezePeriods(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, periods, nil)
}

// DeleteFreezePeriod handles DELETE /freeze-periods/{id} — deletes a freeze period.
func (h *Handler) DeleteFreezePeriod(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid freeze period ID")
		return
	}

	if err := h.svc.DeleteFreezePeriod(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Conflict Check Handler
// ──────────────────────────────────────────────

// CheckConflicts handles GET /conflicts — checks for overlapping events and freeze periods.
func (h *Handler) CheckConflicts(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr == "" || endStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "start and end query parameters are required")
		return
	}

	start, err := time.Parse(time.RFC3339, startStr)
	if err != nil {
		start, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid start date format")
			return
		}
	}

	end, err := time.Parse(time.RFC3339, endStr)
	if err != nil {
		end, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid end date format")
			return
		}
		end = end.Add(24*time.Hour - time.Second)
	}

	result, err := h.svc.CheckConflicts(r.Context(), start, end)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}
