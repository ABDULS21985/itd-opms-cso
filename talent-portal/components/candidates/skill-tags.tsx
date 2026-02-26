"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import type { CandidateSkill } from "@/types/candidate";
import type { SkillTag } from "@/types/taxonomy";

// ---------------------------------------------------------------------------
// Display Mode
// ---------------------------------------------------------------------------

interface SkillTagsDisplayProps {
  skills: CandidateSkill[];
  showVerified?: boolean;
}

export function SkillTagsDisplay({
  skills,
  showVerified = true,
}: SkillTagsDisplayProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((cs) => {
        const name = cs.skill?.name ?? cs.customTagName ?? "Unknown";
        return (
          <span
            key={cs.id}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-1)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]"
          >
            {showVerified && cs.isVerified && (
              <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
            )}
            {name}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selector Mode
// ---------------------------------------------------------------------------

interface SkillTagsSelectorProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  available: SkillTag[];
}

export function SkillTagsSelector({
  selected,
  onChange,
  available,
}: SkillTagsSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const lower = search.toLowerCase();
    return available.filter((s) => s.name.toLowerCase().includes(lower));
  }, [available, search]);

  const selectedTags = useMemo(
    () => available.filter((s) => selected.includes(s.id)),
    [available, selected],
  );

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function remove(id: string) {
    onChange(selected.filter((s) => s !== id));
  }

  return (
    <div className="relative">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => remove(tag.id)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/20"
                aria-label={`Remove ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-gray)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search skills..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--neutral-gray)]">
                No skills found
              </p>
            ) : (
              filtered.map((skill) => {
                const isSelected = selected.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggle(skill.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-1)] ${
                      isSelected
                        ? "bg-[var(--primary)]/5 text-[var(--primary)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)]"
                          : "border-[var(--surface-4)]"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </span>
                    <span className="truncate">{skill.name}</span>
                    {skill.category && (
                      <span className="ml-auto shrink-0 text-xs text-[var(--neutral-gray)]">
                        {skill.category}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
