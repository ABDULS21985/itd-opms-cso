-- +goose Up
-- Migration 055: Seed Service Catalog with 5 categories and 20 items

-- ══════════════════════════════════════════════
-- Categories (5)
-- ══════════════════════════════════════════════

INSERT INTO service_catalog_categories (id, tenant_id, name, description, icon, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Hardware & Devices', 'Request new hardware, peripherals, or device replacements', 'Monitor', 1),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Software & Licensing', 'Software installation, license requests, and application access', 'Package', 2),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Network & Connectivity', 'Network access, VPN, Wi-Fi, and connectivity services', 'Wifi', 3),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Access & Security', 'User accounts, permissions, security tools, and access management', 'Shield', 4),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Business Applications', 'Enterprise application support, integrations, and custom development', 'LayoutDashboard', 5);

-- ══════════════════════════════════════════════
-- Items (20) — 4 per category
-- ══════════════════════════════════════════════

-- ── Hardware & Devices ──────────────────────

INSERT INTO service_catalog_items (id, tenant_id, category_id, name, description, approval_required, approval_chain_config, form_schema, entitlement_roles, estimated_delivery, status) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'New Laptop Request',
  'Request a new laptop for a new hire or to replace an existing device that is damaged, outdated, or no longer functional.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"b57c7521-672f-307c-9878-e3504b0e18d7","label":"Division Head"}]}',
  '{"fields":[{"name":"laptop_type","label":"Laptop Type","type":"select","required":true,"options":[{"label":"Standard (Dell Latitude)","value":"standard"},{"label":"Performance (Dell Precision)","value":"performance"},{"label":"Ultrabook (Dell XPS)","value":"ultrabook"}]},{"name":"reason","label":"Reason for Request","type":"select","required":true,"options":[{"label":"New Hire","value":"new_hire"},{"label":"Replacement - Damaged","value":"replacement_damaged"},{"label":"Replacement - End of Life","value":"replacement_eol"},{"label":"Upgrade","value":"upgrade"}]},{"name":"justification","label":"Business Justification","type":"textarea","required":true,"validation":{"minLength":20}},{"name":"preferred_os","label":"Preferred Operating System","type":"select","required":true,"options":[{"label":"Windows 11 Pro","value":"windows"},{"label":"macOS","value":"macos"}]},{"name":"needed_by","label":"Date Needed By","type":"date","required":false}]}',
  '{}',
  '5-7 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Monitor Request',
  'Request an additional or replacement monitor for your workstation. Dual-monitor setups available upon approval.',
  false,
  NULL,
  '{"fields":[{"name":"monitor_size","label":"Monitor Size","type":"select","required":true,"options":[{"label":"24 inch","value":"24"},{"label":"27 inch","value":"27"},{"label":"32 inch (requires approval)","value":"32"}]},{"name":"quantity","label":"Quantity","type":"number","required":true,"validation":{"min":1,"max":2}},{"name":"mount_type","label":"Mount Type","type":"select","required":false,"options":[{"label":"Standard Stand","value":"stand"},{"label":"Desk Clamp Mount","value":"clamp"},{"label":"Wall Mount","value":"wall"}]}]}',
  '{}',
  '3-5 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Keyboard & Mouse Kit',
  'Request a standard or ergonomic keyboard and mouse set for your workstation.',
  false,
  NULL,
  '{"fields":[{"name":"kit_type","label":"Kit Type","type":"select","required":true,"options":[{"label":"Standard Wired","value":"standard_wired"},{"label":"Standard Wireless","value":"standard_wireless"},{"label":"Ergonomic Wireless","value":"ergonomic"}]},{"name":"additional_notes","label":"Additional Notes","type":"textarea","required":false}]}',
  '{}',
  '2-3 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Printer Access Setup',
  'Request access to a network printer or request a new printer to be installed in your area.',
  false,
  NULL,
  '{"fields":[{"name":"request_type","label":"Request Type","type":"select","required":true,"options":[{"label":"Add me to existing printer","value":"add_access"},{"label":"Install new printer","value":"new_printer"}]},{"name":"printer_location","label":"Printer Location / Floor","type":"text","required":true},{"name":"color_printing","label":"Color Printing Needed?","type":"checkbox","required":false}]}',
  '{}',
  '1-2 business days',
  'active'
),

-- ── Software & Licensing ────────────────────

(
  'b0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'Software Installation',
  'Request installation of approved software on your workstation. Choose from the pre-approved software catalog or request a new title.',
  false,
  NULL,
  '{"fields":[{"name":"software_name","label":"Software Name","type":"text","required":true},{"name":"version","label":"Version (if specific)","type":"text","required":false},{"name":"license_type","label":"License Type","type":"select","required":true,"options":[{"label":"Already licensed","value":"existing"},{"label":"Need new license","value":"new"},{"label":"Free / Open Source","value":"free"}]},{"name":"business_purpose","label":"Business Purpose","type":"textarea","required":true}]}',
  '{}',
  '1-3 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'Microsoft 365 License Upgrade',
  'Upgrade your Microsoft 365 license tier (e.g., from E3 to E5) for additional features like Power BI Pro or advanced compliance.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"b57c7521-672f-307c-9878-e3504b0e18d7","label":"Division Head"}]}',
  '{"fields":[{"name":"current_license","label":"Current License","type":"select","required":true,"options":[{"label":"Microsoft 365 E1","value":"e1"},{"label":"Microsoft 365 E3","value":"e3"},{"label":"Microsoft 365 F3","value":"f3"}]},{"name":"target_license","label":"Requested License","type":"select","required":true,"options":[{"label":"Microsoft 365 E3","value":"e3"},{"label":"Microsoft 365 E5","value":"e5"}]},{"name":"features_needed","label":"Features Needed","type":"multi_select","required":true,"options":[{"label":"Power BI Pro","value":"powerbi"},{"label":"Advanced Compliance","value":"compliance"},{"label":"Phone System","value":"phone"},{"label":"Information Protection","value":"info_protection"}]},{"name":"justification","label":"Business Justification","type":"textarea","required":true}]}',
  '{}',
  '2-4 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'Development Tools Setup',
  'Request installation of development tools and IDEs (VS Code, IntelliJ, Docker, Git, etc.) on your workstation.',
  false,
  NULL,
  '{"fields":[{"name":"tools","label":"Tools Needed","type":"multi_select","required":true,"options":[{"label":"Visual Studio Code","value":"vscode"},{"label":"IntelliJ IDEA","value":"intellij"},{"label":"Docker Desktop","value":"docker"},{"label":"Git","value":"git"},{"label":"Postman","value":"postman"},{"label":"Node.js","value":"nodejs"},{"label":"Python","value":"python"},{"label":"DBeaver","value":"dbeaver"}]},{"name":"project_name","label":"Project Name","type":"text","required":true}]}',
  '{"itsm.view"}',
  '1-2 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'Adobe Creative Cloud License',
  'Request an Adobe Creative Cloud license for design, video editing, or document management needs.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"b57c7521-672f-307c-9878-e3504b0e18d7","label":"Division Head"}]}',
  '{"fields":[{"name":"plan_type","label":"Plan Type","type":"select","required":true,"options":[{"label":"Single App (Acrobat Pro)","value":"acrobat"},{"label":"Single App (Photoshop)","value":"photoshop"},{"label":"Single App (Illustrator)","value":"illustrator"},{"label":"All Apps","value":"all_apps"}]},{"name":"duration","label":"License Duration","type":"select","required":true,"options":[{"label":"1 Month","value":"1m"},{"label":"6 Months","value":"6m"},{"label":"12 Months","value":"12m"}]},{"name":"justification","label":"Business Justification","type":"textarea","required":true}]}',
  '{}',
  '3-5 business days',
  'active'
),

-- ── Network & Connectivity ──────────────────

(
  'b0000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  'VPN Access Request',
  'Request remote access VPN credentials to securely connect to the corporate network from outside the office.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"f3947e51-26fa-f488-4a13-e65c608d2e7b","label":"ISSO Head"}]}',
  '{"fields":[{"name":"vpn_type","label":"VPN Type","type":"select","required":true,"options":[{"label":"Standard Remote Access","value":"standard"},{"label":"Site-to-Site (project)","value":"site_to_site"}]},{"name":"start_date","label":"Access Start Date","type":"date","required":true},{"name":"end_date","label":"Access End Date (if temporary)","type":"date","required":false},{"name":"reason","label":"Reason for Remote Access","type":"textarea","required":true}]}',
  '{}',
  '1-2 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  'Wi-Fi Guest Access',
  'Request temporary Wi-Fi credentials for visitors, contractors, or conference rooms.',
  false,
  NULL,
  '{"fields":[{"name":"guest_name","label":"Guest Full Name","type":"text","required":true},{"name":"guest_email","label":"Guest Email","type":"email","required":true},{"name":"guest_organization","label":"Guest Organization","type":"text","required":true},{"name":"access_date","label":"Access Date","type":"date","required":true},{"name":"duration_days","label":"Duration (days)","type":"number","required":true,"validation":{"min":1,"max":30}}]}',
  '{}',
  'Same day',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  'Network Port Activation',
  'Request activation of a network port at a specific location for a new workstation or device.',
  false,
  NULL,
  '{"fields":[{"name":"building","label":"Building","type":"text","required":true},{"name":"floor","label":"Floor","type":"text","required":true},{"name":"room_number","label":"Room Number","type":"text","required":true},{"name":"port_id","label":"Port ID (if known)","type":"text","required":false},{"name":"device_type","label":"Device Type","type":"select","required":true,"options":[{"label":"Desktop PC","value":"desktop"},{"label":"VoIP Phone","value":"voip"},{"label":"Printer","value":"printer"},{"label":"Other","value":"other"}]}]}',
  '{}',
  '1-3 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  'Internet Bandwidth Upgrade',
  'Request an increase in internet bandwidth allocation for a specific department or project.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"b57c7521-672f-307c-9878-e3504b0e18d7","label":"Division Head"},{"user_id":"f3947e51-26fa-f488-4a13-e65c608d2e7b","label":"ISSO Head"}]}',
  '{"fields":[{"name":"current_bandwidth","label":"Current Bandwidth (Mbps)","type":"number","required":true},{"name":"requested_bandwidth","label":"Requested Bandwidth (Mbps)","type":"number","required":true},{"name":"department","label":"Department / Office","type":"text","required":true},{"name":"justification","label":"Business Justification","type":"textarea","required":true,"validation":{"minLength":30}}]}',
  '{"admin"}',
  '5-10 business days',
  'active'
),

-- ── Access & Security ───────────────────────

(
  'b0000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  'New User Account Setup',
  'Request creation of Active Directory, email, and system accounts for a new employee or contractor.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"f3947e51-26fa-f488-4a13-e65c608d2e7b","label":"ISSO Head"}]}',
  '{"fields":[{"name":"full_name","label":"Full Name","type":"text","required":true},{"name":"employee_id","label":"Employee / Contractor ID","type":"text","required":true},{"name":"department","label":"Department","type":"text","required":true},{"name":"job_title","label":"Job Title","type":"text","required":true},{"name":"start_date","label":"Start Date","type":"date","required":true},{"name":"account_type","label":"Account Type","type":"select","required":true,"options":[{"label":"Full-time Employee","value":"employee"},{"label":"Contractor","value":"contractor"},{"label":"Intern","value":"intern"}]},{"name":"systems_needed","label":"Systems Access Needed","type":"multi_select","required":true,"options":[{"label":"Active Directory","value":"ad"},{"label":"Email (Exchange/M365)","value":"email"},{"label":"ERP System","value":"erp"},{"label":"HR Portal","value":"hr"},{"label":"Project Management","value":"pm"},{"label":"VPN","value":"vpn"}]}]}',
  '{}',
  '1-2 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  'Password Reset',
  'Request a password reset for your Active Directory, email, or application account.',
  false,
  NULL,
  '{"fields":[{"name":"account_type","label":"Account Type","type":"select","required":true,"options":[{"label":"Active Directory / Windows Login","value":"ad"},{"label":"Email","value":"email"},{"label":"ERP System","value":"erp"},{"label":"VPN","value":"vpn"},{"label":"Other","value":"other"}]},{"name":"other_system","label":"Other System Name","type":"text","required":false,"conditions":[{"field":"account_type","value":"other","operator":"equals"}]},{"name":"username","label":"Username","type":"text","required":true}]}',
  '{}',
  'Within 1 hour',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  'Shared Drive / Folder Access',
  'Request access to a shared network drive or folder for collaboration with your team.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"f3947e51-26fa-f488-4a13-e65c608d2e7b","label":"ISSO Head"}]}',
  '{"fields":[{"name":"folder_path","label":"Folder Path","type":"text","required":true},{"name":"access_level","label":"Access Level","type":"select","required":true,"options":[{"label":"Read Only","value":"read"},{"label":"Read & Write","value":"read_write"},{"label":"Full Control","value":"full_control"}]},{"name":"reason","label":"Reason for Access","type":"textarea","required":true}]}',
  '{}',
  '1 business day',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  'Multi-Factor Authentication Setup',
  'Request setup or reset of multi-factor authentication (MFA) on your accounts.',
  false,
  NULL,
  '{"fields":[{"name":"mfa_action","label":"Action","type":"select","required":true,"options":[{"label":"New MFA Setup","value":"setup"},{"label":"Reset MFA (lost device)","value":"reset"},{"label":"Add Additional Method","value":"add_method"}]},{"name":"preferred_method","label":"Preferred MFA Method","type":"select","required":true,"options":[{"label":"Microsoft Authenticator App","value":"authenticator"},{"label":"SMS","value":"sms"},{"label":"Hardware Token","value":"hardware"}]},{"name":"phone_number","label":"Phone Number (for SMS)","type":"text","required":false,"conditions":[{"field":"preferred_method","value":"sms","operator":"equals"}]}]}',
  '{}',
  'Same day',
  'active'
),

-- ── Business Applications ───────────────────

(
  'b0000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000005',
  'ERP Access Request',
  'Request access to the Enterprise Resource Planning system for financial, procurement, or HR operations.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"b57c7521-672f-307c-9878-e3504b0e18d7","label":"Division Head"},{"user_id":"f3947e51-26fa-f488-4a13-e65c608d2e7b","label":"ISSO Head"}]}',
  '{"fields":[{"name":"erp_modules","label":"ERP Modules Needed","type":"multi_select","required":true,"options":[{"label":"Finance & Accounting","value":"finance"},{"label":"Procurement","value":"procurement"},{"label":"Human Resources","value":"hr"},{"label":"Inventory","value":"inventory"},{"label":"Reporting","value":"reporting"}]},{"name":"role_type","label":"Role Type","type":"select","required":true,"options":[{"label":"Viewer / Read-Only","value":"viewer"},{"label":"Data Entry / Transactor","value":"transactor"},{"label":"Approver","value":"approver"},{"label":"Administrator","value":"admin"}]},{"name":"justification","label":"Business Justification","type":"textarea","required":true}]}',
  '{}',
  '3-5 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000005',
  'SharePoint Site Creation',
  'Request a new SharePoint Online site for team collaboration, document management, or project workspaces.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8","label":"CSO Head"}]}',
  '{"fields":[{"name":"site_name","label":"Site Name","type":"text","required":true},{"name":"site_type","label":"Site Type","type":"select","required":true,"options":[{"label":"Team Site","value":"team"},{"label":"Communication Site","value":"communication"},{"label":"Project Site","value":"project"}]},{"name":"description","label":"Site Description","type":"textarea","required":true},{"name":"owners","label":"Site Owners (email addresses, one per line)","type":"textarea","required":true},{"name":"storage_quota","label":"Storage Quota","type":"select","required":true,"options":[{"label":"5 GB (Standard)","value":"5"},{"label":"25 GB","value":"25"},{"label":"50 GB","value":"50"}]}]}',
  '{}',
  '2-3 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000019',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000005',
  'Custom Report / Dashboard Request',
  'Request a custom report or analytics dashboard built by the Business Intelligence team.',
  true,
  '{"type":"sequential","approvers":[{"user_id":"e712da03-d912-0288-98e7-7907f066d7cd","label":"BISO Head"}]}',
  '{"fields":[{"name":"report_type","label":"Report Type","type":"select","required":true,"options":[{"label":"Tabular Report","value":"tabular"},{"label":"Interactive Dashboard","value":"dashboard"},{"label":"Automated Scheduled Report","value":"scheduled"}]},{"name":"data_source","label":"Data Source(s)","type":"textarea","required":true},{"name":"description","label":"Report Description & Requirements","type":"textarea","required":true,"validation":{"minLength":50}},{"name":"frequency","label":"Report Frequency","type":"select","required":false,"options":[{"label":"One-time","value":"once"},{"label":"Daily","value":"daily"},{"label":"Weekly","value":"weekly"},{"label":"Monthly","value":"monthly"}]},{"name":"deadline","label":"Deadline","type":"date","required":false}]}',
  '{}',
  '5-15 business days',
  'active'
),
(
  'b0000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000005',
  'Email Distribution List',
  'Request creation or modification of an email distribution list for team or department communications.',
  false,
  NULL,
  '{"fields":[{"name":"action","label":"Action","type":"select","required":true,"options":[{"label":"Create New List","value":"create"},{"label":"Add Members","value":"add"},{"label":"Remove Members","value":"remove"},{"label":"Delete List","value":"delete"}]},{"name":"list_name","label":"Distribution List Name","type":"text","required":true},{"name":"list_email","label":"Desired Email Address","type":"text","required":false,"conditions":[{"field":"action","value":"create","operator":"equals"}]},{"name":"members","label":"Members (email addresses, one per line)","type":"textarea","required":true}]}',
  '{}',
  '1 business day',
  'active'
);


-- +goose Down

DELETE FROM service_catalog_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND id IN (
    'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000012',
    'b0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000014',
    'b0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000016',
    'b0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000018',
    'b0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000020'
  );

DELETE FROM service_catalog_categories WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND id IN (
    'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000005'
  );
