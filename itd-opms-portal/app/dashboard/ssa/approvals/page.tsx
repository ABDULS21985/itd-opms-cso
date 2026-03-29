"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Filter,
  Clock,
  CheckCircle2,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  SSAHero,
  SSAHeroChip,
  SSAHeroInsight,
  SSASectionCard,
  SSAStatCard,
} from "../_components/ssa-ui";
import {
  useEndorsementQueue,
  useASDQueue,
  useQCMDQueue,
  useApprovalQueue,
  useSANQueue,
  useDCOQueue,
} from "@/hooks/use-ssa";
import type { SSARequest } from "@/types/ssa";
import { SSA_STATUS_LABELS, SSA_STATUS_COLORS } from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const QUEUE_TABS = [
  { key: "endorsements", label: "HOO Endorsements" },
  { key: "asd", label: "ASD Assessment" },
  { key: "qcmd", label: "QCMD Analysis" },
  { key: "approvals", label: "Approvals" },
  { key: "san", label: "SAN Provisioning" },
  { key: "dco", label: "DCO Server" },
] as const;

type QueueTab = (typeof QUEUE_TABS)[number]["key"];

const APPROVAL_STAGES = [
  { value: "", label: "All Stages" },
  { value: "APPR_DC", label: "Head Data Centre" },
  { value: "APPR_SSO", label: "Head SSO" },
  { value: "APPR_IMD", label: "Head IMD" },
  { value: "APPR_ASD", label: "Head ASD" },
  { value: "APPR_SCAO", label: "Head SCAO" },
];

const colorMap: Record<string, string> = {
  neutral: "var(--text-secondary)",
  blue: "#3b82f6",
  amber: "#f59e0b",
  green: "#22c55e",
  teal: "#14b8a6",
  red: "#ef4444",
};

function statusBadge(status: string) {
  const label = SSA_STATUS_LABELS[status] || status;
  const color = colorMap[SSA_STATUS_COLORS[status]] || "var(--text-secondary)";
  return (
    <span style={{ color, fontWeight: 500, fontSize: "0.8125rem" }}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue Data Hook                                                    */
/* ------------------------------------------------------------------ */

function useQueueData(activeTab: QueueTab, page: number, stage: string) {
  const endorsements = useEndorsementQueue(page, 20);
  const asd = useASDQueue(page, 20);
  const qcmd = useQCMDQueue(page, 20);
  const approvals = useApprovalQueue(page, 20, stage || undefined);
  const san = useSANQueue(page, 20);
  const dco = useDCOQueue(page, 20);

  switch (activeTab) {
    case "endorsements":
      return endorsements;
    case "asd":
      return asd;
    case "qcmd":
      return qcmd;
    case "approvals":
      return approvals;
    case "san":
      return san;
    case "dco":
      return dco;
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SSAApprovalsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<QueueTab>("endorsements");
  const [page, setPage] = useState(1);
  const [stage, setStage] = useState("");

  const { data, isLoading } = useQueueData(activeTab, page, stage);
  const requests: SSARequest[] = data?.data ?? [];
  const meta = data?.meta;
  const activeQueueLabel = QUEUE_TABS.find((tab) => tab.key === activeTab)?.label ?? "Queue";
  const activeStageLabel =
    APPROVAL_STAGES.find((option) => option.value === stage)?.label ?? "All stages";

  const columns: Column<SSARequest>[] = [
    {
      key: "referenceNo",
      header: "Reference No",
      sortable: true,
      className: "min-w-[140px]",
      render: (item) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--primary)",
          }}
        >
          {item.referenceNo}
        </span>
      ),
    },
    {
      key: "appName",
      header: "Application",
      sortable: true,
      render: (item) => (
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}>
          {item.appName}
        </span>
      ),
    },
    {
      key: "requestorName",
      header: "Requestor",
      render: (item) => (
        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          {item.requestorName}
        </span>
      ),
    },
    {
      key: "divisionOffice",
      header: "Division",
      render: (item) => (
        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          {item.divisionOffice}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => statusBadge(item.status),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      sortable: true,
      render: (item) => (
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
          {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "\u2014"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/ssa/${item.id}`);
          }}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Review
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <SSAHero
          icon={CheckSquare}
          eyebrow="SSA Approval Flow"
          title="Route endorsements, technical checks, and formal approvals with less queue blindness."
          description="Switch between operating lanes, focus stage-specific work, and open requests directly into the detailed review surface."
          accent="amber"
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/dashboard/ssa")}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#7C2D12] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                View request portfolio
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/ssa/admin")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:border-white/28 hover:bg-white/14"
              >
                Open admin view
              </button>
            </>
          }
          chips={
            <>
              <SSAHeroChip>{activeQueueLabel}</SSAHeroChip>
              <SSAHeroChip>{meta?.totalItems ?? requests.length} items in selected lane</SSAHeroChip>
              <SSAHeroChip>{activeTab === "approvals" ? activeStageLabel : "Stage filter not required"}</SSAHeroChip>
            </>
          }
          aside={
            <>
              <SSAHeroInsight
                icon={Layers3}
                eyebrow="Lanes"
                accent="indigo"
                title={`${QUEUE_TABS.length} approval lanes`}
                description="Move between HOO, ASD, QCMD, approval, SAN, and DCO queues without leaving the workspace."
              />
              <SSAHeroInsight
                icon={Clock}
                eyebrow="Current queue"
                accent="amber"
                title={activeQueueLabel}
                description={`${meta?.totalItems ?? requests.length} items currently require attention in this lane.`}
              />
              <SSAHeroInsight
                icon={ShieldCheck}
                eyebrow="Approval stage"
                accent="emerald"
                title={activeTab === "approvals" ? activeStageLabel : "Lane-specific review"}
                description={
                  activeTab === "approvals"
                    ? "Filter the formal approval queue to the exact stage you need to clear."
                    : "The selected lane already maps to a specific workflow responsibility."
                }
              />
            </>
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SSAStatCard
          label="Selected Queue"
          value={meta?.totalItems ?? requests.length}
          helper={`Items available inside ${activeQueueLabel}.`}
          icon={CheckSquare}
          accent="amber"
          loading={isLoading}
        />
        <SSAStatCard
          label="Visible This Page"
          value={requests.length}
          helper="Currently rendered requests ready for review."
          icon={Clock}
          accent="indigo"
          loading={isLoading}
        />
        <SSAStatCard
          label="Approval Stages"
          value={activeTab === "approvals" ? APPROVAL_STAGES.length - 1 : QUEUE_TABS.length}
          helper={
            activeTab === "approvals"
              ? "Formal approval stages available for focused filtering."
              : "Workflow queues available across the SSA review chain."
          }
          icon={Filter}
          accent="emerald"
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <SSASectionCard
          eyebrow="Queue Management"
          title="Operate the review lanes"
          description="Change lanes, focus formal approvals by stage, and open any request into the detailed decision page."
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {QUEUE_TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setPage(1);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "border-transparent bg-[var(--primary)] text-white shadow-sm"
                        : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "approvals" && (
              <div className="rounded-[1.35rem] border border-[var(--border)]/80 bg-[linear-gradient(180deg,_rgba(249,250,251,0.9),_rgba(255,255,255,0.92))] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Formal Approval Stage
                    </label>
                    <div className="flex items-center gap-2">
                      <Filter size={15} className="text-[var(--text-secondary)]" />
                      <select
                        value={stage}
                        onChange={(e) => {
                          setStage(e.target.value);
                          setPage(1);
                        }}
                        className="rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                      >
                        {APPROVAL_STAGES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                    {activeStageLabel}
                  </div>
                </div>
              </div>
            )}

            <DataTable
              columns={columns}
              data={requests}
              keyExtractor={(item) => item.id}
              loading={isLoading}
              emptyTitle="No pending items"
              emptyDescription="There are no requests pending your review in this queue."
              onRowClick={(item) => router.push(`/dashboard/ssa/${item.id}`)}
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
          </div>
        </SSASectionCard>
      </motion.div>
    </div>
  );
}
