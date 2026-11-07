"use client";
import React, { useState } from "react";
import { MessageSquare, X, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import { sendContractWhatsApp, sendInvoiceWhatsApp } from "@/lib/whatsapp";

interface SendWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "CONTRACT" | "INVOICE";
  targetId: string;
  targetTitle: string;
  recipientName: string;
  defaultPhone?: string;
}

export default function SendWhatsAppModal({
  isOpen,
  onClose,
  type,
  targetId,
  targetTitle,
  recipientName,
  defaultPhone = "",
}: SendWhatsAppModalProps) {
  const ui = useUiText();
  const [phone, setPhone] = useState(defaultPhone);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      if (type === "CONTRACT") {
        await sendContractWhatsApp(targetId, phone || undefined);
      } else {
        await sendInvoiceWhatsApp(targetId, phone || undefined);
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء الإرسال";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  const modalTitle = type === "CONTRACT" ? ui("إرسال العقد للكابتن عبر واتساب") : ui("إرسال الفاتورة للعميل عبر واتساب");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl theme-card border theme-border shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        <button
          onClick={onClose}
          type="button"
          disabled={sending}
          className="absolute top-4 start-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{modalTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ui("المستند:")} <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{targetTitle}</span>
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {ui("تم إرسال الرسالة عبر الواتساب بنجاح!")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 border theme-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{ui("المستلم:")}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{recipientName}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {ui("رقم هاتف الواتساب")}
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="05xxxxxxxx or 201xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border theme-border bg-white dark:bg-slate-900 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                يقبل الأرقام بصيغة محلية (05...) أو دولية (+966... / +20...)
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={sending}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{ui("جارٍ الإرسال…")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{ui("إرسال الآن")}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border theme-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {ui("إلغاء")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

