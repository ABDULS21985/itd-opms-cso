"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Plug,
  RotateCcw,
  Save,
  Globe,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import { useSettings, useUpdateSetting, useDeleteSetting } from "@/hooks/use-system";
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
  { key: "platform_name", label: "Platform Name", type: "text", description: "Display name for the platform" },
  { key: "tagline", label: "Tagline", type: "text", description: "Short description shown on login page" },
  { key: "timezone", label: "Default Timezone", type: "select", description: "Default timezone for date display", options: [
    { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
    { value: "UTC", label: "UTC" },
    { value: "Europe/London", label: "Europe/London (GMT/BST)" },
    { value: "America/New_York", label: "America/New_York (EST)" },
  ]},
  { key: "date_format", label: "Date Format", type: "select", description: "How dates are displayed", options: [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  ]},
  { key: "items_per_page", label: "Items Per Page", type: "number", description: "Default pagination size", validate: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 5 || n > 100) return "Must be between 5 and 100";
    return null;
  }},
];

const SECURITY_SETTINGS: SettingDef[] = [
  { key: "session_timeout_minutes", label: "Session Timeout (minutes)", type: "number", description: "Minutes of inactivity before auto-logout", validate: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 1) return "Must be greater than 0";
    return null;
  }},
  { key: "max_sessions_per_user", label: "Max Sessions Per User", type: "number", description: "Maximum concurrent sessions allowed", validate: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 1) return "Must be at least 1";
    return null;
  }},
  { key: "enforce_mfa", label: "Enforce MFA", type: "toggle", description: "Require multi-factor authentication for all users" },
  { key: "allowed_ip_ranges", label: "Allowed IP Ranges", type: "textarea", description: "CIDR ranges (one per line). Leave empty to allow all.", validate: (v) => {
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
  }},
  { key: "rate_limit_rpm", label: "Rate Limit (requests/min)", type: "number", description: "Max API requests per minute per user", validate: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 10) return "Must be at least 10";
    return null;
  }},
];

const NOTIFICATION_SETTINGS: SettingDef[] = [
  { key: "email_enabled", label: "Email Notifications", type: "toggle", description: "Enable email notification delivery" },
  { key: "teams_enabled", label: "Teams Notifications", type: "toggle", description: "Enable Microsoft Teams notification delivery" },
  { key: "quiet_hours_start", label: "Quiet Hours Start", type: "time", description: "Suppress non-urgent notifications after this time" },
  { key: "quiet_hours_end", label: "Quiet Hours End", type: "time", description: "Resume notifications at this time" },
  { key: "digest_frequency", label: "Digest Frequency", type: "select", description: "How often to send notification digests", options: [
    { value: "immediate", label: "Immediate" },
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
  ]},
];

const BRANDING_SETTINGS: SettingDef[] = [
  { key: "primary_color", label: "Primary Color", type: "color", description: "Main brand color used across the platform" },
  { key: "logo_url", label: "Logo URL", type: "text", description: "URL to the platform logo image" },
  { key: "favicon_url", label: "Favicon URL", type: "text", description: "URL to the favicon image" },
];

const INTEGRATION_SETTINGS: SettingDef[] = [
  { key: "entra_id_enabled", label: "Entra ID (Azure AD)", type: "toggle", description: "Enable Microsoft Entra ID single sign-on" },
  { key: "graph_sync_interval_minutes", label: "Graph Sync Interval (min)", type: "number", description: "How often to sync users from Microsoft Graph", validate: (v) => {
    const n = Number(v);
    if (isNaN(n) || n < 5) return "Must be at least 5 minutes";
    return null;
  }},
  { key: "directory_sync_enabled", label: "Directory Sync", type: "toggle", description: "Enable automatic directory synchronization" },
];

const SETTINGS_MAP: Record<TabId, SettingDef[]> = {
  general: GENERAL_SETTINGS,
  security: SECURITY_SETTINGS,
  notifications: NOTIFICATION_SETTINGS,
  branding: BRANDING_SETTINGS,
  integrations: INTEGRATION_SETTINGS,
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
        backgroundColor: isTenantOverride ? "rgba(245, 158, 11, 0.12)" : "rgba(107, 114, 128, 0.12)",
        color: isTenantOverride ? "#D97706" : "#6B7280",
      }}
    >
      {isTenantOverride ? <Building2 size={10} /> : <Globe size={10} />}
      {isTenantOverride ? "Tenant Override" : "Global"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Form                                                      */
/* ------------------------------------------------------------------ */

function SettingsForm({ category, definitions }: { category: string; definitions: SettingDef[] }) {
  const { data: settingsData, isLoading } = useSettings(category);
  const updateMutation = useUpdateSetting();
  const deleteMutation = useDeleteSetting();

  const settings = useMemo(() => {
    if (!settingsData) return [];
    return Array.isArray(settingsData) ? settingsData : [];
  }, [settingsData]);

  const settingsMap = useMemo(() => {
    const map: Record<string, SystemSetting> = {};
    settings.forEach((s) => { map[s.key] = s; });
    return map;
  }, [settings]);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Initialize form from fetched settings
  useEffect(() => {
    if (!settings.length) return;
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
  }, [settings, definitions, settingsMap]);

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
        updateMutation.mutate({ category, key: def.key, value: def.type === "number" ? Number(newValue) : newValue });
        saved++;
      }
    });

    if (saved === 0) {
      toast.info("No changes to save");
    }
    setDirty(false);
  }, [definitions, formValues, settingsMap, category, updateMutation]);

  const handleReset = useCallback((key: string) => {
    deleteMutation.mutate({ category, key });
  }, [category, deleteMutation]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-1)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {definitions.map((def) => {
        const setting = settingsMap[def.key];
        const value = formValues[def.key] ?? "";
        const error = errors[def.key];

        return (
          <div key={def.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    {def.label}
                  </label>
                  <ScopeBadge setting={setting} />
                </div>
                {def.description && (
                  <p className="text-xs text-[var(--neutral-gray)] mt-0.5">{def.description}</p>
                )}
              </div>
              {setting?.tenantId && (
                <button
                  type="button"
                  onClick={() => handleReset(def.key)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-40"
                >
                  <RotateCcw size={10} />
                  Reset
                </button>
              )}
            </div>

            {def.type === "toggle" ? (
              <button
                type="button"
                onClick={() => handleChange(def.key, value === "true" ? "false" : "true")}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: value === "true" ? "var(--primary)" : "var(--surface-2)",
                }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                  style={{
                    transform: value === "true" ? "translateX(24px)" : "translateX(4px)",
                  }}
                />
              </button>
            ) : def.type === "textarea" ? (
              <textarea
                value={value}
                onChange={(e) => handleChange(def.key, e.target.value)}
                rows={3}
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
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : def.type === "color" ? (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={value || "#1B7340"}
                  onChange={(e) => handleChange(def.key, e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--border)]"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(def.key, e.target.value)}
                  placeholder="#1B7340"
                  className={INPUT_CLS + " max-w-[160px]"}
                />
                {value && (
                  <div
                    className="h-10 flex-1 rounded-xl border border-[var(--border)]"
                    style={{ backgroundColor: value }}
                  />
                )}
              </div>
            ) : def.type === "time" ? (
              <input
                type="time"
                value={value}
                onChange={(e) => handleChange(def.key, e.target.value)}
                className={INPUT_CLS + " max-w-[160px]"}
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
              <p className="mt-1 text-xs text-[var(--error)]">{error}</p>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Settings", href: "/dashboard/system/settings" },
  ]);

  return (
    <PermissionGate permission="system.manage">
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
        >
          <Settings size={20} style={{ color: "#1B7340" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            System Settings
          </h1>
          <p className="text-sm text-[var(--neutral-gray)]">
            Configure platform behavior and integrations
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Settings Form */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SettingsForm
          category={activeTab}
          definitions={SETTINGS_MAP[activeTab]}
        />
      </motion.div>
    </div>
    </PermissionGate>
  );
}
