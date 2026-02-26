import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EmployerOrg } from "@/types/employer";

// ──────────────────────────────────────────────
// Employer self-service
// ──────────────────────────────────────────────

export function useMyEmployerOrg() {
  return useQuery({
    queryKey: ["my-employer-org"],
    queryFn: () => apiClient.get<EmployerOrg>("/employers/me"),
  });
}

export function useRegisterEmployer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      companyName: string;
      websiteUrl?: string;
      description?: string;
      sector?: string;
      locationHq?: string;
      country?: string;
      contactName: string;
      roleTitle?: string;
      phone?: string;
    }) => apiClient.post<EmployerOrg>("/employers/register", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employer-org"] });
    },
  });
}

export function useUpdateEmployerOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EmployerOrg>) =>
      apiClient.put<EmployerOrg>("/employers/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employer-org"] });
    },
  });
}

export function useUploadEmployerLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<{ url: string }>("/employers/me/logo", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employer-org"] });
    },
  });
}
