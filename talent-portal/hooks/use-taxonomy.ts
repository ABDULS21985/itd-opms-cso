import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  SkillTag,
  Track,
  Cohort,
  Location,
  TaxonomyStats,
  SkillCoOccurrence,
  SkillUsageTrend,
  SkillTrackAssociation,
  LocationTreeNode,
  CsvImportResult,
  CohortCandidate,
} from "@/types/taxonomy";

const FIVE_MINUTES = 5 * 60 * 1000;

// ── Public taxonomy queries (heavily cached) ──────────────────────────

export function useSkills() {
  return useQuery({
    queryKey: ["taxonomy-skills"],
    queryFn: () => apiClient.get<SkillTag[]>("/taxonomy/skills"),
    staleTime: FIVE_MINUTES,
  });
}

export function useTracks() {
  return useQuery({
    queryKey: ["taxonomy-tracks"],
    queryFn: () => apiClient.get<Track[]>("/taxonomy/tracks"),
    staleTime: FIVE_MINUTES,
  });
}

export function useCohorts() {
  return useQuery({
    queryKey: ["taxonomy-cohorts"],
    queryFn: () => apiClient.get<Cohort[]>("/taxonomy/cohorts"),
    staleTime: FIVE_MINUTES,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ["taxonomy-locations"],
    queryFn: () => apiClient.get<Location[]>("/taxonomy/locations"),
    staleTime: FIVE_MINUTES,
  });
}

// ── Admin taxonomy queries ────────────────────────────────────────────

export function useAdminSkills() {
  return useQuery({
    queryKey: ["admin-taxonomy-skills"],
    queryFn: () => apiClient.get<SkillTag[]>("/admin/taxonomy/skills"),
  });
}

export function useAdminTracks() {
  return useQuery({
    queryKey: ["admin-taxonomy-tracks"],
    queryFn: () => apiClient.get<Track[]>("/admin/taxonomy/tracks"),
  });
}

export function useAdminCohorts() {
  return useQuery({
    queryKey: ["admin-taxonomy-cohorts"],
    queryFn: () => apiClient.get<Cohort[]>("/admin/taxonomy/cohorts"),
  });
}

export function useAdminLocations() {
  return useQuery({
    queryKey: ["admin-taxonomy-locations"],
    queryFn: () => apiClient.get<Location[]>("/admin/taxonomy/locations"),
  });
}

export function useTaxonomyStats() {
  return useQuery({
    queryKey: ["admin-taxonomy-stats"],
    queryFn: () => apiClient.get<TaxonomyStats>("/admin/taxonomy/stats"),
  });
}

export function useSkillCoOccurrence(skillId: string | null) {
  return useQuery({
    queryKey: ["admin-taxonomy-skill-co-occurrence", skillId],
    queryFn: () =>
      apiClient.get<SkillCoOccurrence[]>(
        `/admin/taxonomy/skills/${skillId}/co-occurrence`,
      ),
    enabled: !!skillId,
  });
}

export function useSkillUsageTrend(skillId: string | null) {
  return useQuery({
    queryKey: ["admin-taxonomy-skill-usage-trend", skillId],
    queryFn: () =>
      apiClient.get<SkillUsageTrend[]>(
        `/admin/taxonomy/skills/${skillId}/usage-trend`,
      ),
    enabled: !!skillId,
  });
}

export function useTrackSkills(trackId: string | null) {
  return useQuery({
    queryKey: ["admin-taxonomy-track-skills", trackId],
    queryFn: () =>
      apiClient.get<SkillTag[]>(`/admin/taxonomy/tracks/${trackId}/skills`),
    enabled: !!trackId,
  });
}

export function useCohortCandidates(cohortId: string | null) {
  return useQuery({
    queryKey: ["admin-taxonomy-cohort-candidates", cohortId],
    queryFn: () =>
      apiClient.get<CohortCandidate[]>(
        `/admin/taxonomy/cohorts/${cohortId}/candidates`,
      ),
    enabled: !!cohortId,
  });
}

export function useLocationTree() {
  return useQuery({
    queryKey: ["admin-taxonomy-location-tree"],
    queryFn: () =>
      apiClient.get<LocationTreeNode[]>("/admin/taxonomy/locations/tree"),
  });
}

// ── Mutations: Skills ─────────────────────────────────────────────────

function invalidateTaxonomy(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-skills"] });
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-stats"] });
  qc.invalidateQueries({ queryKey: ["taxonomy-skills"] });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category?: string }) =>
      apiClient.post<SkillTag>("/admin/taxonomy/skills", data),
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      category?: string;
      isActive?: boolean;
    }) => apiClient.put<SkillTag>(`/admin/taxonomy/skills/${id}`, data),
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<SkillTag>(`/admin/taxonomy/skills/${id}`),
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useMergeSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sourceIds: string[];
      targetName: string;
      targetCategory?: string;
    }) => apiClient.post<SkillTag>("/admin/taxonomy/skills/merge", data),
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useReorderSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; displayOrder: number }[]) =>
      apiClient.put<void>("/admin/taxonomy/skills/reorder", { items }),
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useBulkImportSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skills: { name: string; category?: string }[]) =>
      apiClient.post<CsvImportResult>("/admin/taxonomy/skills/import", {
        skills,
      }),
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

// ── Mutations: Tracks ─────────────────────────────────────────────────

function invalidateTracks(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-tracks"] });
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-stats"] });
  qc.invalidateQueries({ queryKey: ["taxonomy-tracks"] });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      iconName?: string;
      displayOrder?: number;
      color?: string;
    }) => apiClient.post<Track>("/admin/taxonomy/tracks", data),
    onSuccess: () => invalidateTracks(qc),
  });
}

export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      iconName?: string;
      displayOrder?: number;
      color?: string;
      isActive?: boolean;
    }) => apiClient.put<Track>(`/admin/taxonomy/tracks/${id}`, data),
    onSuccess: () => invalidateTracks(qc),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<Track>(`/admin/taxonomy/tracks/${id}`),
    onSuccess: () => invalidateTracks(qc),
  });
}

export function useReorderTracks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; displayOrder: number }[]) =>
      apiClient.put<void>("/admin/taxonomy/tracks/reorder", { items }),
    onSuccess: () => invalidateTracks(qc),
  });
}

export function useSetTrackSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trackId, skillIds }: { trackId: string; skillIds: string[] }) =>
      apiClient.put<SkillTag[]>(`/admin/taxonomy/tracks/${trackId}/skills`, {
        skillIds,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["admin-taxonomy-track-skills", vars.trackId],
      });
    },
  });
}

// ── Mutations: Cohorts ────────────────────────────────────────────────

function invalidateCohorts(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-cohorts"] });
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-stats"] });
  qc.invalidateQueries({ queryKey: ["taxonomy-cohorts"] });
}

export function useCreateCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      programCycle?: string;
      startDate?: string;
      endDate?: string;
      capacity?: number;
    }) => apiClient.post<Cohort>("/admin/taxonomy/cohorts", data),
    onSuccess: () => invalidateCohorts(qc),
  });
}

export function useUpdateCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      programCycle?: string;
      startDate?: string;
      endDate?: string;
      capacity?: number;
      isActive?: boolean;
    }) => apiClient.put<Cohort>(`/admin/taxonomy/cohorts/${id}`, data),
    onSuccess: () => invalidateCohorts(qc),
  });
}

export function useDeleteCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<Cohort>(`/admin/taxonomy/cohorts/${id}`),
    onSuccess: () => invalidateCohorts(qc),
  });
}

// ── Mutations: Locations ──────────────────────────────────────────────

function invalidateLocations(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-locations"] });
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-location-tree"] });
  qc.invalidateQueries({ queryKey: ["admin-taxonomy-stats"] });
  qc.invalidateQueries({ queryKey: ["taxonomy-locations"] });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      city: string;
      country: string;
      countryCode?: string;
      timezone?: string;
    }) => apiClient.post<Location>("/admin/taxonomy/locations", data),
    onSuccess: () => invalidateLocations(qc),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      city?: string;
      country?: string;
      countryCode?: string;
      timezone?: string;
      isActive?: boolean;
    }) => apiClient.put<Location>(`/admin/taxonomy/locations/${id}`, data),
    onSuccess: () => invalidateLocations(qc),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<Location>(`/admin/taxonomy/locations/${id}`),
    onSuccess: () => invalidateLocations(qc),
  });
}

// ── Export ─────────────────────────────────────────────────────────────

export function useExportTaxonomy() {
  return useMutation({
    mutationFn: async ({
      type,
      format = "csv",
    }: {
      type: "skills" | "tracks" | "cohorts" | "locations";
      format?: "csv" | "json";
    }) => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;
      const baseUrl =
        process.env.NEXT_PUBLIC_TALENT_API_URL || "http://localhost:4002/api/v1";
      const url = `${baseUrl}/admin/taxonomy/export?type=${type}&format=${format}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const ext = format === "json" ? "json" : "csv";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `taxonomy-${type}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  });
}
