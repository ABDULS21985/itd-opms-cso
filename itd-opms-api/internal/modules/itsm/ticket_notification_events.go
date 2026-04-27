package itsm

import (
	"context"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func (s *TicketService) publishTicketStatusChanged(ctx context.Context, auth *types.AuthContext, previous Ticket, current Ticket, opts ticketStatusTransitionOptions) {
	publishITSMLifecycleEvent(
		ctx,
		s.js,
		"notify.itsm.ticket.transitioned",
		"itsm.ticket.transitioned",
		auth.TenantID,
		auth.UserID,
		"ticket",
		current.ID,
		map[string]any{
			"ticketId":       current.ID.String(),
			"ticketNumber":   current.TicketNumber,
			"title":          current.Title,
			"type":           current.Type,
			"priority":       current.Priority,
			"previousStatus": previous.Status,
			"newStatus":      current.Status,
			"reason":         opts.reason,
			"reporterId":     current.ReporterID.String(),
			"assigneeId":     uuidStringPtr(current.AssigneeID),
			"recipientIds":   notificationRecipientIDs(&current.ReporterID, current.AssigneeID),
			"actionUrl":      notificationTicketURL(current.ID),
		},
	)
}

func (s *TicketService) publishTicketAssigned(ctx context.Context, auth *types.AuthContext, previous Ticket, current Ticket) {
	publishITSMLifecycleEvent(
		ctx,
		s.js,
		"notify.itsm.ticket.assigned",
		"itsm.ticket.assigned",
		auth.TenantID,
		auth.UserID,
		"ticket",
		current.ID,
		map[string]any{
			"ticketId":           current.ID.String(),
			"ticketNumber":       current.TicketNumber,
			"title":              current.Title,
			"type":               current.Type,
			"priority":           current.Priority,
			"reporterId":         current.ReporterID.String(),
			"previousAssigneeId": uuidStringPtr(previous.AssigneeID),
			"assigneeId":         uuidStringPtr(current.AssigneeID),
			"teamQueueId":        uuidStringPtr(current.TeamQueueID),
			"recipientIds":       notificationRecipientIDs(&current.ReporterID, previous.AssigneeID, current.AssigneeID),
			"actionUrl":          notificationTicketURL(current.ID),
		},
	)
}

func (s *TicketService) publishTicketEscalated(ctx context.Context, auth *types.AuthContext, ticket Ticket, reason string) {
	publishITSMLifecycleEvent(
		ctx,
		s.js,
		"notify.itsm.ticket.escalated",
		"itsm.ticket.escalated",
		auth.TenantID,
		auth.UserID,
		"ticket",
		ticket.ID,
		map[string]any{
			"ticketId":     ticket.ID.String(),
			"ticketNumber": ticket.TicketNumber,
			"title":        ticket.Title,
			"type":         ticket.Type,
			"priority":     ticket.Priority,
			"reason":       reason,
			"reporterId":   ticket.ReporterID.String(),
			"assigneeId":   uuidStringPtr(ticket.AssigneeID),
			"recipientIds": notificationRecipientIDs(&ticket.ReporterID, ticket.AssigneeID),
			"actionUrl":    notificationTicketURL(ticket.ID),
		},
	)
}

func (s *TicketService) publishTicketMajorIncidentFlagged(ctx context.Context, auth *types.AuthContext, ticket Ticket) {
	publishITSMLifecycleEvent(
		ctx,
		s.js,
		"notify.itsm.incident.major",
		"itsm.incident.major",
		auth.TenantID,
		auth.UserID,
		"ticket",
		ticket.ID,
		map[string]any{
			"ticketId":     ticket.ID.String(),
			"ticketNumber": ticket.TicketNumber,
			"title":        ticket.Title,
			"type":         ticket.Type,
			"priority":     ticket.Priority,
			"reporterId":   ticket.ReporterID.String(),
			"assigneeId":   uuidStringPtr(ticket.AssigneeID),
			"recipientIds": notificationRecipientIDs(&ticket.ReporterID, ticket.AssigneeID),
			"actionUrl":    notificationTicketURL(ticket.ID),
		},
	)
}

func uuidStringPtr(id *uuid.UUID) *string {
	if id == nil || *id == uuid.Nil {
		return nil
	}
	value := id.String()
	return &value
}
