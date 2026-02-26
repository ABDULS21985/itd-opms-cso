"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Loader2,
  User,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Search,
  X,
  Check,
  ChevronDown,
  MapPin,
  Mail,
  Shield,
  Handshake,
  GraduationCap,
  FileSignature,
  Zap,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  PartyPopper,
} from "lucide-react";
import {
  useAdminCandidates,
  useAdminEmployers,
  useAdminJobs,
  useAdminIntroRequests,
} from "@/hooks/use-admin";
import { useCreatePlacement } from "@/hooks/use-placements";
import type { CandidateProfile } from "@/types/candidate";
import type { EmployerOrg } from "@/types/employer";
import type { JobPost } from "@/types/job";
import type { IntroRequest } from "@/types/intro-request";
import { PlacementType } from "@/types/placement";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function useDebounce(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function statusColor(status: string | null | undefined): string {
  switch (status) {
    case "approved": case "verified": case "published": case "completed":
    case "accepted": case "immediate":
      return "bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border-[var(--success)]/20";
    case "pending": case "pending_review": case "submitted":
    case "in_discussion": case "one_month":
      return "bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border-[var(--warning)]/20";
    case "rejected": case "declined": case "suspended": case "not_available":
      return "bg-[var(--badge-red-bg)] text-[var(--badge-red-text)] border-[var(--error)]/20";
    default:
      return "bg-[var(--surface-1)] text-[var(--text-muted)] border-[var(--border)]/60";
  }
}

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════════════
// Entity Renderers
// ═══════════════════════════════════════════════════════════════════════════

function CandidateItem({ item }: { item: CandidateProfile }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {item.photoUrl ? (
        <img src={item.photoUrl} alt={item.fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-[var(--surface-0)] shadow-sm" />
      ) : (
        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/15 to-[var(--info)]/10 text-[var(--primary)] text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
          {initials(item.fullName)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.fullName}</p>
        <div className="flex items-center gap-2.5 text-xs text-[var(--neutral-gray)] mt-0.5">
          {item.contactEmail && (
            <span className="flex items-center gap-1 truncate">
              <Mail size={10} className="text-[var(--surface-4)]" />
              {item.contactEmail}
            </span>
          )}
          {(item.city || item.country) && (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={10} className="text-[var(--surface-4)]" />
              {[item.city, item.country].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </div>
      {item.availabilityStatus && (
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 tracking-wide uppercase ${statusColor(item.availabilityStatus)}`}>
          {formatLabel(item.availabilityStatus)}
        </span>
      )}
    </div>
  );
}

function CandidateChip({ item }: { item: CandidateProfile }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {item.photoUrl ? (
        <img src={item.photoUrl} alt={item.fullName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-[var(--primary)]/10" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)]/15 to-[var(--info)]/10 text-[var(--primary)] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {initials(item.fullName)}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.fullName}</p>
        <p className="text-xs text-[var(--neutral-gray)] truncate">
          {item.contactEmail || [item.city, item.country].filter(Boolean).join(", ") || "Candidate"}
        </p>
      </div>
    </div>
  );
}

function EmployerItem({ item }: { item: EmployerOrg }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {item.logoUrl ? (
        <img src={item.logoUrl} alt={item.companyName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 ring-2 ring-[var(--surface-0)] shadow-sm" />
      ) : (
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/15 to-[#FBBF24]/10 text-[var(--accent-orange)] text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
          {initials(item.companyName)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.companyName}</p>
        <div className="flex items-center gap-2.5 text-xs text-[var(--neutral-gray)] mt-0.5">
          {item.sector && <span className="truncate">{item.sector}</span>}
          {(item.locationHq || item.country) && (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={10} className="text-[var(--surface-4)]" />
              {[item.locationHq, item.country].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </div>
      {item.verificationStatus && (
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 tracking-wide uppercase ${statusColor(item.verificationStatus)}`}>
          {formatLabel(item.verificationStatus)}
        </span>
      )}
    </div>
  );
}

function EmployerChip({ item }: { item: EmployerOrg }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {item.logoUrl ? (
        <img src={item.logoUrl} alt={item.companyName} className="w-8 h-8 rounded-xl object-cover flex-shrink-0 ring-2 ring-[var(--accent-orange)]/10" />
      ) : (
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/15 to-[#FBBF24]/10 text-[var(--accent-orange)] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {initials(item.companyName)}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.companyName}</p>
        <p className="text-xs text-[var(--neutral-gray)] truncate">
          {item.sector || [item.locationHq, item.country].filter(Boolean).join(", ") || "Employer"}
        </p>
      </div>
    </div>
  );
}

function JobItem({ item }: { item: JobPost }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--badge-purple-bg)] to-[var(--badge-purple-bg)] text-[var(--badge-purple-dot)] flex items-center justify-center flex-shrink-0 shadow-sm">
        <Briefcase size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.title}</p>
        <div className="flex items-center gap-2.5 text-xs text-[var(--neutral-gray)] mt-0.5">
          {item.employer?.companyName && <span className="truncate">{item.employer.companyName}</span>}
          {item.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={10} className="text-[var(--surface-4)]" />
              {item.location}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.jobType && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)] border-[var(--badge-purple-dot)]/20 uppercase tracking-wide">
            {formatLabel(item.jobType)}
          </span>
        )}
      </div>
    </div>
  );
}

function JobChip({ item }: { item: JobPost }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--badge-purple-bg)] to-[var(--badge-purple-bg)] text-[var(--badge-purple-dot)] flex items-center justify-center flex-shrink-0">
        <Briefcase size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--neutral-gray)] truncate">
          {item.employer?.companyName || formatLabel(item.jobType)}
        </p>
      </div>
    </div>
  );
}

function IntroRequestItem({ item }: { item: IntroRequest }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--badge-emerald-bg)] to-[var(--badge-emerald-bg)] text-[var(--success)] flex items-center justify-center flex-shrink-0 shadow-sm">
        <Handshake size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.roleTitle}</p>
        <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-gray)] mt-0.5">
          {item.candidate?.fullName && <span className="truncate">{item.candidate.fullName}</span>}
          {item.candidate?.fullName && item.employer?.companyName && (
            <ArrowRight size={10} className="text-[var(--surface-4)] flex-shrink-0" />
          )}
          {item.employer?.companyName && <span className="truncate">{item.employer.companyName}</span>}
        </div>
      </div>
    </div>
  );
}

function IntroRequestChip({ item }: { item: IntroRequest }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--badge-emerald-bg)] to-[var(--badge-emerald-bg)] text-[var(--success)] flex items-center justify-center flex-shrink-0">
        <Handshake size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.roleTitle}</p>
        <p className="text-xs text-[var(--neutral-gray)] truncate">
          {[item.candidate?.fullName, item.employer?.companyName].filter(Boolean).join(" → ") || "Intro Request"}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EntitySearchSelect
// ═══════════════════════════════════════════════════════════════════════════

interface EntitySearchSelectProps<T extends { id: string }> {
  label: string;
  required?: boolean;
  icon: ReactNode;
  selected: T | null;
  onSelect: (item: T | null) => void;
  useQuery: (filters?: Record<string, any>) => {
    data: { data: T[]; meta: any } | undefined;
    isLoading: boolean;
    isFetching: boolean;
  };
  extraFilters?: Record<string, any>;
  renderItem: (item: T) => ReactNode;
  renderChip: (item: T) => ReactNode;
  placeholder: string;
  emptyLabel: string;
  error?: string;
}

function EntitySearchSelect<T extends { id: string }>({
  label, required, icon, selected, onSelect, useQuery: useEntityQuery,
  extraFilters, renderItem, renderChip, placeholder, emptyLabel, error,
}: EntitySearchSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const debouncedSearch = useDebounce(search);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filters = useMemo(
    () => ({ search: debouncedSearch || undefined, limit: 10, ...extraFilters }),
    [debouncedSearch, extraFilters],
  );

  const { data, isLoading, isFetching } = useEntityQuery(filters);
  const items = data?.data ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  useEffect(() => { setHighlightIdx(0); }, [items.length, debouncedSearch]);
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  const handleOpen = useCallback(() => {
    if (selected) return;
    setOpen(true);
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [selected]);

  const handleSelect = useCallback((item: T) => {
    onSelect(item);
    setOpen(false);
    setSearch("");
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
    setSearch("");
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, items.length - 1)); break;
        case "ArrowUp": e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); break;
        case "Enter": e.preventDefault(); if (items[highlightIdx]) handleSelect(items[highlightIdx]); break;
        case "Escape": e.preventDefault(); setOpen(false); break;
      }
    },
    [open, items, highlightIdx, handleSelect],
  );

  return (
    <div ref={containerRef} className="relative">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] mb-2">
        {label}
        {required && (
          <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/8 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Required</span>
        )}
      </label>
      {selected ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all">
          {renderChip(selected)}
          <button type="button" onClick={handleClear} className="p-1.5 rounded-xl hover:bg-[var(--badge-red-bg)] text-[var(--surface-4)] hover:text-[var(--error)] transition-all duration-200 flex-shrink-0 group" aria-label={`Clear ${label}`}>
            <X size={14} className="transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>
      ) : (
        <div className={`relative cursor-text rounded-2xl ${error ? "ring-2 ring-red-200/80 ring-offset-1" : ""}`} onClick={handleOpen}>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--surface-4)] pointer-events-none transition-all duration-300">
            {open ? <Search size={16} className="text-[var(--primary)]" /> : icon}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
            onFocus={() => !open && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-11 pr-11 py-3 rounded-2xl text-sm bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--primary)]/20 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all focus:outline-none placeholder:text-[var(--text-muted)]"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={label}
          />
          <ChevronDown size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 text-[var(--surface-4)] pointer-events-none transition-transform duration-300 ${open ? "rotate-180 text-[var(--primary)]" : ""}`} />
        </div>
      )}
      {error && !selected && (
        <p className="text-xs text-[var(--error)] mt-1.5 flex items-center gap-1 font-medium">
          <span className="w-1 h-1 rounded-full bg-[var(--error)]" /> {error}
        </p>
      )}
      {open && !selected && (
        <ul ref={listRef} role="listbox" className="absolute z-50 mt-2 w-full max-h-[300px] overflow-auto bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-xl shadow-black/5 py-1.5">
          {isLoading || isFetching ? (
            <li className="flex flex-col items-center justify-center gap-2 py-8">
              <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
              <span className="text-xs text-[var(--surface-4)] font-medium">Searching…</span>
            </li>
          ) : items.length === 0 ? (
            <li className="py-8 text-center">
              <Search size={20} className="mx-auto text-[var(--surface-4)] mb-2" />
              <p className="text-sm text-[var(--surface-4)] font-medium">{emptyLabel}</p>
              <p className="text-xs text-[var(--surface-4)] mt-0.5">Try a different search term</p>
            </li>
          ) : (
            items.map((item, idx) => (
              <li
                key={item.id}
                role="option"
                aria-selected={idx === highlightIdx}
                className={`mx-1.5 px-3 py-3 cursor-pointer rounded-xl transition-all duration-150 ${
                  idx === highlightIdx ? "bg-[var(--primary)]/[0.04]" : "hover:bg-[var(--surface-1)]"
                }`}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => handleSelect(item)}
              >
                {renderItem(item)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Placement Type Cards
// ═══════════════════════════════════════════════════════════════════════════

const PLACEMENT_TYPES = [
  { value: PlacementType.INTERNSHIP, label: "Internship", icon: GraduationCap, desc: "Short-term learning placement", gradient: "from-blue-500/10 to-cyan-500/5", activeGradient: "from-blue-500/15 to-cyan-500/10" },
  { value: PlacementType.CONTRACT, label: "Contract", icon: FileSignature, desc: "Fixed-term engagement", gradient: "from-violet-500/10 to-purple-500/5", activeGradient: "from-violet-500/15 to-purple-500/10" },
  { value: PlacementType.FULL_TIME, label: "Full Time", icon: Briefcase, desc: "Permanent position", gradient: "from-emerald-500/10 to-teal-500/5", activeGradient: "from-emerald-500/15 to-teal-500/10" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Step Wizard
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  { id: 1, label: "Select Candidate", icon: User },
  { id: 2, label: "Select Job", icon: Briefcase },
  { id: 3, label: "Details", icon: FileText },
  { id: 4, label: "Review", icon: Shield },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Summary Row
// ═══════════════════════════════════════════════════════════════════════════

function SummaryRow({ label, value, fallback, required, icon }: {
  label: string; value?: string; fallback: string; required?: boolean; icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-sm hover:bg-[var(--surface-1)] transition-colors">
      <span className="flex items-center gap-2 text-[var(--neutral-gray)] font-medium">
        {icon && <span className="text-[var(--surface-4)]">{icon}</span>}
        {label}
      </span>
      <span className={value ? "text-[var(--foreground)] font-semibold" : "text-[var(--surface-4)] italic"}>
        {value || fallback}
        {required && !value && (
          <span className="text-[var(--error)] ml-1.5 not-italic text-[10px] font-bold uppercase tracking-wider bg-[var(--badge-red-bg)] px-1.5 py-0.5 rounded-md">Required</span>
        )}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function CreatePlacementPage() {
  const router = useRouter();
  const createMutation = useCreatePlacement();

  // Step state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Entity selections
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerOrg | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [selectedIntro, setSelectedIntro] = useState<IntroRequest | null>(null);

  // Form fields
  const [placementType, setPlacementType] = useState<PlacementType | "">("");
  const [salaryRange, setSalaryRange] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Validation
  const [attempted, setAttempted] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const canSubmit = !!selectedCandidate && !!selectedEmployer;

  // Step validation
  const stepValid = useMemo(() => ({
    1: !!selectedCandidate,
    2: true, // employer/job are optional in step 2 for flexibility
    3: true, // details are all optional
    4: canSubmit,
  }), [selectedCandidate, canSubmit]);

  // Auto-fill from intro request
  const handleIntroSelect = useCallback(
    (intro: IntroRequest | null) => {
      setSelectedIntro(intro);
      if (intro) {
        let filled = false;
        if (intro.candidate && !selectedCandidate) {
          setSelectedCandidate(intro.candidate);
          filled = true;
        }
        if (intro.employer && !selectedEmployer) {
          setSelectedEmployer(intro.employer);
          filled = true;
        }
        if (filled) toast.success("Auto-filled from intro request");
      }
    },
    [selectedCandidate, selectedEmployer],
  );

  // Filter jobs by selected employer
  const jobExtraFilters = useMemo(
    () => (selectedEmployer ? { employerId: selectedEmployer.id } : undefined),
    [selectedEmployer],
  );

  const handleEmployerSelect = useCallback(
    (emp: EmployerOrg | null) => {
      setSelectedEmployer(emp);
      if (!emp && selectedJob) setSelectedJob(null);
    },
    [selectedJob],
  );

  // Navigation
  const goNext = () => {
    if (step < 4) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  // Submit
  const handleSubmit = () => {
    setAttempted(true);
    if (!canSubmit) return;

    createMutation.mutate(
      {
        candidateId: selectedCandidate!.id,
        employerId: selectedEmployer!.id,
        jobId: selectedJob?.id || undefined,
        introRequestId: selectedIntro?.id || undefined,
        placementType: placementType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        salaryRange: salaryRange.trim() || undefined,
        outcomeNotes: notes.trim() || undefined,
      } as any,
      {
        onSuccess: (data: any) => {
          setCreatedId(data?.id || "");
          toast.success("Placement created successfully!");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to create placement.");
        },
      },
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && step < 4) goNext();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && step === 4 && canSubmit) handleSubmit();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  // Success state
  if (createdId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 rounded-2xl bg-[var(--success-light)] flex items-center justify-center mx-auto mb-6"
          >
            <PartyPopper size={36} className="text-[var(--success)]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Placement Created!</h2>
          <p className="text-sm text-[var(--neutral-gray)] mb-8">
            The placement record has been created successfully. You can now track its progress through the pipeline.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/admin/placements"
              className="px-5 py-2.5 border border-[var(--border)] text-[var(--neutral-gray)] rounded-xl text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
            >
              Back to Pipeline
            </Link>
            <Link
              href={`/admin/placements/${createdId}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--secondary)] transition-colors"
            >
              View Placement
              <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Slide animation variants
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="space-y-6 pt-2 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 py-2">
          <Link
            href="/admin/placements"
            className="p-2.5 rounded-xl text-[var(--neutral-gray)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] transition-all"
            aria-label="Back to placements"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">New Placement</h1>
              <Sparkles size={18} className="text-[var(--accent-orange)]" />
            </div>
            <p className="text-sm text-[var(--surface-4)] mt-0.5">
              Step {step} of {STEPS.length} — {STEPS[step - 1].label}
            </p>
          </div>
        </div>

        {/* Step Progress */}
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <div className="relative h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden mb-5">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--primary), var(--info), #6366F1)" }}
              animate={{ width: `${(step / STEPS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between">
            {STEPS.map((s) => {
              const StepIcon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setDirection(s.id > step ? 1 : -1);
                    setStep(s.id);
                  }}
                  className="flex flex-col items-center gap-2 flex-1 group"
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isDone
                        ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                        : isActive
                          ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 scale-110"
                          : "bg-[var(--surface-2)] text-[var(--surface-4)] group-hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    {isDone ? <Check size={16} strokeWidth={2.5} /> : <StepIcon size={16} />}
                  </span>
                  <span
                    className={`text-xs font-semibold transition-colors hidden sm:block ${
                      isActive ? "text-[var(--primary)]" : isDone ? "text-[var(--text-primary)]" : "text-[var(--surface-4)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Step 1: Select Candidate */}
            {step === 1 && (
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] shadow-sm p-5 sm:p-7 space-y-6">
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--info)]/5 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
                    <User size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[var(--foreground)]">Select Candidate</h3>
                    <p className="text-sm text-[var(--surface-4)] mt-0.5">Choose the candidate for this placement</p>
                  </div>
                </div>

                <EntitySearchSelect<CandidateProfile>
                  label="Candidate"
                  required
                  icon={<User size={16} />}
                  selected={selectedCandidate}
                  onSelect={setSelectedCandidate}
                  useQuery={useAdminCandidates}
                  renderItem={(item) => <CandidateItem item={item} />}
                  renderChip={(item) => <CandidateChip item={item} />}
                  placeholder="Search candidates by name or email…"
                  emptyLabel="No candidates found"
                  error={attempted && !selectedCandidate ? "Candidate is required" : undefined}
                />

                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--neutral-gray)] mb-3">Or start from an intro request:</p>
                  <EntitySearchSelect<IntroRequest>
                    label="Intro Request"
                    icon={<Handshake size={16} />}
                    selected={selectedIntro}
                    onSelect={handleIntroSelect}
                    useQuery={useAdminIntroRequests}
                    renderItem={(item) => <IntroRequestItem item={item} />}
                    renderChip={(item) => <IntroRequestChip item={item} />}
                    placeholder="Search intro requests by role title…"
                    emptyLabel="No intro requests found"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Select Employer & Job */}
            {step === 2 && (
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] shadow-sm p-5 sm:p-7 space-y-6">
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/10 to-[#FBBF24]/5 text-[var(--accent-orange)] flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[var(--foreground)]">Select Employer & Job</h3>
                    <p className="text-sm text-[var(--surface-4)] mt-0.5">Choose the employer and optionally link a job posting</p>
                  </div>
                </div>

                <EntitySearchSelect<EmployerOrg>
                  label="Employer"
                  required
                  icon={<Building2 size={16} />}
                  selected={selectedEmployer}
                  onSelect={handleEmployerSelect}
                  useQuery={useAdminEmployers}
                  renderItem={(item) => <EmployerItem item={item} />}
                  renderChip={(item) => <EmployerChip item={item} />}
                  placeholder="Search employers by company name…"
                  emptyLabel="No employers found"
                  error={attempted && !selectedEmployer ? "Employer is required" : undefined}
                />

                <EntitySearchSelect<JobPost>
                  label="Job"
                  icon={<Briefcase size={16} />}
                  selected={selectedJob}
                  onSelect={setSelectedJob}
                  useQuery={useAdminJobs}
                  extraFilters={jobExtraFilters}
                  renderItem={(item) => <JobItem item={item} />}
                  renderChip={(item) => <JobChip item={item} />}
                  placeholder={selectedEmployer ? `Search jobs at ${selectedEmployer.companyName}…` : "Search jobs…"}
                  emptyLabel="No jobs found"
                />
              </div>
            )}

            {/* Step 3: Placement Details */}
            {step === 3 && (
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] shadow-sm p-5 sm:p-7 space-y-6">
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--badge-purple-bg)] to-[var(--badge-purple-bg)] text-[var(--badge-purple-dot)] flex items-center justify-center flex-shrink-0">
                    <FileText size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[var(--foreground)]">Placement Details</h3>
                    <p className="text-sm text-[var(--surface-4)] mt-0.5">Configure the type and terms of this placement</p>
                  </div>
                </div>

                {/* Placement Type */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3">Placement Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {PLACEMENT_TYPES.map((pt) => (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => setPlacementType(placementType === pt.value ? "" : pt.value)}
                        className={`relative flex flex-col items-center gap-3 px-5 py-6 rounded-2xl border-2 text-center hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 ${
                          placementType === pt.value
                            ? `border-[var(--primary)] bg-gradient-to-b ${pt.activeGradient}`
                            : `border-transparent bg-gradient-to-b ${pt.gradient} hover:border-[var(--primary)]/20`
                        }`}
                      >
                        {placementType === pt.value && (
                          <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          placementType === pt.value
                            ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 scale-110"
                            : "bg-[var(--surface-0)] text-[var(--neutral-gray)] shadow-sm"
                        }`}>
                          <pt.icon size={22} />
                        </span>
                        <div>
                          <p className={`text-sm font-bold transition-colors ${placementType === pt.value ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                            {pt.label}
                          </p>
                          <p className="text-[11px] text-[var(--surface-4)] mt-1 font-medium">{pt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Salary */}
                <div>
                  <label htmlFor="salaryRange" className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Salary Range</label>
                  <div className="relative group">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--surface-4)] group-focus-within:text-[var(--primary)] transition-colors" />
                    <input
                      id="salaryRange"
                      type="text"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      placeholder="e.g. $50k - $80k"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--primary)]/20 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all focus:outline-none placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Start Date</label>
                    <div className="relative group">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--surface-4)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none" />
                      <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--primary)]/20 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">End Date</label>
                    <div className="relative group">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--surface-4)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none" />
                      <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--primary)]/20 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Notes</label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this placement…"
                    rows={4}
                    className="w-full px-5 py-4 rounded-2xl text-sm bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--primary)]/20 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all focus:outline-none resize-none placeholder:text-[var(--text-muted)] leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {step === 4 && (
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] shadow-sm p-5 sm:p-7 space-y-6">
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--success)]/10 to-[var(--success)]/5 text-[var(--success)] flex items-center justify-center flex-shrink-0">
                    <Shield size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[var(--foreground)]">Review & Confirm</h3>
                    <p className="text-sm text-[var(--surface-4)] mt-0.5">Verify the details before creating this placement</p>
                  </div>
                </div>

                {/* Side by side cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-2">Candidate</p>
                    {selectedCandidate ? (
                      <CandidateChip item={selectedCandidate} />
                    ) : (
                      <p className="text-sm text-[var(--error)] font-medium">Not selected</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="text-[10px] font-bold text-[var(--neutral-gray)] uppercase tracking-wider mb-2">Employer</p>
                    {selectedEmployer ? (
                      <EmployerChip item={selectedEmployer} />
                    ) : (
                      <p className="text-sm text-[var(--error)] font-medium">Not selected</p>
                    )}
                  </div>
                </div>

                {/* Details Summary */}
                <div className="rounded-2xl bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-2)]/50 border border-[var(--border)]/40 divide-y divide-[var(--border)]/40 overflow-hidden">
                  <SummaryRow label="Job" icon={<Briefcase size={14} />} value={selectedJob?.title} fallback="None" />
                  <SummaryRow label="Intro Request" icon={<Handshake size={14} />} value={selectedIntro?.roleTitle} fallback="None" />
                  <SummaryRow label="Placement Type" icon={<FileSignature size={14} />} value={placementType ? formatLabel(placementType) : undefined} fallback="Not set" />
                  <SummaryRow label="Salary" icon={<DollarSign size={14} />} value={salaryRange || undefined} fallback="Not set" />
                  <SummaryRow label="Dates" icon={<Calendar size={14} />} value={startDate || endDate ? [startDate, endDate].filter(Boolean).join(" → ") : undefined} fallback="Not set" />
                  {notes.trim() && (
                    <div className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-[var(--neutral-gray)] mb-1">Notes</p>
                      <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] rounded-xl transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <Link
              href="/admin/placements"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] rounded-xl transition-colors"
            >
              Cancel
            </Link>
          )}

          {step < 4 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--secondary)] rounded-xl transition-colors shadow-sm"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createMutation.isPending}
              className="flex items-center gap-2.5 px-7 py-3 text-white rounded-2xl text-sm font-bold bg-[var(--primary)] hover:bg-[var(--secondary)] shadow-md shadow-[var(--primary)]/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus size={16} strokeWidth={2.5} />
                  Create Placement
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
