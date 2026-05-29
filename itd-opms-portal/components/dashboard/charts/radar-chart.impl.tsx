"use client";

import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface RadarChartProps {
  data: Array<Record<string, string | number>>;
  dataKeys: Array<{ key: string; label?: string; color?: string; fillOpacity?: number }>;
  angleKey?: string;
  height?: number;
  showLegend?: boolean;
  domain?: [number, number];
}

export function RadarChart({
  data,
  dataKeys,
  angleKey = "subject",
  height = 300,
  showLegend = true,
  domain = [0, 100],
}: RadarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-[var(--text-muted)]">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey={angleKey}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={domain}
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
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
        {dataKeys.map((dk) => (
          <Radar
            key={dk.key}
            name={dk.label || dk.key}
            dataKey={dk.key}
            stroke={dk.color || "#1B7340"}
            fill={dk.color || "#1B7340"}
            fillOpacity={dk.fillOpacity ?? 0.2}
            strokeWidth={2}
            animationBegin={200}
            animationDuration={800}
          />
        ))}
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
