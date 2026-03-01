package governance

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// OKRHandler handles HTTP requests for OKR, Key Result, and KPI management.
type OKRHandler struct {
	svc *OKRService
}

// NewOKRHandler creates a new OKRHandler.
func NewOKRHandler(svc *OKRService) *OKRHandler {
	return &OKRHandler{svc: svc}
}

// Routes mounts OKR, key result, and KPI endpoints on the given router.
func (h *OKRHandler) Routes(r chi.Router) {
	r.Route("/okrs", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.view")).Get("/", h.ListOKRs)
		r.With(middleware.RequirePermission("governance.manage")).Post("/", h.CreateOKR)
		r.Route("/{id}", func(r chi.Router) {
			r.With(middleware.RequirePermission("governance.view")).Get("/", h.GetOKR)
			r.With(middleware.RequirePermission("governance.manage")).Put("/", h.UpdateOKR)
			r.With(middleware.RequirePermission("governance.view")).Get("/tree", h.GetOKRTree)
			// Key Results
			r.With(middleware.RequirePermission("governance.manage")).Post("/key-results", h.CreateKeyResult)
		})
	})

	r.Route("/key-results/{krId}", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.manage")).Put("/", h.UpdateKeyResult)
		r.With(middleware.RequirePermission("governance.manage")).Delete("/", h.DeleteKeyResult)
	})

	r.Route("/kpis", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.view")).Get("/", h.ListKPIs)
		r.With(middleware.RequirePermission("governance.manage")).Post("/", h.CreateKPI)
		r.Route("/{id}", func(r chi.Router) {
			r.With(middleware.RequirePermission("governance.view")).Get("/", h.GetKPI)
			r.With(middleware.RequirePermission("governance.manage")).Put("/", h.UpdateKPI)
			r.With(middleware.RequirePermission("governance.manage")).Delete("/", h.DeleteKPI)
		})
	})
}

// ──────────────────────────────────────────────
// OKR handlers
// ──────────────────────────────────────────────

// ListOKRs handles GET /okrs -- returns a paginated, filterable list of OKRs.
func (h *OKRHandler) ListOKRs(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	level := r.URL.Query().Get("level")
	period := r.URL.Query().Get("period")
	status := r.URL.Query().Get("status")
	params := types.ParsePagination(r)

	okrs, total, err := h.svc.ListOKRs(r.Context(), authCtx.TenantID, level, period, status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, okrs, types.NewMeta(total, params))
}

// CreateOKR handles POST /okrs -- creates a new OKR.
func (h *OKRHandler) CreateOKR(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateOKRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Objective == "" || req.Level == "" || req.Period == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Objective, level, and period are required")
		return
	}

	if req.OwnerID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "OwnerId is required")
		return
	}

	okr, err := h.svc.CreateOKR(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, okr)
}

// GetOKR handles GET /okrs/{id} -- retrieves a single OKR with key results.
func (h *OKRHandler) GetOKR(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	okrID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid OKR ID")
		return
	}

	okr, err := h.svc.GetOKR(r.Context(), authCtx.TenantID, okrID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, okr, nil)
}

// UpdateOKR handles PUT /okrs/{id} -- updates an existing OKR.
func (h *OKRHandler) UpdateOKR(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	okrID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid OKR ID")
		return
	}

	var req UpdateOKRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	okr, err := h.svc.UpdateOKR(r.Context(), authCtx.TenantID, okrID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, okr, nil)
}

// GetOKRTree handles GET /okrs/{id}/tree -- retrieves the full OKR hierarchy.
func (h *OKRHandler) GetOKRTree(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	okrID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid OKR ID")
		return
	}

	tree, err := h.svc.GetOKRTree(r.Context(), authCtx.TenantID, okrID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tree, nil)
}

// CreateKeyResult handles POST /okrs/{id}/key-results -- adds a key result to an OKR.
func (h *OKRHandler) CreateKeyResult(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	okrID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid OKR ID")
		return
	}

	var req CreateKeyResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	kr, err := h.svc.CreateKeyResult(r.Context(), okrID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, kr)
}

// ──────────────────────────────────────────────
// Key Result handlers
// ──────────────────────────────────────────────

// UpdateKeyResult handles PUT /key-results/{krId} -- updates a key result.
func (h *OKRHandler) UpdateKeyResult(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	krID, err := uuid.Parse(chi.URLParam(r, "krId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid key result ID")
		return
	}

	var req UpdateKeyResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	kr, err := h.svc.UpdateKeyResult(r.Context(), krID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, kr, nil)
}

// DeleteKeyResult handles DELETE /key-results/{krId} -- deletes a key result.
func (h *OKRHandler) DeleteKeyResult(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	krID, err := uuid.Parse(chi.URLParam(r, "krId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid key result ID")
		return
	}

	if err := h.svc.DeleteKeyResult(r.Context(), krID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// KPI handlers
// ──────────────────────────────────────────────

// ListKPIs handles GET /kpis -- returns a paginated list of KPIs.
func (h *OKRHandler) ListKPIs(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	kpis, total, err := h.svc.ListKPIs(r.Context(), authCtx.TenantID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, kpis, types.NewMeta(total, params))
}

// CreateKPI handles POST /kpis -- creates a new KPI.
func (h *OKRHandler) CreateKPI(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateKPIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	kpi, err := h.svc.CreateKPI(r.Context(), authCtx.TenantID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, kpi)
}

// GetKPI handles GET /kpis/{id} -- retrieves a single KPI.
func (h *OKRHandler) GetKPI(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	kpiID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid KPI ID")
		return
	}

	kpi, err := h.svc.GetKPI(r.Context(), authCtx.TenantID, kpiID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, kpi, nil)
}

// UpdateKPI handles PUT /kpis/{id} -- updates an existing KPI.
func (h *OKRHandler) UpdateKPI(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	kpiID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid KPI ID")
		return
	}

	var req UpdateKPIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	kpi, err := h.svc.UpdateKPI(r.Context(), authCtx.TenantID, kpiID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, kpi, nil)
}

// DeleteKPI handles DELETE /kpis/{id} -- deletes a KPI.
func (h *OKRHandler) DeleteKPI(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	kpiID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid KPI ID")
		return
	}

	if err := h.svc.DeleteKPI(r.Context(), authCtx.TenantID, kpiID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}
