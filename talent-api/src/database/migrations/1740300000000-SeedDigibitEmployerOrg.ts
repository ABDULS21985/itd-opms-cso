import { MigrationInterface, QueryRunner } from 'typeorm';
import { SeedUATData1708100000000 as S } from './1708100000000-SeedUATData';

/**
 * Seeds the Digibit Limited employer org and links the Super Admin user as owner.
 * Also creates a published job post for Digibit Limited.
 *
 * This migration handles existing databases where SeedUATData already ran
 * without the Digibit org data.
 */
export class SeedDigibitEmployerOrg1740300000000
  implements MigrationInterface
{
  name = 'SeedDigibitEmployerOrg1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── DIGIBIT EMPLOYER ORG ────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO employer_orgs (
        id, company_name, slug, website_url, description, sector,
        location_hq, country, hiring_tracks, hiring_work_modes,
        verification_status, verified_by, verified_at,
        contact_email, email_verified,
        created_at, updated_at, version
      ) VALUES (
        '${S.ORG_DIGIBIT}', 'Digibit Limited', 'digibit-limited',
        'https://globaldigibit.com',
        'A pioneering IT company dedicated to improving lives through technology. Specializes in consultancy, implementation, and training across emerging technology domains including Data Analytics, AI, Cybersecurity, CBDC, Blockchain, and IT Governance. Operates across 50+ countries.',
        'Information Technology & Consulting', 'Abuja', 'Nigeria',
        'Software Engineering,Data Science,Product Design', 'remote,hybrid,on_site',
        'verified', '${S.USER_SUPER_ADMIN}', NOW(),
        'connect@globaldigibit.com', true,
        NOW(), NOW(), 1
      ) ON CONFLICT DO NOTHING;
    `);

    // ─── SUPER ADMIN AS EMPLOYER USER ────────────────────────────
    await queryRunner.query(`
      INSERT INTO employer_users (
        id, user_id, org_id, contact_name, role_title, phone, role,
        created_at, updated_at, version
      ) VALUES (
        gen_random_uuid(),
        '${S.USER_SUPER_ADMIN}', '${S.ORG_DIGIBIT}',
        'Super Admin', 'Chief Technology Officer', '+2348151778448', 'owner',
        NOW(), NOW(), 1
      ) ON CONFLICT DO NOTHING;
    `);

    // ─── DIGIBIT JOB POST ───────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO job_posts (
        id, employer_id, posted_by_id, title, slug,
        job_type, work_mode, location, description, responsibilities,
        salary_min, salary_max, salary_currency, experience_level,
        application_deadline, hiring_process,
        status, moderated_by, moderated_at, published_at,
        created_at, updated_at, version
      ) VALUES (
        '${S.JOB_DG_FULLSTACK}', '${S.ORG_DIGIBIT}', '${S.USER_SUPER_ADMIN}',
        'Full Stack Developer', 'full-stack-developer-digibit',
        'full_time', 'hybrid', 'Abuja, Nigeria',
        'Join Digibit Limited to build cutting-edge technology solutions across emerging domains including AI, Data Analytics, Cybersecurity, and Blockchain. Work with a team operating across 50+ countries.',
        'Build and maintain web applications. Design RESTful APIs. Collaborate with cross-functional teams. Implement security best practices.',
        4000, 7000, 'USD', 'mid',
        '2026-08-01', 'Resume screening, technical interview, team fit session',
        'published', '${S.USER_SUPER_ADMIN}', NOW(), NOW(),
        NOW(), NOW(), 1
      ) ON CONFLICT DO NOTHING;
    `);

    // ─── DIGIBIT JOB SKILLS ─────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO job_skills (id, job_id, skill_id, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '${S.JOB_DG_FULLSTACK}', '${S.SKILL_TS}', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_DG_FULLSTACK}', '${S.SKILL_REACT}', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_DG_FULLSTACK}', '${S.SKILL_NODE}', NOW(), NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM job_skills WHERE job_id = '${S.JOB_DG_FULLSTACK}'`);
    await queryRunner.query(`DELETE FROM job_posts WHERE id = '${S.JOB_DG_FULLSTACK}'`);
    await queryRunner.query(`DELETE FROM employer_users WHERE org_id = '${S.ORG_DIGIBIT}'`);
    await queryRunner.query(`DELETE FROM employer_orgs WHERE id = '${S.ORG_DIGIBIT}'`);
  }
}
