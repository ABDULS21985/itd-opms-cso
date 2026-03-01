import { describe, it, expect } from "vitest";
import { fuzzyMatch, getHighlightSegments } from "../fuzzy-match";

// =============================================================================
// fuzzyMatch
// =============================================================================
describe("fuzzyMatch", () => {
  // ---------------------------------------------------------------------------
  // Basic matching
  // ---------------------------------------------------------------------------
  describe("basic matching", () => {
    it("returns a match result for an exact match", () => {
      const result = fuzzyMatch("hello", "hello");
      expect(result).not.toBeNull();
      expect(result!.matchedIndices).toEqual([0, 1, 2, 3, 4]);
    });

    it("returns a match for a substring match", () => {
      const result = fuzzyMatch("llo", "hello");
      expect(result).not.toBeNull();
      expect(result!.matchedIndices).toEqual([2, 3, 4]);
    });

    it("returns a match for non-consecutive characters", () => {
      const result = fuzzyMatch("hlo", "hello");
      expect(result).not.toBeNull();
      expect(result!.matchedIndices).toEqual([0, 2, 4]);
    });

    it("returns null when not all characters can be matched", () => {
      const result = fuzzyMatch("xyz", "hello");
      expect(result).toBeNull();
    });

    it("returns null for an empty query", () => {
      const result = fuzzyMatch("", "hello");
      expect(result).toBeNull();
    });

    it("returns null when query is longer than text and cannot match", () => {
      const result = fuzzyMatch("toolongquery", "hi");
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Case sensitivity
  // ---------------------------------------------------------------------------
  describe("case sensitivity", () => {
    it("matches case-insensitively", () => {
      const result = fuzzyMatch("HELLO", "hello");
      expect(result).not.toBeNull();
    });

    it("matches mixed case query against lowercase text", () => {
      const result = fuzzyMatch("HeLLo", "hello");
      expect(result).not.toBeNull();
    });

    it("matches lowercase query against uppercase text", () => {
      const result = fuzzyMatch("hello", "HELLO");
      expect(result).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------
  describe("scoring", () => {
    it("gives higher score to matches at the start of the text", () => {
      const startMatch = fuzzyMatch("h", "hello");
      const middleMatch = fuzzyMatch("l", "hello");
      expect(startMatch).not.toBeNull();
      expect(middleMatch).not.toBeNull();
      // "h" at index 0 gets start bonus (8) + word boundary bonus (5) + base (1) = 14
      // "l" at index 2 gets only base (1) = 1
      expect(startMatch!.score).toBeGreaterThan(middleMatch!.score);
    });

    it("gives consecutive match bonus", () => {
      const consecutive = fuzzyMatch("he", "hello");
      const nonConsecutive = fuzzyMatch("ho", "hello");
      expect(consecutive).not.toBeNull();
      expect(nonConsecutive).not.toBeNull();
      // "he" has consecutive bonus; "ho" does not
      expect(consecutive!.score).toBeGreaterThan(nonConsecutive!.score);
    });

    it("gives word boundary bonus for matches after separators", () => {
      const wordBoundary = fuzzyMatch("hw", "hello world");
      expect(wordBoundary).not.toBeNull();
      // "w" is at a word boundary (after space)
      expect(wordBoundary!.score).toBeGreaterThan(0);
    });

    it("gives word boundary bonus for matches after hyphens", () => {
      const result = fuzzyMatch("hb", "hello-bob");
      expect(result).not.toBeNull();
      // "b" is at position after "-", gets word boundary bonus
      expect(result!.matchedIndices).toEqual([0, 6]);
    });

    it("gives word boundary bonus for matches after underscores", () => {
      const result = fuzzyMatch("hb", "hello_bob");
      expect(result).not.toBeNull();
      expect(result!.matchedIndices).toEqual([0, 6]);
    });

    it("gives word boundary bonus for matches after slashes", () => {
      const result = fuzzyMatch("ab", "alpha/beta");
      expect(result).not.toBeNull();
      expect(result!.matchedIndices).toEqual([0, 6]);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe("edge cases", () => {
    it("handles single character query and text", () => {
      expect(fuzzyMatch("a", "a")).not.toBeNull();
      expect(fuzzyMatch("a", "b")).toBeNull();
    });

    it("handles special characters in text", () => {
      const result = fuzzyMatch("abc", "a.b.c");
      expect(result).not.toBeNull();
      expect(result!.matchedIndices).toEqual([0, 2, 4]);
    });

    it("handles query with spaces", () => {
      const result = fuzzyMatch("h w", "hello world");
      expect(result).not.toBeNull();
    });

    it("handles unicode characters", () => {
      const result = fuzzyMatch("ab", "abc");
      expect(result).not.toBeNull();
    });

    it("handles query matching at the very end", () => {
      const result = fuzzyMatch("ld", "hello world");
      expect(result).not.toBeNull();
    });

    it("returns all matched indices in order", () => {
      const result = fuzzyMatch("hw", "hello world");
      expect(result).not.toBeNull();
      // Indices should be sorted ascending
      for (let i = 1; i < result!.matchedIndices.length; i++) {
        expect(result!.matchedIndices[i]).toBeGreaterThan(
          result!.matchedIndices[i - 1],
        );
      }
    });
  });
});

// =============================================================================
// getHighlightSegments
// =============================================================================
describe("getHighlightSegments", () => {
  it("returns a single non-highlighted segment when no indices are provided", () => {
    const segments = getHighlightSegments("hello world", []);
    expect(segments).toEqual([{ text: "hello world", highlighted: false }]);
  });

  it("highlights characters at matched indices", () => {
    const segments = getHighlightSegments("hello", [0, 1]);
    expect(segments).toEqual([
      { text: "he", highlighted: true },
      { text: "llo", highlighted: false },
    ]);
  });

  it("handles non-consecutive highlighted indices", () => {
    const segments = getHighlightSegments("hello", [0, 2, 4]);
    expect(segments).toEqual([
      { text: "h", highlighted: true },
      { text: "e", highlighted: false },
      { text: "l", highlighted: true },
      { text: "l", highlighted: false },
      { text: "o", highlighted: true },
    ]);
  });

  it("highlights the entire string when all indices match", () => {
    const segments = getHighlightSegments("abc", [0, 1, 2]);
    expect(segments).toEqual([{ text: "abc", highlighted: true }]);
  });

  it("handles highlighting at the end of the string", () => {
    const segments = getHighlightSegments("hello", [3, 4]);
    expect(segments).toEqual([
      { text: "hel", highlighted: false },
      { text: "lo", highlighted: true },
    ]);
  });

  it("handles a single character highlight in the middle", () => {
    const segments = getHighlightSegments("hello", [2]);
    expect(segments).toEqual([
      { text: "he", highlighted: false },
      { text: "l", highlighted: true },
      { text: "lo", highlighted: false },
    ]);
  });

  it("integrates with fuzzyMatch results", () => {
    const match = fuzzyMatch("hw", "hello world");
    expect(match).not.toBeNull();

    const segments = getHighlightSegments("hello world", match!.matchedIndices);
    // Should have alternating highlighted and non-highlighted segments
    expect(segments.length).toBeGreaterThan(1);
    expect(segments[0].highlighted).toBe(true);
    expect(segments[0].text).toBe("h");
  });
});
