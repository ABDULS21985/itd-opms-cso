"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Inbox,
  Radio,
  ShieldAlert,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useActiveMajorIncidents,
  useMyQueue,
  usePendingApprovals,
  useTickets,
} from "@/hooks/use-itsm";
import type { Ticket } from "@/types";

function minutesUntil(value?: string) {
  if (!value) return null;
  return Math.round((new Date(value).getTime() - Date.now()) / 60000);
}

function nextAction(ticket: Ticket) {
  if (!ticket.assigneeId) return "Assign owner";
  if (ticket.status === "assigned") return "Start work";
  if (ticket.status === "in_progress") return "Resolve or pause";
  if (ticket.status === "pending_customer") return "Follow up with requester";
  if (ticket.status === "pending_vendor") return "Follow up with vendor";
  if (ticket.status === "resolved") return "Close after validation";
  return "Review";
}

function WorkItemRow({ ticket }: { ticket: Ticket }) {
  const resolution = minutesUntil(ticket.slaResolutionTarget);
  const atRisk = resolution !== null && resolution < 60 && !ticket.slaResolutionMet;
  return (
    <Link
      href={`/dashboard/itsm/tickets/${ticket.id}`}
      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 transition-colors hover:bg-[var(--surface-1)]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">
            {ticket.ticketNumber}
          </span>
          <StatusBadge status={ticket.status} />
          {atRisk ? (
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
              SLA risk
            </span>
          ) : null}
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
          {ticket.title}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{nextAction(ticket)}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-[var(--text-tertiary)]" />
    </Link>
  );
}

export default function ITSMCommandCenterPage() {
  const { data: myQueueData } = useMyQueue(1, 8);
  const { data: approvalData } = usePendingApprovals(1, 6);
  const { data: majorIncidents = [] } = useActiveMajorIncidents();
  const { data: recentTicketsData } = useTickets(1, 8, {
    hideSubtasks: true,
  });

  const myQueue = myQueueData?.data ?? [];
  const approvals = approvalData?.data ?? [];
  const recentTickets = recentTicketsData?.data ?? [];
  const slaRisk = [...myQueue, ...recentTickets]
    .filter((ticket) => {
      const minutes = minutesUntil(ticket.slaResolutionTarget);
      return minutes !== null && minutes < 120 && !ticket.slaResolutionMet;
    })
    .slice(0, 6);

  const stats = [
    {
      label: "My assigned tickets",
      value: myQueue.length,
      icon: Inbox,
      accent: "#2563EB",
    },
    {
      label: "SLA risk",
      value: slaRisk.length,
      icon: Timer,
      accent: "#DC2626",
    },
    {
      label: "Major incidents",
      value: majorIncidents.length,
      icon: ShieldAlert,
      accent: "#B91C1C",
    },
    {
      label: "Pending approvals",
      value: approvals.length,
      icon: CheckCircle2,
      accent: "#16A34A",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              ITSM command center
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Agent workbench
            </h1>
          </div>
          <Link
            href="/dashboard/itsm/tickets/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1B7340] px-4 py-3 text-sm font-semibold text-white"
          >
            New ticket
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <Icon size={18} style={{ color: stat.accent }} />
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.8fr)]">
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Inbox size={17} className="text-[#1B7340]" />
            My assigned tickets
          </p>
          <div className="mt-4 space-y-3">
            {myQueue.length > 0 ? (
              myQueue.map((ticket) => <WorkItemRow key={ticket.id} ticket={ticket} />)
            ) : (
              <p className="rounded-2xl bg-[var(--surface-1)] p-4 text-sm text-[var(--text-muted)]">
                No assigned tickets in the current queue.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-rose-950">
              <Timer size={17} />
              SLA risk queue
            </p>
            <div className="mt-4 space-y-3">
              {slaRisk.length > 0 ? (
                slaRisk.map((ticket) => <WorkItemRow key={ticket.id} ticket={ticket} />)
              ) : (
                <p className="rounded-2xl bg-[var(--surface-1)] p-4 text-sm text-rose-700">
                  No ticket is inside the two-hour risk window.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Radio size={17} className="text-rose-600" />
              Major incident room
            </p>
            <div className="mt-4 space-y-3">
              {majorIncidents.length > 0 ? (
                majorIncidents.slice(0, 4).map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/dashboard/itsm/major-incidents/${incident.id}`}
                    className="block rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {incident.ticket?.title ?? incident.id}
                      </p>
                      <StatusBadge status={incident.status} />
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {incident.affectedServices.join(", ") || "Services not captured"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-2xl bg-[var(--surface-1)] p-4 text-sm text-[var(--text-muted)]">
                  No active major incident.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 size={17} className="text-[#1B7340]" />
            Pending approvals
          </p>
          <div className="mt-4 space-y-3">
            {approvals.length > 0 ? (
              approvals.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/itsm/service-catalog/my-requests/${request.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 hover:bg-white"
                >
                  <div>
                    <p className="font-mono text-xs text-slate-500">{request.requestNumber}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {request.catalogItemName ?? request.catalogItemId}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No approval tasks waiting on you.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles size={17} className="text-amber-500" />
            Suggested next actions
          </p>
          <div className="mt-4 space-y-3">
            {recentTickets.slice(0, 5).map((ticket) => (
              <WorkItemRow key={ticket.id} ticket={ticket} />
            ))}
            {recentTickets.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No recent ITSM records were returned.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
