"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Check, Maximize2 } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
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
}

function FullscreenFieldBody({
  initialValue,
  title,
  onApply,
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
  const { language, dir: appDir } = useLanguage();
  const requestDialogClose = useFullscreenDialogClose();
  const [draft, setDraft] = useState(initialValue);
  const controlRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const inputId = useId();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

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

  const handleCancel = () => {
    void requestDialogClose?.();
  };

  const handleApply = () => {
    onApply(draft);
    void requestDialogClose?.();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      handleApply();
    } else if (
      multiline &&
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      event.stopPropagation();
      handleApply();
    }
  };

  const resolvedDir = dir ?? appDir;

  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={inputId}
            className="text-base sm:text-lg font-semibold text-[var(--text-main)]"
          >
            {title}
          </label>
          {typeof maxLength === "number" && (
            <span className="font-mono text-sm font-semibold text-[var(--accent-gold)]">
              {draft.length} / {maxLength}
            </span>
          )}
        </div>

        {multiline ? (
          <textarea
            id={inputId}
            ref={(el) => {
              controlRef.current = el;
            }}
            dir={resolvedDir}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="fullscreen-focus-control w-full min-h-60 rounded-2xl border-2 border-[var(--control-border)] bg-[var(--input-bg)] px-5 py-4 text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-3 focus:ring-[var(--accent-gold)]/20 focus:outline-hidden resize-y"
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
            maxLength={maxLength}
            placeholder={placeholder}
            pattern={pattern}
            step={step}
            min={min}
            max={max}
            autoComplete={autoComplete}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="fullscreen-focus-control w-full min-h-16 rounded-2xl border-2 border-[var(--control-border)] bg-[var(--input-bg)] px-5 py-4 text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:ring-3 focus:ring-[var(--accent-gold)]/20 focus:outline-hidden"
          />
        )}

        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          {multiline
            ? text(
                "اضغط Ctrl+Enter أو زر «اعتماد النص» لحفظ التعديل في النموذج.",
                "Press Ctrl+Enter or «Apply» to save changes back to the form.",
              )
            : text(
                "اضغط Enter أو زر «اعتماد النص» لحفظ القيمة في النموذج.",
                "Press Enter or «Apply» to save this value back to the form.",
              )}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t theme-border pt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-6 py-2.5 text-base font-semibold text-[var(--text-main)] hover:bg-[var(--bg-card)] transition cursor-pointer"
        >
          {text("إلغاء", "Cancel")}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl gold-gradient-btn px-7 py-2.5 text-base font-bold shadow-sm transition cursor-pointer"
        >
          <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{text("اعتماد النص", "Apply")}</span>
        </button>
      </div>
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
  const { language } = useLanguage();
  const defaultSubtitle =
    subtitle ??
    (language === "ar"
      ? "مساحة إدخال موسعة بخط أكبر لسهولة القراءة والتحرير"
      : "Expanded high-readability input view");

  return (
    <FullscreenDialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={defaultSubtitle}
      variant="focus"
      closedBy="any"
      icon={<Maximize2 className="h-5 w-5" aria-hidden="true" />}
    >
      <FullscreenFieldBody
        key={sessionKey}
        initialValue={value}
        title={title}
        onApply={onApply}
        {...rest}
      />
    </FullscreenDialog>
  );
}

const NON_TEXT_INPUT_TYPES = new Set([
  "date",
  "time",
  "datetime-local",
  "hidden",
  "checkbox",
  "radio",
  "file",
  "range",
]);

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
 * so interacting with them automatically opens `FullscreenFieldModal` in full-screen focus mode.
 */
export function ExpandableField({
  label,
  htmlFor,
  required,
  hint,
  value,
  onApply,
  multiline = false,
  openOnClick = true,
  placeholder,
  maxLength,
  dir,
  inputMode,
  type,
  pattern,
  step,
  min,
  max,
  autoComplete,
  disabled = false,
  labelClassName,
  inputBadge,
  children,
  suffix,
}: ExpandableFieldProps) {
  const isMobile = useIsMobileViewport();
  const generatedId = useId();
  const childProps = isValidElement(children) ? children.props : undefined;
  const fieldId = htmlFor || childProps?.id || generatedId;
  const [modalOpen, setModalOpen] = useState(false);
  const [expandSession, setExpandSession] = useState(0);

  const openExpandModal = () => {
    if (!isMobile) return;
    setExpandSession((prev) => prev + 1);
    setModalOpen(true);
  };

  const effectiveType = type ?? childProps?.type ?? "text";
  const isControlReadOnly = Boolean(
    disabled || childProps?.disabled || childProps?.readOnly,
  );
  const canAutoExpand =
    isMobile &&
    openOnClick &&
    !isControlReadOnly &&
    !NON_TEXT_INPUT_TYPES.has(effectiveType);

  const renderedControl = isValidElement(children)
    ? cloneElement(children, {
        id: childProps?.id || fieldId,
        className: cn(
          childProps?.className,
          canAutoExpand && "cursor-pointer",
          inputBadge && "pe-14",
        ),
        onClick: canAutoExpand
          ? (event: React.MouseEvent<HTMLElement>) => {
              childProps?.onClick?.(event);
              if (!event.defaultPrevented) {
                openExpandModal();
              }
            }
          : childProps?.onClick,
        onKeyDown: canAutoExpand
          ? (event: React.KeyboardEvent<HTMLElement>) => {
              childProps?.onKeyDown?.(event);
              if (!event.defaultPrevented && event.key === "F2") {
                event.preventDefault();
                openExpandModal();
              }
            }
          : childProps?.onKeyDown,
      })
    : children;

  const wrappedControl = inputBadge ? (
    <div className="relative flex-1 min-w-0">
      {renderedControl}
      <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
        {inputBadge}
      </span>
    </div>
  ) : (
    renderedControl
  );

  const labelId = `${fieldId}-label`;
  const displayLabel = required ? label.replace(/\s*\*$/, "") : label;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          id={labelId}
          htmlFor={fieldId}
          className={cn(
            "text-sm sm:text-[0.9375rem] font-semibold text-[var(--text-main)] flex items-center gap-1",
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
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {hint}
        </p>
      )}

      {isMobile && !isControlReadOnly && (
        <FullscreenFieldModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          sessionKey={expandSession}
          title={displayLabel}
          value={value}
          onApply={onApply}
          multiline={multiline}
          placeholder={placeholder}
          maxLength={maxLength}
          dir={dir}
          inputMode={inputMode}
          type={effectiveType}
          pattern={pattern}
          step={step}
          min={min}
          max={max}
          autoComplete={autoComplete}
        />
      )}
    </div>
  );
}
