"use client";
import Link from "next/link";
import { ReceiptText, Plus } from "lucide-react";
import { PageHeader } from "@/app/_components/ui";
import LoadError from "@/app/_components/LoadError";
import { useApiQuery } from "@/lib/use-api-query";
import { useLanguage } from "@/lib/languageContext";
import type { ZatcaSettings } from "@/lib/zatca";
export default function TaxSettingsPage() {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => language === "ar" ? ar : en;
  const settings = useApiQuery<ZatcaSettings>("/zatca/settings");
  return <div className="space-y-7">
    <PageHeader title={text("إعدادات الربط الضريبي", "Tax integration settings")} subtitle={text("حالة الربط التقني وأجهزة الفوترة. إصدار المستندات اليومية ومراجعتها متاح من قسم الفواتير.", "Technical integration and invoicing device status. Create and review daily documents in Invoices.")} primaryAction={{ label: text("الفواتير الضريبية", "Tax invoices"), href: "/admin/invoices?type=TAX", icon: ReceiptText }} secondaryActions={[{ label: text("إنشاء مستند ضريبي", "Create tax document"), href: "/admin/zatca/new", icon: Plus }]} onRefresh={settings.refetch} isRefreshing={settings.isLoading} />
    {settings.status === 409 ? <section className="theme-card rounded-xl p-6"><h2 className="text-lg font-semibold">{text("الربط التقني غير مفعّل", "Technical integration is disabled")}</h2><p className="page-description">{text("يمكنك الاستمرار في إصدار المستندات المحلية من صفحة الفواتير. تفعيل الربط وإعداد بيئة الإنتاج يتم على الخادم.", "You can continue issuing local documents from Invoices. Integration and production access are configured on the server.")}</p></section> : <LoadError message={settings.error} onRetry={settings.refetch} />}
    {settings.isLoading && <div className="h-40 animate-pulse rounded-xl theme-card-subtle" aria-busy="true" />}
    {settings.data && <>
      <section className="theme-card rounded-xl p-5 sm:p-6"><h2 className="mb-5 text-lg font-semibold">{text("حالة الإعداد", "Configuration status")}</h2><dl className="grid gap-6 sm:grid-cols-2"><div><dt className="text-sm text-[var(--text-muted)]">{text("أداة التحقق المحلية", "Local validation SDK")}</dt><dd className="mt-2 font-medium">{settings.data.sdkConfigured ? text("معدّة", "Configured") : text("غير معدّة", "Not configured")}</dd></div><div><dt className="text-sm text-[var(--text-muted)]">{text("السماح ببيئة الإنتاج", "Production access")}</dt><dd className="mt-2 font-medium">{settings.data.productionPermitted ? text("مفعّل", "Enabled") : text("غير مفعّل", "Disabled")}</dd></div></dl></section>
      <section className="theme-card rounded-xl p-5 sm:p-6"><h2 className="mb-4 text-lg font-semibold">{text("المنشآت وأجهزة الفوترة", "Issuers & invoicing devices")}</h2>{!settings.data.issuers.length ? <p className="text-sm text-[var(--text-muted)]">{text("لا توجد منشآت ربط مسجلة.", "No integration issuers registered.")}</p> : <ul className="divide-y divide-[var(--border-color)]">{settings.data.issuers.map(issuer => <li key={issuer.id} className="py-4"><h3 className="font-medium">{issuer.legalName}</h3><bdi className="text-sm text-[var(--text-muted)]">{issuer.vatNumber}</bdi><ul>{settings.data?.egs.filter(device => device.issuerId === issuer.id).map(device => <li key={device.id} className="mt-3 flex flex-wrap gap-4 text-sm"><bdi>{device.identity}</bdi><bdi>{device.environment}</bdi><bdi>{device.certificateStatus}</bdi></li>)}</ul></li>)}</ul>}</section>
    </>}
    <Link href="/admin/invoices/settings" className="inline-flex min-h-11 items-center text-sm text-[var(--accent-gold)] hover:underline">{text("تعديل بيانات الشركة والبنك", "Edit company & bank details")}</Link>
  </div>;
}
