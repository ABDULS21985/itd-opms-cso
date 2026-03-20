"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  ArrowRightLeft,
  ListChecks,
} from "lucide-react";
import {
  useSSARequests,
  useBulkApprove,
  useBulkStatusUpdate,
  useBulkExport,
} from "@/hooks/use-ssa";
import type { SSARequest, BulkOperationSummary, ExportedRequest } from "@/types/ssa";
import {
  SSA_STATUS_LABELS,
  SSA_STATUS_COLORS,
  APPROVAL_STAGES,
} from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
/*  Tab: Bulk Approve                                                  */
/* ------------------------------------------------------------------ */

function BulkApproveTab() {
  const [stage, setStage] = useState(APPROVAL_STAGES[0].value);
  const [remarks, setRemarks] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkOperationSummary | null>(null);

  // Map stage to the status requests should be in
  const stageToStatus: Record<string, string> = {
    APPR_DC: "APPR_DC_PENDING",
    APPR_SSO: "APPR_SSO_PENDING",
    APPR_IMD: "APPR_IMD_PENDING",
    APPR_ASD: "APPR_ASD_PENDING",
    APPR_SCAO: "APPR_SCAO_PENDING",
  };

  const expectedStatus = stageToStatus[stage] || "";
  const { data, isLoading } = useSSARequests(1, 100, expectedStatus);
  const requests: SSARequest[] = (data as { data: SSARequest[] })?.data ?? [];
  const bulkApprove = useBulkApprove();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === requests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(requests.map((r) => r.id)));
    }
  }

  async function handleApprove() {
    if (selected.size === 0) return;
    const res = await bulkApprove.mutateAsync({
      stage,
      requestIds: Array.from(selected),
      remarks: remarks || undefined,
    });
    setResult(res);
    setSelected(new Set());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            Approval Stage
          </label>
          <select
            value={stage}
            onChange={(e) => { setStage(e.target.value); setSelected(new Set()); setResult(null); }}
            style={{ padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          >
            {APPROVAL_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            Remarks (optional)
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Approval remarks..."
            style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          />
        </div>
        <button
          onClick={handleApprove}
          disabled={selected.size === 0 || bulkApprove.isPending}
          style={{
            padding: "0.5rem 1rem", borderRadius: "0.375rem",
            background: selected.size > 0 ? "#22c55e" : "var(--border)",
            color: "white", border: "none", cursor: selected.size > 0 ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem",
          }}
        >
          {bulkApprove.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Approve {selected.size > 0 ? `(${selected.size})` : ""}
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}><Loader2 size={24} className="animate-spin" style={{ margin: "0 auto" }} /></div>
      ) : requests.length === 0 ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          No requests pending at this stage.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>
                <input type="checkbox" checked={selected.size === requests.length && requests.length > 0} onChange={toggleAll} />
              </th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Reference</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Application</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Division</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.5rem" }}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                </td>
                <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{r.referenceNo}</td>
                <td style={{ padding: "0.5rem" }}>{r.appName}</td>
                <td style={{ padding: "0.5rem" }}>{r.divisionOffice}</td>
                <td style={{ padding: "0.5rem" }}>{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result && <ResultSummary result={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Bulk Status Update                                            */
/* ------------------------------------------------------------------ */

const ALLOWED_TRANSITIONS = [
  { fromStatus: "REJECTED", toStatus: "DRAFT", label: "Return rejected to draft" },
  { fromStatus: "DRAFT", toStatus: "CANCELLED", label: "Cancel draft requests" },
];

function BulkStatusTab() {
  const [transition, setTransition] = useState(0);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkOperationSummary | null>(null);

  const { fromStatus, toStatus } = ALLOWED_TRANSITIONS[transition];
  const { data, isLoading } = useSSARequests(1, 100, fromStatus);
  const requests: SSARequest[] = (data as { data: SSARequest[] })?.data ?? [];
  const bulkUpdate = useBulkStatusUpdate();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === requests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(requests.map((r) => r.id)));
    }
  }

  async function handleUpdate() {
    if (selected.size === 0) return;
    const res = await bulkUpdate.mutateAsync({
      requestIds: Array.from(selected),
      fromStatus,
      toStatus,
      reason: reason || undefined,
    });
    setResult(res);
    setSelected(new Set());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            Transition
          </label>
          <select
            value={transition}
            onChange={(e) => { setTransition(Number(e.target.value)); setSelected(new Set()); setResult(null); }}
            style={{ padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          >
            {ALLOWED_TRANSITIONS.map((t, i) => (
              <option key={i} value={i}>{t.label}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            Reason (optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for status change..."
            style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          />
        </div>
        <button
          onClick={handleUpdate}
          disabled={selected.size === 0 || bulkUpdate.isPending}
          style={{
            padding: "0.5rem 1rem", borderRadius: "0.375rem",
            background: selected.size > 0 ? "#f59e0b" : "var(--border)",
            color: "white", border: "none", cursor: selected.size > 0 ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem",
          }}
        >
          {bulkUpdate.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
          Update {selected.size > 0 ? `(${selected.size})` : ""}
        </button>
      </div>

      <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
        {SSA_STATUS_LABELS[fromStatus]} &rarr; {SSA_STATUS_LABELS[toStatus]}
      </p>

      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}><Loader2 size={24} className="animate-spin" style={{ margin: "0 auto" }} /></div>
      ) : requests.length === 0 ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          No requests in {SSA_STATUS_LABELS[fromStatus]} status.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>
                <input type="checkbox" checked={selected.size === requests.length && requests.length > 0} onChange={toggleAll} />
              </th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Reference</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Application</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Division</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.5rem" }}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                </td>
                <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{r.referenceNo}</td>
                <td style={{ padding: "0.5rem" }}>{r.appName}</td>
                <td style={{ padding: "0.5rem" }}>{r.divisionOffice}</td>
                <td style={{ padding: "0.5rem" }}>{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result && <ResultSummary result={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Bulk Export                                                    */
/* ------------------------------------------------------------------ */

function BulkExportTab() {
  const [status, setStatus] = useState("");
  const [division, setDivision] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const bulkExport = useBulkExport();

  async function handleExport() {
    const filter: Record<string, string> = {};
    if (status) filter.status = status;
    if (division) filter.division = division;
    if (fromDate) filter.fromDate = `${fromDate}T00:00:00Z`;
    if (toDate) filter.toDate = `${toDate}T23:59:59Z`;

    const data = await bulkExport.mutateAsync(filter);

    // Convert to CSV and trigger download
    const csv = exportToCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ssa-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          >
            <option value="">All Statuses</option>
            {Object.entries(SSA_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            Division
          </label>
          <input
            type="text"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            placeholder="Filter by division..."
            style={{ padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.875rem" }}
          />
        </div>
        <button
          onClick={handleExport}
          disabled={bulkExport.isPending}
          style={{
            padding: "0.5rem 1rem", borderRadius: "0.375rem",
            background: "#3b82f6", color: "white", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem",
          }}
        >
          {bulkExport.isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export CSV
        </button>
      </div>

      {bulkExport.data && (
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Exported {bulkExport.data.length} request(s) to CSV.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result Summary Component                                           */
/* ------------------------------------------------------------------ */

function ResultSummary({ result }: { result: BulkOperationSummary }) {
  return (
    <div style={{ padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
      <div style={{ display: "flex", gap: "2rem", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.875rem" }}>Total: <strong>{result.totalRequested}</strong></span>
        <span style={{ fontSize: "0.875rem", color: "#22c55e" }}>Succeeded: <strong>{result.succeeded}</strong></span>
        {result.failed > 0 && (
          <span style={{ fontSize: "0.875rem", color: "#ef4444" }}>Failed: <strong>{result.failed}</strong></span>
        )}
      </div>
      {result.results.some((r) => !r.success) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {result.results
            .filter((r) => !r.success)
            .map((r) => (
              <div key={r.requestId} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
                <XCircle size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
                <span style={{ fontFamily: "monospace" }}>{r.requestId.slice(0, 8)}</span>
                <span style={{ color: "var(--text-secondary)" }}>{r.error}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV Export Helper                                                   */
/* ------------------------------------------------------------------ */

function exportToCSV(data: ExportedRequest[]): string {
  if (data.length === 0) return "";

  const headers = [
    "referenceNo", "status", "appName", "dbName", "operatingSystem",
    "serverType", "vcpuCount", "memoryGb", "spaceGb", "vlanZone",
    "divisionOffice", "justification", "requestorName", "requestorEmail",
    "revisionCount", "submittedAt", "completedAt", "createdAt",
  ];

  const escape = (val: unknown) => {
    const str = val == null ? "" : String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const rows = data.map((row) =>
    headers.map((h) => escape((row as unknown as Record<string, unknown>)[h])).join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "approve", label: "Bulk Approve", icon: CheckCircle2 },
  { key: "status", label: "Status Update", icon: ArrowRightLeft },
  { key: "export", label: "Export", icon: Download },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function BulkOperationsPage() {
  const [tab, setTab] = useState<TabKey>("approve");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>
          <ListChecks size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.5rem" }} />
          Bulk Operations
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Perform batch operations on SSA requests
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "0.75rem 1.5rem", border: "none", cursor: "pointer",
              background: "transparent", fontSize: "0.875rem",
              borderBottom: tab === key ? "2px solid #3b82f6" : "2px solid transparent",
              color: tab === key ? "#3b82f6" : "var(--text-secondary)",
              fontWeight: tab === key ? 600 : 400,
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
        {tab === "approve" && <BulkApproveTab />}
        {tab === "status" && <BulkStatusTab />}
        {tab === "export" && <BulkExportTab />}
      </div>
    </div>
  );
}
