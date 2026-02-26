import type { SkillTag } from "./taxonomy";
import type { EmployerOrg } from "./employer";
import type { CandidateProfile } from "./candidate";
import { WorkMode } from "./candidate";

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export enum JobType {
  INTERNSHIP = "internship",
  CONTRACT = "contract",
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
}

export enum JobStatus {
  DRAFT = "draft",
  PENDING_REVIEW = "pending_review",
  PUBLISHED = "published",
  CLOSED = "closed",
  ARCHIVED = "archived",
  REJECTED = "rejected",
}

export enum ExperienceLevel {
  ENTRY = "entry",
  MID = "mid",
  SENIOR = "senior",
}

export enum ApplicationStatus {
  SUBMITTED = "submitted",
  VIEWED = "viewed",
  SHORTLISTED = "shortlisted",
  INTERVIEW = "interview",
  OFFER = "offer",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
}

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────

export interface JobPost {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;

  employerId: string;
  title: string;
  slug: string;

  jobType: JobType;
  workMode: WorkMode;
  location: string | null;
  timezonePreference: string | null;

  description: string;
  responsibilities: string | null;

  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;

  experienceLevel: ExperienceLevel | null;
  applicationDeadline: string | null;
  hiringProcess: string | null;

  postedById: string;
  niceToHaveSkills: string[] | null;

  status: JobStatus;
  moderatedBy: string | null;
  moderatedAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;

  viewCount: number;
  applicationCount: number;

  // Relations (optionally populated)
  employer?: EmployerOrg;
  jobSkills?: JobSkill[];
  jobApplications?: JobApplication[];
}

export interface JobSkill {
  id: string;
  createdAt: string;
  updatedAt: string;

  jobId: string;
  skillId: string;
  isRequired: boolean;

  // Relations (optionally populated)
  skill?: SkillTag;
}

export interface JobApplication {
  id: string;
  createdAt: string;
  updatedAt: string;

  jobId: string;
  candidateId: string;
  coverNote: string | null;
  cvDocumentId: string | null;

  status: ApplicationStatus;

  viewedAt: string | null;
  shortlistedAt: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;

  // Relations (optionally populated)
  job?: JobPost;
  candidate?: CandidateProfile;
}
