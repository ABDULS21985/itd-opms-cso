import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CandidateProfile } from "@/types/candidate";
import type { EmployerOrg } from "@/types/employer";
import type { JobPost } from "@/types/job";
import type { IntroRequest } from "@/types/intro-request";
import type { PaginatedResponse } from "@/types/api";

// ──────────────────────────────────────────────
// Audit log types
// ──────────────────────────────────────────────

export interface AuditLog {
  id: string;
  createdAt: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}

export interface AdminUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  displayName: string | null;
  userType: string;
  permissions: string[];
  roles: { role: string }[];
  lastActiveAt: string | null;
}

// ──────────────────────────────────────────────
// Admin candidate management
// ──────────────────────────────────────────────

export function useAdminCandidates(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["admin-candidates", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CandidateProfile>>(
        "/admin/candidates",
        filters,
      ),
  });
}

export function useApproveCandidateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) =>
      apiClient.post<CandidateProfile>(
        `/admin/candidates/${candidateId}/approve`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-candidates"] });
    },
  });
}

export function useRejectCandidateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      reason,
    }: {
      candidateId: string;
      reason?: string;
    }) =>
      apiClient.post<CandidateProfile>(
        `/admin/candidates/${candidateId}/reject`,
        { reason },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-candidates"] });
    },
  });
}

export function useSuspendCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, reason }: { candidateId: string; reason?: string }) =>
      apiClient.post<CandidateProfile>(`/admin/candidates/${candidateId}/suspend`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-candidates"] });
    },
  });
}

export function useArchiveCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) =>
      apiClient.post<CandidateProfile>(`/admin/candidates/${candidateId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-candidates"] });
    },
  });
}

// ──────────────────────────────────────────────
// Admin employer management
// ──────────────────────────────────────────────

export function useAdminEmployers(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["admin-employers", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<EmployerOrg>>(
        "/admin/employers",
        filters,
      ),
  });
}

export function useAdminEmployerStats() {
  return useQuery({
    queryKey: ["admin-employer-stats"],
    queryFn: () =>
      apiClient.get<{ total: number; pending: number; verified: number; rejected: number; suspended: number }>(
        "/admin/employers/stats",
      ),
  });
}

export function useVerifyEmployer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employerId: string) =>
      apiClient.post<EmployerOrg>(
        `/admin/employers/${employerId}/verify`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employers"] });
    },
  });
}

export function useRejectEmployer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employerId, reason }: { employerId: string; reason: string }) =>
      apiClient.post<EmployerOrg>(`/admin/employers/${employerId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employers"] });
    },
  });
}

export function useSuspendEmployer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employerId, reason }: { employerId: string; reason: string }) =>
      apiClient.post<EmployerOrg>(`/admin/employers/${employerId}/suspend`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employers"] });
    },
  });
}

// ──────────────────────────────────────────────
// Admin job management
// ──────────────────────────────────────────────

export function useAdminJobs(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["admin-jobs", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobPost>>("/admin/jobs", filters),
  });
}

export function useApproveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post<JobPost>(`/admin/jobs/${jobId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
  });
}

export function useRejectJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason?: string }) =>
      apiClient.post<JobPost>(`/admin/jobs/${jobId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
  });
}

// ──────────────────────────────────────────────
// Admin intro request management
// ──────────────────────────────────────────────

export function useAdminIntroRequests(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["admin-intro-requests", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<IntroRequest>>(
        "/admin/intro-requests",
        filters,
      ),
  });
}

export function useApproveIntroRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (introRequestId: string) =>
      apiClient.post<IntroRequest>(
        `/admin/intro-requests/${introRequestId}/approve`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-intro-requests"] });
    },
  });
}

export function useDeclineIntroRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post<IntroRequest>(`/admin/intro-requests/${id}/decline`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-intro-requests"] });
    },
  });
}

export function useRequestInfoIntroRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<IntroRequest>(`/admin/intro-requests/${id}/request-info`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-intro-requests"] });
    },
  });
}

// ──────────────────────────────────────────────
// Admin audit logs
// ──────────────────────────────────────────────

export function useAuditLogs(
  filters?: Record<string, any>,
  queryOptions?: { refetchInterval?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: ["admin-audit-logs", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AuditLog>>(
        "/admin/audit-logs",
        filters,
      ),
    ...queryOptions,
  });
}

// ──────────────────────────────────────────────
// Admin user management
// ──────────────────────────────────────────────

export function useAdminUsers(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AdminUser>>("/admin/users", filters),
  });
}

export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => apiClient.get<AdminUser>(`/admin/users/${userId}`),
    enabled: !!userId,
  });
}

export function useAssignRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) =>
      apiClient.put(`/admin/users/${userId}/roles`, { roles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
    },
  });
}

export function useUpdatePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: string[] }) =>
      apiClient.put(`/admin/users/${userId}/permissions`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      apiClient.post(`/admin/users/${userId}/suspend`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/admin/users/${userId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
    },
  });
}

export function useUserAuditLogs(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-audit-logs", userId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AuditLog>>("/admin/audit-logs", {
        actorId: userId!,
        limit: 20,
        sort: "createdAt",
        order: "desc",
      }),
    enabled: !!userId,
  });
}

// ──────────────────────────────────────────────
// Admin taxonomy management
// ──────────────────────────────────────────────

export function useAdminSkills() {
  return useQuery({
    queryKey: ["admin-taxonomy-skills"],
    queryFn: () => apiClient.get<any[]>("/admin/taxonomy/skills"),
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug?: string }) =>
      apiClient.post("/admin/taxonomy/skills", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-skills"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-skills"] });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      apiClient.put(`/admin/taxonomy/skills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-skills"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-skills"] });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/taxonomy/skills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-skills"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-skills"] });
    },
  });
}

export function useAdminTracks() {
  return useQuery({
    queryKey: ["admin-taxonomy-tracks"],
    queryFn: () => apiClient.get<any[]>("/admin/taxonomy/tracks"),
  });
}

export function useCreateTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug?: string; description?: string }) =>
      apiClient.post("/admin/taxonomy/tracks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-tracks"] });
    },
  });
}

export function useUpdateTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      apiClient.put(`/admin/taxonomy/tracks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-tracks"] });
    },
  });
}

export function useAdminCohorts() {
  return useQuery({
    queryKey: ["admin-taxonomy-cohorts"],
    queryFn: () => apiClient.get<any[]>("/admin/taxonomy/cohorts"),
  });
}

export function useCreateCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiClient.post("/admin/taxonomy/cohorts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-cohorts"] });
    },
  });
}

export function useUpdateCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      apiClient.put(`/admin/taxonomy/cohorts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-cohorts"] });
    },
  });
}

export function useAdminLocations() {
  return useQuery({
    queryKey: ["admin-taxonomy-locations"],
    queryFn: () => apiClient.get<any[]>("/admin/taxonomy/locations"),
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { city: string; country: string; countryCode?: string }) =>
      apiClient.post("/admin/taxonomy/locations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-locations"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-locations"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { city?: string; country?: string; isActive?: boolean } }) =>
      apiClient.put(`/admin/taxonomy/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-taxonomy-locations"] });
      queryClient.invalidateQueries({ queryKey: ["taxonomy-locations"] });
    },
  });
}
