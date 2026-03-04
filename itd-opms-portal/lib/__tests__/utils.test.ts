import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatDate,
  formatRelativeTime,
  truncate,
  capitalize,
  getInitials,
} from "../utils";

// =============================================================================
// cn — class name merging
// =============================================================================
describe("cn", () => {
  it("joins multiple class names with a space", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values (null, undefined, false, empty string)", () => {
    expect(cn("a", null, "b", undefined, "c", false, "")).toBe("a b c");
  });

  it("returns an empty string when all inputs are falsy", () => {
    expect(cn(null, undefined, false, "")).toBe("");
  });

  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles a single class name", () => {
    expect(cn("only")).toBe("only");
  });

  it("preserves extra whitespace within individual class strings", () => {
    // cn does not trim inner strings — just concatenates
    expect(cn("a b", "c")).toBe("a b c");
  });
});

// =============================================================================
// formatDate
// =============================================================================
describe("formatDate", () => {
  it("formats a Date object to 'MMM D, YYYY' format", () => {
    const result = formatDate(new Date(2026, 1, 16)); // Feb 16, 2026
    expect(result).toBe("Feb 16, 2026");
  });

  it("formats an ISO date string", () => {
    const result = formatDate("2025-12-25T00:00:00.000Z");
    // The exact output depends on the local timezone, but it should contain
    // "Dec" and "2025"
    expect(result).toContain("Dec");
    expect(result).toContain("2025");
  });

  it("handles a date string without time component", () => {
    const result = formatDate("2024-01-01");
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
  });
});

// =============================================================================
// formatRelativeTime
// =============================================================================
describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for times less than 60 seconds ago', () => {
    const tenSecondsAgo = new Date("2026-03-01T11:59:50Z");
    expect(formatRelativeTime(tenSecondsAgo)).toBe("just now");
  });

  it("returns minutes ago (singular)", () => {
    const oneMinuteAgo = new Date("2026-03-01T11:59:00Z");
    expect(formatRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
  });

  it("returns minutes ago (plural)", () => {
    const fiveMinutesAgo = new Date("2026-03-01T11:55:00Z");
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  it("returns hours ago (singular)", () => {
    const oneHourAgo = new Date("2026-03-01T11:00:00Z");
    expect(formatRelativeTime(oneHourAgo)).toBe("1 hour ago");
  });

  it("returns hours ago (plural)", () => {
    const threeHoursAgo = new Date("2026-03-01T09:00:00Z");
    expect(formatRelativeTime(threeHoursAgo)).toBe("3 hours ago");
  });

  it("returns days ago (singular)", () => {
    const oneDayAgo = new Date("2026-02-28T12:00:00Z");
    expect(formatRelativeTime(oneDayAgo)).toBe("1 day ago");
  });

  it("returns days ago (plural)", () => {
    const threeDaysAgo = new Date("2026-02-26T12:00:00Z");
    expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
  });

  it("returns weeks ago (singular)", () => {
    const oneWeekAgo = new Date("2026-02-22T12:00:00Z");
    expect(formatRelativeTime(oneWeekAgo)).toBe("1 week ago");
  });

  it("returns weeks ago (plural)", () => {
    const threeWeeksAgo = new Date("2026-02-08T12:00:00Z");
    expect(formatRelativeTime(threeWeeksAgo)).toBe("3 weeks ago");
  });

  it("returns months ago (singular)", () => {
    // Need 35+ days ago so diffWeeks >= 5 and diffMonths = 1
    const oneMonthAgo = new Date("2026-01-25T12:00:00Z");
    expect(formatRelativeTime(oneMonthAgo)).toBe("1 month ago");
  });

  it("returns months ago (plural)", () => {
    const threeMonthsAgo = new Date("2025-12-01T12:00:00Z");
    expect(formatRelativeTime(threeMonthsAgo)).toBe("3 months ago");
  });

  it("returns years ago (singular)", () => {
    const oneYearAgo = new Date("2025-03-01T12:00:00Z");
    expect(formatRelativeTime(oneYearAgo)).toBe("1 year ago");
  });

  it("returns years ago (plural)", () => {
    const twoYearsAgo = new Date("2024-03-01T12:00:00Z");
    expect(formatRelativeTime(twoYearsAgo)).toBe("2 years ago");
  });

  it("accepts a date string", () => {
    expect(formatRelativeTime("2026-03-01T11:59:50Z")).toBe("just now");
  });
});

// =============================================================================
// truncate
// =============================================================================
describe("truncate", () => {
  it("returns the original text when it is shorter than the limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns the original text when it is exactly the limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it('truncates and appends "..." when text exceeds the limit', () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("trims trailing whitespace before appending ellipsis", () => {
    expect(truncate("hello world is great", 6)).toBe("hello...");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("handles zero length", () => {
    expect(truncate("hello", 0)).toBe("...");
  });
});

// =============================================================================
// capitalize
// =============================================================================
describe("capitalize", () => {
  it("capitalizes the first letter of a lowercase string", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("does not change an already capitalized string", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("handles a single character", () => {
    expect(capitalize("a")).toBe("A");
  });

  it("returns empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });

  it("handles strings starting with numbers", () => {
    expect(capitalize("123abc")).toBe("123abc");
  });

  it("only capitalizes the first character", () => {
    expect(capitalize("hELLO")).toBe("HELLO");
  });
});

// =============================================================================
// getInitials
// =============================================================================
describe("getInitials", () => {
  it('returns initials for a two-word name: "John Doe" -> "JD"', () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it('returns a single initial for a one-word name: "Alice" -> "A"', () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns at most two initials for names with three or more words", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("returns empty string for empty input", () => {
    expect(getInitials("")).toBe("");
  });

  it("handles extra whitespace between words", () => {
    expect(getInitials("  Jane   Doe  ")).toBe("JD");
  });

  it("uppercases initials regardless of input case", () => {
    expect(getInitials("john doe")).toBe("JD");
  });
});
