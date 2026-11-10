"use client";
import { useUiText } from "@/lib/ui-text";

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  badge?: ReactNode;
  labelEnd?: ReactNode;
  children: ReactNode;
}

export default function FormField({
  id,
  label,
  error,
  hint,
  required,
  badge,
  labelEnd,
  children,
}: FormFieldProps) {
  const ui = useUiText();
  const resolvedLabel = label ? ui(label) : undefined;
  const displayLabel =
    resolvedLabel && required
      ? resolvedLabel.replace(/\s*\*$/, "")
      : resolvedLabel;

  return (
    <div className="w-full min-w-0 space-y-2">
      {(displayLabel || badge || labelEnd) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {displayLabel ? (
            <label
              id={`${id}-label`}
              htmlFor={id}
              className="flex items-center gap-1 text-sm sm:text-[0.9375rem] font-semibold text-slate-700 dark:text-slate-300 leading-snug"
            >
              <span>{displayLabel}</span>
              {required && (
                <span
                  aria-hidden="true"
                  className="text-rose-700"
                >
                  *
                </span>
              )}
            </label>
          ) : (
            <span />
          )}

          {(badge || labelEnd) && (
            <div className="flex items-center gap-2 shrink-0">
              {badge && (
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {typeof badge === "string" ? ui(badge) : badge}
                </span>
              )}
              {labelEnd}
            </div>
          )}
        </div>
      )}
      {children}
      {(error || hint) && (
        <p
          id={`${id}-description`}
          role={error ? "alert" : undefined}
          className={`flex items-start gap-1.5 text-sm leading-relaxed ${
            error
              ? "text-rose-700 dark:text-rose-400 font-medium"
              : "text-[var(--text-muted)] dark:text-slate-400"
          }`}
        >
          {error && (
            <AlertCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
          )}
          <span>{ui(error || hint)}</span>
        </p>
      )}
    </div>
  );
}
