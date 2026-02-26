export enum TalentUserType {
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
}

export enum AvailabilityStatus {
  IMMEDIATE = 'immediate',
  ONE_MONTH = 'one_month',
  TWO_THREE_MONTHS = 'two_three_months',
  NOT_AVAILABLE = 'not_available',
  PLACED = 'placed',
}

export enum WorkMode {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ON_SITE = 'on_site',
}

export enum ProfileApprovalStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  NEEDS_UPDATE = 'needs_update',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum ProfileVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  EMPLOYER_ONLY = 'employer_only',
}

export enum ConsentType {
  DATA_PROCESSING = 'data_processing',
  PUBLIC_LISTING = 'public_listing',
  NDA_ACKNOWLEDGEMENT = 'nda_acknowledgement',
}

export enum DocumentType {
  CV_GENERATED = 'cv_generated',
  CV_UPLOADED = 'cv_uploaded',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}

export enum EmployerVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum EmployerUserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum JobType {
  INTERNSHIP = 'internship',
  CONTRACT = 'contract',
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
}

export enum JobStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
  REJECTED = 'rejected',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
}

export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  VIEWED = 'viewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum IntroRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  MORE_INFO_NEEDED = 'more_info_needed',
  DECLINED = 'declined',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
}

export enum CandidateIntroResponse {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  PENDING = 'pending',
}

export enum PlacementStatus {
  AVAILABLE = 'available',
  IN_DISCUSSION = 'in_discussion',
  INTERVIEWING = 'interviewing',
  OFFER = 'offer',
  PLACED = 'placed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PlacementType {
  INTERNSHIP = 'internship',
  CONTRACT = 'contract',
  FULL_TIME = 'full_time',
}

export enum NotificationType {
  PROFILE_APPROVED = 'profile_approved',
  PROFILE_NEEDS_UPDATE = 'profile_needs_update',
  PROFILE_SUSPENDED = 'profile_suspended',
  INTRO_REQUESTED = 'intro_requested',
  INTRO_APPROVED = 'intro_approved',
  INTRO_DECLINED = 'intro_declined',
  INTRO_RESPONSE = 'intro_response',
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_VIEWED = 'application_viewed',
  APPLICATION_SHORTLISTED = 'application_shortlisted',
  APPLICATION_REJECTED = 'application_rejected',
  JOB_PUBLISHED = 'job_published',
  JOB_REJECTED = 'job_rejected',
  EMPLOYER_VERIFIED = 'employer_verified',
  EMPLOYER_REJECTED = 'employer_rejected',
  ADMIN_FEEDBACK = 'admin_feedback',
  PLACEMENT_UPDATE = 'placement_update',
  NEW_CANDIDATE = 'new_candidate',
  NEW_EMPLOYER = 'new_employer',
  SYSTEM_ALERT = 'system_alert',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_CANCELLED = 'interview_cancelled',
  CANDIDATE_STAGE_MOVED = 'candidate_stage_moved',
  MENTION_IN_NOTE = 'mention_in_note',
  TEAM_INVITE = 'team_invite',
  JOB_MATCH_FOUND = 'job_match_found',
  CANDIDATE_MATCH_FOUND = 'candidate_match_found',
}

export enum PipelineStageType {
  INTERESTED = 'interested',
  INTRO_REQUESTED = 'intro_requested',
  INTRO_APPROVED = 'intro_approved',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  PLACED = 'placed',
  DECLINED = 'declined',
}

export enum InterviewType {
  VIDEO = 'video',
  IN_PERSON = 'in_person',
  PHONE = 'phone',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ActivityType {
  PROFILE_VIEWED = 'profile_viewed',
  NOTE_ADDED = 'note_added',
  STAGE_MOVED = 'stage_moved',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  MESSAGE_SENT = 'message_sent',
  MEMBER_MENTIONED = 'member_mentioned',
}

export enum AuditAction {
  PROFILE_CREATED = 'profile_created',
  PROFILE_UPDATED = 'profile_updated',
  PROFILE_SUBMITTED = 'profile_submitted',
  PROFILE_APPROVED = 'profile_approved',
  PROFILE_REJECTED = 'profile_rejected',
  PROFILE_SUSPENDED = 'profile_suspended',
  EMPLOYER_REGISTERED = 'employer_registered',
  EMPLOYER_VERIFIED = 'employer_verified',
  EMPLOYER_REJECTED = 'employer_rejected',
  EMPLOYER_SUSPENDED = 'employer_suspended',
  JOB_CREATED = 'job_created',
  JOB_PUBLISHED = 'job_published',
  JOB_CLOSED = 'job_closed',
  JOB_REJECTED = 'job_rejected',
  INTRO_REQUESTED = 'intro_requested',
  INTRO_APPROVED = 'intro_approved',
  INTRO_DECLINED = 'intro_declined',
  PLACEMENT_CREATED = 'placement_created',
  PLACEMENT_UPDATED = 'placement_updated',
  APPLICATION_SUBMITTED = 'application_submitted',
  REPORT_EXPORTED = 'report_exported',
  ROLE_CHANGED = 'role_changed',
  BULK_IMPORT = 'bulk_import',
  CV_DOWNLOADED = 'cv_downloaded',
  CV_GENERATED = 'cv_generated',
}
