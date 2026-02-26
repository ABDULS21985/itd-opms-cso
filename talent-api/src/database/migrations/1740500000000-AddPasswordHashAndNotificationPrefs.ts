import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordHashAndNotificationPrefs1740500000000
  implements MigrationInterface
{
  name = 'AddPasswordHashAndNotificationPrefs1740500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add password_hash column to talent_users (used by AuthService.register)
    const hasPasswordHash = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'talent_users' AND column_name = 'password_hash'
    `);
    if (hasPasswordHash.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "talent_users"
        ADD COLUMN "password_hash" character varying NULL
      `);
    }

    // Add notification_preferences column to candidate_profiles (used by candidate search)
    const hasNotifPrefs = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'candidate_profiles' AND column_name = 'notification_preferences'
    `);
    if (hasNotifPrefs.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "candidate_profiles"
        ADD COLUMN "notification_preferences" jsonb NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "candidate_profiles"
      DROP COLUMN IF EXISTS "notification_preferences"
    `);
    await queryRunner.query(`
      ALTER TABLE "talent_users"
      DROP COLUMN IF EXISTS "password_hash"
    `);
  }
}
