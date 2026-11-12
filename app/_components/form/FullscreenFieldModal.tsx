"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useLanguage } from "@/lib/languageContext";
import { cn } from "@/lib/utils";
import FullscreenDialog, { useFullscreenDialogClose } from "./FullscreenDialog";

export interface FullscreenFieldModalProps {
  open: boolean;
  onClose: () => void;
  sessionKey?: number;
  title: string;
  subtitle?: string;
  value: string;
  onApply: (nextValue: string) => void;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  dir?: "rtl" | "ltr" | "auto";
  pattern?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  autoComplete?: string;
  rows?: number;
}

interface FullscreenFieldBodyProps extends Omit<
  FullscreenFieldModalProps,
  "open" | "onClose" | "sessionKey" | "value"
> {
  initialValue: string;
  onDraftChange: (nextValue: string) => void;
  onMarkCommitted: () => void;
}

function FullscreenFieldBody({
  initialValue,
  title,
  onApply,
  onDraftChange,
  onMarkCommitted,
  multiline = false,
  placeholder,
  maxLength,
  type = "text",
  inputMode,
  dir,
  pattern,
  step,
  min,
  max,
  autoComplete,
  rows = 10,
}: FullscreenFieldBodyProps) {
  const { dir: appDir } = useLanguage();
  const requestDialogClose = useFullscreenDialogClose();
  const [draft, setDraft] = useState(initialValue);
  const controlRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const inputId = useId();

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const node = controlRef.current;
        if (!node) return;
        node.focus();
        const len = node.value.length;
        try {
          node.setSelectionRange(len, len);
        } catch {
          // Some input types (e.g. number/tel on certain browsers) reject setSelectionRange.
        }
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, []);

  const handleApply = (nextValue: string) => {
    setDraft(nextValue);
    onDraftChange(nextValue);
    onMarkCommitted();
    onApply(nextValue);
    void requestDialogClose?.();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const isEnterKey = event.key === "Enter" || event.keyCode === 13;
    if (!isEnterKey) return;

    if (!multiline) {
      event.preventDefault();
      event.stopPropagation();
      handleApply(event.currentTarget.value);
    } else if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      handleApply(event.currentTarget.value);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData?.getData("text");
    if (!pastedText) return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart ?? draft.length;
    const end = target.selectionEnd ?? draft.length;
    const combined = `${draft.slice(0, start)}${pastedText}${draft.slice(end)}`;
    const nextValue =
      typeof maxLength === "number" ? combined.slice(0, maxLength) : combined;
    handleApply(nextValue);
  };

  const resolvedDir = dir ?? appDir;
  const cleanTitle = title.replace(/\s*\*$/, "").trim();
  const cleanPlaceholder = placeholder?.trim();
  const resolvedPlaceholder = cleanTitle
    ? cleanPlaceholder &&
      !cleanPlaceholder.includes(cleanTitle) &&
      cleanPlaceholder.length <= 28
      ? `${cleanTitle} (${cleanPlaceholder})`
      : cleanTitle
    : cleanPlaceholder;

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {cleanTitle || title}
      </label>

      {multiline ? (
        <textarea
          id={inputId}
          ref={(el) => {
            controlRef.current = el;
          }}
          dir={resolvedDir}
          rows={rows}
          maxLength={maxLength}
          placeholder={resolvedPlaceholder}
          value={draft}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDraft(nextValue);
            onDraftChange(nextValue);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          className="fullscreen-focus-control w-full min-h-40 rounded-xl border-2 border-[var(--control-border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-hidden resize-y"
        />
      ) : (
        <input
          id={inputId}
          ref={(el) => {
            controlRef.current = el;
          }}
          type={type}
          dir={resolvedDir}
          inputMode={inputMode}
          enterKeyHint="done"
          maxLength={maxLength}
          placeholder={resolvedPlaceholder}
          pattern={pattern}
          step={step}
          min={min}
          max={max}
          autoComplete={autoComplete}
          value={draft}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDraft(nextValue);
            onDraftChange(nextValue);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          autoFocus
          className="fullscreen-focus-control w-full min-h-12 rounded-xl border-2 border-[var(--control-border)] bg-[var(--input-bg)] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20 focus:outline-hidden"
        />
      )}
    </div>
  );
}

/**
 * Centered top-layer pop-up editor for writing comfortably in a large,
 * high-readability text field and applying the result back to the underlying form.
 */
export function FullscreenFieldModal({
  open,
  onClose,
  sessionKey = 0,
  title,
  subtitle,
  value,
  onApply,
  ...rest
}: FullscreenFieldModalProps) {
  const draftRef = useRef(value);
  const initialValueRef = useRef(value);
  const committedRef = useRef(false);
  const cancelledRef = useRef(false);
  const activeSessionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      activeSessionRef.current = null;
      return;
    }
    if (activeSessionRef.current !== sessionKey) {
      activeSessionRef.current = sessionKey;
      draftRef.current = value;
      initialValueRef.current = value;
      committedRef.current = false;
      cancelledRef.current = false;
    }
  }, [open, sessionKey, value]);

  const handleDialogCancel = () => {
    cancelledRef.current = true;
  };

  const handleDialogClose = () => {
    if (
      !committedRef.current &&
      !cancelledRef.current &&
      draftRef.current !== initialValueRef.current
    ) {
      committedRef.current = true;
      onApply(draftRef.current);
    }
    onClose();
  };

  return (
    <FullscreenDialog
      open={open}
      onClose={handleDialogClose}
      onCancel={handleDialogCancel}
      title={title}
      subtitle={subtitle}
      variant="focus"
      closedBy="any"
      hideHeader
      bodyClassName="pt-2 pb-4 sm:pt-2 sm:pb-5"
    >
      <FullscreenFieldBody
        key={sessionKey}
        initialValue={value}
        title={title}
        onApply={onApply}
        onDraftChange={(nextValue) => {
          draftRef.current = nextValue;
        }}
        onMarkCommitted={() => {
          committedRef.current = true;
        }}
        {...rest}
      />
    </FullscreenDialog>
  );
}

export interface ExpandableFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  value: string;
  onApply: (nextValue: string) => void;
  multiline?: boolean;
  openOnClick?: boolean;
  placeholder?: string;
  maxLength?: number;
  dir?: "rtl" | "ltr" | "auto";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  pattern?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  autoComplete?: string;
  disabled?: boolean;
  labelClassName?: string;
  inputBadge?: string;
  children: ReactElement<{
    id?: string;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
    readOnly?: boolean;
    disabled?: boolean;
    type?: string;
  }>;
  suffix?: ReactNode;
}

/**
 * Wraps controlled `<input>` / `<textarea>` fields (such as invoice & captain forms)
 * with consistent label, badge, suffix, and hint layout for inline editing on all viewports.
 */
export function ExpandableField({
  label,
  htmlFor,
  required,
  hint,
  multiline = false,
  labelClassName,
  inputBadge,
  children,
  suffix,
}: ExpandableFieldProps) {
  const generatedId = useId();
  const childProps = isValidElement(children) ? children.props : undefined;
  const fieldId = htmlFor || childProps?.id || generatedId;

  const renderedControl = isValidElement(children)
    ? cloneElement(children, {
        id: childProps?.id || fieldId,
        className: cn(childProps?.className, inputBadge && "pe-14"),
      })
    : children;

  const wrappedControl = inputBadge ? (
    <div className="relative flex-1 min-w-0">
      {renderedControl}
      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
        {inputBadge}
      </span>
    </div>
  ) : (
    renderedControl
  );

  const labelId = `${fieldId}-label`;
  const displayLabel = required ? label.replace(/\s*\*$/, "") : label;

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          id={labelId}
          htmlFor={fieldId}
          className={cn(
            "text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)] flex items-center gap-1",
            labelClassName,
          )}
        >
          <span>{displayLabel}</span>
          {required && (
            <span aria-hidden="true" className="text-rose-700 dark:text-rose-400">
              *
            </span>
          )}
        </label>
      </div>

      {multiline ? (
        wrappedControl
      ) : suffix ? (
        <div className="flex items-stretch gap-2 min-w-0">
          <div className="min-w-0 flex-1">{wrappedControl}</div>
          {suffix}
        </div>
      ) : (
        wrappedControl
      )}

      {hint && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
