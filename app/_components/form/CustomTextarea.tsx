"use client";

import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

export interface CustomTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  showCount?: boolean;
}

export const CustomTextarea = forwardRef<HTMLTextAreaElement, CustomTextareaProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      showCount,
      required,
      className = "",
      disabled,
      value,
      maxLength,
      ...props
    },
    ref
  ) => {
    const currentLength = value ? String(value).length : 0;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>{label}</span>
              {required && <span className="text-rose-500 font-black">*</span>}
            </label>
            {showCount && maxLength && (
              <span className="text-[10px] font-mono text-slate-400">
                {currentLength} / {maxLength}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute top-3 right-3 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}

          <textarea
            ref={ref}
            disabled={disabled}
            value={value}
            maxLength={maxLength}
            {...props}
            className={`w-full py-2.5 text-xs rounded-xl transition-all duration-150 outline-hidden font-medium resize-y
              ${icon ? "pr-9" : "pr-3.5"}
              pl-3.5
              ${
                error
                  ? "bg-rose-500/5 border border-rose-500/50 text-rose-950 dark:text-rose-100 placeholder:text-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : "bg-white dark:bg-slate-900/80 border theme-border text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}
              ${className}`}
          />
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

CustomTextarea.displayName = "CustomTextarea";
