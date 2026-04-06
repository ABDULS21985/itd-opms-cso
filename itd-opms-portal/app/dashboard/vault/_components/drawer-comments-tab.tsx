"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useDocumentComments, useAddComment, type DocumentComment } from "@/hooks/use-vault";
import { formatRelativeTime } from "./vault-constants";

interface DrawerCommentsTabProps {
  documentId: string;
}

export function DrawerCommentsTab({ documentId }: DrawerCommentsTabProps) {
  const { data: comments, isLoading } = useDocumentComments(documentId);
  const addMutation = useAddComment(documentId);
  const [content, setContent] = useState("");

  const list: DocumentComment[] = Array.isArray(comments) ? comments : [];

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    addMutation.mutate({ content: trimmed }, { onSuccess: () => setContent("") });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comment input */}
      <div className="flex gap-2 pb-3">
        <input
          type="text"
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || addMutation.isPending}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Send size={14} className="text-white" />
        </button>
      </div>

      {/* Comment list */}
      {list.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {list.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-0)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {comment.userName}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
