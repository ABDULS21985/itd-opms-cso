"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Save,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/use-knowledge";
import type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "division", label: "Division" },
  { value: "unit", label: "Unit" },
  { value: "role", label: "Role" },
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-gray-600 bg-gray-100",
  normal: "text-blue-600 bg-blue-100",
  high: "text-amber-600 bg-amber-100",
  critical: "text-red-600 bg-red-100",
};

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-[var(--neutral-gray)]">{hint}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

/* ------------------------------------------------------------------ */
/*  Modal: Create / Edit Announcement                                  */
/* ------------------------------------------------------------------ */

function AnnouncementModal({
  initial,
  onClose,
}: {
  initial?: Announcement;
  onClose: () => void;
}) {
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "normal");
  const [targetAudience, setTargetAudience] = useState(
    initial?.targetAudience ?? "all",
  );
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt
      ? new Date(initial.expiresAt).toISOString().slice(0, 16)
      : "",
  );
  const [clearExpiry, setClearExpiry] = useState(false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement(initial?.id);

  const isPending =
    createAnnouncement.isPending || updateAnnouncement.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit) {
      const req: UpdateAnnouncementRequest = {
        title,
        content,
        priority,
        targetAudience,
        isActive,
        clearExpiresAt: clearExpiry,
        expiresAt: !clearExpiry && expiresAt ? expiresAt : undefined,
      };
      updateAnnouncement.mutate(req, { onSuccess: onClose });
    } else {
      const req: CreateAnnouncementRequest = {
        title,
        content,
        priority,
        targetAudience,
        expiresAt: expiresAt || undefined,
      };
      createAnnouncement.mutate(req, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl my-4"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {isEdit ? "Edit Announcement" : "New Announcement"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className={inputCls}
              placeholder="Announcement title"
            />
          </Field>

          <Field label="Content" required>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className={inputCls + " resize-none"}
              placeholder="Announcement body…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority" required>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
                className={inputCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Audience" required>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                required
                className={inputCls}
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Expires At" hint="Leave blank for no expiry">
            <input
              type="datetime-local"
              value={clearExpiry ? "" : expiresAt}
              onChange={(e) => {
                setExpiresAt(e.target.value);
                setClearExpiry(false);
              }}
              disabled={clearExpiry}
              className={inputCls + " disabled:opacity-50"}
            />
            {isEdit && initial?.expiresAt && (
              <label className="mt-1.5 flex items-center gap-2 text-xs text-[var(--neutral-gray)]">
                <input
                  type="checkbox"
                  checked={clearExpiry}
                  onChange={(e) => setClearExpiry(e.target.checked)}
                  className="rounded"
                />
                Clear existing expiry date
              </label>
            )}
          </Field>

          {isEdit && (
            <Field label="Status">
              <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                Announcement is active
              </label>
            </Field>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isEdit ? "Save" : "Publish"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AnnouncementsPage() {
  const { data: response, isLoading } = useAnnouncements(1, 50);
  const deleteAnnouncement = useDeleteAnnouncement();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const announcements = response?.data ?? [];

  function openCreate() {
    setEditing(undefined);
    setModalOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditing(ann);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    setDeletingId(id);
    deleteAnnouncement.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <Megaphone size={22} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Announcements
            </h1>
            <p className="text-xs text-[var(--neutral-gray)]">
              {announcements.length} announcement
              {announcements.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          New Announcement
        </button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={22}
              className="animate-spin text-[var(--primary)]"
            />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Megaphone size={36} className="text-[var(--neutral-gray)]/40" />
            <p className="text-sm text-[var(--neutral-gray)]">
              No announcements yet. Create one to inform your team.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Audience
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {announcements.map((ann) => (
                  <tr
                    key={ann.id}
                    className="hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--text-primary)] line-clamp-1">
                        {ann.title}
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)] line-clamp-1 mt-0.5">
                        {ann.content}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[ann.priority] ?? "text-gray-600 bg-gray-100"}`}
                      >
                        {ann.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                      {AUDIENCES.find((a) => a.value === ann.targetAudience)
                        ?.label ?? ann.targetAudience}
                    </td>
                    <td className="px-4 py-3.5">
                      {ann.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 size={13} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
                          <XCircle size={13} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-secondary)]">
                      {ann.expiresAt
                        ? new Date(ann.expiresAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(ann)}
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ann.id)}
                          disabled={deletingId === ann.id}
                          className="rounded-lg p-1.5 text-[var(--neutral-gray)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Delete"
                        >
                          {deletingId === ann.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <AnnouncementModal
            initial={editing}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
