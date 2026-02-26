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
// LicenseHandler
// ──────────────────────────────────────────────

// LicenseHandler handles HTTP requests for licenses, warranties, and renewal alerts.
type LicenseHandler struct {
	svc *LicenseService
}

// NewLicenseHandler creates a new LicenseHandler.
func NewLicenseHandler(svc *LicenseService) *LicenseHandler {
	return &LicenseHandler{svc: svc}
}

// Routes mounts license, warranty, and renewal alert endpoints on the given router.
func (h *LicenseHandler) Routes(r chi.Router) {
	r.Route("/licenses", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListLicenses)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/compliance-stats", h.GetComplianceStats)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetLicense)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateLicense)
		r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}", h.UpdateLicense)
		r.With(middleware.RequirePermission("cmdb.manage")).Delete("/{id}", h.DeleteLicense)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}/assignments", h.ListAssignmentsByLicense)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/{id}/assignments", h.CreateLicenseAssignment)
		r.With(middleware.RequirePermission("cmdb.manage")).Delete("/assignments/{assignmentId}", h.DeleteLicenseAssignment)
	})
	r.Route("/warranties", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListWarranties)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/expiring", h.ListExpiringWarranties)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetWarranty)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateWarranty)
		r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}", h.UpdateWarranty)
		r.With(middleware.RequirePermission("cmdb.manage")).Delete("/{id}", h.DeleteWarranty)
	})
	r.Route("/renewal-alerts", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/pending", h.ListPendingAlerts)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateRenewalAlert)
		r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}/sent", h.MarkAlertSent)
	})
}

// ──────────────────────────────────────────────
// License Handlers
// ──────────────────────────────────────────────

// ListLicenses handles GET /licenses — returns a filtered, paginated list of licenses.
func (h *LicenseHandler) ListLicenses(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	complianceStatus := optionalString(r, "complianceStatus")
	licenseType := optionalString(r, "licenseType")

	licenses, total, err := h.svc.ListLicenses(r.Context(), complianceStatus, licenseType, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, licenses, types.NewMeta(total, params))
}

// GetComplianceStats handles GET /licenses/compliance-stats — returns aggregate compliance stats.
func (h *LicenseHandler) GetComplianceStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetLicenseComplianceStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// GetLicense handles GET /licenses/{id} — retrieves a single license.
func (h *LicenseHandler) GetLicense(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid license ID")
		return
	}

	license, err := h.svc.GetLicense(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, license, nil)
}

// CreateLicense handles POST /licenses — creates a new license.
func (h *LicenseHandler) CreateLicense(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateLicenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.SoftwareName == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Software name is required")
		return
	}

	license, err := h.svc.CreateLicense(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, license)
}

// UpdateLicense handles PUT /licenses/{id} — updates an existing license.
func (h *LicenseHandler) UpdateLicense(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid license ID")
		return
	}

	var req UpdateLicenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	license, err := h.svc.UpdateLicense(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, license, nil)
}

// DeleteLicense handles DELETE /licenses/{id} — deletes a license.
func (h *LicenseHandler) DeleteLicense(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid license ID")
		return
	}

	if err := h.svc.DeleteLicense(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// License Assignment Handlers
// ──────────────────────────────────────────────

// ListAssignmentsByLicense handles GET /licenses/{id}/assignments — returns assignments for a license.
func (h *LicenseHandler) ListAssignmentsByLicense(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	licenseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid license ID")
		return
	}

	assignments, err := h.svc.ListAssignmentsByLicense(r.Context(), licenseID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, assignments, nil)
}

// CreateLicenseAssignment handles POST /licenses/{id}/assignments — creates a new assignment.
func (h *LicenseHandler) CreateLicenseAssignment(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	licenseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid license ID")
		return
	}

	var req CreateLicenseAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	// Override the license ID from the URL parameter.
	req.LicenseID = licenseID

	if req.AssignedTo == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Assigned to user ID is required")
		return
	}

	assignment, err := h.svc.CreateLicenseAssignment(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, assignment)
}

// DeleteLicenseAssignment handles DELETE /licenses/assignments/{assignmentId} — removes an assignment.
func (h *LicenseHandler) DeleteLicenseAssignment(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	assignmentID, err := uuid.Parse(chi.URLParam(r, "assignmentId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid assignment ID")
		return
	}

	if err := h.svc.DeleteLicenseAssignment(r.Context(), assignmentID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Warranty Handlers
// ──────────────────────────────────────────────

// ListWarranties handles GET /warranties — returns a filtered, paginated list of warranties.
func (h *LicenseHandler) ListWarranties(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	renewalStatus := optionalString(r, "renewalStatus")
	assetID := optionalUUID(r, "assetId")

	warranties, total, err := h.svc.ListWarranties(r.Context(), renewalStatus, assetID, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, warranties, types.NewMeta(total, params))
}

// ListExpiringWarranties handles GET /warranties/expiring — returns warranties expiring within N days.
func (h *LicenseHandler) ListExpiringWarranties(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	days := optionalInt(r, "days", 90)

	warranties, err := h.svc.ListExpiringWarranties(r.Context(), days)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, warranties, nil)
}

// GetWarranty handles GET /warranties/{id} — retrieves a single warranty.
func (h *LicenseHandler) GetWarranty(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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
func (h *LicenseHandler) CreateWarranty(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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
func (h *LicenseHandler) UpdateWarranty(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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
func (h *LicenseHandler) DeleteWarranty(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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

// ListPendingAlerts handles GET /renewal-alerts/pending — returns pending renewal alerts.
func (h *LicenseHandler) ListPendingAlerts(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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
func (h *LicenseHandler) CreateRenewalAlert(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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
func (h *LicenseHandler) MarkAlertSent(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
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
