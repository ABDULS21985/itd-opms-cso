// Package sla provides background workers for SLA monitoring and automated
// escalation rule evaluation.
package sla

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/metrics"
)

// EscalationWorker evaluates active escalation rules against open tickets
// on a periodic schedule. When a rule fires it records an escalation_event
// and publishes a NATS notification.
type EscalationWorker struct {
	pool   *pgxpool.Pool
	js     nats.JetStreamContext
	stopCh chan struct{}
	wg     sync.WaitGroup

	interval time.Duration
}

// NewEscalationWorker creates a new worker. The check interval defaults to
// 60 seconds when zero.
func NewEscalationWorker(pool *pgxpool.Pool, js nats.JetStreamContext, interval time.Duration) *EscalationWorker {
	if interval <= 0 {
		interval = 60 * time.Second
	}
	return &EscalationWorker{
		pool:     pool,
		js:       js,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start launches the background loop.
func (w *EscalationWorker) Start(ctx context.Context) {
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		ticker := time.NewTicker(w.interval)
		defer ticker.Stop()

		slog.Info("escalation worker started", "interval", w.interval)

		for {
			select {
			case <-ticker.C:
				if err := w.evaluate(ctx); err != nil {
					slog.Error("escalation evaluation failed", "error", err)
				}
			case <-w.stopCh:
				slog.Info("escalation worker stopping")
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

// Stop signals the worker to exit and blocks until it finishes.
func (w *EscalationWorker) Stop() {
	close(w.stopCh)
	w.wg.Wait()
	slog.Info("escalation worker stopped")
}

// ---------- internal types ----------

type escalationRule struct {
	ID              uuid.UUID
	TenantID        uuid.UUID
	Name            string
	TriggerType     string
	TriggerConfig   json.RawMessage
	EscalationChain json.RawMessage
}

type openTicket struct {
	ID                     uuid.UUID
	TenantID               uuid.UUID
	Priority               string
	Status                 string
	AssigneeID             *uuid.UUID
	CreatedAt              time.Time
	SLAResponseTarget      *time.Time
	SLAResolutionTarget    *time.Time
	SLAPausedAt            *time.Time
	SLAPausedDurationMins  int
}

type openServiceRequest struct {
	ID                       uuid.UUID
	TenantID                 uuid.UUID
	Priority                 string
	Status                   string
	CreatedAt                time.Time
	SLAResolutionTarget      *time.Time
	SLAFulfillmentTarget     *time.Time
	SLAPausedAt              *time.Time
	SLAPausedDurationMins    int
}

// ---------- evaluation loop ----------

func (w *EscalationWorker) evaluate(ctx context.Context) error {
	// 1. Load all active rules grouped by tenant.
	rules, err := w.loadActiveRules(ctx)
	if err != nil {
		return err
	}
	if len(rules) == 0 {
		return nil
	}

	// Collect tenant IDs.
	tenantIDs := make(map[uuid.UUID]struct{})
	for _, r := range rules {
		tenantIDs[r.TenantID] = struct{}{}
	}

	// 2. For each tenant, load open tickets and service requests, then evaluate rules.
	for tid := range tenantIDs {
		tickets, err := w.loadOpenTickets(ctx, tid)
		if err != nil {
			slog.Error("escalation: load tickets failed", "tenant", tid, "error", err)
			continue
		}
		tenantRules := filterRules(rules, tid)
		for _, ticket := range tickets {
			for _, rule := range tenantRules {
				w.evaluateRule(ctx, rule, ticket)
			}
		}

		// Also evaluate open service requests with SLA targets.
		requests, err := w.loadOpenServiceRequests(ctx, tid)
		if err != nil {
			slog.Error("escalation: load service requests failed", "tenant", tid, "error", err)
			continue
		}
		for _, req := range requests {
			for _, rule := range tenantRules {
				w.evaluateServiceRequestRule(ctx, rule, req)
			}
		}
	}
	return nil
}

func (w *EscalationWorker) loadActiveRules(ctx context.Context) ([]escalationRule, error) {
	rows, err := w.pool.Query(ctx, `
		SELECT id, tenant_id, name, trigger_type, trigger_config, escalation_chain
		FROM escalation_rules
		WHERE is_active = true`)
	if err != nil {
		return nil, fmt.Errorf("query escalation rules: %w", err)
	}
	defer rows.Close()

	var out []escalationRule
	for rows.Next() {
		var r escalationRule
		if err := rows.Scan(&r.ID, &r.TenantID, &r.Name, &r.TriggerType, &r.TriggerConfig, &r.EscalationChain); err != nil {
			return nil, fmt.Errorf("scan rule: %w", err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (w *EscalationWorker) loadOpenTickets(ctx context.Context, tenantID uuid.UUID) ([]openTicket, error) {
	rows, err := w.pool.Query(ctx, `
		SELECT id, tenant_id, priority, status, assignee_id, created_at,
		       sla_response_target, sla_resolution_target,
		       sla_paused_at, sla_paused_duration_minutes
		FROM tickets
		WHERE tenant_id = $1
		  AND status NOT IN ('resolved','closed','cancelled')`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("query open tickets: %w", err)
	}
	defer rows.Close()

	var out []openTicket
	for rows.Next() {
		var t openTicket
		if err := rows.Scan(
			&t.ID, &t.TenantID, &t.Priority, &t.Status, &t.AssigneeID, &t.CreatedAt,
			&t.SLAResponseTarget, &t.SLAResolutionTarget,
			&t.SLAPausedAt, &t.SLAPausedDurationMins,
		); err != nil {
			return nil, fmt.Errorf("scan ticket: %w", err)
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (w *EscalationWorker) loadOpenServiceRequests(ctx context.Context, tenantID uuid.UUID) ([]openServiceRequest, error) {
	rows, err := w.pool.Query(ctx, `
		SELECT id, tenant_id, priority, status, created_at,
		       sla_resolution_target, sla_fulfillment_target,
		       sla_paused_at, sla_paused_duration_minutes
		FROM service_requests
		WHERE tenant_id = $1
		  AND status NOT IN ('fulfilled', 'cancelled', 'rejected')
		  AND (sla_resolution_target IS NOT NULL OR sla_fulfillment_target IS NOT NULL)`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("query open service requests: %w", err)
	}
	defer rows.Close()

	var out []openServiceRequest
	for rows.Next() {
		var r openServiceRequest
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.Priority, &r.Status, &r.CreatedAt,
			&r.SLAResolutionTarget, &r.SLAFulfillmentTarget,
			&r.SLAPausedAt, &r.SLAPausedDurationMins,
		); err != nil {
			return nil, fmt.Errorf("scan service request: %w", err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func filterRules(rules []escalationRule, tenantID uuid.UUID) []escalationRule {
	var out []escalationRule
	for _, r := range rules {
		if r.TenantID == tenantID {
			out = append(out, r)
		}
	}
	return out
}

// ---------- rule evaluation ----------

func (w *EscalationWorker) evaluateRule(ctx context.Context, rule escalationRule, ticket openTicket) {
	now := time.Now().UTC()
	fired := false
	details := map[string]any{}

	switch rule.TriggerType {
	case "sla_warning":
		// trigger_config: {"threshold_percent": 80}
		var cfg struct {
			ThresholdPct float64 `json:"threshold_percent"`
		}
		if err := json.Unmarshal(rule.TriggerConfig, &cfg); err != nil || cfg.ThresholdPct <= 0 {
			return
		}
		pct := w.slaConsumptionPct(ticket, now)
		if pct >= cfg.ThresholdPct && pct < 100 {
			fired = true
			details["consumed_pct"] = pct
			details["threshold_pct"] = cfg.ThresholdPct
		}

	case "sla_breach":
		// Fire when SLA target exceeded.
		if ticket.SLAResolutionTarget != nil && now.After(*ticket.SLAResolutionTarget) {
			fired = true
			details["breached_by_minutes"] = now.Sub(*ticket.SLAResolutionTarget).Minutes()
		} else if ticket.SLAResponseTarget != nil && now.After(*ticket.SLAResponseTarget) {
			fired = true
			details["response_breached_by_minutes"] = now.Sub(*ticket.SLAResponseTarget).Minutes()
		}

	case "priority":
		// trigger_config: {"priority": "P1", "age_minutes": 30}
		var cfg struct {
			Priority   string `json:"priority"`
			AgeMinutes int    `json:"age_minutes"`
		}
		if err := json.Unmarshal(rule.TriggerConfig, &cfg); err != nil {
			return
		}
		if ticket.Priority == cfg.Priority {
			ageMin := now.Sub(ticket.CreatedAt).Minutes()
			if int(ageMin) >= cfg.AgeMinutes {
				fired = true
				details["age_minutes"] = int(ageMin)
				details["threshold_minutes"] = cfg.AgeMinutes
			}
		}
	}

	if !fired {
		return
	}

	// Record escalation event (dedup index prevents duplicates within the same hour).
	detailsJSON, _ := json.Marshal(details)
	_, err := w.pool.Exec(ctx, `
		INSERT INTO escalation_events (tenant_id, ticket_id, rule_id, trigger_type, action_taken, details)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (ticket_id, rule_id, DATE_TRUNC('hour', created_at)) DO NOTHING`,
		ticket.TenantID, ticket.ID, rule.ID, rule.TriggerType, "escalation_triggered", detailsJSON)
	if err != nil {
		slog.Error("escalation: insert event failed", "ticket", ticket.ID, "rule", rule.ID, "error", err)
		return
	}

	// Execute escalation chain actions.
	w.executeChain(ctx, rule, ticket)

	// Publish NATS event.
	if w.js != nil {
		payload, _ := json.Marshal(map[string]any{
			"ticketId":    ticket.ID,
			"ruleId":      rule.ID,
			"ruleName":    rule.Name,
			"triggerType": rule.TriggerType,
			"details":     details,
		})
		_, _ = w.js.Publish("notify.itsm.escalation", payload)
	}

	metrics.SLABreachesTotal.Inc()
	slog.Info("escalation fired", "ticket", ticket.ID, "rule", rule.Name, "trigger", rule.TriggerType)
}

// slaConsumptionPct returns how much of the SLA resolution budget has been consumed (0-100+).
func (w *EscalationWorker) slaConsumptionPct(t openTicket, now time.Time) float64 {
	if t.SLAResolutionTarget == nil {
		return 0
	}
	total := t.SLAResolutionTarget.Sub(t.CreatedAt)
	if total <= 0 {
		return 100
	}
	elapsed := now.Sub(t.CreatedAt) - time.Duration(t.SLAPausedDurationMins)*time.Minute
	if t.SLAPausedAt != nil {
		elapsed -= now.Sub(*t.SLAPausedAt)
	}
	return (float64(elapsed) / float64(total)) * 100
}

// evaluateServiceRequestRule checks a single rule against a service request.
func (w *EscalationWorker) evaluateServiceRequestRule(ctx context.Context, rule escalationRule, req openServiceRequest) {
	now := time.Now().UTC()
	fired := false
	details := map[string]any{"entity_type": "service_request"}

	switch rule.TriggerType {
	case "sla_warning":
		var cfg struct {
			ThresholdPct float64 `json:"threshold_percent"`
		}
		if err := json.Unmarshal(rule.TriggerConfig, &cfg); err != nil || cfg.ThresholdPct <= 0 {
			return
		}
		pct := w.serviceRequestSLAPct(req, now)
		if pct >= cfg.ThresholdPct && pct < 100 {
			fired = true
			details["consumed_pct"] = pct
			details["threshold_pct"] = cfg.ThresholdPct
		}

	case "sla_breach":
		if req.SLAFulfillmentTarget != nil && now.After(*req.SLAFulfillmentTarget) {
			fired = true
			details["fulfillment_breached_by_minutes"] = now.Sub(*req.SLAFulfillmentTarget).Minutes()
		} else if req.SLAResolutionTarget != nil && now.After(*req.SLAResolutionTarget) {
			fired = true
			details["resolution_breached_by_minutes"] = now.Sub(*req.SLAResolutionTarget).Minutes()
		}
	}

	if !fired {
		return
	}

	detailsJSON, _ := json.Marshal(details)
	_, err := w.pool.Exec(ctx, `
		INSERT INTO escalation_events (tenant_id, ticket_id, rule_id, trigger_type, action_taken, details)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (ticket_id, rule_id, DATE_TRUNC('hour', created_at)) DO NOTHING`,
		req.TenantID, req.ID, rule.ID, rule.TriggerType, "escalation_triggered", detailsJSON)
	if err != nil {
		slog.Error("escalation: insert service request event failed", "request", req.ID, "rule", rule.ID, "error", err)
		return
	}

	// Publish NATS event.
	if w.js != nil {
		payload, _ := json.Marshal(map[string]any{
			"serviceRequestId": req.ID,
			"ruleId":           rule.ID,
			"ruleName":         rule.Name,
			"triggerType":      rule.TriggerType,
			"details":          details,
		})
		_, _ = w.js.Publish("notify.itsm.escalation", payload)
	}

	metrics.SLABreachesTotal.Inc()
	slog.Info("escalation fired (service request)", "request", req.ID, "rule", rule.Name, "trigger", rule.TriggerType)
}

// serviceRequestSLAPct returns how much of the SLA fulfillment budget has been consumed (0-100+).
func (w *EscalationWorker) serviceRequestSLAPct(r openServiceRequest, now time.Time) float64 {
	if r.SLAFulfillmentTarget == nil {
		return 0
	}
	total := r.SLAFulfillmentTarget.Sub(r.CreatedAt)
	if total <= 0 {
		return 100
	}
	elapsed := now.Sub(r.CreatedAt) - time.Duration(r.SLAPausedDurationMins)*time.Minute
	if r.SLAPausedAt != nil {
		elapsed -= now.Sub(*r.SLAPausedAt)
	}
	return (float64(elapsed) / float64(total)) * 100
}

// executeChain parses the escalation_chain JSON and applies actions.
// Chain format: [{"action": "notify", "target_user_ids": [...]},
//
//	{"action": "reassign", "target_user_id": "..."},
//	{"action": "change_priority", "new_priority": "P1"}]
func (w *EscalationWorker) executeChain(ctx context.Context, rule escalationRule, ticket openTicket) {
	var chain []struct {
		Action       string    `json:"action"`
		TargetUserID *string   `json:"target_user_id"`
		TargetUsers  []string  `json:"target_user_ids"`
		NewPriority  string    `json:"new_priority"`
	}
	if err := json.Unmarshal(rule.EscalationChain, &chain); err != nil {
		slog.Error("escalation: parse chain failed", "rule", rule.ID, "error", err)
		return
	}

	for _, step := range chain {
		switch step.Action {
		case "reassign":
			if step.TargetUserID != nil {
				uid, err := uuid.Parse(*step.TargetUserID)
				if err != nil {
					continue
				}
				_, _ = w.pool.Exec(ctx, `UPDATE tickets SET assignee_id = $1, updated_at = now() WHERE id = $2`,
					uid, ticket.ID)
			}
		case "change_priority":
			if step.NewPriority != "" {
				_, _ = w.pool.Exec(ctx, `UPDATE tickets SET priority = $1, updated_at = now() WHERE id = $2`,
					step.NewPriority, ticket.ID)
			}
		case "notify":
			// Notification handled by the NATS event above.
		}
	}
}
