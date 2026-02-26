"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Bell,
  Shield,
  Globe,
  Lock,
  Building2,
  Check,
  Loader2,
  AlertCircle,
  BellOff,
  Mail,
  Briefcase,
  Search,
  BarChart3,
  UserCircle,
  Trash2,
  CalendarDays,
  LogIn,
  BadgeCheck,
  Info,
  RotateCcw,
} from "lucide-react";
import { Switch, Button } from "@digibit/ui/components";
import { useMyProfile, useMySettings, useUpdateSettings } from "@/hooks/use-candidates";
import { useMyConsents, useGrantConsent } from "@/hooks/use-candidates";
import { AnimatedCard } from "@/components/shared/animated-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  easings,
  durations,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/motion-variants";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type Visibility = "public" | "private" | "employer_only";

type SectionId = "privacy" | "notifications" | "consent" | "account";

interface NotificationPrefs {
  introRequests: boolean;
  applicationUpdates: boolean;
  jobMatches: boolean;
  profileViews: boolean;
  weeklyDigest: boolean;
}

interface ConsentState {
  dataProcessing: boolean;
  publicListing: boolean;
  ndaAcknowledgement: boolean;
}

// ──────────────────────────────────────────────
// Section nav config
// ──────────────────────────────────────────────

const sections: { id: SectionId; label: string; icon: typeof Eye }[] = [
  { id: "privacy", label: "Privacy & Visibility", icon: Eye },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "consent", label: "Data & Consent", icon: Shield },
  { id: "account", label: "Account", icon: UserCircle },
];

// ──────────────────────────────────────────────
// Visibility cards config
// ──────────────────────────────────────────────

const visibilityOptions: {
  value: Visibility;
  label: string;
  description: string;
  icon: typeof Globe;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can discover your profile",
    icon: Globe,
  },
  {
    value: "employer_only",
    label: "Employers Only",
    description: "Only verified employers can view",
    icon: Building2,
  },
  {
    value: "private",
    label: "Private",
    description: "Only you and platform admins",
    icon: Lock,
  },
];

// ──────────────────────────────────────────────
// Notification rows config
// ──────────────────────────────────────────────

const notificationGroups: {
  category: string;
  items: {
    key: keyof NotificationPrefs;
    label: string;
    description: string;
    icon: typeof Mail;
  }[];
}[] = [
  {
    category: "Activity",
    items: [
      {
        key: "introRequests",
        label: "Intro request notifications",
        description: "Get notified when an employer sends an intro request",
        icon: Mail,
      },
      {
        key: "applicationUpdates",
        label: "Application updates",
        description: "Receive updates when your application status changes",
        icon: Briefcase,
      },
    ],
  },
  {
    category: "Discovery",
    items: [
      {
        key: "jobMatches",
        label: "New job matches",
        description: "Get notified about new jobs matching your profile",
        icon: Search,
      },
      {
        key: "profileViews",
        label: "Profile view alerts",
        description: "Know when someone views your profile",
        icon: Eye,
      },
    ],
  },
  {
    category: "Digest",
    items: [
      {
        key: "weeklyDigest",
        label: "Weekly summary email",
        description: "Receive a weekly summary of activity and opportunities",
        icon: BarChart3,
      },
    ],
  },
];

// ──────────────────────────────────────────────
// Consent cards config
// ──────────────────────────────────────────────

const consentConfig: {
  key: keyof ConsentState;
  type: string;
  label: string;
  description: string;
  required: boolean;
}[] = [
  {
    key: "dataProcessing",
    type: "data_processing",
    label: "Data Processing Consent",
    description:
      "Allow Digibit to process your personal data for talent matching services. This is required for the platform to function.",
    required: true,
  },
  {
    key: "publicListing",
    type: "public_listing",
    label: "Public Listing Consent",
    description:
      "Allow your profile to appear in the public talent directory so employers can discover you.",
    required: false,
  },
  {
    key: "ndaAcknowledgement",
    type: "nda_acknowledgement",
    label: "NDA Acknowledgement",
    description:
      "Acknowledge the non-disclosure agreement for sensitive employer data you may access during the hiring process.",
    required: false,
  },
];

// ──────────────────────────────────────────────
// Skeleton components
// ──────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[var(--surface-2)]",
        className
      )}
    />
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <SkeletonBlock className="h-8 w-48 mb-2" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <div className="flex gap-8">
        {/* Side nav skeleton */}
        <div className="hidden lg:block w-56 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="h-10 w-full" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="flex-1 space-y-6">
          <SkeletonBlock className="h-48 w-full rounded-xl" />
          <SkeletonBlock className="h-32 w-full rounded-xl" />
          <SkeletonBlock className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export default function SettingsPage() {
  const { data: profile, isLoading: profileLoading, isError: profileError } = useMyProfile();
  const { data: settings, isLoading: settingsLoading } = useMySettings();
  const { data: consents, isLoading: consentsLoading } = useMyConsents();
  const updateSettings = useUpdateSettings();
  const grantConsent = useGrantConsent();

  // ── Active section ──
  const [activeSection, setActiveSection] = useState<SectionId>("privacy");
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    privacy: null,
    notifications: null,
    consent: null,
    account: null,
  });

  // ── Form state ──
  const [visibility, setVisibility] = useState<Visibility>("employer_only");
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    introRequests: true,
    applicationUpdates: true,
    jobMatches: false,
    profileViews: false,
    weeklyDigest: true,
  });
  const [pauseAll, setPauseAll] = useState(false);
  const [consentState, setConsentState] = useState<ConsentState>({
    dataProcessing: true,
    publicListing: true,
    ndaAcknowledgement: false,
  });

  // ── Saved state tracking (for dirty detection) ──
  const [savedVisibility, setSavedVisibility] = useState<Visibility>("employer_only");
  const [savedNotifications, setSavedNotifications] = useState<NotificationPrefs>({
    introRequests: true,
    applicationUpdates: true,
    jobMatches: false,
    profileViews: false,
    weeklyDigest: true,
  });
  const [savedConsent, setSavedConsent] = useState<ConsentState>({
    dataProcessing: true,
    publicListing: true,
    ndaAcknowledgement: false,
  });

  // ── Delete account dialog ──
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ── Save result state ──
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load settings data ──
  useEffect(() => {
    if (settings) {
      const vis = (settings as any).visibilityLevel ?? "employer_only";
      setVisibility(vis);
      setSavedVisibility(vis);

      const prefs = (settings as any).notificationPreferences;
      if (prefs) {
        const loaded: NotificationPrefs = {
          introRequests: prefs.notifyIntroRequests ?? true,
          applicationUpdates: prefs.notifyApplicationUpdates ?? true,
          jobMatches: prefs.notifyJobMatches ?? false,
          profileViews: prefs.notifyProfileViews ?? false,
          weeklyDigest: prefs.notifyWeeklyDigest ?? true,
        };
        setNotifications(loaded);
        setSavedNotifications(loaded);
      }
    }
  }, [settings]);

  // ── Load consent data ──
  useEffect(() => {
    if (consents) {
      const find = (type: string) => consents.find((c) => c.consentType === type);
      const dp = find("data_processing");
      const pl = find("public_listing");
      const nda = find("nda_acknowledgement");
      const loaded: ConsentState = {
        dataProcessing: dp?.granted ?? true,
        publicListing: pl?.granted ?? true,
        ndaAcknowledgement: nda?.granted ?? false,
      };
      setConsentState(loaded);
      setSavedConsent(loaded);
    }
  }, [consents]);

  // ── Dirty detection ──
  const isDirty = useMemo(() => {
    const visChanged = visibility !== savedVisibility;
    const notifChanged =
      notifications.introRequests !== savedNotifications.introRequests ||
      notifications.applicationUpdates !== savedNotifications.applicationUpdates ||
      notifications.jobMatches !== savedNotifications.jobMatches ||
      notifications.profileViews !== savedNotifications.profileViews ||
      notifications.weeklyDigest !== savedNotifications.weeklyDigest;
    const consentChanged =
      consentState.dataProcessing !== savedConsent.dataProcessing ||
      consentState.publicListing !== savedConsent.publicListing ||
      consentState.ndaAcknowledgement !== savedConsent.ndaAcknowledgement;
    return { any: visChanged || notifChanged || consentChanged, visChanged, notifChanged, consentChanged };
  }, [visibility, savedVisibility, notifications, savedNotifications, consentState, savedConsent]);

  // ── Beforeunload warning ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.any) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty.any]);

  // ── Scroll to section ──
  const scrollToSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ── Intersection observer for active section ──
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const section of sections) {
      const el = sectionRefs.current[section.id];
      if (!el) continue;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(section.id);
          }
        },
        { threshold: 0.3, rootMargin: "-80px 0px -50% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [profileLoading, settingsLoading, consentsLoading]);

  // ── Notification toggle helpers ──
  const toggleNotification = useCallback((key: keyof NotificationPrefs) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handlePauseAll = useCallback(
    (paused: boolean) => {
      setPauseAll(paused);
      if (paused) {
        setNotifications({
          introRequests: false,
          applicationUpdates: false,
          jobMatches: false,
          profileViews: false,
          weeklyDigest: false,
        });
      } else {
        setNotifications(savedNotifications);
      }
    },
    [savedNotifications]
  );

  // ── Consent toggle ──
  const toggleConsent = useCallback((key: keyof ConsentState) => {
    setConsentState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Discard changes ──
  const handleDiscard = useCallback(() => {
    setVisibility(savedVisibility);
    setNotifications(savedNotifications);
    setConsentState(savedConsent);
    setPauseAll(false);
    setSaveError(null);
  }, [savedVisibility, savedNotifications, savedConsent]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateSettings.mutateAsync({
        visibilityLevel: visibility,
        notifyIntroRequests: notifications.introRequests,
        notifyApplicationUpdates: notifications.applicationUpdates,
        notifyJobMatches: notifications.jobMatches,
      });
    } catch {
      setSaveError("Failed to save settings. Please try again.");
      toast.error("Failed to save settings.");
      return;
    }

    try {
      await Promise.all([
        grantConsent.mutateAsync({ consentType: "data_processing", granted: consentState.dataProcessing }),
        grantConsent.mutateAsync({ consentType: "public_listing", granted: consentState.publicListing }),
        grantConsent.mutateAsync({ consentType: "nda_acknowledgement", granted: consentState.ndaAcknowledgement }),
      ]);
    } catch {
      setSaveError("Settings saved, but consent update failed. Please try again.");
      toast.error("Consent update failed.");
      // Still mark settings as saved
      setSavedVisibility(visibility);
      setSavedNotifications({ ...notifications });
      return;
    }

    // All succeeded
    setSavedVisibility(visibility);
    setSavedNotifications({ ...notifications });
    setSavedConsent({ ...consentState });
    setSaveSuccess(true);
    toast.success("Settings saved successfully.");
    setTimeout(() => setSaveSuccess(false), 2000);
  }, [visibility, notifications, consentState, updateSettings, grantConsent]);

  const isSaving = updateSettings.isPending || grantConsent.isPending;

  // ── Loading ──
  if (profileLoading || settingsLoading || consentsLoading) {
    return <SettingsSkeleton />;
  }

  // ── Error ──
  if (profileError) {
    return (
      <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
        <h3 className="font-semibold text-[var(--foreground)] mb-1">
          Failed to load settings
        </h3>
        <p className="text-sm text-[var(--neutral-gray)]">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">
          Manage your profile visibility, notifications, and data preferences.
        </p>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 py-3"
          >
            <AlertCircle size={18} className="text-[var(--error)] shrink-0" />
            <p className="text-sm text-[var(--error)] flex-1">{saveError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              leftIcon={<RotateCcw size={14} />}
            >
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout: side nav + content */}
      <div className="flex gap-8">
        {/* Side navigation — desktop only */}
        <nav className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const hasDot =
                (section.id === "privacy" && isDirty.visChanged) ||
                (section.id === "notifications" && isDirty.notifChanged) ||
                (section.id === "consent" && isDirty.consentChanged);

              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                    isActive
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon size={18} />
                  <span className="flex-1">{section.label}</span>
                  {hasDot && (
                    <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <motion.div
          className="flex-1 min-w-0 space-y-8"
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ─── Privacy & Visibility ─── */}
          <motion.section
            variants={staggerItemVariants}
            ref={(el) => { sectionRefs.current.privacy = el; }}
          >
            <div className="bg-[var(--surface-1)] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                  <Eye size={18} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">
                    Privacy & Visibility
                  </h2>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    Control who can see your profile
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = visibility === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => setVisibility(option.value)}
                      className={cn(
                        "relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-colors",
                        selected
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--neutral-gray)]/40"
                      )}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2, ease: easings.expoOut }}
                    >
                      {/* Selection indicator */}
                      <AnimatePresence>
                        {selected && (
                          <motion.div
                            layoutId="visibility-indicator"
                            className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <Check size={12} className="text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                          selected
                            ? "bg-[var(--primary)]/10"
                            : "bg-[var(--surface-2)]"
                        )}
                      >
                        <Icon
                          size={24}
                          className={cn(
                            selected
                              ? "text-[var(--primary)]"
                              : "text-[var(--neutral-gray)]"
                          )}
                        />
                      </div>

                      <div>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            selected
                              ? "text-[var(--primary)]"
                              : "text-[var(--foreground)]"
                          )}
                        >
                          {option.label}
                        </p>
                        <p className="text-xs text-[var(--neutral-gray)] mt-1">
                          {option.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* ─── Notifications ─── */}
          <motion.section
            variants={staggerItemVariants}
            ref={(el) => { sectionRefs.current.notifications = el; }}
          >
            <div className="bg-[var(--surface-1)] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                  <Bell size={18} className="text-[var(--warning)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">
                    Notifications
                  </h2>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    Choose what updates you receive
                  </p>
                </div>
              </div>

              {/* Pause all toggle */}
              <div className="mt-6 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <BellOff size={18} className="text-[var(--neutral-gray)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Pause all notifications
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      Temporarily disable all notification types
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pauseAll}
                  onCheckedChange={handlePauseAll}
                  disabled={isSaving}
                />
              </div>

              {/* Grouped notification preferences */}
              <div className="mt-6 space-y-6">
                {notificationGroups.map((group) => (
                  <div key={group.category}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-3">
                      {group.category}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.key}
                            className="flex items-center justify-between rounded-lg bg-[var(--surface-0)] px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                size={18}
                                className={cn(
                                  notifications[item.key]
                                    ? "text-[var(--primary)]"
                                    : "text-[var(--neutral-gray)]"
                                )}
                              />
                              <div>
                                <p className="text-sm font-medium text-[var(--foreground)]">
                                  {item.label}
                                </p>
                                <p className="text-xs text-[var(--neutral-gray)]">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={notifications[item.key]}
                              onCheckedChange={() => toggleNotification(item.key)}
                              disabled={isSaving || pauseAll}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ─── Data & Consent ─── */}
          <motion.section
            variants={staggerItemVariants}
            ref={(el) => { sectionRefs.current.consent = el; }}
          >
            <div className="bg-[var(--surface-1)] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--success)]/10">
                  <Shield size={18} className="text-[var(--success)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">
                    Data & Consent
                  </h2>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    Manage your data processing agreements
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {consentConfig.map((consent) => {
                  const consentRecord = consents?.find(
                    (c) => c.consentType === consent.type
                  );
                  const isGranted = consentState[consent.key];

                  return (
                    <div
                      key={consent.key}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {consent.label}
                            </p>
                            {consent.required && (
                              <span className="inline-flex items-center rounded-full bg-[var(--error)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--error)]">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--neutral-gray)] mt-1 leading-relaxed">
                            {consent.description}
                          </p>
                          {consentRecord?.grantedAt && isGranted && (
                            <p className="text-xs text-[var(--neutral-gray)] mt-2 flex items-center gap-1">
                              <CalendarDays size={12} />
                              Granted {formatDate(consentRecord.grantedAt)}
                            </p>
                          )}
                        </div>
                        <div className="relative shrink-0 pt-0.5">
                          {consent.required ? (
                            <div className="group relative">
                              <Switch
                                checked={true}
                                disabled
                                className="opacity-70"
                              />
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                                <div className="rounded-lg bg-[var(--foreground)] px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Info size={12} />
                                    Required to use the platform
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Switch
                              checked={isGranted}
                              onCheckedChange={() => toggleConsent(consent.key)}
                              disabled={isSaving}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* ─── Account ─── */}
          <motion.section
            variants={staggerItemVariants}
            ref={(el) => { sectionRefs.current.account = el; }}
          >
            <div className="bg-[var(--surface-1)] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                  <UserCircle size={18} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">
                    Account
                  </h2>
                  <p className="text-xs text-[var(--neutral-gray)]">
                    Account details and actions
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Email */}
                <div className="flex items-center justify-between rounded-lg bg-[var(--surface-0)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-[var(--neutral-gray)]" />
                    <div>
                      <p className="text-xs text-[var(--neutral-gray)]">Email</p>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {(profile as any)?.email ?? "—"}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
                    <BadgeCheck size={12} />
                    Verified
                  </span>
                </div>

                {/* Account created */}
                <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-0)] px-4 py-3">
                  <CalendarDays size={18} className="text-[var(--neutral-gray)]" />
                  <div>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      Account created
                    </p>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {(profile as any)?.createdAt
                        ? formatDate((profile as any).createdAt)
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Last login */}
                <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-0)] px-4 py-3">
                  <LogIn size={18} className="text-[var(--neutral-gray)]" />
                  <div>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      Last login
                    </p>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {(profile as any)?.lastLoginAt
                        ? formatDate((profile as any).lastLoginAt)
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="mt-6 rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--error)]">
                        Delete Account
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)] mt-0.5">
                        Permanently remove your account and all associated data.
                        This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                      leftIcon={<Trash2 size={14} />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </div>

      {/* ─── Floating Save Bar ─── */}
      <AnimatePresence>
        {isDirty.any && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: durations.normal, ease: easings.expoOut }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-xl"
          >
            <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-3">
              <p className="text-sm text-[var(--neutral-gray)]">
                You have unsaved changes
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={isSaving}
                >
                  Discard
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleSave}
                  isLoading={isSaving}
                  leftIcon={
                    saveSuccess ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Check size={14} />
                      </motion.div>
                    ) : undefined
                  }
                >
                  {saveSuccess ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Account Dialog ─── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          setDeleteDialogOpen(false);
          toast.error("Account deletion is not yet available.");
        }}
        title="Delete your account?"
        message="This will permanently delete your profile, applications, and all associated data. This action cannot be undone."
        confirmLabel="Delete Account"
        cancelLabel="Keep Account"
        variant="danger"
      />
    </div>
  );
}
