package testsolution

import (
	"fmt"

	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const (
	testManagerRole              = "test_manager"
	testManagementSpecialistRole = "test_management_specialist"
	solutionDeveloperRole        = "solution_developer"
	seniorSolutionDeveloperRole  = "senior_solution_developer"
	testAnalystRole              = "test_analyst"
	releaseManagementLeadRole    = "release_management_lead"
	releaseManagerRole           = "release_manager"
	solutionsDeliverySpecialist  = "solutions_delivery_specialist"
)

func isTestSolutionPrivileged(auth *types.AuthContext) bool {
	if auth == nil {
		return false
	}
	return auth.HasPermission("*") ||
		auth.HasRole("admin") ||
		auth.HasRole("tenant_admin") ||
		auth.HasRole("global_admin")
}

func hasTestPlanningResponsibility(auth *types.AuthContext) bool {
	if isTestSolutionPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(testManagerRole) ||
		auth.HasRole(testManagementSpecialistRole) ||
		auth.HasRole(releaseManagementLeadRole)
}

func hasTestExecutionResponsibility(auth *types.AuthContext) bool {
	if isTestSolutionPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(testManagerRole) ||
		auth.HasRole(testManagementSpecialistRole) ||
		auth.HasRole(solutionDeveloperRole) ||
		auth.HasRole(seniorSolutionDeveloperRole) ||
		auth.HasRole(testAnalystRole)
}

func hasDataConversionResponsibility(auth *types.AuthContext) bool {
	if isTestSolutionPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(testManagerRole) ||
		auth.HasRole(testAnalystRole) ||
		auth.HasRole(solutionDeveloperRole)
}

func hasReleaseHandoffResponsibility(auth *types.AuthContext) bool {
	if isTestSolutionPrivileged(auth) {
		return true
	}
	if auth == nil {
		return false
	}
	return auth.HasRole(testManagerRole) ||
		auth.HasRole(releaseManagementLeadRole) ||
		auth.HasRole(releaseManagerRole)
}

func ensureTestSolutionResponsibility(auth *types.AuthContext, action string) error {
	if hasTestExecutionResponsibility(auth) ||
		hasReleaseHandoffResponsibility(auth) ||
		(auth != nil && auth.HasRole(solutionsDeliverySpecialist)) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires an ITD Test Solution responsibility role", action))
}

func ensureTestPlanningResponsibility(auth *types.AuthContext, action string) error {
	if hasTestPlanningResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, or %s role", action, testManagerRole, testManagementSpecialistRole, releaseManagementLeadRole))
}

func ensureTestExecutionResponsibility(auth *types.AuthContext, action string) error {
	if hasTestExecutionResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, %s, %s, or %s role", action, testManagerRole, testManagementSpecialistRole, solutionDeveloperRole, seniorSolutionDeveloperRole, testAnalystRole))
}

func ensureReleaseHandoffResponsibility(auth *types.AuthContext, action string) error {
	if hasReleaseHandoffResponsibility(auth) {
		return nil
	}
	return apperrors.Forbidden(fmt.Sprintf("%s requires %s, %s, or %s role", action, testManagerRole, releaseManagementLeadRole, releaseManagerRole))
}

func ensureTransitionResponsibility(auth *types.AuthContext, targetStatus string) error {
	switch targetStatus {
	case workflow.TestSolutionPlanning, workflow.TestSolutionAuthorized, workflow.TestSolutionClosed, workflow.TestSolutionCancelled:
		return ensureTestPlanningResponsibility(auth, "test solution transition")
	case workflow.TestSolutionDataConversionPreparation, workflow.TestSolutionDataConversionExecution:
		if hasDataConversionResponsibility(auth) {
			return nil
		}
		return apperrors.Forbidden("data conversion testing requires test_manager, test_analyst, or solution_developer role")
	case workflow.TestSolutionReleaseHandoff:
		return ensureReleaseHandoffResponsibility(auth, "release handoff")
	default:
		return ensureTestExecutionResponsibility(auth, "test solution transition")
	}
}
