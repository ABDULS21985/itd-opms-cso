import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1708000000000 implements MigrationInterface {
  name = 'InitialSchema1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────────────
    // Create ENUM types
    // ──────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE "talent_user_type_enum" AS ENUM (
        'candidate', 'employer', 'admin'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "talent_portal_role_enum" AS ENUM (
        'candidate', 'employer_member', 'employer_admin',
        'placement_officer', 'placement_manager', 'super_admin'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "availability_status_enum" AS ENUM (
        'immediate', 'one_month', 'two_three_months', 'not_available', 'placed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "work_mode_enum" AS ENUM (
        'remote', 'hybrid', 'on_site'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "profile_approval_status_enum" AS ENUM (
        'draft', 'submitted', 'approved', 'needs_update', 'suspended', 'archived'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "profile_visibility_enum" AS ENUM (
        'private', 'public', 'employer_only'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "consent_type_enum" AS ENUM (
        'data_processing', 'public_listing', 'nda_acknowledgement'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM (
        'cv_generated', 'cv_uploaded', 'certificate', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "employer_verification_status_enum" AS ENUM (
        'pending', 'verified', 'rejected', 'suspended'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "employer_user_role_enum" AS ENUM (
        'owner', 'admin', 'member'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "job_type_enum" AS ENUM (
        'internship', 'contract', 'full_time', 'part_time'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "job_status_enum" AS ENUM (
        'draft', 'pending_review', 'published', 'closed', 'archived', 'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "experience_level_enum" AS ENUM (
        'entry', 'mid', 'senior'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "application_status_enum" AS ENUM (
        'submitted', 'viewed', 'shortlisted', 'interview', 'offer', 'rejected', 'withdrawn'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "intro_request_status_enum" AS ENUM (
        'pending', 'approved', 'more_info_needed', 'declined', 'scheduled', 'completed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "candidate_intro_response_enum" AS ENUM (
        'accepted', 'declined', 'pending'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "placement_status_enum" AS ENUM (
        'available', 'in_discussion', 'interviewing', 'offer', 'placed', 'completed', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "placement_type_enum" AS ENUM (
        'internship', 'contract', 'full_time'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'profile_approved', 'profile_needs_update', 'intro_requested', 'intro_approved',
        'intro_declined', 'application_viewed', 'application_shortlisted',
        'application_rejected', 'job_published', 'employer_verified',
        'admin_feedback', 'placement_update'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "audit_action_enum" AS ENUM (
        'profile_created', 'profile_updated', 'profile_submitted', 'profile_approved',
        'profile_rejected', 'profile_suspended', 'employer_registered', 'employer_verified',
        'employer_rejected', 'employer_suspended', 'job_created', 'job_published',
        'job_closed', 'job_rejected', 'intro_requested', 'intro_approved',
        'intro_declined', 'placement_created', 'placement_updated',
        'application_submitted', 'report_exported', 'role_changed',
        'bulk_import', 'cv_downloaded', 'cv_generated'
      )
    `);

    // ──────────────────────────────────────────────
    // Create tables
    // ──────────────────────────────────────────────

    // talent_users
    await queryRunner.query(`
      CREATE TABLE "talent_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "external_user_id" character varying NOT NULL,
        "email" character varying NOT NULL,
        "display_name" character varying,
        "avatar_url" character varying,
        "user_type" "talent_user_type_enum" NOT NULL DEFAULT 'candidate',
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "last_active_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_talent_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_talent_users_external_user_id" UNIQUE ("external_user_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_talent_users_external_user_id" ON "talent_users" ("external_user_id")
    `);

    // talent_user_roles
    await queryRunner.query(`
      CREATE TABLE "talent_user_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "role" "talent_portal_role_enum" NOT NULL,
        "assigned_by" character varying,
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_talent_user_roles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_talent_user_roles_user" FOREIGN KEY ("user_id")
          REFERENCES "talent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // tracks
    await queryRunner.query(`
      CREATE TABLE "tracks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" text,
        "icon_name" character varying,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_tracks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tracks_name" UNIQUE ("name"),
        CONSTRAINT "UQ_tracks_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tracks_name" ON "tracks" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tracks_slug" ON "tracks" ("slug")
    `);

    // cohorts
    await queryRunner.query(`
      CREATE TABLE "cohorts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "program_cycle" character varying,
        "start_date" TIMESTAMP WITH TIME ZONE,
        "end_date" TIMESTAMP WITH TIME ZONE,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_cohorts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cohorts_name" UNIQUE ("name"),
        CONSTRAINT "UQ_cohorts_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_cohorts_name" ON "cohorts" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_cohorts_slug" ON "cohorts" ("slug")
    `);

    // locations
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "city" character varying NOT NULL,
        "country" character varying NOT NULL,
        "country_code" character varying,
        "timezone" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_locations" PRIMARY KEY ("id")
      )
    `);

    // skill_tags
    await queryRunner.query(`
      CREATE TABLE "skill_tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "category" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "usage_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_skill_tags" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_skill_tags_name" UNIQUE ("name"),
        CONSTRAINT "UQ_skill_tags_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_skill_tags_name" ON "skill_tags" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_skill_tags_slug" ON "skill_tags" ("slug")
    `);

    // candidate_profiles
    await queryRunner.query(`
      CREATE TABLE "candidate_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "full_name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "photo_url" character varying,
        "bio" text,
        "city" character varying,
        "country" character varying,
        "timezone" character varying,
        "phone" character varying,
        "contact_email" character varying,
        "years_of_experience" integer,
        "primary_stacks" character varying,
        "languages" character varying,
        "spoken_languages" character varying,
        "github_url" character varying,
        "linkedin_url" character varying,
        "portfolio_url" character varying,
        "personal_website" character varying,
        "availability_status" "availability_status_enum",
        "preferred_work_mode" "work_mode_enum",
        "preferred_hours_start" character varying,
        "preferred_hours_end" character varying,
        "primary_track_id" uuid,
        "cohort_id" uuid,
        "nitda_badge_verified" boolean NOT NULL DEFAULT false,
        "badge_id" character varying,
        "experience_areas" character varying,
        "approval_status" "profile_approval_status_enum" NOT NULL DEFAULT 'draft',
        "visibility_level" "profile_visibility_enum" NOT NULL DEFAULT 'private',
        "approved_by" character varying,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "admin_notes" text,
        "internal_ratings" jsonb,
        "admin_flags" character varying,
        "profile_strength" integer NOT NULL DEFAULT 0,
        "profile_views" integer NOT NULL DEFAULT 0,
        "intro_requests_received" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_candidate_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_candidate_profiles_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_candidate_profiles_user" FOREIGN KEY ("user_id")
          REFERENCES "talent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_candidate_profiles_track" FOREIGN KEY ("primary_track_id")
          REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_candidate_profiles_cohort" FOREIGN KEY ("cohort_id")
          REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_candidate_profiles_slug" ON "candidate_profiles" ("slug")
    `);

    // candidate_tracks (ManyToMany join table)
    await queryRunner.query(`
      CREATE TABLE "candidate_tracks" (
        "candidate_id" uuid NOT NULL,
        "track_id" uuid NOT NULL,
        CONSTRAINT "PK_candidate_tracks" PRIMARY KEY ("candidate_id", "track_id"),
        CONSTRAINT "FK_candidate_tracks_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_candidate_tracks_track" FOREIGN KEY ("track_id")
          REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_tracks_candidate_id" ON "candidate_tracks" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_tracks_track_id" ON "candidate_tracks" ("track_id")
    `);

    // candidate_skills
    await queryRunner.query(`
      CREATE TABLE "candidate_skills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "skill_id" uuid NOT NULL,
        "is_verified" boolean NOT NULL DEFAULT false,
        "verified_by" character varying,
        "is_custom" boolean NOT NULL DEFAULT false,
        "custom_tag_name" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_candidate_skills" PRIMARY KEY ("id"),
        CONSTRAINT "FK_candidate_skills_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_candidate_skills_skill" FOREIGN KEY ("skill_id")
          REFERENCES "skill_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // candidate_projects
    await queryRunner.query(`
      CREATE TABLE "candidate_projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "outcome_metric" character varying,
        "project_url" character varying,
        "github_url" character varying,
        "image_url" character varying,
        "tech_stack" character varying,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_candidate_projects" PRIMARY KEY ("id"),
        CONSTRAINT "FK_candidate_projects_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // candidate_consents
    await queryRunner.query(`
      CREATE TABLE "candidate_consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "consent_type" "consent_type_enum" NOT NULL,
        "granted" boolean NOT NULL DEFAULT false,
        "granted_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "ip_address" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_candidate_consents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_candidate_consents_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // candidate_documents
    await queryRunner.query(`
      CREATE TABLE "candidate_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "document_type" "document_type_enum" NOT NULL,
        "file_name" character varying NOT NULL,
        "file_url" character varying NOT NULL,
        "mime_type" character varying NOT NULL,
        "file_size" integer NOT NULL,
        "is_current" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_candidate_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_candidate_documents_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // employer_orgs
    await queryRunner.query(`
      CREATE TABLE "employer_orgs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "logo_url" character varying,
        "website_url" character varying,
        "description" text,
        "sector" character varying,
        "location_hq" character varying,
        "country" character varying,
        "hiring_tracks" character varying,
        "hiring_work_modes" character varying,
        "verification_status" "employer_verification_status_enum" NOT NULL DEFAULT 'pending',
        "verified_by" character varying,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "rejection_reason" text,
        "total_requests" integer NOT NULL DEFAULT 0,
        "total_placements" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_employer_orgs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_employer_orgs_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employer_orgs_slug" ON "employer_orgs" ("slug")
    `);

    // employer_users
    await queryRunner.query(`
      CREATE TABLE "employer_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "org_id" uuid NOT NULL,
        "contact_name" character varying NOT NULL,
        "role_title" character varying,
        "phone" character varying,
        "role" "employer_user_role_enum" NOT NULL DEFAULT 'member',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_employer_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employer_users_user" FOREIGN KEY ("user_id")
          REFERENCES "talent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_employer_users_org" FOREIGN KEY ("org_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // job_posts
    await queryRunner.query(`
      CREATE TABLE "job_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employer_id" uuid NOT NULL,
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "job_type" "job_type_enum" NOT NULL,
        "work_mode" "work_mode_enum" NOT NULL,
        "location" character varying,
        "timezone_preference" character varying,
        "description" text NOT NULL,
        "responsibilities" text,
        "salary_min" numeric,
        "salary_max" numeric,
        "salary_currency" character varying,
        "experience_level" "experience_level_enum",
        "application_deadline" TIMESTAMP WITH TIME ZONE,
        "hiring_process" text,
        "posted_by_id" character varying NOT NULL,
        "nice_to_have_skills" character varying,
        "status" "job_status_enum" NOT NULL DEFAULT 'draft',
        "moderated_by" character varying,
        "moderated_at" TIMESTAMP WITH TIME ZONE,
        "published_at" TIMESTAMP WITH TIME ZONE,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "view_count" integer NOT NULL DEFAULT 0,
        "application_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_job_posts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_posts_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_job_posts_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_posts_slug" ON "job_posts" ("slug")
    `);

    // job_skills
    await queryRunner.query(`
      CREATE TABLE "job_skills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" uuid NOT NULL,
        "skill_id" uuid NOT NULL,
        "is_required" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_job_skills" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_skills_job" FOREIGN KEY ("job_id")
          REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_job_skills_skill" FOREIGN KEY ("skill_id")
          REFERENCES "skill_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // job_applications
    await queryRunner.query(`
      CREATE TABLE "job_applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "cover_note" text,
        "cv_document_id" character varying,
        "status" "application_status_enum" NOT NULL DEFAULT 'submitted',
        "viewed_at" TIMESTAMP WITH TIME ZONE,
        "shortlisted_at" TIMESTAMP WITH TIME ZONE,
        "admin_notes" text,
        "rejection_reason" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_job_applications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_applications_job" FOREIGN KEY ("job_id")
          REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_job_applications_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // intro_requests
    await queryRunner.query(`
      CREATE TABLE "intro_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employer_id" uuid NOT NULL,
        "requested_by_id" character varying NOT NULL,
        "candidate_id" uuid NOT NULL,
        "role_title" character varying NOT NULL,
        "role_description" text NOT NULL,
        "desired_start_date" TIMESTAMP WITH TIME ZONE,
        "work_mode" "work_mode_enum",
        "location_expectation" character varying,
        "notes_to_placement_unit" text,
        "status" "intro_request_status_enum" NOT NULL DEFAULT 'pending',
        "handled_by" character varying,
        "handled_at" TIMESTAMP WITH TIME ZONE,
        "decline_reason" text,
        "admin_notes" text,
        "candidate_response" "candidate_intro_response_enum",
        "candidate_responded_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_intro_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_intro_requests_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_intro_requests_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // placement_records
    await queryRunner.query(`
      CREATE TABLE "placement_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "employer_id" uuid NOT NULL,
        "intro_request_id" uuid,
        "job_id" uuid,
        "status" "placement_status_enum" NOT NULL,
        "placement_type" "placement_type_enum",
        "start_date" TIMESTAMP WITH TIME ZONE,
        "end_date" TIMESTAMP WITH TIME ZONE,
        "salary_range" character varying,
        "outcome_notes" text,
        "managed_by" character varying,
        "intro_date" TIMESTAMP WITH TIME ZONE,
        "interview_date" TIMESTAMP WITH TIME ZONE,
        "offer_date" TIMESTAMP WITH TIME ZONE,
        "placed_date" TIMESTAMP WITH TIME ZONE,
        "completed_date" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_placement_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_placement_records_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_placement_records_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_placement_records_intro_request" FOREIGN KEY ("intro_request_id")
          REFERENCES "intro_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_placement_records_job" FOREIGN KEY ("job_id")
          REFERENCES "job_posts"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // audit_logs
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_id" character varying NOT NULL,
        "actor_email" character varying NOT NULL,
        "actor_role" character varying NOT NULL,
        "action" "audit_action_enum" NOT NULL,
        "entity_type" character varying NOT NULL,
        "entity_id" character varying NOT NULL,
        "previous_values" jsonb,
        "new_values" jsonb,
        "reason" character varying,
        "ip_address" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // notifications
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "action_url" character varying,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "email_sent" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id")
          REFERENCES "talent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // shortlists
    await queryRunner.query(`
      CREATE TABLE "shortlists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "created_by" uuid NOT NULL,
        "employer_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_shortlists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shortlists_created_by" FOREIGN KEY ("created_by")
          REFERENCES "talent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_shortlists_employer" FOREIGN KEY ("employer_id")
          REFERENCES "employer_orgs"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // shortlist_candidates
    await queryRunner.query(`
      CREATE TABLE "shortlist_candidates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shortlist_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "notes" text,
        "added_by" uuid,
        "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_shortlist_candidates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shortlist_candidates_shortlist" FOREIGN KEY ("shortlist_id")
          REFERENCES "shortlists"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_shortlist_candidates_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_shortlist_candidates_pair" UNIQUE ("shortlist_id", "candidate_id")
      )
    `);

    // ──────────────────────────────────────────────
    // Additional indices for performance
    // ──────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_profiles_user_id" ON "candidate_profiles" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_profiles_approval_status" ON "candidate_profiles" ("approval_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_profiles_primary_track_id" ON "candidate_profiles" ("primary_track_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_skills_candidate_id" ON "candidate_skills" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_skills_skill_id" ON "candidate_skills" ("skill_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_candidate_documents_candidate_id" ON "candidate_documents" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employer_users_user_id" ON "employer_users" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employer_users_org_id" ON "employer_users" ("org_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_posts_employer_id" ON "job_posts" ("employer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_posts_status" ON "job_posts" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_skills_job_id" ON "job_skills" ("job_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_skills_skill_id" ON "job_skills" ("skill_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_applications_job_id" ON "job_applications" ("job_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_job_applications_candidate_id" ON "job_applications" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_intro_requests_employer_id" ON "intro_requests" ("employer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_intro_requests_candidate_id" ON "intro_requests" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_intro_requests_status" ON "intro_requests" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_placement_records_candidate_id" ON "placement_records" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_placement_records_employer_id" ON "placement_records" ("employer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_placement_records_status" ON "placement_records" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_entity_type" ON "audit_logs" ("entity_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_shortlists_created_by" ON "shortlists" ("created_by")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_shortlist_candidates_shortlist_id" ON "shortlist_candidates" ("shortlist_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_shortlist_candidates_candidate_id" ON "shortlist_candidates" ("candidate_id")
    `);

    // Ensure uuid-ossp extension is available
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────────────
    // Drop tables in reverse dependency order
    // ──────────────────────────────────────────────

    await queryRunner.query(`DROP TABLE IF EXISTS "shortlist_candidates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shortlists" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "placement_records" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "intro_requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_applications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_skills" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_posts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employer_users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employer_orgs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_documents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_consents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_projects" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_skills" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_tracks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_profiles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "skill_tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cohorts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tracks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "talent_user_roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "talent_users" CASCADE`);

    // ──────────────────────────────────────────────
    // Drop ENUM types
    // ──────────────────────────────────────────────

    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "placement_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "placement_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "candidate_intro_response_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "intro_request_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "application_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "experience_level_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "job_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "job_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "employer_user_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "employer_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "consent_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "profile_visibility_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "profile_approval_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_mode_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "availability_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "talent_portal_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "talent_user_type_enum"`);
  }
}
