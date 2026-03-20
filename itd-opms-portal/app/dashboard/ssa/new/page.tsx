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
  { label: "Requestor", description: "Your information" },
  { label: "Technical", description: "Server specifications" },
  { label: "Impact", description: "Service impact analysis" },
  { label: "Justification", description: "Business justification" },
  { label: "Review", description: "Review & submit" },
];

/* ------------------------------------------------------------------ */
/*  Slide animation variants                                           */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
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
    // Validate all steps before submitting
    for (let s = 0; s < STEPS.length - 1; s++) {
      if (!validateStep(s)) {
        setDirection(s < step ? -1 : 1);
        setStep(s);
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Create the request as draft
      const body = buildRequestBody();
      const request = await new Promise<SSARequest>((resolve, reject) => {
        createSSARequest.mutate(body, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      // 2. Create all service impact entries via apiClient directly
      //    (the hook was initialized with undefined requestId)
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

      // 3. Submit the request
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/ssa")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Requests
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <Server size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              New SSA Request
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Create a new server/storage allocation request
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Stepper ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-5"
      >
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isDone = i < step || stepComplete[i];
            const isClickable = i <= step || stepComplete[step];

            return (
              <div
                key={s.label}
                className="flex items-center flex-1 last:flex-none"
              >
                <button
                  type="button"
                  onClick={() => isClickable && goTo(i)}
                  className={`group flex flex-col items-center gap-1.5 transition-all ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 scale-110"
                        : isDone
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    } ${isClickable && !isActive ? "group-hover:border-[var(--primary)]/50 group-hover:scale-105" : ""}`}
                  >
                    {isDone && !isActive ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : (
                      <span className="text-sm font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors hidden sm:block ${
                      isActive
                        ? "text-[var(--primary)]"
                        : isDone
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--neutral-gray)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>

                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-3">
                    <div className="h-0.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--primary)]"
                        initial={false}
                        animate={{ width: i < step ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-xs text-[var(--neutral-gray)] mt-3"
          >
            Step {step + 1} of {STEPS.length} — {STEPS[step].description}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* ── Step Content ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 min-h-[320px] relative overflow-hidden"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* ============================================= */}
            {/* Step 0: Requestor Information                  */}
            {/* ============================================= */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Requestor Information
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Your details are auto-populated from your profile. Please
                  confirm your division and status.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Name"
                      name="requestorName"
                      value={requestorName || user?.displayName || ""}
                      onChange={() => {}}
                      disabled
                    />
                    <FormField
                      label="Email"
                      name="requestorEmail"
                      type="email"
                      value={requestorEmail || user?.email || ""}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Staff ID"
                      name="requestorStaffId"
                      value={requestorStaffId}
                      onChange={() => {}}
                      disabled
                      placeholder="Auto-populated from profile"
                    />
                    <FormField
                      label="Division/Office"
                      name="divisionOffice"
                      value={divisionOffice}
                      onChange={setDivisionOffice}
                      placeholder="e.g. Information Technology Division"
                      required
                      error={errors.divisionOffice}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Technical Specifications
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Specify the server and storage requirements for your
                  application.
                </p>
                <div className="space-y-6">
                  {/* Application & Database */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Application Details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Environment
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                      Server Type{" "}
                      <span className="text-[var(--error)] ml-0.5">*</span>
                    </h3>
                    {errors.serverType && (
                      <p className="text-xs text-[var(--error)] mb-2 font-medium">
                        {errors.serverType}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {SERVER_TYPES.map((st) => {
                        const isSelected = serverType.includes(st.value);
                        return (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => toggleServerType(st.value)}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                              isSelected
                                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40"
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
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
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Resource Allocation
                    </h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
              </div>
            )}

            {/* ============================================= */}
            {/* Step 2: Service Impact Analysis                */}
            {/* ============================================= */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Service Impact Analysis
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Identify potential risks and mitigation measures for this
                  server allocation. At least one entry is required.
                </p>

                {errors.impacts && (
                  <div className="mb-4 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/5 px-4 py-3">
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
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/50 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                          Impact Entry #{index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeImpact(entry.id)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--primary)]/40 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5"
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
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Business Justification
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Provide a clear business justification for this
                  server/storage allocation request.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Business Justification"
                    name="justification"
                    type="textarea"
                    value={justification}
                    onChange={setJustification}
                    placeholder="Provide a detailed justification for the server/storage allocation request. Explain the business need, expected outcomes, and why the requested resources are necessary (minimum 100 characters)."
                    rows={6}
                    required
                    error={errors.justification}
                    description={`${justification.length}/100 characters minimum`}
                  />

                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Current Space Usage
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  </div>
                </div>
              </div>
            )}

            {/* ============================================= */}
            {/* Step 4: Review & Submit                        */}
            {/* ============================================= */}
            {step === 4 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Submit
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click any section to go back and
                  edit.
                </p>

                <div className="space-y-4">
                  {/* Requestor Information summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Server
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Requestor Information
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Name"
                        value={
                          requestorName || user?.displayName || ""
                        }
                      />
                      <ReviewField
                        label="Email"
                        value={requestorEmail || user?.email || ""}
                      />
                      <ReviewField
                        label="Staff ID"
                        value={requestorStaffId}
                      />
                      <ReviewField
                        label="Division/Office"
                        value={divisionOffice}
                      />
                      <ReviewField
                        label="Status"
                        value={findLabel(
                          REQUESTOR_STATUSES,
                          requestorStatus,
                        )}
                      />
                      <ReviewField label="Extension" value={extension} />
                    </div>
                  </button>

                  {/* Technical Specifications summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Server
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Technical Specifications
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Application" value={appName} />
                      <ReviewField label="Database" value={dbName} />
                      <ReviewField
                        label="Operating System"
                        value={findLabel(
                          OPERATING_SYSTEMS,
                          operatingSystem,
                        )}
                      />
                      <ReviewField
                        label="Server Type"
                        value={
                          serverType
                            .map((st) => findLabel(SERVER_TYPES, st))
                            .join(", ") || "\u2014"
                        }
                      />
                      <ReviewField label="CPUs" value={vcpuCount} />
                      <ReviewField
                        label="Memory"
                        value={`${memoryGb} GB`}
                      />
                      <ReviewField
                        label="Disks"
                        value={diskCount || "\u2014"}
                      />
                      <ReviewField
                        label="Space"
                        value={`${spaceGb} GB`}
                      />
                      <ReviewField
                        label="VLAN Zone"
                        value={findLabel(VLAN_ZONES, vlanZone)}
                      />
                    </div>
                    {specialRequirements && (
                      <div className="mt-2">
                        <ReviewField
                          label="Special Requirements"
                          value={
                            specialRequirements.length > 120
                              ? specialRequirements.slice(0, 120) + "..."
                              : specialRequirements
                          }
                        />
                      </div>
                    )}
                  </button>

                  {/* Service Impact summary */}
                  <button
                    type="button"
                    onClick={() => goTo(2)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Server
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Service Impact Analysis ({impacts.length}{" "}
                        {impacts.length === 1 ? "entry" : "entries"})
                      </span>
                    </div>
                    {impacts.map((entry, i) => (
                      <div
                        key={entry.id}
                        className={`${i > 0 ? "mt-3 pt-3 border-t border-[var(--border)]" : ""}`}
                      >
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <ReviewField
                            label="Risk Category"
                            value={findLabel(
                              RISK_CATEGORIES,
                              entry.riskCategory,
                            )}
                          />
                          <ReviewField
                            label="Severity"
                            value={findLabel(
                              SEVERITY_LEVELS,
                              entry.severity,
                            )}
                          />
                        </div>
                        <div className="mt-1">
                          <ReviewField
                            label="Risk"
                            value={
                              entry.riskDescription.length > 80
                                ? entry.riskDescription.slice(0, 80) +
                                  "..."
                                : entry.riskDescription
                            }
                          />
                        </div>
                        <div className="mt-1">
                          <ReviewField
                            label="Mitigation"
                            value={
                              entry.mitigationMeasures.length > 80
                                ? entry.mitigationMeasures.slice(0, 80) +
                                  "..."
                                : entry.mitigationMeasures
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </button>

                  {/* Justification summary */}
                  <button
                    type="button"
                    onClick={() => goTo(3)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Server
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Justification
                      </span>
                    </div>
                    <div className="mb-1">
                      <ReviewField
                        label="Business Justification"
                        value={
                          justification.length > 200
                            ? justification.slice(0, 200) + "..."
                            : justification
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Space Allocated"
                        value={`${presentSpaceAllocatedGb} GB`}
                      />
                      <ReviewField
                        label="Space In Use"
                        value={`${presentSpaceInUseGb} GB`}
                      />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Navigation ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex items-center justify-between"
      >
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

        <div className="flex items-center gap-1.5">
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
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </motion.div>
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
