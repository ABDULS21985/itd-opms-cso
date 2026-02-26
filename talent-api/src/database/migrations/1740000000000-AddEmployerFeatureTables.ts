import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployerFeatureTables1740000000000
  implements MigrationInterface
{
  name = 'AddEmployerFeatureTables1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -----------------------------------------------------------------------
    // 1. Add missing columns to employer_orgs
    // -----------------------------------------------------------------------
    const hasContactEmail = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'employer_orgs' AND column_name = 'contact_email'
    `);
    if (hasContactEmail.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "employer_orgs"
          ADD COLUMN "contact_email" character varying,
          ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false,
          ADD COLUMN "email_verification_code" character varying
      `);
    }

    // -----------------------------------------------------------------------
    // 2. Create new ENUM types
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "interview_type_enum" AS ENUM ('video', 'in_person', 'phone');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "interview_status_enum" AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "activity_type_enum" AS ENUM (
          'profile_viewed', 'note_added', 'stage_moved',
          'interview_scheduled', 'message_sent', 'member_mentioned'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    // -----------------------------------------------------------------------
    // 3. Create hiring_pipelines table
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hiring_pipelines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        "employer_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "is_default" boolean NOT NULL DEFAULT false,
        "stages" jsonb NOT NULL DEFAULT '[{"id":"interested","name":"Interested","order":0,"color":"#6366F1"},{"id":"intro_requested","name":"Intro Requested","order":1,"color":"#F59E0B"},{"id":"intro_approved","name":"Intro Approved","order":2,"color":"#10B981"},{"id":"interview","name":"Interview","order":3,"color":"#3B82F6"},{"id":"offer","name":"Offer","order":4,"color":"#8B5CF6"},{"id":"placed","name":"Placed","order":5,"color":"#059669"},{"id":"declined","name":"Declined","order":6,"color":"#EF4444"}]',
        "created_by" uuid NOT NULL,
        CONSTRAINT "PK_hiring_pipelines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hiring_pipelines_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // -----------------------------------------------------------------------
    // 4. Create pipeline_candidates table
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pipeline_candidates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        "pipeline_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "stage_id" character varying NOT NULL,
        "added_by" uuid NOT NULL,
        "notes" text,
        "match_score" integer,
        "moved_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_pipeline_candidates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pipeline_candidates_pipeline" FOREIGN KEY ("pipeline_id")
          REFERENCES "hiring_pipelines"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_pipeline_candidates_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // -----------------------------------------------------------------------
    // 5. Create candidate_notes table
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "candidate_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        "employer_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "content" text NOT NULL,
        "mentioned_user_ids" character varying,
        CONSTRAINT "PK_candidate_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_candidate_notes_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_candidate_notes_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_candidate_notes_author" FOREIGN KEY ("author_id")
          REFERENCES "talent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // -----------------------------------------------------------------------
    // 6. Create job_post_templates table
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_post_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        "employer_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "template_data" jsonb NOT NULL,
        CONSTRAINT "PK_job_post_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_post_templates_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // -----------------------------------------------------------------------
    // 7. Create interviews table
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "interviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        "employer_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "scheduled_by" uuid NOT NULL,
        "job_id" uuid,
        "pipeline_candidate_id" uuid,
        "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "duration" integer NOT NULL DEFAULT 60,
        "type" "interview_type_enum" NOT NULL,
        "status" "interview_status_enum" NOT NULL DEFAULT 'scheduled',
        "location" character varying,
        "meeting_url" character varying,
        "notes" text,
        "feedback" text,
        "cancel_reason" text,
        CONSTRAINT "PK_interviews" PRIMARY KEY ("id"),
        CONSTRAINT "FK_interviews_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_interviews_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_interviews_job" FOREIGN KEY ("job_id")
          REFERENCES "job_posts"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // -----------------------------------------------------------------------
    // 8. Create employer_activity_logs table
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employer_activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        "employer_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "user_name" character varying,
        "activity_type" "activity_type_enum" NOT NULL,
        "entity_type" character varying NOT NULL,
        "entity_id" character varying NOT NULL,
        "description" text NOT NULL,
        "metadata" jsonb,
        CONSTRAINT "PK_employer_activity_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employer_activity_logs_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // -----------------------------------------------------------------------
    // 9. Add useful indexes
    // -----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_hiring_pipelines_employer" ON "hiring_pipelines" ("employer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pipeline_candidates_pipeline" ON "pipeline_candidates" ("pipeline_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pipeline_candidates_candidate" ON "pipeline_candidates" ("candidate_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_candidate_notes_employer" ON "candidate_notes" ("employer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_candidate_notes_candidate" ON "candidate_notes" ("candidate_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_interviews_employer" ON "interviews" ("employer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_interviews_candidate" ON "interviews" ("candidate_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_interviews_scheduled_at" ON "interviews" ("scheduled_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employer_activity_logs_employer" ON "employer_activity_logs" ("employer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employer_activity_logs_activity_type" ON "employer_activity_logs" ("activity_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employer_activity_logs_activity_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employer_activity_logs_employer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_interviews_scheduled_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_interviews_candidate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_interviews_employer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_candidate_notes_candidate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_candidate_notes_employer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pipeline_candidates_candidate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pipeline_candidates_pipeline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hiring_pipelines_employer"`);

    // Drop tables (reverse order of creation due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "employer_activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "interviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_post_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pipeline_candidates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hiring_pipelines"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "activity_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "interview_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "interview_type_enum"`);

    // Remove added columns from employer_orgs
    await queryRunner.query(`
      ALTER TABLE "employer_orgs"
        DROP COLUMN IF EXISTS "email_verification_code",
        DROP COLUMN IF EXISTS "email_verified",
        DROP COLUMN IF EXISTS "contact_email"
    `);
  }
}
