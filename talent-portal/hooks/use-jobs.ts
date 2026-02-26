import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { JobPost, JobApplication } from "@/types/job";
import type { PaginatedResponse } from "@/types/api";

// ──────────────────────────────────────────────
// Public job browsing
// ──────────────────────────────────────────────

export function useJobs(filters: Record<string, any>) {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobPost>>("/jobs", filters),
  });
}

export function useJobBySlug(slug: string) {
  return useQuery({
    queryKey: ["job", slug],
    queryFn: () => apiClient.get<JobPost>(`/jobs/${slug}`),
    enabled: !!slug,
  });
}

// ──────────────────────────────────────────────
// Employer job management
// ──────────────────────────────────────────────

export function useEmployerJobs(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["employer-jobs", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobPost>>("/employers/me/jobs", filters),
  });
}

export function useEmployerJob(jobId: string) {
  return useQuery({
    queryKey: ["employer-job", jobId],
    queryFn: () => apiClient.get<JobPost>(`/employers/me/jobs/${jobId}`),
    enabled: !!jobId,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<JobPost>) =>
      apiClient.post<JobPost>("/employers/me/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: Partial<JobPost> }) =>
      apiClient.put<JobPost>(`/employers/me/jobs/${jobId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-job", variables.jobId] });
    },
  });
}

export function usePublishJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post<JobPost>(`/employers/me/jobs/${jobId}/publish`),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-job", jobId] });
    },
  });
}

export function useCloseJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post<JobPost>(`/employers/me/jobs/${jobId}/close`),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-job", jobId] });
    },
  });
}

// ──────────────────────────────────────────────
// Job applications (employer view)
// ──────────────────────────────────────────────

export function useJobApplications(jobId: string, filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["job-applications", jobId, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobApplication>>(
        `/employers/me/jobs/${jobId}/applications`,
        filters,
      ),
    enabled: !!jobId,
  });
}

// ──────────────────────────────────────────────
// Candidate job application
// ──────────────────────────────────────────────

export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { jobId: string; coverNote?: string; cvDocumentId?: string }) =>
      apiClient.post<JobApplication>(`/jobs/${data.jobId}/apply`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
}

export function useMyApplications(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["my-applications", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobApplication>>("/me/applications", filters),
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) =>
      apiClient.put(`/me/applications/${applicationId}/withdraw`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
}
