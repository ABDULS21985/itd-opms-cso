import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  TestSolutionCase,
  TestSolutionListResponse,
  TestSolutionRun,
  TestSolutionRunWithDetails,
  TestSolutionSignoff,
  TestSolutionStats,
} from "@/types/test-solution";

export function useTestSolutionRuns(params?: {
  status?: string;
  sourceType?: string;
  releaseId?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["test-solutions", params],
    queryFn: () =>
      apiClient.get<TestSolutionListResponse>("/test-solutions", {
        status: params?.status,
        sourceType: params?.sourceType,
        releaseId: params?.releaseId,
        page: params?.page,
        pageSize: params?.pageSize,
      }),
  });
}

export function useTestSolutionRun(id: string | undefined) {
  return useQuery({
    queryKey: ["test-solution", id],
    queryFn: () => apiClient.get<TestSolutionRunWithDetails>(`/test-solutions/${id}`),
    enabled: !!id,
  });
}

export function useTestSolutionStats() {
  return useQuery({
    queryKey: ["test-solution-stats"],
    queryFn: () => apiClient.get<TestSolutionStats>("/test-solutions/stats"),
  });
}

export function useTestSolutionCases(id: string | undefined) {
  return useQuery({
    queryKey: ["test-solution-cases", id],
    queryFn: () => apiClient.get<TestSolutionCase[]>(`/test-solutions/${id}/cases`),
    enabled: !!id,
  });
}

export function useTestSolutionSignoffs(id: string | undefined) {
  return useQuery({
    queryKey: ["test-solution-signoffs", id],
    queryFn: () => apiClient.get<TestSolutionSignoff[]>(`/test-solutions/${id}/signoffs`),
    enabled: !!id,
  });
}

export function useCreateTestSolutionRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post<TestSolutionRun>("/test-solutions", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-solutions"] });
      queryClient.invalidateQueries({ queryKey: ["test-solution-stats"] });
      toast.success("Test solution run created");
    },
    onError: () => toast.error("Failed to create test solution run"),
  });
}

export function useTransitionTestSolutionRun(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      targetStatus: string;
      comment?: string;
      failureReason?: string;
      outcome?: string;
      evidence?: Record<string, unknown>;
      uatSignoff?: Record<string, unknown>;
    }) => apiClient.post<TestSolutionRun>(`/test-solutions/${id}/transition`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-solutions"] });
      queryClient.invalidateQueries({ queryKey: ["test-solution", id] });
      queryClient.invalidateQueries({ queryKey: ["test-solution-stats"] });
      toast.success("Test solution status updated");
    },
    onError: () => toast.error("Failed to transition test solution run"),
  });
}

export function useUpdateTestSolutionCase(runId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      caseId: string;
      status?: string;
      title?: string;
      scriptReference?: string;
      evidence?: Record<string, unknown>;
    }) =>
      apiClient.put<TestSolutionCase>(
        `/test-solutions/${runId}/cases/${body.caseId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-solution", runId] });
      queryClient.invalidateQueries({ queryKey: ["test-solution-cases", runId] });
      toast.success("Test case updated");
    },
    onError: () => toast.error("Failed to update test case"),
  });
}

export function useDecideTestSolutionSignoff(runId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { signoffId: string; status: "signed" | "rejected"; comments?: string }) =>
      apiClient.post<TestSolutionSignoff>(
        `/test-solutions/${runId}/signoffs/${body.signoffId}/decide`,
        { status: body.status, comments: body.comments },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-solution", runId] });
      queryClient.invalidateQueries({ queryKey: ["test-solution-signoffs", runId] });
      toast.success("Sign-off decision recorded");
    },
    onError: () => toast.error("Failed to record sign-off decision"),
  });
}
