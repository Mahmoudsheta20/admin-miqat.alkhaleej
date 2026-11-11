"use client";
import { useUiText, LocalizedText } from "@/lib/ui-text";
import { triggerNativeValueChange } from "@/lib/top-layer";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";

import React, { forwardRef, useCallback, useId, useRef, useState } from "react";
import { X } from "lucide-react";

import FormField from "./FormField";
import { FullscreenFieldModal } from "./FullscreenFieldModal";

const NON_TEXT_INPUT_TYPES = new Set([
  "hidden",
  "date",
  "time",
  "datetime-local",
  "file",
  "range",
  "checkbox",
  "radio",
]);

export interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
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
      clearable,
      onClear,
      badge,
      expandable = false,
      openOnClick = true,
      expandTitle,
      required,
      className = "",
      disabled,
      readOnly,
      value,
      dir,
      onClick,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const ui = useUiText();
    const isMobile = useIsMobileViewport();
    const internalRef = useRef<HTMLInputElement | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalValue, setModalValue] = useState("");
    const [expandSession, setExpandSession] = useState(0);
    const hasValue =
      value !== undefined && value !== null && String(value).length > 0;

    const generatedId = useId();
    const fieldId = id || generatedId;

    const assignRef = useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const handleOpenExpand = () => {
      if (!isMobile) return;
      const currentVal =
        internalRef.current?.value ??
        (value !== undefined && value !== null ? String(value) : "");
      setModalValue(currentVal);
      setExpandSession((prev) => prev + 1);
      setModalOpen(true);
    };

    const handleApplyExpand = (nextValue: string) => {
      if (internalRef.current) {
        triggerNativeValueChange(internalRef.current, nextValue);
      }
    };

    const fieldTitle = expandTitle || (label ? ui(label) : ui("تحرير الحقل"));
    const inputType = props.type || "text";
    const canExpand =
      isMobile &&
      expandable &&
      !disabled &&
      !readOnly &&
      !NON_TEXT_INPUT_TYPES.has(inputType);
    const shouldAutoExpandOnClick = canExpand && openOnClick;

    const inputControl = (
      <div dir={dir} className="relative flex min-w-0 flex-1 items-center">
        {icon && (
          <div
            aria-hidden="true"
            className="absolute start-3.5 text-[var(--text-muted)] pointer-events-none flex items-center justify-center"
          >
            <LocalizedText value={icon} />
          </div>
        )}

        <input
          ref={assignRef}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
          dir={dir}
          {...props}
          id={fieldId}
          required={required}
          onClick={(event) => {
            onClick?.(event);
            if (shouldAutoExpandOnClick && !event.defaultPrevented) {
              handleOpenExpand();
            }
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (canExpand && !event.defaultPrevented && event.key === "F2") {
              event.preventDefault();
              handleOpenExpand();
            }
          }}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={
            [
              props["aria-describedby"],
              (error || hint) && `${fieldId}-description`,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`min-w-0 w-full min-h-12 py-2.5 text-base rounded-xl transition-all duration-150 outline-hidden font-medium leading-normal
            ${icon ? "ps-10" : "ps-4"}
            ${clearable || trailingIcon ? "pe-11" : "pe-4"}
            ${shouldAutoExpandOnClick ? "cursor-pointer" : ""}
            ${
              error
                ? "bg-rose-500/5 border border-rose-500/60 text-rose-950 dark:text-rose-100 placeholder:text-rose-700/75 dark:placeholder:text-rose-300/75 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                : "bg-[var(--input-bg)] border border-[var(--control-border)] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20"
            }
            ${disabled ? "opacity-55 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}
            ${className}`}
        />

        {clearable && hasValue && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute end-1.5 h-9 w-9 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition rounded-lg cursor-pointer"
            aria-label={label ? ui(`مسح ${label}`) : ui("مسح الحقل")}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {trailingIcon && (!clearable || !hasValue) && (
          <div
            aria-hidden="true"
            className="absolute end-3.5 text-[var(--text-muted)] pointer-events-none flex items-center justify-center"
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

        {canExpand && (
          <FullscreenFieldModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            sessionKey={expandSession}
            title={fieldTitle}
            value={modalValue}
            onApply={handleApplyExpand}
            placeholder={props.placeholder ? ui(props.placeholder) : undefined}
            maxLength={props.maxLength}
            type={props.type}
            inputMode={props.inputMode}
            dir={
              dir === "rtl" || dir === "ltr" || dir === "auto" ? dir : undefined
            }
            pattern={props.pattern}
            autoComplete={props.autoComplete}
          />
        )}
      </FormField>
    );
  },
);

CustomInput.displayName = "CustomInput";
