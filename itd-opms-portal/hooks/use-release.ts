import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Release,
  ReleaseItem,
  ReleaseDeployment,
  ReleaseApproval,
  ReleaseStats,
  ReleaseCalendarEvent,
} from "@/types/release";

/* ================================================================== */
/*  Releases — Queries                                                  */
/* ================================================================== */

/**
 * GET /releases - paginated list of releases.
 */
export function useReleases(params?: {
  status?: string;
  releaseType?: string;
  environment?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["releases", params],
    queryFn: () =>
      apiClient.get<{ data: Release[]; meta?: { totalPages: number } }>("/releases", {
        status: params?.status,
        releaseType: params?.releaseType,
        environment: params?.environment,
        page: params?.page,
        pageSize: params?.pageSize,
      }),
  });
}

/**
 * GET /releases/{id} - single release.
 */
export function useRelease(id: string | undefined) {
  return useQuery({
    queryKey: ["release", id],
    queryFn: () => apiClient.get<Release>(`/releases/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /releases/stats - aggregate release statistics.
 */
export function useReleaseStats() {
  return useQuery({
    queryKey: ["release-stats"],
    queryFn: () => apiClient.get<ReleaseStats>("/releases/stats"),
  });
}

/**
 * GET /releases/calendar - release calendar events for date range.
 */
export function useReleaseCalendar(start: string, end: string) {
  return useQuery({
    queryKey: ["release-calendar", start, end],
    queryFn: () =>
      apiClient.get<ReleaseCalendarEvent[]>("/releases/calendar", { start, end }),
    enabled: !!start && !!end,
  });
}

/**
 * GET /releases/{id}/items - release items for a given release.
 */
export function useReleaseItems(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["release-items", releaseId],
    queryFn: () => apiClient.get<ReleaseItem[]>(`/releases/${releaseId}/items`),
    enabled: !!releaseId,
  });
}

/**
 * GET /releases/{id}/deployments - deployment execution log.
 */
export function useReleaseDeployments(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["release-deployments", releaseId],
    queryFn: () =>
      apiClient.get<ReleaseDeployment[]>(`/releases/${releaseId}/deployments`),
    enabled: !!releaseId,
  });
}

/**
 * GET /releases/{id}/approvals - approval sign-offs.
 */
export function useReleaseApprovals(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["release-approvals", releaseId],
    queryFn: () =>
      apiClient.get<ReleaseApproval[]>(`/releases/${releaseId}/approvals`),
    enabled: !!releaseId,
  });
}

/* ================================================================== */
/*  Releases — Mutations                                                */
/* ================================================================== */

/**
 * POST /releases - create a new release.
 */
export function useCreateRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post<Release>("/releases", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["release-stats"] });
      toast.success("Release created successfully");
    },
    onError: () => {
      toast.error("Failed to create release");
    },
  });
}

/**
 * PUT /releases/{id} - update a release.
 */
export function useUpdateRelease(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.put<Release>(`/releases/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["release", id] });
      queryClient.invalidateQueries({ queryKey: ["release-stats"] });
      toast.success("Release updated");
    },
    onError: () => {
      toast.error("Failed to update release");
    },
  });
}

/**
 * POST /releases/{id}/transition - transition release status.
 */
export function useTransitionRelease(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { targetStatus: string; comment?: string }) =>
      apiClient.post<Release>(`/releases/${id}/transition`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["release", id] });
      queryClient.invalidateQueries({ queryKey: ["release-stats"] });
      toast.success("Release status updated");
    },
    onError: () => {
      toast.error("Failed to transition release");
    },
  });
}

/**
 * POST /releases/{id}/deploy - begin deployment.
 */
export function useDeployRelease(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { environment: string; deploymentType?: string; notes?: string }) =>
      apiClient.post<Release>(`/releases/${id}/deploy`, {
        ...body,
        deploymentType: body.deploymentType ?? "full",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["release", id] });
      queryClient.invalidateQueries({ queryKey: ["release-deployments", id] });
      queryClient.invalidateQueries({ queryKey: ["release-stats"] });
      toast.success("Deployment started");
    },
    onError: () => {
      toast.error("Failed to start deployment");
    },
  });
}

/**
 * POST /releases/{id}/rollback - rollback a deployment.
 */
export function useRollbackRelease(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiClient.post<Release>(`/releases/${id}/rollback`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["release", id] });
      queryClient.invalidateQueries({ queryKey: ["release-deployments", id] });
      queryClient.invalidateQueries({ queryKey: ["release-stats"] });
      toast.success("Rollback initiated");
    },
    onError: () => {
      toast.error("Failed to rollback release");
    },
  });
}

/**
 * POST /releases/{id}/close - close a deployed release with close-out evidence.
 */
export function useCloseRelease(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { closeOutReport: string; lessonsLearned?: string }) =>
      apiClient.post<Release>(`/releases/${id}/close`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["release", id] });
      queryClient.invalidateQueries({ queryKey: ["release-stats"] });
      toast.success("Release closed");
    },
    onError: () => {
      toast.error("Failed to close release");
    },
  });
}

/**
 * POST /releases/{releaseId}/approvals/{approvalId}/decide - approve or reject.
 */
export function useDecideApproval(releaseId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { approvalId: string; decision: "approved" | "rejected"; notes?: string }) =>
      apiClient.post<ReleaseApproval>(
        `/releases/${releaseId}/approvals/${body.approvalId}/decide`,
        { status: body.decision, comments: body.notes }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-approvals", releaseId] });
      queryClient.invalidateQueries({ queryKey: ["release", releaseId] });
      toast.success("Approval decision recorded");
    },
    onError: () => {
      toast.error("Failed to record approval decision");
    },
  });
}
