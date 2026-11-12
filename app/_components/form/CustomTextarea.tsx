"use client";
import { LocalizedText } from "@/lib/ui-text";

import React, { forwardRef, useId, useState } from "react";

import FormField from "./FormField";

export interface CustomTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  showCount?: boolean;
  expandable?: boolean;
  openOnClick?: boolean;
  expandTitle?: string;
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
      expandable,
      openOnClick,
      expandTitle,
      required,
      className = "",
      disabled,
      readOnly,
      value,
      onChange,
      maxLength,
      dir,
      ...props
    },
    ref
  ) => {
    void expandable;
    void openOnClick;
    void expandTitle;
    const [uncontrolledLength, setUncontrolledLength] = useState(0);

    const currentLength =
      value !== undefined && value !== null
        ? String(value).length
        : uncontrolledLength;

    const generatedId = useId();
    const fieldId = id || generatedId;

    return (
      <FormField
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        badge={showCount && maxLength ? `${currentLength} / ${maxLength}` : undefined}
      >
        <div className="relative">
          {icon && (
            <div
              aria-hidden="true"
              className="absolute top-2.5 start-3 text-[var(--text-muted)] pointer-events-none"
            >
              <LocalizedText value={icon} />
            </div>
          )}

          <textarea
            ref={ref}
            disabled={disabled}
            readOnly={readOnly}
            value={value}
            maxLength={maxLength}
            dir={dir}
            onChange={(event) => {
              setUncontrolledLength(event.target.value.length);
              onChange?.(event);
            }}
            {...props}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={
              [props["aria-describedby"], (error || hint) && `${fieldId}-description`]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={`min-w-0 w-full min-h-22 sm:min-h-20 py-2 text-base sm:text-[0.8125rem] rounded-lg transition-all duration-150 outline-hidden font-medium leading-relaxed resize-y
              ${icon ? "ps-9" : "ps-3"}
              pe-3
              ${
                error
                  ? "bg-rose-500/5 border border-rose-500/60 text-rose-950 dark:text-rose-100 placeholder:text-rose-700/75 dark:placeholder:text-rose-300/75 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                  : "bg-[var(--input-bg)] border border-[var(--control-border)] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20"
              }
              ${disabled ? "opacity-55 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}
              ${className}`}
          />
        </div>
      </FormField>
    );
  }
);

CustomTextarea.displayName = "CustomTextarea";
