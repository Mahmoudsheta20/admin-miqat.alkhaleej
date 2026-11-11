"use client";
import { useUiText } from "@/lib/ui-text";

import { useMemo, useState } from "react";
import { phoneCountries, PHONE_COUNTRIES, updateInvoicePhone, type InvoicePhone } from "@/lib/invoice-phone";
import { useIsMobileViewport } from "@/lib/use-mobile-viewport";
import { FullscreenFieldModal } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";

interface InvoicePhoneFieldProps {
  value: InvoicePhone;
  onChange: (value: InvoicePhone) => void;
}

const INPUT = "theme-input min-h-11 sm:min-h-9 min-w-0 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";

export default function InvoicePhoneField({ value, onChange }: InvoicePhoneFieldProps) {
  const ui = useUiText();
  const isMobile = useIsMobileViewport();
  const [expandOpen, setExpandOpen] = useState(false);
  const [expandSession, setExpandSession] = useState(0);
  const openExpandModal = () => {
    if (!isMobile) return;
    setExpandSession((prev) => prev + 1);
    setExpandOpen(true);
  };
  const countries = useMemo(() => phoneCountries(ui.language), [ui.language]);
  const selectedCountry = useMemo(
    () =>
      countries.find((item) => item.country === value.country) ||
      PHONE_COUNTRIES.find((item) => item.country === value.country),
    [countries, value.country],
  );
  const placeholder = ui(value.country === "SA" ? "5xxxxxxxx" : "رقم الجوال");

  return (
    <fieldset className="min-w-0">
      <legend className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]">
        {ui("رقم الجوال")}
        <span className="ms-0.5 text-rose-700 dark:text-rose-400" aria-hidden="true">
          *
        </span>
      </legend>
      <div className="mt-1.5 flex min-w-0 items-center gap-2" dir="ltr">
        <div className="w-[40%] shrink-0">
          <FullscreenSelect
            name="guestPhoneCountry"
            ariaLabel={ui("كود الدولة")}
            searchable
            columns={2}
            value={value.country}
            displayValue={`+${selectedCountry?.callingCode || "966"} · ${value.country}`}
            triggerClassName="px-2.5 text-base sm:text-[0.8125rem] font-mono font-semibold"
            onChange={(nextCountry) => {
              const selected = PHONE_COUNTRIES.find(
                (item) => item.country === nextCountry,
              );
              if (selected) onChange({ ...value, country: selected.country });
            }}
            options={countries.map((item) => ({
              value: item.country,
              label: item.name,
              badge: `+${item.callingCode}`,
              keywords: `${item.country} +${item.callingCode} ${item.callingCode}`,
            }))}
          />
        </div>
        <input
          aria-label={ui("رقم الجوال")}
          name="guestPhone"
          required
          type="tel"
          inputMode="tel"
          maxLength={32}
          autoComplete="tel-national"
          dir="ltr"
          className={`${INPUT} w-0 flex-1 font-mono ${isMobile ? "cursor-pointer" : ""}`}
          placeholder={placeholder}
          value={value.number}
          onClick={openExpandModal}
          onKeyDown={(event) => {
            if (isMobile && event.key === "F2") {
              event.preventDefault();
              openExpandModal();
            }
          }}
          onChange={(event) => onChange(updateInvoicePhone(value, event.target.value))}
        />
      </div>
      <p className="mt-1 text-xs font-normal text-[var(--text-muted)]">
        {ui("يمكنك لصق الرقم الدولي كاملًا، وسيُحدد كود الدولة تلقائيًا.")}
      </p>
      {isMobile && (
        <FullscreenFieldModal
          open={expandOpen}
          onClose={() => setExpandOpen(false)}
          sessionKey={expandSession}
          title={ui("رقم الجوال")}
          value={value.number}
          type="tel"
          inputMode="tel"
          maxLength={32}
          autoComplete="tel-national"
          dir="ltr"
          placeholder={placeholder}
          onApply={(next) => onChange(updateInvoicePhone(value, next))}
        />
      )}
    </fieldset>
  );
}
