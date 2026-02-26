"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Layers, AlertCircle, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { AnimatedButton } from "@/components/shared/animated-button";
import { AnimatedCardGrid } from "@/components/shared/animated-card";
import { showUndoToast } from "@/components/shared/undo-toast";
import { TrackCard } from "./track-card";
import {
  useAdminTracks,
  useCreateTrack,
  useDeleteTrack,
  useUpdateTrack,
  useTrackSkills,
} from "@/hooks/use-taxonomy";
import type { Track } from "@/types/taxonomy";

interface TracksPanelProps {
  onEditTrack: (track: Track) => void;
}

export function TracksPanel({ onEditTrack }: TracksPanelProps) {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTrackName, setNewTrackName] = useState("");

  const { data: tracks, isLoading, isError } = useAdminTracks();
  const createTrack = useCreateTrack();
  const deleteTrack = useDeleteTrack();
  const updateTrack = useUpdateTrack();

  const filteredTracks = useMemo(() => {
    if (!tracks) return [];
    if (!search.trim()) return tracks;
    const q = search.toLowerCase();
    return tracks.filter((t) => t.name.toLowerCase().includes(q));
  }, [tracks, search]);

  // ── Create handler ─────────────────────────────────────────────────

  function handleCreate() {
    const name = newTrackName.trim();
    if (!name) return;

    createTrack.mutate(
      { name },
      {
        onSuccess: () => {
          toast.success(`Track "${name}" created`);
          setNewTrackName("");
          setIsCreating(false);
        },
        onError: () => {
          toast.error("Failed to create track");
        },
      },
    );
  }

  // ── Delete handler (soft-delete with undo) ─────────────────────────

  function handleDelete(track: Track) {
    // Optimistically deactivate
    updateTrack.mutate(
      { id: track.id, isActive: false },
      {
        onSuccess: () => {
          showUndoToast({
            message: `"${track.name}" deactivated`,
            variant: "warning",
            undoAction: () => {
              updateTrack.mutate({ id: track.id, isActive: true });
            },
          });
        },
        onError: () => {
          toast.error("Failed to deactivate track");
        },
      },
    );
  }

  // ── Loading state ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--neutral-gray)]">
        <Loader2 size={24} className="animate-spin mb-3" />
        <p className="text-sm">Loading tracks...</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--error)]">
        <AlertCircle size={24} className="mb-3" />
        <p className="text-sm font-medium">Failed to load tracks</p>
        <p className="text-xs text-[var(--neutral-gray)] mt-1">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: search + create button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            type="text"
            placeholder="Search tracks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-2 pl-9 pr-3 text-sm placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>

        <AnimatedButton
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          New Track
        </AnimatedButton>
      </div>

      {/* Inline create form */}
      {isCreating && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3">
          <input
            type="text"
            autoFocus
            placeholder="Track name"
            value={newTrackName}
            onChange={(e) => setNewTrackName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewTrackName("");
              }
            }}
            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
          <AnimatedButton
            size="sm"
            icon={<Check size={14} />}
            onClick={handleCreate}
            loading={createTrack.isPending}
            disabled={!newTrackName.trim()}
          >
            Save
          </AnimatedButton>
          <AnimatedButton
            size="sm"
            variant="ghost"
            icon={<X size={14} />}
            onClick={() => {
              setIsCreating(false);
              setNewTrackName("");
            }}
          >
            Cancel
          </AnimatedButton>
        </div>
      )}

      {/* Card grid */}
      {filteredTracks.length > 0 ? (
        <AnimatedCardGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onEdit={onEditTrack}
              onDelete={handleDelete}
            />
          ))}
        </AnimatedCardGrid>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--neutral-gray)]">
          <Layers size={32} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {search.trim() ? "No tracks match your search" : "No tracks yet"}
          </p>
          {!search.trim() && (
            <p className="text-xs mt-1">
              Click &quot;New Track&quot; to create the first one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
