"use client";

import React, { forwardRef, useId } from "react";


import FormField from "./FormField";

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
      id,
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

    const generatedId = useId();
    const fieldId = id || generatedId;

    return (
      <FormField id={fieldId} label={label} error={error} hint={hint} required={required} badge={showCount && maxLength ? `${currentLength} / ${maxLength}` : undefined}>
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
            id={fieldId}
            required={required}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={[props["aria-describedby"], (error || hint) && `${fieldId}-description`].filter(Boolean).join(" ") || undefined}
            className={`min-w-0 w-full py-2.5 text-xs rounded-xl transition-all duration-150 outline-hidden font-medium resize-y
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

      </FormField>
    );
  }
);

CustomTextarea.displayName = "CustomTextarea";
