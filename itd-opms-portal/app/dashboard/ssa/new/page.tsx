"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Loader2,
  Save,
  User,
  Cpu,
  Shield,
  FileText,
  ClipboardCheck,
  HardDrive,
  MemoryStick,
  Network,
  Info,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateSSARequest, useCreateServiceImpact } from "@/hooks/use-ssa";
import { useAuth } from "@/providers/auth-provider";
import type { SSARequest, ServiceImpact } from "@/types/ssa";
import {
  OPERATING_SYSTEMS,
  SERVER_TYPES,
  VLAN_ZONES,
  REQUESTOR_STATUSES,
  RISK_CATEGORIES,
  SEVERITY_LEVELS,
} from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ImpactEntry {
  id: string;
  riskCategory: string;
  severity: string;
  riskDescription: string;
  mitigationMeasures: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "Requestor", description: "Your information", icon: User },
  { label: "Technical", description: "Server specifications", icon: Cpu },
  { label: "Impact", description: "Service impact analysis", icon: Shield },
  { label: "Justification", description: "Business justification", icon: FileText },
  { label: "Review", description: "Review & submit", icon: ClipboardCheck },
];

/* ------------------------------------------------------------------ */
/*  Slide animation variants                                           */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewSSARequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createSSARequest = useCreateSSARequest();
  const createServiceImpact = useCreateServiceImpact(undefined);

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  /* ---- Step 0: Requestor Information ---- */
  const [requestorName] = useState(user?.displayName || "");
  const [requestorEmail] = useState(user?.email || "");
  const [requestorStaffId] = useState("");
  const [divisionOffice, setDivisionOffice] = useState(
    user?.department || user?.office || "",
  );
  const [requestorStatus, setRequestorStatus] = useState("");
  const [extension, setExtension] = useState("");

  /* ---- Step 1: Technical Specifications ---- */
  const [appName, setAppName] = useState("");
  const [dbName, setDbName] = useState("");
  const [operatingSystem, setOperatingSystem] = useState("");
  const [serverType, setServerType] = useState<string[]>([]);
  const [vcpuCount, setVcpuCount] = useState("4");
  const [memoryGb, setMemoryGb] = useState("8");
  const [diskCount, setDiskCount] = useState("");
  const [spaceGb, setSpaceGb] = useState("100");
  const [vlanZone, setVlanZone] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");

  /* ---- Step 2: Service Impact Analysis ---- */
  const [impacts, setImpacts] = useState<ImpactEntry[]>([]);

  /* ---- Step 3: Justification ---- */
  const [justification, setJustification] = useState("");
  const [presentSpaceAllocatedGb, setPresentSpaceAllocatedGb] = useState("0");
  const [presentSpaceInUseGb, setPresentSpaceInUseGb] = useState("0");

  /* ---- Errors ---- */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Checkbox handler for server types ---- */
  const toggleServerType = useCallback((value: string) => {
    setServerType((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }, []);

  /* ---- Impact entry management ---- */
  const addImpact = useCallback(() => {
    setImpacts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        riskCategory: "",
        severity: "",
        riskDescription: "",
        mitigationMeasures: "",
      },
    ]);
  }, []);

  const removeImpact = useCallback((id: string) => {
    setImpacts((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const updateImpact = useCallback(
    (id: string, field: keyof ImpactEntry, value: string) => {
      setImpacts((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry,
        ),
      );
    },
    [],
  );

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};

      if (s === 0) {
        if (!divisionOffice.trim())
          newErrors.divisionOffice = "Division/Office is required";
        if (!requestorStatus)
          newErrors.requestorStatus = "Status is required";
      }

      if (s === 1) {
        if (!appName.trim())
          newErrors.appName = "Application name is required";
        if (!dbName.trim()) newErrors.dbName = "Database name is required";
        if (!operatingSystem)
          newErrors.operatingSystem = "Operating system is required";
        if (serverType.length === 0)
          newErrors.serverType = "At least one server type is required";
        const cpuNum = parseInt(vcpuCount, 10);
        if (isNaN(cpuNum) || cpuNum < 1 || cpuNum > 256)
          newErrors.vcpuCount = "CPUs must be between 1 and 256";
        const memNum = parseInt(memoryGb, 10);
        if (isNaN(memNum) || memNum < 1 || memNum > 2048)
          newErrors.memoryGb = "Memory must be between 1 and 2,048 GB";
        const spaceNum = parseInt(spaceGb, 10);
        if (isNaN(spaceNum) || spaceNum < 10 || spaceNum > 100000)
          newErrors.spaceGb = "Space must be between 10 and 100,000 GB";
        if (!vlanZone) newErrors.vlanZone = "VLAN zone is required";
      }

      if (s === 2) {
        if (impacts.length === 0)
          newErrors.impacts =
            "At least one service impact entry is required";
        impacts.forEach((entry, i) => {
          if (!entry.riskCategory)
            newErrors[`impact_${i}_riskCategory`] =
              "Risk category is required";
          if (!entry.severity)
            newErrors[`impact_${i}_severity`] = "Severity is required";
          if (entry.riskDescription.trim().length < 50)
            newErrors[`impact_${i}_riskDescription`] =
              "Risk description must be at least 50 characters";
          if (entry.mitigationMeasures.trim().length < 50)
            newErrors[`impact_${i}_mitigationMeasures`] =
              "Mitigation measures must be at least 50 characters";
        });
      }

      if (s === 3) {
        if (justification.trim().length < 100)
          newErrors.justification =
            "Business justification must be at least 100 characters";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [
      divisionOffice,
      requestorStatus,
      appName,
      dbName,
      operatingSystem,
      serverType,
      vcpuCount,
      memoryGb,
      spaceGb,
      vlanZone,
      impacts,
      justification,
    ],
  );

  /* ---- Navigation ---- */
  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, validateStep]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (target > step) {
        if (!validateStep(step)) return;
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  /* ---- Build request body ---- */
  function buildRequestBody(): Partial<SSARequest> {
    return {
      requestorName: requestorName || user?.displayName || "",
      requestorEmail: requestorEmail || user?.email || "",
      requestorStaffId: requestorStaffId || "",
      requestorStatus,
      divisionOffice: divisionOffice.trim(),
      extension: extension.trim() || undefined,
      appName: appName.trim(),
      dbName: dbName.trim(),
      operatingSystem,
      serverType: serverType.join(","),
      vcpuCount: parseInt(vcpuCount, 10),
      memoryGb: parseInt(memoryGb, 10),
      diskCount: diskCount ? parseInt(diskCount, 10) : undefined,
      spaceGb: parseInt(spaceGb, 10),
      vlanZone,
      specialRequirements: specialRequirements.trim() || undefined,
      justification: justification.trim(),
      presentSpaceAllocatedGb: parseInt(presentSpaceAllocatedGb, 10) || 0,
      presentSpaceInUseGb: parseInt(presentSpaceInUseGb, 10) || 0,
    };
  }

  /* ---- Save as Draft ---- */
  function handleSaveAsDraft() {
    const body = buildRequestBody();
    createSSARequest.mutate(body, {
      onSuccess: (request) => {
        router.push(`/dashboard/ssa/${request.id}`);
      },
    });
  }

  /* ---- Submit Request ---- */
  async function handleSubmit() {
    for (let s = 0; s < STEPS.length - 1; s++) {
      if (!validateStep(s)) {
        setDirection(s < step ? -1 : 1);
        setStep(s);
        return;
      }
    }

    setSubmitting(true);

    try {
      const body = buildRequestBody();
      const request = await new Promise<SSARequest>((resolve, reject) => {
        createSSARequest.mutate(body, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      const { apiClient } = await import("@/lib/api-client");
      for (let i = 0; i < impacts.length; i++) {
        const entry = impacts[i];
        await apiClient.post<ServiceImpact>(
          `/ssa/requests/${request.id}/impacts`,
          {
            riskCategory: entry.riskCategory,
            severity: entry.severity,
            riskDescription: entry.riskDescription.trim(),
            mitigationMeasures: entry.mitigationMeasures.trim(),
            sequenceOrder: i + 1,
          },
        );
      }

      await apiClient.post<SSARequest>(
        `/ssa/requests/${request.id}/submit`,
      );

      router.push(`/dashboard/ssa/${request.id}`);
    } catch {
      // Errors are handled by mutation callbacks (toast)
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- Helpers ---- */
  const findLabel = (
    opts: { value: string; label: string }[],
    val: string,
  ) => opts.find((o) => o.value === val)?.label || "\u2014";

  const isLastStep = step === STEPS.length - 1;

  /* ---- Step completeness indicators ---- */
  const stepComplete = [
    !!(divisionOffice.trim() && requestorStatus),
    !!(
      appName.trim() &&
      dbName.trim() &&
      operatingSystem &&
      serverType.length > 0 &&
      vlanZone
    ),
    impacts.length > 0 &&
      impacts.every(
        (e) =>
          e.riskCategory &&
          e.severity &&
          e.riskDescription.trim().length >= 50 &&
          e.mitigationMeasures.trim().length >= 50,
      ),
    justification.trim().length >= 100,
    false,
  ];

  const isPending = createSSARequest.isPending || submitting;

  /* ---- Progress percentage ---- */
  const completedSteps = stepComplete.filter(Boolean).length;
  const progressPct = Math.round((completedSteps / (STEPS.length - 1)) * 100);

  return (
    <div className="pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/ssa")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Requests
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Server size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                New SSA Request
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Server / Storage Allocation Request
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5">
            <div className="relative h-10 w-10">
              <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke="var(--primary)" strokeWidth="2.5"
                  strokeDasharray={`${progressPct} 100`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                {progressPct}%
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{completedSteps} of {STEPS.length - 1} sections</p>
              <p className="text-xs text-[var(--text-secondary)]">completed</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two-panel layout */}
      <div className="flex gap-6 items-start">
        {/* ── Left sidebar: Vertical stepper ── */}
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="hidden lg:block w-64 shrink-0 sticky top-6"
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <nav className="space-y-1">
              {STEPS.map((s, i) => {
                const isActive = i === step;
                const isDone = i < step || stepComplete[i];
                const isClickable = i <= step || stepComplete[step];
                const Icon = s.icon;

                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => isClickable && goTo(i)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                      isActive
                        ? "bg-[var(--primary)]/10 shadow-sm"
                        : isClickable
                          ? "hover:bg-[var(--surface-1)]"
                          : "opacity-50 cursor-default"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                          : isDone
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                      }`}
                    >
                      {isDone && !isActive ? (
                        <Check size={16} strokeWidth={2.5} />
                      ) : (
                        <Icon size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${
                        isActive ? "text-[var(--primary)]" : isDone ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                      }`}>
                        {s.label}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {s.description}
                      </p>
                    </div>
                    {isDone && !isActive && (
                      <div className="ml-auto shrink-0">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Helpful tip */}
            <div className="mt-4 rounded-xl bg-[var(--surface-1)] p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-[var(--text-secondary)] mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {step === 0 && "Your name and email are auto-populated from your profile."}
                  {step === 1 && "Specify the resources needed. You can select multiple server types."}
                  {step === 2 && "Add at least one risk entry with category, severity, and mitigation plan."}
                  {step === 3 && "Provide a detailed justification (min. 100 characters) for the request."}
                  {step === 4 && "Click any section to go back and edit before submitting."}
                </p>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* ── Main content ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 min-w-0"
        >
          {/* Mobile stepper */}
          <div className="lg:hidden mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              {STEPS.map((s, i) => {
                const isActive = i === step;
                const isDone = i < step || stepComplete[i];
                return (
                  <div key={s.label} className="flex items-center flex-1 last:flex-none">
                    <button
                      type="button"
                      onClick={() => (i <= step || stepComplete[step]) && goTo(i)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[var(--primary)] text-white shadow-md"
                          : isDone
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                      }`}
                    >
                      {isDone && !isActive ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 mx-1.5">
                        <div className="h-0.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                          <motion.div
                            className="h-full bg-[var(--primary)]"
                            initial={false}
                            animate={{ width: i < step ? "100%" : "0%" }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-[var(--text-secondary)] mt-2">
              Step {step + 1}: {STEPS[step].description}
            </p>
          </div>

          {/* Step content card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            {/* Step header bar */}
            <div className="border-b border-[var(--border)] bg-[var(--surface-1)]/50 px-6 py-4">
              <div className="flex items-center gap-3">
                {(() => { const Icon = STEPS[step].icon; return (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Icon size={16} />
                  </div>
                ); })()}
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {STEPS[step].label}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {STEPS[step].description}
                  </p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step
                          ? "w-6 bg-[var(--primary)]"
                          : i < step
                            ? "w-1.5 bg-[var(--primary)]/40"
                            : "w-1.5 bg-[var(--border)]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Step body */}
            <div className="p-6 min-h-[400px] relative overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {/* ============================================= */}
                  {/* Step 0: Requestor Information                  */}
                  {/* ============================================= */}
                  {step === 0 && (
                    <div className="space-y-6">
                      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 px-4 py-3 flex items-start gap-3">
                        <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Your name, email, and staff ID are auto-populated from your profile and cannot be changed here.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                          <User size={14} className="text-[var(--text-secondary)]" />
                          Personal Details
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <FormField
                            label="Full Name"
                            name="requestorName"
                            value={requestorName || user?.displayName || ""}
                            onChange={() => {}}
                            disabled
                          />
                          <FormField
                            label="Email Address"
                            name="requestorEmail"
                            type="email"
                            value={requestorEmail || user?.email || ""}
                            onChange={() => {}}
                            disabled
                          />
                          <FormField
                            label="Staff ID"
                            name="requestorStaffId"
                            value={requestorStaffId}
                            onChange={() => {}}
                            disabled
                            placeholder="Auto-populated"
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                          <Network size={14} className="text-[var(--text-secondary)]" />
                          Organization Details
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <FormField
                            label="Division/Office"
                            name="divisionOffice"
                            value={divisionOffice}
                            onChange={setDivisionOffice}
                            placeholder="e.g. Information Technology Division"
                            required
                            error={errors.divisionOffice}
                          />
                          <FormField
                            label="Status"
                            name="requestorStatus"
                            type="select"
                            value={requestorStatus}
                            onChange={setRequestorStatus}
                            options={REQUESTOR_STATUSES}
                            placeholder="Select status"
                            required
                            error={errors.requestorStatus}
                          />
                          <FormField
                            label="Extension"
                            name="extension"
                            value={extension}
                            onChange={setExtension}
                            placeholder="e.g. 4521"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ============================================= */}
                  {/* Step 1: Technical Specifications               */}
                  {/* ============================================= */}
                  {step === 1 && (
                    <div className="space-y-6">
                      {/* Application & Database */}
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                          <Server size={14} className="text-[var(--text-secondary)]" />
                          Application Details
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            label="Application Name"
                            name="appName"
                            value={appName}
                            onChange={setAppName}
                            placeholder="e.g. Enterprise Resource Planner"
                            required
                            error={errors.appName}
                          />
                          <FormField
                            label="Database Name"
                            name="dbName"
                            value={dbName}
                            onChange={setDbName}
                            placeholder="e.g. erp_production"
                            required
                            error={errors.dbName}
                          />
                        </div>
                      </div>

                      {/* Operating System & VLAN */}
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                          <Network size={14} className="text-[var(--text-secondary)]" />
                          Environment
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            label="Operating System"
                            name="operatingSystem"
                            type="select"
                            value={operatingSystem}
                            onChange={setOperatingSystem}
                            options={OPERATING_SYSTEMS}
                            placeholder="Select OS"
                            required
                            error={errors.operatingSystem}
                          />
                          <FormField
                            label="VLAN Zone"
                            name="vlanZone"
                            type="select"
                            value={vlanZone}
                            onChange={setVlanZone}
                            options={VLAN_ZONES}
                            placeholder="Select VLAN zone"
                            required
                            error={errors.vlanZone}
                          />
                        </div>
                      </div>

                      {/* Server Type -- checkboxes */}
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                          <HardDrive size={14} className="text-[var(--text-secondary)]" />
                          Server Type
                          <span className="text-[var(--error)] ml-0.5">*</span>
                        </h3>
                        {errors.serverType && (
                          <p className="text-xs text-[var(--error)] mb-2 font-medium">
                            {errors.serverType}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-2">
                          {SERVER_TYPES.map((st) => {
                            const isSelected = serverType.includes(st.value);
                            return (
                              <button
                                key={st.value}
                                type="button"
                                onClick={() => toggleServerType(st.value)}
                                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                                  isSelected
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm shadow-[var(--primary)]/10"
                                    : "border-[var(--border)] bg-[var(--surface-1)]/50 text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]"
                                }`}
                              >
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                                    isSelected
                                      ? "border-[var(--primary)] bg-[var(--primary)]"
                                      : "border-[var(--border)]"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check
                                      size={12}
                                      strokeWidth={3}
                                      className="text-white"
                                    />
                                  )}
                                </div>
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resource Allocation */}
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                          <MemoryStick size={14} className="text-[var(--text-secondary)]" />
                          Resource Allocation
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <FormField
                            label="No. of CPUs"
                            name="vcpuCount"
                            type="number"
                            value={vcpuCount}
                            onChange={setVcpuCount}
                            placeholder="4"
                            required
                            error={errors.vcpuCount}
                          />
                          <FormField
                            label="Memory (GB)"
                            name="memoryGb"
                            type="number"
                            value={memoryGb}
                            onChange={setMemoryGb}
                            placeholder="8"
                            required
                            error={errors.memoryGb}
                          />
                          <FormField
                            label="No. of Disks"
                            name="diskCount"
                            type="number"
                            value={diskCount}
                            onChange={setDiskCount}
                            placeholder="Optional"
                          />
                          <FormField
                            label="Space (GB)"
                            name="spaceGb"
                            type="number"
                            value={spaceGb}
                            onChange={setSpaceGb}
                            placeholder="100"
                            required
                            error={errors.spaceGb}
                          />
                        </div>
                      </div>

                      {/* Special Requirements */}
                      <FormField
                        label="Special Requirements"
                        name="specialRequirements"
                        type="textarea"
                        value={specialRequirements}
                        onChange={setSpecialRequirements}
                        placeholder="Any special requirements, software dependencies, network configurations, etc."
                        rows={3}
                      />
                    </div>
                  )}

                  {/* ============================================= */}
                  {/* Step 2: Service Impact Analysis                */}
                  {/* ============================================= */}
                  {step === 2 && (
                    <div className="space-y-5">
                      {errors.impacts && (
                        <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/5 px-4 py-3">
                          <p className="text-sm text-[var(--error)] font-medium">
                            {errors.impacts}
                          </p>
                        </div>
                      )}

                      <div className="space-y-4">
                        {impacts.map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/30 overflow-hidden"
                          >
                            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-1)]/50 border-b border-[var(--border)]">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                                  {index + 1}
                                </div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                                  Impact Entry
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImpact(entry.id)}
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
                              >
                                <Trash2 size={13} />
                                Remove
                              </button>
                            </div>

                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                  label="Risk Category"
                                  name={`impact_${index}_riskCategory`}
                                  type="select"
                                  value={entry.riskCategory}
                                  onChange={(val) =>
                                    updateImpact(entry.id, "riskCategory", val)
                                  }
                                  options={RISK_CATEGORIES}
                                  placeholder="Select category"
                                  required
                                  error={errors[`impact_${index}_riskCategory`]}
                                />
                                <FormField
                                  label="Severity"
                                  name={`impact_${index}_severity`}
                                  type="select"
                                  value={entry.severity}
                                  onChange={(val) =>
                                    updateImpact(entry.id, "severity", val)
                                  }
                                  options={SEVERITY_LEVELS}
                                  placeholder="Select severity"
                                  required
                                  error={errors[`impact_${index}_severity`]}
                                />
                              </div>
                              <FormField
                                label="Risk Description"
                                name={`impact_${index}_riskDescription`}
                                type="textarea"
                                value={entry.riskDescription}
                                onChange={(val) =>
                                  updateImpact(entry.id, "riskDescription", val)
                                }
                                placeholder="Describe the risk in detail (minimum 50 characters)"
                                rows={3}
                                required
                                error={errors[`impact_${index}_riskDescription`]}
                                description={`${entry.riskDescription.length}/50 characters minimum`}
                              />
                              <FormField
                                label="Mitigation Measures"
                                name={`impact_${index}_mitigationMeasures`}
                                type="textarea"
                                value={entry.mitigationMeasures}
                                onChange={(val) =>
                                  updateImpact(
                                    entry.id,
                                    "mitigationMeasures",
                                    val,
                                  )
                                }
                                placeholder="Describe the mitigation measures (minimum 50 characters)"
                                rows={3}
                                required
                                error={
                                  errors[`impact_${index}_mitigationMeasures`]
                                }
                                description={`${entry.mitigationMeasures.length}/50 characters minimum`}
                              />
                            </div>
                          </motion.div>
                        ))}

                        <button
                          type="button"
                          onClick={addImpact}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-4 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--primary)]/40 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5"
                        >
                          <Plus size={16} />
                          Add Impact Entry
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ============================================= */}
                  {/* Step 3: Justification                          */}
                  {/* ============================================= */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <FormField
                        label="Business Justification"
                        name="justification"
                        type="textarea"
                        value={justification}
                        onChange={setJustification}
                        placeholder="Provide a detailed justification for the server/storage allocation request. Explain the business need, expected outcomes, and why the requested resources are necessary (minimum 100 characters)."
                        rows={8}
                        required
                        error={errors.justification}
                        description={`${justification.length}/100 characters minimum`}
                      />

                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                          <HardDrive size={14} className="text-[var(--text-secondary)]" />
                          Current Space Usage
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            label="Present Space Allocated (GB)"
                            name="presentSpaceAllocatedGb"
                            type="number"
                            value={presentSpaceAllocatedGb}
                            onChange={setPresentSpaceAllocatedGb}
                            placeholder="0"
                          />
                          <FormField
                            label="Present Space In Use (GB)"
                            name="presentSpaceInUseGb"
                            type="number"
                            value={presentSpaceInUseGb}
                            onChange={setPresentSpaceInUseGb}
                            placeholder="0"
                          />
                        </div>

                        {parseInt(presentSpaceAllocatedGb, 10) > 0 && parseInt(presentSpaceInUseGb, 10) > 0 && (
                          <div className="mt-3 rounded-xl bg-[var(--surface-1)] p-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-[var(--text-secondary)]">Current utilization</span>
                              <span className="font-semibold text-[var(--text-primary)]">
                                {Math.round(
                                  (parseInt(presentSpaceInUseGb, 10) /
                                    parseInt(presentSpaceAllocatedGb, 10)) *
                                    100,
                                )}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--primary)] transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(
                                      (parseInt(presentSpaceInUseGb, 10) /
                                        parseInt(presentSpaceAllocatedGb, 10)) *
                                        100,
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ============================================= */}
                  {/* Step 4: Review & Submit                        */}
                  {/* ============================================= */}
                  {step === 4 && (
                    <div className="space-y-4">
                      {/* Requestor Information summary */}
                      <ReviewSection
                        icon={<User size={14} />}
                        title="Requestor Information"
                        onEdit={() => goTo(0)}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                          <ReviewField label="Name" value={requestorName || user?.displayName || ""} />
                          <ReviewField label="Email" value={requestorEmail || user?.email || ""} />
                          <ReviewField label="Staff ID" value={requestorStaffId} />
                          <ReviewField label="Division/Office" value={divisionOffice} />
                          <ReviewField label="Status" value={findLabel(REQUESTOR_STATUSES, requestorStatus)} />
                          <ReviewField label="Extension" value={extension} />
                        </div>
                      </ReviewSection>

                      {/* Technical Specifications summary */}
                      <ReviewSection
                        icon={<Cpu size={14} />}
                        title="Technical Specifications"
                        onEdit={() => goTo(1)}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                          <ReviewField label="Application" value={appName} />
                          <ReviewField label="Database" value={dbName} />
                          <ReviewField label="Operating System" value={findLabel(OPERATING_SYSTEMS, operatingSystem)} />
                          <ReviewField label="Server Type" value={serverType.map((st) => findLabel(SERVER_TYPES, st)).join(", ") || "\u2014"} />
                          <ReviewField label="CPUs" value={vcpuCount} />
                          <ReviewField label="Memory" value={`${memoryGb} GB`} />
                          <ReviewField label="Disks" value={diskCount || "\u2014"} />
                          <ReviewField label="Space" value={`${spaceGb} GB`} />
                          <ReviewField label="VLAN Zone" value={findLabel(VLAN_ZONES, vlanZone)} />
                        </div>
                        {specialRequirements && (
                          <div className="mt-2 pt-2 border-t border-[var(--border)]">
                            <ReviewField
                              label="Special Requirements"
                              value={specialRequirements.length > 150 ? specialRequirements.slice(0, 150) + "..." : specialRequirements}
                            />
                          </div>
                        )}
                      </ReviewSection>

                      {/* Service Impact summary */}
                      <ReviewSection
                        icon={<Shield size={14} />}
                        title={`Service Impact Analysis (${impacts.length} ${impacts.length === 1 ? "entry" : "entries"})`}
                        onEdit={() => goTo(2)}
                      >
                        {impacts.map((entry, i) => (
                          <div
                            key={entry.id}
                            className={`${i > 0 ? "mt-3 pt-3 border-t border-[var(--border)]" : ""}`}
                          >
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                              <ReviewField label="Risk Category" value={findLabel(RISK_CATEGORIES, entry.riskCategory)} />
                              <ReviewField label="Severity" value={findLabel(SEVERITY_LEVELS, entry.severity)} />
                            </div>
                            <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                              <ReviewField label="Risk" value={entry.riskDescription.length > 100 ? entry.riskDescription.slice(0, 100) + "..." : entry.riskDescription} />
                              <ReviewField label="Mitigation" value={entry.mitigationMeasures.length > 100 ? entry.mitigationMeasures.slice(0, 100) + "..." : entry.mitigationMeasures} />
                            </div>
                          </div>
                        ))}
                      </ReviewSection>

                      {/* Justification summary */}
                      <ReviewSection
                        icon={<FileText size={14} />}
                        title="Justification"
                        onEdit={() => goTo(3)}
                      >
                        <ReviewField
                          label="Business Justification"
                          value={justification.length > 250 ? justification.slice(0, 250) + "..." : justification}
                        />
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
                          <ReviewField label="Space Allocated" value={`${presentSpaceAllocatedGb} GB`} />
                          <ReviewField label="Space In Use" value={`${presentSpaceInUseGb} GB`} />
                        </div>
                      </ReviewSection>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation bar (inside card) */}
            <div className="border-t border-[var(--border)] bg-[var(--surface-1)]/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={
                    step === 0 ? () => router.push("/dashboard/ssa") : goPrev
                  }
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  <ArrowLeft size={16} />
                  {step === 0 ? "Cancel" : "Previous"}
                </button>

                {isLastStep ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAsDraft}
                      disabled={isPending}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createSSARequest.isPending && !submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isPending}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Submit Request
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review section wrapper                                             */
/* ------------------------------------------------------------------ */

function ReviewSection({
  icon,
  title,
  onEdit,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] transition-colors hover:border-[var(--primary)]/30 group">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-1)]/40 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-[var(--primary)]">{icon}</span>
          <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--primary)]"
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review field helper                                                */
/* ------------------------------------------------------------------ */

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-[var(--neutral-gray)]">{label}: </span>
      <span className="text-sm text-[var(--text-primary)]">
        {value || "\u2014"}
      </span>
    </div>
  );
}
