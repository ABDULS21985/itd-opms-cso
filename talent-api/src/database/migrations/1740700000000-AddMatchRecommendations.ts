import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchRecommendations1740700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "match_recommendations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "job_id" uuid NOT NULL,
        "employer_id" uuid NOT NULL,
        "overall_score" int NOT NULL DEFAULT 0,
        "explanation" jsonb NOT NULL DEFAULT '{}',
        "is_dismissed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        "version" int NOT NULL DEFAULT 1,
        "deleted_at" timestamptz,
        CONSTRAINT "PK_match_recommendations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_match_rec_candidate_job" UNIQUE ("candidate_id", "job_id"),
        CONSTRAINT "FK_match_rec_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_rec_job" FOREIGN KEY ("job_id") REFERENCES "job_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_rec_employer" FOREIGN KEY ("employer_id") REFERENCES "employer_orgs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_match_rec_candidate" ON "match_recommendations"("candidate_id", "overall_score" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_match_rec_job" ON "match_recommendations"("job_id", "overall_score" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_match_rec_employer" ON "match_recommendations"("employer_id", "overall_score" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_match_rec_score" ON "match_recommendations"("overall_score" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "match_recommendations"`);
  }
}
