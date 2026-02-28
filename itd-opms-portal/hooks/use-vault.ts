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
  createdAt: string;
  updatedAt: string;
  uploaderName: string;
  folderName: string | null;
  lockedByName: string | null;
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
  createdAt: string;
  sharedWithName: string;
  sharedByName: string;
}

export interface VaultStats {
  totalDocuments: number;
  totalSizeBytes: number;
  totalFolders: number;
  byClassification: Record<string, number>;
  recentUploads: number;
}

/* ================================================================== */
/*  Documents — Queries                                                */
/* ================================================================== */

/**
 * GET /vault/documents — paginated list of vault documents.
 */
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

/**
 * GET /vault/documents/{id} — single vault document.
 */
export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-document", id],
    queryFn: () => apiClient.get<VaultDocument>(`/vault/documents/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /vault/documents/{id}/versions — all versions of a document.
 */
export function useDocumentVersions(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-document-versions", id],
    queryFn: () => apiClient.get<VaultDocument[]>(`/vault/documents/${id}/versions`),
    enabled: !!id,
  });
}

/**
 * GET /vault/documents/{id}/access-log — paginated access log.
 */
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

/**
 * GET /vault/documents/{id}/download — get presigned download URL.
 */
export function useDocumentDownloadUrl(id: string | undefined) {
  return useQuery({
    queryKey: ["vault-download-url", id],
    queryFn: () =>
      apiClient.get<{ url: string; fileName: string }>(`/vault/documents/${id}/download`),
    enabled: false, // Manually triggered
  });
}

/* ================================================================== */
/*  Documents — Mutations                                              */
/* ================================================================== */

/**
 * POST /vault/documents — upload a document.
 */
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

/**
 * PUT /vault/documents/{id} — update document metadata.
 */
export function useUpdateDocument(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<VaultDocument>) =>
      apiClient.put<VaultDocument>(`/vault/documents/${id}`, body),
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

/**
 * DELETE /vault/documents/{id} — soft-delete a document.
 */
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

/**
 * POST /vault/documents/{id}/version — upload a new version.
 */
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

/**
 * POST /vault/documents/{id}/lock — lock a document.
 */
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

/**
 * POST /vault/documents/{id}/unlock — unlock a document.
 */
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

/**
 * POST /vault/documents/{id}/move — move a document to a folder.
 */
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

/**
 * POST /vault/documents/{id}/share — share a document.
 */
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
      toast.success("Document shared successfully");
    },
    onError: () => {
      toast.error("Failed to share document");
    },
  });
}

/* ================================================================== */
/*  Folders — Queries                                                  */
/* ================================================================== */

/**
 * GET /vault/folders — list all folders.
 */
export function useFolders() {
  return useQuery({
    queryKey: ["vault-folders"],
    queryFn: () => apiClient.get<DocumentFolder[]>("/vault/folders"),
  });
}

/* ================================================================== */
/*  Folders — Mutations                                                */
/* ================================================================== */

/**
 * POST /vault/folders — create a folder.
 */
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

/**
 * PUT /vault/folders/{id} — update a folder.
 */
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

/**
 * DELETE /vault/folders/{id} — delete a folder.
 */
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

/**
 * GET /vault/search?q=... — search documents.
 */
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

/**
 * GET /vault/recent — recently uploaded documents by current user.
 */
export function useRecentDocuments(limit = 10) {
  return useQuery({
    queryKey: ["vault-recent", limit],
    queryFn: () =>
      apiClient.get<VaultDocument[]>("/vault/recent", { limit }),
  });
}

/**
 * GET /vault/stats — aggregate vault statistics.
 */
export function useVaultStats() {
  return useQuery({
    queryKey: ["vault-stats"],
    queryFn: () => apiClient.get<VaultStats>("/vault/stats"),
  });
}
