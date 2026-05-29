"use client";

import dynamic from "next/dynamic";

// Lazy-loaded so recharts is only fetched when a chart actually renders,
// keeping the (large) recharts chunk out of every route's initial bundle.
export const StackedBarChart = dynamic(
  () => import("./stacked-bar-chart.impl").then((m) => m.StackedBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[160px] w-full animate-pulse rounded-lg bg-muted/30" />
    ),
  },
);
