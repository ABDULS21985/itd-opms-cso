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
