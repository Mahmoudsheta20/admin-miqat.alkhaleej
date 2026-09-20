"use client";

import React, { forwardRef } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

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
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>{label}</span>
              {required && <span className="text-rose-500 font-black">*</span>}
            </label>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                {badge}
              </span>
            )}
          </div>
        )}

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
            className={`w-full h-11 text-xs rounded-xl transition-all duration-150 outline-hidden font-medium appearance-none cursor-pointer
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

        {error && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {hint && !error && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
        )}
      </div>
    );
  }
);

CustomSelect.displayName = "CustomSelect";
