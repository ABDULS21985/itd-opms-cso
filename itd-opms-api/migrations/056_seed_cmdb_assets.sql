-- +goose Up
-- Migration 056: Seed CMDB with assets, licenses, warranties to populate the analytics dashboard
-- Creates: 50 assets, 12 licenses, 25 warranties, lifecycle events

-- ══════════════════════════════════════════════════════════════════════
-- ASSETS (50 total)
-- Distribution: 35 active, 8 maintenance, 5 retired, 2 disposed
-- Types: hardware, software, virtual, cloud, network, peripheral
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO assets (id, tenant_id, asset_tag, type, category, name, description, manufacturer, model, serial_number, status, location, building, floor, room, owner_id, custodian_id, purchase_date, purchase_cost, currency, org_unit_id) VALUES

-- ── Laptops (12) ─────────────────────────────────────────────────────
('c0000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-001', 'hardware', 'Laptop', 'Dell Latitude 5540', 'Standard business laptop - 13th Gen Intel i7, 16GB RAM, 512GB SSD', 'Dell', 'Latitude 5540', 'SN-DL5540-00101', 'active', 'Head Office', 'Main Building', '3', '301', 'b57c7521-672f-307c-9878-e3504b0e18d7', 'b57c7521-672f-307c-9878-e3504b0e18d7', '2024-03-15', 850000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-002', 'hardware', 'Laptop', 'Dell Latitude 5540', 'Standard business laptop - 13th Gen Intel i7, 16GB RAM, 512GB SSD', 'Dell', 'Latitude 5540', 'SN-DL5540-00102', 'active', 'Head Office', 'Main Building', '3', '302', 'e712da03-d912-0288-98e7-7907f066d7cd', 'e712da03-d912-0288-98e7-7907f066d7cd', '2024-03-15', 850000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-003', 'hardware', 'Laptop', 'Dell Precision 5680', 'Performance workstation laptop - Intel i9, 32GB RAM, 1TB SSD, NVIDIA RTX', 'Dell', 'Precision 5680', 'SN-DP5680-00201', 'active', 'Head Office', 'Main Building', '3', '305', '5db8e9fc-125b-4883-62c3-372b18e64d33', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-06-10', 1450000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0001-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-004', 'hardware', 'Laptop', 'Dell Latitude 5540', 'Standard business laptop', 'Dell', 'Latitude 5540', 'SN-DL5540-00103', 'active', 'Head Office', 'Main Building', '3', '303', '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', '2024-03-15', 850000.00, 'NGN', 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90'),
('c0000000-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-005', 'hardware', 'Laptop', 'Dell Latitude 5540', 'Standard business laptop', 'Dell', 'Latitude 5540', 'SN-DL5540-00104', 'active', 'Head Office', 'Main Building', '3', '304', '90377934-1644-8547-b018-c4bb2449aaef', '90377934-1644-8547-b018-c4bb2449aaef', '2024-03-15', 850000.00, 'NGN', 'c22d15fd-f6f0-a86a-d541-f4cd13051094'),
('c0000000-0001-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-006', 'hardware', 'Laptop', 'Dell Latitude 5540', 'Standard business laptop', 'Dell', 'Latitude 5540', 'SN-DL5540-00105', 'active', 'Head Office', 'Main Building', '2', '210', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2024-04-20', 850000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0001-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-007', 'hardware', 'Laptop', 'Dell Latitude 5540', 'Standard business laptop', 'Dell', 'Latitude 5540', 'SN-DL5540-00106', 'active', 'Head Office', 'Main Building', '2', '211', 'c59b492e-b071-8565-6194-633cad81d471', 'c59b492e-b071-8565-6194-633cad81d471', '2024-04-20', 850000.00, 'NGN', '2a5f2e13-d303-1895-16e1-1b048c9d791d'),
('c0000000-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-008', 'hardware', 'Laptop', 'HP EliteBook 860 G10', 'HP business laptop - Intel i7, 16GB RAM, 512GB SSD', 'HP', 'EliteBook 860 G10', 'SN-HPE860-00301', 'maintenance', 'Head Office', 'Main Building', '2', '215', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-09-01', 780000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-009', 'hardware', 'Laptop', 'Dell Latitude 5530', 'Previous gen business laptop - 12th Gen Intel i5, 8GB RAM', 'Dell', 'Latitude 5530', 'SN-DL5530-00401', 'retired', 'Head Office', 'Store', NULL, 'IT Store', NULL, NULL, '2021-06-15', 620000.00, 'NGN', NULL),
('c0000000-0001-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-010', 'hardware', 'Laptop', 'Dell Latitude 5530', 'Previous gen business laptop', 'Dell', 'Latitude 5530', 'SN-DL5530-00402', 'retired', 'Head Office', 'Store', NULL, 'IT Store', NULL, NULL, '2021-06-15', 620000.00, 'NGN', NULL),
('c0000000-0001-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-011', 'hardware', 'Laptop', 'Dell Precision 5680', 'Performance workstation laptop', 'Dell', 'Precision 5680', 'SN-DP5680-00202', 'active', 'Head Office', 'Main Building', '3', '306', '5db8e9fc-125b-4883-62c3-372b18e64d33', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-06-10', 1450000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0001-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'ITD-LPT-012', 'hardware', 'Laptop', 'Lenovo ThinkPad X1 Carbon', 'Ultrabook for executive use', 'Lenovo', 'ThinkPad X1 Carbon Gen 11', 'SN-LTX1C-00501', 'active', 'Head Office', 'Main Building', '4', '401', 'b57c7521-672f-307c-9878-e3504b0e18d7', 'b57c7521-672f-307c-9878-e3504b0e18d7', '2024-08-01', 1200000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),

-- ── Desktops (6) ──────────────────────────────────────────────────────
('c0000000-0002-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-DSK-001', 'hardware', 'Desktop', 'Dell OptiPlex 7010 MT', 'Standard desktop - Intel i5, 16GB RAM, 256GB SSD', 'Dell', 'OptiPlex 7010', 'SN-DO7010-00601', 'active', 'Head Office', 'Main Building', '1', 'Reception', NULL, NULL, '2024-01-10', 520000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0002-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-DSK-002', 'hardware', 'Desktop', 'Dell OptiPlex 7010 MT', 'Standard desktop for shared workstation', 'Dell', 'OptiPlex 7010', 'SN-DO7010-00602', 'active', 'Head Office', 'Main Building', '1', 'Conference Room A', NULL, NULL, '2024-01-10', 520000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0002-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ITD-DSK-003', 'hardware', 'Desktop', 'Dell OptiPlex 7010 SFF', 'Small form factor desktop', 'Dell', 'OptiPlex 7010 SFF', 'SN-DO7010S-00603', 'active', 'Head Office', 'Annex Building', '2', '204', NULL, NULL, '2024-02-15', 480000.00, 'NGN', 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90'),
('c0000000-0002-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ITD-DSK-004', 'hardware', 'Desktop', 'HP ProDesk 400 G9', 'Standard desktop', 'HP', 'ProDesk 400 G9', 'SN-HPP400-00701', 'maintenance', 'Head Office', 'Main Building', '2', '220', NULL, NULL, '2023-05-20', 450000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0002-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ITD-DSK-005', 'hardware', 'Desktop', 'Dell OptiPlex 5000', 'Previous gen desktop', 'Dell', 'OptiPlex 5000', 'SN-DO5000-00801', 'retired', 'Head Office', 'Store', NULL, 'IT Store', NULL, NULL, '2020-03-10', 380000.00, 'NGN', NULL),
('c0000000-0002-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ITD-DSK-006', 'hardware', 'Desktop', 'Dell OptiPlex 7010 MT', 'Lab desktop', 'Dell', 'OptiPlex 7010', 'SN-DO7010-00604', 'active', 'Head Office', 'Annex Building', '1', 'IT Lab', NULL, NULL, '2024-03-01', 520000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),

-- ── Servers (6) ───────────────────────────────────────────────────────
('c0000000-0003-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-SRV-001', 'hardware', 'Server', 'Dell PowerEdge R750', 'Production database server - Dual Xeon Gold, 256GB RAM, 4x 1.92TB SSD RAID 10', 'Dell', 'PowerEdge R750', 'SN-DPE750-00901', 'active', 'Data Center', 'DC Building', '1', 'Rack A-01', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-11-20', 8500000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0003-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-SRV-002', 'hardware', 'Server', 'Dell PowerEdge R750', 'Production application server', 'Dell', 'PowerEdge R750', 'SN-DPE750-00902', 'active', 'Data Center', 'DC Building', '1', 'Rack A-02', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-11-20', 8500000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0003-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ITD-SRV-003', 'hardware', 'Server', 'HPE ProLiant DL380 Gen10 Plus', 'File server / backup storage', 'HPE', 'ProLiant DL380 Gen10+', 'SN-HPE380-01001', 'active', 'Data Center', 'DC Building', '1', 'Rack B-01', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-08-15', 6200000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0003-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ITD-SRV-004', 'hardware', 'Server', 'Dell PowerEdge R650', 'Development / staging server', 'Dell', 'PowerEdge R650', 'SN-DPE650-01101', 'active', 'Data Center', 'DC Building', '1', 'Rack B-02', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-02-10', 5800000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0003-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ITD-SRV-005', 'hardware', 'Server', 'Dell PowerEdge T550', 'DR replication server', 'Dell', 'PowerEdge T550', 'SN-DPT550-01201', 'maintenance', 'DR Site', 'DR Building', '1', 'Rack DR-01', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2022-06-01', 4500000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0003-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ITD-SRV-006', 'hardware', 'Server', 'HPE ProLiant DL360 Gen9', 'Legacy test server - pending decommission', 'HPE', 'ProLiant DL360 Gen9', 'SN-HPE360-01301', 'retired', 'Data Center', 'DC Building', '1', 'Rack C-01', NULL, NULL, '2018-03-10', 3200000.00, 'NGN', NULL),

-- ── Network Equipment (8) ─────────────────────────────────────────────
('c0000000-0004-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-NET-001', 'network', 'Switch', 'Cisco Catalyst 9300-48P', 'Core layer 48-port PoE+ switch', 'Cisco', 'Catalyst 9300-48P', 'SN-CC9300-01401', 'active', 'Data Center', 'DC Building', '1', 'Rack N-01', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-07-01', 3800000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0004-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-NET-002', 'network', 'Switch', 'Cisco Catalyst 9300-48P', 'Distribution layer switch - Floor 2', 'Cisco', 'Catalyst 9300-48P', 'SN-CC9300-01402', 'active', 'Head Office', 'Main Building', '2', 'IDF-2', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-07-01', 3800000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0004-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ITD-NET-003', 'network', 'Switch', 'Cisco Catalyst 9300-24P', 'Distribution layer switch - Floor 3', 'Cisco', 'Catalyst 9300-24P', 'SN-CC9324-01501', 'active', 'Head Office', 'Main Building', '3', 'IDF-3', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-07-01', 2900000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0004-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ITD-NET-004', 'network', 'Router', 'Cisco ISR 4431', 'Edge router - WAN connectivity', 'Cisco', 'ISR 4431', 'SN-CISR4431-01601', 'active', 'Data Center', 'DC Building', '1', 'Rack N-02', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-04-15', 4200000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0004-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ITD-NET-005', 'network', 'Firewall', 'Fortinet FortiGate 200F', 'Primary perimeter firewall', 'Fortinet', 'FortiGate 200F', 'SN-FFG200-01701', 'active', 'Data Center', 'DC Building', '1', 'Rack N-01', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-09-01', 5600000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0004-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ITD-NET-006', 'network', 'Firewall', 'Fortinet FortiGate 200F', 'Secondary / HA pair firewall', 'Fortinet', 'FortiGate 200F', 'SN-FFG200-01702', 'active', 'Data Center', 'DC Building', '1', 'Rack N-02', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-09-01', 5600000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0004-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'ITD-NET-007', 'network', 'Access Point', 'Cisco Meraki MR46', 'Wireless access point - Floor 3', 'Cisco Meraki', 'MR46', 'SN-CMR46-01801', 'active', 'Head Office', 'Main Building', '3', 'Ceiling-3A', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2024-01-15', 380000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0004-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'ITD-NET-008', 'network', 'Access Point', 'Cisco Meraki MR46', 'Wireless access point - Floor 2', 'Cisco Meraki', 'MR46', 'SN-CMR46-01802', 'maintenance', 'Head Office', 'Main Building', '2', 'Ceiling-2B', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2024-01-15', 380000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),

-- ── Printers (4) ──────────────────────────────────────────────────────
('c0000000-0005-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-PRN-001', 'peripheral', 'Printer', 'HP LaserJet Enterprise M611dn', 'Network laser printer - Floor 3', 'HP', 'LaserJet M611dn', 'SN-HLJ611-01901', 'active', 'Head Office', 'Main Building', '3', 'Print Room 3', NULL, NULL, '2024-02-01', 450000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0005-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-PRN-002', 'peripheral', 'Printer', 'HP LaserJet Enterprise M611dn', 'Network laser printer - Floor 2', 'HP', 'LaserJet M611dn', 'SN-HLJ611-01902', 'active', 'Head Office', 'Main Building', '2', 'Print Room 2', NULL, NULL, '2024-02-01', 450000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0005-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ITD-PRN-003', 'peripheral', 'Printer', 'HP Color LaserJet Pro MFP M479fdw', 'Color MFP printer - Executive suite', 'HP', 'Color LaserJet Pro M479fdw', 'SN-HCLJ479-02001', 'active', 'Head Office', 'Main Building', '4', '401', NULL, NULL, '2023-11-10', 380000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0005-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ITD-PRN-004', 'peripheral', 'Printer', 'HP LaserJet Pro M404dn', 'Budget mono laser - Annex', 'HP', 'LaserJet Pro M404dn', 'SN-HLJ404-02101', 'maintenance', 'Head Office', 'Annex Building', '1', 'Print Corner', NULL, NULL, '2022-08-01', 180000.00, 'NGN', 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90'),

-- ── Monitors (6) ──────────────────────────────────────────────────────
('c0000000-0006-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-MON-001', 'peripheral', 'Monitor', 'Dell UltraSharp U2723QE', '27" 4K USB-C monitor', 'Dell', 'U2723QE', 'SN-DU27-02201', 'active', 'Head Office', 'Main Building', '3', '301', 'b57c7521-672f-307c-9878-e3504b0e18d7', 'b57c7521-672f-307c-9878-e3504b0e18d7', '2024-03-15', 320000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0006-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-MON-002', 'peripheral', 'Monitor', 'Dell UltraSharp U2723QE', '27" 4K USB-C monitor', 'Dell', 'U2723QE', 'SN-DU27-02202', 'active', 'Head Office', 'Main Building', '3', '301', 'b57c7521-672f-307c-9878-e3504b0e18d7', 'b57c7521-672f-307c-9878-e3504b0e18d7', '2024-03-15', 320000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),
('c0000000-0006-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ITD-MON-003', 'peripheral', 'Monitor', 'Dell P2422H', '24" FHD IPS monitor', 'Dell', 'P2422H', 'SN-DP24-02301', 'active', 'Head Office', 'Main Building', '3', '305', '5db8e9fc-125b-4883-62c3-372b18e64d33', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-06-10', 180000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0006-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ITD-MON-004', 'peripheral', 'Monitor', 'Dell P2422H', '24" FHD IPS monitor', 'Dell', 'P2422H', 'SN-DP24-02302', 'active', 'Head Office', 'Main Building', '3', '305', '5db8e9fc-125b-4883-62c3-372b18e64d33', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-06-10', 180000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0006-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ITD-MON-005', 'peripheral', 'Monitor', 'Samsung S24R350', '24" budget monitor', 'Samsung', 'S24R350', 'SN-SS24-02401', 'retired', 'Head Office', 'Store', NULL, 'IT Store', NULL, NULL, '2019-01-15', 95000.00, 'NGN', NULL),
('c0000000-0006-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ITD-MON-006', 'peripheral', 'Monitor', 'Dell P2422H', '24" FHD monitor - Conference Room', 'Dell', 'P2422H', 'SN-DP24-02303', 'active', 'Head Office', 'Main Building', '1', 'Conference Room B', NULL, NULL, '2024-06-10', 180000.00, 'NGN', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'),

-- ── UPS / Power (2) ───────────────────────────────────────────────────
('c0000000-0007-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-UPS-001', 'hardware', 'UPS', 'APC Smart-UPS SRT 10kVA', '10kVA online UPS - Server room primary', 'APC', 'Smart-UPS SRT 10000', 'SN-APC10K-02501', 'active', 'Data Center', 'DC Building', '1', 'Power Bay', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-06-01', 4800000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0007-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-UPS-002', 'hardware', 'UPS', 'APC Smart-UPS SRT 6kVA', '6kVA online UPS - IDF rooms', 'APC', 'Smart-UPS SRT 6000', 'SN-APC6K-02601', 'maintenance', 'Head Office', 'Main Building', '1', 'IDF-1', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2022-01-20', 2800000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),

-- ── Virtual Machines (4) ──────────────────────────────────────────────
('c0000000-0008-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-VM-001', 'virtual', 'Virtual Machine', 'OPMS-PROD-WEB01', 'Production web application server - OPMS frontend', 'VMware', 'vSphere VM', NULL, 'active', 'Data Center', 'DC Building', NULL, 'ESXi Host 1', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-09-01', 0.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0008-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-VM-002', 'virtual', 'Virtual Machine', 'OPMS-PROD-API01', 'Production API server - OPMS backend', 'VMware', 'vSphere VM', NULL, 'active', 'Data Center', 'DC Building', NULL, 'ESXi Host 1', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-09-01', 0.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0008-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ITD-VM-003', 'virtual', 'Virtual Machine', 'OPMS-PROD-DB01', 'Production PostgreSQL database', 'VMware', 'vSphere VM', NULL, 'active', 'Data Center', 'DC Building', NULL, 'ESXi Host 2', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-09-01', 0.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4'),
('c0000000-0008-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ITD-VM-004', 'virtual', 'Virtual Machine', 'AD-DC01', 'Active Directory domain controller', 'VMware', 'vSphere VM', NULL, 'active', 'Data Center', 'DC Building', NULL, 'ESXi Host 2', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2023-01-15', 0.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),

-- ── Cloud Resources (2) ───────────────────────────────────────────────
('c0000000-0009-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ITD-CLD-001', 'cloud', 'Cloud Service', 'Azure Subscription - Production', 'Azure production environment - App Services, SQL Database, Storage', 'Microsoft', 'Azure', NULL, 'active', 'Cloud', NULL, NULL, NULL, 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2024-01-01', 12000000.00, 'NGN', '2464f477-fd51-01ff-2cfc-edc0846be881'),
('c0000000-0009-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ITD-CLD-002', 'cloud', 'Cloud Service', 'Azure Subscription - Dev/Test', 'Azure development and testing environment', 'Microsoft', 'Azure', NULL, 'active', 'Cloud', NULL, NULL, NULL, 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '5db8e9fc-125b-4883-62c3-372b18e64d33', '2024-01-01', 3600000.00, 'NGN', '4493b788-602f-e1a7-ab04-3058bbe61ff4');


-- ══════════════════════════════════════════════════════════════════════
-- LICENSES (12 total)
-- Distribution: 7 compliant, 3 over_deployed, 2 under_utilized
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO licenses (id, tenant_id, software_name, vendor, license_type, total_entitlements, assigned_count, compliance_status, expiry_date, cost, renewal_contact) VALUES
('d0000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Microsoft 365 E3', 'Microsoft', 'per_user', 50, 42, 'compliant', '2027-03-31', 18000000.00, 'microsoft-ea@vendor.com'),
('d0000000-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Microsoft 365 E5', 'Microsoft', 'per_user', 10, 8, 'compliant', '2027-03-31', 7200000.00, 'microsoft-ea@vendor.com'),
('d0000000-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Adobe Creative Cloud', 'Adobe', 'per_user', 5, 7, 'over_deployed', '2026-06-30', 3600000.00, 'adobe-rep@vendor.com'),
('d0000000-0001-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'VMware vSphere Enterprise Plus', 'VMware', 'per_device', 4, 4, 'compliant', '2026-12-31', 8400000.00, 'vmware-renewal@vendor.com'),
('d0000000-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'FortiGate UTM Bundle', 'Fortinet', 'per_device', 2, 2, 'compliant', '2026-09-01', 4200000.00, 'fortinet-support@vendor.com'),
('d0000000-0001-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Cisco DNA Advantage', 'Cisco', 'per_device', 8, 5, 'under_utilized', '2026-07-01', 6800000.00, 'cisco-ea@vendor.com'),
('d0000000-0001-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Jira Software Cloud', 'Atlassian', 'per_user', 25, 28, 'over_deployed', '2026-04-15', 2400000.00, 'atlassian@vendor.com'),
('d0000000-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Confluence Cloud', 'Atlassian', 'per_user', 25, 22, 'compliant', '2026-04-15', 1800000.00, 'atlassian@vendor.com'),
('d0000000-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Windows Server 2022 Datacenter', 'Microsoft', 'per_device', 6, 6, 'compliant', '2028-01-31', 5400000.00, 'microsoft-ea@vendor.com'),
('d0000000-0001-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Veeam Backup & Replication', 'Veeam', 'per_device', 10, 4, 'under_utilized', '2026-08-15', 3200000.00, 'veeam-renewal@vendor.com'),
('d0000000-0001-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'AutoCAD LT', 'Autodesk', 'per_user', 3, 5, 'over_deployed', '2026-05-31', 1500000.00, 'autodesk-rep@vendor.com'),
('d0000000-0001-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Zoom Business', 'Zoom', 'per_user', 30, 24, 'compliant', '2026-10-31', 1200000.00, 'zoom-enterprise@vendor.com');


-- ══════════════════════════════════════════════════════════════════════
-- WARRANTIES (25 total)
-- Distribution across expiry windows for the timeline dashboard:
--   3 expiring within next 30 days
--   4 expiring within 31-60 days
--   3 expiring within 61-90 days
--   10 active (>90 days remaining)
--   3 expired
--   2 renewed
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO warranties (id, asset_id, tenant_id, vendor, contract_number, coverage_type, start_date, end_date, cost, renewal_status) VALUES

-- Expiring within 30 days (from today ~2026-03-06)
('e0000000-0001-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HPE', 'HPE-WR-2023-001', 'Next Business Day', '2023-08-15', '2026-03-20', 620000.00, 'expiring_soon'),
('e0000000-0001-0000-0000-000000000002', 'c0000000-0004-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cisco', 'CISCO-SMT-2023-001', 'SmartNet 8x5xNBD', '2023-07-01', '2026-03-25', 380000.00, 'expiring_soon'),
('e0000000-0001-0000-0000-000000000003', 'c0000000-0007-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'APC', 'APC-EXT-2022-001', 'Extended Warranty', '2022-01-20', '2026-03-31', 280000.00, 'expiring_soon'),

-- Expiring within 31-60 days
('e0000000-0002-0000-0000-000000000001', 'c0000000-0004-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Cisco', 'CISCO-SMT-2023-002', 'SmartNet 8x5xNBD', '2023-07-01', '2026-04-10', 380000.00, 'active'),
('e0000000-0002-0000-0000-000000000002', 'c0000000-0004-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cisco', 'CISCO-SMT-2023-003', 'SmartNet 8x5xNBD', '2023-07-01', '2026-04-15', 290000.00, 'active'),
('e0000000-0002-0000-0000-000000000003', 'c0000000-0005-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'HP', 'HP-CPC-2024-001', 'Care Pack NBD', '2024-02-01', '2026-04-25', 45000.00, 'active'),
('e0000000-0002-0000-0000-000000000004', 'c0000000-0004-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Cisco', 'CISCO-SMT-2023-004', 'SmartNet 24x7x4', '2023-04-15', '2026-05-01', 420000.00, 'active'),

-- Expiring within 61-90 days
('e0000000-0003-0000-0000-000000000001', 'c0000000-0004-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Fortinet', 'FORT-FC-2023-001', 'FortiCare 24x7', '2023-09-01', '2026-05-15', 560000.00, 'active'),
('e0000000-0003-0000-0000-000000000002', 'c0000000-0004-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Fortinet', 'FORT-FC-2023-002', 'FortiCare 24x7', '2023-09-01', '2026-05-15', 560000.00, 'active'),
('e0000000-0003-0000-0000-000000000003', 'c0000000-0005-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'HP', 'HP-CPC-2024-002', 'Care Pack NBD', '2024-02-01', '2026-06-01', 45000.00, 'active'),

-- Active (>90 days)
('e0000000-0004-0000-0000-000000000001', 'c0000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-PS-2024-001', 'ProSupport Plus 3Y', '2024-03-15', '2027-03-15', 85000.00, 'active'),
('e0000000-0004-0000-0000-000000000002', 'c0000000-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-PS-2024-002', 'ProSupport Plus 3Y', '2024-03-15', '2027-03-15', 85000.00, 'active'),
('e0000000-0004-0000-0000-000000000003', 'c0000000-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-PS-2024-003', 'ProSupport Plus 3Y', '2024-06-10', '2027-06-10', 145000.00, 'active'),
('e0000000-0004-0000-0000-000000000004', 'c0000000-0001-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Lenovo', 'LEN-PRM-2024-001', 'Premier Support 3Y', '2024-08-01', '2027-08-01', 120000.00, 'active'),
('e0000000-0004-0000-0000-000000000005', 'c0000000-0003-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-MC-2023-001', 'Mission Critical 4H 5Y', '2023-11-20', '2028-11-20', 850000.00, 'active'),
('e0000000-0004-0000-0000-000000000006', 'c0000000-0003-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-MC-2023-002', 'Mission Critical 4H 5Y', '2023-11-20', '2028-11-20', 850000.00, 'active'),
('e0000000-0004-0000-0000-000000000007', 'c0000000-0003-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-PS-2024-004', 'ProSupport 3Y', '2024-02-10', '2027-02-10', 580000.00, 'active'),
('e0000000-0004-0000-0000-000000000008', 'c0000000-0007-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'APC', 'APC-EXT-2023-001', 'Extended Warranty 5Y', '2023-06-01', '2028-06-01', 480000.00, 'active'),
('e0000000-0004-0000-0000-000000000009', 'c0000000-0004-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Cisco Meraki', 'MERAKI-LIC-2024-001', 'Enterprise License 3Y', '2024-01-15', '2027-01-15', 38000.00, 'active'),
('e0000000-0004-0000-0000-000000000010', 'c0000000-0004-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Cisco Meraki', 'MERAKI-LIC-2024-002', 'Enterprise License 3Y', '2024-01-15', '2027-01-15', 38000.00, 'active'),

-- Expired
('e0000000-0005-0000-0000-000000000001', 'c0000000-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-BS-2021-001', 'Basic Support 3Y', '2021-06-15', '2024-06-15', 45000.00, 'expired'),
('e0000000-0005-0000-0000-000000000002', 'c0000000-0001-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-BS-2021-002', 'Basic Support 3Y', '2021-06-15', '2024-06-15', 45000.00, 'expired'),
('e0000000-0005-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'HPE', 'HPE-FC-2018-001', 'Foundation Care 5Y', '2018-03-10', '2023-03-10', 320000.00, 'expired'),

-- Renewed
('e0000000-0006-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Dell', 'DELL-PS-2022-REN', 'ProSupport Renewal 2Y', '2025-06-01', '2027-06-01', 450000.00, 'renewed'),
('e0000000-0006-0000-0000-000000000002', 'c0000000-0005-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HP', 'HP-CPC-2023-REN', 'Care Pack Renewal 2Y', '2025-11-10', '2027-11-10', 38000.00, 'renewed');


-- ══════════════════════════════════════════════════════════════════════
-- ASSET LIFECYCLE EVENTS (sample events for key assets)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO asset_lifecycle_events (id, asset_id, tenant_id, event_type, performed_by, details) VALUES
-- Server procurement & deployment
('f0000000-0001-0000-0000-000000000001', 'c0000000-0003-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'procured', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"vendor":"Dell","po_number":"PO-2023-0458","amount":8500000}'),
('f0000000-0001-0000-0000-000000000002', 'c0000000-0003-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'received', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"received_date":"2023-12-01","condition":"new"}'),
('f0000000-0001-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'deployed', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"location":"Data Center - Rack A-01","deployed_date":"2023-12-15"}'),

-- Laptop deployment
('f0000000-0002-0000-0000-000000000001', 'c0000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'procured', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"vendor":"Dell","po_number":"PO-2024-0102","amount":850000}'),
('f0000000-0002-0000-0000-000000000002', 'c0000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'deployed', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"assigned_to":"Abubakar Mohammed","deployed_date":"2024-03-20"}'),

-- Maintenance events
('f0000000-0003-0000-0000-000000000001', 'c0000000-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'maintenance_start', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"Battery replacement and keyboard repair","vendor":"HP Support","ticket":"TKT-000045"}'),
('f0000000-0003-0000-0000-000000000002', 'c0000000-0002-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'maintenance_start', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"HDD failure - data recovery in progress","vendor":"HP Support","ticket":"TKT-000052"}'),
('f0000000-0003-0000-0000-000000000003', 'c0000000-0003-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'maintenance_start', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"RAID controller replacement","vendor":"Dell ProSupport"}'),
('f0000000-0003-0000-0000-000000000004', 'c0000000-0005-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'maintenance_start', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"Fuser unit replacement","vendor":"HP Parts"}'),
('f0000000-0003-0000-0000-000000000005', 'c0000000-0004-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'maintenance_start', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"Firmware update and radio calibration","vendor":"Cisco TAC"}'),

-- Retirement events
('f0000000-0004-0000-0000-000000000001', 'c0000000-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'retired', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"End of life - 5 years old, replacement deployed","data_wiped":true}'),
('f0000000-0004-0000-0000-000000000002', 'c0000000-0001-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'retired', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"End of life - 5 years old, replacement deployed","data_wiped":true}'),
('f0000000-0004-0000-0000-000000000003', 'c0000000-0002-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'retired', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"End of life - 6 years old","data_wiped":true}'),
('f0000000-0004-0000-0000-000000000004', 'c0000000-0003-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'retired', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"End of support from HPE, replaced by newer model","data_wiped":true}'),
('f0000000-0004-0000-0000-000000000005', 'c0000000-0006-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'retired', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"reason":"End of life - replaced with Dell P2422H","data_wiped":false}'),

-- Network equipment deployment
('f0000000-0005-0000-0000-000000000001', 'c0000000-0004-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'deployed', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"location":"Data Center - Rack N-01","config":"HA Active/Passive pair"}'),
('f0000000-0005-0000-0000-000000000002', 'c0000000-0004-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'deployed', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '{"location":"Data Center - Rack N-02","config":"HA Active/Passive pair"}');


-- +goose Down

DELETE FROM asset_lifecycle_events WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND id LIKE 'f0000000-%';

DELETE FROM warranties WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND id LIKE 'e0000000-%';

DELETE FROM licenses WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND id LIKE 'd0000000-%';

DELETE FROM assets WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND id LIKE 'c0000000-%';
