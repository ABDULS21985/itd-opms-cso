"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Calendar,
  Wifi,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { AnimatedCard } from "@/components/shared/animated-card";
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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

function canRespond(request: IntroRequest): boolean {
  return (
    (request.candidateResponse === null ||
      request.candidateResponse === CandidateIntroResponse.PENDING) &&
    request.status === "approved"
  );
}

function resolveStatus(request: IntroRequest): string {
  return request.candidateResponse ?? request.status;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface IntroRequestCardProps {
  request: IntroRequest;
  index: number;
  onAccept: (request: IntroRequest) => void;
  onDecline: (request: IntroRequest) => void;
  onMaybe: (request: IntroRequest) => void;
  onClick: (request: IntroRequest) => void;
  isResponding: boolean;
}

export function IntroRequestCard({
  request,
  index,
  onAccept,
  onDecline,
  onMaybe,
  onClick,
  isResponding,
}: IntroRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const actionable = canRespond(request);
  const status = resolveStatus(request);
  const isNewRequest = isNew(request.createdAt);
  const wm = request.workMode ? workModeLabels[request.workMode] : null;

  return (
    <AnimatedCard
      index={index}
      accentColor={actionable ? "var(--accent-orange)" : undefined}
      className={`overflow-hidden cursor-pointer ${
        actionable ? "bg-[var(--warning-light)]/30" : ""
      }`}
      onClick={() => onClick(request)}
    >
      {/* Gradient accent bar for actionable items */}
      {actionable && (
        <div className="h-1 bg-gradient-to-r from-[var(--accent-orange)] to-[#E08A13]" />
      )}

      <div className="p-5">
        {/* Header: logo + company info + badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {request.employer?.logoUrl ? (
              <img
                src={request.employer.logoUrl}
                alt={request.employer.companyName}
                className="w-11 h-11 rounded-xl object-cover border border-[var(--border)] flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/10 to-[var(--accent-orange)]/25 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--accent-orange)]">
                  {request.employer?.companyName?.charAt(0) || "?"}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {request.employer?.companyName ?? "Unknown Company"}
                </p>
                {isNewRequest && actionable && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                    <Sparkles size={9} />
                    New
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {request.employer?.sector && (
                  <span className="text-xs text-[var(--neutral-gray)] bg-[var(--surface-1)] px-1.5 py-0.5 rounded">
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
          <StatusBadge status={status} pulse={actionable} />
        </div>

        {/* Role title */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {request.roleTitle}
        </h3>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {wm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs text-[var(--neutral-gray)]">
              <wm.icon size={11} />
              {wm.label}
            </span>
          )}
          {request.desiredStartDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs text-[var(--neutral-gray)]">
              <Calendar size={11} />
              Start:{" "}
              {new Date(request.desiredStartDate).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {request.locationExpectation && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs text-[var(--neutral-gray)]">
              <MapPin size={11} />
              {request.locationExpectation}
            </span>
          )}
        </div>

        {/* Role description — expandable */}
        {request.roleDescription && (
          <div className="mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors mb-1.5"
            >
              <MessageSquare size={12} />
              Role details
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="expanded"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-sm text-[var(--neutral-gray)] leading-relaxed whitespace-pre-wrap">
                      {request.roleDescription}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <p className="text-sm text-[var(--neutral-gray)] line-clamp-2 leading-relaxed">
                  {request.roleDescription}
                </p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Footer: timestamp + website + actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--neutral-gray)] flex items-center gap-1">
              <Clock size={10} />
              {relativeTime(request.createdAt)}
            </span>
            {request.employer?.websiteUrl && (
              <a
                href={request.employer.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-[var(--neutral-gray)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors"
              >
                <ExternalLink size={10} /> Website
              </a>
            )}
          </div>

          {actionable && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onDecline(request)}
                disabled={isResponding}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--error)] hover:bg-[var(--error-light)] transition-colors disabled:opacity-50"
              >
                <XCircle size={13} className="inline mr-1" />
                Decline
              </button>
              <button
                onClick={() => onMaybe(request)}
                disabled={isResponding}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors disabled:opacity-50"
              >
                <HelpCircle size={13} className="inline mr-1" />
                Maybe
              </button>
              <button
                onClick={() => onAccept(request)}
                disabled={isResponding}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--success)] text-white hover:bg-[var(--success-dark)] shadow-sm transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={13} className="inline mr-1" />
                Accept
              </button>
            </div>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}
