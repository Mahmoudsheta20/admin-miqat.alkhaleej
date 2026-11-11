"use client";

import { useState, type FormEvent } from "react";
import { Archive, RotateCcw } from "lucide-react";
import Modal from "@/app/_components/Modal";
import { useLanguage } from "@/lib/languageContext";
import { invoiceRequest } from "@/lib/invoices";

interface Props {
  id: string;
  number: string;
  isArchived?: boolean;
  onChanged: () => void;
}

export default function InvoiceVisibilityAction({
  id,
  number,
  isArchived = false,
  onChanged,
}: Props) {
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const label = isArchived
    ? isRTL
      ? "استعادة الفاتورة"
      : "Restore invoice"
    : isRTL
      ? "إزالة الفاتورة من القائمة"
      : "Remove invoice from list";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    const result = await invoiceRequest(
      isArchived ? `/${id}/restore` : `/${id}`,
      isArchived ? "POST" : "DELETE",
      { reason }
    );
    setIsSaving(false);
    if (result.success) {
      setIsOpen(false);
      onChanged();
    } else {
      setError(
        result.error ||
          (isRTL ? "تعذر تغيير حالة الفاتورة" : "Unable to update invoice visibility")
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReason("");
          setError("");
          setIsOpen(true);
        }}
        className="inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition cursor-pointer"
        aria-label={`${label} ${number}`}
        title={label}
      >
        {isArchived ? (
          <RotateCcw className="size-4" aria-hidden="true" />
        ) : (
          <Archive className="size-4" aria-hidden="true" />
        )}
        <span>
          {isArchived ? (isRTL ? "استعادة" : "Restore") : isRTL ? "إزالة" : "Remove"}
        </span>
      </button>

      {isOpen && (
        <Modal label={label} onClose={() => setIsOpen(false)} isBusy={isSaving}>
          <form
            onSubmit={submit}
            className="mobile-dialog-panel theme-card m-auto w-full max-w-lg space-y-5 rounded-2xl border theme-border p-5 sm:p-7"
          >
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">{label}</h2>
              <p className="mt-2 font-mono text-sm text-[var(--accent-gold)]" dir="ltr">
                {number}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {isArchived
                ? isRTL
                  ? "ستعود الفاتورة إلى القائمة الرئيسية. تبقى بياناتها وحركاتها المالية كما هي."
                  : "The invoice will return to the main list. Its document and financial entries stay unchanged."
                : isRTL
                  ? "ستنتقل الفاتورة إلى قائمة المحذوفات ويمكن استعادتها. هذه الإزالة لا تلغي الفاتورة أو دفعاتها ولا تستبعدها من الضريبة. لتخفيض فاتورة صادرة، استخدم إشعارًا دائنًا."
                  : "The invoice will move to Removed invoices and can be restored. This does not cancel the invoice or its payments, or remove it from VAT. Use a credit note to reduce an issued invoice."}
            </p>
            <label className="block text-sm font-bold text-[var(--text-main)]">
              {isRTL ? "سبب الإجراء" : "Reason"}
              <textarea
                required
                minLength={3}
                maxLength={500}
                rows={3}
                className="theme-input mt-2 w-full rounded-xl p-3 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                autoFocus
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-bold text-rose-700 dark:text-rose-400">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
                className="min-h-11 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)] px-4 py-2.5 text-sm font-bold transition cursor-pointer"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="gold-gradient-btn min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (isRTL ? "جارٍ الحفظ…" : "Saving…") : label}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
