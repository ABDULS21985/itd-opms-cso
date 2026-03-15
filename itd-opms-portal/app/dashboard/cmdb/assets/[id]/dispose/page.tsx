"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  CheckSquare,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { UserMultiPicker } from "@/components/shared/pickers";
import type { SelectedEntity } from "@/components/shared/entity-multi-select";
import { useAsset, useCreateDisposal } from "@/hooks/use-cmdb";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DISPOSAL_METHODS = [
  { value: "recycling", label: "Recycling" },
  { value: "donation", label: "Donation" },
  { value: "resale", label: "Resale" },
  { value: "destruction", label: "Physical Destruction" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AssetDisposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: asset, isLoading: assetLoading } = useAsset(id);
  const createDisposal = useCreateDisposal();

  /* ---- Form state ---- */
  const [disposalMethod, setDisposalMethod] = useState("");
  const [reason, setReason] = useState("");
  const [witnesses, setWitnesses] = useState<SelectedEntity[]>([]);
  const [dataWipeConfirmed, setDataWipeConfirmed] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Validation ---- */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!disposalMethod) newErrors.disposalMethod = "Disposal method is required";
    if (!reason.trim()) newErrors.reason = "Reason for disposal is required";
    if (!dataWipeConfirmed) newErrors.dataWipe = "Data wipe confirmation is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* ---- Submit ---- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createDisposal.mutate(
      {
        assetId: id,
        disposalMethod,
        reason: reason.trim(),
        witnessIds: witnesses.map((w) => w.id),
        dataWipeConfirmed,
      },
      {
        onSuccess: () => {
          router.push(`/dashboard/cmdb/assets/${id}`);
        },
      },
    );
  }

  /* ---- Loading ---- */
  if (assetLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--text-secondary)]">Asset not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push(`/dashboard/cmdb/assets/${id}`)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Asset
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          >
            <Trash2 size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Dispose Asset
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {asset.assetTag} - {asset.name}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex items-start gap-3 rounded-xl border p-4"
        style={{
          borderColor: "rgba(245, 158, 11, 0.4)",
          backgroundColor: "rgba(245, 158, 11, 0.05)",
        }}
      >
        <AlertTriangle size={20} style={{ color: "#F59E0B" }} className="mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Audit Requirements
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Asset disposal is subject to audit trail requirements. All disposal actions are
            permanently logged and cannot be reversed. Ensure that all data has been properly
            wiped and the disposal method complies with organizational policies. A disposal
            certificate will be required for complete processing.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        {/* Disposal Method */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Disposal Details
          </h2>
          <div className="space-y-4">
            <FormField
              label="Disposal Method"
              name="disposalMethod"
              type="select"
              value={disposalMethod}
              onChange={setDisposalMethod}
              options={DISPOSAL_METHODS}
              placeholder="Select disposal method"
              required
              error={errors.disposalMethod}
            />
            <FormField
              label="Reason for Disposal"
              name="reason"
              type="textarea"
              value={reason}
              onChange={setReason}
              placeholder="Describe why this asset is being disposed of..."
              rows={4}
              required
              error={errors.reason}
            />
          </div>
        </div>

        {/* Witnesses */}
        <div className="border-t border-[var(--border)] pt-6">
          <UserMultiPicker
            label="Witnesses"
            placeholder="Search for witnesses by name or email..."
            selected={witnesses}
            onChange={setWitnesses}
          />
        </div>

        {/* Evidence & Data Wipe */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Confirmation
          </h2>

          {/* Evidence note */}
          <div
            className="flex items-start gap-3 rounded-xl border p-4 mb-4"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-1)",
            }}
          >
            <ShieldAlert size={16} className="text-[var(--text-secondary)] mt-0.5 shrink-0" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Evidence documents (disposal certificates, data wipe reports) should be uploaded
              to the Evidence Vault and linked to this disposal record after creation. The
              disposal certificate document ID can be updated on the disposal record.
            </p>
          </div>

          {/* Data wipe checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={dataWipeConfirmed}
                onChange={(e) => setDataWipeConfirmed(e.target.checked)}
                className="sr-only"
              />
              <div
                className="h-5 w-5 rounded border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: dataWipeConfirmed ? "var(--primary)" : "var(--border)",
                  backgroundColor: dataWipeConfirmed ? "var(--primary)" : "transparent",
                }}
              >
                {dataWipeConfirmed && <CheckSquare size={14} className="text-white" />}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                I confirm that all data on this asset has been securely wiped
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                This is required for compliance with data protection policies
              </p>
            </div>
          </label>
          {errors.dataWipe && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: "#EF4444" }}>
              <AlertTriangle size={12} />
              {errors.dataWipe}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/cmdb/assets/${id}`)}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createDisposal.isPending}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#EF4444" }}
          >
            {createDisposal.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Submit Disposal Request
          </button>
        </div>
      </motion.form>
    </div>
  );
}
