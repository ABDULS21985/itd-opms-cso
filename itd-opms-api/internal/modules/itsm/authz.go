package itsm

import (
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func isITSMPrivileged(auth *types.AuthContext) bool {
	if auth == nil {
		return false
	}

	return auth.HasPermission("*") || auth.HasRole("admin") || auth.HasRole("tenant_admin")
}

func canMutateTicket(auth *types.AuthContext, ticket Ticket) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	if ticket.ReporterID == auth.UserID {
		return true
	}
	return ticket.AssigneeID != nil && *ticket.AssigneeID == auth.UserID
}

func canAssignTicket(auth *types.AuthContext, ticket Ticket) bool {
	if canMutateTicket(auth, ticket) {
		return true
	}
	return ticket.AssigneeID == nil
}

func canMutateProblem(auth *types.AuthContext, problem Problem) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	if problem.OwnerID == nil {
		return true
	}
	return *problem.OwnerID == auth.UserID
}

func canMutateMajorIncident(auth *types.AuthContext, record MajorIncidentRecord) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	if record.IncidentCommanderID != nil && *record.IncidentCommanderID == auth.UserID {
		return true
	}
	if record.CommunicationLeadID != nil && *record.CommunicationLeadID == auth.UserID {
		return true
	}
	if record.Ticket == nil {
		return false
	}
	if record.Ticket.ReporterID == auth.UserID {
		return true
	}
	return record.Ticket.AssigneeID != nil && *record.Ticket.AssigneeID == auth.UserID
}

func canMutateMajorIncidentTicket(auth *types.AuthContext, ticket majorIncidentTicket) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	if ticket.ReporterID == auth.UserID {
		return true
	}
	return ticket.AssigneeID != nil && *ticket.AssigneeID == auth.UserID
}

func ensureTicketMutationAllowed(auth *types.AuthContext, ticket Ticket) error {
	if canMutateTicket(auth, ticket) {
		return nil
	}
	return apperrors.Forbidden("cannot modify a ticket you do not own or are not assigned to")
}

func ensureTicketAssignmentAllowed(auth *types.AuthContext, ticket Ticket) error {
	if canAssignTicket(auth, ticket) {
		return nil
	}
	return apperrors.Forbidden("cannot assign a ticket that is already owned by another user")
}

func ensureProblemMutationAllowed(auth *types.AuthContext, problem Problem) error {
	if canMutateProblem(auth, problem) {
		return nil
	}
	return apperrors.Forbidden("cannot modify a problem you do not own")
}

func ensureMajorIncidentMutationAllowed(auth *types.AuthContext, record MajorIncidentRecord) error {
	if canMutateMajorIncident(auth, record) {
		return nil
	}
	return apperrors.Forbidden("cannot modify a major incident you do not own")
}

func ensureMajorIncidentDeclarationAllowed(auth *types.AuthContext, ticket majorIncidentTicket) error {
	if canMutateMajorIncidentTicket(auth, ticket) {
		return nil
	}
	return apperrors.Forbidden("cannot declare a major incident for a ticket you do not own or are not assigned to")
}
