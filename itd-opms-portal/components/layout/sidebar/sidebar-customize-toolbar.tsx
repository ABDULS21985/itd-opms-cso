"use client";

import { motion } from "framer-motion";
import { Pencil, Check, RotateCcw } from "lucide-react";

interface SidebarCustomizeToolbarProps {
  isCustomizing: boolean;
  totalHiddenCount: number;
  onDone: () => void;
  onReset: () => void;
}

export function SidebarCustomizeToolbar({
  isCustomizing,
  totalHiddenCount,
  onDone,
  onReset,
}: SidebarCustomizeToolbarProps) {
  if (!isCustomizing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="px-3 pt-2 pb-1 flex-shrink-0 border-b border-[#6B5521]/15"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Pencil size={12} className="text-[#8B6F2E]" />
          <span className="text-xs font-semibold text-[#8B6F2E]">
            Customizing...
          </span>
          {totalHiddenCount > 0 && (
            <span className="text-[10px] bg-[#6B5521]/20 text-[#8B6F2E] px-1.5 py-0.5 rounded-full">
              {totalHiddenCount} hidden
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onDone}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6B5521]/20 text-[#8B6F2E] text-xs font-medium hover:bg-[#6B5521]/30 transition-colors"
        >
          <Check size={12} />
          Done
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-400 text-xs hover:text-gray-200 hover:bg-white/5 transition-colors"
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>
    </motion.div>
  );
}
