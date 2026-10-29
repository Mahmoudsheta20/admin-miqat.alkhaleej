"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  Save,
} from "lucide-react";
import InvoiceBankFields, { EMPTY_BANK } from "@/app/_components/InvoiceBankFields";
import { invoiceRequest, type InvoiceSettings } from "@/lib/invoices";

const INPUT =
  "theme-input mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";

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
    <div className="mx-auto max-w-3xl space-y-6 pb-12" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-700 dark:hover:text-amber-400 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للفواتير</span>
        </Link>

        <Link
          href="/admin/invoices/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-amber-700 dark:text-amber-400 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إنشاء فاتورة</span>
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            بيانات الشركة والحساب البنكي
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            تُدرج هذه البيانات تلقائياً في ترويسة الفواتير الرسمية والفواتير المبدئية الجديدة
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
            type="button"
            onClick={() => {
              setIsLoading(true);
              setReload((v) => v + 1);
            }}
          >
            إعادة التحميل
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {isLoading ? (
        <div role="status" className="theme-card rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">جارٍ التحميل…</p>
        </div>
      ) : (
        !hasLoadError && (
          <form onSubmit={save}>
            <fieldset disabled={isSaving} className="space-y-6">
              {/* Legal & Tax Identity */}
              <section className="theme-card rounded-2xl border theme-border p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 border-b theme-border pb-3">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    البيانات القانونية والضريبية للمنشأة
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs sm:text-sm font-bold sm:col-span-2">
                    اسم الشركة القانوني <span className="text-rose-500">*</span>
                    <input
                      required
                      maxLength={200}
                      placeholder="مثال: شركة ميقات الخليج للنقل البري"
                      className={INPUT}
                      value={form.legalName}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, legalName: event.target.value }));
                        setMessage("");
                      }}
                    />
                  </label>

                  <label className="text-xs sm:text-sm font-bold">
                    الرقم الضريبي (إن وجد)
                    <input
                      maxLength={15}
                      pattern="3\d{13}3"
                      placeholder="3xxxxxxxxxxxxx3 (15 رقماً)"
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
                    السجل التجاري (إن وجد)
                    <input
                      maxLength={10}
                      pattern="\d{10}"
                      placeholder="10 أرقام"
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
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">
                      العنوان الوطني للمنشأة (اختياري)
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    أكمل جميع الحقول معاً أو اتركها فارغة
                  </span>
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
                      {field.label}
                      <input
                        maxLength={200}
                        pattern={"pattern" in field ? field.pattern : undefined}
                        placeholder={field.placeholder}
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

              <section className="theme-card grid gap-5 rounded-2xl border theme-border p-5 sm:grid-cols-2 sm:p-6"><label className="text-sm font-bold">اسم الشركة بالإنجليزية<input required maxLength={200} dir="ltr" className={INPUT} value={presentation.englishName} onChange={event => { setPresentation(current => ({ ...current, englishName: event.target.value })); setMessage(""); }} /></label><label className="text-sm font-bold">الموقع الإلكتروني<input required type="url" maxLength={200} dir="ltr" className={INPUT} value={presentation.website} onChange={event => { setPresentation(current => ({ ...current, website: event.target.value })); setMessage(""); }} /></label><label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" className="accent-amber-600" checked={presentation.showSeal} onChange={event => { setPresentation(current => ({ ...current, showSeal: event.target.checked })); setMessage(""); }} />إظهار ختم الشركة على المستندات الضريبية</label></section>

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
                className="gold-gradient-btn w-full rounded-xl px-5 py-3.5 text-sm font-black flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ الحفظ…</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ بيانات الشركة والحساب البنكي</span>
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
