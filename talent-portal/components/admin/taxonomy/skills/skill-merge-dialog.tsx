"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Merge, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useMergeSkills, useAdminSkills } from "@/hooks/use-taxonomy";
import { cn } from "@/lib/utils";

interface SkillMergeDialogProps {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
}

export function SkillMergeDialog({ open, selectedIds, onClose }: SkillMergeDialogProps) {
  const { data: allSkills = [] } = useAdminSkills();
  const mergeSkills = useMergeSkills();

  const selectedSkills = useMemo(
    () => allSkills.filter((s) => selectedIds.includes(s.id)),
    [allSkills, selectedIds],
  );

  const totalUsage = useMemo(
    () => selectedSkills.reduce((sum, s) => sum + s.usageCount, 0),
    [selectedSkills],
  );

  const [targetName, setTargetName] = useState("");
  const [targetCategory, setTargetCategory] = useState("");

  // Pre-fill from first selected skill whenever dialog opens
  useEffect(() => {
    if (open && selectedSkills.length > 0) {
      setTargetName(selectedSkills[0].name);
      setTargetCategory(selectedSkills[0].category ?? "");
    }
  }, [open, selectedSkills]);

  if (!open) return null;

  const handleMerge = () => {
    if (!targetName.trim()) {
      toast.error("Target name is required");
      return;
    }

    mergeSkills.mutate(
      {
        sourceIds: selectedIds,
        targetName: targetName.trim(),
        targetCategory: targetCategory.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Skills merged successfully");
          onClose();
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to merge skills");
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface-0)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Merge Skills</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Selected skills list */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--neutral-gray)]">
              Skills to merge ({selectedSkills.length})
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
              {selectedSkills.length === 0 ? (
                <div className="flex items-center gap-2 py-2 text-sm text-[var(--neutral-gray)]">
                  <AlertCircle size={14} />
                  <span>No skills found for selected IDs</span>
                </div>
              ) : (
                selectedSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--surface-1)]"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{skill.name}</span>
                    <span className="text-xs text-[var(--neutral-gray)]">{skill.usageCount} uses</span>
                  </div>
                ))
              )}
            </div>
            <p className="mt-1.5 text-xs text-[var(--neutral-gray)]">
              Total combined usage: <span className="font-semibold">{totalUsage}</span>
            </p>
          </div>

          {/* Target name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Target Name</label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="Merged skill name"
              className={cn(
                "w-full rounded-xl border bg-[var(--surface-1)] px-3 py-2 text-sm outline-none transition-colors",
                !targetName.trim()
                  ? "border-[var(--error)] focus:border-[var(--error)]"
                  : "border-[var(--border)] focus:border-[var(--primary)]",
              )}
            />
          </div>

          {/* Target category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Target Category <span className="text-[var(--neutral-gray)]">(optional)</span>
            </label>
            <input
              type="text"
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              placeholder="Category"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            onClick={onClose}
            disabled={mergeSkills.isPending}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={mergeSkills.isPending || !targetName.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {mergeSkills.isPending ? <Loader2 size={14} className="animate-spin" /> : <Merge size={14} />}
            Merge {selectedSkills.length} Skills
          </button>
        </div>
      </div>
    </div>
  );
}
