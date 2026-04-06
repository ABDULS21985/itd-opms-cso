"use client";

interface VaultPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function VaultPagination({ page, totalPages, onPageChange }: VaultPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-6">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        Previous
      </button>
      <span className="text-sm text-[var(--text-secondary)]">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        Next
      </button>
    </div>
  );
}
