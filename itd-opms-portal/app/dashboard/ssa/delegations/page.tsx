"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useSSADelegations,
  useCreateDelegation,
  useDeleteDelegation,
} from "@/hooks/use-ssa";
import type { SSADelegation } from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DELEGATION_STAGES = [
  { value: "HOO_ENDORSEMENT", label: "HOO Endorsement" },
  { value: "ASD_ASSESSMENT", label: "ASD Assessment" },
  { value: "QCMD_ANALYSIS", label: "QCMD Analysis" },
  { value: "APPR_DC", label: "Head Data Centre" },
  { value: "APPR_SSO", label: "Head SSO" },
  { value: "APPR_IMD", label: "Head IMD" },
  { value: "APPR_ASD", label: "Head ASD" },
  { value: "APPR_SCAO", label: "Head SCAO" },
  { value: "SAN_PROVISIONING", label: "SAN Provisioning" },
  { value: "DCO_SERVER", label: "DCO Server Creation" },
];

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface-0)",
  padding: "1.25rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.25rem",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.5rem",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface-0)",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

/* ------------------------------------------------------------------ */
/*  Create Delegation Form                                             */
/* ------------------------------------------------------------------ */

function CreateDelegationForm({ onCreated }: { onCreated: () => void }) {
  const [delegateId, setDelegateId] = useState("");
  const [stage, setStage] = useState(DELEGATION_STAGES[0].value);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [reason, setReason] = useState("");

  const createDelegation = useCreateDelegation();

  const handleSubmit = () => {
    if (!delegateId.trim()) {
      toast.error("Delegate user ID is required");
      return;
    }
    if (!effectiveFrom || !effectiveTo) {
      toast.error("Both effective dates are required");
      return;
    }
    if (new Date(effectiveTo) <= new Date(effectiveFrom)) {
      toast.error("End date must be after start date");
      return;
    }

    createDelegation.mutate(
      {
        delegateId: delegateId.trim(),
        stage,
        effectiveFrom: `${effectiveFrom}T00:00:00Z`,
        effectiveTo: `${effectiveTo}T00:00:00Z`,
        reason: reason.trim() || undefined,
      } as Partial<SSADelegation>,
      {
        onSuccess: () => {
          setDelegateId("");
          setStage(DELEGATION_STAGES[0].value);
          setEffectiveFrom("");
          setEffectiveTo("");
          setReason("");
          onCreated();
        },
      },
    );
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
        Create New Delegation
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Delegate User ID *</label>
          <input
            style={inputStyle}
            value={delegateId}
            onChange={(e) => setDelegateId(e.target.value)}
            placeholder="Enter delegate's user ID"
          />
        </div>
        <div>
          <label style={labelStyle}>Approval Stage *</label>
          <select
            style={inputStyle}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            {DELEGATION_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Effective From *</label>
          <input
            type="date"
            style={inputStyle}
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Effective To *</label>
          <input
            type="date"
            style={inputStyle}
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Reason</label>
          <input
            style={inputStyle}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason for delegation..."
          />
        </div>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={handleSubmit}
          disabled={createDelegation.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            backgroundColor: "var(--primary)",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {createDelegation.isPending ? <Loader2 size={14} /> : <Plus size={14} />}
          Create Delegation
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SSADelegationsPage() {
  const { data: delegations, isLoading, refetch } = useSSADelegations();
  const deleteDelegation = useDeleteDelegation();
  const [showForm, setShowForm] = useState(false);

  const stageLabel = (stage: string) =>
    DELEGATION_STAGES.find((s) => s.value === stage)?.label ?? stage;

  const handleDelete = (id: string) => {
    if (!confirm("Remove this delegation?")) return;
    deleteDelegation.mutate(id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
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
            <Users size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              SSA Delegations
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              Manage approval delegations for SSA workflows
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((f) => !f)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            backgroundColor: "var(--primary)",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          New Delegation
        </button>
      </motion.div>

      {/* ── Create Form ── */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <CreateDelegationForm onCreated={() => setShowForm(false)} />
        </motion.div>
      )}

      {/* ── Delegations List ── */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <Loader2 size={28} style={{ color: "var(--text-secondary)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : !delegations?.length ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "3rem" }}>
          <Users size={40} style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }} />
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
            No Delegations
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
            Create a delegation to allow someone else to act on your behalf.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {delegations.map((d) => {
            const isActive =
              d.isActive &&
              new Date(d.effectiveFrom) <= new Date() &&
              new Date(d.effectiveTo) >= new Date();
            const isExpired = new Date(d.effectiveTo) < new Date();

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {stageLabel(d.stage)}
                    </span>
                    {d.isActive && !isExpired ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: "#fff",
                          backgroundColor: isActive ? "#22c55e" : "#f59e0b",
                        }}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 size={10} /> Active
                          </>
                        ) : (
                          <>
                            <Calendar size={10} /> Scheduled
                          </>
                        )}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: "#fff",
                          backgroundColor: "var(--text-secondary)",
                        }}
                      >
                        <XCircle size={10} /> {isExpired ? "Expired" : "Inactive"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", fontSize: "0.8125rem" }}>
                    <div>
                      <span style={labelStyle}>Delegate</span>
                      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{d.delegateId}</span>
                    </div>
                    <div>
                      <span style={labelStyle}>From</span>
                      <span style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                        {new Date(d.effectiveFrom).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span style={labelStyle}>To</span>
                      <span style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                        {new Date(d.effectiveTo).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {d.reason && (
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem", fontStyle: "italic" }}>
                      {d.reason}
                    </p>
                  )}
                </div>
                {d.isActive && (
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deleteDelegation.isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      color: "#ef4444",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
