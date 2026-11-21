"use client";

import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useUiText } from "@/lib/ui-text";
import type { InvoiceBankDetails, InvoiceDocumentType, InvoiceLineInput } from "@/lib/invoices";
import InvoiceBankFields from "@/app/_components/InvoiceBankFields";
import InvoiceLineEditor from "./invoice-line-editor";
import type { FormLine } from "./invoice-form-types";

interface StagePriceTaxProps {
  documentType: InvoiceDocumentType;
  isTaxMode: boolean;
  rows: FormLine[];
  lineEstimates: { gross: string }[];
  creditCapError: string;
  hasBankDetails: boolean;
  bankDetails: InvoiceBankDetails & { iban: string; accountNumber: string; swiftCode: string };
  onUpdateRow: (id: string, change: Partial<InvoiceLineInput>) => void;
  onRemoveRow: (id: string) => void;
  onAddService: (description?: string) => void;
  onToggleBank: (enabled: boolean) => void;
  onChangeBank: (val: InvoiceBankDetails & { iban: string; accountNumber: string; swiftCode: string }) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StagePriceTax({
  documentType,
  isTaxMode,
  rows,
  lineEstimates,
  creditCapError,
  hasBankDetails,
  bankDetails,
  onUpdateRow,
  onRemoveRow,
  onAddService,
  onToggleBank,
  onChangeBank,
  onBack,
  onNext,
}: StagePriceTaxProps) {
  const ui = useUiText();

  return (
    <div className="space-y-5">
      <section className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
        <div className="border-b theme-border pb-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
              {ui("الخدمات والأسعار والمعاملة الضريبية")}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              {ui(
                "أدخل تفاصيل الخدمات، ويمكنك كتابة السعر قبل الضريبة أو السعر الإجمالي شامل 15%",
              )}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-gold)]">
            {ui("مثال: خدمة ٣٠٠ ر.س + ضريبة ٤٥ ر.س = ٣٤٥ ر.س إجمالي")}
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => (
            <InvoiceLineEditor
              key={row.id}
              isBooking={index === 0}
              index={index}
              value={row.input}
              canRemove={rows.length > 1 && index > 0}
              amount={lineEstimates[index]?.gross}
              onChange={(change) => onUpdateRow(row.id, change)}
              onRemove={() => onRemoveRow(row.id)}
            />
          ))}
        </div>

        {/* Add Service Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t theme-border">
          <button
            type="button"
            disabled={rows.length >= 200}
            onClick={() => onAddService()}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[var(--accent-gold)] transition cursor-pointer"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>{ui("إضافة خدمة جديدة")}</span>
          </button>
          {["رسوم نقل إضافية", "جولة سياحية وزيارات", "رسوم انتظار"].map(
            (label) => (
              <button
                key={label}
                type="button"
                disabled={rows.length >= 200}
                onClick={() => onAddService(label)}
                className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>{ui(label)}</span>
              </button>
            ),
          )}
        </div>

        {creditCapError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300"
          >
            {creditCapError}
          </div>
        )}
      </section>

      {/* Company Bank Details on Document (if proforma or tax) */}
      {(documentType === "PROFORMA" || isTaxMode) && (
        <InvoiceBankFields
          isEnabled={hasBankDetails}
          value={bankDetails}
          onToggle={onToggleBank}
          onChange={onChangeBank}
        />
      )}

      {/* Stage 3 Stepper Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-main)] transition cursor-pointer"
        >
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
          <span>{ui("السابق")}</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          className="gold-gradient-btn inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-lg px-5 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm hover:shadow-md transition"
        >
          <span>{ui("المتابعة: الدفع والمراجعة")}</span>
          <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
