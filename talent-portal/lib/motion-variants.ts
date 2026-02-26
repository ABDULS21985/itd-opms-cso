"use client";

import { useState, useEffect } from "react";
import type { Variants, Transition } from "framer-motion";

// ──────────────────────────────────────────────
// Reduced Motion
// ──────────────────────────────────────────────

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ──────────────────────────────────────────────
// Shared Easing & Timing
// ──────────────────────────────────────────────

export const easings = {
  /** Expo-out: fast start, smooth deceleration */
  expoOut: [0.16, 1, 0.3, 1] as const,
  /** Spring-like overshoot */
  springy: [0.22, 1.2, 0.36, 1] as const,
  /** Smooth ease-out */
  smooth: [0.25, 0.46, 0.45, 0.94] as const,
};

export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  entrance: 0.4,
};

// ──────────────────────────────────────────────
// Button Variants
// ──────────────────────────────────────────────

export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2, ease: easings.smooth } },
  press: { scale: 0.97, transition: { duration: 0.1 } },
};

export const destructiveButtonVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -4, 4, -4, 4, -2, 2, 0],
    transition: { duration: 0.4 },
  },
};

// ──────────────────────────────────────────────
// Card Variants
// ──────────────────────────────────────────────

export const cardHoverVariants: Variants = {
  idle: { y: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  hover: {
    y: -4,
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)",
    transition: { duration: 0.25, ease: easings.expoOut },
  },
  press: {
    y: -2,
    scale: 0.99,
    transition: { duration: 0.1 },
  },
};

export const cardEntranceVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: durations.entrance,
      ease: easings.expoOut,
    },
  }),
};

// ──────────────────────────────────────────────
// List / Stagger Variants
// ──────────────────────────────────────────────

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.entrance, ease: easings.expoOut },
  },
};

export const listSlideVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.35,
      ease: easings.expoOut,
    },
  }),
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

// ──────────────────────────────────────────────
// Badge Variants
// ──────────────────────────────────────────────

export const badgePulseVariants: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

// ──────────────────────────────────────────────
// Modal / Overlay Variants
// ──────────────────────────────────────────────

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: easings.expoOut },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.15 },
  },
};

export const slideOverVariants: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { duration: 0.3, ease: easings.expoOut } },
  exit: { x: "100%", transition: { duration: 0.2 } },
};

// ──────────────────────────────────────────────
// Page / Section Transitions
// ──────────────────────────────────────────────

export const pageTransitionVariants: Variants = {
  enter: { opacity: 0, y: 8 },
  active: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easings.expoOut },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15 },
  },
};

export const tabContentVariants: Variants = {
  enter: { opacity: 0, x: 8 },
  active: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: easings.expoOut },
  },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};

// ──────────────────────────────────────────────
// Sort Arrow
// ──────────────────────────────────────────────

export const sortArrowTransition: Transition = {
  duration: 0.2,
  ease: easings.smooth,
};

// ──────────────────────────────────────────────
// Float (for empty states)
// ──────────────────────────────────────────────

export const floatVariants: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

// ──────────────────────────────────────────────
// Expand / Collapse
// ──────────────────────────────────────────────

export const expandVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: "hidden" },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "hidden",
    transition: { duration: 0.25, ease: easings.expoOut },
  },
};
