"use client";
import { useUiText, LocalizedText } from "@/lib/ui-text";
import { triggerNativeValueChange } from "@/lib/top-layer";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";

import React, { forwardRef, useCallback, useId, useRef, useState } from "react";

import FormField from "./FormField";
import { FullscreenFieldModal } from "./FullscreenFieldModal";

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
      expandable = true,
      openOnClick = true,
      expandTitle,
      required,
      className = "",
      disabled,
      readOnly,
      value,
      onChange,
      onClick,
      onKeyDown,
      maxLength,
      dir,
      ...props
    },
    ref
  ) => {
    const ui = useUiText();
    const isMobile = useIsMobileViewport();
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const [uncontrolledLength, setUncontrolledLength] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalValue, setModalValue] = useState("");
    const [expandSession, setExpandSession] = useState(0);

    const currentLength =
      value !== undefined && value !== null
        ? String(value).length
        : uncontrolledLength;

    const generatedId = useId();
    const fieldId = id || generatedId;

    const assignRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
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
      setUncontrolledLength(nextValue.length);
      if (internalRef.current) {
        triggerNativeValueChange(internalRef.current, nextValue);
      }
    };

    const fieldTitle = expandTitle || (label ? ui(label) : ui("تحرير النص"));
    const canExpand = isMobile && expandable && !disabled && !readOnly;
    const shouldAutoExpandOnClick = canExpand && openOnClick;

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
            ref={assignRef}
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
              [props["aria-describedby"], (error || hint) && `${fieldId}-description`]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={`min-w-0 w-full min-h-22 sm:min-h-20 py-2 text-base sm:text-[0.8125rem] rounded-lg transition-all duration-150 outline-hidden font-medium leading-relaxed resize-y
              ${icon ? "ps-9" : "ps-3"}
              pe-3
              ${shouldAutoExpandOnClick ? "cursor-pointer" : ""}
              ${
                error
                  ? "bg-rose-500/5 border border-rose-500/60 text-rose-950 dark:text-rose-100 placeholder:text-rose-700/75 dark:placeholder:text-rose-300/75 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                  : "bg-[var(--input-bg)] border border-[var(--control-border)] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20"
              }
              ${disabled ? "opacity-55 cursor-not-allowed bg-[var(--bg-card-subtle)]" : ""}
              ${className}`}
          />
        </div>

        {canExpand && (
          <FullscreenFieldModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            sessionKey={expandSession}
            title={fieldTitle}
            value={modalValue}
            onApply={handleApplyExpand}
            multiline
            placeholder={props.placeholder ? ui(props.placeholder) : undefined}
            maxLength={maxLength}
            dir={dir === "rtl" || dir === "ltr" || dir === "auto" ? dir : undefined}
          />
        )}
      </FormField>
    );
  }
);

CustomTextarea.displayName = "CustomTextarea";
