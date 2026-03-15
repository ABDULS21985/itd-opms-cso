"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Network,
  Search,
  Server,
  Monitor,
  Database,
  Cloud,
  HardDrive,
  Globe,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { useCMDBItems, useCMDBRelationships } from "@/hooks/use-cmdb";
import type { CMDBItem } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CI_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "server", label: "Server" },
  { value: "application", label: "Application" },
  { value: "database", label: "Database" },
  { value: "network_device", label: "Network Device" },
  { value: "storage", label: "Storage" },
  { value: "cloud_service", label: "Cloud Service" },
  { value: "virtual_machine", label: "Virtual Machine" },
  { value: "container", label: "Container" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "planned", label: "Planned" },
  { value: "decommissioned", label: "Decommissioned" },
];

const CI_TYPE_ICONS: Record<string, typeof Server> = {
  server: Server,
  application: Globe,
  database: Database,
  network_device: Network,
  storage: HardDrive,
  cloud_service: Cloud,
  virtual_machine: Monitor,
  container: Server,
};

const CI_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  server: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  application: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  database: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  network_device: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  storage: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  cloud_service: { bg: "rgba(14, 165, 233, 0.1)", text: "#0EA5E9" },
  virtual_machine: { bg: "rgba(244, 63, 94, 0.1)", text: "#F43F5E" },
  container: { bg: "rgba(20, 184, 166, 0.1)", text: "#14B8A6" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  planned: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  maintenance: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  decommissioned: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

/* ------------------------------------------------------------------ */
/*  CI Card Component                                                  */
/* ------------------------------------------------------------------ */

function CICard({
  item,
  isSelected,
  onSelect,
}: {
  item: CMDBItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = CI_TYPE_ICONS[item.ciType] ?? Server;
  const typeColor = CI_TYPE_COLORS[item.ciType] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
  };
  const statusColor = STATUS_COLORS[item.status] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="w-full text-left rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-sm"
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: isSelected ? "var(--primary)" : "var(--border)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: typeColor.bg }}
        >
          <Icon size={18} style={{ color: typeColor.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {item.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
            >
              {item.ciType.replace(/_/g, " ")}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
            >
              {item.status}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-secondary)] tabular-nums">
            v{item.version} | {new Date(item.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Relationship Panel Component                                        */
/* ------------------------------------------------------------------ */

function RelationshipPanel({
  ciId,
  ciName,
}: {
  ciId: string;
  ciName: string;
}) {
  const { data: relationships, isLoading } = useCMDBRelationships(ciId);
  const rels = relationships ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <LinkIcon size={16} className="text-[var(--primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Relationships for {ciName}
        </h3>
      </div>
      {rels.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
          No relationships configured for this CI.
        </p>
      ) : (
        <div className="space-y-2">
          {rels.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between rounded-lg bg-[var(--surface-1)] p-3"
            >
              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-[var(--text-secondary)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] capitalize">
                    {rel.relationshipType.replace(/_/g, " ")}
                  </p>
                  {rel.description && (
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {rel.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-[var(--text-secondary)]">
                  {rel.sourceCiId === ciId
                    ? rel.targetCiId.slice(0, 8) + "..."
                    : rel.sourceCiId.slice(0, 8) + "..."}
                </p>
                <span
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: rel.isActive
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(107, 114, 128, 0.1)",
                    color: rel.isActive ? "#10B981" : "#6B7280",
                  }}
                >
                  {rel.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TopologyPage() {
  const [page, setPage] = useState(1);
  const [ciType, setCiType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCiId, setSelectedCiId] = useState<string | null>(null);

  const { data, isLoading } = useCMDBItems(
    page,
    50,
    ciType || undefined,
    status || undefined,
  );

  const items = data?.data ?? [];
  const selectedItem = items.find((i) => i.id === selectedCiId);

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
            style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
          >
            <Network size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              CMDB Topology
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              View configuration items and their relationships
            </p>
          </div>
        </div>
      </motion.div>

      {/* Graph Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-xl border border-dashed p-8 text-center"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-1)",
        }}
      >
        <Network size={32} className="mx-auto text-[var(--text-secondary)] mb-3" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Network Topology Visualization
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Full graph visualization requires graph library integration (e.g. D3.js, React Flow, or Cytoscape).
          Below are CI items displayed as cards with relationship information.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: CI List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-1 space-y-4"
        >
          {/* Filters */}
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search CIs..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <select
              value={ciType}
              onChange={(e) => {
                setCiType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {CI_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* CI Items List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-8 text-center">
              <Server size={24} className="mx-auto text-[var(--text-secondary)] mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">
                No configuration items found.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {items.map((item) => (
                <CICard
                  key={item.id}
                  item={item}
                  isSelected={selectedCiId === item.id}
                  onSelect={setSelectedCiId}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Main Area: Selected CI Details & Relationships */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:col-span-2 space-y-4"
        >
          {selectedCiId && selectedItem ? (
            <>
              {/* Selected CI Details */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  Configuration Item Details
                </h2>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-[var(--text-secondary)]">Name</dt>
                    <dd className="text-[var(--text-primary)]">{selectedItem.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--text-secondary)]">CI Type</dt>
                    <dd className="capitalize text-[var(--text-primary)]">
                      {selectedItem.ciType.replace(/_/g, " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--text-secondary)]">Status</dt>
                    <dd className="capitalize text-[var(--text-primary)]">{selectedItem.status}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--text-secondary)]">Version</dt>
                    <dd className="text-[var(--text-primary)]">v{selectedItem.version}</dd>
                  </div>
                  {selectedItem.assetId && (
                    <div>
                      <dt className="text-xs font-medium text-[var(--text-secondary)]">Linked Asset</dt>
                      <dd className="font-mono text-[var(--primary)]">
                        {selectedItem.assetId.slice(0, 8)}...
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-[var(--text-secondary)]">Updated</dt>
                    <dd className="tabular-nums text-[var(--text-primary)]">
                      {new Date(selectedItem.updatedAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>

                {/* CI Attributes */}
                {selectedItem.attributes && Object.keys(selectedItem.attributes).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                      Attributes
                    </h3>
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      {Object.entries(selectedItem.attributes).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs font-medium text-[var(--text-secondary)] capitalize">
                            {key.replace(/_/g, " ")}
                          </dt>
                          <dd className="text-[var(--text-primary)]">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>

              {/* Relationships */}
              <RelationshipPanel ciId={selectedCiId} ciName={selectedItem.name} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-12 text-center">
              <Network size={32} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                Select a Configuration Item
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Click on a CI card in the left panel to view its details and relationships.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
