package cmdb

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// WarrantyHandler
// ──────────────────────────────────────────────

// WarrantyHandler handles HTTP requests for warranties and renewal alerts.
type WarrantyHandler struct {
	svc *WarrantyService
}

// NewWarrantyHandler creates a new WarrantyHandler.
func NewWarrantyHandler(svc *WarrantyService) *WarrantyHandler {
	return &WarrantyHandler{svc: svc}
}

// WarrantyRoutes mounts warranty endpoints on the given router.
func (h *WarrantyHandler) WarrantyRoutes(r chi.Router) {
	r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListWarranties)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/expiring", h.GetExpiringWarranties)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetWarranty)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateWarranty)
	r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}", h.UpdateWarranty)
	r.With(middleware.RequirePermission("cmdb.manage")).Delete("/{id}", h.DeleteWarranty)
}

// AlertRoutes mounts renewal alert endpoints on the given router.
func (h *WarrantyHandler) AlertRoutes(r chi.Router) {
	r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListPendingAlerts)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateRenewalAlert)
	r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}/sent", h.MarkAlertSent)
}

// ──────────────────────────────────────────────
// Warranty Handlers
// ──────────────────────────────────────────────

// ListWarranties handles GET /warranties — returns a filtered, paginated list of warranties.
func (h *WarrantyHandler) ListWarranties(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	renewalStatus := optionalString(r, "renewalStatus")

	warranties, total, err := h.svc.ListWarranties(r.Context(), renewalStatus, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, warranties, types.NewMeta(total, params))
}

// GetExpiringWarranties handles GET /warranties/expiring — returns warranties expiring within N days.
func (h *WarrantyHandler) GetExpiringWarranties(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	days := optionalInt(r, "days", 90)

	warranties, err := h.svc.GetExpiringWarranties(r.Context(), days)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, warranties, nil)
}

// GetWarranty handles GET /warranties/{id} — retrieves a single warranty.
func (h *WarrantyHandler) GetWarranty(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid warranty ID")
		return
	}

	warranty, err := h.svc.GetWarranty(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, warranty, nil)
}

// CreateWarranty handles POST /warranties — creates a new warranty.
func (h *WarrantyHandler) CreateWarranty(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateWarrantyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.AssetID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Asset ID is required")
		return
	}

	warranty, err := h.svc.CreateWarranty(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, warranty)
}

// UpdateWarranty handles PUT /warranties/{id} — updates an existing warranty.
func (h *WarrantyHandler) UpdateWarranty(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid warranty ID")
		return
	}

	var req UpdateWarrantyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	warranty, err := h.svc.UpdateWarranty(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, warranty, nil)
}

// DeleteWarranty handles DELETE /warranties/{id} — deletes a warranty.
func (h *WarrantyHandler) DeleteWarranty(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid warranty ID")
		return
	}

	if err := h.svc.DeleteWarranty(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Renewal Alert Handlers
// ──────────────────────────────────────────────

// ListPendingAlerts handles GET /renewal-alerts — returns pending renewal alerts.
func (h *WarrantyHandler) ListPendingAlerts(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	alerts, err := h.svc.ListPendingAlerts(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, alerts, nil)
}

// CreateRenewalAlert handles POST /renewal-alerts — creates a new renewal alert.
func (h *WarrantyHandler) CreateRenewalAlert(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRenewalAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.EntityID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entity ID is required")
		return
	}

	if req.EntityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entity type is required")
		return
	}

	alert, err := h.svc.CreateRenewalAlert(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, alert)
}

// MarkAlertSent handles PUT /renewal-alerts/{id}/sent — marks an alert as sent.
func (h *WarrantyHandler) MarkAlertSent(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid alert ID")
		return
	}

	if err := h.svc.MarkAlertSent(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
