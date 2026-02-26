import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPreferencesAndEmailSent1739836800000
  implements MigrationInterface
{
  name = 'AddNotificationPreferencesAndEmailSent1739836800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email_sent column to notifications table if it doesn't exist
    const hasEmailSent = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'notifications' AND column_name = 'email_sent'
    `);
    if (hasEmailSent.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "notifications" ADD COLUMN "email_sent" boolean NOT NULL DEFAULT false
      `);
    }

    // Update notification_type enum with new values
    // PostgreSQL requires special handling for enum types
    const existingTypes = await queryRunner.query(`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type_enum')
    `);
    const existingLabels = existingTypes.map((r: any) => r.enumlabel);

    const newTypes = [
      'profile_suspended',
      'intro_response',
      'application_received',
      'job_rejected',
      'employer_rejected',
      'new_candidate',
      'new_employer',
      'system_alert',
    ];

    for (const newType of newTypes) {
      if (!existingLabels.includes(newType)) {
        await queryRunner.query(
          `ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS '${newType}'`,
        );
      }
    }

    // Create user_notification_preferences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        "user_id" uuid NOT NULL,
        "preferences" jsonb NOT NULL DEFAULT '{}',
        "email_digest" character varying NOT NULL DEFAULT 'immediate',
        "quiet_hours_start" time,
        "quiet_hours_end" time,
        "browser_push_enabled" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_user_notification_preferences_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_user_notification_preferences" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key to talent_users
    const fkExists = await queryRunner.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'user_notification_preferences'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'FK_user_notification_preferences_user_id'
    `);
    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "user_notification_preferences"
        ADD CONSTRAINT "FK_user_notification_preferences_user_id"
        FOREIGN KEY ("user_id") REFERENCES "talent_users"("id") ON DELETE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_notification_preferences" DROP CONSTRAINT IF EXISTS "FK_user_notification_preferences_user_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_notification_preferences"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "email_sent"`,
    );
    // Note: PostgreSQL does not support removing values from enum types.
    // The new enum values will remain even after down migration.
  }
}
