"use client";

import { useState, useEffect, useMemo } from "react";
import { Save, X, Search, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ColorPicker } from "@/components/shared/color-picker";
import { AnimatedButton } from "@/components/shared/animated-button";
import {
  useUpdateTrack,
  useTrackSkills,
  useSetTrackSkills,
  useAdminSkills,
} from "@/hooks/use-taxonomy";
import type { Track, SkillTag } from "@/types/taxonomy";

interface TrackEditPanelProps {
  track: Track | null;
  onClose: () => void;
}

export function TrackEditPanel({ track, onClose }: TrackEditPanelProps) {
  // ── Form state ────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [color, setColor] = useState("var(--primary)");
  const [isActive, setIsActive] = useState(true);

  // ── Skill association state ───────────────────────────────────────────
  const [skillSearch, setSkillSearch] = useState("");
  const [associatedSkillIds, setAssociatedSkillIds] = useState<string[]>([]);

  // ── Queries & mutations ───────────────────────────────────────────────
  const updateTrack = useUpdateTrack();
  const { data: trackSkills, isLoading: loadingSkills } = useTrackSkills(
    track?.id ?? null,
  );
  const setTrackSkills = useSetTrackSkills();
  const { data: allSkills } = useAdminSkills();

  // ── Reset form when track changes ─────────────────────────────────────
  useEffect(() => {
    if (!track) return;
    setName(track.name);
    setDescription(track.description ?? "");
    setIconName(track.iconName ?? "");
    setDisplayOrder(track.displayOrder);
    setColor(track.color);
    setIsActive(track.isActive);
    setSkillSearch("");
  }, [track]);

  // Sync associated skill ids from server data
  useEffect(() => {
    if (trackSkills) {
      setAssociatedSkillIds(trackSkills.map((s) => s.id));
    }
  }, [trackSkills]);

  // ── Derived data ──────────────────────────────────────────────────────
  const associatedSkills = useMemo(() => {
    if (!allSkills) return [];
    return allSkills.filter((s) => associatedSkillIds.includes(s.id));
  }, [allSkills, associatedSkillIds]);

  const availableSkills = useMemo(() => {
    if (!allSkills) return [];
    const q = skillSearch.toLowerCase().trim();
    return allSkills.filter(
      (s) =>
        !associatedSkillIds.includes(s.id) &&
        s.isActive &&
        (!q || s.name.toLowerCase().includes(q)),
    );
  }, [allSkills, associatedSkillIds, skillSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────
  function handleSaveDetails() {
    if (!track) return;
    updateTrack.mutate(
      {
        id: track.id,
        name: name.trim(),
        description: description.trim() || undefined,
        iconName: iconName.trim() || undefined,
        displayOrder,
        color,
        isActive,
      },
      {
        onSuccess: () => toast.success("Track updated"),
        onError: () => toast.error("Failed to update track"),
      },
    );
  }

  function handleAddSkill(skill: SkillTag) {
    setAssociatedSkillIds((prev) => [...prev, skill.id]);
  }

  function handleRemoveSkill(skillId: string) {
    setAssociatedSkillIds((prev) => prev.filter((id) => id !== skillId));
  }

  function handleSaveSkills() {
    if (!track) return;
    setTrackSkills.mutate(
      { trackId: track.id, skillIds: associatedSkillIds },
      {
        onSuccess: () => toast.success("Skill associations saved"),
        onError: () => toast.error("Failed to save skill associations"),
      },
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <SlideOverPanel
      open={!!track}
      onClose={onClose}
      title={`Edit: ${track?.name ?? ""}`}
      width="max-w-xl"
    >
      {/* Form section */}
      <div className="px-6 py-5 space-y-4 border-b border-[var(--border)]">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Icon Name</label>
            <input
              type="text"
              value={iconName}
              onChange={(e) => setIconName(e.target.value)}
              placeholder="e.g. code"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Display Order</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <ColorPicker label="Color" value={color} onChange={setColor} />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/20"
          />
          <span className="text-sm font-medium text-[var(--text-primary)]">Active</span>
        </label>

        <AnimatedButton
          icon={<Save size={14} />}
          onClick={handleSaveDetails}
          loading={updateTrack.isPending}
          disabled={!name.trim()}
        >
          Save Details
        </AnimatedButton>
      </div>

      {/* Skill associations section */}
      <div className="px-6 py-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Associated Skills</h3>

        {loadingSkills ? (
          <div className="flex items-center gap-2 text-[var(--neutral-gray)] text-sm py-4">
            <Loader2 size={14} className="animate-spin" />
            Loading skills...
          </div>
        ) : (
          <>
            {/* Current associations */}
            {associatedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {associatedSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
                  >
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="ml-0.5 p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
                      aria-label={`Remove ${skill.name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search to add */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
              />
              <input
                type="text"
                placeholder="Search skills to add..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-2 pl-8 pr-3 text-sm placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              />
            </div>

            {/* Available skills dropdown */}
            {skillSearch.trim() && availableSkills.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-0)] divide-y divide-[var(--border)]">
                {availableSkills.slice(0, 20).map((skill) => (
                  <li key={skill.id}>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddSkill(skill);
                        setSkillSearch("");
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors text-left"
                    >
                      <Plus size={12} className="text-[var(--neutral-gray)]" />
                      {skill.name}
                      {skill.category && (
                        <span className="ml-auto text-xs text-[var(--neutral-gray)]">
                          {skill.category}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {skillSearch.trim() && availableSkills.length === 0 && (
              <p className="text-xs text-[var(--neutral-gray)] py-2">
                No matching skills found.
              </p>
            )}

            <AnimatedButton
              variant="secondary"
              icon={<Save size={14} />}
              onClick={handleSaveSkills}
              loading={setTrackSkills.isPending}
            >
              Save Skills
            </AnimatedButton>
          </>
        )}
      </div>
    </SlideOverPanel>
  );
}
