"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Search,
  Filter,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  useEndorsementQueue,
  useASDQueue,
  useQCMDQueue,
  useApprovalQueue,
  useSANQueue,
  useDCOQueue,
  useSubmitEndorsement,
  useSubmitApproval,
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
  { value: "APPR_DC_PENDING", label: "Head Data Centre" },
  { value: "APPR_SSO_PENDING", label: "Head SSO" },
  { value: "APPR_IMD_PENDING", label: "Head IMD" },
  { value: "APPR_ASD_PENDING", label: "Head ASD" },
  { value: "APPR_SCAO_PENDING", label: "Head SCAO" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              height: "2.5rem",
              width: "2.5rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.75rem",
              backgroundColor: "rgba(27,115,64,0.1)",
            }}
          >
            <CheckSquare size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              SSA Approvals Queue
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              Review and process pending SSA requests
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Queue Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "2px solid var(--border)",
          overflowX: "auto",
        }}
      >
        {QUEUE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              setPage(1);
            }}
            style={{
              padding: "0.5rem 0.875rem",
              fontSize: "0.8125rem",
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? "var(--primary)" : "var(--text-secondary)",
              background: "none",
              border: "none",
              borderBottom: activeTab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: "-2px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Stage filter (approvals tab only) ── */}
      {activeTab === "approvals" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Filter size={14} style={{ color: "var(--text-secondary)" }} />
          <select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setPage(1);
            }}
            style={{
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-0)",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              color: "var(--text-primary)",
              outline: "none",
            }}
          >
            {APPROVAL_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Data Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
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
      </motion.div>
    </div>
  );
}
