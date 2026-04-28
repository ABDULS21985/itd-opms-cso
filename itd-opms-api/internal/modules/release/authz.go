package release

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const (
	releaseManagerRole                    = "release_manager"
	releaseManagementLeadRole             = "release_management_lead"
	solutionsDeliverySpecialistRole       = "solutions_delivery_specialist"
	seniorReleaseManagementSpecialistRole = "senior_release_management_specialist"
	ditdApproverRole                      = "ditd_approver"
	changeApproverRole                    = "change_approver"
)

func isReleasePrivileged(auth *types.AuthContext) bool {
	if auth == nil {
		return false
	}
	return auth.HasPermission("*") ||
		auth.HasRole("admin") ||
		auth.HasRole("tenant_admin") ||
		auth.HasRole("global_admin")
}

func hasReleasePlanningResponsibility(auth *types.AuthContext) bool {
	if isReleasePrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(releaseManagerRole) ||
		auth.HasRole(releaseManagementLeadRole)
}

func hasReleaseDeliveryResponsibility(auth *types.AuthContext) bool {
	if isReleasePrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(solutionsDeliverySpecialistRole) ||
		auth.HasRole(releaseManagerRole) ||
		auth.HasRole(releaseManagementLeadRole)
}

func hasReleaseApprovalResponsibility(auth *types.AuthContext) bool {
	if isReleasePrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(releaseManagementLeadRole) ||
		auth.HasRole(ditdApproverRole) ||
		auth.HasRole(changeApproverRole)
}

func hasReleaseClosureResponsibility(auth *types.AuthContext) bool {
	if isReleasePrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(releaseManagerRole) ||
		auth.HasRole(releaseManagementLeadRole) ||
		auth.HasRole(seniorReleaseManagementSpecialistRole)
}

func hasReleaseManagementResponsibility(auth *types.AuthContext) bool {
	return hasReleasePlanningResponsibility(auth) ||
		hasReleaseDeliveryResponsibility(auth) ||
		hasReleaseApprovalResponsibility(auth) ||
		hasReleaseClosureResponsibility(auth)
}

func ensureReleasePlanningResponsibility(auth *types.AuthContext, action string) error {
	if hasReleasePlanningResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s or %s role", action, releaseManagerRole, releaseManagementLeadRole))
}

func ensureReleaseDeliveryResponsibility(auth *types.AuthContext, action string) error {
	if hasReleaseDeliveryResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, or %s role", action, solutionsDeliverySpecialistRole, releaseManagerRole, releaseManagementLeadRole))
}

func ensureReleaseApprovalResponsibility(auth *types.AuthContext, action string) error {
	if hasReleaseApprovalResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, or %s role", action, releaseManagementLeadRole, ditdApproverRole, changeApproverRole))
}

func ensureReleaseClosureResponsibility(auth *types.AuthContext, action string) error {
	if hasReleaseClosureResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, or %s role", action, releaseManagerRole, releaseManagementLeadRole, seniorReleaseManagementSpecialistRole))
}

func ensureReleaseManagementResponsibility(auth *types.AuthContext, action string) error {
	if hasReleaseManagementResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires a Release Management responsibility role", action))
}

func ensureReleaseTransitionResponsibility(auth *types.AuthContext, _, targetStatus string) error {
	switch targetStatus {
	case workflow.ReleaseBuild, workflow.ReleaseScheduled, workflow.ReleaseCancelled:
		return ensureReleasePlanningResponsibility(auth, "release transition")
	case workflow.ReleaseTesting, workflow.ReleaseDeployed:
		return ensureReleaseDeliveryResponsibility(auth, "release transition")
	case workflow.ReleaseApproved:
		return ensureReleaseApprovalResponsibility(auth, "release approval")
	case workflow.ReleaseDeploying:
		return ensureReleasePlanningResponsibility(auth, "deployment authorization")
	case workflow.ReleaseRolledBack:
		return ensureReleaseDeliveryResponsibility(auth, "release rollback")
	case workflow.ReleaseClosed:
		return ensureReleaseClosureResponsibility(auth, "release close-out")
	default:
		return ensureReleaseManagementResponsibility(auth, "release transition")
	}
}

func ensureReleaseApprovalDecisionResponsibility(auth *types.AuthContext, approverID uuid.UUID) error {
	if isReleasePrivileged(auth) || hasReleaseApprovalResponsibility(auth) {
		return nil
	}
	if auth != nil && auth.UserID == approverID {
		return nil
	}
	return apperrors.Forbidden("release approval decision requires the assigned approver, release management lead, DITD approver, or change approver role")
}
