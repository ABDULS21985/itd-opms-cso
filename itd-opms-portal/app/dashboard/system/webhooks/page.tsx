"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Webhook,
  Plus,
  Search,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  useWebhookEndpoints,
  useCreateWebhookEndpoint,
  useDeleteWebhookEndpoint,
} from "@/hooks/use-system";
import type { WebhookEndpoint } from "@/types";

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

const TARGET_ACTIONS = [
  { value: "create_ticket", label: "Create Ticket" },
  { value: "update_ticket", label: "Update Ticket" },
  { value: "create_ci", label: "Create CI" },
  { value: "trigger_notification", label: "Trigger Notification" },
  { value: "log_only", label: "Log Only" },
];

/* ------------------------------------------------------------------ */
/*  Slug helper                                                        */
/* ------------------------------------------------------------------ */

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WebhooksPage() {
  const router = useRouter();

  useBreadcrumbs([
    { label: "System", href: "/dashboard/system" },
    { label: "Webhooks", href: "/dashboard/system/webhooks" },
  ]);

  /* State */
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(
    null,
  );
  const [createdSecret, setCreatedSecret] = useState<{
    secret: string;
    slug: string;
  } | null>(null);

  /* API */
  const { data: response, isLoading } = useWebhookEndpoints(page, 20);
  const createMutation = useCreateWebhookEndpoint();
  const deleteMutation = useDeleteWebhookEndpoint();

  /* Derived */
  const endpoints: WebhookEndpoint[] = useMemo(() => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if ("data" in response && Array.isArray(response.data)) return response.data;
    return [];
  }, [response]);

  const meta = useMemo(() => {
    if (response && "meta" in response && response.meta) return response.meta;
    return null;
  }, [response]);

  const filtered = useMemo(() => {
    if (!searchInput.trim()) return endpoints;
    const q = searchInput.toLowerCase();
    return endpoints.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q),
    );
  }, [endpoints, searchInput]);

  /* ---- Columns ---- */
  const columns: Column<WebhookEndpoint>[] = [
    {
      key: "name",
      header: "Name",
      render: (item) => (
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {item.name}
          </p>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            /webhooks/custom/{item.slug}
          </p>
        </div>
      ),
    },
    {
      key: "targetAction",
      header: "Action",
      render: (item) => {
        const cfg = TARGET_ACTION_LABELS[item.targetAction] || {
          label: item.targetAction,
          variant: "default" as BadgeVariant,
        };
        return <StatusBadge status={cfg.label} variant={cfg.variant} />;
      },
    },
    {
      key: "isActive",
      header: "Status",
      render: (item) => (
        <StatusBadge
          status={item.isActive ? "active" : "inactive"}
        />
      ),
    },
    {
      key: "lastReceivedAt",
      header: "Last Received",
      render: (item) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {item.lastReceivedAt
            ? new Date(item.lastReceivedAt).toLocaleDateString()
            : "Never"}
        </span>
      ),
    },
    {
      key: "stats",
      header: "Received / Errors",
      render: (item) => (
        <span className="text-sm">
          <span style={{ color: "var(--text-primary)" }}>
            {item.totalReceived}
          </span>
          {" / "}
          <span
            style={{
              color: item.totalErrors > 0 ? "var(--danger)" : "var(--text-muted)",
            }}
          >
            {item.totalErrors}
          </span>
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
            <div
              className="rounded-xl p-2.5"
              style={{ backgroundColor: "var(--primary-subtle)" }}
            >
              <Webhook className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Webhooks
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Configure inbound webhook endpoints for external integrations
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Plus className="h-4 w-4" />
            Create Webhook
          </button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative max-w-sm">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search webhooks..."
              className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm transition-colors"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyTitle="No webhook endpoints"
            emptyDescription="Create your first webhook endpoint to receive data from external systems."
            onRowClick={(item) =>
              router.push(`/dashboard/system/webhooks/${item.id}`)
            }
            pagination={
              meta
                ? {
                    currentPage: meta.page ?? page,
                    totalPages: meta.totalPages ?? 1,
                    totalItems: meta.totalItems,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        </motion.div>

        {/* Create Modal */}
        {showCreate && (
          <CreateWebhookModal
            onClose={() => setShowCreate(false)}
            onCreate={async (data) => {
              const result = await createMutation.mutateAsync(data);
              setShowCreate(false);
              if (result?.secret) {
                setCreatedSecret({ secret: result.secret, slug: result.slug });
              }
            }}
            isLoading={createMutation.isPending}
          />
        )}

        {/* Secret reveal modal (shown once after creation) */}
        {createdSecret && (
          <SecretRevealModal
            secret={createdSecret.secret}
            slug={createdSecret.slug}
            onClose={() => setCreatedSecret(null)}
          />
        )}

        {/* Delete confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (deleteTarget) {
              await deleteMutation.mutateAsync(deleteTarget.id);
              setDeleteTarget(null);
            }
          }}
          title="Delete Webhook"
          message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated logs will be permanently removed.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      </div>
    </PermissionGate>
  );
}

/* ================================================================== */
/*  Create Modal                                                       */
/* ================================================================== */

function CreateWebhookModal({
  onClose,
  onCreate,
  isLoading,
}: {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    slug: string;
    description?: string;
    targetAction: string;
    payloadTransform?: Record<string, unknown>;
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [targetAction, setTargetAction] = useState("log_only");
  const [transformJson, setTransformJson] = useState(
    '{\n  "mapping": {\n    "title": "$.alert.name",\n    "description": "$.alert.message",\n    "priority": "$.severity"\n  }\n}',
  );
  const [jsonError, setJsonError] = useState("");

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    let payloadTransform: Record<string, unknown> | undefined;
    if (transformJson.trim()) {
      try {
        payloadTransform = JSON.parse(transformJson);
        setJsonError("");
      } catch {
        setJsonError("Invalid JSON");
        return;
      }
    }

    await onCreate({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      targetAction,
      payloadTransform,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl border p-6 shadow-xl"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-primary)",
        }}
      >
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Create Webhook Endpoint
        </h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Alertmanager Receiver"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Slug *
            </label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="e.g. alertmanager-receiver"
              className="w-full rounded-xl border px-3 py-2 text-sm font-mono"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Endpoint URL: /api/v1/webhooks/custom/{slug || "..."}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Target Action */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Target Action *
            </label>
            <select
              value={targetAction}
              onChange={(e) => setTargetAction(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            >
              {TARGET_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payload Transform */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Payload Transform (JSON)
            </label>
            <textarea
              value={transformJson}
              onChange={(e) => {
                setTransformJson(e.target.value);
                setJsonError("");
              }}
              rows={5}
              className="w-full rounded-xl border px-3 py-2 font-mono text-xs"
              style={{
                borderColor: jsonError ? "var(--danger)" : "var(--border-primary)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            />
            {jsonError && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {jsonError}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--border-primary)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !slug.trim()}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {isLoading ? "Creating..." : "Create"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Secret Reveal Modal                                                */
/* ================================================================== */

function SecretRevealModal({
  secret,
  slug,
  onClose,
}: {
  secret: string;
  slug: string;
  onClose: () => void;
}) {
  const [show, setShow] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copied to clipboard");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-primary)",
        }}
      >
        <h2
          className="mb-2 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Webhook Created
        </h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Your webhook endpoint <span className="font-mono font-medium">{slug}</span> has been created.
          Copy the secret below — it will not be shown again in full.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              HMAC Secret
            </label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 rounded-lg border px-3 py-2 text-xs break-all"
                style={{
                  borderColor: "var(--border-primary)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              >
                {show ? secret : "••••••••••••••••••••••••••••••••"}
              </code>
              <button
                onClick={() => setShow(!show)}
                className="rounded-lg border p-2 transition-colors hover:opacity-80"
                style={{ borderColor: "var(--border-primary)" }}
                title={show ? "Hide" : "Reveal"}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                ) : (
                  <Eye className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                )}
              </button>
              <button
                onClick={copySecret}
                className="rounded-lg border p-2 transition-colors hover:opacity-80"
                style={{ borderColor: "var(--border-primary)" }}
                title="Copy"
              >
                <Copy className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
