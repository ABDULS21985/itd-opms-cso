"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TaxonomyStatsHeader } from "@/components/admin/taxonomy/taxonomy-stats-header";
import { TaxonomyTabs, type Tab } from "@/components/admin/taxonomy/taxonomy-tabs";
import { SkillsPanel } from "@/components/admin/taxonomy/skills/skills-panel";
import { SkillMergeDialog } from "@/components/admin/taxonomy/skills/skill-merge-dialog";
import { SkillImportDialog } from "@/components/admin/taxonomy/skills/skill-import-dialog";
import { TracksPanel } from "@/components/admin/taxonomy/tracks/tracks-panel";
import { TrackEditPanel } from "@/components/admin/taxonomy/tracks/track-edit-panel";
import { CohortsPanel } from "@/components/admin/taxonomy/cohorts/cohorts-panel";
import { LocationsPanel } from "@/components/admin/taxonomy/locations/locations-panel";
import {
  useAdminSkills,
  useAdminTracks,
  useAdminCohorts,
  useAdminLocations,
  useExportTaxonomy,
} from "@/hooks/use-taxonomy";
import type { Track } from "@/types/taxonomy";
import { tabContentVariants } from "@/lib/motion-variants";

export default function AdminTaxonomyPage() {
  const [activeTab, setActiveTab] = useState<Tab>("skills");

  // Counts for tab badges
  const { data: skills } = useAdminSkills();
  const { data: tracks } = useAdminTracks();
  const { data: cohorts } = useAdminCohorts();
  const { data: locations } = useAdminLocations();

  const counts = {
    skills: skills?.length ?? 0,
    tracks: tracks?.length ?? 0,
    cohorts: cohorts?.length ?? 0,
    locations: locations?.length ?? 0,
  };

  // Skills dialogs
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const exportTaxonomy = useExportTaxonomy();

  // Track edit panel
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  const handleMerge = (ids: string[]) => {
    setMergeIds(ids);
    setMergeOpen(true);
  };

  const handleExport = () => {
    const typeMap: Record<Tab, "skills" | "tracks" | "cohorts" | "locations"> = {
      skills: "skills",
      tracks: "tracks",
      cohorts: "cohorts",
      locations: "locations",
    };
    exportTaxonomy.mutate({ type: typeMap[activeTab], format: "csv" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Taxonomy Management
        </h1>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">
          Manage skills, tracks, cohorts, and locations used across the platform.
        </p>
      </div>

      {/* Stats dashboard */}
      <TaxonomyStatsHeader />

      {/* Tabs */}
      <TaxonomyTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="tabpanel"
        >
          {activeTab === "skills" && (
            <SkillsPanel
              onMergeClick={handleMerge}
              onImportClick={() => setImportOpen(true)}
              onExportClick={handleExport}
            />
          )}
          {activeTab === "tracks" && (
            <TracksPanel onEditTrack={setEditingTrack} />
          )}
          {activeTab === "cohorts" && <CohortsPanel />}
          {activeTab === "locations" && <LocationsPanel />}
        </motion.div>
      </AnimatePresence>

      {/* Skill dialogs */}
      <SkillMergeDialog
        open={mergeOpen}
        selectedIds={mergeIds}
        onClose={() => {
          setMergeOpen(false);
          setMergeIds([]);
        }}
      />
      <SkillImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      {/* Track edit slide-over */}
      <TrackEditPanel
        track={editingTrack}
        onClose={() => setEditingTrack(null)}
      />
    </div>
  );
}
