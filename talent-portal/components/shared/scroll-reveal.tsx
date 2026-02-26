"use client";

import { type ReactNode, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useReducedMotion, easings, durations } from "@/lib/motion-variants";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds before the animation starts */
  delay?: number;
  /** Direction the element slides in from */
  direction?: "up" | "down" | "left" | "right";
  /** Distance in pixels */
  distance?: number;
  /** How much of the element should be visible before triggering (0–1) */
  amount?: number;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 24,
  amount = 0.2,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount });
  const reduced = useReducedMotion();

  const axis = direction === "up" || direction === "down" ? "y" : "x";
  const sign = direction === "down" || direction === "right" ? -1 : 1;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={
        reduced
          ? undefined
          : { opacity: 0, [axis]: distance * sign }
      }
      animate={
        reduced
          ? undefined
          : isInView
            ? { opacity: 1, [axis]: 0 }
            : { opacity: 0, [axis]: distance * sign }
      }
      transition={
        reduced
          ? undefined
          : {
              duration: durations.entrance,
              delay,
              ease: easings.expoOut,
            }
      }
      style={reduced ? undefined : { willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
