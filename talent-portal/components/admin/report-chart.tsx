"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChartConfig {
  xKey?: string;
  yKey?: string;
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
}

interface ReportChartProps {
  type: "bar" | "pie" | "line";
  data: any[];
  config: ChartConfig;
  title?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Default colors (Digibit branding)
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  "var(--primary)",
  "var(--accent-orange)",
  "var(--success)",
  "var(--info)",
  "var(--error)",
  "var(--badge-purple-dot)",
  "var(--warning)",
  "#EC4899",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportChart({
  type,
  data,
  config,
  title,
  className = "",
}: ReportChartProps) {
  const {
    xKey = "name",
    yKey = "value",
    dataKey = "value",
    nameKey = "name",
    colors = DEFAULT_COLORS,
    showGrid = true,
    showLegend = true,
  } = config;

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "var(--surface-0)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      fontSize: "12px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    },
  };

  return (
    <div
      className={`rounded-2xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-6 shadow-sm ${className}`}
    >
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h3>
      )}

      <ResponsiveContainer width="100%" height={320}>
        {type === "bar" ? (
          <BarChart data={data}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--surface-3)"
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: "var(--neutral-gray)" }}
              axisLine={{ stroke: "var(--surface-3)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--neutral-gray)" }}
              axisLine={{ stroke: "var(--surface-3)" }}
              tickLine={false}
            />
            <Tooltip {...tooltipStyle} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
              />
            )}
            <Bar
              dataKey={dataKey}
              fill={colors[0]}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={data}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--surface-3)"
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: "var(--neutral-gray)" }}
              axisLine={{ stroke: "var(--surface-3)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--neutral-gray)" }}
              axisLine={{ stroke: "var(--surface-3)" }}
              tickLine={false}
            />
            <Tooltip {...tooltipStyle} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], r: 4 }}
              activeDot={{ r: 6, fill: colors[0] }}
            />
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={120}
              innerRadius={60}
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: "var(--neutral-gray)" }}
            >
              {data.map((_, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={colors[idx % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
              />
            )}
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
