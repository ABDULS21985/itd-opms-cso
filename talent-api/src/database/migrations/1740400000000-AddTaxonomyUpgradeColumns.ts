import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxonomyUpgradeColumns1740400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add color column to tracks
    await queryRunner.query(`
      ALTER TABLE tracks
      ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#1E4DB7';
    `);

    // Add capacity and enrolled_count columns to cohorts
    await queryRunner.query(`
      ALTER TABLE cohorts
      ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE cohorts
      ADD COLUMN IF NOT EXISTS enrolled_count INT DEFAULT 0;
    `);

    // Create skill_track_associations join table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS skill_track_associations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        skill_id UUID NOT NULL REFERENCES skill_tags(id) ON DELETE CASCADE,
        track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        deleted_at TIMESTAMPTZ,
        version INT DEFAULT 1,
        UNIQUE(skill_id, track_id)
      );
    `);

    // Index on skill_track_associations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_track_skill_id
      ON skill_track_associations(skill_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_track_track_id
      ON skill_track_associations(track_id);
    `);

    // Index on candidate_skills for co-occurrence queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_id
      ON candidate_skills(skill_id);
    `);

    // Index on skill_tags category for grouping
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_tags_category
      ON skill_tags(category);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_skill_tags_category;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_candidate_skills_skill_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS skill_track_associations;`);
    await queryRunner.query(`ALTER TABLE cohorts DROP COLUMN IF EXISTS enrolled_count;`);
    await queryRunner.query(`ALTER TABLE cohorts DROP COLUMN IF EXISTS capacity;`);
    await queryRunner.query(`ALTER TABLE tracks DROP COLUMN IF EXISTS color;`);
  }
}
