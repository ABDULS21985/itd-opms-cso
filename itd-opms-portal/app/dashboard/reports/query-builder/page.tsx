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

  // Handle entity type change — reset columns to defaults
  const handleEntityChange = useCallback(
    (newType: string) => {
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
        problems: ["ticket_number", "title", "status", "priority", "created_at"],
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
    },
    [],
  );

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
        const result = (data as unknown as { data?: QueryResult }).data ?? (data as QueryResult);
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

  const isExporting = exportMutation.isPending || exportExcelMutation.isPending || exportPDFMutation.isPending;

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
  const handleLoadQuery = useCallback(
    (sq: SavedQuery) => {
      setEntityType(sq.entityType);
      setSelectedColumns(sq.columns);
      const parsedFilters = Array.isArray(sq.filters) ? sq.filters : [];
      setFilters(
        parsedFilters.map((f) => ({
          ...f,
          value:
            Array.isArray(f.value) ? (f.value as string[]).join(", ") : f.value,
        })),
      );
      setSortBy(sq.sortBy || undefined);
      setSortOrder(sq.sortOrder || "desc");
      setGroupBy(sq.groupBy || undefined);
      setChartType(sq.chartType || "table");
      setPreviewResult(null);
      setShowLoadDialog(false);
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "var(--primary)",
              color: "#fff",
            }}
          >
            <DatabaseZap size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Query Builder
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Build ad-hoc queries across all OPMS data without writing SQL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLoadDialog(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
          >
            <FolderOpen size={16} />
            Load Saved
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
          >
            <Save size={16} />
            Save Query
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!previewResult || isExporting || selectedColumns.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!previewResult || isExporting || selectedColumns.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!previewResult || isExporting || selectedColumns.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <FileText size={16} />
            PDF
          </button>
          <button
            onClick={handlePreview}
            disabled={
              previewMutation.isPending || selectedColumns.length === 0
            }
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ background: "var(--primary)" }}
          >
            <Play size={16} />
            {previewMutation.isPending ? "Running..." : "Run Query"}
          </button>
        </div>
      </motion.div>

      {/* 3-panel layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel: Entity & columns */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="col-span-3 space-y-4"
        >
          {/* Entity type selector */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Layers size={14} style={{ color: "var(--primary)" }} />
              Entity Type
            </h3>
            <select
              value={entityType}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>

          {/* Column picker */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Columns3 size={14} style={{ color: "var(--primary)" }} />
              Columns ({selectedColumns.length})
            </h3>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {currentFields.map((f) => (
                <label
                  key={f.name}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-2)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(f.name)}
                    onChange={() => toggleColumn(f.name)}
                    className="h-3.5 w-3.5 rounded border-[var(--border)]"
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span className="text-[var(--text-primary)]">{f.name}</span>
                  <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                    {f.type}
                  </span>
                </label>
              ))}
              {currentFields.length === 0 && (
                <p className="py-4 text-center text-xs text-[var(--text-tertiary)]">
                  Loading schema...
                </p>
              )}
            </div>
          </div>

          {/* Sort */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <ArrowUpDown size={14} style={{ color: "var(--primary)" }} />
              Sort
            </h3>
            <select
              value={sortBy || ""}
              onChange={(e) => setSortBy(e.target.value || undefined)}
              className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              <option value="">None</option>
              {currentFields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {/* Group By */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Columns3 size={14} style={{ color: "var(--primary)" }} />
              Group By
            </h3>
            <select
              value={groupBy || ""}
              onChange={(e) => setGroupBy(e.target.value || undefined)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              <option value="">None</option>
              {currentFields
                .filter((f) => f.type === "enum" || f.type === "string")
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Chart type */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Visualization
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {CHART_TYPES.map((ct) => {
                const Icon = CHART_ICONS[ct.value] || Table;
                const active = chartType === ct.value;
                return (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: active
                        ? "var(--primary)"
                        : "var(--surface-2)",
                      color: active ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    <Icon size={12} />
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Center panel: Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-9 space-y-4"
        >
          {/* Filter builder */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Filter size={14} style={{ color: "var(--primary)" }} />
                Filters ({filters.length})
              </h3>
              <button
                onClick={addFilter}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--primary)" }}
              >
                <Plus size={14} />
                Add Filter
              </button>
            </div>

            {filters.length === 0 ? (
              <p className="py-3 text-center text-xs text-[var(--text-tertiary)]">
                No filters — query will return all rows (limited to 100 for
                preview)
              </p>
            ) : (
              <div className="space-y-2">
                {filters.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {/* Field */}
                    <select
                      value={f.field}
                      onChange={(e) =>
                        updateFilter(idx, { field: e.target.value })
                      }
                      className="w-40 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    >
                      {currentFields.map((cf) => (
                        <option key={cf.name} value={cf.name}>
                          {cf.name}
                        </option>
                      ))}
                    </select>

                    {/* Operator */}
                    <select
                      value={f.operator}
                      onChange={(e) =>
                        updateFilter(idx, { operator: e.target.value })
                      }
                      className="w-36 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value */}
                    {f.operator !== "is_null" &&
                      f.operator !== "is_not_null" && (
                        <input
                          type="text"
                          value={String(f.value ?? "")}
                          onChange={(e) =>
                            updateFilter(idx, { value: e.target.value })
                          }
                          placeholder={
                            f.operator === "in" || f.operator === "not_in"
                              ? "val1, val2, ..."
                              : f.operator === "between"
                                ? "start, end"
                                : "value"
                          }
                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                        />
                      )}

                    {/* Remove */}
                    <button
                      onClick={() => removeFilter(idx)}
                      className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results preview */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Results Preview
                {previewResult && (
                  <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                    ({previewResult.rowCount} rows)
                  </span>
                )}
              </h3>
              {previewMutation.isPending && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  Executing query...
                </span>
              )}
            </div>

            {!previewResult && !previewMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                <Table size={40} className="mb-3 opacity-30" />
                <p className="text-sm">
                  Click &quot;Run Query&quot; to see results
                </p>
              </div>
            )}

            {previewMutation.isPending && (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-8 rounded-lg bg-[var(--surface-2)] animate-pulse"
                  />
                ))}
              </div>
            )}

            {previewResult && previewResult.rowCount > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                      {previewResult.columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left text-xs font-medium uppercase text-[var(--text-secondary)]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)] transition-colors"
                      >
                        {previewResult.columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 text-[var(--text-primary)]"
                          >
                            {formatCellValue(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previewResult && previewResult.rowCount === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                <p className="text-sm">No results found</p>
                <p className="mt-1 text-xs">
                  Try adjusting your filters or entity type
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Save Query Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Save Query
                </h2>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-2)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="My custom query"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                    Description
                  </label>
                  <textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    rows={2}
                    placeholder="What does this query help you track?"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>

                {/* Share toggle */}
                <div className="flex items-center gap-3">
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
                      className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      style={{
                        transform: saveIsShared
                          ? "translateX(20px)"
                          : "translateX(0)",
                      }}
                    />
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
                    <Share2 size={14} />
                    Share with team
                  </span>
                </div>

                {/* Schedule section */}
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                    <Clock size={14} />
                    Schedule (optional)
                  </h4>
                  <input
                    type="text"
                    value={scheduleCron}
                    onChange={(e) => setScheduleCron(e.target.value)}
                    placeholder="Cron expression (e.g. 0 9 * * 1 = every Monday 9am)"
                    className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                  <input
                    type="text"
                    value={scheduleEmails}
                    onChange={(e) => setScheduleEmails(e.target.value)}
                    placeholder="Email recipients (comma-separated)"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim() || createSavedQuery.isPending}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--primary)" }}
                >
                  <Save size={14} />
                  {createSavedQuery.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Load Saved Query Dialog */}
      <AnimatePresence>
        {showLoadDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowLoadDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Saved Queries
                </h2>
                <button
                  onClick={() => setShowLoadDialog(false)}
                  className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-2)]"
                >
                  <X size={18} />
                </button>
              </div>

              {savedQueries.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                  No saved queries yet
                </div>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {savedQueries.map((sq) => (
                    <div
                      key={sq.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--surface-1)] transition-colors"
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleLoadQuery(sq)}
                      >
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {sq.name}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {ENTITY_TYPES.find((e) => e.value === sq.entityType)
                            ?.label || sq.entityType}{" "}
                          &middot; {sq.columns.length} columns
                          {sq.schedule && (
                            <span className="ml-1">
                              &middot; <Clock size={10} className="inline" />{" "}
                              Scheduled
                            </span>
                          )}
                          {sq.isShared && (
                            <span className="ml-1">
                              &middot; <Share2 size={10} className="inline" />{" "}
                              Shared
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() =>
                            runSavedQuery.mutate(sq.id, {
                              onSuccess: (data) => {
                                const result = (data as unknown as { data?: QueryResult }).data ?? (data as QueryResult);
                                setPreviewResult(result);
                                setShowLoadDialog(false);
                              },
                            })
                          }
                          className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--primary)]"
                          title="Run"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => deleteSavedQuery.mutate(sq.id)}
                          className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
