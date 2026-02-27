export interface FuzzyMatchResult {
  score: number;
  matchedIndices: number[];
}

export function fuzzyMatch(
  query: string,
  text: string
): FuzzyMatchResult | null {
  if (!query) return null;

  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const matchedIndices: number[] = [];

  let queryIdx = 0;
  let score = 0;
  let prevMatchIdx = -2;

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      matchedIndices.push(i);

      // Consecutive match bonus
      if (i === prevMatchIdx + 1) {
        score += 3;
      }

      // Word boundary bonus (start of word)
      if (
        i === 0 ||
        lowerText[i - 1] === " " ||
        lowerText[i - 1] === "-" ||
        lowerText[i - 1] === "_" ||
        lowerText[i - 1] === "/"
      ) {
        score += 5;
      }

      // Match at start bonus
      if (i === 0) {
        score += 8;
      }

      score += 1;
      prevMatchIdx = i;
      queryIdx++;
    }
  }

  // Not all characters matched
  if (queryIdx !== lowerQuery.length) {
    return null;
  }

  return { score, matchedIndices };
}

export function getHighlightSegments(
  text: string,
  matchedIndices: number[]
): Array<{ text: string; highlighted: boolean }> {
  if (!matchedIndices.length) {
    return [{ text, highlighted: false }];
  }

  const segments: Array<{ text: string; highlighted: boolean }> = [];
  const matchSet = new Set(matchedIndices);
  let current = "";
  let currentHighlighted = matchSet.has(0);

  for (let i = 0; i < text.length; i++) {
    const isMatch = matchSet.has(i);

    if (isMatch !== currentHighlighted) {
      if (current) {
        segments.push({ text: current, highlighted: currentHighlighted });
      }
      current = text[i];
      currentHighlighted = isMatch;
    } else {
      current += text[i];
    }
  }

  if (current) {
    segments.push({ text: current, highlighted: currentHighlighted });
  }

  return segments;
}
