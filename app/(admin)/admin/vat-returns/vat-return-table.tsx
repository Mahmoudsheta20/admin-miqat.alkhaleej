"use client";

import React, { useState } from "react";
import { Check, Copy, HelpCircle } from "lucide-react";
import { amountLabel, type VatRow } from "@/lib/accounting";

interface VatReturnTableProps {
  rows: VatRow[];
}

export default function VatReturnTable({ rows }: VatReturnTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  async function handleCopy(key: string, rawValue: string | null, label: string, boxNum: number) {
    if (!rawValue) return;
    try {
      // Copy exact plain decimal string without formatting for ZATCA portal
      await navigator.clipboard.writeText(rawValue);
      setCopiedKey(key);
      setFeedback(`تم نسخ مبلغ الخانة ${boxNum} (${rawValue}) بنجاح لصقه في بوابة الهيئة!`);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
        setFeedback("");
      }, 2500);
    } catch {
      setFeedback("تعذر النسخ التلقائي؛ يمكنك تحديد الرقم ونسخه يدوياً.");
    }
  }

  function renderCell(
    row: VatRow,
    field: "amount" | "adjustment" | "vat",
    label: string
  ) {
    const value = row[field];
    const key = `${row.box}-${field}`;
    const isCopied = copiedKey === key;

    if (value === null) {
      return (
        <td className="whitespace-nowrap px-4 py-3.5 text-center text-slate-300 dark:text-slate-600 font-mono">
          —
        </td>
      );
    }

    return (
      <td className="whitespace-nowrap px-4 py-3.5 text-left">
        <div className="inline-flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => void handleCopy(key, value, label, row.box)}
            className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 transition cursor-pointer"
            title={`نسخ ${label} للخانة ${row.box} لبوابة هيئة الزكاة`}
            aria-label={`نسخ ${label} للخانة ${row.box}`}
          >
            {isCopied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
          <bdi
            className={`font-mono text-xs sm:text-sm select-all ${
              row.isTotal ? "font-black text-slate-900 dark:text-white" : "font-bold text-slate-700 dark:text-slate-200"
            }`}
          >
            {amountLabel(value)}
          </bdi>
        </div>
      </td>
    );
  }

  return (
    <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border overflow-hidden shadow-xs space-y-0">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border px-5 py-4 bg-slate-50/70 dark:bg-slate-800/40">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            خانات نموذج الإقرار الضريبي (1–16)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            مطابقة لحقول بوابة هيئة الزكاة والضريبة والجمارك (zatca.gov.sa) · اضغط على زر النسخ بجوار أي رقم للصقه مباشرة.
          </p>
        </div>
        {feedback && (
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full animate-in fade-in">
            {feedback}
          </span>
        )}
      </div>

      {/* Table Content (Desktop md and up) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[850px] text-right text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b theme-border bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
              <th className="w-16 px-4 py-3.5">الخانة</th>
              <th className="px-4 py-3.5">بيان التوريدات والمصروفات</th>
              <th className="px-4 py-3.5 text-left">المبلغ الصافي (ر.س)</th>
              <th className="px-4 py-3.5 text-left">التعديل (ر.س)</th>
              <th className="px-4 py-3.5 text-left">مبلغ الضريبة (ر.س)</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {(
              [
                ["SALES", "١. ضريبة المبيعات والتوريدات (المخرجات)"],
                ["PURCHASES", "٢. ضريبة المشتريات والمصروفات (المدخلات)"],
                ["NET", "٣. تسوية وصافي الضريبة للفترة"],
              ] as const
            ).map(([sectionKey, sectionTitle]) => {
              const sectionRows = rows.filter((r) => r.section === sectionKey);
              return (
                <React.Fragment key={sectionKey}>
                  <tr className="bg-slate-900 dark:bg-slate-800/90 text-white font-black">
                    <td colSpan={5} className="px-5 py-2.5 text-xs font-black">
                      {sectionTitle}
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
                          {row.box}
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
                              {row.label}
                            </span>
                            {row.box === 1 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                                15%
                              </span>
                            )}
                            {row.box === 7 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                قابلة للخصم
                              </span>
                            )}
                          </div>
                          {[2, 8, 9].includes(row.box) && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              لا توجد قيود لهذه المعاملة في سجل الفترة الحالية
                            </span>
                          )}
                          {row.box === 15 && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              يظهر بالسالب لأنه يُطرح من الضريبة الواجبة السداد
                            </span>
                          )}
                        </td>

                        {renderCell(row, "amount", "المبلغ")}
                        {renderCell(row, "adjustment", "التعديل")}
                        {renderCell(row, "vat", "الضريبة")}
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
                {sectionTitle}
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
                            {row.box}
                          </span>
                          <div>
                            <p
                              className={`text-xs ${
                                row.isTotal
                                  ? "font-black text-slate-900 dark:text-white"
                                  : "font-bold text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {row.label}
                            </p>
                            {row.box === 1 && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                                15% أساسية
                              </span>
                            )}
                            {row.box === 7 && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                مدخلات قابلة للخصم
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Values Grid for Mobile */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border theme-border">
                          <span className="text-[10px] text-slate-400 block mb-0.5">الصافي</span>
                          {row.amount !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <bdi className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                {amountLabel(row.amount)}
                              </bdi>
                              <button
                                type="button"
                                onClick={() => void handleCopy(`${row.box}-amount`, row.amount, "الصافي", row.box)}
                                className="p-0.5 text-slate-400 hover:text-amber-600"
                                aria-label={`نسخ الصافي للخانة ${row.box}`}
                              >
                                {copiedKey === `${row.box}-amount` ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border theme-border">
                          <span className="text-[10px] text-slate-400 block mb-0.5">التعديل</span>
                          {row.adjustment !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <bdi className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                {amountLabel(row.adjustment)}
                              </bdi>
                              <button
                                type="button"
                                onClick={() => void handleCopy(`${row.box}-adjustment`, row.adjustment, "التعديل", row.box)}
                                className="p-0.5 text-slate-400 hover:text-amber-600"
                                aria-label={`نسخ التعديل للخانة ${row.box}`}
                              >
                                {copiedKey === `${row.box}-adjustment` ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </div>

                        <div
                          className={`p-2 rounded-xl border ${
                            isGrandTotal
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200"
                              : "bg-white dark:bg-slate-900/60 border theme-border"
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 block mb-0.5">الضريبة</span>
                          {row.vat !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <bdi
                                className={`font-mono text-xs font-black ${
                                  isGrandTotal
                                    ? "text-amber-700 dark:text-amber-300"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {amountLabel(row.vat)}
                              </bdi>
                              <button
                                type="button"
                                onClick={() => void handleCopy(`${row.box}-vat`, row.vat, "الضريبة", row.box)}
                                className="p-0.5 text-slate-400 hover:text-amber-600"
                                aria-label={`نسخ الضريبة للخانة ${row.box}`}
                              >
                                {copiedKey === `${row.box}-vat` ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </div>
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
            عمود «المبلغ» يمثل الصافي غير شامل الضريبة، وعمود «التعديل» يمثل الإشعارات الدائنة أو غير القابلة للخصم.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">SAR · ZATCA Box 1–16</span>
      </div>
    </div>
  );
}
