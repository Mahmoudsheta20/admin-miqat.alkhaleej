"use client";
import { useUiText } from "@/lib/ui-text";


import { useEffect, useRef, useState, type FormEvent } from "react";
import { CreditCard, ArrowDownLeft, ArrowUpRight, CheckCircle2, Calendar, Loader2, AlertCircle } from "lucide-react";
import { accountingRequest, amountLabel, currentSaudiPeriod } from "@/lib/accounting";
import { moneyDecimal, moneyMinor } from "@/lib/money";
import { backendRequest } from "@/lib/backend";
import { useAccountingQuery } from "@/lib/use-accounting-query";
import { Badge } from "@/app/_components/ui";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";

interface Option {
  id: string;
  label: string;
}

interface Payment {
  id: string;
  reference: string;
  amount: string;
  paymentDate: string;
  direction: string;
  journal: { number: number };
}

const INPUT = "theme-input mt-1.5 h-11 w-full rounded-xl px-3 text-xs sm:text-sm";

export default function PaymentPanel({
  reload,
  onChanged,
}: {
  reload: number;
  onChanged: () => void;
}) {
  const ui = useUiText();

  const [type, setType] = useState<"SALE" | "PURCHASE">("SALE");
  const [options, setOptions] = useState<Option[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [documentId, setDocumentId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(currentSaudiPeriod().day);
  const [cashAccount, setCashAccount] = useState("1102"); // Default SNB Bank (1102)
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const key = useRef("");
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  const payments = useAccountingQuery<{ items: Payment[] }>("/payments", reload);
  const balance = useAccountingQuery<{ balance: string; direction: string }>(
    `/document-balance/${type}/${documentId || "00000000-0000-0000-0000-000000000000"}`,
    reload
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      if (type === "SALE") {
        const r = await backendRequest<{
          items: { id: string; number: number; customerName: string }[];
          total: number;
        }>(`/invoices?page=${page}`);
        if (active) {
          setOptions(
            r.data?.items.map((v) => ({ id: v.id, label: `${v.number} · ${v.customerName}` })) ||
              []
          );
          setHasMore(page * 30 < (r.data?.total || 0));
          if (r.error) setError(r.error);
        }
      } else {
        const r = await accountingRequest<{
          items: { id: string; invoiceNumber: string; supplierName: string }[];
          total: number;
        }>(`/purchases?page=${page}&includeVoided=false`);
        if (active) {
          setOptions(
            r.data?.items.map((v) => ({
              id: v.id,
              label: `${v.invoiceNumber} · ${v.supplierName}`,
            })) || []
          );
          setHasMore(page * 30 < (r.data?.total || 0));
          if (r.error) setError(r.error);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [type, page, reload]);

  const remainingBalanceRaw = balance.data ? balance.data.balance.trim().replace(/^-/, "") : "";
  const remainingBalanceMinor = moneyMinor(remainingBalanceRaw) ?? BigInt(0);
  const remainingBalanceText = remainingBalanceMinor > BigInt(0) ? moneyDecimal(remainingBalanceMinor) : "";

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!balance.data) return;
    const paidMinor = moneyMinor(amount);
    if (paidMinor === null || paidMinor <= BigInt(0)) {
      setError(
        ui.language === "en"
          ? "Enter a valid payment amount greater than 0.00."
          : "يرجى إدخال مبلغ سداد صحيح أكبر من 0.00."
      );
      return;
    }
    if (remainingBalanceMinor > BigInt(0) && paidMinor > remainingBalanceMinor) {
      setError(
        ui.language === "en"
          ? `Amount exceeds remaining balance (${remainingBalanceText} SAR).`
          : `المبلغ المدخل يتجاوز الرصيد المتبقي (${remainingBalanceText} ر.س).`
      );
      return;
    }
    setSaving(true);
    setError("");
    setSuccessMessage("");
    key.current ||= crypto.randomUUID();
    const result = await accountingRequest("/payments", "POST", {
      operationKey: key.current,
      documentType: type,
      documentId,
      amount: moneyDecimal(paidMinor),
      paymentDate: date,
      cashAccount,
      reference: reference.trim() || (type === "SALE" ? "تحصيل دفعة عميل" : "سداد دفعة مورد"),
    });
    setSaving(false);
    if (result.success) {
      key.current = "";
      setAmount("");
      setReference("");
      setSuccessMessage("تم حفظ السند المحاسبي وتحديث الرصيد بنجاح!");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(""), 3000);
      onChanged();
    } else {
      setError(result.error || "تعذر حفظ السند؛ حاول مرة أخرى.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-main)]">
            {ui("القبض والدفع (سندات التحصيل والصرف)")}</h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
            {ui("تسوية الذمم، تحصيل مستحقات العملاء، وسداد فواتير الموردين عبر البنك أو الصندوق.")}</p>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-2xl border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" />
          <span>{ui(successMessage)}</span>
        </div>
      )}

      {/* Payment Entry Form */}
      <form
        onSubmit={save}
        onChange={() => {
          key.current = "";
        }}
        className="theme-card rounded-2xl sm:rounded-3xl border theme-border p-5 sm:p-6 shadow-xs space-y-5"
      >
        {/* Direction Switcher (Receipt vs Disbursement) */}
        <div>
          <label className="text-xs font-bold text-[var(--text-main)] block mb-2">
            {ui("نوع العملية *")}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => {
                setType("SALE");
                setDocumentId("");
                setAmount("");
                setPage(1);
              }}
              className={`min-h-11 p-3 rounded-2xl border text-start transition cursor-pointer flex items-center gap-2.5 ${
                type === "SALE"
                  ? "bg-emerald-500/12 border-emerald-600 ring-1 ring-emerald-600/30 dark:bg-emerald-950/45 dark:border-emerald-500 dark:ring-emerald-500/30"
                  : "theme-card border-[var(--control-border)] hover:border-[var(--accent-gold)]"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
              <div>
                <strong className="text-xs font-semibold block text-[var(--text-main)]">
                  {ui("تحصيل من عميل (سند قبض)")}</strong>
                <span className="text-xs text-[var(--text-muted)]">{ui("إيداع بالبنك وتخفيض ذمة العميل")}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setType("PURCHASE");
                setDocumentId("");
                setAmount("");
                setPage(1);
              }}
              className={`min-h-11 p-3 rounded-2xl border text-start transition cursor-pointer flex items-center gap-2.5 ${
                type === "PURCHASE"
                  ? "bg-[var(--accent-surface)] border-amber-600 ring-1 ring-amber-600/30"
                  : "theme-card border-[var(--control-border)] hover:border-[var(--accent-gold)]"
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
              <div>
                <strong className="text-xs font-semibold block text-[var(--text-main)]">
                  {ui("سداد لمورد (سند صرف)")}</strong>
                <span className="text-xs text-[var(--text-muted)]">{ui("صرف من البنك وسداد مستحقات")}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs font-bold text-[var(--text-main)] block">
              {ui("اختر المستند المطلوب تسويته *")}
              <select
                required
                className={INPUT}
                value={documentId}
                onChange={(e) => {
                  setDocumentId(e.target.value);
                  setAmount("");
                }}
              >
                <option value="">
                  {ui(type === "SALE" ? "اختر فاتورة عميل مرحّلة..." : "اختر فاتورة مورد مرحّلة...")}
                </option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  setPage((v) => v - 1);
                  setDocumentId("");
                }}
                className="min-h-11 sm:min-h-8 px-2.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:opacity-30 cursor-pointer font-bold"
              >
                {ui("السابق")}
              </button>
              <span>
                {ui("صفحة")} <span className="font-mono">{page}</span>
              </span>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => {
                  setPage((v) => v + 1);
                  setDocumentId("");
                }}
                className="min-h-11 sm:min-h-8 px-2.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:opacity-30 cursor-pointer font-bold"
              >
                {ui("التالي")}
              </button>
            </div>
          </div>

          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("طريقة الدفع / الحساب المالي *")}<select
              className={INPUT}
              value={cashAccount}
              onChange={(e) => setCashAccount(e.target.value)}
            >
              <option value="1102">{ui("تحويل بنكي - البنك الأهلي SNB (1102)")}</option>
              <option value="1101">{ui("نقداً من الصندوق الرئيسي (1101)")}</option>
            </select>
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] block">
              {ui("المبلغ المسدد (ر.س) *")}
              <div className="relative">
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.00"
                  className={`${INPUT} font-mono font-bold pl-3 pr-12`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                  {ui("ر.س")}
                </span>
              </div>
            </label>
            {remainingBalanceMinor > BigInt(0) && (
              <button
                type="button"
                onClick={() => setAmount(remainingBalanceText)}
                className="inline-flex min-h-11 sm:min-h-8 items-center text-xs font-bold text-[var(--accent-gold)] hover:underline cursor-pointer"
              >
                {ui("نسخ كامل المتبقي (")}
                <bdi dir="ltr">{amountLabel(remainingBalanceText)}</bdi> {ui("ر.س)")}
              </button>
            )}
          </div>

          <label className="text-xs font-bold text-[var(--text-main)]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
              <span>{ui("تاريخ السند *")}</span>
            </span>
            <input
              required
              type="date"
              dir="ltr"
              className={`${INPUT} font-mono text-start`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="text-xs font-bold text-[var(--text-main)]">
            {ui("رقم الحوالة أو المرجع *")}<input
              required
              maxLength={300}
              placeholder={ui("مثال: حوالة بنكية رقم 9842")}
              className={INPUT}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
        </div>

        {/* Balance Status Banner */}
        {documentId && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-muted)]">{ui("حالة المستند المالي المحدد:")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[var(--text-main)]">
                {ui("الرصيد المتبقي:")}</span>
              <strong className="font-mono font-semibold text-[var(--accent-gold)] text-sm">
                <bdi dir="ltr">{amountLabel(remainingBalanceText || "0.00")}</bdi> {ui("ر.س")}
              </strong>
              <span className="px-2 py-0.5 rounded-md bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-amber-600/30 font-bold text-xs">
                {ui(type === "SALE" ? "سند قبض" : "سند صرف")}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || !documentId || !balance.data || remainingBalanceMinor === BigInt(0)}
            className="gold-gradient-btn inline-flex min-h-11 items-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition disabled:opacity-40 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>{ui("جارٍ حفظ السند…")}</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" aria-hidden="true" />
                <span>{ui("اعتماد وحفظ السند")}</span>
              </>
            )}
          </button>
        </div>

        {(error || payments.error) && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{ui(error || payments.error)}</span>
          </div>
        )}
      </form>

      {/* Recent Payments Table */}
      <div className="theme-card overflow-hidden rounded-2xl sm:rounded-3xl border theme-border shadow-xs space-y-0">
        <div className="px-5 py-4 border-b theme-border bg-[var(--table-header-bg)] flex items-center justify-between text-xs">
          <h3 className="font-semibold text-[var(--text-main)] text-sm">
            {ui("سجل سندات القبض والصرف الأخيرة (")}
            {payments.data?.items.length ?? 0})
          </h3>
          <span className="text-[var(--text-muted)] font-mono">JE Journals</span>
        </div>

        <div className="md:hidden p-3.5 space-y-3">
          {payments.data?.items.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-muted)] text-xs">
              {ui("لا توجد سندات قبض أو صرف مسجلة حتى الآن.")}
            </p>
          ) : (
            payments.data?.items.map((p) => {
              const isReceipt = p.direction === "RECEIPT";
              return (
                <MobileRecordCard
                  key={p.id}
                  title={ui(p.reference)}
                  subtitle={
                    <span className="font-mono">
                      <bdi dir="ltr">{p.paymentDate.slice(0, 10)}</bdi> ·{" "}
                      <bdi dir="ltr">JE-{String(p.journal.number).padStart(6, "0")}</bdi>
                    </span>
                  }
                  badge={
                    <Badge
                      variant={isReceipt ? "success" : "warning"}
                      className="text-[11px] gap-1"
                    >
                      {isReceipt ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3" aria-hidden="true" />
                          <span>{ui("سند قبض")}</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                          <span>{ui("سند صرف")}</span>
                        </>
                      )}
                    </Badge>
                  }
                >
                  <MobileCardMetaGrid>
                    <MobileCardField
                      label={ui("المبلغ")}
                      mono
                      value={
                        <bdi dir="ltr">
                          {amountLabel(p.amount)} {ui("ر.س")}
                        </bdi>
                      }
                    />
                    <MobileCardField
                      label={ui("رقم القيد المحاسبي")}
                      mono
                      value={
                        <bdi dir="ltr" className="text-[var(--accent-gold)]">
                          JE-{String(p.journal.number).padStart(6, "0")}
                        </bdi>
                      }
                    />
                  </MobileCardMetaGrid>
                </MobileRecordCard>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[650px] text-start text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b theme-border bg-[var(--table-header-bg)] text-[var(--text-muted)] font-bold whitespace-nowrap">
                <th className="px-4 py-3.5">{ui("التاريخ")}</th>
                <th className="px-4 py-3.5">{ui("النوع")}</th>
                <th className="px-4 py-3.5">{ui("المرجع والبيان")}</th>
                <th className="px-4 py-3.5">{ui("المبلغ")}</th>
                <th className="px-4 py-3.5">{ui("رقم القيد المحاسبي")}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {payments.data?.items.map((p) => {
                const isReceipt = p.direction === "RECEIPT";
                return (
                  <tr key={p.id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="px-4 py-3.5 font-mono text-[var(--text-muted)] whitespace-nowrap">
                      <bdi dir="ltr">{p.paymentDate.slice(0, 10)}</bdi>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isReceipt
                            ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35"
                            : "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-amber-600/30"
                        }`}
                      >
                        {isReceipt ? (
                          <>
                            <ArrowDownLeft className="w-3 h-3" aria-hidden="true" />
                            <span>{ui("سند قبض")}</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                            <span>{ui("سند صرف")}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[var(--text-main)]">
                      {ui(p.reference)}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-[var(--text-main)] whitespace-nowrap" dir="ltr">
                      {amountLabel(p.amount)} <span className="text-xs text-[var(--accent-gold)] font-bold">{ui("ر.س")}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[var(--accent-gold)] whitespace-nowrap">
                      <bdi dir="ltr">JE-{String(p.journal.number).padStart(6, "0")}</bdi>
                    </td>
                  </tr>
                );
              })}

              {payments.data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] text-xs">
                    {ui("لا توجد سندات قبض أو صرف مسجلة حتى الآن.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
