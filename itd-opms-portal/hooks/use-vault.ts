import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/types";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface VaultDocument {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  fileKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  classification: string;
  retentionUntil: string | null;
  tags: string[];
  folderId: string | null;
  version: number;
  parentDocumentId: string | null;
  isLatest: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  status: string;
  accessLevel: string;
  uploadedBy: string;
  orgUnitId?: string;
  createdAt: string;
  updatedAt: string;
  // Extended DMS metadata
  ownerId?: string;
  documentCode?: string;
  sourceModule?: string;
  sourceEntityId?: string;
  effectiveDate?: string;
  expiryDate?: string;
  confidential: boolean;
  legalHold: boolean;
  archivedAt?: string;
  archivedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  // Joined fields
  uploaderName: string;
  folderName: string | null;
  lockedByName: string | null;
  ownerName?: string;
}

export interface DocumentFolder {
  id: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  path: string;
  color: string | null;
  createdBy: string;
  orgUnitId?: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  children?: DocumentFolder[];
}

export interface DocumentAccessLogEntry {
  id: string;
  documentId: string;
  tenantId: string;
  userId: string;
  action: string;
  ipAddress: string;
  createdAt: string;
  userName: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  tenantId: string;
  sharedWithUserId: string | null;
  sharedWithRole: string | null;
  permission: string;
  sharedBy: string;
  expiresAt: string | null;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
  sharedWithName: string;
  sharedByName: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  tenantId: string;
  userId: string;
  content: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
}

export interface DocumentLifecycleEntry {
  id: string;
  documentId: string;
  tenantId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  reason?: string;
  createdAt: string;
  changedByName: string;
}

export interface VaultStats {
  totalDocuments: number;
  totalSizeBytes: number;
  totalFolders: number;
  byClassification: Record<string, number>;
  byStatus: Record<string, number>;
  recentUploads: number;
}

/* ================================================================== */
/*  Documents — Queries                                                */
/* ================================================================== */

export function useDocuments(filters: {
  page?: number;
  limit?: number;
  folderId?: string;
  classification?: string;
  status?: string;
  search?: string;
  tags?: string;
} = {}) {
  const { page = 1, limit = 20, folderId, classification, status, search, tags } = filters;
  return useQuery({
    queryKey: ["vault-documents", page, limit, folderId, classification, status, search, tags],
    queryFn: () =>
      apiClient.get<PaginatedResponse<VaultDocument>>("/vault/documents", {
        page,
        limit,
        folder_id: folderId,
        classification,
        status,
        search,
        tags,
      }),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-document", id],
    queryFn: () => apiClient.get<VaultDocument>(`/vault/documents/${id}`),
    enabled: !!id,
  });
}

export function useDocumentVersions(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-document-versions", id],
    queryFn: () => apiClient.get<VaultDocument[]>(`/vault/documents/${id}/versions`),
    enabled: !!id,
  });
}

export function useDocumentAccessLog(id: string | undefined, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["vault-access-log", id, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<DocumentAccessLogEntry>>(
        `/vault/documents/${id}/access-log`,
        { page, limit },
      ),
    enabled: !!id,
  });
}

export function useDocumentDownloadUrl(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-download-url", id],
    queryFn: () =>
      apiClient.get<{ url: string; fileName: string }>(`/vault/documents/${id}/download`),
    enabled: false,
  });
}

export function useDocumentPreviewUrl(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-preview-url", id],
    queryFn: () =>
      apiClient.get<{ url: string; contentType: string }>(`/vault/documents/${id}/preview`),
    enabled: false,
  });
}

export function useDocumentShares(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-document-shares", id],
    queryFn: () => apiClient.get<DocumentShare[]>(`/vault/documents/${id}/shares`),
    enabled: !!id,
  });
}

export function useDocumentComments(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-document-comments", id],
    queryFn: () => apiClient.get<DocumentComment[]>(`/vault/documents/${id}/comments`),
    enabled: !!id,
  });
}

export function useDocumentLifecycle(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-document-lifecycle", id],
    queryFn: () => apiClient.get<DocumentLifecycleEntry[]>(`/vault/documents/${id}/lifecycle`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Documents — Mutations                                              */
/* ================================================================== */

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<VaultDocument>("/vault/documents", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-stats"] });
      queryClient.invalidateQueries({ queryKey: ["vault-recent"] });
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      toast.success("Document uploaded successfully");
    },
    onError: () => {
      toast.error("Failed to upload document");
    },
  });
}

export function useUpdateDocument(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title?: string;
      description?: string;
      tags?: string[];
      classification?: string;
      accessLevel?: string;
      folderId?: string;
      documentCode?: string;
      ownerId?: string;
      effectiveDate?: string;
      expiryDate?: string;
      confidential?: boolean;
      retentionUntil?: string;
    }) => apiClient.put<VaultDocument>(`/vault/documents/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      toast.success("Document updated successfully");
    },
    onError: () => {
      toast.error("Failed to update document");
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/vault/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-stats"] });
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      toast.success("Document deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });
}

export function useUploadVersion(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<VaultDocument>(`/vault/documents/${id}/version`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      queryClient.invalidateQueries({ queryKey: ["vault-document-versions", id] });
      toast.success("New version uploaded successfully");
    },
    onError: () => {
      toast.error("Failed to upload new version");
    },
  });
}

export function useLockDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<VaultDocument>(`/vault/documents/${id}/lock`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      toast.success("Document locked");
    },
    onError: () => {
      toast.error("Failed to lock document");
    },
  });
}

export function useUnlockDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<VaultDocument>(`/vault/documents/${id}/unlock`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      toast.success("Document unlocked");
    },
    onError: () => {
      toast.error("Failed to unlock document");
    },
  });
}

export function useMoveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      apiClient.post<VaultDocument>(`/vault/documents/${id}/move`, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      toast.success("Document moved successfully");
    },
    onError: () => {
      toast.error("Failed to move document");
    },
  });
}

export function useShareDocument(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      sharedWithUserId?: string;
      sharedWithRole?: string;
      permission: string;
      expiresAt?: string;
    }) => apiClient.post<DocumentShare>(`/vault/documents/${id}/share`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      queryClient.invalidateQueries({ queryKey: ["vault-document-shares", id] });
      toast.success("Document shared successfully");
    },
    onError: () => {
      toast.error("Failed to share document");
    },
  });
}

export function useRevokeShare(documentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) =>
      apiClient.delete(`/vault/documents/${documentId}/shares/${shareId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-document-shares", documentId] });
      toast.success("Share revoked");
    },
    onError: () => {
      toast.error("Failed to revoke share");
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<VaultDocument>(`/vault/documents/${id}/restore`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      queryClient.invalidateQueries({ queryKey: ["vault-stats"] });
      toast.success("Document restored");
    },
    onError: () => {
      toast.error("Failed to restore document");
    },
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<VaultDocument>(`/vault/documents/${id}/archive`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      queryClient.invalidateQueries({ queryKey: ["vault-stats"] });
      toast.success("Document archived");
    },
    onError: () => {
      toast.error("Failed to archive document");
    },
  });
}

export function useTransitionStatus(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { toStatus: string; reason?: string }) =>
      apiClient.post<VaultDocument>(`/vault/documents/${id}/transition`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vault-document", id] });
      queryClient.invalidateQueries({ queryKey: ["vault-document-lifecycle", id] });
      queryClient.invalidateQueries({ queryKey: ["vault-stats"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });
}

export function useAddComment(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; parentId?: string }) =>
      apiClient.post<DocumentComment>(`/vault/documents/${id}/comments`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-document-comments", id] });
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });
}

/* ================================================================== */
/*  Folders — Queries                                                  */
/* ================================================================== */

export function useFolders() {
  return useQuery({
    queryKey: ["vault-folders"],
    queryFn: () => apiClient.get<DocumentFolder[]>("/vault/folders"),
  });
}

/* ================================================================== */
/*  Folders — Mutations                                                */
/* ================================================================== */

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      parentId?: string;
      description?: string;
      color?: string;
    }) => apiClient.post<DocumentFolder>("/vault/folders", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      queryClient.invalidateQueries({ queryKey: ["vault-stats"] });
      toast.success("Folder created successfully");
    },
    onError: () => {
      toast.error("Failed to create folder");
    },
  });
}

export function useUpdateFolder(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; description?: string; color?: string }) =>
      apiClient.put<DocumentFolder>(`/vault/folders/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      toast.success("Folder updated successfully");
    },
    onError: () => {
      toast.error("Failed to update folder");
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/vault/folders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      queryClient.invalidateQueries({ queryKey: ["vault-stats"] });
      toast.success("Folder deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete folder");
    },
  });
}

/* ================================================================== */
/*  Search, Recent, Stats — Queries                                    */
/* ================================================================== */

export function useVaultSearch(query: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["vault-search", query, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<VaultDocument>>("/vault/search", {
        q: query,
        page,
        limit,
      }),
    enabled: query.length > 0,
  });
}

export function useRecentDocuments(limit = 10) {
  return useQuery({
    queryKey: ["vault-recent", limit],
    queryFn: () =>
      apiClient.get<VaultDocument[]>("/vault/recent", { limit }),
  });
}

export function useVaultStats() {
  return useQuery({
    queryKey: ["vault-stats"],
    queryFn: () => apiClient.get<VaultStats>("/vault/stats"),
  });
}
