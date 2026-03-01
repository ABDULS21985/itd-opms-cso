"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

const CHART_COLORS = [
  "#1B7340", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#6366F1",
];

interface TreemapDataItem {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

interface TreemapChartProps {
  data: TreemapDataItem[];
  height?: number;
  colors?: string[];
}

function CustomTreemapContent(props: {
  x: number; y: number; width: number; height: number;
  name: string; value: number; index: number; colors: string[];
}) {
  const { x, y, width, height: h, name, value, index, colors } = props;
  if (width < 30 || h < 25) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={h}
        rx={4}
        style={{
          fill: colors[index % colors.length],
          stroke: "var(--surface-0)",
          strokeWidth: 2,
          opacity: 0.85,
        }}
      />
      {width > 50 && h > 35 && (
        <>
          <text
            x={x + width / 2}
            y={y + h / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight={600}
          >
            {name.length > width / 8 ? name.slice(0, Math.floor(width / 8)) + "..." : name}
          </text>
          <text
            x={x + width / 2}
            y={y + h / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </text>
        </>
      )}
    </g>
  );
}

export function TreemapChart({
  data,
  height = 250,
  colors = CHART_COLORS,
}: TreemapChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-[var(--text-muted)]">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={data}
        dataKey="value"
        nameKey="name"
        stroke="var(--surface-0)"
        animationBegin={200}
        animationDuration={800}
        content={<CustomTreemapContent x={0} y={0} width={0} height={0} name="" value={0} index={0} colors={colors} />}
      >
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
