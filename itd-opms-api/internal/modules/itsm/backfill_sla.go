package itsm

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BackfillResult summarises a BackfillTicketSLATargets run.
type BackfillResult struct {
	Scanned   int // open tickets with NULL targets examined
	Updated   int // tickets that received computed SLA targets
	NoPolicy  int // skipped: no explicit and no default active policy
	NoTargets int // skipped: policy had no priority_targets row for the ticket's priority
}

// BackfillTicketSLATargets computes and persists sla_response_target /
// sla_resolution_target for OPEN tickets that were created before SLA target
// auto-calculation existed (their targets are NULL, so the escalation worker
// and SLA gauges treat them as having no SLA).
//
// It reuses the exact same resolution rules as CreateTicket — explicit policy
// or tenant default, priority_targets lookup, and the business-hours-aware
// advanceByBusinessMinutes calculation anchored at the ticket's created_at —
// so backfilled targets are identical to what a freshly created ticket would
// get. The operation is idempotent: it only touches tickets whose response and
// resolution targets are both NULL, and it never modifies resolved/closed/
// cancelled tickets.
//
// It runs across all tenants in a single pass and caches policies and calendars
// to avoid repeated lookups.
func BackfillTicketSLATargets(ctx context.Context, pool *pgxpool.Pool) (BackfillResult, error) {
	var res BackfillResult

	rows, err := pool.Query(ctx, `
		SELECT id, tenant_id, priority, sla_policy_id, created_at
		FROM tickets
		WHERE status NOT IN ('resolved', 'closed', 'cancelled')
		  AND sla_response_target IS NULL
		  AND sla_resolution_target IS NULL
		ORDER BY created_at`)
	if err != nil {
		return res, fmt.Errorf("query open tickets: %w", err)
	}

	type ticketRow struct {
		id        uuid.UUID
		tenantID  uuid.UUID
		priority  string
		policyID  *uuid.UUID
		createdAt time.Time
	}
	var tickets []ticketRow
	for rows.Next() {
		var t ticketRow
		if err := rows.Scan(&t.id, &t.tenantID, &t.priority, &t.policyID, &t.createdAt); err != nil {
			rows.Close()
			return res, fmt.Errorf("scan ticket: %w", err)
		}
		tickets = append(tickets, t)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, fmt.Errorf("iterate tickets: %w", err)
	}
	res.Scanned = len(tickets)

	// Caches keyed to avoid repeated lookups during the pass.
	type policyInfo struct {
		priorityTargets json.RawMessage
		calendarID      *uuid.UUID
	}
	defaultPolicyByTenant := make(map[uuid.UUID]*uuid.UUID) // nil value = looked up, none exists
	policyCache := make(map[uuid.UUID]*policyInfo)          // nil value = looked up, not found/inactive
	calendarCache := make(map[uuid.UUID]*BusinessHoursCalendar)

	resolveDefault := func(tenantID uuid.UUID) *uuid.UUID {
		if id, ok := defaultPolicyByTenant[tenantID]; ok {
			return id
		}
		var defaultID uuid.UUID
		err := pool.QueryRow(ctx,
			`SELECT id FROM sla_policies
			 WHERE tenant_id = $1 AND is_default = true AND is_active = true
			 LIMIT 1`, tenantID).Scan(&defaultID)
		if err != nil {
			defaultPolicyByTenant[tenantID] = nil
			return nil
		}
		defaultPolicyByTenant[tenantID] = &defaultID
		return &defaultID
	}

	loadPolicy := func(policyID, tenantID uuid.UUID) *policyInfo {
		if p, ok := policyCache[policyID]; ok {
			return p
		}
		var p policyInfo
		err := pool.QueryRow(ctx,
			`SELECT priority_targets, business_hours_calendar_id FROM sla_policies
			 WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
			policyID, tenantID).Scan(&p.priorityTargets, &p.calendarID)
		if err != nil {
			policyCache[policyID] = nil
			return nil
		}
		policyCache[policyID] = &p
		return &p
	}

	loadCalendar := func(calendarID, tenantID uuid.UUID) *BusinessHoursCalendar {
		if c, ok := calendarCache[calendarID]; ok {
			return c
		}
		var cal BusinessHoursCalendar
		err := pool.QueryRow(ctx,
			`SELECT id, tenant_id, name, timezone, schedule, holidays, created_at, updated_at
			 FROM business_hours_calendars WHERE id = $1 AND tenant_id = $2`,
			calendarID, tenantID).Scan(&cal.ID, &cal.TenantID, &cal.Name, &cal.Timezone,
			&cal.Schedule, &cal.Holidays, &cal.CreatedAt, &cal.UpdatedAt)
		if err != nil {
			calendarCache[calendarID] = nil
			return nil
		}
		calendarCache[calendarID] = &cal
		return &cal
	}

	for _, t := range tickets {
		policyID := t.policyID
		if policyID == nil {
			policyID = resolveDefault(t.tenantID)
		}
		if policyID == nil {
			res.NoPolicy++
			continue
		}

		policy := loadPolicy(*policyID, t.tenantID)
		if policy == nil {
			// Policy missing or inactive — leave the ticket without targets.
			res.NoPolicy++
			continue
		}

		responseMins, resolutionMins, ok := lookupPriorityTargetMinutes(policy.priorityTargets, t.priority)
		if !ok || (responseMins <= 0 && resolutionMins <= 0) {
			res.NoTargets++
			continue
		}

		var calendar *BusinessHoursCalendar
		if policy.calendarID != nil {
			calendar = loadCalendar(*policy.calendarID, t.tenantID)
		}

		// Anchor the calculation at the ticket's creation time so targets match
		// what CreateTicket would have produced.
		var responseTarget, resolutionTarget *time.Time
		if responseMins > 0 {
			rt := advanceByBusinessMinutes(t.createdAt, responseMins, calendar)
			responseTarget = &rt
		}
		if resolutionMins > 0 {
			rest := advanceByBusinessMinutes(t.createdAt, resolutionMins, calendar)
			resolutionTarget = &rest
		}

		// Persist the resolved policy id too, so default-policy tickets become
		// explicit (and re-running this backfill is a no-op for them).
		ct, err := pool.Exec(ctx, `
			UPDATE tickets SET
				sla_policy_id = $1,
				sla_response_target = $2,
				sla_resolution_target = $3,
				updated_at = $4
			WHERE id = $5
			  AND sla_response_target IS NULL
			  AND sla_resolution_target IS NULL`,
			*policyID, responseTarget, resolutionTarget, time.Now().UTC(), t.id)
		if err != nil {
			return res, fmt.Errorf("update ticket %s: %w", t.id, err)
		}
		if ct.RowsAffected() > 0 {
			res.Updated++
		}
	}

	slog.InfoContext(ctx, "SLA target backfill complete",
		"scanned", res.Scanned,
		"updated", res.Updated,
		"skipped_no_policy", res.NoPolicy,
		"skipped_no_targets", res.NoTargets,
	)

	return res, nil
}
