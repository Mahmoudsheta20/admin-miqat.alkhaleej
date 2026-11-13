"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Plus,
  ReceiptText,
  ClipboardCheck,
  ArrowUpLeft,
  ArrowUpRight,
  Eye,
  FileText,
  UserCheck,
  Users,
  Car,
  Wallet,
  ShieldCheck,
  Search,
  X,
  Download,
  MapPin,
  FilePlus2,
} from "lucide-react";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";
import { useApiQuery } from "@/lib/use-api-query";
import { currentSaudiPeriod, type FinancialReport, type PurchaseList } from "@/lib/accounting";
import {
  buildContractTrend,
  buildFleetAnalytics,
  buildOperationBreakdown,
  normalizeIsoDay,
  summarizeProfit,
  toDashboardContracts,
  diffCalendarDays,
} from "@/lib/dashboard-analytics";
import { dateLabel, downloadInvoice, invoiceTitle, type InvoiceRow } from "@/lib/invoices";
import type { Contract, Vehicle } from "@/lib/types";
import type { DashboardStats } from "@/app/_actions/dashboard";
import type { CaptainInspectionItem } from "@/app/_actions/inspection";
import {
  PageHeader,
  StatCard,
  Card,
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Button,
  Money,
  formatMoneyValue,
} from "@/app/_components/ui";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileHorizontalStrip,
  MobileRecordCard,
} from "@/app/_components/mobile";
import LoadError from "@/app/_components/LoadError";
import StatusBadge from "@/app/_components/StatusBadge";
import FinanceSummary from "./_components/finance-summary";
import ActionCenter from "./_components/action-center";
import { ContractsActivityChart, OperationsMixCard } from "./_components/dashboard-charts";

const PdfPreviewModal = dynamic(() => import("@/app/_components/PdfPreviewModal"), { ssr: false });

interface ReadinessOverview {
  captains: CaptainInspectionItem[];
  stats: {
    totalCaptains: number;
    inspectedToday: number;
    pendingToday: number;
    totalInspections: number;
  };
}

interface InvoiceListResponse {
  items: InvoiceRow[];
  total: number;
  page: number;
}

interface CustomerListResponse {
  items: { id: string }[];
  total: number;
}

type FeedTab = "contracts" | "upcoming" | "invoices" | "readiness";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const Arrow = language === "ar" ? ArrowUpLeft : ArrowUpRight;

  const canDashboard = hasClientPermission(user, "dashboard", "view");
  const canContracts = hasClientPermission(user, "contracts", "view");
  const canContractsWrite = hasClientPermission(user, "contracts", "write");
  const canInspections = hasClientPermission(user, "inspections", "view");
  const canFleet = hasClientPermission(user, "fleet", "view");
  const canCaptains = hasClientPermission(user, "captains", "view");
  const canInvoices = hasClientPermission(user, "invoices", "view");
  const canInvoicesWrite = hasClientPermission(user, "invoices", "write");
  const canCustomers = hasClientPermission(user, "customers", "view");
  const canStaff = hasClientPermission(user, "staff", "view");
  const canPurchases = hasClientPermission(user, "purchases", "view");
  const canAccounting = hasClientPermission(user, "accounting", "view");
  const canVat = hasClientPermission(user, "vatReturns", "view");

  const period = currentSaudiPeriod();
  const todayIso = period.day;

  const [refreshTick, setRefreshTick] = useState(0);
  const [activeTab, setActiveTab] = useState<FeedTab>("contracts");
  const [feedSearch, setFeedSearch] = useState("");
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [invoiceDownloadError, setInvoiceDownloadError] = useState("");
  const [preview, setPreview] = useState<{ id: string; referenceNumber: string } | null>(null);

  const stats = useApiQuery<DashboardStats>(canDashboard ? "/dashboard/stats" : null, refreshTick);
  const readiness = useApiQuery<ReadinessOverview>(canInspections ? "/inspections/overview" : null, refreshTick);
  const contractsQuery = useApiQuery<Contract[]>(canContracts ? "/contracts" : null, refreshTick);
  const fleetQuery = useApiQuery<Vehicle[]>(canFleet ? "/fleet" : null, refreshTick);
  const invoicesQuery = useApiQuery<InvoiceListResponse>(canInvoices ? "/invoices?page=1" : null, refreshTick);
  const customersQuery = useApiQuery<CustomerListResponse>(canCustomers ? "/workforce/customers?page=1" : null, refreshTick);
  const purchasesQuery = useApiQuery<PurchaseList>(canPurchases ? "/accounting/purchases?page=1" : null, refreshTick);
  const reportQuery = useApiQuery<FinancialReport>(
    canAccounting ? `/accounting/financial-report?mode=QUARTER&year=${period.year}&quarter=${period.quarter}` : null,
    refreshTick
  );

  const operationLabels: Record<string, string> = {
    AIRPORT_TRANSFER: text("نقل مطار", "Airport transfer"),
    CITY_TOUR: text("جولة داخل المدينة", "City tour"),
    INTERCITY: text("نقل بين المدن", "Intercity"),
    HAJJ_UMRAH: text("حج وعمرة", "Hajj & Umrah"),
  };

  const contractStatusLabels: Record<string, string> = {
    PENDING_REVIEW: text("قيد المراجعة", "Pending review"),
    APPROVED: text("معتمد", "Approved"),
    REJECTED: text("مرفوض", "Rejected"),
    ACTIVE: text("ساري", "Active"),
    EXPIRED: text("منتهي", "Expired"),
    CANCELLED: text("ملغي", "Cancelled"),
  };

  const allContracts = useMemo(
    () => toDashboardContracts(contractsQuery.data, stats.data?.recentContracts),
    [contractsQuery.data, stats.data?.recentContracts]
  );

  const rawContractsForTrend = useMemo(
    () =>
      contractsQuery.data && contractsQuery.data.length > 0
        ? contractsQuery.data
        : (stats.data?.recentContracts ?? []).map((c) => ({
            ...c,
            createdAt: c.tripDate,
          })),
    [contractsQuery.data, stats.data?.recentContracts]
  );

  const trend7 = useMemo(
    () => buildContractTrend(rawContractsForTrend, todayIso, 7, language),
    [rawContractsForTrend, todayIso, language]
  );
  const trend14 = useMemo(
    () => buildContractTrend(rawContractsForTrend, todayIso, 14, language),
    [rawContractsForTrend, todayIso, language]
  );
  const operationsBreakdown = useMemo(
    () => buildOperationBreakdown(allContracts),
    [allContracts]
  );

  const fleetAnalytics = useMemo(
    () => buildFleetAnalytics(fleetQuery.data ?? [], todayIso, 30),
    [fleetQuery.data, todayIso]
  );

  const pendingCaptains = useMemo(
    () =>
      (readiness.data?.captains ?? []).filter(
        (cap) => cap.active && !cap.hasTodayInspection
      ),
    [readiness.data?.captains]
  );

  const todayAndUpcomingTrips = useMemo(() => {
    return allContracts
      .filter((c) => {
        const day = normalizeIsoDay(c.tripDate);
        return day !== null && day >= todayIso;
      })
      .sort((a, b) => {
        const dayA = normalizeIsoDay(a.tripDate) ?? "";
        const dayB = normalizeIsoDay(b.tripDate) ?? "";
        if (dayA !== dayB) return dayA.localeCompare(dayB);
        return (a.tripTime || "").localeCompare(b.tripTime || "");
      });
  }, [allContracts, todayIso]);

  const todayStats = useMemo(() => {
    const todayRows = allContracts.filter((c) => normalizeIsoDay(c.tripDate) === todayIso);
    const todayPassengers = todayRows.reduce((sum, c) => sum + c.passengersCount, 0);
    const pendingReview = allContracts.filter((c) => c.status === "PENDING_REVIEW");
    return {
      todayContracts: todayRows.length,
      todayPassengers,
      pendingReview,
    };
  }, [allContracts, todayIso]);

  const profitSummary = useMemo(
    () => (reportQuery.data ? summarizeProfit(reportQuery.data.profit) : null),
    [reportQuery.data]
  );

  const qSearch = feedSearch.trim().toLowerCase();

  const visibleRecentContracts = useMemo(() => {
    const base = allContracts.slice(0, qSearch ? 50 : 8);
    if (!qSearch) return base;
    return base
      .filter((c) =>
        [c.referenceNumber, c.customerName, c.captainName, c.vehiclePlate, c.origin, c.destination]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(qSearch))
      )
      .slice(0, 12);
  }, [allContracts, qSearch]);

  const visibleUpcomingTrips = useMemo(() => {
    if (!qSearch) return todayAndUpcomingTrips.slice(0, 10);
    return todayAndUpcomingTrips
      .filter((c) =>
        [c.referenceNumber, c.customerName, c.captainName, c.vehiclePlate, c.origin, c.destination]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(qSearch))
      )
      .slice(0, 12);
  }, [todayAndUpcomingTrips, qSearch]);

  const visibleInvoices = useMemo(() => {
    const items = invoicesQuery.data?.items ?? [];
    if (!qSearch) return items.slice(0, 8);
    return items
      .filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(qSearch) ||
          inv.customerName.toLowerCase().includes(qSearch)
      )
      .slice(0, 12);
  }, [invoicesQuery.data?.items, qSearch]);

  const visibleCaptains = useMemo(() => {
    const caps = readiness.data?.captains ?? [];
    if (!qSearch) return caps;
    return caps.filter(
      (c) =>
        c.name.toLowerCase().includes(qSearch) ||
        (c.assignedVehiclePlate || "").toLowerCase().includes(qSearch) ||
        (c.phone || "").includes(qSearch)
    );
  }, [readiness.data?.captains, qSearch]);

  const visibleVehicles = useMemo(() => {
    const vehs = fleetQuery.data ?? [];
    if (!qSearch) return vehs;
    return vehs.filter(
      (v) =>
        v.plateNumberAr.toLowerCase().includes(qSearch) ||
        v.plateNumberEn.toLowerCase().includes(qSearch) ||
        v.make.toLowerCase().includes(qSearch) ||
        v.model.toLowerCase().includes(qSearch)
    );
  }, [fleetQuery.data, qSearch]);

  const totalCaptainsCount =
    readiness.data?.stats.totalCaptains ?? stats.data?.totalCaptains ?? 0;
  const inspectedTodayCount = readiness.data?.stats.inspectedToday ?? 0;
  const pendingTodayCount = readiness.data?.stats.pendingToday ?? 0;
  const availableVehiclesCount =
    fleetQuery.data ? fleetAnalytics.available : (stats.data?.activeVehicles ?? 0);
  const totalVehiclesCount =
    fleetQuery.data ? fleetAnalytics.total : (stats.data?.totalVehicles ?? 0);

  const shortcuts = [
    ...(canContracts
      ? [
          {
            title: text("عقود النقل", "Contracts"),
            meta: text("إصدار ومتابعة", "Issue & track"),
            href: "/admin/contracts",
            icon: FileText,
            pill: stats.data ? String(stats.data.totalContracts) : "—",
            pillVariant: "gold" as const,
          },
        ]
      : []),
    ...(canInvoices
      ? [
          {
            title: text("الفواتير", "Invoices"),
            meta: text("ضريبية وحجوزات", "Tax & booking"),
            href: "/admin/invoices",
            icon: ReceiptText,
            pill: invoicesQuery.data ? String(invoicesQuery.data.total) : "—",
            pillVariant: "secondary" as const,
          },
        ]
      : []),
    ...(canInspections
      ? [
          {
            title: text("الفحوصات", "Inspections"),
            meta: pendingTodayCount > 0 ? text("بانتظار الفحص", "Needs check") : text("مكتمل اليوم", "Ready today"),
            href: "/admin/inspections",
            icon: ClipboardCheck,
            pill: readiness.data ? (pendingTodayCount > 0 ? `${pendingTodayCount}` : "✓") : "—",
            pillVariant: pendingTodayCount > 0 ? ("warning" as const) : ("success" as const),
          },
        ]
      : []),
    ...(canFleet
      ? [
          {
            title: text("الأسطول", "Fleet"),
            meta: text("الحافلات والوثائق", "Vehicles & docs"),
            href: "/admin/fleet",
            icon: Car,
            pill: `${availableVehiclesCount}/${totalVehiclesCount}`,
            pillVariant: fleetAnalytics.alerts.length > 0 ? ("destructive" as const) : ("outline" as const),
          },
        ]
      : []),
    ...(canCaptains
      ? [
          {
            title: text("الكباتن", "Captains"),
            meta: text("السائقون النشطون", "Active drivers"),
            href: "/admin/captains",
            icon: UserCheck,
            pill: String(totalCaptainsCount),
            pillVariant: "secondary" as const,
          },
        ]
      : []),
    ...(canCustomers
      ? [
          {
            title: text("العملاء", "Customers"),
            meta: text("جهات وشركات", "Clients ledger"),
            href: "/admin/customers",
            icon: Users,
            pill: customersQuery.data ? String(customersQuery.data.total) : "—",
            pillVariant: "outline" as const,
          },
        ]
      : []),
    ...(canStaff
      ? [
          {
            title: text("العاملون", "Staff"),
            meta: text("عهد، سلف، عمولات", "Salaries & dues"),
            href: "/admin/staff",
            icon: Wallet,
            pill: text("إدارة", "Open"),
            pillVariant: "outline" as const,
          },
        ]
      : []),
    ...(canVat
      ? [
          {
            title: text("الضريبة", "VAT & tax"),
            meta: text("إقرارات القيمة المضافة", "Returns & ZATCA"),
            href: "/admin/vat-returns",
            icon: ShieldCheck,
            pill:
              reportQuery.data && reportQuery.data.unpostedInvoices.length > 0
                ? `${reportQuery.data.unpostedInvoices.length} !`
                : `Q${period.quarter}`,
            pillVariant:
              reportQuery.data && reportQuery.data.unpostedInvoices.length > 0
                ? ("warning" as const)
                : ("outline" as const),
          },
        ]
      : []),
  ];

  async function handleInvoicePdf(id: string) {
    setDownloadingInvoiceId(id);
    setInvoiceDownloadError("");
    try {
      await downloadInvoice(id);
    } catch (error: unknown) {
      setInvoiceDownloadError(
        error instanceof Error ? error.message : text("تعذر تنزيل الفاتورة", "Unable to download invoice")
      );
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="space-y-4">
        <PageHeader
          title={text("نظرة عامة على العمل", "Workspace overview")}
          subtitle={text(
            "متابعة العقود، جاهزية الكباتن والأسطول، الفواتير، والأداء المالي من مكان واحد.",
            "Follow operational readiness, fleet compliance, contracts, invoices, and financial performance in one workspace."
          )}
          primaryAction={
            canContractsWrite
              ? {
                  label: text("عقد جديد", "New contract"),
                  href: "/admin/contracts/new",
                  icon: Plus,
                }
              : canInvoicesWrite
                ? {
                    label: text("فاتورة", "New invoice"),
                    href: "/admin/invoices/new",
                    icon: ReceiptText,
                  }
                : undefined
          }
          secondaryActions={[
            ...(canContractsWrite && canInvoicesWrite
              ? [
                  {
                    label: text("فاتورة", "New invoice"),
                    href: "/admin/invoices/new",
                    icon: ReceiptText,
                  },
                ]
              : []),
            ...(canPurchases
              ? [
                  {
                    label: text("مصروف", "Expense"),
                    href: "/admin/purchases",
                    icon: Wallet,
                  },
                ]
              : []),
          ]}
          onRefresh={() => setRefreshTick((v) => v + 1)}
          isRefreshing={stats.isLoading || readiness.isLoading || contractsQuery.isLoading}
        />

        <LoadError message={stats.error} onRetry={stats.refetch} />
      </div>

      {/* Practical Compact Quick-Workflows Strip (Horizontal snap rail on mobile, 4-col grid on tablet/desktop) */}
      <section aria-labelledby="quick-workflows-heading" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 id="quick-workflows-heading" className="text-sm font-semibold text-[var(--text-main)]">
            {text("الوصول السريع للأقسام", "Quick navigation")}
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            {text("مع إحصاء مباشر لكل قسم", "With live section counts")}
          </span>
        </div>

        <div className="sm:hidden">
          <MobileHorizontalStrip label={text("الوصول السريع للأقسام", "Quick navigation")}>
            {shortcuts.map((sc) => {
              const Icon = sc.icon;
              return (
                <Link
                  key={sc.href}
                  href={sc.href}
                  className="snap-start shrink-0 min-w-[144px] focus-visible:outline-2 focus-visible:outline-[var(--focus-color)] rounded-xl"
                >
                  <Card className="theme-card border theme-border shadow-none h-full min-h-[72px] p-3 flex flex-col justify-between gap-2 hover:border-[var(--accent-gold)]/60 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                      <Badge variant={sc.pillVariant} className="font-mono text-[11px] px-1.5 py-0.5 shrink-0">
                        <bdi>{sc.pill}</bdi>
                      </Badge>
                    </div>
                    <span className="block truncate text-xs font-semibold text-[var(--text-main)]">
                      {sc.title}
                    </span>
                  </Card>
                </Link>
              );
            })}
          </MobileHorizontalStrip>
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {shortcuts.map((sc) => {
            const Icon = sc.icon;
            return (
              <Link
                key={sc.href}
                href={sc.href}
                className="group min-w-0 min-h-[60px] flex items-center justify-between gap-2 rounded-xl border theme-border bg-[var(--bg-card)] px-3.5 py-2.5 hover:border-[var(--accent-gold)]/60 hover:bg-[var(--accent-surface)]/45 transition focus-visible:outline-2 focus-visible:outline-[var(--focus-color)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-surface)] text-[var(--accent-gold)] group-hover:bg-[var(--accent-btn-bg)] group-hover:text-[var(--accent-btn-fg)] flex items-center justify-center shrink-0 transition-colors">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--accent-gold)] transition-colors">
                      {sc.title}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      {sc.meta}
                    </span>
                  </div>
                </div>
                <Badge variant={sc.pillVariant} className="font-mono text-[11px] px-2 py-0.5 shrink-0">
                  <bdi>{sc.pill}</bdi>
                </Badge>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Executive KPI Strip */}
      <section aria-labelledby="kpi-strip-heading">
        <h2 id="kpi-strip-heading" className="sr-only">
          {text("المؤشرات الرئيسية", "Key performance indicators")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label={text("إجمالي العقود", "Total contracts")}
            value={stats.data?.totalContracts ?? "—"}
            icon={FileText}
            variant="amber"
            subtext={`${todayStats.todayContracts} ${text("اليوم", "today")} · ${todayAndUpcomingTrips.length} ${text("قادم", "upcoming")}`}
            isLoading={stats.isLoading}
          />
          <StatCard
            label={text("الأسطول المتاح", "Available fleet")}
            value={
              stats.data || fleetQuery.data
                ? `${availableVehiclesCount}/${totalVehiclesCount}`
                : "—"
            }
            icon={Car}
            variant="blue"
            subtext={`${fleetAnalytics.totalSeats} ${text("مقعد إجمالاً", "seats capacity")}`}
            isLoading={stats.isLoading && fleetQuery.isLoading}
          />
          <StatCard
            label={text("جاهزية الكباتن اليوم", "Daily checks")}
            value={
              readiness.data
                ? `${inspectedTodayCount}/${totalCaptainsCount}`
                : stats.data?.totalCaptains ?? "—"
            }
            icon={ClipboardCheck}
            variant={pendingTodayCount > 0 ? "amber" : "emerald"}
            subtext={
              pendingTodayCount > 0
                ? `${pendingTodayCount} ${text("بانتظار الفحص", "pending today")}`
                : text("جاهزية مكتملة", "All inspected")
            }
            isLoading={readiness.isLoading && stats.isLoading}
          />
          <StatCard
            label={text("إيرادات الربع", "Quarter revenue")}
            value={
              reportQuery.data ? formatMoneyValue(reportQuery.data.profit.revenue) : "—"
            }
            unit={text("ر.س", "SAR")}
            icon={Wallet}
            variant="emerald"
            subtext={
              profitSummary
                ? `${text("صافي", "Net")}: ${formatMoneyValue(reportQuery.data?.profit.afterTax)} (${profitSummary.marginPercent}%)`
                : text("الحركات المرحّلة", "Posted entries")
            }
            isLoading={reportQuery.isLoading}
          />
          <div className="col-span-2 sm:col-span-1">
            <StatCard
              label={text("الفواتير والعملاء", "Invoices & clients")}
              value={invoicesQuery.data?.total ?? "—"}
              unit={text("فاتورة", "inv")}
              icon={ReceiptText}
              variant="default"
              subtext={`${customersQuery.data?.total ?? "—"} ${text("عميل مسجل", "registered clients")}`}
              isLoading={invoicesQuery.isLoading && customersQuery.isLoading}
            />
          </div>
        </div>
      </section>

      {/* Actionable Daily Control Center */}
      <ActionCenter
        pendingCaptains={pendingCaptains}
        expiryAlerts={fleetAnalytics.alerts}
        unpostedInvoicesCount={reportQuery.data?.unpostedInvoices.length ?? 0}
        pendingContracts={todayStats.pendingReview}
        isLoading={
          readiness.isLoading && fleetQuery.isLoading && reportQuery.isLoading && contractsQuery.isLoading
        }
        hasLoadError={Boolean(readiness.error || fleetQuery.error || reportQuery.error || contractsQuery.error)}
      />

      {/* Multi-View Live Operational Records Desk */}
      <Card className="theme-card overflow-hidden rounded-2xl border theme-border shadow-none">
        <div className="border-b theme-border p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="operational-feed-title" className="text-base sm:text-lg font-semibold text-[var(--text-main)]">
                {text("سجل العمليات والمتابعة اليومية", "Live operations & records desk")}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {text(
                  "تصفح العقود والرحلات القادمة والفواتير وحالة الكباتن والأسطول مع إجراءات سريعة.",
                  "Switch between recent contracts, upcoming trips, invoices, and captain/fleet readiness."
                )}
              </p>
            </div>

            <Link
              href={
                activeTab === "invoices"
                  ? "/admin/invoices"
                  : activeTab === "readiness"
                    ? "/admin/fleet"
                    : "/admin/contracts"
              }
              className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-9 px-3 rounded-lg text-xs sm:text-sm font-semibold text-[var(--accent-gold)] hover:underline"
            >
              <span>
                {activeTab === "invoices"
                  ? text("جميع الفواتير", "All invoices")
                  : activeTab === "readiness"
                    ? text("إدارة الأسطول", "Manage fleet")
                    : text("جميع العقود", "All contracts")}
              </span>
              <Arrow className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Accessible Segmented Filter Tabs */}
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label={text("أقسام المتابعة", "Workspace record views")}
            >
              {(
                [
                  {
                    id: "contracts" as const,
                    label: text("أحدث العقود", "Recent contracts"),
                    count: allContracts.length,
                  },
                  {
                    id: "upcoming" as const,
                    label: text("الرحلات القادمة", "Today & upcoming"),
                    count: todayAndUpcomingTrips.length,
                  },
                  {
                    id: "invoices" as const,
                    label: text("أحدث الفواتير", "Recent invoices"),
                    count: invoicesQuery.data?.items.length ?? 0,
                  },
                  {
                    id: "readiness" as const,
                    label: text("الكباتن والأسطول", "Captains & fleet"),
                    count: totalCaptainsCount + totalVehiclesCount,
                  },
                ]
              ).map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg border text-xs sm:text-[0.8125rem] font-semibold whitespace-nowrap inline-flex items-center gap-2 transition-none cursor-pointer ${
                      isSelected
                        ? "bg-[var(--accent-btn-bg)] border-[var(--accent-btn-border)] text-[var(--accent-btn-fg)]"
                        : "bg-[var(--bg-card-subtle)] border-[var(--control-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-gold)]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`font-mono text-xs tabular-nums ${isSelected ? "opacity-90" : "opacity-85"}`}>
                      <bdi>{tab.count}</bdi>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Instant Search */}
            <div className="relative w-full lg:w-72 shrink-0">
              <Search
                className="w-4 h-4 text-[var(--text-muted)] pointer-events-none absolute top-1/2 -translate-y-1/2 start-3"
                aria-hidden="true"
              />
              <input
                type="search"
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                placeholder={text("بحث سريع بالمرجع، العميل، اللوحة...", "Filter by ref, customer, plate...")}
                aria-label={text("بحث سريع في السجل", "Quick filter dashboard records")}
                className="w-full min-h-11 sm:min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--input-bg)] ps-9 pe-9 py-1.5 text-base sm:text-[0.8125rem] text-[var(--text-main)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent-gold)] focus:outline-hidden"
              />
              {feedSearch && (
                <button
                  type="button"
                  onClick={() => setFeedSearch("")}
                  aria-label={text("مسح البحث", "Clear search")}
                  className="absolute top-1/2 -translate-y-1/2 end-1.5 min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {invoiceDownloadError && (
          <p role="alert" className="mx-4 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {invoiceDownloadError}
          </p>
        )}

        {(activeTab === "contracts" || activeTab === "upcoming") && (
          <>
            {stats.isLoading && !allContracts.length ? (
              <div className="space-y-3 p-5 sm:p-6" aria-busy="true">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-lg theme-card-subtle" />
                ))}
              </div>
            ) : (activeTab === "contracts" ? visibleRecentContracts : visibleUpcomingTrips).length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-muted)]">
                {qSearch
                  ? text("لا توجد عقود مطابقة لعبارة البحث", "No matching contracts found")
                  : activeTab === "upcoming"
                    ? text("لا توجد رحلات مجدولة اليوم أو خلال الأيام القادمة", "No trips scheduled for today or upcoming dates")
                    : text("لا توجد عقود مسجلة بعد", "No recorded contracts yet")}
              </p>
            ) : (
              <>
                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 sm:p-4">
                  {(activeTab === "contracts"
                    ? visibleRecentContracts
                    : visibleUpcomingTrips
                  ).map((contract) => (
                    <MobileRecordCard
                      key={contract.id}
                      titleAs="h3"
                      title={
                        <>
                          <Link
                            href={`/admin/contracts/${contract.id}`}
                            className="font-mono text-sm font-bold text-[var(--accent-gold)] hover:underline"
                          >
                            <bdi>{contract.referenceNumber}</bdi>
                          </Link>
                          <Badge variant="outline" className="text-[11px] font-normal px-1.5 py-0">
                            {operationLabels[contract.operationType] || contract.operationType}
                          </Badge>
                        </>
                      }
                      subtitle={
                        <div className="space-y-1">
                          <span className="block font-medium text-[var(--text-main)]">
                            {contract.customerName}
                          </span>
                          {(contract.origin || contract.destination) && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                              <MapPin className="w-3 h-3 shrink-0 text-[var(--accent-gold)]" aria-hidden="true" />
                              <span className="break-words">
                                {contract.origin} {language === "ar" ? "←" : "→"} {contract.destination}
                              </span>
                            </span>
                          )}
                        </div>
                      }
                      badge={
                        contract.status ? (
                          <Badge
                            variant={
                              contract.status === "APPROVED" || contract.status === "ACTIVE"
                                ? "success"
                                : contract.status === "REJECTED" || contract.status === "CANCELLED"
                                  ? "destructive"
                                  : contract.status === "PENDING_REVIEW"
                                    ? "warning"
                                    : "secondary"
                            }
                            className="text-[11px]"
                          >
                            {contractStatusLabels[contract.status] || contract.status}
                          </Badge>
                        ) : undefined
                      }
                      footer={
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 min-h-11 gap-1.5 text-xs"
                            aria-label={`${text("معاينة العقد", "Preview contract")} ${contract.referenceNumber}`}
                            onClick={() =>
                              setPreview({
                                id: contract.id,
                                referenceNumber: contract.referenceNumber,
                              })
                            }
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{text("معاينة", "PDF")}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1 min-h-11 gap-1.5 text-xs font-semibold"
                          >
                            <Link
                              href={`/admin/contracts/${contract.id}`}
                              aria-label={`${text("عرض العقد", "View contract")} ${contract.referenceNumber}`}
                            >
                              <span>{text("التفاصيل", "Details")}</span>
                              <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="min-h-11 px-3 gap-1.5 text-xs"
                          >
                            <Link
                              href={`/admin/invoices/new?contractId=${encodeURIComponent(contract.id)}`}
                              aria-label={`${text("إصدار فاتورة للعقد", "Create invoice for")} ${contract.referenceNumber}`}
                              title={text("إصدار فاتورة من العقد", "Create invoice from contract")}
                            >
                              <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </Link>
                          </Button>
                        </>
                      }
                    >
                      <MobileCardMetaGrid>
                        <MobileCardField
                          label={text("الكابتن", "Captain")}
                          value={contract.captainName}
                        />
                        <MobileCardField
                          label={text("المركبة", "Vehicle")}
                          mono
                          value={<bdi>{contract.vehiclePlate}</bdi>}
                        />
                        <MobileCardField
                          label={text("موعد الرحلة", "Trip schedule")}
                          mono
                          value={
                            <bdi dir="ltr">
                              {contract.tripDate.slice(0, 10)}
                              {contract.tripTime ? ` · ${contract.tripTime}` : ""}
                            </bdi>
                          }
                        />
                        <MobileCardField
                          label={text("الركاب", "Passengers")}
                          mono
                          value={`${contract.passengersCount} ${text("ركاب", "pax")}`}
                        />
                      </MobileCardMetaGrid>
                    </MobileRecordCard>
                  ))}
                </div>

                <div className="hidden lg:block">
                  <Table
                    regionLabelledBy="operational-feed-title"
                    wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                  >
                    <TableCaption className="sr-only">
                      {activeTab === "upcoming"
                        ? text("الرحلات القادمة", "Today & upcoming")
                        : text("أحدث العقود", "Recent contracts")}
                    </TableCaption>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-start">
                          {text("العقد والعملية", "Contract & type")}
                        </TableHead>
                        <TableHead className="text-start">
                          {text("العميل والوجهة", "Customer & route")}
                        </TableHead>
                        <TableHead className="text-start">
                          {text("الكابتن والمركبة", "Captain & vehicle")}
                        </TableHead>
                        <TableHead className="text-start">
                          {text("الموعد والركاب", "Schedule & pax")}
                        </TableHead>
                        <TableHead className="text-end">
                          {text("الإجراءات", "Actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(activeTab === "contracts"
                        ? visibleRecentContracts
                        : visibleUpcomingTrips
                      ).map((contract) => (
                        <TableRow key={contract.id}>
                          <th scope="row" className="p-4 py-3.5 text-start align-middle font-medium text-[var(--text-main)]">
                            <div className="flex flex-col gap-1.5 items-start">
                              <Link
                                href={`/admin/contracts/${contract.id}`}
                                className="font-mono text-xs sm:text-sm font-bold text-[var(--text-main)] hover:text-[var(--accent-gold)] whitespace-nowrap transition-colors"
                              >
                                <bdi>{contract.referenceNumber}</bdi>
                              </Link>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="outline" className="rounded-lg text-[11px] font-normal px-2 py-0.5 whitespace-nowrap">
                                  {operationLabels[contract.operationType] || contract.operationType}
                                </Badge>
                                {contract.status && (
                                  <Badge
                                    variant={
                                      contract.status === "APPROVED" || contract.status === "ACTIVE"
                                        ? "success"
                                        : contract.status === "REJECTED" || contract.status === "CANCELLED"
                                          ? "destructive"
                                          : contract.status === "PENDING_REVIEW"
                                            ? "warning"
                                            : "secondary"
                                    }
                                    className="rounded-lg text-[11px] px-2 py-0.5 whitespace-nowrap"
                                  >
                                    {contractStatusLabels[contract.status] || contract.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </th>
                          <TableCell className="py-3.5">
                            <div className="space-y-0.5 max-w-[230px]">
                              <span className="block text-xs sm:text-sm font-semibold text-[var(--text-main)] break-words">
                                {contract.customerName}
                              </span>
                              {(contract.origin || contract.destination) && (
                                <span className="flex max-w-full items-center gap-1 text-[11px] text-[var(--text-muted)]">
                                  <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  <span className="min-w-0 truncate">
                                    {contract.origin} {language === "ar" ? "←" : "→"} {contract.destination}
                                  </span>
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="text-[var(--text-main)] font-medium whitespace-nowrap">
                                {contract.captainName}
                              </span>
                              <div>
                                <Badge variant="secondary" className="rounded-lg font-mono text-[11px] px-2 py-0.5 whitespace-nowrap">
                                  <bdi>{contract.vehiclePlate}</bdi>
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="font-mono font-medium text-[var(--text-main)] whitespace-nowrap" dir="ltr">
                                <bdi>
                                  {contract.tripDate.slice(0, 10)}
                                  {contract.tripTime ? ` · ${contract.tripTime}` : ""}
                                </bdi>
                              </span>
                              <div>
                                <Badge variant="secondary" className="rounded-lg font-mono text-[11px] gap-1 px-2 py-0.5 whitespace-nowrap">
                                  <Users className="w-3 h-3 text-[var(--text-muted)]" aria-hidden="true" />
                                  <span>{contract.passengersCount}</span>
                                  <span className="text-[10px] text-[var(--text-muted)] font-sans">
                                    {text("ركاب", "pax")}
                                  </span>
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-end py-3.5">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-h-11 lg:min-h-9 gap-1.5 text-xs whitespace-nowrap"
                                aria-label={`${text("معاينة العقد", "Preview contract")} ${contract.referenceNumber}`}
                                onClick={() =>
                                  setPreview({
                                    id: contract.id,
                                    referenceNumber: contract.referenceNumber,
                                  })
                                }
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span className="hidden sm:inline">
                                  {text("معاينة PDF", "Preview PDF")}
                                </span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="min-h-11 lg:min-h-9 gap-1.5 text-xs whitespace-nowrap"
                              >
                                <Link
                                  href={`/admin/invoices/new?contractId=${encodeURIComponent(contract.id)}`}
                                  aria-label={`${text("إصدار فاتورة للعقد", "Create invoice for")} ${contract.referenceNumber}`}
                                  title={text("إصدار فاتورة من العقد", "Create invoice from contract")}
                                >
                                  <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span className="hidden lg:inline">{text("فاتورة", "Invoice")}</span>
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="min-h-11 lg:min-h-9 gap-1.5 text-xs font-semibold whitespace-nowrap"
                              >
                                <Link
                                  href={`/admin/contracts/${contract.id}`}
                                  aria-label={`${text("عرض العقد", "View contract")} ${contract.referenceNumber}`}
                                >
                                  <span>{text("التفاصيل", "Details")}</span>
                                  <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "invoices" && (
          <>
            {invoicesQuery.isLoading ? (
              <div className="space-y-3 p-5 sm:p-6" aria-busy="true">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-lg theme-card-subtle" />
                ))}
              </div>
            ) : visibleInvoices.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-muted)]">
                {text("لا توجد فواتير مطابقة للعرض", "No matching invoices found")}
              </p>
            ) : (
              <>
                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 sm:p-4">
                  {visibleInvoices.map((inv) => (
                    <MobileRecordCard
                      key={inv.id}
                      titleAs="h3"
                      title={
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          className="font-mono text-sm font-bold text-[var(--text-main)] hover:text-[var(--accent-gold)]"
                        >
                          <bdi>{inv.invoiceNumber}</bdi>
                        </Link>
                      }
                      subtitle={
                        <span>
                          {inv.customerName} ·{" "}
                          <span className="font-mono">
                            <bdi>{dateLabel(inv.invoiceDate, language)}</bdi>
                          </span>
                        </span>
                      }
                      badge={
                        <Badge variant={inv.documentType === "TAX" ? "gold" : "outline"} className="rounded-lg text-[11px] whitespace-nowrap">
                          {invoiceTitle(inv)}
                        </Badge>
                      }
                      footer={
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={downloadingInvoiceId === inv.id}
                            aria-label={`${text("تنزيل فاتورة PDF", "Download invoice PDF")} ${inv.invoiceNumber}`}
                            onClick={() => void handleInvoicePdf(inv.id)}
                            className="flex-1 min-h-11 gap-1.5 text-xs"
                          >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{text("PDF", "PDF")}</span>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="flex-1 min-h-11 gap-1.5 text-xs">
                            <Link
                              href={`/admin/invoices/${inv.id}`}
                              aria-label={`${text("عرض الفاتورة", "Open invoice")} ${inv.invoiceNumber}`}
                            >
                              <span>{text("عرض", "Open")}</span>
                              <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
                            </Link>
                          </Button>
                        </>
                      }
                    >
                      <MobileCardMetaGrid columns={3}>
                        <MobileCardField
                          label={text("الصافي", "Net")}
                          value={<Money amount={inv.netAmount} size="xs" />}
                        />
                        <MobileCardField
                          label={text("الضريبة", "VAT")}
                          value={<Money amount={inv.vatAmount} size="xs" color="muted" />}
                        />
                        <MobileCardField
                          label={text("الإجمالي", "Total")}
                          value={<Money amount={inv.totalAmount} size="xs" color="emerald" />}
                        />
                      </MobileCardMetaGrid>
                    </MobileRecordCard>
                  ))}
                </div>

                <div className="hidden lg:block">
                  <Table
                    regionLabelledBy="operational-feed-title"
                    wrapperClassName="border-0 rounded-none shadow-none bg-transparent"
                  >
                    <TableCaption className="sr-only">
                      {text("أحدث الفواتير", "Recent invoices")}
                    </TableCaption>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-start">{text("رقم الفاتورة", "Invoice #")}</TableHead>
                        <TableHead className="text-start">{text("النوع", "Type")}</TableHead>
                        <TableHead className="text-start">{text("العميل", "Customer")}</TableHead>
                        <TableHead className="text-start">{text("التاريخ", "Date")}</TableHead>
                        <TableHead className="text-start">{text("الصافي والضريبة", "Net & VAT")}</TableHead>
                        <TableHead className="text-start">{text("الإجمالي", "Total")}</TableHead>
                        <TableHead className="text-end">{text("الإجراءات", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <th scope="row" className="p-4 py-3.5 text-start align-middle font-mono text-xs sm:text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                            <Link
                              href={`/admin/invoices/${inv.id}`}
                              className="text-[var(--text-main)] hover:text-[var(--accent-gold)] whitespace-nowrap"
                            >
                              <bdi>{inv.invoiceNumber}</bdi>
                            </Link>
                          </th>
                          <TableCell className="py-3.5">
                            <Badge variant={inv.documentType === "TAX" ? "gold" : "outline"} className="rounded-lg text-[11px] whitespace-nowrap">
                              {invoiceTitle(inv)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3.5 text-xs sm:text-sm font-medium text-[var(--text-main)]">
                            {inv.customerName}
                          </TableCell>
                          <TableCell className="py-3.5 text-xs text-[var(--text-muted)] font-mono whitespace-nowrap">
                            <bdi>{dateLabel(inv.invoiceDate, language)}</bdi>
                          </TableCell>
                          <TableCell className="py-3.5 text-xs whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <Money amount={inv.netAmount} size="xs" />
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {text("ضريبة", "VAT")}: <Money amount={inv.vatAmount} size="xs" color="muted" />
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 whitespace-nowrap">
                            <Money amount={inv.totalAmount} size="sm" color="emerald" />
                          </TableCell>
                          <TableCell className="py-3.5 text-end">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={downloadingInvoiceId === inv.id}
                                aria-label={`${text("تنزيل فاتورة PDF", "Download invoice PDF")} ${inv.invoiceNumber}`}
                                onClick={() => void handleInvoicePdf(inv.id)}
                                className="min-h-11 lg:min-h-9 gap-1.5 text-xs whitespace-nowrap"
                              >
                                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{text("PDF", "PDF")}</span>
                              </Button>
                              <Button variant="outline" size="sm" asChild className="min-h-11 lg:min-h-9 gap-1.5 text-xs whitespace-nowrap">
                                <Link
                                  href={`/admin/invoices/${inv.id}`}
                                  aria-label={`${text("عرض الفاتورة", "Open invoice")} ${inv.invoiceNumber}`}
                                >
                                  <span>{text("عرض", "Open")}</span>
                                  <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "readiness" && (
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Captains Today Table */}
            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  {text("حالة فحص الكباتن اليوم", "Captain readiness today")}
                </h3>
                <Link
                  href="/admin/inspections"
                  className="inline-flex items-center min-h-11 sm:min-h-0 px-1 text-xs font-semibold text-[var(--accent-gold)] hover:underline"
                >
                  {text("فتح شاشة الفحوصات", "Open inspections")}
                </Link>
              </div>
              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {visibleCaptains.length === 0 ? (
                  <p className="md:col-span-2 rounded-xl border theme-border p-5 text-center text-xs text-[var(--text-muted)]">
                    {text("لا يوجد كباتن مطابقون", "No matching captains")}
                  </p>
                ) : (
                  visibleCaptains.slice(0, 8).map((cap) => (
                    <MobileRecordCard
                      key={cap.id}
                      title={cap.name}
                      subtitle={
                        cap.assignedVehiclePlate ? (
                          <Badge variant="secondary" className="rounded-lg font-mono text-[11px] mt-0.5 whitespace-nowrap">
                            <bdi>{cap.assignedVehiclePlate}</bdi>
                          </Badge>
                        ) : (
                          <span>{text("بدون مركبة معينة", "No assigned vehicle")}</span>
                        )
                      }
                      badge={
                        <Badge variant={cap.hasTodayInspection ? "success" : "warning"} className="rounded-lg whitespace-nowrap">
                          {cap.hasTodayInspection
                            ? text("مكتمل", "Inspected")
                            : text("بانتظار الفحص", "Pending")}
                        </Badge>
                      }
                    />
                  ))
                )}
              </div>

              <div className="hidden lg:block">
                <Table
                  regionLabel={text("حالة فحص الكباتن اليوم", "Captain readiness today")}
                  wrapperClassName="rounded-xl shadow-none"
                >
                  <TableCaption className="sr-only">
                    {text("حالة فحص الكباتن اليوم", "Captain readiness today")}
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-start">{text("الكابتن", "Captain")}</TableHead>
                      <TableHead className="text-start">{text("المركبة", "Vehicle")}</TableHead>
                      <TableHead className="text-end">{text("الفحص اليومي", "Daily check")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCaptains.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-[var(--text-muted)] py-6">
                          {text("لا يوجد كباتن مطابقون", "No matching captains")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleCaptains.slice(0, 8).map((cap) => (
                        <TableRow key={cap.id}>
                          <th scope="row" className="px-4 py-2.5 text-start align-middle text-xs font-semibold text-[var(--text-main)]">
                            {cap.name}
                          </th>
                          <TableCell className="py-2.5">
                            {cap.assignedVehiclePlate ? (
                              <Badge variant="secondary" className="rounded-lg font-mono text-[11px] whitespace-nowrap">
                                <bdi>{cap.assignedVehiclePlate}</bdi>
                              </Badge>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 text-end">
                            <Badge variant={cap.hasTodayInspection ? "success" : "warning"} className="rounded-lg whitespace-nowrap">
                              {cap.hasTodayInspection
                                ? text("مكتمل", "Inspected")
                                : text("بانتظار الفحص", "Pending")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Fleet Status & Expiry Table */}
            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  {text("حالة الأسطول والوثائق", "Fleet status & expiries")}
                </h3>
                <Link
                  href="/admin/fleet"
                  className="inline-flex items-center min-h-11 sm:min-h-0 px-1 text-xs font-semibold text-[var(--accent-gold)] hover:underline"
                >
                  {text("إدارة المركبات", "Open fleet")}
                </Link>
              </div>

              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {visibleVehicles.length === 0 ? (
                  <p className="md:col-span-2 rounded-xl border theme-border p-5 text-center text-xs text-[var(--text-muted)]">
                    {text("لا توجد مركبات مطابقة", "No matching vehicles")}
                  </p>
                ) : (
                  visibleVehicles.slice(0, 8).map((veh) => {
                    const regDays = diffCalendarDays(veh.registrationExpiry, todayIso);
                    const insDays = diffCalendarDays(veh.insuranceExpiry, todayIso);
                    const minDays =
                      regDays !== null && insDays !== null
                        ? Math.min(regDays, insDays)
                        : (regDays ?? insDays);

                    return (
                      <MobileRecordCard
                        key={veh.id}
                        title={
                          <span className="font-mono">
                            <bdi>{veh.plateNumberAr || veh.plateNumberEn}</bdi>
                          </span>
                        }
                        subtitle={`${veh.make} ${veh.model} (${veh.capacity})`}
                        badge={<StatusBadge type="vehicle" status={veh.status} />}
                      >
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-[var(--text-muted)]">
                            {text("الاستمارة / التأمين", "Reg. / Insurance")}
                          </span>
                          {minDays !== null && minDays <= 30 ? (
                            <Badge variant={minDays < 0 ? "destructive" : "warning"} className="rounded-lg font-mono text-[11px] whitespace-nowrap">
                              {minDays < 0
                                ? text("منتهٍ", "Expired")
                                : text(`خلال ${minDays}ي`, `${minDays}d left`)}
                            </Badge>
                          ) : (
                            <Badge variant="success" className="rounded-lg text-[11px] whitespace-nowrap">
                              {text("ساري", "Valid")}
                            </Badge>
                          )}
                        </div>
                      </MobileRecordCard>
                    );
                  })
                )}
              </div>

              <div className="hidden lg:block">
                <Table
                  regionLabel={text("حالة الأسطول والوثائق", "Fleet status & expiries")}
                  wrapperClassName="rounded-xl shadow-none"
                >
                  <TableCaption className="sr-only">
                    {text("حالة الأسطول والوثائق", "Fleet status & expiries")}
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-start">{text("المركبة", "Vehicle")}</TableHead>
                      <TableHead className="text-start">{text("الحالة", "Status")}</TableHead>
                      <TableHead className="text-end">{text("الاستمارة / التأمين", "Reg. / Insurance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs text-[var(--text-muted)] py-6">
                          {text("لا توجد مركبات مطابقة", "No matching vehicles")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleVehicles.slice(0, 8).map((veh) => {
                        const regDays = diffCalendarDays(veh.registrationExpiry, todayIso);
                        const insDays = diffCalendarDays(veh.insuranceExpiry, todayIso);
                        const minDays =
                          regDays !== null && insDays !== null
                            ? Math.min(regDays, insDays)
                            : (regDays ?? insDays);

                        return (
                          <TableRow key={veh.id}>
                            <th scope="row" className="px-4 py-2.5 text-start align-middle font-normal">
                              <div className="text-xs">
                                <span className="font-mono font-bold text-[var(--text-main)] block">
                                  <bdi>{veh.plateNumberAr || veh.plateNumberEn}</bdi>
                                </span>
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  {veh.make} {veh.model} ({veh.capacity})
                                </span>
                              </div>
                            </th>
                            <TableCell className="py-2.5">
                              <StatusBadge type="vehicle" status={veh.status} />
                            </TableCell>
                            <TableCell className="py-2.5 text-end">
                              {minDays !== null && minDays <= 30 ? (
                                <Badge variant={minDays < 0 ? "destructive" : "warning"} className="rounded-lg font-mono text-[11px] whitespace-nowrap">
                                  {minDays < 0
                                    ? text("منتهٍ", "Expired")
                                    : text(`خلال ${minDays}ي`, `${minDays}d left`)}
                                </Badge>
                              ) : (
                                <Badge variant="success" className="rounded-lg text-[11px] whitespace-nowrap">
                                  {text("ساري", "Valid")}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Operational Charts Row */}
      <section aria-labelledby="charts-section-heading" className="space-y-2.5">
        <h2 id="charts-section-heading" className="sr-only">
          {text("الرسوم البيانية التحليلية", "Operational analytics charts")}
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-7">
            <ContractsActivityChart
              points7={trend7}
              points14={trend14}
              todayContracts={todayStats.todayContracts}
              todayPassengers={todayStats.todayPassengers}
              isLoading={contractsQuery.isLoading && stats.isLoading}
            />
          </div>
          <div className="xl:col-span-5">
            <OperationsMixCard
              inspectedToday={inspectedTodayCount}
              totalCaptains={totalCaptainsCount}
              pendingToday={pendingTodayCount}
              totalInspections={readiness.data?.stats.totalInspections ?? stats.data?.todayInspections ?? 0}
              fleet={fleetAnalytics}
              operations={operationsBreakdown}
              isLoading={readiness.isLoading && fleetQuery.isLoading && contractsQuery.isLoading}
            />
          </div>
        </div>
      </section>

      {/* Upgraded Financial Pulse & Vehicle P&L */}
      <FinanceSummary
        purchasesTotal={purchasesQuery.data?.totals.totalAmount}
        purchasesCount={purchasesQuery.data?.total}
        invoicesCount={invoicesQuery.data?.total}
        revision={refreshTick}
      />

      <PdfPreviewModal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        contractId={preview?.id}
        referenceNumber={preview?.referenceNumber}
      />
    </div>
  );
}
