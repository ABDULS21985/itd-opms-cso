"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  name: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "textarea"
    | "select";
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  success?: boolean;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  options?: { value: string; label: string }[];
  className?: string;
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  success = false,
  description,
  required = false,
  disabled = false,
  rows = 3,
  options = [],
  className,
}: FormFieldProps) {
  const id = useId();
  const [_focused, setFocused] = useState(false);

  const inputClass = cn(
    "w-full rounded-xl border bg-[var(--surface-0)] text-sm transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]",
    error
      ? "border-[var(--error)] ring-2 ring-[var(--error)]/10 animate-[shake-error_0.3s_ease-in-out]"
      : success
        ? "border-[var(--success)]"
        : "border-[var(--border)]",
    disabled && "opacity-50 cursor-not-allowed bg-[var(--surface-1)]",
  );

  const renderInput = () => {
    if (type === "textarea") {
      return (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={cn(inputClass, "px-3.5 py-2.5 resize-none")}
        />
      );
    }

    if (type === "select") {
      return (
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          disabled={disabled}
          className={cn(inputClass, "px-3.5 py-2.5")}
        >
          <option value="">{placeholder || "Select..."}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={cn(inputClass, "h-10 px-3.5")}
      />
    );
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
      >
        {label}
        {required && <span className="text-[var(--error)] ml-0.5">*</span>}
      </label>

      <div className="relative">
        {renderInput()}

        {/* Success checkmark */}
        <AnimatePresence>
          {success && !error && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--success)]"
            >
              <Check size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-1 text-xs text-[var(--error)] mt-1.5 font-medium"
          >
            <AlertCircle size={12} />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Description */}
      {description && !error && (
        <p className="text-xs text-[var(--neutral-gray)] mt-1">
          {description}
        </p>
      )}
    </div>
  );
}
