import type { CandidateProfile } from "./candidate";

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface HiringPipeline {
  id: string;
  employerId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: PipelineStage[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineCandidate {
  id: string;
  pipelineId: string;
  candidateId: string;
  stageId: string;
  addedBy: string;
  notes: string | null;
  matchScore: number | null;
  movedAt: string;
  candidate: CandidateProfile;
}

export interface PipelineWithCandidates extends HiringPipeline {
  candidates: PipelineCandidate[];
  stageCounts: Record<string, number>;
}
