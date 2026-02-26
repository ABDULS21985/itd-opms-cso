"use client";

import {
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IntroRequest } from "@/types/intro-request";
import { IntroRequestStatus, CandidateIntroResponse } from "@/types/intro-request";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntroRequestTimelineProps {
  request: IntroRequest;
}

interface TimelineStep {
  id: string;
  label: string;
  icon: LucideIcon;
  date: string | null;
  status: "completed" | "current" | "upcoming" | "skipped";
  description?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTimeline(request: IntroRequest): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // Step 1: Pending (request created)
  const isPastPending =
    request.status !== IntroRequestStatus.PENDING;
  steps.push({
    id: "pending",
    label: "Request Submitted",
    icon: Clock,
    date: request.createdAt,
    status: isPastPending ? "completed" : "current",
    description: "Intro request submitted by employer",
  });

  // Step 2: Admin review (approved or declined)
  const isDeclined = request.status === IntroRequestStatus.DECLINED;
  const isApprovedOrLater = [
    IntroRequestStatus.APPROVED,
    IntroRequestStatus.SCHEDULED,
    IntroRequestStatus.COMPLETED,
  ].includes(request.status);

  if (isDeclined) {
    steps.push({
      id: "declined",
      label: "Declined",
      icon: XCircle,
      date: request.handledAt,
      status: "completed",
      description: request.declineReason ?? "Request was declined by admin",
    });
    return steps; // Timeline ends here for declined
  }

  steps.push({
    id: "approved",
    label: "Admin Approved",
    icon: CheckCircle,
    date: request.handledAt,
    status: isApprovedOrLater
      ? "completed"
      : request.status === IntroRequestStatus.MORE_INFO_NEEDED
        ? "current"
        : "upcoming",
    description: isApprovedOrLater
      ? "Request approved by placement team"
      : request.status === IntroRequestStatus.MORE_INFO_NEEDED
        ? "More information requested"
        : undefined,
  });

  // Step 3: Candidate response
  const candidateResponded =
    request.candidateResponse &&
    request.candidateResponse !== CandidateIntroResponse.PENDING;
  const candidateDeclined =
    request.candidateResponse === CandidateIntroResponse.DECLINED;

  if (candidateDeclined) {
    steps.push({
      id: "candidate_response",
      label: "Candidate Declined",
      icon: XCircle,
      date: request.candidateRespondedAt,
      status: "completed",
      description: "Candidate declined the introduction",
    });
    return steps;
  }

  steps.push({
    id: "candidate_response",
    label: "Candidate Response",
    icon: MessageSquare,
    date: request.candidateRespondedAt,
    status: candidateResponded
      ? "completed"
      : isApprovedOrLater && !candidateResponded
        ? "current"
        : "upcoming",
    description: candidateResponded
      ? "Candidate accepted the introduction"
      : undefined,
  });

  // Step 4: Scheduled
  const isScheduledOrLater = [
    IntroRequestStatus.SCHEDULED,
    IntroRequestStatus.COMPLETED,
  ].includes(request.status);

  steps.push({
    id: "scheduled",
    label: "Scheduled",
    icon: Calendar,
    date: null,
    status: isScheduledOrLater
      ? request.status === IntroRequestStatus.SCHEDULED
        ? "current"
        : "completed"
      : "upcoming",
    description: isScheduledOrLater
      ? "Introduction meeting scheduled"
      : undefined,
  });

  // Step 5: Completed
  steps.push({
    id: "completed",
    label: "Completed",
    icon: Award,
    date: null,
    status:
      request.status === IntroRequestStatus.COMPLETED
        ? "completed"
        : "upcoming",
    description:
      request.status === IntroRequestStatus.COMPLETED
        ? "Introduction completed successfully"
        : undefined,
  });

  return steps;
}

// ---------------------------------------------------------------------------
// Status styles
// ---------------------------------------------------------------------------

function getStepStyles(status: TimelineStep["status"]) {
  switch (status) {
    case "completed":
      return {
        dot: "bg-[var(--success)] text-white",
        line: "bg-[var(--success)]",
        label: "text-[var(--foreground)]",
      };
    case "current":
      return {
        dot: "bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/20",
        line: "bg-[var(--surface-3)]",
        label: "text-[var(--primary)] font-semibold",
      };
    case "skipped":
      return {
        dot: "bg-[var(--error)] text-white",
        line: "bg-[var(--surface-3)]",
        label: "text-[var(--error)]",
      };
    case "upcoming":
    default:
      return {
        dot: "bg-[var(--surface-3)] text-[var(--neutral-gray)]",
        line: "bg-[var(--surface-3)]",
        label: "text-[var(--neutral-gray)]",
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IntroRequestTimeline({
  request,
}: IntroRequestTimelineProps) {
  const steps = buildTimeline(request);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-[var(--foreground)]">
        Request Timeline
      </h3>

      <div className="relative">
        {steps.map((step, idx) => {
          const styles = getStepStyles(step.status);
          const StepIcon = step.icon;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[17px] top-10 h-[calc(100%-32px)] w-0.5 ${styles.line}`}
                  aria-hidden="true"
                />
              )}

              {/* Icon dot */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.dot}`}
              >
                <StepIcon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1">
                <p className={`text-sm ${styles.label}`}>{step.label}</p>
                {step.date && (
                  <p className="mt-0.5 text-xs text-[var(--neutral-gray)]">
                    {formatDate(step.date)}
                  </p>
                )}
                {step.description && (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--neutral-gray)]">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
