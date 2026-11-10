"use client";
import { useUiText } from "@/lib/ui-text";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";

export interface InvoiceBankForm {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
}
export const EMPTY_BANK: InvoiceBankForm = {
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  iban: "",
  swiftCode: "",
};
interface InvoiceBankFieldsProps {
  isDefaultSettings?: boolean;
  isEnabled: boolean;
  value: InvoiceBankForm;
  onToggle: (isEnabled: boolean) => void;
  onChange: (value: InvoiceBankForm) => void;
}
const INLINE_INPUT =
  "theme-input min-h-12 w-full min-w-0 rounded-xl px-3.5 py-2.5 text-base";
export default function InvoiceBankFields({
  isDefaultSettings = false,
  isEnabled,
  value,
  onToggle,
  onChange,
}: InvoiceBankFieldsProps) {
  const ui = useUiText();

  return (
    <section className="theme-card rounded-2xl p-5 sm:p-6">
      <label className="flex min-h-12 cursor-pointer items-start gap-3">
        <Checkbox
          checked={isEnabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block text-base font-bold text-[var(--text-main)]">
            {ui(
              isDefaultSettings
                ? "حفظ بيانات الحساب البنكي الافتراضي"
                : "إضافة بيانات التحويل البنكي",
            )}
          </span>
          <span className="mt-1 block text-sm text-[var(--text-muted)] leading-relaxed">
            {ui(
              isDefaultSettings
                ? "تُملأ تلقائيًا في الفواتير المبدئية والضريبية الجديدة. يمكنك تعديلها لكل فاتورة، والفواتير المحفوظة تحتفظ ببياناتها."
                : "تظهر أسفل المستند. تعديلها هنا يخص هذه الفاتورة فقط.",
            )}
          </span>
        </span>
      </label>
      {isEnabled && (
        <div className="mt-5 grid gap-4 border-t theme-border pt-5 sm:grid-cols-2">
          {(
            [
              { key: "bankName", label: "اسم البنك" },
              { key: "accountHolder", label: "اسم صاحب الحساب" },
              {
                key: "accountNumber",
                label: "رقم الحساب",
                pattern: "[A-Za-z0-9\\-]{4,34}",
              },
              {
                key: "iban",
                label: "آيبان / IBAN",
                pattern: "[A-Z]{2}[0-9]{2}[A-Z0-9 ]{11,38}",
              },
              {
                key: "swiftCode",
                label: "سويفت كود (اختياري)",
                pattern: "[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?",
              },
            ] as const
          ).map((field) => {
            const isRequired =
              field.key === "bankName" ||
              field.key === "accountHolder" ||
              (field.key === "iban" && !value.accountNumber.trim()) ||
              (field.key === "accountNumber" && !value.iban.trim());
            const maxLen =
              field.key === "bankName" || field.key === "accountHolder"
                ? 200
                : 42;
            const fieldPattern = "pattern" in field ? field.pattern : undefined;
            const fieldDir = "pattern" in field ? ("ltr" as const) : ui.dir;
            const formatValue = (raw: string) =>
              field.key === "iban" || field.key === "swiftCode"
                ? raw.toUpperCase()
                : raw;
            return (
              <ExpandableField
                key={field.key}
                label={ui(field.label)}
                required={isRequired}
                maxLength={maxLen}
                pattern={fieldPattern}
                dir={fieldDir}
                value={value[field.key]}
                onApply={(next) =>
                  onChange({ ...value, [field.key]: formatValue(next) })
                }
              >
                <input
                  required={isRequired}
                  maxLength={maxLen}
                  pattern={fieldPattern}
                  dir={fieldDir}
                  className={`${INLINE_INPUT} ${fieldPattern ? "font-mono text-start" : ""}`}
                  value={value[field.key]}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      [field.key]: formatValue(event.target.value),
                    })
                  }
                />
              </ExpandableField>
            );
          })}
        </div>
      )}
    </section>
  );
}
