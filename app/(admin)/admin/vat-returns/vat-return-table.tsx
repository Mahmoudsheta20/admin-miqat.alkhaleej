"use client";
import { useUiText } from "@/lib/ui-text";


import React, { useState } from "react";
import { Check, Copy, HelpCircle } from "lucide-react";
import { amountLabel, vatCopyPurpose, vatDisplayValue, type VatField, type VatRow } from "@/lib/accounting";
import { useLanguage } from "@/lib/languageContext";

interface VatReturnTableProps {
  rows: VatRow[];
  domesticPurchasesOnly?: boolean;
}

export default function VatReturnTable({ rows, domesticPurchasesOnly = true }: VatReturnTableProps) {
  const ui = useUiText();

  const { t } = useLanguage();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  async function handleCopy(
    row: VatRow,
    field: VatField,
    label: string,
  ) {
    const rawValue = vatDisplayValue(row, field), key = `${row.box}-${field}`;
    if (rawValue === null) return;
    try {
      // Copy exact plain decimal string without formatting for ZATCA portal
      await navigator.clipboard.writeText(rawValue);
      setCopiedKey(key);
      setFeedback(
        vatCopyPurpose(row, field) === "ENTRY"
          ? `تم نسخ ${ui(label)} للخانة ${row.box}: ${rawValue}. تحقق من الحقل المقابل قبل الإدخال.`
          : `تم نسخ ${ui(label)} للخانة ${row.box}: ${rawValue} للمطابقة مع القيم المحسوبة في البوابة.`,
      );
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
        setFeedback("");
      }, 2500);
    } catch {
      setFeedback("تعذر النسخ التلقائي؛ يمكنك تحديد الرقم ونسخه يدوياً.");
    }
  }

  function renderValue(
    row: VatRow,
    field: VatField,
    label: string,
  ) {
    const value = vatDisplayValue(row, field);
    const key = `${row.box}-${field}`;
    const isCopied = copiedKey === key;

    if (value === null) {
      return (
        <span className="text-slate-300 dark:text-slate-600 font-mono">
          —
        </span>
      );
    }

    return (
        <div className="inline-flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => void handleCopy(row, field, label)}
            className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 transition cursor-pointer"
            title={ui(vatCopyPurpose(row, field) === "ENTRY" ? "نسخ للإدخال" : "نسخ للمطابقة")}
            aria-label={ui(vatCopyPurpose(row, field) === "ENTRY"
              ? `نسخ ${ui(label)} للخانة ${row.box}`
              : `نسخ ${ui(label)} للخانة ${row.box} للمطابقة`)}
          >
            {isCopied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
          <bdi
            className={`font-mono text-xs sm:text-sm select-all ${
              row.isTotal
                ? "font-black text-slate-900 dark:text-white"
                : "font-bold text-slate-700 dark:text-slate-200"
            }`}
          >
            {ui(amountLabel(value))}
          </bdi>
        </div>
    );
  }

  function renderCell(row: VatRow, field: VatField, label: string) {
    return <td className="whitespace-nowrap px-4 py-3.5 text-end">{renderValue(row, field, label)}</td>;
  }

  function rowHelp(row: VatRow) {
    if (row.box === 15) return "رصيد متاح يُخصم مرة واحدة من صافي الضريبة؛ طابقه مع رصيد البوابة.";
    if (domesticPurchasesOnly && [8, 9].includes(row.box)) return "غير مدعومة حاليًا؛ راجع مستندات الواردات والاحتساب العكسي منفصلًا.";
    return undefined;
  }

  return (
    <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border overflow-hidden shadow-xs space-y-0">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border px-5 py-4 bg-slate-50/70 dark:bg-slate-800/40">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            {ui(t("vat.title"))} (1–16)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {ui(t("vat.copyNotice"))}
          </p>
        </div>
        {feedback && (
          <span role="status" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full animate-in fade-in">
            {ui(feedback)}
          </span>
        )}
      </div>

      {domesticPurchasesOnly && (
        <p className="px-5 py-3 border-b theme-border text-xs leading-relaxed text-amber-800 dark:text-amber-300 bg-amber-500/5">
          {ui("يغطي هذا التقرير المشتريات المحلية فقط. الأصفار في خانات الواردات والاحتساب العكسي لا تؤكد عدم وجود معاملات؛ راجعها منفصلًا قبل التقديم.")}
        </p>
      )}

      {/* Table Content (Desktop md and up) */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full min-w-[850px] ${"text-start"} text-xs sm:text-sm border-collapse`}>
          <thead>
            <tr className="border-b theme-border bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
              <th className="w-16 px-4 py-3.5">{ui(t("vat.box"))}</th>
              <th className="px-4 py-3.5">{ui(t("vat.desc"))}</th>
              <th className={`px-4 py-3.5 ${"text-end"}`}>{ui(t("vat.net"))} ({ui(t("common.sar"))})</th>
              <th className={`px-4 py-3.5 ${"text-end"}`}>{ui(t("vat.adj"))} ({ui(t("common.sar"))})</th>
              <th className={`px-4 py-3.5 ${"text-end"}`}>{ui("الضريبة / الرصيد")} ({ui(t("common.sar"))})</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {(
              [
                ["SALES", t("vat.salesSection")],
                ["PURCHASES", t("vat.purchasesSection")],
                ["NET", t("vat.netSection")],
              ] as const
            ).map(([sectionKey, sectionTitle]) => {
              const sectionRows = rows.filter((r) => r.section === sectionKey);
              return (
                <React.Fragment key={sectionKey}>
                  <tr className="bg-slate-900 dark:bg-slate-800/90 text-white font-black">
                    <td colSpan={5} className="px-5 py-2.5 text-xs font-black">
                      {ui(sectionTitle)}
                    </td>
                  </tr>

                  {sectionRows.map((row) => {
                    const isGrandTotal = row.box === 16;
                    const isSubtotal = row.isTotal && !isGrandTotal;

                    return (
                      <tr
                        key={row.box}
                        className={`transition duration-150 ${
                          isGrandTotal
                            ? "bg-amber-500/10 border-y-2 border-amber-500/40"
                            : isSubtotal
                              ? "bg-slate-50/80 dark:bg-slate-800/50 font-bold"
                              : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        <td className="px-4 py-3.5 font-mono font-black text-amber-700 dark:text-amber-400">
                          {ui(row.box)}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`${
                                row.isTotal
                                  ? "font-black text-slate-900 dark:text-white"
                                  : "font-semibold text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {ui(row.label)}
                            </span>
                            {row.box === 1 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                                15%
                              </span>
                            )}
                            {row.box === 7 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                {ui("قابلة للخصم")}</span>
                            )}
                          </div>
                          {rowHelp(row) && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {ui(rowHelp(row) ?? "")}</span>
                          )}
                        </td>

                        {ui(renderCell(row, "amount", "المبلغ"))}
                        {ui(renderCell(row, "adjustment", "التعديل"))}
                        {ui(renderCell(row, "vat", "الضريبة"))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (Below md) */}
      <div className="md:hidden divide-y theme-border">
        {(
          [
            ["SALES", "١. ضريبة المبيعات والتوريدات (المخرجات)"],
            ["PURCHASES", "٢. ضريبة المشتريات والمصروفات (المدخلات)"],
            ["NET", "٣. تسوية وصافي الضريبة للفترة"],
          ] as const
        ).map(([sectionKey, sectionTitle]) => {
          const sectionRows = rows.filter((r) => r.section === sectionKey);
          return (
            <div key={sectionKey} className="space-y-0">
              <div className="bg-slate-900 dark:bg-slate-800 text-white font-black px-4 py-2 text-xs">
                {ui(sectionTitle)}
              </div>

              <div className="divide-y theme-border">
                {sectionRows.map((row) => {
                  const isGrandTotal = row.box === 16;
                  const isSubtotal = row.isTotal && !isGrandTotal;

                  return (
                    <div
                      key={row.box}
                      className={`p-3.5 space-y-2.5 ${
                        isGrandTotal
                          ? "bg-amber-500/10 border-y-2 border-amber-500/40"
                          : isSubtotal
                            ? "bg-slate-50/80 dark:bg-slate-800/50"
                            : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            {ui(row.box)}
                          </span>
                          <div>
                            <p
                              className={`text-xs ${
                                row.isTotal
                                  ? "font-black text-slate-900 dark:text-white"
                                  : "font-bold text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {ui(row.label)}
                            </p>
                            {row.box === 1 && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                                {ui("15% أساسية")}</span>
                            )}
                            {row.box === 7 && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                {ui("مدخلات قابلة للخصم")}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {rowHelp(row) && <p className="text-[10px] text-slate-500 dark:text-slate-400">{ui(rowHelp(row) ?? "")}</p>}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        {([
                          ["amount", "الصافي"],
                          ["adjustment", "التعديل"],
                          ["vat", "الضريبة / الرصيد"],
                        ] as const).map(([field, label]) => (
                          <div key={field} className={`p-2 rounded-xl border ${isGrandTotal && field === "vat" ? "bg-amber-500/15 border-amber-500/40" : "bg-white dark:bg-slate-900/60 theme-border"}`}>
                            <span className="text-[10px] text-slate-400 block mb-0.5">{ui(label)}</span>
                            {renderValue(row, field, label)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Footer Instructions */}
      <div className="border-t theme-border px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            {ui("المبلغ قبل الضريبة، والتعديل تخفيض يُطرح منه. استخدم «نسخ للإدخال» للحقول القابلة للتعبئة، و«نسخ للمطابقة» للضريبة والإجماليات المحسوبة.")}</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          SAR · ZATCA Box 1–16
        </span>
      </div>
    </div>
  );
}
