"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  AlertCircle,
  BellRing,
  CheckCircle2,
  Loader2,
  MousePointerClick,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Workflow,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/languageContext";
import { useApiQuery } from "@/lib/use-api-query";
import {
  sendWhatsAppFlowTest,
  triggerWhatsAppFlowAction,
  updateWhatsAppFlowConfig,
  type WhatsAppFlowConfig,
  type WhatsAppFlowOverview,
  type WhatsAppFlowStatus,
} from "@/lib/whatsapp";

const DEFAULT_ADMIN_PHONE = "+966577842926";

const STATUS_BADGE_MAP: Record<
  WhatsAppFlowStatus,
  { ar: string; en: string; cls: string }
> = {
  SENT: {
    ar: "مُرسل للكابتن",
    en: "Sent to Captain",
    cls: "bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
  ACKNOWLEDGED: {
    ar: "تم الاستلام",
    en: "Acknowledged",
    cls: "bg-sky-500/12 text-sky-800 dark:text-sky-300 border-sky-500/35",
  },
  ARRIVED: {
    ar: "وصل للموقع",
    en: "Captain Arrived",
    cls: "bg-emerald-500/14 text-emerald-800 dark:text-emerald-300 border-emerald-600/35",
  },
  STARTED: {
    ar: "جاري التنفيذ",
    en: "Trip Started",
    cls: "bg-amber-500/12 text-amber-900 dark:text-amber-300 border-amber-500/35",
  },
  COMPLETED: {
    ar: "رحلة مكتملة",
    en: "Completed",
    cls: "bg-emerald-600/15 text-emerald-900 dark:text-emerald-200 border-emerald-600/40",
  },
  SUPPORT_NEEDED: {
    ar: "طلب مساعدة",
    en: "Support Needed",
    cls: "bg-rose-500/12 text-rose-800 dark:text-rose-300 border-rose-500/35",
  },
  CLOSED: {
    ar: "مغلق",
    en: "Closed",
    cls: "bg-slate-500/10 text-[var(--text-muted)] border-[var(--control-border)]",
  },
};

export default function WhatsAppFlowPanel({
  waConnected,
}: {
  waConnected: boolean;
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const text = useCallback(
    (ar: string, en: string) => (isAr ? ar : en),
    [isAr],
  );

  const flowQuery = useApiQuery<Omit<WhatsAppFlowOverview, "success">>("/whatsapp/flow");
  const overview = flowQuery.data;
  const [draftEdits, setDraftConfig] = useState<WhatsAppFlowConfig | null>(null);
  const draftConfig = draftEdits ?? overview?.config ?? null;
  const hasUnsavedChanges = Boolean(draftEdits && overview &&
    JSON.stringify(draftEdits) !== JSON.stringify(overview.config));
  const isLoading = flowQuery.isLoading;
  const loadError = flowQuery.error;
  const loadFlow = flowQuery.refetch;
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [triggerBusyKey, setTriggerBusyKey] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !flowQuery.isFetching) loadFlow();
    }, 15000);
    return () => clearInterval(timer);
  }, [loadFlow, flowQuery.isFetching]);

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    if (!draftConfig || isSaving) return;
    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const saved = await updateWhatsAppFlowConfig(draftConfig);
      setDraftConfig(saved);
      loadFlow();
      setSaveMessage(
        text(
          "تم حفظ إعدادات نظام التدفق والأزرار التفاعلية بنجاح.",
          "WhatsApp flow configuration and action buttons saved.",
        ),
      );
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : text("تعذر حفظ الإعدادات", "Failed to save flow config"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendFlowTest() {
    if (isTesting || hasUnsavedChanges || !waConnected) return;
    setIsTesting(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const res = await sendWhatsAppFlowTest();
      setSaveMessage(
        res.message ||
          text(
            `تمت جدولة رسالة اختبار التدفق إلى ${draftConfig?.adminPhone || DEFAULT_ADMIN_PHONE}`,
            `Flow test message queued to ${draftConfig?.adminPhone || DEFAULT_ADMIN_PHONE}`,
          ),
      );
      void loadFlow();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : text("تعذر إرسال رسالة اختبار التدفق", "Failed to queue flow test"),
      );
    } finally {
      setIsTesting(false);
    }
  }

  async function handleTriggerStep(params: {
    sessionId: string;
    role: "CAPTAIN" | "ADMIN";
    actionId: string;
  }) {
    if (triggerBusyKey || isSaving || isTesting) return;
    const busyKey = `${params.sessionId}:${params.role}:${params.actionId}`;
    setTriggerBusyKey(busyKey);
    setSaveError("");
    setSaveMessage("");
    try {
      await triggerWhatsAppFlowAction(params);
      setSaveMessage(params.role === "CAPTAIN"
        ? text("تم تسجيل تحديث الكابتن. راجع سجل الأحداث لتأكيد الإشعارات.", "Captain update recorded. Check the event log for notification results.")
        : text("تم تسجيل إجراء الإدارة. راجع سجل الأحداث لتأكيد إرسال التوجيه.", "Admin action recorded. Check the event log for dispatch confirmation."));
      await loadFlow();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : text("تعذر تنفيذ خطوة التدفق", "Failed to execute flow step"),
      );
    } finally {
      setTriggerBusyKey(null);
    }
  }

  if (isLoading) {
    return (
      <section className="theme-card rounded-2xl p-6 flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-gold)]" aria-hidden="true" />
        <span>{text("جارٍ تحميل نظام التدفق التفاعلي...", "Loading WhatsApp Flow engine...")}</span>
      </section>
    );
  }

  return (
    <section className="theme-card rounded-2xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
            <Workflow className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
              {text(
                "نظام التدفق التفاعلي وإشعارات الإدارة",
                "Interactive WhatsApp Flow & Admin Notifications",
              )}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {text(
                `إشعار فوري لرقم الإدارة (${draftConfig?.adminPhone || DEFAULT_ADMIN_PHONE}) عند كل عملية مع أزرار تفاعلية للكابتن والإدارة.`,
                `Mirrors contract/invoice/arrival events to admin phone (${draftConfig?.adminPhone || DEFAULT_ADMIN_PHONE}) with interactive buttons.`,
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {overview && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="rounded-lg border theme-border bg-[var(--bg-card-subtle)] px-2.5 py-1 text-[var(--text-main)]">
                {text("تدفقات نشطة:", "Active:")} {overview.stats.activeSessions}
              </span>
              <span className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-800 dark:text-emerald-300">
                {text("وصل للموقع:", "Arrived:")} {overview.stats.arrivedSessions}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void loadFlow()}
            className="min-h-11 sm:min-h-11 px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-card-subtle)] hover:bg-[var(--table-row-hover)] text-xs font-bold text-[var(--text-main)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{text("تحديث", "Refresh")}</span>
          </button>

          <button
            type="button"
            disabled={!waConnected || isTesting || hasUnsavedChanges || isSaving || Boolean(loadError)}
            onClick={() => void handleSendFlowTest()}
            className="min-h-11 sm:min-h-11 px-3.5 py-1.5 rounded-lg border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{text("اختبار إشعار الإدارة", "Send Test Flow")}</span>
          </button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border theme-border bg-[var(--accent-surface)] p-4 text-sm text-[var(--text-main)]">
          <span>{text("تغييرات غير محفوظة. احفظ الإعدادات قبل اختبار إشعار الإدارة.", "Unsaved changes. Save settings before sending a test notification.")}</span>
          <button type="button" disabled={isSaving} onClick={() => setDraftConfig(null)} className="min-h-11 px-3 underline underline-offset-4 disabled:opacity-50">
            {text("تجاهل التغييرات", "Discard changes")}
          </button>
        </div>
      )}

      {(loadError || saveError) && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{loadError || saveError}</span>
        </div>
      )}

      {saveMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-600/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{saveMessage}</span>
        </div>
      )}

      {draftConfig && (
        <form onSubmit={handleSaveConfig} className="space-y-5">
          <fieldset disabled={isSaving} className="min-w-0 space-y-5">
          {/* Core Settings Grid */}
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs sm:text-sm text-[var(--text-main)]">
                  <Checkbox
                    checked={draftConfig.enabled}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, enabled: e.target.checked })
                    }
                  />
                  <span>{text("تفعيل نظام التدفق التلقائي", "Enable WhatsApp Flow System")}</span>
                </label>
              </div>

              <div>
                <label
                  htmlFor="wa-flow-admin-phone"
                  className="block text-xs font-bold text-[var(--text-main)] mb-1"
                >
                  {text("رقم الإدارة لمتابعة جميع التدفقات", "Admin Notification Phone")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="wa-flow-admin-phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    required
                    value={draftConfig.adminPhone}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, adminPhone: e.target.value })
                    }
                    className="theme-input flex-1 min-h-11 sm:min-h-11 rounded-lg px-3 py-1.5 text-sm font-mono text-start"
                  />
                  <button
                    type="button"
                    title={text("استعادة الرقم الافتراضي +966577842926", "Restore +966577842926")}
                    onClick={() =>
                      setDraftConfig({ ...draftConfig, adminPhone: DEFAULT_ADMIN_PHONE })
                    }
                    className="min-h-11 sm:min-h-11 px-3 rounded-lg border theme-border bg-[var(--bg-card)] hover:bg-[var(--table-row-hover)] text-xs font-bold text-[var(--text-main)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span dir="ltr">{DEFAULT_ADMIN_PHONE}</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="wa-flow-mode"
                  className="block text-xs font-bold text-[var(--text-main)] mb-1"
                >
                  {text("نمط الأزرار التفاعلية", "Interactive Button Mode")}
                </label>
                <select
                  id="wa-flow-mode"
                  value={draftConfig.interactiveMode}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      interactiveMode:
                        e.target.value === "text_only"
                          ? "text_only"
                          : e.target.value === "reactions_only"
                            ? "reactions_only"
                            : "reactions_and_links",
                    })
                  }
                  className="theme-input w-full min-h-11 sm:min-h-11 rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                >
                  <option value="reactions_and_links">
                    {text(
                      "تفاعل بالإيموجي + روابط رد سريع (موصى به)",
                      "Emoji reactions + tap-to-reply links (Recommended)",
                    )}
                  </option>
                  <option value="reactions_only">
                    {text(
                      "تفاعل بالإيموجي على رسالة العقد فقط",
                      "Emoji reactions on the contract only",
                    )}
                  </option>
                  <option value="text_only">
                    {text(
                      "إرسال رقم الخطوة نصياً فقط",
                      "Numbered text replies only",
                    )}
                  </option>
                </select>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {draftConfig.interactiveMode === "text_only"
                    ? text(
                        "يرسل الكابتن رقم الخطوة (1، 2، 3...) في المحادثة.",
                        "The captain replies with the step number (1, 2, 3...).",
                      )
                    : draftConfig.interactiveMode === "reactions_only"
                      ? text(
                          "يضغط الكابتن مطولاً على رسالة العقد ويختار الإيموجي المناسب.",
                          "The captain long-presses the contract and picks the emoji.",
                        )
                      : text(
                          "يضغط الكابتن مطولاً على رسالة العقد ويختار الإيموجي، أو يضغط رابطاً يفتح رداً جاهزاً للإرسال.",
                          "The captain long-presses the contract and picks the emoji, or taps a link that opens a ready reply.",
                        )}
                </p>
              </div>
            </div>

            {/* Event & Auto-Send Toggles */}
            <div className="lg:col-span-7 rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <BellRing className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  {text("مسارات الإشعار والإرسال التلقائي", "Flow Triggers & Form Defaults")}
                </h3>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                {(
                  [
                    [
                      "notifyOnContractSent",
                      "إشعار الإدارة عند إرسال أي عقد للكابتن",
                      "Notify admin when any contract is sent to captain",
                    ],
                    [
                      "notifyOnCaptainAction",
                      "إشعار الإدارة فور تفاعل الكابتن أو وصوله",
                      "Notify admin when the captain reacts or arrives",
                    ],
                    [
                      "notifyOnInvoiceSent",
                      "إشعار الإدارة عند إرسال أي فاتورة للعميل",
                      "Notify admin when any invoice is sent",
                    ],
                    [
                      "autoReplyToCaptain",
                      "رد تأكيد تلقائي للكابتن بعد كل تحديث",
                      "Auto-reply confirmation to captain after each update",
                    ],
                    [
                      "includeActionMenuOnContract",
                      "إضافة دليل التفاعل وروابط الرد لرسالة العقد",
                      "Add reaction guide and reply links to the contract message",
                    ],
                    [
                      "includeAdminActionButtons",
                      "إضافة إجراءات مرقّمة لإشعار الإدارة",
                      "Add numbered quick actions to admin alerts",
                    ],
                    [
                      "autoSendContractDefault",
                      "تفعيل الإرسال التلقائي افتراضياً في نموذج العقد",
                      "Default auto-send ON in Create Contract form",
                    ],
                    [
                      "autoSendInvoiceDefault",
                      "تفعيل الإرسال التلقائي افتراضياً في نموذج الفاتورة",
                      "Default auto-send ON in Create Invoice form",
                    ],
                  ] as const
                ).map(([key, arLabel, enLabel]) => (
                  <label
                    key={key}
                    className="flex min-h-10 items-center gap-2.5 rounded-lg border theme-border bg-[var(--bg-card)] px-3 py-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={Boolean(draftConfig[key])}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          [key]: e.target.checked,
                        })
                      }
                    />
                    <span className="font-semibold text-[var(--text-main)]">
                      {text(arLabel, enLabel)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Action Buttons Builder */}
          <details className="rounded-xl border theme-border p-4">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold text-[var(--text-main)]">
              {text("تخصيص التفاعلات وتوجيهات الإدارة", "Customize reactions and admin instructions")}
            </summary>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Captain Buttons */}
            <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                    {text(
                      "خطوات الكابتن (تفاعل على رسالة العقد)",
                      "Captain Steps (Reactions on the Contract)",
                    )}
                  </h3>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {text("إيموجي لكل خطوة", "One emoji per step")}
                </span>
              </div>

              <div className="space-y-2.5">
                {draftConfig.captainButtons.map((btn, idx) => (
                  <div
                    key={btn.id}
                    className="rounded-lg border theme-border bg-[var(--bg-card)] p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--text-main)]">
                        <Checkbox
                          checked={btn.enabled}
                          onChange={(e) => {
                            const next = [...draftConfig.captainButtons];
                            next[idx] = { ...btn, enabled: e.target.checked };
                            setDraftConfig({ ...draftConfig, captainButtons: next });
                          }}
                        />
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--accent-surface)] text-[var(--accent-gold)] font-mono text-[11px]">
                          {btn.code}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {btn.targetStatus}
                        </span>
                      </label>
                    </div>

                    <div className="grid gap-2 grid-cols-[4rem_1fr] sm:grid-cols-[4rem_1fr_1fr]">
                      <input
                        type="text"
                        aria-label={`${btn.code} reaction emoji`}
                        value={btn.emoji}
                        maxLength={8}
                        onChange={(e) => {
                          const next = [...draftConfig.captainButtons];
                          next[idx] = { ...btn, emoji: e.target.value.trim() };
                          setDraftConfig({ ...draftConfig, captainButtons: next });
                        }}
                        className="theme-input min-h-11 rounded-lg px-2 py-1 text-center text-lg"
                      />
                      <input
                        type="text"
                        aria-label={`${btn.code} button label`}
                        value={btn.labelAr}
                        onChange={(e) => {
                          const next = [...draftConfig.captainButtons];
                          next[idx] = { ...btn, labelAr: e.target.value };
                          setDraftConfig({ ...draftConfig, captainButtons: next });
                        }}
                        className="theme-input min-h-11 rounded-lg px-2.5 py-1 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        aria-label={`${btn.code} admin alert`}
                        value={btn.adminNoticeTitleAr}
                        onChange={(e) => {
                          const next = [...draftConfig.captainButtons];
                          next[idx] = { ...btn, adminNoticeTitleAr: e.target.value };
                          setDraftConfig({ ...draftConfig, captainButtons: next });
                        }}
                        className="theme-input col-span-2 sm:col-span-1 min-h-11 rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Buttons */}
            <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                    {text(
                      `أزرار الإدارة التفاعلية (${draftConfig.adminPhone})`,
                      `Admin Follow-up Buttons (${draftConfig.adminPhone})`,
                    )}
                  </h3>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {text("عند استلام تحديث الكابتن", "On captain status updates")}
                </span>
              </div>

              <div className="space-y-2.5">
                {draftConfig.adminActionButtons.map((btn, idx) => (
                  <div
                    key={btn.id}
                    className="rounded-lg border theme-border bg-[var(--bg-card)] p-3 space-y-2"
                  >
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--text-main)]">
                      <Checkbox
                        checked={btn.enabled}
                        onChange={(e) => {
                          const next = [...draftConfig.adminActionButtons];
                          next[idx] = { ...btn, enabled: e.target.checked };
                          setDraftConfig({ ...draftConfig, adminActionButtons: next });
                        }}
                      />
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 font-mono text-[11px]">
                        {btn.code}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {text(btn.labelAr, btn.labelEn)}
                      </span>
                    </label>
                    <input
                      type="text"
                      aria-label={`${btn.code} admin button caption`}
                      value={btn.labelAr}
                      onChange={(e) => {
                        const next = [...draftConfig.adminActionButtons];
                        next[idx] = { ...btn, labelAr: e.target.value };
                        setDraftConfig({ ...draftConfig, adminActionButtons: next });
                      }}
                      className="theme-input w-full min-h-11 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          </details>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="gold-gradient-btn min-h-11 sm:min-h-11 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{text("حفظ إعدادات التدفق والأزرار", "Save Flow Settings")}</span>
            </button>
          </div>
          </fieldset>
        </form>
      )}

      {/* Active Flow Sessions & Recent Audit Log */}
      {overview && (
        <div className="grid gap-4 lg:grid-cols-12 pt-2 border-t theme-border">
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
              {text("متابعة جلسات العقود التفاعلية", "Live Contract Flow Sessions")}
            </h3>
            {overview.sessions.length === 0 ? (
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 text-xs text-[var(--text-muted)]">
                {text(
                  "لا توجد جلسات تدفق مسجلة بعد. عند إرسال أي عقد للكابتن سيظهر هنا مع أزرار المتابعة.",
                  "No contract flow sessions yet. Send a contract to a captain to see live tracking here.",
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pe-1">
                {overview.sessions.slice(0, 12).map((session) => {
                  const badge = STATUS_BADGE_MAP[session.status];
                  const activeCapButtons = (
                    draftConfig?.captainButtons || []
                  ).filter((b) => b.enabled);
                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--accent-gold)]">
                            {session.referenceNumber}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-main)]">
                            {session.captainName}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]" dir="ltr">
                            {session.captainPhone}
                          </span>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}
                        >
                          {text(badge.ar, badge.en)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--text-muted)]">
                        {session.origin} {" ← "} {session.destination} · {session.tripDate} {session.tripTime}
                      </p>

                      <p className="text-xs text-[var(--text-muted)]">{text("تسجيل تحديث الكابتن يدوياً باسم الإدارة", "Record a captain update on behalf of the admin")}</p>
                      {activeCapButtons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {activeCapButtons.map((btn) => {
                            const key = `${session.id}:CAPTAIN:${btn.id}`;
                            const busy = triggerBusyKey === key;
                            return (
                              <button
                                key={btn.id}
                                type="button"
                                disabled={Boolean(triggerBusyKey) || !overview.config.enabled || session.status === "COMPLETED" || session.status === "CLOSED"}
                                onClick={() =>
                                  void handleTriggerStep({
                                    sessionId: session.id,
                                    role: "CAPTAIN",
                                    actionId: btn.id,
                                  })
                                }
                                className="min-h-11 px-3 py-2 rounded-lg border theme-border bg-[var(--bg-card)] hover:border-[var(--accent-gold)] text-[11px] font-semibold text-[var(--text-main)] transition cursor-pointer disabled:opacity-50"
                              >
                                {busy ? "..." : text(btn.labelAr, btn.labelEn)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {overview.config.adminActionButtons.some(button => button.enabled) && (
                        <div className="space-y-2 border-t theme-border pt-3">
                          <p className="text-xs text-[var(--text-muted)]">{text("توجيه للكابتن", "Send an instruction to the captain")}</p>
                          <div className="flex flex-wrap gap-2">
                            {overview.config.adminActionButtons.filter(button => button.enabled).map(button => (
                              <button key={button.id} type="button"
                                disabled={Boolean(triggerBusyKey) || !waConnected || !overview.config.enabled || session.status === "CLOSED" || session.status === "COMPLETED" && button.nextStatus !== "CLOSED"}
                                onClick={() => void handleTriggerStep({ sessionId: session.id, role: "ADMIN", actionId: button.id })}
                                className="min-h-11 rounded-lg border theme-border bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-main)] disabled:opacity-50">
                                {triggerBusyKey === `${session.id}:ADMIN:${button.id}` ? text("جارٍ التنفيذ…", "Working…") : text(button.labelAr, button.labelEn)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
              {text("سجل أحداث التدفق", "Recent Flow Events")}
            </h3>
            {overview.events.length === 0 ? (
              <div className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-4 text-xs text-[var(--text-muted)]">
                {text("لا توجد أحداث تدفق مسجلة بعد.", "No flow events logged yet.")}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pe-1">
                {overview.events.slice(0, 20).map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-xl border theme-border bg-[var(--bg-card-subtle)] p-3 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--text-main)]">{evt.label}</span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]" dir="ltr">
                        {new Date(evt.timestamp).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      {evt.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
