"use client";
import { useUiText, LocalizedText } from "@/lib/ui-text";

import React, { forwardRef, useId } from "react";
import { X } from "lucide-react";

import FormField from "./FormField";

export interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  badge?: string;
  expandable?: boolean;
  openOnClick?: boolean;
  expandTitle?: string;
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
      trailingAction,
      clearable,
      onClear,
      badge,
      expandable,
      openOnClick,
      expandTitle,
      required,
      className = "",
      disabled,
      readOnly,
      value,
      dir,
      ...props
    },
    ref,
  ) => {
    void expandable;
    void openOnClick;
    void expandTitle;
    const ui = useUiText();
    const hasValue =
      value !== undefined && value !== null && String(value).length > 0;

    const generatedId = useId();
    const fieldId = id || generatedId;

    const hasClearButton = Boolean(clearable && hasValue && !disabled);
    const hasEndControl = hasClearButton || Boolean(trailingAction);

    const inputControl = (
      <div dir={dir} className="relative flex min-w-0 flex-1 items-center">
        {icon && (
          <div
            aria-hidden="true"
            className="absolute start-3 text-[var(--text-muted)] pointer-events-none flex items-center justify-center"
          >
            <LocalizedText value={icon} />
          </div>
        )}

        <input
          ref={ref}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
          dir={dir}
          {...props}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={
            [
              props["aria-describedby"],
              (error || hint) && `${fieldId}-description`,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`min-w-0 w-full min-h-11 sm:min-h-9 py-1.5 text-base sm:text-[0.8125rem] rounded-lg transition-all duration-150 outline-hidden font-medium leading-normal
            ${icon ? "ps-9" : "ps-3"}
            ${hasEndControl ? "pe-11 sm:pe-10" : trailingIcon ? "pe-9" : "pe-3"}
            ${
              error
                ? "bg-rose-500/5 border border-rose-500/60 text-rose-950 dark:text-rose-100 placeholder:text-rose-700/75 dark:placeholder:text-rose-300/75 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                : "bg-[var(--input-bg)] border border-[var(--control-border)] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20"
            }
            ${disabled ? "opacity-55 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}
            ${className}`}
        />

        {hasClearButton && (
          <button
            type="button"
            onClick={onClear}
            className="absolute end-0 sm:end-1 top-1/2 -translate-y-1/2 h-11 w-11 sm:h-7 sm:w-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition rounded-lg cursor-pointer"
            aria-label={label ? ui(`مسح ${label}`) : ui("مسح الحقل")}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {trailingAction && !hasClearButton && (
          <div className="absolute end-1 top-1/2 -translate-y-1/2 flex items-center">
            {trailingAction}
          </div>
        )}

        {trailingIcon && !trailingAction && !hasClearButton && (
          <div
            aria-hidden="true"
            className="absolute end-3 text-[var(--text-muted)] pointer-events-none flex items-center justify-center"
          >
            <LocalizedText value={trailingIcon} />
          </div>
        )}
      </div>
    );

    return (
      <FormField
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        badge={badge}
      >
        {inputControl}
      </FormField>
    );
  },
);

CustomInput.displayName = "CustomInput";
