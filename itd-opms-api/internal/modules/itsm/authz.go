package itsm

import (
	"fmt"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const (
	ServiceDeskAnalystRole              = "service_desk_analyst"
	SeniorServiceDeskAnalystRole        = "senior_service_desk_analyst"
	ServiceDeskSpecialistRole           = "service_desk_specialist"
	ITServiceCenterSpecialistRole       = "it_service_center_specialist"
	SeniorITServiceCenterSpecialistRole = "senior_it_service_center_specialist"
	ITServiceSupportSpecialistRole      = "it_service_support_specialist"
	EndUserSupportSpecialistRole        = "end_user_support_specialist"
	SecondLevelSupportSpecialistRole    = "second_level_support_specialist"
	LegacyServiceDeskAgentRole          = "service_desk_agent"
	ChangeRequestorRole                 = "change_requestor"
	BusinessAnalystRole                 = "business_analyst"
	BusinessRelationshipManagerRole     = "business_relationship_manager"
	ChangeManagerRole                   = "change_manager"
	TestManagementSpecialistRole        = "test_management_specialist"
	SubjectMatterExpertRole             = "subject_matter_expert"
	ITComplianceSpecialistRole          = "it_compliance_specialist"
	CABMemberRole                       = "cab_member"
	CABMeetingSecretaryRole             = "cab_meeting_secretary"
	ReleaseManagerRole                  = "release_manager"
	ChangeApproverRole                  = "change_approver"
	SupportAnalystRole                  = "support_analyst"
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
	return auth.HasRole(ServiceDeskAnalystRole) ||
		auth.HasRole(SeniorServiceDeskAnalystRole) ||
		auth.HasRole(ServiceDeskSpecialistRole) ||
		auth.HasRole(LegacyServiceDeskAgentRole)
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

func hasIncidentManagementResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return hasServiceDeskResponsibility(auth) ||
		auth.HasRole(ITServiceCenterSpecialistRole) ||
		auth.HasRole(SeniorITServiceCenterSpecialistRole) ||
		auth.HasRole(ITServiceSupportSpecialistRole) ||
		auth.HasRole(EndUserSupportSpecialistRole) ||
		auth.HasRole(SecondLevelSupportSpecialistRole)
}

func hasProblemDetectionResponsibility(auth *types.AuthContext) bool {
	return hasProblemManagementResponsibility(auth) ||
		hasServiceDeskResponsibility(auth) ||
		hasSeniorServiceDeskAccountability(auth)
}

func hasChangeRequestResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(ChangeRequestorRole) ||
		auth.HasRole(BusinessAnalystRole) ||
		auth.HasRole(BusinessRelationshipManagerRole) ||
		auth.HasRole(ChangeManagerRole)
}

func hasChangeManagementResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(BusinessAnalystRole) ||
		auth.HasRole(BusinessRelationshipManagerRole) ||
		auth.HasRole(ChangeManagerRole) ||
		auth.HasRole(TestManagementSpecialistRole) ||
		auth.HasRole(SubjectMatterExpertRole) ||
		auth.HasRole(ITComplianceSpecialistRole) ||
		auth.HasRole(CABMemberRole) ||
		auth.HasRole(CABMeetingSecretaryRole) ||
		auth.HasRole(ReleaseManagerRole) ||
		auth.HasRole(ChangeApproverRole) ||
		auth.HasRole(SupportAnalystRole)
}

func hasChangeRiskAssessmentResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(SubjectMatterExpertRole) ||
		auth.HasRole(ITComplianceSpecialistRole) ||
		auth.HasRole(ChangeManagerRole) ||
		auth.HasRole(TestManagementSpecialistRole)
}

func hasCABResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(CABMemberRole) ||
		auth.HasRole(CABMeetingSecretaryRole) ||
		auth.HasRole(ChangeApproverRole) ||
		auth.HasRole(ChangeManagerRole) ||
		auth.HasRole(TestManagementSpecialistRole)
}

func hasChangeImplementationResponsibility(auth *types.AuthContext) bool {
	if isITSMPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(ChangeManagerRole) ||
		auth.HasRole(ReleaseManagerRole) ||
		auth.HasRole(ChangeApproverRole) ||
		auth.HasRole(TestManagementSpecialistRole)
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

func ensureIncidentManagementResponsibility(auth *types.AuthContext, action string) error {
	if hasIncidentManagementResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires an Incident Management responsibility role", action))
}

func ensureProblemDetectionResponsibility(auth *types.AuthContext, action string) error {
	if hasProblemDetectionResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires a problem management or service desk responsibility role", action))
}

func ensureChangeRequestResponsibility(auth *types.AuthContext, action string) error {
	if hasChangeRequestResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, %s, or %s role", action, ChangeRequestorRole, BusinessAnalystRole, BusinessRelationshipManagerRole, ChangeManagerRole))
}

func ensureChangeManagementResponsibility(auth *types.AuthContext, action string) error {
	if hasChangeManagementResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires a Change Management responsibility role", action))
}

func ensureChangeRiskAssessmentResponsibility(auth *types.AuthContext, action string) error {
	if hasChangeRiskAssessmentResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, %s, or %s role", action, SubjectMatterExpertRole, ITComplianceSpecialistRole, ChangeManagerRole, TestManagementSpecialistRole))
}

func ensureCABResponsibility(auth *types.AuthContext, action string) error {
	if hasCABResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, %s, %s, or %s role", action, CABMemberRole, CABMeetingSecretaryRole, ChangeApproverRole, ChangeManagerRole, TestManagementSpecialistRole))
}

func ensureChangeImplementationResponsibility(auth *types.AuthContext, action string) error {
	if hasChangeImplementationResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, %s, or %s role", action, ChangeManagerRole, ReleaseManagerRole, ChangeApproverRole, TestManagementSpecialistRole))
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

func canMutateChange(auth *types.AuthContext, ticket Ticket) bool {
	if canMutateTicket(auth, ticket) {
		return true
	}
	return hasChangeManagementResponsibility(auth)
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

func ensureChangeMutationAllowed(auth *types.AuthContext, ticket Ticket) error {
	if canMutateChange(auth, ticket) {
		return nil
	}
	return apperrors.Forbidden("cannot modify a change unless you own it, are assigned to it, or hold a Change Management responsibility role")
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
