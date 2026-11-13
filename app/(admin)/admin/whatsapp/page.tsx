"use client";

import { useCallback, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { PageHeader } from "@/app/_components/ui";
import ConfirmDialog from "@/app/_components/ConfirmDialog";
import WhatsAppDriverTrips from "@/app/_components/WhatsAppDriverTrips";
import WhatsAppFlowPanel from "@/app/_components/WhatsAppFlowPanel";
import { useLanguage } from "@/lib/languageContext";
import { useWhatsAppStatus } from "@/lib/use-whatsapp-status";
import {
  logoutWhatsApp,
  reconnectWhatsApp,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

function formatAccountPhone(meId?: string): string | null {
  if (!meId) return null;
  const raw = meId.split(":")[0]?.split("@")[0];
  return raw ? `+${raw}` : null;
}

export default function AdminWhatsAppSettingsPage() {
  const { language } = useLanguage();
  const text = useCallback(
    (ar: string, en: string) => (language === "ar" ? ar : en),
    [language]
  );

  const statusQuery = useWhatsAppStatus();
  const waState = statusQuery.data;
  const isLoading = statusQuery.isLoading;
  const isRefreshing = statusQuery.isFetching;
  const refreshStatus = statusQuery.refetch;
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const loadError = statusQuery.error;
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // Test message state
  const [phone, setPhone] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState("");
  const [sendError, setSendError] = useState("");

  async function handleReconnect() {
    setIsReconnecting(true);
    setActionError("");
    setActionMessage("");
    try {
      const next = await reconnectWhatsApp();
      refreshStatus();
      setActionMessage(next.status === "connected"
        ? text("جلسة واتساب متصلة بالفعل.", "WhatsApp is already connected.")
        : text("تم طلب إعادة الاتصال. تابع الحالة؛ قد يُطلب مسح رمز QR.", "Reconnect requested. Follow the status; QR pairing may be required."));
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : text("تعذر إعادة الاتصال بالواتساب", "Failed to reconnect WhatsApp")
      );
    } finally {
      setIsReconnecting(false);
    }
  }

  async function handleConfirmLogout() {
    setActionError("");
    setActionMessage("");
    await logoutWhatsApp();
    refreshStatus();
    setIsLogoutModalOpen(false);
    setActionMessage(
      text(
        "تم تسجيل الخروج من جلسة الواتساب وإعداد رمز QR جديد.",
        "Logged out of WhatsApp session and started generating a fresh QR code."
      )
    );
  }

  async function handleSendTestMessage(e: FormEvent) {
    e.preventDefault();
    if (isSending || !statusQuery.canSend) return;
    setSendError("");
    setSendSuccess("");

    if (!phone.trim() || !messageText.trim()) {
      setSendError(text("يرجى إدخال رقم الهاتف ونص الرسالة.", "Please enter both phone number and message."));
      return;
    }

    setIsSending(true);
    try {
      const res = await sendWhatsAppMessage(phone.trim(), messageText.trim());
      setSendSuccess(
        res.data
          ? text(
              `تمت إضافة الرسالة إلى طابور الإرسال (الترتيب: ${res.data.position}).`,
              `Message queued for dispatch (position: ${res.data.position}).`
            )
          : text("تم قبول طلب الإرسال. استلام الرسالة على الهاتف غير مؤكد.", "Send request accepted. Recipient delivery is not confirmed.")
      );
      setMessageText("");
      void refreshStatus();
    } catch (err) {
      setSendError(
        err instanceof Error
          ? err.message
          : text("تعذر إرسال الرسالة التجريبية", "Failed to queue test message")
      );
    } finally {
      setIsSending(false);
    }
  }

  const status = waState?.status || "disconnected";
  const qrImage = waState?.qrImage || null;
  const connectedPhone = formatAccountPhone(waState?.me_id);
  const antiBan = waState?.antiBan;
  const queueLength = antiBan?.queueLength ?? waState?.queueLength ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={text("ربط الواتساب وإعدادات الإرسال", "WhatsApp Connection & Settings")}
        subtitle={text(
          "ربط رقم واتساب المنشأة عبر مسح رمز QR لإرسال العقود والفواتير والتنبيهات من الخادم مباشرة.",
          "Link your company WhatsApp number via QR code to send contracts, invoices, and notifications directly from the server."
        )}
        onRefresh={() => void refreshStatus()}
        isRefreshing={isRefreshing}
        secondaryActions={
          status === "connected" || status === "qr_ready"
            ? [
                {
                  label: text("تسجيل الخروج وتبديل الرقم", "Logout & Switch Number"),
                  icon: LogOut,
                  variant: "danger",
                  onClick: () => setIsLogoutModalOpen(true),
                },
              ]
            : undefined
        }
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => void refreshStatus()}
            className="min-h-11 sm:min-h-11 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-bold hover:bg-rose-500/10 transition cursor-pointer"
          >
            {text("إعادة المحاولة", "Retry")}
          </button>
        </div>
      )}

      {antiBan?.haltReason && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-500/12 p-4 text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{antiBan.haltReason}</span>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      {actionMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{actionMessage}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Connection Status & QR Display Card */}
        <section className="theme-card rounded-2xl p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                  {text("حالة الاتصال بالواتساب", "WhatsApp Session Status")}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {text("تحديث تلقائي مباشر للحالة ورمز المسح", "Live status & QR code synchronization")}
                </p>
              </div>
            </div>

            {/* Semantic Status Pill */}
            {status === "connected" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{text("متصل وجاهز للإرسال", "Connected")}</span>
              </span>
            ) : status === "qr_ready" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] px-3 py-1 text-xs font-bold text-[var(--accent-gold)]">
                <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{text("بانتظار مسح رمز QR", "QR Ready")}</span>
              </span>
            ) : status === "connecting" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/12 px-3 py-1 text-xs font-bold text-sky-800 dark:text-sky-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>{text("جارٍ الاتصال...", "Connecting...")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{text("غير متصل", "Disconnected")}</span>
              </span>
            )}
          </div>

          {isLoading ? (
            <div
              aria-busy="true"
              className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-[var(--text-muted)]"
            >
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />
              <span>{text("جارٍ التحقق من حالة الواتساب...", "Checking WhatsApp connection...")}</span>
            </div>
          ) : status === "connected" ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/8 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                    {text("تم ربط حساب الواتساب بنجاح", "WhatsApp Account Linked Successfully")}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[var(--text-muted)]">
                    {waState?.me_push_name && (
                      <span>
                        {text("الاسم:", "Name:")}{" "}
                        <strong className="text-[var(--text-main)]">{waState.me_push_name}</strong>
                      </span>
                    )}
                    {connectedPhone && (
                      <span>
                        {text("الرقم المرتبط:", "Phone:")}{" "}
                        <bdi dir="ltr" className="font-mono font-bold text-[var(--text-main)]">
                          {connectedPhone}
                        </bdi>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4">
                  <dt className="text-xs text-[var(--text-muted)]">
                    {text("حالة الجلسة المحفوظة", "Persistent Auth Storage")}
                  </dt>
                  <dd className="mt-1.5 text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>{text("نشطة ومستمرة تلقائياً", "Active & Auto-Restored")}</span>
                  </dd>
                </div>
                <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4">
                  <dt className="text-xs text-[var(--text-muted)]">
                    {text("الرسائل المنتظرة في الطابور", "Pending Queue Messages")}
                  </dt>
                  <dd className="mt-1.5 font-mono text-sm font-bold text-[var(--text-main)]" dir="ltr">
                    {queueLength}
                  </dd>
                </div>
              </dl>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  disabled={waState?.recovery?.canRelink === false}
                  className="min-h-11 sm:min-h-11 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-rose-500/35 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>{text("تسجيل الخروج وتبديل الرقم", "Logout & Link Another Number")}</span>
                </button>
              </div>
            </div>
          ) : status === "qr_ready" && qrImage ? (
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] items-center">
              {/* Crisp white frame so dark mode never distorts QR contrast */}
              <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <Image
                  src={qrImage}
                  alt={text("رمز QR لربط الواتساب", "WhatsApp Login QR Code")}
                  width={240}
                  height={240}
                  unoptimized
                  priority
                  className="h-[240px] w-[240px] rounded-lg object-contain"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                  {text("خطوات ربط الواتساب:", "How to link WhatsApp:")}
                </h3>
                <ol className="space-y-2.5 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed list-decimal ps-5">
                  <li>
                    {text(
                      "افتح تطبيق واتساب على الهاتف المعتمد للشركة.",
                      "Open WhatsApp on your company phone."
                    )}
                  </li>
                  <li>
                    {text(
                      "انتقل إلى الإعدادات (أو القائمة) ثم اختر «الأجهزة المرتبطة».",
                      "Tap Settings (or Menu) and select Linked Devices."
                    )}
                  </li>
                  <li>
                    {text(
                      "اضغط على «ربط جهاز» ووجّه الكاميرا نحو رمز QR الظاهر هنا.",
                      "Tap Link a Device and point your camera at this QR code."
                    )}
                  </li>
                </ol>
                <p className="text-xs text-[var(--accent-gold)] font-semibold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>
                    {text(
                      "يتم التحقق تلقائياً بمجرد مسح الرمز...",
                      "Checking automatically as soon as you scan..."
                    )}
                  </span>
                </p>
              </div>
            </div>
          ) : status === "connecting" ? (
            <div className="py-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                  {text("جارٍ تهيئة اتصال الواتساب...", "Initializing WhatsApp Connection...")}
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  {text(
                    "يتم الاتصال بخوادم واتساب وتحميل الجلسة أو توليد رمز QR جديد خلال ثوانٍ.",
                    "Connecting to WhatsApp servers to restore session or generate a fresh QR code."
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <WifiOff className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                  {text("الاتصال بالواتساب متوقف حالياً", "WhatsApp Is Currently Disconnected")}
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  {text(
                    "اضغط على زر إعادة الاتصال لتشغيل الجلسة وتوليد رمز QR جديد.",
                    "Click Reconnect to start the WhatsApp socket and generate a new QR code."
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={isReconnecting || waState?.recovery?.canReconnect === false}
                  onClick={() => void handleReconnect()}
                  className="gold-gradient-btn min-h-11 sm:min-h-11 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isReconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{text("إعادة الاتصال", "Reconnect")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  disabled={waState?.recovery?.canRelink === false}
                  className="min-h-11 sm:min-h-11 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer"
                >
                  {text("مسح الجلسة السابقة", "Reset Session")}
                </button>
              </div>
            </div>
          )}

          <div className="border-t theme-border pt-4 text-xs text-[var(--text-muted)] flex flex-wrap items-center justify-between gap-2">
            <span>
              {text(
                "طابور موحّد للرسائل والمستندات مع حدود للمحاولات",
                "One queue for messages and documents with bounded send attempts"
              )}
            </span>
            <span className="font-mono" dir="ltr">
              Baileys WebSocket
            </span>
          </div>
        </section>

        {/* Test Message & Anti-Ban Queue Sender */}
        <section className="theme-card rounded-2xl p-5 sm:p-6 lg:col-span-5 space-y-5">
          <div className="flex items-center gap-3 border-b theme-border pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/12 border border-emerald-600/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                {text("إرسال رسالة تجريبية", "Send Test Message")}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {text("اختبار الإرسال الفعلي عبر طابور الحماية", "Test live dispatch through the safe queue")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSendTestMessage} className="space-y-4">
            <fieldset disabled={!statusQuery.canSend || isSending} className="space-y-4 disabled:opacity-65">
              <div>
                <label
                  htmlFor="wa-test-phone"
                  className="block text-xs font-bold text-[var(--text-main)] mb-1.5"
                >
                  {text("رقم الواتساب المستلم *", "Recipient Phone Number *")}
                </label>
                <input
                  id="wa-test-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  required
                  placeholder="05xxxxxxxx or +9665xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="theme-input w-full min-h-11 sm:min-h-11 px-3 py-1.5 rounded-lg text-base sm:text-[0.8125rem] font-mono text-start"
                />
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  {text(
                    "سيتم تنسيق الرقم والتحقق من تسجيله في واتساب قبل الإرسال.",
                    "Number is automatically formatted and verified on WhatsApp before sending."
                  )}
                </span>
              </div>

              <div>
                <label
                  htmlFor="wa-test-message"
                  className="block text-xs font-bold text-[var(--text-main)] mb-1.5"
                >
                  {text("نص الرسالة *", "Message Text *")}
                </label>
                <textarea
                  id="wa-test-message"
                  rows={4}
                  required
                  placeholder={text(
                    "مرحباً، هذه رسالة تجريبية من نظام ميقات الخليج.",
                    "Hello, this is a test message from Miqat System."
                  )}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="theme-input w-full px-3 py-2 rounded-lg text-base sm:text-[0.8125rem] resize-y"
                />
              </div>

              {status !== "connected" && (
                <p className="rounded-lg bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 p-3 text-xs font-medium text-[var(--text-main)]">
                  {text(
                    "يجب أن تكون حالة الواتساب «متصل» بعد مسح رمز QR لتتمكن من إرسال رسائل.",
                    "WhatsApp must be Connected (after scanning QR) to send messages."
                  )}
                </p>
              )}

              {sendError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{sendError}</span>
                </div>
              )}

              {sendSuccess && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{sendSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!statusQuery.canSend || isSending}
                className="gold-gradient-btn w-full min-h-11 sm:min-h-10 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>{text("جارٍ الإضافة للطابور...", "Queueing...")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>{text("إرسال رسالة تجريبية", "Send Test Message")}</span>
                  </>
                )}
              </button>
            </fieldset>
          </form>
        </section>
      </div>

      {/* WhatsApp Interactive Flow Designer & Monitor (+966577842926) */}
      {statusQuery.data?.driverWorkflow?.enabled
        ? <WhatsAppDriverTrips canSend={statusQuery.canSend} managementTarget={statusQuery.data.driverWorkflow.managementTarget} />
        : statusQuery.data && !statusQuery.error ? <WhatsAppFlowPanel waConnected={statusQuery.canSend} /> : null}

      {/* Anti-Ban Safeguards Summary */}
      <section className="theme-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
              {text("ضوابط الإرسال والمحاولات", "Sending Safeguards")}
            </h2>
          </div>
          {antiBan && (
            <span className="text-xs font-mono text-[var(--text-muted)]" dir="ltr">
              {`${antiBan.attemptedLastMinute ?? antiBan.sentLastMinute}/${antiBan.perMinuteLimit} / min · ${antiBan.attemptedLast24Hours ?? antiBan.sentLast24Hours}/${antiBan.dailyLimit} / 24h`}
            </span>
          )}
        </div>

        <p className="text-sm text-[var(--text-muted)]">{text("هذه ضوابط داخلية لتقليل الأخطاء والتكرار، ولا تضمن عدم تقييد الحساب. أرسل فقط للمستلمين الموافقين على التواصل.", "These internal safeguards reduce errors and duplicates; they cannot guarantee an unrestricted account. Message only recipients who agreed to contact.")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5 space-y-1">
            <p className="font-bold text-[var(--text-main)]">
              {text("تباعد محاولات الإرسال", "Send Attempt Pacing")}
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {text(
                "تباعد الرسائل والمستندات وفق الإعدادات؛ المحاولات الفاشلة تُحتسب أيضاً.",
                "Configured pacing applies to texts and PDFs. Failed attempts count toward limits too."
              )}
            </p>
          </div>
          <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5 space-y-1">
            <p className="font-bold text-[var(--text-main)]">
              {text("تهدئة تلقائية للدفعات", "Batch Cool-Down Pauses")}
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {text(
                "استراحة إضافية (8–14 ثانية) تلقائياً بعد كل 10 رسائل متتالية، وحد أقصى 15/دقيقة.",
                "Automatic 8–14s pause after every 10 consecutive messages + 15/min cap."
              )}
            </p>
          </div>
          <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5 space-y-1">
            <p className="font-bold text-[var(--text-main)]">
              {text("منع التكرار وفحص الأرقام", "Dedup & JID Cache")}
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {text(
                "منع تكرار نفس الرسالة لمدة خمس دقائق، مع حفظ حدود المحاولات بعد إعادة التشغيل.",
                "Identical sends are held for five minutes. Attempt limits survive server restarts."
              )}
            </p>
          </div>
          <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5 space-y-1">
            <p className="font-bold text-[var(--text-main)]">
              {text("حماية إعادة الاتصال", "Safe Backoff & Session Guard")}
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {text(
                "إيقاف تلقائي عند التعارض (440/403) وتباعد تدريجي عند انقطاع الشبكة.",
                "Halts on session conflict/403 and applies exponential backoff on network drops."
              )}
            </p>
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        title={text("تسجيل الخروج من الواتساب", "Disconnect WhatsApp Session")}
        message={text(
          "سيتم فصل الرقم المرتبط حالياً وحذف بيانات الجلسة وتوليد رمز QR جديد للربط. هل أنت متأكد؟",
          "This will disconnect the currently linked WhatsApp account, clear local session credentials, and generate a new QR code. Continue?"
        )}
        confirmLabel={text("نعم، تسجيل الخروج", "Yes, Disconnect")}
        cancelLabel={text("إلغاء", "Cancel")}
        variant="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}
