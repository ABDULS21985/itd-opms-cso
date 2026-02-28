"use client";

import { motion } from "framer-motion";

interface FunnelItem {
  name: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelItem[];
  height?: number;
}

export function FunnelChart({ data, height = 280 }: FunnelChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-[var(--text-muted)]">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-2" style={{ minHeight: height }}>
      {data.map((item, index) => {
        const widthPct = Math.max(20, (item.value / maxValue) * 100);
        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";

        return (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
            style={{ originX: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 flex justify-center">
                <div
                  className="rounded-lg py-3 px-4 flex items-center justify-between transition-all"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: item.color,
                    minWidth: 120,
                  }}
                >
                  <span className="text-white text-xs font-semibold truncate">{item.name}</span>
                  <span className="text-white text-sm font-bold tabular-nums ml-2">{item.value}</span>
                </div>
              </div>
              <span className="text-xs text-[var(--text-muted)] tabular-nums w-12 text-right">
                {percentage}%
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
