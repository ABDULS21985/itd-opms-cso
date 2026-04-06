"use client";

import {
  useDeferredValue,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  ListChecks,
  Plus,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  useAccessReviewCampaigns,
  useAccessReviewEntries,
  useRecordAccessReviewDecision,
} from "@/hooks/use-grc";
import type { AccessReviewCampaign, AccessReviewEntry } from "@/types";

const CAMPAIGN_STATUS_META: Record<
  string,
  {
    label: string;
    description: string;
    accent: string;
    icon: ElementType;
  }
> = {
  planned: {
    label: "Planned",
    description: "Campaigns staged for the next certification cycle.",
    accent: "#7C3AED",
    icon: CalendarClock,
  },
  active: {
    label: "Active",
    description: "Live entitlement reviews with pending decisions in play.",
    accent: "#2563EB",
    icon: Eye,
  },
  review: {
    label: "Under review",
    description: "Campaigns in analyst or governance validation.",
    accent: "#D97706",
    icon: ShieldAlert,
  },
  completed: {
    label: "Completed",
    description:
      "Campaigns closed with their certification decisions captured.",
    accent: "#16A34A",
    icon: ShieldCheck,
  },
};

const FILTER_LANES = [
  {
    value: "",
    label: "Program view",
    description: "Watch the full access-certification board at once.",
    accent: "#0F766E",
    icon: ScanSearch,
  },
  {
    value: "planned",
    ...CAMPAIGN_STATUS_META.planned,
  },
  {
    value: "active",
    ...CAMPAIGN_STATUS_META.active,
  },
  {
    value: "review",
    ...CAMPAIGN_STATUS_META.review,
  },
  {
    value: "completed",
    ...CAMPAIGN_STATUS_META.completed,
  },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All campaigns" },
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "review", label: "Under review" },
  { value: "completed", label: "Completed" },
];

const DECISION_META: Record<
  string,
  {
    label: string;
    accent: string;
    icon: ElementType;
  }
> = {
  pending: {
    label: "Pending",
    accent: "#64748B",
    icon: Clock3,
  },
  approved: {
    label: "Approved",
    accent: "#16A34A",
    icon: CheckCircle2,
  },
  revoked: {
    label: "Revoked",
    accent: "#DC2626",
    icon: XCircle,
  },
  exception: {
    label: "Exception",
    accent: "#D97706",
    icon: ShieldAlert,
  },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "No date";

  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shortId(value?: string): string {
  if (!value) return "Not assigned";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getCompletionColor(rate: number): string {
  if (rate >= 85) return "#16A34A";
  if (rate >= 60) return "#2563EB";
  if (rate >= 35) return "#D97706";
  return "#DC2626";
}

function getStatusMeta(status: string) {
  return (
    CAMPAIGN_STATUS_META[status] ?? {
      label: status || "Program view",
      description:
        "Campaign status is available, but not yet mapped to a richer view.",
      accent: "#64748B",
      icon: Eye,
    }
  );
}

function getDecisionMeta(decision?: string) {
  return DECISION_META[decision || "pending"] ?? DECISION_META.pending;
}

function isDueSoon(dateStr?: string) {
  if (!dateStr) return false;

  const dueAt = new Date(dateStr).getTime();
  const now = Date.now();
  const daysUntilDue = (dueAt - now) / (1000 * 60 * 60 * 24);

  return daysUntilDue >= 0 && daysUntilDue <= 10;
}

function LoadingValue({ width = "w-16" }: { width?: string }) {
  return (
    <span
      className={`inline-flex h-8 animate-pulse rounded-xl bg-[var(--surface-2)] ${width}`}
    />
  );
}

function MetricCard({
  label,
  value,
  helper,
  accent,
  loading,
}: {
  label: string;
  value: ReactNode;
  helper: string;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/78 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      {loading ? (
        <div className="mt-3">
          <LoadingValue />
        </div>
      ) : (
        <p className="mt-3 text-2xl font-bold" style={{ color: accent }}>
          {value}
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function FocusLaneCard({
  title,
  description,
  count,
  active,
  accent,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  count: number;
  active: boolean;
  accent: string;
  icon: ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group rounded-[26px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderColor: active ? `${accent}52` : "var(--border)",
        backgroundImage: active
          ? `radial-gradient(circle at top right, ${accent}18, transparent 36%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`
          : "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          <Icon size={18} />
        </span>
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: active ? accent : "var(--text-primary)" }}
        >
          {count}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
        {description}
      </p>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `${meta.accent}14`,
        color: meta.accent,
      }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function DecisionPill({ decision }: { decision?: string }) {
  const meta = getDecisionMeta(decision);
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `${meta.accent}14`,
        color: meta.accent,
      }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function EntryMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function CampaignEntries({ campaignId }: { campaignId: string }) {
  const { data: entries, isLoading } = useAccessReviewEntries(campaignId);
  const recordDecision = useRecordAccessReviewDecision(campaignId);

  if (isLoading) {
    return (
      <div className="border-t border-[var(--border)] p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-[22px] bg-[var(--surface-1)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const entryList = entries ?? [];
  const pendingCount = entryList.filter((entry) => !entry.decision).length;
  const approvedCount = entryList.filter(
    (entry) => entry.decision === "approved",
  ).length;
  const revokedCount = entryList.filter(
    (entry) => entry.decision === "revoked",
  ).length;
  const exceptionCount = entryList.filter(
    (entry) => entry.decision === "exception",
  ).length;

  if (entryList.length === 0) {
    return (
      <div className="border-t border-[var(--border)] p-8 text-center">
        <ListChecks
          size={24}
          className="mx-auto text-[var(--text-secondary)]"
        />
        <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
          No entries loaded for this campaign
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          This review campaign exists, but it does not yet have any access
          records waiting for a certification decision.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-1)]/35 p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Pending"
          value={pendingCount}
          helper="Entries still awaiting a reviewer decision."
          accent="#64748B"
        />
        <MetricCard
          label="Approved"
          value={approvedCount}
          helper="Entries retained as currently provisioned."
          accent="#16A34A"
        />
        <MetricCard
          label="Revoked"
          value={revokedCount}
          helper="Entries already marked for access removal."
          accent="#DC2626"
        />
        <MetricCard
          label="Exception"
          value={exceptionCount}
          helper="Entries granted temporary or policy exceptions."
          accent="#D97706"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Decision queue
          </p>
          <h4 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            Review ledger
          </h4>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Work the queue directly from this campaign surface.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {entryList.map((entry: AccessReviewEntry) => (
          <div
            key={entry.id}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  User footprint
                </p>
                <h5 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {shortId(entry.userId)}
                </h5>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Evaluate whether this access should remain in place, be
                  revoked, or be escalated as an exception.
                </p>
              </div>
              <DecisionPill decision={entry.decision} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <EntryMeta label="Role footprint" value={shortId(entry.roleId)} />
              <EntryMeta
                label="Assigned reviewer"
                value={shortId(entry.reviewerId)}
              />
              <EntryMeta label="Created" value={formatDate(entry.createdAt)} />
              <EntryMeta
                label="Decided"
                value={
                  entry.decidedAt ? formatDate(entry.decidedAt) : "Pending"
                }
              />
            </div>

            {entry.justification && (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Justification
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {entry.justification}
                </p>
              </div>
            )}

            {!entry.decision && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={`Approve ${entry.userId}`}
                  onClick={() =>
                    recordDecision.mutate({
                      entryId: entry.id,
                      decision: "approved",
                    })
                  }
                  disabled={recordDecision.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#16A34A" }}
                >
                  <CheckCircle2 size={15} />
                  Approve access
                </button>
                <button
                  type="button"
                  aria-label={`Revoke ${entry.userId}`}
                  onClick={() =>
                    recordDecision.mutate({
                      entryId: entry.id,
                      decision: "revoked",
                    })
                  }
                  disabled={recordDecision.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[rgba(220,38,38,0.08)] disabled:opacity-50"
                  style={{
                    borderColor: "rgba(220,38,38,0.24)",
                    color: "#DC2626",
                  }}
                >
                  <XCircle size={15} />
                  Revoke access
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  expanded,
  onToggle,
}: {
  campaign: AccessReviewCampaign;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusMeta = getStatusMeta(campaign.status);
  const completionColor = getCompletionColor(campaign.completionRate);
  const dueSoon =
    isDueSoon(campaign.dueDate) && campaign.status !== "completed";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[30px] border shadow-sm"
      style={{
        borderColor: `${statusMeta.accent}24`,
        backgroundImage: `radial-gradient(circle at top right, ${statusMeta.accent}14, transparent 34%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)`,
      }}
    >
      <div className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={campaign.status} />
              {dueSoon && (
                <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(217,119,6,0.12)] px-3 py-1 text-xs font-semibold text-[#B45309]">
                  <Clock3 size={12} />
                  Due soon
                </span>
              )}
            </div>

            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {campaign.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] lg:text-base">
              {campaign.scope ||
                "This campaign is open without a published scope note yet."}
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)]/80 p-5 xl:min-w-[220px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Completion
            </p>
            <p
              className="mt-3 text-4xl font-bold tabular-nums"
              style={{ color: completionColor }}
            >
              {Math.round(campaign.completionRate)}%
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {statusMeta.description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <EntryMeta
            label="Reviewers"
            value={`${campaign.reviewerIds.length} engaged`}
          />
          <EntryMeta
            label="Due date"
            value={campaign.dueDate ? formatDate(campaign.dueDate) : "Not set"}
          />
          <EntryMeta label="Created" value={formatDate(campaign.createdAt)} />
          <EntryMeta label="Cadence" value={statusMeta.label} />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Completion runway
            </p>
            <span className="text-sm text-[var(--text-secondary)]">
              {Math.round(campaign.completionRate)}% certified
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(campaign.completionRate, 100)}%`,
                backgroundColor: completionColor,
              }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            Expand this campaign to review its access entries and record
            decisions directly from the ledger.
          </p>

          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Open"} review ledger for ${campaign.title}`}
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: statusMeta.accent }}
          >
            {expanded ? "Hide review ledger" : "Open review ledger"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CampaignEntries campaignId={campaign.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function AccessReviewsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const { data, isLoading } = useAccessReviewCampaigns(
    page,
    20,
    status || undefined,
  );

  const campaigns = data?.data ?? [];
  const meta = data?.meta;

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (!deferredQuery) return true;

    const searchableText =
      `${campaign.title} ${campaign.scope ?? ""} ${campaign.status}`.toLowerCase();
    return searchableText.includes(deferredQuery);
  });

  const activeFilter = FILTER_LANES.find((lane) => lane.value === status) || {
    value: "",
    label: "Program view",
    description: "Watch the full access-certification board at once.",
    accent: "#0F766E",
    icon: ScanSearch,
  };

  const visibleCampaigns = filteredCampaigns.length;
  const inFlightCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active" || campaign.status === "review",
  ).length;
  const uniqueReviewers = new Set(
    campaigns.flatMap((campaign) => campaign.reviewerIds),
  ).size;
  const averageCompletion = campaigns.length
    ? Math.round(
        campaigns.reduce((sum, campaign) => sum + campaign.completionRate, 0) /
          campaigns.length,
      )
    : 0;
  const dueSoonCampaigns = campaigns
    .filter(
      (campaign) =>
        campaign.status !== "completed" && isDueSoon(campaign.dueDate),
    )
    .sort((left, right) => {
      if (!left.dueDate || !right.dueDate) return 0;
      return (
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
      );
    })
    .slice(0, 3);
  const strongestCampaign = [...campaigns].sort(
    (left, right) => right.completionRate - left.completionRate,
  )[0];
  const trailingCampaign = [...campaigns].sort(
    (left, right) => left.completionRate - right.completionRate,
  )[0];

  const laneCounts = {
    all: campaigns.length,
    planned: campaigns.filter((campaign) => campaign.status === "planned")
      .length,
    active: campaigns.filter((campaign) => campaign.status === "active").length,
    review: campaigns.filter((campaign) => campaign.status === "review").length,
    completed: campaigns.filter((campaign) => campaign.status === "completed")
      .length,
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-[32px] border shadow-sm"
        style={{
          borderColor: "rgba(15, 118, 110, 0.16)",
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(15,118,110,0.16), transparent 28%), radial-gradient(circle at 100% 0%, rgba(37,99,235,0.12), transparent 26%), linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
        }}
      >
        <div className="grid gap-6 p-6 lg:p-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              <ShieldCheck size={14} />
              Certification control
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--text-primary)] lg:text-5xl">
              Access Reviews
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--text-secondary)] lg:text-base">
              Entitlement certification, reviewer throughput, and decision
              pressure across live access campaigns.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: "rgba(255,255,255,0.6)",
                  backgroundColor: "rgba(255,255,255,0.74)",
                  backdropFilter: "blur(18px)",
                }}
              >
                <Filter size={16} />
                Review filters
              </button>

              <button
                type="button"
                aria-label="Launch access review campaign"
                onClick={() =>
                  router.push("/dashboard/grc/access-reviews?action=new")
                }
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#0F766E" }}
              >
                <Plus size={16} />
                Launch campaign
              </button>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Visible board"
                value={visibleCampaigns}
                helper="Campaigns visible after the current lens is applied."
                accent="#0F766E"
                loading={isLoading}
              />
              <MetricCard
                label="In flight"
                value={inFlightCampaigns}
                helper="Campaigns actively collecting or validating decisions."
                accent="#2563EB"
                loading={isLoading}
              />
              <MetricCard
                label="Reviewers"
                value={uniqueReviewers}
                helper="Distinct reviewer identities represented on this page."
                accent="#7C3AED"
                loading={isLoading}
              />
              <MetricCard
                label="Avg completion"
                value={`${averageCompletion}%`}
                helper="Average certification completion across visible campaigns."
                accent="#D97706"
                loading={isLoading}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)]/82 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Review pulse
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {activeFilter.label}
                </h2>
              </div>
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: `${activeFilter.accent}14`,
                  color: activeFilter.accent,
                }}
              >
                <activeFilter.icon size={20} />
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {activeFilter.description} Use the board to concentrate reviewer
              attention where certification pressure is building.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Due pressure
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {isLoading ? (
                    <LoadingValue width="w-12" />
                  ) : (
                    dueSoonCampaigns.length
                  )}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Campaigns due within the next ten days and still open.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Board note
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {status
                    ? `${activeFilter.label} campaigns are currently isolated for closer review.`
                    : "All access-review lanes are visible. Use the lane cards below to narrow the board."}
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Search lens
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {deferredQuery
                    ? `Filtering this page by "${query}".`
                    : "Search is open for local campaign title, scope, and status matching."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="space-y-4"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Certification lanes
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Focus the review program
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            These lane cards switch the board between planned, active, review,
            and completed certification cycles.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {FILTER_LANES.map((lane) => (
            <FocusLaneCard
              key={lane.value || "all"}
              title={lane.label}
              description={lane.description}
              count={
                lane.value === ""
                  ? laneCounts.all
                  : laneCounts[lane.value as keyof typeof laneCounts]
              }
              active={status === lane.value}
              accent={lane.accent}
              icon={lane.icon}
              onClick={() => {
                setStatus(lane.value);
                setPage(1);
                setExpandedId(null);
              }}
            />
          ))}
        </div>
      </motion.section>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)]"
          >
            <div className="grid gap-4 p-5 lg:grid-cols-[1fr_260px_auto] lg:items-end">
              <div>
                <label
                  htmlFor="campaign-search"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                >
                  Campaign search
                </label>
                <input
                  id="campaign-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by title, scope, or status"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="campaign-status"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                >
                  Campaign status
                </label>
                <select
                  id="campaign-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                    setExpandedId(null);
                  }}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setPage(1);
                  setQuery("");
                  setExpandedId(null);
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                Clear lens
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Live certification board
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Review campaign ledger
                </h2>
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {deferredQuery
                  ? `${filteredCampaigns.length} campaign(s) match the current search lens.`
                  : `${campaigns.length} campaign(s) are loaded on this page.`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[30px] bg-[var(--surface-1)]"
                />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
              <ShieldCheck
                size={32}
                className="mx-auto text-[var(--text-secondary)]"
              />
              <h3 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">
                No access review campaigns yet
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Start a certification cycle to review user entitlements,
                coordinate reviewers, and capture decisions in one governed
                workspace.
              </p>
              <button
                type="button"
                aria-label="Launch first access review campaign"
                onClick={() =>
                  router.push("/dashboard/grc/access-reviews?action=new")
                }
                className="mt-6 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#0F766E" }}
              >
                <Plus size={16} />
                Launch campaign
              </button>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
              <ScanSearch
                size={32}
                className="mx-auto text-[var(--text-secondary)]"
              />
              <h3 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">
                No campaigns match this lens
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Broaden the search or reset the status lens to bring more
                certification campaigns back into view.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  expanded={expandedId === campaign.id}
                  onToggle={() =>
                    setExpandedId(
                      expandedId === campaign.id ? null : campaign.id,
                    )
                  }
                />
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Showing {campaigns.length} of {meta.totalItems} campaigns
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 text-sm text-[var(--text-secondary)]">
                  {page} / {meta.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(meta.totalPages, current + 1))
                  }
                  disabled={page >= meta.totalPages}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="space-y-4"
        >
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Current board state
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Decision posture
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              This panel summarizes the current certification lens so you can
              understand due pressure, reviewer spread, and completion strength
              without opening individual campaigns first.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Active lens
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {status
                    ? `${activeFilter.label} campaigns are isolated for focused reviewer follow-through.`
                    : "All campaign statuses are visible, giving you a full certification program snapshot."}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Reviewer pressure
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {uniqueReviewers > 0
                    ? `${uniqueReviewers} reviewer(s) are represented on the current page.`
                    : "No reviewer identities are represented on the current page yet."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Upcoming due windows
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Deadline watch
            </h3>

            <div className="mt-5 space-y-3">
              {dueSoonCampaigns.length === 0 ? (
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    No open campaigns are currently due within the next ten
                    days.
                  </p>
                </div>
              ) : (
                dueSoonCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {campaign.title}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          {campaign.scope || "Scope not published yet."}
                        </p>
                      </div>
                      <StatusPill status={campaign.status} />
                    </div>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      Due {formatDate(campaign.dueDate)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Completion spread
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Strongest and trailing lanes
            </h3>

            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Strongest campaign
                </p>
                {strongestCampaign ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {strongestCampaign.title}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {Math.round(strongestCampaign.completionRate)}% complete
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    No campaign data available yet.
                  </p>
                )}
              </div>

              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)]/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Trailing campaign
                </p>
                {trailingCampaign ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {trailingCampaign.title}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {Math.round(trailingCampaign.completionRate)}% complete
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    No campaign data available yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
