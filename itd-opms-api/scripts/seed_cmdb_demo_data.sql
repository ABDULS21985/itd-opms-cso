\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    v_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
    v_ns UUID := '9b7a8f28-3228-4b44-981a-f8c572347b30';
    v_actor_id UUID;
    v_user_ids UUID[];
    v_org_ids UUID[];
    v_user_count INT;
    v_org_count INT;
    v_asset_types TEXT[] := ARRAY['hardware','software','virtual','cloud','network','peripheral'];
    v_asset_statuses TEXT[] := ARRAY['active','active','active','maintenance','received','procured','retired','disposed'];
    v_asset_categories TEXT[] := ARRAY['Laptop','Server','Router','Switch','Firewall','Database','Core Banking','Storage','Printer','UPS','Virtual Machine','Cloud Subscription'];
    v_manufacturers TEXT[] := ARRAY['Dell','HP','Lenovo','Cisco','Fortinet','Microsoft','Oracle','VMware','Nutanix','APC','AWS','Azure'];
    v_locations TEXT[] := ARRAY['CBN Abuja HQ','Lagos Branch','Kano Branch','Port Harcourt Branch','Enugu Branch','Ibadan Branch','Kaduna Branch','DR Site'];
    v_buildings TEXT[] := ARRAY['HQ Tower A','HQ Tower B','Data Centre 1','Data Centre 2','Branch Operations','Network Operations Centre'];
    v_ci_types TEXT[] := ARRAY['business_service','application','server','database','network_device','storage','api','cloud_resource'];
    v_ci_statuses TEXT[] := ARRAY['active','active','active','planned','inactive','decommissioned'];
    v_rel_types TEXT[] := ARRAY['depends_on','runs_on','connected_to','managed_by','contains','uses'];
    v_license_types TEXT[] := ARRAY['subscription','per_user','per_device','site','perpetual'];
    v_vendor_types TEXT[] := ARRAY['hardware','software','services','cloud','telecom','consulting','other'];
    v_vendor_names TEXT[] := ARRAY[
        'CMDB Demo Microsoft Enterprise',
        'CMDB Demo Oracle Nigeria',
        'CMDB Demo Cisco Systems',
        'CMDB Demo Dell Technologies',
        'CMDB Demo Fortinet Security',
        'CMDB Demo VMware Broadcom',
        'CMDB Demo Azure Cloud Partner',
        'CMDB Demo MainOne Telecom',
        'CMDB Demo Lenovo Premier',
        'CMDB Demo HP Enterprise',
        'CMDB Demo Nutanix Platform',
        'CMDB Demo ServiceNow Advisory'
    ];
    v_software_names TEXT[] := ARRAY[
        'CMDB Demo Microsoft 365 E5',
        'CMDB Demo Windows Server Datacenter',
        'CMDB Demo Oracle Database Enterprise',
        'CMDB Demo VMware vSphere',
        'CMDB Demo FortiGate UTM',
        'CMDB Demo Cisco DNA Center',
        'CMDB Demo Red Hat Enterprise Linux',
        'CMDB Demo Tableau Server',
        'CMDB Demo Power BI Premium',
        'CMDB Demo Jira Service Management',
        'CMDB Demo GitHub Enterprise',
        'CMDB Demo Veeam Backup',
        'CMDB Demo Splunk Enterprise',
        'CMDB Demo Elastic Observability',
        'CMDB Demo Adobe Creative Cloud'
    ];
    v_asset_id UUID;
    v_ci_id UUID;
    v_target_ci_id UUID;
    v_license_id UUID;
    v_vendor_id UUID;
    v_contract_id UUID;
    v_campaign_id UUID;
    v_profile_id UUID;
    v_run_id UUID;
    v_warranty_id UUID;
    v_asset_type TEXT;
    v_asset_status TEXT;
    v_verification_status TEXT;
    v_condition TEXT;
    v_discrepancy TEXT;
    v_total_entitlements INT;
    v_assignments INT;
    v_compliance TEXT;
    v_contract_status TEXT;
    v_contract_type TEXT;
    v_end_date DATE;
    v_now TIMESTAMPTZ := NOW();
    i INT;
    j INT;
    k INT;
BEGIN
    SELECT id
    INTO v_actor_id
    FROM users
    WHERE tenant_id = v_tenant_id
      AND lower(email) = 'admin@itd.cbn.gov.ng'
    LIMIT 1;

    IF v_actor_id IS NULL THEN
        SELECT id INTO v_actor_id
        FROM users
        WHERE tenant_id = v_tenant_id AND is_active = true
        ORDER BY created_at
        LIMIT 1;
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'No active user found for CMDB demo seed';
    END IF;

    SELECT array_agg(id ORDER BY display_name, id)
    INTO v_user_ids
    FROM (
        SELECT id, display_name
        FROM users
        WHERE tenant_id = v_tenant_id AND is_active = true
        ORDER BY display_name, id
        LIMIT 1500
    ) users_for_seed;

    IF v_user_ids IS NULL OR array_length(v_user_ids, 1) IS NULL THEN
        v_user_ids := ARRAY[v_actor_id];
    END IF;

    SELECT array_agg(id ORDER BY name, id)
    INTO v_org_ids
    FROM (
        SELECT id, name
        FROM org_units
        WHERE tenant_id = v_tenant_id AND is_active = true
        ORDER BY name, id
        LIMIT 500
    ) orgs_for_seed;

    IF v_org_ids IS NULL OR array_length(v_org_ids, 1) IS NULL THEN
        v_org_ids := ARRAY[NULL::UUID];
    END IF;

    v_user_count := array_length(v_user_ids, 1);
    v_org_count := array_length(v_org_ids, 1);

    -- Remove the previous generated CMDB demo slice without touching user-entered data.
    DELETE FROM renewal_alerts
    WHERE tenant_id = v_tenant_id
      AND (
        entity_id IN (SELECT id FROM warranties WHERE tenant_id = v_tenant_id AND asset_id IN (SELECT id FROM assets WHERE asset_tag LIKE 'CMDB-DEMO-%'))
        OR entity_id IN (SELECT id FROM licenses WHERE tenant_id = v_tenant_id AND software_name LIKE 'CMDB Demo %')
        OR entity_id IN (SELECT id FROM contracts WHERE tenant_id = v_tenant_id AND contract_number LIKE 'CMDB-DEMO-%')
      );

    DELETE FROM asset_verifications
    WHERE tenant_id = v_tenant_id
      AND (
        campaign_id IN (SELECT id FROM asset_verification_campaigns WHERE tenant_id = v_tenant_id AND name LIKE 'CMDB Demo %')
        OR asset_id IN (SELECT id FROM assets WHERE tenant_id = v_tenant_id AND asset_tag LIKE 'CMDB-DEMO-%')
      );
    DELETE FROM asset_verification_campaigns WHERE tenant_id = v_tenant_id AND name LIKE 'CMDB Demo %';

    DELETE FROM asset_disposals WHERE tenant_id = v_tenant_id AND asset_id IN (SELECT id FROM assets WHERE tenant_id = v_tenant_id AND asset_tag LIKE 'CMDB-DEMO-%');
    DELETE FROM asset_lifecycle_events WHERE tenant_id = v_tenant_id AND asset_id IN (SELECT id FROM assets WHERE tenant_id = v_tenant_id AND asset_tag LIKE 'CMDB-DEMO-%');
    DELETE FROM warranties WHERE tenant_id = v_tenant_id AND asset_id IN (SELECT id FROM assets WHERE tenant_id = v_tenant_id AND asset_tag LIKE 'CMDB-DEMO-%');
    DELETE FROM license_assignments WHERE tenant_id = v_tenant_id AND license_id IN (SELECT id FROM licenses WHERE tenant_id = v_tenant_id AND software_name LIKE 'CMDB Demo %');
    DELETE FROM licenses WHERE tenant_id = v_tenant_id AND software_name LIKE 'CMDB Demo %';
    DELETE FROM contract_renewals WHERE tenant_id = v_tenant_id AND contract_id IN (SELECT id FROM contracts WHERE tenant_id = v_tenant_id AND contract_number LIKE 'CMDB-DEMO-%');
    DELETE FROM vendor_scorecards WHERE tenant_id = v_tenant_id AND vendor_id IN (SELECT id FROM vendors WHERE tenant_id = v_tenant_id AND code LIKE 'CMDBD-%');
    DELETE FROM contracts WHERE tenant_id = v_tenant_id AND contract_number LIKE 'CMDB-DEMO-%';
    DELETE FROM vendors WHERE tenant_id = v_tenant_id AND code LIKE 'CMDBD-%';
    DELETE FROM discovered_devices WHERE run_id IN (
        SELECT r.id FROM discovery_runs r
        JOIN discovery_profiles p ON p.id = r.profile_id
        WHERE r.tenant_id = v_tenant_id AND p.name LIKE 'CMDB Demo %'
    );
    DELETE FROM discovery_runs WHERE tenant_id = v_tenant_id AND profile_id IN (SELECT id FROM discovery_profiles WHERE tenant_id = v_tenant_id AND name LIKE 'CMDB Demo %');
    DELETE FROM discovery_profiles WHERE tenant_id = v_tenant_id AND name LIKE 'CMDB Demo %';
    DELETE FROM reconciliation_runs WHERE tenant_id = v_tenant_id AND source LIKE 'CMDB Demo %';
    DELETE FROM cmdb_relationships WHERE tenant_id = v_tenant_id AND (
        source_ci_id IN (SELECT id FROM cmdb_items WHERE tenant_id = v_tenant_id AND attributes->>'demo_seed' = 'cmdb_dashboard')
        OR target_ci_id IN (SELECT id FROM cmdb_items WHERE tenant_id = v_tenant_id AND attributes->>'demo_seed' = 'cmdb_dashboard')
    );
    DELETE FROM cmdb_items WHERE tenant_id = v_tenant_id AND attributes->>'demo_seed' = 'cmdb_dashboard';
    DELETE FROM assets WHERE tenant_id = v_tenant_id AND asset_tag LIKE 'CMDB-DEMO-%';

    -- Vendors, contracts, scorecards, and renewal activity.
    FOR i IN 1..array_length(v_vendor_names, 1) LOOP
        v_vendor_id := uuid_generate_v5(v_ns, 'vendor-' || i);
        INSERT INTO vendors (
            id, tenant_id, name, code, vendor_type, status,
            primary_contact_name, primary_contact_email, primary_contact_phone,
            account_manager_name, account_manager_email, website, address,
            tax_id, payment_terms, notes, tags, metadata, created_by, org_unit_id
        )
        VALUES (
            v_vendor_id, v_tenant_id, v_vendor_names[i], 'CMDBD-' || lpad(i::text, 3, '0'),
            v_vendor_types[((i - 1) % array_length(v_vendor_types, 1)) + 1],
            CASE WHEN i IN (5, 11) THEN 'under_review' ELSE 'active' END,
            'Demo Contact ' || i,
            'cmdb.vendor' || i || '@example.invalid',
            '+234-800-555-' || lpad(i::text, 4, '0'),
            'Demo Account Manager ' || i,
            'cmdb.account' || i || '@example.invalid',
            'https://vendor' || i || '.example.invalid',
            'CBN supplier register demo address ' || i,
            'TIN-CMDB-' || lpad(i::text, 5, '0'),
            CASE WHEN i % 3 = 0 THEN 'Net 45' ELSE 'Net 30' END,
            'Generated CMDB vendor for end-to-end testing.',
            ARRAY['cmdb-demo','supplier','uat'],
            jsonb_build_object('demo_seed', 'cmdb_dashboard', 'riskTier', CASE WHEN i % 4 = 0 THEN 'high' ELSE 'standard' END),
            v_actor_id,
            v_org_ids[((i - 1) % v_org_count) + 1]
        );

        FOR j IN 1..3 LOOP
            v_contract_id := uuid_generate_v5(v_ns, 'contract-' || i || '-' || j);
            v_contract_type := (ARRAY['license','support','maintenance','cloud_service','hardware','sla','consulting'])[((i + j - 2) % 7) + 1];
            v_end_date := CURRENT_DATE + (((i * 35) + (j * 45) - 180) || ' days')::INTERVAL;
            v_contract_status := CASE
                WHEN v_end_date < CURRENT_DATE THEN 'expired'
                WHEN v_end_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
                ELSE 'active'
            END;

            INSERT INTO contracts (
                id, tenant_id, vendor_id, contract_number, title, description,
                contract_type, status, start_date, end_date, auto_renew,
                renewal_notice_days, total_value, annual_value, currency,
                payment_schedule, sla_terms, owner_id, tags, created_by, org_unit_id
            )
            VALUES (
                v_contract_id, v_tenant_id, v_vendor_id,
                'CMDB-DEMO-CON-' || lpad(i::text, 2, '0') || '-' || j,
                'CMDB Demo ' || initcap(replace(v_contract_type, '_', ' ')) || ' Contract ' || i || '-' || j,
                'Generated contract covering support, warranty, or platform services for CMDB testing.',
                v_contract_type, v_contract_status,
                CURRENT_DATE - (((i * 41) + (j * 17)) || ' days')::INTERVAL,
                v_end_date,
                (j % 2 = 0),
                CASE WHEN j = 1 THEN 120 ELSE 60 END,
                25000000 + (i * j * 1500000),
                9000000 + (i * j * 650000),
                'NGN',
                CASE WHEN j = 3 THEN 'quarterly' ELSE 'annual' END,
                jsonb_build_object('availability', '99.' || (7 + j) || '%', 'responseHours', 2 + j, 'demo_seed', 'cmdb_dashboard'),
                v_user_ids[((i + j - 2) % v_user_count) + 1],
                ARRAY['cmdb-demo','contract','renewal-test'],
                v_actor_id,
                v_org_ids[((i + j - 2) % v_org_count) + 1]
            );

            INSERT INTO vendor_scorecards (
                id, tenant_id, vendor_id, contract_id, review_period,
                quality_score, delivery_score, responsiveness_score, cost_score,
                compliance_score, overall_score, strengths, weaknesses,
                improvement_areas, notes, sla_metrics, reviewed_by
            )
            VALUES (
                uuid_generate_v5(v_ns, 'scorecard-' || i || '-' || j),
                v_tenant_id, v_vendor_id, v_contract_id,
                '2026-Q' || (((j - 1) % 4) + 1),
                round((3.5 + ((i + j) % 12) / 10.0)::numeric, 1),
                round((3.4 + ((i * j) % 13) / 10.0)::numeric, 1),
                round((3.2 + ((i + (j * 2)) % 14) / 10.0)::numeric, 1),
                round((3.1 + ((i + j + 3) % 15) / 10.0)::numeric, 1),
                round((3.6 + ((i + j + 5) % 10) / 10.0)::numeric, 1),
                round((3.4 + ((i + j + 1) % 12) / 10.0)::numeric, 1),
                'Reliable escalation path and predictable delivery.',
                CASE WHEN i % 4 = 0 THEN 'Delayed root-cause reports on some incidents.' ELSE 'Minor documentation gaps.' END,
                'Improve renewal evidence packs and asset serial reconciliation.',
                'Generated scorecard for vendor dashboard testing.',
                jsonb_build_object('ticketsMetSla', 80 + ((i + j) % 18), 'openEscalations', (i + j) % 4),
                v_user_ids[((i + j + 10) % v_user_count) + 1]
            );
        END LOOP;
    END LOOP;

    FOR i IN 1..8 LOOP
        INSERT INTO contract_renewals (
            id, contract_id, tenant_id, renewal_type, new_start_date,
            new_end_date, new_value, change_notes, status, created_by
        )
        VALUES (
            uuid_generate_v5(v_ns, 'contract-renewal-' || i),
            uuid_generate_v5(v_ns, 'contract-' || (((i - 1) % 12) + 1) || '-' || (((i - 1) % 3) + 1)),
            v_tenant_id,
            (ARRAY['renewal','renegotiation','upgrade','termination'])[((i - 1) % 4) + 1],
            CURRENT_DATE + ((30 + i) || ' days')::INTERVAL,
            CURRENT_DATE + ((395 + i * 15) || ' days')::INTERVAL,
            12000000 + i * 1000000,
            'Generated renewal scenario for CMDB contract testing.',
            (ARRAY['pending','approved','completed','rejected'])[((i - 1) % 4) + 1],
            v_actor_id
        );
    END LOOP;

    -- Asset estate with all lifecycle states and verification statuses.
    FOR i IN 1..420 LOOP
        v_asset_id := uuid_generate_v5(v_ns, 'asset-' || i);
        v_asset_type := v_asset_types[((i - 1) % array_length(v_asset_types, 1)) + 1];
        v_asset_status := v_asset_statuses[((i - 1) % array_length(v_asset_statuses, 1)) + 1];
        v_verification_status := (ARRAY['verified','unverified','discrepancy','overdue'])[((i - 1) % 4) + 1];

        INSERT INTO assets (
            id, tenant_id, asset_tag, type, category, name, description,
            manufacturer, model, serial_number, status, location, building,
            floor, room, owner_id, custodian_id, purchase_date, purchase_cost,
            currency, classification, attributes, tags, org_unit_id,
            last_verified_at, purchase_price, current_book_value, cost_center,
            po_number, depreciation_rate, erp_sync_at, erp_asset_id,
            last_verified_by, verification_status
        )
        VALUES (
            v_asset_id,
            v_tenant_id,
            'CMDB-DEMO-' || lpad(i::text, 4, '0'),
            v_asset_type,
            v_asset_categories[((i - 1) % array_length(v_asset_categories, 1)) + 1],
            'CMDB Demo ' || initcap(v_asset_type) || ' Asset ' || lpad(i::text, 4, '0'),
            'Generated asset for CMDB end-to-end testing across inventory, lifecycle, verification, and financial views.',
            v_manufacturers[((i - 1) % array_length(v_manufacturers, 1)) + 1],
            'MDL-' || ((i % 35) + 100),
            'SN-CMDB-' || lpad(i::text, 7, '0'),
            v_asset_status,
            v_locations[((i - 1) % array_length(v_locations, 1)) + 1],
            v_buildings[((i - 1) % array_length(v_buildings, 1)) + 1],
            ((i % 12) + 1)::text,
            'R' || lpad(((i % 48) + 1)::text, 3, '0'),
            v_user_ids[((i - 1) % v_user_count) + 1],
            v_user_ids[((i + 29) % v_user_count) + 1],
            CURRENT_DATE - ((60 + i * 3) || ' days')::INTERVAL,
            350000 + (i * 12500),
            'NGN',
            (ARRAY['public','internal','confidential','restricted'])[((i - 1) % 4) + 1],
            jsonb_build_object(
                'demo_seed', 'cmdb_dashboard',
                'hostname', 'cmdb-demo-host-' || lpad(i::text, 4, '0'),
                'ipAddress', '10.' || ((i % 40) + 10) || '.' || ((i % 200) + 1) || '.' || ((i % 240) + 10),
                'criticality', (ARRAY['low','medium','high','critical'])[((i - 1) % 4) + 1],
                'environment', (ARRAY['production','dr','uat','development'])[((i - 1) % 4) + 1],
                'condition', (ARRAY['good','fair','poor','damaged'])[((i - 1) % 4) + 1],
                'barcode', 'BC-CMDB-' || lpad(i::text, 6, '0')
            ),
            ARRAY['cmdb-demo', v_asset_type, v_asset_status],
            v_org_ids[((i - 1) % v_org_count) + 1],
            CASE WHEN v_verification_status IN ('verified','discrepancy') THEN v_now - ((i % 80) || ' days')::INTERVAL ELSE NULL END,
            350000 + (i * 12500),
            GREATEST(50000, 350000 + (i * 12500) - (i * 6000)),
            'CC-' || lpad(((i % 36) + 1)::text, 3, '0'),
            'PO-CMDB-' || lpad(i::text, 6, '0'),
            CASE WHEN v_asset_type IN ('software','cloud') THEN 0 ELSE 20 END,
            v_now - ((i % 20) || ' days')::INTERVAL,
            'ERP-CMDB-' || lpad(i::text, 6, '0'),
            CASE WHEN v_verification_status IN ('verified','discrepancy') THEN v_user_ids[((i + 53) % v_user_count) + 1] ELSE NULL END,
            v_verification_status
        );

        INSERT INTO asset_lifecycle_events (id, asset_id, tenant_id, event_type, performed_by, details, created_at)
        VALUES
            (uuid_generate_v5(v_ns, 'asset-event-' || i || '-procured'), v_asset_id, v_tenant_id, 'procured', v_actor_id, jsonb_build_object('source', 'demo-seed', 'purchaseOrder', 'PO-CMDB-' || lpad(i::text, 6, '0')), v_now - ((120 + i) || ' days')::INTERVAL),
            (uuid_generate_v5(v_ns, 'asset-event-' || i || '-received'), v_asset_id, v_tenant_id, 'received', v_actor_id, jsonb_build_object('source', 'demo-seed', 'warehouse', 'central store'), v_now - ((105 + i) || ' days')::INTERVAL);

        IF v_asset_status IN ('active','maintenance','retired','disposed') THEN
            INSERT INTO asset_lifecycle_events (id, asset_id, tenant_id, event_type, performed_by, details, created_at)
            VALUES (uuid_generate_v5(v_ns, 'asset-event-' || i || '-deployed'), v_asset_id, v_tenant_id, 'deployed', v_user_ids[((i + 5) % v_user_count) + 1], jsonb_build_object('source', 'demo-seed', 'location', v_locations[((i - 1) % array_length(v_locations, 1)) + 1]), v_now - ((85 + i) || ' days')::INTERVAL);
        END IF;

        IF v_asset_status = 'maintenance' THEN
            INSERT INTO asset_lifecycle_events (id, asset_id, tenant_id, event_type, performed_by, details, created_at)
            VALUES (uuid_generate_v5(v_ns, 'asset-event-' || i || '-maintenance'), v_asset_id, v_tenant_id, 'maintenance_start', v_user_ids[((i + 11) % v_user_count) + 1], jsonb_build_object('source', 'demo-seed', 'reason', 'preventive maintenance'), v_now - ((i % 15) || ' days')::INTERVAL);
        ELSIF v_asset_status = 'retired' THEN
            INSERT INTO asset_lifecycle_events (id, asset_id, tenant_id, event_type, performed_by, details, created_at)
            VALUES (uuid_generate_v5(v_ns, 'asset-event-' || i || '-retired'), v_asset_id, v_tenant_id, 'retired', v_actor_id, jsonb_build_object('source', 'demo-seed', 'reason', 'replacement cycle'), v_now - ((i % 60) || ' days')::INTERVAL);
        ELSIF v_asset_status = 'disposed' THEN
            INSERT INTO asset_lifecycle_events (id, asset_id, tenant_id, event_type, performed_by, details, created_at)
            VALUES (uuid_generate_v5(v_ns, 'asset-event-' || i || '-disposed'), v_asset_id, v_tenant_id, 'disposed', v_actor_id, jsonb_build_object('source', 'demo-seed', 'method', 'recycling'), v_now - ((i % 45) || ' days')::INTERVAL);
        END IF;

        IF v_asset_status IN ('retired','disposed') THEN
            INSERT INTO asset_disposals (
                id, asset_id, tenant_id, disposal_method, reason, approved_by,
                disposal_date, witness_ids, data_wipe_confirmed, status
            )
            VALUES (
                uuid_generate_v5(v_ns, 'asset-disposal-' || i),
                v_asset_id, v_tenant_id,
                (ARRAY['resale','donation','recycling','destruction'])[((i - 1) % 4) + 1],
                'Generated disposal workflow for CMDB testing.',
                v_actor_id,
                CASE WHEN v_asset_status = 'disposed' THEN CURRENT_DATE - ((i % 50) || ' days')::INTERVAL ELSE NULL END,
                ARRAY[v_user_ids[((i + 17) % v_user_count) + 1], v_user_ids[((i + 23) % v_user_count) + 1]],
                (i % 3 <> 0),
                CASE WHEN v_asset_status = 'disposed' THEN 'completed' ELSE (ARRAY['pending_approval','approved','cancelled'])[((i - 1) % 3) + 1] END
            );
        END IF;
    END LOOP;

    -- Physical verification campaigns and verification results.
    FOR i IN 1..4 LOOP
        v_campaign_id := uuid_generate_v5(v_ns, 'verification-campaign-' || i);
        INSERT INTO asset_verification_campaigns (
            id, tenant_id, name, description, status, scope_filter,
            target_asset_count, verified_count, discrepancy_count,
            started_at, completed_at, created_by
        )
        VALUES (
            v_campaign_id,
            v_tenant_id,
            'CMDB Demo Verification Campaign ' || i,
            'Generated stocktake campaign for CMDB verification testing.',
            (ARRAY['planned','in_progress','completed','in_progress'])[((i - 1) % 4) + 1],
            jsonb_build_object('location', v_locations[i], 'demo_seed', 'cmdb_dashboard'),
            105,
            CASE WHEN i = 1 THEN 0 WHEN i = 3 THEN 105 ELSE 62 END,
            CASE WHEN i = 3 THEN 9 ELSE 6 END,
            CASE WHEN i = 1 THEN NULL ELSE v_now - ((20 + i) || ' days')::INTERVAL END,
            CASE WHEN i = 3 THEN v_now - INTERVAL '2 days' ELSE NULL END,
            v_actor_id
        );
    END LOOP;

    FOR i IN 1..260 LOOP
        v_asset_id := uuid_generate_v5(v_ns, 'asset-' || i);
        v_campaign_id := uuid_generate_v5(v_ns, 'verification-campaign-' || (((i - 1) % 4) + 1));
        v_condition := (ARRAY['good','fair','poor','damaged','missing'])[((i - 1) % 5) + 1];
        v_discrepancy := CASE
            WHEN i % 17 = 0 THEN 'missing'
            WHEN i % 11 = 0 THEN 'location_mismatch'
            WHEN i % 7 = 0 THEN 'condition_issue'
            ELSE 'none'
        END;

        INSERT INTO asset_verifications (
            id, tenant_id, asset_id, verifier_id, verified_at, location_confirmed,
            condition, notes, campaign_id, actual_location, discrepancy_type
        )
        VALUES (
            uuid_generate_v5(v_ns, 'asset-verification-' || i),
            v_tenant_id, v_asset_id,
            v_user_ids[((i + 83) % v_user_count) + 1],
            v_now - ((i % 70) || ' days')::INTERVAL,
            v_discrepancy = 'none',
            v_condition,
            'Generated physical verification record for CMDB testing.',
            v_campaign_id,
            CASE WHEN v_discrepancy = 'location_mismatch' THEN 'Exception Bay ' || (i % 9) ELSE NULL END,
            v_discrepancy
        );
    END LOOP;

    -- Configuration items and topology graph.
    FOR i IN 1..240 LOOP
        v_ci_id := uuid_generate_v5(v_ns, 'ci-' || i);
        INSERT INTO cmdb_items (
            id, tenant_id, ci_type, name, status, asset_id, attributes, version
        )
        VALUES (
            v_ci_id,
            v_tenant_id,
            v_ci_types[((i - 1) % array_length(v_ci_types, 1)) + 1],
            'CMDB Demo CI ' || lpad(i::text, 4, '0') || ' - ' || initcap(replace(v_ci_types[((i - 1) % array_length(v_ci_types, 1)) + 1], '_', ' ')),
            v_ci_statuses[((i - 1) % array_length(v_ci_statuses, 1)) + 1],
            CASE WHEN i <= 210 THEN uuid_generate_v5(v_ns, 'asset-' || i) ELSE NULL END,
            jsonb_build_object(
                'demo_seed', 'cmdb_dashboard',
                'environment', (ARRAY['production','dr','uat','development'])[((i - 1) % 4) + 1],
                'criticality', (ARRAY['low','medium','high','critical'])[((i - 1) % 4) + 1],
                'serviceOwner', 'CBN ITD Demo Owner ' || ((i % 20) + 1),
                'ipAddress', '172.20.' || ((i % 50) + 1) || '.' || ((i % 220) + 10),
                'monitoringStatus', CASE WHEN i % 9 = 0 THEN 'degraded' ELSE 'healthy' END,
                'dataClassification', (ARRAY['public','internal','confidential','restricted'])[((i - 1) % 4) + 1]
            ),
            1 + (i % 7)
        );
    END LOOP;

    FOR i IN 1..360 LOOP
        v_ci_id := uuid_generate_v5(v_ns, 'ci-' || (((i - 1) % 240) + 1));
        v_target_ci_id := uuid_generate_v5(v_ns, 'ci-' || (((i * 7) % 240) + 1));
        IF v_ci_id = v_target_ci_id THEN
            v_target_ci_id := uuid_generate_v5(v_ns, 'ci-' || (((i * 7 + 1) % 240) + 1));
        END IF;

        INSERT INTO cmdb_relationships (
            id, tenant_id, source_ci_id, target_ci_id, relationship_type, description, is_active
        )
        VALUES (
            uuid_generate_v5(v_ns, 'ci-relationship-' || i),
            v_tenant_id,
            v_ci_id,
            v_target_ci_id,
            v_rel_types[((i - 1) % array_length(v_rel_types, 1)) + 1],
            'Generated topology relationship for CMDB graph testing.',
            i % 19 <> 0
        );
    END LOOP;

    -- Reconciliation history.
    FOR i IN 1..14 LOOP
        INSERT INTO reconciliation_runs (
            id, tenant_id, source, started_at, completed_at,
            matches, discrepancies, new_items, report, created_at
        )
        VALUES (
            uuid_generate_v5(v_ns, 'reconciliation-run-' || i),
            v_tenant_id,
            (ARRAY['CMDB Demo SCCM CSV','CMDB Demo Network Scan','CMDB Demo AD Import','CMDB Demo Oracle ERP Asset Sync'])[((i - 1) % 4) + 1],
            v_now - ((i * 9) || ' days')::INTERVAL,
            v_now - ((i * 9) || ' days')::INTERVAL + INTERVAL '35 minutes',
            180 + (i * 9),
            (i * 3) % 28,
            (i * 2) % 17,
            jsonb_build_object(
                'demo_seed', 'cmdb_dashboard',
                'summary', 'Generated reconciliation run for CMDB testing.',
                'matchedBy', jsonb_build_object('serial', 92 + i, 'hostname', 48 + i, 'ip', 30 + i),
                'exceptions', jsonb_build_array('owner mismatch', 'stale CI', 'missing asset tag')
            ),
            v_now - ((i * 9) || ' days')::INTERVAL
        );
    END LOOP;

    -- Discovery profiles, runs, and discovered devices.
    FOR i IN 1..4 LOOP
        v_profile_id := uuid_generate_v5(v_ns, 'discovery-profile-' || i);
        INSERT INTO discovery_profiles (
            id, tenant_id, name, description, scan_type, configuration,
            schedule, is_active, last_run_at, created_by
        )
        VALUES (
            v_profile_id,
            v_tenant_id,
            'CMDB Demo ' || (ARRAY['Network Scan','AD Import','SCCM Import','CSV Import'])[((i - 1) % 4) + 1],
            'Generated discovery profile for CMDB discovery testing.',
            (ARRAY['network','ad_import','sccm','csv_import'])[((i - 1) % 4) + 1],
            CASE i
                WHEN 1 THEN jsonb_build_object('ip_ranges', jsonb_build_array('10.10.0.0/22','10.20.0.0/22'), 'protocols', jsonb_build_array('snmp','ssh','wmi'), 'ports', jsonb_build_array(22,135,161,443), 'demo_seed', 'cmdb_dashboard')
                WHEN 2 THEN jsonb_build_object('domain', 'cbn.gov.ng', 'ou_filter', 'OU=Computers,DC=cbn,DC=gov,DC=ng', 'demo_seed', 'cmdb_dashboard')
                WHEN 3 THEN jsonb_build_object('site_code', 'CBN', 'collection', 'All Systems', 'demo_seed', 'cmdb_dashboard')
                ELSE jsonb_build_object('mapping', jsonb_build_object('hostname','Hostname','ip','IPAddress','type','DeviceType'), 'demo_seed', 'cmdb_dashboard')
            END,
            CASE WHEN i IN (1, 3) THEN '0 */6 * * *' ELSE NULL END,
            true,
            v_now - ((i * 5) || ' days')::INTERVAL,
            v_actor_id
        );

        FOR j IN 1..4 LOOP
            v_run_id := uuid_generate_v5(v_ns, 'discovery-run-' || i || '-' || j);
            INSERT INTO discovery_runs (
                id, tenant_id, profile_id, status, started_at, completed_at,
                devices_found, new_cis, updated_cis, errors, created_at
            )
            VALUES (
                v_run_id,
                v_tenant_id,
                v_profile_id,
                CASE WHEN i = 4 AND j = 4 THEN 'failed' WHEN i = 1 AND j = 4 THEN 'scanning' ELSE 'completed' END,
                v_now - (((i * 12) + j) || ' days')::INTERVAL,
                CASE WHEN i = 1 AND j = 4 THEN NULL ELSE v_now - (((i * 12) + j) || ' days')::INTERVAL + INTERVAL '42 minutes' END,
                24 + (i * j),
                (i + j) % 9,
                (i * j) % 12,
                CASE WHEN i = 4 AND j = 4 THEN jsonb_build_array('CSV row 14 missing hostname', 'CSV row 27 invalid IP') ELSE '[]'::jsonb END,
                v_now - (((i * 12) + j) || ' days')::INTERVAL
            );

            FOR k IN 1..18 LOOP
                INSERT INTO discovered_devices (
                    id, run_id, hostname, ip_address, mac_address, device_type,
                    os_name, os_version, manufacturer, model, serial_number,
                    open_ports, attributes, matched_ci_id, match_confidence, action
                )
                VALUES (
                    uuid_generate_v5(v_ns, 'discovered-device-' || i || '-' || j || '-' || k),
                    v_run_id,
                    'disc-' || i || '-' || j || '-' || lpad(k::text, 3, '0') || '.cbn.gov.ng',
                    ('10.' || (10 + i) || '.' || (20 + j) || '.' || (30 + k))::INET,
                    (
                        '02:' ||
                        lpad(to_hex((i * 17) % 255), 2, '0') || ':' ||
                        lpad(to_hex((j * 31) % 255), 2, '0') || ':' ||
                        lpad(to_hex((k * 47) % 255), 2, '0') || ':' ||
                        lpad(to_hex((i * k * 13) % 255), 2, '0') || ':' ||
                        lpad(to_hex((j * k * 19) % 255), 2, '0')
                    )::MACADDR,
                    (ARRAY['server','network_device','workstation','database','printer','storage'])[((k - 1) % 6) + 1],
                    (ARRAY['Windows Server','RHEL','Ubuntu','Cisco IOS','FortiOS','Windows 11'])[((k - 1) % 6) + 1],
                    (ARRAY['2019','2022','8.8','22.04','17.9','7.2'])[((k - 1) % 6) + 1],
                    v_manufacturers[((k - 1) % array_length(v_manufacturers, 1)) + 1],
                    'DISC-MDL-' || (100 + k),
                    'DISC-SN-' || i || '-' || j || '-' || lpad(k::text, 4, '0'),
                    CASE WHEN k % 5 = 0 THEN ARRAY[22, 80, 135, 443, 3389] ELSE ARRAY[22, 80, 443] END,
                    jsonb_build_object('demo_seed', 'cmdb_dashboard', 'sourceProfile', i, 'scanRun', j),
                    CASE WHEN k % 5 = 0 THEN NULL ELSE uuid_generate_v5(v_ns, 'ci-' || ((((i * j * k) % 240) + 1))) END,
                    CASE WHEN k % 5 = 0 THEN NULL ELSE round((0.65 + ((k % 30) / 100.0))::numeric, 2) END,
                    (ARRAY['no_change','update','conflict','new'])[((k - 1) % 4) + 1]
                );
            END LOOP;
        END LOOP;
    END LOOP;

    -- License portfolio and assignments.
    FOR i IN 1..30 LOOP
        v_license_id := uuid_generate_v5(v_ns, 'license-' || i);
        v_total_entitlements := 35 + (i * 7);
        v_assignments := CASE
            WHEN i % 7 = 0 THEN v_total_entitlements + 9
            WHEN i % 5 = 0 THEN GREATEST(3, v_total_entitlements / 4)
            ELSE v_total_entitlements - (i % 11)
        END;
        v_compliance := CASE
            WHEN v_assignments > v_total_entitlements THEN 'over_deployed'
            WHEN v_assignments < (v_total_entitlements / 2) THEN 'under_utilized'
            ELSE 'compliant'
        END;

        INSERT INTO licenses (
            id, tenant_id, software_name, vendor, license_type,
            total_entitlements, assigned_count, compliance_status,
            expiry_date, cost, renewal_contact
        )
        VALUES (
            v_license_id,
            v_tenant_id,
            v_software_names[((i - 1) % array_length(v_software_names, 1)) + 1] || ' ' || ceil(i::numeric / array_length(v_software_names, 1)),
            v_vendor_names[((i - 1) % array_length(v_vendor_names, 1)) + 1],
            v_license_types[((i - 1) % array_length(v_license_types, 1)) + 1],
            v_total_entitlements,
            v_assignments,
            v_compliance,
            CURRENT_DATE + (((i * 23) - 120) || ' days')::INTERVAL,
            5000000 + (i * 750000),
            'license.renewal' || i || '@example.invalid'
        );

        FOR j IN 1..v_assignments LOOP
            INSERT INTO license_assignments (
                id, license_id, tenant_id, user_id, asset_id, assigned_at
            )
            VALUES (
                uuid_generate_v5(v_ns, 'license-assignment-' || i || '-' || j),
                v_license_id,
                v_tenant_id,
                CASE WHEN i % 3 = 0 THEN NULL ELSE v_user_ids[((i + j - 2) % v_user_count) + 1] END,
                CASE WHEN i % 3 = 0 THEN uuid_generate_v5(v_ns, 'asset-' || (((i + j - 2) % 420) + 1)) ELSE NULL END,
                v_now - (((i + j) % 140) || ' days')::INTERVAL
            );
        END LOOP;
    END LOOP;

    -- Warranty coverage on the physical estate.
    FOR i IN 1..260 LOOP
        v_asset_id := uuid_generate_v5(v_ns, 'asset-' || i);
        v_warranty_id := uuid_generate_v5(v_ns, 'warranty-' || i);
        v_end_date := CURRENT_DATE + (((i * 5) - 210) || ' days')::INTERVAL;

        INSERT INTO warranties (
            id, asset_id, tenant_id, vendor, contract_number, coverage_type,
            start_date, end_date, cost, renewal_status
        )
        VALUES (
            v_warranty_id,
            v_asset_id,
            v_tenant_id,
            v_vendor_names[((i - 1) % array_length(v_vendor_names, 1)) + 1],
            'CMDB-DEMO-WAR-' || lpad(i::text, 5, '0'),
            (ARRAY['next_business_day','24x7','parts_only','onsite','premium'])[((i - 1) % 5) + 1],
            CURRENT_DATE - ((365 + i) || ' days')::INTERVAL,
            v_end_date,
            100000 + (i * 3500),
            CASE
                WHEN v_end_date < CURRENT_DATE THEN 'expired'
                WHEN v_end_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
                ELSE 'active'
            END
        );
    END LOOP;

    -- Renewal alerts across warranties, licenses, and contracts.
    FOR i IN 1..120 LOOP
        INSERT INTO renewal_alerts (id, tenant_id, entity_type, entity_id, alert_date, sent)
        VALUES (
            uuid_generate_v5(v_ns, 'renewal-alert-warranty-' || i),
            v_tenant_id,
            'warranty',
            uuid_generate_v5(v_ns, 'warranty-' || (((i - 1) % 260) + 1)),
            CURRENT_DATE + (((i % 90) - 15) || ' days')::INTERVAL,
            i % 4 = 0
        );
    END LOOP;

    FOR i IN 1..30 LOOP
        INSERT INTO renewal_alerts (id, tenant_id, entity_type, entity_id, alert_date, sent)
        VALUES (
            uuid_generate_v5(v_ns, 'renewal-alert-license-' || i),
            v_tenant_id,
            'license',
            uuid_generate_v5(v_ns, 'license-' || i),
            CURRENT_DATE + (((i * 7) % 120) || ' days')::INTERVAL,
            i % 5 = 0
        );
    END LOOP;

    FOR i IN 1..24 LOOP
        INSERT INTO renewal_alerts (id, tenant_id, entity_type, entity_id, alert_date, sent)
        VALUES (
            uuid_generate_v5(v_ns, 'renewal-alert-contract-' || i),
            v_tenant_id,
            'contract',
            uuid_generate_v5(v_ns, 'contract-' || (((i - 1) % 12) + 1) || '-' || (((i - 1) % 3) + 1)),
            CURRENT_DATE + (((i * 9) % 150) || ' days')::INTERVAL,
            i % 6 = 0
        );
    END LOOP;

    RAISE NOTICE 'CMDB demo seed complete: 420 assets, 240 CIs, 360 relationships, 30 licenses, 260 warranties, 12 vendors, 36 contracts, 16 discovery runs.';
END $$;

COMMIT;
