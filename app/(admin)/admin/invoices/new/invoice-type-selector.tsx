"use client";
import { useUiText } from "@/lib/ui-text";


import { FileSpreadsheet, MinusCircle, PlusCircle, ReceiptText } from "lucide-react";
import type { InvoiceDocumentType, TaxDocument } from "@/lib/invoices";

export type UnifiedDocChoice = "CUSTOMER" | "PROFORMA" | "CREDIT_NOTE" | "DEBIT_NOTE";

interface InvoiceTypeSelectorProps {
  documentType: InvoiceDocumentType;
  taxKind?: TaxDocument["kind"];
  onChangeType: (choice: UnifiedDocChoice) => void;
}

const CHOICES: {
  id: UnifiedDocChoice;
  title: string;
  badge?: string;
  description: string;
  icon: typeof ReceiptText;
}[] = [
  {
    id: "CUSTOMER",
    title: "فاتورة للعميل",
    badge: "مستند نهائي",
    description: "مستند مالي معتمد لقيمة الخدمة والرحلة، يشمل رمز الفاتورة الضريبية ZATCA والترحيل المحاسبي.",
    icon: ReceiptText,
  },
  {
    id: "PROFORMA",
    title: "فاتورة مبدئية",
    badge: "عرض أسعار",
    description: "عرض أسعار أولي يتضمن بيانات الرحلة والبيانات البنكية؛ لا يدخل في المحاسبة أو الضريبة. لإثبات المبيعات، أصدر فاتورة فعلية.",
    icon: FileSpreadsheet,
  },
  {
    id: "CREDIT_NOTE",
    title: "خفض قيمة فاتورة سابقة",
    badge: "إشعار دائن",
    description: "مستند رسمي لتخفيض أو إلغاء جزء من فاتورة سابقة؛ يُربط بالفاتورة الأصلية ويُخفض ضريبة المبيعات.",
    icon: MinusCircle,
  },
  {
    id: "DEBIT_NOTE",
    title: "إضافة مبلغ إلى فاتورة سابقة",
    badge: "إشعار مدين",
    description: "مستند رسمي لإضافة رسوم أو تمديد رحلة على فاتورة سابقة؛ يُربط بالفاتورة الأصلية ويُضاف لضريبة المبيعات.",
    icon: PlusCircle,
  },
];

export default function InvoiceTypeSelector({
  documentType,
  taxKind = "INVOICE",
  onChangeType,
}: InvoiceTypeSelectorProps) {
  const ui = useUiText();

  const currentChoice: UnifiedDocChoice =
    documentType === "PROFORMA"
      ? "PROFORMA"
      : taxKind === "CREDIT"
        ? "CREDIT_NOTE"
        : taxKind === "DEBIT"
          ? "DEBIT_NOTE"
          : "CUSTOMER";

  return (
    <fieldset className="theme-card rounded-2xl p-4 sm:p-5 border theme-border">
      <legend className="sr-only">{ui("نوع المستند المطلوب إنشاؤه")}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-main)]">
            {ui("نوع المستند المطلوب")}</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">
            {ui("اختر طبيعة الفاتورة؛ يحدد هذا الاختيار كيفية معالجة المستند ضريبياً ومحاسبياً.")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const isSelected = currentChoice === choice.id;
          const Icon = choice.icon;

          return (
            <label
              key={choice.id}
              className={`relative flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 sm:p-4 transition-all duration-200 ${
                isSelected
                  ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] ring-1 ring-[var(--accent-gold)]/40"
                  : "border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/55"
              }`}
            >
              <input
                type="radio"
                name="unifiedDocChoice"
                value={choice.id}
                checked={isSelected}
                onChange={() => onChangeType(choice.id)}
                className="mt-1 size-4 shrink-0 accent-amber-700 dark:accent-amber-400"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 ${isSelected ? "text-[var(--accent-gold)]" : "text-[var(--text-muted)]"}`} />
                    <span className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
                      {ui(choice.title)}
                    </span>
                  </div>
                  {choice.badge && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        isSelected
                          ? "bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]"
                          : "bg-[var(--bg-card-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      {ui(choice.badge)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--text-muted)]">
                  {ui(choice.description)}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
