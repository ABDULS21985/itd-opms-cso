package itsm

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

func TestEnsureServiceDeskResponsibility(t *testing.T) {
	base := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Permissions: []string{"itsm.manage"},
		IssuedAt:    time.Now(),
	}

	if err := ensureServiceDeskResponsibility(base, "start fulfillment"); err == nil {
		t.Fatal("expected generic itsm.manage user without service desk role to be denied")
	}

	analyst := *base
	analyst.Roles = []string{ServiceDeskAnalystRole}
	if err := ensureServiceDeskResponsibility(&analyst, "start fulfillment"); err != nil {
		t.Fatalf("expected service desk analyst to be allowed: %v", err)
	}

	senior := *base
	senior.Roles = []string{SeniorServiceDeskAnalystRole}
	if err := ensureServiceDeskResponsibility(&senior, "close request"); err != nil {
		t.Fatalf("expected senior service desk analyst to be allowed: %v", err)
	}

	global := *base
	global.Permissions = []string{"*"}
	if err := ensureServiceDeskResponsibility(&global, "fulfill request"); err != nil {
		t.Fatalf("expected global privileged user to be allowed: %v", err)
	}
}

func TestEnsureProblemManagementResponsibility(t *testing.T) {
	base := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Permissions: []string{"itsm.manage"},
		IssuedAt:    time.Now(),
	}

	if err := ensureProblemManagementResponsibility(base, "transition problem"); err == nil {
		t.Fatal("expected generic itsm.manage user without problem role to be denied")
	}

	center := *base
	center.Roles = []string{ITServiceCenterSpecialistRole}
	if err := ensureProblemManagementResponsibility(&center, "transition problem"); err != nil {
		t.Fatalf("expected IT service center specialist to be allowed: %v", err)
	}

	support := *base
	support.Roles = []string{ITServiceSupportSpecialistRole}
	if err := ensureProblemManagementResponsibility(&support, "update workaround"); err != nil {
		t.Fatalf("expected IT service support specialist to be allowed: %v", err)
	}

	senior := *base
	senior.Roles = []string{SeniorITServiceCenterSpecialistRole}
	if err := ensureProblemManagementResponsibility(&senior, "close problem"); err != nil {
		t.Fatalf("expected senior IT service center specialist to be allowed: %v", err)
	}
}

func TestEnsureProblemDetectionResponsibilityAllowsServiceDesk(t *testing.T) {
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Roles:       []string{ServiceDeskAnalystRole},
		Permissions: []string{"itsm.manage"},
		IssuedAt:    time.Now(),
	}
	if err := ensureProblemDetectionResponsibility(auth, "create problem"); err != nil {
		t.Fatalf("expected service desk analyst to log problems: %v", err)
	}
	if err := ensureProblemManagementResponsibility(auth, "close problem"); err == nil {
		t.Fatal("expected service desk analyst without problem role to be denied for lifecycle ownership")
	}
}

func TestEnsureIncidentManagementResponsibility(t *testing.T) {
	base := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Permissions: []string{"itsm.manage"},
		IssuedAt:    time.Now(),
	}

	if err := ensureIncidentManagementResponsibility(base, "transition incident"); err == nil {
		t.Fatal("expected generic itsm.manage user without incident role to be denied")
	}

	allowedRoles := []string{
		ServiceDeskSpecialistRole,
		ServiceDeskAnalystRole,
		LegacyServiceDeskAgentRole,
		ITServiceCenterSpecialistRole,
		SeniorITServiceCenterSpecialistRole,
		ITServiceSupportSpecialistRole,
		EndUserSupportSpecialistRole,
		SecondLevelSupportSpecialistRole,
	}
	for _, role := range allowedRoles {
		auth := *base
		auth.Roles = []string{role}
		if err := ensureIncidentManagementResponsibility(&auth, "transition incident"); err != nil {
			t.Fatalf("expected %s to be allowed for incident workflow: %v", role, err)
		}
	}
}
