"use client";
import dynamic from "next/dynamic";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Car,
  FileCheck2,
  ClipboardCheck,
  ArrowUpRight,
  RefreshCw,
  FileText,
  ChevronLeft,
  FilePlus2,
  ReceiptText,
  Eye,
} from "lucide-react";
import { getDashboardStats, DashboardStats } from "@/app/_actions/dashboard";
import StatusBadge from "@/app/_components/StatusBadge";
const PdfPreviewModal = dynamic(() => import("@/app/_components/PdfPreviewModal"), { ssr: false });
import { fetchCached, getCachedData } from "@/lib/clientCache";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(() => getCachedData("dashboard_stats"));
  const [isLoading, setIsLoading] = useState(() => !getCachedData("dashboard_stats"));
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedRefNum, setSelectedRefNum] = useState<string>("");
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
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

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            لوحة الإشراف العام
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            متابعة شاملة لأسطول ميقات الخليج، الكباتن، وحركة العقود الرسمية
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadStats(true)}
            disabled={isLoading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300 disabled:opacity-50 min-h-[42px] shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <Link
            href="/admin/invoices/new"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition min-h-[42px]"
          >
            <ReceiptText className="w-4 h-4" />
            <span>+ فاتورة</span>
          </Link>
          <Link
            href="/admin/contracts/new"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-sm min-h-[42px]"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>+ عقد جديد</span>
          </Link>
        </div>
      </div>

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
                إنشاء عقد رحلة
              </p>
              <p className="text-[10px] text-slate-400 truncate">توثيق رحلة وكشف ركاب</p>
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
                إصدار فاتورة
              </p>
              <p className="text-[10px] text-slate-400 truncate">فاتورة حجز أو مبدئية</p>
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
                الفحص المباشر
              </p>
              <p className="text-[10px] text-slate-400 truncate">اعتماد فحص الكباتن اليومي</p>
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
                سجل الفواتير
              </p>
              <p className="text-[10px] text-slate-400 truncate">مراجعة وتحميل الفواتير</p>
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
                الكباتن النشطين
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : stats?.totalCaptains ?? 0}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 mr-1.5 font-bold">كابتن</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>إدارة الطاقم</span>
            <Link
              href="/admin/captains"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              عرض
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Vehicles */}
        <div className="theme-card p-3.5 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                أسطول المركبات
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : stats?.totalVehicles ?? 0}
              </span>
              <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">
                ({stats?.activeVehicles ?? 0} جاهزة)
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>الأسطول</span>
            <Link
              href="/admin/fleet"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              عرض
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Contracts */}
        <div className="theme-card p-3.5 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                العقود الموثقة
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : stats?.totalContracts ?? 0}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 mr-1.5 font-bold">عقد رسمي</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>السجل</span>
            <Link
              href="/admin/contracts"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              عرض
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Today's Inspections */}
        <div className="theme-card p-3.5 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                فحوصات اليوم
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {isLoading ? "—" : stats?.todayInspections ?? 0}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 mr-1.5 font-bold">فحص مسجل</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t theme-border flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>التشغيل</span>
            <Link
              href="/admin/inspections"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              عرض
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
              أحدث العقود الموثقة
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              العقود الثلاثية الصادرة المتضمنة كشف الركاب وتقرير الفحص
            </p>
          </div>
          <Link
            href="/admin/contracts"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            عرض الكل ({stats?.totalContracts ?? 0})
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : !stats?.recentContracts?.length ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            لا توجد عقود مسجلة حتى الآن.
          </div>
        ) : (
          <>
            {/* Desktop Table (Visible on md and larger) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b theme-border text-slate-500 dark:text-slate-400 font-bold">
                  <tr>
                    <th className="px-5 py-3">رقم العقد</th>
                    <th className="px-5 py-3">العميل</th>
                    <th className="px-5 py-3">الكابتن</th>
                    <th className="px-5 py-3">اللوحة</th>
                    <th className="px-5 py-3">نوع العملية</th>
                    <th className="px-5 py-3">التاريخ والوقت</th>
                    <th className="px-5 py-3">الركاب</th>
                    <th className="px-5 py-3 text-left">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border text-slate-800 dark:text-slate-200">
                  {stats.recentContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
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
                        <StatusBadge type="operation" status={c.operationType} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                        {c.tripDate} {c.tripTime}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                          {c.passengersCount} ركاب
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-left whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/contracts/${encodeURIComponent(c.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-500" />
                            <span>تفاصيل</span>
                          </Link>
                          <Link
                            href={`/admin/invoices/new?contractId=${encodeURIComponent(c.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold transition text-xs"
                          >
                            <ReceiptText className="w-3.5 h-3.5" />
                            <span>فاتورة</span>
                          </Link>
                          <button
                            onClick={() => openPdf(c.id, c.referenceNumber, c.pdfPath)}
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
                <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-all font-mono font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                      {c.referenceNumber}
                    </span>
                    <StatusBadge type="operation" status={c.operationType} size="sm" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">العميل:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{c.customerName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">الكابتن:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{c.captainName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">المركبة / اللوحة:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{c.vehiclePlate}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">التاريخ والوقت:</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{c.tripDate} {c.tripTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t theme-border gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                      {c.passengersCount} ركاب
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/contracts/${c.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition text-xs shadow-2xs"
                      >
                        تفاصيل
                      </Link>
                      <button
                        onClick={() => openPdf(c.id, c.referenceNumber, c.pdfPath)}
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
