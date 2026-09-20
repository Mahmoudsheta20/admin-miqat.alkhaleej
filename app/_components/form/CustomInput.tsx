"use client";

import React, { forwardRef } from "react";
import { AlertCircle, X } from "lucide-react";

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

          <input
            ref={ref}
            disabled={disabled}
            value={value}
            {...props}
            className={`w-full h-11 text-xs rounded-xl transition-all duration-150 outline-hidden font-medium
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
              tabIndex={-1}
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

        {error && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 animate-fadeIn">
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

CustomInput.displayName = "CustomInput";
