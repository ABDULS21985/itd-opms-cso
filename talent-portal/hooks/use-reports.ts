import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ──────────────────────────────────────────────
// Report types
// ──────────────────────────────────────────────

export interface ReportsOverview {
  candidates: { total: number; approved: number };
  employers: { total: number; verified: number };
  jobs: { total: number; published: number };
  placements: { total: number; active: number };
  introRequests: { total: number };
}

export interface CandidateReport {
  totalProfiles: number;
  approvedProfiles: number;
  pendingProfiles: number;
  byTrack: { track: string; count: number }[];
  byStatus: { status: string; count: string }[];
  byAvailability: { status: string; count: number }[];
  byLocation: { country: string; count: number }[];
}

export interface JobReport {
  totalJobs: number;
  publishedJobs: number;
  closedJobs: number;
  byType: { type: string; count: number }[];
  byExperienceLevel: { level: string; count: number }[];
  applicationStats: { jobId: string; title: string; applications: number }[];
}

export interface PlacementReport {
  totalPlacements: number;
  activePlacements: number;
  completedPlacements: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  averageTimeToPlace: number;
}

export interface EmployerReport {
  totalEmployers: number;
  verifiedEmployers: number;
  pendingEmployers: number;
  bySector: { sector: string; count: string }[];
  totalJobsPosted: number;
  totalIntroRequests: number;
}

export interface TimeMetrics {
  avgDaysToResponse: number;
  avgDaysToPlacement: number;
  avgDaysToInterview: number;
  introsByStatus: { status: string; count: string }[];
}

export interface SkillDemand {
  skillId: string;
  skillName: string;
  category: string;
  demandCount: number;
  requiredCount: number;
  niceToHaveCount: number;
}

export interface ExportRequest {
  reportType: "candidates" | "jobs" | "placements" | "overview";
  format: "csv" | "xlsx" | "pdf";
  filters?: Record<string, string | number | boolean | undefined>;
}

export interface ExportResponse {
  downloadUrl: string;
  fileName: string;
}

// ──────────────────────────────────────────────
// Admin report queries
// ──────────────────────────────────────────────

export function useReportsOverview() {
  return useQuery({
    queryKey: ["reports-overview"],
    queryFn: () =>
      apiClient.get<ReportsOverview>("/admin/reports/overview"),
  });
}

export function useCandidateReports() {
  return useQuery({
    queryKey: ["reports-candidates"],
    queryFn: () =>
      apiClient.get<CandidateReport>("/admin/reports/candidates"),
  });
}

export function useJobReports() {
  return useQuery({
    queryKey: ["reports-jobs"],
    queryFn: () => apiClient.get<JobReport>("/admin/reports/jobs"),
  });
}

export function usePlacementReports() {
  return useQuery({
    queryKey: ["reports-placements"],
    queryFn: () =>
      apiClient.get<PlacementReport>("/admin/reports/placements"),
  });
}

export function useEmployerReports() {
  return useQuery({
    queryKey: ["reports-employers"],
    queryFn: () =>
      apiClient.get<EmployerReport>("/admin/reports/employers"),
  });
}

export function useTimeMetrics() {
  return useQuery({
    queryKey: ["reports-time-metrics"],
    queryFn: () =>
      apiClient.get<TimeMetrics>("/admin/reports/time-metrics"),
  });
}

export function useSkillsDemand(limit = 15) {
  return useQuery({
    queryKey: ["reports-skills-demand", limit],
    queryFn: () =>
      apiClient.get<SkillDemand[]>(`/admin/reports/skills-demand?limit=${limit}`),
  });
}

// ──────────────────────────────────────────────
// Admin report export
// ──────────────────────────────────────────────

export function useExportReport() {
  return useMutation({
    mutationFn: (data: ExportRequest) =>
      apiClient.post<ExportResponse>("/admin/reports/export", data),
  });
}
