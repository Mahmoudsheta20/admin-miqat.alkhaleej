"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { amountLabel, type VatRow } from "@/lib/accounting";
interface VatReturnTableProps { rows: VatRow[] }
export default function VatReturnTable({ rows }: VatReturnTableProps) {
  const [copied, setCopied] = useState(""), [error, setError] = useState("");
  async function copy(key: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(key); setError(""); }
    catch { setError("تعذر النسخ؛ يمكنك تحديد المبلغ ونسخه يدويًا."); }
  }
  function cell(row: VatRow, field: "amount" | "adjustment" | "vat", label: string) {
    const value = row[field], key = `${row.box}-${field}`;
    return <td className="whitespace-nowrap px-3 py-4">{value === null ? <span className="block text-center text-slate-400">—</span> : <div className="flex items-center justify-end gap-2"><bdi className={`select-text font-mono text-sm ${row.isTotal ? "font-bold" : ""}`}>{amountLabel(value)}</bdi><button onClick={() => void copy(key, value)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-400" aria-label={`نسخ ${label} للخانة ${row.box}`} title="نسخ المبلغ بدون فواصل">{copied === key ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}</button></div>}</td>;
  }
  return <div className="theme-card overflow-hidden rounded-2xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border px-5 py-4"><h2 className="font-bold">ملخص الإقرار وفق خانات الهيئة</h2><p className="text-xs text-slate-500">الريال السعودي · نسخ القيم بدقتين عشريتين</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-sm"><caption className="sr-only">ملخص ضريبة المبيعات والمشتريات وصافي الضريبة</caption><thead className="theme-card-subtle"><tr><th className="w-12 px-4 py-4 text-xs">الخانة</th><th className="px-4 py-4">البيان</th><th className="px-4 py-4 text-end">المبلغ (ر.س)</th><th className="px-4 py-4 text-end">التعديل (ر.س)</th><th className="px-4 py-4 text-end">مبلغ الضريبة (ر.س)</th></tr></thead><tbody>{([['SALES', 'ضريبة المبيعات'], ['PURCHASES', 'ضريبة المشتريات'], ['NET', 'صافي الضريبة']] as const).map(([section, label]) => <Section key={section} label={label} rows={rows.filter(row => row.section === section)} cell={cell} />)}</tbody></table></div><div className="border-t theme-border px-5 py-3 text-xs text-slate-500" role="status" aria-live="polite">{error || (copied ? "تم نسخ المبلغ." : "التعديل تخفيض موجب يُطرح من المبلغ. يشمل تعديل المشتريات الجزء غير القابل للخصم.")}</div></div>;
}
interface SectionProps { label: string; rows: VatRow[]; cell: (row: VatRow, field: "amount" | "adjustment" | "vat", label: string) => React.ReactNode }
function Section({ label, rows, cell }: SectionProps) {
  return <><tr><th colSpan={5} scope="colgroup" className="border-y theme-border bg-slate-900 px-5 py-3 text-right text-xs font-bold text-white dark:bg-slate-800">{label}</th></tr>{rows.map(row => <tr className={`border-t theme-border ${row.box === 16 ? "bg-amber-50 dark:bg-amber-500/10" : row.isTotal ? "theme-card-subtle" : ""}`} key={row.box}><td className="px-4 py-4 font-mono text-xs text-slate-500">{row.box}</td><th scope="row" className={`px-4 py-4 text-sm ${row.isTotal ? "font-bold" : "font-normal"}`}>{row.label}{[2, 8, 9].includes(row.box) && <span className="mt-1 block text-[11px] font-normal text-slate-500">لا توجد قيود لهذه المعاملة في السجل الحالي</span>}{row.box === 15 && <span className="mt-1 block text-[11px] font-normal text-slate-500">يظهر بالسالب لأنه يُخصم من الضريبة المستحقة</span>}</th>{cell(row, "amount", "المبلغ")}{cell(row, "adjustment", "التعديل")}{cell(row, "vat", "الضريبة")}</tr>)}</>;
}
