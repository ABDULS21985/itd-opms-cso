-- +goose Up

-- Expand org_level_type enum to support the full CBN ITD hierarchy:
-- Directorate > Department > Division > Office > Unit > Team > Section
ALTER TYPE org_level_type ADD VALUE IF NOT EXISTS 'directorate' BEFORE 'department';
ALTER TYPE org_level_type ADD VALUE IF NOT EXISTS 'team' AFTER 'unit';
ALTER TYPE org_level_type ADD VALUE IF NOT EXISTS 'section' AFTER 'team';

-- +goose Down

-- PostgreSQL does not support removing values from enums directly.
-- The added values (directorate, team, section) will remain in the enum type.
-- To fully revert, you would need to recreate the type, which requires
-- dropping and recreating all columns that use it.
SELECT 1;
