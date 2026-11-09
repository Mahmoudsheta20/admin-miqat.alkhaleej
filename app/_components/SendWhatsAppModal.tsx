"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { MessageSquare, X, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import { sendContractWhatsApp, sendInvoiceWhatsApp } from "@/lib/whatsapp";
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
  const phoneId = useId();
  const phoneHintId = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phone, setPhone] = useState(defaultPhone);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      if (type === "CONTRACT") {
        await sendContractWhatsApp(targetId, phone.trim() || undefined);
      } else {
        await sendInvoiceWhatsApp(targetId, phone.trim() || undefined);
      }
      setSuccess(true);
      timerRef.current = setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : ui("حدث خطأ أثناء الإرسال");
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  const modalTitle =
    type === "CONTRACT"
      ? ui("إرسال العقد للكابتن عبر واتساب")
      : ui("إرسال الفاتورة للعميل عبر واتساب");

  return (
    <Modal label={modalTitle} onClose={onClose} isBusy={sending}>
      <div className="mobile-dialog-panel w-full max-w-md rounded-2xl theme-card border theme-border shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          type="button"
          disabled={sending}
          aria-label={ui("إغلاق")}
          className="absolute top-3.5 end-3.5 min-h-11 min-w-11 flex items-center justify-center text-[var(--text-muted)] hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 mb-4 pe-10">
          <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base text-slate-900 dark:text-white">{modalTitle}</h2>
            <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 truncate">
              {ui("المستند:")}{" "}
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400" dir="ltr">
                {targetTitle}
              </span>
            </p>
          </div>
        </div>

        {success ? (
          <div role="status" className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" aria-hidden="true" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {ui("تم إرسال الرسالة عبر الواتساب بنجاح!")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 border theme-border text-xs space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--text-muted)] dark:text-slate-400">{ui("المستلم:")}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{recipientName}</span>
              </div>
            </div>

            <div>
              <label htmlFor={phoneId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {ui("رقم هاتف الواتساب")}
              </label>
              <input
                id={phoneId}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                dir="ltr"
                placeholder="05xxxxxxxx or 201xxxxxxxxx"
                aria-describedby={phoneHintId}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border theme-border bg-white dark:bg-slate-900 text-sm font-mono text-start focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span id={phoneHintId} className="text-xs text-[var(--text-muted)] mt-1.5 block">
                {ui("يقبل الأرقام بصيغة محلية (05...) أو دولية (+966... / +20...)")}
              </span>
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={sending}
                className="flex-1 min-h-11 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
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
                className="min-h-11 px-4 py-2.5 rounded-xl text-xs font-bold border theme-border text-[var(--text-muted)] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
