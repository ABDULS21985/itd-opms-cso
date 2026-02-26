import type { EmployerOrg } from "./employer";
import type { CandidateProfile, WorkMode } from "./candidate";
import type { PlacementRecord } from "./placement";

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export enum IntroRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  MORE_INFO_NEEDED = "more_info_needed",
  DECLINED = "declined",
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
}

export enum CandidateIntroResponse {
  ACCEPTED = "accepted",
  DECLINED = "declined",
  PENDING = "pending",
}

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────

export interface IntroRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;

  employerId: string;
  requestedById: string;
  candidateId: string;
  jobId: string | null;

  roleTitle: string;
  roleDescription: string;
  desiredStartDate: string | null;
  workMode: WorkMode | null;
  locationExpectation: string | null;
  notesToPlacementUnit: string | null;

  status: IntroRequestStatus;

  handledBy: string | null;
  handledAt: string | null;
  declineReason: string | null;
  adminNotes: string | null;

  candidateResponse: CandidateIntroResponse | null;
  candidateRespondedAt: string | null;

  // Relations (optionally populated)
  employer?: EmployerOrg;
  candidate?: CandidateProfile;
  placementRecord?: PlacementRecord;
}
