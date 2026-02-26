export const NOTIFICATION_EVENTS = {
  // Candidate events
  PROFILE_APPROVED: 'notification.profile.approved',
  PROFILE_NEEDS_UPDATE: 'notification.profile.needs_update',
  PROFILE_SUSPENDED: 'notification.profile.suspended',

  // Intro request events
  INTRO_REQUESTED: 'notification.intro.requested',
  INTRO_APPROVED: 'notification.intro.approved',
  INTRO_DECLINED: 'notification.intro.declined',
  INTRO_CANDIDATE_RESPONDED: 'notification.intro.candidate_responded',

  // Job events
  JOB_PUBLISHED: 'notification.job.published',
  JOB_REJECTED: 'notification.job.rejected',
  APPLICATION_RECEIVED: 'notification.application.received',
  APPLICATION_VIEWED: 'notification.application.viewed',
  APPLICATION_SHORTLISTED: 'notification.application.shortlisted',
  APPLICATION_REJECTED: 'notification.application.rejected',

  // Employer events
  EMPLOYER_VERIFIED: 'notification.employer.verified',
  EMPLOYER_REJECTED: 'notification.employer.rejected',

  // Placement events
  PLACEMENT_UPDATE: 'notification.placement.update',

  // Admin events
  NEW_CANDIDATE: 'notification.admin.new_candidate',
  NEW_EMPLOYER: 'notification.admin.new_employer',

  // Interview events
  INTERVIEW_SCHEDULED: 'notification.interview.scheduled',
  INTERVIEW_CANCELLED: 'notification.interview.cancelled',

  // Pipeline events
  CANDIDATE_STAGE_MOVED: 'notification.pipeline.candidate_moved',

  // Collaboration events
  MENTION_IN_NOTE: 'notification.mention.note',
  TEAM_INVITE: 'notification.team.invite',

  // Matching events
  JOB_MATCH_FOUND: 'notification.matching.job_match',
  CANDIDATE_MATCH_FOUND: 'notification.matching.candidate_match',
} as const;

// ──────────────────────────────────────────────
// Event payload interfaces
// ──────────────────────────────────────────────

export interface BaseNotificationEvent {
  userId: string;
  userEmail?: string;
  userName?: string;
}

export interface ProfileApprovedEvent extends BaseNotificationEvent {
  candidateName: string;
}

export interface ProfileNeedsUpdateEvent extends BaseNotificationEvent {
  candidateName: string;
  notes: string;
}

export interface ProfileSuspendedEvent extends BaseNotificationEvent {
  candidateName: string;
  reason: string;
}

export interface IntroRequestedEvent {
  adminUserIds: string[];
  employerName: string;
  candidateName: string;
  roleTitle: string;
}

export interface IntroApprovedEvent extends BaseNotificationEvent {
  employerName: string;
  candidateName: string;
  roleTitle: string;
}

export interface IntroDeclinedEvent extends BaseNotificationEvent {
  employerName: string;
  roleTitle: string;
  reason?: string;
}

export interface IntroCandidateRespondedEvent extends BaseNotificationEvent {
  candidateName: string;
  employerName: string;
  roleTitle: string;
  response: 'accepted' | 'declined';
}

export interface JobPublishedEvent extends BaseNotificationEvent {
  jobTitle: string;
}

export interface JobRejectedEvent extends BaseNotificationEvent {
  jobTitle: string;
  reason?: string;
}

export interface ApplicationReceivedEvent extends BaseNotificationEvent {
  candidateName: string;
  jobTitle: string;
}

export interface ApplicationStatusEvent extends BaseNotificationEvent {
  jobTitle: string;
  candidateName: string;
}

export interface EmployerVerifiedEvent extends BaseNotificationEvent {
  companyName: string;
}

export interface EmployerRejectedEvent extends BaseNotificationEvent {
  companyName: string;
  reason?: string;
}

export interface PlacementUpdateEvent extends BaseNotificationEvent {
  placementId: string;
  candidateName: string;
  employerName: string;
  newStatus: string;
  oldStatus: string;
}

export interface NewCandidateEvent {
  adminUserIds: string[];
  candidateName: string;
  candidateEmail: string;
}

export interface NewEmployerEvent {
  adminUserIds: string[];
  companyName: string;
  contactEmail: string;
}

// ──────────────────────────────────────────────
// Interview & Pipeline events
// ──────────────────────────────────────────────

export interface InterviewScheduledEvent extends BaseNotificationEvent {
  candidateName: string;
  scheduledAt: string;
  interviewType: string;
}

export interface InterviewCancelledEvent {
  candidateId: string;
  scheduledAt: Date;
}

export interface MentionInNoteEvent {
  userId: string;
  mentionedBy: string;
  candidateName: string;
  candidateId: string;
}

export interface CandidateStageMovedEvent extends BaseNotificationEvent {
  candidateName: string;
  pipelineName: string;
  fromStage: string;
  toStage: string;
}

export interface TeamInviteEvent {
  userId: string;
  companyName: string;
  invitedBy: string;
}

// ──────────────────────────────────────────────
// Matching events
// ──────────────────────────────────────────────

export interface JobMatchFoundEvent extends BaseNotificationEvent {
  jobTitle: string;
  matchScore: number;
  jobSlug: string;
}

export interface CandidateMatchFoundEvent {
  employerUserId: string;
  candidateName: string;
  matchScore: number;
  candidateSlug: string;
  jobTitle: string;
}
