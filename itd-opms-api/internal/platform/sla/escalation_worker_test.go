package sla

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestNewEscalationWorker_DefaultInterval(t *testing.T) {
	w := NewEscalationWorker(nil, nil, 0)
	if w.interval != 60*time.Second {
		t.Errorf("expected default 60s interval, got %v", w.interval)
	}
}

func TestNewEscalationWorker_CustomInterval(t *testing.T) {
	w := NewEscalationWorker(nil, nil, 30*time.Second)
	if w.interval != 30*time.Second {
		t.Errorf("expected 30s interval, got %v", w.interval)
	}
}

func TestNewEscalationWorker_NegativeInterval(t *testing.T) {
	w := NewEscalationWorker(nil, nil, -5*time.Second)
	if w.interval != 60*time.Second {
		t.Errorf("expected default 60s for negative input, got %v", w.interval)
	}
}

func TestSLAConsumptionPct_NoTarget(t *testing.T) {
	w := NewEscalationWorker(nil, nil, time.Minute)
	ticket := openTicket{
		CreatedAt:           time.Now().Add(-30 * time.Minute),
		SLAResolutionTarget: nil,
	}
	pct := w.slaConsumptionPct(ticket, time.Now())
	if pct != 0 {
		t.Errorf("expected 0%% for nil target, got %.2f", pct)
	}
}

func TestSLAConsumptionPct_HalfwayConsumed(t *testing.T) {
	w := NewEscalationWorker(nil, nil, time.Minute)
	now := time.Now().UTC()
	created := now.Add(-30 * time.Minute)
	target := now.Add(30 * time.Minute) // 60min total window, 30min elapsed

	ticket := openTicket{
		CreatedAt:              created,
		SLAResolutionTarget:    &target,
		SLAPausedDurationMins:  0,
	}
	pct := w.slaConsumptionPct(ticket, now)
	if pct < 49 || pct > 51 {
		t.Errorf("expected ~50%%, got %.2f", pct)
	}
}

func TestSLAConsumptionPct_FullyConsumed(t *testing.T) {
	w := NewEscalationWorker(nil, nil, time.Minute)
	now := time.Now().UTC()
	created := now.Add(-120 * time.Minute)
	target := now.Add(-60 * time.Minute) // target already passed

	ticket := openTicket{
		CreatedAt:           created,
		SLAResolutionTarget: &target,
	}
	pct := w.slaConsumptionPct(ticket, now)
	if pct < 100 {
		t.Errorf("expected >= 100%% for breached SLA, got %.2f", pct)
	}
}

func TestSLAConsumptionPct_WithPausedDuration(t *testing.T) {
	w := NewEscalationWorker(nil, nil, time.Minute)
	now := time.Now().UTC()
	created := now.Add(-60 * time.Minute)
	target := now.Add(60 * time.Minute) // 120min total, 60min elapsed, 20min paused

	ticket := openTicket{
		CreatedAt:             created,
		SLAResolutionTarget:   &target,
		SLAPausedDurationMins: 20,
	}
	pct := w.slaConsumptionPct(ticket, now)
	// Effective elapsed = 60 - 20 = 40 minutes out of 120 total = ~33.3%
	if pct < 30 || pct > 37 {
		t.Errorf("expected ~33%% with pause, got %.2f", pct)
	}
}

func TestSLAConsumptionPct_ZeroTotalDuration(t *testing.T) {
	w := NewEscalationWorker(nil, nil, time.Minute)
	now := time.Now().UTC()
	target := now // same as created — zero window

	ticket := openTicket{
		CreatedAt:           now,
		SLAResolutionTarget: &target,
	}
	pct := w.slaConsumptionPct(ticket, now)
	if pct != 100 {
		t.Errorf("expected 100%% for zero window, got %.2f", pct)
	}
}

func TestFilterRules(t *testing.T) {
	tid1 := uuid.New()
	tid2 := uuid.New()

	rules := []escalationRule{
		{ID: uuid.New(), TenantID: tid1, Name: "Rule A"},
		{ID: uuid.New(), TenantID: tid2, Name: "Rule B"},
		{ID: uuid.New(), TenantID: tid1, Name: "Rule C"},
	}

	filtered := filterRules(rules, tid1)
	if len(filtered) != 2 {
		t.Fatalf("expected 2 rules for tenant1, got %d", len(filtered))
	}
	for _, r := range filtered {
		if r.TenantID != tid1 {
			t.Errorf("unexpected tenant %v in filtered results", r.TenantID)
		}
	}

	filtered2 := filterRules(rules, uuid.New())
	if len(filtered2) != 0 {
		t.Errorf("expected 0 rules for unknown tenant, got %d", len(filtered2))
	}
}

func TestFilterRules_EmptySlice(t *testing.T) {
	filtered := filterRules(nil, uuid.New())
	if len(filtered) != 0 {
		t.Errorf("expected 0 rules from nil, got %d", len(filtered))
	}
}
