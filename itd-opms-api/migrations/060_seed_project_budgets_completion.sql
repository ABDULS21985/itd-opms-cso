-- +goose Up
-- Migration 060: Seed realistic budget and completion data for FY2026 portfolio projects.
-- This populates budget_approved, budget_spent, and updates completion_pct so the
-- Portfolio Health Scorecard radar chart and budget comparison charts render properly.

-- Active projects: realistic budgets (NGN millions) and completion percentages
UPDATE projects SET budget_approved = 85000000,  budget_spent = 59500000,  completion_pct = 70  WHERE code = 'AMD-001';
UPDATE projects SET budget_approved = 120000000, budget_spent = 42000000,  completion_pct = 15  WHERE code = 'AMD-002';
UPDATE projects SET budget_approved = 65000000,  budget_spent = 26000000,  completion_pct = 35  WHERE code = 'AMD-003';
UPDATE projects SET budget_approved = 40000000,  budget_spent = 2000000,   completion_pct = 5   WHERE code = 'AMD-004';
UPDATE projects SET budget_approved = 95000000,  budget_spent = 85500000,  completion_pct = 60  WHERE code = 'AMD-005';
UPDATE projects SET budget_approved = 78000000,  budget_spent = 70200000,  completion_pct = 55  WHERE code = 'AMD-006';
UPDATE projects SET budget_approved = 55000000,  budget_spent = 44000000,  completion_pct = 45  WHERE code = 'AMD-007';
UPDATE projects SET budget_approved = 72000000,  budget_spent = 36000000,  completion_pct = 30  WHERE code = 'AMD-008';
UPDATE projects SET budget_approved = 48000000,  budget_spent = 33600000,  completion_pct = 40  WHERE code = 'AMD-009';
UPDATE projects SET budget_approved = 35000000,  budget_spent = 10500000,  completion_pct = 20  WHERE code = 'AMD-010';
UPDATE projects SET budget_approved = 28000000,  budget_spent = 25200000,  completion_pct = 65  WHERE code = 'AMD-011';
UPDATE projects SET budget_approved = 90000000,  budget_spent = 63000000,  completion_pct = 50  WHERE code = 'AMD-012';
UPDATE projects SET budget_approved = 42000000,  budget_spent = 12600000,  completion_pct = 25  WHERE code = 'AMD-013';
UPDATE projects SET budget_approved = 38000000,  budget_spent = 11400000,  completion_pct = 20  WHERE code = 'AMD-014';
UPDATE projects SET budget_approved = 25000000,  budget_spent = 0,         completion_pct = 0   WHERE code = 'AMD-015';
UPDATE projects SET budget_approved = 30000000,  budget_spent = 24000000,  completion_pct = 75  WHERE code = 'AMD-020';
UPDATE projects SET budget_approved = 45000000,  budget_spent = 18000000,  completion_pct = 30  WHERE code = 'AMD-021';
UPDATE projects SET budget_approved = 22000000,  budget_spent = 21500000,  completion_pct = 100 WHERE code = 'AMD-022';
UPDATE projects SET budget_approved = 50000000,  budget_spent = 40000000,  completion_pct = 75  WHERE code = 'AMD-023';
UPDATE projects SET budget_approved = 33000000,  budget_spent = 9900000,   completion_pct = 23  WHERE code = 'AMD-024';
UPDATE projects SET budget_approved = 60000000,  budget_spent = 3000000,   completion_pct = 5   WHERE code = 'AMD-027';
UPDATE projects SET budget_approved = 55000000,  budget_spent = 2750000,   completion_pct = 3   WHERE code = 'AMD-028';
UPDATE projects SET budget_approved = 110000000, budget_spent = 5500000,   completion_pct = 2   WHERE code = 'AMD-029';
UPDATE projects SET budget_approved = 75000000,  budget_spent = 3750000,   completion_pct = 4   WHERE code = 'AMD-030';
UPDATE projects SET budget_approved = 48000000,  budget_spent = 2400000,   completion_pct = 3   WHERE code = 'AMD-031';
UPDATE projects SET budget_approved = 32000000,  budget_spent = 1600000,   completion_pct = 2   WHERE code = 'AMD-032';
UPDATE projects SET budget_approved = 28000000,  budget_spent = 1400000,   completion_pct = 3   WHERE code = 'AMD-033';
UPDATE projects SET budget_approved = 18000000,  budget_spent = 900000,    completion_pct = 4   WHERE code = 'AMD-034';
UPDATE projects SET budget_approved = 42000000,  budget_spent = 2100000,   completion_pct = 3   WHERE code = 'AMD-035';
UPDATE projects SET budget_approved = 20000000,  budget_spent = 1000000,   completion_pct = 2   WHERE code = 'AMD-036';
UPDATE projects SET budget_approved = 15000000,  budget_spent = 750000,    completion_pct = 2   WHERE code = 'AMD-037';
UPDATE projects SET budget_approved = 22000000,  budget_spent = 1100000,   completion_pct = 3   WHERE code = 'AMD-038';
UPDATE projects SET budget_approved = 68000000,  budget_spent = 34000000,  completion_pct = 28  WHERE code = 'AMD-039';
UPDATE projects SET budget_approved = 52000000,  budget_spent = 26000000,  completion_pct = 22  WHERE code = 'AMD-040';
UPDATE projects SET budget_approved = 45000000,  budget_spent = 22500000,  completion_pct = 18  WHERE code = 'AMD-041';

-- Refresh materialized view so executive summary picks up updated data
REFRESH MATERIALIZED VIEW mv_executive_summary;

-- +goose Down
-- Reset budgets and completion to zero
UPDATE projects SET budget_approved = NULL, budget_spent = 0, completion_pct = 0
WHERE code LIKE 'AMD-%';

REFRESH MATERIALIZED VIEW mv_executive_summary;
