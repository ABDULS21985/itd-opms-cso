"use client";

import { useMemo, useState } from "react";
import { Plus, Search, MapPin, AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AnimatedButton } from "@/components/shared/animated-button";
import { showUndoToast } from "@/components/shared/undo-toast";
import {
  useLocationTree,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from "@/hooks/use-taxonomy";
import { LocationTreeNodeComp } from "./location-tree-node";
import type { Location } from "@/types/taxonomy";
import { cn } from "@/lib/utils";

interface LocationFormData {
  city: string;
  country: string;
  countryCode: string;
  timezone: string;
}

const emptyForm: LocationFormData = {
  city: "",
  country: "",
  countryCode: "",
  timezone: "",
};

export function LocationsPanel() {
  const { data: tree = [], isLoading, isError } = useLocationTree();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(emptyForm);

  // ── Filter tree by search ────────────────────────────────────────────
  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    return tree
      .map((node) => {
        const countryMatch = node.country.toLowerCase().includes(q);
        const matchingLocations = node.locations.filter((loc) =>
          loc.city.toLowerCase().includes(q),
        );
        if (countryMatch) return node;
        if (matchingLocations.length > 0) {
          return {
            ...node,
            locations: matchingLocations,
            totalCities: matchingLocations.length,
            activeCities: matchingLocations.filter((l) => l.isActive).length,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof tree;
  }, [tree, search]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setFormData(emptyForm);
    setShowCreateModal(true);
  };

  const openEditModal = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      city: location.city,
      country: location.country,
      countryCode: location.countryCode ?? "",
      timezone: location.timezone ?? "",
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingLocation(null);
    setFormData(emptyForm);
  };

  const handleCreate = () => {
    if (!formData.city.trim() || !formData.country.trim()) return;
    createLocation.mutate(
      {
        city: formData.city.trim(),
        country: formData.country.trim(),
        countryCode: formData.countryCode.trim() || undefined,
        timezone: formData.timezone.trim() || undefined,
      },
      {
        onSuccess: () => {
          closeModal();
          toast.success("Location created");
        },
      },
    );
  };

  const handleUpdate = () => {
    if (!editingLocation || !formData.city.trim() || !formData.country.trim())
      return;
    updateLocation.mutate(
      {
        id: editingLocation.id,
        city: formData.city.trim(),
        country: formData.country.trim(),
        countryCode: formData.countryCode.trim() || undefined,
        timezone: formData.timezone.trim() || undefined,
      },
      {
        onSuccess: () => {
          closeModal();
          toast.success("Location updated");
        },
      },
    );
  };

  const handleDelete = (location: Location) => {
    updateLocation.mutate({ id: location.id, isActive: false });
    showUndoToast({
      message: `"${location.city}, ${location.country}" deactivated`,
      undoAction: () =>
        updateLocation.mutate({ id: location.id, isActive: true }),
      variant: "warning",
    });
  };

  // ── Loading / Error states ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--neutral-gray)]">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-[var(--error)]">
        <AlertCircle size={28} />
        <p className="text-sm font-medium">Failed to load locations</p>
      </div>
    );
  }

  // ── Modal form (shared between create & edit) ────────────────────────
  const isModalOpen = showCreateModal || editingLocation !== null;
  const isEditing = editingLocation !== null;
  const isPending = isEditing
    ? updateLocation.isPending
    : createLocation.isPending;

  const modalContent = isModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface-0)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {isEditing ? "Edit Location" : "Create Location"}
          </h3>
          <button
            type="button"
            onClick={closeModal}
            className="p-1 rounded-md text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              City <span className="text-[var(--error)]">*</span>
            </label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Nairobi"
              value={formData.city}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, city: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Country <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Kenya"
              value={formData.country}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, country: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Country Code
            </label>
            <input
              type="text"
              placeholder="e.g. KE"
              value={formData.countryCode}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  countryCode: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Timezone
            </label>
            <input
              type="text"
              placeholder="e.g. Africa/Nairobi"
              value={formData.timezone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timezone: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <AnimatedButton variant="ghost" size="sm" onClick={closeModal}>
            Cancel
          </AnimatedButton>
          <AnimatedButton
            variant="primary"
            size="sm"
            onClick={isEditing ? handleUpdate : handleCreate}
            loading={isPending}
            disabled={!formData.city.trim() || !formData.country.trim()}
          >
            {isEditing ? "Save Changes" : "Create"}
          </AnimatedButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            type="text"
            placeholder="Search countries or cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <AnimatedButton
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={openCreateModal}
        >
          Add Location
        </AnimatedButton>
      </div>

      {/* Tree view */}
      {filteredTree.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-[var(--neutral-gray)]">
          <MapPin size={32} />
          <p className="text-sm font-medium">No locations found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] divide-y divide-[var(--border)] overflow-hidden">
          {filteredTree.map((node) => (
            <LocationTreeNodeComp
              key={node.country}
              node={node}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalContent}
    </div>
  );
}
