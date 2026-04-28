package itsm

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func changeTestAuth(roles ...string) *types.AuthContext {
	return &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Roles:       roles,
		Permissions: []string{"itsm.manage"},
		IssuedAt:    time.Now(),
	}
}

func changeTestString(value string) *string {
	return &value
}

func changeTestTime() *time.Time {
	value := time.Now().UTC().Add(2 * time.Hour)
	return &value
}

func TestChangeManagementResponsibilityRoles(t *testing.T) {
	base := changeTestAuth()
	if err := ensureChangeRequestResponsibility(base, "create RFC"); err == nil {
		t.Fatal("expected generic itsm.manage user without change role to be denied")
	}

	requestor := changeTestAuth(ChangeRequestorRole)
	if err := ensureChangeRequestResponsibility(requestor, "create RFC"); err != nil {
		t.Fatalf("expected change requestor to create RFC: %v", err)
	}
	if err := ensureChangeManagementResponsibility(requestor, "manage all changes"); err == nil {
		t.Fatal("expected pure change requestor not to receive broad change management authority")
	}

	manager := changeTestAuth(ChangeManagerRole)
	if err := ensureChangeManagementResponsibility(manager, "manage change"); err != nil {
		t.Fatalf("expected change manager to manage change lifecycle: %v", err)
	}

	cab := changeTestAuth(CABMemberRole)
	if err := ensureCABResponsibility(cab, "CAB decision"); err != nil {
		t.Fatalf("expected CAB member to decide RFC: %v", err)
	}

	release := changeTestAuth(ReleaseManagerRole)
	if err := ensureChangeImplementationResponsibility(release, "implementation"); err != nil {
		t.Fatalf("expected release manager to implement change: %v", err)
	}
}

func TestChangeTransitionResponsibilityByTarget(t *testing.T) {
	normal := Ticket{
		Status:               workflow.ChangeAssessing,
		ChangeClassification: changeTestString(ChangeClassificationNormal),
	}
	if err := ensureChangeTransitionResponsibility(changeTestAuth(BusinessAnalystRole), normal, workflow.ChangeApproved); err == nil {
		t.Fatal("expected business analyst to be denied CAB approval")
	}
	if err := ensureChangeTransitionResponsibility(changeTestAuth(CABMemberRole), normal, workflow.ChangeApproved); err != nil {
		t.Fatalf("expected CAB member to approve normal change: %v", err)
	}

	draft := Ticket{Status: workflow.ChangeDraft}
	if err := ensureChangeTransitionResponsibility(changeTestAuth(ChangeRequestorRole), draft, workflow.ChangeSubmitted); err != nil {
		t.Fatalf("expected requestor to submit own RFC intake step: %v", err)
	}

	scheduled := Ticket{Status: workflow.ChangeScheduled}
	if err := ensureChangeTransitionResponsibility(changeTestAuth(SubjectMatterExpertRole), scheduled, workflow.ChangeImplementing); err == nil {
		t.Fatal("expected SME without implementation role to be denied implementation authorization")
	}
	if err := ensureChangeTransitionResponsibility(changeTestAuth(ReleaseManagerRole), scheduled, workflow.ChangeImplementing); err != nil {
		t.Fatalf("expected release manager implementation authorization: %v", err)
	}
}

func TestValidateChangeTransitionRequirements(t *testing.T) {
	normal := Ticket{
		Title:                "Core switch firmware patch",
		Description:          "Patch switch firmware",
		Status:               workflow.ChangeAssessing,
		Urgency:              "high",
		Impact:               "high",
		ChangeClassification: changeTestString(ChangeClassificationNormal),
		ChangeType:           changeTestString(ChangeTypeInfrastructure),
		RiskAssessment:       json.RawMessage(`{}`),
	}
	if err := validateChangeTransitionRequirements(normal, workflow.ChangeApproved, nil); err == nil ||
		!strings.Contains(err.Error(), "normal changes must be sent to CAB") {
		t.Fatalf("expected normal direct approval to be blocked, got %v", err)
	}
	rejectReason := "Rejecting after assessment"
	if err := validateChangeTransitionRequirements(normal, workflow.ChangeRejected, &rejectReason); err == nil ||
		!strings.Contains(err.Error(), "normal changes must be sent to CAB") {
		t.Fatalf("expected normal direct rejection to be blocked, got %v", err)
	}
	if err := validateChangeTransitionRequirements(normal, workflow.ChangeCABReview, nil); err == nil ||
		!strings.Contains(err.Error(), "risk assessment") {
		t.Fatalf("expected CAB review to require risk evidence, got %v", err)
	}

	normal.RiskAssessment = json.RawMessage(`{"impact":"medium"}`)
	normal.RiskLevel = changeTestString(RiskLevelMedium)
	if err := validateChangeTransitionRequirements(normal, workflow.ChangeCABReview, nil); err != nil {
		t.Fatalf("expected CAB review requirements to pass: %v", err)
	}

	approved := Ticket{
		Status:             workflow.ChangeApproved,
		ImplementationPlan: changeTestString("Implement during approved window"),
		RollbackPlan:       changeTestString("Restore previous build"),
		TestPlan:           changeTestString("Run smoke tests"),
		ScheduledStart:     changeTestTime(),
		ScheduledEnd:       changeTestTime(),
	}
	if err := validateChangeTransitionRequirements(approved, workflow.ChangeScheduled, nil); err != nil {
		t.Fatalf("expected schedule requirements to pass: %v", err)
	}

	implemented := Ticket{Status: workflow.ChangeImplemented, PIRRequired: true}
	if err := validateChangeTransitionRequirements(implemented, workflow.ChangeClosed, nil); err == nil ||
		!strings.Contains(err.Error(), "PIR must be completed") {
		t.Fatalf("expected PIR-required implemented change to be blocked from direct closure, got %v", err)
	}

	pirPending := Ticket{Status: workflow.ChangePIRPending, PIRRequired: true}
	if err := validateChangeTransitionRequirements(pirPending, workflow.ChangeClosed, nil); err == nil ||
		!strings.Contains(err.Error(), "PIR must be completed") {
		t.Fatalf("expected PIR pending close to be blocked until PIR complete, got %v", err)
	}
}
