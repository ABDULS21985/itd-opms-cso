"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Star,
  Plus,
  Search,
  Users,
  Trash2,
  UserMinus,
  Eye,
  X,
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  ChevronRight,
  CheckSquare,
  Square,
  ArrowRightLeft,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  useShortlists,
  useShortlistCandidates,
  useCreateShortlist,
  useDeleteShortlist,
  useRemoveFromShortlist,
  useMoveToShortlist,
} from "@/hooks/use-shortlists";
import type { Shortlist, ShortlistCandidate } from "@/hooks/use-shortlists";

/* ─── color indicators for shortlists ─── */
const SHORTLIST_COLORS = [
  "#C4A35A",
  "#1B7340",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

function getColorForIndex(index: number) {
  return SHORTLIST_COLORS[index % SHORTLIST_COLORS.length];
}

/* ─── animation variants ─── */
const sidebarItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, x: -12, transition: { duration: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.2 } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 350 },
  },
  exit: { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.15 } },
};

/* ═══════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════ */

export default function ShortlistsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(SHORTLIST_COLORS[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Bulk selection
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  const { data: shortlists, isLoading, error, refetch } = useShortlists();
  const createShortlist = useCreateShortlist();
  const deleteShortlist = useDeleteShortlist();
  const removeFromShortlist = useRemoveFromShortlist();
  const moveToShortlist = useMoveToShortlist();
  const {
    data: candidates,
    isLoading: candidatesLoading,
  } = useShortlistCandidates(selectedId);

  const shortlistArray = useMemo(
    () => (Array.isArray(shortlists) ? shortlists : []),
    [shortlists]
  );

  const filteredShortlists = useMemo(() => {
    if (!searchQuery.trim()) return shortlistArray;
    const q = searchQuery.toLowerCase();
    return shortlistArray.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [shortlistArray, searchQuery]);

  const selectedShortlist = useMemo(
    () => shortlistArray.find((s) => s.id === selectedId) ?? null,
    [shortlistArray, selectedId]
  );

  const candidateArray = useMemo(
    () => (Array.isArray(candidates) ? candidates : []),
    [candidates]
  );

  /* ─── handlers ─── */

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a shortlist name.");
      return;
    }
    try {
      const created = await createShortlist.mutateAsync({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
      setNewColor(SHORTLIST_COLORS[0]);
      toast.success("Shortlist created!");
      if (created && typeof created === "object" && "id" in created) {
        setSelectedId((created as Shortlist).id);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create shortlist."
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShortlist.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
      setConfirmDeleteId(null);
      toast.success("Shortlist deleted.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete shortlist."
      );
    }
  };

  const handleRemoveCandidate = async (candidateId: string) => {
    if (!selectedId) return;
    try {
      await removeFromShortlist.mutateAsync({
        shortlistId: selectedId,
        candidateId,
      });
      toast.success("Candidate removed from shortlist.");
      setSelectedCandidates((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove candidate."
      );
    }
  };

  /* ─── bulk actions ─── */

  const toggleCandidateSelection = useCallback((candidateId: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedCandidates.size === candidateArray.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(candidateArray.map((c) => c.candidateId)));
    }
  }, [candidateArray, selectedCandidates.size]);

  const handleBulkRemove = async () => {
    if (!selectedId || selectedCandidates.size === 0) return;
    const ids = Array.from(selectedCandidates);
    try {
      await Promise.all(
        ids.map((candidateId) =>
          removeFromShortlist.mutateAsync({ shortlistId: selectedId, candidateId })
        )
      );
      toast.success(`Removed ${ids.length} candidate${ids.length > 1 ? "s" : ""} from shortlist.`);
      setSelectedCandidates(new Set());
    } catch {
      toast.error("Failed to remove some candidates.");
    }
  };

  const handleBulkMove = async (targetShortlistId: string) => {
    if (!selectedId || selectedCandidates.size === 0) return;
    const ids = Array.from(selectedCandidates);
    try {
      await Promise.all(
        ids.map((candidateId) =>
          moveToShortlist.mutateAsync({
            fromShortlistId: selectedId,
            toShortlistId: targetShortlistId,
            candidateId,
          })
        )
      );
      toast.success(`Moved ${ids.length} candidate${ids.length > 1 ? "s" : ""}.`);
      setSelectedCandidates(new Set());
      setShowMoveModal(false);
    } catch {
      toast.error("Failed to move some candidates.");
    }
  };

  // Clear selection when switching shortlists
  const handleSelectShortlist = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedCandidates(new Set());
  }, []);

  /* ─── loading state ─── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: "var(--surface-2)" }} />
        <div
          className="flex flex-col md:flex-row gap-6"
          style={{ minHeight: "70vh" }}
        >
          <div className="w-full md:w-80 shrink-0 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl animate-pulse"
                style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--border)",
                }}
              />
            ))}
          </div>
          <div
            className="flex-1 rounded-2xl animate-pulse"
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      </div>
    );
  }

  /* ─── error state ─── */
  if (error) {
    return (
      <div>
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border)",
          }}
        >
          <AlertCircle
            size={48}
            className="mx-auto mb-4"
            style={{ color: "var(--error)" }}
          />
          <h3
            className="font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Failed to load shortlists
          </h3>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--neutral-gray)" }}
          >
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "#C4A35A", color: "#fff" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#A8893D")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#C4A35A")
            }
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Saved Shortlists
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--neutral-gray)" }}>
            Organize and manage your candidate shortlists.
          </p>
        </div>
        {/* mobile-only create button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex md:hidden items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "#C4A35A", color: "#fff" }}
        >
          <Plus size={16} /> New
        </button>
      </div>

      {/* ─── Two-panel layout ─── */}
      <div
        className="flex flex-col md:flex-row gap-6"
        style={{ minHeight: "70vh" }}
      >
        {/* ════════ Left Panel (Sidebar) ════════ */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-3">
          {/* Create button + search */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden md:flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "#C4A35A", color: "#fff" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#A8893D")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#C4A35A")
            }
          >
            <Plus size={16} /> New Shortlist
          </button>

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--neutral-gray)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortlists..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                // @ts-expect-error CSS custom properties
                "--tw-ring-color": "rgba(245, 154, 35, 0.2)",
              }}
            />
          </div>

          {/* Shortlist items */}
          <div
            className="flex-1 overflow-y-auto space-y-1.5 rounded-2xl p-2"
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--border)",
              maxHeight: "calc(70vh - 110px)",
            }}
          >
            {filteredShortlists.length === 0 ? (
              <div className="py-10 text-center">
                <Star
                  size={32}
                  className="mx-auto mb-2"
                  style={{ color: "var(--surface-3)" }}
                />
                <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                  {searchQuery
                    ? "No shortlists match your search."
                    : "No shortlists yet."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium transition-colors"
                    style={{ color: "#C4A35A" }}
                  >
                    <Plus size={14} /> Create one
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredShortlists.map((shortlist, index) => {
                  const isSelected = selectedId === shortlist.id;
                  const color = getColorForIndex(index);

                  return (
                    <motion.button
                      key={shortlist.id}
                      custom={index}
                      variants={sidebarItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      onClick={() => handleSelectShortlist(shortlist.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors group"
                      style={{
                        background: isSelected
                          ? "var(--surface-2)"
                          : "transparent",
                        border: isSelected
                          ? "1px solid var(--border)"
                          : "1px solid transparent",
                      }}
                    >
                      {/* Color indicator */}
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ background: color }}
                      />

                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {shortlist.name}
                        </p>
                        <div
                          className="flex items-center gap-2 mt-0.5 text-xs"
                          style={{ color: "var(--neutral-gray)" }}
                        >
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {shortlist.candidateCount}
                          </span>
                          <span className="opacity-40">|</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(shortlist.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(shortlist.id);
                        }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        style={{ color: "var(--neutral-gray)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--error)";
                          e.currentTarget.style.background =
                            "var(--error-light)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--neutral-gray)";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Delete shortlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ════════ Right Panel (Candidate Grid) ════════ */}
        <div
          className="flex-1 rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border)",
          }}
        >
          {!selectedId ? (
            /* No shortlist selected */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-xs">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--surface-2)" }}
                >
                  <Star size={28} style={{ color: "var(--surface-3)" }} />
                </div>
                <h3
                  className="font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Select a shortlist
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  Choose a shortlist from the sidebar to view its candidates.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div
                className="px-6 py-4 flex items-center justify-between shrink-0"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <h2
                    className="text-lg font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {selectedShortlist?.name}
                  </h2>
                  {selectedShortlist?.description && (
                    <p
                      className="text-sm mt-0.5 truncate"
                      style={{ color: "var(--neutral-gray)" }}
                    >
                      {selectedShortlist.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {candidateArray.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: selectedCandidates.size > 0 ? "var(--primary)" : "var(--neutral-gray)" }}
                      title={selectedCandidates.size === candidateArray.length ? "Deselect all" : "Select all"}
                    >
                      {selectedCandidates.size === candidateArray.length ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  )}
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(245, 154, 35, 0.1)",
                      color: "#C4A35A",
                    }}
                  >
                    {selectedShortlist?.candidateCount ?? 0}{" "}
                    {(selectedShortlist?.candidateCount ?? 0) === 1
                      ? "candidate"
                      : "candidates"}
                  </span>
                </div>
              </div>

              {/* Bulk actions bar */}
              <AnimatePresence>
                {selectedCandidates.size > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-6 py-3 flex items-center justify-between"
                      style={{
                        background: "var(--primary-light, rgba(30, 77, 183, 0.05))",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                        <CheckCircle2 size={14} className="inline mr-1.5" style={{ verticalAlign: "-2px" }} />
                        {selectedCandidates.size} selected
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowMoveModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            color: "var(--primary)",
                            border: "1px solid var(--primary)",
                            background: "var(--surface-0)",
                          }}
                        >
                          <ArrowRightLeft size={13} /> Move
                        </button>
                        <button
                          onClick={handleBulkRemove}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            color: "var(--error)",
                            border: "1px solid var(--error)",
                            background: "var(--surface-0)",
                          }}
                        >
                          <UserMinus size={13} /> Remove
                        </button>
                        <button
                          onClick={() => setSelectedCandidates(new Set())}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "var(--neutral-gray)" }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Candidates area */}
              <div className="flex-1 overflow-y-auto p-6">
                {candidatesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2
                      size={28}
                      className="animate-spin"
                      style={{ color: "#C4A35A" }}
                    />
                  </div>
                ) : candidateArray.length === 0 ? (
                  /* Empty state */
                  <div className="flex-1 flex items-center justify-center py-16">
                    <div className="text-center max-w-xs">
                      <div
                        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <Users
                          size={28}
                          style={{ color: "var(--surface-3)" }}
                        />
                      </div>
                      <h3
                        className="font-semibold mb-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        No candidates yet
                      </h3>
                      <p
                        className="text-sm mb-4"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        Browse the talent pool and add candidates to this
                        shortlist.
                      </p>
                      <Link
                        href="/employer/candidates"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                        style={{ background: "#C4A35A", color: "#fff" }}
                      >
                        Browse Talent <ChevronRight size={15} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Candidate grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {candidateArray.map((candidate, index) => {
                        const isSelected = selectedCandidates.has(candidate.candidateId);
                        return (
                        <motion.div
                          key={candidate.id}
                          custom={index}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          className="rounded-xl p-4 flex flex-col gap-3 group transition-all"
                          style={{
                            background: isSelected ? "var(--primary-light, rgba(30, 77, 183, 0.05))" : "var(--surface-1)",
                            border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                          }}
                        >
                          {/* Avatar + info + checkbox */}
                          <div className="flex items-start gap-3">
                            {/* Selection checkbox */}
                            <button
                              onClick={() => toggleCandidateSelection(candidate.candidateId)}
                              className="mt-0.5 shrink-0 transition-colors"
                              style={{ color: isSelected ? "var(--primary)" : "var(--surface-3)" }}
                            >
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            {candidate.photoUrl ? (
                              <img
                                src={candidate.photoUrl}
                                alt={candidate.fullName}
                                className="w-11 h-11 rounded-xl object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                  background: "rgba(30, 77, 183, 0.1)",
                                }}
                              >
                                <span
                                  className="text-sm font-bold"
                                  style={{ color: "#1B7340" }}
                                >
                                  {candidate.fullName.charAt(0)}
                                </span>
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {candidate.fullName}
                              </p>
                              {candidate.track && (
                                <p
                                  className="text-xs mt-0.5 truncate"
                                  style={{ color: "var(--neutral-gray)" }}
                                >
                                  {candidate.track}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Location */}
                          {(candidate.city || candidate.country) && (
                            <div
                              className="flex items-center gap-1 text-xs"
                              style={{ color: "var(--neutral-gray)" }}
                            >
                              <MapPin size={12} />
                              <span className="truncate">
                                {[candidate.city, candidate.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div
                            className="flex items-center gap-2 pt-2 mt-auto"
                            style={{
                              borderTop: "1px solid var(--border)",
                            }}
                          >
                            <Link
                              href={`/talents/${candidate.slug}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1 justify-center"
                              style={{
                                background: "var(--surface-0)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <Eye size={13} /> View Profile
                            </Link>
                            <button
                              onClick={() =>
                                handleRemoveCandidate(candidate.candidateId)
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              style={{
                                color: "var(--neutral-gray)",
                                border: "1px solid var(--border)",
                                background: "var(--surface-0)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "var(--error)";
                                e.currentTarget.style.borderColor =
                                  "var(--error)";
                                e.currentTarget.style.background =
                                  "var(--error-light)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color =
                                  "var(--neutral-gray)";
                                e.currentTarget.style.borderColor =
                                  "var(--border)";
                                e.currentTarget.style.background =
                                  "var(--surface-0)";
                              }}
                              title="Remove from shortlist"
                            >
                              <UserMinus size={13} />
                            </button>
                          </div>
                        </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════ Create Shortlist Modal ════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0"
              style={{ background: "rgba(0, 0, 0, 0.5)" }}
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative rounded-2xl shadow-xl w-full max-w-md p-6"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  New Shortlist
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--neutral-gray)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--surface-2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                    placeholder="e.g. Frontend Developers - Q1 2025"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2"
                    style={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      // @ts-expect-error CSS custom properties
                      "--tw-ring-color": "rgba(245, 154, 35, 0.2)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Description (optional)
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Add a description for this shortlist..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 resize-none"
                    style={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      // @ts-expect-error CSS custom properties
                      "--tw-ring-color": "rgba(245, 154, 35, 0.2)",
                    }}
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {SHORTLIST_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className="w-8 h-8 rounded-full transition-all flex items-center justify-center"
                        style={{
                          background: color,
                          outline: newColor === color ? `2px solid ${color}` : "none",
                          outlineOffset: "2px",
                          transform: newColor === color ? "scale(1.1)" : "scale(1)",
                        }}
                      >
                        {newColor === color && (
                          <CheckCircle2 size={14} style={{ color: "#fff" }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: "var(--neutral-gray)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--surface-2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createShortlist.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
                  style={{ background: "#C4A35A", color: "#fff" }}
                  onMouseEnter={(e) => {
                    if (!createShortlist.isPending)
                      e.currentTarget.style.background = "#A8893D";
                  }}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#C4A35A")
                  }
                >
                  {createShortlist.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════ Delete Confirmation Modal ════════ */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0"
              style={{ background: "rgba(0, 0, 0, 0.5)" }}
              onClick={() => setConfirmDeleteId(null)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative rounded-2xl shadow-xl w-full max-w-sm p-6"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "var(--error-light)" }}
                >
                  <Trash2 size={20} style={{ color: "var(--error)" }} />
                </div>
                <h3
                  className="font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Delete shortlist?
                </h3>
                <p
                  className="text-sm mb-5"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  This action cannot be undone. All candidates will be removed
                  from this shortlist.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-0)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDeleteId)}
                    disabled={deleteShortlist.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                    style={{ background: "var(--error)", color: "#fff" }}
                  >
                    {deleteShortlist.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════ Move to Shortlist Modal ════════ */}
      <AnimatePresence>
        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0"
              style={{ background: "rgba(0, 0, 0, 0.5)" }}
              onClick={() => setShowMoveModal(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative rounded-2xl shadow-xl w-full max-w-sm p-6"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Move to Shortlist
                </h2>
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--neutral-gray)" }}>
                Move {selectedCandidates.size} candidate{selectedCandidates.size > 1 ? "s" : ""} to:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {shortlistArray
                  .filter((s) => s.id !== selectedId)
                  .map((shortlist, index) => (
                    <button
                      key={shortlist.id}
                      onClick={() => handleBulkMove(shortlist.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                      style={{
                        background: "var(--surface-1)",
                        border: "1px solid var(--border)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--surface-2)";
                        e.currentTarget.style.borderColor = "var(--primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--surface-1)";
                        e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: getColorForIndex(index) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {shortlist.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {shortlist.candidateCount} candidates
                        </p>
                      </div>
                      <ArrowRightLeft size={14} style={{ color: "var(--neutral-gray)" }} />
                    </button>
                  ))}
                {shortlistArray.filter((s) => s.id !== selectedId).length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                      No other shortlists available.
                    </p>
                    <button
                      onClick={() => {
                        setShowMoveModal(false);
                        setShowCreateModal(true);
                      }}
                      className="inline-flex items-center gap-1 mt-2 text-sm font-medium"
                      style={{ color: "#C4A35A" }}
                    >
                      <Plus size={14} /> Create one
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
