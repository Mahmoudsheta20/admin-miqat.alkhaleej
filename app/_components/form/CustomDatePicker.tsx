"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

export interface CustomDatePickerProps {
  label?: string;
  value: string; // YYYY/MM/DD or YYYY-MM-DD
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

function parseDateStr(str: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.replace(/-/g, "/").split("/");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-indexed
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

function formatDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}/${mm}/${dd}`;
}

export function CustomDatePicker({
  label,
  value,
  onChange,
  error,
  required,
  minDate,
  hint,
  className = "",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualView, setManualView] = useState<{ year: number; month: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = parseDateStr(value) || {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate(),
  };

  const viewYear = manualView ? manualView.year : parsed.year;
  const viewMonth = manualView ? manualView.month : parsed.month;

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

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

  // Quick preset shortcuts
  const selectQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    onChange(formatDate(y, m, day));
    setManualView({ year: y, month: m });
    setIsOpen(false);
  };

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  const today = new Date();
  const todayStr = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Human readable date in Arabic
  const formattedArabicDate = () => {
    const p = parseDateStr(value);
    if (!p) return "";
    try {
      const dateObj = new Date(p.year, p.month, p.day);
      return dateObj.toLocaleDateString("ar-SA", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div ref={containerRef} className={`space-y-1.5 w-full relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
            <span>{label}</span>
            {required && <span className="text-rose-500 font-black">*</span>}
          </label>
          {value && (
            <span
              className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate text-left"
              title={formattedArabicDate()}
            >
              {formattedArabicDate()}
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setManualView(null);
          setIsOpen(!isOpen);
        }}
        className={`w-full h-11 px-3 text-xs rounded-xl transition-all duration-150 outline-hidden font-mono font-bold flex items-center justify-between text-right cursor-pointer
          ${
            error
              ? "bg-rose-500/5 border border-rose-500/50 text-rose-950 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20"
              : isOpen
              ? "bg-white dark:bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 text-slate-900 dark:text-white"
              : "bg-white dark:bg-slate-900/80 border theme-border text-slate-900 dark:text-white hover:border-amber-500/50"
          }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold font-mono tracking-wide truncate">
            {value || "حدد التاريخ"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400 mr-2">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-amber-500" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="form-popover relative sm:absolute z-50 mt-1 right-0 w-full sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border theme-border shadow-2xl p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 pb-3 border-b theme-border">
            <button
              type="button"
              onClick={() => selectQuickDate(0)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold transition text-center"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => selectQuickDate(1)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition text-center"
            >
              غداً
            </button>
            <button
              type="button"
              onClick={() => selectQuickDate(2)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition text-center"
            >
              بعد غد
            </button>
            <button
              type="button"
              onClick={() => selectQuickDate(7)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition text-center"
            >
              +أسبوع
            </button>
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between py-3">
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="الشهر التالي"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{ARABIC_MONTHS[viewMonth]}</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="الشهر السابق"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEK_DAYS.map((day) => (
              <span
                key={day}
                className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for start of month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-8" />
            ))}

            {/* Days numbers */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDate(viewYear, viewMonth, day);
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;
              const isDisabled = Boolean(minDate && dateStr < minDate);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(dateStr);
                    setIsOpen(false);
                  }}
                  className={`w-full h-10 sm:h-8 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center relative
                    ${
                      isSelected
                        ? "gold-gradient-btn text-white shadow-xs"
                        : isToday
                        ? "border border-amber-500/80 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        : isDisabled
                        ? "opacity-30 cursor-not-allowed text-slate-400"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-amber-500 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer date summary */}
          <div className="mt-3 pt-2 border-t theme-border flex items-center justify-between text-[11px] text-slate-400">
            <span>التاريخ المحدد:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
              {value}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {hint && !error && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}
