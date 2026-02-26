"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Sparkles,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
  Inbox,
  Filter,
  PartyPopper,
} from "lucide-react";
import {
  useCandidateIntroRequests,
  useRespondToIntro,
} from "@/hooks/use-intro-requests";
import { CandidateIntroResponse } from "@/types/intro-request";
import type { IntroRequest } from "@/types/intro-request";
import { toast } from "sonner";

import { AnimatedCardGrid } from "@/components/shared/animated-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBar } from "@/components/shared/search-bar";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { IntroRequestCard } from "@/components/dashboard/intro-requests/intro-request-card";
import { IntroRequestDetailSheet } from "@/components/dashboard/intro-requests/intro-request-detail-sheet";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const filterTabs = [
  { key: "all", label: "All", icon: Mail },
  { key: "approved", label: "Needs Response", icon: Sparkles },
  { key: "pending", label: "Pending", icon: AlertCircle },
  { key: "accepted", label: "Accepted", icon: CheckCircle2 },
  { key: "declined", label: "Declined", icon: XCircle },
] as const;

const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/*  Stats Header                                                        */
/* ------------------------------------------------------------------ */

function StatsHeader({
  requests,
  total,
}: {
  requests: IntroRequest[];
  total: number;
}) {
  const needsResponse = requests.filter(
    (r) =>
      (r.candidateResponse === null ||
        r.candidateResponse === CandidateIntroResponse.PENDING) &&
      r.status === "approved",
  ).length;

  const acceptedCount = requests.filter(
    (r) => r.candidateResponse === CandidateIntroResponse.ACCEPTED,
  ).length;

  const respondedCount = requests.filter(
    (r) =>
      r.candidateResponse === CandidateIntroResponse.ACCEPTED ||
      r.candidateResponse === CandidateIntroResponse.DECLINED,
  ).length;

  const responseRate =
    total > 0 ? Math.round((respondedCount / total) * 100) : 0;

  const stats = [
    {
      label: "Total Requests",
      value: total,
      icon: Mail,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--primary)]/5",
      iconBg: "bg-[var(--primary)]/10",
    },
    {
      label: "Needs Response",
      value: needsResponse,
      icon: Sparkles,
      color: "text-[var(--accent-orange)]",
      bg:
        needsResponse > 0
          ? "bg-[var(--accent-orange)]/5"
          : "bg-[var(--surface-1)]",
      iconBg: "bg-[var(--accent-orange)]/10",
      pulse: needsResponse > 0,
    },
    {
      label: "Accepted",
      value: acceptedCount,
      icon: CheckCircle2,
      color: "text-[var(--success-dark)]",
      bg: "bg-[var(--success-light)]/50",
      iconBg: "bg-[var(--success-light)]",
    },
    {
      label: "Response Rate",
      value: `${responseRate}%`,
      icon: TrendingUp,
      color: "text-[var(--info)]",
      bg: "bg-[var(--info)]/5",
      iconBg: "bg-[var(--info)]/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`relative rounded-xl border border-[var(--border)] p-4 ${stat.bg} backdrop-blur-sm overflow-hidden`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon size={16} className={stat.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[var(--neutral-gray)] truncate">
                  {stat.label}
                </p>
                <p className={`text-xl font-bold tabular-nums ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
            {"pulse" in stat && stat.pulse && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--accent-orange)] animate-pulse" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                    */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-[var(--surface-2)] rounded-lg animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 bg-[var(--surface-2)] rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-9 w-28 bg-[var(--surface-2)] rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-52 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function IntroRequestsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Sheet state
  const [selectedRequest, setSelectedRequest] = useState<IntroRequest | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    request: IntroRequest;
    type: "accept" | "decline" | "maybe";
  } | null>(null);

  const { data, isLoading, isError, refetch } = useCandidateIntroRequests({
    status: filter !== "all" ? filter : undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const respondMutation = useRespondToIntro();

  const requests = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  const needsResponseCount = requests.filter(
    (r) =>
      (r.candidateResponse === null ||
        r.candidateResponse === CandidateIntroResponse.PENDING) &&
      r.status === "approved",
  ).length;

  const allResponded =
    filter === "all" &&
    !search &&
    requests.length > 0 &&
    needsResponseCount === 0;

  /* ── Actions ── */

  const handleOpenConfirm = (
    request: IntroRequest,
    type: "accept" | "decline" | "maybe",
  ) => {
    setConfirmAction({ request, type });
  };

  const handleConfirmResponse = () => {
    if (!confirmAction) return;

    const { request, type } = confirmAction;

    if (type === "maybe") {
      toast.info("You can respond to this request later.");
      setConfirmAction(null);
      return;
    }

    const response =
      type === "accept"
        ? CandidateIntroResponse.ACCEPTED
        : CandidateIntroResponse.DECLINED;

    respondMutation.mutate(
      { introRequestId: request.id, response },
      {
        onSuccess: () => {
          toast.success(
            type === "accept"
              ? "Intro request accepted! The employer will be notified."
              : "Intro request declined.",
          );
          setConfirmAction(null);
          setSheetOpen(false);
          setSelectedRequest(null);
        },
        onError: () => {
          toast.error("Failed to respond. Please try again.");
        },
      },
    );
  };

  const handleCardClick = (request: IntroRequest) => {
    setSelectedRequest(request);
    setSheetOpen(true);
  };

  const handleFilterChange = (key: string) => {
    setFilter(key);
    setPage(1);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  /* ── Confirm dialog config ── */

  const confirmConfig = confirmAction
    ? {
        accept: {
          title: "Accept Intro Request",
          message: `Accept the introduction from ${confirmAction.request.employer?.companyName || "this employer"} for the "${confirmAction.request.roleTitle}" role? They will be notified and may reach out to schedule next steps.`,
          confirmLabel: "Accept",
          variant: "default" as const,
        },
        decline: {
          title: "Decline Intro Request",
          message: `Decline the introduction from ${confirmAction.request.employer?.companyName || "this employer"}? This cannot be undone.`,
          confirmLabel: "Decline",
          variant: "danger" as const,
        },
        maybe: {
          title: "Skip For Now",
          message: `Not ready to respond to ${confirmAction.request.employer?.companyName || "this employer"} yet? You can come back and respond later.`,
          confirmLabel: "Skip For Now",
          variant: "default" as const,
        },
      }[confirmAction.type]
    : null;

  /* ── Loading ── */
  if (isLoading) return <LoadingSkeleton />;

  /* ── Error ── */
  if (isError) {
    return (
      <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-16 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[var(--error-light)] flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-[var(--error)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Failed to load intro requests
        </h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">
          Something went wrong. Please check your connection and try again.
        </p>
        <button
          onClick={() => refetch()}
          className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 shadow-md transition-all duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/10 to-[var(--accent-orange)]/20 flex items-center justify-center">
            <Mail size={18} className="text-[var(--accent-orange)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Intro Requests
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Employers who want to connect with you
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Header ── */}
      <StatsHeader requests={requests} total={total} />

      {/* ── "All caught up" banner ── */}
      <AnimatePresence>
        {allResponded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--success-light)] border border-[var(--success)]/20">
              <PartyPopper
                size={20}
                className="text-[var(--success-dark)] flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--success-dark)]">
                  All caught up!
                </p>
                <p className="text-xs text-[var(--success)]">
                  You&apos;ve responded to all intro requests. Nice work!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters + Search ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Filter pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] w-fit flex-shrink-0 overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            const isUrgent = tab.key === "approved" && needsResponseCount > 0;
            return (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? isUrgent
                      ? "bg-gradient-to-r from-[var(--accent-orange)] to-[#E08A13] text-white shadow-sm"
                      : "bg-[var(--surface-0)] text-[var(--primary)] shadow-sm"
                    : isUrgent
                      ? "text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/5"
                      : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
                {tab.key === "approved" &&
                  needsResponseCount > 0 &&
                  !isActive && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-orange)] text-white text-[9px] font-bold flex items-center justify-center">
                      {needsResponseCount}
                    </span>
                  )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search by company or role..."
          onSearch={handleSearch}
          className="sm:max-w-xs flex-1"
        />
      </motion.div>

      {/* ── Cards ── */}
      <AnimatePresence mode="wait">
        {requests.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] shadow-sm">
              {filter === "all" && !search ? (
                <EmptyState
                  icon={Inbox}
                  title="No intro requests yet"
                  description="Complete your profile to attract employers. When they're interested, their intro requests will appear here."
                />
              ) : (
                <EmptyState
                  icon={Filter}
                  title={
                    search
                      ? `No results for "${search}"`
                      : `No ${filterTabs.find((t) => t.key === filter)?.label.toLowerCase()} requests`
                  }
                  description="Try a different filter or search term."
                  action={
                    <button
                      onClick={() => {
                        setFilter("all");
                        setSearch("");
                      }}
                      className="px-4 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary)]/5 rounded-xl hover:bg-[var(--primary)]/10 transition-colors"
                    >
                      Clear filters
                    </button>
                  }
                />
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`cards-${filter}-${page}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AnimatedCardGrid className="space-y-4">
              {requests.map((request, index) => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  index={index}
                  onAccept={(r) => handleOpenConfirm(r, "accept")}
                  onDecline={(r) => handleOpenConfirm(r, "decline")}
                  onMaybe={(r) => handleOpenConfirm(r, "maybe")}
                  onClick={handleCardClick}
                  isResponding={respondMutation.isPending}
                />
              ))}
            </AnimatedCardGrid>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* ── Detail Sheet ── */}
      <IntroRequestDetailSheet
        request={selectedRequest}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSelectedRequest(null);
        }}
        onAccept={(r) => handleOpenConfirm(r, "accept")}
        onDecline={(r) => handleOpenConfirm(r, "decline")}
        onMaybe={(r) => handleOpenConfirm(r, "maybe")}
        isResponding={respondMutation.isPending}
      />

      {/* ── Confirm Dialog ── */}
      {confirmConfig && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmResponse}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel={confirmConfig.confirmLabel}
          variant={confirmConfig.variant}
          loading={respondMutation.isPending}
        />
      )}
    </div>
  );
}
