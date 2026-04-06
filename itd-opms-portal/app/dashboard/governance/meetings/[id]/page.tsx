"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Plus,
  FileText,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { UserPicker } from "@/components/shared/pickers";
import {
  useMeeting,
  useUpdateMeeting,
  useMeetingDecisions,
  useCreateDecision,
  useCreateActionItem,
  useActionItems,
  useCompleteAction,
} from "@/hooks/use-governance";
import { formatDate } from "@/lib/utils";
import type { MeetingDecision, ActionItem } from "@/types";

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = params.id as string;

  const { data: meeting, isLoading } = useMeeting(meetingId);
  const updateMeeting = useUpdateMeeting(meetingId);
  const { data: decisions, isLoading: decisionsLoading } =
    useMeetingDecisions(meetingId);
  const createDecision = useCreateDecision(meetingId);
  const { data: actionsData } = useActionItems(1, 50, undefined, undefined, "meeting", meetingId);
  const createAction = useCreateActionItem();
  const completeAction = useCompleteAction();

  const relatedActions = actionsData?.data ?? [];

  /* Minutes editing */
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [minutes, setMinutes] = useState("");

  /* Decision form */
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    description: "",
    rationale: "",
  });

  /* Action form */
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({
    title: "",
    ownerId: "",
    ownerDisplay: "",
    dueDate: "",
    priority: "medium",
  });

  /* ------------------------------------------------------------------ */
  /*  Status transitions                                                 */
  /* ------------------------------------------------------------------ */

  function handleStatusChange(newStatus: string) {
    updateMeeting.mutate({ status: newStatus });
  }

  function handleSaveMinutes() {
    updateMeeting.mutate(
      { minutes: minutes.trim() },
      {
        onSuccess: () => setEditingMinutes(false),
      },
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Decision submit                                                    */
  /* ------------------------------------------------------------------ */

  function handleCreateDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!decisionForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    createDecision.mutate(
      {
        title: decisionForm.title.trim(),
        description: decisionForm.description.trim(),
        rationale: decisionForm.rationale.trim() || undefined,
      },
      {
        onSuccess: () => {
          setDecisionForm({
            title: "",
            description: "",
            rationale: "",
          });
          setShowDecisionForm(false);
        },
      },
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Action submit                                                      */
  /* ------------------------------------------------------------------ */

  function handleCreateAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionForm.title.trim() || !actionForm.ownerId.trim()) {
      toast.error("Title and owner are required");
      return;
    }
    createAction.mutate(
      {
        sourceType: "meeting",
        sourceId: meetingId,
        title: actionForm.title.trim(),
        ownerId: actionForm.ownerId.trim(),
        dueDate: actionForm.dueDate
          ? new Date(actionForm.dueDate).toISOString()
          : new Date().toISOString(),
        priority: actionForm.priority,
      },
      {
        onSuccess: () => {
          setActionForm({
            title: "",
            ownerId: "",
            ownerDisplay: "",
            dueDate: "",
            priority: "medium",
          });
          setShowActionForm(false);
        },
      },
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  if (isLoading) return <PageSkeleton />;

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[var(--text-secondary)]">Meeting not found.</p>
        <Link
          href="/dashboard/governance/meetings"
          className="mt-4 text-sm font-medium text-[var(--primary)]"
        >
          Back to Meetings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/governance/meetings"
              className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  {meeting.title}
                </h1>
                <StatusBadge status={meeting.status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-secondary)]">
                {meeting.meetingType && (
                  <span className="capitalize">
                    {meeting.meetingType.replace(/_/g, " ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(meeting.scheduledAt)}
                </span>
                {meeting.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} />
                    {meeting.location}
                  </span>
                )}
                {meeting.durationMinutes && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} />
                    {meeting.durationMinutes} min
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status action buttons */}
          <div className="flex items-center gap-2">
            {meeting.status === "scheduled" && (
              <button
                type="button"
                onClick={() => handleStatusChange("in_progress")}
                disabled={updateMeeting.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#3B82F6" }}
              >
                <Play size={14} />
                Start
              </button>
            )}
            {meeting.status === "in_progress" && (
              <button
                type="button"
                onClick={() => handleStatusChange("completed")}
                disabled={updateMeeting.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--success)" }}
              >
                <CheckCircle size={14} />
                Complete
              </button>
            )}
            {(meeting.status === "scheduled" ||
              meeting.status === "in_progress") && (
              <button
                type="button"
                onClick={() => handleStatusChange("cancelled")}
                disabled={updateMeeting.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 hover:bg-[var(--error-light)] disabled:opacity-60"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--error)",
                }}
              >
                <XCircle size={14} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Agenda & Minutes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Agenda */}
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
            Agenda
          </h2>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
            {meeting.agenda || "No agenda set."}
          </p>
        </div>

        {/* Minutes */}
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Minutes
            </h2>
            {!editingMinutes && (
              <button
                type="button"
                onClick={() => {
                  setMinutes(meeting.minutes || "");
                  setEditingMinutes(true);
                }}
                className="text-xs font-medium text-[var(--primary)] hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {editingMinutes ? (
            <div className="space-y-3">
              <textarea
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                rows={6}
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
                placeholder="Record meeting minutes..."
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMinutes(false)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMinutes}
                  disabled={updateMeeting.isPending}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {updateMeeting.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {meeting.minutes || "No minutes recorded yet."}
            </p>
          )}
        </div>
      </motion.div>

      {/* Decisions Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <FileText size={16} />
            Decisions
          </h2>
          <button
            type="button"
            onClick={() => setShowDecisionForm(!showDecisionForm)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Plus size={14} />
            Record Decision
          </button>
        </div>

        {/* Decision list */}
        {decisionsLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        ) : (decisions ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
            No decisions recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {(decisions ?? []).map((d: MeetingDecision) => (
              <div
                key={d.id}
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-[var(--primary)] mr-2">
                      {d.decisionNumber}
                    </span>
                    <span className="font-medium text-sm text-[var(--text-primary)]">
                      {d.title}
                    </span>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                {d.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                    {d.description}
                  </p>
                )}
                {d.rationale && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 italic">
                    Rationale: {d.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Decision form */}
        {showDecisionForm && (
          <form
            onSubmit={handleCreateDecision}
            className="mt-4 rounded-lg border p-4 space-y-3"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: "var(--border)",
            }}
          >
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Title *
              </label>
              <input
                type="text"
                value={decisionForm.title}
                onChange={(e) =>
                  setDecisionForm({
                    ...decisionForm,
                    title: e.target.value,
                  })
                }
                placeholder="Decision title"
                className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Description
              </label>
              <textarea
                value={decisionForm.description}
                onChange={(e) =>
                  setDecisionForm({
                    ...decisionForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the decision..."
                rows={2}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Rationale
              </label>
              <input
                type="text"
                value={decisionForm.rationale}
                onChange={(e) =>
                  setDecisionForm({
                    ...decisionForm,
                    rationale: e.target.value,
                  })
                }
                placeholder="Why was this decision made?"
                className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: "var(--border)",
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDecisionForm(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createDecision.isPending}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {createDecision.isPending ? "Saving..." : "Save Decision"}
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Action Items Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <ClipboardList size={16} />
            Action Items
          </h2>
          <button
            type="button"
            onClick={() => setShowActionForm(!showActionForm)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Plus size={14} />
            Add Action Item
          </button>
        </div>

        {/* Action list */}
        {relatedActions.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
            No action items for this meeting yet.
          </p>
        ) : (
          <div className="space-y-3">
            {relatedActions.map((action: ActionItem) => {
              const isOverdue =
                action.status !== "completed" &&
                new Date(action.dueDate) < new Date();
              return (
                <div
                  key={action.id}
                  className="rounded-lg border p-3 flex items-center justify-between"
                  style={{
                    borderColor: isOverdue
                      ? "var(--error)"
                      : "var(--border)",
                    backgroundColor: isOverdue
                      ? "var(--error-light)"
                      : undefined,
                  }}
                >
                  <div>
                    <span className="font-medium text-sm text-[var(--text-primary)]">
                      {action.title}
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[var(--text-secondary)]">
                        Due: {formatDate(action.dueDate)}
                      </span>
                      <span className="text-xs capitalize text-[var(--text-secondary)]">
                        {action.priority}
                      </span>
                      <StatusBadge status={action.status} />
                    </div>
                  </div>
                  {action.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => completeAction.mutate({ id: action.id })}
                      disabled={completeAction.isPending}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--success-light)]"
                      style={{ color: "var(--success)" }}
                      title="Mark complete"
                    >
                      <CheckCircle size={14} />
                      Complete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Action form */}
        {showActionForm && (
          <form
            onSubmit={handleCreateAction}
            className="mt-4 rounded-lg border p-4 space-y-3"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: "var(--border)",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={actionForm.title}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, title: e.target.value })
                  }
                  placeholder="Action item title"
                  className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
              <UserPicker
                label="Owner"
                required
                value={actionForm.ownerId || undefined}
                displayValue={actionForm.ownerDisplay}
                onChange={(id, name) =>
                  setActionForm({
                    ...actionForm,
                    ownerId: id ?? "",
                    ownerDisplay: name,
                  })
                }
                placeholder="Search for owner..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={actionForm.dueDate}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, dueDate: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Priority
                </label>
                <select
                  value={actionForm.priority}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, priority: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-0)",
                    borderColor: "var(--border)",
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowActionForm(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAction.isPending}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {createAction.isPending ? "Saving..." : "Add Action"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
