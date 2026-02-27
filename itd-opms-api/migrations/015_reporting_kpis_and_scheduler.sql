-- +goose Up
-- Migration 015: Reporting KPI expansion and scheduled report run support.

ALTER TABLE report_runs
    ADD COLUMN IF NOT EXISTS trigger_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE report_runs
    ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

ALTER TABLE report_runs
    DROP CONSTRAINT IF EXISTS chk_report_runs_trigger_source;

ALTER TABLE report_runs
    ADD CONSTRAINT chk_report_runs_trigger_source
        CHECK (trigger_source IN ('manual', 'schedule', 'system'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_runs_definition_scheduled_for
    ON report_runs(definition_id, scheduled_for)
    WHERE scheduled_for IS NOT NULL;

DROP MATERIALIZED VIEW IF EXISTS mv_executive_summary;

CREATE MATERIALIZED VIEW mv_executive_summary AS
SELECT
    t.id AS tenant_id,

    -- Governance
    (SELECT COUNT(*) FROM policies p WHERE p.tenant_id = t.id AND p.status = 'active') AS active_policies,
    (
        SELECT COUNT(*)
        FROM action_items ai
        WHERE ai.tenant_id = t.id
          AND ai.status NOT IN ('completed', 'cancelled')
          AND ai.due_date < CURRENT_DATE
    ) AS overdue_actions,
    (SELECT COUNT(*) FROM policy_attestations pa WHERE pa.tenant_id = t.id AND pa.status = 'pending') AS pending_attestations,
    (SELECT COALESCE(ROUND(AVG(o.progress_pct)::numeric, 2), 0) FROM okrs o WHERE o.tenant_id = t.id AND o.status = 'active') AS avg_okr_progress,

    -- ITSM
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
    ) AS open_tickets,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
          AND tk.priority = 'P1_critical'
    ) AS critical_tickets,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
          AND tk.priority = 'P1_critical'
    ) AS open_tickets_p1,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
          AND tk.priority = 'P2_high'
    ) AS open_tickets_p2,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
          AND tk.priority = 'P3_medium'
    ) AS open_tickets_p3,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
          AND tk.priority = 'P4_low'
    ) AS open_tickets_p4,
    (
        SELECT CASE
            WHEN COUNT(*) FILTER (WHERE tk.sla_resolution_met IS NOT NULL) = 0 THEN 100::numeric
            ELSE ROUND(
                (
                    COUNT(*) FILTER (WHERE tk.sla_resolution_met = true)::numeric
                    / NULLIF(COUNT(*) FILTER (WHERE tk.sla_resolution_met IS NOT NULL)::numeric, 0)
                ) * 100,
                2
            )
        END
        FROM tickets tk
        WHERE tk.tenant_id = t.id
    ) AS sla_compliance_pct,
    (
        SELECT COALESCE(
            ROUND(
                AVG(EXTRACT(EPOCH FROM (tk.resolved_at - tk.created_at)) / 60.0)::numeric,
                2
            ),
            0
        )
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.resolved_at IS NOT NULL
    ) AS mttr_minutes,
    (
        SELECT COALESCE(
            ROUND(
                AVG(EXTRACT(EPOCH FROM (tk.first_response_at - tk.created_at)) / 60.0)::numeric,
                2
            ),
            0
        )
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.first_response_at IS NOT NULL
    ) AS mtta_minutes,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.tenant_id = t.id
          AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
          AND tk.created_at < NOW() - INTERVAL '30 days'
    ) AS backlog_over_30_days,

    -- PMO
    (SELECT COUNT(*) FROM projects pj WHERE pj.tenant_id = t.id AND pj.status = 'active') AS active_projects,
    (SELECT COUNT(*) FROM projects pj WHERE pj.tenant_id = t.id AND pj.rag_status = 'green') AS projects_rag_green,
    (SELECT COUNT(*) FROM projects pj WHERE pj.tenant_id = t.id AND pj.rag_status = 'amber') AS projects_rag_amber,
    (SELECT COUNT(*) FROM projects pj WHERE pj.tenant_id = t.id AND pj.rag_status = 'red') AS projects_rag_red,
    (
        SELECT CASE
            WHEN COUNT(*) FILTER (WHERE pj.actual_end IS NOT NULL AND pj.planned_end IS NOT NULL) = 0 THEN 0::numeric
            ELSE ROUND(
                (
                    COUNT(*) FILTER (
                        WHERE pj.actual_end IS NOT NULL
                          AND pj.planned_end IS NOT NULL
                          AND pj.actual_end <= pj.planned_end
                    )::numeric
                    / NULLIF(COUNT(*) FILTER (WHERE pj.actual_end IS NOT NULL AND pj.planned_end IS NOT NULL)::numeric, 0)
                ) * 100,
                2
            )
        END
        FROM projects pj
        WHERE pj.tenant_id = t.id
    ) AS on_time_delivery_pct,
    (
        SELECT CASE
            WHEN COUNT(*) = 0 THEN 0::numeric
            ELSE ROUND(
                (
                    COUNT(*) FILTER (WHERE m.status = 'completed' OR m.actual_date IS NOT NULL)::numeric
                    / COUNT(*)::numeric
                ) * 100,
                2
            )
        END
        FROM milestones m
        WHERE m.tenant_id = t.id
    ) AS milestone_burn_down_pct,

    -- CMDB
    (SELECT COUNT(*) FROM assets a WHERE a.tenant_id = t.id AND a.status = 'active') AS active_assets,
    (
        SELECT COALESCE(jsonb_object_agg(s.type, s.count), '{}'::jsonb)
        FROM (
            SELECT a.type, COUNT(*)::int AS count
            FROM assets a
            WHERE a.tenant_id = t.id
            GROUP BY a.type
        ) s
    ) AS asset_counts_by_type,
    (
        SELECT COALESCE(jsonb_object_agg(s.status, s.count), '{}'::jsonb)
        FROM (
            SELECT a.status, COUNT(*)::int AS count
            FROM assets a
            WHERE a.tenant_id = t.id
            GROUP BY a.status
        ) s
    ) AS asset_counts_by_status,
    (
        SELECT COUNT(*)
        FROM licenses l
        WHERE l.tenant_id = t.id
          AND l.compliance_status = 'over_deployed'
    ) AS over_deployed_licenses,
    (
        SELECT CASE
            WHEN COUNT(*) = 0 THEN 100::numeric
            ELSE ROUND(
                (
                    COUNT(*) FILTER (WHERE l.compliance_status = 'compliant')::numeric
                    / COUNT(*)::numeric
                ) * 100,
                2
            )
        END
        FROM licenses l
        WHERE l.tenant_id = t.id
    ) AS license_compliance_pct,
    (
        SELECT COUNT(*)
        FROM warranties w
        WHERE w.tenant_id = t.id
          AND w.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 90)
    ) AS warranties_expiring_90_days,

    -- GRC
    (
        SELECT COUNT(*)
        FROM risks rk
        WHERE rk.tenant_id = t.id
          AND rk.status NOT IN ('closed', 'accepted')
          AND rk.risk_score BETWEEN 12 AND 19
    ) AS high_risks,
    (
        SELECT COUNT(*)
        FROM risks rk
        WHERE rk.tenant_id = t.id
          AND rk.status NOT IN ('closed', 'accepted')
          AND rk.risk_score >= 20
    ) AS critical_risks,
    (
        SELECT COALESCE(ROUND(AVG(a.readiness_score)::numeric, 2), 0)
        FROM audits a
        WHERE a.tenant_id = t.id
    ) AS audit_readiness_score,
    (
        SELECT COALESCE(ROUND(AVG(arc.completion_rate)::numeric, 2), 0)
        FROM access_review_campaigns arc
        WHERE arc.tenant_id = t.id
          AND arc.status IN ('active', 'review', 'completed')
    ) AS access_review_completion_pct,

    -- People
    (
        SELECT COALESCE(ROUND(AVG(ca.allocation_pct)::numeric, 2), 0)
        FROM capacity_allocations ca
        WHERE ca.tenant_id = t.id
          AND ca.period_start <= CURRENT_DATE
          AND ca.period_end >= CURRENT_DATE
    ) AS team_capacity_utilization_pct,
    (
        SELECT COUNT(*)
        FROM training_records tr
        WHERE tr.tenant_id = t.id
          AND (
            (tr.status IN ('planned', 'in_progress') AND tr.created_at::date < (CURRENT_DATE - 30))
            OR (tr.expiry_date IS NOT NULL AND tr.expiry_date < CURRENT_DATE)
          )
    ) AS overdue_training_certs,
    (
        SELECT COUNT(*)
        FROM training_records tr
        WHERE tr.tenant_id = t.id
          AND tr.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 30)
          AND tr.status <> 'expired'
    ) AS expiring_certs,

    now() AS refreshed_at
FROM tenants t;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_executive_summary_tenant
    ON mv_executive_summary(tenant_id);

-- +goose Down
DROP INDEX IF EXISTS idx_report_runs_definition_scheduled_for;
ALTER TABLE report_runs DROP CONSTRAINT IF EXISTS chk_report_runs_trigger_source;
ALTER TABLE report_runs DROP COLUMN IF EXISTS trigger_source;
ALTER TABLE report_runs DROP COLUMN IF EXISTS scheduled_for;

DROP INDEX IF EXISTS idx_mv_executive_summary_tenant;
DROP MATERIALIZED VIEW IF EXISTS mv_executive_summary;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_executive_summary AS
SELECT
    t.id AS tenant_id,
    -- Governance
    (SELECT COUNT(*) FROM policies p WHERE p.tenant_id = t.id AND p.status = 'active') AS active_policies,
    (SELECT COUNT(*) FROM action_items ai WHERE ai.tenant_id = t.id AND ai.status != 'completed' AND ai.due_date < CURRENT_DATE) AS overdue_actions,
    (SELECT COALESCE(AVG(progress_pct), 0) FROM okrs o WHERE o.tenant_id = t.id AND o.status = 'active') AS avg_okr_progress,
    -- ITSM
    (SELECT COUNT(*) FROM tickets tk WHERE tk.tenant_id = t.id AND tk.status NOT IN ('resolved','closed')) AS open_tickets,
    (SELECT COUNT(*) FROM tickets tk WHERE tk.tenant_id = t.id AND tk.status NOT IN ('resolved','closed') AND tk.priority = 'critical') AS critical_tickets,
    -- PMO
    (SELECT COUNT(*) FROM projects pj WHERE pj.tenant_id = t.id AND pj.status = 'active') AS active_projects,
    -- CMDB
    (SELECT COUNT(*) FROM assets a WHERE a.tenant_id = t.id AND a.status = 'active') AS active_assets,
    (SELECT COUNT(*) FROM licenses l WHERE l.tenant_id = t.id AND l.compliance_status = 'over_deployed') AS over_deployed_licenses,
    -- GRC
    (SELECT COUNT(*) FROM risks rk WHERE rk.tenant_id = t.id AND rk.status NOT IN ('closed','accepted') AND rk.risk_score >= 12) AS high_risks,
    -- People
    (SELECT COUNT(*) FROM training_records tr WHERE tr.tenant_id = t.id AND tr.expiry_date IS NOT NULL AND tr.expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_certs,
    -- Timestamp
    now() AS refreshed_at
FROM tenants t;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_executive_summary_tenant
    ON mv_executive_summary(tenant_id);
