import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { JobTemplate } from "@/types/analytics";

export function useJobTemplates() {
  return useQuery({
    queryKey: ["job-templates"],
    queryFn: () => apiClient.get<JobTemplate[]>("/employers/me/jobs/templates"),
  });
}

export function useCreateJobTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; templateData: Record<string, unknown> }) =>
      apiClient.post<JobTemplate>("/employers/me/jobs/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-templates"] });
    },
  });
}

export function useDeleteJobTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/employers/me/jobs/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-templates"] });
    },
  });
}

export function useSuggestSkills(title: string) {
  return useQuery({
    queryKey: ["suggest-skills", title],
    queryFn: () =>
      apiClient.get<{ id: string; name: string; slug: string; category: string | null }[]>(
        "/employers/me/jobs/suggest-skills",
        { title },
      ),
    enabled: title.length >= 3,
  });
}

export function useDetectSimilarJobs(title: string) {
  return useQuery({
    queryKey: ["similar-jobs", title],
    queryFn: () =>
      apiClient.get<{ id: string; title: string; status: string; createdAt: string }[]>(
        "/employers/me/jobs/detect-similar",
        { title },
      ),
    enabled: title.length >= 3,
  });
}
