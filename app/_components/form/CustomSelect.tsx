"use client";

import React, { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

import FormField from "./FormField";

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  options: SelectOption[];
  badge?: string;
}

export const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>(
  (
    {
      id,
      label,
      error,
      hint,
      icon,
      options,
      badge,
      required,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
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

          <select
            ref={ref}
            disabled={disabled}
            {...props}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={[props["aria-describedby"], (error || hint) && `${fieldId}-description`].filter(Boolean).join(" ") || undefined}
            className={`min-w-0 w-full h-11 text-xs rounded-xl transition-all duration-150 outline-hidden font-medium appearance-none cursor-pointer
              ${icon ? "pr-9" : "pr-3.5"}
              pl-9
              ${
                error
                  ? "bg-rose-500/5 border border-rose-500/50 text-rose-950 dark:text-rose-100 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : "bg-white dark:bg-slate-900/80 border theme-border text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}
              ${className}`}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

      </FormField>
    );
  }
);

CustomSelect.displayName = "CustomSelect";
