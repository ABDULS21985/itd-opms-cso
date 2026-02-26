"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateMeeting } from "@/hooks/use-governance";

export default function CreateMeetingPage() {
  const router = useRouter();
  const createMutation = useCreateMeeting();

  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [agenda, setAgenda] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [attendeeIds, setAttendeeIds] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!scheduledAt) newErrors.scheduledAt = "Scheduled date/time is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const attendees = attendeeIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    createMutation.mutate(
      {
        title: title.trim(),
        meetingType: meetingType || undefined,
        agenda: agenda.trim() || undefined,
        location: location.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: durationMinutes
          ? parseInt(durationMinutes, 10)
          : undefined,
        attendeeIds: attendees.length > 0 ? attendees : undefined,
      },
      {
        onSuccess: (data) => {
          router.push(`/dashboard/governance/meetings/${data.id}`);
        },
      },
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/dashboard/governance/meetings"
          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Schedule Meeting
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Create a new meeting with agenda and attendees.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl rounded-xl border p-6 space-y-5"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <FormField
            label="Title"
            name="title"
            value={title}
            onChange={setTitle}
            placeholder="e.g., Weekly IT Governance Review"
            required
            error={errors.title}
          />

          <FormField
            label="Meeting Type"
            name="meetingType"
            type="select"
            value={meetingType}
            onChange={setMeetingType}
            options={[
              { value: "standing", label: "Standing" },
              { value: "ad_hoc", label: "Ad Hoc" },
              { value: "review", label: "Review" },
              { value: "governance", label: "Governance" },
            ]}
            placeholder="Select meeting type..."
          />

          <FormField
            label="Agenda"
            name="agenda"
            type="textarea"
            value={agenda}
            onChange={setAgenda}
            placeholder="Meeting agenda items..."
            rows={4}
          />

          <FormField
            label="Location"
            name="location"
            value={location}
            onChange={setLocation}
            placeholder="e.g., Conference Room A / Microsoft Teams"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Scheduled Date/Time{" "}
                <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                style={{
                  backgroundColor: "var(--surface-0)",
                  borderColor: errors.scheduledAt
                    ? "var(--error)"
                    : "var(--border)",
                }}
              />
              {errors.scheduledAt && (
                <p className="text-xs text-[var(--error)] mt-1">
                  {errors.scheduledAt}
                </p>
              )}
            </div>

            <FormField
              label="Duration (minutes)"
              name="durationMinutes"
              type="number"
              value={durationMinutes}
              onChange={setDurationMinutes}
              placeholder="e.g., 60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Attendee IDs
            </label>
            <input
              type="text"
              value={attendeeIds}
              onChange={(e) => setAttendeeIds(e.target.value)}
              placeholder="Comma-separated UUIDs of attendees"
              className="w-full rounded-xl border px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
              }}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Separate multiple attendee IDs with commas.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard/governance/meetings"
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {createMutation.isPending
                ? "Scheduling..."
                : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
