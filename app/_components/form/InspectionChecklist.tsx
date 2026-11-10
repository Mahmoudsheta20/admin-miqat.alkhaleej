"use client";
import { INSPECTION_GROUPS, type InspectionCheckKey } from "@/lib/inspection";
import { useLanguage } from "@/lib/languageContext";
import { Checkbox } from "@/components/ui/checkbox";
interface InspectionChecklistProps { checks: Record<string, boolean>; onChange: (key: InspectionCheckKey, value: boolean) => void; isDisabled?: boolean }
export default function InspectionChecklist({ checks, onChange, isDisabled }: InspectionChecklistProps) {
  const { language } = useLanguage();
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {INSPECTION_GROUPS.map((group) => (
        <fieldset key={group.id} disabled={isDisabled} className="min-w-0">
          <legend className="mb-3 text-base font-semibold">{group[language]}</legend>
          <div className="space-y-2">
            {group.items.map((item) => (
              <label
                key={item.key}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border theme-border px-3.5 py-2.5 text-base font-medium transition-colors hover:bg-[var(--bg-card-subtle)] has-[:checked]:border-emerald-500/35 has-[:checked]:bg-emerald-500/[0.04]"
              >
                <Checkbox
                  checked={checks[item.key] ?? false}
                  onChange={(event) => onChange(item.key, event.target.checked)}
                />
                <span className="leading-snug">{language === "ar" ? item.titleAr : item.titleEn}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
