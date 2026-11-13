"use client";
import React, { useId, useState } from "react";
import Link from "next/link";
import { MessageSquare, X, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import { sendContractWhatsApp, sendInvoiceWhatsApp, type WhatsAppDispatchResult } from "@/lib/whatsapp";
import { useWhatsAppStatus } from "@/lib/use-whatsapp-status";
import { useLanguage } from "@/lib/languageContext";
import Modal from "./Modal";

interface SendWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "CONTRACT" | "INVOICE";
  targetId: string;
  targetTitle: string;
  recipientName: string;
  defaultPhone?: string;
}

export default function SendWhatsAppModal(props: SendWhatsAppModalProps) {
  if (!props.isOpen) return null;
  return (
    <SendWhatsAppModalContent
      key={`${props.type}:${props.targetId}:${props.defaultPhone || ""}`}
      {...props}
    />
  );
}

function SendWhatsAppModalContent({
  onClose,
  type,
  targetId,
  targetTitle,
  recipientName,
  defaultPhone = "",
}: SendWhatsAppModalProps) {
  const ui = useUiText();
  const { language } = useLanguage();
  const text = (ar: string, en: string) => language === "ar" ? ar : en;
  const statusQuery = useWhatsAppStatus();
  const pollMode = type === "CONTRACT" && statusQuery.data?.driverWorkflow?.enabled === true;
  const phoneId = useId();
  const phoneHintId = useId();
  const [phone, setPhone] = useState(defaultPhone);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<WhatsAppDispatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !statusQuery.canSend) return;
    setSending(true);
    setError(null);
    try {
      const result = type === "CONTRACT"
        ? await sendContractWhatsApp(targetId, pollMode ? undefined : phone.trim() || undefined)
        : await sendInvoiceWhatsApp(targetId, phone.trim() || undefined);
      setSuccess(result);
    } catch (err: unknown) {
      const uncertain = err instanceof Error && ["TimeoutError", "AbortError", "TypeError"].includes(err.name);
      const msg = uncertain
        ? text("تعذر تأكيد نتيجة الإرسال. تحقق من الاستلام قبل إعادة المحاولة لتجنب التكرار.", "The send result could not be confirmed. Check receipt before retrying to avoid duplicates.")
        : err instanceof Error && err.message ? err.message : ui("حدث خطأ أثناء الإرسال");
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  const modalTitle =
    type === "CONTRACT"
      ? pollMode ? text("إرسال استطلاع السائق", "Send driver poll") : ui("إرسال العقد للكابتن عبر واتساب")
      : ui("إرسال الفاتورة للعميل عبر واتساب");

  return (
    <Modal label={modalTitle} onClose={onClose} isBusy={sending}>
      <div className="mobile-dialog-panel w-full max-w-md rounded-2xl theme-card border theme-border shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          type="button"
          disabled={sending}
          aria-label={ui("إغلاق")}
          className="absolute top-3.5 end-3.5 min-h-11 min-w-11 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl hover:bg-[var(--table-row-hover)] transition cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 mb-4 pe-10">
          <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-emerald-500/12 border border-emerald-600/30 text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base text-[var(--text-main)]">{modalTitle}</h2>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {ui("المستند:")}{" "}
              <span className="font-mono font-bold text-[var(--accent-gold)]" dir="ltr">
                {targetTitle}
              </span>
            </p>
          </div>
        </div>

        {success ? (
          <div role="status" className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-700 dark:text-emerald-300 mx-auto" aria-hidden="true" />
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              {text("تم إرسال الرسالة إلى واتساب.", "Message dispatched to WhatsApp.")}
            </p>
            {success.phone && <p dir="ltr" className="break-all text-sm font-mono text-[var(--text-main)]">{success.phone}</p>}
            <p className="text-sm text-[var(--text-muted)]">{text("استلام الرسالة أو قراءتها على هاتف المستلم غير مؤكد.", "Delivery and reading on the recipient’s phone are not confirmed.")}</p>
            {success.dispatchKind === "driver_poll" && <p className="text-sm text-[var(--text-muted)]">{text("أُرسل استطلاع السائق. تتابع الإدارة تحديثاته بالرد على إشعار العقد الأصلي.", "Driver poll dispatched. Management updates quote the original contract notice.")}</p>}
            {success.hasPdfAttachment === false && success.dispatchKind !== "driver_poll" && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">{text("أُرسل الملخص النصي فقط؛ تعذّر إرفاق PDF. تحقق من الملف قبل إرسال نسخة أخرى.", "Only the text summary was sent; the PDF attachment was unavailable. Check the document before sending another copy.")}</p>}
            <button type="button" onClick={onClose} className="gold-gradient-btn min-h-11 rounded-lg px-5 py-2 text-sm font-semibold">{text("تم", "Done")}</button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="rounded-xl p-3 bg-[var(--bg-card-subtle)] border theme-border text-xs space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--text-muted)]">{ui("المستلم:")}</span>
                <span className="font-bold text-[var(--text-main)] truncate">{recipientName}</span>
              </div>
            </div>

            {pollMode && <p className="text-sm text-[var(--text-muted)]">{text("يُرسل استطلاع واحد إلى رقم السائق المسجل. لا يُرفق PDF مع الاستطلاع.", "One poll goes to the assigned driver’s registered phone. The poll does not include a PDF.")}</p>}
            <div>
              <label htmlFor={phoneId} className="block text-xs font-bold text-[var(--text-main)] mb-1.5">
                {ui("رقم هاتف الواتساب")}
              </label>
              <input
                id={phoneId}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required={!pollMode}
                disabled={sending}
                readOnly={pollMode}
                dir="ltr"
                placeholder="05xxxxxxxx or 201xxxxxxxxx"
                aria-describedby={phoneHintId}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="theme-input w-full min-h-11 px-3 py-1.5 rounded-lg text-base sm:text-[0.8125rem] font-mono text-start"
              />
              <span id={phoneHintId} className="text-xs text-[var(--text-muted)] mt-1.5 block">
                {pollMode ? text("الرقم المسجل للسائق؛ لتغييره حدّث ملف السائق أولاً.", "Assigned driver’s phone. Update the driver profile to change it.") : ui("يقبل الأرقام بصيغة محلية (05...) أو دولية (+966... / +20...)")}
              </span>
            </div>

            {!statusQuery.canSend && (
              <div role="status" className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3 text-sm text-[var(--text-muted)]">
                <p>{statusQuery.isLoading
                  ? text("جارٍ التحقق من اتصال واتساب…", "Checking WhatsApp connection…")
                  : statusQuery.data?.antiBan?.haltReason || statusQuery.error || text("الإرسال غير متاح حالياً. راجع الاتصال وحدود المحاولات.", "Sending is unavailable. Check the connection and attempt limits.")}</p>
                {!statusQuery.isLoading && <Link href="/admin/whatsapp" className="inline-flex min-h-11 items-center text-[var(--accent-gold)] underline" onClick={onClose}>{ui("إعدادات ربط الواتساب (QR)")}</Link>}
              </div>
            )}

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-300 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
                <Link
                  href="/admin/whatsapp"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[var(--accent-gold)] hover:underline"
                >
                  <span>{ui("إعدادات ربط الواتساب (QR)")}</span>
                </Link>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={sending || !statusQuery.canSend}
                className="flex-1 min-h-11 py-1.5 px-4 rounded-lg text-xs sm:text-sm font-bold gold-gradient-btn transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>{ui("جارٍ الإرسال…")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>{ui("إرسال الآن")}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={onClose}
                className="min-h-11 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold border border-[var(--control-border)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer"
              >
                {ui("إلغاء")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
