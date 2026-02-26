export enum ActivityType {
  PROFILE_VIEWED = "profile_viewed",
  NOTE_ADDED = "note_added",
  STAGE_MOVED = "stage_moved",
  INTERVIEW_SCHEDULED = "interview_scheduled",
  MESSAGE_SENT = "message_sent",
  MEMBER_MENTIONED = "member_mentioned",
}

export interface ActivityLog {
  id: string;
  employerId: string;
  userId: string;
  userName: string | null;
  activityType: ActivityType;
  entityType: string;
  entityId: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CandidateNote {
  id: string;
  employerId: string;
  candidateId: string;
  authorId: string;
  content: string;
  mentionedUserIds: string[] | null;
  author?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}
