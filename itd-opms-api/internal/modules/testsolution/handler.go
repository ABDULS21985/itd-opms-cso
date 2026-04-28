package testsolution

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

type Handler struct {
	svc *Service
}

func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService, js nats.JetStreamContext) *Handler {
	return &Handler{svc: NewService(pool, auditSvc, js)}
}

func (h *Handler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("test_solution.view")).Get("/", h.ListRuns)
	r.With(middleware.RequirePermission("test_solution.view")).Get("/stats", h.GetStats)
	r.With(middleware.RequirePermission("test_solution.manage")).Post("/", h.CreateRun)
	r.With(middleware.RequirePermission("test_solution.view")).Get("/{id}", h.GetRun)
	r.With(middleware.RequirePermission("test_solution.manage")).Put("/{id}", h.UpdateRun)
	r.With(middleware.RequirePermission("test_solution.manage")).Post("/{id}/transition", h.TransitionRun)

	r.With(middleware.RequirePermission("test_solution.view")).Get("/{id}/cases", h.ListCases)
	r.With(middleware.RequirePermission("test_solution.manage")).Post("/{id}/cases", h.CreateCase)
	r.With(middleware.RequirePermission("test_solution.manage")).Put("/{id}/cases/{caseId}", h.UpdateCase)

	r.With(middleware.RequirePermission("test_solution.view")).Get("/{id}/signoffs", h.ListSignoffs)
	r.With(middleware.RequirePermission("test_solution.manage")).Post("/{id}/signoffs", h.CreateSignoff)
	r.With(middleware.RequirePermission("test_solution.manage")).Post("/{id}/signoffs/{signoffId}/decide", h.DecideSignoff)
}

func (h *Handler) ListRuns(w http.ResponseWriter, r *http.Request) {
	if types.GetAuthContext(r.Context()) == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	var status, sourceType *string
	var releaseID *uuid.UUID
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}
	if v := r.URL.Query().Get("sourceType"); v != "" {
		sourceType = &v
	}
	if v := r.URL.Query().Get("releaseId"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid releaseId")
			return
		}
		releaseID = &parsed
	}
	params := types.ParsePagination(r)
	runs, total, err := h.svc.ListRuns(r.Context(), status, sourceType, releaseID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, runs, types.NewMeta(total, params))
}

func (h *Handler) GetRun(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
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

func (h *Handler) CreateRun(w http.ResponseWriter, r *http.Request) {
	var req CreateTestSolutionRunRequest
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

func (h *Handler) UpdateRun(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	var req UpdateTestSolutionRunRequest
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

func (h *Handler) TransitionRun(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	var req TransitionTestSolutionRunRequest
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

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, stats, nil)
}

func (h *Handler) ListCases(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	cases, err := h.svc.ListCases(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, cases, nil)
}

func (h *Handler) CreateCase(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	var req CreateTestSolutionCaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	tc, err := h.svc.CreateCase(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, tc)
}

func (h *Handler) UpdateCase(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	caseID, ok := parseID(w, r, "caseId")
	if !ok {
		return
	}
	var req UpdateTestSolutionCaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	tc, err := h.svc.UpdateCase(r.Context(), id, caseID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, tc, nil)
}

func (h *Handler) ListSignoffs(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	signoffs, err := h.svc.ListSignoffs(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, signoffs, nil)
}

func (h *Handler) CreateSignoff(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	var req CreateTestSolutionSignoffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	signoff, err := h.svc.CreateSignoff(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.Created(w, signoff)
}

func (h *Handler) DecideSignoff(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r, "id")
	if !ok {
		return
	}
	signoffID, ok := parseID(w, r, "signoffId")
	if !ok {
		return
	}
	var req DecideTestSolutionSignoffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	signoff, err := h.svc.DecideSignoff(r.Context(), id, signoffID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}
	types.OK(w, signoff, nil)
}

func parseID(w http.ResponseWriter, r *http.Request, param string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, param))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID")
		return uuid.Nil, false
	}
	return id, true
}

func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	status := apperrors.HTTPStatus(err)
	code := apperrors.Code(err)
	message := err.Error()
	if status >= 500 {
		slog.ErrorContext(r.Context(), "test solution request failed", "error", err)
		message = "Internal server error"
	}
	types.ErrorMessage(w, status, code, message)
}
