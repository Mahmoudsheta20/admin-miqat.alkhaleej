"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import InvoiceBankFields, { EMPTY_BANK } from "@/app/_components/InvoiceBankFields";
import { invoiceRequest, type InvoiceSettings } from "@/lib/invoices";
const INPUT = "theme-input mt-1.5 w-full rounded-xl px-3 py-3 text-sm";
interface CompanyForm { legalName: string; vatNumber: string; commercialRegistration: string; street: string; building: string; district: string; city: string; postalCode: string }
const EMPTY: CompanyForm = { legalName: "", vatNumber: "", commercialRegistration: "", street: "", building: "", district: "", city: "", postalCode: "" };
export default function InvoiceSettingsPage() {
  const [form, setForm] = useState(EMPTY), [isLoading, setIsLoading] = useState(true), [isSaving, setIsSaving] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState(""), [reload, setReload] = useState(0);
  const [bankDetails, setBankDetails] = useState(EMPTY_BANK), [hasBankDetails, setHasBankDetails] = useState(false), [hasLoadError, setHasLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    void invoiceRequest<InvoiceSettings>("/settings").then(result => {
      if (!active) return;
      const company = result.data?.company;
      if (company) setForm({ ...EMPTY, ...company, ...company.address, vatNumber: company.vatNumber || "", commercialRegistration: company.commercialRegistration || "" });
      setBankDetails({ ...EMPTY_BANK, ...company?.bankDetails }); setHasBankDetails(Boolean(company?.bankDetails));
      setHasLoadError(!result.success); setError(result.error || ""); setIsLoading(false);
    });
    return () => { active = false; };
  }, [reload]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (hasLoadError) return; setError(""); setMessage("");
    const addressFields = [form.street, form.building, form.district, form.city, form.postalCode], hasAddress = addressFields.some(v => v.trim());
    if (hasAddress && !addressFields.every(v => v.trim())) { setError("أكمل حقول العنوان معًا أو اتركها فارغة."); return; }
    setIsSaving(true);
    try {
      const result = await invoiceRequest("/settings", "PUT", {
        legalName: form.legalName.trim(),
        ...(form.vatNumber.trim() ? { vatNumber: form.vatNumber.trim() } : {}),
        ...(form.commercialRegistration.trim() ? { commercialRegistration: form.commercialRegistration.trim() } : {}),
        ...(hasAddress ? { address: { street: form.street.trim(), building: form.building.trim(), district: form.district.trim(), city: form.city.trim(), postalCode: form.postalCode.trim(), country: "SA" } } : {}),
        bankDetails: hasBankDetails ? Object.fromEntries(Object.entries(bankDetails).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)) : null,
      });
      if (result.success) setMessage("تم حفظ بيانات الشركة والحساب البنكي للفواتير الجديدة."); else setError(result.error || "تعذر الحفظ");
    } finally { setIsSaving(false); }
  }
  return <div className="mx-auto max-w-2xl space-y-6" dir="rtl">
    <Link href="/admin/invoices" className="text-sm text-amber-700 dark:text-amber-400">العودة للفواتير</Link>
    <header><h1 className="text-2xl font-bold">بيانات الشركة</h1><p className="mt-2 text-sm text-slate-500">بيانات الشركة والحساب البنكي للفواتير الجديدة.</p></header>
    {error && <div role="alert" className="text-rose-600">{error} <button className="underline" type="button" onClick={() => { setIsLoading(true); setReload(v => v + 1); }}>إعادة التحميل</button></div>}
    {message && <p role="status" className="text-emerald-700 dark:text-emerald-400">{message}</p>}
    {isLoading ? <p role="status">جارٍ التحميل…</p> : !hasLoadError && <form onSubmit={save}>
      <fieldset disabled={isSaving} className="space-y-6">
        <section className="theme-card grid gap-5 rounded-2xl p-6 sm:grid-cols-2">
          {([{ key: "legalName", label: "اسم الشركة", required: true }, { key: "vatNumber", label: "الرقم الضريبي (إن وجد)", pattern: "3\\d{13}3" }, { key: "commercialRegistration", label: "السجل التجاري (إن وجد)", pattern: "\\d{10}" }, { key: "street", label: "الشارع (اختياري)" }, { key: "building", label: "رقم المبنى", pattern: "\\d{4}" }, { key: "district", label: "الحي" }, { key: "city", label: "المدينة" }, { key: "postalCode", label: "الرمز البريدي", pattern: "\\d{5}" }] as const).map(field => <label key={field.key} className="text-sm font-bold">{field.label}<input required={"required" in field && field.required} maxLength={200} pattern={"pattern" in field ? field.pattern : undefined} className={INPUT} value={form[field.key]} onChange={event => { setForm(current => ({ ...current, [field.key]: event.target.value })); setMessage(""); }} /></label>)}
        </section>
        <InvoiceBankFields isDefaultSettings isEnabled={hasBankDetails} value={bankDetails} onToggle={value => { setHasBankDetails(value); setMessage(""); }} onChange={value => { setBankDetails(value); setMessage(""); }} />
        <button className="gold-gradient-btn w-full rounded-xl px-5 py-3 font-bold">{isSaving ? "جارٍ الحفظ…" : "حفظ بيانات الشركة والحساب البنكي"}</button>
      </fieldset>
    </form>}
    <Link href="/admin/invoices/new" className="inline-block text-sm font-bold text-amber-700 dark:text-amber-400">إنشاء فاتورة</Link>
  </div>;
}
