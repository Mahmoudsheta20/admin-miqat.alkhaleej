"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { accountingRequest, amountLabel, currentSaudiPeriod } from "@/lib/accounting";
import { backendRequest } from "@/lib/backend";
import { useAccountingQuery } from "@/lib/use-accounting-query";

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

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!balance.data) return;
    setSaving(true);
    setError("");
    setSuccessMessage("");
    key.current ||= crypto.randomUUID();
    const result = await accountingRequest("/payments", "POST", {
      operationKey: key.current,
      documentType: type,
      documentId,
      amount,
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
      setTimeout(() => setSuccessMessage(""), 3000);
      onChanged();
    } else {
      setError(result.error || "تعذر حفظ السند؛ حاول مرة أخرى.");
    }
  }

  const remainingBalanceNum = balance.data ? Math.abs(Number(balance.data.balance)) : 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            القبض والدفع (سندات التحصيل والصرف)
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            تسوية الذمم، تحصيل مستحقات العملاء، وسداد فواتير الموردين عبر البنك أو الصندوق.
          </p>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
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
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
            نوع العملية *
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => {
                setType("SALE");
                setDocumentId("");
                setAmount("");
                setPage(1);
              }}
              className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 ${
                type === "SALE"
                  ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30"
                  : "theme-card theme-border opacity-70 hover:opacity-100"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <strong className="text-xs font-black block text-slate-900 dark:text-white">
                  تحصيل من عميل (سند قبض)
                </strong>
                <span className="text-[10px] text-slate-400">إيداع بالبنك وتخفيض ذمة العميل</span>
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
              className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 ${
                type === "PURCHASE"
                  ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30"
                  : "theme-card theme-border opacity-70 hover:opacity-100"
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <strong className="text-xs font-black block text-slate-900 dark:text-white">
                  سداد لمورد (سند صرف)
                </strong>
                <span className="text-[10px] text-slate-400">صرف من البنك وسداد مستحقات</span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">
            اختر المستند المطلوب تسويته *
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
                {type === "SALE" ? "اختر فاتورة عميل مرحّلة..." : "اختر فاتورة مورد مرحّلة..."}
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  setPage((v) => v - 1);
                  setDocumentId("");
                }}
                className="hover:text-amber-600 disabled:opacity-30 cursor-pointer font-bold"
              >
                السابق
              </button>
              <span>صفحة {page}</span>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => {
                  setPage((v) => v + 1);
                  setDocumentId("");
                }}
                className="hover:text-amber-600 disabled:opacity-30 cursor-pointer font-bold"
              >
                التالي
              </button>
            </span>
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            طريقة الدفع / الحساب المالي *
            <select
              className={INPUT}
              value={cashAccount}
              onChange={(e) => setCashAccount(e.target.value)}
            >
              <option value="1102">تحويل بنكي - البنك الأهلي SNB (1102)</option>
              <option value="1101">نقداً من الصندوق الرئيسي (1101)</option>
            </select>
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            المبلغ المسدد (ر.س) *
            <div className="relative">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                max={balance.data ? Math.abs(Number(balance.data.balance)) : undefined}
                dir="ltr"
                placeholder="0.00"
                className={`${INPUT} font-mono font-bold pr-3 pl-10`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ر.س
              </span>
            </div>
            {remainingBalanceNum > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(remainingBalanceNum))}
                className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
              >
                نسخ كامل المتبقي ({amountLabel(String(remainingBalanceNum))} ر.س)
              </button>
            )}
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            تاريخ السند *
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                required
                type="date"
                className={`${INPUT} pr-10`}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </label>

          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            رقم الحوالة أو المرجع *
            <input
              required
              maxLength={300}
              placeholder="مثال: حوالة بنكية رقم 9842"
              className={INPUT}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
        </div>

        {/* Balance Status Banner */}
        {documentId && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border theme-border flex items-center justify-between text-xs">
            <span className="text-slate-500">حالة المستند المالي المحدد:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                الرصيد المتبقي:
              </span>
              <strong className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                {amountLabel(String(remainingBalanceNum))} ر.س
              </strong>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                {type === "SALE" ? "سند قبض" : "سند صرف"}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || !documentId || !balance.data || remainingBalanceNum === 0}
            className="gold-gradient-btn inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-black shadow-sm hover:shadow-md transition disabled:opacity-40 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ حفظ السند…</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>اعتماد وحفظ السند</span>
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
            <span>{error || payments.error}</span>
          </div>
        )}
      </form>

      {/* Recent Payments Table */}
      <div className="theme-card overflow-hidden rounded-2xl sm:rounded-3xl border theme-border shadow-xs space-y-0">
        <div className="px-5 py-4 border-b theme-border bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <h3 className="font-black text-slate-900 dark:text-white text-sm">
            سجل سندات القبض والصرف الأخيرة ({payments.data?.items.length ?? 0})
          </h3>
          <span className="text-slate-400 font-mono">JE Journals</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b theme-border bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                <th className="px-4 py-3.5">التاريخ</th>
                <th className="px-4 py-3.5">النوع</th>
                <th className="px-4 py-3.5">المرجع والبيان</th>
                <th className="px-4 py-3.5">المبلغ</th>
                <th className="px-4 py-3.5">رقم القيد المحاسبي</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {payments.data?.items.map((p) => {
                const isReceipt = p.direction === "RECEIPT";
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {p.paymentDate.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isReceipt
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {isReceipt ? (
                          <>
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>سند قبض</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            <span>سند صرف</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {p.reference}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-black text-slate-900 dark:text-white whitespace-nowrap" dir="ltr">
                      {amountLabel(p.amount)} <span className="text-[10px] text-amber-600 font-bold">ر.س</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      JE-{String(p.journal.number).padStart(6, "0")}
                    </td>
                  </tr>
                );
              })}

              {payments.data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد سندات قبض أو صرف مسجلة حتى الآن.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
