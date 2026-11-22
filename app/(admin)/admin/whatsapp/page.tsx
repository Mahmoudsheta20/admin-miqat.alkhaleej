"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
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
import Modal from "@/app/_components/Modal";
import ConfirmDialog from "@/app/_components/ConfirmDialog";
import WhatsAppDriverTrips from "@/app/_components/WhatsAppDriverTrips";
import WhatsAppFlowPanel from "@/app/_components/WhatsAppFlowPanel";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import { hasClientPermission } from "@/lib/permissions";
import { useWhatsAppStatus } from "@/lib/use-whatsapp-status";
import {
  logoutWhatsApp,
  reconnectWhatsApp,
  removeSavedWhatsAppSession,
  replaceRefusedWhatsAppSession,
  retryPendingWhatsAppPairing,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

type ConfirmResetMode = "logout_connected" | "new_number" | "relink_same_number" | "remove_number" | "reset_unidentified";
type LinkingIntent = "same_number" | "new_number";

function formatAccountPhone(meId?: string): string | null {
  if (!meId) return null;
  const phone = /^(\d+)(?::\d+)?@(?:s\.whatsapp\.net|c\.us)$/.exec(meId)?.[1];
  return phone ? `+${phone}` : null;
}

export default function AdminWhatsAppSettingsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const canWrite = hasClientPermission(user, "whatsapp", "write");
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
  const [confirmMode, setConfirmMode] = useState<ConfirmResetMode | null>(null);
  const [editingPending, setEditingPending] = useState<string>();
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [replacementPhone, setReplacementPhone] = useState("");
  const [previousPhone, setPreviousPhone] = useState("");
  const [replacementError, setReplacementError] = useState("");
  const [replacing, setReplacing] = useState(false);
  const replacementLock = useRef(false);
  const [removalAccount, setRemovalAccount] = useState<string>();
  const [linkingIntent, setLinkingIntent] = useState<LinkingIntent | null>(null);
  const loadError = statusQuery.error;
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // Test message state
  const [phone, setPhone] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState("");
  const [sendError, setSendError] = useState("");

  async function handleReconnectSameNumber() {
    if (!canWrite || isReconnecting) return;
    setIsReconnecting(true);
    setActionError("");
    setActionMessage("");
    setLinkingIntent(null);
    try {
      const next = await reconnectWhatsApp("same_number");
      refreshStatus();
      setActionMessage(
        next.status === "connected"
          ? text("جلسة واتساب متصلة بالفعل.", "WhatsApp is already connected.")
          : text(
              "تم بدء إعادة الاتصال بنفس الرقم. تابع الحالة؛ قد يُطلب مسح رمز QR إذا انتهت صلاحية الجلسة.",
              "Reconnect requested with the saved session. Follow the status; QR pairing may still be required if the session expired."
            )
      );
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

  async function handleConfirmSessionReset() {
    if (!canWrite || !confirmMode) return;
    const mode = confirmMode;
    setActionError("");
    setActionMessage("");
    if (mode === "remove_number" || mode === "reset_unidentified") {
      if (mode === "remove_number" && !removalAccount) throw new Error(text("حدّث الصفحة للتحقق من الرقم المحفوظ.", "Refresh the page to verify the saved number."));
      await removeSavedWhatsAppSession(mode === "reset_unidentified" ? null : removalAccount ?? null);
      setLinkingIntent(null);
      refreshStatus();
      setConfirmMode(null);
      setActionMessage(text(
        "أُزيل الرقم من ميقات. إذا ظل الجهاز ظاهراً في واتساب على الهاتف، أزله من الأجهزة المرتبطة.",
        "Number removed from Miqat. If the device is still listed on the old phone, remove it from WhatsApp’s Linked devices."
      ));
      return;
    }
    await logoutWhatsApp();
    setLinkingIntent(mode === "relink_same_number" ? "same_number" : "new_number");
    refreshStatus();
    setConfirmMode(null);
    setActionMessage(
      mode === "relink_same_number"
        ? text(
            "تم مسح الجلسة المنتهية وإعداد رمز QR جديد لإعادة ربط نفس الرقم.",
            "Cleared the expired session and started generating a fresh QR code to re-link the same number."
          )
        : text(
            "تم مسح الجلسة السابقة وإعداد رمز QR جديد لربط رقم واتساب جديد.",
            "Cleared the previous session and started generating a fresh QR code for a new WhatsApp number."
          )
    );
  }

  function openReplacement() {
    setPreviousPhone("");
    setEditingPending(pendingPhone);
    setReplacementPhone(pendingPhone ?? "");
    setReplacementError("");
    setReplacementOpen(true);
  }

  async function handleReplaceRefused(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || replacementLock.current || !canSubmitPairing) return;
    const next = replacementPhone.replace(/[\s\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
    if (!/^\+?[1-9]\d{7,14}$/.test(next)) {
      setReplacementError(text("أدخل الرقم الجديد مع رمز الدولة وبدون مسافات.", "Enter the new number with country code and no spaces."));
      return;
    }
    const previous = needsPreviousNumber ? previousPhone.trim() : undefined;
    if (needsPreviousNumber && (!previous || !/^\+?[1-9]\d{7,14}$/.test(previous))) {
      setReplacementError(text("أدخل رقم الإرسال السابق مع رمز الدولة.", "Enter the previous sender number with its country code."));
      return;
    }
    if (previous && previous.replace(/^\+/, "") === next.replace(/^\+/, "")) {
      setReplacementError(text("يجب أن يختلف الرقم الجديد عن السابق.", "Choose a number different from the previous sender."));
      return;
    }
    replacementLock.current = true;
    setReplacing(true);
    setReplacementError("");
    setActionError("");
    setActionMessage("");
    try {
      if (editingPending) await retryPendingWhatsAppPairing(editingPending, next);
      else await replaceRefusedWhatsAppSession(next, previous);
      setLinkingIntent("new_number");
      setReplacementOpen(false);
      refreshStatus();
      setActionMessage(text(
        "أُزيلت الجلسة السابقة. امسح رمز الربط من هاتف الرقم الجديد عند ظهوره.",
        "Old session removed. Scan the QR code from the new number’s phone when it appears."
      ));
    } catch (error) {
      setReplacementError(error instanceof Error ? error.message : text("تعذر ربط الرقم الجديد", "Unable to link the new number"));
      refreshStatus();
    } finally {
      replacementLock.current = false;
      setReplacing(false);
    }
  }

  async function handleSendTestMessage(e: FormEvent) {
    e.preventDefault();
    if (!canWrite || isSending || !statusQuery.canSend) return;
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
  const savedSession = waState?.savedSession;
  const savedPhone = formatAccountPhone(savedSession?.me_id);
  const savedName = savedSession?.me_push_name || null;
  const hasSavedSession = Boolean(savedSession?.hasSession);
  const noSavedSessionConfirmed = savedSession?.hasSession === false;
  const haltCode = waState?.haltCode ?? null;
  const isLoggedOut = haltCode === "logged_out";
  const isForbidden = haltCode === "forbidden";
  const canReconnect = waState?.recovery?.canReconnect !== false;
  const queueBusy = waState?.sessionActions?.queueBusy ?? Boolean(waState?.antiBan?.queueLength ?? waState?.queueLength);
  const canRelink = waState?.recovery?.canRelink !== false && !queueBusy;
  const canRemove = waState?.sessionActions?.canRemove === true && !queueBusy;
  const canResetUnidentified = waState?.sessionActions?.canResetUnidentified === true && !queueBusy;
  const needsPreviousNumber = waState?.sessionActions?.needsPreviousNumber === true;
  const canReplaceRefused = waState?.sessionActions?.canReplaceRefused === true && !queueBusy;
  const replacementPending = waState?.sessionActions?.replacementPending === true;
  const pendingPhone = waState?.sessionActions?.pendingPhone;
  const canEditPending = Boolean(pendingPhone && waState?.sessionActions?.canEditPending && !queueBusy);
  const canSubmitPairing = editingPending ? canEditPending && editingPending === pendingPhone : canReplaceRefused;
  const replacementTitle = pendingPhone
    ? text("تأكيد رقم الربط", "Confirm pairing number")
    : text("ربط رقم مختلف", "Link a different number");
  const intentionallyRemoved = waState?.sessionActions?.intentionallyRemoved === true;
  const antiBan = waState?.antiBan;
  const queueLength = antiBan?.queueLength ?? waState?.queueLength ?? 0;

  const switchActions = !canWrite
    ? undefined
    : status === "connected"
      ? [
          {
            label: text("تغيير رقم واتساب", "Change WhatsApp number"),
            icon: LogOut,
            variant: "danger" as const,
            disabled: !canRelink,
            onClick: () => setConfirmMode("logout_connected"),
          },
        ]
      : status === "qr_ready"
        ? [
            {
              label: text("توليد رمز QR جديد", "Generate New QR"),
              icon: RefreshCw,
              variant: "secondary" as const,
              disabled: !canRelink,
              onClick: () => setConfirmMode("new_number"),
            },
          ]
        : [
            {
              label: text("تغيير الرقم / رقم جديد", "Change / New Number"),
              icon: QrCode,
              variant: "secondary" as const,
              disabled: !canRelink,
              onClick: () => setConfirmMode("new_number"),
            },
          ];

  const headerSecondaryActions = [
    ...(canWrite && (canReplaceRefused || canEditPending) ? [{
      label: replacementTitle,
      icon: QrCode,
      variant: "secondary" as const,
      onClick: openReplacement,
    }] : canResetUnidentified ? [] : switchActions ?? []),
    ...(canWrite && waState?.sessionActions && hasSavedSession ? [{
      label: text("إزالة الرقم المحفوظ", "Remove saved number"),
      icon: LogOut,
      variant: "danger" as const,
      disabled: !canRemove,
      onClick: () => {
        setRemovalAccount(savedSession?.me_id ?? waState.me_id);
        setConfirmMode("remove_number");
      },
    }] : []),
  ];

  const confirmDialogConfig =
    confirmMode === "reset_unidentified"
      ? {
          variant: "danger" as const,
          title: text("إعادة ضبط جلسة واتساب", "Reset WhatsApp session"),
          message: text("ستُحذف بيانات الربط القديمة من ميقات. سيبقى الإرسال متوقفاً حتى تربط رقماً آخر من هذه الصفحة.", "This clears the old linking credentials. Sending stays paused until you link another number from this page."),
          confirmLabel: text("تأكيد إعادة الضبط", "Confirm reset"),
        }
    : confirmMode === "remove_number"
      ? {
          variant: "danger" as const,
          title: text("إزالة رقم واتساب المحفوظ", "Remove saved WhatsApp number"),
          message: text(
            `ستُزال جلسة الرقم ${formatAccountPhone(removalAccount) || ""} من ميقات. سيظل الإرسال متوقفاً حتى ربط رقم آخر.`,
            `Miqat will remove the session for ${formatAccountPhone(removalAccount) || "the saved number"}. Link a number again to resume sending.`
          ),
          confirmLabel: text("إزالة الرقم", "Remove number"),
        }
    : confirmMode === "logout_connected"
      ? {
          variant: "danger" as const,
          title: text("تغيير رقم واتساب", "Change WhatsApp number"),
          message: connectedPhone
            ? text(
                `سيتم فصل الرقم المرتبط حالياً (${connectedPhone}) وحذف بيانات الجلسة وتوليد رمز QR جديد لربط رقم آخر. هل أنت متأكد؟`,
                `This will disconnect the currently linked number (${connectedPhone}), clear local session credentials, and generate a new QR code to link another number. Continue?`
              )
            : text(
                "سيتم فصل الرقم المرتبط حالياً وحذف بيانات الجلسة وتوليد رمز QR جديد للربط. هل أنت متأكد؟",
                "This will disconnect the currently linked WhatsApp account, clear local session credentials, and generate a new QR code. Continue?"
              ),
          confirmLabel: text("فصل الرقم وإظهار رمز الربط", "Disconnect and show QR"),
        }
      : confirmMode === "relink_same_number"
        ? {
            variant: "info" as const,
            title: text("إعادة ربط نفس الرقم", "Re-link Same Number"),
            message: savedPhone
              ? text(
                  `سيتم مسح بيانات الجلسة المنتهية للرقم (${savedPhone}) وتوليد رمز QR جديد لتتمكن من مسحه من نفس الهاتف. هل تريد المتابعة؟`,
                  `This will clear the expired session credentials for (${savedPhone}) and generate a fresh QR code so you can scan it with the same phone. Continue?`
                )
              : text(
                  "سيتم مسح بيانات الجلسة المنتهية وتوليد رمز QR جديد لإعادة ربط نفس الهاتف. هل تريد المتابعة؟",
                  "This will clear the expired session credentials and generate a fresh QR code to re-link the same phone. Continue?"
                ),
            confirmLabel: text("توليد رمز QR", "Generate QR Code"),
          }
        : {
            variant: "warning" as const,
            title: text("تغيير رقم الواتساب (رقم جديد)", "Switch to a New WhatsApp Number"),
            message: savedPhone
              ? text(
                  `سيتم إغلاق أي محاولة اتصال جارية وحذف بيانات الجلسة المحفوظة للرقم (${savedPhone}) وتوليد رمز QR جديد لربط رقم مختلف. هل تريد المتابعة؟`,
                  `This will cancel any active connection attempt, clear saved credentials for (${savedPhone}), and generate a fresh QR code to link a different number. Continue?`
                )
              : text(
                  "سيتم مسح بيانات الجلسة المؤقتة وإعادة تهيئة الاتصال لتوليد رمز QR جديد لربط رقم واتساب. هل تريد المتابعة؟",
                  "This will clear temporary session credentials and reinitialize the connection to generate a fresh QR code for linking a WhatsApp number. Continue?"
                ),
            confirmLabel: text("نعم، ربط رقم جديد", "Yes, Link New Number"),
          };

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
        secondaryActions={headerSecondaryActions}
      />

      {canWrite && queueBusy && (
        <p role="status" className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-4 py-3 text-sm">
          {text("انتظر انتهاء الإرسال الجاري والرسائل المنتظرة قبل تغيير الرقم أو إزالته.", "Wait for queued messages and the current send to finish before changing or removing the number.")}
        </p>
      )}
      {intentionallyRemoved && !hasSavedSession && status === "disconnected" && (
        <p role="status" className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-4 py-3 text-sm">
          {text("أُزيل الرقم المحفوظ. اختر ربط رقم جديد عندما تكون جاهزاً.", "The saved number was removed. Link a new number when you’re ready.")}
        </p>
      )}

      {!canWrite && (
        <p role="status" className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {text(
            "وضع العرض فقط: يلزم صلاحية تعديل الواتساب لتغيير الربط أو إرسال الرسائل.",
            "View-only access: WhatsApp write permission is required to manage connections or send messages."
          )}
        </p>
      )}

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

      {replacementPending && !isForbidden && status !== "connected" && (
        <p role="status" className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-4 py-3 text-sm">
          {pendingPhone
            ? <>{text("رقم واتساب المطلوب للربط", "Expected WhatsApp sender")} <bdi dir="ltr">{pendingPhone}</bdi></>
            : text("امسح رمز الربط من هاتف الرقم الجديد الذي أدخلته.", "Scan the QR code from the phone for the new number you entered.")}
        </p>
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

              {canWrite && (
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmMode("logout_connected")}
                    disabled={!canRelink}
                    className="min-h-11 sm:min-h-11 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-rose-500/35 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>{text("تسجيل الخروج وتبديل الرقم", "Logout & Link Another Number")}</span>
                  </button>
                </div>
              )}
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
                {linkingIntent && (
                  <p
                    role="status"
                    className="rounded-xl border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-main)]"
                  >
                    {linkingIntent === "new_number"
                      ? text(
                          "جاهز لربط رقم واتساب جديد — امسح الرمز من الهاتف الذي تريد استخدامه للإرسال.",
                          "Ready to link a new WhatsApp number — scan this code from the phone you want to use."
                        )
                      : text(
                          "جاهز لإعادة ربط نفس الرقم — امسح الرمز من نفس هاتف الواتساب المرتبط سابقاً.",
                          "Ready to re-link the same number — scan this code from your previously linked WhatsApp phone."
                        )}
                  </p>
                )}
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                  {text("خطوات ربط الواتساب:", "How to link WhatsApp:")}
                </h3>
                <ol className="space-y-2.5 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed list-decimal ps-5">
                  <li>
                    {text(
                      "افتح تطبيق واتساب على الهاتف المراد ربطه (نفس الرقم أو الرقم الجديد).",
                      "Open WhatsApp on the phone you want to link (same number or new number)."
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
                {canWrite && (
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pendingPhone ? !canEditPending : !canRelink}
                      onClick={pendingPhone ? openReplacement : () => setConfirmMode("new_number")}
                      className="min-h-11 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                      <span>{text("توليد رمز QR جديد", "Generate Fresh QR")}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : status === "connecting" ? (
            <div className="py-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--accent-gold)] flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
              </div>
              <div className="space-y-2 max-w-md">
                <p className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                  {hasSavedSession
                    ? text("جارٍ إعادة الاتصال بالرقم المحفوظ...", "Reconnecting to Saved Number...")
                    : text("جارٍ تهيئة اتصال الواتساب...", "Initializing WhatsApp Connection...")}
                </p>
                {hasSavedSession && (savedName || savedPhone || savedSession?.me_id) && (
                  <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border theme-border bg-[var(--bg-card-subtle)] px-3.5 py-2 text-xs text-[var(--text-muted)]">
                    <Smartphone className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    {savedName && <strong className="text-[var(--text-main)]">{savedName}</strong>}
                    {(savedPhone || savedSession?.me_id) && (
                      <bdi dir="ltr" className="font-mono font-bold text-[var(--text-main)]">
                        {savedPhone ?? savedSession?.me_id}
                      </bdi>
                    )}
                  </div>
                )}
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  {hasSavedSession
                    ? text(
                        "يتم استئناف الجلسة المحفوظة مع خوادم واتساب. يمكنك الانتظار أو إلغاء الاتصال لربط رقم آخر.",
                        "Restoring your saved WhatsApp session. Wait a moment or cancel to switch to another number."
                      )
                    : text(
                        "يتم الاتصال بخوادم واتساب وتحميل الجلسة أو توليد رمز QR جديد خلال ثوانٍ.",
                        "Connecting to WhatsApp servers to restore session or generate a fresh QR code."
                      )}
                </p>
              </div>
              {canWrite && (
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={pendingPhone ? !canEditPending : !canRelink}
                    onClick={pendingPhone ? openReplacement : () => setConfirmMode("new_number")}
                    className="min-h-11 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer disabled:opacity-50"
                  >
                    {pendingPhone ? replacementTitle : hasSavedSession
                      ? text("إلغاء وتغيير الرقم", "Cancel & Switch Number")
                      : text("إعادة تهيئة وربط رقم جديد", "Reset & Link New Number")}
                  </button>
                </div>
              )}
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
                {!hasSavedSession && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                    {isForbidden && (canResetUnidentified || canReplaceRefused)
                      ? text("توقف الإرسال من الرقم السابق. يمكنك ربط رقم آخر من هذه الصفحة.", "Sending from the previous number is paused. You can link another number here.")
                      : isForbidden
                      ? text(
                          "تم رفض الاتصال من واتساب (403). راجع حالة الحساب مع الدعم الفني قبل أي محاولة جديدة.",
                          "WhatsApp refused the connection (403). Review the account status before retrying."
                        )
                      : noSavedSessionConfirmed
                        ? text(
                            "لا توجد جلسة رقم محفوظة حالياً. ابدأ ربط رقم جديد لتوليد رمز QR.",
                            "No saved number session found. Start connecting a new number to generate a QR code."
                          )
                        : text(
                            "يمكنك إعادة الاتصال بالجلسة المحفوظة أو مسح الجلسة وربط رقم جديد عبر رمز QR.",
                            "Reconnect using the saved session or reset to link a new number via QR code."
                          )}
                  </p>
                )}
              </div>
              {hasSavedSession && (
                <div className="w-full max-w-lg rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 text-start space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      {replacementPending
                        ? text("الرقم الظاهر في بيانات الربط", "Number in the pairing credentials")
                        : text("الجلسة المحفوظة على الخادم", "Saved Session on Server")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[var(--text-muted)]">
                    {savedName && (
                      <span>
                        {text("الاسم:", "Name:")}{" "}
                        <strong className="text-[var(--text-main)]">{savedName}</strong>
                      </span>
                    )}
                    {(savedPhone || savedSession?.me_id) && (
                      <span>
                        {savedPhone ? text("الرقم المحفوظ:", "Saved Phone:") : text("معرف الحساب:", "Account ID:")}{" "}
                        <bdi dir="ltr" className="font-mono font-bold text-[var(--text-main)]">
                          {savedPhone ?? savedSession?.me_id}
                        </bdi>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {isForbidden
                      ? text(
                          "رفض واتساب الاتصال بهذا الرقم (403). راجع حالته مع واتساب قبل استخدامه مجدداً.",
                          "WhatsApp refused this number’s connection (403). Review its status with WhatsApp before using it again."
                        )
                      : pendingPhone
                        ? text("تحقق من رقم الربط المطلوب ثم امسح الرمز من حساب واتساب الخاص به.", "Check the expected sender, then scan using that WhatsApp account.")
                      : isLoggedOut
                        ? text(
                            "تم تسجيل خروج هذا الجهاز أو فصله من واتساب. يمكنك إعادة ربط نفس الرقم برمز QR جديد أو تغيير الرقم بالكامل.",
                            "This device was logged out or unlinked from WhatsApp. You can re-link the same number with a new QR code or switch to a new number."
                          )
                        : text(
                            "يمكنك إعادة الاتصال بنفس الرقم باستخدام بيانات الجلسة المحفوظة، أو مسح الجلسة وربط رقم جديد.",
                            "Reconnect with the same number using saved session credentials, or clear the session to link a new number."
                          )}
                  </p>
                </div>
              )}
              {canWrite && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  {pendingPhone ? (
                    <button type="button" disabled={!canEditPending} onClick={openReplacement} className="gold-gradient-btn min-h-11 rounded-lg px-4 disabled:opacity-50">
                      {text("مراجعة الرقم وإصدار رمز جديد", "Review sender and get a fresh QR")}
                    </button>
                  ) : canResetUnidentified || canReplaceRefused ? (
                    <>
                      {canResetUnidentified && (
                        <button type="button" onClick={() => setConfirmMode("reset_unidentified")} className="theme-input min-h-11 rounded-lg px-4">
                          {text("إعادة ضبط الجلسة", "Reset session")}
                        </button>
                      )}
                      {canReplaceRefused && (
                        <button type="button" onClick={openReplacement} className="gold-gradient-btn min-h-11 rounded-lg px-4">
                          {text("إدخال الرقم الجديد", "Enter new number")}
                        </button>
                      )}
                    </>
                  ) : hasSavedSession && isLoggedOut ? (
                    <>
                      <button
                        type="button"
                        disabled={isReconnecting || !canRelink}
                        onClick={() => setConfirmMode("relink_same_number")}
                        className="gold-gradient-btn min-h-11 sm:min-h-11 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        <span>{text("إعادة ربط نفس الرقم (QR جديد)", "Re-link Same Number (New QR)")}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isReconnecting || !canRelink}
                        onClick={() => setConfirmMode("new_number")}
                        className="min-h-11 sm:min-h-11 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer disabled:opacity-50"
                      >
                        {text("تغيير الرقم (ربط رقم جديد)", "Connect New Number")}
                      </button>
                    </>
                  ) : noSavedSessionConfirmed ? (
                    <button
                      type="button"
                      disabled={isReconnecting || (!canReconnect && !canRelink)}
                      onClick={() => {
                        if (canReconnect) void handleReconnectSameNumber();
                        else if (canRelink) setConfirmMode("new_number");
                      }}
                      className="gold-gradient-btn min-h-11 sm:min-h-11 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isReconnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <QrCode className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{text("ربط رقم جديد (توليد رمز QR)", "Connect New Number (Generate QR)")}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isReconnecting || !canReconnect}
                        onClick={() => void handleReconnectSameNumber()}
                        className="gold-gradient-btn min-h-11 sm:min-h-11 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isReconnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span>{text("إعادة الاتصال بنفس الرقم", "Reconnect Same Number")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmMode("new_number")}
                        disabled={isReconnecting || !canRelink}
                        className="min-h-11 sm:min-h-11 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:bg-[var(--table-row-hover)] transition cursor-pointer disabled:opacity-50"
                      >
                        {text("تغيير الرقم (ربط رقم جديد)", "Connect New Number")}
                      </button>
                    </>
                  )}
                </div>
              )}
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
            <fieldset disabled={!canWrite || !statusQuery.canSend || isSending} className="space-y-4 disabled:opacity-65">
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

      {/* WhatsApp Interactive Flow Designer & Monitor */}
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

      {replacementOpen && (
        <Modal label={replacementTitle} onClose={() => setReplacementOpen(false)} isBusy={replacing}>
          <form onSubmit={handleReplaceRefused} className="mobile-dialog-panel theme-card w-full max-w-md rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold">{replacementTitle}</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {editingPending
                ? text("سيتم إلغاء محاولة الربط الحالية وإصدار رمز جديد للرقم الذي تؤكده.", "Confirm the sender to replace the current pairing attempt and issue a fresh QR.")
                : intentionallyRemoved
                ? text("أدخل الرقم الجديد ثم امسح رمز QR من هاتفه.", "Enter the new number, then scan the QR code from that phone.")
                : text("ستُزال جلسة الرقم المرفوض من ميقات. بعد ظهور رمز QR امسحه من الهاتف المرتبط بالرقم الجديد.", "Miqat will remove the refused number’s session. Scan the QR code from the phone registered to the new number.")}
            </p>
            {needsPreviousNumber && (
              <div className="space-y-1">
                <label htmlFor="wa-previous-phone" className="block text-sm font-medium">{text("رقم الإرسال السابق", "Previous sender number")}</label>
                <input id="wa-previous-phone" type="tel" dir="ltr" required autoComplete="off" maxLength={16}
                  value={previousPhone} onChange={event => setPreviousPhone(event.target.value)} disabled={replacing}
                  aria-describedby="wa-previous-hint" className="theme-input min-h-11 w-full rounded-lg px-3" />
                <p id="wa-previous-hint" className="text-xs text-[var(--text-muted)]">{text("تعذر قراءة الرقم القديم. تحقق منه من رسالة سابقة وأدخله مع رمز الدولة.", "Miqat could not identify the old sender. Confirm it from a previous message and include its country code.")}</p>
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="wa-replacement-phone" className="block text-sm font-medium">{text("رقم واتساب الجديد", "New WhatsApp number")}</label>
              <input id="wa-replacement-phone" type="tel" inputMode="tel" dir="ltr" autoComplete="off" required maxLength={32}
                value={replacementPhone} onChange={event => setReplacementPhone(event.target.value)} disabled={replacing}
                aria-describedby="wa-replacement-hint" className="theme-input min-h-11 w-full rounded-lg px-3" />
              <p id="wa-replacement-hint" className="text-xs text-[var(--text-muted)]">{text("استخدم رمز الدولة، مثال: ‎+9665XXXXXXXX", "Include the country code, for example +9665XXXXXXXX.")}</p>
            </div>
            {replacementError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{replacementError}</p>}
            <div className="flex justify-end flex-wrap gap-2">
              <button type="button" disabled={replacing} onClick={() => setReplacementOpen(false)} className="theme-input min-h-11 rounded-lg px-4">{text("إلغاء", "Cancel")}</button>
              <button type="submit" disabled={replacing || !canSubmitPairing} className="gold-gradient-btn min-h-11 rounded-lg px-4 disabled:opacity-50">
                {replacing ? text("جار تجهيز الربط…", "Preparing link…") : editingPending || intentionallyRemoved ? text("إظهار رمز الربط", "Show QR code") : text("إزالة القديم وتجهيز رمز الربط", "Remove old session and show QR")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        key={confirmMode ?? "closed"}
        isOpen={confirmMode !== null}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        confirmLabel={confirmDialogConfig.confirmLabel}
        cancelLabel={text("إلغاء", "Cancel")}
        variant={confirmDialogConfig.variant}
        onConfirm={handleConfirmSessionReset}
        onCancel={() => setConfirmMode(null)}
      />
    </div>
  );
}
