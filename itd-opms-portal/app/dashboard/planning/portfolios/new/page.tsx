"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreatePortfolio } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewPortfolioPage() {
  const router = useRouter();
  const createPortfolio = useCreatePortfolio();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fiscalYear, setFiscalYear] = useState(
    String(new Date().getFullYear()),
  );
  const [ownerId, setOwnerId] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Portfolio name is required";
    if (!fiscalYear || isNaN(Number(fiscalYear)))
      newErrors.fiscalYear = "Valid fiscal year is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createPortfolio.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        fiscalYear: Number(fiscalYear),
        ownerId: ownerId.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/portfolios");
        },
      },
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
          onClick={() => router.push("/dashboard/planning/portfolios")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Portfolios
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create New Portfolio
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Define a new project portfolio for a fiscal year.
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        {/* Name */}
        <FormField
          label="Portfolio Name"
          name="name"
          value={name}
          onChange={setName}
          placeholder="e.g. FY2026 IT Infrastructure Portfolio"
          required
          error={errors.name}
        />

        {/* Description */}
        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={description}
          onChange={setDescription}
          placeholder="Brief description of the portfolio objectives and scope"
          rows={3}
        />

        {/* Fiscal Year */}
        <FormField
          label="Fiscal Year"
          name="fiscalYear"
          type="number"
          value={fiscalYear}
          onChange={setFiscalYear}
          placeholder="e.g. 2026"
          required
          error={errors.fiscalYear}
          description="The financial year this portfolio covers"
        />

        {/* Owner */}
        <FormField
          label="Owner ID"
          name="ownerId"
          value={ownerId}
          onChange={setOwnerId}
          placeholder="User UUID of the portfolio owner"
          description="The person accountable for this portfolio"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/portfolios")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPortfolio.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createPortfolio.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Portfolio
          </button>
        </div>
      </motion.form>
    </div>
  );
}
