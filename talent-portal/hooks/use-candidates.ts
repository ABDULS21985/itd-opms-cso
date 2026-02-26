import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CandidateProfile,
  CandidateSkill,
  CandidateProject,
  CandidateConsent,
  ProfileStrength,
} from "@/types/candidate";
import type { PaginatedResponse } from "@/types/api";

// ──────────────────────────────────────────────
// Public talent browsing
// ──────────────────────────────────────────────

export function useTalents(filters: Record<string, any>) {
  return useQuery({
    queryKey: ["talents", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CandidateProfile>>("/talents", filters),
  });
}

export function useTalentBySlug(slug: string) {
  return useQuery({
    queryKey: ["talent", slug],
    queryFn: () => apiClient.get<CandidateProfile>(`/talents/${slug}`),
    enabled: !!slug,
  });
}

// ──────────────────────────────────────────────
// Self-service profile
// ──────────────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: () => apiClient.get<CandidateProfile>("/me/profile"),
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CandidateProfile>) =>
      apiClient.post<CandidateProfile>("/me/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CandidateProfile>) =>
      apiClient.put<CandidateProfile>("/me/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useSubmitProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<CandidateProfile>("/me/profile/submit"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<{ url: string }>("/me/profile/photo", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useProfileStrength() {
  return useQuery({
    queryKey: ["profile-strength"],
    queryFn: () => apiClient.get<ProfileStrength>("/me/profile/strength"),
  });
}

// ──────────────────────────────────────────────
// Skills
// ──────────────────────────────────────────────

export function useUpdateSkills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { skillIds: string[] }) =>
      apiClient.put<CandidateSkill[]>("/me/skills", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

// ──────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────

export function useMyProjects() {
  return useQuery({
    queryKey: ["my-projects"],
    queryFn: () => apiClient.get<CandidateProject[]>("/me/projects"),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CandidateProject>) =>
      apiClient.post<CandidateProject>("/me/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<CandidateProject> }) =>
      apiClient.put<CandidateProject>(`/me/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      apiClient.delete(`/me/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

// ──────────────────────────────────────────────
// Documents
// ──────────────────────────────────────────────

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload("/me/documents/upload", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

// ──────────────────────────────────────────────
// Consents
// ──────────────────────────────────────────────

export function useMyConsents() {
  return useQuery({
    queryKey: ["my-consents"],
    queryFn: () => apiClient.get<CandidateConsent[]>("/me/consents"),
  });
}

export function useGrantConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { consentType: string; granted: boolean }) =>
      apiClient.post<CandidateConsent>("/me/consents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-consents"] });
    },
  });
}

// ──────────────────────────────────────────────
// Settings (visibility + notification prefs)
// ──────────────────────────────────────────────

export function useMySettings() {
  return useQuery({
    queryKey: ["my-settings"],
    queryFn: () => apiClient.get("/me/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiClient.put("/me/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

