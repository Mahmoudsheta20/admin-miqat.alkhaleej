"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { Clock, AlertCircle, ChevronDown } from "lucide-react";

export interface CustomTimePickerProps {
  label?: string;
  value: string; // HH:mm (24-hour format)
  onChange: (val: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}

function parseTime(val: string): { hour: number; minute: number } {
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

function formatTimeArabic12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;

  const period = h >= 12 ? "مساءً" : "صباحاً";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${h12}:${mm} ${period}`;
}

export function CustomTimePicker({
  label,
  value,
  onChange,
  error,
  required,
  hint,
  className = "",
}: CustomTimePickerProps) {
  const controlId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { hour, minute } = parseTime(value);

  // Quick preset shortcuts
  const setNow = () => {
    const d = new Date();
    onChange(formatTime(d.getHours(), d.getMinutes()));
    setIsOpen(false);
  };

  const addMinutes = (mins: number) => {
    const { hour: h, minute: m } = parseTime(value);
    const date = new Date();
    date.setHours(h, m + mins, 0, 0);
    onChange(formatTime(date.getHours(), date.getMinutes()));
    setIsOpen(false);
  };

  const setSpecificTime = (h: number, m: number) => {
    onChange(formatTime(h, m));
    setIsOpen(false);
  };

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

  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const popularHours = [
    { label: "06:00 ص", h: 6, m: 0 },
    { label: "08:30 ص", h: 8, m: 30 },
    { label: "12:00 م", h: 12, m: 0 },
    { label: "15:00 م", h: 15, m: 0 },
    { label: "18:30 م", h: 18, m: 30 },
    { label: "21:00 م", h: 21, m: 0 },
  ];

  return (
    <div onKeyDown={event => {
      if (event.key === "Escape" && isOpen) { event.preventDefault(); event.stopPropagation(); setIsOpen(false); containerRef.current?.querySelector("button")?.focus(); }
    }} ref={containerRef} className={`space-y-1.5 w-full relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <label htmlFor={controlId} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
            <span>{label}</span>
            {required && <span className="text-rose-500 font-black">*</span>}
          </label>
          {value && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium font-mono shrink-0">
              ({formatTimeArabic12h(value)})
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        aria-label={label || "حدد الوقت"}
        aria-expanded={isOpen}
        id={controlId}
        aria-describedby={error || hint ? `${controlId}-description` : undefined}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold font-mono tracking-wider truncate">
            {value || "حدد الوقت"}
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

      {/* Popover Time Selector */}
      {isOpen && (
        <div className="form-popover relative sm:absolute z-50 mt-1 right-0 w-full sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border theme-border shadow-2xl p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 pb-3 border-b theme-border">
            <button
              type="button"
              onClick={setNow}
              className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold transition text-center"
            >
              الآن
            </button>
            <button
              type="button"
              onClick={() => addMinutes(30)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition text-center"
            >
              +30 د
            </button>
            <button
              type="button"
              onClick={() => addMinutes(60)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition text-center"
            >
              +1 ساعة
            </button>
          </div>

          {/* Interactive Spinners / Direct pick */}
          <div className="py-3 grid grid-cols-2 gap-4">
            {/* Hours Column */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1 text-center">
                الساعة (24h)
              </label>
              <div className="h-44 overflow-y-auto rounded-xl border theme-border p-1 space-y-1">
                {Array.from({ length: 24 }).map((_, i) => {
                  const isSelected = hour === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onChange(formatTime(i, minute))}
                      className={`w-full py-1.5 text-xs font-mono font-bold rounded-lg transition text-center flex items-center justify-around
                        ${
                          isSelected
                            ? "gold-gradient-btn text-white shadow-xs"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                    >
                      <span>{String(i).padStart(2, "0")}</span>
                      <span className="text-[10px] opacity-70">
                        {i >= 12 ? "م" : "ص"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1 text-center">
                الدقائق
              </label>
              <div className="h-44 overflow-y-auto rounded-xl border theme-border p-1 space-y-1">
                {minuteOptions.map((m) => {
                  const isSelected = minute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onChange(formatTime(hour, m))}
                      className={`w-full py-1.5 text-xs font-mono font-bold rounded-lg transition text-center
                        ${
                          isSelected
                            ? "gold-gradient-btn text-white shadow-xs"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                    >
                      :{String(m).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Popular quick slots */}
          <div className="pt-2 border-t theme-border">
            <span className="text-[10px] text-slate-400 block mb-1.5">
              مواعيد شائعة:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {popularHours.map((slot) => (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => setSpecificTime(slot.h, slot.m)}
                  className="py-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold transition text-center"
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer time confirmation */}
          <div className="mt-3 pt-2 border-t theme-border flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              {value} ({formatTimeArabic12h(value)})
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg gold-gradient-btn text-xs font-bold"
            >
              تأكيد
            </button>
          </div>
        </div>
      )}

      {error && (
        <p id={`${controlId}-description`} role="alert" className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {hint && !error && (
        <p id={`${controlId}-description`} className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}
