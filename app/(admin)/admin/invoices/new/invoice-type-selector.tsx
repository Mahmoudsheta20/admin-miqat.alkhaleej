"use client";

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
    description: "عرض أسعار أولي يتضمن بيانات الرحلة والآيبان البنكي SNB؛ لا يدخل في المحاسبة أو الضريبة حتى يعتمد.",
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
  const currentChoice: UnifiedDocChoice =
    documentType === "PROFORMA"
      ? "PROFORMA"
      : taxKind === "CREDIT"
        ? "CREDIT_NOTE"
        : taxKind === "DEBIT"
          ? "DEBIT_NOTE"
          : "CUSTOMER";

  return (
    <fieldset className="theme-card rounded-2xl p-5 sm:p-6 border theme-border">
      <legend className="sr-only">نوع المستند المطلوب إنشاؤه</legend>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            نوع المستند المطلوب
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            اختر طبيعة الفاتورة؛ يحدد هذا الاختيار كيفية معالجة المستند ضريبياً ومحاسبياً.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const isSelected = currentChoice === choice.id;
          const Icon = choice.icon;

          return (
            <label
              key={choice.id}
              className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all duration-200 ${
                isSelected
                  ? "border-amber-500 bg-amber-50/70 dark:bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40"
                  : "theme-border bg-white dark:bg-slate-900/60 hover:border-amber-400"
              }`}
            >
              <input
                type="radio"
                name="unifiedDocChoice"
                value={choice.id}
                checked={isSelected}
                onChange={() => onChangeType(choice.id)}
                className="mt-1 size-4 shrink-0 accent-amber-600"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {choice.title}
                    </span>
                  </div>
                  {choice.badge && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {choice.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {choice.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
