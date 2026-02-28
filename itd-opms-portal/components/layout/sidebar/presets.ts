export type PresetId = "full" | "essentials" | "manager" | "technical" | "custom";

export interface SidebarPreset {
  id: PresetId;
  label: string;
  description: string;
  visibleSections: string[]; // empty = show all
}

export const SIDEBAR_PRESETS: Record<PresetId, SidebarPreset> = {
  full: {
    id: "full",
    label: "Full Access",
    description: "All modules visible",
    visibleSections: [],
  },
  essentials: {
    id: "essentials",
    label: "Essentials",
    description: "Core modules for daily operations",
    visibleSections: ["Overview", "ITSM", "Planning", "Knowledge", "Analytics"],
  },
  manager: {
    id: "manager",
    label: "Manager View",
    description: "Governance, planning, and people management",
    visibleSections: ["Overview", "Governance", "People", "Planning", "GRC", "Analytics"],
  },
  technical: {
    id: "technical",
    label: "Technical",
    description: "ITSM, assets, and infrastructure",
    visibleSections: ["Overview", "ITSM", "Assets", "Knowledge", "Analytics"],
  },
  custom: {
    id: "custom",
    label: "Custom",
    description: "Your personalized layout",
    visibleSections: [],
  },
};

export const PRESET_ORDER: PresetId[] = [
  "full",
  "essentials",
  "manager",
  "technical",
  "custom",
];
