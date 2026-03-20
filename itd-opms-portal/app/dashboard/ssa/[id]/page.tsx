"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  ArrowLeft,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Database,
  HardDrive,
  FileText,
  Activity,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Ban,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useSSARequest,
  useSSAAuditLog,
  useSubmitEndorsement,
  useSubmitASDAssessment,
  useSubmitQCMDAnalysis,
  useSubmitApproval,
  useSubmitSANProvisioning,
  useSubmitDCOServer,
  useCancelSSARequest,
  useReviseSSARequest,
} from "@/hooks/use-ssa";
import type {
  SSARequestDetail,
  ASDAssessment,
  QCMDAnalysis,
  SANProvisioning,
  DCOServer,
  SSAAuditLog,
  ServiceImpact,
  SSAApproval,
} from "@/types/ssa";
import {
  SSA_STATUS_LABELS,
  SSA_STATUS_COLORS,
  WORKFLOW_STAGES,
  ASSESSMENT_OUTCOMES,
} from "@/types/ssa";

/* ================================================================== */
/*  Shared Inline Styles                                               */
/* ================================================================== */

const cardStyle: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface-0)",
  padding: "1.5rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.375rem",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.75rem",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface-0)",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "5rem",
  resize: "vertical",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  borderRadius: "0.75rem",
  border: "none",
  backgroundColor: "var(--primary)",
  padding: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#ffffff",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  ...btnPrimary,
  backgroundColor: "#ef4444",
};

const btnOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  borderRadius: "0.75rem",
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  padding: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--text-primary)",
  cursor: "pointer",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "var(--text-primary)",
  margin: 0,
  marginBottom: "1rem",
};

const fieldValue: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--text-primary)",
  margin: 0,
};

const fieldLabel: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
  margin: 0,
  marginBottom: "0.125rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

/* ================================================================== */
/*  Color helpers                                                      */
/* ================================================================== */

const STATUS_COLOR_MAP: Record<string, string> = {
  neutral: "var(--text-secondary)",
  blue: "#3b82f6",
  amber: "#f59e0b",
  green: "#22c55e",
  teal: "#14b8a6",
  red: "#ef4444",
};

function getStatusColor(status: string): string {
  return STATUS_COLOR_MAP[SSA_STATUS_COLORS[status]] || "var(--text-secondary)";
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
  HIGH: { bg: "rgba(249,115,22,0.1)", text: "#f97316" },
  MEDIUM: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b" },
  LOW: { bg: "rgba(34,197,94,0.1)", text: "#22c55e" },
};

/* ================================================================== */
/*  Tabs                                                               */
/* ================================================================== */

const TABS = [
  { key: "details", label: "Details", icon: FileText },
  { key: "impact", label: "Service Impact", icon: AlertTriangle },
  { key: "approvals", label: "Approvals", icon: Shield },
  { key: "technical", label: "Technical", icon: Database },
  { key: "provisioning", label: "Provisioning", icon: HardDrive },
  { key: "audit", label: "Audit Trail", icon: Activity },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function fmtDate(iso?: string) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso?: string) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ================================================================== */
/*  Status Badge                                                       */
/* ================================================================== */

function StatusBadgeInline({ status }: { status: string }) {
  const color = getStatusColor(status);
  const label = SSA_STATUS_LABELS[status] || status;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        borderRadius: "9999px",
        padding: "0.25rem 0.75rem",
        fontSize: "0.8125rem",
        fontWeight: 600,
        color,
        backgroundColor: color + "18",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

/* ================================================================== */
/*  Workflow Timeline                                                   */
/* ================================================================== */

function WorkflowTimeline({ status }: { status: string }) {
  const isRejected = status === "REJECTED";
  const isCancelled = status === "CANCELLED";

  const stageKeys = WORKFLOW_STAGES.map((s) => s.key);
  const currentIdx = stageKeys.indexOf(status);

  return (
    <div
      style={{
        ...cardStyle,
        overflowX: "auto",
        padding: "1.25rem 1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          minWidth: "max-content",
        }}
      >
        {WORKFLOW_STAGES.map((stage, idx) => {
          const isCompleted = currentIdx > idx;
          const isCurrent = currentIdx === idx;
          const isTerminalCurrent =
            (isRejected || isCancelled) && idx === currentIdx;

          let circleColor = "var(--surface-3)";
          let circleBorder = "var(--surface-3)";
          let textColor = "var(--text-secondary)";

          if (isCompleted) {
            circleColor = "#22c55e";
            circleBorder = "#22c55e";
            textColor = "#22c55e";
          } else if (isCurrent) {
            if (isRejected) {
              circleColor = "#ef4444";
              circleBorder = "#ef4444";
              textColor = "#ef4444";
            } else if (isCancelled) {
              circleColor = "var(--text-secondary)";
              circleBorder = "var(--text-secondary)";
            } else {
              circleColor = "var(--primary)";
              circleBorder = "var(--primary)";
              textColor = "var(--primary)";
            }
          }

          return (
            <div
              key={stage.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                flex: idx < WORKFLOW_STAGES.length - 1 ? 1 : "none",
              }}
            >
              {/* Stage circle + label */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 72,
                  flexShrink: 0,
                }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `2px solid ${circleBorder}`,
                    backgroundColor: isCompleted || isCurrent
                      ? circleColor
                      : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {isCompleted ? (
                    <Check size={14} style={{ color: "#fff" }} />
                  ) : isCurrent && !isTerminalCurrent ? (
                    <motion.div
                      animate={{ scale: [1, 1.6, 1] }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut",
                      }}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#fff",
                      }}
                    />
                  ) : isTerminalCurrent ? (
                    isRejected ? (
                      <XCircle size={14} style={{ color: "#fff" }} />
                    ) : (
                      <Ban size={14} style={{ color: "#fff" }} />
                    )
                  ) : null}
                </motion.div>
                <span
                  style={{
                    fontSize: "0.625rem",
                    fontWeight: 500,
                    color: textColor,
                    textAlign: "center",
                    marginTop: "0.375rem",
                    lineHeight: 1.2,
                    maxWidth: 72,
                  }}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < WORKFLOW_STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    marginTop: 13,
                    minWidth: 16,
                    backgroundColor: isCompleted
                      ? "#22c55e"
                      : "var(--surface-3)",
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Detail Grid (two-column key-value)                                 */
/* ================================================================== */

function FieldPair({
  label: l,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p style={fieldLabel}>{l}</p>
      <p style={fieldValue}>{value ?? "\u2014"}</p>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Details                                                       */
/* ================================================================== */

function DetailsTab({ request }: { request: SSARequestDetail }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Requestor Section */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Requestor Information</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
          <FieldPair label="Name" value={request.requestorName} />
          <FieldPair label="Staff ID" value={request.requestorStaffId} />
          <FieldPair label="Email" value={request.requestorEmail} />
          <FieldPair
            label="Status"
            value={request.requestorStatus || "\u2014"}
          />
          <FieldPair label="Division / Office" value={request.divisionOffice} />
          <FieldPair label="Extension" value={request.extension || "\u2014"} />
        </div>
      </div>

      {/* Technical Section */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Technical Specifications</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
          <FieldPair label="Application Name" value={request.appName} />
          <FieldPair label="Database Name" value={request.dbName} />
          <FieldPair label="Operating System" value={request.operatingSystem} />
          <FieldPair label="Server Type" value={request.serverType} />
          <FieldPair label="vCPU Count" value={request.vcpuCount} />
          <FieldPair label="Memory (GB)" value={request.memoryGb} />
          <FieldPair
            label="Disk Count"
            value={request.diskCount ?? "\u2014"}
          />
          <FieldPair label="Space (GB)" value={request.spaceGb} />
          <FieldPair label="VLAN Zone" value={request.vlanZone} />
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldPair
              label="Special Requirements"
              value={request.specialRequirements || "None"}
            />
          </div>
        </div>
      </div>

      {/* Justification Section */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Justification</p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-primary)",
            lineHeight: 1.6,
            margin: 0,
            marginBottom: "1rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {request.justification}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1rem",
          }}
        >
          <FieldPair
            label="Present Space Allocated (GB)"
            value={request.presentSpaceAllocatedGb}
          />
          <FieldPair
            label="Present Space In Use (GB)"
            value={request.presentSpaceInUseGb}
          />
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Service Impact                                                */
/* ================================================================== */

function ServiceImpactTab({ impacts }: { impacts: ServiceImpact[] }) {
  if (!impacts.length) {
    return (
      <div
        style={{
          ...cardStyle,
          textAlign: "center",
          padding: "3rem",
          color: "var(--text-secondary)",
        }}
      >
        <AlertTriangle
          size={32}
          style={{ margin: "0 auto 0.75rem", opacity: 0.5 }}
        />
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          No service impacts recorded.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {impacts
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((impact, idx) => {
          const sev =
            SEVERITY_COLORS[impact.severity] ||
            SEVERITY_COLORS["MEDIUM"];
          return (
            <motion.div
              key={impact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={cardStyle}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: "var(--surface-2)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                  }}
                >
                  {impact.sequenceOrder}
                </span>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {impact.riskCategory}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: "9999px",
                    padding: "0.125rem 0.625rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    backgroundColor: sev.bg,
                    color: sev.text,
                  }}
                >
                  {impact.severity}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <p style={fieldLabel}>Description</p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-primary)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {impact.riskDescription}
                  </p>
                </div>
                <div>
                  <p style={fieldLabel}>Mitigation Measures</p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-primary)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {impact.mitigationMeasures}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}

/* ================================================================== */
/*  Tab: Approvals                                                     */
/* ================================================================== */

function ApprovalsTab({ approvals }: { approvals: SSAApproval[] }) {
  if (!approvals.length) {
    return (
      <div
        style={{
          ...cardStyle,
          textAlign: "center",
          padding: "3rem",
          color: "var(--text-secondary)",
        }}
      >
        <Shield
          size={32}
          style={{ margin: "0 auto 0.75rem", opacity: 0.5 }}
        />
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          No approvals recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {approvals.map((appr, idx) => {
        const isApproved = appr.decision === "APPROVED";
        const isRejected = appr.decision === "REJECTED";
        const decisionColor = isApproved
          ? "#22c55e"
          : isRejected
            ? "#ef4444"
            : "var(--text-secondary)";

        return (
          <motion.div
            key={appr.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              ...cardStyle,
              borderLeft: `3px solid ${decisionColor}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {SSA_STATUS_LABELS[appr.stage] || appr.stage}
                </span>
                <ChevronRight
                  size={14}
                  style={{ color: "var(--text-secondary)" }}
                />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: decisionColor,
                  }}
                >
                  {isApproved ? (
                    <CheckCircle2 size={14} />
                  ) : isRejected ? (
                    <XCircle size={14} />
                  ) : (
                    <Clock size={14} />
                  )}
                  {appr.decision}
                </span>
              </div>
              {appr.slaBreached && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    borderRadius: "9999px",
                    padding: "0.125rem 0.625rem",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    backgroundColor: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                  }}
                >
                  <Clock size={10} />
                  SLA Breached
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
              }}
            >
              <FieldPair label="Approver" value={appr.approverName} />
              <FieldPair label="Role" value={appr.approverRole} />
              <FieldPair label="Decided At" value={fmtDateTime(appr.decidedAt)} />
            </div>
            {appr.remarks && (
              <div style={{ marginTop: "0.75rem" }}>
                <p style={fieldLabel}>Remarks</p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    margin: 0,
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}
                >
                  {appr.remarks}
                </p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Tab: Technical                                                     */
/* ================================================================== */

function TechnicalTab({
  asd,
  qcmd,
}: {
  asd?: ASDAssessment;
  qcmd?: QCMDAnalysis;
}) {
  function BoolCheck({ val, label: l }: { val: boolean; label: string }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0",
        }}
      >
        {val ? (
          <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
        ) : (
          <XCircle size={16} style={{ color: "#ef4444" }} />
        )}
        <span
          style={{
            fontSize: "0.875rem",
            color: "var(--text-primary)",
          }}
        >
          {l}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ASD Assessment */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Shield size={18} style={{ color: "var(--primary)" }} />
          <p style={{ ...sectionTitle, marginBottom: 0 }}>ASD Assessment</p>
        </div>
        {asd ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <FieldPair
                label="Assessment Outcome"
                value={
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        asd.assessmentOutcome === "FEASIBLE"
                          ? "#22c55e"
                          : asd.assessmentOutcome === "NOT_FEASIBLE"
                            ? "#ef4444"
                            : "#f59e0b",
                    }}
                  >
                    {asd.assessmentOutcome.replace(/_/g, " ")}
                  </span>
                }
              />
              <FieldPair
                label="Assessed At"
                value={fmtDateTime(asd.assessedAt)}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0 1rem",
                marginBottom: "1rem",
              }}
            >
              <BoolCheck
                val={asd.osCompatibilityCheck}
                label="OS Compatibility"
              />
              <BoolCheck
                val={asd.resourceAdequacyCheck}
                label="Resource Adequacy"
              />
              <BoolCheck
                val={asd.securityComplianceCheck}
                label="Security Compliance"
              />
              <BoolCheck
                val={asd.haFeasibilityCheck}
                label="HA Feasibility"
              />
            </div>
            {asd.conditions && (
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={fieldLabel}>Conditions</p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {asd.conditions}
                </p>
              </div>
            )}
            {asd.technicalNotes && (
              <div>
                <p style={fieldLabel}>Technical Notes</p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {asd.technicalNotes}
                </p>
              </div>
            )}
          </>
        ) : (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            ASD assessment has not been completed yet.
          </p>
        )}
      </div>

      {/* QCMD Analysis */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Database size={18} style={{ color: "var(--primary)" }} />
          <p style={{ ...sectionTitle, marginBottom: 0 }}>QCMD Analysis</p>
        </div>
        {qcmd ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1rem",
              }}
            >
              <FieldPair
                label="Server Reference"
                value={qcmd.serverReference}
              />
              <FieldPair
                label="Available Storage (TB)"
                value={qcmd.availableStorageTb}
              />
              <FieldPair
                label="Space Requested (GB)"
                value={qcmd.spaceRequestedGb}
              />
              <FieldPair
                label="Storage After Allocation (TB)"
                value={qcmd.storageAfterAllocationTb}
              />
              <FieldPair
                label="Analysed At"
                value={fmtDateTime(qcmd.analysedAt)}
              />
            </div>
            {qcmd.justificationNotes && (
              <div style={{ marginTop: "1rem" }}>
                <p style={fieldLabel}>Justification Notes</p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {qcmd.justificationNotes}
                </p>
              </div>
            )}
          </>
        ) : (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            QCMD analysis has not been completed yet.
          </p>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Provisioning                                                  */
/* ================================================================== */

function ProvisioningTab({
  san,
  dco,
}: {
  san?: SANProvisioning;
  dco?: DCOServer;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* SAN Provisioning */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <HardDrive size={18} style={{ color: "var(--primary)" }} />
          <p style={{ ...sectionTitle, marginBottom: 0 }}>SAN Provisioning</p>
        </div>
        {san ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
            }}
          >
            <FieldPair label="Port" value={san.port} />
            <FieldPair label="CU" value={san.cu} />
            <FieldPair label="LDEV" value={san.ldev} />
            <FieldPair label="LUN" value={san.lun} />
            <FieldPair label="ACP" value={san.acp} />
            <FieldPair label="Size Allocated" value={san.sizeAllocated} />
            <FieldPair label="HBA Type" value={san.hbaType || "\u2014"} />
            <FieldPair
              label="HBA Driver Version"
              value={san.hbaDriverVersion || "\u2014"}
            />
            <FieldPair label="WWN No" value={san.wwnNo || "\u2014"} />
            <FieldPair
              label="Host Name"
              value={san.hostName || "\u2014"}
            />
            <FieldPair
              label="SAN Switch No/Port"
              value={san.sanSwitchNoPort || "\u2014"}
            />
            <FieldPair
              label="SAN Switch Zone Name"
              value={san.sanSwitchZoneName || "\u2014"}
            />
            {san.remarks && (
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldPair label="Remarks" value={san.remarks} />
              </div>
            )}
            <FieldPair
              label="Provisioned At"
              value={fmtDateTime(san.provisionedAt)}
            />
          </div>
        ) : (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            SAN provisioning has not been completed yet.
          </p>
        )}
      </div>

      {/* DCO Server */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Server size={18} style={{ color: "var(--primary)" }} />
          <p style={{ ...sectionTitle, marginBottom: 0 }}>
            DCO Server Details
          </p>
        </div>
        {dco ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
            }}
          >
            <FieldPair label="Server Name" value={dco.serverName} />
            <FieldPair label="IP Address" value={dco.ipAddress} />
            <FieldPair label="Zone" value={dco.zone} />
            <FieldPair label="Created By" value={dco.creatorName} />
            <FieldPair label="Staff ID" value={dco.creatorStaffId} />
            <FieldPair
              label="Created At"
              value={fmtDateTime(dco.createdServerAt)}
            />
          </div>
        ) : (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            DCO server has not been created yet.
          </p>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Audit Trail                                                   */
/* ================================================================== */

function AuditTrailTab({ logs }: { logs: SSAAuditLog[] }) {
  if (!logs.length) {
    return (
      <div
        style={{
          ...cardStyle,
          textAlign: "center",
          padding: "3rem",
          color: "var(--text-secondary)",
        }}
      >
        <Activity
          size={32}
          style={{ margin: "0 auto 0.75rem", opacity: 0.5 }}
        />
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          No audit log entries yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {logs.map((log, idx) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          style={{
            ...cardStyle,
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          {/* Event icon */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Activity size={14} style={{ color: "var(--text-secondary)" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginBottom: "0.25rem",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "9999px",
                  padding: "0.125rem 0.5rem",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {log.eventType.replace(/_/g, " ")}
              </span>
              {log.fromState && log.toState && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <StatusBadgeInline status={log.fromState} />
                  <ChevronRight size={12} />
                  <StatusBadgeInline status={log.toState} />
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {log.description}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginTop: "0.375rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                }}
              >
                {log.actorName}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtDateTime(log.occurredAt)}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: Endorsement Form                                     */
/* ================================================================== */

function EndorsementForm({ id }: { id: string }) {
  const [decision, setDecision] = useState("APPROVED");
  const [remarks, setRemarks] = useState("");
  const mutation = useSubmitEndorsement(id);

  return (
    <div style={cardStyle}>
      <p style={sectionTitle}>HOO Endorsement</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Decision</label>
          <select
            style={selectStyle}
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="APPROVED">Approve</option>
            <option value="REJECTED">Reject</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Remarks</label>
          <textarea
            style={textareaStyle}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks..."
          />
        </div>
        <button
          type="button"
          style={decision === "REJECTED" ? btnDanger : btnPrimary}
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              decision,
              remarks: remarks || undefined,
            })
          }
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          Submit Endorsement
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: ASD Assessment Form                                  */
/* ================================================================== */

function ASDAssessmentForm({ id }: { id: string }) {
  const [outcome, setOutcome] = useState("FEASIBLE");
  const [osCheck, setOsCheck] = useState(true);
  const [resourceCheck, setResourceCheck] = useState(true);
  const [securityCheck, setSecurityCheck] = useState(true);
  const [haCheck, setHaCheck] = useState(true);
  const [conditions, setConditions] = useState("");
  const [notes, setNotes] = useState("");
  const mutation = useSubmitASDAssessment(id);

  const checkboxRow = (
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.875rem",
        color: "var(--text-primary)",
        cursor: "pointer",
        padding: "0.25rem 0",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--primary)", width: 16, height: 16 }}
      />
      {label}
    </label>
  );

  return (
    <div style={cardStyle}>
      <p style={sectionTitle}>ASD Assessment</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Assessment Outcome</label>
          <select
            style={selectStyle}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            {ASSESSMENT_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Checks</label>
          {checkboxRow("OS Compatibility", osCheck, setOsCheck)}
          {checkboxRow("Resource Adequacy", resourceCheck, setResourceCheck)}
          {checkboxRow("Security Compliance", securityCheck, setSecurityCheck)}
          {checkboxRow("HA Feasibility", haCheck, setHaCheck)}
        </div>
        <div>
          <label style={labelStyle}>Conditions</label>
          <textarea
            style={textareaStyle}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="Any conditions for approval..."
          />
        </div>
        <div>
          <label style={labelStyle}>Technical Notes</label>
          <textarea
            style={textareaStyle}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional technical notes..."
          />
        </div>
        <button
          type="button"
          style={btnPrimary}
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              assessmentOutcome: outcome,
              osCompatibilityCheck: osCheck,
              resourceAdequacyCheck: resourceCheck,
              securityComplianceCheck: securityCheck,
              haFeasibilityCheck: haCheck,
              conditions: conditions || undefined,
              technicalNotes: notes || undefined,
            })
          }
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          Submit Assessment
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: QCMD Analysis Form                                   */
/* ================================================================== */

function QCMDAnalysisForm({
  id,
  spaceGb,
}: {
  id: string;
  spaceGb: number;
}) {
  const [serverRef, setServerRef] = useState("");
  const [availableStorage, setAvailableStorage] = useState("");
  const [storageAfter, setStorageAfter] = useState("");
  const [notes, setNotes] = useState("");
  const mutation = useSubmitQCMDAnalysis(id);

  return (
    <div style={cardStyle}>
      <p style={sectionTitle}>QCMD Analysis</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Server Reference</label>
          <input
            style={inputStyle}
            value={serverRef}
            onChange={(e) => setServerRef(e.target.value)}
            placeholder="e.g. SRV-DC-001"
          />
        </div>
        <div>
          <label style={labelStyle}>Available Storage (TB)</label>
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            value={availableStorage}
            onChange={(e) => setAvailableStorage(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Space Requested (GB)</label>
          <input style={inputStyle} type="number" value={spaceGb} readOnly />
        </div>
        <div>
          <label style={labelStyle}>Storage After Allocation (TB)</label>
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            value={storageAfter}
            onChange={(e) => setStorageAfter(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Justification Notes</label>
          <textarea
            style={textareaStyle}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Analysis justification notes..."
          />
        </div>
        <button
          type="button"
          style={btnPrimary}
          disabled={mutation.isPending || !serverRef || !availableStorage || !storageAfter}
          onClick={() =>
            mutation.mutate({
              serverReference: serverRef,
              availableStorageTb: parseFloat(availableStorage),
              spaceRequestedGb: spaceGb,
              storageAfterAllocationTb: parseFloat(storageAfter),
              justificationNotes: notes || undefined,
            })
          }
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          Submit Analysis
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: Approval Form                                        */
/* ================================================================== */

function ApprovalForm({ id }: { id: string }) {
  const [decision, setDecision] = useState("APPROVED");
  const [remarks, setRemarks] = useState("");
  const mutation = useSubmitApproval(id);

  return (
    <div style={cardStyle}>
      <p style={sectionTitle}>Approval Decision</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Decision</label>
          <select
            style={selectStyle}
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="APPROVED">Approve</option>
            <option value="REJECTED">Reject</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Remarks</label>
          <textarea
            style={textareaStyle}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks..."
          />
        </div>
        <button
          type="button"
          style={decision === "REJECTED" ? btnDanger : btnPrimary}
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              decision,
              remarks: remarks || undefined,
            })
          }
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          Submit Decision
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: SAN Provisioning Form                                */
/* ================================================================== */

function SANProvisioningForm({ id }: { id: string }) {
  const [form, setForm] = useState({
    port: "",
    cu: "",
    ldev: "",
    lun: "",
    acp: "",
    sizeAllocated: "",
    hbaType: "",
    hbaDriverVersion: "",
    wwnNo: "",
    hostName: "",
    sanSwitchNoPort: "",
    sanSwitchZoneName: "",
    remarks: "",
  });
  const mutation = useSubmitSANProvisioning(id);

  const update = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const requiredFilled =
    form.port && form.cu && form.ldev && form.lun && form.acp && form.sizeAllocated;

  return (
    <div style={cardStyle}>
      <p style={sectionTitle}>SAN Provisioning</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {[
            { key: "port", label: "Port", required: true },
            { key: "cu", label: "CU", required: true },
            { key: "ldev", label: "LDEV", required: true },
            { key: "lun", label: "LUN", required: true },
            { key: "acp", label: "ACP", required: true },
            { key: "sizeAllocated", label: "Size Allocated", required: true },
            { key: "hbaType", label: "HBA Type" },
            { key: "hbaDriverVersion", label: "HBA Driver Version" },
            { key: "wwnNo", label: "WWN No" },
            { key: "hostName", label: "Host Name" },
            { key: "sanSwitchNoPort", label: "SAN Switch No/Port" },
            { key: "sanSwitchZoneName", label: "SAN Switch Zone Name" },
          ].map((f) => (
            <div key={f.key}>
              <label style={labelStyle}>
                {f.label}
                {f.required && (
                  <span style={{ color: "#ef4444" }}> *</span>
                )}
              </label>
              <input
                style={inputStyle}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => update(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div>
          <label style={labelStyle}>Remarks</label>
          <textarea
            style={textareaStyle}
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
            placeholder="Optional remarks..."
          />
        </div>
        <button
          type="button"
          style={btnPrimary}
          disabled={mutation.isPending || !requiredFilled}
          onClick={() => {
            const body: Partial<SANProvisioning> = {
              port: form.port,
              cu: form.cu,
              ldev: form.ldev,
              lun: form.lun,
              acp: form.acp,
              sizeAllocated: form.sizeAllocated,
            };
            if (form.hbaType) body.hbaType = form.hbaType;
            if (form.hbaDriverVersion)
              body.hbaDriverVersion = form.hbaDriverVersion;
            if (form.wwnNo) body.wwnNo = form.wwnNo;
            if (form.hostName) body.hostName = form.hostName;
            if (form.sanSwitchNoPort)
              body.sanSwitchNoPort = form.sanSwitchNoPort;
            if (form.sanSwitchZoneName)
              body.sanSwitchZoneName = form.sanSwitchZoneName;
            if (form.remarks) body.remarks = form.remarks;
            mutation.mutate(body);
          }}
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          Submit Provisioning
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: DCO Server Form                                      */
/* ================================================================== */

function DCOServerForm({ id }: { id: string }) {
  const [serverName, setServerName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [zone, setZone] = useState("");
  const mutation = useSubmitDCOServer(id);

  return (
    <div style={cardStyle}>
      <p style={sectionTitle}>DCO Server Creation</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>
            Server Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            style={inputStyle}
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="e.g. APP-PROD-001"
          />
        </div>
        <div>
          <label style={labelStyle}>
            IP Address <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            style={inputStyle}
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            placeholder="e.g. 10.0.1.50"
          />
        </div>
        <div>
          <label style={labelStyle}>
            Zone <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            style={inputStyle}
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="e.g. DMZ"
          />
        </div>
        <button
          type="button"
          style={btnPrimary}
          disabled={mutation.isPending || !serverName || !ipAddress || !zone}
          onClick={() =>
            mutation.mutate({
              serverName,
              ipAddress,
              zone,
            })
          }
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          Create Server
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: Cancel Form                                          */
/* ================================================================== */

function CancelForm({ id }: { id: string }) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const mutation = useCancelSSARequest(id);

  return (
    <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.3)" }}>
      <p style={{ ...sectionTitle, color: "#ef4444" }}>Cancel Request</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Reason (optional)</label>
          <textarea
            style={textareaStyle}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for cancellation..."
          />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            style={{ accentColor: "#ef4444", width: 16, height: 16 }}
          />
          I confirm I want to cancel this request
        </label>
        <button
          type="button"
          style={btnDanger}
          disabled={mutation.isPending || !confirm}
          onClick={() =>
            mutation.mutate(reason ? { reason } : undefined)
          }
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          <Ban size={14} />
          Cancel Request
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel: Revise Form                                          */
/* ================================================================== */

function ReviseForm({
  id,
  request,
}: {
  id: string;
  request: SSARequestDetail;
}) {
  const [justification, setJustification] = useState(request.justification);
  const [spaceGb, setSpaceGb] = useState(String(request.spaceGb));
  const [specialReq, setSpecialReq] = useState(
    request.specialRequirements || "",
  );
  const mutation = useReviseSSARequest(id);

  return (
    <div style={{ ...cardStyle, borderColor: "rgba(245,158,11,0.3)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <RefreshCw size={16} style={{ color: "#f59e0b" }} />
        <p style={{ ...sectionTitle, marginBottom: 0, color: "#f59e0b" }}>
          Revise & Resubmit
        </p>
      </div>
      {request.rejectedStage && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            margin: "0 0 1rem",
          }}
        >
          Rejected at stage:{" "}
          <strong>
            {SSA_STATUS_LABELS[request.rejectedStage] || request.rejectedStage}
          </strong>
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Justification (revised)</label>
          <textarea
            style={textareaStyle}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Space (GB)</label>
          <input
            style={inputStyle}
            type="number"
            value={spaceGb}
            onChange={(e) => setSpaceGb(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Special Requirements</label>
          <textarea
            style={textareaStyle}
            value={specialReq}
            onChange={(e) => setSpecialReq(e.target.value)}
          />
        </div>
        <button
          type="button"
          style={btnPrimary}
          disabled={mutation.isPending || !justification}
          onClick={() =>
            mutation.mutate({
              justification,
              spaceGb: parseInt(spaceGb, 10),
              specialRequirements: specialReq || undefined,
            })
          }
        >
          {mutation.isPending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          <RefreshCw size={14} />
          Revise & Resubmit
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Action Panel Selector                                              */
/* ================================================================== */

function ActionPanel({
  id,
  request,
}: {
  id: string;
  request: SSARequestDetail;
}) {
  const status = request.status;

  if (status === "DRAFT") {
    return <CancelForm id={id} />;
  }
  if (status === "SUBMITTED") {
    return <EndorsementForm id={id} />;
  }
  if (status === "HOO_ENDORSED") {
    return <ASDAssessmentForm id={id} />;
  }
  if (status === "ASD_ASSESSED") {
    return <QCMDAnalysisForm id={id} spaceGb={request.spaceGb} />;
  }
  if (status.startsWith("APPR_") && status.endsWith("_PENDING")) {
    return <ApprovalForm id={id} />;
  }
  if (status === "FULLY_APPROVED") {
    return <SANProvisioningForm id={id} />;
  }
  if (status === "SAN_PROVISIONED") {
    return <DCOServerForm id={id} />;
  }
  if (status === "REJECTED") {
    return <ReviseForm id={id} request={request} />;
  }

  // CANCELLED or DCO_CREATED — completed states
  return (
    <div
      style={{
        ...cardStyle,
        textAlign: "center",
        padding: "2rem 1.5rem",
        color: "var(--text-secondary)",
      }}
    >
      <CheckCircle2
        size={32}
        style={{ margin: "0 auto 0.75rem", opacity: 0.5 }}
      />
      <p
        style={{
          fontSize: "0.9375rem",
          fontWeight: 600,
          margin: "0 0 0.25rem",
          color: "var(--text-primary)",
        }}
      >
        {status === "CANCELLED"
          ? "Request Cancelled"
          : "Workflow Complete"}
      </p>
      <p style={{ fontSize: "0.8125rem", margin: 0 }}>
        {status === "CANCELLED"
          ? "This request has been cancelled. No further actions are available."
          : "The server has been created. This request is now complete."}
      </p>
    </div>
  );
}

/* ================================================================== */
/*  Main Page Component                                                */
/* ================================================================== */

export default function SSARequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: request, isLoading, error } = useSSARequest(id);
  const { data: auditLogs } = useSSAAuditLog(id);

  const [activeTab, setActiveTab] = useState<TabKey>("details");

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
        }}
      >
        <Loader2
          size={32}
          style={{
            color: "var(--primary)",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Loading request details...
        </p>
      </div>
    );
  }

  /* ---- Error ---- */
  if (error || !request) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
        }}
      >
        <XCircle size={40} style={{ color: "#ef4444" }} />
        <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          Failed to load request
        </p>
        <button
          type="button"
          style={btnOutline}
          onClick={() => router.push("/dashboard/ssa")}
        >
          <ArrowLeft size={14} />
          Back to Requests
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Spin keyframe injection */}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ──────────── Header ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/dashboard/ssa")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "0.625rem",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-0)",
                cursor: "pointer",
                flexShrink: 0,
                marginTop: 2,
              }}
              title="Back to list"
            >
              <ArrowLeft size={16} style={{ color: "var(--text-primary)" }} />
            </button>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <h1
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {request.referenceNo}
                </h1>
                <StatusBadgeInline status={request.status} />
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  margin: "0.25rem 0 0",
                }}
              >
                {request.appName}
                {request.submittedAt && (
                  <>
                    {" \u2022 "}
                    Submitted {fmtDate(request.submittedAt)}
                  </>
                )}
                {request.revisionCount > 0 && (
                  <>
                    {" \u2022 "}
                    Revision #{request.revisionCount}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ──────────── Workflow Timeline ──────────── */}
      {request.status !== "DRAFT" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <WorkflowTimeline status={request.status} />
        </motion.div>
      )}

      {/* ──────────── Main Content (Tabs + Action Panel) ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Left: Tabbed content */}
        <div>
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              borderBottom: "1px solid var(--border)",
              marginBottom: "1.25rem",
              overflowX: "auto",
            }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.625rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: active ? 600 : 500,
                    color: active
                      ? "var(--primary)"
                      : "var(--text-secondary)",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: active
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "details" && (
                <DetailsTab request={request} />
              )}
              {activeTab === "impact" && (
                <ServiceImpactTab
                  impacts={request.serviceImpacts || []}
                />
              )}
              {activeTab === "approvals" && (
                <ApprovalsTab approvals={request.approvals || []} />
              )}
              {activeTab === "technical" && (
                <TechnicalTab
                  asd={request.asdAssessment}
                  qcmd={request.qcmdAnalysis}
                />
              )}
              {activeTab === "provisioning" && (
                <ProvisioningTab
                  san={request.sanProvisioning}
                  dco={request.dcoServer}
                />
              )}
              {activeTab === "audit" && (
                <AuditTrailTab logs={auditLogs || []} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Action Panel */}
        <div style={{ position: "sticky", top: "1.5rem" }}>
          <ActionPanel id={id} request={request} />
        </div>
      </motion.div>
    </div>
  );
}
