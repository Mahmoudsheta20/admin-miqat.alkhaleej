"use client";
import { useUiText } from "@/lib/ui-text";
import { useLanguage } from "@/lib/languageContext";

import { type Ref, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFullscreenDialogClose } from "./FullscreenDialog";
import ResponsivePickerOverlay, {
  useIsPickerFullscreen,
  usePickerDisclosure,
} from "./ResponsivePickerOverlay";

export interface CustomDatePickerProps {
  id?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  label?: string;
  value?: string; // YYYY/MM/DD or YYYY-MM-DD
  onChange: (val: string) => void;
  error?: string;
  required?: boolean;
  minDate?: string;
  hint?: string;
  className?: string;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const WEEK_DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function parseDateStr(str?: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.replace(/-/g, "/").split("/");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (
    !Number.isInteger(y) ||
    y < 1 ||
    m < 0 ||
    m > 11 ||
    d < 1 ||
    d > new Date(y, m + 1, 0).getDate()
  ) {
    return null;
  }
  return { year: y, month: m, day: d };
}

function formatDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}/${mm}/${dd}`;
}

interface DatePickerModalBodyProps {
  value?: string;
  minDate?: string;
  onChange: (val: string) => void;
}

function DatePickerModalBody({
  value,
  minDate,
  onChange,
}: DatePickerModalBodyProps) {
  const ui = useUiText();
  const isFullscreen = useIsPickerFullscreen();
  const requestDialogClose = useFullscreenDialogClose();

  const normalizedMinDate = minDate ? minDate.replace(/-/g, "/") : "";
  const normalizedValue = value ? value.replace(/-/g, "/") : "";
  const isBeforeMinDate = (date: string) =>
    Boolean(normalizedMinDate && date < normalizedMinDate);

  const parsed =
    parseDateStr(value) ||
    parseDateStr(minDate) || {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate(),
    };

  const [manualView, setManualView] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const viewYear = manualView ? manualView.year : parsed.year;
  const viewMonth = manualView ? manualView.month : parsed.month;

  const firstActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        firstActionRef.current?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, []);

  const quickDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return formatDate(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setManualView({ year: viewYear - 1, month: 11 });
    } else {
      setManualView({ year: viewYear, month: viewMonth - 1 });
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setManualView({ year: viewYear + 1, month: 0 });
    } else {
      setManualView({ year: viewYear, month: viewMonth + 1 });
    }
  };

  const chooseDate = (dateStr: string) => {
    if (isBeforeMinDate(dateStr)) return;
    onChange(dateStr);
    void requestDialogClose?.();
  };

  const selectQuickDate = (offsetDays: number) => {
    const nextDate = quickDate(offsetDays);
    if (isBeforeMinDate(nextDate)) return;
    onChange(nextDate);
    void requestDialogClose?.();
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const today = new Date();
  const todayStr = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isFullscreen ? "mx-auto h-full max-w-2xl gap-5" : "gap-2.5",
      )}
    >
      {/* Quick Shortcuts */}
      <div
        className={cn(
          "grid border-b border-[var(--border-color)]",
          isFullscreen
            ? "grid-cols-2 sm:grid-cols-4 gap-2.5 pb-4"
            : "grid-cols-4 gap-1.5 pb-2",
        )}
      >
        <button
          ref={firstActionRef}
          type="button"
          onClick={() => selectQuickDate(0)}
          disabled={isBeforeMinDate(quickDate(0))}
          className={cn(
            "bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 hover:bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] font-bold transition text-center cursor-pointer disabled:opacity-40",
            isFullscreen
              ? "min-h-11 py-2 px-3 rounded-xl text-sm"
              : "min-h-8 py-1 px-2 rounded-lg text-xs",
          )}
        >
          {ui("اليوم")}
        </button>
        <button
          type="button"
          onClick={() => selectQuickDate(1)}
          disabled={isBeforeMinDate(quickDate(1))}
          className={cn(
            "bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-[var(--text-main)] font-bold transition text-center cursor-pointer disabled:opacity-40",
            isFullscreen
              ? "min-h-11 py-2 px-3 rounded-xl text-sm"
              : "min-h-8 py-1 px-2 rounded-lg text-xs",
          )}
        >
          {ui("غداً")}
        </button>
        <button
          type="button"
          onClick={() => selectQuickDate(2)}
          disabled={isBeforeMinDate(quickDate(2))}
          className={cn(
            "bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-[var(--text-main)] font-bold transition text-center cursor-pointer disabled:opacity-40",
            isFullscreen
              ? "min-h-11 py-2 px-3 rounded-xl text-sm"
              : "min-h-8 py-1 px-2 rounded-lg text-xs",
          )}
        >
          {ui("بعد غد")}
        </button>
        <button
          type="button"
          onClick={() => selectQuickDate(7)}
          disabled={isBeforeMinDate(quickDate(7))}
          className={cn(
            "bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-[var(--text-main)] font-bold transition text-center cursor-pointer disabled:opacity-40",
            isFullscreen
              ? "min-h-11 py-2 px-3 rounded-xl text-sm"
              : "min-h-8 py-1 px-2 rounded-lg text-xs",
          )}
        >
          {ui("+أسبوع")}
        </button>
      </div>

      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            "flex items-center justify-center border theme-border bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-[var(--text-main)] transition cursor-pointer",
            isFullscreen
              ? "min-h-11 min-w-11 rounded-xl"
              : "min-h-8 min-w-8 rounded-lg",
          )}
          aria-label={ui("الشهر السابق")}
          title={ui("الشهر السابق")}
        >
          {ui.dir === "rtl" ? (
            <ChevronRight className={isFullscreen ? "w-5 h-5" : "w-4 h-4"} aria-hidden="true" />
          ) : (
            <ChevronLeft className={isFullscreen ? "w-5 h-5" : "w-4 h-4"} aria-hidden="true" />
          )}
        </button>

        <div
          className={cn(
            "font-bold text-[var(--text-main)] flex items-center gap-2",
            isFullscreen ? "text-base sm:text-lg" : "text-sm",
          )}
        >
          <span>{ui(ARABIC_MONTHS[viewMonth])}</span>
          <span className="font-mono text-[var(--accent-gold)] font-bold">
            {viewYear}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            "flex items-center justify-center border theme-border bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-[var(--text-main)] transition cursor-pointer",
            isFullscreen
              ? "min-h-11 min-w-11 rounded-xl"
              : "min-h-8 min-w-8 rounded-lg",
          )}
          aria-label={ui("الشهر التالي")}
          title={ui("الشهر التالي")}
        >
          {ui.dir === "rtl" ? (
            <ChevronLeft className={isFullscreen ? "w-5 h-5" : "w-4 h-4"} aria-hidden="true" />
          ) : (
            <ChevronRight className={isFullscreen ? "w-5 h-5" : "w-4 h-4"} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-1.5">
        <div
          className={cn(
            "grid grid-cols-7 text-center",
            isFullscreen ? "gap-1.5" : "gap-1",
          )}
        >
          {WEEK_DAYS.map((day) => (
            <span
              key={day}
              className={cn(
                "font-bold text-[var(--text-muted)]",
                isFullscreen ? "text-sm sm:text-base py-1.5" : "text-xs py-0.5",
              )}
            >
              {ui(day)}
            </span>
          ))}
        </div>

        <div
          className={cn(
            "grid grid-cols-7",
            isFullscreen ? "gap-1.5 sm:gap-2" : "gap-1",
          )}
        >
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className={isFullscreen ? "min-h-11 sm:min-h-12" : "min-h-8"}
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = formatDate(viewYear, viewMonth, day);
            const isSelected = normalizedValue === dateStr;
            const isToday = todayStr === dateStr;
            const isDisabled = isBeforeMinDate(dateStr);

            return (
              <button
                key={day}
                type="button"
                disabled={isDisabled}
                aria-pressed={isSelected}
                onClick={() => chooseDate(dateStr)}
                className={cn(
                  "w-full font-mono font-bold transition flex items-center justify-center relative cursor-pointer",
                  isFullscreen
                    ? "min-h-11 sm:min-h-12 rounded-xl text-sm sm:text-base"
                    : "min-h-8 rounded-lg text-xs",
                  isSelected
                    ? "gold-gradient-btn shadow-xs"
                    : isToday
                      ? "border-2 border-[var(--accent-gold)] text-[var(--accent-gold)] hover:bg-[var(--accent-surface)]"
                      : isDisabled
                        ? "opacity-40 cursor-not-allowed text-[var(--text-muted)]"
                        : "border theme-border bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)]/55 hover:bg-[var(--accent-surface)] text-[var(--text-main)]",
                )}
              >
                {day}
                {isToday && !isSelected && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "rounded-full bg-[var(--accent-gold)] absolute",
                      isFullscreen ? "w-1.5 h-1.5 bottom-1.5" : "w-1 h-1 bottom-1",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer date summary */}
      <div
        className={cn(
          "shrink-0 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2",
          isFullscreen ? "pt-3.5" : "pt-2.5",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-[var(--text-muted)]",
            isFullscreen ? "text-sm" : "text-xs",
          )}
        >
          <span>{ui("التاريخ المحدد:")}</span>
          <span
            className={cn(
              "font-mono font-bold text-[var(--text-main)]",
              isFullscreen ? "text-base" : "text-xs sm:text-sm",
            )}
            dir="ltr"
          >
            {value || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CustomDatePicker({
  id,
  buttonRef,
  label,
  value,
  onChange,
  error,
  required,
  minDate,
  hint,
  className = "",
}: CustomDatePickerProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const generatedId = useId();
  const controlId = id || generatedId;
  const overlayId = `${controlId}-date-picker`;
  const {
    isMobile,
    open: isOpen,
    sessionKey,
    triggerRef,
    overlayRef,
    openOverlay,
    toggleFromTrigger,
    closeOverlay,
  } = usePickerDisclosure();

  useImperativeHandle<HTMLButtonElement | null, HTMLButtonElement | null>(
    buttonRef,
    () => triggerRef.current,
    [triggerRef],
  );

  const formattedArabicDate = () => {
    const p = parseDateStr(value);
    if (!p) return "";
    try {
      const dateObj = new Date(p.year, p.month, p.day);
      return dateObj.toLocaleDateString(ui.locale, {
        calendar: "gregory",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const modalTitle =
    (label ? ui(label).replace(/\s*\*$/, "") : "") || ui("حدد التاريخ");

  return (
    <div className={`space-y-1.5 w-full relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-2 min-w-0">
          <label
            htmlFor={controlId}
            className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)] flex items-center gap-1 shrink-0"
          >
            <span>{ui(label)}</span>
            {required && (
              <span className="text-rose-700 dark:text-rose-400 font-semibold" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {value && (
            <span
              className="text-xs text-[var(--accent-gold)] font-medium truncate text-end"
              title={formattedArabicDate()}
            >
              {formattedArabicDate()}
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={controlId}
        aria-describedby={error || hint ? `${controlId}-description` : undefined}
        type="button"
        aria-label={ui(label || "حدد التاريخ")}
        aria-haspopup={isMobile ? "dialog" : undefined}
        aria-expanded={isOpen}
        aria-controls={!isMobile && isOpen ? overlayId : undefined}
        onClick={toggleFromTrigger}
        onKeyDown={(event) => {
          if (
            event.key === "ArrowDown" ||
            event.key === "ArrowUp" ||
            event.key === "F2"
          ) {
            event.preventDefault();
            openOverlay();
          }
        }}
        className={`w-full min-h-11 sm:min-h-9 px-3 py-1.5 text-base sm:text-[0.8125rem] rounded-lg transition-all duration-150 outline-hidden font-mono font-semibold flex items-center justify-between text-start cursor-pointer
          ${
            error
              ? "bg-rose-500/5 border border-rose-500/60 text-rose-950 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20"
              : isOpen
                ? "bg-[var(--input-bg)] border border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/20 text-[var(--text-main)]"
                : "bg-[var(--input-bg)] border border-[var(--control-border)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"
          }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="w-6 h-6 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center shrink-0"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-base sm:text-[0.8125rem] font-semibold font-mono tracking-normal truncate">
            {value || ui("حدد التاريخ")}
          </span>
        </div>

        <div aria-hidden="true" className="flex items-center gap-1 shrink-0 text-[var(--text-muted)] ms-2">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[var(--accent-gold)]" : ""
            }`}
          />
        </div>
      </button>

      <ResponsivePickerOverlay
        open={isOpen}
        onClose={closeOverlay}
        anchorRef={triggerRef}
        overlayRef={overlayRef}
        overlayId={overlayId}
        title={modalTitle}
        subtitle={text(
          "اختر التاريخ من التقويم بملء الشاشة لسهولة التصفح",
          "Pick the date from a spacious full-screen calendar",
        )}
        icon={<CalendarIcon className="w-4 h-4" aria-hidden="true" />}
        matchTriggerWidth={false}
        minPopoverWidth={320}
        maxPopoverWidth={352}
        preferredMaxHeight={440}
        dir={ui.dir}
      >
        <DatePickerModalBody
          key={sessionKey}
          value={value || ""}
          minDate={minDate}
          onChange={onChange}
        />
      </ResponsivePickerOverlay>

      {error && (
        <p
          id={`${controlId}-description`}
          role="alert"
          className="text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{ui(error)}</span>
        </p>
      )}

      {hint && !error && (
        <p id={`${controlId}-description`} className="text-xs text-[var(--text-muted)]">
          {ui(hint)}
        </p>
      )}
    </div>
  );
}
