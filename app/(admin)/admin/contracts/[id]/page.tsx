"use client";
import { useUiText } from "@/lib/ui-text";


import { ContractFinancePanel } from "@/app/_components/commercial/contract-finance";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";
import Modal from "@/app/_components/Modal";
import { Badge } from "@/app/_components/ui";
import React, { useState, useEffect, useCallback, use, useId } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { FileText, ArrowRight, CheckCircle2, XCircle, Clock, Car, User, MapPin, Users, AlertTriangle, FileCheck2, Printer, ShieldCheck, RotateCcw, ReceiptText, MessageSquare } from "lucide-react";
import SendWhatsAppModal from "@/app/_components/SendWhatsAppModal";
const PdfPreviewModal = dynamic(() => import("@/app/_components/PdfPreviewModal"), { ssr: false });
import { Contract, ContractStatus } from "@/lib/types";
import { getContractById, updateContractStatusAction } from "@/app/_actions/contract";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

interface ContractReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function ContractReviewPage({ params }: ContractReviewPageProps) {
  const ui = useUiText();
  const rejectNotesId = useId();

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
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
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
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <div className="w-10 h-10 border-3 border-[var(--accent-gold)]/20 border-t-[var(--accent-gold)] rounded-full animate-spin" />
        <p className="text-xs font-semibold">{ui("جاري تحميل وثيقة العقد للمراجعة...")}</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div role="alert" className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--text-main)]">
          {ui(error || "العقد غير متاح")}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {ui("قد يكون تم حذف العقد أو أن المعرف المطلوب غير صحيح.")}</p>
        <Link
          href="/admin/contracts"
          className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 px-4 py-1.5 rounded-lg gold-gradient-btn text-xs font-bold shadow-xs"
        >
          <ArrowRight className="w-4 h-4 ltr:rotate-180" aria-hidden="true" />
          <span>{ui("الرجوع لسجل العقود")}</span>
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
      bg: "bg-[var(--accent-surface)]",
      text: "text-[var(--accent-gold)]",
      border: "border-[var(--accent-gold)]/35",
      icon: Clock,
    },
    APPROVED: {
      label: "معتمد رسمياً",
      bg: "bg-emerald-500/12 dark:bg-emerald-950/45",
      text: "text-emerald-800 dark:text-emerald-300",
      border: "border-emerald-600/35 dark:border-emerald-500/35",
      icon: CheckCircle2,
    },
    REJECTED: {
      label: "مرفوض من الإدارة",
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-500/30",
      icon: XCircle,
    },
    ACTIVE: {
      label: "ساري وقيد التنفيذ",
      bg: "bg-sky-500/10 dark:bg-sky-500/20",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-500/30",
      icon: FileCheck2,
    },
    EXPIRED: {
      label: "منتهي الصلاحية",
      bg: "bg-[var(--bg-card-subtle)]",
      text: "text-[var(--text-muted)]",
      border: "theme-border",
      icon: RotateCcw,
    },
    CANCELLED: {
      label: "ملغي",
      bg: "bg-[var(--bg-card-subtle)]",
      text: "text-[var(--text-muted)]",
      border: "theme-border",
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
    <div className="space-y-6 pb-16" dir={ui.dir}>
      {/* Top Breadcrumbs & Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Link href="/admin" className="hover:text-[var(--accent-gold)] transition">
              {ui("لوحة الإدارة")}</Link>
            <span>/</span>
            <Link href="/admin/contracts" className="hover:text-[var(--accent-gold)] transition">
              {ui("سجل العقود")}</Link>
            <span>/</span>
            <span className="text-[var(--text-main)] font-bold font-mono">
              {contract.referenceNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-2xl font-semibold text-[var(--text-main)] flex flex-wrap items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent-gold)] shrink-0" />
              <span>{ui("مراجعة وتدقيق العقد:")}</span>
              <span className="font-mono text-[var(--accent-gold)]">
                {contract.referenceNumber}
              </span>
            </h1>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{ui(statusInfo.label)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/invoices/new?contractId=${encodeURIComponent(contract.id)}`}
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 justify-center px-3.5 py-1.5 rounded-lg border border-[var(--accent-gold)]/35 bg-[var(--accent-surface)] hover:bg-amber-500/15 text-[var(--accent-gold)] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <ReceiptText className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
            <span>{ui("إنشاء فاتورة مرتبطة بالعقد")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 justify-center px-3.5 py-1.5 rounded-lg secondary-btn text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
            <span>{ui("طباعة / معاينة PDF")}</span>
          </button>

          <button
            type="button"
            onClick={() => setWhatsAppModalOpen(true)}
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 justify-center px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={ui("إرسال العقد للكابتن عبر واتساب")}
          >
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{ui("إرسال عبر واتساب")}</span>
          </button>

          <Link
            href="/admin/contracts"
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 justify-center px-3.5 py-1.5 rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-main)] text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowRight className="w-4 h-4 shrink-0 ltr:rotate-180" aria-hidden="true" />
            <span>{ui("العودة للسجل")}</span>
          </Link>
        </div>
      </div>

      {/* Status Action Banner (Sticky/Top) */}
      <div className="p-4 sm:p-5 rounded-2xl theme-card shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>{ui("إجراءات الاعتماد والمراجعة الإدارية")}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {ui(currentStatus === "PENDING_REVIEW"
                ? "العقد بانتظار قرار الإدارة. يمكنك اعتماده رسمياً ليصبح سارياً، أو رفضه مع تدوين أسباب الرفض."
                : currentStatus === "APPROVED"
                ? "تم اعتماد هذا العقد رسمياً وهو مؤهل للتشغيل."
                : currentStatus === "REJECTED"
                ? "تم رفض هذا العقد من قبل الإدارة. الملاحظات مسجلة أدناه."
                : "العقد يخضع للشروط التشغيلية المقررة.")}
            </p>
            {contract.reviewNotes && (
              <div className="mt-2 p-2.5 rounded-xl theme-card-subtle text-xs text-[var(--text-main)]">
                <span className="font-bold text-rose-700 dark:text-rose-400">{ui("ملاحظات المراجعة:")}</span>
                <span className="ms-1">{contract.reviewNotes}</span>
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
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 justify-center px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{ui("اعتماد وتوثيق العقد")}</span>
              </button>
            )}

            {currentStatus !== "REJECTED" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectModalOpen(true)}
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 justify-center px-3.5 py-1.5 rounded-lg danger-btn text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{ui("رفض العقد")}</span>
              </button>
            )}

            {currentStatus !== "PENDING_REVIEW" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus("PENDING_REVIEW")}
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 justify-center px-3.5 py-1.5 rounded-lg secondary-btn text-xs font-bold transition cursor-pointer"
                title={ui("إعادة العقد لحالة قيد المراجعة")}
              >
                <span>{ui("إعادة للمراجعة")}</span>
              </button>
            )}
          </div>
        </div>

        {notificationMsg && (
          <div
            role={notificationMsg.type === "error" ? "alert" : "status"}
            className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              notificationMsg.type === "success"
                ? "bg-emerald-500/12 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300 border border-emerald-600/35 dark:border-emerald-500/35"
                : "bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-500/30"
            }`}
          >
            {notificationMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true" />
            )}
            <span>{ui(notificationMsg.text)}</span>
          </div>
        )}
      </div>

      {/* Contract Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Trip & Route Specifications */}
        <div className="p-5 rounded-2xl theme-card space-y-4 shadow-xs">
          <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2 border-b theme-border pb-3">
            <MapPin className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("بيانات الرحلة والمسار")}</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[var(--text-muted)] block mb-0.5">{ui("نوع العملية:")}</span>
              <span className="font-bold text-[var(--text-main)]">
                {operationLabels[contract.operationType] ? ui(operationLabels[contract.operationType]) : contract.operationType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t theme-border">
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("نقطة الانطلاق:")}</span>
                <span className="font-bold text-[var(--text-main)]">{contract.origin}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("الوجهة:")}</span>
                <span className="font-bold text-[var(--text-main)]">{contract.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t theme-border">
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("تاريخ الرحلة:")}</span>
                <span className="font-mono font-bold text-[var(--text-main)]" dir="ltr">{contract.tripDate}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("وقت الرحلة:")}</span>
                <span className="font-mono font-bold text-[var(--text-main)]" dir="ltr">{contract.tripTime}</span>
              </div>
            </div>

            {(contract.flightCarrier || contract.flightNumber) && (
              <div className="pt-1 border-t theme-border">
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("بيانات الرحلة الجوية:")}</span>
                <span className="font-bold text-[var(--text-main)]">
                  {contract.flightCarrier || ""} {contract.flightNumber ? `(${contract.flightNumber})` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Guest / Customer Details */}
        <div className="p-5 rounded-2xl theme-card space-y-4 shadow-xs">
          <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2 border-b theme-border pb-3">
            <User className="w-4 h-4 text-[var(--accent-gold)]" />
            <span>{ui("بيانات العميل والضيف الأساسي")}</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[var(--text-muted)] block mb-0.5">{ui("اسم العميل:")}</span>
              <span className="font-bold text-[var(--text-main)] text-sm">{contract.customerName}</span>
            </div>

            {contract.customerPhone && (
              <div className="pt-1 border-t theme-border">
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("رقم الهاتف:")}</span>
                <span className="font-mono font-bold text-[var(--accent-gold)]" dir="ltr">
                  {contract.customerPhone}
                </span>
              </div>
            )}

            {contract.notes && (
              <div className="pt-1 border-t theme-border">
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("ملاحظات العقد:")}</span>
                <p className="text-[var(--text-main)] leading-relaxed theme-card-subtle p-2.5 rounded-xl">
                  {contract.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Captain & Vehicle Details */}
        <div className="p-5 rounded-2xl theme-card space-y-4 shadow-xs">
          <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2 border-b theme-border pb-3">
            <Car className="w-4 h-4 text-[var(--accent-gold)]" />
            <span>{ui("الكابتن والمركبة التشغيلية")}</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              {contract.captain?.avatarUrl ? (
                <Image
                  src={contract.captain.avatarUrl}
                  alt={contract.captain.name}
                  width={44}
                  height={44}
                  unoptimized
                  className="w-11 h-11 rounded-xl object-cover border border-[var(--accent-gold)]/35 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] font-bold text-sm flex items-center justify-center border border-[var(--accent-gold)]/30 shrink-0">
                  {contract.captain?.name?.slice(0, 2) || ui("ك")}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[var(--text-muted)] block mb-0.5">{ui("اسم الكابتن المعتمد:")}</span>
                <span className="font-bold text-[var(--text-main)] truncate block">
                  {contract.captain?.name || ui("كابتن رسمي")}
                </span>
                {contract.captain?.phone && (
                  <span className="text-xs font-mono text-[var(--text-muted)] block mt-0.5" dir="ltr">
                    {contract.captain.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-1 border-t theme-border">
              <span className="text-[var(--text-muted)] block mb-0.5">{ui("رقم لوحة المركبة:")}</span>
              <span className="font-bold font-mono text-[var(--accent-gold)] text-sm">
                {contract.vehiclePlate}
              </span>
            </div>

            <div className="pt-1 border-t theme-border">
              <span className="text-[var(--text-muted)] block mb-0.5">{ui("حالة الفحص التشغيلي:")}</span>
              {contract.inspection ? (
                <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{ui("فحص تشغيلي مكتمل ومطابق")}</span>
                </span>
              ) : (
                <span className="text-[var(--accent-gold)] font-bold">
                  {ui("فحص تشغيلي معتمد آلياً")}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Manifest */}
      <div className="p-4 sm:p-5 rounded-2xl theme-card space-y-4 shadow-xs">
        <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2 border-b theme-border pb-3">
          <Users className="w-4 h-4 text-[var(--accent-gold)]" />
          <span>{ui("قائمة الركاب المعتمدة (")}{contract.passengers?.length || 0})</span>
        </h2>

        {contract.passengers && contract.passengers.length > 0 ? (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b theme-border text-[var(--text-muted)] bg-[var(--table-header-bg)]">
                    <th className="py-2.5 px-3 font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">{ui("اسم الراكب")}</th>
                    <th className="py-2.5 px-3 font-bold">{ui("الجنسية")}</th>
                    <th className="py-2.5 px-3 font-bold">{ui("رقم الهوية / الجواز")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {contract.passengers.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-[var(--table-row-hover)] transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--text-muted)]">{p.sequence || idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-[var(--text-main)]">{p.name}</td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">{p.nationality || "—"}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]" dir="ltr">
                        {p.idNumber || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Passenger Cards (Below sm) */}
            <div className="sm:hidden space-y-2.5">
              {contract.passengers.map((p, idx) => (
                <MobileRecordCard
                  key={p.id || idx}
                  title={
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[var(--accent-surface)] text-[var(--accent-gold)] text-xs font-mono flex items-center justify-center font-bold shrink-0">
                        {p.sequence || idx + 1}
                      </span>
                      <span>{p.name}</span>
                    </span>
                  }
                  badge={
                    p.nationality ? (
                      <Badge variant="outline" className="text-xs">
                        {p.nationality}
                      </Badge>
                    ) : undefined
                  }
                >
                  <MobileCardMetaGrid columns={2}>
                    <MobileCardField
                      label={ui("رقم الهوية / الجواز")}
                      value={p.idNumber || "—"}
                      mono
                    />
                    <MobileCardField
                      label={ui("الجنسية")}
                      value={p.nationality || "—"}
                      alignEnd
                    />
                  </MobileCardMetaGrid>
                </MobileRecordCard>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">{ui("لا يوجد ركاب إضافيون مسجلون في هذا العقد.")}</p>
        )}
      </div>

      {/* Reject Modal (Native <dialog> via Modal) */}
      {rejectModalOpen && (
        <Modal
          label={ui("تأكيد رفض العقد")}
          onClose={() => !actionLoading && setRejectModalOpen(false)}
          isBusy={actionLoading}
        >
          <div className="mobile-dialog-panel w-full max-w-md theme-card rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
              <XCircle className="w-6 h-6 shrink-0" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[var(--text-main)]">
                {ui("تأكيد رفض العقد")}</h2>
            </div>

            <div className="space-y-2">
              <label htmlFor={rejectNotesId} className="block text-xs text-[var(--text-muted)] leading-relaxed">
                {ui("يرجى تدوين سبب عدم الاعتماد لمساعدة الكابتن وفريق العمليات في تصحيح بيانات الرحلة:")}
              </label>

              <textarea
                id={rejectNotesId}
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder={ui("مثال: نقص في بيانات الركاب، أو عدم توافق وقت الرحلة...")}
                className="theme-input w-full p-3 rounded-lg text-base sm:text-[0.8125rem] placeholder:text-[var(--text-placeholder)] focus:border-rose-600 focus:shadow-none resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                autoFocus
                disabled={actionLoading}
                onClick={() => setRejectModalOpen(false)}
                className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg secondary-btn text-xs cursor-pointer"
              >
                {ui("إلغاء")}</button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus("REJECTED", rejectNotes)}
                className="min-h-11 sm:min-h-9 px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {ui(actionLoading ? "جاري الرفض..." : "تأكيد الرفض")}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {isPdfOpen && (
        <PdfPreviewModal
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          contractId={contract.id}
          referenceNumber={contract.referenceNumber}
          pdfUrl={contract.pdfPath}
        />
      )}
      {whatsAppModalOpen && (
        <SendWhatsAppModal
          isOpen={true}
          onClose={() => setWhatsAppModalOpen(false)}
          type="CONTRACT"
          targetId={contract.id}
          targetTitle={contract.referenceNumber}
          recipientName={contract.captain?.name || contract.customerName || "الكابتن"}
          defaultPhone={contract.captain?.phone || contract.customerPhone || ""}
        />
      )}
      <ContractFinancePanel contractId={contract.id}/>
    </div>
  );
}
