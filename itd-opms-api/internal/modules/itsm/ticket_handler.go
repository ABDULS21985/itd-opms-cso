package itsm

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/export"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// TicketHandler
// ──────────────────────────────────────────────

// TicketHandler handles HTTP requests for ITSM tickets.
type TicketHandler struct {
	svc      *TicketService
	majorSvc *MajorIncidentService
}

// NewTicketHandler creates a new TicketHandler.
func NewTicketHandler(svc *TicketService, majorSvc ...*MajorIncidentService) *TicketHandler {
	var workflowSvc *MajorIncidentService
	if len(majorSvc) > 0 {
		workflowSvc = majorSvc[0]
	}
	return &TicketHandler{svc: svc, majorSvc: workflowSvc}
}

// Routes mounts ticket endpoints on the given router.
func (h *TicketHandler) Routes(r chi.Router) {
	// Read endpoints.
	r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListTickets)
	r.With(middleware.RequirePermission("itsm.view")).Get("/stats", h.GetStats)
	r.With(middleware.RequirePermission("itsm.view")).Get("/my-queue", h.ListMyQueue)
	r.With(middleware.RequirePermission("itsm.view")).Get("/team-queue/{teamId}", h.ListTeamQueue)
	r.With(middleware.RequirePermission("itsm.view")).Get("/csat-stats", h.GetCSATStats)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetTicket)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}/comments", h.ListComments)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}/history", h.ListStatusHistory)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}/subtasks", h.ListSubtasks)

	// Write endpoints.
	r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateTicket)
	r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateTicket)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/transition", h.TransitionStatus)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/assign", h.AssignTicket)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/escalate", h.EscalateTicket)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/comments", h.AddComment)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/link", h.LinkTickets)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/resolve", h.ResolveTicket)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/close", h.CloseTicket)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/subtasks", h.CreateSubtask)
	r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}/subtasks/{childId}", h.UnlinkSubtask)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/csat", h.CreateCSATSurvey)

	// Bulk operations.
	r.With(middleware.RequirePermission("itsm.manage")).Post("/bulk/update", h.BulkUpdate)

	// Export.
	r.With(middleware.RequirePermission("itsm.view")).Get("/export", h.ExportTickets)
}

// ──────────────────────────────────────────────
// Shared error helper
// ──────────────────────────────────────────────

// writeAppError maps an application error to the appropriate HTTP response.
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
// Handlers
// ──────────────────────────────────────────────

// ListTickets handles GET / — returns a filtered, paginated list of tickets.
func (h *TicketHandler) ListTickets(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	// Optional filters.
	status := optionalString(r, "status")
	priority := optionalString(r, "priority")
	ticketType := optionalString(r, "type")
	assigneeID := optionalUUIDAny(r, "assigneeId")
	reporterID := optionalUUIDAny(r, "reporterId")
	teamQueueID := optionalUUIDAny(r, "teamQueueId")

	var hideSubtasks *bool
	if v := r.URL.Query().Get("hideSubtasks"); v == "true" {
		b := true
		hideSubtasks = &b
	}

	tickets, total, err := h.svc.ListTickets(r.Context(), status, priority, ticketType, assigneeID, reporterID, teamQueueID, hideSubtasks, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tickets, types.NewMeta(total, params))
}

// GetStats handles GET /stats — returns aggregate ticket statistics.
func (h *TicketHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetTicketStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// ListMyQueue handles GET /my-queue — returns tickets assigned to the current user.
func (h *TicketHandler) ListMyQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	tickets, total, err := h.svc.ListMyQueue(r.Context(), params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tickets, types.NewMeta(total, params))
}

// ListTeamQueue handles GET /team-queue/{teamId} — returns tickets for a team queue.
func (h *TicketHandler) ListTeamQueue(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	teamID, err := uuid.Parse(chi.URLParam(r, "teamId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid team ID")
		return
	}

	params := types.ParsePagination(r)

	tickets, total, err := h.svc.ListTeamQueue(r.Context(), teamID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tickets, types.NewMeta(total, params))
}

// GetCSATStats handles GET /csat-stats — returns aggregate CSAT statistics.
func (h *TicketHandler) GetCSATStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetCSATStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// GetTicket handles GET /{id} — retrieves a single ticket.
func (h *TicketHandler) GetTicket(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	ticket, err := h.svc.GetTicket(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ticket, nil)
}

// ListComments handles GET /{id}/comments — returns comments for a ticket.
func (h *TicketHandler) ListComments(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	// Check if internal comments should be included (query param).
	includeInternal := r.URL.Query().Get("includeInternal") == "true"

	comments, err := h.svc.ListComments(r.Context(), ticketID, includeInternal)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, comments, nil)
}

// ListStatusHistory handles GET /{id}/history — returns status transition history.
func (h *TicketHandler) ListStatusHistory(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	history, err := h.svc.ListStatusHistory(r.Context(), ticketID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, history, nil)
}

// CreateTicket handles POST / — creates a new ticket.
func (h *TicketHandler) CreateTicket(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Type == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Type is required")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	if req.Description == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Description is required")
		return
	}

	if req.Urgency == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Urgency is required")
		return
	}

	if req.Impact == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Impact is required")
		return
	}

	ticket, err := h.svc.CreateTicket(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, ticket)
}

// UpdateTicket handles PUT /{id} — updates an existing ticket.
func (h *TicketHandler) UpdateTicket(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var req UpdateTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	ticket, err := h.svc.UpdateTicket(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ticket, nil)
}

// TransitionStatus handles POST /{id}/transition — transitions ticket status.
func (h *TicketHandler) TransitionStatus(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var req TransitionTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	ticket, err := h.svc.TransitionStatus(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ticket, nil)
}

// AssignTicket handles POST /{id}/assign — assigns a ticket to a user/team.
func (h *TicketHandler) AssignTicket(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var req AssignTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	ticket, err := h.svc.AssignTicket(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ticket, nil)
}

// EscalateTicket handles POST /{id}/escalate — records a manual escalation.
func (h *TicketHandler) EscalateTicket(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if strings.TrimSpace(body.Reason) == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Reason is required")
		return
	}

	if err := h.svc.EscalateTicket(r.Context(), id, body.Reason); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// AddComment handles POST /{id}/comments — adds a comment to a ticket.
func (h *TicketHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var req AddCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Content == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Content is required")
		return
	}

	comment, err := h.svc.AddComment(r.Context(), ticketID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, comment)
}

// DeclareMajorIncident handles POST /{id}/major-incident — declares a major incident.
func (h *TicketHandler) DeclareMajorIncident(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	if h.majorSvc != nil {
		var req DeclareMajorIncidentWorkflowRequest
		if r.Body != nil {
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
				types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
				return
			}
		}
		req.TicketID = id
		if _, err := h.majorSvc.DeclareMajorIncident(r.Context(), req); err != nil {
			writeAppError(w, r, err)
			return
		}
		types.NoContent(w)
		return
	}

	if err := h.svc.DeclareMajorIncident(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// LinkTickets handles POST /{id}/link — links two tickets bidirectionally.
func (h *TicketHandler) LinkTickets(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var req LinkTicketsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.RelatedTicketID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Related ticket ID is required")
		return
	}

	if err := h.svc.LinkTickets(r.Context(), id, req.RelatedTicketID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ResolveTicket handles POST /{id}/resolve — resolves a ticket with resolution notes.
func (h *TicketHandler) ResolveTicket(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	var req ResolveTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ResolutionNotes == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Resolution notes are required")
		return
	}

	ticket, err := h.svc.ResolveTicket(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ticket, nil)
}

// CloseTicket handles POST /{id}/close — closes a ticket.
func (h *TicketHandler) CloseTicket(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	if err := h.svc.CloseTicket(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// CreateCSATSurvey handles POST /csat — records a customer satisfaction survey.
func (h *TicketHandler) CreateCSATSurvey(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCSATSurveyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.TicketID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ticket ID is required")
		return
	}

	if req.Rating < 1 || req.Rating > 5 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Rating must be between 1 and 5")
		return
	}

	survey, err := h.svc.CreateCSATSurvey(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, survey)
}

// ──────────────────────────────────────────────
// Bulk Operations
// ──────────────────────────────────────────────

// BulkUpdate handles POST /bulk/update — bulk updates multiple tickets.
func (h *TicketHandler) BulkUpdate(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req struct {
		IDs    []string          `json:"ids"`
		Fields map[string]string `json:"fields"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if len(req.IDs) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "ids must not be empty")
		return
	}

	if len(req.Fields) == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "fields must not be empty")
		return
	}

	// Validate allowed fields.
	allowedFields := map[string]bool{"status": true, "priority": true, "assigneeId": true}
	for field := range req.Fields {
		if !allowedFields[field] {
			types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR",
				fmt.Sprintf("field %q is not allowed for bulk update", field))
			return
		}
	}

	// Parse UUIDs.
	ids := make([]uuid.UUID, 0, len(req.IDs))
	for _, raw := range req.IDs {
		id, err := uuid.Parse(raw)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST",
				fmt.Sprintf("invalid UUID: %s", raw))
			return
		}
		ids = append(ids, id)
	}

	updated, failed, err := h.svc.BulkUpdateTickets(r.Context(), ids, req.Fields)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]int64{"updated": updated, "failed": failed}, nil)
}

// ──────────────────────────────────────────────
// CSV Export
// ──────────────────────────────────────────────

// ExportTickets handles GET /export — exports tickets as a CSV file.
func (h *TicketHandler) ExportTickets(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Optional filters.
	status := optionalString(r, "status")
	priority := optionalString(r, "priority")
	ticketType := optionalString(r, "type")

	tickets, err := h.svc.ListTicketsForExport(r.Context(), status, priority, ticketType, 10000)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	columns := []export.CSVColumn{
		{Header: "Ticket#", Field: "ticketNumber"},
		{Header: "Title", Field: "title"},
		{Header: "Type", Field: "type"},
		{Header: "Priority", Field: "priority"},
		{Header: "Status", Field: "status"},
		{Header: "Created", Field: "createdAt"},
	}

	rows := make([][]string, 0, len(tickets))
	for _, t := range tickets {
		rows = append(rows, []string{
			t.TicketNumber,
			t.Title,
			t.Type,
			t.Priority,
			t.Status,
			t.CreatedAt.Format(time.RFC3339),
		})
	}

	filename := fmt.Sprintf("tickets-%s.csv", time.Now().Format("2006-01-02"))
	export.WriteCSV(w, filename, columns, rows)
}

// ──────────────────────────────────────────────
// Subtask Handlers
// ──────────────────────────────────────────────

// ListSubtasks handles GET /{id}/subtasks — returns child tickets + progress.
func (h *TicketHandler) ListSubtasks(w http.ResponseWriter, r *http.Request) {
	ticketID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid ticket ID")
		return
	}

	resp, err := h.svc.ListSubtasks(r.Context(), ticketID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, resp, nil)
}

// CreateSubtask handles POST /{id}/subtasks — creates a child ticket.
func (h *TicketHandler) CreateSubtask(w http.ResponseWriter, r *http.Request) {
	parentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid ticket ID")
		return
	}

	var req CreateSubtaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}

	if req.Title == "" || req.Description == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION", "title and description are required")
		return
	}

	ticket, err := h.svc.CreateSubtask(r.Context(), parentID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ticket, nil)
}

// UnlinkSubtask handles DELETE /{id}/subtasks/{childId} — unlinks (does not delete).
func (h *TicketHandler) UnlinkSubtask(w http.ResponseWriter, r *http.Request) {
	parentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid parent ticket ID")
		return
	}

	childID, err := uuid.Parse(chi.URLParam(r, "childId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid child ticket ID")
		return
	}

	if err := h.svc.UnlinkSubtask(r.Context(), parentID, childID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"status": "unlinked"}, nil)
}
