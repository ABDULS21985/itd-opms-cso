"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Radar,
  Plus,
  Upload,
  Loader2,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Network,
  Building2,
  ServerCog,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  useDiscoveryStats,
  useDiscoveryProfiles,
  useDiscoveryRuns,
  useCreateDiscoveryProfile,
  useTriggerDiscoveryRun,
  useImportDiscoveryCSV,
} from "@/hooks/use-cmdb";
import { FormField } from "@/components/shared/form-field";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCAN_TYPES = [
  { value: "network", label: "Network Scan" },
  { value: "ad_import", label: "AD Import" },
  { value: "csv_import", label: "CSV Import" },
  { value: "sccm", label: "SCCM" },
];

const SCAN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  network: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  ad_import: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  csv_import: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  sccm: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
};

const RUN_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  scanning: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  reconciling: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  completed: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  failed: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
};

const CRON_PRESETS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Weekdays 2 AM", value: "0 2 * * 1,2,3,4,5" },
  { label: "Daily 1 AM", value: "0 1 * * *" },
];

const SCCM_AUTH_OPTIONS = [
  { value: "api_key", label: "API Key" },
  { value: "basic", label: "Username / Password" },
];

function humanizeScanType(value?: string) {
  return value ? value.replace(/_/g, " ") : "discovery";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DiscoveryPage() {
  const router = useRouter();
  const [profilePage] = useState(1);
  const [runPage] = useState(1);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // New profile form state.
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileScanType, setProfileScanType] = useState("network");
  const [profileSchedule, setProfileSchedule] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [networkRanges, setNetworkRanges] = useState("");
  const [networkSNMPCommunity, setNetworkSNMPCommunity] = useState("public");
  const [sccmEndpoint, setSccmEndpoint] = useState("");
  const [sccmAuthMethod, setSccmAuthMethod] = useState("api_key");
  const [sccmApiKey, setSccmApiKey] = useState("");
  const [sccmUsername, setSccmUsername] = useState("");
  const [sccmPassword, setSccmPassword] = useState("");

  const { data: stats } = useDiscoveryStats();
  const { data: profilesData, isLoading: profilesLoading } =
    useDiscoveryProfiles(profilePage, 20);
  const { data: runsData, isLoading: runsLoading } =
    useDiscoveryRuns(runPage, 10);

  const createProfile = useCreateDiscoveryProfile();
  const triggerRun = useTriggerDiscoveryRun();
  const importCSV = useImportDiscoveryCSV();

  const profiles = profilesData?.data ?? [];
  const runs = runsData?.data ?? [];

  const profileConfiguration = useMemo(() => {
    if (profileScanType === "network") {
      return {
        ipRanges: networkRanges
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        snmpCommunity: networkSNMPCommunity.trim() || undefined,
      };
    }

    if (profileScanType === "ad_import") {
      return {
        tenantId: stats?.adTenantId,
      };
    }

    if (profileScanType === "sccm") {
      return {
        endpoint: sccmEndpoint.trim() || undefined,
        apiKey: sccmAuthMethod === "api_key" ? sccmApiKey.trim() || undefined : undefined,
        username:
          sccmAuthMethod === "basic" ? sccmUsername.trim() || undefined : undefined,
        password:
          sccmAuthMethod === "basic" ? sccmPassword || undefined : undefined,
      };
    }

    return {};
  }, [
    networkRanges,
    networkSNMPCommunity,
    profileScanType,
    sccmApiKey,
    sccmAuthMethod,
    sccmEndpoint,
    sccmPassword,
    sccmUsername,
    stats?.adTenantId,
  ]);

  const handleCreateProfile = useCallback(() => {
    if (!profileName.trim()) return;
    createProfile.mutate(
      {
        name: profileName,
        scanType: profileScanType,
        description: profileDescription || undefined,
        schedule: scheduleEnabled ? profileSchedule || undefined : undefined,
        configuration: profileConfiguration,
      },
      {
        onSuccess: () => {
          setShowNewProfile(false);
          setProfileName("");
          setProfileDescription("");
          setProfileScanType("network");
          setProfileSchedule("");
          setScheduleEnabled(false);
          setNetworkRanges("");
          setNetworkSNMPCommunity("public");
          setSccmEndpoint("");
          setSccmAuthMethod("api_key");
          setSccmApiKey("");
          setSccmUsername("");
          setSccmPassword("");
        },
      },
    );
  }, [
    createProfile,
    profileConfiguration,
    profileDescription,
    profileName,
    profileScanType,
    profileSchedule,
    scheduleEnabled,
  ]);

  const handleCSVUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      importCSV.mutate(formData, {
        onSuccess: (run) => {
          setShowCSVImport(false);
          router.push(`/dashboard/cmdb/discovery/runs/${run.id}`);
        },
      });
    },
    [importCSV, router],
  );

  const canCreateProfile =
    profileName.trim().length > 0 &&
    (!scheduleEnabled || profileSchedule.trim().length > 0) &&
    (profileScanType !== "network" ||
      networkRanges
        .split("\n")
        .some((value) => value.trim().length > 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <Radar size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              CI Discovery
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Automated discovery and reconciliation of configuration items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Upload size={16} />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setShowNewProfile(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Profile
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Profiles",
            value: stats?.totalProfiles ?? 0,
            color: "#3B82F6",
          },
          {
            label: "Active Profiles",
            value: stats?.activeProfiles ?? 0,
            color: "#10B981",
          },
          {
            label: "Total Runs",
            value: stats?.totalRuns ?? 0,
            color: "#8B5CF6",
          },
          {
            label: "Last Run",
            value: stats?.lastRunAt
              ? new Date(stats.lastRunAt).toLocaleDateString()
              : "Never",
            color: "#F59E0B",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {stat.label}
            </p>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="grid gap-4 lg:grid-cols-3"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: "#8B5CF6" }} />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Entra Device Import
            </p>
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {stats?.adEnabled && stats.adTenantId
              ? `Connected to ${stats.adTenantId}`
              : "Microsoft Graph discovery is not configured"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2">
            <Network size={16} style={{ color: "#3B82F6" }} />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Network Sweep
            </p>
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {stats?.networkEnabled
              ? "TCP sweep and SNMP enrichment are enabled"
              : "Network discovery is disabled at the API layer"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-2">
            <ServerCog size={16} style={{ color: "#F59E0B" }} />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              SCCM Inventory
            </p>
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {stats?.sccmConfigured
              ? "AdminService connector available with CSV fallback"
              : "Awaiting SCCM endpoint or CSV fallback configuration"}
          </p>
        </div>
      </motion.div>

      {/* New Profile Form */}
      {showNewProfile && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Create Discovery Profile
            </h2>
            <button
              type="button"
              onClick={() => setShowNewProfile(false)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              name="name"
              label="Profile Name"
              value={profileName}
              onChange={setProfileName}
              placeholder="e.g. HQ Network Scan"
              required
            />
            <FormField
              name="scanType"
              label="Scan Type"
              type="select"
              value={profileScanType}
              onChange={setProfileScanType}
              options={SCAN_TYPES}
            />
            <FormField
              name="description"
              label="Description"
              value={profileDescription}
              onChange={setProfileDescription}
              placeholder="Optional description"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Schedule
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Enable automatic runs with a cron expression.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleEnabled((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: scheduleEnabled ? "#10B981" : "#9CA3AF",
                  }}
                />
                {scheduleEnabled ? "Scheduled" : "Manual Only"}
              </button>
            </div>

            {scheduleEnabled && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {CRON_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setProfileSchedule(preset.value)}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--primary)]"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <FormField
                  name="schedule"
                  label="Cron Expression"
                  value={profileSchedule}
                  onChange={setProfileSchedule}
                  placeholder="e.g. 0 2 * * 1"
                  description="Five-field cron format: minute hour day month weekday"
                />
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={16} style={{ color: "#3B82F6" }} />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {profileScanType === "network" && "Network Configuration"}
                {profileScanType === "ad_import" && "Entra Configuration"}
                {profileScanType === "sccm" && "SCCM Configuration"}
                {profileScanType === "csv_import" && "CSV Import"}
              </p>
            </div>

            {profileScanType === "network" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  name="ipRanges"
                  label="IP Ranges"
                  type="textarea"
                  rows={5}
                  value={networkRanges}
                  onChange={setNetworkRanges}
                  placeholder={"10.0.0.0/24\n10.0.10.0/24"}
                  description="One CIDR range per line. Required for network discovery."
                />
                <FormField
                  name="snmpCommunity"
                  label="SNMP Community"
                  value={networkSNMPCommunity}
                  onChange={setNetworkSNMPCommunity}
                  placeholder="public"
                  description="Used only when port 161 is reachable."
                />
              </div>
            )}

            {profileScanType === "ad_import" && (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-4">
                <div className="flex items-center gap-2">
                  <Building2 size={16} style={{ color: "#8B5CF6" }} />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {stats?.adEnabled && stats.adTenantId
                      ? `Connected to ${stats.adTenantId}`
                      : "Graph connection unavailable"}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  This profile will use the shared Entra device integration and automatically
                  populate the tenant from backend configuration.
                </p>
              </div>
            )}

            {profileScanType === "sccm" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  name="sccmEndpoint"
                  label="Server URL"
                  value={sccmEndpoint}
                  onChange={setSccmEndpoint}
                  placeholder="https://sccm.example.com"
                  description="AdminService base URL. Leave blank to use the API default."
                />
                <FormField
                  name="sccmAuthMethod"
                  label="Authentication"
                  type="select"
                  value={sccmAuthMethod}
                  onChange={setSccmAuthMethod}
                  options={SCCM_AUTH_OPTIONS}
                />
                {sccmAuthMethod === "api_key" ? (
                  <FormField
                    name="sccmApiKey"
                    label="API Key"
                    value={sccmApiKey}
                    onChange={setSccmApiKey}
                    placeholder="Optional override"
                  />
                ) : (
                  <>
                    <FormField
                      name="sccmUsername"
                      label="Username"
                      value={sccmUsername}
                      onChange={setSccmUsername}
                      placeholder="DOMAIN\\svc-account"
                    />
                    <FormField
                      name="sccmPassword"
                      label="Password"
                      type="password"
                      value={sccmPassword}
                      onChange={setSccmPassword}
                      placeholder="Optional override"
                    />
                  </>
                )}
              </div>
            )}

            {profileScanType === "csv_import" && (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  CSV imports use the upload flow.
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Save a CSV profile if you want a named placeholder, then use the
                  import action above to upload files against the discovery pipeline.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowNewProfile(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canCreateProfile || createProfile.isPending}
              onClick={handleCreateProfile}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {createProfile.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Create Profile
            </button>
          </div>
        </motion.div>
      )}

      {/* CSV Import Dialog */}
      {showCSVImport && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Import CSV
            </h2>
            <button
              type="button"
              onClick={() => setShowCSVImport(false)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Upload a CSV file with device information. Required columns:{" "}
            <span className="font-semibold">hostname</span> or{" "}
            <span className="font-semibold">ip_address</span>. Optional:
            mac_address, device_type, os_name, os_version, manufacturer, model,
            serial_number.
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:opacity-90">
              {importCSV.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              Choose CSV File
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
                disabled={importCSV.isPending}
              />
            </label>
          </div>
        </motion.div>
      )}

      {/* Profiles Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3 uppercase tracking-wider">
          Discovery Profiles
        </h2>

        {profilesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <Radar
              size={24}
              className="mx-auto text-[var(--text-secondary)] mb-2"
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No discovery profiles yet
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Create a profile to configure automated CI discovery.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden sm:table-cell">
                    Schedule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">
                    Last Run
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const typeColor =
                    SCAN_TYPE_COLORS[profile.scanType] ??
                    SCAN_TYPE_COLORS.network;
                  return (
                    <tr
                      key={profile.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {profile.name}
                        </p>
                        {profile.description && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate max-w-[200px]">
                            {profile.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: typeColor.bg,
                            color: typeColor.text,
                          }}
                        >
                          {profile.scanType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-[var(--text-secondary)]">
                        {profile.schedule || "Manual"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--text-secondary)] tabular-nums">
                        {profile.lastRunAt
                          ? new Date(profile.lastRunAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: profile.isActive
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(107, 114, 128, 0.1)",
                            color: profile.isActive ? "#10B981" : "#6B7280",
                          }}
                        >
                          {profile.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={triggerRun.isPending && profile.scanType !== "csv_import"}
                          onClick={() =>
                            profile.scanType === "csv_import"
                              ? setShowCSVImport(true)
                              : triggerRun.mutate(profile.id)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
                        >
                          {triggerRun.isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Play size={12} />
                          )}
                          {profile.scanType === "csv_import" ? "Upload CSV" : "Run"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Recent Runs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3 uppercase tracking-wider">
          Recent Discovery Runs
        </h2>

        {runsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <Clock
              size={24}
              className="mx-auto text-[var(--text-secondary)] mb-2"
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No discovery runs yet
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Trigger a scan or import a CSV to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const isExpanded = expandedRunId === run.id;
              const statusColor =
                RUN_STATUS_COLORS[run.status] ?? RUN_STATUS_COLORS.pending;
              const StatusIcon =
                run.status === "completed"
                  ? CheckCircle
                  : run.status === "failed"
                    ? AlertCircle
                    : run.status === "scanning"
                      ? Loader2
                      : Clock;

              return (
                <div
                  key={run.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRunId(isExpanded ? null : run.id)
                    }
                    className="w-full text-left p-4 flex items-center justify-between transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                        style={{ backgroundColor: statusColor.bg }}
                      >
                        <StatusIcon
                          size={18}
                          style={{ color: statusColor.text }}
                          className={
                            run.status === "scanning" ? "animate-spin" : ""
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {run.profileName ?? "Discovery Run"}
                          </p>
                          {run.scanType && (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor:
                                  (SCAN_TYPE_COLORS[run.scanType] ?? SCAN_TYPE_COLORS.network).bg,
                                color:
                                  (SCAN_TYPE_COLORS[run.scanType] ?? SCAN_TYPE_COLORS.network).text,
                              }}
                            >
                              {humanizeScanType(run.scanType)}
                            </span>
                          )}
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                            }}
                          >
                            {run.status}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-0.5">
                          {run.startedAt
                            ? new Date(run.startedAt).toLocaleString()
                            : new Date(run.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <p
                            className="font-bold tabular-nums"
                            style={{ color: "#3B82F6" }}
                          >
                            {run.devicesFound}
                          </p>
                          <p className="text-[var(--text-secondary)]">Found</p>
                        </div>
                        <div className="text-center">
                          <p
                            className="font-bold tabular-nums"
                            style={{ color: "#10B981" }}
                          >
                            {run.newCis}
                          </p>
                          <p className="text-[var(--text-secondary)]">New</p>
                        </div>
                        <div className="text-center">
                          <p
                            className="font-bold tabular-nums"
                            style={{ color: "#F59E0B" }}
                          >
                            {run.updatedCis}
                          </p>
                          <p className="text-[var(--text-secondary)]">
                            Updated
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp
                          size={16}
                          className="text-[var(--text-secondary)]"
                        />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-[var(--text-secondary)]"
                        />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-[var(--border)] p-4 bg-[var(--surface-1)]"
                    >
                      <div className="sm:hidden grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "Found", value: run.devicesFound, color: "#3B82F6" },
                          { label: "New", value: run.newCis, color: "#10B981" },
                          { label: "Updated", value: run.updatedCis, color: "#F59E0B" },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="text-center rounded-lg bg-[var(--surface-0)] p-2"
                          >
                            <p
                              className="text-sm font-bold tabular-nums"
                              style={{ color: s.color }}
                            >
                              {s.value}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              {s.label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {run.errors && Array.isArray(run.errors) && run.errors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Messages
                          </p>
                          <div className="space-y-1">
                            {(run.errors as Array<Record<string, string>>).slice(0, 5).map((err, i) => (
                              <p
                                key={i}
                                className="text-xs text-[var(--text-secondary)] bg-[var(--surface-0)] rounded-lg px-3 py-1.5"
                              >
                                {err.message || err.error || JSON.stringify(err)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/cmdb/discovery/runs/${run.id}`,
                          )
                        }
                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        View Discovered Devices
                      </button>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
