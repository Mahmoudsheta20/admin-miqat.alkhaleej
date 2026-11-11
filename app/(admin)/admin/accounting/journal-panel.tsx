"use client";

import { useUiText } from "@/lib/ui-text";
import { useRef, useState, type FormEvent } from "react";
import { Scale, CheckCircle2, AlertCircle, Plus, Trash2, RotateCcw, Calendar, FileText, Hash } from "lucide-react";
import { accountingRequest, amountLabel, currentSaudiPeriod, type Account, type Journal } from "@/lib/accounting";
import { formatSignedMinor, signedMoneyMinor } from "@/lib/dashboard-analytics";
import { moneyDecimal, moneyMinor } from "@/lib/money";
import { ensureCapitalAndBankAccounts } from "@/lib/seed-test-data";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { Badge, Card } from "@/app/_components/ui";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";

interface Line {
  key: string;
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
  vehiclePlate: string;
}

const INPUT = "theme-input min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem] w-full";
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
      debit: s.debit + signedMoneyMinor(l.debit),
      credit: s.credit + signedMoneyMinor(l.credit),
    }),
    { debit: BigInt(0), credit: BigInt(0) }
  );

  const hasInvalidAmount = lines.some(
    (l) => moneyMinor(l.debit || "0") === null || moneyMinor(l.credit || "0") === null
  );
  const isBalanced = !hasInvalidAmount && totals.debit === totals.credit && totals.debit > BigInt(0);
  const diffMinor = totals.debit >= totals.credit ? totals.debit - totals.credit : totals.credit - totals.debit;
  const differenceText = moneyDecimal(diffMinor);

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
    if (hasInvalidAmount || !isBalanced) {
      setError(
        ui.language === "en"
          ? "Check debit/credit decimal amounts and ensure the journal balances."
          : "تأكد من صحة المبالغ المدخلة وتوازن المدين والدائن قبل الاعتماد."
      );
      return;
    }
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)]">
              <Scale className="h-5 w-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-main)]">{ui("دفتر اليومية")}</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {ui("القيود المعتمدة محفوظة. التصحيح بقيد عكسي؛ وتصحيح المستند من شاشته الأصلية.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-amber-600/35 bg-[var(--accent-surface)] hover:border-amber-600 px-3 py-1.5 text-xs font-bold text-[var(--accent-gold)] disabled:opacity-50 cursor-pointer transition-colors"
            onClick={() => void fillCapitalPreset()}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {ui("تعبئة قيد رأس مال (300,000 ر.س)")}
          </button>
          <button
            type="button"
            className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold cursor-pointer transition-transform active:scale-[0.98]"
            onClick={() => setShowForm((v) => !v)}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {ui("قيد يدوي")}
          </button>
        </div>
      </div>

      {(error || journals.error || accounts.error) && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-600/35 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-800 dark:text-rose-200"
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
              <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--accent-gold)]" />
              <h3 className="text-sm font-bold text-[var(--text-main)]">{ui("سند قيد اليومية")}</h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {ui("سند قيد مزدوج متوازن")}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <label className="text-xs sm:text-[0.8125rem] font-bold">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Calendar className="h-3.5 w-3.5" />
                {ui("تاريخ القيد")}
              </span>
              <input
                required
                type="date"
                className={`${INPUT} mt-1.5 font-mono`}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  key.current = "";
                }}
              />
            </label>
            <label className="text-xs sm:text-[0.8125rem] font-bold">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
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

          {/* Responsive Double-Entry Grid (stacked cards on mobile, table grid on md+) */}
          <div className="rounded-xl border theme-border overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[minmax(200px,1.5fr)_8.5rem_8.5rem_minmax(180px,1.2fr)_3rem] gap-2.5 bg-[var(--table-header-bg)] border-b theme-border px-3 py-3 text-xs">
              <span className="font-bold text-[var(--text-main)] text-start">
                {ui("الحساب")}
              </span>
              <span className="font-bold text-rose-700 dark:text-rose-300 text-end">
                {ui("مدين")} (Debit)
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-end">
                {ui("دائن")} (Credit)
              </span>
              <span className="font-bold text-[var(--text-main)] text-start">
                {ui("البيان / لوحة المركبة")}
              </span>
              <span className="sr-only">{ui("حذف سطر")}</span>
            </div>

            <div className="divide-y theme-border">
              {lines.map((l, lineIdx) => (
                <div
                  key={l.key}
                  className="p-3.5 md:p-2.5 space-y-3 md:space-y-0 md:grid md:grid-cols-[minmax(200px,1.5fr)_8.5rem_8.5rem_minmax(180px,1.2fr)_3rem] md:gap-2.5 md:items-start hover:bg-[var(--table-row-hover)] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between md:hidden mb-1">
                      <span className="text-xs font-bold text-[var(--text-main)]">
                        {ui("الحساب")} #{lineIdx + 1}
                      </span>
                    </div>
                    <select
                      aria-label={`${ui("الحساب")} ${lineIdx + 1}`}
                      required
                      className={INPUT}
                      value={l.accountCode}
                      onChange={(e) => update(l.key, { accountCode: e.target.value })}
                    >
                      <option value="">{ui("اختر الحساب")}</option>
                      {accounts.data?.items
                        .filter((a) => a.isPosting && a.isActive)
                        .map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} · {ui.language === "en" && a.nameEn ? a.nameEn : ui(a.nameAr)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 md:contents">
                    <div>
                      <span className="block text-xs font-bold text-rose-700 dark:text-rose-300 mb-1 md:hidden">
                        {ui("مدين")} (Debit)
                      </span>
                      <input
                        aria-label={`${ui("مدين")} ${lineIdx + 1}`}
                        required
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        className={`${INPUT} text-end font-mono tabular-nums text-rose-700 dark:text-rose-300 font-semibold focus:border-rose-500`}
                        value={l.debit}
                        onChange={(e) => update(l.key, { debit: e.target.value })}
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1 md:hidden">
                        {ui("دائن")} (Credit)
                      </span>
                      <input
                        aria-label={`${ui("دائن")} ${lineIdx + 1}`}
                        required
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        className={`${INPUT} text-end font-mono tabular-nums text-emerald-800 dark:text-emerald-300 font-semibold focus:border-[var(--accent-gold)]`}
                        value={l.credit}
                        onChange={(e) => update(l.key, { credit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:space-y-1.5">
                    <input
                      aria-label={ui("بيان السطر")}
                      maxLength={300}
                      className={INPUT}
                      placeholder={ui("بيان السطر")}
                      value={l.description}
                      onChange={(e) => update(l.key, { description: e.target.value })}
                    />
                    <input
                      aria-label={ui("لوحة المركبة في القيد")}
                      maxLength={50}
                      className={`${INPUT} font-mono`}
                      placeholder={ui("لوحة المركبة (اختياري)")}
                      value={l.vehiclePlate}
                      onChange={(e) => update(l.key, { vehiclePlate: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end md:justify-center">
                    <button
                      type="button"
                      aria-label={ui("حذف سطر")}
                      disabled={lines.length <= 2}
                      className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center gap-1.5 px-3 md:px-1.5 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 rounded-lg disabled:opacity-20 cursor-pointer transition-colors"
                      onClick={() => {
                        setLines((v) => v.filter((x) => x.key !== l.key));
                        key.current = "";
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="text-xs font-bold md:hidden">{ui("حذف السطر")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Accounting Totals Footer */}
            <div className="border-t-2 border-b-4 border-double border-[var(--control-border)] bg-[var(--table-header-bg)] px-3.5 py-3 text-xs md:grid md:grid-cols-[minmax(200px,1.5fr)_8.5rem_8.5rem_1fr] md:gap-2.5 md:items-center space-y-2 md:space-y-0">
              <div className="font-bold text-[var(--text-main)]">
                {ui("إجمالي القيد")}
              </div>
              <div className="flex items-center justify-between md:block md:text-end font-mono tabular-nums font-bold text-rose-700 dark:text-rose-300">
                <span className="md:hidden font-sans text-[var(--text-muted)]">{ui("مدين")}:</span>
                <bdi dir="ltr">{amountLabel(moneyDecimal(totals.debit))} SAR</bdi>
              </div>
              <div className="flex items-center justify-between md:block md:text-end font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                <span className="md:hidden font-sans text-[var(--text-muted)]">{ui("دائن")}:</span>
                <bdi dir="ltr">{amountLabel(moneyDecimal(totals.credit))} SAR</bdi>
              </div>
              <div className="text-start">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    isBalanced
                      ? "bg-emerald-500/12 text-emerald-800 border border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35"
                      : "bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-600/30"
                  }`}
                >
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {ui("متزن")}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {ui("غير متزن")} ({ui("الفرق:")}{" "}
                        <bdi dir="ltr">{differenceText} SAR</bdi>)
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row & Live Balance Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <button
              type="button"
              className="inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3.5 py-1.5 text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] cursor-pointer transition-colors"
              onClick={() => setLines((v) => [...v, empty(crypto.randomUUID())])}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {ui("إضافة سطر")}
            </button>

            {/* Semantic Balance Indicator Banner */}
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-2 text-xs font-medium transition-all ${
                isBalanced
                  ? "border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300"
                  : "border-rose-600/35 bg-rose-500/10 text-rose-800 dark:text-rose-200"
              }`}
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold">{ui("قيد متزن")}</span>
                    <bdi className="ms-2 font-mono tabular-nums" dir="ltr">
                      {amountLabel(moneyDecimal(totals.debit))} SAR
                    </bdi>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-rose-700 dark:text-rose-300 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold">{ui("قيد غير متزن")}</span>
                    <span className="ms-2">
                      {ui("الفرق:")}{" "}
                      <bdi className="font-mono tabular-nums font-bold" dir="ltr">
                        {differenceText} SAR
                      </bdi>
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !isBalanced}
              className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-bold disabled:opacity-40 cursor-pointer transition-transform active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {ui("اعتماد القيد المتوازن")}
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {ui("تسويات الحسابات الضريبية اليدوية تظهر في دفتر الأستاذ؛ تقرير VAT يُحسب من الفواتير والمصروفات، لذلك يلزم مطابقة أي تسوية يدوية قبل الإقفال.")}
          </p>
        </form>
      )}

      {/* Reverse Journal Modal Form */}
      {reverseId && (
        <form
          onSubmit={reverse}
          className="theme-card flex flex-wrap items-end gap-3 rounded-2xl border border-rose-600/35 bg-rose-500/5 p-5"
        >
          <div className="w-full flex items-center gap-2 pb-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
            <RotateCcw className="h-4 w-4" />
            <span>{ui("عكس القيد اليدوي")}</span>
          </div>
          <label className="text-xs sm:text-[0.8125rem] font-bold text-[var(--text-main)]">
            {ui("تاريخ العكس")}
            <input
              type="date"
              required
              className={`${INPUT} mt-1.5 font-mono`}
              value={reverseDate}
              onChange={(e) => setReverseDate(e.target.value)}
            />
          </label>
          <label className="flex-1 min-w-[260px] text-xs sm:text-[0.8125rem] font-bold text-[var(--text-main)]">
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
            type="submit"
            disabled={saving}
            className="gold-gradient-btn min-h-11 sm:min-h-9 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-bold cursor-pointer"
          >
            {ui("تأكيد العكس")}
          </button>
          <button
            type="button"
            className="min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs sm:text-sm font-bold text-[var(--text-main)] cursor-pointer transition-colors"
            onClick={() => setReverseId(null)}
          >
            {ui("إلغاء")}
          </button>
        </form>
      )}

      {/* Journals List (Posted Vouchers) */}
      <div className="space-y-3">
        {journals.data?.items.map((j) => {
          const totalDebitMinor = j.lines.reduce((s, l) => s + signedMoneyMinor(l.debit), BigInt(0));
          const totalCreditMinor = j.lines.reduce((s, l) => s + signedMoneyMinor(l.credit), BigInt(0));
          const totalDebitText = amountLabel(formatSignedMinor(totalDebitMinor));
          const totalCreditText = amountLabel(formatSignedMinor(totalCreditMinor));

          return (
            <details
              key={j.id}
              className="theme-card group rounded-2xl border theme-border overflow-hidden transition-all duration-200 open:shadow-sm"
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 hover:bg-[var(--table-row-hover)] transition-colors text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-surface)] border border-amber-600/30 px-2.5 py-1 font-mono text-xs font-bold text-[var(--accent-gold)]">
                    <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                    JE-{String(j.number).padStart(6, "0")}
                  </span>

                  {/* Source Type Badges */}
                  {j.sourceType === "MANUAL" && (
                    <span className="rounded-md bg-sky-500/10 border border-sky-600/30 px-2 py-0.5 text-2xs font-bold text-sky-800 dark:text-sky-300">
                      {ui.language === "en" ? "Manual entry" : "قيد يدوي"}
                    </span>
                  )}
                  {j.sourceType === "TRIP_COMMISSION" && (
                    <span className="rounded-md bg-indigo-500/10 border border-indigo-600/30 px-2 py-0.5 text-2xs font-bold text-indigo-800 dark:text-indigo-300">
                      {ui.language === "en" ? "Trip commission" : "عمولة رحلة"}
                    </span>
                  )}
                  {j.sourceType === "SALARY" && (
                    <span className="rounded-md bg-emerald-500/12 border border-emerald-600/35 px-2 py-0.5 text-2xs font-bold text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300">
                      {ui.language === "en" ? "Payroll" : "مسير رواتب"}
                    </span>
                  )}
                  {j.sourceType === "PURCHASE" && (
                    <span className="rounded-md bg-rose-500/10 border border-rose-600/30 px-2 py-0.5 text-2xs font-bold text-rose-800 dark:text-rose-300">
                      {ui.language === "en" ? "Purchase invoice" : "فاتورة مشتريات"}
                    </span>
                  )}

                  {/* Reversal Indicators */}
                  {j.reversal && (
                    <span className="rounded-md bg-rose-500/15 border border-rose-600/35 px-2 py-0.5 text-2xs font-bold text-rose-800 dark:text-rose-200">
                      {ui("· تم عكسه")}
                    </span>
                  )}
                  {j.reversesId && (
                    <span className="rounded-md bg-[var(--accent-surface)] border border-amber-600/35 px-2 py-0.5 text-2xs font-bold text-[var(--accent-gold)]">
                      {ui("· قيد عكسي")}
                    </span>
                  )}

                  <span className="font-medium text-[var(--text-main)]">
                    {j.description}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-mono">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <bdi dir="ltr">{j.entryDate.slice(0, 10)}</bdi>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <span className="text-2xs text-[var(--text-muted)] block font-sans">
                      {ui("إجمالي القيد")}
                    </span>
                    <bdi className="font-mono font-bold text-[var(--accent-gold)] tabular-nums text-sm" dir="ltr">
                      {totalDebitText} SAR
                    </bdi>
                  </div>
                </div>
              </summary>

              {/* Expanded Lines Table & Mobile Cards */}
              <div className="border-t theme-border bg-[var(--bg-card-subtle)]/55 p-4 space-y-3">
                <div className="md:hidden space-y-2.5">
                  {j.lines.map((l) => (
                    <MobileRecordCard
                      key={l.id}
                      title={
                        <span className="font-mono font-bold text-[var(--accent-gold)]">
                          <bdi>{l.accountCode}</bdi>
                        </span>
                      }
                      subtitle={
                        <span>
                          {ui.language === "en" && l.account.nameEn
                            ? l.account.nameEn
                            : ui(l.account.nameAr)}
                          {l.description ? ` · ${l.description}` : ""}
                        </span>
                      }
                    >
                      <MobileCardMetaGrid>
                        <MobileCardField
                          label={ui("مدين (Debit)")}
                          mono
                          value={
                            <span className="text-rose-700 dark:text-rose-300" dir="ltr">
                              {signedMoneyMinor(l.debit) > BigInt(0) ? `${amountLabel(l.debit)} SAR` : "—"}
                            </span>
                          }
                        />
                        <MobileCardField
                          label={ui("دائن (Credit)")}
                          mono
                          value={
                            <span className="text-emerald-700 dark:text-emerald-300" dir="ltr">
                              {signedMoneyMinor(l.credit) > BigInt(0) ? `${amountLabel(l.credit)} SAR` : "—"}
                            </span>
                          }
                        />
                      </MobileCardMetaGrid>
                    </MobileRecordCard>
                  ))}

                  <Card className="theme-card-subtle border theme-border shadow-none p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-main)]">{ui("المجموع")}</span>
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        <span>{ui("متزن")}</span>
                      </Badge>
                    </div>
                    <MobileCardMetaGrid className="bg-[var(--bg-card)]">
                      <MobileCardField
                        label={ui("إجمالي مدين")}
                        mono
                        value={
                          <span className="text-rose-700 dark:text-rose-300" dir="ltr">
                            {totalDebitText} SAR
                          </span>
                        }
                      />
                      <MobileCardField
                        label={ui("إجمالي دائن")}
                        mono
                        value={
                          <span className="text-emerald-700 dark:text-emerald-300" dir="ltr">
                            {totalCreditText} SAR
                          </span>
                        }
                      />
                    </MobileCardMetaGrid>
                  </Card>
                </div>

                <div className="hidden md:block overflow-x-auto rounded-xl border theme-border bg-[var(--bg-card)]">
                  <table className="w-full min-w-[540px] text-start text-xs">
                    <thead className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)] font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-start">{ui("الحساب")}</th>
                        <th className="py-2.5 px-3 text-end text-rose-700 dark:text-rose-300 w-36">
                          {ui("مدين")} (Debit)
                        </th>
                        <th className="py-2.5 px-3 text-end text-emerald-700 dark:text-emerald-300 w-36">
                          {ui("دائن")} (Credit)
                        </th>
                        <th className="py-2.5 px-3 text-start">{ui("بيان السطر")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y theme-border">
                      {j.lines.map((l) => (
                        <tr key={l.id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-[var(--accent-gold)] bg-[var(--accent-surface)] border border-amber-600/30 px-1.5 py-0.5 rounded text-2xs me-2">
                              {l.accountCode}
                            </span>
                            <span className="font-medium text-[var(--text-main)]">
                              {ui.language === "en" && l.account.nameEn ? l.account.nameEn : ui(l.account.nameAr)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono tabular-nums text-rose-700 dark:text-rose-300 font-medium" dir="ltr">
                            {signedMoneyMinor(l.debit) > BigInt(0) ? `${amountLabel(l.debit)} SAR` : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono tabular-nums text-emerald-700 dark:text-emerald-300 font-medium" dir="ltr">
                            {signedMoneyMinor(l.credit) > BigInt(0) ? `${amountLabel(l.credit)} SAR` : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-muted)]">
                            {l.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Double Underline Verification Total */}
                    <tfoot className="border-t-2 border-b-4 border-double border-[var(--control-border)] bg-[var(--table-header-bg)]">
                      <tr>
                        <td className="py-2 px-3 font-bold text-[var(--text-main)]">
                          {ui("المجموع")}
                        </td>
                        <td className="py-2 px-3 text-end font-mono tabular-nums font-bold text-rose-700 dark:text-rose-300" dir="ltr">
                          {totalDebitText} SAR
                        </td>
                        <td className="py-2 px-3 text-end font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300" dir="ltr">
                          {totalCreditText} SAR
                        </td>
                        <td className="py-2 px-3 text-start">
                          <span className="inline-flex items-center gap-1 text-2xs text-emerald-800 dark:text-emerald-300 font-bold">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
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
                      className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-rose-600/35 bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors shadow-2xs"
                      onClick={() => {
                        setReverseId(j.id);
                        setReverseReason("");
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
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
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
          <Scale className="h-5 w-5 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />
          <span>{ui("جارٍ تحميل القيود…")}</span>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium pt-2">
        <button
          type="button"
          className="min-h-11 sm:min-h-9 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-2 text-[var(--text-main)] disabled:opacity-40 cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
          disabled={page === 1}
          onClick={() => setPage((v) => v - 1)}
        >
          {ui("السابق")}
        </button>
        <p className="font-mono text-[var(--text-muted)]">
          <bdi>{journals.data?.total || 0}</bdi> {ui("قيد · صفحة")} <bdi>{page}</bdi>
        </p>
        <button
          type="button"
          className="min-h-11 sm:min-h-9 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-4 py-2 text-[var(--text-main)] disabled:opacity-40 cursor-pointer hover:border-[var(--accent-gold)] transition-colors"
          disabled={!journals.data || page * 30 >= journals.data.total}
          onClick={() => setPage((v) => v + 1)}
        >
          {ui("التالي")}
        </button>
      </div>
    </section>
  );
}
