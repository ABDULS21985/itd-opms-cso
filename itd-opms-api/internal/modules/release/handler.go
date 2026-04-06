package release

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// Handler is the top-level HTTP handler for the Release Management module.
type Handler struct {
	svc *ReleaseService
}

// NewHandler creates a new release Handler.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService, js nats.JetStreamContext) *Handler {
	return &Handler{svc: NewReleaseService(pool, auditSvc, js)}
}

// Routes mounts all release management endpoints.
func (h *Handler) Routes(r chi.Router) {
	// List & dashboard
	r.With(middleware.RequirePermission("release.view")).Get("/", h.ListReleases)
	r.With(middleware.RequirePermission("release.view")).Get("/stats", h.GetReleaseStats)
	r.With(middleware.RequirePermission("release.view")).Get("/calendar", h.GetReleaseCalendar)

	// CRUD
	r.With(middleware.RequirePermission("release.view")).Get("/{id}", h.GetRelease)
	r.With(middleware.RequirePermission("release.manage")).Post("/", h.CreateRelease)
	r.With(middleware.RequirePermission("release.manage")).Put("/{id}", h.UpdateRelease)

	// Lifecycle actions
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/transition", h.TransitionRelease)
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/deploy", h.DeployRelease)
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/rollback", h.RollbackRelease)
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/close", h.CloseRelease)

	// Sub-resources: items
	r.With(middleware.RequirePermission("release.view")).Get("/{id}/items", h.ListReleaseItems)
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/items", h.CreateReleaseItem)

	// Sub-resources: deployments
	r.With(middleware.RequirePermission("release.view")).Get("/{id}/deployments", h.ListReleaseDeployments)
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/deployments", h.CreateReleaseDeployment)

	// Sub-resources: approvals
	r.With(middleware.RequirePermission("release.view")).Get("/{id}/approvals", h.ListReleaseApprovals)
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/approvals", h.CreateReleaseApproval)
	r.With(middleware.RequirePermission("release.manage")).Post("/{id}/approvals/{approvalId}/decide", h.DecideReleaseApproval)
}

// ──────────────────────────────────────────────
// Release Handlers
// ──────────────────────────────────────────────

func (h *Handler) ListReleases(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var status, releaseType, environment *string
	var managerID *uuid.UUID
	if s := r.URL.Query().Get("status"); s != "" {
		status = &s
	}
	if t := r.URL.Query().Get("releaseType"); t != "" {
		releaseType = &t
	}
	if e := r.URL.Query().Get("environment"); e != "" {
		environment = &e
	}
	if m := r.URL.Query().Get("releaseManagerId"); m != "" {
		if uid, err := uuid.Parse(m); err == nil {
			managerID = &uid
		}
	}

	params := types.ParsePagination(r)
	releases, total, err := h.svc.ListReleases(r.Context(), status, releaseType, environment, managerID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, releases, types.NewMeta(total, params))
}

func (h *Handler) GetRelease(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	release, err := h.svc.GetRelease(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, release, nil)
}

func (h *Handler) CreateRelease(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.ReleaseType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "title and releaseType are required")
		return
	}

	release, err := h.svc.CreateRelease(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, release)
}

func (h *Handler) UpdateRelease(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req UpdateReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	release, err := h.svc.UpdateRelease(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, release, nil)
}

func (h *Handler) TransitionRelease(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req TransitionReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.TargetStatus == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "targetStatus is required")
		return
	}

	release, err := h.svc.TransitionRelease(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, release, nil)
}

func (h *Handler) DeployRelease(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req DeployReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.DeploymentType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "deploymentType is required")
		return
	}

	release, err := h.svc.DeployRelease(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, release, nil)
}

func (h *Handler) RollbackRelease(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req RollbackReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Reason == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "reason is required")
		return
	}

	release, err := h.svc.RollbackRelease(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, release, nil)
}

func (h *Handler) CloseRelease(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req CloseReleaseRequest
	json.NewDecoder(r.Body).Decode(&req) // body is optional

	release, err := h.svc.CloseRelease(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, release, nil)
}

func (h *Handler) GetReleaseStats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetReleaseStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

func (h *Handler) GetReleaseCalendar(w http.ResponseWriter, r *http.Request) {
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

	rangeStart, err := time.Parse(time.RFC3339, startStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid start date format (use RFC3339)")
		return
	}
	rangeEnd, err := time.Parse(time.RFC3339, endStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid end date format (use RFC3339)")
		return
	}

	events, err := h.svc.GetReleaseCalendar(r.Context(), rangeStart, rangeEnd)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, events, nil)
}

// ──────────────────────────────────────────────
// Sub-resource Handlers
// ──────────────────────────────────────────────

func (h *Handler) ListReleaseItems(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	releaseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	items, err := h.svc.ListReleaseItems(r.Context(), releaseID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}

func (h *Handler) CreateReleaseItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	releaseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req CreateReleaseItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ItemType == "" || req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "itemType and name are required")
		return
	}

	item, err := h.svc.CreateReleaseItem(r.Context(), releaseID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, item)
}

func (h *Handler) ListReleaseDeployments(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	releaseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	deployments, err := h.svc.ListReleaseDeployments(r.Context(), releaseID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, deployments, nil)
}

func (h *Handler) CreateReleaseDeployment(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	releaseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req CreateReleaseDeploymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Environment == "" || req.DeploymentType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "environment and deploymentType are required")
		return
	}

	deployment, err := h.svc.CreateReleaseDeployment(r.Context(), releaseID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, deployment)
}

func (h *Handler) ListReleaseApprovals(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	releaseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	approvals, err := h.svc.ListReleaseApprovals(r.Context(), releaseID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, approvals, nil)
}

func (h *Handler) CreateReleaseApproval(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	releaseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	var req CreateReleaseApprovalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ApproverID == uuid.Nil || req.ApprovalType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "approverId and approvalType are required")
		return
	}

	approval, err := h.svc.CreateReleaseApproval(r.Context(), releaseID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, approval)
}

func (h *Handler) DecideReleaseApproval(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	releaseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid release ID")
		return
	}

	approvalID, err := uuid.Parse(chi.URLParam(r, "approvalId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid approval ID")
		return
	}

	var req DecideReleaseApprovalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "status is required (approved or rejected)")
		return
	}

	approval, err := h.svc.DecideReleaseApproval(r.Context(), releaseID, approvalID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, approval, nil)
}

// ──────────────────────────────────────────────
// Error helper
// ──────────────────────────────────────────────

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
