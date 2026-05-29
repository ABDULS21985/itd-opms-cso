"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DatabaseZap,
  Play,
  Save,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  X,
  Trash2,
  Table,
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  Share2,
  FolderOpen,
  Filter,
  Columns3,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import {
  useQuerySchema,
  usePreviewQuery,
  useExportQuery,
  useExportExcel,
  useExportPDF,
  useCreateSavedQuery,
  useSavedQueries,
  useRunSavedQuery,
  useDeleteSavedQuery,
  OPERATORS,
  ENTITY_TYPES,
  CHART_TYPES,
  type QueryFilter,
  type ExecuteQueryInput,
  type QueryResult,
  type EntityFieldInfo,
  type SavedQuery,
} from "@/hooks/use-query-builder";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const CHART_ICONS: Record<string, React.ElementType> = {
  table: Table,
  bar: BarChart3,
  line: TrendingUp,
  pie: PieChart,
  donut: PieChart,
};

const PANEL_CLASS =
  "rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-0)] shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";

const INPUT_CLASS =
  "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-tertiary)] focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-2)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(5,150,105,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_48px_-26px_rgba(13,148,136,0.75)] disabled:cursor-not-allowed disabled:opacity-50";

const ICON_BUTTON_CLASS =
  "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-tertiary)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-500";

const ENTITY_META: Record<
  string,
  { description: string; tint: string; border: string; accent: string }
> = {
  tickets: {
    description:
      "Investigate service disruptions, queues, and active escalations.",
    tint: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.28)",
    accent: "#047857",
  },
  assets: {
    description:
      "Explore ownership, lifecycle, and inventory-backed asset records.",
    tint: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.22)",
    accent: "#2563EB",
  },
  cmdb_items: {
    description:
      "Inspect configuration items, environments, and service relationships.",
    tint: "rgba(14, 165, 233, 0.1)",
    border: "rgba(14, 165, 233, 0.24)",
    accent: "#0284C7",
  },
  problems: {
    description:
      "Track recurring issues, root causes, and corrective investigation work.",
    tint: "rgba(244, 114, 182, 0.1)",
    border: "rgba(244, 114, 182, 0.24)",
    accent: "#DB2777",
  },
  changes: {
    description: "Review planned changes, approvals, and execution readiness.",
    tint: "rgba(249, 115, 22, 0.1)",
    border: "rgba(249, 115, 22, 0.24)",
    accent: "#EA580C",
  },
  releases: {
    description: "Compare release health, cutovers, and deployment readiness.",
    tint: "rgba(168, 85, 247, 0.1)",
    border: "rgba(168, 85, 247, 0.24)",
    accent: "#9333EA",
  },
  service_requests: {
    description:
      "Measure fulfilment throughput, approvals, and request demand.",
    tint: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.26)",
    accent: "#D97706",
  },
  kb_articles: {
    description: "Study content quality, usage, and publishing performance.",
    tint: "rgba(15, 118, 110, 0.12)",
    border: "rgba(15, 118, 110, 0.24)",
    accent: "#0F766E",
  },
};

/* ================================================================== */
/*  Page component                                                     */
/* ================================================================== */

export default function QueryBuilderPage() {
  // Entity & column selection
  const [entityType, setEntityType] = useState("tickets");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "ticket_number",
    "title",
    "status",
    "priority",
    "created_at",
  ]);

  // Filters
  const [filters, setFilters] = useState<QueryFilter[]>([]);

  // Sort / group / chart
  const [sortBy, setSortBy] = useState<string | undefined>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [groupBy, setGroupBy] = useState<string | undefined>(undefined);
  const [chartType, setChartType] = useState<string>("table");

  // UI state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [previewResult, setPreviewResult] = useState<QueryResult | null>(null);

  // Save form
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveIsShared, setSaveIsShared] = useState(false);

  // Schedule form
  const [scheduleCron, setScheduleCron] = useState("");
  const [scheduleEmails, setScheduleEmails] = useState("");

  // API hooks
  const { data: schemaData } = useQuerySchema();
  const previewMutation = usePreviewQuery();
  const exportMutation = useExportQuery();
  const exportExcelMutation = useExportExcel();
  const exportPDFMutation = useExportPDF();
  const createSavedQuery = useCreateSavedQuery();
  const { data: savedQueriesData } = useSavedQueries(1, 50);
  const runSavedQuery = useRunSavedQuery();
  const deleteSavedQuery = useDeleteSavedQuery();

  // Derive fields for current entity type
  const currentFields: EntityFieldInfo[] = useMemo(() => {
    if (!schemaData) return [];
    const raw = schemaData as unknown;
    const arr = Array.isArray(raw) ? raw : (raw as { data?: unknown }).data;
    if (!Array.isArray(arr)) return [];
    const schema = arr.find(
      (s: { entityType: string }) => s.entityType === entityType,
    );
    return schema?.fields ?? [];
  }, [schemaData, entityType]);

  const savedQueries: SavedQuery[] = useMemo(() => {
    if (!savedQueriesData) return [];
    const raw = savedQueriesData as unknown;
    if (Array.isArray(raw)) return raw;
    const obj = raw as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data;
    return [];
  }, [savedQueriesData]);

  const activeEntity = useMemo(
    () =>
      ENTITY_TYPES.find((type) => type.value === entityType) ?? ENTITY_TYPES[0],
    [entityType],
  );

  const activeChart = useMemo(
    () =>
      CHART_TYPES.find((type) => type.value === chartType) ?? CHART_TYPES[0],
    [chartType],
  );

  const ActiveChartIcon = CHART_ICONS[activeChart.value] || Table;

  const activeEntityMeta = ENTITY_META[entityType] ?? ENTITY_META.tickets;

  const scheduledSavedQueries = useMemo(
    () => savedQueries.filter((query) => Boolean(query.schedule)).length,
    [savedQueries],
  );

  const highlightedColumns = useMemo(
    () => selectedColumns.slice(0, 4),
    [selectedColumns],
  );

  // Handle entity type change — reset columns to defaults
  const handleEntityChange = useCallback((newType: string) => {
    setEntityType(newType);
    setFilters([]);
    setSortBy("created_at");
    setGroupBy(undefined);
    setPreviewResult(null);
    // Set default columns based on type
    const defaults: Record<string, string[]> = {
      tickets: ["ticket_number", "title", "status", "priority", "created_at"],
      assets: ["asset_tag", "name", "asset_type", "status", "created_at"],
      cmdb_items: ["name", "ci_type", "status", "environment", "created_at"],
      problems: [
        "problem_number",
        "title",
        "status",
        "root_cause",
        "created_at",
      ],
      changes: [
        "ticket_number",
        "title",
        "status",
        "change_type",
        "created_at",
      ],
      releases: [
        "release_number",
        "title",
        "status",
        "release_type",
        "created_at",
      ],
      service_requests: [
        "ticket_number",
        "title",
        "status",
        "priority",
        "created_at",
      ],
      kb_articles: ["title", "status", "view_count", "created_at"],
    };
    setSelectedColumns(defaults[newType] || ["id", "created_at"]);
  }, []);

  // Toggle column selection
  const toggleColumn = useCallback((field: string) => {
    setSelectedColumns((prev) =>
      prev.includes(field) ? prev.filter((c) => c !== field) : [...prev, field],
    );
  }, []);

  // Add a new empty filter
  const addFilter = useCallback(() => {
    const firstField = currentFields[0]?.name || "status";
    setFilters((prev) => [
      ...prev,
      { field: firstField, operator: "eq", value: "" },
    ]);
  }, [currentFields]);

  // Update a filter
  const updateFilter = useCallback(
    (index: number, patch: Partial<QueryFilter>) => {
      setFilters((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  // Remove a filter
  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Build the query spec
  const buildQuerySpec = useCallback((): ExecuteQueryInput => {
    const cleanFilters = filters.filter(
      (f) =>
        f.operator === "is_null" ||
        f.operator === "is_not_null" ||
        (f.value !== "" && f.value !== null && f.value !== undefined),
    );

    // Parse "in" / "not_in" comma-separated values
    const parsedFilters = cleanFilters.map((f) => {
      if (
        (f.operator === "in" || f.operator === "not_in") &&
        typeof f.value === "string"
      ) {
        return {
          ...f,
          value: f.value
            .split(",")
            .map((v: string) => v.trim())
            .filter(Boolean),
        };
      }
      if (f.operator === "between" && typeof f.value === "string") {
        const parts = f.value.split(",").map((v: string) => v.trim());
        return { ...f, value: parts };
      }
      return f;
    });

    return {
      entityType,
      columns: selectedColumns,
      filters: parsedFilters,
      sortBy,
      sortOrder,
      groupBy,
    };
  }, [entityType, selectedColumns, filters, sortBy, sortOrder, groupBy]);

  // Run preview
  const handlePreview = useCallback(() => {
    const spec = buildQuerySpec();
    previewMutation.mutate(spec, {
      onSuccess: (data) => {
        const result =
          (data as unknown as { data?: QueryResult }).data ??
          (data as QueryResult);
        setPreviewResult(result);
      },
    });
  }, [buildQuerySpec, previewMutation]);

  // Exports
  const handleExportCSV = useCallback(() => {
    exportMutation.mutate(buildQuerySpec());
  }, [buildQuerySpec, exportMutation]);

  const handleExportExcel = useCallback(() => {
    exportExcelMutation.mutate(buildQuerySpec());
  }, [buildQuerySpec, exportExcelMutation]);

  const handleExportPDF = useCallback(() => {
    exportPDFMutation.mutate(buildQuerySpec());
  }, [buildQuerySpec, exportPDFMutation]);

  const isExporting =
    exportMutation.isPending ||
    exportExcelMutation.isPending ||
    exportPDFMutation.isPending;

  // Save query
  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    const spec = buildQuerySpec();
    createSavedQuery.mutate(
      {
        name: saveName,
        description: saveDescription || undefined,
        entityType: spec.entityType,
        filters: spec.filters,
        columns: spec.columns,
        sortBy: spec.sortBy,
        sortOrder: spec.sortOrder,
        groupBy: spec.groupBy,
        chartType,
        isShared: saveIsShared,
        schedule: scheduleCron || undefined,
        emailRecipients: scheduleEmails
          ? scheduleEmails.split(",").map((e) => e.trim())
          : undefined,
      },
      {
        onSuccess: () => {
          setShowSaveDialog(false);
          setSaveName("");
          setSaveDescription("");
        },
      },
    );
  }, [
    saveName,
    saveDescription,
    saveIsShared,
    chartType,
    scheduleCron,
    scheduleEmails,
    buildQuerySpec,
    createSavedQuery,
  ]);

  // Load saved query into builder
  const handleLoadQuery = useCallback((sq: SavedQuery) => {
    setEntityType(sq.entityType);
    setSelectedColumns(sq.columns);
    const parsedFilters = Array.isArray(sq.filters) ? sq.filters : [];
    setFilters(
      parsedFilters.map((f) => ({
        ...f,
        value: Array.isArray(f.value)
          ? (f.value as string[]).join(", ")
          : f.value,
      })),
    );
    setSortBy(sq.sortBy || undefined);
    setSortOrder(sq.sortOrder || "desc");
    setGroupBy(sq.groupBy || undefined);
    setChartType(sq.chartType || "table");
    setPreviewResult(null);
    setShowLoadDialog(false);
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-emerald-200/60 bg-gradient-to-br from-[#0f5132] via-[#13795b] to-[#0b6177] px-6 py-7 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.55)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.24),transparent_32%)]" />
        <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/82 backdrop-blur-xl">
              <DatabaseZap size={14} />
              Reports Studio
            </div>
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                <DatabaseZap size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.15rem]">
                  Query Builder
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/86 sm:text-[15px]">
                  Build ad-hoc operational reports across OPMS without writing
                  SQL, then save, schedule, and export the views your teams rely
                  on.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Layers size={14} />
                    {activeEntity.label}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Filter size={14} />
                    {filters.length} active filter
                    {filters.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Columns3 size={14} />
                    {selectedColumns.length} selected column
                    {selectedColumns.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <ActiveChartIcon size={14} />
                    {activeChart.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[460px]">
            {[
              {
                icon: Layers,
                label: "Data Source",
                value: activeEntity.label,
                hint: `${currentFields.length} fields available`,
              },
              {
                icon: Columns3,
                label: "Selected Columns",
                value: String(selectedColumns.length),
                hint: selectedColumns.length
                  ? highlightedColumns.join(", ")
                  : "Choose fields to begin",
              },
              {
                icon: Filter,
                label: "Query Shape",
                value: `${filters.length} filter${filters.length === 1 ? "" : "s"}`,
                hint: groupBy ? `Grouped by ${groupBy}` : "Ungrouped preview",
              },
              {
                icon: Save,
                label: "Saved Views",
                value: String(savedQueries.length),
                hint: `${scheduledSavedQueries} scheduled`,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-[1.35rem] border border-white/14 bg-white/10 p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between text-white/72">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                      {item.label}
                    </span>
                    <Icon size={16} />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-50/76">
                    {item.hint}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`${PANEL_CLASS} p-3 sm:p-4`}
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowLoadDialog(true)}
            className={SECONDARY_BUTTON_CLASS}
          >
            <FolderOpen size={16} />
            Load Saved
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className={SECONDARY_BUTTON_CLASS}
          >
            <Save size={16} />
            Save Query
          </button>
          <button
            onClick={handleExportCSV}
            disabled={
              !previewResult || isExporting || selectedColumns.length === 0
            }
            className={SECONDARY_BUTTON_CLASS}
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={
              !previewResult || isExporting || selectedColumns.length === 0
            }
            className={SECONDARY_BUTTON_CLASS}
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={
              !previewResult || isExporting || selectedColumns.length === 0
            }
            className={SECONDARY_BUTTON_CLASS}
          >
            <FileText size={16} />
            PDF
          </button>
          <button
            onClick={handlePreview}
            disabled={previewMutation.isPending || selectedColumns.length === 0}
            className={`${PRIMARY_BUTTON_CLASS} sm:ml-auto`}
          >
            <Play size={16} />
            {previewMutation.isPending ? "Running..." : "Run Query"}
          </button>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[360px,minmax(0,1fr)]">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-5"
        >
          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                  <Layers
                    size={16}
                    style={{ color: activeEntityMeta.accent }}
                  />
                  Data Source
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Point the builder at the record set you want to explore.
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {activeEntity.label}
              </span>
            </div>

            <select
              value={entityType}
              onChange={(e) => handleEntityChange(e.target.value)}
              className={`${INPUT_CLASS} mt-4`}
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>

            <div
              className="mt-4 rounded-[1.4rem] border p-4"
              style={{
                backgroundColor: activeEntityMeta.tint,
                borderColor: activeEntityMeta.border,
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: activeEntityMeta.accent }}
              >
                Active Lens
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                {activeEntityMeta.description}
              </p>
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                  <Columns3
                    size={16}
                    style={{ color: activeEntityMeta.accent }}
                  />
                  Column Selection
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Choose the fields that should appear in the preview and
                  exports.
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {selectedColumns.length}/{currentFields.length || 0}
              </span>
            </div>

            {selectedColumns.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {highlightedColumns.map((column) => (
                  <span
                    key={column}
                    className="rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    {column}
                  </span>
                ))}
                {selectedColumns.length > highlightedColumns.length && (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                    +{selectedColumns.length - highlightedColumns.length} more
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {currentFields.map((field) => {
                const active = selectedColumns.includes(field.name);

                return (
                  <label
                    key={field.name}
                    className="flex cursor-pointer items-center gap-3 rounded-[1.15rem] border px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
                    style={{
                      borderColor: active
                        ? activeEntityMeta.border
                        : "var(--border)",
                      backgroundColor: active
                        ? activeEntityMeta.tint
                        : "var(--surface-1)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleColumn(field.name)}
                      className="h-4 w-4 rounded border-[var(--border)]"
                      style={{ accentColor: activeEntityMeta.accent }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {field.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Included in preview and export output
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                      {field.type}
                    </span>
                  </label>
                );
              })}

              {currentFields.length === 0 && (
                <div className="rounded-[1.3rem] border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-4 py-10 text-center text-sm text-[var(--text-tertiary)]">
                  Loading entity schema...
                </div>
              )}
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-5`}>
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                <ArrowUpDown
                  size={16}
                  style={{ color: activeEntityMeta.accent }}
                />
                Query Shape
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Sort, group, and pick the visualization that best frames the
                output.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Sort by
                </label>
                <select
                  value={sortBy || ""}
                  onChange={(e) => setSortBy(e.target.value || undefined)}
                  className={INPUT_CLASS}
                >
                  <option value="">None</option>
                  {currentFields.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Sort direction
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Group by
                </label>
                <select
                  value={groupBy || ""}
                  onChange={(e) => setGroupBy(e.target.value || undefined)}
                  className={INPUT_CLASS}
                >
                  <option value="">None</option>
                  {currentFields
                    .filter(
                      (field) =>
                        field.type === "enum" || field.type === "string",
                    )
                    .map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Visualization
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHART_TYPES.map((type) => {
                    const Icon = CHART_ICONS[type.value] || Table;
                    const active = chartType === type.value;

                    return (
                      <button
                        key={type.value}
                        onClick={() => setChartType(type.value)}
                        className="flex items-center gap-3 rounded-[1.15rem] border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          borderColor: active
                            ? activeEntityMeta.border
                            : "var(--border)",
                          backgroundColor: active
                            ? activeEntityMeta.tint
                            : "var(--surface-1)",
                          color: active
                            ? activeEntityMeta.accent
                            : "var(--text-secondary)",
                        }}
                      >
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                          style={{
                            borderColor: active
                              ? activeEntityMeta.border
                              : "var(--border)",
                            backgroundColor: active
                              ? "var(--surface-0)"
                              : "var(--surface-2)",
                          }}
                        >
                          <Icon size={16} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">
                            {type.label}
                          </span>
                          <span className="block text-xs text-[var(--text-tertiary)]">
                            {type.value === "table"
                              ? "Raw rows with all selected columns"
                              : "Use the same query as a chart-ready dataset"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-5"
        >
          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                  <Filter
                    size={16}
                    style={{ color: activeEntityMeta.accent }}
                  />
                  Filters
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Shape the dataset before preview. Empty filters return the
                  latest sample of rows.
                </p>
              </div>
              <button
                onClick={addFilter}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-100"
              >
                <Plus size={16} />
                Add Filter
              </button>
            </div>

            {filters.length === 0 ? (
              <div className="mt-5 rounded-[1.4rem] border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-5 py-12 text-center">
                <Filter size={32} className="mx-auto text-[var(--text-tertiary)]" />
                <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">
                  No filters applied
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Run the query as-is, or add constraints to narrow the result
                  set.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filters.map((filter, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] p-3 lg:grid-cols-[minmax(0,1.05fr)_210px_minmax(0,1.2fr)_auto]"
                  >
                    <select
                      value={filter.field}
                      onChange={(e) =>
                        updateFilter(index, { field: e.target.value })
                      }
                      className={INPUT_CLASS}
                    >
                      {currentFields.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) =>
                        updateFilter(index, { operator: e.target.value })
                      }
                      className={INPUT_CLASS}
                    >
                      {OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>

                    {filter.operator !== "is_null" &&
                    filter.operator !== "is_not_null" ? (
                      <input
                        type="text"
                        value={String(filter.value ?? "")}
                        onChange={(e) =>
                          updateFilter(index, { value: e.target.value })
                        }
                        placeholder={
                          filter.operator === "in" ||
                          filter.operator === "not_in"
                            ? "val1, val2, ..."
                            : filter.operator === "between"
                              ? "start, end"
                              : "value"
                        }
                        className={INPUT_CLASS}
                      />
                    ) : (
                      <div className="flex items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-tertiary)]">
                        No value required for this operator
                      </div>
                    )}

                    <button
                      onClick={() => removeFilter(index)}
                      className={ICON_BUTTON_CLASS}
                      title="Remove filter"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${PANEL_CLASS} overflow-hidden`}>
            <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    Results Preview
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Preview the first 100 rows before exporting the full
                    dataset.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {previewResult
                      ? `${previewResult.rowCount} rows`
                      : "No preview"}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {previewResult
                      ? `${previewResult.columns.length} columns`
                      : `${selectedColumns.length} selected`}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {activeChart.label}
                  </span>
                </div>
              </div>
            </div>

            {!previewResult && !previewMutation.isPending && (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-emerald-100 bg-emerald-50/80 text-emerald-600 shadow-[0_18px_40px_rgba(16,185,129,0.12)]">
                  <Table size={34} />
                </div>
                <p className="mt-5 text-base font-semibold text-[var(--text-primary)]">
                  Your preview will appear here
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                  Select columns, add filters if needed, then run the query to
                  inspect a sample before saving or exporting it.
                </p>
              </div>
            )}

            {previewMutation.isPending && (
              <div className="space-y-3 p-5">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-[1rem] bg-[var(--surface-2)]"
                  />
                ))}
              </div>
            )}

            {previewResult && previewResult.rowCount > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                      {previewResult.columns.map((column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-[var(--border)] last:border-b-0 hover:bg-emerald-50/35"
                      >
                        {previewResult.columns.map((column) => (
                          <td
                            key={column}
                            className="px-4 py-3 align-top text-[var(--text-primary)]"
                          >
                            <span className="block max-w-[22rem] truncate">
                              {formatCellValue(row[column])}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previewResult && previewResult.rowCount === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  No results matched
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Adjust your filters, grouping, or entity type and try again.
                </p>
              </div>
            )}
          </section>
        </motion.div>
      </div>

      {/* Save Query Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`${PANEL_CLASS} w-full max-w-xl overflow-hidden p-0`}
            >
              <div className="border-b border-[var(--border)] bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Save Query</h2>
                    <p className="mt-1 text-sm text-emerald-50/82">
                      Turn the current builder state into a reusable reporting
                      view.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="rounded-2xl border border-white/12 bg-white/10 p-2 text-white/82 transition-colors hover:bg-white/16"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="My custom query"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                      Description
                    </label>
                    <textarea
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      rows={3}
                      placeholder="What does this query help you track?"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                      <Share2 size={14} />
                      Share with team
                    </span>
                    <button
                      onClick={() => setSaveIsShared(!saveIsShared)}
                      className="relative h-6 w-11 rounded-full transition-colors"
                      style={{
                        background: saveIsShared
                          ? "var(--primary)"
                          : "var(--surface-3)",
                      }}
                    >
                      <span
                        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                        style={{
                          transform: saveIsShared
                            ? "translateX(20px)"
                            : "translateX(0)",
                        }}
                      />
                    </button>
                  </div>

                  <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-1)] p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <Clock size={14} />
                      Schedule
                    </h4>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Send the query output automatically on a reporting
                      cadence.
                    </p>
                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        value={scheduleCron}
                        onChange={(e) => setScheduleCron(e.target.value)}
                        placeholder="Cron expression (e.g. 0 9 * * 1)"
                        className={INPUT_CLASS}
                      />
                      <input
                        type="text"
                        value={scheduleEmails}
                        onChange={(e) => setScheduleEmails(e.target.value)}
                        placeholder="Email recipients (comma-separated)"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className={SECONDARY_BUTTON_CLASS}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim() || createSavedQuery.isPending}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    <Save size={14} />
                    {createSavedQuery.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Load Saved Query Dialog */}
      <AnimatePresence>
        {showLoadDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
            onClick={() => setShowLoadDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`${PANEL_CLASS} w-full max-w-xl overflow-hidden p-0`}
            >
              <div className="border-b border-[var(--border)] bg-gradient-to-r from-[#0f5132] to-[#0b6177] px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Saved Queries</h2>
                    <p className="mt-1 text-sm text-emerald-50/82">
                      Reopen your reusable report definitions and run them
                      again.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLoadDialog(false)}
                    className="rounded-2xl border border-white/12 bg-white/10 p-2 text-white/82 transition-colors hover:bg-white/16"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {savedQueries.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
                    No saved queries yet
                  </div>
                ) : (
                  <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                    {savedQueries.map((sq) => (
                      <div
                        key={sq.id}
                        className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
                      >
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleLoadQuery(sq)}
                        >
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {sq.name}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {ENTITY_TYPES.find(
                              (entity) => entity.value === sq.entityType,
                            )?.label || sq.entityType}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                              {sq.columns.length} columns
                            </span>
                            {sq.schedule && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                <Clock size={10} />
                                Scheduled
                              </span>
                            )}
                            {sq.isShared && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                <Share2 size={10} />
                                Shared
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-2 flex items-center gap-2">
                          <button
                            onClick={() =>
                              runSavedQuery.mutate(sq.id, {
                                onSuccess: (data) => {
                                  const result =
                                    (data as unknown as { data?: QueryResult })
                                      .data ?? (data as QueryResult);
                                  setPreviewResult(result);
                                  setShowLoadDialog(false);
                                },
                              })
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/90 text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-100"
                            title="Run"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            onClick={() => deleteSavedQuery.mutate(sq.id)}
                            className={ICON_BUTTON_CLASS}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") {
    // Try to format ISO dates
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      try {
        return new Date(val).toLocaleString();
      } catch {
        return val;
      }
    }
    return val;
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}
