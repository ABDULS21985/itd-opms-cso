"use client";

import { type ReactNode, type HTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion, cardEntranceVariants, easings } from "@/lib/motion-variants";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  /** Index for stagger entrance animation */
  index?: number;
  /** Color for left-border accent */
  accentColor?: string;
  /** Enable hover elevation effect */
  hoverable?: boolean;
  /** Additional wrapper class */
  className?: string;
}

export function AnimatedCard({
  children,
  index = 0,
  accentColor,
  hoverable = true,
  className,
  ...rest
}: AnimatedCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      custom={index}
      variants={reduced ? undefined : cardEntranceVariants}
      initial={reduced ? undefined : "hidden"}
      animate={reduced ? undefined : "visible"}
      whileHover={
        hoverable && !reduced
          ? {
              y: -4,
              boxShadow:
                "0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)",
              transition: { duration: 0.25, ease: easings.expoOut },
            }
          : undefined
      }
      whileTap={
        hoverable && !reduced
          ? { scale: 0.99, transition: { duration: 0.1 } }
          : undefined
      }
      className={cn(
        "relative rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] transition-shadow",
        accentColor && "border-l-[3px]",
        className,
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Grid wrapper that staggers its AnimatedCard children */
export function AnimatedCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={
        reduced
          ? undefined
          : {
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.06 },
              },
            }
      }
      initial={reduced ? undefined : "hidden"}
      animate={reduced ? undefined : "visible"}
      className={className}
    >
      {children}
    </motion.div>
  );
}
