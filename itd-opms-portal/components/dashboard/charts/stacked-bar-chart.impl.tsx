"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "#1B7340", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
];

interface StackedBarChartProps {
  data: Array<Record<string, string | number>>;
  categories: string[];
  categoryKey?: string;
  height?: number;
  layout?: "horizontal" | "vertical";
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  barSize?: number;
}

export function StackedBarChart({
  data,
  categories,
  categoryKey = "name",
  height = 300,
  layout = "vertical",
  colors = CHART_COLORS,
  showGrid = true,
  showLegend = true,
  barSize = 20,
}: StackedBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-[var(--text-muted)]">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
          />
        )}
        {layout === "vertical" ? (
          <>
            <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <YAxis
              dataKey={categoryKey}
              type="category"
              width={100}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={categoryKey} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        />
        {showLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{value}</span>
            )}
          />
        )}
        {categories.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="stack"
            fill={colors[i % colors.length]}
            barSize={barSize}
            radius={i === categories.length - 1 ? [0, 4, 4, 0] : undefined}
            animationBegin={200 + i * 100}
            animationDuration={600}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
