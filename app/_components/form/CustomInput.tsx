"use client";

import React, { forwardRef, useId } from "react";
import { X } from "lucide-react";

import FormField from "./FormField";

export interface CustomInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  badge?: string;
}

export const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  (
    {
      id,
      label,
      error,
      hint,
      icon,
      trailingIcon,
      clearable,
      onClear,
      badge,
      required,
      className = "",
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    const generatedId = useId();
    const fieldId = id || generatedId;

    return (
      <FormField id={fieldId} label={label} error={error} hint={hint} required={required} badge={badge}>
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled}
            value={value}
            {...props}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={[props["aria-describedby"], (error || hint) && `${fieldId}-description`].filter(Boolean).join(" ") || undefined}
            className={`min-w-0 w-full h-11 text-xs rounded-xl transition-all duration-150 outline-hidden font-medium
              ${icon ? "pr-9" : "pr-3.5"}
              ${clearable || trailingIcon ? "pl-9" : "pl-3.5"}
              ${
                error
                  ? "bg-rose-500/5 border border-rose-500/50 text-rose-950 dark:text-rose-100 placeholder:text-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : "bg-white dark:bg-slate-900/80 border theme-border text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}
              ${className}`}
          />

          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute left-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-0.5 rounded-md"
              aria-label={`مسح ${label || "الحقل"}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {trailingIcon && (!clearable || !hasValue) && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {trailingIcon}
            </div>
          )}
        </div>

      </FormField>
    );
  }
);

CustomInput.displayName = "CustomInput";
