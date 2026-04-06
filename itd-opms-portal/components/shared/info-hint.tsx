"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";

export function InfoHint({
  text,
  position = "bottom",
  size = 14,
  className = "",
}: {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  size?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <span
      className={`inline-flex items-center cursor-help relative ${className}`}
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShow(true);
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setShow(false), 150);
      }}
      onClick={(e) => { e.stopPropagation(); setShow((v) => !v); }}
    >
      <HelpCircle
        size={size}
        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 pointer-events-none"
            style={{
              ...positionStyles[position],
              width: "max-content",
              maxWidth: 280,
            }}
          >
            <div
              className="px-3 py-2 rounded-lg text-[11px] leading-relaxed font-normal shadow-lg border"
              style={{
                backgroundColor: "var(--surface-0)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
