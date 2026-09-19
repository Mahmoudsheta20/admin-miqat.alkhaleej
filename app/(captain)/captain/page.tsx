"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  FilePlus2,
  ClipboardCheck,
  FileText,
  Calendar,
  Clock,
  Shield,
  ArrowUpRight,
  RefreshCw,
  Phone,
  UserCheck,
  Camera,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { getTodayInspection } from "@/app/_actions/inspection";
import { getContracts } from "@/app/_actions/contract";
import { Contract, VehicleInspection } from "@/lib/types";
import StatusBadge from "@/app/_components/StatusBadge";
import PdfPreviewModal from "@/app/_components/PdfPreviewModal";
import ProfileModal from "@/app/_components/ProfileModal";

export default function CaptainHomePage() {
  const { user } = useAuth();
  const [inspection, setInspection] = useState<VehicleInspection | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);
  const [previewPdfRef, setPreviewPdfRef] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);

    const [inspRes, contrRes] = await Promise.all([
      getTodayInspection(user.id),
      getContracts({ captainId: user.id }),
    ]);

    if (inspRes.success) {
      setInspection(inspRes.inspection || null);
    }
    if (contrRes.success && contrRes.contracts) {
      setContracts(contrRes.contracts);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (!user) return null;

  const hasInspectionToday = !!inspection;

  const openPdf = (c: Contract) => {
    setPreviewPdfId(c.id);
    setPreviewPdfRef(c.referenceNumber);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="theme-card p-6 rounded-3xl border theme-border relative overflow-hidden bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              onClick={() => setIsProfileOpen(true)}
              className="relative group cursor-pointer w-14 h-14 rounded-2xl overflow-hidden bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xl flex items-center justify-center border border-amber-500/30 shrink-0 shadow-xs"
              title="تعديل الصورة والملف الشخصي"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span>{user.name.slice(0, 1)}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  مرحباً بك، كابتن {user.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  كابتن معتمد
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                بوابة الميدان • منظومة ميقات الخليج لإدارة الرحلات والعقود
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>

        {/* Captain Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t theme-border text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">المركبة المسندة</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5">
              <Car className="w-3.5 h-3.5 text-amber-500" />
              {user.assignedVehiclePlate || "ا ص ل 7223"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">رقم الهوية</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block" dir="ltr">
              {user.nationalId || "2553660073"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">رقم الجوال</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block" dir="ltr">
              {user.phone || "0542273515"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">إجمالي العقود المنفذة</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm mt-0.5 block">
              {contracts.length} عقد
            </span>
          </div>
        </div>
      </div>

      {/* Inspection Gate Card */}
      <div
        className={`p-6 rounded-3xl border transition-all duration-200 ${
          hasInspectionToday
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
            : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                hasInspectionToday
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              {hasInspectionToday ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                {hasInspectionToday
                  ? "تم تسجيل الفحص اليومي للمركبة بنجاح"
                  : "فحص المركبة اليومي غير مسجل حتى الآن"}
              </h2>
              <p className="text-xs sm:text-sm mt-1 opacity-80 leading-relaxed max-w-2xl">
                {hasInspectionToday
                  ? `أكملت بنود الفحص الميداني الـ 16 اليوم. حافلتك (${inspection.vehiclePlate}) جاهزة للتشغيل، ويمكنك الآن إصدار وتوثيق عقود النقل البري الرسمية.`
                  : "بناءً على اشتراطات هيئة النقل للسلامة، يجب إتمام قائمة الفحص اليومي الـ 16 للمركبة لفتح صلاحية إصدار عقود الرحلات وكشف الركاب."}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {hasInspectionToday ? (
              <Link
                href="/captain/contract"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl gold-gradient-btn text-xs font-bold transition shadow-md"
              >
                <FilePlus2 className="w-4 h-4" />
                إنشاء عقد رحلة جديد
              </Link>
            ) : (
              <Link
                href="/captain/inspection"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-md"
              >
                <ClipboardCheck className="w-4 h-4" />
                إجراء الفحص اليومي الآن
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/captain/inspection"
          className="theme-card p-5 rounded-2xl border theme-border hover:border-amber-500 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                فحص المركبة اليومي
              </h3>
              <p className="text-xs text-slate-500">
                16 بنداً: لوحة القيادة، الفحص الخارجي، وأدوات الأمان
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition" />
        </Link>

        <Link
          href="/captain/contract"
          className="theme-card p-5 rounded-2xl border theme-border hover:border-amber-500 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                إنشاء عقد رحلة جديد
              </h3>
              <p className="text-xs text-slate-500">
                كشف الركاب الديناميكي وتوليد الـ PDF الرسمي
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition" />
        </Link>
      </div>

      {/* Captain Recent Contracts */}
      <div className="theme-card rounded-2xl border theme-border overflow-hidden">
        <div className="p-5 border-b theme-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              عقودي الأخيرة
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              العقود الموثقة الصادرة بحسابك مع كشوف الركاب
            </p>
          </div>
          <Link
            href="/captain/contract"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            + عقد جديد
          </Link>
        </div>

        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            لم تقم بإنشاء أي عقود بعد.
          </div>
        ) : (
          <div className="divide-y theme-border">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {c.referenceNumber}
                    </span>
                    <StatusBadge type="operation" status={c.operationType} size="sm" />
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    العميل: {c.customerName}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>من: {c.origin}</span>
                    <span>•</span>
                    <span>إلى: {c.destination}</span>
                    <span>•</span>
                    <span className="font-mono">{c.tripDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs text-slate-400 font-mono">
                    {c.passengers?.length || 0} ركاب
                  </span>
                  <button
                    onClick={() => openPdf(c)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    عرض PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Modal */}
      {previewPdfId && (
        <PdfPreviewModal
          isOpen={!!previewPdfId}
          onClose={() => setPreviewPdfId(null)}
          contractId={previewPdfId}
          referenceNumber={previewPdfRef}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
}
