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

-- name: GetAssetByID :one
SELECT * FROM assets WHERE id = $1 AND tenant_id = $2;

-- name: GetAssetByTag :one
SELECT * FROM assets WHERE tenant_id = $1 AND asset_tag = $2;

-- name: ListAssets :many
SELECT * FROM assets
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type::text = $2)
  AND ($3::text IS NULL OR status::text = $3)
  AND ($4::uuid IS NULL OR owner_id = $4)
  AND ($5::uuid IS NULL OR custodian_id = $5)
ORDER BY created_at DESC
LIMIT $6 OFFSET $7;

-- name: CountAssets :one
SELECT COUNT(*)::int AS count FROM assets
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type::text = $2)
  AND ($3::text IS NULL OR status::text = $3)
  AND ($4::uuid IS NULL OR owner_id = $4)
  AND ($5::uuid IS NULL OR custodian_id = $5);

-- name: UpdateAsset :one
UPDATE assets
SET asset_tag = COALESCE($3, asset_tag),
    type = COALESCE($4, type),
    category = COALESCE($5, category),
    name = COALESCE($6, name),
    description = COALESCE($7, description),
    manufacturer = COALESCE($8, manufacturer),
    model = COALESCE($9, model),
    serial_number = COALESCE($10, serial_number),
    status = COALESCE($11, status),
    location = COALESCE($12, location),
    building = COALESCE($13, building),
    floor = COALESCE($14, floor),
    room = COALESCE($15, room),
    owner_id = COALESCE($16, owner_id),
    custodian_id = COALESCE($17, custodian_id),
    purchase_date = COALESCE($18, purchase_date),
    purchase_cost = COALESCE($19, purchase_cost),
    currency = COALESCE($20, currency),
    classification = COALESCE($21, classification),
    attributes = COALESCE($22, attributes),
    tags = COALESCE($23, tags)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteAsset :exec
DELETE FROM assets WHERE id = $1 AND tenant_id = $2;

-- name: ListAssetsByOwner :many
SELECT * FROM assets
WHERE tenant_id = $1 AND owner_id = $2
ORDER BY created_at DESC;

-- name: ListAssetsByLocation :many
SELECT * FROM assets
WHERE tenant_id = $1
  AND ($2::text IS NULL OR location = $2)
  AND ($3::text IS NULL OR building = $3)
  AND ($4::text IS NULL OR floor = $4)
ORDER BY name ASC;

-- name: GetAssetStats :one
SELECT
    COUNT(*)::int AS total_count,
    COUNT(*) FILTER (WHERE status = 'procured')::int AS procured_count,
    COUNT(*) FILTER (WHERE status = 'received')::int AS received_count,
    COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
    COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance_count,
    COUNT(*) FILTER (WHERE status = 'retired')::int AS retired_count,
    COUNT(*) FILTER (WHERE status = 'disposed')::int AS disposed_count,
    COUNT(*) FILTER (WHERE type = 'hardware')::int AS hardware_count,
    COUNT(*) FILTER (WHERE type = 'software')::int AS software_count,
    COUNT(*) FILTER (WHERE type = 'virtual')::int AS virtual_count,
    COUNT(*) FILTER (WHERE type = 'cloud')::int AS cloud_count,
    COUNT(*) FILTER (WHERE type = 'network')::int AS network_count,
    COUNT(*) FILTER (WHERE type = 'peripheral')::int AS peripheral_count
FROM assets
WHERE tenant_id = $1;

-- ──────────────────────────────────────────────
-- Asset Lifecycle Events
-- ──────────────────────────────────────────────

-- name: CreateLifecycleEvent :one
INSERT INTO asset_lifecycle_events (asset_id, event_type, performed_by, details, evidence_document_id, timestamp)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListLifecycleEventsByAsset :many
SELECT * FROM asset_lifecycle_events
WHERE asset_id = $1
ORDER BY timestamp DESC
LIMIT $2 OFFSET $3;

-- name: CountLifecycleEvents :one
SELECT COUNT(*)::int AS count FROM asset_lifecycle_events
WHERE asset_id = $1;

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

-- name: GetDisposalByID :one
SELECT * FROM asset_disposals WHERE id = $1 AND tenant_id = $2;

-- name: ListDisposals :many
SELECT * FROM asset_disposals
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status::text = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdateDisposalStatus :one
UPDATE asset_disposals
SET status = COALESCE($3, status),
    approved_by = COALESCE($4, approved_by),
    disposal_date = COALESCE($5, disposal_date),
    disposal_certificate_doc_id = COALESCE($6, disposal_certificate_doc_id),
    data_wipe_confirmed = COALESCE($7, data_wipe_confirmed)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: CountDisposals :one
SELECT COUNT(*)::int AS count FROM asset_disposals
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status::text = $2);

-- name: ListDisposalsByAsset :many
SELECT * FROM asset_disposals
WHERE asset_id = $1
ORDER BY created_at DESC;

-- ──────────────────────────────────────────────
-- CMDB Items (Configuration Items)
-- ──────────────────────────────────────────────

-- name: CreateCMDBItem :one
INSERT INTO cmdb_items (tenant_id, ci_type, name, status, asset_id, attributes, version)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetCMDBItemByID :one
SELECT * FROM cmdb_items WHERE id = $1 AND tenant_id = $2;

-- name: ListCMDBItems :many
SELECT * FROM cmdb_items
WHERE tenant_id = $1
  AND ($2::text IS NULL OR ci_type = $2)
  AND ($3::text IS NULL OR status = $3)
ORDER BY name ASC
LIMIT $4 OFFSET $5;

-- name: UpdateCMDBItem :one
UPDATE cmdb_items
SET ci_type = COALESCE($3, ci_type),
    name = COALESCE($4, name),
    status = COALESCE($5, status),
    asset_id = COALESCE($6, asset_id),
    attributes = COALESCE($7, attributes),
    version = version + 1
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteCMDBItem :exec
DELETE FROM cmdb_items WHERE id = $1 AND tenant_id = $2;

-- name: CountCMDBItems :one
SELECT COUNT(*)::int AS count FROM cmdb_items
WHERE tenant_id = $1
  AND ($2::text IS NULL OR ci_type = $2)
  AND ($3::text IS NULL OR status = $3);

-- name: GetCMDBItemByAsset :one
SELECT * FROM cmdb_items WHERE asset_id = $1 AND tenant_id = $2;

-- name: ListCMDBItemsByTenant :many
SELECT * FROM cmdb_items
WHERE tenant_id = $1
ORDER BY name ASC;

-- ──────────────────────────────────────────────
-- CMDB Relationships
-- ──────────────────────────────────────────────

-- name: CreateRelationship :one
INSERT INTO cmdb_relationships (source_ci_id, target_ci_id, relationship_type, description, is_active)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListRelationshipsByCI :many
SELECT * FROM cmdb_relationships
WHERE (source_ci_id = $1 OR target_ci_id = $1)
  AND is_active = TRUE
ORDER BY created_at DESC;

-- name: DeleteRelationship :exec
DELETE FROM cmdb_relationships WHERE id = $1;

-- name: ListAllRelationships :many
SELECT cr.* FROM cmdb_relationships cr
JOIN cmdb_items ci ON cr.source_ci_id = ci.id
WHERE ci.tenant_id = $1
  AND cr.is_active = TRUE
ORDER BY cr.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetRelationship :one
SELECT * FROM cmdb_relationships WHERE id = $1;

-- ──────────────────────────────────────────────
-- Reconciliation Runs
-- ──────────────────────────────────────────────

-- name: CreateReconciliationRun :one
INSERT INTO reconciliation_runs (tenant_id, source, started_at)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetReconciliationRunByID :one
SELECT * FROM reconciliation_runs WHERE id = $1 AND tenant_id = $2;

-- name: ListReconciliationRuns :many
SELECT * FROM reconciliation_runs
WHERE tenant_id = $1
ORDER BY started_at DESC
LIMIT $2 OFFSET $3;

-- name: CompleteReconciliationRun :one
UPDATE reconciliation_runs
SET completed_at = now(),
    matches = $2,
    discrepancies = $3,
    new_items = $4,
    report = $5
WHERE id = $1
RETURNING *;

-- ──────────────────────────────────────────────
-- Licenses
-- ──────────────────────────────────────────────

-- name: CreateLicense :one
INSERT INTO licenses (
    tenant_id, software_name, vendor, license_type, license_key,
    total_entitlements, assigned_count, compliance_status, expiry_date,
    cost, currency, renewal_contact, notes
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: GetLicenseByID :one
SELECT * FROM licenses WHERE id = $1 AND tenant_id = $2;

-- name: ListLicenses :many
SELECT * FROM licenses
WHERE tenant_id = $1
  AND ($2::text IS NULL OR compliance_status::text = $2)
  AND ($3::text IS NULL OR license_type::text = $3)
ORDER BY software_name ASC
LIMIT $4 OFFSET $5;

-- name: UpdateLicense :one
UPDATE licenses
SET software_name = COALESCE($3, software_name),
    vendor = COALESCE($4, vendor),
    license_type = COALESCE($5, license_type),
    license_key = COALESCE($6, license_key),
    total_entitlements = COALESCE($7, total_entitlements),
    assigned_count = COALESCE($8, assigned_count),
    compliance_status = COALESCE($9, compliance_status),
    expiry_date = COALESCE($10, expiry_date),
    cost = COALESCE($11, cost),
    currency = COALESCE($12, currency),
    renewal_contact = COALESCE($13, renewal_contact),
    notes = COALESCE($14, notes)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteLicense :exec
DELETE FROM licenses WHERE id = $1 AND tenant_id = $2;

-- name: CountLicenses :one
SELECT COUNT(*)::int AS count FROM licenses
WHERE tenant_id = $1
  AND ($2::text IS NULL OR compliance_status::text = $2)
  AND ($3::text IS NULL OR license_type::text = $3);

-- name: GetLicenseComplianceStats :one
SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant_count,
    COUNT(*) FILTER (WHERE compliance_status = 'over_deployed')::int AS over_deployed_count,
    COUNT(*) FILTER (WHERE compliance_status = 'under_utilized')::int AS under_utilized_count
FROM licenses
WHERE tenant_id = $1;

-- ──────────────────────────────────────────────
-- License Assignments
-- ──────────────────────────────────────────────

-- name: CreateLicenseAssignment :one
INSERT INTO license_assignments (license_id, user_id, asset_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListAssignmentsByLicense :many
SELECT * FROM license_assignments
WHERE license_id = $1
ORDER BY assigned_at DESC;

-- name: ListAssignmentsByUser :many
SELECT * FROM license_assignments
WHERE user_id = $1
ORDER BY assigned_at DESC;

-- name: DeleteLicenseAssignment :exec
DELETE FROM license_assignments WHERE id = $1;

-- name: IncrementAssignedCount :exec
UPDATE licenses
SET assigned_count = assigned_count + 1
WHERE id = $1;

-- name: DecrementAssignedCount :exec
UPDATE licenses
SET assigned_count = GREATEST(assigned_count - 1, 0)
WHERE id = $1;

-- ──────────────────────────────────────────────
-- Warranties
-- ──────────────────────────────────────────────

-- name: CreateWarranty :one
INSERT INTO warranties (
    asset_id, tenant_id, vendor, contract_number, coverage_type,
    start_date, end_date, cost, currency, renewal_status, notes
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetWarrantyByID :one
SELECT * FROM warranties WHERE id = $1 AND tenant_id = $2;

-- name: ListWarranties :many
SELECT * FROM warranties
WHERE tenant_id = $1
  AND ($2::text IS NULL OR renewal_status::text = $2)
  AND ($3::uuid IS NULL OR asset_id = $3)
ORDER BY end_date ASC
LIMIT $4 OFFSET $5;

-- name: UpdateWarranty :one
UPDATE warranties
SET vendor = COALESCE($3, vendor),
    contract_number = COALESCE($4, contract_number),
    coverage_type = COALESCE($5, coverage_type),
    start_date = COALESCE($6, start_date),
    end_date = COALESCE($7, end_date),
    cost = COALESCE($8, cost),
    currency = COALESCE($9, currency),
    renewal_status = COALESCE($10, renewal_status),
    notes = COALESCE($11, notes)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteWarranty :exec
DELETE FROM warranties WHERE id = $1 AND tenant_id = $2;

-- name: CountWarranties :one
SELECT COUNT(*)::int AS count FROM warranties
WHERE tenant_id = $1
  AND ($2::text IS NULL OR renewal_status::text = $2)
  AND ($3::uuid IS NULL OR asset_id = $3);

-- name: ListExpiringWarranties :many
SELECT * FROM warranties
WHERE tenant_id = $1
  AND end_date BETWEEN now() AND now() + $2::interval
ORDER BY end_date ASC;

-- ──────────────────────────────────────────────
-- Renewal Alerts
-- ──────────────────────────────────────────────

-- name: CreateRenewalAlert :one
INSERT INTO renewal_alerts (entity_type, entity_id, tenant_id, alert_date)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListPendingAlerts :many
SELECT * FROM renewal_alerts
WHERE tenant_id = $1
  AND sent = FALSE
  AND alert_date <= now()::date
ORDER BY alert_date ASC;

-- name: MarkAlertSent :exec
UPDATE renewal_alerts
SET sent = TRUE
WHERE id = $1;

-- name: ListAlertsByEntity :many
SELECT * FROM renewal_alerts
WHERE tenant_id = $1
  AND entity_type = $2
  AND entity_id = $3
ORDER BY alert_date DESC;
