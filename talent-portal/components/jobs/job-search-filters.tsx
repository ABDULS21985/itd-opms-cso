"use client";

import {
  useCallback,
  useState,
  useTransition,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  SlidersHorizontal,
  Briefcase,
  Clock,
  FileText,
  GraduationCap,
  Wifi,
  Building2,
  ArrowLeftRight,
  MapPin,
  ChevronDown,
  Check,
  ArrowUpDown,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@digibit/ui/components";
import { cn } from "@/lib/utils";

// ─── Pending Context ─────────────────────────────────────────────────────────

const PendingCtx = createContext<{
  isPending: boolean;
  startTransition: TransitionStartFunction;
}>({ isPending: false, startTransition: (fn) => fn() });

export function JobPendingProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <PendingCtx.Provider value={{ isPending, startTransition }}>
      {children}
    </PendingCtx.Provider>
  );
}

function useJobPending() {
  return useContext(PendingCtx);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const JOB_TYPE_OPTIONS = [
  { value: "full_time", label: "Full Time", icon: Briefcase, activeClass: "bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-dark)]/30" },
  { value: "part_time", label: "Part Time", icon: Clock, activeClass: "bg-[var(--warning-light)] text-[var(--warning-dark)] border-[var(--warning-dark)]/30" },
  { value: "contract", label: "Contract", icon: FileText, activeClass: "bg-purple-100/80 text-purple-700 border-purple-300" },
  { value: "internship", label: "Internship", icon: GraduationCap, activeClass: "bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-dark)]/30" },
];

const WORK_MODE_OPTIONS = [
  { value: "remote", label: "Remote", icon: Wifi },
  { value: "hybrid", label: "Hybrid", icon: ArrowLeftRight },
  { value: "onsite", label: "On-site", icon: Building2 },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
];

const SKILLS = [
  "React", "TypeScript", "Next.js", "Node.js", "NestJS", "Python",
  "Tailwind CSS", "PostgreSQL", "Docker", "Kubernetes", "AWS", "Figma",
  "React Native", "Flutter", "GraphQL", "Redis", "Machine Learning", "Git",
  "SQL", "REST APIs",
];

const LOCATIONS = [
  "Lagos, Nigeria", "Accra, Ghana", "Nairobi, Kenya", "Cape Town, South Africa",
  "Dakar, Senegal", "Kampala, Uganda", "Kigali, Rwanda", "Remote (Anywhere)",
];

const SORT_OPTIONS = [
  { value: "publishedAt", label: "Most Recent" },
  { value: "relevance", label: "Most Relevant" },
  { value: "salaryDesc", label: "Salary (High \u2192 Low)" },
  { value: "deadline", label: "Deadline (Soonest)" },
];

const QUICK_FILTERS = [
  { label: "Remote", param: "workMode", value: "remote" },
  { label: "Full Time", param: "jobType", value: "full_time" },
  { label: "Entry Level", param: "experienceLevel", value: "entry" },
  { label: "Frontend", param: "skills", value: "React" },
  { label: "Backend", param: "skills", value: "Node.js" },
];

// ─── Shared Hook ─────────────────────────────────────────────────────────────

function useJobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPending, startTransition } = useJobPending();

  const get = useCallback((key: string) => searchParams.get(key) || "", [searchParams]);

  const currentSearch = get("search");
  const currentJobType = get("jobType");
  const currentWorkMode = get("workMode");
  const currentExperience = get("experienceLevel");
  const currentSkills = get("skills");
  const currentLocation = get("location");
  const currentSort = get("sort") || "publishedAt";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      startTransition(() => {
        router.push(`/jobs?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const toggleMultiValue = useCallback(
    (key: string, current: string, value: string) => {
      const values = current ? current.split(",") : [];
      const idx = values.indexOf(value);
      if (idx >= 0) values.splice(idx, 1);
      else values.push(value);
      updateParams(key, values.join(","));
    },
    [updateParams],
  );

  const removeFilter = useCallback(
    (param: string, value?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value) {
        params.delete(param);
      } else {
        const current = params.get(param) || "";
        const values = current.split(",").filter((v) => v !== value);
        if (values.length) params.set(param, values.join(","));
        else params.delete(param);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/jobs?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push("/jobs");
    });
  }, [router, startTransition]);

  const activeCount = useMemo(() => {
    return [currentJobType, currentWorkMode, currentExperience, currentSkills, currentLocation, currentSearch]
      .filter(Boolean)
      .reduce((acc, v) => acc + (v!.includes(",") ? v!.split(",").length : 1), 0);
  }, [currentJobType, currentWorkMode, currentExperience, currentSkills, currentLocation, currentSearch]);

  return {
    isPending, searchParams,
    currentSearch, currentJobType, currentWorkMode, currentExperience, currentSkills, currentLocation, currentSort,
    updateParams, toggleMultiValue, removeFilter, clearAll, activeCount,
  };
}

// ─── FilterSection ───────────────────────────────────────────────────────────

function FilterSection({
  title, count, expanded, onToggle, children,
}: {
  title: string; count?: number; expanded: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--surface-2)] pb-3 pt-3 first:pt-0 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-[var(--foreground)]"
      >
        <span className="flex items-center gap-2">
          {title}
          {count != null && count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  JobHeroSearch
// ═══════════════════════════════════════════════════════════════════════════════

export function JobHeroSearch({ total }: { total: number }) {
  const {
    isPending, searchParams, currentSearch,
    updateParams, toggleMultiValue,
  } = useJobFilters();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const handleSearch = useCallback(() => {
    updateParams("search", searchInput.trim());
  }, [searchInput, updateParams]);

  const isQuickActive = (f: (typeof QUICK_FILTERS)[number]) => {
    const current = searchParams.get(f.param) || "";
    return current.split(",").includes(f.value);
  };

  const toggleQuick = (f: (typeof QUICK_FILTERS)[number]) => {
    if (f.param === "experienceLevel") {
      updateParams(f.param, isQuickActive(f) ? "" : f.value);
    } else {
      const current = searchParams.get(f.param) || "";
      toggleMultiValue(f.param, current, f.value);
    }
  };

  return (
    <div className="mt-8">
      {/* Search bar */}
      <div className="mx-auto max-w-2xl relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by title, company, or skill..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 py-4 pl-12 pr-28 text-white placeholder:text-white/40 text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all"
        />
        <button
          onClick={handleSearch}
          disabled={isPending}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#1B7340] hover:bg-white/90 transition-colors disabled:opacity-50 shadow-lg shadow-black/10"
        >
          {isPending ? (
            <div className="h-4 w-4 border-2 border-[#1B7340]/30 border-t-[#1B7340] rounded-full animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </div>

      {/* Quick filter pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {QUICK_FILTERS.map((f) => {
          const active = isQuickActive(f);
          return (
            <button
              key={f.label}
              onClick={() => toggleQuick(f)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all border",
                active
                  ? "bg-white text-[#1B7340] border-white shadow-lg shadow-black/10"
                  : "bg-white/10 text-white/80 border-white/10 hover:bg-white/20 hover:border-white/20",
              )}
            >
              {active && <Check className="inline h-3.5 w-3.5 mr-1 -ml-0.5" />}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Stats pills */}
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/90">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="font-semibold">{total}</span> Open Jobs
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/90">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified Employers
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/90">
          <Wifi className="h-3.5 w-3.5" />
          Remote Available
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  JobFilterSidebar
// ═══════════════════════════════════════════════════════════════════════════════

export function JobFilterSidebar() {
  const {
    isPending, currentJobType, currentWorkMode, currentExperience,
    currentSkills, currentLocation, updateParams, toggleMultiValue,
    clearAll, activeCount,
  } = useJobFilters();

  const [skillSearch, setSkillSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [sections, setSections] = useState<Record<string, boolean>>({
    jobType: true, workMode: true, experience: true, skills: false, location: false,
  });

  const toggle = (k: string) => setSections((p) => ({ ...p, [k]: !p[k] }));

  const selectedJobTypes = useMemo(() => currentJobType.split(",").filter(Boolean), [currentJobType]);
  const selectedWorkModes = useMemo(() => currentWorkMode.split(",").filter(Boolean), [currentWorkMode]);
  const selectedSkills = useMemo(() => currentSkills.split(",").filter(Boolean), [currentSkills]);
  const selectedLocations = useMemo(() => currentLocation.split(",").filter(Boolean), [currentLocation]);

  const filteredSkills = SKILLS.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase()));
  const filteredLocations = LOCATIONS.filter((l) => l.toLowerCase().includes(locationSearch.toLowerCase()));

  const filterContent = (
    <div className="space-y-0">
      {/* Job Type */}
      <FilterSection title="Job Type" count={selectedJobTypes.length} expanded={sections.jobType!} onToggle={() => toggle("jobType")}>
        <div className="grid grid-cols-2 gap-1.5">
          {JOB_TYPE_OPTIONS.map((opt) => {
            const sel = selectedJobTypes.includes(opt.value);
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => toggleMultiValue("jobType", currentJobType, opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all",
                  sel ? opt.activeClass : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-1)]",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Work Mode */}
      <FilterSection title="Work Mode" count={selectedWorkModes.length} expanded={sections.workMode!} onToggle={() => toggle("workMode")}>
        <div className="flex gap-1.5">
          {WORK_MODE_OPTIONS.map((opt) => {
            const sel = selectedWorkModes.includes(opt.value);
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => toggleMultiValue("workMode", currentWorkMode, opt.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                  sel
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-1)]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Experience */}
      <FilterSection title="Experience" count={currentExperience ? 1 : 0} expanded={sections.experience!} onToggle={() => toggle("experience")}>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {EXPERIENCE_LEVELS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams("experienceLevel", currentExperience === opt.value ? "" : opt.value)}
              className={cn(
                "flex-1 px-1 py-2 text-xs font-medium transition-all border-r last:border-r-0 border-[var(--border)]",
                currentExperience === opt.value
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-0)] text-[var(--foreground)] hover:bg-[var(--surface-1)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Skills */}
      <FilterSection title="Skills" count={selectedSkills.length} expanded={sections.skills!} onToggle={() => toggle("skills")}>
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {selectedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:bg-[var(--primary)]/20 transition-colors"
                onClick={() => toggleMultiValue("skills", currentSkills, skill)}
              >
                {skill}
                <X className="h-3 w-3" />
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
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] py-1.5 pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {filteredSkills.map((skill) => {
            const sel = selectedSkills.includes(skill);
            return (
              <label key={skill} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-1)]">
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggleMultiValue("skills", currentSkills, skill)}
                  className="h-3.5 w-3.5 rounded accent-[var(--primary)]"
                />
                <span className={cn("text-xs", sel ? "font-medium text-[var(--primary)]" : "text-[var(--foreground)]")}>{skill}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Location */}
      <FilterSection title="Location" count={selectedLocations.length} expanded={sections.location!} onToggle={() => toggle("location")}>
        <div className="relative mb-2">
          <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--neutral-gray)]" />
          <input
            type="text"
            placeholder="Search locations..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] py-1.5 pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {filteredLocations.map((loc) => {
            const sel = selectedLocations.includes(loc);
            return (
              <label key={loc} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-1)]">
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggleMultiValue("location", currentLocation, loc)}
                  className="h-3.5 w-3.5 rounded accent-[var(--primary)]"
                />
                <span className={cn("text-xs", sel ? "font-medium text-[var(--primary)]" : "text-[var(--foreground)]")}>{loc}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </h3>
            <div className="flex items-center gap-2">
              {isPending && (
                <div className="h-3.5 w-3.5 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              )}
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-xs text-[var(--error)] hover:underline font-medium">
                  Clear All
                </button>
              )}
            </div>
          </div>
          {filterContent}
        </div>
      </aside>

      {/* Mobile Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col overflow-hidden">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>Filters</span>
                {activeCount > 0 && (
                  <button onClick={clearAll} className="text-xs text-[var(--error)] hover:underline font-medium">
                    Clear All
                  </button>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-2">
              {filterContent}
            </div>
            <SheetFooter className="border-t border-[var(--border)] pt-4">
              <SheetClose asChild>
                <Button className="w-full">
                  Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  JobResultsHeader
// ═══════════════════════════════════════════════════════════════════════════════

export function JobResultsHeader({
  total, page, count,
}: {
  total: number; page: number; count: number;
}) {
  const {
    isPending, currentSearch, currentJobType, currentWorkMode,
    currentExperience, currentSkills, currentLocation, currentSort,
    updateParams, removeFilter, clearAll,
  } = useJobFilters();

  const from = total > 0 ? (page - 1) * 10 + 1 : 0;
  const to = from + count - 1;

  const activeFilters = useMemo(() => {
    const tags: { key: string; param: string; value?: string; label: string }[] = [];

    if (currentSearch) tags.push({ key: "search", param: "search", label: `"${currentSearch}"` });

    currentJobType.split(",").filter(Boolean).forEach((v) => {
      const opt = JOB_TYPE_OPTIONS.find((o) => o.value === v);
      if (opt) tags.push({ key: `jt-${v}`, param: "jobType", value: v, label: opt.label });
    });

    currentWorkMode.split(",").filter(Boolean).forEach((v) => {
      const opt = WORK_MODE_OPTIONS.find((o) => o.value === v);
      if (opt) tags.push({ key: `wm-${v}`, param: "workMode", value: v, label: opt.label });
    });

    if (currentExperience) {
      const opt = EXPERIENCE_LEVELS.find((o) => o.value === currentExperience);
      if (opt) tags.push({ key: "exp", param: "experienceLevel", label: opt.label });
    }

    currentSkills.split(",").filter(Boolean).forEach((v) => {
      tags.push({ key: `sk-${v}`, param: "skills", value: v, label: v });
    });

    currentLocation.split(",").filter(Boolean).forEach((v) => {
      tags.push({ key: `loc-${v}`, param: "location", value: v, label: v });
    });

    return tags;
  }, [currentSearch, currentJobType, currentWorkMode, currentExperience, currentSkills, currentLocation]);

  return (
    <div className="mb-5 space-y-3">
      {/* Loading bar */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-0.5 w-full overflow-hidden rounded-full bg-[var(--primary)]/20"
          >
            <motion.div
              className="h-full rounded-full bg-[var(--primary)]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ width: "40%" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1 text-xs font-medium"
            >
              {tag.label}
              <button
                onClick={() => removeFilter(tag.param, tag.value)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="text-xs text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results count + sort */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--neutral-gray)]">
          {total > 0 ? (
            <>
              Showing{" "}
              <span className="font-medium text-[var(--foreground)]">{from}&ndash;{to}</span>
              {" "}of{" "}
              <span className="font-medium text-[var(--foreground)]">{total}</span>
              {" "}jobs
            </>
          ) : (
            "No jobs found"
          )}
        </p>

        <Select
          value={currentSort}
          onValueChange={(v) => updateParams("sort", v === "publishedAt" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[180px] rounded-lg border-[var(--border)] bg-[var(--surface-0)] text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-[var(--neutral-gray)]" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  JobGridWrapper — loading opacity
// ═══════════════════════════════════════════════════════════════════════════════

export function JobGridWrapper({ children }: { children: ReactNode }) {
  const { isPending } = useJobPending();
  return (
    <div className={cn("transition-opacity duration-200", isPending && "opacity-60 pointer-events-none")}>
      {children}
    </div>
  );
}
