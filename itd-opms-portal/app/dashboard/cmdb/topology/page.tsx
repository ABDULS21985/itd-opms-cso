"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Cloud,
  Database,
  GitBranch,
  Globe,
  HardDrive,
  Link as LinkIcon,
  Loader2,
  Monitor,
  Network,
  Plus,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useCMDBItems,
  useCMDBTopology,
  useCreateRelationship,
  useDeleteRelationship,
} from "@/hooks/use-cmdb";
import type { CMDBItem, CMDBRelationship } from "@/types";

const PANEL_CLASS =
  "rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface-0)] shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";
const SOFT_PANEL_CLASS =
  "rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-[0_12px_30px_rgba(15,23,42,0.05)]";
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

const RELATIONSHIP_TYPES = [
  { value: "depends_on", label: "Depends On" },
  { value: "runs_on", label: "Runs On" },
  { value: "connected_to", label: "Connected To" },
  { value: "managed_by", label: "Managed By" },
  { value: "contains", label: "Contains" },
  { value: "uses", label: "Uses" },
];

const CI_TYPE_META: Record<
  string,
  { label: string; icon: ElementType; bg: string; text: string; accent: string }
> = {
  server: {
    label: "Server",
    icon: Server,
    bg: "var(--badge-blue-bg)",
    text: "var(--badge-blue-text)",
    accent: "var(--info)",
  },
  application: {
    label: "Application",
    icon: Globe,
    bg: "var(--badge-emerald-bg)",
    text: "var(--badge-emerald-text)",
    accent: "var(--success)",
  },
  database: {
    label: "Database",
    icon: Database,
    bg: "var(--badge-amber-bg)",
    text: "var(--gold-dark)",
    accent: "var(--gold)",
  },
  network_device: {
    label: "Network Device",
    icon: Network,
    bg: "var(--warning-light)",
    text: "var(--warning-dark)",
    accent: "var(--warning)",
  },
  storage: {
    label: "Storage",
    icon: HardDrive,
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
  },
  cloud_service: {
    label: "Cloud Service",
    icon: Cloud,
    bg: "var(--info-light)",
    text: "var(--info-dark)",
    accent: "var(--info)",
  },
  virtual_machine: {
    label: "Virtual Machine",
    icon: Monitor,
    bg: "var(--error-light)",
    text: "var(--error-dark)",
    accent: "var(--error)",
  },
  container: {
    label: "Container",
    icon: Boxes,
    bg: "rgba(15,118,110,0.12)",
    text: "#0F766E",
    accent: "#0F766E",
  },
};

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; border: string; accent: string }
> = {
  active: {
    label: "Active",
    bg: "var(--success-light)",
    text: "var(--success-dark)",
    border: "rgba(16,185,129,0.22)",
    accent: "var(--success)",
  },
  inactive: {
    label: "Inactive",
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    border: "var(--border)",
    accent: "var(--text-secondary)",
  },
  planned: {
    label: "Planned",
    bg: "var(--info-light)",
    text: "var(--info-dark)",
    border: "rgba(59,130,246,0.22)",
    accent: "var(--info)",
  },
  decommissioned: {
    label: "Decommissioned",
    bg: "var(--error-light)",
    text: "var(--error-dark)",
    border: "rgba(239,68,68,0.22)",
    accent: "var(--error)",
  },
};

const RELATIONSHIP_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  depends_on: {
    label: "Depends On",
    color: "var(--warning-dark)",
    bg: "var(--warning-light)",
  },
  runs_on: {
    label: "Runs On",
    color: "var(--primary)",
    bg: "var(--success-light)",
  },
  connected_to: {
    label: "Connected To",
    color: "var(--info-dark)",
    bg: "var(--info-light)",
  },
  managed_by: {
    label: "Managed By",
    color: "var(--gold-dark)",
    bg: "var(--badge-amber-bg)",
  },
  contains: {
    label: "Contains",
    color: "var(--text-secondary)",
    bg: "var(--surface-2)",
  },
  uses: {
    label: "Uses",
    color: "#0F766E",
    bg: "rgba(15,118,110,0.12)",
  },
};

function toTitle(value?: string): string {
  if (!value) return "--";
  return value.replace(/_/g, " ");
}

function formatTimestamp(value?: string): string {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}

function formatRelativeDate(value?: string): string {
  if (!value) return "--";
  const diffMs = Date.now() - new Date(value).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function getCITypeMeta(ciType: string) {
  return (
    CI_TYPE_META[ciType] ?? {
      label: toTitle(ciType),
      icon: Server,
      bg: "var(--surface-2)",
      text: "var(--text-secondary)",
      accent: "var(--text-secondary)",
    }
  );
}

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: toTitle(status),
      bg: "var(--surface-2)",
      text: "var(--text-secondary)",
      border: "var(--border)",
      accent: "var(--text-secondary)",
    }
  );
}

function getRelationshipMeta(type: string) {
  return (
    RELATIONSHIP_META[type] ?? {
      label: toTitle(type),
      color: "var(--text-secondary)",
      bg: "var(--surface-2)",
    }
  );
}

function TypeBadge({ ciType }: { ciType: string }) {
  const meta = getCITypeMeta(ciType);
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: meta.bg,
        color: meta.text,
        borderColor: meta.border,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.accent }}
      />
      {meta.label}
    </span>
  );
}

function RelationshipTypeBadge({
  relationshipType,
}: {
  relationshipType: string;
}) {
  const meta = getRelationshipMeta(relationshipType);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function CICard({
  item,
  isSelected,
  onSelect,
}: {
  item: CMDBItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = getCITypeMeta(item.ciType);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="w-full rounded-[1.2rem] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
      style={{
        borderColor: isSelected ? "rgba(27,115,64,0.24)" : "var(--border)",
        background: isSelected
          ? "linear-gradient(180deg, var(--surface-1), var(--success-light))"
          : "var(--surface-1)",
        boxShadow: isSelected
          ? "0 18px 40px rgba(27,115,64,0.12)"
          : "0 12px 28px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: meta.bg }}
        >
          <Icon size={18} style={{ color: meta.text }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {item.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <TypeBadge ciType={item.ciType} />
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            v{item.version} · Updated {formatRelativeDate(item.updatedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

function TopologyCanvas({
  items,
  relationships,
  selectedCiId,
  onSelect,
  isLoading,
}: {
  items: CMDBItem[];
  relationships: CMDBRelationship[];
  selectedCiId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedCiId) ?? items[0] ?? null,
    [items, selectedCiId],
  );

  const positionedNodes = useMemo(() => {
    if (!selectedItem)
      return [] as Array<{
        item: CMDBItem;
        x: number;
        y: number;
        isFocused: boolean;
        isNeighbor: boolean;
      }>;

    const neighborIds = new Set<string>();
    relationships.forEach((relationship) => {
      if (relationship.sourceCiId === selectedItem.id) {
        neighborIds.add(relationship.targetCiId);
      }
      if (relationship.targetCiId === selectedItem.id) {
        neighborIds.add(relationship.sourceCiId);
      }
    });

    const neighbors = items.filter((item) => neighborIds.has(item.id));
    const ambient = items.filter(
      (item) => item.id !== selectedItem.id && !neighborIds.has(item.id),
    );

    const nodes: Array<{
      item: CMDBItem;
      x: number;
      y: number;
      isFocused: boolean;
      isNeighbor: boolean;
    }> = [
      { item: selectedItem, x: 50, y: 48, isFocused: true, isNeighbor: false },
    ];

    neighbors.forEach((neighbor, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(neighbors.length, 1);
      nodes.push({
        item: neighbor,
        x: 50 + Math.cos(angle) * 30,
        y: 48 + Math.sin(angle) * 24,
        isFocused: false,
        isNeighbor: true,
      });
    });

    ambient.slice(0, 8).forEach((neighbor, index) => {
      const angle =
        (Math.PI * 2 * index) / Math.max(Math.min(ambient.length, 8), 1);
      nodes.push({
        item: neighbor,
        x: 50 + Math.cos(angle) * 42,
        y: 48 + Math.sin(angle) * 34,
        isFocused: false,
        isNeighbor: false,
      });
    });

    return nodes;
  }, [items, relationships, selectedItem]);

  const positionedEdges = useMemo(() => {
    const positions = new Map(
      positionedNodes.map((node) => [node.item.id, { x: node.x, y: node.y }]),
    );

    return relationships
      .filter(
        (relationship) =>
          positions.has(relationship.sourceCiId) &&
          positions.has(relationship.targetCiId),
      )
      .map((relationship) => ({
        relationship,
        source: positions.get(relationship.sourceCiId)!,
        target: positions.get(relationship.targetCiId)!,
      }));
  }, [positionedNodes, relationships]);

  return (
    <div className="relative min-h-[34rem] overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(27,115,64,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(27,115,64,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div
        className="pointer-events-none absolute inset-x-12 top-10 h-56 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(27,115,64,0.12), transparent 68%)",
        }}
      />

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-0)]/72 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm text-[var(--text-secondary)]">
            <Loader2 size={16} className="animate-spin" />
            Loading topology...
          </div>
        </div>
      )}

      {positionedNodes.length === 0 ? (
        <div className="relative z-10 flex h-full min-h-[34rem] flex-col items-center justify-center px-6 text-center">
          <Network size={36} className="mb-3 text-[var(--text-secondary)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No topology nodes available
          </h3>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Adjust the current filters or create configuration item
            relationships to populate the dependency map.
          </p>
        </div>
      ) : (
        <div className="relative h-full min-h-[34rem]">
          <svg className="absolute inset-0 h-full w-full">
            {positionedEdges.map(({ relationship, source, target }) => {
              const highlighted =
                relationship.sourceCiId === selectedItem?.id ||
                relationship.targetCiId === selectedItem?.id;
              const meta = getRelationshipMeta(relationship.relationshipType);
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;

              return (
                <g key={relationship.id}>
                  <line
                    x1={`${source.x}%`}
                    y1={`${source.y}%`}
                    x2={`${target.x}%`}
                    y2={`${target.y}%`}
                    stroke={meta.color}
                    strokeOpacity={highlighted ? 0.8 : 0.28}
                    strokeWidth={highlighted ? 2.5 : 1.5}
                    strokeDasharray={highlighted ? undefined : "5 5"}
                  />
                  <g transform={`translate(${midX}%, ${midY}%)`}>
                    <rect
                      x={-32}
                      y={-10}
                      width={64}
                      height={20}
                      rx={10}
                      fill="var(--surface-0)"
                      stroke="var(--border)"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fill: meta.color,
                      }}
                    >
                      {meta.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {positionedNodes.map((node) => {
            const meta = getCITypeMeta(node.item.ciType);
            const isSelected = node.item.id === selectedItem?.id;
            const Icon = meta.icon;

            return (
              <button
                key={node.item.id}
                type="button"
                onClick={() => onSelect(node.item.id)}
                className="absolute w-40 -translate-x-1/2 -translate-y-1/2 rounded-[1.2rem] border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-[52%]"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  borderColor: isSelected
                    ? "rgba(27,115,64,0.3)"
                    : node.isNeighbor
                      ? `${meta.accent}30`
                      : "var(--border)",
                  background: isSelected
                    ? "linear-gradient(180deg, var(--surface-1), var(--success-light))"
                    : "var(--surface-1)",
                  boxShadow: isSelected
                    ? "0 20px 44px rgba(27,115,64,0.16)"
                    : "0 12px 28px rgba(15,23,42,0.06)",
                  zIndex: isSelected ? 12 : node.isNeighbor ? 10 : 8,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: meta.bg }}
                  >
                    <Icon size={16} style={{ color: meta.text }} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {node.item.name}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {meta.label}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RelationshipPanel({
  ciId,
  relationships,
  itemMap,
  onSelectCI,
}: {
  ciId: string;
  relationships: CMDBRelationship[];
  itemMap: Map<string, CMDBItem>;
  onSelectCI: (id: string) => void;
}) {
  const deleteRelationship = useDeleteRelationship();
  const ciRelationships = useMemo(
    () =>
      relationships.filter(
        (relationship) =>
          relationship.sourceCiId === ciId || relationship.targetCiId === ciId,
      ),
    [relationships, ciId],
  );

  return (
    <div className={`${PANEL_CLASS} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Relationship Ledger
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Direct dependency links for the selected configuration item.
          </p>
        </div>
        <GitBranch size={18} className="text-[var(--primary)]" />
      </div>

      <div className="mt-4 space-y-3">
        {ciRelationships.length === 0 ? (
          <div className={`${SOFT_PANEL_CLASS} p-5 text-center`}>
            <p className="text-sm text-[var(--text-secondary)]">
              No relationships are configured for this configuration item yet.
            </p>
          </div>
        ) : (
          ciRelationships.map((relationship) => {
            const isOutbound = relationship.sourceCiId === ciId;
            const counterpartId = isOutbound
              ? relationship.targetCiId
              : relationship.sourceCiId;
            const counterpart = itemMap.get(counterpartId);
            const meta = getRelationshipMeta(relationship.relationshipType);

            return (
              <div
                key={relationship.id}
                className="rounded-[1.2rem] border p-4"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-1)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RelationshipTypeBadge
                        relationshipType={relationship.relationshipType}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        {isOutbound ? "Outbound" : "Inbound"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => counterpart && onSelectCI(counterpart.id)}
                      className="mt-3 inline-flex items-center gap-2 text-left text-sm font-semibold text-[var(--text-primary)]"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {counterpart?.name ?? `${counterpartId.slice(0, 8)}...`}
                    </button>
                    {relationship.description && (
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {relationship.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <ArrowRight size={12} />
                      {isOutbound ? "Flows to" : "Flows from"}{" "}
                      {counterpart?.ciType
                        ? toTitle(counterpart.ciType)
                        : "linked CI"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      deleteRelationship.mutate({
                        ciId,
                        relationshipId: relationship.id,
                      })
                    }
                    disabled={deleteRelationship.isPending}
                    className="rounded-xl border border-[var(--error)]/20 bg-[var(--error-light)] p-2 text-[var(--error-dark)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Delete relationship"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RelationshipModal({
  selectedCiId,
  items,
  onClose,
}: {
  selectedCiId: string | null;
  items: CMDBItem[];
  onClose: () => void;
}) {
  const createRelationship = useCreateRelationship();
  const [sourceCiId, setSourceCiId] = useState(
    selectedCiId ?? items[0]?.id ?? "",
  );
  const [targetCiId, setTargetCiId] = useState(
    items.find((item) => item.id !== (selectedCiId ?? items[0]?.id))?.id ?? "",
  );
  const [relationshipType, setRelationshipType] = useState("depends_on");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const initialSource = selectedCiId ?? items[0]?.id ?? "";
    setSourceCiId(initialSource);
    setTargetCiId(items.find((item) => item.id !== initialSource)?.id ?? "");
  }, [selectedCiId, items]);

  const canSubmit =
    sourceCiId !== "" &&
    targetCiId !== "" &&
    sourceCiId !== targetCiId &&
    relationshipType !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`${PANEL_CLASS} relative w-full max-w-xl p-0 overflow-hidden`}
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Create Relationship
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Link two configuration items into the live topology graph.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Source CI
              </label>
              <select
                value={sourceCiId}
                onChange={(event) => setSourceCiId(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
              >
                <option value="">Select source CI</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Target CI
              </label>
              <select
                value={targetCiId}
                onChange={(event) => setTargetCiId(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
              >
                <option value="">Select target CI</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Relationship Type
            </label>
            <select
              value={relationshipType}
              onChange={(event) => setRelationshipType(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Describe why this dependency exists or how the systems interact."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
            />
          </div>

          {sourceCiId && targetCiId && sourceCiId === targetCiId && (
            <div className="rounded-2xl border border-[var(--error)]/20 bg-[var(--error-light)] px-4 py-3 text-sm text-[var(--error-dark)]">
              Source and target must be different configuration items.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || createRelationship.isPending}
              onClick={() =>
                createRelationship.mutate(
                  {
                    ciId: sourceCiId,
                    sourceCiId,
                    targetCiId,
                    relationshipType,
                    description: description.trim() || undefined,
                  },
                  { onSuccess: onClose },
                )
              }
              className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              style={PRIMARY_BUTTON_STYLE}
            >
              {createRelationship.isPending
                ? "Creating..."
                : "Create Relationship"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function TopologyPage() {
  const [ciType, setCiType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCiId, setSelectedCiId] = useState<string | null>(null);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);

  const deferredSearch = useDeferredValue(search.trim());
  const { data: listTopology, isLoading: listLoading } = useCMDBTopology(
    deferredSearch || undefined,
    ciType || undefined,
    status || undefined,
    undefined,
    120,
  );
  const { data: focusTopology, isLoading: focusLoading } = useCMDBTopology(
    undefined,
    undefined,
    undefined,
    selectedCiId ?? undefined,
    120,
  );
  const { data: ciOptionsData } = useCMDBItems(1, 200);

  const listItems = listTopology?.items ?? [];
  const graphData = selectedCiId ? focusTopology : listTopology;
  const graphItems = graphData?.items ?? [];
  const graphRelationships = graphData?.relationships ?? [];
  const topologyStats = listTopology?.stats;
  const focusStats = focusTopology?.stats;
  const allCiOptions = ciOptionsData?.data ?? listItems;
  const isLoading = listLoading || (selectedCiId !== null && focusLoading);

  useEffect(() => {
    if (listItems.length === 0) {
      setSelectedCiId(null);
      return;
    }

    setSelectedCiId((current) =>
      current && listItems.some((item) => item.id === current)
        ? current
        : listItems[0].id,
    );
  }, [listItems]);

  const itemMap = useMemo(() => {
    const map = new Map<string, CMDBItem>();
    [...listItems, ...graphItems, ...allCiOptions].forEach((item) =>
      map.set(item.id, item),
    );
    return map;
  }, [listItems, graphItems, allCiOptions]);

  const selectedItem = selectedCiId
    ? (itemMap.get(selectedCiId) ?? null)
    : null;
  const selectedAttributes = useMemo(
    () =>
      selectedItem?.attributes
        ? Object.entries(selectedItem.attributes).slice(0, 8)
        : [],
    [selectedItem],
  );

  return (
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
              CMDB Topology Studio
            </div>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                <Network size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
                  CMDB Topology
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/84 sm:text-[15px]">
                  Explore live CI dependencies, inspect direct neighbors, and
                  manage relationships from a real graph instead of a
                  placeholder surface.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Boxes size={14} />
                    {topologyStats?.totalItems ?? 0} visible CIs
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <GitBranch size={14} />
                    {topologyStats?.totalRelationships ?? 0} mapped
                    relationships
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <ShieldCheck size={14} />
                    {topologyStats?.activeItems ?? 0} active items
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[500px]">
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Focus Node
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                {selectedItem?.name ?? "None selected"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {selectedItem
                  ? `${focusStats?.focusedNeighborCount ?? 0} direct relationship${(focusStats?.focusedNeighborCount ?? 0) === 1 ? "" : "s"} in view.`
                  : "Select a configuration item to load its direct neighbors."}
              </p>
            </div>
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Active Filters
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                {[
                  deferredSearch && "Search",
                  ciType && "Type",
                  status && "Status",
                ]
                  .filter(Boolean)
                  .join(" · ") || "None"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Search, CI type, and status filters shape the current inventory
                lens.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="space-y-5"
        >
          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Filter Inventory
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Narrow the CI list before loading a focus node.
                </p>
              </div>
              <Search size={18} className="text-[var(--primary)]" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search configuration items..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                />
              </div>

              <select
                value={ciType}
                onChange={(event) => setCiType(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
              >
                {CI_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCiType("");
                  setStatus("");
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowRelationshipModal(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                style={PRIMARY_BUTTON_STYLE}
              >
                <Plus size={16} />
                Link CIs
              </button>
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Configuration Items
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Select a node to focus the topology graph.
                </p>
              </div>
              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {listItems.length}
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[42rem] overflow-y-auto pr-1">
              {listLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2
                    size={18}
                    className="animate-spin text-[var(--primary)]"
                  />
                </div>
              ) : listItems.length === 0 ? (
                <div className={`${SOFT_PANEL_CLASS} p-5 text-center`}>
                  <p className="text-sm text-[var(--text-secondary)]">
                    No configuration items matched the current filter set.
                  </p>
                </div>
              ) : (
                listItems.map((item) => (
                  <CICard
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedCiId}
                    onSelect={setSelectedCiId}
                  />
                ))
              )}
            </div>
          </section>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          <div className={`${PANEL_CLASS} p-5`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Dependency Graph
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Focused visual map of the selected CI and its directly
                  connected neighbors.
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {graphRelationships.length} visible edges
              </span>
            </div>

            <div className="mt-4">
              <TopologyCanvas
                items={graphItems}
                relationships={graphRelationships}
                selectedCiId={selectedCiId}
                onSelect={setSelectedCiId}
                isLoading={isLoading}
              />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className={`${PANEL_CLASS} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Selected CI
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Operational detail and current metadata for the focused
                    node.
                  </p>
                </div>
                <ArrowUpRight size={18} className="text-[var(--gold)]" />
              </div>

              {selectedItem ? (
                <div className="mt-4 space-y-4">
                  <div className={`${SOFT_PANEL_CLASS} p-4`}>
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor: getCITypeMeta(selectedItem.ciType)
                            .bg,
                        }}
                      >
                        {(() => {
                          const Icon = getCITypeMeta(selectedItem.ciType).icon;
                          return (
                            <Icon
                              size={18}
                              style={{
                                color: getCITypeMeta(selectedItem.ciType).text,
                              }}
                            />
                          );
                        })()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {selectedItem.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <TypeBadge ciType={selectedItem.ciType} />
                          <StatusBadge status={selectedItem.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`${SOFT_PANEL_CLASS} p-4`}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        Version
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                        v{selectedItem.version}
                      </p>
                    </div>
                    <div className={`${SOFT_PANEL_CLASS} p-4`}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        Linked Asset
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                        {selectedItem.assetId
                          ? `${selectedItem.assetId.slice(0, 8)}...`
                          : "Not linked"}
                      </p>
                    </div>
                  </div>

                  <div className={`${SOFT_PANEL_CLASS} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Timeline
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      <p>Created {formatTimestamp(selectedItem.createdAt)}</p>
                      <p>Updated {formatTimestamp(selectedItem.updatedAt)}</p>
                    </div>
                  </div>

                  <div className={`${SOFT_PANEL_CLASS} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Attributes
                    </p>
                    {selectedAttributes.length > 0 ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {selectedAttributes.map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                              {toTitle(key)}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-primary)]">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        No attributes are stored for this configuration item
                        yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`${SOFT_PANEL_CLASS} mt-4 p-5 text-center`}>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Select a configuration item to inspect its detail surface.
                  </p>
                </div>
              )}
            </div>

            {selectedCiId ? (
              <RelationshipPanel
                ciId={selectedCiId}
                relationships={graphRelationships}
                itemMap={itemMap}
                onSelectCI={setSelectedCiId}
              />
            ) : (
              <div className={`${PANEL_CLASS} p-5`}>
                <div className={`${SOFT_PANEL_CLASS} p-5 text-center`}>
                  <LinkIcon
                    size={24}
                    className="mx-auto text-[var(--text-secondary)]"
                  />
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Relationship details appear here when a focus node is
                    selected.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <AnimatePresence>
        {showRelationshipModal && (
          <RelationshipModal
            selectedCiId={selectedCiId}
            items={allCiOptions}
            onClose={() => setShowRelationshipModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
