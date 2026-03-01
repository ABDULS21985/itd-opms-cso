"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Check,
  Package,
  Cpu,
  Users,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateAsset } from "@/hooks/use-cmdb";
import { useUsers } from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ASSET_TYPES = [
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "virtual", label: "Virtual" },
  { value: "cloud", label: "Cloud" },
  { value: "network", label: "Network" },
  { value: "peripheral", label: "Peripheral" },
];

const CATEGORIES = [
  { value: "server", label: "Server" },
  { value: "workstation", label: "Workstation" },
  { value: "laptop", label: "Laptop" },
  { value: "monitor", label: "Monitor" },
  { value: "printer", label: "Printer" },
  { value: "router", label: "Router" },
  { value: "switch", label: "Switch" },
  { value: "firewall", label: "Firewall" },
  { value: "storage", label: "Storage" },
  { value: "application", label: "Application" },
  { value: "database", label: "Database" },
  { value: "vm", label: "Virtual Machine" },
  { value: "container", label: "Container" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "NGN", label: "NGN - Nigerian Naira" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

const CLASSIFICATIONS = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "restricted", label: "Restricted" },
];

const HARDWARE_TYPES = ["hardware", "network", "peripheral"];

const STEPS = [
  { label: "Identity", icon: Package, description: "Basic asset info" },
  { label: "Specifications", icon: Cpu, description: "Hardware & location" },
  { label: "Ownership", icon: Users, description: "Owner, cost & tags" },
  { label: "Review", icon: Sparkles, description: "Confirm & register" },
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

export default function NewAssetPage() {
  const router = useRouter();
  const createAsset = useCreateAsset();
  const { data: usersData } = useUsers(1, 200);

  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];

  const userOptions = users.map(
    (u: { id: string; displayName?: string; email: string }) => ({
      value: u.id,
      label: u.displayName || u.email,
    }),
  );

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [name, setName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [assetType, setAssetType] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  // Hardware details
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  // Location
  const [location, setLocation] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");

  // Ownership
  const [ownerId, setOwnerId] = useState("");
  const [custodianId, setCustodianId] = useState("");

  // Financial
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [currency, setCurrency] = useState("NGN");

  // Classification & tags
  const [classification, setClassification] = useState("");
  const [tags, setTags] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isHardwareType = HARDWARE_TYPES.includes(assetType);

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!name.trim()) newErrors.name = "Name is required";
        if (!assetTag.trim()) newErrors.assetTag = "Asset tag is required";
        if (!assetType) newErrors.assetType = "Type is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [name, assetTag, assetType],
  );

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

  /* ---- Submit ---- */
  function handleSubmit() {
    createAsset.mutate(
      {
        name: name.trim(),
        assetTag: assetTag.trim(),
        type: assetType,
        category: category || undefined,
        description: description.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        location: location.trim() || undefined,
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
        room: room.trim() || undefined,
        ownerId: ownerId.trim() || undefined,
        custodianId: custodianId.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : undefined,
        currency,
        classification: classification || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      {
        onSuccess: (asset) => {
          router.push(`/dashboard/cmdb/assets/${asset.id}`);
        },
      },
    );
  }

  /* ---- Helpers ---- */
  const findLabel = (
    opts: { value: string; label: string }[],
    val: string,
  ) => opts.find((o) => o.value === val)?.label || "—";

  const isLastStep = step === STEPS.length - 1;

  /* ---- Step completeness indicators ---- */
  const stepComplete = [
    !!(name.trim() && assetTag.trim() && assetType),
    !!(manufacturer || model || serialNumber || location || building || floor || room),
    !!(ownerId || custodianId || purchaseDate || purchaseCost || classification || tags.trim()),
    false,
  ];

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
          onClick={() => router.push("/dashboard/cmdb/assets")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Assets
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <Package size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Register New Asset
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Add a new asset to the configuration management database
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
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step || stepComplete[i];
            const isClickable = i <= step || stepComplete[step];

            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
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
                      <Icon size={18} />
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
            {/* Step 0: Identity */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Asset Identity
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Provide the basic identification details for this asset.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Asset Name"
                      name="name"
                      value={name}
                      onChange={setName}
                      placeholder="e.g. Dell PowerEdge R740"
                      required
                      error={errors.name}
                    />
                    <FormField
                      label="Asset Tag"
                      name="assetTag"
                      value={assetTag}
                      onChange={setAssetTag}
                      placeholder="e.g. AST-2024-0001"
                      required
                      error={errors.assetTag}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Type"
                      name="type"
                      type="select"
                      value={assetType}
                      onChange={setAssetType}
                      options={ASSET_TYPES}
                      placeholder="Select type"
                      required
                      error={errors.assetType}
                    />
                    <FormField
                      label="Category"
                      name="category"
                      type="select"
                      value={category}
                      onChange={setCategory}
                      options={CATEGORIES}
                      placeholder="Select category"
                    />
                  </div>
                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={description}
                    onChange={setDescription}
                    placeholder="Brief description of the asset"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Specifications */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Specifications &amp; Location
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Add hardware details and physical location information.
                </p>
                <div className="space-y-6">
                  {/* Hardware Details (conditional) */}
                  {isHardwareType && (
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                        Hardware Details
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField
                          label="Manufacturer"
                          name="manufacturer"
                          value={manufacturer}
                          onChange={setManufacturer}
                          placeholder="e.g. Dell, HP, Cisco"
                        />
                        <FormField
                          label="Model"
                          name="model"
                          value={model}
                          onChange={setModel}
                          placeholder="e.g. PowerEdge R740"
                        />
                        <FormField
                          label="Serial Number"
                          name="serialNumber"
                          value={serialNumber}
                          onChange={setSerialNumber}
                          placeholder="e.g. SN123456789"
                        />
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Location
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <FormField
                        label="Location"
                        name="location"
                        value={location}
                        onChange={setLocation}
                        placeholder="e.g. Data Center"
                      />
                      <FormField
                        label="Building"
                        name="building"
                        value={building}
                        onChange={setBuilding}
                        placeholder="e.g. HQ Building"
                      />
                      <FormField
                        label="Floor"
                        name="floor"
                        value={floor}
                        onChange={setFloor}
                        placeholder="e.g. 3rd Floor"
                      />
                      <FormField
                        label="Room"
                        name="room"
                        value={room}
                        onChange={setRoom}
                        placeholder="e.g. Server Room A"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Ownership */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Ownership &amp; Classification
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Assign owners, financial details, and classification.
                </p>
                <div className="space-y-6">
                  {/* Owner & Custodian */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Owner"
                      name="ownerId"
                      type="select"
                      value={ownerId}
                      onChange={setOwnerId}
                      options={userOptions}
                      placeholder="Select owner (optional)"
                    />
                    <FormField
                      label="Custodian"
                      name="custodianId"
                      type="select"
                      value={custodianId}
                      onChange={setCustodianId}
                      options={userOptions}
                      placeholder="Select custodian (optional)"
                    />
                  </div>

                  {/* Financial */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Financial Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField
                        label="Purchase Date"
                        name="purchaseDate"
                        type="date"
                        value={purchaseDate}
                        onChange={setPurchaseDate}
                      />
                      <FormField
                        label="Purchase Cost"
                        name="purchaseCost"
                        value={purchaseCost}
                        onChange={setPurchaseCost}
                        placeholder="e.g. 500000"
                      />
                      <FormField
                        label="Currency"
                        name="currency"
                        type="select"
                        value={currency}
                        onChange={setCurrency}
                        options={CURRENCIES}
                      />
                    </div>
                  </div>

                  {/* Classification & Tags */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Classification &amp; Tags
                    </h3>
                    <div className="space-y-4">
                      <FormField
                        label="Classification"
                        name="classification"
                        type="select"
                        value={classification}
                        onChange={setClassification}
                        options={CLASSIFICATIONS}
                        placeholder="Select classification"
                      />
                      <FormField
                        label="Tags"
                        name="tags"
                        value={tags}
                        onChange={setTags}
                        placeholder="Comma-separated tags, e.g. production, critical, rack-a"
                        description="Separate multiple tags with commas"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Register
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click any section to go back and
                  edit.
                </p>

                <div className="space-y-4">
                  {/* Identity summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Package
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Identity
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Name" value={name} />
                      <ReviewField label="Asset Tag" value={assetTag} />
                      <ReviewField
                        label="Type"
                        value={findLabel(ASSET_TYPES, assetType)}
                      />
                      <ReviewField
                        label="Category"
                        value={findLabel(CATEGORIES, category)}
                      />
                    </div>
                    {description && (
                      <div className="mt-2">
                        <ReviewField
                          label="Description"
                          value={
                            description.length > 120
                              ? description.slice(0, 120) + "..."
                              : description
                          }
                        />
                      </div>
                    )}
                  </button>

                  {/* Specifications summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Specifications &amp; Location
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {isHardwareType && (
                        <>
                          <ReviewField label="Manufacturer" value={manufacturer} />
                          <ReviewField label="Model" value={model} />
                          <ReviewField label="Serial Number" value={serialNumber} />
                        </>
                      )}
                      <ReviewField label="Location" value={location} />
                      <ReviewField label="Building" value={building} />
                      <ReviewField label="Floor" value={floor} />
                      <ReviewField label="Room" value={room} />
                    </div>
                  </button>

                  {/* Ownership summary */}
                  <button
                    type="button"
                    onClick={() => goTo(2)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Ownership &amp; Classification
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Owner"
                        value={findLabel(userOptions, ownerId)}
                      />
                      <ReviewField
                        label="Custodian"
                        value={findLabel(userOptions, custodianId)}
                      />
                      <ReviewField
                        label="Purchase Date"
                        value={
                          purchaseDate
                            ? new Date(purchaseDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"
                        }
                      />
                      <ReviewField
                        label="Purchase Cost"
                        value={
                          purchaseCost
                            ? `${currency} ${Number(purchaseCost).toLocaleString()}`
                            : "—"
                        }
                      />
                      <ReviewField
                        label="Classification"
                        value={findLabel(CLASSIFICATIONS, classification)}
                      />
                      <ReviewField label="Tags" value={tags || "—"} />
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
            step === 0
              ? () => router.push("/dashboard/cmdb/assets")
              : goPrev
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              createAsset.isPending ||
              !name.trim() ||
              !assetTag.trim() ||
              !assetType
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createAsset.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Register Asset
          </button>
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
        {value || "—"}
      </span>
    </div>
  );
}
