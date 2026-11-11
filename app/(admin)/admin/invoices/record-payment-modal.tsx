"use client";
import Modal from "@/app/_components/Modal";
import { moneyMinor, moneyDecimal } from "@/lib/money";
import { useUiText } from "@/lib/ui-text";


import React, { useEffect, useState, useRef } from "react";
import { X, CreditCard, Building2, Calendar, CheckCircle2, AlertCircle, Loader2, Receipt, ArrowDownLeft } from "lucide-react";
import { accountingRequest, currentSaudiPeriod } from "@/lib/accounting";
import { signedMoneyMinor } from "@/lib/dashboard-analytics";
import { useLanguage } from "@/lib/languageContext";

interface RecordPaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function RecordPaymentModal(props: RecordPaymentModalProps) {
  if (!props.isOpen) return null;
  return <RecordPaymentModalContent key={props.invoiceId} {...props} />;
}

function RecordPaymentModalContent({
  invoiceId,
  invoiceNumber,
  customerName,
  totalAmount,
  onClose,
  onPaymentSuccess,
}: RecordPaymentModalProps) {
  const ui = useUiText();

  const { t, isRTL } = useLanguage();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [amount, setAmount] = useState(totalAmount);
  const [date, setDate] = useState(currentSaudiPeriod().day);
  const [cashAccount, setCashAccount] = useState("1102"); // Default to SNB Bank (1102)
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const key = useRef("");
  const pending = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Fetch current remaining balance when dialog mounts for this invoice
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

  const remainingMinor = balance === null ? null : signedMoneyMinor(balance);
  const isRefundDue = remainingMinor !== null && remainingMinor < BigInt(0);
  const isFullyPaid = remainingMinor !== null && remainingMinor === BigInt(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current || isLoadingBalance || balance === null || isRefundDue || isFullyPaid) return;
    const payMinor = moneyMinor(amount);
    const maxMinor = moneyMinor(balance);
    if (payMinor === null || payMinor <= BigInt(0)) {
      setError(isRTL ? "يرجى إدخال مبلغ صحيح أكبر من الصفر" : "Please enter a valid amount greater than zero");
      return;
    }
    if (maxMinor !== null && payMinor > maxMinor) {
      setError(
        isRTL
          ? `المبلغ المدخل (${amount} ر.س) أكبر من الرصيد المتبقي (${balance} ر.س)`
          : `Entered amount (${amount} SAR) exceeds remaining balance (${balance} SAR)`
      );
      return;
    }

    pending.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const result = await accountingRequest("/payments", "POST", {
        operationKey: key.current || crypto.randomUUID(),
        documentType: "SALE",
        documentId: invoiceId,
        amount: moneyDecimal(payMinor),
        paymentDate: date,
        cashAccount,
        reference: reference.trim() || (isRTL ? `تحصيل دفعة للفاتورة ${invoiceNumber}` : `Payment collection for invoice ${invoiceNumber}`),
      });

      if (result.success) {
        setSuccessMessage(isRTL ? "تم تسجيل سند القبض وتحديث رصيد الفاتورة بنجاح!" : "Receipt voucher recorded and invoice balance updated successfully!");
        closeTimerRef.current = setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 1200);
      } else {
        setError(result.error || (isRTL ? "تعذر حفظ سند القبض؛ يرجى المحاولة مرة أخرى." : "Failed to record payment; please try again."));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRTL ? "حدث خطأ غير متوقع أثناء تسجيل الدفعة" : "An unexpected error occurred while recording payment"));
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal label={isRTL ? "تسجيل دفعة للعميل" : "Record customer payment"} onClose={onClose} isBusy={isSubmitting}>
      <div
        className="mobile-dialog-panel theme-card w-full max-w-lg rounded-3xl border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        aria-labelledby="payment-modal-title"
      >
        {/* Modal Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between bg-[var(--bg-card-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="payment-modal-title"
                className="text-base sm:text-lg font-semibold text-[var(--text-main)]"
              >
                {isRTL ? "تسجيل دفعة للعميل" : "Record Customer Payment"}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isRTL ? "سند قبض محاسبي وتخفيض الرصيد المستحق" : "Receipt voucher and receivable balance reduction"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition cursor-pointer"
            aria-label={ui(t("common.close"))}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Invoice Summary Ribbon */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">{isRTL ? "رقم الفاتورة:" : "Invoice Number:"}</span>
              <span className="font-mono font-semibold text-[var(--accent-gold)]" dir="ltr">
                {invoiceNumber}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">{isRTL ? "اسم العميل:" : "Customer Name:"}</span>
              <span className="font-bold text-[var(--text-main)] truncate max-w-[240px]">
                {customerName}
              </span>
            </div>
            <div className="pt-2 border-t theme-border flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--text-muted)] block">{isRTL ? "الإجمالي الشامل:" : "Grand Total:"}</span>
                <span className="font-mono font-bold text-xs text-[var(--text-main)]">
                  <bdi dir="ltr">{totalAmount}</bdi> {ui(t("common.sar"))}
                </span>
              </div>
              <div className="text-end">
                <span className="text-xs text-[var(--text-muted)] block">{isRTL ? "المتبقي حالياً:" : "Current Balance:"}</span>
                {isLoadingBalance ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> {isRTL ? "جلب الرصيد…" : "Fetching balance…"}
                  </span>
                ) : (
                  <span
                    className={`font-mono font-semibold text-sm ${
                      isFullyPaid
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-[var(--accent-gold)]"
                    }`}
                  >
                    <bdi dir="ltr">{balance ?? "—"}</bdi> {ui(t("common.sar"))}
                  </span>
                )}
              </div>
            </div>
          </div>

          {successMessage && (
            <div
              role="status"
              className="p-4 rounded-2xl border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {isRefundDue ? (
            <p role="status" className="rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] text-[var(--text-main)] p-5 text-sm">
              {isRTL ? "يوجد مبلغ مستحق للعميل. سجّل رد المبلغ من صفحة القيود والتقارير المالية." : "A refund is due to the customer. Record the refund from Accounting & Reports."}
            </p>
          ) : !isLoadingBalance && balance === null ? (
            <p role="alert" className="rounded-2xl border border-rose-500/40 p-5 text-sm text-rose-700 dark:text-rose-400">
              {isRTL ? "تعذر تحميل الرصيد. أغلق النافذة وأعد المحاولة قبل تسجيل دفعة." : "Unable to load the balance. Close this window and retry before recording a payment."}
            </p>
          ) : isFullyPaid && !isLoadingBalance ? (
            <div className="p-6 text-center space-y-2 rounded-2xl bg-emerald-500/12 border border-emerald-600/35 dark:bg-emerald-950/45 dark:border-emerald-500/35">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 dark:text-emerald-300 mx-auto" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {isRTL ? "هذه الفاتورة مسددة بالكامل" : "This Invoice is Fully Paid"}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isRTL ? "تم تحصيل كامل القيمة المستحقة ولا يوجد رصيد متبقي على العميل." : "Full due amount collected with zero remaining balance."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount to Pay */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="pay-amount" className="text-xs font-bold text-[var(--text-main)]">
                    {isRTL ? "المبلغ المحصل الآن (ر.س) *" : "Amount Collected (SAR) *"}
                  </label>
                  {balance && remainingMinor !== null && remainingMinor > BigInt(0) && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAmount(balance)}
                        className="min-h-8 text-xs font-bold text-[var(--accent-gold)] hover:underline px-2.5 py-1 rounded-lg bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 cursor-pointer"
                      >
                        {isRTL ? `كامل المتبقي (${balance} ر.س)` : `Full Balance (${balance} SAR)`}
                      </button>
                      {remainingMinor >= BigInt(2) && (
                        <button
                          type="button"
                          onClick={() => setAmount(moneyDecimal(remainingMinor / BigInt(2)))}
                          className="min-h-8 text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] px-2.5 py-1 rounded-lg bg-[var(--bg-card-subtle)] border border-[var(--control-border)] cursor-pointer transition"
                        >
                          {isRTL ? "النصف" : "Half"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="pay-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    max={balance || undefined}
                    dir="ltr"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="theme-input min-h-11 sm:min-h-9 w-full rounded-lg pl-3.5 pr-14 py-1.5 text-base sm:text-[0.8125rem] font-mono font-bold text-start"
                  />
                  <span className="pointer-events-none select-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                    {ui(t("common.sar"))}
                  </span>
                </div>
              </div>

              {/* Payment Account */}
              <div>
                <span className="text-xs sm:text-[0.8125rem] font-bold text-[var(--text-main)] block mb-1.5">
                  {isRTL ? "طريقة استلام المبلغ (حساب الإيداع) *" : "Payment Method (Deposit Account) *"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    aria-pressed={cashAccount === "1102"}
                    onClick={() => setCashAccount("1102")}
                    className={`min-h-11 sm:min-h-9 p-2.5 sm:p-3 rounded-xl border text-start transition flex items-center gap-2.5 cursor-pointer ${
                      cashAccount === "1102"
                        ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] ring-1 ring-[var(--accent-gold)]/30"
                        : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-[var(--accent-gold)]/60"
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    <div>
                      <strong className="text-xs font-semibold block text-[var(--text-main)]">
                        {isRTL ? "تحويل بنكي" : "Bank Transfer"}
                      </strong>
                      <span className="text-xs text-[var(--text-muted)]">{isRTL ? "البنك الأهلي (1102)" : "SNB Bank (1102)"}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-pressed={cashAccount === "1101"}
                    onClick={() => setCashAccount("1101")}
                    className={`min-h-11 sm:min-h-9 p-2.5 sm:p-3 rounded-xl border text-start transition flex items-center gap-2.5 cursor-pointer ${
                      cashAccount === "1101"
                        ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] ring-1 ring-[var(--accent-gold)]/30"
                        : "bg-[var(--bg-card)] border-[var(--control-border)] hover:border-[var(--accent-gold)]/60"
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    <div>
                      <strong className="text-xs font-semibold block text-[var(--text-main)]">
                        {isRTL ? "نقداً في الصندوق" : "Cash in Drawer"}
                      </strong>
                      <span className="text-xs text-[var(--text-muted)]">{isRTL ? "الصندوق الرئيسي (1101)" : "Main Petty Cash (1101)"}</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label htmlFor="pay-date" className="text-xs sm:text-[0.8125rem] font-bold text-[var(--text-main)] inline-flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                  <span>{isRTL ? "تاريخ التحصيل *" : "Collection Date *"}</span>
                </label>
                <input
                  id="pay-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="theme-input min-h-11 sm:min-h-9 w-full px-3 py-1.5 rounded-lg text-base sm:text-[0.8125rem] font-mono"
                />
              </div>

              {/* Reference / Note */}
              <div>
                <label htmlFor="pay-ref" className="text-xs sm:text-[0.8125rem] font-bold text-[var(--text-main)] block mb-1.5">
                  {isRTL ? "رقم الحوالة أو المرجع " : "Reference / Transfer No. "}
                  <span className="text-[var(--text-muted)] font-normal">({ui(t("common.optional"))})</span>
                </label>
                <input
                  id="pay-ref"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={isRTL ? "مثال: حوالة بنكية 8934 أو إيصال تسليم" : "e.g. Bank transfer 8934 or delivery receipt"}
                  className="theme-input min-h-11 sm:min-h-9 w-full px-3 py-1.5 rounded-lg text-base sm:text-[0.8125rem]"
                />
              </div>

              {/* Explanatory footer */}
              <div className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border theme-border flex items-start gap-2 text-xs text-[var(--text-muted)]">
                <ArrowDownLeft className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  {isRTL
                    ? "يتم قيد العملية تلقائياً: طرف مدين لحساب النقد/البنك، وطرف دائن لذمم العميل لتخفيض الرصيد المستحق فوراً."
                    : "Automated entry: Debit Cash/Bank account, Credit Accounts Receivable to immediately reduce balance."}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-xs sm:text-sm font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer"
                >
                  {ui(t("common.cancel"))}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingBalance || balance === null || isRefundDue || Boolean(successMessage)}
                  className="min-h-11 sm:min-h-9 px-5 py-1.5 rounded-lg gold-gradient-btn text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>{isRTL ? "جارٍ التسجيل…" : "Processing…"}</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" aria-hidden="true" />
                      <span>{isRTL ? "تسجيل سند القبض" : "Record Receipt Voucher"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
