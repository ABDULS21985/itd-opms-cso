"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface WaterfallItem {
  name: string;
  value: number;
  type: "increase" | "decrease" | "total";
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  height?: number;
  formatValue?: (value: number) => string;
}

export function WaterfallChart({
  data,
  height = 280,
  formatValue = (v) => v.toLocaleString(),
}: WaterfallChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-[var(--text-muted)]">No data available</p>
      </div>
    );
  }

  // Compute waterfall positions
  let running = 0;
  const processed = data.map((item) => {
    if (item.type === "total") {
      const result = { ...item, base: 0, height: item.value };
      running = item.value;
      return result;
    }
    const base = running;
    if (item.type === "increase") {
      running += item.value;
      return { ...item, base, height: item.value };
    }
    // decrease
    running -= item.value;
    return { ...item, base: running, height: item.value };
  });

  const chartData = processed.map((item) => ({
    name: item.name,
    invisible: item.base,
    value: item.height,
    type: item.type,
  }));

  const colorMap = { increase: "#22C55E", decrease: "#EF4444", total: "#3B82F6" };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
          formatter={(value, name) => {
            if (name === "invisible") return [null, null];
            return [formatValue(Number(value)), "Amount"];
          }}
        />
        <ReferenceLine y={0} stroke="var(--border)" />
        {/* Invisible base bar */}
        <Bar dataKey="invisible" stackId="waterfall" fill="transparent" />
        {/* Visible value bar */}
        <Bar
          dataKey="value"
          stackId="waterfall"
          radius={[4, 4, 0, 0]}
          animationBegin={200}
          animationDuration={600}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={colorMap[entry.type as keyof typeof colorMap]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
