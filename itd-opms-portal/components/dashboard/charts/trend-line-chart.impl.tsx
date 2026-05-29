"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#1B7340", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
];

interface TrendLineChartProps {
  data: Array<Record<string, string | number>>;
  lines: Array<{ key: string; label?: string; color?: string }>;
  xKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  fillOpacity?: number;
  areaType?: "monotone" | "linear" | "step";
}

export function TrendLineChart({
  data,
  lines,
  xKey = "name",
  height = 250,
  showGrid = true,
  showLegend = true,
  fillOpacity = 0.15,
  areaType = "monotone",
}: TrendLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-[var(--text-muted)]">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
          />
        )}
        <XAxis
          dataKey={xKey}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
        />
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
        {lines.map((line, i) => {
          const color = line.color || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <Area
              key={line.key}
              type={areaType}
              dataKey={line.key}
              name={line.label || line.key}
              stroke={color}
              fill={color}
              fillOpacity={fillOpacity}
              strokeWidth={2}
              dot={false}
              animationBegin={200}
              animationDuration={800}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
