import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ──────────────────────────────────────────────
// Upload response type
// ──────────────────────────────────────────────

export interface UploadResponse {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

// ──────────────────────────────────────────────
// Photo upload
// ──────────────────────────────────────────────

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<UploadResponse>("/upload/photo", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

// ──────────────────────────────────────────────
// Document upload
// ──────────────────────────────────────────────

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<UploadResponse>("/upload/document", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

// ──────────────────────────────────────────────
// Employer logo upload
// ──────────────────────────────────────────────

export function useUploadEmployerLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<UploadResponse>("/upload/employer-logo", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employer-org"] });
    },
  });
}
