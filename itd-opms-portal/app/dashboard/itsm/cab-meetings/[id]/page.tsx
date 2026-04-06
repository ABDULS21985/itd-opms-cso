"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useCABMeeting,
  useUpdateCABMeeting,
  useCompleteCABMeeting,
  useChanges,
} from "@/hooks/use-itsm";
import type { Ticket } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(value?: string) {
  if (!value) return "\u2014";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Info Row                                                           */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs text-white/40 w-36 shrink-0 uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CABMeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: meeting, isLoading } = useCABMeeting(id);
  const updateMeeting = useUpdateCABMeeting(id);
  const completeMeeting = useCompleteCABMeeting(id);

  // Fetch changes in cab_review status (potential agenda items).
  const { data: cabChangesData } = useChanges({ status: "cab_review", pageSize: 50 });
  const cabChanges = (cabChangesData as unknown as { data: Ticket[] })?.data ?? [];

  const [minutes, setMinutes] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "agenda" | "minutes">("details");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/50">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading meeting...
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-32 text-white/40">
        <p>Meeting not found</p>
      </div>
    );
  }

  const handleSaveMinutes = () => {
    updateMeeting.mutate({ minutes });
  };

  const handleComplete = () => {
    completeMeeting.mutate();
  };

  const handleStart = () => {
    updateMeeting.mutate({ status: "in_progress" });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/itsm/cab-meetings")}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to CAB Meetings
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield size={20} className="text-amber-400" />
              <StatusBadge status={meeting.status} />
            </div>
            <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {meeting.status === "scheduled" && (
              <button
                onClick={handleStart}
                disabled={updateMeeting.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/10 hover:bg-white/5 transition-colors"
              >
                <Calendar size={14} className="text-amber-400" />
                Start Meeting
              </button>
            )}
            {meeting.status === "in_progress" && (
              <button
                onClick={handleComplete}
                disabled={completeMeeting.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
              >
                {completeMeeting.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Complete Meeting
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06]">
        {(["details", "agenda", "minutes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? "border-amber-500 text-white"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === "details" && (
          <div className="rounded-xl border border-white/[0.06] p-6 space-y-1">
            <InfoRow label="Description" value={meeting.description || "No description"} />
            <InfoRow label="Scheduled Date" value={formatDate(meeting.scheduledDate)} />
            <InfoRow label="Status" value={<StatusBadge status={meeting.status} />} />
            <InfoRow
              label="Attendees"
              value={
                <div className="flex items-center gap-1">
                  <Users size={14} className="text-white/40" />
                  <span>{meeting.attendees?.length ?? 0} attendees</span>
                </div>
              }
            />
            <InfoRow label="Created" value={formatDate(meeting.createdAt)} />
          </div>
        )}

        {activeTab === "agenda" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Changes Pending CAB Review
            </h3>
            {cabChanges.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Shield size={36} className="mx-auto mb-3 opacity-30" />
                <p>No changes pending CAB review</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cabChanges.map((change: Ticket) => (
                  <Link
                    key={change.id}
                    href={`/dashboard/itsm/changes/${change.id}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-white/40">{change.ticketNumber}</span>
                        <StatusBadge status={change.status} />
                      </div>
                      <div className="text-sm text-white font-medium">{change.title}</div>
                      <div className="text-xs text-white/40 mt-1 capitalize">
                        {change.changeClassification} &middot; Risk: {change.riskLevel}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-white/30" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "minutes" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Meeting Minutes</h3>
            {meeting.minutes ? (
              <div className="rounded-xl border border-white/[0.06] p-6">
                <p className="text-sm text-white whitespace-pre-wrap">{meeting.minutes}</p>
              </div>
            ) : meeting.status === "in_progress" || meeting.status === "completed" ? (
              <div className="space-y-3">
                <textarea
                  placeholder="Record meeting minutes..."
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 resize-none"
                />
                <button
                  onClick={handleSaveMinutes}
                  disabled={!minutes || updateMeeting.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #D97706, #B45309)" }}
                >
                  {updateMeeting.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Save Minutes
                </button>
              </div>
            ) : (
              <p className="text-sm text-white/40">Minutes will be available once the meeting starts.</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
