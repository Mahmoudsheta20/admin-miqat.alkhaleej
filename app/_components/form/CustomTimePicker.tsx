"use client";
import { useUiText } from "@/lib/ui-text";
import { useLanguage } from "@/lib/languageContext";

import { type Ref, useEffect, useId, useImperativeHandle, useRef } from "react";
import { AlertCircle, ChevronDown, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFullscreenDialogClose } from "./FullscreenDialog";
import ResponsivePickerOverlay, {
  useIsPickerFullscreen,
  usePickerDisclosure,
} from "./ResponsivePickerOverlay";

export interface CustomTimePickerProps {
  id?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  clearable?: boolean;
  label?: string;
  value?: string; // HH:mm (24-hour format)
  onChange: (val: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}

function parseTime(val?: string): { hour: number; minute: number } {
  if (!val) {
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
  }
  const [h, m] = val.split(":").map((n) => parseInt(n, 10));
  return {
    hour: isNaN(h) ? 12 : Math.max(0, Math.min(23, h)),
    minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

function formatTime(hour: number, minute: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatTimeDisplay12h(time24?: string, lang: "ar" | "en" = "ar"): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;

  const period = lang === "en" ? (h >= 12 ? "PM" : "AM") : h >= 12 ? "مساءً" : "صباحاً";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${h12}:${mm} ${period}`;
}

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const POPULAR_HOURS = [
  { time: "06:00", h: 6, m: 0 },
  { time: "08:30", h: 8, m: 30 },
  { time: "12:00", h: 12, m: 0 },
  { time: "15:00", h: 15, m: 0 },
  { time: "18:30", h: 18, m: 30 },
  { time: "21:00", h: 21, m: 0 },
];

function TimePickerModalBody({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  const ui = useUiText();
  const isFullscreen = useIsPickerFullscreen();
  const requestDialogClose = useFullscreenDialogClose();
  const { hour, minute } = parseTime(value);
  const nowButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        nowButtonRef.current?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, []);

  const setNow = () => {
    const d = new Date();
    onChange(formatTime(d.getHours(), d.getMinutes()));
    void requestDialogClose?.();
  };

  const addMinutes = (mins: number) => {
    const { hour: h, minute: m } = parseTime(value);
    const date = new Date();
    date.setHours(h, m + mins, 0, 0);
    onChange(formatTime(date.getHours(), date.getMinutes()));
    void requestDialogClose?.();
  };

  const setSpecificTime = (h: number, m: number) => {
    onChange(formatTime(h, m));
    void requestDialogClose?.();
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isFullscreen ? "mx-auto h-full max-w-2xl gap-5" : "gap-2.5",
      )}
    >
      {/* Quick Preset Buttons */}
      <div
        className={cn(
          "grid grid-cols-3 border-b border-[var(--border-color)]",
          isFullscreen ? "gap-2.5 pb-4" : "gap-1.5 pb-2.5",
        )}
      >
        <button
          ref={nowButtonRef}
          type="button"
          onClick={setNow}
          className={cn(
            "bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 hover:bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] font-bold transition text-center cursor-pointer",
            isFullscreen
              ? "min-h-11 py-2 px-3 rounded-xl text-sm"
              : "min-h-8 py-1 px-2 rounded-lg text-xs",
          )}
        >
          {ui("الآن")}
        </button>
        <button
          type="button"
          onClick={() => addMinutes(30)}
          className={cn(
            "bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-[var(--text-main)] font-bold transition text-center cursor-pointer",
            isFullscreen
              ? "min-h-11 py-2 px-3 rounded-xl text-sm"
              : "min-h-8 py-1 px-2 rounded-lg text-xs",
          )}
        >
          {ui("+30 د")}
        </button>
        <button
          type="button"
          onClick={() => addMinutes(60)}
          className={cn(
            "bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-[var(--text-main)] font-bold transition text-center cursor-pointer",
            isFullscreen
              ? "min-h-11 py-2 px-3 rounded-xl text-sm"
              : "min-h-8 py-1 px-2 rounded-lg text-xs",
          )}
        >
          {ui("+1 ساعة")}
        </button>
      </div>

      {/* Interactive Hours and Minutes Columns */}
      <div
        className={cn(
          "min-h-0 flex-1 grid grid-cols-2",
          isFullscreen ? "gap-3" : "gap-2.5",
        )}
      >
        <div className="flex min-h-0 flex-col">
          <p
            className={cn(
              "font-bold text-[var(--text-muted)] text-center",
              isFullscreen ? "text-sm mb-1.5" : "text-xs mb-1",
            )}
          >
            {ui("الساعة (24h)")}
          </p>
          <div
            className={cn(
              "overflow-y-auto overscroll-contain border theme-border bg-[var(--bg-card-subtle)]",
              isFullscreen
                ? "min-h-44 flex-1 rounded-xl p-1.5 space-y-1"
                : "h-44 min-h-0 rounded-xl p-1.5 space-y-1",
            )}
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const isSelected = hour === i;
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChange(formatTime(i, minute))}
                  className={cn(
                    "w-full font-mono font-bold transition text-center flex items-center justify-around cursor-pointer",
                    isFullscreen
                      ? "min-h-11 py-1.5 text-sm rounded-lg"
                      : "min-h-8 py-1 text-xs sm:text-sm rounded-lg",
                    isSelected
                      ? "gold-gradient-btn shadow-xs"
                      : "bg-[var(--input-bg)] hover:bg-[var(--accent-surface)] text-[var(--text-main)]",
                  )}
                >
                  <span>{String(i).padStart(2, "0")}</span>
                  <span
                    className={cn(
                      isFullscreen ? "text-xs" : "text-[11px]",
                      !isSelected && "text-[var(--text-muted)]",
                    )}
                  >
                    {ui(i >= 12 ? "م" : "ص")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <p
            className={cn(
              "font-bold text-[var(--text-muted)] text-center",
              isFullscreen ? "text-sm mb-1.5" : "text-xs mb-1",
            )}
          >
            {ui("الدقائق")}
          </p>
          <div
            className={cn(
              "overflow-y-auto overscroll-contain border theme-border bg-[var(--bg-card-subtle)]",
              isFullscreen
                ? "min-h-44 flex-1 rounded-xl p-1.5 space-y-1"
                : "h-44 min-h-0 rounded-xl p-1.5 space-y-1",
            )}
          >
            {MINUTE_OPTIONS.map((m) => {
              const isSelected = minute === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChange(formatTime(hour, m))}
                  className={cn(
                    "w-full font-mono font-bold transition text-center cursor-pointer",
                    isFullscreen
                      ? "min-h-11 py-1.5 text-sm rounded-lg"
                      : "min-h-8 py-1 text-xs sm:text-sm rounded-lg",
                    isSelected
                      ? "gold-gradient-btn shadow-xs"
                      : "bg-[var(--input-bg)] hover:bg-[var(--accent-surface)] text-[var(--text-main)]",
                  )}
                >
                  :{String(m).padStart(2, "0")}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popular quick slots */}
      <div
        className={cn(
          "shrink-0 border-t border-[var(--border-color)]",
          isFullscreen ? "pt-3" : "pt-2.5",
        )}
      >
        <span
          className={cn(
            "font-semibold text-[var(--text-muted)] block",
            isFullscreen ? "text-xs mb-1.5" : "text-xs mb-1",
          )}
        >
          {ui("مواعيد شائعة:")}
        </span>
        <div
          className={cn(
            "grid",
            isFullscreen
              ? "grid-cols-2 sm:grid-cols-3 gap-2"
              : "grid-cols-3 gap-1.5",
          )}
        >
          {POPULAR_HOURS.map((slot) => (
            <button
              key={slot.time}
              type="button"
              onClick={() => setSpecificTime(slot.h, slot.m)}
              className={cn(
                "border theme-border bg-[var(--bg-card-subtle)] hover:bg-[var(--accent-surface)] hover:border-[var(--accent-gold)]/45 text-[var(--text-main)] hover:text-[var(--accent-gold)] font-mono font-bold transition text-center cursor-pointer",
                isFullscreen
                  ? "min-h-11 py-1.5 px-2.5 rounded-lg text-sm"
                  : "min-h-8 py-1 px-1.5 rounded-lg text-xs",
              )}
            >
              {slot.time} {ui(slot.h >= 12 ? "م" : "ص")}
            </button>
          ))}
        </div>
      </div>

      {/* Footer time confirmation */}
      <div
        className={cn(
          "shrink-0 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2",
          isFullscreen ? "pt-3" : "pt-2.5",
        )}
      >
        <span
          className={cn(
            "font-bold text-[var(--text-main)] font-mono",
            isFullscreen ? "text-sm sm:text-base" : "text-xs sm:text-sm",
          )}
          dir="ltr"
        >
          {value || "—"} {value ? `(${formatTimeDisplay12h(value, ui.language)})` : ""}
        </span>
        <button
          type="button"
          onClick={() => void requestDialogClose?.()}
          className={cn(
            "gold-gradient-btn font-bold cursor-pointer",
            isFullscreen
              ? "min-h-11 px-5 py-2 rounded-lg text-sm"
              : "min-h-8 px-4 py-1 rounded-lg text-xs sm:text-sm",
          )}
        >
          {ui("تأكيد")}
        </button>
      </div>
    </div>
  );
}

export function CustomTimePicker({
  id,
  buttonRef,
  clearable = false,
  label,
  value,
  onChange,
  error,
  required,
  hint,
  className = "",
}: CustomTimePickerProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const generatedId = useId();
  const controlId = id || generatedId;
  const overlayId = `${controlId}-time-picker`;
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

  const modalTitle =
    (label ? ui(label).replace(/\s*\*$/, "") : "") || ui("حدد الوقت");

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
            <span className="text-xs text-[var(--accent-gold)] font-medium font-mono shrink-0" dir="ltr">
              ({formatTimeDisplay12h(value, ui.language)})
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <div className="flex items-stretch gap-1.5">
        <button
          ref={triggerRef}
          aria-label={ui(label || "حدد الوقت")}
          aria-haspopup={isMobile ? "dialog" : undefined}
          aria-expanded={isOpen}
          aria-controls={!isMobile && isOpen ? overlayId : undefined}
          id={controlId}
          aria-describedby={error || hint ? `${controlId}-description` : undefined}
          type="button"
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
          className={`flex-1 min-w-0 min-h-11 sm:min-h-9 px-3 py-1.5 text-base sm:text-[0.8125rem] rounded-lg transition-all duration-150 outline-hidden font-mono font-semibold flex items-center justify-between text-start cursor-pointer
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
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-base sm:text-[0.8125rem] font-semibold font-mono tracking-normal truncate">
              {value || ui("حدد الوقت")}
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

        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={ui("مسح الحقل")}
            title={ui("مسح الحقل")}
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 px-2 rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:border-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-500/5 flex items-center justify-center shrink-0 transition cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <ResponsivePickerOverlay
        open={isOpen}
        onClose={closeOverlay}
        anchorRef={triggerRef}
        overlayRef={overlayRef}
        overlayId={overlayId}
        title={modalTitle}
        subtitle={text(
          "حدد الساعة والدقيقة بملء الشاشة لسهولة الاختيار",
          "Choose hours and minutes from a full-screen picker",
        )}
        icon={<Clock className="w-4 h-4" aria-hidden="true" />}
        matchTriggerWidth={false}
        minPopoverWidth={310}
        maxPopoverWidth={348}
        preferredMaxHeight={450}
        dir={ui.dir}
      >
        <TimePickerModalBody
          key={sessionKey}
          value={value || ""}
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
