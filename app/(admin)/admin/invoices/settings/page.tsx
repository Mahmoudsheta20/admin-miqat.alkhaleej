"use client";
import { useUiText } from "@/lib/ui-text";


import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2, MapPin, Plus, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import InvoiceBankFields, { EMPTY_BANK } from "@/app/_components/InvoiceBankFields";
import { invoiceRequest, type InvoiceSettings } from "@/lib/invoices";

const INPUT =
  "theme-input mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm";

interface CompanyForm {
  legalName: string;
  vatNumber: string;
  commercialRegistration: string;
  street: string;
  building: string;
  district: string;
  city: string;
  postalCode: string;
}

const DEFAULT_PRESENTATION = { englishName: "Miqat Al-Khaleej Land Transport", website: "https://miqatalkhaleej.com/", showSeal: true };

const EMPTY: CompanyForm = {
  legalName: "",
  vatNumber: "",
  commercialRegistration: "",
  street: "",
  building: "",
  district: "",
  city: "",
  postalCode: "",
};

export default function InvoiceSettingsPage() {
  const ui = useUiText();

  const [form, setForm] = useState(EMPTY);
  const [presentation, setPresentation] = useState(DEFAULT_PRESENTATION);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [bankDetails, setBankDetails] = useState(EMPTY_BANK);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    void invoiceRequest<InvoiceSettings>("/settings").then((result) => {
      if (!active) return;
      const company = result.data?.company;
      if (company) {
        setForm({
          ...EMPTY,
          ...company,
          ...company.address,
          vatNumber: company.vatNumber || "",
          commercialRegistration: company.commercialRegistration || "",
        });
      }
      setPresentation(company?.presentation || DEFAULT_PRESENTATION);
      setBankDetails({ ...EMPTY_BANK, ...company?.bankDetails });
      setHasBankDetails(Boolean(company?.bankDetails));
      setHasLoadError(!result.success);
      setError(result.error || "");
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reload]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasLoadError) return;
    setError("");
    setMessage("");
    const addressFields = [
      form.street,
      form.building,
      form.district,
      form.city,
      form.postalCode,
    ];
    const hasAddress = addressFields.some((v) => v.trim());
    if (hasAddress && !addressFields.every((v) => v.trim())) {
      setError("أكمل حقول العنوان معًا أو اتركها فارغة.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await invoiceRequest("/settings", "PUT", {
        legalName: form.legalName.trim(),
        presentation,
        ...(form.vatNumber.trim() ? { vatNumber: form.vatNumber.trim() } : {}),
        ...(form.commercialRegistration.trim()
          ? { commercialRegistration: form.commercialRegistration.trim() }
          : {}),
        ...(hasAddress
          ? {
              address: {
                street: form.street.trim(),
                building: form.building.trim(),
                district: form.district.trim(),
                city: form.city.trim(),
                postalCode: form.postalCode.trim(),
                country: "SA",
              },
            }
          : {}),
        bankDetails: hasBankDetails
          ? Object.fromEntries(
              Object.entries(bankDetails)
                .map(([key, value]) => [key, value.trim()])
                .filter(([, value]) => value)
            )
          : null,
      });
      if (result.success) {
        setMessage("تم حفظ بيانات الشركة والحساب البنكي للفواتير الجديدة.");
      } else {
        setError(result.error || "تعذر الحفظ");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12" dir={ui.dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/invoices"
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition"
        >
          <ArrowRight className="w-4 h-4 ltr:rotate-180" aria-hidden="true" />
          <span>{ui("العودة للفواتير")}</span>
        </Link>

        <Link
          href="/admin/invoices/new"
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] text-xs font-bold text-[var(--accent-gold)] transition"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{ui("إنشاء فاتورة")}</span>
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 flex items-center justify-center text-[var(--accent-gold)] shrink-0">
          <Building2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-main)]">
            {ui("بيانات الشركة والحساب البنكي")}</h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
            {ui("تُدرج هذه البيانات تلقائياً في ترويسة الفواتير الرسمية والفواتير المبدئية الجديدة")}</p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{ui(error)}</span>
          </div>
          <button
            className="min-h-11 sm:min-h-9 px-3.5 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition cursor-pointer"
            type="button"
            onClick={() => {
              setIsLoading(true);
              setReload((v) => v + 1);
            }}
          >
            {ui("إعادة التحميل")}</button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="p-4 rounded-2xl border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" />
          <span>{ui(message)}</span>
        </div>
      )}

      {isLoading ? (
        <div role="status" className="theme-card rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-[var(--accent-gold)]/25 border-t-[var(--accent-gold)] rounded-full animate-spin" />
          <p className="text-xs font-bold text-[var(--text-muted)]">{ui("جارٍ التحميل…")}</p>
        </div>
      ) : (
        !hasLoadError && (
          <form onSubmit={save}>
            <fieldset disabled={isSaving} className="space-y-6">
              {/* Legal & Tax Identity */}
              <section className="theme-card rounded-2xl border theme-border p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 border-b theme-border pb-3">
                  <Building2 className="w-4 h-4 text-[var(--accent-gold)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-main)]">
                    {ui("البيانات القانونية والضريبية للمنشأة")}</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs sm:text-sm font-bold sm:col-span-2">
                    {ui("اسم الشركة القانوني")}<span className="text-rose-700 dark:text-rose-400">*</span>
                    <input
                      required
                      maxLength={200}
                      placeholder={ui("مثال: شركة ميقات الخليج للنقل البري")}
                      className={INPUT}
                      value={form.legalName}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, legalName: event.target.value }));
                        setMessage("");
                      }}
                    />
                  </label>

                  <label className="text-xs sm:text-sm font-bold">
                    {ui("الرقم الضريبي (إن وجد)")}<input
                      maxLength={15}
                      pattern="3\d{13}3"
                      placeholder={ui("3xxxxxxxxxxxxx3 (15 رقماً)")}
                      dir="ltr"
                      className={`${INPUT} font-mono`}
                      value={form.vatNumber}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, vatNumber: event.target.value }));
                        setMessage("");
                      }}
                    />
                  </label>

                  <label className="text-xs sm:text-sm font-bold">
                    {ui("السجل التجاري (إن وجد)")}<input
                      maxLength={10}
                      pattern="\d{10}"
                      placeholder={ui("10 أرقام")}
                      dir="ltr"
                      className={`${INPUT} font-mono`}
                      value={form.commercialRegistration}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          commercialRegistration: event.target.value,
                        }));
                        setMessage("");
                      }}
                    />
                  </label>
                </div>
              </section>

              {/* National Address */}
              <section className="theme-card rounded-2xl border theme-border p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b theme-border pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--accent-gold)]" />
                    <h2 className="text-sm font-semibold text-[var(--text-main)]">
                      {ui("العنوان الوطني للمنشأة (اختياري)")}</h2>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {ui("أكمل جميع الحقول معاً أو اتركها فارغة")}</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      { key: "street", label: "الشارع (اختياري)", placeholder: "اسم الشارع أو الطريق" },
                      { key: "building", label: "رقم المبنى", pattern: "\\d{4}", placeholder: "4 أرقام" },
                      { key: "district", label: "الحي", placeholder: "اسم الحي" },
                      { key: "city", label: "المدينة", placeholder: "مثال: مكة المكرمة" },
                      { key: "postalCode", label: "الرمز البريدي", pattern: "\\d{5}", placeholder: "5 أرقام" },
                    ] as const
                  ).map((field) => (
                    <label key={field.key} className="text-xs sm:text-sm font-bold">
                      {ui(field.label)}
                      <input
                        maxLength={200}
                        pattern={"pattern" in field ? field.pattern : undefined}
                        placeholder={ui(field.placeholder)}
                        className={`${INPUT} ${"pattern" in field ? "font-mono" : ""}`}
                        value={form[field.key]}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, [field.key]: event.target.value }));
                          setMessage("");
                        }}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="theme-card grid gap-5 rounded-2xl border theme-border p-5 sm:grid-cols-2 sm:p-6">
                <label className="text-sm font-bold">
                  {ui("اسم الشركة بالإنجليزية")}
                  <input
                    required
                    maxLength={200}
                    dir="ltr"
                    className={INPUT}
                    value={presentation.englishName}
                    onChange={(event) => {
                      setPresentation((current) => ({ ...current, englishName: event.target.value }));
                      setMessage("");
                    }}
                  />
                </label>
                <label className="text-sm font-bold">
                  {ui("الموقع الإلكتروني")}
                  <input
                    required
                    type="url"
                    maxLength={200}
                    dir="ltr"
                    className={INPUT}
                    value={presentation.website}
                    onChange={(event) => {
                      setPresentation((current) => ({ ...current, website: event.target.value }));
                      setMessage("");
                    }}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm font-bold sm:col-span-2 cursor-pointer">
                  <Checkbox
                    checked={presentation.showSeal}
                    onChange={(event) => {
                      setPresentation((current) => ({ ...current, showSeal: event.target.checked }));
                      setMessage("");
                    }}
                  />
                  <span>{ui("إظهار ختم الشركة على المستندات الضريبية")}</span>
                </label>
              </section>

              <InvoiceBankFields
                isDefaultSettings
                isEnabled={hasBankDetails}
                value={bankDetails}
                onToggle={(value) => {
                  setHasBankDetails(value);
                  setMessage("");
                }}
                onChange={(value) => {
                  setBankDetails(value);
                  setMessage("");
                }}
              />

              <button
                type="submit"
                disabled={isSaving}
                className="gold-gradient-btn w-full rounded-xl px-5 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{ui("جارٍ الحفظ…")}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{ui("حفظ بيانات الشركة والحساب البنكي")}</span>
                  </>
                )}
              </button>
            </fieldset>
          </form>
        )
      )}
    </div>
  );
}
