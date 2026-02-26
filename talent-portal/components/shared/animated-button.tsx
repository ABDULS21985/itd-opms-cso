"use client";

import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion-variants";

type Variant = "primary" | "secondary" | "destructive" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

interface AnimatedButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  success?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  children?: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-white hover:bg-[var(--secondary)] shadow-sm",
  secondary:
    "bg-[var(--surface-0)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--surface-1)] shadow-sm",
  destructive:
    "bg-[var(--error)] text-white hover:bg-[var(--error-dark)]",
  ghost:
    "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
  success:
    "bg-[var(--success)] text-white hover:bg-[var(--success-dark)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-5 py-3 text-sm gap-2 rounded-xl",
};

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  function AnimatedButton(
    {
      variant = "primary",
      size = "md",
      loading = false,
      success = false,
      icon,
      iconPosition = "left",
      children,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const reduced = useReducedMotion();
    const isDisabled = disabled || loading;

    const motionProps = reduced
      ? {}
      : {
          whileHover: isDisabled ? undefined : { scale: 1.02 },
          whileTap: isDisabled ? undefined : { scale: 0.97 },
          transition: { duration: 0.15 },
        };

    const iconNode = success ? (
      <Check size={size === "sm" ? 12 : 14} />
    ) : loading ? (
      <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" />
    ) : (
      icon
    );

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "relative inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none overflow-hidden",
          variantStyles[variant],
          sizeStyles[size],
          success && "bg-[var(--success)] hover:bg-[var(--success-dark)]",
          className,
        )}
        {...motionProps}
        {...rest}
      >
        {/* Shimmer overlay for primary variant */}
        {variant === "primary" && !reduced && (
          <span className="absolute inset-0 btn-shimmer pointer-events-none" />
        )}

        {iconNode && iconPosition === "left" && iconNode}
        {children && <span>{children}</span>}
        {iconNode && iconPosition === "right" && iconNode}
      </motion.button>
    );
  },
);
