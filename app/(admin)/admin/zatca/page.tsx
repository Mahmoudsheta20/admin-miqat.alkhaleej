"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Cpu, Plus, ReceiptText, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PageHeader, StatCard, StatRow } from "@/app/_components/ui";
import LoadError from "@/app/_components/LoadError";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import { hasClientPermission } from "@/lib/permissions";
import { useApiQuery } from "@/lib/use-api-query";
import EgsOnboardingSection from "./egs-onboarding-section";
import ElectronicInvoicesSection from "./electronic-invoices-section";
import type { ExtendedZatcaSettings } from "./zatca-helpers";

export default function TaxSettingsPage() {
  const { language, dir } = useLanguage();
  const { user: authUser } = useAuth();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const canCreateTaxDoc = hasClientPermission(authUser, "invoices", "write");
  const canWriteZatca = hasClientPermission(authUser, "zatca", "write");
  const canApproveZatca = hasClientPermission(authUser, "zatca", "approve");
  const canViewCompanySettings = hasClientPermission(authUser, "companySettings", "view");

  const [refreshTick, setRefreshTick] = useState(0);
  const settings = useApiQuery<ExtendedZatcaSettings>("/zatca/settings");
  const integrationOff = !settings.data && settings.status === 409;

  const issuers = settings.data?.issuers || [];
  const egsUnits = settings.data?.egs || [];
  const activeUnitsCount = egsUnits.filter((u) => u.productionEnabled).length;

  const handleRefreshAll = () => {
    settings.refetch();
    setRefreshTick((v) => v + 1);
  };

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      <PageHeader
        title={text("إعدادات الربط الضريبي والفوترة الإلكترونية", "Tax Integration & ZATCA Phase-2")}
        subtitle={text(
          "إدارة منشآت الربط وأجهزة الفوترة EGS وطابور الإرسال للهيئة. المستندات اليومية متاحة من قسم الفواتير.",
          "Manage ZATCA issuers, EGS onboarding, and Phase-2 submission queue. Daily documents are created in Invoices.",
        )}
        primaryAction={{
          label: text("الفواتير الضريبية", "Tax invoices"),
          href: "/admin/invoices?type=TAX",
          icon: ReceiptText,
        }}
        secondaryActions={[
          ...(canCreateTaxDoc
            ? [
                {
                  label: text("إنشاء مستند ضريبي", "Create tax document"),
                  href: "/admin/zatca/new",
                  icon: Plus,
                },
              ]
            : []),
        ]}
        onRefresh={handleRefreshAll}
        isRefreshing={settings.isLoading}
      />

      {integrationOff ? (
        <section className="theme-card rounded-2xl border theme-border p-6 space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">
            {text("الربط التقني غير مفعّل", "Technical integration is disabled")}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {text(
              "يمكنك الاستمرار في إصدار المستندات المحلية وحفظها مع رمز ZATCA QR من صفحة الفواتير. تفعيل الربط وإعداد بيئة الإنتاج يتم على الخادم.",
              "You can continue issuing local documents with ZATCA QR from Invoices. Integration and production access are configured on the server.",
            )}
          </p>
        </section>
      ) : (
        <LoadError message={settings.error} onRetry={settings.refetch} />
      )}

      {settings.isLoading && !settings.data && (
        <div
          role="status"
          className="h-40 animate-pulse rounded-2xl border theme-border theme-card-subtle"
          aria-busy="true"
        />
      )}

      {settings.data && (
        <>
          <StatRow columns={4}>
            <StatCard
              label={text("المنشآت المسجلة", "Issuers")}
              value={issuers.length}
              subtext={text("كيانات ضريبية", "Tax entities")}
              icon={Building2}
              isLoading={settings.isLoading}
            />
            <StatCard
              label={text("أجهزة الفوترة EGS", "EGS Units")}
              value={egsUnits.length}
              subtext={text("أجهزة مسجلة", "Registered devices")}
              icon={Cpu}
              variant="blue"
              isLoading={settings.isLoading}
            />
            <StatCard
              label={text("الأجهزة المفعّلة", "Activated Units")}
              value={activeUnitsCount}
              subtext={text("جاهزة للإصدار", "Ready for issuance")}
              icon={CheckCircle2}
              variant="emerald"
              isLoading={settings.isLoading}
            />
            <StatCard
              label={text("أداة التحقق SDK", "Validation SDK")}
              value={settings.data.sdkConfigured ? text("مهيّأة", "Ready") : text("غير مهيّأة", "Missing")}
              subtext={
                settings.data.productionPermitted
                  ? text("بيئة الإنتاج مصرحة", "Production allowed")
                  : text("إنتاج الخادم متوقف", "Production off")
              }
              icon={ShieldCheck}
              variant="amber"
              isLoading={settings.isLoading}
            />
          </StatRow>

          <EgsOnboardingSection
            settings={settings.data}
            canWrite={canWriteZatca}
            canApprove={canApproveZatca}
            onChanged={handleRefreshAll}
          />

          <ElectronicInvoicesSection
            disabled={integrationOff}
            egsUnits={egsUnits}
            canWrite={canWriteZatca}
            canApprove={canApproveZatca}
            refreshSignal={refreshTick}
          />
        </>
      )}

      {canViewCompanySettings && (
        <div>
          <Link
            href="/admin/invoices/settings"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent-gold)] hover:underline"
          >
            {text("تعديل بيانات الشركة والبنك", "Edit company & bank details")}
          </Link>
        </div>
      )}
    </div>
  );
}
