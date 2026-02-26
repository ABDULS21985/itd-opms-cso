"use client";

import {
  Building2,
  User,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import type { IntroRequest } from "@/types/intro-request";
import { IntroRequestStatus, CandidateIntroResponse } from "@/types/intro-request";
import { StatusBadge } from "@/components/shared/status-badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntroRequestCardProps {
  request: IntroRequest;
  userRole: "candidate" | "employer" | "admin";
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
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
  });
}

function getStatusVariant(
  status: IntroRequestStatus,
): "success" | "warning" | "error" | "info" | "default" {
  const map: Record<IntroRequestStatus, "success" | "warning" | "error" | "info" | "default"> = {
    [IntroRequestStatus.PENDING]: "warning",
    [IntroRequestStatus.APPROVED]: "info",
    [IntroRequestStatus.MORE_INFO_NEEDED]: "warning",
    [IntroRequestStatus.DECLINED]: "error",
    [IntroRequestStatus.SCHEDULED]: "info",
    [IntroRequestStatus.COMPLETED]: "success",
  };
  return map[status];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IntroRequestCard({
  request,
  userRole,
  onApprove,
  onDecline,
  onAccept,
  onReject,
}: IntroRequestCardProps) {
  const showAdminActions =
    userRole === "admin" && request.status === IntroRequestStatus.PENDING;
  const showCandidateActions =
    userRole === "candidate" &&
    request.status === IntroRequestStatus.APPROVED &&
    request.candidateResponse === CandidateIntroResponse.PENDING;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {request.roleTitle}
            </h3>
            <StatusBadge
              status={request.status}
              variant={getStatusVariant(request.status)}
            />
          </div>

          {/* Candidate response badge (if responded) */}
          {request.candidateResponse &&
            request.candidateResponse !== CandidateIntroResponse.PENDING && (
              <div className="mt-1">
                <StatusBadge
                  status={`candidate: ${request.candidateResponse}`}
                  variant={
                    request.candidateResponse ===
                    CandidateIntroResponse.ACCEPTED
                      ? "success"
                      : "error"
                  }
                />
              </div>
            )}
        </div>

        <div className="shrink-0 text-right text-xs text-[var(--neutral-gray)]">
          <Clock className="mr-1 inline h-3 w-3" />
          {formatDate(request.createdAt)}
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--neutral-gray)]">
        {request.employer && (
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {request.employer.companyName}
          </span>
        )}
        {request.candidate && (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {request.candidate.fullName}
          </span>
        )}
        {request.desiredStartDate && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Start: {formatDate(request.desiredStartDate)}
          </span>
        )}
        {request.workMode && (
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            {request.workMode.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Role description preview */}
      {request.roleDescription && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--neutral-gray)]">
          {request.roleDescription}
        </p>
      )}

      {/* Notes */}
      {request.notesToPlacementUnit && userRole === "admin" && (
        <div className="mt-3 rounded-lg bg-[var(--surface-1)] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
            <MessageSquare className="h-3 w-3 text-[var(--primary)]" />
            Notes to Placement Unit
          </p>
          <p className="mt-1 text-xs text-[var(--neutral-gray)]">
            {request.notesToPlacementUnit}
          </p>
        </div>
      )}

      {/* Actions */}
      {(showAdminActions || showCandidateActions) && (
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--surface-2)] pt-4">
          {showAdminActions && (
            <>
              <button
                type="button"
                onClick={() => onApprove?.(request.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--success-dark)]"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => onDecline?.(request.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--error)] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--error-dark)]"
              >
                <XCircle className="h-3.5 w-3.5" />
                Decline
              </button>
            </>
          )}
          {showCandidateActions && (
            <>
              <button
                type="button"
                onClick={() => onAccept?.(request.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--success-dark)]"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Accept
              </button>
              <button
                type="button"
                onClick={() => onReject?.(request.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--error)] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--error-dark)]"
              >
                <XCircle className="h-3.5 w-3.5" />
                Decline
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
