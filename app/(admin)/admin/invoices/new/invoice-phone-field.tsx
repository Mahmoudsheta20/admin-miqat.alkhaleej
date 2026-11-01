"use client";
import { useUiText } from "@/lib/ui-text";

import { useMemo } from "react";
import { phoneCountries, PHONE_COUNTRIES, updateInvoicePhone, type InvoicePhone } from "@/lib/invoice-phone";
interface InvoicePhoneFieldProps { value: InvoicePhone; onChange: (value: InvoicePhone) => void }
const INPUT = "theme-input h-11 min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";
export default function InvoicePhoneField({ value, onChange }: InvoicePhoneFieldProps) {
  const ui = useUiText();
  const countries=useMemo(()=>phoneCountries(ui.language),[ui.language]);

  return <fieldset className="min-w-0"><legend className="text-sm font-bold">{ui("رقم الجوال")}<span className="text-amber-600">*</span></legend>
    <div className="mt-1.5 flex min-w-0 gap-2" dir="ltr">
      <select aria-label={ui("كود الدولة")} title={ui("كود الدولة")} name="guestPhoneCountry" className={`${INPUT} w-[45%] shrink-0 font-normal`} value={value.country} onChange={event => {
        const selected = PHONE_COUNTRIES.find(item => item.country === event.target.value);
        if (selected) onChange({ ...value, country: selected.country });
      }}>{countries.map(item => <option key={item.country} value={item.country}>+{ui(item.callingCode)} · {item.name}</option>)}</select>
      <input aria-label={ui("رقم الجوال")} name="guestPhone" required type="tel" inputMode="tel" maxLength={32} autoComplete="tel-national" dir="ltr" className={`${INPUT} w-0 flex-1 font-mono`} placeholder={ui(value.country === "SA" ? "5xxxxxxxx" : "رقم الجوال")} value={value.number} onChange={event => onChange(updateInvoicePhone(value, event.target.value))} />
    </div>
    <p className="mt-1.5 text-xs font-normal text-slate-400">{ui("يمكنك لصق الرقم الدولي كاملًا، وسيُحدد كود الدولة تلقائيًا.")}</p>
  </fieldset>;
}
