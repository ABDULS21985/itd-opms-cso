-- ──────────────────────────────────────────────
-- Assets
-- ──────────────────────────────────────────────

-- name: CreateAsset :one
INSERT INTO assets (
    tenant_id, asset_tag, type, category, name, description,
    manufacturer, model, serial_number, status, location, building,
    floor, room, owner_id, custodian_id, purchase_date, purchase_cost,
    currency, classification, attributes, tags
)
VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12,
    $13, $14, $15, $16, $17, $18,
    $19, $20, $21, $22
)
RETURNING *;

-- name: GetAsset :one
SELECT * FROM assets WHERE id = $1 AND tenant_id = $2;

-- name: ListAssets :many
SELECT * FROM assets
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::text IS NULL OR location ILIKE '%' || $4 || '%')
  AND ($5::uuid IS NULL OR owner_id = $5)
ORDER BY created_at DESC
LIMIT $6 OFFSET $7;

-- name: CountAssets :one
SELECT COUNT(*)::int AS count FROM assets
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::text IS NULL OR location ILIKE '%' || $4 || '%')
  AND ($5::uuid IS NULL OR owner_id = $5);

-- name: UpdateAsset :one
UPDATE assets
SET asset_tag       = COALESCE($3, asset_tag),
    type            = COALESCE($4, type),
    category        = COALESCE($5, category),
    name            = COALESCE($6, name),
    description     = COALESCE($7, description),
    manufacturer    = COALESCE($8, manufacturer),
    model           = COALESCE($9, model),
    serial_number   = COALESCE($10, serial_number),
    status          = COALESCE($11, status),
    location        = COALESCE($12, location),
    building        = COALESCE($13, building),
    floor           = COALESCE($14, floor),
    room            = COALESCE($15, room),
    owner_id        = COALESCE($16, owner_id),
    custodian_id    = COALESCE($17, custodian_id),
    purchase_date   = COALESCE($18, purchase_date),
    purchase_cost   = COALESCE($19, purchase_cost),
    currency        = COALESCE($20, currency),
    classification  = COALESCE($21, classification),
    attributes      = COALESCE($22, attributes),
    tags            = COALESCE($23, tags)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateAssetStatus :exec
UPDATE assets SET status = $3 WHERE id = $1 AND tenant_id = $2;

-- name: DeleteAsset :exec
DELETE FROM assets WHERE id = $1 AND tenant_id = $2;

-- name: SearchAssets :many
SELECT * FROM assets
WHERE tenant_id = $1
  AND (name ILIKE '%' || $2 || '%' OR asset_tag ILIKE '%' || $2 || '%' OR serial_number ILIKE '%' || $2 || '%')
LIMIT $3 OFFSET $4;

-- name: CountSearchAssets :one
SELECT COUNT(*)::int AS count FROM assets
WHERE tenant_id = $1
  AND (name ILIKE '%' || $2 || '%' OR asset_tag ILIKE '%' || $2 || '%' OR serial_number ILIKE '%' || $2 || '%');

-- name: GetAssetStats :one
SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
    COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance_count,
    COUNT(*) FILTER (WHERE status = 'retired')::int AS retired_count
FROM assets
WHERE tenant_id = $1;

-- ──────────────────────────────────────────────
-- Asset Lifecycle Events
-- ──────────────────────────────────────────────

-- name: CreateLifecycleEvent :one
INSERT INTO asset_lifecycle_events (asset_id, tenant_id, event_type, performed_by, details, evidence_document_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListLifecycleEvents :many
SELECT * FROM asset_lifecycle_events
WHERE asset_id = $1
ORDER BY created_at DESC;

-- name: GetLifecycleEvent :one
SELECT * FROM asset_lifecycle_events WHERE id = $1;

-- ──────────────────────────────────────────────
-- Asset Disposals
-- ──────────────────────────────────────────────

-- name: CreateDisposal :one
INSERT INTO asset_disposals (
    asset_id, tenant_id, disposal_method, reason, approved_by,
    approval_chain_id, disposal_date, disposal_certificate_doc_id,
    witness_ids, data_wipe_confirmed, status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetDisposal :one
SELECT * FROM asset_disposals WHERE id = $1 AND tenant_id = $2;

-- name: ListDisposals :many
SELECT * FROM asset_disposals
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountDisposals :one
SELECT COUNT(*)::int AS count FROM asset_disposals
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2);

-- name: UpdateDisposalStatus :exec
UPDATE asset_disposals
SET status                      = COALESCE($3, status),
    approved_by                 = COALESCE($4, approved_by),
    disposal_date               = COALESCE($5, disposal_date),
    disposal_certificate_doc_id = COALESCE($6, disposal_certificate_doc_id)
WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- CMDB Items (Configuration Items)
-- ──────────────────────────────────────────────

-- name: CreateCMDBItem :one
INSERT INTO cmdb_items (tenant_id, ci_type, name, status, asset_id, attributes)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetCMDBItem :one
SELECT * FROM cmdb_items WHERE id = $1 AND tenant_id = $2;

-- name: ListCMDBItems :many
SELECT * FROM cmdb_items
WHERE tenant_id = $1
  AND ($2::text IS NULL OR ci_type = $2)
  AND ($3::text IS NULL OR status = $3)
ORDER BY name
LIMIT $4 OFFSET $5;

-- name: CountCMDBItems :one
SELECT COUNT(*)::int AS count FROM cmdb_items
WHERE tenant_id = $1
  AND ($2::text IS NULL OR ci_type = $2)
  AND ($3::text IS NULL OR status = $3);

-- name: UpdateCMDBItem :one
UPDATE cmdb_items
SET ci_type    = COALESCE($3, ci_type),
    name       = COALESCE($4, name),
    status     = COALESCE($5, status),
    asset_id   = COALESCE($6, asset_id),
    attributes = COALESCE($7, attributes),
    version    = version + 1
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteCMDBItem :exec
DELETE FROM cmdb_items WHERE id = $1 AND tenant_id = $2;

-- name: SearchCMDBItems :many
SELECT * FROM cmdb_items
WHERE tenant_id = $1
  AND name ILIKE '%' || $2 || '%'
LIMIT $3 OFFSET $4;

-- name: CountSearchCMDBItems :one
SELECT COUNT(*)::int AS count FROM cmdb_items
WHERE tenant_id = $1
  AND name ILIKE '%' || $2 || '%';

-- ──────────────────────────────────────────────
-- CMDB Relationships
-- ──────────────────────────────────────────────

-- name: CreateRelationship :one
INSERT INTO cmdb_relationships (source_ci_id, target_ci_id, relationship_type, description)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListRelationships :many
SELECT * FROM cmdb_relationships
WHERE (source_ci_id = $1 OR target_ci_id = $1)
  AND is_active = TRUE;

-- name: DeleteRelationship :exec
DELETE FROM cmdb_relationships WHERE id = $1;

-- name: GetRelationshipsBySourceCI :many
SELECT * FROM cmdb_relationships
WHERE source_ci_id = $1 AND is_active = TRUE;

-- name: GetRelationshipsByTargetCI :many
SELECT * FROM cmdb_relationships
WHERE target_ci_id = $1 AND is_active = TRUE;

-- ──────────────────────────────────────────────
-- Reconciliation Runs
-- ──────────────────────────────────────────────

-- name: CreateReconciliationRun :one
INSERT INTO reconciliation_runs (tenant_id, source)
VALUES ($1, $2)
RETURNING *;

-- name: GetReconciliationRun :one
SELECT * FROM reconciliation_runs WHERE id = $1 AND tenant_id = $2;

-- name: ListReconciliationRuns :many
SELECT * FROM reconciliation_runs
WHERE tenant_id = $1
ORDER BY started_at DESC
LIMIT $2 OFFSET $3;

-- name: CountReconciliationRuns :one
SELECT COUNT(*)::int AS count FROM reconciliation_runs
WHERE tenant_id = $1;

-- ──────────────────────────────────────────────
-- Licenses
-- ──────────────────────────────────────────────

-- name: CreateLicense :one
INSERT INTO licenses (
    tenant_id, software_name, vendor, license_type,
    total_entitlements, expiry_date, cost, renewal_contact
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetLicense :one
SELECT * FROM licenses WHERE id = $1 AND tenant_id = $2;

-- name: ListLicenses :many
SELECT * FROM licenses
WHERE tenant_id = $1
  AND ($2::text IS NULL OR license_type = $2)
  AND ($3::text IS NULL OR compliance_status = $3)
ORDER BY software_name
LIMIT $4 OFFSET $5;

-- name: CountLicenses :one
SELECT COUNT(*)::int AS count FROM licenses
WHERE tenant_id = $1
  AND ($2::text IS NULL OR license_type = $2)
  AND ($3::text IS NULL OR compliance_status = $3);

-- name: UpdateLicense :one
UPDATE licenses
SET software_name      = COALESCE($3, software_name),
    vendor             = COALESCE($4, vendor),
    license_type       = COALESCE($5, license_type),
    total_entitlements = COALESCE($6, total_entitlements),
    compliance_status  = COALESCE($7, compliance_status),
    expiry_date        = COALESCE($8, expiry_date),
    cost               = COALESCE($9, cost),
    renewal_contact    = COALESCE($10, renewal_contact)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteLicense :exec
DELETE FROM licenses WHERE id = $1 AND tenant_id = $2;

-- name: GetLicenseComplianceStats :one
SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant,
    COUNT(*) FILTER (WHERE compliance_status = 'over_deployed')::int AS over_deployed,
    COUNT(*) FILTER (WHERE compliance_status = 'under_utilized')::int AS under_utilized
FROM licenses
WHERE tenant_id = $1;

-- name: UpdateLicenseAssignedCount :exec
UPDATE licenses
SET assigned_count    = $2,
    compliance_status = CASE
        WHEN $2 > total_entitlements THEN 'over_deployed'
        WHEN $2 < total_entitlements * 0.5 THEN 'under_utilized'
        ELSE 'compliant'
    END
WHERE id = $1;

-- ──────────────────────────────────────────────
-- License Assignments
-- ──────────────────────────────────────────────

-- name: CreateLicenseAssignment :one
INSERT INTO license_assignments (license_id, tenant_id, user_id, asset_id)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListLicenseAssignments :many
SELECT * FROM license_assignments
WHERE license_id = $1
ORDER BY assigned_at DESC;

-- name: DeleteLicenseAssignment :exec
DELETE FROM license_assignments WHERE id = $1;

-- name: CountLicenseAssignments :one
SELECT COUNT(*)::int AS count FROM license_assignments
WHERE license_id = $1;

-- ──────────────────────────────────────────────
-- Warranties
-- ──────────────────────────────────────────────

-- name: CreateWarranty :one
INSERT INTO warranties (
    asset_id, tenant_id, vendor, contract_number, coverage_type,
    start_date, end_date, cost, renewal_status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetWarranty :one
SELECT * FROM warranties WHERE id = $1 AND tenant_id = $2;

-- name: ListWarranties :many
SELECT * FROM warranties
WHERE tenant_id = $1
  AND ($2::text IS NULL OR renewal_status = $2)
ORDER BY end_date ASC
LIMIT $3 OFFSET $4;

-- name: CountWarranties :one
SELECT COUNT(*)::int AS count FROM warranties
WHERE tenant_id = $1
  AND ($2::text IS NULL OR renewal_status = $2);

-- name: UpdateWarranty :one
UPDATE warranties
SET vendor          = COALESCE($3, vendor),
    contract_number = COALESCE($4, contract_number),
    coverage_type   = COALESCE($5, coverage_type),
    start_date      = COALESCE($6, start_date),
    end_date        = COALESCE($7, end_date),
    cost            = COALESCE($8, cost),
    renewal_status  = COALESCE($9, renewal_status)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteWarranty :exec
DELETE FROM warranties WHERE id = $1 AND tenant_id = $2;

-- name: GetExpiringWarranties :many
SELECT * FROM warranties
WHERE tenant_id = $1
  AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2::int || ' days')::interval
ORDER BY end_date ASC;

-- ──────────────────────────────────────────────
-- Renewal Alerts
-- ──────────────────────────────────────────────

-- name: CreateRenewalAlert :one
INSERT INTO renewal_alerts (tenant_id, entity_type, entity_id, alert_date)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListPendingAlerts :many
SELECT * FROM renewal_alerts
WHERE tenant_id = $1
  AND sent = FALSE
  AND alert_date <= CURRENT_DATE
ORDER BY alert_date ASC;

-- name: MarkAlertSent :exec
UPDATE renewal_alerts SET sent = TRUE WHERE id = $1;

-- name: ListAlertsByEntity :many
SELECT * FROM renewal_alerts
WHERE entity_type = $1
  AND entity_id = $2
ORDER BY alert_date ASC;
