"use client";
import { PHONE_COUNTRIES, updateInvoicePhone, type InvoicePhone } from "@/lib/invoice-phone";
interface InvoicePhoneFieldProps { value: InvoicePhone; onChange: (value: InvoicePhone) => void }
const INPUT = "theme-input h-11 min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";
export default function InvoicePhoneField({ value, onChange }: InvoicePhoneFieldProps) {
  return <fieldset className="min-w-0"><legend className="text-sm font-bold">رقم الجوال <span className="text-amber-600">*</span></legend>
    <div className="mt-1.5 flex min-w-0 gap-2" dir="ltr">
      <select aria-label="كود الدولة" title="كود الدولة" name="guestPhoneCountry" className={`${INPUT} w-[45%] shrink-0 font-normal`} value={value.country} onChange={event => {
        const selected = PHONE_COUNTRIES.find(item => item.country === event.target.value);
        if (selected) onChange({ ...value, country: selected.country });
      }}>{PHONE_COUNTRIES.map(item => <option key={item.country} value={item.country}>+{item.callingCode} · {item.name}</option>)}</select>
      <input aria-label="رقم الجوال" name="guestPhone" required type="tel" inputMode="tel" maxLength={32} autoComplete="tel-national" dir="ltr" className={`${INPUT} w-0 flex-1 font-mono`} placeholder={value.country === "SA" ? "5xxxxxxxx" : "رقم الجوال"} value={value.number} onChange={event => onChange(updateInvoicePhone(value, event.target.value))} />
    </div>
    <p className="mt-1.5 text-xs font-normal text-slate-400">يمكنك لصق الرقم الدولي كاملًا، وسيُحدد كود الدولة تلقائيًا.</p>
  </fieldset>;
}
