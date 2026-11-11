"use client";
import { useUiText } from "@/lib/ui-text";

import { useEffect, useState } from "react";
import {
  invoiceRequest,
  type InvoiceDetail,
  type TaxDocument,
} from "@/lib/invoices";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";

interface OriginalOption {
  id: string;
  invoiceNumber: string;
  customerName: string;
}

interface InvoiceTaxFieldsProps {
  value: TaxDocument;
  original: InvoiceDetail | null;
  onChange: (value: TaxDocument) => void;
  onSelectOriginal: (id: string) => void;
}

const INLINE_INPUT = "theme-input min-h-12 w-full rounded-xl px-3.5 py-2.5 text-base";
const INPUT = `mt-2 ${INLINE_INPUT}`;

export default function InvoiceTaxFields({
  value,
  original,
  onChange,
  onSelectOriginal,
}: InvoiceTaxFieldsProps) {
  const ui = useUiText();

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<OriginalOption[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (value.kind === "INVOICE") return;
    let active = true;
    const timer = setTimeout(() => {
      void invoiceRequest<{ items: OriginalOption[] }>(
        `/tax-originals?search=${encodeURIComponent(search)}`,
      ).then((result) => {
        if (active) {
          setItems(result.data?.items || []);
          setError(result.error || "");
        }
      });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, value.kind]);

  return (
    <section className="theme-card rounded-2xl p-5 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
        {ui("نوع المستند الضريبي")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        {ui("اختر نوع المستند الضريبي وتصنيفه وتاريخ التوريد الفعلي.")}
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FullscreenSelect
          label={ui("المستند")}
          searchable={false}
          value={value.kind}
          onChange={(nextKind) =>
            onChange({
              ...value,
              kind: nextKind as TaxDocument["kind"],
              originalInvoiceId: undefined,
              adjustmentReason: undefined,
              adjustmentEventDate: undefined,
            })
          }
          options={[
            { value: "INVOICE", label: ui("فاتورة ضريبية") },
            { value: "CREDIT", label: ui("إشعار دائن / إلغاء أو استرداد") },
            { value: "DEBIT", label: ui("إشعار مدين / رسوم إضافية") },
          ]}
        />

        <FullscreenSelect
          label={ui("تصنيف الفاتورة")}
          searchable={false}
          disabled={Boolean(original)}
          value={value.profile}
          onChange={(nextProfile) =>
            onChange({
              ...value,
              profile: nextProfile as TaxDocument["profile"],
            })
          }
          options={[
            { value: "SIMPLIFIED", label: ui("ضريبية مبسطة (أفراد)") },
            { value: "STANDARD", label: ui("ضريبية (منشآت)") },
          ]}
        />

        <label className="text-sm sm:text-[0.9375rem] font-semibold text-[var(--text-main)]">
          {ui("تاريخ التوريد / الرحلة")}
          <input
            required
            type="date"
            className={INPUT}
            value={value.supplyDate}
            onChange={(event) =>
              onChange({ ...value, supplyDate: event.target.value })
            }
          />
        </label>

        {value.kind !== "INVOICE" && (
          <>
            <label className="text-sm sm:text-[0.9375rem] font-semibold text-[var(--text-main)]">
              {ui("تاريخ واقعة الإلغاء أو الرسوم *")}
              <input
                required
                type="date"
                className={INPUT}
                value={value.adjustmentEventDate || ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    adjustmentEventDate: event.target.value,
                  })
                }
              />
              <span className="mt-1.5 block text-sm font-normal text-[var(--text-muted)]">
                {ui("يحدد فترة احتساب الزيادة للمدين؛ تخفيض الدائن يكون عند الإصدار أو الواقعة أيهما لاحق.")}
              </span>
            </label>

            <div className="sm:col-span-2">
              <FullscreenSelect
                label={ui("الفاتورة الأصلية")}
                required
                searchable
                columns={2}
                clearable
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder={ui("رقم الفاتورة أو اسم العميل")}
                placeholder={ui("اختر الفاتورة الأصلية")}
                value={value.originalInvoiceId || ""}
                onChange={(nextId) => onSelectOriginal(nextId)}
                options={[
                  ...(original && !items.some((item) => item.id === original.id)
                    ? [
                        {
                          value: original.id,
                          label: `${original.invoiceNumber} · ${original.customerName}`,
                          badge: original.invoiceNumber,
                        },
                      ]
                    : []),
                  ...items.map((item) => ({
                    value: item.id,
                    label: `${item.invoiceNumber} · ${item.customerName}`,
                    badge: item.invoiceNumber,
                    keywords: `${item.invoiceNumber} ${item.customerName}`,
                  })),
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <ExpandableField
                label={ui("سبب إصدار الإشعار")}
                required
                maxLength={200}
                placeholder={ui(
                  value.kind === "CREDIT"
                    ? "مثل: إلغاء الرحلة أو استرداد جزئي"
                    : "مثل: تغيير المسار أو ترقية المركبة",
                )}
                value={value.adjustmentReason || ""}
                onApply={(adjustmentReason) =>
                  onChange({ ...value, adjustmentReason })
                }
              >
                <input
                  required
                  maxLength={200}
                  className={INLINE_INPUT}
                  placeholder={ui(
                    value.kind === "CREDIT"
                      ? "مثل: إلغاء الرحلة أو استرداد جزئي"
                      : "مثل: تغيير المسار أو ترقية المركبة",
                  )}
                  value={value.adjustmentReason || ""}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      adjustmentReason: event.target.value,
                    })
                  }
                />
              </ExpandableField>
            </div>

            <p className="text-sm text-[var(--text-muted)] sm:col-span-2">
              {ui("تُنسخ بيانات العميل والتصنيف من الفاتورة الأصلية، ويمكن تعديل قيم الخدمات للإشعار.")}
            </p>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">
          {ui(error)}
        </p>
      )}
    </section>
  );
}
