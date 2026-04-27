"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageSquare, Smartphone, XCircle } from "lucide-react";
import { useApproveRequest, useOperationsSnapshot, useRejectRequest } from "@/hooks/use-itsm";

function requestIdFromActionUrl(actionUrl: string) {
  return actionUrl.split("/").filter(Boolean).at(-1) ?? "";
}

export default function MobileApprovalsPage() {
  const { data, isLoading } = useOperationsSnapshot();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const approvals = data?.mobileApprovals ?? [];

  return (
    <div className="mx-auto max-w-md space-y-4 pb-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Smartphone size={21} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Mobile approval mode
            </p>
            <h1 className="text-xl font-bold text-slate-950">Approvals</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Lightweight decision queue for reviewers who need to approve, reject, or comment without opening the full desktop workspace.
        </p>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading approvals...
        </div>
      ) : approvals.length > 0 ? (
        approvals.map((approval) => (
          <section key={approval.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{approval.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{approval.reason}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold capitalize text-amber-700">
                {approval.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => approveRequest.mutate({ id: requestIdFromActionUrl(approval.actionUrl), comment: "Approved from mobile approval mode." })}
                disabled={approveRequest.isPending || rejectRequest.isPending}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
              <button
                type="button"
                onClick={() => rejectRequest.mutate({ id: requestIdFromActionUrl(approval.actionUrl), reason: "Rejected from mobile approval mode." })}
                disabled={approveRequest.isPending || rejectRequest.isPending}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <XCircle size={14} />
                Reject
              </button>
              <button type="button" className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                <MessageSquare size={14} />
                Comment
              </button>
            </div>
            <Link href={approval.actionUrl} className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              Open full record
              <ArrowRight size={14} />
            </Link>
          </section>
        ))
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          No pending approvals are assigned to you.
        </section>
      )}
    </div>
  );
}
