"use client";
import { useUiText } from "@/lib/ui-text";


import { useState } from "react";
import { Users, Plus, Minus, Trash2, Globe, CreditCard, User, UserPlus, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { Control, UseFormRegister, useFieldArray, FieldErrors } from "react-hook-form";
import { useLanguage } from "@/lib/languageContext";
import { AdminContractFormValues } from "@/lib/validations/contract";
import { CustomInput } from "./CustomInput";
import { MobileHorizontalStrip } from "@/app/_components/mobile";

export interface PassengerManifestManagerProps {
  control: Control<AdminContractFormValues>;
  register: UseFormRegister<AdminContractFormValues>;
  errors?: FieldErrors<AdminContractFormValues>;
  embedded?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Quick vehicle capacity presets up to 50 passengers
const CAPACITY_PRESETS = [
  { count: 1, label: "1 (فردي)" },
  { count: 4, label: "4 (سيدان)" },
  { count: 7, label: "7 (فان)" },
  { count: 12, label: "12 (ميكروباص)" },
  { count: 25, label: "25 (كوستر)" },
  { count: 45, label: "45 (باص)" },
  { count: 50, label: "50 (حافلة)" },
];

export function PassengerManifestManager({
  control,
  register,
  errors,
  embedded = false,
  isFullscreen = false,
  onToggleFullscreen,
}: PassengerManifestManagerProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });

  const [customCount, setCustomCount] = useState<string>("");

  // Dynamically set passenger count (between 1 and 50)
  const setTotalPassengers = (target: number) => {
    const nextCount = Math.max(1, Math.min(50, Math.floor(target)));
    const currentCount = fields.length;

    if (nextCount > currentCount) {
      const diff = nextCount - currentCount;
      const newItems = Array.from({ length: diff }, () => ({
        name: "",
        nationality: "",
        idNumber: "",
      }));
      append(newItems);
    } else if (nextCount < currentCount) {
      // Remove starting from highest index backwards to safely preserve prior rows
      for (let i = currentCount - 1; i >= nextCount; i--) {
        remove(i);
      }
    }
  };

  const handleApplyCustomCount = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setTotalPassengers(parsed);
      setCustomCount("");
    }
  };

  const addOne = () => {
    if (fields.length < 50) {
      append({ name: "", nationality: "", idNumber: "" });
    }
  };

  return (
    <div
      className={
        embedded
          ? "p-4 sm:p-6 space-y-4"
          : "theme-card p-4 sm:p-6 rounded-3xl border theme-border space-y-4"
      }
    >
      {/* Section Header & Dynamic Passenger Count Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b theme-border pb-4">
        <div className={embedded ? "hidden md:block" : undefined}>
          <div className="flex items-center gap-2.5">
            <div aria-hidden="true" className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-main)]">
                {ui("كشف الركاب والمرافقين (بيان تفصيلي)")}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-sm font-bold bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 font-mono">
                <span>{fields.length}</span>
                <span className="text-sm font-medium text-[var(--text-muted)]">{ui("/ 50 راكب")}</span>
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {ui("توثيق أسماء وبيانات الضيوف حتى 50 راكباً للسيارات الخاصة والفانات والحافلات")}</p>
        </div>

        {/* Counter Stepper, Direct Count & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stepper + Direct Number Input */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] shadow-2xs">
            <span className="text-sm font-bold text-[var(--text-muted)] px-1 select-none">
              {ui("العدد:")}</span>

            {/* Decrement Button */}
            <button
              type="button"
              onClick={() => {
                setTotalPassengers(fields.length - 1);
                setCustomCount("");
              }}
              disabled={fields.length <= 1}
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-card)] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              aria-label={ui("إنقاص راكب واحد")}
              title={ui("إنقاص راكب واحد")}
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Direct Number Input */}
            <input
              type="text"
              inputMode="numeric"
              aria-label={ui("عدد الركاب")}
              value={customCount !== "" ? customCount : String(fields.length)}
              onChange={(e) => setCustomCount(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyCustomCount(customCount);
                }
              }}
              onBlur={() => {
                if (customCount !== "") {
                  handleApplyCustomCount(customCount);
                }
              }}
              className="stepper-count-input w-12 text-center font-mono font-semibold text-base bg-transparent border-0 focus:outline-hidden text-[var(--text-main)]"
              title={ui("اكتب العدد المطلوب (1-50) ثم اضغط Enter أو خارج الحقل للتطبيق")}
            />

            {/* Increment Button */}
            <button
              type="button"
              onClick={() => {
                setTotalPassengers(fields.length + 1);
                setCustomCount("");
              }}
              disabled={fields.length >= 50}
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-card)] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              aria-label={ui("زيادة راكب واحد")}
              title={ui("زيادة راكب واحد")}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Apply button appears when user edits the number directly */}
            {customCount !== "" && parseInt(customCount, 10) !== fields.length && (
              <button
                type="button"
                onClick={() => handleApplyCustomCount(customCount)}
                className="min-h-9 px-3 py-1 rounded-lg gold-gradient-btn text-sm font-bold shadow-2xs transition cursor-pointer"
              >
                {ui("تطبيق")}</button>
            )}
          </div>

          {/* Add 1 Passenger Button */}
          <button
            type="button"
            onClick={addOne}
            disabled={fields.length >= 50}
            className="flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-sm font-bold transition shadow-xs disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
            title={ui(fields.length >= 50 ? "تم الوصول للحد الأقصى (50 راكباً)" : "إضافة راكب جديد")}
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>{ui("إضافة راكب")}</span>
          </button>

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--control-border)] bg-[var(--input-bg)] text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent-gold)] transition cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{text("إنهاء ملء الشاشة", "Exit full-screen")}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{text("توسيع الكشف", "Full-screen list")}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick Capacity Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border">
        <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-muted)] pe-1 shrink-0">
          <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
          <span>{ui("تحديد سريع لسعة المركبة:")}</span>
        </div>
        <MobileHorizontalStrip
          label={ui("تحديد سريع لسعة المركبة")}
          className="sm:flex-wrap pb-0"
        >
          {CAPACITY_PRESETS.map((preset) => {
            const isActive = fields.length === preset.count;
            return (
              <button
                key={preset.count}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setTotalPassengers(preset.count);
                  setCustomCount("");
                }}
                className={`min-h-11 sm:min-h-10 shrink-0 snap-start whitespace-nowrap px-3.5 py-1.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                  isActive
                    ? "gold-gradient-btn shadow-2xs font-semibold ring-2 ring-[var(--accent-gold)]/25"
                    : "bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--control-border)] hover:border-[var(--accent-gold)]"
                }`}
              >
                {ui(preset.label)}
              </button>
            );
          })}
        </MobileHorizontalStrip>
      </div>

      {/* Passenger Cards List */}
      <div className="space-y-3.5">
        {fields.map((field, index) => {
          const isPrimary = index === 0;
          const passengerErrors = errors?.passengers?.[index];

          return (
            <div
              key={field.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 ${
                isPrimary
                  ? "bg-[var(--accent-surface)]/55 border-[var(--accent-gold)]/35"
                  : "bg-[var(--bg-card-subtle)] theme-border hover:border-[var(--accent-gold)]/35"
              }`}
            >
              {/* Header on Mobile */}
              <div className="flex items-center justify-between sm:hidden pb-2.5 mb-3 border-b theme-border">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg font-mono font-semibold text-sm flex items-center justify-center ${
                      isPrimary
                        ? "gold-gradient-btn"
                        : "bg-[var(--bg-card)] border theme-border text-[var(--text-main)]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-main)]">
                    {ui(isPrimary ? "الضيف الأساسي (المرافق الأول)" : `الراكب ${index + 1}`)}
                  </span>
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="min-h-10 px-2.5 py-1.5 rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition flex items-center gap-1.5 text-sm font-bold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>{ui("حذف")}</span>
                  </button>
                )}
              </div>

              {/* Desktop & Tablet Fields Layout */}
              <div className="flex items-start gap-3">
                {/* Sequence Badge (Desktop) */}
                <div
                  aria-hidden="true"
                  className={`hidden sm:flex w-9 h-9 rounded-xl font-mono font-semibold text-sm items-center justify-center shrink-0 mt-7 ${
                    isPrimary
                      ? "gold-gradient-btn shadow-2xs"
                      : "bg-[var(--bg-card)] border theme-border text-[var(--text-main)]"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Input Fields using CustomInput */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <CustomInput
                    label={ui(isPrimary ? "اسم الضيف" : `اسم الراكب ${index + 1}`)}
                    icon={<User className="w-4 h-4" />}
                    placeholder={ui(isPrimary ? "الاسم الرباعي للضيف" : `اسم الراكب المرافق ${index + 1}`)}
                    expandable
                    {...register(`passengers.${index}.name` as const)}
                    error={passengerErrors?.name?.message}
                  />

                  <CustomInput
                    label={ui("الجنسية")}
                    icon={<Globe className="w-4 h-4" />}
                    placeholder={ui("مثال: سعودي")}
                    expandable
                    {...register(`passengers.${index}.nationality` as const)}
                    error={passengerErrors?.nationality?.message}
                  />

                  <CustomInput
                    label={ui("رقم الهوية / الجواز")}
                    icon={<CreditCard className="w-4 h-4" />}
                    placeholder={ui("الهوية أو الإقامة أو الجواز")}
                    dir="ltr"
                    expandable
                    className="text-start font-mono"
                    {...register(`passengers.${index}.idNumber` as const)}
                    error={passengerErrors?.idNumber?.message}
                  />
                </div>

                {/* Delete button (Desktop) */}
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="hidden sm:flex min-h-11 min-w-11 items-center justify-center p-2.5 rounded-xl text-[var(--text-muted)] hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 mt-7 cursor-pointer"
                    aria-label={ui(`حذف الراكب ${index + 1}`)}
                    title={ui("حذف هذا الراكب")}
                  >
                    <Trash2 className="w-4.5 h-4.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3.5 border-t theme-border text-sm text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          <span>{ui("يمكنك ضبط وتحديد حتى 50 راكباً للرحلات الجماعية والباصات والوفود الرسمية.")}</span>
        </div>
        <div className="flex items-center gap-2 font-mono font-bold text-[var(--accent-gold)] shrink-0">
          <span>{ui("إجمالي الركاب:")}</span>
          <span className="text-base font-semibold bg-[var(--accent-surface)] px-2.5 py-0.5 rounded-lg border border-[var(--accent-gold)]/30" dir="ltr">
            {fields.length} / 50
          </span>
        </div>
      </div>
    </div>
  );
}
