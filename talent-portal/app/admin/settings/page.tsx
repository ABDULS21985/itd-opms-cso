"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Globe,
  Shield,
  Bell,
  Link2,
  Users,
  Database,
  Wrench,
  Settings,
  Save,
  Loader2,
  AlertCircle,
  Check,
  X,
  Plus,
  Mail,
  Send,
  RefreshCw,
  Trash2,
  Download,
  Key,
  Copy,
  Eye,
  EyeOff,
  Activity,
  HardDrive,
  Zap,
  Clock,
  Palette,
  Lock,
  Briefcase,
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface PortalSettings {
  portalName: string;
  portalDescription: string;
  contactEmail: string;
  brandColor: string;
  timezone: string;
  dateFormat: string;
  defaultVisibility: string;
  autoApproveCandidates: boolean;
  autoApproveEmployers: boolean;
  autoApproveJobs: boolean;
  reviewSlaHours: number;
  flaggedKeywords: string;
  emailNotifications: {
    newCandidate: boolean;
    newEmployer: boolean;
    newJob: boolean;
    newApplication: boolean;
    newIntroRequest: boolean;
  };
  digestFrequency: string;
  auditLogRetention: string;
  deletedRecordsRetention: string;
}

type SectionId =
  | "general"
  | "moderation"
  | "notifications"
  | "integrations"
  | "access"
  | "data"
  | "maintenance";

// ──────────────────────────────────────────────
// Zod Schemas
// ──────────────────────────────────────────────

const generalSchema = z.object({
  portalName: z.string().min(1, "Portal name is required"),
  portalDescription: z.string(),
  contactEmail: z.string().email("Invalid email address"),
  brandColor: z.string(),
  timezone: z.string(),
  dateFormat: z.string(),
});
type GeneralValues = z.infer<typeof generalSchema>;

const moderationSchema = z.object({
  autoApproveCandidates: z.boolean(),
  autoApproveEmployers: z.boolean(),
  autoApproveJobs: z.boolean(),
  defaultVisibility: z.string(),
  reviewSlaHours: z.number(),
  flaggedKeywords: z.string(),
});
type ModerationValues = z.infer<typeof moderationSchema>;

const notificationsSchema = z.object({
  newCandidate: z.boolean(),
  newEmployer: z.boolean(),
  newJob: z.boolean(),
  newApplication: z.boolean(),
  newIntroRequest: z.boolean(),
  digestFrequency: z.string(),
});
type NotificationsValues = z.infer<typeof notificationsSchema>;

const dataSchema = z.object({
  auditLogRetention: z.string(),
  deletedRecordsRetention: z.string(),
});
type DataValues = z.infer<typeof dataSchema>;

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: typeof Globe;
  desc: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: Globe,
    desc: "Portal name, branding, and basics",
  },
  {
    id: "moderation",
    label: "Moderation",
    icon: Shield,
    desc: "Approval rules and content policies",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    desc: "Email and notification rules",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Link2,
    desc: "API keys and webhooks",
  },
  {
    id: "access",
    label: "Access Control",
    icon: Users,
    desc: "Roles and permissions",
  },
  {
    id: "data",
    label: "Data Management",
    icon: Database,
    desc: "Exports and data retention",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    desc: "System health and cache",
  },
];

const BRAND_COLORS = [
  "#1B7340",
  "#0E5A2D",
  "#2563EB",
  "#7C3AED",
  "#059669",
  "#D97706",
  "#DC2626",
  "#EC4899",
  "#0891B2",
  "#171717",
];

const TIMEZONES = [
  { value: "Africa/Lagos", label: "Lagos (WAT, UTC+1)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT, UTC+3)" },
  { value: "Africa/Cairo", label: "Cairo (EET, UTC+2)" },
  { value: "America/New_York", label: "New York (EST, UTC-5)" },
  { value: "America/Chicago", label: "Chicago (CST, UTC-6)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST, UTC-8)" },
  { value: "Europe/London", label: "London (GMT, UTC+0)" },
  { value: "Europe/Berlin", label: "Berlin (CET, UTC+1)" },
  { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
  { value: "Asia/Kolkata", label: "Mumbai (IST, UTC+5:30)" },
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT, UTC+11)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "18/02/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "02/18/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-02-18" },
];

const NOTIFICATION_EVENTS = [
  {
    key: "newCandidate" as const,
    label: "New Candidate",
    desc: "When a new candidate registers on the platform",
  },
  {
    key: "newEmployer" as const,
    label: "New Employer",
    desc: "When a new employer organization registers",
  },
  {
    key: "newJob" as const,
    label: "New Job Posting",
    desc: "When an employer posts a new job",
  },
  {
    key: "newApplication" as const,
    label: "New Application",
    desc: "When a candidate applies to a job",
  },
  {
    key: "newIntroRequest" as const,
    label: "Intro Request",
    desc: "When an employer requests an introduction",
  },
];

const DIGEST_OPTIONS = [
  { value: "realtime", label: "Real-time", desc: "Send immediately as events happen" },
  { value: "hourly", label: "Hourly", desc: "Batch notifications every hour" },
  { value: "daily", label: "Daily Digest", desc: "Morning summary email at 8 AM" },
  { value: "weekly", label: "Weekly Digest", desc: "Monday morning summary at 8 AM" },
];

const ROLES = [
  { id: "super_admin", name: "Super Admin", desc: "Full system access", users: 2, color: "#DC2626" },
  { id: "placement_manager", name: "Placement Manager", desc: "Manage placements and team", users: 3, color: "#2563EB" },
  { id: "placement_officer", name: "Placement Officer", desc: "Review and moderate content", users: 5, color: "#059669" },
  { id: "report_viewer", name: "Report Viewer", desc: "View reports and analytics", users: 4, color: "#D97706" },
  { id: "read_only", name: "Read Only", desc: "View-only access", users: 2, color: "#6B7280" },
];

const PERM_RESOURCES = [
  "Candidates",
  "Jobs",
  "Employers",
  "Placements",
  "Reports",
  "Settings",
  "Users",
];
const PERM_ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  super_admin: Object.fromEntries(
    PERM_RESOURCES.flatMap((r) =>
      PERM_ACTIONS.map((a) => [`${r}.${a}`, true])
    )
  ),
  placement_manager: Object.fromEntries(
    PERM_RESOURCES.flatMap((r) =>
      PERM_ACTIONS.map((a) => {
        if (a === "Delete" && ["Settings", "Users"].includes(r))
          return [`${r}.${a}`, false];
        return [`${r}.${a}`, true];
      })
    )
  ),
  placement_officer: Object.fromEntries(
    PERM_RESOURCES.flatMap((r) =>
      PERM_ACTIONS.map((a) => {
        if (["Settings", "Users"].includes(r)) return [`${r}.${a}`, false];
        if (a === "Delete") return [`${r}.${a}`, false];
        if (a === "Export" && r !== "Reports") return [`${r}.${a}`, false];
        return [`${r}.${a}`, true];
      })
    )
  ),
  report_viewer: Object.fromEntries(
    PERM_RESOURCES.flatMap((r) =>
      PERM_ACTIONS.map((a) => {
        if (a === "View" || (a === "Export" && r === "Reports"))
          return [`${r}.${a}`, true];
        return [`${r}.${a}`, false];
      })
    )
  ),
  read_only: Object.fromEntries(
    PERM_RESOURCES.flatMap((r) =>
      PERM_ACTIONS.map((a) => [`${r}.${a}`, a === "View"])
    )
  ),
};

const EXPORT_TYPES = [
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "employers", label: "Employers", icon: Building2 },
  { key: "placements", label: "Placements", icon: CheckCircle2 },
  { key: "introRequests", label: "Intro Requests", icon: Mail },
  { key: "auditLogs", label: "Audit Logs", icon: FileText },
];

const RETENTION_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "forever", label: "Forever" },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const inputClass =
  "w-full px-4 py-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:bg-[var(--surface-1)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all duration-200 outline-none";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Globe;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-[var(--primary)]" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--neutral-gray)]">{description}</p>
      </div>
    </div>
  );
}

function SectionFooter({
  onSave,
  onDiscard,
  isSaving,
  isDirty,
}: {
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  isDirty: boolean;
}) {
  if (!isDirty) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--border)]"
    >
      <button
        type="button"
        onClick={onDiscard}
        className="text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
      >
        <RotateCcw size={14} /> Discard Changes
      </button>
      <button
        type="submit"
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] disabled:opacity-60 shadow-md shadow-[var(--primary)]/20 hover:shadow-lg transition-all duration-200"
      >
        {isSaving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        Save Changes
      </button>
    </motion.div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-[var(--primary)]" : "bg-[var(--surface-4)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--surface-1)] shadow-md transform transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        } mt-0.5`}
      />
    </button>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);

  // Integrations state
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKeyDisplay = "sk-dbt-a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  // Access control state
  const [selectedRole, setSelectedRole] = useState("super_admin");

  // Danger zone state
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");

  // ── API Query ──
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => apiClient.get<PortalSettings>("/admin/settings"),
  });

  // ── Forms ──
  const generalForm = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      portalName: "",
      portalDescription: "",
      contactEmail: "",
      brandColor: "#1B7340",
      timezone: "Africa/Lagos",
      dateFormat: "DD/MM/YYYY",
    },
  });

  const moderationForm = useForm<ModerationValues>({
    resolver: zodResolver(moderationSchema),
    defaultValues: {
      autoApproveCandidates: false,
      autoApproveEmployers: false,
      autoApproveJobs: false,
      defaultVisibility: "private",
      reviewSlaHours: 24,
      flaggedKeywords: "",
    },
  });

  const notificationsForm = useForm<NotificationsValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      newCandidate: true,
      newEmployer: true,
      newJob: true,
      newApplication: true,
      newIntroRequest: true,
      digestFrequency: "realtime",
    },
  });

  const dataForm = useForm<DataValues>({
    resolver: zodResolver(dataSchema),
    defaultValues: {
      auditLogRetention: "90",
      deletedRecordsRetention: "30",
    },
  });

  // ── Reset forms when settings load ──
  useEffect(() => {
    if (settings) {
      generalForm.reset({
        portalName: settings.portalName || "",
        portalDescription: settings.portalDescription || "",
        contactEmail: settings.contactEmail || "",
        brandColor: settings.brandColor || "#1B7340",
        timezone: settings.timezone || "Africa/Lagos",
        dateFormat: settings.dateFormat || "DD/MM/YYYY",
      });
      moderationForm.reset({
        autoApproveCandidates: settings.autoApproveCandidates ?? false,
        autoApproveEmployers: settings.autoApproveEmployers ?? false,
        autoApproveJobs: settings.autoApproveJobs ?? false,
        defaultVisibility: settings.defaultVisibility || "private",
        reviewSlaHours: settings.reviewSlaHours ?? 24,
        flaggedKeywords: settings.flaggedKeywords || "",
      });
      const n = settings.emailNotifications || {};
      notificationsForm.reset({
        newCandidate: n.newCandidate ?? true,
        newEmployer: n.newEmployer ?? true,
        newJob: n.newJob ?? true,
        newApplication: n.newApplication ?? true,
        newIntroRequest: n.newIntroRequest ?? true,
        digestFrequency: settings.digestFrequency || "realtime",
      });
      dataForm.reset({
        auditLogRetention: settings.auditLogRetention || "90",
        deletedRecordsRetention: settings.deletedRecordsRetention || "30",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // ── Scroll spy ──
  useEffect(() => {
    if (isLoading) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        const first = SECTIONS.find((s) => visible.has(s.id));
        if (first) setActiveSection(first.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isLoading]);

  // ── Dirty map ──
  const dirtyMap: Record<SectionId, boolean> = {
    general: generalForm.formState.isDirty,
    moderation: moderationForm.formState.isDirty,
    notifications: notificationsForm.formState.isDirty,
    integrations: false,
    access: false,
    data: dataForm.formState.isDirty,
    maintenance: false,
  };

  // ── Keyboard shortcut (Cmd+S) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const fn = saveHandlers[activeSection];
        if (fn && dirtyMap[activeSection]) fn();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Beforeunload ──
  useEffect(() => {
    const hasUnsaved = Object.values(dirtyMap).some(Boolean);
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  });

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.put("/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => apiClient.post("/admin/maintenance/clear-cache"),
    onSuccess: () => toast.success("Cache cleared successfully."),
    onError: (err: Error) => toast.error(err.message),
  });

  const seedMutation = useMutation({
    mutationFn: () => apiClient.post("/admin/maintenance/seed"),
    onSuccess: () => toast.success("Seed data loaded successfully."),
    onError: (err: Error) => toast.error(err.message),
  });

  const exportMutation = useMutation({
    mutationFn: async ({ type, format }: { type: string; format: string }) => {
      const token = localStorage.getItem("token");
      const baseUrl =
        process.env.NEXT_PUBLIC_TALENT_API_URL ||
        "http://localhost:4002/api/v1";
      const res = await fetch(`${baseUrl}/admin/reports/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("Export downloaded successfully!"),
    onError: (err: Error) => toast.error(err.message),
  });

  const purgeMutation = useMutation({
    mutationFn: () => apiClient.post("/admin/maintenance/purge-audit-logs"),
    onSuccess: () => {
      toast.success("Audit logs purged.");
      setPurgeConfirmText("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetStatsMutation = useMutation({
    mutationFn: () => apiClient.post("/admin/maintenance/reset-statistics"),
    onSuccess: () => {
      toast.success("Statistics reset.");
      setResetConfirmText("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Save handlers ──
  const saveGeneral = generalForm.handleSubmit(async (data) => {
    setSavingSection("general");
    try {
      await saveMutation.mutateAsync(data);
      generalForm.reset(data);
      toast.success("General settings saved!");
    } finally {
      setSavingSection(null);
    }
  });

  const saveModeration = moderationForm.handleSubmit(async (data) => {
    setSavingSection("moderation");
    try {
      await saveMutation.mutateAsync({
        ...data,
        emailNotifications: undefined,
      });
      moderationForm.reset(data);
      toast.success("Moderation settings saved!");
    } finally {
      setSavingSection(null);
    }
  });

  const saveNotifications = notificationsForm.handleSubmit(async (data) => {
    setSavingSection("notifications");
    try {
      const { digestFrequency, ...notifs } = data;
      await saveMutation.mutateAsync({
        emailNotifications: notifs,
        digestFrequency,
      });
      notificationsForm.reset(data);
      toast.success("Notification settings saved!");
    } finally {
      setSavingSection(null);
    }
  });

  const saveData = dataForm.handleSubmit(async (data) => {
    setSavingSection("data");
    try {
      await saveMutation.mutateAsync(data);
      dataForm.reset(data);
      toast.success("Data management settings saved!");
    } finally {
      setSavingSection(null);
    }
  });

  const saveHandlers: Record<SectionId, (() => void) | undefined> = {
    general: saveGeneral,
    moderation: saveModeration,
    notifications: saveNotifications,
    integrations: undefined,
    access: undefined,
    data: saveData,
    maintenance: undefined,
  };

  // ── Navigation ──
  const scrollToSection = useCallback((id: SectionId) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl animate-pulse" />
          <div>
            <div className="h-7 w-32 bg-[var(--surface-2)] rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-[var(--surface-2)] rounded-lg animate-pulse mt-1.5" />
          </div>
        </div>
        <div className="flex gap-8">
          <div className="w-56 shrink-0 hidden lg:block space-y-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-[var(--surface-2)] rounded-xl animate-pulse"
              />
            ))}
          </div>
          <div className="flex-1 space-y-8 max-w-3xl">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div>
        <motion.div
          className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-16 text-center shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--error-light)] flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-[var(--error)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Failed to load settings
          </h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">
            {error instanceof Error
              ? error.message
              : "Something went wrong. Please try again."}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] shadow-md shadow-[var(--primary)]/20 transition-all duration-200"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        className="flex items-center gap-3"
        {...fadeUp}
        transition={{ duration: 0.3 }}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--neutral-gray)]">
            Manage portal configuration and preferences
          </p>
        </div>
      </motion.div>

      {/* ── Layout ── */}
      <div className="flex gap-8">
        {/* ── Left Navigation ── */}
        <nav className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-1">
            {SECTIONS.map((s) => {
              const isActive = activeSection === s.id;
              const isDirty = dirtyMap[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
                    isActive
                      ? "bg-[var(--primary)]/8 text-[var(--primary)]"
                      : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-nav-accent"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--primary)] rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <s.icon
                    size={16}
                    className={
                      isActive
                        ? "text-[var(--primary)]"
                        : "text-[var(--neutral-gray)] group-hover:text-[var(--text-primary)]"
                    }
                  />
                  <span className="text-sm font-medium flex-1">{s.label}</span>
                  {isDirty && (
                    <span className="w-2 h-2 rounded-full bg-[var(--warning)] shrink-0 animate-pulse" />
                  )}
                </button>
              );
            })}

            <div className="mt-6 px-3 py-3 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--neutral-gray)] font-semibold mb-1">
                Quick save
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-1)] rounded border border-[var(--border)] font-mono text-[10px]">
                  ⌘
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-1)] rounded border border-[var(--border)] font-mono text-[10px]">
                  S
                </kbd>
                <span className="text-[var(--neutral-gray)] ml-1">
                  to save section
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Content ── */}
        <div className="flex-1 space-y-10 pb-20 max-w-3xl">
          {/* ════════════════════════════════════════════
              GENERAL SECTION
              ════════════════════════════════════════════ */}
          <section
            ref={(el) => {
              sectionRefs.current.general = el;
            }}
            id="general"
          >
            <motion.div
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"
              {...fadeUp}
              transition={{ duration: 0.3 }}
            >
              <SectionHeader
                icon={Globe}
                title="General"
                description="Portal name, branding, and basic configuration"
              />

              <div className="space-y-5">
                {/* Portal Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Portal Name
                  </label>
                  <Controller
                    name="portalName"
                    control={generalForm.control}
                    render={({ field, fieldState }) => (
                      <>
                        <input
                          {...field}
                          placeholder="Digibit Talent Portal"
                          className={inputClass}
                        />
                        {fieldState.error && (
                          <p className="text-xs text-[var(--error)] mt-1">
                            {fieldState.error.message}
                          </p>
                        )}
                      </>
                    )}
                  />
                </div>

                {/* Portal Description */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Description
                    </label>
                    <span className="text-xs text-[var(--neutral-gray)]">
                      {generalForm.watch("portalDescription")?.length || 0}/500
                    </span>
                  </div>
                  <Controller
                    name="portalDescription"
                    control={generalForm.control}
                    render={({ field, fieldState }) => (
                      <>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="A brief description of the talent portal..."
                          className={`${inputClass} resize-none`}
                          maxLength={500}
                        />
                        {fieldState.error && (
                          <p className="text-xs text-[var(--error)] mt-1">
                            {fieldState.error.message}
                          </p>
                        )}
                      </>
                    )}
                  />
                </div>

                {/* Admin Email */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                    />
                    <Controller
                      name="contactEmail"
                      control={generalForm.control}
                      render={({ field, fieldState }) => (
                        <>
                          <input
                            {...field}
                            type="email"
                            placeholder="admin@digibit.com"
                            className={`${inputClass} pl-10`}
                          />
                          {fieldState.error && (
                            <p className="text-xs text-[var(--error)] mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>

                {/* Brand Color */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <Palette
                      size={14}
                      className="inline mr-1.5 text-[var(--neutral-gray)]"
                    />
                    Brand Color
                  </label>
                  <Controller
                    name="brandColor"
                    control={generalForm.control}
                    render={({ field }) => (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {BRAND_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => field.onChange(color)}
                              className={`w-8 h-8 rounded-lg transition-all duration-200 border-2 ${
                                field.value === color
                                  ? "border-[var(--primary)] scale-110 shadow-md"
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl border border-[var(--border)] shrink-0"
                            style={{
                              backgroundColor: field.value || "#1B7340",
                            }}
                          />
                          <input
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="#1B7340"
                            className={`${inputClass} max-w-[160px] font-mono`}
                          />
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    <Clock
                      size={14}
                      className="inline mr-1.5 text-[var(--neutral-gray)]"
                    />
                    Timezone
                  </label>
                  <Controller
                    name="timezone"
                    control={generalForm.control}
                    render={({ field }) => (
                      <select {...field} className={inputClass}>
                        <option value="">Select timezone...</option>
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Date Format
                  </label>
                  <Controller
                    name="dateFormat"
                    control={generalForm.control}
                    render={({ field }) => (
                      <div className="grid grid-cols-3 gap-3">
                        {DATE_FORMATS.map((fmt) => (
                          <label
                            key={fmt.value}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                              field.value === fmt.value
                                ? "bg-[var(--primary)]/8 border border-[var(--primary)]/20"
                                : "bg-[var(--surface-1)] border border-transparent hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="dateFormat"
                              value={fmt.value}
                              checked={field.value === fmt.value}
                              onChange={() => field.onChange(fmt.value)}
                              className="accent-[var(--primary)]"
                            />
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {fmt.label}
                              </p>
                              <p className="text-xs text-[var(--neutral-gray)]">
                                {fmt.example}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  />
                </div>
              </div>

              <SectionFooter
                onSave={saveGeneral}
                onDiscard={() => generalForm.reset()}
                isSaving={savingSection === "general"}
                isDirty={generalForm.formState.isDirty}
              />
            </motion.div>
          </section>

          {/* ════════════════════════════════════════════
              MODERATION SECTION
              ════════════════════════════════════════════ */}
          <section
            ref={(el) => {
              sectionRefs.current.moderation = el;
            }}
            id="moderation"
          >
            <motion.div
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"
              {...fadeUp}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <SectionHeader
                icon={Shield}
                title="Moderation"
                description="Auto-approval rules, content policies, and review workflows"
              />

              <div className="space-y-6">
                {/* Default Visibility */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Default Profile Visibility
                  </label>
                  <Controller
                    name="defaultVisibility"
                    control={moderationForm.control}
                    render={({ field }) => (
                      <div className="flex gap-2">
                        {["private", "public", "employer_only"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => field.onChange(v)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                              field.value === v
                                ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                                : "border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            {v === "employer_only"
                              ? "Employer Only"
                              : v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>

                {/* Auto-Approve Toggles */}
                <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    Auto-Approve Settings
                  </h4>
                  {(
                    [
                      {
                        name: "autoApproveCandidates" as const,
                        label: "Auto-approve candidate profiles",
                        desc: "New profiles are automatically approved without manual review",
                      },
                      {
                        name: "autoApproveEmployers" as const,
                        label: "Auto-approve employer registrations",
                        desc: "New employer organizations are automatically verified",
                      },
                      {
                        name: "autoApproveJobs" as const,
                        label: "Auto-approve job postings",
                        desc: "New job postings are published without moderation",
                      },
                    ] as const
                  ).map((setting) => (
                    <Controller
                      key={setting.name}
                      name={setting.name}
                      control={moderationForm.control}
                      render={({ field }) => (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {setting.label}
                            </p>
                            <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                              {setting.desc}
                            </p>
                          </div>
                          <ToggleSwitch
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  ))}
                </div>

                {/* Review SLA */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Review SLA (hours)
                  </label>
                  <p className="text-xs text-[var(--neutral-gray)] mb-2">
                    Target time to review new submissions. Alerts fire when overdue.
                  </p>
                  <Controller
                    name="reviewSlaHours"
                    control={moderationForm.control}
                    render={({ field }) => (
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 24)
                        }
                        className={`${inputClass} max-w-[200px]`}
                      />
                    )}
                  />
                </div>

                {/* Flagged Keywords */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Flagged Keywords
                  </label>
                  <p className="text-xs text-[var(--neutral-gray)] mb-2">
                    Comma-separated keywords that trigger content review.
                  </p>
                  <Controller
                    name="flaggedKeywords"
                    control={moderationForm.control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={2}
                        placeholder="spam, scam, inappropriate, ..."
                        className={`${inputClass} resize-none`}
                      />
                    )}
                  />
                </div>
              </div>

              <SectionFooter
                onSave={saveModeration}
                onDiscard={() => moderationForm.reset()}
                isSaving={savingSection === "moderation"}
                isDirty={moderationForm.formState.isDirty}
              />
            </motion.div>
          </section>

          {/* ════════════════════════════════════════════
              NOTIFICATIONS SECTION
              ════════════════════════════════════════════ */}
          <section
            ref={(el) => {
              sectionRefs.current.notifications = el;
            }}
            id="notifications"
          >
            <motion.div
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"
              {...fadeUp}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <SectionHeader
                icon={Bell}
                title="Notifications"
                description="Configure which events trigger admin notifications and how they're delivered"
              />

              <div className="space-y-6">
                {/* Channel Matrix */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Notification Channels
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--surface-1)]">
                          <th className="text-left py-3 px-4 font-medium text-[var(--neutral-gray)]">
                            Event
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-[var(--neutral-gray)]">
                            <span className="inline-flex items-center gap-1">
                              <Mail size={13} /> Email
                            </span>
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-[var(--neutral-gray)]">
                            <span className="inline-flex items-center gap-1">
                              <Bell size={13} /> In-App
                            </span>
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-[var(--neutral-gray)]">
                            <span className="inline-flex items-center gap-1 opacity-50">
                              <Zap size={13} /> Slack
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {NOTIFICATION_EVENTS.map((event) => (
                          <tr
                            key={event.key}
                            className="hover:bg-[var(--surface-1)] transition-colors"
                          >
                            <td className="py-3 px-4">
                              <p className="font-medium text-[var(--text-primary)]">
                                {event.label}
                              </p>
                              <p className="text-xs text-[var(--neutral-gray)]">
                                {event.desc}
                              </p>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Controller
                                name={event.key}
                                control={notificationsForm.control}
                                render={({ field }) => (
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={(e) =>
                                      field.onChange(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/20 accent-[var(--primary)] cursor-pointer"
                                  />
                                )}
                              />
                            </td>
                            <td className="text-center py-3 px-4">
                              <input
                                type="checkbox"
                                checked
                                disabled
                                className="w-4 h-4 rounded opacity-60 accent-[var(--primary)]"
                              />
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className="text-[10px] font-medium text-[var(--neutral-gray)] bg-[var(--surface-2)] px-2 py-1 rounded-md">
                                Soon
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Email Digest Frequency */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Email Digest Frequency
                  </h4>
                  <Controller
                    name="digestFrequency"
                    control={notificationsForm.control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-3">
                        {DIGEST_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
                              field.value === opt.value
                                ? "bg-[var(--primary)]/8 border border-[var(--primary)]/20"
                                : "bg-[var(--surface-1)] border border-transparent hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="digestFrequency"
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                              className="accent-[var(--primary)]"
                            />
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {opt.label}
                              </p>
                              <p className="text-xs text-[var(--neutral-gray)]">
                                {opt.desc}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  />
                </div>

                {/* Test Notification */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Test Notification
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                        Send a test notification to verify your configuration.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.success("Test notification sent!")}
                      className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] rounded-xl text-sm font-medium transition-colors"
                    >
                      <Send size={14} /> Send Test
                    </button>
                  </div>
                </div>
              </div>

              <SectionFooter
                onSave={saveNotifications}
                onDiscard={() => notificationsForm.reset()}
                isSaving={savingSection === "notifications"}
                isDirty={notificationsForm.formState.isDirty}
              />
            </motion.div>
          </section>

          {/* ════════════════════════════════════════════
              INTEGRATIONS SECTION
              ════════════════════════════════════════════ */}
          <section
            ref={(el) => {
              sectionRefs.current.integrations = el;
            }}
            id="integrations"
          >
            <motion.div
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"
              {...fadeUp}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <SectionHeader
                icon={Link2}
                title="Integrations"
                description="API keys, webhook management, and third-party connections"
              />

              <div className="space-y-6">
                {/* API Key */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    API Key
                  </h4>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                    <Key
                      size={18}
                      className="text-[var(--neutral-gray)] shrink-0"
                    />
                    <code className="text-sm text-[var(--text-primary)] flex-1 font-mono truncate">
                      {showApiKey
                        ? apiKeyDisplay
                        : "sk-dbt-••••••••-••••-••••-••••-••••••••••••"}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                      title={showApiKey ? "Hide" : "Show"}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKeyDisplay);
                        toast.success("API key copied to clipboard");
                      }}
                      className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        toast.info(
                          "API key regeneration requires confirmation via email"
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--error)] border border-[var(--error)]/20 hover:bg-[var(--error-light)] rounded-lg transition-colors"
                    >
                      <RefreshCw size={12} /> Regenerate Key
                    </button>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      Regenerating will invalidate the current key immediately.
                    </p>
                  </div>
                </div>

                {/* Webhooks */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Webhooks
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info("Webhook management coming soon")
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/5 rounded-lg transition-colors"
                    >
                      <Plus size={12} /> Add Webhook
                    </button>
                  </div>
                  <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
                    <Link2
                      size={32}
                      className="mx-auto text-[var(--surface-4)] mb-2"
                    />
                    <p className="text-sm text-[var(--neutral-gray)]">
                      No webhooks configured yet
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)] mt-1">
                      Add a webhook to receive real-time event notifications
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ════════════════════════════════════════════
              ACCESS CONTROL SECTION
              ════════════════════════════════════════════ */}
          <section
            ref={(el) => {
              sectionRefs.current.access = el;
            }}
            id="access"
          >
            <motion.div
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"
              {...fadeUp}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <SectionHeader
                icon={Users}
                title="Access Control"
                description="Role definitions and permission management"
              />

              <div className="space-y-6">
                {/* Roles */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Roles
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLES.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200 ${
                          selectedRole === role.id
                            ? "bg-[var(--primary)]/8 border border-[var(--primary)]/20 shadow-sm"
                            : "bg-[var(--surface-1)] border border-transparent hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {role.name}
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)] truncate">
                            {role.desc}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-[var(--neutral-gray)] bg-[var(--surface-1)] px-2 py-1 rounded-lg border border-[var(--border)] shrink-0">
                          {role.users} users
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permission Matrix */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Permission Matrix —{" "}
                      <span className="text-[var(--primary)]">
                        {ROLES.find((r) => r.id === selectedRole)?.name}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info("Role editing coming in a future update")
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/5 rounded-lg transition-colors"
                    >
                      <Lock size={12} /> Edit Role
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--surface-1)]">
                          <th className="text-left py-3 px-4 font-medium text-[var(--neutral-gray)]">
                            Resource
                          </th>
                          {PERM_ACTIONS.map((a) => (
                            <th
                              key={a}
                              className="text-center py-3 px-3 font-medium text-[var(--neutral-gray)] text-xs"
                            >
                              {a}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {PERM_RESOURCES.map((r) => (
                          <tr
                            key={r}
                            className="hover:bg-[var(--surface-1)] transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                              {r}
                            </td>
                            {PERM_ACTIONS.map((a) => {
                              const has =
                                ROLE_PERMISSIONS[selectedRole]?.[`${r}.${a}`];
                              return (
                                <td key={a} className="text-center py-3 px-3">
                                  {has ? (
                                    <CheckCircle2
                                      size={16}
                                      className="text-[var(--success)] mx-auto"
                                    />
                                  ) : (
                                    <XCircle
                                      size={16}
                                      className="text-[var(--surface-4)] mx-auto"
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ════════════════════════════════════════════
              DATA MANAGEMENT SECTION
              ════════════════════════════════════════════ */}
          <section
            ref={(el) => {
              sectionRefs.current.data = el;
            }}
            id="data"
          >
            <motion.div
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"
              {...fadeUp}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <SectionHeader
                icon={Database}
                title="Data Management"
                description="Export center, data retention policies, and GDPR tools"
              />

              <div className="space-y-6">
                {/* Export Center */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Export Center
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {EXPORT_TYPES.map((type) => (
                      <div
                        key={type.key}
                        className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors group"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <type.icon
                            size={16}
                            className="text-[var(--neutral-gray)] group-hover:text-[var(--primary)] transition-colors"
                          />
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {type.label}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              exportMutation.mutate({
                                type: type.key,
                                format: "csv",
                              })
                            }
                            disabled={exportMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Download size={11} /> CSV
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toast.info("JSON export coming soon")
                            }
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--neutral-gray)] border border-[var(--border)] hover:bg-[var(--surface-2)] rounded-lg transition-colors opacity-60"
                          >
                            <Download size={11} /> JSON
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Retention */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Data Retention Policies
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                        Audit Log Retention
                      </label>
                      <Controller
                        name="auditLogRetention"
                        control={dataForm.control}
                        render={({ field }) => (
                          <select {...field} className={inputClass}>
                            {RETENTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                        Deleted Records Retention
                      </label>
                      <Controller
                        name="deletedRecordsRetention"
                        control={dataForm.control}
                        render={({ field }) => (
                          <select {...field} className={inputClass}>
                            {RETENTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="rounded-xl border-2 border-[var(--error)]/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-[var(--error-light)]">
                      <AlertTriangle
                        size={16}
                        className="text-[var(--error)]"
                      />
                      <h4 className="text-sm font-semibold text-[var(--error-dark)]">
                        Danger Zone
                      </h4>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Purge Audit Logs */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface-1)]">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            Purge Audit Logs
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                            Permanently delete all audit logs older than the
                            retention period.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="text"
                            value={purgeConfirmText}
                            onChange={(e) =>
                              setPurgeConfirmText(e.target.value)
                            }
                            placeholder='Type "PURGE" to confirm'
                            className="px-3 py-2 text-xs border border-[var(--border)] rounded-lg w-40 focus:outline-none focus:border-[var(--error)] focus:ring-1 focus:ring-[var(--error)]/20"
                          />
                          <button
                            type="button"
                            disabled={
                              purgeConfirmText !== "PURGE" ||
                              purgeMutation.isPending
                            }
                            onClick={() => purgeMutation.mutate()}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[var(--error)] hover:bg-[var(--error-dark)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {purgeMutation.isPending ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Purge
                          </button>
                        </div>
                      </div>

                      {/* Reset Statistics */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface-1)]">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            Reset Platform Statistics
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                            Reset all counters and statistics. This cannot be
                            undone.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="text"
                            value={resetConfirmText}
                            onChange={(e) =>
                              setResetConfirmText(e.target.value)
                            }
                            placeholder='Type "RESET" to confirm'
                            className="px-3 py-2 text-xs border border-[var(--border)] rounded-lg w-40 focus:outline-none focus:border-[var(--error)] focus:ring-1 focus:ring-[var(--error)]/20"
                          />
                          <button
                            type="button"
                            disabled={
                              resetConfirmText !== "RESET" ||
                              resetStatsMutation.isPending
                            }
                            onClick={() => resetStatsMutation.mutate()}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[var(--error)] hover:bg-[var(--error-dark)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {resetStatsMutation.isPending ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <SectionFooter
                onSave={saveData}
                onDiscard={() => dataForm.reset()}
                isSaving={savingSection === "data"}
                isDirty={dataForm.formState.isDirty}
              />
            </motion.div>
          </section>

          {/* ════════════════════════════════════════════
              MAINTENANCE SECTION
              ════════════════════════════════════════════ */}
          <section
            ref={(el) => {
              sectionRefs.current.maintenance = el;
            }}
            id="maintenance"
          >
            <motion.div
              className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm"
              {...fadeUp}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <SectionHeader
                icon={Wrench}
                title="Maintenance"
                description="System health monitoring, cache management, and scheduled tasks"
              />

              <div className="space-y-6">
                {/* System Health */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    System Health
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "API Status",
                        value: "Healthy",
                        icon: Activity,
                        color: "text-[var(--success)]",
                        bg: "bg-[var(--success-light)]",
                        dot: "bg-[var(--success)]",
                      },
                      {
                        label: "Database",
                        value: "Connected",
                        icon: HardDrive,
                        color: "text-[var(--success)]",
                        bg: "bg-[var(--success-light)]",
                        dot: "bg-[var(--success)]",
                      },
                      {
                        label: "Job Queue",
                        value: "0 pending",
                        icon: Zap,
                        color: "text-[var(--success)]",
                        bg: "bg-[var(--success-light)]",
                        dot: "bg-[var(--success)]",
                      },
                      {
                        label: "Storage",
                        value: "12% used",
                        icon: Database,
                        color: "text-[var(--primary)]",
                        bg: "bg-[var(--primary)]/8",
                        dot: "bg-[var(--primary)]",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <item.icon
                            size={14}
                            className="text-[var(--neutral-gray)]"
                          />
                          <span className="text-xs font-medium text-[var(--neutral-gray)]">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${item.dot} animate-pulse`}
                          />
                          <span className={`text-sm font-semibold ${item.color}`}>
                            {item.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cache Management */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Cache Management
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        label: "API Response Cache",
                        desc: "Clear server-side response caches and force fresh data",
                        icon: RefreshCw,
                        action: () => clearCacheMutation.mutate(),
                        loading: clearCacheMutation.isPending,
                      },
                      {
                        label: "Search Index",
                        desc: "Rebuild the search index for candidates, jobs, and employers",
                        icon: Activity,
                        action: () =>
                          toast.success("Search index rebuild started"),
                        loading: false,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[var(--warning-light)] flex items-center justify-center shrink-0">
                            <item.icon
                              size={16}
                              className="text-[var(--warning-dark)]"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {item.label}
                            </p>
                            <p className="text-xs text-[var(--neutral-gray)]">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={item.action}
                          disabled={item.loading}
                          className="flex items-center gap-2 px-4 py-2 border border-[var(--warning)]/30 text-[var(--warning-dark)] hover:bg-[var(--warning-light)] rounded-xl text-sm font-medium disabled:opacity-60 transition-colors shrink-0"
                        >
                          {item.loading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Clear
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seed Data */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Seed Sample Data
                        </p>
                        <p className="text-xs text-[var(--neutral-gray)]">
                          Load sample data for testing and development
                          environments.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-xl text-sm font-medium disabled:opacity-60 transition-colors shrink-0"
                    >
                      {seedMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Database size={14} />
                      )}
                      Load Seed Data
                    </button>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-[var(--warning-light)] rounded-xl border border-[var(--warning)]/20 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={16}
                      className="text-[var(--warning-dark)] mt-0.5 shrink-0"
                    />
                    <p className="text-sm text-[var(--warning-dark)]">
                      Maintenance operations can affect live data. Use with
                      caution in production environments.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}
