import type { CandidateProfile } from "./candidate";
import type { JobPost } from "./job";

export enum InterviewType {
  VIDEO = "video",
  IN_PERSON = "in_person",
  PHONE = "phone",
}

export enum InterviewStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

export interface Interview {
  id: string;
  employerId: string;
  candidateId: string;
  scheduledBy: string;
  jobId: string | null;
  pipelineCandidateId: string | null;
  scheduledAt: string;
  duration: number;
  type: InterviewType;
  status: InterviewStatus;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  feedback: string | null;
  cancelReason: string | null;
  candidate?: CandidateProfile;
  job?: JobPost;
  createdAt: string;
  updatedAt: string;
}
