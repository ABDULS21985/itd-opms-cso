"use client";

import { useState, useMemo } from "react";
import {
  X,
  Search,
  Video,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  MapPin,
  Link2,
  FileText,
  User,
  Briefcase,
  Calendar,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InterviewType } from "@/types/interview";
import { useTalents } from "@/hooks/use-candidates";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { useTeamMembers } from "@/hooks/use-team";
import type { JobPost } from "@/types/job";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ScheduleFormData {
  candidateId: string;
  candidateName: string;
  candidatePhoto?: string;
  jobId: string;
  jobTitle: string;
  scheduledAt: string;
  type: InterviewType;
  duration: number;
  location: string;
  meetingUrl: string;
  notes: string;
  attendeeIds: string[];
}

const INITIAL_FORM: ScheduleFormData = {
  candidateId: "",
  candidateName: "",
  candidatePhoto: undefined,
  jobId: "",
  jobTitle: "",
  scheduledAt: "",
  type: InterviewType.VIDEO,
  duration: 45,
  location: "",
  meetingUrl: "",
  notes: "",
  attendeeIds: [],
};

type Step = "candidate" | "job" | "datetime" | "details" | "confirm";
const STEPS: Step[] = ["candidate", "job", "datetime", "details", "confirm"];
const STEP_LABELS: Record<Step, string> = {
  candidate: "Candidate",
  job: "Job",
  datetime: "Date & Time",
  details: "Details",
  confirm: "Confirm",
};

const DURATIONS = [15, 30, 45, 60, 90];

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 18; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 18 && m > 0) break;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    TIME_SLOTS.push(`${hh}:${mm}`);
  }
}

function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ------------------------------------------------------------------ */
/*  Step indicator                                                      */
/* ------------------------------------------------------------------ */

function StepIndicator({
  steps,
  current,
}: {
  steps: Step[];
  current: Step;
}) {
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center gap-1 px-6 pb-4 border-b border-[var(--border)]">
      {steps.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                isDone
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                    ? "bg-[var(--accent-orange)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--neutral-gray)]"
              }`}
            >
              {isDone ? <Check size={12} /> : i + 1}
            </div>
            <span
              className={`hidden sm:block text-xs font-medium truncate ${
                isCurrent ? "text-[var(--text-primary)]" : "text-[var(--neutral-gray)]"
              }`}
            >
              {STEP_LABELS[step]}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 ${
                  isDone ? "bg-emerald-500" : "bg-[var(--border)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step: Candidate                                                     */
/* ------------------------------------------------------------------ */

function CandidateStep({
  form,
  onChange,
}: {
  form: ScheduleFormData;
  onChange: (updates: Partial<ScheduleFormData>) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: talents } = useTalents({ search });
  const candidates = (talents as any)?.data || [];

  if (form.candidateId) {
    return (
      <div className="p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Selected Candidate
        </h3>
        <div className="flex items-center gap-3 p-3 bg-[var(--surface-1)] rounded-xl">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center overflow-hidden">
            {form.candidatePhoto ? (
              <img src={form.candidatePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-[var(--neutral-gray)]">
                {form.candidateName.charAt(0)}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)] flex-1">
            {form.candidateName}
          </span>
          <button
            onClick={() =>
              onChange({ candidateId: "", candidateName: "", candidatePhoto: undefined })
            }
            className="text-xs text-[var(--neutral-gray)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Select a Candidate
      </h3>
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm bg-[var(--surface-0)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/20 focus:border-[var(--accent-orange)] transition-all"
          autoFocus
        />
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-1">
        {candidates.length > 0 ? (
          candidates.map((c: any) => (
            <button
              key={c.id}
              onClick={() =>
                onChange({
                  candidateId: c.id,
                  candidateName: c.fullName,
                  candidatePhoto: c.photoUrl || undefined,
                })
              }
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-1)] transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-[var(--neutral-gray)]">
                    {c.fullName?.charAt(0) || "?"}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {c.fullName}
                </p>
                {c.track && (
                  <p className="text-xs text-[var(--neutral-gray)] truncate">{c.track}</p>
                )}
              </div>
            </button>
          ))
        ) : search ? (
          <p className="text-xs text-[var(--neutral-gray)] text-center py-6">
            No candidates found for &ldquo;{search}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-[var(--neutral-gray)] text-center py-6">
            Start typing to search candidates
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step: Job                                                           */
/* ------------------------------------------------------------------ */

function JobStep({
  form,
  onChange,
}: {
  form: ScheduleFormData;
  onChange: (updates: Partial<ScheduleFormData>) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: jobsData } = useEmployerJobs({ status: "published" });
  const jobs: JobPost[] = (jobsData as any)?.data || [];

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) => j.title.toLowerCase().includes(q));
  }, [jobs, search]);

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        Select a Job (Optional)
      </h3>
      <p className="text-xs text-[var(--neutral-gray)] mb-3">
        Link this interview to a specific job posting
      </p>

      {form.jobId && (
        <div className="flex items-center gap-3 p-3 bg-[var(--surface-1)] rounded-xl mb-3">
          <Briefcase size={16} className="text-[var(--neutral-gray)]" />
          <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
            {form.jobTitle}
          </span>
          <button
            onClick={() => onChange({ jobId: "", jobTitle: "" })}
            className="text-xs text-[var(--neutral-gray)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="w-full border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm bg-[var(--surface-0)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/20 focus:border-[var(--accent-orange)] transition-all"
        />
      </div>

      <div className="max-h-[280px] overflow-y-auto space-y-1">
        {filtered.map((job) => (
          <button
            key={job.id}
            onClick={() => onChange({ jobId: job.id, jobTitle: job.title })}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
              form.jobId === job.id
                ? "bg-[var(--accent-orange)]/8 ring-1 ring-[var(--accent-orange)]/20"
                : "hover:bg-[var(--surface-1)]"
            }`}
          >
            <Briefcase size={16} className="text-[var(--neutral-gray)] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {job.title}
              </p>
              {job.location && (
                <p className="text-xs text-[var(--neutral-gray)] truncate">
                  {job.location}
                </p>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--neutral-gray)] text-center py-6">
            No active jobs found
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step: Date & Time                                                   */
/* ------------------------------------------------------------------ */

function DateTimeStep({
  form,
  onChange,
}: {
  form: ScheduleFormData;
  onChange: (updates: Partial<ScheduleFormData>) => void;
}) {
  const today = new Date();
  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  // Parse current selection
  const selectedDateStr = form.scheduledAt ? form.scheduledAt.split("T")[0] : "";
  const selectedTime = form.scheduledAt ? form.scheduledAt.split("T")[1]?.slice(0, 5) : "";

  function selectDate(date: Date) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const time = selectedTime || "09:00";
    onChange({ scheduledAt: `${dateStr}T${time}` });
  }

  function selectTime(time: string) {
    const dateStr = selectedDateStr || dates[0].toISOString().split("T")[0];
    onChange({ scheduledAt: `${dateStr}T${time}` });
  }

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Pick a Date
      </h3>

      {/* Date grid — 14 days */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {dates.map((date) => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const isSelected = selectedDateStr === dateStr;
          const isToday = date.toDateString() === today.toDateString();
          const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button
              key={dateStr}
              onClick={() => selectDate(date)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all ${
                isSelected
                  ? "bg-[var(--accent-orange)] text-white shadow-sm"
                  : isToday
                    ? "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] ring-1 ring-[var(--accent-orange)]/20"
                    : isWeekend
                      ? "bg-[var(--surface-1)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]"
                      : "hover:bg-[var(--surface-1)] text-[var(--text-primary)]"
              }`}
            >
              <span className="text-[10px] font-medium uppercase">{dayName}</span>
              <span className="text-sm font-semibold">{date.getDate()}</span>
              <span className="text-[10px]">
                {date.toLocaleDateString("en-US", { month: "short" })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Pick a Time
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[200px] overflow-y-auto">
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedTime === slot;
          return (
            <button
              key={slot}
              onClick={() => selectTime(slot)}
              className={`text-xs font-medium py-2 rounded-lg transition-colors ${
                isSelected
                  ? "bg-[var(--accent-orange)] text-white"
                  : "bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {formatTimeSlot(slot)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step: Details                                                       */
/* ------------------------------------------------------------------ */

function DetailsStep({
  form,
  onChange,
}: {
  form: ScheduleFormData;
  onChange: (updates: Partial<ScheduleFormData>) => void;
}) {
  const { data: teamData } = useTeamMembers();
  const teamMembers = Array.isArray(teamData) ? teamData : (teamData as any)?.data || [];

  const typeOptions = [
    { value: InterviewType.VIDEO, icon: Video, label: "Video Call" },
    { value: InterviewType.PHONE, icon: Phone, label: "Phone" },
    { value: InterviewType.IN_PERSON, icon: Building2, label: "In-Person" },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Interview type — large icon cards */}
      <div>
        <label className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">
          Interview Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            const selected = form.type === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ type: opt.value })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-[var(--accent-orange)] bg-[var(--accent-orange)]/5"
                    : "border-[var(--border)] hover:border-[var(--neutral-gray)]/30 hover:bg-[var(--surface-1)]"
                }`}
              >
                <Icon
                  size={24}
                  className={selected ? "text-[var(--accent-orange)]" : "text-[var(--neutral-gray)]"}
                />
                <span
                  className={`text-xs font-medium ${
                    selected ? "text-[var(--accent-orange)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration — pill select */}
      <div>
        <label className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">
          Duration
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((dur) => (
            <button
              key={dur}
              onClick={() => onChange({ duration: dur })}
              className={`text-xs font-medium px-4 py-2 rounded-full border transition-colors ${
                form.duration === dur
                  ? "border-[var(--accent-orange)] bg-[var(--accent-orange)] text-white"
                  : "border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              {dur} min
            </button>
          ))}
        </div>
      </div>

      {/* Conditional: Meeting URL for video */}
      {form.type === InterviewType.VIDEO && (
        <div>
          <label className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 block">
            Meeting URL
          </label>
          <div className="relative">
            <Link2
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
            />
            <input
              type="url"
              value={form.meetingUrl}
              onChange={(e) => onChange({ meetingUrl: e.target.value })}
              placeholder="https://meet.google.com/..."
              className="w-full border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm bg-[var(--surface-0)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/20 focus:border-[var(--accent-orange)] transition-all"
            />
          </div>
        </div>
      )}

      {/* Conditional: Location for in-person */}
      {form.type === InterviewType.IN_PERSON && (
        <div>
          <label className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 block">
            Location
          </label>
          <div className="relative">
            <MapPin
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
            />
            <input
              type="text"
              value={form.location}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="Office address..."
              className="w-full border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm bg-[var(--surface-0)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/20 focus:border-[var(--accent-orange)] transition-all"
            />
          </div>
        </div>
      )}

      {/* Attendees */}
      {teamMembers.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 block">
            Additional Attendees
          </label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member: any) => {
              const isAdded = form.attendeeIds.includes(member.userId || member.id);
              const memberId = member.userId || member.id;
              return (
                <button
                  key={memberId}
                  onClick={() => {
                    onChange({
                      attendeeIds: isAdded
                        ? form.attendeeIds.filter((id) => id !== memberId)
                        : [...form.attendeeIds, memberId],
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    isAdded
                      ? "border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]"
                      : "border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  <Users size={12} />
                  {member.contactName || member.email || "Team Member"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 block">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Topics to discuss, preparation instructions, or any special notes..."
          rows={3}
          className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm bg-[var(--surface-0)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/20 focus:border-[var(--accent-orange)] transition-all"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step: Confirm                                                       */
/* ------------------------------------------------------------------ */

function ConfirmStep({ form }: { form: ScheduleFormData }) {
  const typeLabels: Record<string, string> = {
    [InterviewType.VIDEO]: "Video Call",
    [InterviewType.IN_PERSON]: "In-Person",
    [InterviewType.PHONE]: "Phone",
  };

  const scheduledDate = form.scheduledAt
    ? new Date(form.scheduledAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const scheduledTime = form.scheduledAt
    ? new Date(form.scheduledAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const items = [
    { icon: User, label: "Candidate", value: form.candidateName },
    { icon: Briefcase, label: "Job", value: form.jobTitle || "General Interview" },
    { icon: Calendar, label: "Date", value: scheduledDate },
    { icon: Clock, label: "Time", value: `${scheduledTime} (${form.duration} min)` },
    { icon: Video, label: "Type", value: typeLabels[form.type] || form.type },
    ...(form.meetingUrl
      ? [{ icon: Link2, label: "Meeting URL", value: form.meetingUrl }]
      : []),
    ...(form.location
      ? [{ icon: MapPin, label: "Location", value: form.location }]
      : []),
    ...(form.notes
      ? [{ icon: FileText, label: "Notes", value: form.notes }]
      : []),
  ];

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Review & Confirm
      </h3>
      <div className="bg-[var(--surface-1)] rounded-xl p-4 space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon size={16} className="text-[var(--neutral-gray)] mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-medium text-[var(--neutral-gray)] tracking-wider">
                {label}
              </p>
              <p className="text-sm text-[var(--text-primary)] break-words">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success overlay                                                     */
/* ------------------------------------------------------------------ */

function SuccessOverlay({ candidateName }: { candidateName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4"
      >
        <Check size={28} className="text-emerald-600" />
      </motion.div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
        Interview Scheduled!
      </h3>
      <p className="text-sm text-[var(--neutral-gray)]">
        Calendar invite sent to {candidateName}
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Modal                                                          */
/* ------------------------------------------------------------------ */

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleFormData) => void;
  isPending?: boolean;
  isSuccess?: boolean;
}

export function ScheduleInterviewModal({
  open,
  onClose,
  onSchedule,
  isPending = false,
  isSuccess = false,
}: ScheduleModalProps) {
  const [step, setStep] = useState<Step>("candidate");
  const [form, setForm] = useState<ScheduleFormData>(INITIAL_FORM);

  const currentIdx = STEPS.indexOf(step);

  function updateForm(updates: Partial<ScheduleFormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function canProceed(): boolean {
    switch (step) {
      case "candidate":
        return !!form.candidateId;
      case "job":
        return true; // Optional
      case "datetime":
        return !!form.scheduledAt;
      case "details":
        return true;
      case "confirm":
        return true;
      default:
        return false;
    }
  }

  function next() {
    if (step === "confirm") {
      onSchedule(form);
      return;
    }
    const nextIdx = currentIdx + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx]);
  }

  function back() {
    const prevIdx = currentIdx - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx]);
  }

  function handleClose() {
    setStep("candidate");
    setForm(INITIAL_FORM);
    onClose();
  }

  // Auto-close on success after delay
  if (isSuccess) {
    setTimeout(() => {
      handleClose();
    }, 2000);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--surface-0)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Schedule Interview
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {isSuccess ? (
              <SuccessOverlay candidateName={form.candidateName} />
            ) : (
              <>
                {/* Step indicator */}
                <StepIndicator steps={STEPS} current={step} />

                {/* Step content */}
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                    >
                      {step === "candidate" && (
                        <CandidateStep form={form} onChange={updateForm} />
                      )}
                      {step === "job" && (
                        <JobStep form={form} onChange={updateForm} />
                      )}
                      {step === "datetime" && (
                        <DateTimeStep form={form} onChange={updateForm} />
                      )}
                      {step === "details" && (
                        <DetailsStep form={form} onChange={updateForm} />
                      )}
                      {step === "confirm" && <ConfirmStep form={form} />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)]">
                  <button
                    onClick={currentIdx === 0 ? handleClose : back}
                    className="flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-1)] text-[var(--text-primary)] transition-colors"
                  >
                    {currentIdx === 0 ? (
                      "Cancel"
                    ) : (
                      <>
                        <ChevronLeft size={14} />
                        Back
                      </>
                    )}
                  </button>
                  <button
                    onClick={next}
                    disabled={!canProceed() || isPending}
                    className="flex items-center gap-1 text-sm font-medium px-5 py-2 rounded-xl bg-[var(--accent-orange)] text-white hover:bg-[#E08A13] disabled:opacity-50 transition-colors"
                  >
                    {isPending ? (
                      "Scheduling..."
                    ) : step === "confirm" ? (
                      <>
                        <Check size={14} />
                        Schedule Interview
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
