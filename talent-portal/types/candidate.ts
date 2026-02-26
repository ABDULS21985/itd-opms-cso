import type { SkillTag, Track, Cohort } from "./taxonomy";

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export enum AvailabilityStatus {
  IMMEDIATE = "immediate",
  ONE_MONTH = "one_month",
  TWO_THREE_MONTHS = "two_three_months",
  NOT_AVAILABLE = "not_available",
  PLACED = "placed",
}

export enum WorkMode {
  REMOTE = "remote",
  HYBRID = "hybrid",
  ON_SITE = "on_site",
}

export enum ProfileApprovalStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  NEEDS_UPDATE = "needs_update",
  SUSPENDED = "suspended",
  ARCHIVED = "archived",
}

export enum ProfileVisibility {
  PRIVATE = "private",
  PUBLIC = "public",
  EMPLOYER_ONLY = "employer_only",
}

export enum ConsentType {
  DATA_PROCESSING = "data_processing",
  PUBLIC_LISTING = "public_listing",
  NDA_ACKNOWLEDGEMENT = "nda_acknowledgement",
}

export enum DocumentType {
  CV_GENERATED = "cv_generated",
  CV_UPLOADED = "cv_uploaded",
  CERTIFICATE = "certificate",
  OTHER = "other",
}

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────

export interface CandidateProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;

  userId: string;
  fullName: string;
  slug: string;
  photoUrl: string | null;
  bio: string | null;

  city: string | null;
  country: string | null;
  timezone: string | null;
  phone: string | null;
  contactEmail: string | null;

  yearsOfExperience: number | null;
  primaryStacks: string[] | null;
  languages: string[] | null;
  spokenLanguages: string[] | null;

  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  personalWebsite: string | null;

  availabilityStatus: AvailabilityStatus | null;
  preferredWorkMode: WorkMode | null;
  preferredHoursStart: string | null;
  preferredHoursEnd: string | null;

  primaryTrackId: string | null;
  cohortId: string | null;

  nitdaBadgeVerified: boolean;
  badgeId: string | null;
  experienceAreas: string[] | null;

  approvalStatus: ProfileApprovalStatus;
  visibilityLevel: ProfileVisibility;

  approvedBy: string | null;
  approvedAt: string | null;
  adminNotes: string | null;
  internalRatings: Record<string, unknown> | null;
  adminFlags: string[] | null;

  profileStrength: number;
  profileViews: number;
  introRequestsReceived: number;

  // Relations (optionally populated)
  primaryTrack?: Track | null;
  tracks?: Track[];
  cohort?: Cohort | null;
  candidateSkills?: CandidateSkill[];
  candidateProjects?: CandidateProject[];
  candidateDocuments?: CandidateDocument[];
  candidateConsents?: CandidateConsent[];
}

export interface CandidateSkill {
  id: string;
  createdAt: string;
  updatedAt: string;

  candidateId: string;
  skillId: string;
  isVerified: boolean;
  verifiedBy: string | null;
  isCustom: boolean;
  customTagName: string | null;

  // Relations (optionally populated)
  skill?: SkillTag;
}

export interface CandidateProject {
  id: string;
  createdAt: string;
  updatedAt: string;

  candidateId: string;
  title: string;
  description: string | null;
  outcomeMetric: string | null;
  projectUrl: string | null;
  githubUrl: string | null;
  imageUrl: string | null;
  techStack: string[] | null;
  displayOrder: number;
}

export interface CandidateConsent {
  id: string;
  createdAt: string;
  updatedAt: string;

  candidateId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string;
  revokedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface CandidateDocument {
  id: string;
  createdAt: string;
  updatedAt: string;

  candidateId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  isCurrent: boolean;
}

export interface ProfileStrength {
  strength: number;
  maxScore: number;
}
