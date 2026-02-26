import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds UAT data for all personas:
 *
 * ADMINS:
 *   - Super Admin (superadmin@talentportal.uat)
 *   - Placement Manager (placement.manager@talentportal.uat)
 *   - Placement Officer (placement.officer@talentportal.uat)
 *
 * CANDIDATES:
 *   - Ada Okafor - Senior (5yr), approved, full profile
 *   - Tunde Bakare - Mid (2yr), approved
 *   - Fatima Sule - Junior (1yr), submitted (pending review)
 *
 * EMPLOYERS:
 *   - Paystack (verified) - with 1 published job + 1 intro request
 *   - Flutterwave (verified) - with 1 published job
 *   - Digibit Limited (verified) - with 1 published job, Super Admin as owner
 *
 * EMPLOYER FEATURES:
 *   - 2 Hiring Pipelines (Paystack + Flutterwave default)
 *   - 3 Pipeline Candidates (Ada & Tunde in Paystack, Tunde in Flutterwave)
 *   - 3 Candidate Notes (from employers on candidates)
 *   - 2 Job Post Templates (one per employer)
 *   - 2 Interviews (Paystack→Ada, Flutterwave→Tunde)
 *   - 6 Activity Log entries
 *
 * TAXONOMY:
 *   - 3 Tracks, 2 Cohorts, 5 Skills, 3 Locations
 */
export class SeedUATData1708100000000 implements MigrationInterface {
  name = 'SeedUATData1708100000000';

  // Fixed UUIDs for deterministic seeding
  // Taxonomy
  static TRACK_SE = '11111111-0001-4000-a000-000000000001';
  static TRACK_DS = '11111111-0001-4000-a000-000000000002';
  static TRACK_PD = '11111111-0001-4000-a000-000000000003';
  static COHORT_3 = '11111111-0002-4000-a000-000000000001';
  static COHORT_2 = '11111111-0002-4000-a000-000000000002';
  static SKILL_TS = '11111111-0003-4000-a000-000000000001';
  static SKILL_REACT = '11111111-0003-4000-a000-000000000002';
  static SKILL_NODE = '11111111-0003-4000-a000-000000000003';
  static SKILL_PG = '11111111-0003-4000-a000-000000000004';
  static SKILL_PY = '11111111-0003-4000-a000-000000000005';
  static LOC_LAGOS = '11111111-0004-4000-a000-000000000001';
  static LOC_ABUJA = '11111111-0004-4000-a000-000000000002';
  static LOC_KANO = '11111111-0004-4000-a000-000000000003';

  // Users
  static USER_SUPER_ADMIN = '22222222-0001-4000-a000-000000000001';
  static USER_PL_MANAGER = '22222222-0001-4000-a000-000000000002';
  static USER_PL_OFFICER = '22222222-0001-4000-a000-000000000003';
  static USER_ADA = '22222222-0002-4000-a000-000000000001';
  static USER_TUNDE = '22222222-0002-4000-a000-000000000002';
  static USER_FATIMA = '22222222-0002-4000-a000-000000000003';
  static USER_PAYSTACK = '22222222-0003-4000-a000-000000000001';
  static USER_FLUTTERWAVE = '22222222-0003-4000-a000-000000000002';

  // Profiles
  static PROFILE_ADA = '33333333-0001-4000-a000-000000000001';
  static PROFILE_TUNDE = '33333333-0001-4000-a000-000000000002';
  static PROFILE_FATIMA = '33333333-0001-4000-a000-000000000003';

  // Employer Orgs
  static ORG_PAYSTACK = '44444444-0001-4000-a000-000000000001';
  static ORG_FLUTTERWAVE = '44444444-0001-4000-a000-000000000002';
  static ORG_DIGIBIT = '44444444-0001-4000-a000-000000000003';

  // Jobs
  static JOB_PS_BACKEND = '55555555-0001-4000-a000-000000000001';
  static JOB_FW_FRONTEND = '55555555-0001-4000-a000-000000000002';
  static JOB_DG_FULLSTACK = '55555555-0001-4000-a000-000000000003';

  // Intro Requests
  static INTRO_PS_ADA = '66666666-0001-4000-a000-000000000001';
  static INTRO_FW_TUNDE = '66666666-0001-4000-a000-000000000002';

  // Placement Records
  static PLACEMENT_PS_ADA = '88888888-0001-4000-a000-000000000001';
  static PLACEMENT_FW_TUNDE = '88888888-0001-4000-a000-000000000002';

  // Hiring Pipelines
  static PIPELINE_PAYSTACK = '77777777-0001-4000-a000-000000000001';
  static PIPELINE_FLUTTERWAVE = '77777777-0001-4000-a000-000000000002';

  // Pipeline Candidates
  static PC_PS_ADA = '77777777-0002-4000-a000-000000000001';
  static PC_PS_TUNDE = '77777777-0002-4000-a000-000000000002';
  static PC_FW_TUNDE = '77777777-0002-4000-a000-000000000003';

  // Candidate Notes
  static NOTE_PS_ADA = '77777777-0003-4000-a000-000000000001';
  static NOTE_PS_ADA_2 = '77777777-0003-4000-a000-000000000002';
  static NOTE_FW_TUNDE = '77777777-0003-4000-a000-000000000003';

  // Job Post Templates
  static TPL_PS_BACKEND = '77777777-0004-4000-a000-000000000001';
  static TPL_FW_FRONTEND = '77777777-0004-4000-a000-000000000002';

  // Interviews
  static INTERVIEW_PS_ADA = '77777777-0005-4000-a000-000000000001';
  static INTERVIEW_FW_TUNDE = '77777777-0005-4000-a000-000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const S = SeedUATData1708100000000;

    // ─── TAXONOMY ───────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO tracks (id, name, slug, description, icon_name, display_order, is_active, created_at, updated_at, version)
      VALUES
        ('${S.TRACK_SE}', 'Software Engineering', 'software-engineering', 'Full-stack, backend and cloud engineering', 'code', 1, true, NOW(), NOW(), 1),
        ('${S.TRACK_DS}', 'Data Science', 'data-science', 'Machine learning, data analysis and AI', 'chart-bar', 2, true, NOW(), NOW(), 1),
        ('${S.TRACK_PD}', 'Product Design', 'product-design', 'UI/UX design, prototyping and user research', 'palette', 3, true, NOW(), NOW(), 1)
      ON CONFLICT (slug) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO cohorts (id, name, slug, program_cycle, start_date, end_date, is_active, created_at, updated_at, version)
      VALUES
        ('${S.COHORT_3}', 'Cohort 3.0', 'cohort-30', 'Cycle 3', '2026-01-15', '2026-06-15', true, NOW(), NOW(), 1),
        ('${S.COHORT_2}', 'Cohort 2.0', 'cohort-20', 'Cycle 2', '2025-06-01', '2025-12-01', false, NOW(), NOW(), 1)
      ON CONFLICT (slug) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO skill_tags (id, name, slug, category, is_active, usage_count, created_at, updated_at, version)
      VALUES
        ('${S.SKILL_TS}', 'TypeScript/JavaScript', 'typescript-javascript', 'programming_language', true, 0, NOW(), NOW(), 1),
        ('${S.SKILL_REACT}', 'React', 'react', 'frontend_framework', true, 0, NOW(), NOW(), 1),
        ('${S.SKILL_NODE}', 'Node.js', 'nodejs', 'backend_runtime', true, 0, NOW(), NOW(), 1),
        ('${S.SKILL_PG}', 'PostgreSQL', 'postgresql', 'database', true, 0, NOW(), NOW(), 1),
        ('${S.SKILL_PY}', 'Python', 'python', 'programming_language', true, 0, NOW(), NOW(), 1)
      ON CONFLICT (slug) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO locations (id, city, country, country_code, timezone, is_active, created_at, updated_at, version)
      VALUES
        ('${S.LOC_LAGOS}', 'Lagos', 'Nigeria', 'NG', 'Africa/Lagos', true, NOW(), NOW(), 1),
        ('${S.LOC_ABUJA}', 'Abuja', 'Nigeria', 'NG', 'Africa/Lagos', true, NOW(), NOW(), 1),
        ('${S.LOC_KANO}', 'Kano', 'Nigeria', 'NG', 'Africa/Lagos', true, NOW(), NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);

    // ─── USERS ──────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('${S.USER_SUPER_ADMIN}', 'uat-super-admin-001', 'superadmin@talentportal.uat', 'Super Admin', 'admin', '[]', NOW(), NOW(), 1),
        ('${S.USER_PL_MANAGER}', 'uat-placement-mgr-001', 'placement.manager@talentportal.uat', 'Placement Manager', 'admin', '[]', NOW(), NOW(), 1),
        ('${S.USER_PL_OFFICER}', 'uat-placement-off-001', 'placement.officer@talentportal.uat', 'Placement Officer', 'admin', '[]', NOW(), NOW(), 1),
        ('${S.USER_ADA}', 'uat-candidate-001', 'ada.okafor@talentportal.uat', 'Ada Okafor', 'candidate', '[]', NOW(), NOW(), 1),
        ('${S.USER_TUNDE}', 'uat-candidate-002', 'tunde.bakare@talentportal.uat', 'Tunde Bakare', 'candidate', '[]', NOW(), NOW(), 1),
        ('${S.USER_FATIMA}', 'uat-candidate-003', 'fatima.sule@talentportal.uat', 'Fatima Sule', 'candidate', '[]', NOW(), NOW(), 1),
        ('${S.USER_PAYSTACK}', 'uat-employer-001', 'hr@paystack.uat', 'Amaka Nwosu', 'employer', '[]', NOW(), NOW(), 1),
        ('${S.USER_FLUTTERWAVE}', 'uat-employer-002', 'talent@flutterwave.uat', 'Chidi Eze', 'employer', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING;
    `);

    // ─── ROLES ──────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'super_admin', '${S.USER_SUPER_ADMIN}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'placement_manager', '${S.USER_SUPER_ADMIN}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'placement_manager', '${S.USER_PL_MANAGER}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'placement_officer', '${S.USER_PL_OFFICER}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '${S.USER_ADA}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '${S.USER_TUNDE}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '${S.USER_FATIMA}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'employer_admin', '${S.USER_PAYSTACK}', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'employer_admin', '${S.USER_FLUTTERWAVE}', NOW(), NOW(), NOW(), 1);
    `);

    // ─── CANDIDATE PROFILES ─────────────────────────────────────
    // Ada Okafor - Senior, approved, full profile
    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id, full_name, slug, bio, city, country, timezone, phone, contact_email,
        years_of_experience, primary_stacks, languages, spoken_languages,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode, preferred_hours_start, preferred_hours_end,
        primary_track_id, cohort_id,
        approval_status, visibility_level, approved_by, approved_at,
        profile_strength, created_at, updated_at, version
      ) VALUES (
        '${S.PROFILE_ADA}', '${S.USER_ADA}',
        'Ada Okafor', 'ada-okafor-uat',
        'Senior full-stack developer with 5 years of experience building scalable web applications. Passionate about clean code and mentoring junior developers.',
        'Lagos', 'Nigeria', 'Africa/Lagos', '+2348091234567', 'ada.okafor@email.com',
        5, 'React,Node.js,PostgreSQL,AWS', 'TypeScript,JavaScript,Python,Go', 'English,Igbo',
        'https://github.com/adaokafor', 'https://linkedin.com/in/adaokafor', 'https://adaokafor.dev',
        'immediate', 'remote', '08:00', '17:00',
        '${S.TRACK_SE}', '${S.COHORT_3}',
        'approved', 'public', '${S.USER_SUPER_ADMIN}', NOW(),
        95, NOW(), NOW(), 1
      ) ON CONFLICT (slug) DO NOTHING;
    `);

    // Tunde Bakare - Mid, approved
    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id, full_name, slug, bio, city, country, timezone, phone, contact_email,
        years_of_experience, primary_stacks, languages, spoken_languages,
        github_url, linkedin_url,
        availability_status, preferred_work_mode, preferred_hours_start, preferred_hours_end,
        primary_track_id, cohort_id,
        approval_status, visibility_level, approved_by, approved_at,
        profile_strength, created_at, updated_at, version
      ) VALUES (
        '${S.PROFILE_TUNDE}', '${S.USER_TUNDE}',
        'Tunde Bakare', 'tunde-bakare-uat',
        'Backend engineer specializing in distributed systems and cloud infrastructure. 2 years experience with microservices architecture.',
        'Abuja', 'Nigeria', 'Africa/Lagos', '+2348076543210', 'tunde.bakare@email.com',
        2, 'Python,Django,Docker,Kubernetes', 'Python,JavaScript,Rust', 'English,Yoruba,Hausa',
        'https://github.com/tundebakare', 'https://linkedin.com/in/tundebakare',
        'one_month', 'hybrid', '09:00', '18:00',
        '${S.TRACK_SE}', '${S.COHORT_3}',
        'approved', 'public', '${S.USER_SUPER_ADMIN}', NOW(),
        80, NOW(), NOW(), 1
      ) ON CONFLICT (slug) DO NOTHING;
    `);

    // Fatima Sule - Junior, submitted (pending review)
    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id, full_name, slug, bio, city, country, timezone, phone, contact_email,
        years_of_experience, primary_stacks, languages, spoken_languages,
        github_url, linkedin_url,
        availability_status, preferred_work_mode, preferred_hours_start, preferred_hours_end,
        primary_track_id, cohort_id,
        approval_status, visibility_level,
        profile_strength, created_at, updated_at, version
      ) VALUES (
        '${S.PROFILE_FATIMA}', '${S.USER_FATIMA}',
        'Fatima Sule', 'fatima-sule-uat',
        'Data scientist and ML engineer with expertise in NLP and computer vision. Fresh graduate eager to apply research skills in industry.',
        'Kano', 'Nigeria', 'Africa/Lagos', '+2348065432109', 'fatima.sule@email.com',
        1, 'Python,TensorFlow,PyTorch,SQL', 'Python,R,SQL', 'English,Hausa,Arabic',
        'https://github.com/fatimasule', 'https://linkedin.com/in/fatimasule',
        'immediate', 'remote', '09:00', '17:00',
        '${S.TRACK_DS}', '${S.COHORT_3}',
        'submitted', 'private',
        80, NOW(), NOW(), 1
      ) ON CONFLICT (slug) DO NOTHING;
    `);

    // ─── CANDIDATE SKILLS ───────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO candidate_skills (id, candidate_id, skill_id, is_verified, is_custom, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '${S.PROFILE_ADA}', '${S.SKILL_TS}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_ADA}', '${S.SKILL_REACT}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_ADA}', '${S.SKILL_NODE}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_ADA}', '${S.SKILL_PG}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_TUNDE}', '${S.SKILL_PY}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_TUNDE}', '${S.SKILL_NODE}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_TUNDE}', '${S.SKILL_TS}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_FATIMA}', '${S.SKILL_PY}', false, false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_FATIMA}', '${S.SKILL_TS}', false, false, NOW(), NOW(), 1);
    `);

    // ─── CANDIDATE PROJECTS ─────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO candidate_projects (id, candidate_id, title, description, tech_stack, outcome_metric, project_url, github_url, display_order, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '${S.PROFILE_ADA}', 'FinPay - Mobile Payment Platform',
         'Built a mobile-first payment platform processing 50K+ daily transactions. Led a team of 4 developers.',
         'React Native,Node.js,PostgreSQL,Redis', '50K+ daily transactions, 99.9% uptime',
         'https://finpay.ng', 'https://github.com/adaokafor/finpay', 0, NOW(), NOW(), 1),

        (gen_random_uuid(), '${S.PROFILE_ADA}', 'EduTrack - Learning Management System',
         'Full-stack LMS supporting 10K+ students with real-time video, quizzes, and progress tracking.',
         'Next.js,Express,MongoDB,WebSocket', '10K+ active students, 4.8/5 rating',
         NULL, 'https://github.com/adaokafor/edutrack', 1, NOW(), NOW(), 1),

        (gen_random_uuid(), '${S.PROFILE_TUNDE}', 'CloudOps Dashboard',
         'Real-time infrastructure monitoring dashboard with alerting and auto-scaling triggers.',
         'Python,FastAPI,React,Grafana', 'Reduced incident response time by 60%',
         NULL, NULL, 0, NOW(), NOW(), 1),

        (gen_random_uuid(), '${S.PROFILE_FATIMA}', 'NLP Sentiment Analyzer',
         'Built a Transformer-based sentiment analysis model achieving 94% accuracy on Nigerian Twitter data.',
         'Python,PyTorch,Hugging Face,FastAPI', '94% accuracy, published research paper',
         NULL, NULL, 0, NOW(), NOW(), 1);
    `);

    // ─── CANDIDATE CONSENTS ─────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '${S.PROFILE_ADA}', 'data_processing', true, NOW(), '127.0.0.1', 'UAT-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_ADA}', 'public_listing', true, NOW(), '127.0.0.1', 'UAT-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_TUNDE}', 'data_processing', true, NOW(), '127.0.0.1', 'UAT-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_TUNDE}', 'public_listing', true, NOW(), '127.0.0.1', 'UAT-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.PROFILE_FATIMA}', 'data_processing', true, NOW(), '127.0.0.1', 'UAT-Seed', NOW(), NOW(), 1);
    `);

    // ─── EMPLOYER ORGS ──────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO employer_orgs (
        id, company_name, slug, website_url, description, sector,
        location_hq, country, hiring_tracks, hiring_work_modes,
        verification_status, verified_by, verified_at,
        created_at, updated_at, version
      ) VALUES
        ('${S.ORG_PAYSTACK}', 'Paystack', 'paystack-uat',
         'https://paystack.com',
         'Paystack helps businesses in Africa get paid by anyone, anywhere in the world. Over 200,000 businesses use Paystack to process payments.',
         'FinTech', 'Lagos', 'Nigeria',
         'Software Engineering,Data Science,Product Design', 'remote,hybrid',
         'verified', '${S.USER_SUPER_ADMIN}', NOW(),
         NOW(), NOW(), 1),

        ('${S.ORG_FLUTTERWAVE}', 'Flutterwave', 'flutterwave-uat',
         'https://flutterwave.com',
         'Flutterwave provides seamless and secure payment infrastructure for businesses operating in Africa. Processing billions in payments annually.',
         'FinTech', 'Lagos', 'Nigeria',
         'Software Engineering,Data Science', 'remote,hybrid,on_site',
         'verified', '${S.USER_SUPER_ADMIN}', NOW(),
         NOW(), NOW(), 1),

        ('${S.ORG_DIGIBIT}', 'Digibit Limited', 'digibit-limited',
         'https://globaldigibit.com',
         'A pioneering IT company dedicated to improving lives through technology. Specializes in consultancy, implementation, and training across emerging technology domains including Data Analytics, AI, Cybersecurity, CBDC, Blockchain, and IT Governance. Operates across 50+ countries.',
         'Information Technology & Consulting', 'Abuja', 'Nigeria',
         'Software Engineering,Data Science,Product Design', 'remote,hybrid,on_site',
         'verified', '${S.USER_SUPER_ADMIN}', NOW(),
         NOW(), NOW(), 1)
      ON CONFLICT (slug) DO NOTHING;
    `);

    // ─── EMPLOYER USERS ─────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO employer_users (id, user_id, org_id, contact_name, role_title, phone, role, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '${S.USER_PAYSTACK}', '${S.ORG_PAYSTACK}', 'Amaka Nwosu', 'Head of People & Talent', '+2348012345678', 'owner', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.USER_FLUTTERWAVE}', '${S.ORG_FLUTTERWAVE}', 'Chidi Eze', 'Talent Acquisition Lead', '+2348098765432', 'owner', NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.USER_SUPER_ADMIN}', '${S.ORG_DIGIBIT}', 'Super Admin', 'Chief Technology Officer', '+2348151778448', 'owner', NOW(), NOW(), 1);
    `);

    // ─── JOB POSTS ──────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO job_posts (
        id, employer_id, title, slug, job_type, work_mode, location,
        description, responsibilities, salary_min, salary_max, salary_currency,
        experience_level, application_deadline, hiring_process,
        posted_by_id, status, moderated_by, moderated_at, published_at,
        created_at, updated_at, version
      ) VALUES
        ('${S.JOB_PS_BACKEND}', '${S.ORG_PAYSTACK}',
         'Backend Engineer - Payments', 'backend-engineer-payments-uat',
         'full_time', 'remote', 'Lagos, Nigeria',
         'Join Paystack to build payment processing infrastructure serving 200K+ merchants. Work on high-throughput, low-latency systems processing millions of transactions daily.',
         'Design scalable payment APIs. Optimize database queries. Mentor junior engineers. Participate in on-call rotation.',
         4000, 8000, 'USD', 'mid',
         '2026-06-30', 'Resume screening, coding challenge, technical interview, culture fit',
         '${S.USER_PAYSTACK}', 'published', '${S.USER_SUPER_ADMIN}', NOW(), NOW(),
         NOW(), NOW(), 1),

        ('${S.JOB_FW_FRONTEND}', '${S.ORG_FLUTTERWAVE}',
         'Frontend Engineer - Dashboard', 'frontend-engineer-dashboard-uat',
         'full_time', 'hybrid', 'Lagos, Nigeria',
         'Build and maintain Flutterwave merchant dashboard used by thousands of businesses across Africa. Focus on performance, accessibility and beautiful UI.',
         'Build responsive React components. Implement data visualization dashboards. Write unit and integration tests. Collaborate with product and design teams.',
         3500, 7000, 'USD', 'entry',
         '2026-07-15', 'Portfolio review, live coding session, team interview',
         '${S.USER_FLUTTERWAVE}', 'published', '${S.USER_SUPER_ADMIN}', NOW(), NOW(),
         NOW(), NOW(), 1),

        ('${S.JOB_DG_FULLSTACK}', '${S.ORG_DIGIBIT}',
         'Full Stack Developer', 'full-stack-developer-digibit',
         'full_time', 'hybrid', 'Abuja, Nigeria',
         'Join Digibit Limited to build cutting-edge technology solutions across emerging domains including AI, Data Analytics, Cybersecurity, and Blockchain. Work with a team operating across 50+ countries.',
         'Build and maintain web applications. Design RESTful APIs. Collaborate with cross-functional teams. Implement security best practices.',
         4000, 7000, 'USD', 'mid',
         '2026-08-01', 'Resume screening, technical interview, team fit session',
         '${S.USER_SUPER_ADMIN}', 'published', '${S.USER_SUPER_ADMIN}', NOW(), NOW(),
         NOW(), NOW(), 1)
      ON CONFLICT (slug) DO NOTHING;
    `);

    // ─── JOB SKILLS ─────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO job_skills (id, job_id, skill_id, is_required, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '${S.JOB_PS_BACKEND}', '${S.SKILL_TS}', true, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_PS_BACKEND}', '${S.SKILL_NODE}', true, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_PS_BACKEND}', '${S.SKILL_PG}', true, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_PS_BACKEND}', '${S.SKILL_REACT}', false, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_FW_FRONTEND}', '${S.SKILL_REACT}', true, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_FW_FRONTEND}', '${S.SKILL_TS}', true, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_DG_FULLSTACK}', '${S.SKILL_TS}', true, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_DG_FULLSTACK}', '${S.SKILL_REACT}', true, NOW(), NOW(), 1),
        (gen_random_uuid(), '${S.JOB_DG_FULLSTACK}', '${S.SKILL_NODE}', true, NOW(), NOW(), 1);
    `);

    // ─── INTRO REQUESTS ─────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO intro_requests (
        id, employer_id, requested_by_id, candidate_id,
        role_title, role_description, desired_start_date, work_mode,
        location_expectation, notes_to_placement_unit, status,
        handled_by, handled_at,
        candidate_response, candidate_responded_at,
        created_at, updated_at, version
      ) VALUES (
        '${S.INTRO_PS_ADA}', '${S.ORG_PAYSTACK}', '${S.USER_PAYSTACK}', '${S.PROFILE_ADA}',
        'Senior Backend Engineer',
        'We need a senior engineer to lead our payments infrastructure team. Ada has excellent full-stack skills and aligns perfectly with our tech stack.',
        '2026-05-01', 'remote',
        'Fully remote, Africa timezone preferred',
        'High priority hire. Ada profile matches our requirements perfectly.',
        'approved',
        '${S.USER_SUPER_ADMIN}', NOW() - INTERVAL '18 days',
        'accepted', NOW() - INTERVAL '16 days',
        NOW() - INTERVAL '20 days', NOW(), 1
      );
    `);

    await queryRunner.query(`
      INSERT INTO intro_requests (
        id, employer_id, requested_by_id, candidate_id,
        role_title, role_description, desired_start_date, work_mode,
        location_expectation, notes_to_placement_unit, status,
        handled_by, handled_at,
        candidate_response, candidate_responded_at,
        created_at, updated_at, version
      ) VALUES (
        '${S.INTRO_FW_TUNDE}', '${S.ORG_FLUTTERWAVE}', '${S.USER_FLUTTERWAVE}', '${S.PROFILE_TUNDE}',
        'Backend Infrastructure Engineer',
        'Tunde has strong backend and infrastructure skills that would be great for our platform reliability team.',
        '2026-04-15', 'hybrid',
        'Lagos office, hybrid 3 days/week',
        'Good culture fit. Solid systems background.',
        'approved',
        '${S.USER_SUPER_ADMIN}', NOW() - INTERVAL '13 days',
        'accepted', NOW() - INTERVAL '11 days',
        NOW() - INTERVAL '15 days', NOW(), 1
      );
    `);

    // ─── PLACEMENT RECORDS ──────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO placement_records (
        id, candidate_id, employer_id, intro_request_id, job_id,
        status, placement_type,
        intro_date, interview_date, offer_date, placed_date,
        start_date, salary_range, managed_by,
        created_at, updated_at, version
      ) VALUES
        ('${S.PLACEMENT_PS_ADA}', '${S.PROFILE_ADA}', '${S.ORG_PAYSTACK}', '${S.INTRO_PS_ADA}', '${S.JOB_PS_BACKEND}',
         'placed', 'full_time',
         NOW() - INTERVAL '18 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days',
         '2026-05-01', '$6,000 - $8,000 USD', '${S.USER_SUPER_ADMIN}',
         NOW() - INTERVAL '18 days', NOW(), 1),

        ('${S.PLACEMENT_FW_TUNDE}', '${S.PROFILE_TUNDE}', '${S.ORG_FLUTTERWAVE}', '${S.INTRO_FW_TUNDE}', '${S.JOB_FW_FRONTEND}',
         'interviewing', 'full_time',
         NOW() - INTERVAL '13 days', NOW() - INTERVAL '7 days', NULL, NULL,
         NULL, NULL, '${S.USER_SUPER_ADMIN}',
         NOW() - INTERVAL '13 days', NOW(), 1);
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const S = SeedUATData1708100000000;

    // Delete in reverse dependency order
    await queryRunner.query(`DELETE FROM placement_records WHERE id IN ('${S.PLACEMENT_PS_ADA}', '${S.PLACEMENT_FW_TUNDE}')`);
    await queryRunner.query(`DELETE FROM intro_requests WHERE id IN ('${S.INTRO_PS_ADA}', '${S.INTRO_FW_TUNDE}')`);
    await queryRunner.query(`DELETE FROM job_skills WHERE job_id IN ('${S.JOB_PS_BACKEND}', '${S.JOB_FW_FRONTEND}', '${S.JOB_DG_FULLSTACK}')`);
    await queryRunner.query(`DELETE FROM job_posts WHERE id IN ('${S.JOB_PS_BACKEND}', '${S.JOB_FW_FRONTEND}', '${S.JOB_DG_FULLSTACK}')`);
    await queryRunner.query(`DELETE FROM employer_users WHERE org_id IN ('${S.ORG_PAYSTACK}', '${S.ORG_FLUTTERWAVE}', '${S.ORG_DIGIBIT}')`);
    await queryRunner.query(`DELETE FROM employer_orgs WHERE id IN ('${S.ORG_PAYSTACK}', '${S.ORG_FLUTTERWAVE}', '${S.ORG_DIGIBIT}')`);
    await queryRunner.query(`DELETE FROM candidate_consents WHERE candidate_id IN ('${S.PROFILE_ADA}', '${S.PROFILE_TUNDE}', '${S.PROFILE_FATIMA}')`);
    await queryRunner.query(`DELETE FROM candidate_projects WHERE candidate_id IN ('${S.PROFILE_ADA}', '${S.PROFILE_TUNDE}', '${S.PROFILE_FATIMA}')`);
    await queryRunner.query(`DELETE FROM candidate_skills WHERE candidate_id IN ('${S.PROFILE_ADA}', '${S.PROFILE_TUNDE}', '${S.PROFILE_FATIMA}')`);
    await queryRunner.query(`DELETE FROM candidate_profiles WHERE id IN ('${S.PROFILE_ADA}', '${S.PROFILE_TUNDE}', '${S.PROFILE_FATIMA}')`);
    await queryRunner.query(`DELETE FROM talent_user_roles WHERE user_id IN ('${S.USER_SUPER_ADMIN}', '${S.USER_PL_MANAGER}', '${S.USER_PL_OFFICER}', '${S.USER_ADA}', '${S.USER_TUNDE}', '${S.USER_FATIMA}', '${S.USER_PAYSTACK}', '${S.USER_FLUTTERWAVE}')`);
    await queryRunner.query(`DELETE FROM talent_users WHERE id IN ('${S.USER_SUPER_ADMIN}', '${S.USER_PL_MANAGER}', '${S.USER_PL_OFFICER}', '${S.USER_ADA}', '${S.USER_TUNDE}', '${S.USER_FATIMA}', '${S.USER_PAYSTACK}', '${S.USER_FLUTTERWAVE}')`);
    await queryRunner.query(`DELETE FROM locations WHERE id IN ('${S.LOC_LAGOS}', '${S.LOC_ABUJA}', '${S.LOC_KANO}')`);
    await queryRunner.query(`DELETE FROM skill_tags WHERE id IN ('${S.SKILL_TS}', '${S.SKILL_REACT}', '${S.SKILL_NODE}', '${S.SKILL_PG}', '${S.SKILL_PY}')`);
    await queryRunner.query(`DELETE FROM cohorts WHERE id IN ('${S.COHORT_3}', '${S.COHORT_2}')`);
    await queryRunner.query(`DELETE FROM tracks WHERE id IN ('${S.TRACK_SE}', '${S.TRACK_DS}', '${S.TRACK_PD}')`);
  }
}
