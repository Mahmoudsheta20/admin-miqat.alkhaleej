"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  User,
  MapPin,
  Users,
  AlertTriangle,
  FileCheck2,
  Printer,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Contract, ContractStatus } from "@/lib/types";
import { getContractById, updateContractStatusAction } from "@/app/_actions/contract";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

interface ContractReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function ContractReviewPage({ params }: ContractReviewPageProps) {
  const resolvedParams = use(params);

  const [contract, setContract] = useState<Contract | null>(
    () => getCachedData<Awaited<ReturnType<typeof getContractById>>>(`contract_${resolvedParams.id}`)?.contract || null
  );
  const [loading, setLoading] = useState(
    () => !getCachedData<Awaited<ReturnType<typeof getContractById>>>(`contract_${resolvedParams.id}`)
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review modal/rejection notes state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [notificationMsg, setNotificationMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchContract = useCallback(async (forceRefresh = false) => {
    return fetchCached(
        `contract_${resolvedParams.id}`,
        () => getContractById(resolvedParams.id),
        { ttlMs: 60_000, forceRefresh }
      ).then(res => {
      setError(null);
      if (res.success && res.contract) {
        setContract(res.contract);
      } else {
        setError(res.error || "لم يتم العثور على العقد المطلوب");
      }
    }).catch(() => {
      setError("حدث خطأ أثناء تحميل بيانات العقد");
    }).finally(() => {
      setLoading(false);
    });
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleUpdateStatus = async (newStatus: ContractStatus, notes?: string) => {
    if (!contract) return;
    setActionLoading(true);
    setNotificationMsg(null);

    try {
      const res = await updateContractStatusAction({
        contractId: contract.id,
        status: newStatus,
        reviewNotes: notes,
      });

      if (res.success && res.contract) {
        setContract(res.contract);
        invalidateClientCache(`contract_${contract.id}`);
        invalidateClientCache("contracts_");
        invalidateClientCache("dashboard_stats");
        setRejectModalOpen(false);
        setRejectNotes("");
        setNotificationMsg({
          type: "success",
          text:
            newStatus === "APPROVED"
              ? "تم اعتماد العقد رسمياً بنجاح وتحديث حالته في النظام."
              : "تم تحديث حالة العقد إلى مرفوض وتسجيل الملاحظات.",
        });
      } else {
        setNotificationMsg({
          type: "error",
          text: res.error || "فشل تحديث حالة العقد",
        });
      }
    } catch {
      setNotificationMsg({
        type: "error",
        text: "تعذر إرسال قرار المراجعة، يرجى المحاولة مرة أخرى",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold">جاري تحميل وثيقة العقد للمراجعة...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {error || "العقد غير متاح"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          قد يكون تم حذف العقد أو أن المعرف المطلوب غير صحيح.
        </p>
        <Link
          href="/admin/contracts"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold text-white shadow-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع لسجل العقود</span>
        </Link>
      </div>
    );
  }

  const statusConfig: Record<
    ContractStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    PENDING_REVIEW: {
      label: "بانتظار المراجعة والتدقيق",
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-500/30",
      icon: Clock,
    },
    APPROVED: {
      label: "معتمد رسمياً",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-500/30",
      icon: CheckCircle2,
    },
    REJECTED: {
      label: "مرفوض من الإدارة",
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-700 dark:text-rose-400",
      border: "border-rose-500/30",
      icon: XCircle,
    },
    ACTIVE: {
      label: "ساري وقيد التنفيذ",
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      border: "border-blue-500/30",
      icon: FileCheck2,
    },
    EXPIRED: {
      label: "منتهي الصلاحية",
      bg: "bg-slate-500/10 dark:bg-slate-500/20",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-500/30",
      icon: RotateCcw,
    },
    CANCELLED: {
      label: "ملغي",
      bg: "bg-slate-500/10 dark:bg-slate-500/20",
      text: "text-slate-500 dark:text-slate-400",
      border: "border-slate-400/30",
      icon: XCircle,
    },
  };

  const currentStatus = (contract.status as ContractStatus) || "PENDING_REVIEW";
  const statusInfo = statusConfig[currentStatus] || statusConfig.PENDING_REVIEW;
  const StatusIcon = statusInfo.icon;

  const operationLabels: Record<string, string> = {
    AIRPORT_TRANSFER: "نقل مطار",
    CITY_TOUR: "جولة داخل المدينة",
    INTERCITY: "نقل بين المدن",
    HAJJ_UMRAH: "حج وعمرة",
  };

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Top Breadcrumbs & Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-amber-600 transition">
              لوحة الإدارة
            </Link>
            <span>/</span>
            <Link href="/admin/contracts" className="hover:text-amber-600 transition">
              سجل العقود
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-bold font-mono">
              {contract.referenceNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
              <span>مراجعة وتدقيق العقد:</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">
                {contract.referenceNumber}
              </span>
            </h1>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusInfo.label}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contract.pdfPath && (
            <a
              href={contract.pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>طباعة / معاينة PDF</span>
            </a>
          )}

          <Link
            href="/admin/contracts"
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للسجل</span>
          </Link>
        </div>
      </div>

      {/* Status Action Banner (Sticky/Top) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>إجراءات الاعتماد والمراجعة الإدارية</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentStatus === "PENDING_REVIEW"
                ? "العقد بانتظار قرار الإدارة. يمكنك اعتماده رسمياً ليصبح سارياً، أو رفضه مع تدوين أسباب الرفض."
                : currentStatus === "APPROVED"
                ? "تم اعتماد هذا العقد رسمياً وهو مؤهل للتشغيل."
                : currentStatus === "REJECTED"
                ? "تم رفض هذا العقد من قبل الإدارة. الملاحظات مسجلة أدناه."
                : "العقد يخضع للشروط التشغيلية المقررة."}
            </p>
            {contract.reviewNotes && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-rose-600 dark:text-rose-400">ملاحظات المراجعة: </span>
                <span>{contract.reviewNotes}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {currentStatus !== "APPROVED" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus("APPROVED")}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد وتوثيق العقد</span>
              </button>
            )}

            {currentStatus !== "REJECTED" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>رفض العقد</span>
              </button>
            )}

            {currentStatus !== "PENDING_REVIEW" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus("PENDING_REVIEW")}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition"
                title="إعادة العقد لحالة قيد المراجعة"
              >
                <span>إعادة للمراجعة</span>
              </button>
            )}
          </div>
        </div>

        {notificationMsg && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              notificationMsg.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
            }`}
          >
            {notificationMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
        )}
      </div>

      {/* Contract Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Trip & Route Specifications */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>بيانات الرحلة والمسار</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">نوع العملية:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {operationLabels[contract.operationType] || contract.operationType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">نقطة الانطلاق:</span>
                <span className="font-bold text-slate-900 dark:text-white">{contract.origin}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">الوجهة:</span>
                <span className="font-bold text-slate-900 dark:text-white">{contract.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">تاريخ الرحلة:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{contract.tripDate}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">وقت الرحلة:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{contract.tripTime}</span>
              </div>
            </div>

            {(contract.flightCarrier || contract.flightNumber) && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">بيانات الرحلة الجوية:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {contract.flightCarrier || ""} {contract.flightNumber ? `(${contract.flightNumber})` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Guest / Customer Details */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-amber-500" />
            <span>بيانات العميل والضيف الأساسي</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">اسم العميل:</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{contract.customerName}</span>
            </div>

            {contract.customerPhone && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">رقم الهاتف:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                  {contract.customerPhone}
                </span>
              </div>
            )}

            {contract.notes && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">ملاحظات العقد:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  {contract.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Captain & Vehicle Details */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Car className="w-4 h-4 text-amber-500" />
            <span>الكابتن والمركبة التشغيلية</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              {contract.captain?.avatarUrl ? (
                <Image
                  src={contract.captain.avatarUrl}
                  alt={contract.captain.name}
                  width={44}
                  height={44}
                  unoptimized
                  className="w-11 h-11 rounded-xl object-cover border border-amber-500/30 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center justify-center border border-amber-500/20 shrink-0">
                  {contract.captain?.name?.slice(0, 2) || "ك"}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">اسم الكابتن المعتمد:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">
                  {contract.captain?.name || "كابتن رسمي"}
                </span>
                {contract.captain?.phone && (
                  <span className="text-[11px] font-mono text-slate-500 block mt-0.5" dir="ltr">
                    {contract.captain.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">رقم لوحة المركبة:</span>
              <span className="font-bold font-mono text-amber-600 dark:text-amber-400 text-sm">
                {contract.vehiclePlate}
              </span>
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">حالة الفحص التشغيلي:</span>
              {contract.inspection ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>فحص تشغيلي مكتمل ومطابق</span>
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  فحص تشغيلي معتمد آلياً
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Manifest */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Users className="w-4 h-4 text-amber-500" />
          <span>قائمة الركاب المعتمدة ({contract.passengers?.length || 0})</span>
        </h3>

        {contract.passengers && contract.passengers.length > 0 ? (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">اسم الراكب</th>
                    <th className="py-2.5 px-3 font-bold">الجنسية</th>
                    <th className="py-2.5 px-3 font-bold">رقم الهوية / الجواز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {contract.passengers.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{p.sequence || idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.nationality || "—"}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                        {p.idNumber || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Passenger Cards */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
              {contract.passengers.map((p, idx) => (
                <div key={p.id || idx} className="py-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-500 font-bold">
                        {p.sequence || idx + 1}
                      </span>
                      <span>{p.name}</span>
                    </span>
                    {p.nationality && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {p.nationality}
                      </span>
                    )}
                  </div>
                  {p.idNumber && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono pr-6" dir="ltr">
                      <span>ID: {p.idNumber}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">لا يوجد ركاب إضافيون مسجلون في هذا العقد.</p>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <XCircle className="w-6 h-6" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد رفض العقد
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              يرجى تدوين سبب عدم الاعتماد لمساعدة الكابتن وفريق العمليات في تصحيح بيانات الرحلة:
            </p>

            <textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="مثال: نقص في بيانات الركاب، أو عدم توافق وقت الرحلة..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus("REJECTED", rejectNotes)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "جاري الرفض..." : "تأكيد الرفض"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
