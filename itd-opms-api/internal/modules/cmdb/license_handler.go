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

// LicenseHandler handles HTTP requests for software licenses and assignments.
type LicenseHandler struct {
	svc *LicenseService
}

// NewLicenseHandler creates a new LicenseHandler.
func NewLicenseHandler(svc *LicenseService) *LicenseHandler {
	return &LicenseHandler{svc: svc}
}

// Routes mounts license and assignment endpoints on the given router.
// The parent handler.go mounts this under /licenses.
func (h *LicenseHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListLicenses)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/compliance-stats", h.GetComplianceStats)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetLicense)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateLicense)
	r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}", h.UpdateLicense)
	r.With(middleware.RequirePermission("cmdb.manage")).Delete("/{id}", h.DeleteLicense)
	r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}/assignments", h.ListAssignmentsByLicense)
	r.With(middleware.RequirePermission("cmdb.manage")).Post("/{id}/assignments", h.CreateLicenseAssignment)
	r.With(middleware.RequirePermission("cmdb.manage")).Delete("/assignments/{assignmentId}", h.DeleteLicenseAssignment)
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

	if req.UserID == nil && req.AssetID == nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Either userId or assetId is required")
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
