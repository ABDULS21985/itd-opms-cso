import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EmployerAnalytics } from "@/types/analytics";

export function useEmployerAnalytics() {
  return useQuery({
    queryKey: ["employer-analytics"],
    queryFn: () => apiClient.get<EmployerAnalytics>("/employer/analytics"),
  });
}
