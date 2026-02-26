"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Mail,
  Clock,
  Save,
  Loader2,
  ArrowLeft,
  Smartphone,
  AlertCircle,
  Zap,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationChannel,
  type EmailDigestFrequency,
} from "@/hooks/use-notification-preferences";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const NOTIFICATION_GROUPS: {
  title: string;
  items: { key: string; label: string; description: string }[];
}[] = [
  {
    title: "Profile Updates",
    items: [
      {
        key: "profile_approved",
        label: "Profile Approved",
        description: "When your candidate profile is approved by admin.",
      },
      {
        key: "profile_needs_update",
        label: "Profile Needs Update",
        description: "When admin requests changes to your profile.",
      },
      {
        key: "profile_suspended",
        label: "Profile Suspended",
        description: "When your profile is suspended.",
      },
    ],
  },
  {
    title: "Introductions",
    items: [
      {
        key: "intro_requested",
        label: "Intro Requested",
        description: "When an employer requests an introduction.",
      },
      {
        key: "intro_approved",
        label: "Intro Approved",
        description: "When an intro request is approved by admin.",
      },
      {
        key: "intro_declined",
        label: "Intro Declined",
        description: "When an intro request is declined.",
      },
      {
        key: "intro_response",
        label: "Candidate Response",
        description: "When a candidate responds to an intro request.",
      },
    ],
  },
  {
    title: "Jobs & Applications",
    items: [
      {
        key: "job_published",
        label: "Job Published",
        description: "When a job posting is approved and published.",
      },
      {
        key: "job_rejected",
        label: "Job Rejected",
        description: "When a job posting is rejected by admin.",
      },
      {
        key: "application_received",
        label: "Application Received",
        description: "When a new job application is submitted.",
      },
    ],
  },
  {
    title: "Organization & System",
    items: [
      {
        key: "employer_verified",
        label: "Employer Verified",
        description: "When an employer organization is verified.",
      },
      {
        key: "employer_rejected",
        label: "Employer Rejected",
        description: "When an employer registration is rejected.",
      },
      {
        key: "placement_update",
        label: "Placement Update",
        description: "When there's an update on a placement record.",
      },
      {
        key: "new_candidate",
        label: "New Candidate",
        description: "When a new candidate registers on the platform.",
      },
      {
        key: "new_employer",
        label: "New Employer",
        description: "When a new employer registers on the platform.",
      },
      {
        key: "system_alert",
        label: "System Alerts",
        description: "Important system-level notifications.",
      },
    ],
  },
];

const CHANNEL_OPTIONS: {
  value: NotificationChannel;
  label: string;
  icon: typeof Mail;
  color: string;
}[] = [
  { value: "both", label: "All", icon: CheckCircle2, color: "text-[var(--success)]" },
  { value: "in_app", label: "In-App", icon: Bell, color: "text-[var(--primary)]" },
  { value: "email", label: "Email", icon: Mail, color: "text-[var(--warning-dark)]" },
  { value: "none", label: "Off", icon: AlertCircle, color: "text-[var(--neutral-gray)]" },
];

const DIGEST_OPTIONS: {
  value: EmailDigestFrequency;
  label: string;
  description: string;
  icon: typeof Zap;
}[] = [
  {
    value: "immediate",
    label: "Immediate",
    description: "Send each notification email as it happens",
    icon: Zap,
  },
  {
    value: "daily",
    label: "Daily Digest",
    description: "One summary email every morning at 8 AM",
    icon: Clock,
  },
  {
    value: "weekly",
    label: "Weekly Digest",
    description: "One summary email every Monday at 8 AM",
    icon: Clock,
  },
  {
    value: "none",
    label: "No Emails",
    description: "Only receive in-app notifications",
    icon: Bell,
  },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Bell;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[var(--border)]">
      <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
        <Icon size={14} className="text-[var(--primary)]" />
      </div>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
    </div>
  );
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const { data: prefs, isLoading, isError, refetch } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const [preferences, setPreferences] = useState<
    Record<string, NotificationChannel>
  >({});
  const [emailDigest, setEmailDigest] =
    useState<EmailDigestFrequency>("immediate");
  const [quietHoursStart, setQuietHoursStart] = useState("");
  const [quietHoursEnd, setQuietHoursEnd] = useState("");
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false);

  useEffect(() => {
    if (prefs) {
      setPreferences(prefs.preferences || {});
      setEmailDigest(prefs.emailDigest || "immediate");
      setQuietHoursStart(prefs.quietHoursStart || "");
      setQuietHoursEnd(prefs.quietHoursEnd || "");
      setBrowserPushEnabled(prefs.browserPushEnabled || false);
    }
  }, [prefs]);

  const handleSave = () => {
    updatePrefs.mutate({
      preferences,
      emailDigest,
      quietHoursStart: quietHoursStart || undefined,
      quietHoursEnd: quietHoursEnd || undefined,
      browserPushEnabled,
    });
  };

  const handleRequestBrowserPush = async () => {
    if (!("Notification" in window)) {
      toast.error("Your browser does not support push notifications");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setBrowserPushEnabled(true);
      toast.success("Browser push notifications enabled");
    } else {
      toast.error("Push notification permission denied");
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:bg-[var(--surface-1)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all duration-200 outline-none";

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl animate-pulse" />
          <div>
            <div className="h-7 w-56 bg-[var(--surface-2)] rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-[var(--surface-2)] rounded-lg animate-pulse mt-1.5" />
          </div>
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-48 bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ── Error state ──
  if (isError) {
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
            Failed to load preferences
          </h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">
            Something went wrong loading your notification preferences.
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
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ── */}
      <motion.div
        className="flex items-center gap-3"
        {...fadeUp}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/admin/settings"
          className="p-2.5 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-all duration-200"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Notification Preferences
          </h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
            Control how and when you receive notifications
          </p>
        </div>
      </motion.div>

      {/* ── Per-type preferences (grouped) ── */}
      {NOTIFICATION_GROUPS.map((group, groupIdx) => (
        <motion.div
          key={group.title}
          className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.05 * groupIdx }}
        >
          <SectionHeader icon={Bell} title={group.title} />
          <div className="divide-y divide-[var(--border)]">
            {group.items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-6 py-4 hover:bg-[var(--surface-1)] transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {CHANNEL_OPTIONS.map((opt) => {
                    const isActive =
                      (preferences[item.key] || "both") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setPreferences((prev) => ({
                            ...prev,
                            [item.key]: opt.value,
                          }))
                        }
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                            : "text-[var(--neutral-gray)] border border-transparent hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <opt.icon size={12} />
                        <span className="hidden sm:inline">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* ── Email Digest ── */}
      <motion.div
        className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <SectionHeader icon={Mail} title="Email Digest Frequency" />
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {DIGEST_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  emailDigest === opt.value
                    ? "bg-[var(--primary)]/8 border border-[var(--primary)]/20 shadow-sm"
                    : "bg-[var(--surface-1)] border border-transparent hover:bg-[var(--surface-2)]"
                }`}
              >
                <input
                  type="radio"
                  name="emailDigest"
                  value={opt.value}
                  checked={emailDigest === opt.value}
                  onChange={() => setEmailDigest(opt.value)}
                  className="accent-[var(--primary)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <opt.icon size={13} className="text-[var(--neutral-gray)]" />
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {opt.label}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--neutral-gray)] mt-0.5 ml-[19px]">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Quiet Hours ── */}
      <motion.div
        className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <SectionHeader icon={Clock} title="Quiet Hours" />
        <div className="p-6">
          <p className="text-xs text-[var(--neutral-gray)] mb-4">
            During quiet hours, notifications will be silently queued and
            delivered afterward.
          </p>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1.5">
                From
              </label>
              <input
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <span className="text-[var(--neutral-gray)] mt-5 font-medium">
              to
            </span>
            <div>
              <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1.5">
                Until
              </label>
              <input
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Browser Push ── */}
      <motion.div
        className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <SectionHeader icon={Smartphone} title="Browser Push Notifications" />
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Desktop push notifications
              </p>
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                Receive browser notifications even when the tab is not focused.
              </p>
            </div>
            <button
              onClick={handleRequestBrowserPush}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                browserPushEnabled
                  ? "bg-[var(--success-light)] text-[var(--success-dark)] border border-[var(--success)]/20"
                  : "bg-[var(--surface-1)] text-[var(--neutral-gray)] border border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              }`}
            >
              {browserPushEnabled ? (
                <>
                  <CheckCircle2 size={14} /> Enabled
                </>
              ) : (
                <>
                  <Smartphone size={14} /> Enable
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Save ── */}
      <motion.div
        className="flex justify-end pb-8"
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <button
          onClick={handleSave}
          disabled={updatePrefs.isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--secondary)] disabled:opacity-60 shadow-md shadow-[var(--primary)]/20 hover:shadow-lg hover:shadow-[var(--primary)]/25 transition-all duration-200"
        >
          {updatePrefs.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Preferences
        </button>
      </motion.div>
    </div>
  );
}
