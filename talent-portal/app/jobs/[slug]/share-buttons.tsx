"use client";

import { useState } from "react";
import { Link2, Check, Linkedin } from "lucide-react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-gray)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)] transition-colors"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[var(--success)]" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied!" : "Copy Link"}
      </button>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-gray)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)] transition-colors"
      >
        <Linkedin className="h-3.5 w-3.5" />
        LinkedIn
      </a>
    </div>
  );
}
