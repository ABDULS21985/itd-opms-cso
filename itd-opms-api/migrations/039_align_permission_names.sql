-- +goose Up
-- Migration 039: Align seeded role permission names with middleware convention.
-- Handler middleware uses {module}.view / {module}.manage but seed data uses
-- {module}.read / {module}.write. This mismatch blocks all non-admin users.

-- global_admin: unchanged (wildcard "*")

UPDATE roles SET permissions = '["governance.view", "governance.manage", "people.view", "planning.view", "planning.manage", "itsm.view", "cmdb.view", "knowledge.view", "grc.view", "grc.manage", "reporting.view", "reporting.manage", "system.audit.view", "system.audit.export", "approval.view", "vendor.view", "documents.view"]'::jsonb
WHERE name = 'itd_director';

UPDATE roles SET permissions = '["governance.view", "governance.manage", "people.view", "people.manage", "planning.view", "planning.manage", "itsm.view", "itsm.manage", "cmdb.view", "cmdb.manage", "knowledge.view", "knowledge.manage", "grc.view", "grc.manage", "reporting.view", "reporting.manage", "approval.view", "approval.manage", "vendor.view", "vendor.manage", "documents.view", "documents.manage", "system.audit.view"]'::jsonb
WHERE name = 'head_of_division';

UPDATE roles SET permissions = '["governance.view", "people.view", "people.manage", "planning.view", "planning.manage", "itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "knowledge.manage", "grc.view", "reporting.view", "documents.view", "vendor.view", "approval.view"]'::jsonb
WHERE name = 'supervisor';

UPDATE roles SET permissions = '["governance.view", "people.view", "planning.view", "itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "grc.view", "documents.view", "approval.view"]'::jsonb
WHERE name = 'staff';

UPDATE roles SET permissions = '["governance.view", "people.view", "planning.view", "itsm.view", "cmdb.view", "knowledge.view", "grc.view", "grc.manage", "system.audit.view", "system.audit.verify", "system.audit.export", "reporting.view", "reporting.manage", "documents.view", "vendor.view", "approval.view"]'::jsonb
WHERE name = 'auditor';

UPDATE roles SET permissions = '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "knowledge.manage", "documents.view"]'::jsonb
WHERE name = 'service_desk_agent';

-- +goose Down
UPDATE roles SET permissions = '["governance.read", "governance.approve", "people.read", "planning.read", "planning.approve", "itsm.read", "itsm.approve", "cmdb.read", "knowledge.read", "grc.read", "grc.approve", "reporting.read", "reporting.export", "audit.read"]'::jsonb
WHERE name = 'itd_director';

UPDATE roles SET permissions = '["governance.read", "governance.write", "governance.approve", "people.read", "people.write", "planning.read", "planning.write", "planning.approve", "itsm.read", "itsm.write", "itsm.approve", "cmdb.read", "cmdb.write", "knowledge.read", "knowledge.write", "grc.read", "grc.write", "reporting.read", "reporting.export"]'::jsonb
WHERE name = 'head_of_division';

UPDATE roles SET permissions = '["governance.read", "people.read", "people.write", "planning.read", "planning.write", "itsm.read", "itsm.write", "cmdb.read", "knowledge.read", "knowledge.write", "grc.read", "reporting.read"]'::jsonb
WHERE name = 'supervisor';

UPDATE roles SET permissions = '["governance.read", "people.read_self", "planning.read", "itsm.read", "itsm.create_ticket", "cmdb.read", "knowledge.read", "grc.read"]'::jsonb
WHERE name = 'staff';

UPDATE roles SET permissions = '["governance.read", "people.read", "planning.read", "itsm.read", "cmdb.read", "knowledge.read", "grc.read", "grc.write", "grc.approve", "audit.read", "audit.verify", "reporting.read", "reporting.export"]'::jsonb
WHERE name = 'auditor';

UPDATE roles SET permissions = '["itsm.read", "itsm.write", "itsm.assign", "itsm.resolve", "cmdb.read", "knowledge.read", "knowledge.write"]'::jsonb
WHERE name = 'service_desk_agent';
