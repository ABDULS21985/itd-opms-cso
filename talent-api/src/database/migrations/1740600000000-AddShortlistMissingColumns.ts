import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShortlistMissingColumns1740600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add candidate_notes jsonb column to shortlists
    await queryRunner.query(`
      ALTER TABLE "shortlists"
      ADD COLUMN IF NOT EXISTS "candidate_notes" jsonb DEFAULT NULL
    `);

    // Add shared_with column to shortlists
    await queryRunner.query(`
      ALTER TABLE "shortlists"
      ADD COLUMN IF NOT EXISTS "shared_with" character varying DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shortlists" DROP COLUMN IF EXISTS "shared_with"
    `);
    await queryRunner.query(`
      ALTER TABLE "shortlists" DROP COLUMN IF EXISTS "candidate_notes"
    `);
  }
}
