import type { CandidateProfile } from "./candidate";
import type { EmployerOrg } from "./employer";
import type { JobPost } from "./job";

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export enum PlacementStatus {
  AVAILABLE = "available",
  IN_DISCUSSION = "in_discussion",
  INTERVIEWING = "interviewing",
  OFFER = "offer",
  PLACED = "placed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum PlacementType {
  INTERNSHIP = "internship",
  CONTRACT = "contract",
  FULL_TIME = "full_time",
}

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────

export interface PlacementRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;

  candidateId: string;
  employerId: string;
  introRequestId: string | null;
  jobId: string | null;

  status: PlacementStatus;
  placementType: PlacementType | null;

  startDate: string | null;
  endDate: string | null;
  salaryRange: string | null;
  outcomeNotes: string | null;
  managedBy: string | null;

  introDate: string | null;
  interviewDate: string | null;
  offerDate: string | null;
  placedDate: string | null;
  completedDate: string | null;

  // Relations (optionally populated)
  candidate?: CandidateProfile;
  employer?: EmployerOrg;
  job?: JobPost | null;
}
