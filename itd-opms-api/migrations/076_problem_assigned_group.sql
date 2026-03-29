-- +goose Up
ALTER TABLE problems
  ADD COLUMN assigned_group_id UUID REFERENCES org_units(id);

CREATE INDEX idx_problems_assigned_group ON problems(assigned_group_id)
  WHERE assigned_group_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_problems_assigned_group;
ALTER TABLE problems DROP COLUMN IF EXISTS assigned_group_id;
