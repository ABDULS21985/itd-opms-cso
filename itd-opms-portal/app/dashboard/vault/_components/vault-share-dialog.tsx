"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { useShareDocument } from "@/hooks/use-vault";
import { apiClient } from "@/lib/api-client";
import { PERMISSIONS } from "./vault-constants";

interface UserSearchResult {
  id: string;
  displayName: string;
  email: string;
}

interface VaultShareDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string | null;
}

export function VaultShareDialog({ open, onClose, documentId }: VaultShareDialogProps) {
  const shareMutation = useShareDocument(documentId || undefined);

  const [mode, setMode] = useState<"user" | "role">("user");
  const [permission, setPermission] = useState("view");
  const [expiresAt, setExpiresAt] = useState("");

  // User search
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Role
  const [role, setRole] = useState("");

  const resetForm = useCallback(() => {
    setMode("user");
    setPermission("view");
    setExpiresAt("");
    setUserSearch("");
    setUserResults([]);
    setSelectedUser(null);
    setRole("");
  }, []);

  const handleUserSearch = useCallback(async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setUserResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await apiClient.get<UserSearchResult[]>("/admin/users/search", { q: query, limit: 5 });
      setUserResults(Array.isArray(results) ? results : []);
    } catch {
      setUserResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleShare = useCallback(() => {
    if (!documentId) return;

    const body: {
      sharedWithUserId?: string;
      sharedWithRole?: string;
      permission: string;
      expiresAt?: string;
    } = { permission };

    if (mode === "user" && selectedUser) {
      body.sharedWithUserId = selectedUser.id;
    } else if (mode === "role" && role.trim()) {
      body.sharedWithRole = role.trim();
    } else {
      return;
    }

    if (expiresAt) {
      body.expiresAt = new Date(expiresAt).toISOString();
    }

    shareMutation.mutate(body, {
      onSuccess: () => {
        resetForm();
        onClose();
      },
    });
  }, [documentId, mode, selectedUser, role, permission, expiresAt, shareMutation, resetForm, onClose]);

  const canSubmit = mode === "user" ? !!selectedUser : !!role.trim();

  return (
    <AnimatePresence>
      {open && documentId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Share Document</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              >
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("user")}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    borderColor: mode === "user" ? "var(--primary)" : "var(--border)",
                    backgroundColor: mode === "user" ? "rgba(59, 130, 246, 0.08)" : "transparent",
                    color: mode === "user" ? "var(--primary)" : "var(--text-primary)",
                  }}
                >
                  Share with User
                </button>
                <button
                  onClick={() => setMode("role")}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    borderColor: mode === "role" ? "var(--primary)" : "var(--border)",
                    backgroundColor: mode === "role" ? "rgba(59, 130, 246, 0.08)" : "transparent",
                    color: mode === "role" ? "var(--primary)" : "var(--text-primary)",
                  }}
                >
                  Share with Role
                </button>
              </div>

              {/* User search */}
              {mode === "user" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Search User
                  </label>
                  {selectedUser ? (
                    <div
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                      style={{ borderColor: "var(--primary)", backgroundColor: "rgba(59, 130, 246, 0.04)" }}
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {selectedUser.displayName}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">{selectedUser.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setUserSearch("");
                        }}
                      >
                        <X size={14} className="text-[var(--text-secondary)]" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className="flex items-center gap-2 rounded-lg border px-3 py-2"
                        style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
                      >
                        <Search size={14} className="text-[var(--text-tertiary)]" />
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={userSearch}
                          onChange={(e) => handleUserSearch(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                          autoFocus
                        />
                        {searching && (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                        )}
                      </div>
                      {userResults.length > 0 && (
                        <div
                          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border shadow-lg"
                          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
                        >
                          {userResults.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setSelectedUser(u);
                                setUserResults([]);
                                setUserSearch("");
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-1)]"
                            >
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">{u.displayName}</p>
                                <p className="text-xs text-[var(--text-tertiary)]">{u.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Role input */}
              {mode === "role" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Role Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., admin, auditor, reviewer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                    autoFocus
                  />
                </div>
              )}

              {/* Permission */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Permission
                </label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--surface-1)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {PERMISSIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
                  style={{
                    backgroundColor: "var(--surface-1)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={!canSubmit || shareMutation.isPending}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {shareMutation.isPending ? "Sharing..." : "Share"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
