import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobIdToIntroRequests1740300000000
  implements MigrationInterface
{
  name = 'AddJobIdToIntroRequests1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'intro_requests' AND column_name = 'job_id'
    `);
    if (hasColumn.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "intro_requests"
        ADD COLUMN "job_id" uuid NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "intro_requests"
        ADD CONSTRAINT "FK_intro_requests_job_id"
        FOREIGN KEY ("job_id") REFERENCES "job_posts"("id")
        ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "intro_requests" DROP CONSTRAINT IF EXISTS "FK_intro_requests_job_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "intro_requests" DROP COLUMN IF EXISTS "job_id"
    `);
  }
}
