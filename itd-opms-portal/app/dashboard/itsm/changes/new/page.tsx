"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateChange } from "@/hooks/use-itsm";
import {
  CHANGE_CLASSIFICATIONS,
  CHANGE_TYPES,
  RISK_LEVELS,
} from "@/types/itsm";

const URGENCY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const IMPACT_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STEPS = [
  { id: "type", label: "Type Selection" },
  { id: "details", label: "Details" },
  { id: "risk", label: "Risk Assessment" },
  { id: "backout", label: "Backout Plan" },
  { id: "implementation", label: "Implementation" },
  { id: "schedule", label: "Schedule & Review" },
];

export default function NewChangePage() {
  const router = useRouter();
  const createChange = useCreateChange();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    classification: "",
    title: "",
    description: "",
    changeType: "",
    urgency: "medium",
    impact: "medium",
    riskLevel: "medium",
    riskImpactDescription: "",
    riskMitigation: "",
    implementationPlan: "",
    rollbackPlan: "",
    testPlan: "",
    scheduledStart: "",
    scheduledEnd: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canNext = () => {
    if (step === 0) return !!form.classification;
    if (step === 1) return !!form.title && !!form.description && !!form.changeType && !!form.urgency && !!form.impact;
    if (step === 2) return !!form.riskLevel;
    if (step === 3) return true; // backout plan optional
    if (step === 4) return true; // implementation plan optional
    return true; // schedule + review
  };

  const handleSubmit = async () => {
    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      classification: form.classification,
      changeType: form.changeType,
      urgency: form.urgency,
      impact: form.impact,
      riskLevel: form.riskLevel,
    };

    if (form.riskImpactDescription || form.riskMitigation) {
      body.riskAssessment = {
        impactDescription: form.riskImpactDescription,
        mitigation: form.riskMitigation,
      };
    }
    if (form.implementationPlan) body.implementationPlan = form.implementationPlan;
    if (form.rollbackPlan) body.rollbackPlan = form.rollbackPlan;
    if (form.testPlan) body.testPlan = form.testPlan;
    if (form.scheduledStart) body.scheduledStart = form.scheduledStart + "T00:00:00Z";
    if (form.scheduledEnd) body.scheduledEnd = form.scheduledEnd + "T00:00:00Z";

    try {
      const result = await createChange.mutateAsync(body);
      router.push(`/dashboard/itsm/changes/${(result as { id: string }).id}`);
    } catch {
      // Error handled by hook
    }
  };

  const classificationMeta: Record<string, { icon: typeof Zap; accent: string; desc: string }> = {
    emergency: {
      icon: Zap,
      accent: "#DC2626",
      desc: "Urgent fix that bypasses standard approval. Auto-approved but requires PIR.",
    },
    standard: {
      icon: CheckCircle2,
      accent: "#2563EB",
      desc: "Pre-approved for low-risk changes. Follows a simplified approval path.",
    },
    normal: {
      icon: GitBranch,
      accent: "#7C3AED",
      desc: "Full CAB review required. Includes risk assessment and implementation planning.",
    },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/itsm/changes")}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Changes
        </button>
        <h1 className="text-2xl font-bold text-white">New Change Request</h1>
        <p className="text-sm text-white/50 mt-1">Create a new change ticket</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= step ? "bg-violet-600 text-white" : "bg-white/5 text-white/30"
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
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Select Classification</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CHANGE_CLASSIFICATIONS.map((cls) => {
                  const meta = classificationMeta[cls.value];
                  const Icon = meta.icon;
                  const selected = form.classification === cls.value;
                  return (
                    <button
                      key={cls.value}
                      onClick={() => updateField("classification", cls.value)}
                      className={`p-5 rounded-xl border text-left transition-all ${
                        selected ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${meta.accent}18` }}
                      >
                        <Icon size={20} style={{ color: meta.accent }} />
                      </div>
                      <div className="font-semibold text-white">{cls.label}</div>
                      <p className="text-xs text-white/50 mt-1">{meta.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Change Details</h2>
              <FormField name="title" label="Title" required value={form.title} onChange={(v) => updateField("title", v)} />
              <FormField
                name="description"
                label="Description"
                required
                type="textarea"
                value={form.description}
                onChange={(v) => updateField("description", v)}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  name="changeType"
                  label="Change Type"
                  required
                  type="select"
                  value={form.changeType}
                  onChange={(v) => updateField("changeType", v)}
                  options={[{ value: "", label: "Select type" }, ...CHANGE_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
                />
                <FormField
                  name="urgency"
                  label="Urgency"
                  required
                  type="select"
                  value={form.urgency}
                  onChange={(v) => updateField("urgency", v)}
                  options={URGENCY_OPTIONS}
                />
                <FormField
                  name="impact"
                  label="Impact"
                  required
                  type="select"
                  value={form.impact}
                  onChange={(v) => updateField("impact", v)}
                  options={IMPACT_OPTIONS}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Risk Assessment</h2>
              <p className="text-sm text-white/50">Evaluate the risk profile for this change.</p>
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
                name="riskImpactDescription"
                label="Impact Description"
                type="textarea"
                value={form.riskImpactDescription}
                onChange={(v) => updateField("riskImpactDescription", v)}
                placeholder="Describe the potential impact if this change fails..."
                rows={3}
              />
              <FormField
                name="riskMitigation"
                label="Mitigation Strategy"
                type="textarea"
                value={form.riskMitigation}
                onChange={(v) => updateField("riskMitigation", v)}
                placeholder="How will the risks be mitigated..."
                rows={3}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Backout Plan</h2>
              <p className="text-sm text-white/50">Define the steps to revert this change if it needs to be rolled back.</p>
              <FormField
                name="rollbackPlan"
                label="Rollback / Backout Plan"
                type="textarea"
                value={form.rollbackPlan}
                onChange={(v) => updateField("rollbackPlan", v)}
                placeholder="Step-by-step plan for rolling back this change..."
                rows={6}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Implementation Plan</h2>
              <p className="text-sm text-white/50">Detail how this change will be implemented and tested.</p>
              <FormField
                name="implementationPlan"
                label="Implementation Plan"
                type="textarea"
                value={form.implementationPlan}
                onChange={(v) => updateField("implementationPlan", v)}
                placeholder="Describe the steps to implement this change..."
                rows={5}
              />
              <FormField
                name="testPlan"
                label="Test Plan"
                type="textarea"
                value={form.testPlan}
                onChange={(v) => updateField("testPlan", v)}
                placeholder="Describe how the change will be tested post-implementation..."
                rows={4}
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Schedule</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="scheduledStart"
                    label="Scheduled Start"
                    type="date"
                    value={form.scheduledStart}
                    onChange={(v) => updateField("scheduledStart", v)}
                  />
                  <FormField
                    name="scheduledEnd"
                    label="Scheduled End"
                    type="date"
                    value={form.scheduledEnd}
                    onChange={(v) => updateField("scheduledEnd", v)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Review Summary</h2>
                <div className="rounded-xl border border-white/10 p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/40">Classification</span>
                      <p className="text-white font-medium capitalize">{form.classification}</p>
                    </div>
                    <div>
                      <span className="text-white/40">Change Type</span>
                      <p className="text-white font-medium capitalize">{form.changeType}</p>
                    </div>
                    <div>
                      <span className="text-white/40">Urgency</span>
                      <p className="text-white font-medium capitalize">{form.urgency}</p>
                    </div>
                    <div>
                      <span className="text-white/40">Impact</span>
                      <p className="text-white font-medium capitalize">{form.impact}</p>
                    </div>
                    <div>
                      <span className="text-white/40">Risk Level</span>
                      <p className="text-white font-medium capitalize">{form.riskLevel}</p>
                    </div>
                    {form.scheduledStart && (
                      <div>
                        <span className="text-white/40">Schedule</span>
                        <p className="text-white font-medium">{form.scheduledStart} &rarr; {form.scheduledEnd || "TBD"}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-white/40 text-sm">Title</span>
                    <p className="text-white font-medium">{form.title}</p>
                  </div>
                  <div>
                    <span className="text-white/40 text-sm">Description</span>
                    <p className="text-white/70 text-sm">{form.description}</p>
                  </div>
                  {form.rollbackPlan && (
                    <div>
                      <span className="text-white/40 text-sm">Backout Plan</span>
                      <p className="text-white/70 text-sm whitespace-pre-wrap">{form.rollbackPlan}</p>
                    </div>
                  )}
                  {form.implementationPlan && (
                    <div>
                      <span className="text-white/40 text-sm">Implementation Plan</span>
                      <p className="text-white/70 text-sm whitespace-pre-wrap">{form.implementationPlan}</p>
                    </div>
                  )}
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
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createChange.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            {createChange.isPending ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Submit Change
          </button>
        )}
      </div>
    </div>
  );
}
