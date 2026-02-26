export interface SkillTag {
  id: string;
  createdAt: string;
  updatedAt: string;

  name: string;
  slug: string;
  category: string | null;
  isActive: boolean;
  usageCount: number;
}

export interface Track {
  id: string;
  createdAt: string;
  updatedAt: string;

  name: string;
  slug: string;
  description: string | null;
  iconName: string | null;
  displayOrder: number;
  color: string;
  isActive: boolean;
}

export interface Cohort {
  id: string;
  createdAt: string;
  updatedAt: string;

  name: string;
  slug: string;
  programCycle: string | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number;
  enrolledCount: number;
  isActive: boolean;
}

export interface Location {
  id: string;
  createdAt: string;
  updatedAt: string;

  city: string;
  country: string;
  countryCode: string | null;
  timezone: string | null;
  isActive: boolean;
}

// ── Advanced Types ──────────────────────────────────────────────────────

export interface TaxonomyStats {
  totalSkills: number;
  activeSkills: number;
  inactiveSkills: number;
  totalTracks: number;
  activeTracks: number;
  totalCohorts: number;
  activeCohorts: number;
  totalLocations: number;
  activeLocations: number;
}

export interface SkillCoOccurrence {
  skillId: string;
  skillName: string;
  coOccurrenceCount: number;
}

export interface SkillUsageTrend {
  month: string;
  count: number;
}

export interface SkillTrackAssociation {
  id: string;
  skillId: string;
  trackId: string;
  displayOrder: number;
  skill?: SkillTag;
}

export interface LocationTreeNode {
  country: string;
  countryCode: string | null;
  totalCities: number;
  activeCities: number;
  locations: Location[];
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: { name: string; message: string }[];
}

export interface CohortCandidate {
  id: string;
  fullName: string;
  email: string;
  profileStatus: string;
}
