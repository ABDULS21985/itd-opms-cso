"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Rocket,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateRelease } from "@/hooks/use-release";
import {
  RELEASE_TYPES,
  RELEASE_ENVIRONMENTS,
  RELEASE_ITEM_TYPES,
  RISK_LEVELS,
} from "@/types/release";

/* ------------------------------------------------------------------ */
/*  Step definitions                                                    */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: "type", label: "Type & Details" },
  { id: "items", label: "Release Items" },
  { id: "deployment", label: "Deployment Plan" },
  { id: "risk", label: "Risk Assessment" },
  { id: "schedule", label: "Schedule & Team" },
];

const TYPE_META: Record<string, { icon: LucideIcon; accent: string; desc: string }> = {
  major: {
    icon: Rocket,
    accent: "#7C3AED",
    desc: "Significant new features or breaking changes. Full testing and CAB review required.",
  },
  minor: {
    icon: Package,
    accent: "#2563EB",
    desc: "Incremental improvements and non-breaking enhancements.",
  },
  patch: {
    icon: CheckCircle2,
    accent: "#16A34A",
    desc: "Bug fixes and minor corrections. Streamlined approval path.",
  },
  emergency: {
    icon: Zap,
    accent: "#DC2626",
    desc: "Critical hotfix requiring expedited deployment. Bypasses standard approval.",
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

interface ItemRow {
  title: string;
  itemType: string;
  notes: string;
}

export default function NewReleasePage() {
  const router = useRouter();
  const createRelease = useCreateRelease();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    releaseType: "",
    title: "",
    description: "",
    deploymentPlan: "",
    rollbackPlan: "",
    riskLevel: "medium",
    riskNotes: "",
    plannedStart: "",
    plannedEnd: "",
    environment: "production",
    releaseManager: "",
  });

  const [items, setItems] = useState<ItemRow[]>([]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { title: "", itemType: "software", notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const canNext = () => {
    if (step === 0) return !!form.releaseType && !!form.title && !!form.description;
    if (step === 1) return true; // items are optional
    if (step === 2) return !!form.deploymentPlan;
    if (step === 3) return !!form.riskLevel;
    return true;
  };

  const handleSubmit = async () => {
    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      releaseType: form.releaseType,
      environment: form.environment,
      deploymentPlan: form.deploymentPlan,
      riskLevel: form.riskLevel,
    };

    if (form.rollbackPlan) body.rollbackPlan = form.rollbackPlan;
    if (form.riskNotes) body.riskNotes = form.riskNotes;
    if (form.plannedStart) body.plannedStartDate = form.plannedStart + "T00:00:00Z";
    if (form.plannedEnd) body.plannedEndDate = form.plannedEnd + "T00:00:00Z";
    if (form.releaseManager) body.releaseManager = form.releaseManager;
    if (items.length > 0) body.items = items.filter((i) => i.title);

    try {
      const result = await createRelease.mutateAsync(body);
      router.push(`/dashboard/releases/${(result as { id: string }).id}`);
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/releases/list")}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Releases
        </button>
        <h1 className="text-2xl font-bold text-white">New Release</h1>
        <p className="text-sm text-white/50 mt-1">Create a new release package</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= step ? "bg-indigo-600 text-white" : "bg-white/5 text-white/30"
              }`}
            >
              {i < step ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span className={`text-xs ${i <= step ? "text-white" : "text-white/30"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Step 0: Type & Details */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Select Release Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RELEASE_TYPES.map((rt) => {
                  const meta = TYPE_META[rt.value];
                  const Icon = meta.icon;
                  const selected = form.releaseType === rt.value;
                  return (
                    <button
                      key={rt.value}
                      onClick={() => updateField("releaseType", rt.value)}
                      className={`p-5 rounded-xl border text-left transition-all ${
                        selected ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${meta.accent}18` }}
                      >
                        <Icon size={20} style={{ color: meta.accent }} />
                      </div>
                      <div className="font-semibold text-white">{rt.label}</div>
                      <p className="text-xs text-white/50 mt-1">{meta.desc}</p>
                    </button>
                  );
                })}
              </div>
              <FormField name="title" label="Title" required value={form.title} onChange={(v) => updateField("title", v)} placeholder="e.g., v2.4.0 — Dashboard Upgrade" />
              <FormField name="description" label="Description" required type="textarea" value={form.description} onChange={(v) => updateField("description", v)} placeholder="Describe what this release includes..." />
            </div>
          )}

          {/* Step 1: Release Items */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Release Items</h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-white/10 text-white/30">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No items added yet</p>
                  <button
                    onClick={addItem}
                    className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    + Add your first item
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40 uppercase tracking-wider">Item {i + 1}</span>
                        <button onClick={() => removeItem(i)} className="text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          name={`item-title-${i}`}
                          label="Title"
                          value={item.title}
                          onChange={(v) => updateItem(i, "title", v)}
                          placeholder="Item name"
                        />
                        <FormField
                          name={`item-type-${i}`}
                          label="Type"
                          type="select"
                          value={item.itemType}
                          onChange={(v) => updateItem(i, "itemType", v)}
                          options={RELEASE_ITEM_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                        />
                      </div>
                      <FormField
                        name={`item-notes-${i}`}
                        label="Notes"
                        value={item.notes}
                        onChange={(v) => updateItem(i, "notes", v)}
                        placeholder="Optional notes"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Deployment Plan */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Deployment Plan</h2>
              <FormField
                name="deploymentPlan"
                label="Deployment Steps"
                required
                type="textarea"
                value={form.deploymentPlan}
                onChange={(v) => updateField("deploymentPlan", v)}
                placeholder="1. Backup current state&#10;2. Deploy database migrations&#10;3. Deploy application services&#10;4. Run smoke tests&#10;5. Enable traffic..."
                rows={8}
              />
              <FormField
                name="rollbackPlan"
                label="Rollback Plan"
                type="textarea"
                value={form.rollbackPlan}
                onChange={(v) => updateField("rollbackPlan", v)}
                placeholder="Steps to revert if deployment fails..."
                rows={6}
              />
            </div>
          )}

          {/* Step 3: Risk Assessment */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Risk Assessment</h2>
              <FormField
                name="riskLevel"
                label="Risk Level"
                required
                type="select"
                value={form.riskLevel}
                onChange={(v) => updateField("riskLevel", v)}
                options={RISK_LEVELS.map((r) => ({ value: r.value, label: r.label }))}
              />
              <FormField
                name="riskNotes"
                label="Risk Notes"
                type="textarea"
                value={form.riskNotes}
                onChange={(v) => updateField("riskNotes", v)}
                placeholder="Describe potential risks, mitigation strategies, and impact assessment..."
                rows={6}
              />
            </div>
          )}

          {/* Step 4: Schedule & Team */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Schedule & Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="plannedStart"
                  label="Planned Start"
                  type="date"
                  value={form.plannedStart}
                  onChange={(v) => updateField("plannedStart", v)}
                />
                <FormField
                  name="plannedEnd"
                  label="Planned End"
                  type="date"
                  value={form.plannedEnd}
                  onChange={(v) => updateField("plannedEnd", v)}
                />
              </div>
              <FormField
                name="environment"
                label="Target Environment"
                required
                type="select"
                value={form.environment}
                onChange={(v) => updateField("environment", v)}
                options={RELEASE_ENVIRONMENTS.map((e) => ({ value: e.value, label: e.label }))}
              />
              <FormField
                name="releaseManager"
                label="Release Manager"
                value={form.releaseManager}
                onChange={(v) => updateField("releaseManager", v)}
                placeholder="Name of the release manager"
              />

              {/* Review summary */}
              <div className="rounded-xl border border-white/10 p-6 space-y-4 mt-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Review Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/40">Type</span>
                    <p className="text-white font-medium capitalize">{form.releaseType}</p>
                  </div>
                  <div>
                    <span className="text-white/40">Environment</span>
                    <p className="text-white font-medium capitalize">{form.environment}</p>
                  </div>
                  <div>
                    <span className="text-white/40">Risk Level</span>
                    <p className="text-white font-medium capitalize">{form.riskLevel}</p>
                  </div>
                  <div>
                    <span className="text-white/40">Items</span>
                    <p className="text-white font-medium">{items.filter((i) => i.title).length} item(s)</p>
                  </div>
                  {form.plannedStart && (
                    <div>
                      <span className="text-white/40">Schedule</span>
                      <p className="text-white font-medium">{form.plannedStart} &rarr; {form.plannedEnd || "TBD"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-white/40 text-sm">Title</span>
                  <p className="text-white font-medium">{form.title}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 disabled:opacity-30 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #4F46E5, #4338CA)" }}
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createRelease.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4F46E5, #4338CA)" }}
          >
            {createRelease.isPending ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
            Create Release
          </button>
        )}
      </div>
    </div>
  );
}
