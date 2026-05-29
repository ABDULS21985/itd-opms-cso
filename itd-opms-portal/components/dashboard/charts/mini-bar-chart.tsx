"use client";

import dynamic from "next/dynamic";

// Lazy-loaded so recharts stays out of the initial bundle. Small inline chart:
// skeleton fills its container without forcing a min-height to avoid layout shift.
export const MiniBarChart = dynamic(
  () => import("./mini-bar-chart.impl").then((m) => m.MiniBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded bg-muted/20" />
    ),
  },
);
