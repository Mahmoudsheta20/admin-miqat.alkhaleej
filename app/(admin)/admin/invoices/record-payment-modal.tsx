"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  ArrowDownLeft,
} from "lucide-react";
import { accountingRequest, currentSaudiPeriod } from "@/lib/accounting";

interface RecordPaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function RecordPaymentModal({
  invoiceId,
  invoiceNumber,
  customerName,
  totalAmount,
  isOpen,
  onClose,
  onPaymentSuccess,
}: RecordPaymentModalProps) {
  const [balance, setBalance] = useState<string | null>(totalAmount);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [amount, setAmount] = useState(totalAmount);
  const [date, setDate] = useState(currentSaudiPeriod().day);
  const [cashAccount, setCashAccount] = useState("1102"); // Default to SNB Bank (1102)
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const key = useRef("");

  // Fetch current remaining balance whenever modal opens
  useEffect(() => {
    if (!invoiceId) return;

    let active = true;
    key.current = crypto.randomUUID();

    void accountingRequest<{ balance: string; direction: string }>(
      `/document-balance/SALE/${invoiceId}`
    ).then((res) => {
      if (!active) return;
      setIsLoadingBalance(false);
      if (res.data) {
        setBalance(res.data.balance);
        setAmount(res.data.balance); // Pre-fill with remaining amount
      }
    });

    return () => {
      active = false;
    };
  }, [invoiceId]);

  if (!isOpen) return null;

  const remainingNum = Number(balance ?? totalAmount);
  const isFullyPaid = remainingNum <= 0.001;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payNum = Number(amount);
    if (!payNum || payNum <= 0) {
      setError("يرجى إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }
    if (balance && payNum > Number(balance) + 0.01) {
      setError(`المبلغ المدخل (${payNum} ر.س) أكبر من الرصيد المتبقي (${balance} ر.س)`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await accountingRequest("/payments", "POST", {
        operationKey: key.current || crypto.randomUUID(),
        documentType: "SALE",
        documentId: invoiceId,
        amount: payNum.toFixed(2),
        paymentDate: date,
        cashAccount,
        reference: reference.trim() || `تحصيل دفعة للفاتورة ${invoiceNumber}`,
      });

      if (result.success) {
        setSuccessMessage("تم تسجيل سند القبض وتحديث رصيد الفاتورة بنجاح!");
        setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 1200);
      } else {
        setError(result.error || "تعذر حفظ سند القبض؛ يرجى المحاولة مرة أخرى.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تسجيل الدفعة");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      dir="rtl"
    >
      <div
        className="theme-card w-full max-w-lg rounded-3xl border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Modal Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="payment-modal-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white"
              >
                تسجيل دفعة للعميل
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سند قبض محاسبي وتخفيض الرصيد المستحق
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Invoice Summary Ribbon */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border theme-border space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">رقم الفاتورة:</span>
              <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                {invoiceNumber}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">اسم العميل:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[240px]">
                {customerName}
              </span>
            </div>
            <div className="pt-2 border-t theme-border flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">الإجمالي الشامل:</span>
                <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                  {totalAmount} ر.س
                </span>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-slate-400 block">المتبقي حالياً:</span>
                {isLoadingBalance ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" /> جلب الرصيد…
                  </span>
                ) : (
                  <span
                    className={`font-mono font-black text-sm ${
                      isFullyPaid
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {balance ?? totalAmount} ر.س
                  </span>
                )}
              </div>
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

          {error && (
            <div
              role="alert"
              className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isFullyPaid && !isLoadingBalance ? (
            <div className="p-6 text-center space-y-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                هذه الفاتورة مسددة بالكامل
              </h3>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                تم تحصيل كامل القيمة المستحقة ولا يوجد رصيد متبقي على العميل.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount to Pay */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="pay-amount" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    المبلغ المحصل الآن (ر.س) *
                  </label>
                  {balance && Number(balance) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAmount(balance)}
                        className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
                      >
                        كامل المتبقي ({balance} ر.س)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmount((Number(balance) / 2).toFixed(2))}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border theme-border"
                      >
                        النصف
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance ? Number(balance) + 0.01 : undefined}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="theme-input w-full pr-4 pl-12 py-2.5 rounded-xl text-sm font-mono font-bold"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ر.س
                  </span>
                </div>
              </div>

              {/* Payment Account */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  طريقة استلام المبلغ (حساب الإيداع) *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCashAccount("1102")}
                    className={`p-3 rounded-xl border text-right transition flex items-center gap-2.5 cursor-pointer ${
                      cashAccount === "1102"
                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "theme-card theme-border hover:border-amber-500/30"
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <strong className="text-xs font-black block text-slate-900 dark:text-white">
                        تحويل بنكي
                      </strong>
                      <span className="text-[10px] text-slate-400">البنك الأهلي (1102)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCashAccount("1101")}
                    className={`p-3 rounded-xl border text-right transition flex items-center gap-2.5 cursor-pointer ${
                      cashAccount === "1101"
                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "theme-card theme-border hover:border-amber-500/30"
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-xs font-black block text-slate-900 dark:text-white">
                        نقداً في الصندوق
                      </strong>
                      <span className="text-[10px] text-slate-400">الصندوق الرئيسي (1101)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label htmlFor="pay-date" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  تاريخ التحصيل *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="pay-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="theme-input w-full pr-10 pl-3 py-2.5 rounded-xl text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              {/* Reference / Note */}
              <div>
                <label htmlFor="pay-ref" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  رقم الحوالة أو المرجع <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  id="pay-ref"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="مثال: حوالة بنكية 8934 أو إيصال تسليم"
                  className="theme-input w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm"
                />
              </div>

              {/* Explanatory footer */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border theme-border flex items-start gap-2 text-[11px] text-slate-500">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  يتم قيد العملية تلقائياً: طرف مدين لحساب النقد/البنك، وطرف دائن لذمم العميل لتخفيض الرصيد المستحق فوراً.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border theme-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingBalance || Boolean(successMessage)}
                  className="px-5 py-2.5 rounded-xl gold-gradient-btn text-xs font-black shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ التسجيل…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>تسجيل سند القبض</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
