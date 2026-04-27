"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Webhook,
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useWebhookEndpoint,
  useUpdateWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useRegenerateWebhookSecret,
  useWebhookLogs,
  useTestWebhook,
} from "@/hooks/use-system";
import type { WebhookLog } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

const TARGET_ACTION_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  create_ticket: { label: "Create Ticket", variant: "info" },
  update_ticket: { label: "Update Ticket", variant: "warning" },
  create_ci: { label: "Create CI", variant: "info" },
  trigger_notification: { label: "Notification", variant: "success" },
  log_only: { label: "Log Only", variant: "default" },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089/api/v1";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WebhookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Webhooks", href: "/dashboard/system/webhooks" },
    { label: "Detail", href: `/dashboard/system/webhooks/${id}` },
  ]);

  /* State */
  const [showSecret, setShowSecret] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState(
    '{\n  "alert": {\n    "name": "Test Alert",\n    "message": "This is a test webhook payload"\n  },\n  "severity": "P3_medium"\n}',
  );
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [editTransform, setEditTransform] = useState(false);
  const [transformDraft, setTransformDraft] = useState("");
  const [transformError, setTransformError] = useState("");

  /* API */
  const { data: endpoint, isLoading } = useWebhookEndpoint(id);
  const updateMutation = useUpdateWebhookEndpoint(id);
  const deleteMutation = useDeleteWebhookEndpoint();
  const regenerateMutation = useRegenerateWebhookSecret(id);
  const testMutation = useTestWebhook(id);

  const { data: logsResponse } = useWebhookLogs(id, logPage, 10);

  const logs: WebhookLog[] = useMemo(() => {
    if (!logsResponse) return [];
    if (Array.isArray(logsResponse)) return logsResponse;
    if ("data" in logsResponse && Array.isArray(logsResponse.data))
      return logsResponse.data;
    return [];
  }, [logsResponse]);

  const logsMeta = useMemo(() => {
    if (logsResponse && "meta" in logsResponse && logsResponse.meta)
      return logsResponse.meta;
    return null;
  }, [logsResponse]);

  /* Helpers */
  const endpointUrl = endpoint
    ? `${API_BASE}/webhooks/custom/${endpoint.slug}`
    : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleToggleActive = async () => {
    if (!endpoint) return;
    await updateMutation.mutateAsync({ isActive: !endpoint.isActive });
  };

  const handleSaveTransform = async () => {
    try {
      const parsed = JSON.parse(transformDraft);
      setTransformError("");
      await updateMutation.mutateAsync({ payloadTransform: parsed });
      setEditTransform(false);
    } catch {
      setTransformError("Invalid JSON");
    }
  };

  const handleTest = async () => {
    try {
      const payload = JSON.parse(testPayload);
      const result = await testMutation.mutateAsync(payload);
      setTestResult(result as unknown as Record<string, unknown>);
    } catch {
      toast.error("Invalid JSON payload");
    }
  };

  /* Loading */
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded-xl" style={{ backgroundColor: "var(--bg-tertiary)" }} />
        <div className="h-64 animate-pulse rounded-xl" style={{ backgroundColor: "var(--bg-tertiary)" }} />
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="flex items-center justify-center p-12">
        <p style={{ color: "var(--text-muted)" }}>Webhook endpoint not found.</p>
      </div>
    );
  }

  const actionCfg = TARGET_ACTION_LABELS[endpoint.targetAction] || {
    label: endpoint.targetAction,
    variant: "default" as BadgeVariant,
  };

  /* ---- Log columns ---- */
  const logColumns: Column<WebhookLog>[] = [
    {
      key: "receivedAt",
      header: "Time",
      render: (item) => (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {new Date(item.receivedAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "sourceIp",
      header: "Source IP",
      render: (item) => (
        <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
          {item.sourceIp || "—"}
        </span>
      ),
    },
    {
      key: "signatureValid",
      header: "Signature",
      render: (item) =>
        item.signatureValid === undefined || item.signatureValid === null ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            N/A
          </span>
        ) : item.signatureValid ? (
          <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
        ) : (
          <XCircle className="h-4 w-4" style={{ color: "var(--danger)" }} />
        ),
    },
    {
      key: "actionTaken",
      header: "Action",
      render: (item) => (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {item.actionTaken || "—"}
        </span>
      ),
    },
    {
      key: "error",
      header: "Error",
      render: (item) =>
        item.error ? (
          <span className="text-xs" style={{ color: "var(--danger)" }}>
            {item.error.length > 60
              ? item.error.substring(0, 60) + "..."
              : item.error}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--success)" }}>
            OK
          </span>
        ),
    },
  ];

  return (
    <PermissionGate permission="system.manage" fallback={<p>Access denied.</p>}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/system/webhooks")}
              className="rounded-lg border p-2 transition-colors hover:opacity-80"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            </button>
            <div
              className="rounded-xl p-2.5"
              style={{ backgroundColor: "var(--primary-subtle)" }}
            >
              <Webhook className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {endpoint.name}
                </h1>
                <StatusBadge
                  status={endpoint.isActive ? "active" : "inactive"}
                />
                <StatusBadge status={actionCfg.label} variant={actionCfg.variant} />
              </div>
              <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                {endpoint.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              {endpoint.isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--danger)",
                color: "var(--danger)",
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Configuration Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border p-6"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-primary)",
          }}
        >
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Configuration
          </h2>

          <div className="space-y-4">
            {/* Endpoint URL */}
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Endpoint URL
              </label>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono break-all"
                  style={{
                    borderColor: "var(--border-primary)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                  }}
                >
                  {endpointUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(endpointUrl, "Endpoint URL")}
                  className="rounded-lg border p-2 hover:opacity-80"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  <Copy className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            </div>

            {/* Secret */}
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                HMAC Secret
              </label>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 rounded-lg border px-3 py-2 text-xs font-mono break-all"
                  style={{
                    borderColor: "var(--border-primary)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                  }}
                >
                  {showSecret && endpoint.secret
                    ? endpoint.secret
                    : "••••••••••••••••••••••••••••••••"}
                </code>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="rounded-lg border p-2 hover:opacity-80"
                  style={{ borderColor: "var(--border-primary)" }}
                  title={showSecret ? "Hide" : "Reveal"}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>
                <button
                  onClick={() =>
                    endpoint.secret &&
                    copyToClipboard(endpoint.secret, "Secret")
                  }
                  className="rounded-lg border p-2 hover:opacity-80"
                  style={{ borderColor: "var(--border-primary)" }}
                  title="Copy secret"
                >
                  <Copy className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </button>
                <button
                  onClick={() => setShowRegenerate(true)}
                  className="rounded-lg border p-2 hover:opacity-80"
                  style={{ borderColor: "var(--border-primary)" }}
                  title="Regenerate secret"
                >
                  <RefreshCw className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            </div>

            {/* Description */}
            {endpoint.description && (
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  Description
                </label>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {endpoint.description}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: "var(--border-primary)",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Total Received
                </p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {endpoint.totalReceived}
                </p>
              </div>
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: "var(--border-primary)",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Total Errors
                </p>
                <p
                  className="text-lg font-bold"
                  style={{
                    color:
                      endpoint.totalErrors > 0
                        ? "var(--danger)"
                        : "var(--text-primary)",
                  }}
                >
                  {endpoint.totalErrors}
                </p>
              </div>
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: "var(--border-primary)",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Last Received
                </p>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {endpoint.lastReceivedAt
                    ? new Date(endpoint.lastReceivedAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            {/* Payload Transform */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  Payload Transform
                </label>
                <button
                  onClick={() => {
                    if (editTransform) {
                      setEditTransform(false);
                    } else {
                      setTransformDraft(
                        JSON.stringify(endpoint.payloadTransform, null, 2),
                      );
                      setEditTransform(true);
                      setTransformError("");
                    }
                  }}
                  className="text-xs font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  {editTransform ? "Cancel" : "Edit"}
                </button>
              </div>
              {editTransform ? (
                <div>
                  <textarea
                    value={transformDraft}
                    onChange={(e) => {
                      setTransformDraft(e.target.value);
                      setTransformError("");
                    }}
                    rows={6}
                    className="w-full rounded-xl border px-3 py-2 font-mono text-xs"
                    style={{
                      borderColor: transformError
                        ? "var(--danger)"
                        : "var(--border-primary)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                  />
                  {transformError && (
                    <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                      {transformError}
                    </p>
                  )}
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleSaveTransform}
                      className="rounded-xl px-3 py-1.5 text-xs font-medium text-white"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <pre
                  className="rounded-lg border px-3 py-2 text-xs font-mono overflow-x-auto"
                  style={{
                    borderColor: "var(--border-primary)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {JSON.stringify(endpoint.payloadTransform, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </motion.div>

        {/* Test Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border p-6"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-primary)",
          }}
        >
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Test Webhook
          </h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Test Payload (JSON)
              </label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={6}
                className="w-full rounded-xl border px-3 py-2 font-mono text-xs"
                style={{
                  borderColor: "var(--border-primary)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              onClick={handleTest}
              disabled={testMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Send className="h-4 w-4" />
              {testMutation.isPending ? "Sending..." : "Send Test"}
            </button>

            {testResult && (
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor:
                    testResult.status === "error"
                      ? "var(--danger)"
                      : "var(--success)",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  {testResult.status === "error" ? (
                    <AlertCircle className="h-4 w-4" style={{ color: "var(--danger)" }} />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
                  )}
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        testResult.status === "error"
                          ? "var(--danger)"
                          : "var(--success)",
                    }}
                  >
                    {testResult.status === "error" ? "Test Failed" : "Test Succeeded"}
                  </span>
                </div>
                <pre
                  className="text-xs font-mono overflow-x-auto"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </motion.div>

        {/* Logs Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border p-6"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-primary)",
          }}
        >
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Recent Logs
          </h2>

          <DataTable
            columns={logColumns}
            data={logs}
            keyExtractor={(item) => item.id}
            loading={!logsResponse}
            emptyTitle="No logs yet"
            emptyDescription="Logs will appear here when the webhook receives requests."
            onRowClick={(item) =>
              setExpandedLog(expandedLog === item.id ? null : item.id)
            }
            pagination={
              logsMeta
                ? {
                    currentPage: logsMeta.page ?? logPage,
                    totalPages: logsMeta.totalPages ?? 1,
                    totalItems: logsMeta.totalItems,
                    onPageChange: setLogPage,
                  }
                : undefined
            }
          />

          {/* Expanded log detail */}
          {expandedLog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-xl border p-4"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-secondary)",
              }}
            >
              {(() => {
                const log = logs.find((l) => l.id === expandedLog);
                if (!log) return null;
                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                        Payload
                      </p>
                      <pre
                        className="mt-1 max-h-40 overflow-auto rounded-lg p-2 text-xs font-mono"
                        style={{
                          backgroundColor: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                    {log.headers && (
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                          Headers
                        </p>
                        <pre
                          className="mt-1 max-h-32 overflow-auto rounded-lg p-2 text-xs font-mono"
                          style={{
                            backgroundColor: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {JSON.stringify(log.headers, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.actionResult && (
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                          Action Result
                        </p>
                        <pre
                          className="mt-1 max-h-32 overflow-auto rounded-lg p-2 text-xs font-mono"
                          style={{
                            backgroundColor: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {JSON.stringify(log.actionResult, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.error && (
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--danger)" }}>
                          Error
                        </p>
                        <p className="text-xs" style={{ color: "var(--danger)" }}>
                          {log.error}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </motion.div>

        {/* Regenerate Secret Confirm */}
        <ConfirmDialog
          open={showRegenerate}
          onClose={() => setShowRegenerate(false)}
          onConfirm={async () => {
            await regenerateMutation.mutateAsync();
            setShowRegenerate(false);
          }}
          title="Regenerate Secret"
          message="This will invalidate the current HMAC secret. Any external systems using the old secret will need to be updated."
          confirmLabel="Regenerate"
          variant="danger"
          loading={regenerateMutation.isPending}
        />

        {/* Delete Confirm */}
        <ConfirmDialog
          open={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(id);
            router.push("/dashboard/system/webhooks");
          }}
          title="Delete Webhook"
          message={`Are you sure you want to delete "${endpoint.name}"? All associated logs will be permanently removed.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </div>
    </PermissionGate>
  );
}
