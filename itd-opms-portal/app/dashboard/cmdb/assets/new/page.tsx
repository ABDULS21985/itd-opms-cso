"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateAsset } from "@/hooks/use-cmdb";

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewAssetPage() {
  const router = useRouter();
  const createAsset = useCreateAsset();

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

  /* ---- Validation ---- */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!assetTag.trim()) newErrors.assetTag = "Asset tag is required";
    if (!assetType) newErrors.assetType = "Type is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* ---- Submit ---- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

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

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        {/* Section: Basic Info */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Basic Information
          </h2>
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

        {/* Section: Hardware Details (conditional) */}
        {isHardwareType && (
          <div className="border-t border-[var(--border)] pt-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Hardware Details
            </h2>
            <div className="space-y-4">
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
          </div>
        )}

        {/* Section: Location */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Location
          </h2>
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

        {/* Section: Ownership */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Ownership
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Owner ID"
              name="ownerId"
              value={ownerId}
              onChange={setOwnerId}
              placeholder="User UUID (optional)"
            />
            <FormField
              label="Custodian ID"
              name="custodianId"
              value={custodianId}
              onChange={setCustodianId}
              placeholder="User UUID (optional)"
            />
          </div>
        </div>

        {/* Section: Financial */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Financial Information
          </h2>
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

        {/* Section: Classification & Tags */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Classification &amp; Tags
          </h2>
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/cmdb/assets")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAsset.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createAsset.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Register Asset
          </button>
        </div>
      </motion.form>
    </div>
  );
}
