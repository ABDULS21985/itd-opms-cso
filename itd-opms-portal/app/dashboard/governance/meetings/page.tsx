"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  Plus,
  Pencil,
  CheckCircle,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useMeetings,
  useActionItems,
  useCompleteAction,
} from "@/hooks/use-governance";
import { formatDate } from "@/lib/utils";
import type { Meeting, ActionItem } from "@/types";

/* ------------------------------------------------------------------ */
/*  Tab Type                                                           */
/* ------------------------------------------------------------------ */

type Tab = "meetings" | "actions";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MeetingsAndActionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("meetings");

  /* Meetings state */
  const [meetingPage, setMeetingPage] = useState(1);
  const [meetingStatus, setMeetingStatus] = useState<string | undefined>(
    undefined,
  );
  const {
    data: meetingsData,
    isLoading: meetingsLoading,
  } = useMeetings(meetingPage, 20, meetingStatus);
  const meetings = meetingsData?.data ?? [];
  const meetingMeta = meetingsData?.meta;

  /* Actions state */
  const [actionPage, setActionPage] = useState(1);
  const [actionStatus, setActionStatus] = useState<string | undefined>(
    undefined,
  );
  const {
    data: actionsData,
    isLoading: actionsLoading,
  } = useActionItems(actionPage, 20, actionStatus);
  const actions = actionsData?.data ?? [];
  const actionMeta = actionsData?.meta;

  const completeMutation = useCompleteAction();

  /* ------------------------------------------------------------------ */
  /*  Meeting columns                                                    */
  /* ------------------------------------------------------------------ */

  const meetingColumns: Column<Meeting>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-[var(--text-primary)]">
          {item.title}
        </span>
      ),
    },
    {
      key: "meetingType",
      header: "Type",
      render: (item) => (
        <span className="capitalize text-[var(--text-secondary)]">
          {item.meetingType?.replace(/_/g, " ") || "--"}
        </span>
      ),
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      sortable: true,
      render: (item) => (
        <span className="text-[var(--text-secondary)]">
          {formatDate(item.scheduledAt)}
        </span>
      ),
    },
    {
      key: "organizerId",
      header: "Organizer",
      render: (item) => (
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {item.organizerId?.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Action columns                                                     */
  /* ------------------------------------------------------------------ */

  const actionColumns: Column<ActionItem>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-[var(--text-primary)]">
          {item.title}
        </span>
      ),
    },
    {
      key: "sourceType",
      header: "Source",
      render: (item) => (
        <span className="capitalize text-[var(--text-secondary)]">
          {item.sourceType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {item.ownerId.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (item) => {
        const isOverdue =
          item.status !== "completed" &&
          new Date(item.dueDate) < new Date();
        return (
          <span
            className={
              isOverdue
                ? "text-[var(--error)] font-medium"
                : "text-[var(--text-secondary)]"
            }
          >
            {formatDate(item.dueDate)}
            {isOverdue && (
              <AlertTriangle
                size={12}
                className="inline ml-1 text-[var(--error)]"
              />
            )}
          </span>
        );
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (item) => {
        const priorityColor: Record<string, string> = {
          critical: "var(--error)",
          high: "#F59E0B",
          medium: "var(--primary)",
          low: "var(--text-secondary)",
        };
        return (
          <span
            className="capitalize text-xs font-medium"
            style={{ color: priorityColor[item.priority] || "inherit" }}
          >
            {item.priority}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) =>
        item.status !== "completed" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              completeMutation.mutate(item.id);
            }}
            disabled={completeMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--success-light)]"
            style={{ color: "var(--success)" }}
            title="Mark complete"
          >
            <CheckCircle size={14} />
            Complete
          </button>
        ) : null,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Status filter options                                              */
  /* ------------------------------------------------------------------ */

  const meetingStatuses = [
    { value: "", label: "All Statuses" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const actionStatuses = [
    { value: "", label: "All Statuses" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "overdue", label: "Overdue" },
  ];

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/governance"
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Meetings & Action Items
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Schedule meetings, track decisions, and manage action items.
            </p>
          </div>
        </div>
        {activeTab === "meetings" && (
          <Link
            href="/dashboard/governance/meetings/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Plus size={16} />
            Schedule Meeting
          </Link>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex items-center gap-1 rounded-xl border p-1"
        style={{
          backgroundColor: "var(--surface-1)",
          borderColor: "var(--border)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("meetings")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeTab === "meetings"
              ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Calendar size={16} />
          Meetings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("actions")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeTab === "actions"
              ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <ClipboardList size={16} />
          Action Items
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <select
          value={activeTab === "meetings" ? meetingStatus || "" : actionStatus || ""}
          onChange={(e) => {
            const val = e.target.value || undefined;
            if (activeTab === "meetings") {
              setMeetingStatus(val);
              setMeetingPage(1);
            } else {
              setActionStatus(val);
              setActionPage(1);
            }
          }}
          className="rounded-xl border px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          {(activeTab === "meetings" ? meetingStatuses : actionStatuses).map(
            (opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ),
          )}
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {activeTab === "meetings" ? (
          <DataTable
            columns={meetingColumns}
            data={meetings}
            keyExtractor={(item) => item.id}
            loading={meetingsLoading}
            emptyTitle="No meetings found"
            emptyDescription="Schedule your first meeting to get started."
            emptyAction={
              <Link
                href="/dashboard/governance/meetings/new"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Plus size={16} />
                Schedule Meeting
              </Link>
            }
            onRowClick={(item) =>
              router.push(`/dashboard/governance/meetings/${item.id}`)
            }
            pagination={
              meetingMeta
                ? {
                    currentPage: meetingMeta.page,
                    totalPages: meetingMeta.totalPages,
                    totalItems: meetingMeta.totalItems,
                    pageSize: meetingMeta.pageSize,
                    onPageChange: setMeetingPage,
                  }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={actionColumns}
            data={actions}
            keyExtractor={(item) => item.id}
            loading={actionsLoading}
            emptyTitle="No action items found"
            emptyDescription="Action items from meetings and decisions will appear here."
            pagination={
              actionMeta
                ? {
                    currentPage: actionMeta.page,
                    totalPages: actionMeta.totalPages,
                    totalItems: actionMeta.totalItems,
                    pageSize: actionMeta.pageSize,
                    onPageChange: setActionPage,
                  }
                : undefined
            }
          />
        )}
      </motion.div>
    </div>
  );
}
