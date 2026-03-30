"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Settings,
  Shield,
  Bell,
  Palette,
  Plug,
  RotateCcw,
  Save,
  Globe,
  Building2,
  Layers3,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useSettings,
  useUpdateSetting,
  useDeleteSetting,
} from "@/hooks/use-system";
import type { SystemSetting } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Plug },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PANEL_CLASS =
  "rounded-[1.8rem] border border-slate-200/70 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";
const SOFT_PANEL_CLASS =
  "rounded-[1.35rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_12px_30px_rgba(15,23,42,0.05)]";
const PRIMARY_BUTTON_STYLE = {
  backgroundImage: "var(--gradient-primary)",
  borderColor: "var(--primary-light)",
  boxShadow: "var(--shadow-premium)",
};
const HERO_STYLE = {
  backgroundImage:
    "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 36%), radial-gradient(circle at bottom left, rgba(139,111,46,0.18), transparent 32%), var(--gradient-primary)",
  borderColor: "rgba(45,155,86,0.28)",
  boxShadow: "var(--shadow-premium)",
};

const INPUT_CLS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

const SELECT_CLS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

/* ------------------------------------------------------------------ */
/*  Setting definitions per tab                                        */
/* ------------------------------------------------------------------ */

interface SettingDef {
  key: string;
  label: string;
  type: "text" | "number" | "toggle" | "select" | "textarea" | "color" | "time";
  description?: string;
  options?: { value: string; label: string }[];
  validate?: (v: string) => string | null;
}

const GENERAL_SETTINGS: SettingDef[] = [
  {
    key: "platform_name",
    label: "Platform Name",
    type: "text",
    description: "Display name for the platform",
  },
  {
    key: "tagline",
    label: "Tagline",
    type: "text",
    description: "Short description shown on login page",
  },
  {
    key: "timezone",
    label: "Default Timezone",
    type: "select",
    description: "Default timezone for date display",
    options: [
      { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
      { value: "UTC", label: "UTC" },
      { value: "Europe/London", label: "Europe/London (GMT/BST)" },
      { value: "America/New_York", label: "America/New_York (EST)" },
    ],
  },
  {
    key: "date_format",
    label: "Date Format",
    type: "select",
    description: "How dates are displayed",
    options: [
      { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
      { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
      { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
    ],
  },
  {
    key: "items_per_page",
    label: "Items Per Page",
    type: "number",
    description: "Default pagination size",
    validate: (v) => {
      const n = Number(v);
      if (isNaN(n) || n < 5 || n > 100) return "Must be between 5 and 100";
      return null;
    },
  },
];

const SECURITY_SETTINGS: SettingDef[] = [
  {
    key: "session_timeout_minutes",
    label: "Session Timeout (minutes)",
    type: "number",
    description: "Minutes of inactivity before auto-logout",
    validate: (v) => {
      const n = Number(v);
      if (isNaN(n) || n < 1) return "Must be greater than 0";
      return null;
    },
  },
  {
    key: "max_sessions_per_user",
    label: "Max Sessions Per User",
    type: "number",
    description: "Maximum concurrent sessions allowed",
    validate: (v) => {
      const n = Number(v);
      if (isNaN(n) || n < 1) return "Must be at least 1";
      return null;
    },
  },
  {
    key: "enforce_mfa",
    label: "Enforce MFA",
    type: "toggle",
    description: "Require multi-factor authentication for all users",
  },
  {
    key: "allowed_ip_ranges",
    label: "Allowed IP Ranges",
    type: "textarea",
    description: "CIDR ranges (one per line). Leave empty to allow all.",
    validate: (v) => {
      if (!v.trim()) return null;
      const lines = v.trim().split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(trimmed)) {
          return `Invalid CIDR: ${trimmed}`;
        }
      }
      return null;
    },
  },
  {
    key: "rate_limit_rpm",
    label: "Rate Limit (requests/min)",
    type: "number",
    description: "Max API requests per minute per user",
    validate: (v) => {
      const n = Number(v);
      if (isNaN(n) || n < 10) return "Must be at least 10";
      return null;
    },
  },
];

const NOTIFICATION_SETTINGS: SettingDef[] = [
  {
    key: "email_enabled",
    label: "Email Notifications",
    type: "toggle",
    description: "Enable email notification delivery",
  },
  {
    key: "teams_enabled",
    label: "Teams Notifications",
    type: "toggle",
    description: "Enable Microsoft Teams notification delivery",
  },
  {
    key: "quiet_hours_start",
    label: "Quiet Hours Start",
    type: "time",
    description: "Suppress non-urgent notifications after this time",
  },
  {
    key: "quiet_hours_end",
    label: "Quiet Hours End",
    type: "time",
    description: "Resume notifications at this time",
  },
  {
    key: "digest_frequency",
    label: "Digest Frequency",
    type: "select",
    description: "How often to send notification digests",
    options: [
      { value: "immediate", label: "Immediate" },
      { value: "hourly", label: "Hourly" },
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
    ],
  },
];

const BRANDING_SETTINGS: SettingDef[] = [
  {
    key: "primary_color",
    label: "Primary Color",
    type: "color",
    description: "Main brand color used across the platform",
  },
  {
    key: "logo_url",
    label: "Logo URL",
    type: "text",
    description: "URL to the platform logo image",
  },
  {
    key: "favicon_url",
    label: "Favicon URL",
    type: "text",
    description: "URL to the favicon image",
  },
];

const INTEGRATION_SETTINGS: SettingDef[] = [
  {
    key: "entra_id_enabled",
    label: "Entra ID (Azure AD)",
    type: "toggle",
    description: "Enable Microsoft Entra ID single sign-on",
  },
  {
    key: "graph_sync_interval_minutes",
    label: "Graph Sync Interval (min)",
    type: "number",
    description: "How often to sync users from Microsoft Graph",
    validate: (v) => {
      const n = Number(v);
      if (isNaN(n) || n < 5) return "Must be at least 5 minutes";
      return null;
    },
  },
  {
    key: "directory_sync_enabled",
    label: "Directory Sync",
    type: "toggle",
    description: "Enable automatic directory synchronization",
  },
];

const SETTINGS_MAP: Record<TabId, SettingDef[]> = {
  general: GENERAL_SETTINGS,
  security: SECURITY_SETTINGS,
  notifications: NOTIFICATION_SETTINGS,
  branding: BRANDING_SETTINGS,
  integrations: INTEGRATION_SETTINGS,
};

const TAB_META: Record<
  TabId,
  { title: string; description: string; eyebrow: string; accent: string }
> = {
  general: {
    title: "Platform foundations",
    description:
      "Shape the baseline experience for identity, paging density, timezone defaults, and how the platform introduces itself.",
    eyebrow: "Control Plane",
    accent: "var(--primary)",
  },
  security: {
    title: "Security posture",
    description:
      "Tune session policies, MFA enforcement, IP restrictions, and request throttling from one policy surface.",
    eyebrow: "Security Controls",
    accent: "var(--warning-dark)",
  },
  notifications: {
    title: "Notification rhythm",
    description:
      "Decide where alerts travel, when quiet hours apply, and how digest cadence should behave across the platform.",
    eyebrow: "Delivery Signals",
    accent: "var(--info-dark)",
  },
  branding: {
    title: "Brand identity",
    description:
      "Set the visual signature of the portal, from colors to logos and the surfaces users see first.",
    eyebrow: "Experience Layer",
    accent: "var(--gold-dark)",
  },
  integrations: {
    title: "Integration switches",
    description:
      "Control federation and sync behavior for Entra ID, Graph-backed identity flows, and automation entry points.",
    eyebrow: "Connected Systems",
    accent: "var(--success-dark)",
  },
};

/* ------------------------------------------------------------------ */
/*  Scope Badge                                                        */
/* ------------------------------------------------------------------ */

function ScopeBadge({ setting }: { setting: SystemSetting | undefined }) {
  if (!setting) return null;
  const isTenantOverride = !!setting.tenantId;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: isTenantOverride
          ? "var(--badge-amber-bg)"
          : "var(--surface-2)",
        color: isTenantOverride ? "var(--gold-dark)" : "var(--text-secondary)",
      }}
    >
      {isTenantOverride ? <Building2 size={10} /> : <Globe size={10} />}
      {isTenantOverride ? "Tenant Override" : "Global"}
    </span>
  );
}

function SettingTypeBadge({ type }: { type: SettingDef["type"] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
      {type}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Form                                                      */
/* ------------------------------------------------------------------ */

function SettingsForm({
  category,
  definitions,
}: {
  category: string;
  definitions: SettingDef[];
}) {
  const { data: settingsData, isLoading } = useSettings(category);
  const updateMutation = useUpdateSetting();
  const deleteMutation = useDeleteSetting();

  const settings = useMemo(() => {
    if (!settingsData) return [];
    return Array.isArray(settingsData) ? settingsData : [];
  }, [settingsData]);

  const settingsMap = useMemo(() => {
    const map: Record<string, SystemSetting> = {};
    settings.forEach((s) => {
      map[s.key] = s;
    });
    return map;
  }, [settings]);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Initialize form from fetched settings
  useEffect(() => {
    const vals: Record<string, string> = {};
    definitions.forEach((def) => {
      const s = settingsMap[def.key];
      if (s) {
        vals[def.key] = String(s.value ?? "");
      } else {
        vals[def.key] = "";
      }
    });
    setFormValues(vals);
    setDirty(false);
    setErrors({});
  }, [definitions, settingsMap]);

  const handleChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    // Validate
    const newErrors: Record<string, string> = {};
    definitions.forEach((def) => {
      if (def.validate) {
        const err = def.validate(formValues[def.key] ?? "");
        if (err) newErrors[def.key] = err;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix validation errors before saving");
      return;
    }

    // Save each changed setting
    let saved = 0;
    definitions.forEach((def) => {
      const currentValue = String(settingsMap[def.key]?.value ?? "");
      const newValue = formValues[def.key] ?? "";
      if (currentValue !== newValue) {
        updateMutation.mutate({
          category,
          key: def.key,
          value: def.type === "number" ? Number(newValue) : newValue,
        });
        saved++;
      }
    });

    if (saved === 0) {
      toast.info("No changes to save");
    }
    setDirty(false);
  }, [definitions, formValues, settingsMap, category, updateMutation]);

  const handleReset = useCallback(
    (key: string) => {
      deleteMutation.mutate({ category, key });
    },
    [category, deleteMutation],
  );

  const handleDiscardChanges = useCallback(() => {
    const vals: Record<string, string> = {};
    definitions.forEach((def) => {
      vals[def.key] = String(settingsMap[def.key]?.value ?? "");
    });
    setFormValues(vals);
    setErrors({});
    setDirty(false);
  }, [definitions, settingsMap]);

  const overridesCount = useMemo(
    () => settings.filter((setting) => !!setting.tenantId).length,
    [settings],
  );
  const enabledToggleCount = useMemo(
    () =>
      definitions.filter(
        (def) => def.type === "toggle" && formValues[def.key] === "true",
      ).length,
    [definitions, formValues],
  );
  const changedCount = useMemo(
    () =>
      definitions.filter((def) => {
        const currentValue = String(settingsMap[def.key]?.value ?? "");
        const newValue = formValues[def.key] ?? "";
        return currentValue !== newValue;
      }).length,
    [definitions, formValues, settingsMap],
  );
  const textControlCount = useMemo(
    () =>
      definitions.filter((def) =>
        ["text", "textarea", "number", "time", "color", "select"].includes(
          def.type,
        ),
      ).length,
    [definitions],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`${PANEL_CLASS} h-24 animate-pulse bg-[var(--surface-1)]`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_320px]">
      <div className="space-y-5">
        <div className={`${PANEL_CLASS} p-5`}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Total Controls
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                {definitions.length}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Settings in this configuration domain.
              </p>
            </div>
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Tenant Overrides
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--gold-dark)]">
                {overridesCount}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Controls overridden below the global layer.
              </p>
            </div>
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Enabled Toggles
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--success-dark)]">
                {enabledToggleCount}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Binary controls currently switched on.
              </p>
            </div>
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Unsaved Changes
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--primary)]">
                {changedCount}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Local edits waiting to be committed.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {definitions.map((def) => {
            const setting = settingsMap[def.key];
            const value = formValues[def.key] ?? "";
            const error = errors[def.key];
            const isChanged =
              String(settingsMap[def.key]?.value ?? "") !== value;

            return (
              <div key={def.key} className={`${PANEL_CLASS} p-5`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-sm font-semibold text-[var(--text-primary)]">
                        {def.label}
                      </label>
                      <ScopeBadge setting={setting} />
                      <SettingTypeBadge type={def.type} />
                      {isChanged && (
                        <span className="inline-flex items-center rounded-full bg-[var(--success-light)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                          Edited
                        </span>
                      )}
                    </div>
                    {def.description && (
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {def.description}
                      </p>
                    )}
                  </div>
                  {setting?.tenantId && (
                    <button
                      type="button"
                      onClick={() => handleReset(def.key)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-white/84 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-1)] disabled:opacity-40"
                    >
                      <RotateCcw size={12} />
                      Reset
                    </button>
                  )}
                </div>

                {def.type === "toggle" ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(def.key, value === "true" ? "false" : "true")
                    }
                    className={`${SOFT_PANEL_CLASS} flex w-full items-center justify-between px-4 py-4 text-left`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {value === "true" ? "Enabled" : "Disabled"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Toggle this control for the current scope.
                      </p>
                    </div>
                    <div
                      className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          value === "true"
                            ? "var(--primary)"
                            : "var(--surface-3)",
                      }}
                    >
                      <span
                        className="inline-block h-5 w-5 rounded-full bg-white transition-transform shadow-sm"
                        style={{
                          transform:
                            value === "true"
                              ? "translateX(26px)"
                              : "translateX(3px)",
                        }}
                      />
                    </div>
                  </button>
                ) : def.type === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(e) => handleChange(def.key, e.target.value)}
                    rows={4}
                    className={INPUT_CLS}
                  />
                ) : def.type === "select" ? (
                  <select
                    value={value}
                    onChange={(e) => handleChange(def.key, e.target.value)}
                    className={SELECT_CLS}
                  >
                    <option value="">Select...</option>
                    {def.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : def.type === "color" ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="color"
                      value={value || "#1B7340"}
                      onChange={(e) => handleChange(def.key, e.target.value)}
                      className="h-12 w-16 cursor-pointer rounded-xl border border-[var(--border)] bg-white"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleChange(def.key, e.target.value)}
                      placeholder="#1B7340"
                      className={`${INPUT_CLS} max-w-[180px]`}
                    />
                    {value && (
                      <div
                        className="h-12 flex-1 rounded-xl border border-[var(--border)]"
                        style={{ backgroundColor: value }}
                      />
                    )}
                  </div>
                ) : def.type === "time" ? (
                  <input
                    type="time"
                    value={value}
                    onChange={(e) => handleChange(def.key, e.target.value)}
                    className={`${INPUT_CLS} max-w-[180px]`}
                  />
                ) : (
                  <input
                    type={def.type}
                    value={value}
                    onChange={(e) => handleChange(def.key, e.target.value)}
                    className={INPUT_CLS}
                  />
                )}

                {error && (
                  <p className="mt-2 text-xs text-[var(--error)]">{error}</p>
                )}
              </div>
            );
          })}
        </div>

        <div
          className={`${PANEL_CLASS} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {dirty
                ? `${changedCount} pending change${changedCount === 1 ? "" : "s"}`
                : "All changes saved"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Review the edited controls before committing them to the active
              scope.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDiscardChanges}
              disabled={!dirty || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/84 px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={16} />
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              style={PRIMARY_BUTTON_STYLE}
            >
              <Save size={16} />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className={`${PANEL_CLASS} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Settings Signal
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Quick context for the current configuration domain.
              </p>
            </div>
            <SlidersHorizontal size={18} className="text-[var(--primary)]" />
          </div>

          <div className="mt-4 space-y-3">
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Input-heavy Controls
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                {textControlCount}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Fields that shape values, schedules, or textual behavior.
              </p>
            </div>
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Scope Integrity
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--gold-dark)]">
                {definitions.length - overridesCount} / {definitions.length}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Controls still inheriting the global platform baseline.
              </p>
            </div>
          </div>
        </div>

        <div className={`${PANEL_CLASS} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Operating Notes
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Practical cues for making safe configuration changes.
              </p>
            </div>
            <CheckCircle2 size={18} className="text-[var(--success-dark)]" />
          </div>

          <div className="mt-4 space-y-3">
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Prefer small batches
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Save related changes together so operational impact stays easy
                to validate and communicate.
              </p>
            </div>
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Watch override drift
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Tenant-level overrides are useful, but too many can fragment
                expected behavior across the platform.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const activeMeta = TAB_META[activeTab];
  const activeDefinitions = SETTINGS_MAP[activeTab];
  const totalDefinitions = Object.values(SETTINGS_MAP).reduce(
    (sum, defs) => sum + defs.length,
    0,
  );
  const toggleDefinitions = Object.values(SETTINGS_MAP)
    .flat()
    .filter((def) => def.type === "toggle").length;

  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Settings", href: "/dashboard/system/settings" },
  ]);

  return (
    <PermissionGate permission="system.manage">
      <div className="space-y-6 pb-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.2rem] border px-6 py-7 text-white"
          style={HERO_STYLE}
        >
          <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(139,111,46,0.16)" }}
          />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/82 backdrop-blur-xl">
                <Sparkles size={14} />
                {activeMeta.eyebrow}
              </div>

              <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                  <Settings size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
                    System Settings
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/84 sm:text-[15px]">
                    {activeMeta.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Layers3 size={14} />
                      {totalDefinitions} total controls
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Shield size={14} />
                      {toggleDefinitions} toggle-based policies
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <ArrowUpRight size={14} />
                      {activeDefinitions.length} controls in{" "}
                      {TABS.find((tab) => tab.id === activeTab)?.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[470px]">
              <div className={`${SOFT_PANEL_CLASS} p-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Active Domain
                </p>
                <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  {TABS.find((tab) => tab.id === activeTab)?.label}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {activeMeta.title}
                </p>
              </div>
              <div className={`${SOFT_PANEL_CLASS} p-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Current Focus
                </p>
                <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  {activeDefinitions.length} editable fields
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Configuration points exposed in this section.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className={`${PANEL_CLASS} p-4`}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const meta = TAB_META[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: isActive
                      ? "rgba(27,115,64,0.22)"
                      : "rgba(226,232,240,0.88)",
                    background: isActive
                      ? "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(209,250,229,0.72))"
                      : "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))",
                    boxShadow: isActive
                      ? "0 18px 40px rgba(27,115,64,0.12)"
                      : "0 12px 28px rgba(15,23,42,0.04)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: isActive
                          ? "rgba(27,115,64,0.1)"
                          : "rgba(148,163,184,0.12)",
                      }}
                    >
                      <Icon
                        size={18}
                        style={{
                          color: isActive
                            ? "var(--primary)"
                            : "var(--text-secondary)",
                        }}
                      />
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-[var(--success-light)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                    {tab.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    {meta.title}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.section>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SettingsForm category={activeTab} definitions={activeDefinitions} />
        </motion.div>
      </div>
    </PermissionGate>
  );
}
