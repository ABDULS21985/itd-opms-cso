"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateOKR } from "@/hooks/use-governance";

export default function CreateOKRPage() {
  const router = useRouter();
  const createMutation = useCreateOKR();

  const [objective, setObjective] = useState("");
  const [level, setLevel] = useState("");
  const [period, setPeriod] = useState("");
  const [parentId, setParentId] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [scoringMethod, setScoringMethod] = useState("percentage");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!objective.trim()) newErrors.objective = "Objective is required";
    if (!level) newErrors.level = "Level is required";
    if (!period.trim()) newErrors.period = "Period is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate(
      {
        objective: objective.trim(),
        level,
        period: period.trim(),
        parentId: parentId.trim() || undefined,
        scopeId: scopeId.trim() || undefined,
        scoringMethod,
      },
      {
        onSuccess: (data) => {
          router.push(`/dashboard/governance/okrs/${data.id}`);
        },
      },
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/dashboard/governance/okrs"
          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Create OKR
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Define a new objective with key results.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl rounded-xl border p-6 space-y-5"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <FormField
            label="Objective"
            name="objective"
            type="textarea"
            value={objective}
            onChange={setObjective}
            placeholder="e.g., Improve IT service delivery across the department"
            required
            error={errors.objective}
            rows={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Level"
              name="level"
              type="select"
              value={level}
              onChange={setLevel}
              required
              error={errors.level}
              options={[
                { value: "department", label: "Department" },
                { value: "division", label: "Division" },
                { value: "office", label: "Office" },
                { value: "unit", label: "Unit" },
              ]}
              placeholder="Select level..."
            />

            <FormField
              label="Period"
              name="period"
              value={period}
              onChange={setPeriod}
              placeholder="e.g., Q1-2026, FY2026"
              required
              error={errors.period}
            />
          </div>

          <FormField
            label="Parent OKR ID"
            name="parentId"
            value={parentId}
            onChange={setParentId}
            placeholder="Optional UUID of parent OKR"
            description="Link this OKR to a parent objective for cascading alignment."
          />

          <FormField
            label="Scope ID"
            name="scopeId"
            value={scopeId}
            onChange={setScopeId}
            placeholder="Optional UUID of organizational unit"
            description="The organizational unit (division, office, or unit) this OKR belongs to."
          />

          <FormField
            label="Scoring Method"
            name="scoringMethod"
            type="select"
            value={scoringMethod}
            onChange={setScoringMethod}
            options={[
              { value: "percentage", label: "Percentage (0-100%)" },
              { value: "rag", label: "RAG (Red / Amber / Green)" },
              { value: "numeric", label: "Numeric" },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard/governance/okrs"
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {createMutation.isPending ? "Creating..." : "Create OKR"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
