"use client";

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
  Calendar,
  MapPin,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { getDashboardStats, DashboardStats } from "@/app/_actions/dashboard";
import StatusBadge from "@/app/_components/StatusBadge";
import PdfPreviewModal from "@/app/_components/PdfPreviewModal";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedRefNum, setSelectedRefNum] = useState<string>("");
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [, startTransition] = useTransition();

  const loadStats = () => {
    setIsLoading(true);
    startTransition(async () => {
      const res = await getDashboardStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const openPdf = (id: string, ref: string) => {
    setSelectedContractId(id);
    setSelectedRefNum(ref);
    setIsPdfOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            لوحة الإشراف العام
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            متابعة شاملة لأسطول ميقات الخليج، الكباتن، وحركة العقود الرسمية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border theme-card hover:border-amber-500 transition text-slate-700 dark:text-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <Link
            href="/admin/contracts"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl gold-gradient-btn transition shadow-sm"
          >
            <FileText className="w-4 h-4" />
            سجل العقود
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Captains */}
        <div className="theme-card p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              الكباتن النشطين
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {isLoading ? "—" : stats?.totalCaptains ?? 0}
            </span>
            <span className="text-xs text-slate-400 mr-2 font-bold">كابتن معتمد</span>
          </div>
          <div className="mt-3 pt-3 border-t theme-border flex items-center justify-between text-xs text-slate-500">
            <span>إدارة الطاقم</span>
            <Link
              href="/admin/captains"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              عرض القائمة
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Vehicles */}
        <div className="theme-card p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              أسطول المركبات
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {isLoading ? "—" : stats?.totalVehicles ?? 0}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 mr-2 font-bold">
              ({stats?.activeVehicles ?? 0} جاهزة)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t theme-border flex items-center justify-between text-xs text-slate-500">
            <span>حالة المركبات</span>
            <Link
              href="/admin/fleet"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              عرض الأسطول
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Contracts */}
        <div className="theme-card p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              العقود الموثقة
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {isLoading ? "—" : stats?.totalContracts ?? 0}
            </span>
            <span className="text-xs text-slate-400 mr-2 font-bold">عقد نقل رسمي</span>
          </div>
          <div className="mt-3 pt-3 border-t theme-border flex items-center justify-between text-xs text-slate-500">
            <span>هيئة النقل (م. 39)</span>
            <Link
              href="/admin/contracts"
              className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 hover:underline"
            >
              كافة العقود
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Today's Inspections */}
        <div className="theme-card p-5 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              فحوصات اليوم
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {isLoading ? "—" : stats?.todayInspections ?? 0}
            </span>
            <span className="text-xs text-slate-400 mr-2 font-bold">فحص مسجل اليوم</span>
          </div>
          <div className="mt-3 pt-3 border-t theme-border flex items-center justify-between text-xs text-slate-500">
            <span>السلامة والأمان</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              جاهزية تشغيلية
            </span>
          </div>
        </div>
      </div>

      {/* Recent Contracts Section */}
      <div className="theme-card rounded-2xl overflow-hidden border theme-border">
        <div className="p-5 border-b theme-border flex items-center justify-between">
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
                      <td className="px-5 py-3.5 text-left">
                        <button
                          onClick={() => openPdf(c.id, c.referenceNumber)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          عرض العقد
                        </button>
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
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

                  <div className="flex items-center justify-between pt-2 border-t theme-border gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                      {c.passengersCount} ركاب
                    </span>
                    <button
                      onClick={() => openPdf(c.id, c.referenceNumber)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold transition text-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      عرض العقد
                    </button>
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
          onClose={() => setIsPdfOpen(false)}
          contractId={selectedContractId}
          referenceNumber={selectedRefNum}
        />
      )}
    </div>
  );
}
