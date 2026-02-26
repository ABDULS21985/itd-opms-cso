"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, MessageSquare, Monitor, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notifications";
import type { NotificationPreferences } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NOTIFICATION_TYPES = [
  { value: "project_updates", label: "Project Updates" },
  { value: "task_assignments", label: "Task Assignments" },
  { value: "sla_breaches", label: "SLA Breaches" },
  { value: "approval_requests", label: "Approval Requests" },
  { value: "system_alerts", label: "System Alerts" },
  { value: "asset_updates", label: "Asset Updates" },
  { value: "service_requests", label: "Service Requests" },
  { value: "audit_events", label: "Audit Events" },
];

const DIGEST_OPTIONS = [
  {
    value: "immediate" as const,
    label: "Immediate",
    description: "Receive notifications as they happen",
  },
  {
    value: "daily" as const,
    label: "Daily Digest",
    description: "One summary email per day at 9:00 AM",
  },
  {
    value: "weekly" as const,
    label: "Weekly Digest",
    description: "One summary email per week on Monday",
  },
];

const CHANNEL_CONFIG = [
  { key: "email", label: "Email", description: "Receive notifications via email", icon: Mail },
  {
    key: "teams",
    label: "Microsoft Teams",
    description: "Receive notifications in Teams",
    icon: MessageSquare,
  },
  {
    key: "inApp",
    label: "In-App",
    description: "Show notifications in the portal",
    icon: Monitor,
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00` };
});

/* ------------------------------------------------------------------ */
/*  Default state                                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channelPreferences: { email: true, teams: false, inApp: true },
  digestFrequency: "immediate",
  quietHoursStart: undefined,
  quietHoursEnd: undefined,
  disabledTypes: [],
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function NotificationSettingsPage() {
  const { data: savedPreferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Load saved preferences when fetched
  useEffect(() => {
    if (savedPreferences) {
      setPreferences({
        channelPreferences: {
          ...DEFAULT_PREFERENCES.channelPreferences,
          ...savedPreferences.channelPreferences,
        },
        digestFrequency:
          savedPreferences.digestFrequency || DEFAULT_PREFERENCES.digestFrequency,
        quietHoursStart: savedPreferences.quietHoursStart || undefined,
        quietHoursEnd: savedPreferences.quietHoursEnd || undefined,
        disabledTypes: savedPreferences.disabledTypes || [],
      });
    }
  }, [savedPreferences]);

  const handleChannelToggle = (channel: string) => {
    setPreferences((prev) => ({
      ...prev,
      channelPreferences: {
        ...prev.channelPreferences,
        [channel]: !prev.channelPreferences[channel],
      },
    }));
  };

  const handleDigestChange = (
    frequency: NotificationPreferences["digestFrequency"],
  ) => {
    setPreferences((prev) => ({ ...prev, digestFrequency: frequency }));
  };

  const handleTypeToggle = (type: string) => {
    setPreferences((prev) => ({
      ...prev,
      disabledTypes: prev.disabledTypes.includes(type)
        ? prev.disabledTypes.filter((t) => t !== type)
        : [...prev.disabledTypes, type],
    }));
  };

  const handleSave = () => {
    updatePreferences.mutate(preferences, {
      onSuccess: () => {
        toast.success("Notification preferences saved");
      },
      onError: () => {
        toast.error("Failed to save preferences. Please try again.");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={24}
            className="animate-spin text-[var(--primary)]"
          />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading preferences...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <Bell size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Notification Settings
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Configure how and when you receive notifications
            </p>
          </div>
        </div>
      </div>

      {/* Channel Preferences */}
      <section className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Notification Channels
        </h2>
        <div className="space-y-3">
          {CHANNEL_CONFIG.map((channel) => {
            const Icon = channel.icon;
            const isEnabled = preferences.channelPreferences[channel.key] ?? false;
            return (
              <label
                key={channel.key}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--surface-1)] flex items-center justify-center">
                    <Icon size={18} className="text-[var(--neutral-gray)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {channel.label}
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      {channel.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => handleChannelToggle(channel.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEnabled
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--neutral-gray)]/30"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
                      isEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>
      </section>

      {/* Digest Frequency */}
      <section className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Digest Frequency
        </h2>
        <div className="space-y-2">
          {DIGEST_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                preferences.digestFrequency === option.value
                  ? "bg-[var(--primary)]/5 border border-[var(--primary)]/20"
                  : "hover:bg-[var(--surface-1)] border border-transparent"
              }`}
            >
              <input
                type="radio"
                name="digestFrequency"
                value={option.value}
                checked={preferences.digestFrequency === option.value}
                onChange={() => handleDigestChange(option.value)}
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {option.label}
                </p>
                <p className="text-xs text-[var(--neutral-gray)]">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Quiet Hours */}
      <section className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Quiet Hours
        </h2>
        <p className="text-xs text-[var(--neutral-gray)] mb-4">
          Suppress non-critical notifications during these hours
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1.5">
              Start Time
            </label>
            <select
              value={preferences.quietHoursStart || ""}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  quietHoursStart: e.target.value || undefined,
                }))
              }
              className="w-full px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            >
              <option value="">None</option>
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-5 text-sm text-[var(--neutral-gray)]">to</div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--neutral-gray)] mb-1.5">
              End Time
            </label>
            <select
              value={preferences.quietHoursEnd || ""}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  quietHoursEnd: e.target.value || undefined,
                }))
              }
              className="w-full px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            >
              <option value="">None</option>
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Disabled Notification Types */}
      <section className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Notification Types
        </h2>
        <p className="text-xs text-[var(--neutral-gray)] mb-4">
          Uncheck types you do not want to receive
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {NOTIFICATION_TYPES.map((type) => {
            const isEnabled = !preferences.disabledTypes.includes(type.value);
            return (
              <label
                key={type.value}
                className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleTypeToggle(type.value)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  {type.label}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {updatePreferences.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
