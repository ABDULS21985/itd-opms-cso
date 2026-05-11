"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Plus,
  Shield,
  Users,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { useCABMeetings, useCreateCABMeeting } from "@/hooks/use-itsm";
import type { CABMeeting } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(value?: string) {
  if (!value) return "\u2014";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CABMeetingsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const pageSize = 20;

  const { data: meetingsData, isLoading } = useCABMeetings({
    status: status || undefined,
    page,
    pageSize,
  });

  const createMeeting = useCreateCABMeeting();

  const meetings = (meetingsData as unknown as { data: CABMeeting[] })?.data ?? [];
  const totalPages = (meetingsData as unknown as { meta?: { totalPages: number } })?.meta?.totalPages ?? 1;

  // Create form state.
  const [createForm, setCreateForm] = useState({ title: "", description: "", scheduledDate: "" });

  const handleCreate = async () => {
    if (!createForm.title || !createForm.scheduledDate) return;
    try {
      await createMeeting.mutateAsync({
        title: createForm.title,
        description: createForm.description || undefined,
        scheduledDate: createForm.scheduledDate + "T00:00:00Z",
      });
      setShowCreate(false);
      setCreateForm({ title: "", description: "", scheduledDate: "" });
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield size={24} className="text-amber-400" />
            CAB Meetings
          </h1>
          <p className="text-sm text-white/50 mt-1">Change Advisory Board meeting schedule</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #D97706, #B45309)" }}
        >
          <Plus size={16} />
          New Meeting
        </button>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">New CAB Meeting</h3>
              <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <FormField
              name="title"
              label="Title"
              required
              value={createForm.title}
              onChange={(v) => setCreateForm((p) => ({ ...p, title: v }))}
              placeholder="e.g., Weekly CAB Review"
            />
            <FormField
              name="description"
              label="Description"
              type="textarea"
              value={createForm.description}
              onChange={(v) => setCreateForm((p) => ({ ...p, description: v }))}
            />
            <FormField
              name="scheduledDate"
              label="Scheduled Date"
              required
              type="date"
              value={createForm.scheduledDate}
              onChange={(v) => setCreateForm((p) => ({ ...p, scheduledDate: v }))}
            />
            <button
              onClick={handleCreate}
              disabled={!createForm.title || !createForm.scheduledDate || createMeeting.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #D97706, #B45309)" }}
            >
              {createMeeting.isPending ? <Loader2 size={16} className="animate-spin" /> : "Create Meeting"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading meetings...
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <Shield size={48} className="mx-auto mb-4 opacity-30" />
          <p>No CAB meetings found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Title</th>
                <th className="text-left p-4">Scheduled</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Attendees</th>
                <th className="text-right p-4"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {meetings.map((meeting: CABMeeting) => (
                  <motion.tr
                    key={meeting.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-white font-medium">{meeting.title}</td>
                    <td className="p-4 text-white/50">{formatDate(meeting.scheduledDate)}</td>
                    <td className="p-4">
                      <StatusBadge status={meeting.status} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-white/50">
                        <Users size={14} />
                        <span>{meeting.attendees?.length ?? 0}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/itsm/cab-meetings/${meeting.id}`}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded border border-white/10 text-sm text-white/60 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded border border-white/10 text-sm text-white/60 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
