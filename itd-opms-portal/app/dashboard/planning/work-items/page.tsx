"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  LayoutGrid,
  List,
  Plus,
  Filter,
  ClipboardList,
  Calendar,
  User,
} from "lucide-react";
import { DataTable, type Column, type BulkAction } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { InlineSelect, InlineDate } from "@/components/shared/inline-edit";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { useWorkItems, useWorkItemStatusCounts, useBulkUpdateWorkItems } from "@/hooks/use-planning";
import { useAuth } from "@/providers/auth-provider";
import { exportToCSV } from "@/lib/export-utils";
import { apiClient } from "@/lib/api-client";
import {
  CheckCircle,
  UserCheck,
  Download,
} from "lucide-react";
import type { WorkItem } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITIES = [
  { value: "", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const TYPES = [
  { value: "", label: "All Types" },
  { value: "epic", label: "Epic" },
  { value: "story", label: "Story" },
  { value: "task", label: "Task" },
  { value: "subtask", label: "Subtask" },
  { value: "milestone", label: "Milestone" },
];

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  high: { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" },
  medium: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  low: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

const KANBAN_COLUMNS: { status: string; label: string; color: string }[] = [
  { status: "todo", label: "Todo", color: "#6B7280" },
  { status: "in_progress", label: "In Progress", color: "#3B82F6" },
  { status: "in_review", label: "In Review", color: "#F59E0B" },
  { status: "done", label: "Done", color: "#10B981" },
  { status: "blocked", label: "Blocked", color: "#EF4444" },
];

/* ------------------------------------------------------------------ */
/*  Priority Badge                                                     */
/* ------------------------------------------------------------------ */

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {priority}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban Card                                                        */
/* ------------------------------------------------------------------ */

function KanbanCard({
  item,
  onClick,
}: {
  item: WorkItem;
  onClick: () => void;
}) {
  const priorityColor = PRIORITY_COLORS[item.priority.toLowerCase()];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
          {item.title}
        </p>
        {priorityColor && (
          <span
            className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: priorityColor.text }}
            title={item.priority}
          />
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)]">
        <span className="inline-flex items-center rounded bg-[var(--surface-2)] px-1.5 py-0.5 capitalize">
          {item.type}
        </span>
        <PriorityBadge priority={item.priority} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[var(--neutral-gray)]">
        {item.assigneeId ? (
          <span className="flex items-center gap-1">
            <User size={12} />
            {item.assigneeId.slice(0, 8)}...
          </span>
        ) : (
          <span>Unassigned</span>
        )}
        {item.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {new Date(item.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable Kanban Card (drag-and-drop wrapper)                       */
/* ------------------------------------------------------------------ */

function SortableKanbanCard({ item, onClick }: { item: WorkItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "card", status: item.status },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard item={item} onClick={onClick} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Droppable Column                                                   */
/* ------------------------------------------------------------------ */

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column", status: id } });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] flex flex-col gap-2 transition-all rounded-xl p-1 ${
        isOver ? "ring-2 ring-[var(--primary)]/20" : ""
      }`}
      style={isOver ? { backgroundColor: "rgba(27,115,64,0.05)" } : undefined}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban Board                                                       */
/* ------------------------------------------------------------------ */

function KanbanBoard({
  items,
  statusCounts,
  onCardClick,
  onStatusChange,
}: {
  items: WorkItem[];
  statusCounts: { status: string; count: number }[];
  onCardClick: (id: string) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
}) {
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const columnItemsMap = useMemo(() => {
    const map: Record<string, WorkItem[]> = {};
    for (const col of KANBAN_COLUMNS) {
      map[col.status] = items.filter(
        (i) => i.status.toLowerCase() === col.status,
      );
    }
    return map;
  }, [items]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const found = items.find((i) => i.id === active.id);
      setActiveItem(found ?? null);
    },
    [items],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const activeData = active.data.current as { type: string; status: string } | undefined;
      const overData = over.data.current as { type: string; status: string } | undefined;

      // Determine the target column status
      let targetStatus: string | undefined;
      if (overData?.type === "column") {
        targetStatus = overData.status;
      } else if (overData?.type === "card") {
        targetStatus = overData.status;
      }

      if (!targetStatus) return;

      const sourceStatus = activeData?.status?.toLowerCase();
      if (sourceStatus === targetStatus) return;

      onStatusChange(activeId, targetStatus);
    },
    [onStatusChange],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {KANBAN_COLUMNS.map((col) => {
          const columnItems = columnItemsMap[col.status] ?? [];
          const countObj = statusCounts.find(
            (c) => c.status.toLowerCase() === col.status,
          );
          const count = countObj?.count ?? columnItems.length;

          return (
            <div key={col.status} className="flex flex-col gap-3">
              {/* Column Header */}
              <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-1)] px-3 py-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {col.label}
                </span>
                <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--neutral-gray)]">
                  {count}
                </span>
              </div>

              {/* Column Body */}
              <DroppableColumn id={col.status}>
                <SortableContext
                  items={columnItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnItems.map((item) => (
                    <SortableKanbanCard
                      key={item.id}
                      item={item}
                      onClick={() => onCardClick(item.id)}
                    />
                  ))}
                  {columnItems.length === 0 && (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-8 text-xs text-[var(--neutral-gray)]">
                      No items
                    </div>
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      {/* Drag Overlay — ghost card shown while dragging */}
      <DragOverlay>
        {activeItem ? (
          <div style={{ transform: "rotate(3deg)", opacity: 0.9 }}>
            <KanbanCard item={activeItem} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WorkItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = searchParams.get("project_id") ?? undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useWorkItems(
    page,
    viewMode === "kanban" ? 100 : 20,
    projectId,
    status || undefined,
    undefined,
    priority || undefined,
    type || undefined,
  );

  const { data: statusCounts } = useWorkItemStatusCounts(projectId);

  const workItems = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Local items for optimistic drag-and-drop updates ---- */

  const [localItems, setLocalItems] = useState<WorkItem[]>([]);
  useEffect(() => {
    setLocalItems(workItems);
  }, [workItems]);

  const updateWorkItemStatus = useCallback(
    async (itemId: string, newStatus: string) => {
      // Optimistic update
      setLocalItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item,
        ),
      );
      try {
        await apiClient.put(`/planning/work-items/${itemId}`, {
          status: newStatus,
        });
        toast.success("Status updated");
      } catch {
        setLocalItems(workItems); // Revert on failure
        toast.error("Failed to update status");
      }
    },
    [workItems],
  );

  const { user } = useAuth();
  const bulkUpdate = useBulkUpdateWorkItems();
  const hasManage = user?.permissions?.includes("*") || user?.permissions?.includes("planning.manage");

  const exportColumns = useMemo(() => [
    { key: "title", header: "Title" },
    { key: "type", header: "Type" },
    { key: "priority", header: "Priority" },
    { key: "status", header: "Status" },
    { key: "dueDate", header: "Due Date", format: (v: any) => v ? new Date(v).toLocaleDateString() : "" },
  ], []);

  const bulkActions: BulkAction[] = useMemo(() => [
    {
      id: "done",
      label: "Mark Done",
      icon: CheckCircle,
      onExecute: async (ids) => {
        await bulkUpdate.mutateAsync({ ids, fields: { status: "done" } });
        toast.success(`${ids.length} item(s) marked done`);
      },
    },
    {
      id: "assign",
      label: "Assign to Me",
      icon: UserCheck,
      onExecute: async (ids) => {
        await bulkUpdate.mutateAsync({ ids, fields: { assigneeId: user?.id } });
        toast.success(`${ids.length} item(s) assigned`);
      },
    },
    {
      id: "export",
      label: "Export Selected",
      icon: Download,
      onExecute: (ids) => {
        const selected = workItems.filter((w) => ids.includes(w.id));
        exportToCSV(selected, exportColumns, "work-items-selected");
        toast.success("Exported selected items");
      },
    },
  ], [bulkUpdate, workItems, user?.id, exportColumns]);

  /* ---- Table Columns ---- */

  const columns: Column<WorkItem>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
            <ClipboardList size={16} className="text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-[var(--neutral-gray)] line-clamp-1 max-w-[300px]">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
          {item.type}
        </span>
      ),
    },
    {
      key: "assigneeId",
      header: "Assignee",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.assigneeId ? item.assigneeId.slice(0, 8) + "..." : "--"}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (item) => (
        <InlineSelect
          value={item.priority}
          options={[
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
          editable={!!hasManage}
          onSave={async (val) => {
            await apiClient.put(`/planning/work-items/${item.id}`, { priority: val });
          }}
          renderValue={(val) => <PriorityBadge priority={val} />}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => (
        <InlineSelect
          value={item.status}
          options={STATUSES.filter((s) => s.value !== "").map((s) => ({ value: s.value, label: s.label }))}
          editable={!!hasManage}
          onSave={async (val) => {
            await apiClient.put(`/planning/work-items/${item.id}`, { status: val });
          }}
          renderValue={(val) => <StatusBadge status={val} />}
        />
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (item) => (
        <InlineDate
          value={item.dueDate ? item.dueDate.slice(0, 10) : ""}
          editable={!!hasManage}
          onSave={async (val) => {
            await apiClient.put(`/planning/work-items/${item.id}`, { dueDate: val || null });
          }}
        />
      ),
    },
  ];

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
            <ClipboardList size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Work Items
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Track tasks, stories, and epics across projects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-xl border border-[var(--border)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LayoutGrid size={14} />
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <List size={14} />
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
          <ExportDropdown
            data={workItems}
            columns={exportColumns}
            filename="work-items"
            title="Work Items"
          />
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/planning/work-items/new")
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Work Item
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {viewMode === "kanban" ? (
          <KanbanBoard
            items={localItems}
            statusCounts={statusCounts ?? []}
            onCardClick={(id) =>
              router.push(`/dashboard/planning/work-items/${id}`)
            }
            onStatusChange={updateWorkItemStatus}
          />
        ) : (
          <DataTable
            columns={columns}
            data={workItems}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            selectable={!!hasManage}
            bulkActions={hasManage ? bulkActions : undefined}
            emptyTitle="No work items found"
            emptyDescription="Get started by creating your first work item."
            emptyAction={
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/planning/work-items/new")
                }
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                New Work Item
              </button>
            }
            onRowClick={(item) =>
              router.push(`/dashboard/planning/work-items/${item.id}`)
            }
            pagination={
              meta
                ? {
                    currentPage: meta.page,
                    totalPages: meta.totalPages,
                    totalItems: meta.totalItems,
                    pageSize: meta.pageSize,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        )}
      </motion.div>
    </div>
  );
}
