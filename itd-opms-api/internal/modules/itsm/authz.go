package itsm

import (
	"fmt"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const (
	ServiceDeskAnalystRole              = "service_desk_analyst"
	SeniorServiceDeskAnalystRole        = "senior_service_desk_analyst"
	ITServiceCenterSpecialistRole       = "it_service_center_specialist"
	SeniorITServiceCenterSpecialistRole = "senior_it_service_center_specialist"
	ITServiceSupportSpecialistRole      = "it_service_support_specialist"
)

func isITSMPrivileged(auth *types.AuthContext) bool {
	if auth == nil {
		return false
	}

	return auth.HasPermission("*") || auth.HasRole("admin") || auth.HasRole("tenant_admin")
}

func hasServiceDeskResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(ServiceDeskAnalystRole) || auth.HasRole(SeniorServiceDeskAnalystRole)
}

func hasSeniorServiceDeskAccountability(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(SeniorServiceDeskAnalystRole)
}

func hasProblemManagementResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(ITServiceCenterSpecialistRole) ||
		auth.HasRole(SeniorITServiceCenterSpecialistRole) ||
		auth.HasRole(ITServiceSupportSpecialistRole)
}

func hasProblemDetectionResponsibility(auth *types.AuthContext) bool {
	return hasProblemManagementResponsibility(auth) ||
		hasServiceDeskResponsibility(auth) ||
		hasSeniorServiceDeskAccountability(auth)
}

func ensureServiceDeskResponsibility(auth *types.AuthContext, action string) error {
	if hasServiceDeskResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s or %s role", action, ServiceDeskAnalystRole, SeniorServiceDeskAnalystRole))
}

func ensureSeniorServiceDeskAccountability(auth *types.AuthContext, action string) error {
	if hasSeniorServiceDeskAccountability(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s role", action, SeniorServiceDeskAnalystRole))
}

func ensureProblemManagementResponsibility(auth *types.AuthContext, action string) error {
	if hasProblemManagementResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, or %s role", action, ITServiceCenterSpecialistRole, ITServiceSupportSpecialistRole, SeniorITServiceCenterSpecialistRole))
}

func ensureProblemDetectionResponsibility(auth *types.AuthContext, action string) error {
	if hasProblemDetectionResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires a problem management or service desk responsibility role", action))
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
	if problem.AssignedGroupID != nil && auth.HasOrgAccess(*problem.AssignedGroupID) {
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
	if err := ensureProblemManagementResponsibility(auth, "problem mutation"); err != nil {
		return err
	}
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
