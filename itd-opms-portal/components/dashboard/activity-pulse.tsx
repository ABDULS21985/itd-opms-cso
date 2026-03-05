"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Inbox } from "lucide-react";
import {
  useRecentActivity,
  type ActivityFeedItem,
} from "@/hooks/use-reporting";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ActivityPulseProps {
  maxItems?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Severity color mapping                                             */
/* ------------------------------------------------------------------ */

const SEVERITY_RED = "#EF4444";
const SEVERITY_AMBER = "#F59E0B";
const SEVERITY_GREEN = "#22C55E";

type SeverityColor = typeof SEVERITY_RED | typeof SEVERITY_AMBER | typeof SEVERITY_GREEN;

const SEVERITY_MAP: Record<ActivityFeedItem["type"], SeverityColor> = {
  "sla.breached":           SEVERITY_RED,
  "ticket.escalated":       SEVERITY_RED,
  "risk.identified":        SEVERITY_RED,
  "policy.expired":         SEVERITY_RED,
  "ticket.created":         SEVERITY_AMBER,
  "project.status_changed": SEVERITY_AMBER,
  "asset.decommissioned":   SEVERITY_AMBER,
  "ticket.resolved":        SEVERITY_GREEN,
  "risk.mitigated":         SEVERITY_GREEN,
  "asset.deployed":         SEVERITY_GREEN,
  "policy.approved":        SEVERITY_GREEN,
};

function getSeverityColor(type: ActivityFeedItem["type"]): SeverityColor {
  return SEVERITY_MAP[type] ?? SEVERITY_AMBER;
}

function isRedSeverity(type: ActivityFeedItem["type"]): boolean {
  return getSeverityColor(type) === SEVERITY_RED;
}

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Actor avatar                                                       */
/* ------------------------------------------------------------------ */

function ActorAvatar({
  actor,
}: {
  actor: ActivityFeedItem["actor"];
}) {
  const initials = actor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Deterministic hue from actor id
  let hash = 0;
  for (let i = 0; i < actor.id.length; i++) {
    hash = actor.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;

  if (actor.avatar) {
    return (
      <img
        src={actor.avatar}
        alt={actor.name}
        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-white select-none"
      style={{ backgroundColor: `hsl(${hue}, 55%, 50%)` }}
      title={actor.name}
    >
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Description renderer — makes entity.label a bold link              */
/* ------------------------------------------------------------------ */

function EventDescription({
  description,
  entity,
}: {
  description: string;
  entity: ActivityFeedItem["entity"];
}) {
  // If the entity label appears in the description, wrap it in a link.
  // Otherwise, append it after the description.
  const idx = description.indexOf(entity.label);

  if (idx !== -1) {
    const before = description.slice(0, idx);
    const after = description.slice(idx + entity.label.length);
    return (
      <span className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {before}
        <Link
          href={entity.href}
          className="font-semibold hover:underline"
          style={{ color: "var(--text-primary)" }}
        >
          {entity.label}
        </Link>
        {after}
      </span>
    );
  }

  return (
    <span className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
      {description}{" "}
      <Link
        href={entity.href}
        className="font-semibold hover:underline"
        style={{ color: "var(--text-primary)" }}
      >
        {entity.label}
      </Link>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline dot                                                       */
/* ------------------------------------------------------------------ */

function TimelineDot({ type }: { type: ActivityFeedItem["type"] }) {
  const color = getSeverityColor(type);
  const isRed = isRedSeverity(type);

  return (
    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 12, height: 12 }}>
      {/* Glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
      {/* Dot */}
      <div
        className={isRed ? "bento-pulse-glow rounded-full" : "rounded-full"}
        style={{
          width: 12,
          height: 12,
          backgroundColor: color,
          ["--pulse-color" as string]: `${color}4D`,
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single timeline event                                              */
/* ------------------------------------------------------------------ */

function TimelineEvent({ item }: { item: ActivityFeedItem }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="overflow-hidden"
    >
      <div className="flex items-start gap-3 py-3 px-4 relative">
        {/* Dot aligned to the timeline line */}
        <div className="flex items-center gap-2.5 flex-shrink-0 mt-1">
          <TimelineDot type={item.type} />
          <ActorAvatar actor={item.actor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <EventDescription
            description={item.description}
            entity={item.entity}
          />
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {formatRelativeTime(item.timestamp)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loading state                                             */
/* ------------------------------------------------------------------ */

function SkeletonItem({ index }: { index: number }) {
  return (
    <div
      className="flex items-start gap-3 py-3 px-4"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Dot skeleton */}
      <div className="flex items-center gap-2.5 flex-shrink-0 mt-1">
        <div
          className="w-3 h-3 rounded-full skeleton-shimmer"
          style={{ backgroundColor: "var(--border)" }}
        />
        <div
          className="w-5 h-5 rounded-full skeleton-shimmer"
          style={{ backgroundColor: "var(--border)" }}
        />
      </div>

      {/* Text skeletons */}
      <div className="flex-1 min-w-0 space-y-2">
        <div
          className="h-3.5 rounded skeleton-shimmer"
          style={{
            backgroundColor: "var(--border)",
            width: `${65 + (index % 3) * 10}%`,
          }}
        />
        <div
          className="h-2.5 rounded skeleton-shimmer"
          style={{
            backgroundColor: "var(--border)",
            width: "30%",
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <Inbox
        size={28}
        className="opacity-30"
        style={{ color: "var(--text-muted)" }}
      />
      <p
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        No recent activity
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pulsing live dot for header                                        */
/* ------------------------------------------------------------------ */

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{
          backgroundColor: "#22C55E",
          animation: "live-dot-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: "#22C55E" }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ActivityPulse({
  maxItems = 15,
  className = "",
}: ActivityPulseProps) {
  const { data, isLoading } = useRecentActivity(1, maxItems);

  const items: ActivityFeedItem[] = useMemo(
    () => (data as any)?.data ?? [],
    [data],
  );
  const total: number = (data as any)?.total ?? 0;

  return (
    <>
      {/* Scoped keyframes for the live-dot ping */}
      <style jsx>{`
        @keyframes live-dot-ping {
          0% {
            transform: scale(1);
            opacity: 0.75;
          }
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>

      <div
        className={`rounded-2xl border flex flex-col ${className}`}
        style={{
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255, 255, 255, 0.18)",
        }}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <Activity size={16} style={{ color: "var(--text-secondary)" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Live Activity
            </h3>
            <LiveDot />
          </div>

          {!isLoading && total > 0 && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                color: "var(--text-muted)",
                backgroundColor: "var(--surface-0)",
              }}
            >
              {total} event{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ---- Scrollable content ---- */}
        <div
          className="overflow-y-auto relative"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          {/* Vertical timeline line */}
          {!isLoading && items.length > 0 && (
            <div
              className="absolute top-3 bottom-3"
              style={{
                left: 21, // centers on the 12px dot at px-4 (16px) + half of 12px
                width: 1,
                backgroundColor: "var(--border)",
              }}
            />
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonItem key={i} index={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && items.length === 0 && <EmptyState />}

          {/* Event list */}
          {!isLoading && items.length > 0 && (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <TimelineEvent key={item.id} item={item} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}
