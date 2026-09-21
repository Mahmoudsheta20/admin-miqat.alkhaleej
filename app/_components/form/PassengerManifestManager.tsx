"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Minus,
  Trash2,
  Globe,
  CreditCard,
  User,
  UserPlus,
  Sparkles,
} from "lucide-react";
import {
  Control,
  UseFormRegister,
  useFieldArray,
  FieldErrors,
} from "react-hook-form";
import { AdminContractFormValues } from "@/lib/validations/contract";
import { CustomInput } from "./CustomInput";

export interface PassengerManifestManagerProps {
  control: Control<AdminContractFormValues>;
  register: UseFormRegister<AdminContractFormValues>;
  errors?: FieldErrors<AdminContractFormValues>;
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
}: PassengerManifestManagerProps) {
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
    <div className="theme-card p-4 sm:p-6 rounded-3xl border theme-border space-y-4">
      {/* Section Header & Dynamic Passenger Count Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b theme-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                كشف الركاب والمرافقين (بيان تفصيلي)
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
                <span>{fields.length}</span>
                <span className="text-[10px] font-medium text-slate-500">/ 50 راكب</span>
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            توثيق أسماء وبيانات الضيوف حتى 50 راكباً للسيارات الخاصة والفانات والحافلات
          </p>
        </div>

        {/* Counter Stepper, Direct Count & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stepper + Direct Number Input */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl border theme-border bg-slate-50/80 dark:bg-slate-900/60 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1 select-none">
              العدد:
            </span>

            {/* Decrement Button */}
            <button
              type="button"
              onClick={() => {
                setTotalPassengers(fields.length - 1);
                setCustomCount("");
              }}
              disabled={fields.length <= 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              title="إنقاص راكب واحد"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Direct Number Input */}
            <input
              type="number"
              min={1}
              max={50}
              value={customCount !== "" ? customCount : fields.length}
              onChange={(e) => setCustomCount(e.target.value)}
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
              className="w-12 text-center font-mono font-black text-sm bg-transparent border-0 focus:outline-hidden text-slate-900 dark:text-white"
              title="اكتب العدد المطلوب (1-50) ثم اضغط Enter أو خارج الحقل للتطبيق"
            />

            {/* Increment Button */}
            <button
              type="button"
              onClick={() => {
                setTotalPassengers(fields.length + 1);
                setCustomCount("");
              }}
              disabled={fields.length >= 50}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              title="زيادة راكب واحد"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Apply button appears when user edits the number directly */}
            {customCount !== "" && parseInt(customCount, 10) !== fields.length && (
              <button
                type="button"
                onClick={() => handleApplyCustomCount(customCount)}
                className="px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold shadow-2xs transition hover:bg-amber-600"
              >
                تطبيق
              </button>
            )}
          </div>

          {/* Add 1 Passenger Button */}
          <button
            type="button"
            onClick={addOne}
            disabled={fields.length >= 50}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs disabled:opacity-40 disabled:pointer-events-none"
            title={fields.length >= 50 ? "تم الوصول للحد الأقصى (50 راكباً)" : "إضافة راكب جديد"}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة راكب</span>
          </button>
        </div>
      </div>

      {/* Quick Capacity Presets */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border theme-border">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 pl-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>تحديد سريع لسعة المركبة:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CAPACITY_PRESETS.map((preset) => {
            const isActive = fields.length === preset.count;
            return (
              <button
                key={preset.count}
                type="button"
                onClick={() => {
                  setTotalPassengers(preset.count);
                  setCustomCount("");
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? "bg-amber-500 text-white shadow-2xs font-black ring-2 ring-amber-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border theme-border hover:border-amber-500/50"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Passenger Cards List */}
      <div className="space-y-3">
        {fields.map((field, index) => {
          const isPrimary = index === 0;
          const passengerErrors = errors?.passengers?.[index];

          return (
            <div
              key={field.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 ${
                isPrimary
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-slate-50/70 dark:bg-slate-900/50 theme-border hover:border-amber-500/30"
              }`}
            >
              {/* Header on Mobile */}
              <div className="flex items-center justify-between sm:hidden pb-2.5 mb-2.5 border-b theme-border">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                      isPrimary
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isPrimary ? "الضيف الأساسي (المرافق الأول)" : `الراكب ${index + 1}`}
                  </span>
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                )}
              </div>

              {/* Desktop & Tablet Fields Layout */}
              <div className="flex items-start gap-3">
                {/* Sequence Badge (Desktop) */}
                <div
                  className={`hidden sm:flex w-8 h-8 rounded-xl font-mono font-black text-xs items-center justify-center shrink-0 mt-6 ${
                    isPrimary
                      ? "gold-gradient-btn text-white shadow-2xs"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Input Fields using CustomInput */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CustomInput
                    label={isPrimary ? "اسم الضيف" : `اسم الراكب ${index + 1}`}
                    icon={<User className="w-3.5 h-3.5" />}
                    placeholder={
                      isPrimary ? "الاسم الرباعي للضيف" : `اسم الراكب المرافق ${index + 1}`
                    }
                    {...register(`passengers.${index}.name` as const)}
                    error={passengerErrors?.name?.message}
                  />

                  <CustomInput
                    label="الجنسية"
                    icon={<Globe className="w-3.5 h-3.5" />}
                    placeholder="مثال: سعودي"
                    {...register(`passengers.${index}.nationality` as const)}
                    error={passengerErrors?.nationality?.message}
                  />

                  <CustomInput
                    label="رقم الهوية / الجواز"
                    icon={<CreditCard className="w-3.5 h-3.5" />}
                    placeholder="الهوية أو الإقامة أو الجواز"
                    dir="ltr"
                    className="text-right font-mono"
                    {...register(`passengers.${index}.idNumber` as const)}
                    error={passengerErrors?.idNumber?.message}
                  />
                </div>

                {/* Delete button (Desktop) */}
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="hidden sm:flex p-2.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 mt-6"
                    title="حذف هذا الراكب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t theme-border text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>يمكنك ضبط وتحديد حتى 50 راكباً للرحلات الجماعية والباصات والوفود الرسمية.</span>
        </div>
        <div className="flex items-center gap-2 font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
          <span>إجمالي الركاب:</span>
          <span className="text-sm font-black bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            {fields.length} / 50
          </span>
        </div>
      </div>
    </div>
  );
}
