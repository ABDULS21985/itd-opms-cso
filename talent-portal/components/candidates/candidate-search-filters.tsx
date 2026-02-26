"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  Wifi,
  Building2,
  ArrowLeftRight,
  Users,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@digibit/ui/components";
import { Button } from "@digibit/ui/components";
import { cn } from "@/lib/utils";
import { expandVariants } from "@/lib/motion-variants";

// ---------------------------------------------------------------------------
// Filter option data
// ---------------------------------------------------------------------------

const TRACKS = [
  "Frontend Development",
  "Backend Development",
  "Mobile Development",
  "UI/UX Design",
  "Data Science",
  "Cloud & DevOps",
  "Product Management",
  "Cybersecurity",
];

const QUICK_TRACKS = [
  { label: "Frontend", value: "Frontend Development" },
  { label: "Backend", value: "Backend Development" },
  { label: "Full-Stack", value: "Mobile Development" },
  { label: "Data Science", value: "Data Science" },
  { label: "UI/UX", value: "UI/UX Design" },
];

const SKILLS = [
  "React", "TypeScript", "Next.js", "Node.js", "NestJS", "Python",
  "Tailwind CSS", "PostgreSQL", "Docker", "Kubernetes", "AWS", "Figma",
  "React Native", "Flutter", "GraphQL", "Redis", "Machine Learning",
  "Git", "Firebase", "MongoDB",
];

const AVAILABILITY_OPTIONS = [
  { value: "immediate", label: "Available now", dot: "bg-[var(--success)]", bg: "bg-[var(--success-light)]", text: "text-[var(--success-dark)]" },
  { value: "1_month", label: "Within 1 month", dot: "bg-[var(--warning)]", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]" },
  { value: "3_months", label: "Within 3 months", dot: "bg-[var(--accent-orange)]", bg: "bg-[var(--accent-orange)]/15", text: "text-[var(--accent-orange)]" },
];

const WORK_MODE_OPTIONS = [
  { value: "remote", label: "Remote", icon: Wifi },
  { value: "hybrid", label: "Hybrid", icon: ArrowLeftRight },
  { value: "onsite", label: "On-site", icon: Building2 },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid Level" },
];

const COHORTS = [
  "Cohort 5", "Cohort 4", "Cohort 3", "Cohort 2", "Cohort 1",
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Recently Updated" },
  { value: "fullName:asc", label: "Name A-Z" },
  { value: "fullName:desc", label: "Name Z-A" },
  { value: "yearsOfExperience:desc", label: "Experience (High to Low)" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CandidateSearchFiltersProps {
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  candidateCount: number;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CandidateSearchFilters({
  total,
  page,
  totalPages,
  pageSize,
  candidateCount,
  children,
}: CandidateSearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    track: true,
    skills: true,
    availability: true,
    workMode: true,
    experience: false,
    cohort: false,
  });

  // Current filter values from URL
  const currentTrack = searchParams.get("track") || "";
  const currentAvailability = searchParams.get("availability") || "";
  const currentWorkMode = searchParams.get("workMode") || "";
  const currentExperience = searchParams.get("experienceLevel") || "";
  const currentCohort = searchParams.get("cohort") || "";
  const currentSkills = searchParams.get("skills") || "";
  const currentSort = searchParams.get("sort") || "createdAt";
  const currentSearch = searchParams.get("search") || "";

  // Build new URL and navigate
  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/talents?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleSearch = useCallback(() => {
    updateParams("search", searchInput.trim());
  }, [searchInput, updateParams]);

  const toggleMultiValue = useCallback(
    (key: string, current: string, value: string) => {
      const values = current ? current.split(",") : [];
      const idx = values.indexOf(value);
      if (idx >= 0) {
        values.splice(idx, 1);
      } else {
        values.push(value);
      }
      updateParams(key, values.join(","));
    },
    [updateParams],
  );

  const clearAll = useCallback(() => {
    setSearchInput("");
    startTransition(() => {
      router.push("/talents");
    });
  }, [router]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredSkills = SKILLS.filter((s) =>
    s.toLowerCase().includes(skillSearch.toLowerCase()),
  );

  // Active filter count & list
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; displayValue: string; paramKey: string; paramValue: string }[] = [];
    if (currentSearch) filters.push({ key: "search", label: "Search", displayValue: currentSearch, paramKey: "search", paramValue: "" });
    if (currentTrack) filters.push({ key: "track", label: "Track", displayValue: currentTrack, paramKey: "track", paramValue: "" });
    if (currentSkills) {
      currentSkills.split(",").forEach((s) => {
        filters.push({ key: `skill-${s}`, label: "Skill", displayValue: s, paramKey: "skills", paramValue: currentSkills.split(",").filter((v) => v !== s).join(",") });
      });
    }
    if (currentAvailability) {
      currentAvailability.split(",").forEach((v) => {
        const opt = AVAILABILITY_OPTIONS.find((o) => o.value === v);
        filters.push({ key: `avail-${v}`, label: "Availability", displayValue: opt?.label || v, paramKey: "availability", paramValue: currentAvailability.split(",").filter((x) => x !== v).join(",") });
      });
    }
    if (currentWorkMode) {
      currentWorkMode.split(",").forEach((v) => {
        const opt = WORK_MODE_OPTIONS.find((o) => o.value === v);
        filters.push({ key: `wm-${v}`, label: "Work Mode", displayValue: opt?.label || v, paramKey: "workMode", paramValue: currentWorkMode.split(",").filter((x) => x !== v).join(",") });
      });
    }
    if (currentExperience) {
      const opt = EXPERIENCE_LEVELS.find((o) => o.value === currentExperience);
      filters.push({ key: "exp", label: "Experience", displayValue: opt?.label || currentExperience, paramKey: "experienceLevel", paramValue: "" });
    }
    if (currentCohort) filters.push({ key: "cohort", label: "Cohort", displayValue: currentCohort, paramKey: "cohort", paramValue: "" });
    return filters;
  }, [currentSearch, currentTrack, currentSkills, currentAvailability, currentWorkMode, currentExperience, currentCohort]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentTrack) count++;
    if (currentSkills) count++;
    if (currentAvailability) count++;
    if (currentWorkMode) count++;
    if (currentExperience) count++;
    if (currentCohort) count++;
    return count;
  }, [currentTrack, currentSkills, currentAvailability, currentWorkMode, currentExperience, currentCohort]);

  const hasActiveFilters = activeFilters.length > 0;

  // Pagination helpers
  const buildPageUrl = useCallback(
    (p: number) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (p > 1) {
        sp.set("page", String(p));
      } else {
        sp.delete("page");
      }
      const qs = sp.toString();
      return `/talents${qs ? `?${qs}` : ""}`;
    },
    [searchParams],
  );

  function getPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Selected skills as array
  const selectedSkillsArr = currentSkills ? currentSkills.split(",") : [];

  // ---------------------------------------------------------------------------
  // Shared filter UI (used in sidebar + mobile sheet)
  // ---------------------------------------------------------------------------

  const filterContent = (
    <div className="space-y-1">
      {/* Track */}
      <FilterSection
        title="Track"
        count={currentTrack ? 1 : 0}
        expanded={expandedSections.track!}
        onToggle={() => toggleSection("track")}
      >
        <div className="flex flex-wrap gap-1.5">
          {TRACKS.map((track) => (
            <button
              key={track}
              type="button"
              onClick={() => updateParams("track", currentTrack === track ? "" : track)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200",
                currentTrack === track
                  ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
                  : "bg-[var(--surface-1)] border-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              )}
            >
              {track}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Skills */}
      <FilterSection
        title="Skills"
        count={selectedSkillsArr.length}
        expanded={expandedSections.skills!}
        onToggle={() => toggleSection("skills")}
      >
        {/* Selected skills as removable pills */}
        {selectedSkillsArr.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedSkillsArr.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 text-xs font-medium"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => toggleMultiValue("skills", currentSkills, skill)}
                  className="rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--neutral-gray)]" />
          <input
            type="text"
            placeholder="Search skills..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] py-1.5 pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {filteredSkills.map((skill) => {
            const isSelected = selectedSkillsArr.includes(skill);
            return (
              <label
                key={skill}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-1)]"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleMultiValue("skills", currentSkills, skill)}
                  className="h-4 w-4 rounded accent-[var(--primary)]"
                />
                <span className="text-[var(--foreground)]">{skill}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection
        title="Availability"
        count={currentAvailability ? currentAvailability.split(",").length : 0}
        expanded={expandedSections.availability!}
        onToggle={() => toggleSection("availability")}
      >
        <div className="space-y-1.5">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const isSelected = currentAvailability.split(",").includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleMultiValue("availability", currentAvailability, opt.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                  isSelected
                    ? `${opt.bg} ${opt.text} ring-1 ring-current/20`
                    : "hover:bg-[var(--surface-1)] text-[var(--foreground)]",
                )}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", opt.dot)} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Work Mode */}
      <FilterSection
        title="Work Mode"
        count={currentWorkMode ? currentWorkMode.split(",").length : 0}
        expanded={expandedSections.workMode!}
        onToggle={() => toggleSection("workMode")}
      >
        <div className="flex flex-wrap gap-1.5">
          {WORK_MODE_OPTIONS.map((opt) => {
            const isSelected = currentWorkMode.split(",").includes(opt.value);
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleMultiValue("workMode", currentWorkMode, opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200",
                  isSelected
                    ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
                    : "bg-[var(--surface-1)] border-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Experience Level */}
      <FilterSection
        title="Experience Level"
        count={currentExperience ? 1 : 0}
        expanded={expandedSections.experience!}
        onToggle={() => toggleSection("experience")}
      >
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE_LEVELS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParams("experienceLevel", currentExperience === opt.value ? "" : opt.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200",
                currentExperience === opt.value
                  ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
                  : "bg-[var(--surface-1)] border-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Cohort */}
      <FilterSection
        title="Cohort"
        count={currentCohort ? 1 : 0}
        expanded={expandedSections.cohort!}
        onToggle={() => toggleSection("cohort")}
      >
        <div className="flex flex-wrap gap-1.5">
          {COHORTS.map((cohort) => (
            <button
              key={cohort}
              type="button"
              onClick={() => updateParams("cohort", currentCohort === cohort ? "" : cohort)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200",
                currentCohort === cohort
                  ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
                  : "bg-[var(--surface-1)] border-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              )}
            >
              {cohort}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="mt-4 w-full rounded-lg border border-[var(--error)] py-2 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--error-light)]"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* ================================================================== */}
      {/* HERO SECTION                                                       */}
      {/* ================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] pb-16 pt-16 lg:pt-20 rounded-b-3xl">
        {/* Dot pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Headline */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white lg:text-4xl">
              Discover Verified Tech Talent
            </h1>
            <p className="mt-3 text-base text-white/75 lg:text-lg">
              Browse{" "}
              <span className="font-semibold text-white">{total}</span>{" "}
              pre-vetted candidates across{" "}
              <span className="font-semibold text-white">{TRACKS.length}</span>{" "}
              career tracks
            </p>
          </div>

          {/* Search bar */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md p-1.5 shadow-lg shadow-black/10">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--neutral-gray)]" />
                <input
                  type="text"
                  placeholder="Search by name, skill, or track..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 w-full rounded-xl bg-transparent pl-11 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] focus:outline-none"
                />
              </div>
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); updateParams("search", ""); }}
                  className="rounded-lg p-2 text-[var(--neutral-gray)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSearch}
                disabled={isPending}
                className="shrink-0 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--secondary)] disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </div>

          {/* Quick filter pills */}
          <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2">
            {QUICK_TRACKS.map((qt) => (
              <button
                key={qt.value}
                type="button"
                onClick={() => updateParams("track", currentTrack === qt.value ? "" : qt.value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                  currentTrack === qt.value
                    ? "bg-white text-[var(--primary)] shadow-sm"
                    : "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm",
                )}
              >
                {qt.label}
              </button>
            ))}
          </div>

          {/* Stats badges */}
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white/90">
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold">{total}</span> Candidates
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-semibold">{TRACKS.length}</span> Career Tracks
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CONTENT AREA                                                       */}
      {/* ================================================================== */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Active filter tags */}
        {activeFilters.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <AnimatePresence mode="popLayout">
              {activeFilters.map((f) => (
                <motion.span
                  key={f.key}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
                >
                  <span className="text-[var(--neutral-gray)]">{f.label}:</span>
                  <span>{f.displayValue}</span>
                  <button
                    type="button"
                    onClick={() => updateParams(f.paramKey, f.paramValue)}
                    className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/10"
                  >
                    <X size={12} />
                  </button>
                </motion.span>
              ))}
              <motion.button
                key="clear-all"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--error)]"
              >
                Clear all
              </motion.button>
            </AnimatePresence>
          </div>
        )}

        {/* Grid: sidebar + results */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
                </h3>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-medium text-[var(--primary)] transition-colors hover:text-[var(--secondary)]"
                  >
                    Clear All
                  </button>
                ) : isPending ? (
                  <span className="text-xs text-[var(--neutral-gray)]">Loading...</span>
                ) : null}
              </div>
              {filterContent}
            </div>
          </aside>

          {/* Results column */}
          <div className="lg:col-start-2">
            {/* Results toolbar */}
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <p className="text-sm text-[var(--neutral-gray)]">
                Showing{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {total > 0 ? `${startItem}-${endItem}` : "0"}
                </span>{" "}
                of{" "}
                <span className="font-medium text-[var(--foreground)]">{total}</span>{" "}
                candidates
              </p>

              <div className="flex items-center gap-2">
                {/* Mobile filter trigger */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)] lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
                </button>

                {/* Sort dropdown */}
                <select
                  value={currentSort}
                  onChange={(e) => updateParams("sort", e.target.value === "createdAt" ? "" : e.target.value)}
                  className="hidden sm:block h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2.5 pr-8 text-xs text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/20"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* View toggle */}
                <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-[var(--border)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      viewMode === "grid"
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--neutral-gray)] hover:text-[var(--foreground)]",
                    )}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      viewMode === "list"
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--neutral-gray)] hover:text-[var(--foreground)]",
                    )}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading progress bar */}
            {isPending && (
              <div className="mb-4 h-0.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full w-1/3 animate-[shimmer_1s_ease-in-out_infinite] rounded-full bg-[var(--primary)]" />
              </div>
            )}

            {/* Candidate grid / empty state */}
            <div className={cn("transition-opacity duration-200", isPending && "opacity-60 pointer-events-none")}>
              {candidateCount > 0 ? (
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                      : "space-y-3",
                  )}
                >
                  {children}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] py-16 text-center">
                  <Users className="mb-4 h-12 w-12 text-[var(--surface-4)]" />
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    No candidates found
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-[var(--neutral-gray)]">
                    Try adjusting your search or filters to find what you&apos;re looking for.
                  </p>
                  <Link
                    href="/talents"
                    className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--secondary)]"
                  >
                    Clear Filters
                  </Link>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <span className="text-sm text-[var(--neutral-gray)]">
                  Showing{" "}
                  <span className="font-medium text-[var(--foreground)]">{startItem}-{endItem}</span>{" "}
                  of{" "}
                  <span className="font-medium text-[var(--foreground)]">{total}</span>
                </span>

                <nav className="flex items-center gap-1" aria-label="Pagination">
                  {/* First */}
                  <PaginationLink href={buildPageUrl(1)} disabled={page <= 1} aria-label="First page">
                    <ChevronsLeft className="h-4 w-4" />
                  </PaginationLink>
                  {/* Previous */}
                  <PaginationLink href={buildPageUrl(page - 1)} disabled={page <= 1} aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </PaginationLink>

                  {/* Page numbers */}
                  {getPageNumbers().map((p, idx) =>
                    p === "ellipsis" ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="flex h-8 w-8 items-center justify-center text-sm text-[var(--neutral-gray)]"
                      >
                        ...
                      </span>
                    ) : (
                      <Link
                        key={p}
                        href={buildPageUrl(p)}
                        className={cn(
                          "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-all duration-200",
                          p === page
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                        )}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? "page" : undefined}
                      >
                        {p}
                      </Link>
                    ),
                  )}

                  {/* Next */}
                  <PaginationLink href={buildPageUrl(page + 1)} disabled={page >= totalPages} aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </PaginationLink>
                  {/* Last */}
                  <PaginationLink href={buildPageUrl(totalPages)} disabled={page >= totalPages} aria-label="Last page">
                    <ChevronsRight className="h-4 w-4" />
                  </PaginationLink>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MOBILE FILTER SHEET                                                */}
      {/* ================================================================== */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 py-4">
            {filterContent}
          </div>
          <SheetFooter className="border-t border-[var(--border)] pt-4">
            <Button
              variant="default"
              className="w-full"
              onClick={() => setMobileOpen(false)}
            >
              Show Results ({total})
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Collapsible filter section with animation
// ---------------------------------------------------------------------------

function FilterSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] pb-3 pt-3 first:pt-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-[var(--foreground)]"
      >
        <span className="flex items-center gap-2">
          {title}
          {count > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </span>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-[var(--neutral-gray)]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            variants={expandVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="mt-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Pagination link (Link or disabled span)
// ---------------------------------------------------------------------------

function PaginationLink({
  href,
  disabled,
  children,
  ...rest
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  if (disabled) {
    return (
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--neutral-gray)] opacity-40 cursor-not-allowed"
        aria-disabled="true"
        {...rest}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      {...rest}
    >
      {children}
    </Link>
  );
}
