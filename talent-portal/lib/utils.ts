// =============================================================================
// General Utilities — Digibit Talent Portal
// =============================================================================

/**
 * Merge class names using simple concatenation.
 * For full clsx + twMerge support, use the `cn` utility from @digibit/ui.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Format a date string or Date object to a readable format.
 * Example: "Feb 16, 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date as relative time from now.
 * Examples: "2 hours ago", "3 days ago", "just now"
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

/**
 * Truncate text to a maximum length and append "..." if truncated.
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "...";
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Create a URL-friendly slug from a string.
 * Example: "Hello World!" -> "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Format a salary range with currency.
 * Examples: "$50k - $80k USD", "$50k USD", "Competitive"
 */
export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
): string {
  if (!min && !max) return "Competitive";

  const formatAmount = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}k`;
    }
    return amount.toLocaleString();
  };

  const currencySymbol = getCurrencySymbol(currency || "USD");
  const suffix = currency ? ` ${currency}` : "";

  if (min && max) {
    return `${currencySymbol}${formatAmount(min)} - ${currencySymbol}${formatAmount(max)}${suffix}`;
  }
  if (min) {
    return `From ${currencySymbol}${formatAmount(min)}${suffix}`;
  }
  return `Up to ${currencySymbol}${formatAmount(max!)}${suffix}`;
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\u00A3",
    NGN: "\u20A6",
    KES: "KSh",
    GHS: "GH\u20B5",
    ZAR: "R",
    XOF: "CFA",
  };
  return symbols[currency.toUpperCase()] || "";
}

/**
 * Get initials from a name string.
 * Example: "John Doe" -> "JD", "Alice" -> "A"
 */
export function getInitials(name: string): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * Format a file size in bytes to a human-readable string.
 * Examples: "1.5 MB", "256 KB", "2.3 GB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[i]}`;
}
