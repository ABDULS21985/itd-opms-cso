import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ── Types ──

export interface MFAMethod {
  id: string;
  userId: string;
  methodType: "totp" | "webauthn" | "backup_codes";
  isPrimary: boolean;
  isVerified: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface TOTPSetupResponse {
  secret: string;
  uri: string;
  qrCode: string; // base64 data URL
}

export interface TOTPVerifyResponse {
  message: string;
  backupCodes: string[];
}

export interface BackupCodesResponse {
  backupCodes: string[];
}

export interface MFAVerifyRequest {
  challengeId: string;
  method: string;
  code: string;
}

// ── Hooks ──

/** Fetch the current user's MFA methods. */
export function useMFAMethods() {
  return useQuery<MFAMethod[]>({
    queryKey: ["mfa", "methods"],
    queryFn: () => apiClient.get<MFAMethod[]>("/auth/mfa/methods"),
  });
}

/** Begin TOTP setup — returns QR code and secret. */
export function useSetupTOTP() {
  return useMutation<TOTPSetupResponse, Error>({
    mutationFn: () =>
      apiClient.post<TOTPSetupResponse>("/auth/mfa/setup/totp", {}),
  });
}

/** Verify TOTP setup with the first code — also returns backup codes. */
export function useVerifyTOTPSetup() {
  const qc = useQueryClient();
  return useMutation<TOTPVerifyResponse, Error, { code: string }>({
    mutationFn: (data) =>
      apiClient.post<TOTPVerifyResponse>("/auth/mfa/setup/totp/verify", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mfa", "methods"] });
    },
  });
}

/** Regenerate backup codes. */
export function useGenerateBackupCodes() {
  return useMutation<BackupCodesResponse, Error>({
    mutationFn: () =>
      apiClient.post<BackupCodesResponse>("/auth/mfa/setup/backup-codes", {}),
  });
}

/** Verify MFA challenge during login (public, no auth token needed). */
export function useVerifyMFA() {
  return useMutation<unknown, Error, MFAVerifyRequest>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/auth/mfa/verify", data),
  });
}

/** Remove an MFA method. */
export function useRemoveMFAMethod() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (methodId) =>
      apiClient.delete<unknown>(`/auth/mfa/methods/${methodId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mfa", "methods"] });
    },
  });
}

/** Admin: reset MFA for a user. */
export function useAdminResetMFA() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (userId) =>
      apiClient.post<unknown>(`/system/users/${userId}/reset-mfa`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
