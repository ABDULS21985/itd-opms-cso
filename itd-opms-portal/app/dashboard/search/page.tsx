"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Clock,
  Ticket,
  FileText,
  HardDrive,
  FolderKanban,
  Shield,
  Users,
  Calendar,
  Scale,
  Trash2,
  X,
} from "lucide-react";
import {
  useGlobalSearch,
  useRecentSearches,
  useRecordRecentSearch,
  useSavedSearches,
  useSaveSearch,
  useDeleteSavedSearch,
} from "@/hooks/use-reporting";
import type { SavedSearch, SearchEntityType } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "all", label: "All", icon: Search },
  { key: "tickets", label: "Tickets", icon: Ticket },
  { key: "articles", label: "Articles", icon: FileText },
  { key: "assets", label: "Assets", icon: HardDrive },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "policies", label: "Policies", icon: Shield },
  { key: "users", label: "Users", icon: Users },
  { key: "meetings", label: "Meetings", icon: Calendar },
  { key: "decisions", label: "Decisions", icon: Scale },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ------------------------------------------------------------------ */
/*  Debounce hook                                                       */
/* ------------------------------------------------------------------ */

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/*  Result Card Components                                              */
/* ------------------------------------------------------------------ */

function TicketResult({
  item,
}: {
  item: { id: string; ticketNumber: string; title: string; status: string; priority: string };
}) {
  return (
    <a
      href={`/dashboard/itsm/tickets/${item.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
      >
        <Ticket size={16} style={{ color: "#F59E0B" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--text-secondary)]">Ticket · {item.ticketNumber}</p>
      </div>
      <span
        className="text-xs font-medium rounded-full px-2 py-0.5 capitalize shrink-0"
        style={{ backgroundColor: "rgba(100, 116, 139, 0.1)", color: "#64748B" }}
      >
        {item.status}
      </span>
    </a>
  );
}

function ArticleResult({ item }: { item: { id: string; title: string; slug: string } }) {
  return (
    <a
      href={`/dashboard/knowledge/articles/${item.slug}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(6, 182, 212, 0.1)" }}
      >
        <FileText size={16} style={{ color: "#06B6D4" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--text-secondary)]">Article</p>
      </div>
    </a>
  );
}

function AssetResult({ item }: { item: { id: string; name: string; assetTag: string } }) {
  return (
    <a
      href={`/dashboard/cmdb/assets/${item.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
      >
        <HardDrive size={16} style={{ color: "#EF4444" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">Asset &middot; {item.assetTag}</p>
      </div>
    </a>
  );
}

function ProjectResult({ item }: { item: { id: string; name: string; status: string } }) {
  return (
    <a
      href={`/dashboard/planning/projects/${item.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
      >
        <FolderKanban size={16} style={{ color: "#8B5CF6" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">Project</p>
      </div>
      <span
        className="text-xs font-medium rounded-full px-2 py-0.5 capitalize shrink-0"
        style={{ backgroundColor: "rgba(100, 116, 139, 0.1)", color: "#64748B" }}
      >
        {item.status}
      </span>
    </a>
  );
}

function PolicyResult({ item }: { item: { id: string; title: string; status: string } }) {
  return (
    <a
      href={`/dashboard/governance/policies/${item.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
      >
        <Shield size={16} style={{ color: "#1B7340" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--text-secondary)]">Policy</p>
      </div>
      <span
        className="text-xs font-medium rounded-full px-2 py-0.5 capitalize shrink-0"
        style={{ backgroundColor: "rgba(100, 116, 139, 0.1)", color: "#64748B" }}
      >
        {item.status}
      </span>
    </a>
  );
}

function UserResult({
  item,
}: {
  item: { id: string; displayName: string; email: string; department?: string | null; jobTitle?: string | null };
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
      >
        <Users size={16} style={{ color: "#3B82F6" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.displayName}</p>
        <p className="text-xs text-[var(--text-secondary)] truncate">
          {item.email}
          {item.jobTitle ? ` · ${item.jobTitle}` : ""}
          {item.department ? ` · ${item.department}` : ""}
        </p>
      </div>
    </div>
  );
}

function MeetingResult({
  item,
}: {
  item: { id: string; title: string; status: string; scheduledAt: string };
}) {
  return (
    <a
      href={`/dashboard/governance/meetings/${item.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
      >
        <Calendar size={16} style={{ color: "#1B7340" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--text-secondary)]">
          Meeting
          {item.scheduledAt ? ` · ${new Date(item.scheduledAt).toLocaleDateString()}` : ""}
        </p>
      </div>
      <span
        className="text-xs font-medium rounded-full px-2 py-0.5 capitalize shrink-0"
        style={{ backgroundColor: "rgba(100, 116, 139, 0.1)", color: "#64748B" }}
      >
        {item.status}
      </span>
    </a>
  );
}

function DecisionResult({
  item,
}: {
  item: { id: string; meetingId: string; decisionNumber: string; title: string; status: string };
}) {
  return (
    <a
      href={`/dashboard/governance/meetings/${item.meetingId}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
      >
        <Scale size={16} style={{ color: "#8B5CF6" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--text-secondary)] truncate">
          Decision · {item.decisionNumber}
        </p>
      </div>
      <span
        className="text-xs font-medium rounded-full px-2 py-0.5 capitalize shrink-0"
        style={{ backgroundColor: "rgba(100, 116, 139, 0.1)", color: "#64748B" }}
      >
        {item.status}
      </span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                     */
/* ------------------------------------------------------------------ */

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-14 rounded-lg bg-[var(--surface-2)] animate-pulse" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent & Saved Searches Sidebar                                     */
/* ------------------------------------------------------------------ */

function SearchSidebar({
  onSelectQuery,
}: {
  onSelectQuery: (q: string) => void;
}) {
  const { data: recentSearches, isLoading: recentLoading } = useRecentSearches();
  const { data: savedSearches, isLoading: savedLoading } = useSavedSearches();
  const deleteSaved = useDeleteSavedSearch();

  const recents = useMemo(() => {
    if (!recentSearches) return [];
    if (Array.isArray(recentSearches)) return recentSearches as SavedSearch[];
    return [];
  }, [recentSearches]);

  const saved = useMemo(() => {
    if (!savedSearches) return [];
    if (Array.isArray(savedSearches)) return savedSearches as SavedSearch[];
    return [];
  }, [savedSearches]);

  return (
    <div className="space-y-6">
      {/* Saved Searches */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
          Saved Searches
        </h3>
        {savedLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded bg-[var(--surface-2)] animate-pulse" />
            ))}
          </div>
        ) : saved.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">No saved searches yet.</p>
        ) : (
          <div className="space-y-1">
            {saved.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 group"
              >
                <button
                  onClick={() => onSelectQuery(s.query)}
                  className="flex-1 text-left flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                >
                  <BookmarkCheck size={12} className="text-[var(--primary)] shrink-0" />
                  <span className="truncate">{s.query}</span>
                </button>
                <button
                  onClick={() => deleteSaved.mutate(s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-[var(--surface-2)]"
                  title="Remove saved search"
                >
                  <Trash2 size={12} className="text-[var(--text-secondary)]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Searches */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
          Recent Searches
        </h3>
        {recentLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded bg-[var(--surface-2)] animate-pulse" />
            ))}
          </div>
        ) : recents.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">No recent searches.</p>
        ) : (
          <div className="space-y-1">
            {recents.slice(0, 10).map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectQuery(s.query)}
                className="w-full text-left flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
              >
                <Clock size={12} className="text-[var(--text-secondary)] shrink-0" />
                <span className="truncate">{s.query}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(urlQuery);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const debouncedQuery = useDebounce(inputValue, 350);

  // Sync URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      if (debouncedQuery !== urlQuery) {
        params.set("q", debouncedQuery);
        router.replace(`/dashboard/search?${params.toString()}`);
      }
    } else if (urlQuery) {
      params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `/dashboard/search?${qs}` : "/dashboard/search");
    }
  }, [debouncedQuery, urlQuery, searchParams, router]);

  // Determine entity types to search based on active tab.
  // Return type is SearchEntityType[] | undefined — TypeScript will error here
  // if any non-"all" tab key falls outside the backend-defined SearchEntityType union.
  const entityTypes = useMemo((): SearchEntityType[] | undefined => {
    if (activeTab === "all") return undefined;
    return [activeTab];
  }, [activeTab]);

  const { data: results, isLoading, isFetching } = useGlobalSearch(debouncedQuery, entityTypes);
  const saveSearch = useSaveSearch();
  const recordRecent = useRecordRecentSearch();

  // Track the last query recorded to avoid duplicate recent-search entries
  // on background refetches or React strict-mode double-invocations.
  const lastRecordedRef = useRef<string>("");

  // Automatically record every settled search (≥2 chars) into recent history.
  useEffect(() => {
    if (
      results !== undefined &&
      debouncedQuery.length >= 2 &&
      debouncedQuery !== lastRecordedRef.current
    ) {
      lastRecordedRef.current = debouncedQuery;
      recordRecent.mutate({ query: debouncedQuery, entityTypes: entityTypes });
    }
    // recordRecent.mutate is stable per TanStack Query.
    // entityTypes is intentionally excluded: switching tabs on the same query
    // should not create a second recent-search entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, debouncedQuery]);

  const handleSelectQuery = useCallback((q: string) => {
    setInputValue(q);
  }, []);

  const handleSaveSearch = useCallback(() => {
    if (debouncedQuery.length >= 2) {
      saveSearch.mutate({ query: debouncedQuery, entityTypes: entityTypes });
    }
  }, [debouncedQuery, entityTypes, saveSearch]);

  // Count results per tab
  const counts = useMemo(() => {
    if (!results) {
      return {
        all: 0,
        tickets: 0,
        articles: 0,
        assets: 0,
        projects: 0,
        policies: 0,
        users: 0,
        meetings: 0,
        decisions: 0,
      };
    }
    const t = results.tickets?.count || 0;
    const ar = results.articles?.count || 0;
    const as = results.assets?.count || 0;
    const p = results.projects?.count || 0;
    const po = results.policies?.count || 0;
    const u = results.users?.count || 0;
    const m = results.meetings?.count || 0;
    const d = results.decisions?.count || 0;
    return {
      all: t + ar + as + p + po + u + m + d,
      tickets: t,
      articles: ar,
      assets: as,
      projects: p,
      policies: po,
      users: u,
      meetings: m,
      decisions: d,
    };
  }, [results]);

  // Render results for active tab
  const renderResults = () => {
    if (!results) return null;

    const sections: Array<{
      key: string;
      items: React.ReactNode[];
      label: string;
    }> = [];

    if ((activeTab === "all" || activeTab === "tickets") && results.tickets?.results.length) {
      sections.push({
        key: "tickets",
        label: "Tickets",
        items: results.tickets.results.map((item) => (
          <TicketResult key={item.id} item={item} />
        )),
      });
    }

    if ((activeTab === "all" || activeTab === "articles") && results.articles?.results.length) {
      sections.push({
        key: "articles",
        label: "Articles",
        items: results.articles.results.map((item) => (
          <ArticleResult key={item.id} item={item} />
        )),
      });
    }

    if ((activeTab === "all" || activeTab === "assets") && results.assets?.results.length) {
      sections.push({
        key: "assets",
        label: "Assets",
        items: results.assets.results.map((item) => (
          <AssetResult key={item.id} item={item} />
        )),
      });
    }

    if ((activeTab === "all" || activeTab === "projects") && results.projects?.results.length) {
      sections.push({
        key: "projects",
        label: "Projects",
        items: results.projects.results.map((item) => (
          <ProjectResult key={item.id} item={item} />
        )),
      });
    }

    if ((activeTab === "all" || activeTab === "policies") && results.policies?.results.length) {
      sections.push({
        key: "policies",
        label: "Policies",
        items: results.policies.results.map((item) => (
          <PolicyResult key={item.id} item={item} />
        )),
      });
    }

    if ((activeTab === "all" || activeTab === "users") && results.users?.results.length) {
      sections.push({
        key: "users",
        label: "Users",
        items: results.users.results.map((item) => (
          <UserResult key={item.id} item={item} />
        )),
      });
    }

    if ((activeTab === "all" || activeTab === "meetings") && results.meetings?.results.length) {
      sections.push({
        key: "meetings",
        label: "Meetings",
        items: results.meetings.results.map((item) => (
          <MeetingResult key={item.id} item={item} />
        )),
      });
    }

    if ((activeTab === "all" || activeTab === "decisions") && results.decisions?.results.length) {
      sections.push({
        key: "decisions",
        label: "Decisions",
        items: results.decisions.results.map((item) => (
          <DecisionResult key={item.id} item={item} />
        )),
      });
    }

    if (sections.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Search size={48} className="text-[var(--text-secondary)] mb-4 opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">No results found for &quot;{debouncedQuery}&quot;</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Try a different search term or broaden your filters.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.key}>
            {activeTab === "all" && (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                {section.label} ({section.items.length})
              </h3>
            )}
            <div className="space-y-2">{section.items}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <Search size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Global Search
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Search across tickets, articles, assets, projects, policies, users, meetings, and decisions.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <Search size={18} className="text-[var(--text-secondary)] shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search across all modules..."
            className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
            autoFocus
          />
          {inputValue && (
            <button
              onClick={() => setInputValue("")}
              className="p-1 rounded transition-colors hover:bg-[var(--surface-2)]"
            >
              <X size={16} className="text-[var(--text-secondary)]" />
            </button>
          )}
          {isFetching && (
            <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin shrink-0" />
          )}
          {debouncedQuery.length >= 2 && (
            <button
              onClick={handleSaveSearch}
              disabled={saveSearch.isPending}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}
              title="Save this search"
            >
              <Bookmark size={13} />
              Save
            </button>
          )}
        </div>
      </motion.div>

      {/* Layout: Main + Sidebar */}
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          {debouncedQuery.length >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="flex items-center gap-1 mb-4 overflow-x-auto pb-1"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const count = counts[tab.key];
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: isActive ? "var(--primary)" : "var(--surface-0)",
                      color: isActive ? "#fff" : "var(--text-secondary)",
                      border: isActive ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <Icon size={13} />
                    {tab.label}
                    {count > 0 && (
                      <span
                        className="tabular-nums text-[10px] rounded-full px-1.5 py-0.5 leading-none"
                        style={{
                          backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence mode="wait">
            {debouncedQuery.length < 2 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Search size={56} className="text-[var(--text-secondary)] mb-4 opacity-30" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Enter at least 2 characters to start searching.
                </p>
              </motion.div>
            ) : isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ResultsSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderResults()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="hidden lg:block w-64 shrink-0"
        >
          <div
            className="rounded-xl border p-4 sticky top-6"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            <SearchSidebar onSelectQuery={handleSelectQuery} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
