"use client";
import { INSPECTION_GROUPS, type InspectionCheckKey } from "@/lib/inspection";
import { useLanguage } from "@/lib/languageContext";
import { Checkbox } from "@/components/ui/checkbox";
interface InspectionChecklistProps { checks: Record<string, boolean>; onChange: (key: InspectionCheckKey, value: boolean) => void; isDisabled?: boolean }
export default function InspectionChecklist({ checks, onChange, isDisabled }: InspectionChecklistProps) {
  const { language } = useLanguage();
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {INSPECTION_GROUPS.map((group) => (
        <fieldset key={group.id} disabled={isDisabled} className="min-w-0">
          <legend className="mb-2.5 text-sm font-semibold">{group[language]}</legend>
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <label
                key={item.key}
                className="flex min-h-11 sm:min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border theme-border px-3 py-2 text-xs sm:text-sm font-medium transition-colors hover:bg-[var(--bg-card-subtle)] has-[:checked]:border-emerald-600/45 has-[:checked]:bg-emerald-500/12 dark:has-[:checked]:border-emerald-500/45 dark:has-[:checked]:bg-emerald-950/35"
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
