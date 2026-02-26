import { MigrationInterface, QueryRunner } from 'typeorm';
import { SeedUATData1708100000000 as S } from './1708100000000-SeedUATData';

/**
 * Seeds UAT data for the new employer feature tables:
 * hiring_pipelines, pipeline_candidates, candidate_notes,
 * job_post_templates, interviews, employer_activity_logs.
 *
 * Also backfills contact_email on existing employer_orgs.
 */
export class SeedEmployerFeatureData1740100000000
  implements MigrationInterface
{
  name = 'SeedEmployerFeatureData1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── EMPLOYER CONTACT EMAILS ──────────────────────────────
    await queryRunner.query(`
      UPDATE employer_orgs SET contact_email = 'hr@paystack.com', email_verified = true
      WHERE id = '${S.ORG_PAYSTACK}' AND contact_email IS NULL;
    `);
    await queryRunner.query(`
      UPDATE employer_orgs SET contact_email = 'talent@flutterwave.com', email_verified = true
      WHERE id = '${S.ORG_FLUTTERWAVE}' AND contact_email IS NULL;
    `);

    // ─── HIRING PIPELINES ─────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO hiring_pipelines (
        id, employer_id, name, description, is_default, stages, created_by,
        created_at, updated_at, version
      ) VALUES
        ('${S.PIPELINE_PAYSTACK}', '${S.ORG_PAYSTACK}',
         'Default Pipeline', 'Paystack standard hiring pipeline', true,
         '[{"id":"interested","name":"Interested","order":0,"color":"#6366F1"},{"id":"intro_requested","name":"Intro Requested","order":1,"color":"#F59E0B"},{"id":"intro_approved","name":"Intro Approved","order":2,"color":"#10B981"},{"id":"interview","name":"Interview","order":3,"color":"#3B82F6"},{"id":"offer","name":"Offer","order":4,"color":"#8B5CF6"},{"id":"placed","name":"Placed","order":5,"color":"#059669"},{"id":"declined","name":"Declined","order":6,"color":"#EF4444"}]',
         '${S.USER_PAYSTACK}', NOW(), NOW(), 1),

        ('${S.PIPELINE_FLUTTERWAVE}', '${S.ORG_FLUTTERWAVE}',
         'Default Pipeline', 'Flutterwave standard hiring pipeline', true,
         '[{"id":"interested","name":"Interested","order":0,"color":"#6366F1"},{"id":"intro_requested","name":"Intro Requested","order":1,"color":"#F59E0B"},{"id":"intro_approved","name":"Intro Approved","order":2,"color":"#10B981"},{"id":"interview","name":"Interview","order":3,"color":"#3B82F6"},{"id":"offer","name":"Offer","order":4,"color":"#8B5CF6"},{"id":"placed","name":"Placed","order":5,"color":"#059669"},{"id":"declined","name":"Declined","order":6,"color":"#EF4444"}]',
         '${S.USER_FLUTTERWAVE}', NOW(), NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);

    // ─── PIPELINE CANDIDATES ──────────────────────────────────
    await queryRunner.query(`
      INSERT INTO pipeline_candidates (
        id, pipeline_id, candidate_id, stage_id, added_by, notes, match_score, moved_at,
        created_at, updated_at, version
      ) VALUES
        ('${S.PC_PS_ADA}', '${S.PIPELINE_PAYSTACK}', '${S.PROFILE_ADA}',
         'intro_requested', '${S.USER_PAYSTACK}',
         'Strong full-stack profile. Perfect match for backend payments role. Intro request submitted.',
         92, NOW(), NOW(), NOW(), 1),

        ('${S.PC_PS_TUNDE}', '${S.PIPELINE_PAYSTACK}', '${S.PROFILE_TUNDE}',
         'interested', '${S.USER_PAYSTACK}',
         'Good backend skills with Python/Django. Could be a fit for infrastructure team.',
         75, NOW(), NOW(), NOW(), 1),

        ('${S.PC_FW_TUNDE}', '${S.PIPELINE_FLUTTERWAVE}', '${S.PROFILE_TUNDE}',
         'interview', '${S.USER_FLUTTERWAVE}',
         'Passed initial screening. Strong systems design skills. Scheduled for technical interview.',
         80, NOW(), NOW(), NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);

    // ─── CANDIDATE NOTES ──────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO candidate_notes (
        id, employer_id, candidate_id, author_id, content, mentioned_user_ids,
        created_at, updated_at, version
      ) VALUES
        ('${S.NOTE_PS_ADA}', '${S.ORG_PAYSTACK}', '${S.PROFILE_ADA}', '${S.USER_PAYSTACK}',
         'Reviewed Ada''s GitHub portfolio — very impressive open-source contributions. FinPay project demonstrates exactly the kind of payment systems experience we need. Recommending we fast-track her intro request.',
         NULL, NOW(), NOW(), 1),

        ('${S.NOTE_PS_ADA_2}', '${S.ORG_PAYSTACK}', '${S.PROFILE_ADA}', '${S.USER_PAYSTACK}',
         'Spoke with Ada briefly over email. She is available to start immediately and very interested in the payments infrastructure role. Salary expectations align with our budget.',
         NULL, NOW(), NOW(), 1),

        ('${S.NOTE_FW_TUNDE}', '${S.ORG_FLUTTERWAVE}', '${S.PROFILE_TUNDE}', '${S.USER_FLUTTERWAVE}',
         'Tunde has solid backend experience with Python and infrastructure. His CloudOps Dashboard project shows good understanding of monitoring and observability. Moving to technical interview stage.',
         NULL, NOW(), NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);

    // ─── JOB POST TEMPLATES ──────────────────────────────────
    await queryRunner.query(`
      INSERT INTO job_post_templates (
        id, employer_id, name, template_data,
        created_at, updated_at, version
      ) VALUES
        ('${S.TPL_PS_BACKEND}', '${S.ORG_PAYSTACK}',
         'Backend Engineer Template',
         '{"title":"Backend Engineer","description":"Join Paystack to build payment processing infrastructure serving merchants across Africa.","responsibilities":"Design scalable APIs. Optimize database queries. Participate in on-call rotation.","skills":["TypeScript","Node.js","PostgreSQL","Redis"],"jobType":"full_time","workMode":"remote","experienceLevel":"mid","salaryMin":4000,"salaryMax":8000,"salaryCurrency":"USD","location":"Lagos, Nigeria"}',
         NOW(), NOW(), 1),

        ('${S.TPL_FW_FRONTEND}', '${S.ORG_FLUTTERWAVE}',
         'Frontend Engineer Template',
         '{"title":"Frontend Engineer","description":"Build and maintain the Flutterwave merchant dashboard used by thousands of businesses across Africa.","responsibilities":"Build responsive React components. Implement data visualization. Write tests.","skills":["React","TypeScript","Next.js","Tailwind CSS"],"jobType":"full_time","workMode":"hybrid","experienceLevel":"entry","salaryMin":3500,"salaryMax":7000,"salaryCurrency":"USD","location":"Lagos, Nigeria"}',
         NOW(), NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);

    // ─── INTERVIEWS ───────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO interviews (
        id, employer_id, candidate_id, scheduled_by, job_id, pipeline_candidate_id,
        scheduled_at, duration, type, status, location, meeting_url, notes,
        created_at, updated_at, version
      ) VALUES
        ('${S.INTERVIEW_PS_ADA}', '${S.ORG_PAYSTACK}', '${S.PROFILE_ADA}', '${S.USER_PAYSTACK}',
         '${S.JOB_PS_BACKEND}', '${S.PC_PS_ADA}',
         NOW() + INTERVAL '7 days', 60, 'video', 'scheduled',
         NULL, 'https://meet.google.com/uat-paystack-ada',
         'Technical interview — focus on system design and payment systems experience. Panel: Engineering Lead + Senior Backend Engineer.',
         NOW(), NOW(), 1),

        ('${S.INTERVIEW_FW_TUNDE}', '${S.ORG_FLUTTERWAVE}', '${S.PROFILE_TUNDE}', '${S.USER_FLUTTERWAVE}',
         '${S.JOB_FW_FRONTEND}', '${S.PC_FW_TUNDE}',
         NOW() + INTERVAL '5 days', 45, 'video', 'scheduled',
         NULL, 'https://meet.google.com/uat-flutterwave-tunde',
         'Technical interview — live coding session. Assess React proficiency and problem-solving approach.',
         NOW(), NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);

    // ─── EMPLOYER ACTIVITY LOGS ───────────────────────────────
    await queryRunner.query(`
      INSERT INTO employer_activity_logs (
        id, employer_id, user_id, user_name, activity_type, entity_type, entity_id,
        description, metadata, created_at, updated_at, version
      ) VALUES
        (gen_random_uuid(), '${S.ORG_PAYSTACK}', '${S.USER_PAYSTACK}', 'Amaka Nwosu',
         'profile_viewed', 'candidate', '${S.PROFILE_ADA}',
         'Viewed candidate profile: Ada Okafor',
         '{"candidateName":"Ada Okafor","source":"talent_search"}',
         NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 1),

        (gen_random_uuid(), '${S.ORG_PAYSTACK}', '${S.USER_PAYSTACK}', 'Amaka Nwosu',
         'note_added', 'candidate', '${S.PROFILE_ADA}',
         'Added note on candidate: Ada Okafor',
         '{"noteId":"${S.NOTE_PS_ADA}","candidateName":"Ada Okafor"}',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 1),

        (gen_random_uuid(), '${S.ORG_PAYSTACK}', '${S.USER_PAYSTACK}', 'Amaka Nwosu',
         'stage_moved', 'pipeline_candidate', '${S.PC_PS_ADA}',
         'Moved Ada Okafor from Interested to Intro Requested',
         '{"candidateName":"Ada Okafor","fromStage":"interested","toStage":"intro_requested"}',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 1),

        (gen_random_uuid(), '${S.ORG_PAYSTACK}', '${S.USER_PAYSTACK}', 'Amaka Nwosu',
         'interview_scheduled', 'interview', '${S.INTERVIEW_PS_ADA}',
         'Scheduled video interview with Ada Okafor for Backend Engineer - Payments',
         '{"candidateName":"Ada Okafor","jobTitle":"Backend Engineer - Payments","interviewType":"video"}',
         NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1),

        (gen_random_uuid(), '${S.ORG_FLUTTERWAVE}', '${S.USER_FLUTTERWAVE}', 'Chidi Eze',
         'profile_viewed', 'candidate', '${S.PROFILE_TUNDE}',
         'Viewed candidate profile: Tunde Bakare',
         '{"candidateName":"Tunde Bakare","source":"talent_search"}',
         NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 1),

        (gen_random_uuid(), '${S.ORG_FLUTTERWAVE}', '${S.USER_FLUTTERWAVE}', 'Chidi Eze',
         'stage_moved', 'pipeline_candidate', '${S.PC_FW_TUNDE}',
         'Moved Tunde Bakare from Interested to Interview',
         '{"candidateName":"Tunde Bakare","fromStage":"interested","toStage":"interview"}',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 1);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM employer_activity_logs WHERE employer_id IN ('${S.ORG_PAYSTACK}', '${S.ORG_FLUTTERWAVE}')`);
    await queryRunner.query(`DELETE FROM interviews WHERE id IN ('${S.INTERVIEW_PS_ADA}', '${S.INTERVIEW_FW_TUNDE}')`);
    await queryRunner.query(`DELETE FROM job_post_templates WHERE id IN ('${S.TPL_PS_BACKEND}', '${S.TPL_FW_FRONTEND}')`);
    await queryRunner.query(`DELETE FROM candidate_notes WHERE id IN ('${S.NOTE_PS_ADA}', '${S.NOTE_PS_ADA_2}', '${S.NOTE_FW_TUNDE}')`);
    await queryRunner.query(`DELETE FROM pipeline_candidates WHERE id IN ('${S.PC_PS_ADA}', '${S.PC_PS_TUNDE}', '${S.PC_FW_TUNDE}')`);
    await queryRunner.query(`DELETE FROM hiring_pipelines WHERE id IN ('${S.PIPELINE_PAYSTACK}', '${S.PIPELINE_FLUTTERWAVE}')`);
    await queryRunner.query(`
      UPDATE employer_orgs SET contact_email = NULL, email_verified = false
      WHERE id IN ('${S.ORG_PAYSTACK}', '${S.ORG_FLUTTERWAVE}');
    `);
  }
}
