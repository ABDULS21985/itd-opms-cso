"use client";

import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";

interface MiniBarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  width?: number;
  height?: number;
  defaultColor?: string;
}

export function MiniBarChart({
  data,
  width = 80,
  height = 28,
  defaultColor = "#1B7340",
}: MiniBarChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="value" radius={[2, 2, 0, 0]} animationDuration={600}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color || defaultColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
