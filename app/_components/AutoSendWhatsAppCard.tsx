"use client";

import { useWhatsAppStatus } from "@/lib/use-whatsapp-status";
import Link from "next/link";
import { CheckCircle2, MessageSquare, WifiOff } from "lucide-react";
import { useId } from "react";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";

interface AutoSendWhatsAppCardProps {
  documentType?: "CONTRACT" | "INVOICE";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  defaultPhoneHint?: string;
  recipientLabel: string;
  titleAr: string;
  subtitleAr: string;
  titleEn?: string;
  subtitleEn?: string;
  waConnected: boolean | null;
  adminFlowPhone?: string | null;
  disabled?: boolean;
  guestPhone?: string;
  onGuestPhoneChange?: (phone: string) => void;
  includeGuestPhoneInCaptainMsg?: boolean;
  onIncludeGuestPhoneChange?: (include: boolean) => void;
  sendToGuest?: boolean;
  onSendToGuestChange?: (send: boolean) => void;
}

export default function AutoSendWhatsAppCard({
  documentType = "INVOICE",
  checked,
  onCheckedChange,
  phone,
  onPhoneChange,
  defaultPhoneHint = "",
  recipientLabel,
  titleAr,
  subtitleAr,
  titleEn,
  subtitleEn,
  waConnected,
  adminFlowPhone = "+966577842926",
  disabled = false,
  guestPhone = "",
  onGuestPhoneChange,
  includeGuestPhoneInCaptainMsg = true,
  onIncludeGuestPhoneChange,
  sendToGuest = false,
  onSendToGuestChange,
}: AutoSendWhatsAppCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const text = (ar: string, en: string) => (isAr ? ar : en);
  const canViewWhatsApp = hasClientPermission(user, "whatsapp", "view");
  const inputId = useId();
  const guestPhoneInputId = useId();
  const wa = useWhatsAppStatus();

  const hasGuestOptions =
    documentType === "CONTRACT" &&
    Boolean(onIncludeGuestPhoneChange || onSendToGuestChange || onGuestPhoneChange);

  const guestOptionsBlock = hasGuestOptions ? (
    <div className="pt-3 mt-1 border-t theme-border space-y-2.5">
      <p className="text-xs font-bold text-[var(--text-main)]">
        {text("خيارات جوال الضيف في الواتساب", "Guest phone WhatsApp options")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {onIncludeGuestPhoneChange && (
          <label className="flex min-h-11 items-start gap-2.5 rounded-xl border theme-border bg-[var(--bg-card)] px-3 py-2 cursor-pointer select-none">
            <Checkbox
              checked={includeGuestPhoneInCaptainMsg}
              disabled={disabled}
              onChange={(e) => onIncludeGuestPhoneChange(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-[var(--text-main)] leading-snug">
              {text(
                "إظهار رقم جوال الضيف في رسالة الكابتن والإدارة",
                "Include guest phone in Captain & Admin message",
              )}
            </span>
          </label>
        )}
        {onSendToGuestChange && (
          <label className="flex min-h-11 items-start gap-2.5 rounded-xl border theme-border bg-[var(--bg-card)] px-3 py-2 cursor-pointer select-none">
            <Checkbox
              checked={sendToGuest}
              disabled={disabled}
              onChange={(e) => onSendToGuestChange(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-[var(--text-main)] leading-snug">
              {text(
                "إرسال نسخة من العقد (PDF) إلى جوال الضيف عبر واتساب",
                "Also send contract copy (PDF) to Guest phone",
              )}
            </span>
          </label>
        )}
      </div>
      {onGuestPhoneChange && (includeGuestPhoneInCaptainMsg || sendToGuest) && (
        <div className="grid gap-1.5 sm:grid-cols-12 items-center">
          <label
            htmlFor={guestPhoneInputId}
            className="sm:col-span-4 text-xs font-semibold text-[var(--text-main)]"
          >
            {text("رقم جوال الضيف (واتساب)", "Guest WhatsApp phone")}
          </label>
          <div className="sm:col-span-8">
            <input
              id={guestPhoneInputId}
              type="tel"
              inputMode="tel"
              dir="ltr"
              disabled={disabled}
              value={guestPhone}
              onChange={(e) => onGuestPhoneChange(e.target.value)}
              placeholder="+9665xxxxxxxx"
              className="theme-input w-full min-h-11 sm:min-h-9 rounded-lg px-3 py-1.5 text-sm font-mono text-start"
            />
            {sendToGuest && !guestPhone.trim() && (
              <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {text(
                  "أدخل رقم جوال الضيف لإرسال نسخة العقد إليه عبر واتساب.",
                  "Enter the guest phone number to send a WhatsApp copy to the guest.",
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  ) : null;

  if (documentType === "CONTRACT" && wa.data?.driverWorkflow?.enabled) return (
    <div className="rounded-xl border theme-border p-4 space-y-2 text-sm">
      <p className="font-semibold">{text("متابعة السائق عبر واتساب", "Driver tracking on WhatsApp")}</p>
      <p className="text-[var(--text-muted)]">{text("عند إسناد العقد يُرسل ملف العقد PDF مع التفاصيل واستطلاع الحالة إلى رقم السائق المسجل. تتلقى الإدارة تحديثاته كردود على إشعار العقد الأصلي.", "Assignment sends the contract PDF with trip details and one status poll to the registered driver. Management receives status updates as replies to the original contract notice.")}</p>
      <p className="text-[var(--text-muted)]">{text("وجهة الإدارة:", "Management destination:")} <bdi dir="ltr" className="break-all">{wa.data.driverWorkflow.managementTarget}</bdi></p>
      {canViewWhatsApp ? (
        <Link href="/admin/whatsapp" className="min-h-11 inline-flex items-center text-[var(--accent-gold)] underline">{text("متابعة إرسال الاستطلاع وحالة الرحلة", "Track poll dispatch and trip status")}</Link>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{text("يمكن لمدير قسم الواتساب متابعة إرسال الاستطلاع وحالة الرحلة.", "A WhatsApp administrator can track poll dispatch and trip status.")}</p>
      )}
      {guestOptionsBlock}
    </div>
  );

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
                  titleEn || (titleAr.includes("العقد")
                    ? "Auto-send contract via WhatsApp on save"
                    : "Auto-send invoice via WhatsApp on issue"),
                )}
              </span>
            </span>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {text(
                subtitleAr,
                subtitleEn || "Saving the document never fails if WhatsApp is offline; dispatch status is reported immediately.",
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
            canViewWhatsApp ? (
              <Link
                href="/admin/whatsapp"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-amber-500/12 border border-amber-500/35 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
              >
                <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{text("غير متصل — ربط الجلسة", "Offline — Link WhatsApp")}</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 border border-amber-500/35 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <WifiOff className="w-3 h-3" aria-hidden="true" />
                <span>{text("واتساب غير متصل", "WhatsApp offline")}</span>
              </span>
            )
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
      {guestOptionsBlock}
    </div>
  );
}
