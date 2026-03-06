"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Package } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { UserPicker } from "@/components/shared/pickers";
import { useAsset, useUpdateAsset } from "@/hooks/use-cmdb";
import { useSearchUsers } from "@/hooks/use-system";

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: asset, isLoading } = useAsset(id);
  const updateAsset = useUpdateAsset(id);
  const { data: allUsers } = useSearchUsers("");

  /* ---- Form state ---- */
  const [name, setName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [assetType, setAssetType] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");

  const [ownerId, setOwnerId] = useState("");
  const [ownerDisplay, setOwnerDisplay] = useState("");
  const [custodianId, setCustodianId] = useState("");
  const [custodianDisplay, setCustodianDisplay] = useState("");

  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [currency, setCurrency] = useState("NGN");

  const [classification, setClassification] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Pre-fill form when asset loads ---- */
  useEffect(() => {
    if (asset) {
      setName(asset.name ?? "");
      setAssetTag(asset.assetTag ?? "");
      setAssetType(asset.type ?? "");
      setCategory(asset.category ?? "");
      setDescription(asset.description ?? "");
      setManufacturer(asset.manufacturer ?? "");
      setModel(asset.model ?? "");
      setSerialNumber(asset.serialNumber ?? "");
      setBuilding(asset.building ?? "");
      setFloor(asset.floor ?? "");
      setRoom(asset.room ?? "");
      setOwnerId(asset.ownerId ?? "");
      setCustodianId(asset.custodianId ?? "");
      setPurchaseDate(
        asset.purchaseDate
          ? new Date(asset.purchaseDate).toISOString().split("T")[0]
          : "",
      );
      setPurchaseCost(
        asset.purchaseCost != null ? String(asset.purchaseCost) : "",
      );
      setCurrency(asset.currency ?? "NGN");
      setClassification(asset.classification ?? "");
      setTagsInput(asset.tags?.join(", ") ?? "");
    }
  }, [asset]);

  /* ---- Resolve owner/custodian display names ---- */
  useEffect(() => {
    if (asset && allUsers) {
      if (asset.ownerId) {
        const owner = allUsers.find((u) => u.id === asset.ownerId);
        setOwnerDisplay(owner?.displayName ?? "");
      }
      if (asset.custodianId) {
        const custodian = allUsers.find((u) => u.id === asset.custodianId);
        setCustodianDisplay(custodian?.displayName ?? "");
      }
    }
  }, [asset, allUsers]);

  /* ---- Submit ---- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!assetTag.trim()) newErrors.assetTag = "Asset tag is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    updateAsset.mutate(
      {
        name: name.trim(),
        assetTag: assetTag.trim(),
        type: assetType,
        category: category || undefined,
        description: description.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
        room: room.trim() || undefined,
        ownerId: ownerId.trim() || undefined,
        custodianId: custodianId.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : undefined,
        currency: currency || undefined,
        classification: classification || undefined,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          router.push(`/dashboard/cmdb/assets/${id}`);
        },
      },
    );
  }

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={24}
            className="animate-spin text-[var(--primary)]"
          />
          <p className="text-sm text-[var(--text-secondary)]">
            Loading asset...
          </p>
        </div>
      </div>
    );
  }

  /* ---- 404 state ---- */
  if (!asset) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--text-secondary)]">
          Asset not found.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
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
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(27, 115, 64, 0.1)" }}
          >
            <Package size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Edit Asset
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Update details for {asset.assetTag}
            </p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Identity Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Identity
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Name"
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
              />
              <FormField
                label="Category"
                name="category"
                value={category}
                onChange={setCategory}
                placeholder="e.g. Server, Workstation, Laptop"
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
        </motion.div>

        {/* ── Specifications Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Specifications &amp; Location
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </motion.div>

        {/* ── Ownership Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Ownership &amp; Classification
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <UserPicker
                label="Owner"
                placeholder="Search for owner..."
                value={ownerId || undefined}
                displayValue={ownerDisplay}
                onChange={(userId, displayName) => {
                  setOwnerId(userId ?? "");
                  setOwnerDisplay(displayName);
                }}
              />
              <UserPicker
                label="Custodian"
                placeholder="Search for custodian..."
                value={custodianId || undefined}
                displayValue={custodianDisplay}
                onChange={(userId, displayName) => {
                  setCustodianId(userId ?? "");
                  setCustodianDisplay(displayName);
                }}
              />
            </div>
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
            <FormField
              label="Classification"
              name="classification"
              type="select"
              value={classification}
              onChange={setClassification}
              options={CLASSIFICATIONS}
              placeholder="Select classification"
            />
          </div>
        </motion.div>

        {/* ── Tags Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Tags
          </h2>
          <FormField
            label="Tags"
            name="tags"
            value={tagsInput}
            onChange={setTagsInput}
            placeholder="Comma-separated tags, e.g. production, critical, rack-a"
            description="Separate multiple tags with commas"
          />
        </motion.div>

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex items-center justify-end gap-3"
        >
          <button
            type="button"
            onClick={() => router.push(`/dashboard/cmdb/assets/${id}`)}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateAsset.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {updateAsset.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        </motion.div>
      </form>
    </div>
  );
}
