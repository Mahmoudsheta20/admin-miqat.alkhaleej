"use client";
import dynamic from "next/dynamic";

import React, { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Car,
  FileCheck2,
  ClipboardCheck,
  ArrowUpRight,
  FileText,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  ReceiptText,
  Eye,
} from "lucide-react";
import { getDashboardStats, DashboardStats } from "@/app/_actions/dashboard";
import StatusBadge from "@/app/_components/StatusBadge";
import { PageHeader } from "@/app/_components/ui";
const PdfPreviewModal = dynamic(
  () => import("@/app/_components/PdfPreviewModal"),
  { ssr: false },
);
import { fetchCached, getCachedData } from "@/lib/clientCache";
import { useLanguage } from "@/lib/languageContext";

export default function AdminDashboardPage() {
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(() =>
    getCachedData("dashboard_stats"),
  );
  const [isLoading, setIsLoading] = useState(
    () => !getCachedData("dashboard_stats"),
  );
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null,
  );
  const [selectedRefNum, setSelectedRefNum] = useState<string>("");
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const [seedError, setSeedError] = useState("");
  const [, startTransition] = useTransition();

  const loadStats = (forceRefresh = false) => {
    startTransition(async () => {
      try {
        const res = await fetchCached("dashboard_stats", getDashboardStats, {
          ttlMs: 60_000,
          forceRefresh,
        });
        if (res.success && res.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error("Dashboard stats error:", err);
      } finally {
        setIsLoading(false);
      }
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const openPdf = (id: string, ref: string, pdfPath?: string | null) => {
    setSelectedContractId(id);
    setSelectedRefNum(ref);
    setSelectedPdfUrl(pdfPath || null);
    setIsPdfOpen(true);
  };

  const dashboardHelpGuide = useMemo(
    () => ({
      title: isRTL
        ? "كيف تعمل لوحة الإشراف العام ومنظومة التشغيل والمالية؟"
        : "How the Operations & Financial Dashboard Works",
      summary: isRTL
        ? "مركز القيادة الموحد لشركة ميقات الخليج للنقل البري: يربط دورة التشغيل الميداني (المركبات ← الكباتن ← الفحص اليومي ← العقود الرسمية) بالدورة المحاسبية والضريبية (الفواتير ← المشتريات ← القيود ← الإقرار الضريبي)."
        : "Unified command center for Miqat Al-Khaleej: connects field operations (fleet → captains → pre-trip inspection → contracts) with accounting and tax cycles (invoices → purchases → journal entries → VAT return).",
      cards: [
        {
          title: isRTL ? "١. دورة التشغيل الميداني" : "1. Field Operations Cycle",
          badge: isRTL ? "العمليات" : "Operations",
          items: [
            {
              label: isRTL ? "أسطول المركبات والكباتن" : "Fleet & Captains",
              description: isRTL
                ? "تسجيل الحافلات وسيارات VIP وتعيين مركبة مخصصة لكل كابتن مع متابعة صلاحية الاستمارة والتأمين."
                : "Register buses and VIP vehicles, assign dedicated vehicles to captains, and track registration & insurance.",
            },
            {
              label: isRTL ? "الفحص اليومي الإلزامي" : "Mandatory Pre-Trip Inspection",
              description: isRTL
                ? "يُشترط اجتياز فحص السلامة اليومي (15 بنداً ميكانيكياً وأمنياً) قبل إصدار عقود التشغيل اليومية."
                : "Pass the daily 15-point safety inspection before issuing daily operation contracts.",
            },
            {
              label: isRTL ? "العقود وكشوف الركاب" : "Contracts & Passenger Manifests",
              description: isRTL
                ? "إصدار عقود النقل الرسمية متضمنة بيانات الرحلة، الناقل الجوي، وكشف أسماء وجنسيات وهويات الركاب."
                : "Issue official passenger contracts with trip details, airline info, and manifest details.",
            },
          ],
        },
        {
          title: isRTL ? "٢. الدورة المالية والفوترة ZATCA" : "2. Financial & ZATCA Invoicing",
          badge: isRTL ? "المبيعات والضريبة" : "Sales & Tax",
          items: [
            {
              label: isRTL ? "فواتير الحجوزات والضريبة" : "Trip Invoices & VAT",
              code: "15% / 0% / معفى",
              description: isRTL
                ? "إصدار فواتير ضريبية ومبسطة وإشعارات دائنة ومدينة متوافقة مع المرحلة الأولى لهيئة الزكاة والضريبة والجمارك (TLV Base64 QR)."
                : "Issue tax/simplified invoices and debit/credit notes compliant with ZATCA Phase 1 QR codes.",
            },
            {
              label: isRTL ? "الترحيل المحاسبي التلقائي" : "Automated Journal Entries",
              code: "1102 / 1103 / 4101 / 210201",
              description: isRTL
                ? "كل فاتورة معتمدة تُنشئ قيد يومية متوازناً يربط حساب الإيراد وحساب ضريبة المخرجات بحساب البنك أو ذمم العملاء."
                : "Every confirmed invoice posts a balanced journal entry linking revenues, output VAT, and cash/receivables.",
            },
          ],
        },
        {
          title: isRTL ? "٣. المصروفات والإقرار الضريبي" : "3. Expenses & VAT Return",
          badge: "ZATCA VAT",
          items: [
            {
              label: isRTL ? "مشتريات ومصروفات الأسطول" : "Fleet Purchases & Expenses",
              code: "5101–5203",
              description: isRTL
                ? "تسجيل فواتير الوقود والصيانة والإيجارات مع احتساب ضريبة المدخلات القابلة للاسترداد (210202) وعزل الرسوم الحكومية والرواتب."
                : "Log fuel, maintenance, and fleet expenses with recoverable input VAT separated from fees.",
            },
            {
              label: isRTL ? "الإقرار الضريبي الربع سنوي" : "Quarterly VAT Return",
              code: "خانات 1–16",
              description: isRTL
                ? "تجميع آلي لصافي الضريبة المستحقة (ضريبة المخرجات ناقص ضريبة المدخلات) مع نسخ فوري للأرقام لبوابة هيئة الزكاة."
                : "Automated net tax calculation (output VAT minus input VAT) with one-click copy for the ZATCA portal.",
            },
          ],
        },
      ],
      tip: isRTL
        ? "اضغط على زر «بيانات تجريبية شاملة» في الأعلى لتعبئة جميع الأقسام تلقائياً وتجربة دورة العمل المتكاملة."
        : "Click 'Seed Full Test Data' in the header to populate all sections and experience the integrated workflow.",
      formula: "Net VAT = Output VAT (Sales 15% ± Notes) − Input VAT (Purchases 15% − Returns)",
    }),
    [isRTL]
  );

  return (
    <div className="space-y-6">
      {/* Top Header Section with On-Demand Slide-Over Guide */}
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        badge={isRTL ? "مركز العمليات والإشراف المالي" : "Operations & Financial Dashboard"}
        icon={ReceiptText}
        onRefresh={() => loadStats(true)}
        isRefreshing={isLoading}
        helpGuide={dashboardHelpGuide}
        onSeeded={(msg) => {
          setSeedError("");
          setSeedMessage(msg);
          loadStats(true);
        }}
        onSeedError={(err) => {
          setSeedMessage("");
          setSeedError(err);
        }}
        primaryAction={{
          label: `+ ${t("contracts.newContract")}`,
          href: "/admin/contracts/new",
          icon: FilePlus2,
          variant: "primary",
        }}
        secondaryActions={[
          {
            label: `+ ${t("nav.invoices")}`,
            href: "/admin/invoices/new",
            icon: ReceiptText,
            variant: "subtle",
          },
        ]}
      />

      {seedMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          {seedMessage}
        </p>
      )}
      {seedError && (
        <p role="alert" className="text-xs sm:text-sm font-bold text-rose-600">
          {seedError}
        </p>
      )}

      {/* Quick Daily Operations Shortcuts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href="/admin/contracts/new"
          className="theme-card p-3.5 rounded-2xl border theme-border hover:border-amber-500/60 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <FilePlus2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                {t("contracts.newContract")}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {t("contracts.subtitle")}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 shrink-0 transition" />
        </Link>

        <Link
          href="/admin/invoices/new"
          className="theme-card p-3.5 rounded-2xl border theme-border hover:border-amber-500/60 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ReceiptText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                {t("invoice.newInvoice")}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {t("invoice.subtitle")}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 shrink-0 transition" />
        </Link>

        <Link
          href="/admin/inspections"
          className="theme-card p-3.5 rounded-2xl border theme-border hover:border-amber-500/60 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                {t("nav.inspections")}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {t("inspections.subtitle")}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 shrink-0 transition" />
        </Link>

        <Link
          href="/admin/invoices"
          className="theme-card p-3.5 rounded-2xl border theme-border hover:border-amber-500/60 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                {t("nav.invoices")}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {t("invoice.title")}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 shrink-0 transition" />
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Captains */}
        <div className="theme-card p-3.5 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("captains.title")}
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : (stats?.totalCaptains ?? 0)}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 mr-1.5 font-bold">
                {isRTL ? "كابتن" : "Captains"}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>{t("captains.title")}</span>
            <Link
              href="/admin/captains"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              {t("common.view")}
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Vehicles */}
        <div className="theme-card p-3.5 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("fleet.title")}
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : (stats?.totalVehicles ?? 0)}
              </span>
              <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">
                ({stats?.activeVehicles ?? 0} {isRTL ? "جاهزة" : "Ready"})
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>{t("fleet.title")}</span>
            <Link
              href="/admin/fleet"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              {t("common.view")}
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Contracts */}
        <div className="theme-card p-3.5 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("contracts.title")}
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : (stats?.totalContracts ?? 0)}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 mr-1.5 font-bold">
                {isRTL ? "عقد رسمي" : "Contracts"}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>{t("contracts.title")}</span>
            <Link
              href="/admin/contracts"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              {t("common.view")}
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Today's Inspections */}
        <div className="theme-card p-3.5 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("inspections.title")}
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : (stats?.todayInspections ?? 0)}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 mr-1.5 font-bold">
                {isRTL ? "فحص مسجل" : "Inspections"}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>{t("inspections.title")}</span>
            <Link
              href="/admin/inspections"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              {t("common.view")}
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Contracts Section */}
      <div className="theme-card rounded-2xl overflow-hidden border theme-border">
        <div className="p-4 sm:p-5 border-b theme-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t("dashboard.recentContracts")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("contracts.subtitle")}
            </p>
          </div>
          <Link
            href="/admin/contracts"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            {t("common.all")} ({stats?.totalContracts ?? 0})
            {isRTL ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Link>
        </div>

        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">{t("common.loading")}</p>
          </div>
        ) : !stats?.recentContracts?.length ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            {isRTL ? "لا توجد عقود مسجلة حتى الآن." : "No contracts found yet."}
          </div>
        ) : (
          <>
            {/* Desktop Table (Visible on md and larger) */}
            <div className="hidden md:block overflow-x-auto">
              <table
                className={`w-full ${isRTL ? "text-right" : "text-left"} text-xs`}
              >
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b theme-border text-slate-500 dark:text-slate-400 font-bold">
                  <tr>
                    <th className="px-5 py-3">{t("contracts.refNumber")}</th>
                    <th className="px-5 py-3">{t("contracts.customer")}</th>
                    <th className="px-5 py-3">{t("contracts.captain")}</th>
                    <th className="px-5 py-3">{t("fleet.plateAr")}</th>
                    <th className="px-5 py-3">{t("common.details")}</th>
                    <th className="px-5 py-3">{t("common.date")}</th>
                    <th className="px-5 py-3">{t("contracts.passengers")}</th>
                    <th
                      className={`px-5 py-3 ${isRTL ? "text-left" : "text-right"}`}
                    >
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border text-slate-800 dark:text-slate-200">
                  {stats.recentContracts.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {c.referenceNumber}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {c.customerName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {c.captainName}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold">
                        {c.vehiclePlate}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          type="operation"
                          status={c.operationType}
                          size="sm"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                        {c.tripDate} {c.tripTime}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                          {c.passengersCount} {isRTL ? "ركاب" : "pax"}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-3.5 ${isRTL ? "text-left" : "text-right"} whitespace-nowrap`}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/contracts/${encodeURIComponent(c.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t("common.details")}</span>
                          </Link>
                          <Link
                            href={`/admin/invoices/new?contractId=${encodeURIComponent(c.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold transition text-xs"
                          >
                            <ReceiptText className="w-3.5 h-3.5" />
                            <span>{t("invoice.title")}</span>
                          </Link>
                          <button
                            onClick={() =>
                              openPdf(c.id, c.referenceNumber, c.pdfPath)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg gold-gradient-btn font-bold transition text-xs cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Visible on screens smaller than md) */}
            <div className="md:hidden divide-y theme-border">
              {stats.recentContracts.map((c) => (
                <div
                  key={c.id}
                  className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-all font-mono font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                      {c.referenceNumber}
                    </span>
                    <StatusBadge
                      type="operation"
                      status={c.operationType}
                      size="sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t("contracts.customer")}:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {c.customerName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t("contracts.captain")}:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                        {c.captainName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t("fleet.plateAr")}:
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {c.vehiclePlate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t("common.date")}:
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {c.tripDate} {c.tripTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t theme-border gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                      {c.passengersCount} {isRTL ? "ركاب" : "pax"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/contracts/${c.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition text-xs shadow-2xs"
                      >
                        {t("common.details")}
                      </Link>
                      <button
                        onClick={() =>
                          openPdf(c.id, c.referenceNumber, c.pdfPath)
                        }
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition text-xs shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* PDF Modal */}
      {selectedContractId && (
        <PdfPreviewModal
          isOpen={isPdfOpen}
          onClose={() => {
            setIsPdfOpen(false);
            setSelectedPdfUrl(null);
          }}
          contractId={selectedContractId}
          referenceNumber={selectedRefNum}
          pdfUrl={selectedPdfUrl}
        />
      )}
    </div>
  );
}
