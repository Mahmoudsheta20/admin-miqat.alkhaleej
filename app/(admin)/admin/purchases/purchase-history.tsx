"use client";
import { useUiText } from "@/lib/ui-text";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  accountingRequest,
  amountLabel,
  downloadAccounting,
  type AccountingFile,
  type PurchaseDetail,
} from "@/lib/accounting";
import { useAccountingQuery } from "@/lib/use-accounting-query";

interface PurchaseHistoryProps {
  id: string;
  onClose: () => void;
  onVoided: () => void;
}

export default function PurchaseHistory({ id, onClose, onVoided }: PurchaseHistoryProps) {
  const ui = useUiText();

  const dialog = useRef<HTMLDialogElement>(null);
  const { data, error, isLoading } = useAccountingQuery<PurchaseDetail>(`/purchases/${id}`);
  const [reload, setReload] = useState(0);
  const files = useAccountingQuery<{ items: AccountingFile[] }>(`/purchases/${id}/attachments`, reload);
  const [isUploading, setIsUploading] = useState(false);
  const [reason, setReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function cancel(event: FormEvent) {
    event.preventDefault();
    if (!data || isSaving) return;
    setIsSaving(true);
    setFailure("");
    const result = await accountingRequest(`/purchases/${id}`, "DELETE", {
      version: data.version,
      reason,
    });
    setIsSaving(false);
    if (result.success) onVoided();
    else setFailure(result.error || "تعذر إلغاء القيد");
  }

  async function upload(file: File) {
    setIsUploading(true);
    setFailure("");
    const body = new FormData();
    body.set("file", file);
    const result = await accountingRequest(`/purchases/${id}/attachments`, "POST", body);
    setIsUploading(false);
    if (result.success) setReload((v) => v + 1);
    else setFailure(result.error || "تعذر رفع الملف");
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
      onClose={onClose}
      aria-labelledby="purchase-history-title"
      className="theme-card mobile-dialog-panel m-auto max-h-[85dvh] w-[calc(100%_-_24px)] max-w-[600px] overflow-y-auto rounded-2xl p-6 text-[var(--text-main)] backdrop:bg-black/60"
      dir={ui.dir}
    >
      <header className="flex justify-between gap-4">
        <div className="min-w-0">
          <h2 id="purchase-history-title" className="text-xl font-bold">
            {ui("تفاصيل القيد وسجل المراجعة")}
          </h2>
          {data && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {data.supplierName} · <bdi className="font-mono">{data.invoiceNumber}</bdi>
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={onClose}
          aria-label={ui("إغلاق")}
          className="theme-card inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 shrink-0 self-start items-center justify-center rounded-lg p-2 cursor-pointer"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      {(error || failure) && (
        <p role="alert" className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-400">
          {ui(error || failure)}
        </p>
      )}
      {isLoading && (
        <p role="status" className="py-10 text-sm text-[var(--text-muted)]">
          {ui("جارٍ تحميل السجل…")}
        </p>
      )}

      {data && (
        <>
          <dl className="my-6 grid grid-cols-2 gap-4 rounded-xl border theme-border p-4 text-sm">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{ui("الإجمالي")}</dt>
              <dd className="mt-1 font-mono">
                <bdi dir="ltr">{amountLabel(data.totalAmount)} SAR</bdi>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{ui("الضريبة القابلة للخصم")}</dt>
              <dd className="mt-1 font-mono">
                <bdi dir="ltr">{amountLabel(data.recoverableVat)} SAR</bdi>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{ui("المستند المؤيد")}</dt>
              <dd className="mt-1">{data.evidenceReference || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{ui("تاريخ الاحتساب")}</dt>
              <dd className="mt-1 font-mono">
                <bdi dir="ltr">{data.vatDate}</bdi>
              </dd>
            </div>
          </dl>

          {data.notes && (
            <p className="mb-5 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
              {data.notes}
            </p>
          )}

          <section className="my-6 rounded-xl border theme-border p-4">
            <h3 className="font-bold">{ui("مرفقات فاتورة المورد")}</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {ui("PDF أو صورة، حتى 10 ميجابايت. التنزيل متاح للمسؤولين فقط.")}
            </p>
            <input
              type="file"
              aria-label={ui("رفع فاتورة المورد")}
              accept="application/pdf,image/png,image/jpeg,image/webp"
              disabled={isUploading}
              className="my-3 w-full text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
            {isUploading && (
              <p role="status" className="text-xs">
                {ui("جارٍ رفع المرفق…")}
              </p>
            )}
            {files.error && (
              <p role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-400">
                {ui(files.error)}
              </p>
            )}
            {files.data?.items.map((file) => (
              <button
                key={file.id}
                type="button"
                className="flex min-h-11 sm:min-h-9 w-full items-center py-2 text-start text-sm font-semibold text-[var(--accent-gold)] underline cursor-pointer"
                onClick={() =>
                  void downloadAccounting(`/attachments/${file.id}`, file.fileName).catch((e) =>
                    setFailure(e instanceof Error ? e.message : "تعذر التنزيل")
                  )
                }
              >
                <bdi>{file.fileName}</bdi> · <bdi dir="ltr">{Math.ceil(file.size / 1024)} KB</bdi>
              </button>
            ))}
          </section>

          <ol className="space-y-4">
            {data.audit.map((entry) => (
              <li key={entry.id} className="border-s-2 border-[var(--accent-gold)] ps-4">
                <p className="text-sm font-bold">
                  {ui(
                    {
                      CREATED: "تسجيل فاتورة المورد",
                      UPDATED: "تعديل القيد",
                      VOIDED: "إلغاء القيد",
                    }[entry.action] || entry.action
                  )}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {new Date(entry.createdAt).toLocaleString(ui.locale, {
                    timeZone: "Asia/Riyadh",
                    calendar: "gregory",
                  })}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">
                  {ui("المسؤول:")} <bdi>{entry.actorId}</bdi>
                </p>
              </li>
            ))}
          </ol>

          {data.voidedAt ? (
            <p className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {ui("القيد ملغى ولا يدخل في الإقرار:")} {data.voidReason}
            </p>
          ) : isVoiding ? (
            <form className="mt-7 space-y-3 border-t theme-border pt-5" onSubmit={cancel}>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {ui("الإلغاء يستبعد القيد من التقرير ويحتفظ بتاريخه. استخدمه لتصحيح تسجيل خاطئ، وليس بدلًا من إشعار دائن من المورد أو لتعديل إقرار سبق تقديمه.")}
              </p>
              <label className="block text-sm font-bold">
                {ui("سبب إلغاء القيد")}
                <input
                  autoFocus
                  required
                  minLength={3}
                  maxLength={200}
                  className="theme-input mt-2 h-11 w-full rounded-xl px-3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-11 rounded-xl bg-rose-700 hover:bg-rose-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
                >
                  {ui("تأكيد إلغاء القيد")}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsVoiding(false)}
                  className="theme-card min-h-11 rounded-xl border theme-border px-4 py-3 text-sm cursor-pointer"
                >
                  {ui("رجوع")}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsVoiding(true)}
              className="mt-7 min-h-11 rounded-xl border border-rose-300 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-800 dark:text-rose-400 cursor-pointer"
            >
              {ui("إلغاء قيد مسجل بالخطأ")}
            </button>
          )}
        </>
      )}
    </dialog>
  );
}
