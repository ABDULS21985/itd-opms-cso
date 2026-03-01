"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface HeatMapCell {
  row: number;
  col: number;
  value: number;
  items?: Array<{ id: string; title: string }>;
}

interface HeatMapGridProps {
  data: HeatMapCell[];
  rowLabels?: string[];
  colLabels?: string[];
  rowTitle?: string;
  colTitle?: string;
  height?: number;
  maxValue?: number;
}

const DEFAULT_ROW_LABELS = ["Very High", "High", "Medium", "Low", "Very Low"];
const DEFAULT_COL_LABELS = ["Very Low", "Low", "Medium", "High", "Very High"];

function getCellColor(row: number, col: number, value: number): string {
  if (value === 0) return "var(--surface-2)";
  const score = (row + 1) * (col + 1);
  if (score >= 16) return "#DC2626";
  if (score >= 10) return "#F97316";
  if (score >= 6) return "#F59E0B";
  if (score >= 3) return "#84CC16";
  return "#22C55E";
}

function getCellOpacity(value: number, maxVal: number): number {
  if (value === 0) return 0.3;
  return 0.5 + (value / Math.max(maxVal, 1)) * 0.5;
}

export function HeatMapGrid({
  data,
  rowLabels = DEFAULT_ROW_LABELS,
  colLabels = DEFAULT_COL_LABELS,
  rowTitle = "Impact",
  colTitle = "Likelihood",
  height = 300,
}: HeatMapGridProps) {
  const gridMap = useMemo(() => {
    const map: Record<string, HeatMapCell> = {};
    let maxVal = 0;
    for (const cell of data) {
      const key = `${cell.row}-${cell.col}`;
      map[key] = cell;
      if (cell.value > maxVal) maxVal = cell.value;
    }
    return { map, maxVal };
  }, [data]);

  const rows = rowLabels.length;
  const cols = colLabels.length;

  return (
    <div style={{ minHeight: height }}>
      <div className="flex items-end gap-1">
        {/* Row title */}
        <div className="flex items-center justify-center w-6">
          <span
            className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {rowTitle}
          </span>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)` }}>
            {/* Header row - empty corner + column labels */}
            <div />
            {colLabels.map((label, ci) => (
              <div key={ci} className="text-center">
                <span className="text-[9px] font-medium text-[var(--text-muted)]">{label}</span>
              </div>
            ))}

            {/* Data rows (reversed so high impact is at top) */}
            {Array.from({ length: rows }, (_, ri) => {
              const rowIdx = rows - 1 - ri;
              return (
                <>
                  <div key={`label-${rowIdx}`} className="flex items-center justify-end pr-2">
                    <span className="text-[9px] font-medium text-[var(--text-muted)]">
                      {rowLabels[ri]}
                    </span>
                  </div>
                  {Array.from({ length: cols }, (_, ci) => {
                    const key = `${rowIdx}-${ci}`;
                    const cell = gridMap.map[key];
                    const value = cell?.value ?? 0;
                    const bgColor = getCellColor(rowIdx, ci, value);
                    const opacity = getCellOpacity(value, gridMap.maxVal);

                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.05 * (ri * cols + ci) }}
                        className="aspect-square rounded-md flex items-center justify-center cursor-default relative group"
                        style={{ backgroundColor: bgColor, opacity }}
                        title={cell?.items?.map((i) => i.title).join(", ") || `${value} risks`}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">
                          {value > 0 ? value : ""}
                        </span>
                        {value > 0 && cell?.items && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div
                              className="rounded-lg border p-2 shadow-lg max-w-48 text-[10px]"
                              style={{
                                backgroundColor: "var(--surface-1)",
                                borderColor: "var(--border)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {cell.items.slice(0, 5).map((item) => (
                                <div key={item.id} className="truncate">{item.title}</div>
                              ))}
                              {cell.items.length > 5 && (
                                <div className="text-[var(--text-muted)]">
                                  +{cell.items.length - 5} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </>
              );
            })}
          </div>

          {/* Column title */}
          <div className="text-center mt-2">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {colTitle}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
