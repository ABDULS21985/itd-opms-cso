"use client";

import {
  Building2,
  MapPin,
  Calendar,
  Wifi,
  ExternalLink,
  Globe,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Send,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@digibit/ui/components";
import { StatusBadge } from "@/components/shared/status-badge";
import { CandidateIntroResponse } from "@/types/intro-request";
import type { IntroRequest } from "@/types/intro-request";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const workModeLabels: Record<string, { label: string; icon: typeof Wifi }> = {
  remote: { label: "Remote", icon: Wifi },
  hybrid: { label: "Hybrid", icon: Building2 },
  on_site: { label: "On-site", icon: MapPin },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function canRespond(request: IntroRequest): boolean {
  return (
    (request.candidateResponse === null ||
      request.candidateResponse === CandidateIntroResponse.PENDING) &&
    request.status === "approved"
  );
}

/* ------------------------------------------------------------------ */
/*  Response Timeline                                                   */
/* ------------------------------------------------------------------ */

function ResponseTimeline({ request }: { request: IntroRequest }) {
  const steps: {
    label: string;
    date: string | null;
    color: string;
    dotColor: string;
    completed: boolean;
  }[] = [];

  // Step 1: Sent by employer
  steps.push({
    label: `Sent by ${request.employer?.companyName || "Employer"}`,
    date: request.createdAt,
    color: "text-[var(--primary)]",
    dotColor: "bg-[var(--primary)]",
    completed: true,
  });

  // Step 2: Admin handled
  if (request.handledAt) {
    steps.push({
      label:
        request.status === "approved"
          ? "Approved by placement team"
          : request.status === "declined"
            ? "Declined by placement team"
            : "Reviewed by placement team",
      date: request.handledAt,
      color:
        request.status === "declined"
          ? "text-[var(--error)]"
          : "text-[var(--success)]",
      dotColor:
        request.status === "declined"
          ? "bg-[var(--error)]"
          : "bg-[var(--success)]",
      completed: true,
    });
  }

  // Step 3: Candidate responded
  if (
    request.candidateRespondedAt &&
    request.candidateResponse &&
    request.candidateResponse !== CandidateIntroResponse.PENDING
  ) {
    const accepted =
      request.candidateResponse === CandidateIntroResponse.ACCEPTED;
    steps.push({
      label: accepted ? "You accepted" : "You declined",
      date: request.candidateRespondedAt,
      color: accepted ? "text-[var(--success)]" : "text-[var(--error)]",
      dotColor: accepted ? "bg-[var(--success)]" : "bg-[var(--error)]",
      completed: true,
    });
  }

  // Step 4: Completed
  if (request.status === "completed") {
    steps.push({
      label: "Introduction completed",
      date: request.updatedAt,
      color: "text-[var(--primary)]",
      dotColor: "bg-[var(--primary)]",
      completed: true,
    });
  }

  // Pending step if awaiting response
  if (canRespond(request)) {
    steps.push({
      label: "Awaiting your response",
      date: null,
      color: "text-[var(--accent-orange)]",
      dotColor: "bg-[var(--accent-orange)] animate-pulse",
      completed: false,
    });
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          {/* Vertical line + dot */}
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${step.dotColor}`} />
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-[var(--border)] my-1" />
            )}
          </div>
          {/* Content */}
          <div className="pb-4 min-w-0">
            <p className={`text-sm font-medium ${step.color}`}>{step.label}</p>
            {step.date && (
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                {formatDate(step.date)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface IntroRequestDetailSheetProps {
  request: IntroRequest | null;
  open: boolean;
  onClose: () => void;
  onAccept: (request: IntroRequest) => void;
  onDecline: (request: IntroRequest) => void;
  onMaybe: (request: IntroRequest) => void;
  isResponding: boolean;
}

export function IntroRequestDetailSheet({
  request,
  open,
  onClose,
  onAccept,
  onDecline,
  onMaybe,
  isResponding,
}: IntroRequestDetailSheetProps) {
  if (!request) return null;

  const actionable = canRespond(request);
  const status = request.candidateResponse ?? request.status;
  const wm = request.workMode ? workModeLabels[request.workMode] : null;
  const WmIcon = wm?.icon;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="overflow-y-auto p-0 w-full sm:max-w-lg">
        {/* Header section with employer info */}
        <div className="p-6 border-b border-[var(--border)] bg-[var(--surface-1)]/50">
          <SheetHeader className="mb-0">
            <div className="flex items-center gap-4 mb-4">
              {request.employer?.logoUrl ? (
                <img
                  src={request.employer.logoUrl}
                  alt={request.employer.companyName}
                  className="w-14 h-14 rounded-xl object-cover border border-[var(--border)]"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/10 to-[var(--accent-orange)]/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-[var(--accent-orange)]">
                    {request.employer?.companyName?.charAt(0) || "?"}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <SheetTitle className="text-lg font-bold text-[var(--text-primary)]">
                  {request.employer?.companyName ?? "Unknown Company"}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {request.employer?.sector && (
                    <span className="text-xs text-[var(--neutral-gray)] bg-[var(--surface-1)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                      {request.employer.sector}
                    </span>
                  )}
                  {request.employer?.locationHq && (
                    <span className="text-xs text-[var(--neutral-gray)] flex items-center gap-1">
                      <MapPin size={10} />
                      {request.employer.locationHq}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Employer description */}
            {request.employer?.description && (
              <p className="text-sm text-[var(--neutral-gray)] leading-relaxed mb-3">
                {request.employer.description}
              </p>
            )}

            {/* Quick links */}
            <div className="flex items-center gap-3">
              {request.employer?.websiteUrl && (
                <a
                  href={request.employer.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  <Globe size={12} />
                  Visit Website
                  <ExternalLink size={10} />
                </a>
              )}
              <StatusBadge status={status} />
            </div>
          </SheetHeader>
        </div>

        {/* Role details */}
        <div className="p-6 space-y-6">
          {/* Role title + meta */}
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
              {request.roleTitle}
            </h3>
            <div className="flex flex-wrap gap-2">
              {wm && WmIcon && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs font-medium text-[var(--neutral-gray)]">
                  <WmIcon size={12} />
                  {wm.label}
                </span>
              )}
              {request.desiredStartDate && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs font-medium text-[var(--neutral-gray)]">
                  <Calendar size={12} />
                  Start:{" "}
                  {new Date(request.desiredStartDate).toLocaleDateString(
                    "en-GB",
                    { month: "short", year: "numeric" },
                  )}
                </span>
              )}
              {request.locationExpectation && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs font-medium text-[var(--neutral-gray)]">
                  <MapPin size={12} />
                  {request.locationExpectation}
                </span>
              )}
            </div>
          </div>

          {/* Full role description */}
          {request.roleDescription && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                Role Description
              </h4>
              <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border)]">
                <p className="text-sm text-[var(--neutral-gray)] leading-relaxed whitespace-pre-wrap">
                  {request.roleDescription}
                </p>
              </div>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)] mb-1">
                <Send size={11} />
                Received
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {formatDate(request.createdAt)}
              </p>
            </div>
            {request.candidateRespondedAt && (
              <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)] mb-1">
                  <User size={11} />
                  Responded
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatDate(request.candidateRespondedAt)}
                </p>
              </div>
            )}
          </div>

          {/* Response Timeline */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Timeline
            </h4>
            <ResponseTimeline request={request} />
          </div>
        </div>

        {/* Action footer */}
        {actionable && (
          <div className="sticky bottom-0 p-4 border-t border-[var(--border)] bg-[var(--surface-0)]">
            <div className="flex gap-2">
              <button
                onClick={() => onDecline(request)}
                disabled={isResponding}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--error)] hover:bg-[var(--error-light)] border border-[var(--border)] transition-colors disabled:opacity-50"
              >
                <XCircle size={14} />
                Decline
              </button>
              <button
                onClick={() => onMaybe(request)}
                disabled={isResponding}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors disabled:opacity-50"
              >
                <HelpCircle size={14} />
                Maybe
              </button>
              <button
                onClick={() => onAccept(request)}
                disabled={isResponding}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--success)] text-white hover:bg-[var(--success-dark)] shadow-sm transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Accept
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
