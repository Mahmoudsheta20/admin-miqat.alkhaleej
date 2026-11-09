"use client";
import { useUiText } from "@/lib/ui-text";

import { useState, type FormEvent } from "react";
import { accountingRequest, type VatSettings } from "@/lib/accounting";
import { signedMoneyMinor } from "@/lib/dashboard-analytics";
import { moneyMinor } from "@/lib/money";

interface ReturnSettingsProps {
  year: number;
  quarter: number;
  value: VatSettings;
  onSaved: () => void;
}

export default function ReturnSettings({ year, quarter, value, onSaved }: ReturnSettingsProps) {
  const ui = useUiText();

  const [correction, setCorrection] = useState(value.previousCorrection);
  const [credit, setCredit] = useState(value.carriedCredit);
  const [notes, setNotes] = useState(value.notes);
  const [filedOn, setFiledOn] = useState(value.filedOn || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const trimmedCorrection = correction.trim();
  const isValidCorrection =
    trimmedCorrection !== "" &&
    moneyMinor(trimmedCorrection.startsWith("-") ? trimmedCorrection.slice(1) : trimmedCorrection) !== null;
  const correctionMinor = signedMoneyMinor(correction);
  const creditMinor = moneyMinor(credit);
  const requiresNote =
    correctionMinor !== BigInt(0) ||
    (creditMinor !== null && creditMinor > BigInt(0)) ||
    Boolean(filedOn);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    if (!isValidCorrection || correctionMinor > BigInt(1499999)) {
      setError(
        ui.language === "en"
          ? "Enter a valid Box 14 correction amount up to 14,999.99 SAR."
          : "أدخل مبلغ تصحيح صحيح للخانة 14 بحد أقصى 14,999.99 ر.س."
      );
      return;
    }
    if (creditMinor === null || creditMinor < BigInt(0)) {
      setError(
        ui.language === "en"
          ? "Enter a valid Box 15 carried credit (0.00 or higher)."
          : "أدخل رصيد دائن متاح صحيح للخانة 15 (0.00 فأكثر)."
      );
      return;
    }
    setIsSaving(true);
    setError("");
    const result = await accountingRequest(`/vat-return/${year}/${quarter}`, "PUT", {
      version: value.version,
      previousCorrection: correction.trim(),
      carriedCredit: credit.trim(),
      notes,
      filedOn: filedOn || null,
    });
    setIsSaving(false);
    if (!result.success) setError(result.error || "تعذر حفظ إعدادات الفترة");
    else onSaved();
  }

  return (
    <details className="theme-card rounded-2xl border theme-border p-5">
      <summary className="min-h-11 flex items-center cursor-pointer font-bold">
        {ui("إعدادات الفترة والتقديم والتصحيحات")}
      </summary>
      <form className="mt-5 space-y-4" onSubmit={save}>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          {ui("تُحفظ القيم لكل ربع مع سجل مراجعة. أدخل الرصيد المتاح فعليًا من إقرار سابق؛ لا يُرحّل رصيد الربع السابق تلقائيًا لتجنب خصمه مرتين. التصحيح الموجب يزيد الضريبة، والسالب يخفضها.")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            {ui("تصحيحات سابقة (الخانة 14)")}
            <input
              required
              type="text"
              inputMode="decimal"
              dir="ltr"
              placeholder="0.00"
              className="theme-input mt-2 h-11 w-full rounded-xl px-3 font-mono"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            {ui("الرصيد الدائن المتاح (الخانة 15)")}
            <input
              required
              type="text"
              inputMode="decimal"
              dir="ltr"
              placeholder="0.00"
              className="theme-input mt-2 h-11 w-full rounded-xl px-3 font-mono"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm font-bold">
          {ui("تاريخ تقديم هذا الإقرار في بوابة الهيئة (اختياري)")}
          <input
            type="date"
            dir="ltr"
            className="theme-input mt-2 h-11 w-full rounded-xl px-3 font-mono text-start"
            value={filedOn}
            onChange={(e) => setFiledOn(e.target.value)}
          />
          <span className="mt-2 block text-xs font-normal text-[var(--text-muted)]">
            {ui("سجّل التاريخ بعد تقديم الإقرار فعليًا. يُستخدم لتحديد خانة الإشعارات الدائنة اللاحقة؛ لا يرسل النظام أي إقرار.")}
          </span>
        </label>
        <label className="block text-sm font-bold">
          {ui("مرجع التصحيح أو الإقرار السابق")}
          <textarea
            required={requiresNote}
            minLength={requiresNote ? 5 : undefined}
            maxLength={1000}
            rows={2}
            className="theme-input mt-2 w-full rounded-xl px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <p className="text-xs text-[var(--text-muted)]">
          {ui("النقص السابق بمبلغ 15,000 ر.س أو أكثر يحتاج مراجعة تعديل الإقرار السابق. تحقق من شروط ومهلة التصحيح مع المحاسب.")}
        </p>
        {error && (
          <p role="alert" className="text-sm font-bold text-rose-700 dark:text-rose-400">
            {ui(error)}
          </p>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="gold-gradient-btn min-h-11 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50 cursor-pointer"
        >
          {ui(isSaving ? "جارٍ الحفظ…" : "حفظ وإعادة حساب الإقرار")}
        </button>
      </form>
    </details>
  );
}
