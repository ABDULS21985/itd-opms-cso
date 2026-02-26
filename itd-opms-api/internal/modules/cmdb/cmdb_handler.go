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
// CMDBCIHandler
// ──────────────────────────────────────────────

// CMDBCIHandler handles HTTP requests for CMDB configuration items, relationships, and reconciliation.
type CMDBCIHandler struct {
	svc *CMDBService
}

// NewCMDBCIHandler creates a new CMDBCIHandler.
func NewCMDBCIHandler(svc *CMDBService) *CMDBCIHandler {
	return &CMDBCIHandler{svc: svc}
}

// Routes mounts CMDB CI endpoints on the given router.
func (h *CMDBCIHandler) Routes(r chi.Router) {
	r.Route("/items", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListCMDBItems)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetCMDBItem)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateCMDBItem)
		r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}", h.UpdateCMDBItem)
		r.With(middleware.RequirePermission("cmdb.manage")).Delete("/{id}", h.DeleteCMDBItem)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}/relationships", h.ListRelationshipsByCI)
	})
	r.Route("/relationships", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateRelationship)
		r.With(middleware.RequirePermission("cmdb.manage")).Delete("/{id}", h.DeleteRelationship)
	})
	r.Route("/reconciliation", func(r chi.Router) {
		r.With(middleware.RequirePermission("cmdb.view")).Get("/", h.ListReconciliationRuns)
		r.With(middleware.RequirePermission("cmdb.view")).Get("/{id}", h.GetReconciliationRun)
		r.With(middleware.RequirePermission("cmdb.manage")).Post("/", h.CreateReconciliationRun)
		r.With(middleware.RequirePermission("cmdb.manage")).Put("/{id}/complete", h.CompleteReconciliationRun)
	})
}

// ──────────────────────────────────────────────
// CI Handlers
// ──────────────────────────────────────────────

// ListCMDBItems handles GET /items — returns a filtered, paginated list of CIs.
func (h *CMDBCIHandler) ListCMDBItems(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)
	ciType := optionalString(r, "ciType")
	status := optionalString(r, "status")

	items, total, err := h.svc.ListCMDBItems(r.Context(), ciType, status, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, types.NewMeta(total, params))
}

// GetCMDBItem handles GET /items/{id} — retrieves a single CI.
func (h *CMDBCIHandler) GetCMDBItem(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid CI ID")
		return
	}

	item, err := h.svc.GetCMDBItem(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// CreateCMDBItem handles POST /items — creates a new CI.
func (h *CMDBCIHandler) CreateCMDBItem(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCMDBItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	if req.CIType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "CI type is required")
		return
	}

	item, err := h.svc.CreateCMDBItem(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, item)
}

// UpdateCMDBItem handles PUT /items/{id} — updates an existing CI.
func (h *CMDBCIHandler) UpdateCMDBItem(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid CI ID")
		return
	}

	var req UpdateCMDBItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	item, err := h.svc.UpdateCMDBItem(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// DeleteCMDBItem handles DELETE /items/{id} — deletes a CI.
func (h *CMDBCIHandler) DeleteCMDBItem(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid CI ID")
		return
	}

	if err := h.svc.DeleteCMDBItem(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Relationship Handlers
// ──────────────────────────────────────────────

// ListRelationshipsByCI handles GET /items/{id}/relationships — returns relationships for a CI.
func (h *CMDBCIHandler) ListRelationshipsByCI(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	ciID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid CI ID")
		return
	}

	rels, err := h.svc.ListRelationshipsByCI(r.Context(), ciID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rels, nil)
}

// CreateRelationship handles POST /relationships — creates a new CI relationship.
func (h *CMDBCIHandler) CreateRelationship(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRelationshipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.SourceCIID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Source CI ID is required")
		return
	}

	if req.TargetCIID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Target CI ID is required")
		return
	}

	if req.RelationshipType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Relationship type is required")
		return
	}

	rel, err := h.svc.CreateRelationship(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, rel)
}

// DeleteRelationship handles DELETE /relationships/{id} — deletes a CI relationship.
func (h *CMDBCIHandler) DeleteRelationship(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid relationship ID")
		return
	}

	if err := h.svc.DeleteRelationship(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Reconciliation Handlers
// ──────────────────────────────────────────────

// ListReconciliationRuns handles GET /reconciliation — returns a paginated list of runs.
func (h *CMDBCIHandler) ListReconciliationRuns(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	runs, total, err := h.svc.ListReconciliationRuns(r.Context(), params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, runs, types.NewMeta(total, params))
}

// GetReconciliationRun handles GET /reconciliation/{id} — retrieves a single run.
func (h *CMDBCIHandler) GetReconciliationRun(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid reconciliation run ID")
		return
	}

	run, err := h.svc.GetReconciliationRun(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, run, nil)
}

// CreateReconciliationRun handles POST /reconciliation — creates a new reconciliation run.
func (h *CMDBCIHandler) CreateReconciliationRun(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateReconciliationRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Source == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Source is required")
		return
	}

	run, err := h.svc.CreateReconciliationRun(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, run)
}

// CompleteReconciliationRun handles PUT /reconciliation/{id}/complete — marks a run as completed.
func (h *CMDBCIHandler) CompleteReconciliationRun(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid reconciliation run ID")
		return
	}

	var req CompleteReconciliationRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	run, err := h.svc.CompleteReconciliationRun(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, run, nil)
}
