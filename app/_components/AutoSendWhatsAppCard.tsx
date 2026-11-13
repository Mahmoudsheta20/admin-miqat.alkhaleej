"use client";

import Link from "next/link";
import { CheckCircle2, MessageSquare, WifiOff } from "lucide-react";
import { useId } from "react";
import { useLanguage } from "@/lib/languageContext";
import { Checkbox } from "@/components/ui/checkbox";

interface AutoSendWhatsAppCardProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  defaultPhoneHint?: string;
  recipientLabel: string;
  titleAr: string;
  subtitleAr: string;
  waConnected: boolean | null;
  adminFlowPhone?: string | null;
  disabled?: boolean;
}

export default function AutoSendWhatsAppCard({
  checked,
  onCheckedChange,
  phone,
  onPhoneChange,
  defaultPhoneHint = "",
  recipientLabel,
  titleAr,
  subtitleAr,
  waConnected,
  adminFlowPhone = "+966577842926",
  disabled = false,
}: AutoSendWhatsAppCardProps) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const text = (ar: string, en: string) => (isAr ? ar : en);
  const inputId = useId();

  return (
    <div
      className={`rounded-2xl border p-4 transition space-y-3 ${
        checked
          ? "border-emerald-600/40 bg-emerald-500/8 dark:bg-emerald-950/30"
          : "theme-border bg-[var(--bg-card-subtle)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <label className="flex min-h-11 sm:min-h-9 flex-1 items-start gap-2.5 cursor-pointer select-none">
          <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="mt-1 shrink-0"
          />
          <div className="min-w-0 space-y-0.5">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--text-main)]">
              <MessageSquare
                className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0"
                aria-hidden="true"
              />
              <span>
                {text(
                  titleAr,
                  titleAr.includes("العقد")
                    ? "Auto-send contract via WhatsApp on save"
                    : "Auto-send invoice via WhatsApp on issue",
                )}
              </span>
            </span>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {text(
                subtitleAr,
                "Saving the document never fails if WhatsApp is offline; dispatch status is reported immediately.",
              )}
            </p>
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {waConnected === true ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-600/35 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              <span>{text("واتساب متصل", "WhatsApp connected")}</span>
            </span>
          ) : waConnected === false ? (
            <Link
              href="/admin/whatsapp"
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 border border-amber-500/35 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline"
            >
              <WifiOff className="w-3 h-3" aria-hidden="true" />
              <span>{text("غير متصل — ربط الجلسة", "Offline — Link WhatsApp")}</span>
            </Link>
          ) : null}
        </div>
      </div>

      {checked && (
        <div className="pt-2 border-t theme-border grid gap-3 sm:grid-cols-12 items-end">
          <div className="sm:col-span-7">
            <label
              htmlFor={inputId}
              className="block text-xs font-bold text-[var(--text-main)] mb-1"
            >
              {text(
                `رقم الواتساب المستهدف (${recipientLabel})`,
                "Recipient WhatsApp phone (optional override)",
              )}
            </label>
            <input
              id={inputId}
              type="tel"
              inputMode="tel"
              dir="ltr"
              disabled={disabled}
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder={
                defaultPhoneHint
                  ? `${defaultPhoneHint} (افتراضي)`
                  : "+9665xxxxxxxx"
              }
              className="theme-input w-full min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-sm font-mono text-start"
            />
          </div>
          <div className="sm:col-span-5 text-xs text-[var(--text-muted)] rounded-xl border theme-border bg-[var(--bg-card)] px-3 py-2">
            <p className="font-semibold text-[var(--text-main)]">
              {text("إشعار التدفق للإدارة:", "Admin flow alert:")}{" "}
              <bdi dir="ltr" className="font-mono text-[var(--accent-gold)]">
                {adminFlowPhone || "+966577842926"}
              </bdi>
            </p>
            <p className="mt-0.5 leading-snug">
              {text(
                "اتركه فارغاً لاستخدام الرقم المسجل تلقائياً.",
                "Leave blank to use the saved contact number.",
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
