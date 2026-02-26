"use client";

import { useState } from "react";

interface ExpandableBioProps {
  bio: string;
}

export function ExpandableBio({ bio }: ExpandableBioProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > 200;

  return (
    <div>
      <p
        className={`text-base leading-relaxed text-[var(--neutral-gray)] first-letter:text-3xl first-letter:font-bold first-letter:text-[var(--foreground)] first-letter:leading-none first-letter:mr-0.5 first-letter:float-left ${
          !expanded && isLong ? "line-clamp-3" : ""
        }`}
      >
        {bio}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--secondary)] transition-colors"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
