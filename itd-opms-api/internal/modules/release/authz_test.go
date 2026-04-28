package release

import (
	"testing"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func releaseTestAuth(roles ...string) *types.AuthContext {
	return &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Roles:       roles,
		Permissions: []string{"release.view", "release.manage"},
	}
}

func TestReleaseManagementResponsibilityRoles(t *testing.T) {
	releaseManager := releaseTestAuth(releaseManagerRole)
	if err := ensureReleaseTransitionResponsibility(releaseManager, workflow.ReleasePlanning, workflow.ReleaseBuild); err != nil {
		t.Fatalf("release manager should create deployment plan: %v", err)
	}
	if err := ensureReleaseTransitionResponsibility(releaseManager, workflow.ReleaseApproved, workflow.ReleaseScheduled); err != nil {
		t.Fatalf("release manager should authorize scheduling: %v", err)
	}

	delivery := releaseTestAuth(solutionsDeliverySpecialistRole)
	if err := ensureReleaseTransitionResponsibility(delivery, workflow.ReleaseDeploying, workflow.ReleaseDeployed); err != nil {
		t.Fatalf("solutions delivery specialist should evaluate deployed outcome: %v", err)
	}
	if err := ensureReleaseTransitionResponsibility(delivery, workflow.ReleaseDeploying, workflow.ReleaseApproved); err == nil {
		t.Fatal("solutions delivery specialist must not approve release deployment")
	}

	approver := releaseTestAuth(ditdApproverRole)
	if err := ensureReleaseTransitionResponsibility(approver, workflow.ReleaseTesting, workflow.ReleaseApproved); err != nil {
		t.Fatalf("DITD approver should approve deployment: %v", err)
	}

	closeOut := releaseTestAuth(seniorReleaseManagementSpecialistRole)
	if err := ensureReleaseTransitionResponsibility(closeOut, workflow.ReleaseDeployed, workflow.ReleaseClosed); err != nil {
		t.Fatalf("senior release management specialist should close release: %v", err)
	}
}

func TestReleaseApprovalDecisionAllowsAssignedApprover(t *testing.T) {
	approverID := uuid.New()
	auth := releaseTestAuth("staff")
	auth.UserID = approverID

	if err := ensureReleaseApprovalDecisionResponsibility(auth, approverID); err != nil {
		t.Fatalf("assigned approver should be allowed to decide: %v", err)
	}

	other := releaseTestAuth("staff")
	if err := ensureReleaseApprovalDecisionResponsibility(other, approverID); err == nil {
		t.Fatal("unassigned staff should not decide release approval")
	}
}
