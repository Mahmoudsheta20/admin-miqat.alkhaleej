"use client";

import { useRef, useState, type FormEvent } from "react";
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
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">دفتر اليومية</h2>
          <p className="mt-1 text-xs text-slate-500">
            القيود المعتمدة محفوظة. التصحيح بقيد عكسي؛ وتصحيح المستند من شاشته الأصلية.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            className="theme-card rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-3 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 disabled:opacity-50 cursor-pointer"
            onClick={() => void fillCapitalPreset()}
          >
            تعبئة قيد رأس مال (300,000 ر.س)
          </button>
          <button
            type="button"
            className="gold-gradient-btn rounded-xl px-4 py-3 text-sm font-bold cursor-pointer"
            onClick={() => setShowForm((v) => !v)}
          >
            قيد يدوي
          </button>
        </div>
      </div>

      {(error || journals.error || accounts.error) && (
        <p role="alert" className="text-sm text-rose-600">
          {error || journals.error || accounts.error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={save}
          className="theme-card space-y-5 rounded-2xl border theme-border p-5"
        >
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <label className="text-xs font-bold">
              تاريخ القيد
              <input
                required
                type="date"
                className={`${INPUT} mt-2`}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  key.current = "";
                }}
              />
            </label>
            <label className="text-xs font-bold">
              البيان
              <input
                required
                maxLength={300}
                className={`${INPUT} mt-2`}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  key.current = "";
                }}
                placeholder="رصيد افتتاحي أو تسوية محاسبية"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-right text-xs">
              <thead>
                <tr>
                  {["الحساب", "مدين", "دائن", "البيان / لوحة المركبة", ""].map((v, i) => (
                    <th key={i} className="pb-3">
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key}>
                    <td className="min-w-64 pe-2 pb-2">
                      <select
                        required
                        className={INPUT}
                        value={l.accountCode}
                        onChange={(e) => update(l.key, { accountCode: e.target.value })}
                      >
                        <option value="">اختر الحساب</option>
                        {accounts.data?.items
                          .filter((a) => a.isPosting && a.isActive)
                          .map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code} · {a.nameAr}
                            </option>
                          ))}
                      </select>
                    </td>
                    {(["debit", "credit"] as const).map((side) => (
                      <td className="w-32 pe-2 pb-2" key={side}>
                        <input
                          aria-label={side === "debit" ? "مدين" : "دائن"}
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          dir="ltr"
                          className={INPUT}
                          value={l[side]}
                          onChange={(e) => update(l.key, { [side]: e.target.value })}
                        />
                      </td>
                    ))}
                    <td className="pe-2 pb-2">
                      <input
                        aria-label="بيان السطر"
                        maxLength={300}
                        className={INPUT}
                        placeholder="بيان السطر"
                        value={l.description}
                        onChange={(e) => update(l.key, { description: e.target.value })}
                      />
                      <input
                        aria-label="لوحة المركبة في القيد"
                        maxLength={50}
                        className={`${INPUT} mt-1`}
                        placeholder="لوحة المركبة (اختياري)"
                        value={l.vehiclePlate}
                        onChange={(e) => update(l.key, { vehiclePlate: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-label="حذف سطر"
                        disabled={lines.length <= 2}
                        className="px-2 text-rose-600 disabled:opacity-30 cursor-pointer"
                        onClick={() => {
                          setLines((v) => v.filter((x) => x.key !== l.key));
                          key.current = "";
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="theme-card rounded-lg border theme-border px-4 py-2 text-sm cursor-pointer"
              onClick={() => setLines((v) => [...v, empty(crypto.randomUUID())])}
            >
              إضافة سطر
            </button>
            <p
              className={`text-sm ${
                totals.debit === totals.credit && totals.debit > 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              المدين {amountLabel(String(totals.debit / 100))} · الدائن{" "}
              {amountLabel(String(totals.credit / 100))}
            </p>
            <button
              disabled={saving || totals.debit !== totals.credit || totals.debit === 0}
              className="gold-gradient-btn rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-40 cursor-pointer"
            >
              اعتماد القيد المتوازن
            </button>
          </div>
          <p className="text-xs text-slate-500">
            تسويات الحسابات الضريبية اليدوية تظهر في دفتر الأستاذ؛ تقرير VAT يُحسب من الفواتير
            والمصروفات، لذلك يلزم مطابقة أي تسوية يدوية قبل الإقفال.
          </p>
        </form>
      )}

      {reverseId && (
        <form
          onSubmit={reverse}
          className="theme-card flex flex-wrap items-end gap-3 rounded-xl border theme-border p-5"
        >
          <label className="text-xs font-bold">
            تاريخ العكس
            <input
              type="date"
              required
              className={`${INPUT} mt-2`}
              value={reverseDate}
              onChange={(e) => setReverseDate(e.target.value)}
            />
          </label>
          <label className="flex-1 text-xs font-bold">
            سبب عكس القيد
            <input
              required
              minLength={3}
              maxLength={300}
              className={`${INPUT} mt-2`}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
          </label>
          <button
            disabled={saving}
            className="gold-gradient-btn rounded-xl px-4 py-3 text-sm cursor-pointer"
          >
            تأكيد العكس
          </button>
          <button
            type="button"
            className="theme-card rounded-xl border theme-border px-4 py-3 text-sm cursor-pointer"
            onClick={() => setReverseId(null)}
          >
            إلغاء
          </button>
        </form>
      )}

      <div className="space-y-3">
        {journals.data?.items.map((j) => (
          <details key={j.id} className="theme-card rounded-xl border theme-border p-4">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <bdi className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  JE-{String(j.number).padStart(6, "0")}
                </bdi>
                <span className="ms-3">{j.description}</span>
                <span className="ms-3 text-xs text-slate-500">
                  {j.entryDate.slice(0, 10)}
                  {j.reversal ? " · تم عكسه" : ""}
                  {j.reversesId ? " · قيد عكسي" : ""}
                </span>
              </div>
              <bdi className="font-mono font-bold">
                {amountLabel(String(j.lines.reduce((s, l) => s + Number(l.debit), 0)))} SAR
              </bdi>
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[500px] text-right text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-2">الحساب</th>
                    <th>مدين</th>
                    <th>دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {j.lines.map((l) => (
                    <tr key={l.id} className="border-t theme-border">
                      <td className="py-3">
                        <bdi className="font-mono">{l.accountCode}</bdi> · {l.account.nameAr}
                      </td>
                      <td className="font-mono">{amountLabel(l.debit)}</td>
                      <td className="font-mono">{amountLabel(l.credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {j.sourceType === "MANUAL" && !j.reversal && (
              <button
                type="button"
                className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs text-rose-600 cursor-pointer"
                onClick={() => {
                  setReverseId(j.id);
                  setReverseReason("");
                }}
              >
                عكس القيد اليدوي
              </button>
            )}
          </details>
        ))}
      </div>

      {journals.isLoading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          جارٍ تحميل القيود…
        </p>
      )}

      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="theme-card rounded-lg border theme-border px-4 py-2 disabled:opacity-40 cursor-pointer"
          disabled={page === 1}
          onClick={() => setPage((v) => v - 1)}
        >
          السابق
        </button>
        <p>
          {journals.data?.total || 0} قيد · صفحة {page}
        </p>
        <button
          type="button"
          className="theme-card rounded-lg border theme-border px-4 py-2 disabled:opacity-40 cursor-pointer"
          disabled={!journals.data || page * 30 >= journals.data.total}
          onClick={() => setPage((v) => v + 1)}
        >
          التالي
        </button>
      </div>
    </section>
  );
}
