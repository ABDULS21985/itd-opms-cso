"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Network,
  MonitorSmartphone,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Connector {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "connected" | "disconnected" | "not_configured";
  lastSync?: string;
  capabilities: string[];
  configFields: { label: string; key: string; type: string }[];
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  connected: { bg: "rgba(16,185,129,0.12)", text: "#10B981" },
  disconnected: { bg: "rgba(239,68,68,0.12)", text: "#EF4444" },
  not_configured: { bg: "rgba(156,163,175,0.12)", text: "#9CA3AF" },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  connected: CheckCircle,
  disconnected: XCircle,
  not_configured: Clock,
};

const CONNECTORS: Connector[] = [
  {
    id: "sccm",
    name: "Microsoft SCCM",
    description:
      "Import hardware and software inventory from System Center Configuration Manager. Supports CSV/Excel export parsing with configurable column mapping.",
    icon: MonitorSmartphone,
    status: "not_configured",
    capabilities: [
      "Hardware inventory import",
      "Software inventory import",
      "CSV/Excel export parsing",
      "Configurable column mapping",
    ],
    configFields: [
      { label: "SCCM Endpoint", key: "endpoint", type: "text" },
      { label: "Database Name", key: "database", type: "text" },
      { label: "Authentication", key: "auth_type", type: "text" },
    ],
  },
  {
    id: "ad",
    name: "Active Directory",
    description:
      "Import computer objects from Active Directory via Microsoft Graph API. Automatically maps AD device attributes to CMDB configuration items.",
    icon: Network,
    status: "not_configured",
    capabilities: [
      "Computer object import",
      "OU-based filtering",
      "Delta sync support",
      "OS and device type detection",
    ],
    configFields: [
      { label: "Domain", key: "domain", type: "text" },
      { label: "OU Filter", key: "ou_filter", type: "text" },
    ],
  },
  {
    id: "mega_ea",
    name: "MEGA EA",
    description:
      "Exchange CI data with MEGA Enterprise Architecture via XSD-aligned XML format. Supports both import and export of configuration items.",
    icon: FileSpreadsheet,
    status: "not_configured",
    capabilities: [
      "XML/XSD CI exchange",
      "Bi-directional sync",
      "Relationship mapping",
      "Attribute preservation",
    ],
    configFields: [
      { label: "MEGA Endpoint", key: "endpoint", type: "text" },
      { label: "API Key", key: "api_key", type: "password" },
    ],
  },
  {
    id: "csv",
    name: "CSV Import",
    description:
      "Bulk import CIs from CSV files with flexible column mapping. Supports automatic CI matching and reconciliation.",
    icon: Upload,
    status: "connected",
    lastSync: new Date().toISOString(),
    capabilities: [
      "Flexible column aliases",
      "Auto CI matching",
      "Bulk reconciliation",
      "Error reporting",
    ],
    configFields: [],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          CMDB Integrations
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage external connectors for automated CI discovery and data
          exchange.
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Connectors",
            value: CONNECTORS.length,
            color: "#3B82F6",
          },
          {
            label: "Connected",
            value: CONNECTORS.filter((c) => c.status === "connected").length,
            color: "#10B981",
          },
          {
            label: "Disconnected",
            value: CONNECTORS.filter((c) => c.status === "disconnected").length,
            color: "#EF4444",
          },
          {
            label: "Not Configured",
            value: CONNECTORS.filter((c) => c.status === "not_configured")
              .length,
            color: "#9CA3AF",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Connector cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CONNECTORS.map((connector, idx) => {
          const isExpanded = expandedId === connector.id;
          const StatusIcon = STATUS_ICONS[connector.status];
          const statusStyle = STATUS_COLORS[connector.status];

          return (
            <motion.div
              key={connector.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
            >
              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-lg p-2"
                      style={{ backgroundColor: "var(--surface-1)" }}
                    >
                      <connector.icon
                        size={20}
                        style={{ color: "var(--primary)" }}
                      />
                    </div>
                    <div>
                      <h3
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {connector.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusIcon size={12} style={{ color: statusStyle.text }} />
                        <span
                          className="text-xs font-medium capitalize"
                          style={{ color: statusStyle.text }}
                        >
                          {connector.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connector.status === "connected" && (
                      <button
                        onClick={() =>
                          toast.info(`Sync started for ${connector.name}`)
                        }
                        className="rounded-lg p-2 hover:bg-[var(--surface-1)] transition-colors"
                        title="Run sync"
                      >
                        <RefreshCw
                          size={16}
                          style={{ color: "var(--text-secondary)" }}
                        />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : connector.id)
                      }
                      className="rounded-lg p-2 hover:bg-[var(--surface-1)] transition-colors"
                      title="Configure"
                    >
                      <Settings
                        size={16}
                        style={{ color: "var(--text-secondary)" }}
                      />
                    </button>
                  </div>
                </div>

                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {connector.description}
                </p>

                {connector.lastSync && (
                  <p
                    className="mt-2 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Last sync:{" "}
                    {new Date(connector.lastSync).toLocaleString()}
                  </p>
                )}

                {/* Capabilities */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {connector.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--surface-1)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Expanded config panel */}
              {isExpanded && connector.configFields.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-[var(--border)] p-5 space-y-3"
                  style={{ backgroundColor: "var(--surface-1)" }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Configuration
                  </p>
                  {connector.configFields.map((field) => (
                    <div key={field.key}>
                      <label
                        className="block text-xs font-medium mb-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() =>
                        toast.success(`${connector.name} configuration saved`)
                      }
                      className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      Save Configuration
                    </button>
                    <button
                      onClick={() =>
                        toast.info(`Testing ${connector.name} connection...`)
                      }
                      className="rounded-lg px-4 py-2 text-sm font-medium border border-[var(--border)]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Test Connection
                    </button>
                  </div>
                </motion.div>
              )}

              {isExpanded && connector.configFields.length === 0 && (
                <div
                  className="border-t border-[var(--border)] p-5"
                  style={{ backgroundColor: "var(--surface-1)" }}
                >
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    This connector is available through the{" "}
                    <a
                      href="/dashboard/cmdb/discovery"
                      className="underline"
                      style={{ color: "var(--primary)" }}
                    >
                      Discovery
                    </a>{" "}
                    page. No additional configuration needed.
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
