"use client";

import { useUiText } from "@/lib/ui-text";
import { useRef, useState, type FormEvent } from "react";
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  FileText,
  Hash,
} from "lucide-react";
import {
  accountingRequest,
  amountLabel,
  currentSaudiPeriod,
  type Account,
  type Journal,
} from "@/lib/accounting";
import { ensureCapitalAndBankAccounts } from "@/lib/seed-test-data";
import { useAccountingQuery } from "@/lib/use-accounting-query";

interface Line {
  key: string;
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
  vehiclePlate: string;
}

const INPUT = "theme-input h-11 rounded-xl px-3 text-sm w-full";
const empty = (key: string): Line => ({
  key,
  accountCode: "",
  debit: "0.00",
  credit: "0.00",
  description: "",
  vehiclePlate: "",
});

export default function JournalPanel({
  reload,
  onChanged,
}: {
  reload: number;
  onChanged: () => void;
}) {
  const ui = useUiText();

  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(currentSaudiPeriod().day);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([empty("1"), empty("2")]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const key = useRef("");
  const [reverseId, setReverseId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reverseDate, setReverseDate] = useState(currentSaudiPeriod().day);

  const accounts = useAccountingQuery<{ items: Account[] }>("/accounts", reload);
  const journals = useAccountingQuery<{ items: Journal[]; total: number }>(
    `/journals?page=${page}`,
    reload
  );

  const totals = lines.reduce(
    (s, l) => ({
      debit: s.debit + Math.round(Number(l.debit || 0) * 100),
      credit: s.credit + Math.round(Number(l.credit || 0) * 100),
    }),
    { debit: 0, credit: 0 }
  );

  const isBalanced = totals.debit === totals.credit && totals.debit > 0;
  const difference = Math.abs(totals.debit - totals.credit) / 100;

  const update = (id: string, v: Partial<Line>) => {
    setLines((p) => p.map((l) => (l.key === id ? { ...l, ...v } : l)));
    key.current = "";
  };

  async function fillCapitalPreset() {
    setSaving(true);
    setError("");
    try {
      const { bankCode, capitalCode } = await ensureCapitalAndBankAccounts();
      onChanged();
      setShowForm(true);
      setDate(currentSaudiPeriod().day);
      setDescription("إثبات رأس المال الافتتاحي للشركة (300,000 ر.س)");
      setLines([
        {
          key: "1",
          accountCode: bankCode,
          debit: "300000.00",
          credit: "0.00",
          description: "إيداع رأس المال في البنك",
          vehiclePlate: "",
        },
        {
          key: "2",
          accountCode: capitalCode,
          debit: "0.00",
          credit: "300000.00",
          description: "رأس المال الافتتاحي",
          vehiclePlate: "",
        },
      ]);
      key.current = "";
    } finally {
      setSaving(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    key.current ||= crypto.randomUUID();
    const result = await accountingRequest("/journals", "POST", {
      operationKey: key.current,
      entryDate: date,
      description,
      lines: lines.map((l) => ({
        accountCode: l.accountCode,
        debit: l.debit,
        credit: l.credit,
        description: l.description || description,
        vehiclePlate: l.vehiclePlate || undefined,
      })),
    });
    setSaving(false);
    if (result.success) {
      setShowForm(false);
      setLines([empty("1"), empty("2")]);
      key.current = "";
      setDescription("");
      onChanged();
    } else {
      setError(result.error || "تعذر ترحيل القيد");
    }
  }

  async function reverse(e: FormEvent) {
    e.preventDefault();
    if (!reverseId) return;
    setSaving(true);
    const result = await accountingRequest(`/journals/${reverseId}/reverse`, "POST", {
      date: reverseDate,
      reason: reverseReason,
    });
    setSaving(false);
    if (result.success) {
      setReverseId(null);
      onChanged();
    } else {
      setError(result.error || "تعذر عكس القيد");
    }
  }

  return (
    <section className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Scale className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{ui("دفتر اليومية")}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {ui("القيود المعتمدة محفوظة. التصحيح بقيد عكسي؛ وتصحيح المستند من شاشته الأصلية.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            className="theme-card inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 disabled:opacity-50 cursor-pointer transition-colors"
            onClick={() => void fillCapitalPreset()}
          >
            <Plus className="h-3.5 w-3.5" />
            {ui("تعبئة قيد رأس مال (300,000 ر.س)")}
          </button>
          <button
            type="button"
            className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold cursor-pointer transition-transform active:scale-[0.98]"
            onClick={() => setShowForm((v) => !v)}
          >
            <FileText className="h-4 w-4" />
            {ui("قيد يدوي")}
          </button>
        </div>
      </div>

      {(error || journals.error || accounts.error) && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{ui(error || journals.error || accounts.error)}</p>
        </div>
      )}

      {/* Manual Journal Entry Form (Double-Entry Voucher) */}
      {showForm && (
        <form
          onSubmit={save}
          className="theme-card space-y-5 rounded-2xl border theme-border p-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              <h3 className="text-sm font-bold">{ui("سند قيد اليومية")}</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {ui("سند قيد مزدوج متوازن")}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <label className="text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                {ui("تاريخ القيد")}
              </span>
              <input
                required
                type="date"
                className={`${INPUT} mt-1.5 font-mono text-xs`}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  key.current = "";
                }}
              />
            </label>
            <label className="text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <FileText className="h-3.5 w-3.5" />
                {ui("البيان")}
              </span>
              <input
                required
                maxLength={300}
                className={`${INPUT} mt-1.5`}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  key.current = "";
                }}
                placeholder={ui("رصيد افتتاحي أو تسوية محاسبية")}
              />
            </label>
          </div>

          {/* Double-Entry Table */}
          <div className="overflow-x-auto rounded-xl border theme-border">
            <table className="w-full min-w-[760px] text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b theme-border">
                <tr>
                  <th className="py-3 px-3 text-start font-bold text-slate-700 dark:text-slate-300">
                    {ui("الحساب")}
                  </th>
                  <th className="py-3 px-3 text-end font-bold text-rose-600 dark:text-rose-400 w-36">
                    {ui("مدين")} (Debit)
                  </th>
                  <th className="py-3 px-3 text-end font-bold text-emerald-600 dark:text-emerald-400 w-36">
                    {ui("دائن")} (Credit)
                  </th>
                  <th className="py-3 px-3 text-start font-bold text-slate-700 dark:text-slate-300">
                    {ui("البيان / لوحة المركبة")}
                  </th>
                  <th className="py-3 px-2 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {lines.map((l) => (
                  <tr key={l.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="min-w-64 p-2.5">
                      <select
                        required
                        className={`${INPUT} text-xs`}
                        value={l.accountCode}
                        onChange={(e) => update(l.key, { accountCode: e.target.value })}
                      >
                        <option value="">{ui("اختر الحساب")}</option>
                        {accounts.data?.items
                          .filter((a) => a.isPosting && a.isActive)
                          .map((a) => (
                            <option key={a.code} value={a.code}>
                              {ui(a.code)} · {(ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr))}
                            </option>
                          ))}
                      </select>
                    </td>
                    {/* Debit side */}
                    <td className="w-36 p-2.5">
                      <input
                        aria-label={ui("مدين")}
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        className={`${INPUT} text-end font-mono tabular-nums text-rose-700 dark:text-rose-300 font-semibold focus:border-rose-500`}
                        value={l.debit}
                        onChange={(e) => update(l.key, { debit: e.target.value })}
                      />
                    </td>
                    {/* Credit side */}
                    <td className="w-36 p-2.5">
                      <input
                        aria-label={ui("دائن")}
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        className={`${INPUT} text-end font-mono tabular-nums text-emerald-700 dark:text-emerald-300 font-semibold focus:border-emerald-500`}
                        value={l.credit}
                        onChange={(e) => update(l.key, { credit: e.target.value })}
                      />
                    </td>
                    <td className="p-2.5 space-y-1.5">
                      <input
                        aria-label={ui("بيان السطر")}
                        maxLength={300}
                        className={`${INPUT} text-xs`}
                        placeholder={ui("بيان السطر")}
                        value={l.description}
                        onChange={(e) => update(l.key, { description: e.target.value })}
                      />
                      <input
                        aria-label={ui("لوحة المركبة في القيد")}
                        maxLength={50}
                        className={`${INPUT} text-xs font-mono`}
                        placeholder={ui("لوحة المركبة (اختياري)")}
                        value={l.vehiclePlate}
                        onChange={(e) => update(l.key, { vehiclePlate: e.target.value })}
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        aria-label={ui("حذف سطر")}
                        disabled={lines.length <= 2}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg disabled:opacity-20 cursor-pointer transition-colors"
                        onClick={() => {
                          setLines((v) => v.filter((x) => x.key !== l.key));
                          key.current = "";
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Accounting Double Underline Footer */}
              <tfoot className="border-t-2 border-b-4 border-double border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50">
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
                    {ui("إجمالي القيد")}
                  </td>
                  <td className="py-3 px-3 text-end font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400" dir="ltr">
                    {amountLabel(String(totals.debit / 100))} SAR
                  </td>
                  <td className="py-3 px-3 text-end font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                    {amountLabel(String(totals.credit / 100))} SAR
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-start">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isBalanced
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isBalanced ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {ui("متزن")}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5" />
                          {ui("غير متزن")} ({ui("الفرق:")} {difference.toFixed(2)} SAR)
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Row & Live Balance Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <button
              type="button"
              className="theme-card inline-flex items-center gap-2 rounded-xl border theme-border px-4 py-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => setLines((v) => [...v, empty(crypto.randomUUID())])}
            >
              <Plus className="h-4 w-4" />
              {ui("إضافة سطر")}
            </button>

            {/* Semantic Balance Indicator Banner */}
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all ${
                isBalanced
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
              }`}
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">{ui("قيد متزن")}</span>
                    <span className="ms-2 font-mono tabular-nums" dir="ltr">
                      {ui(amountLabel(String(totals.debit / 100)))} SAR
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold">{ui("قيد غير متزن")}</span>
                    <span className="ms-2">
                      {ui("الفرق:")}{" "}
                      <bdi className="font-mono tabular-nums font-bold" dir="ltr">
                        {difference.toFixed(2)} SAR
                      </bdi>
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              disabled={saving || !isBalanced}
              className="gold-gradient-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs sm:text-sm font-bold disabled:opacity-40 cursor-pointer transition-transform active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" />
              {ui("اعتماد القيد المتوازن")}
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {ui("تسويات الحسابات الضريبية اليدوية تظهر في دفتر الأستاذ؛ تقرير VAT يُحسب من الفواتير والمصروفات، لذلك يلزم مطابقة أي تسوية يدوية قبل الإقفال.")}
          </p>
        </form>
      )}

      {/* Reverse Journal Modal Form */}
      {reverseId && (
        <form
          onSubmit={reverse}
          className="theme-card flex flex-wrap items-end gap-3 rounded-2xl border border-rose-300/50 bg-rose-50/20 dark:bg-rose-950/10 p-5"
        >
          <div className="w-full flex items-center gap-2 pb-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <RotateCcw className="h-4 w-4" />
            <span>{ui("عكس القيد اليدوي")}</span>
          </div>
          <label className="text-xs font-bold">
            {ui("تاريخ العكس")}
            <input
              type="date"
              required
              className={`${INPUT} mt-1.5 font-mono text-xs`}
              value={reverseDate}
              onChange={(e) => setReverseDate(e.target.value)}
            />
          </label>
          <label className="flex-1 min-w-[260px] text-xs font-bold">
            {ui("سبب عكس القيد")}
            <input
              required
              minLength={3}
              maxLength={300}
              className={`${INPUT} mt-1.5`}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
          </label>
          <button
            disabled={saving}
            className="gold-gradient-btn rounded-xl px-5 py-3 text-xs sm:text-sm font-bold cursor-pointer"
          >
            {ui("تأكيد العكس")}
          </button>
          <button
            type="button"
            className="theme-card rounded-xl border theme-border px-4 py-3 text-xs sm:text-sm cursor-pointer"
            onClick={() => setReverseId(null)}
          >
            {ui("إلغاء")}
          </button>
        </form>
      )}

      {/* Journals List (Posted Vouchers) */}
      <div className="space-y-3">
        {journals.data?.items.map((j) => {
          const totalDebit = j.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
          const totalCredit = j.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

          return (
            <details
              key={j.id}
              className="theme-card group rounded-2xl border theme-border overflow-hidden transition-all duration-200 open:shadow-sm"
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Hash className="h-3.5 w-3.5" />
                    JE-{String(j.number).padStart(6, "0")}
                  </span>

                  {/* Source Type Badges */}
                  {j.sourceType === "MANUAL" && (
                    <span className="rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 px-2 py-0.5 text-2xs font-bold text-sky-700 dark:text-sky-300">
                      قيد يدوي
                    </span>
                  )}
                  {j.sourceType === "TRIP_COMMISSION" && (
                    <span className="rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50 px-2 py-0.5 text-2xs font-bold text-violet-700 dark:text-violet-300">
                      عمولة رحلة
                    </span>
                  )}
                  {j.sourceType === "SALARY" && (
                    <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 text-2xs font-bold text-emerald-700 dark:text-emerald-300">
                      مسير رواتب
                    </span>
                  )}
                  {j.sourceType === "PURCHASE" && (
                    <span className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 text-2xs font-bold text-rose-700 dark:text-rose-300">
                      فاتورة مشتريات
                    </span>
                  )}

                  {/* Reversal Indicators */}
                  {j.reversal && (
                    <span className="rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2 py-0.5 text-2xs font-bold text-rose-700 dark:text-rose-300">
                      {ui("· تم عكسه")}
                    </span>
                  )}
                  {j.reversesId && (
                    <span className="rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 text-2xs font-bold text-amber-700 dark:text-amber-300">
                      {ui("· قيد عكسي")}
                    </span>
                  )}

                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {j.description}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                    <Calendar className="h-3 w-3" />
                    {ui(j.entryDate.slice(0, 10))}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <span className="text-2xs text-slate-400 block font-sans">
                      {ui("إجمالي القيد")}
                    </span>
                    <bdi className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm" dir="ltr">
                      {amountLabel(String(totalDebit))} SAR
                    </bdi>
                  </div>
                </div>
              </summary>

              {/* Expanded Lines Table */}
              <div className="border-t theme-border bg-slate-50/30 dark:bg-slate-900/20 p-4">
                <div className="overflow-x-auto rounded-xl border theme-border bg-white dark:bg-slate-900/60">
                  <table className="w-full min-w-[540px] text-start text-xs">
                    <thead className="border-b theme-border bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-start">{ui("الحساب")}</th>
                        <th className="py-2.5 px-3 text-end text-rose-600 dark:text-rose-400 w-36">
                          {ui("مدين")} (Debit)
                        </th>
                        <th className="py-2.5 px-3 text-end text-emerald-600 dark:text-emerald-400 w-36">
                          {ui("دائن")} (Credit)
                        </th>
                        <th className="py-2.5 px-3 text-start">{ui("بيان السطر")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y theme-border">
                      {j.lines.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-2xs me-2">
                              {ui(l.accountCode)}
                            </span>
                            <span className="font-medium">
                              {ui.language === "en" && l.account.nameEn ? l.account.nameEn : ui(l.account.nameAr)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono tabular-nums text-rose-600 dark:text-rose-400 font-medium" dir="ltr">
                            {Number(l.debit) > 0 ? `${amountLabel(l.debit)} SAR` : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium" dir="ltr">
                            {Number(l.credit) > 0 ? `${amountLabel(l.credit)} SAR` : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {l.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Double Underline Verification Total */}
                    <tfoot className="border-t-2 border-b-4 border-double border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
                      <tr>
                        <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {ui("المجموع")}
                        </td>
                        <td className="py-2 px-3 text-end font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400" dir="ltr">
                          {amountLabel(String(totalDebit))} SAR
                        </td>
                        <td className="py-2 px-3 text-end font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                          {amountLabel(String(totalCredit))} SAR
                        </td>
                        <td className="py-2 px-3 text-start">
                          <span className="inline-flex items-center gap-1 text-2xs text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="h-3 w-3" />
                            {ui("متزن")}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {j.sourceType === "MANUAL" && !j.reversal && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors shadow-2xs"
                      onClick={() => {
                        setReverseId(j.id);
                        setReverseReason("");
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {ui("عكس القيد اليدوي")}
                    </button>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      {journals.isLoading && (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Scale className="h-5 w-5 animate-spin text-amber-500" />
          <span>{ui("جارٍ تحميل القيود…")}</span>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium pt-2">
        <button
          type="button"
          className="theme-card rounded-xl border theme-border px-4 py-2 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          disabled={page === 1}
          onClick={() => setPage((v) => v - 1)}
        >
          {ui("السابق")}
        </button>
        <p className="font-mono text-slate-500">
          <bdi>{ui(journals.data?.total || 0)}</bdi> {ui("قيد · صفحة")} <bdi>{ui(page)}</bdi>
        </p>
        <button
          type="button"
          className="theme-card rounded-xl border theme-border px-4 py-2 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          disabled={!journals.data || page * 30 >= journals.data.total}
          onClick={() => setPage((v) => v + 1)}
        >
          {ui("التالي")}
        </button>
      </div>
    </section>
  );
}
