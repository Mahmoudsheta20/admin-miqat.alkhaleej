"use client";
import { inspectionMatchesDay } from "@/lib/inspection";
import { getSaudiTodayDateStr } from "@/lib/contractConstants";
import { useUiText } from "@/lib/ui-text";

import dynamic from "next/dynamic";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import ReportTripButton from "@/app/_components/commercial/report-trip-button";
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  FilePlus2,
  ClipboardCheck,
  FileText,
  ArrowUpLeft,
  ArrowUpRight,
  RefreshCw,
  Camera,
  Download,
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Maximize2,
} from "lucide-react";
import { backendUrl } from "@/lib/backend";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import {
  getTodayInspection,
  getAllInspectionsList,
} from "@/app/_actions/inspection";
import { getContracts } from "@/app/_actions/contract";
import { Contract, VehicleInspection } from "@/lib/types";
import { formatOfficialDate } from "@/lib/contractConstants";
import StatusBadge from "@/app/_components/StatusBadge";
import FullscreenDialog from "@/app/_components/form/FullscreenDialog";
import CaptainContractBuilder from "@/app/_components/contracts/CaptainContractBuilder";
const PdfPreviewModal = dynamic(
  () => import("@/app/_components/PdfPreviewModal"),
  { ssr: false },
);
import InspectionDownloadButton from "@/app/_components/InspectionDownloadButton";
import ProfileModal from "@/app/_components/ProfileModal";
import { fetchCached, getCachedData } from "@/lib/clientCache";
import { Card } from "@/app/_components/ui";
import {
  MobileCardField,
  MobileCardMetaGrid,
  MobileRecordCard,
} from "@/app/_components/mobile";

export default function CaptainHomePage() {
  const ui = useUiText();
  const { isRTL, language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  const { user } = useAuth();
  const [inspection, setInspection] = useState<VehicleInspection | null>(() => {
    return user
      ? getCachedData<Awaited<ReturnType<typeof getTodayInspection>>>(
          `captain_inspection_${user.id}`,
        )?.inspection || null
      : null;
  });
  const [contracts, setContracts] = useState<Contract[]>(() => {
    return user
      ? getCachedData<Awaited<ReturnType<typeof getContracts>>>(
          `captain_contracts_${user.id}`,
        )?.contracts || []
      : [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    return (
      !user ||
      !getCachedData<Awaited<ReturnType<typeof getContracts>>>(
        `captain_contracts_${user.id}`,
      )
    );
  });
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);
  const [previewPdfRef, setPreviewPdfRef] = useState<string>("");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateFullscreen, setIsCreateFullscreen] = useState(false);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;

      try {
        const [inspRes, contrRes] = await Promise.all([
          fetchCached(
            `captain_inspection_${user.id}`,
            () => getTodayInspection(user.id),
            {
              ttlMs: 60_000,
              forceRefresh,
            },
          ),
          fetchCached(
            `captain_contracts_${user.id}`,
            () => getContracts({ captainId: user.id }),
            {
              ttlMs: 60_000,
              forceRefresh,
            },
          ),
        ]);

        if (inspRes.success && inspRes.inspection) {
          setInspection(inspRes.inspection);
        } else {
          const listRes = await getAllInspectionsList({
            captainId: user.id,
            limit: 1,
          });
          if (
            listRes.success &&
            listRes.inspections &&
            listRes.inspections.length > 0
          ) {
            setInspection(listRes.inspections[0]);
          } else {
            setInspection(null);
          }
        }
        if (contrRes.success && contrRes.contracts) {
          setContracts(contrRes.contracts);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) return null;

  const hasInspectionToday = inspectionMatchesDay(
    inspection,
    getSaudiTodayDateStr(),
    user.assignedVehiclePlate || undefined,
  );

  const openPdf = (c: Contract) => {
    setPreviewPdfId(c.id);
    setPreviewPdfRef(c.referenceNumber);
    setPreviewPdfUrl(c.pdfPath || null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <Card className="theme-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border theme-border relative overflow-hidden shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              aria-label={ui("تعديل الصورة والملف الشخصي")}
              title={ui("تعديل الصورة والملف الشخصي")}
              className="relative group cursor-pointer w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-lg sm:text-xl flex items-center justify-center border border-amber-500/30 shrink-0 shadow-xs"
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
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Camera className="w-5 h-5" aria-hidden="true" />
              </span>
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white truncate">
                  {ui("مرحباً بك، كابتن")} {user.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                  {ui("كابتن معتمد")}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] dark:text-slate-400 mt-1 truncate">
                {ui(
                  "بوابة الميدان • منظومة ميقات الخليج لإدارة الرحلات والعقود",
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="self-start sm:self-center inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-[var(--text-muted)] dark:text-slate-300 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {ui("تحديث")}
          </button>
        </div>

        {/* Captain Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 sm:mt-6 pt-4 sm:pt-5 border-t theme-border text-xs">
          <div>
            <span className="text-[var(--text-muted)] text-xs block">
              {ui("المركبة المسندة")}
            </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5">
              <Car
                className="w-3.5 h-3.5 text-amber-500 shrink-0"
                aria-hidden="true"
              />
              <bdi>{user.assignedVehiclePlate || ui("لم تُسند مركبة")}</bdi>
            </span>
          </div>

          <div>
            <span className="text-[var(--text-muted)] text-xs block">
              {ui("رقم الهوية")}
            </span>
            <span
              className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block"
              dir="ltr"
            >
              <bdi>{user.nationalId || "—"}</bdi>
            </span>
          </div>

          <div>
            <span className="text-[var(--text-muted)] text-xs block">
              {ui("رقم الجوال")}
            </span>
            <span
              className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block"
              dir="ltr"
            >
              <bdi>{user.phone || "—"}</bdi>
            </span>
          </div>

          <div>
            <span className="text-[var(--text-muted)] text-xs block">
              {ui("إجمالي العقود المنفذة")}
            </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm mt-0.5 block">
              {contracts.length} {ui("عقد")}
            </span>
          </div>
        </div>
      </Card>

      {/* Inspection Gate Card */}
      <Card
        className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-none transition-all duration-200 ${
          hasInspectionToday
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
            : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border ${
                hasInspectionToday
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-400"
              }`}
            >
              {hasInspectionToday ? (
                <CheckCircle2
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  aria-hidden="true"
                />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
                {ui(
                  hasInspectionToday
                    ? "تم اعتماد الفحص التشغيلي للمركبة بنجاح"
                    : "فحص المركبة التشغيلي غير مسجل حتى الآن",
                )}
              </h2>
              <p className="text-xs sm:text-sm mt-1 opacity-80 leading-relaxed max-w-2xl">
                {hasInspectionToday
                  ? isRTL
                    ? `أكملت بنود الفحص الميداني الـ 16 للمركبة (${inspection?.vehiclePlate || "—"}) بتاريخ ${formatOfficialDate(inspection?.inspectionDate || "")}. حافلتك جاهزة للتشغيل، ويمكنك الآن إصدار وتوثيق عقود النقل البري الرسمية.`
                    : `You completed all 16 inspection checks for vehicle (${inspection?.vehiclePlate || "—"}) on ${formatOfficialDate(inspection?.inspectionDate || "")}. Your coach is ready to operate and you can issue official transport contracts.`
                  : ui(
                      "بناءً على اشتراطات هيئة النقل للسلامة، يجب إتمام قائمة الفحص التشغيلي الـ 16 للمركبة لفتح صلاحية إصدار عقود الرحلات وكشف الركاب.",
                    )}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto shrink-0">
            {inspection && (
              <InspectionDownloadButton
                key={inspection.id}
                inspectionId={inspection.id}
              />
            )}
            {hasInspectionToday ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateFullscreen(true)}
                  className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl sm:rounded-2xl border border-amber-500/30 bg-white dark:bg-slate-900 text-sm font-bold text-amber-700 dark:text-amber-400 hover:border-amber-500 transition cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{text("إنشاء بملء الشاشة", "Full-screen create")}</span>
                </button>
                <Link
                  href="/captain/contract"
                  className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl sm:rounded-2xl gold-gradient-btn text-xs font-bold transition shadow-md"
                >
                  <FilePlus2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {ui("إنشاء عقد رحلة جديد")}
                </Link>
              </div>
            ) : (
              <Link
                href="/captain/inspection"
                className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl sm:rounded-2xl gold-gradient-btn text-xs font-bold transition shadow-md"
              >
                <ClipboardCheck
                  className="w-4 h-4 shrink-0"
                  aria-hidden="true"
                />
                {ui("إجراء الفحص اليومي الآن")}
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/captain/inspection" className="group block">
          <Card className="theme-card p-5 rounded-2xl border theme-border shadow-none hover:border-amber-500 transition flex items-center justify-between gap-3 h-full">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                  {ui("فحص المركبة اليومي")}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {ui("16 بنداً: لوحة القيادة، الفحص الخارجي، وأدوات الأمان")}
                </p>
              </div>
            </div>
            {isRTL ? (
              <ArrowUpLeft
                className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500 transition shrink-0"
                aria-hidden="true"
              />
            ) : (
              <ArrowUpRight
                className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500 transition shrink-0"
                aria-hidden="true"
              />
            )}
          </Card>
        </Link>

        <Link href="/captain/contract" className="group block">
          <Card className="theme-card p-5 rounded-2xl border theme-border shadow-none hover:border-amber-500 transition flex items-center justify-between gap-3 h-full">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FilePlus2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                  {ui("إنشاء عقد رحلة جديد")}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {ui("كشف الركاب الديناميكي وتوليد الـ PDF الرسمي")}
                </p>
              </div>
            </div>
            {isRTL ? (
              <ArrowUpLeft
                className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500 transition shrink-0"
                aria-hidden="true"
              />
            ) : (
              <ArrowUpRight
                className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500 transition shrink-0"
                aria-hidden="true"
              />
            )}
          </Card>
        </Link>
      </div>

      {/* Captain Recent Contracts */}
      <div className="theme-card rounded-2xl border theme-border overflow-hidden">
        <div className="p-4 sm:p-5 border-b theme-border flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {ui("عقودي الأخيرة")}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {ui("العقود الموثقة الصادرة بحسابك مع كشوف الركاب")}
            </p>
          </div>
          <Link
            href="/captain/contract"
            className="min-h-10 inline-flex items-center text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline px-2"
          >
            {ui("+ عقد جديد")}
          </Link>
        </div>

        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-[var(--text-muted)]">
              {ui("جاري تحميل البيانات...")}
            </p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)] text-sm">
            {ui("لم تقم بإنشاء أي عقود بعد.")}
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3 p-3.5">
              {contracts.map((c) => {
                const pdfDownloadHref = backendUrl(
                  `/contracts/${encodeURIComponent(c.id)}/pdf?download=1`,
                );

                return (
                  <MobileRecordCard
                    key={c.id}
                    titleAs="h3"
                    title={
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                        <bdi>{c.referenceNumber}</bdi>
                      </span>
                    }
                    subtitle={
                      <span>
                        {ui("العميل:")} {c.customerName}
                      </span>
                    }
                    badge={
                      <StatusBadge
                        type="operation"
                        status={c.operationType}
                        size="sm"
                      />
                    }
                    footer={
                      <>
                        <ReportTripButton contractId={c.id} />
                        <a
                          href={pdfDownloadHref}
                          download={`Contract_${c.referenceNumber}.pdf`}
                          className="min-h-11 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border theme-border hover:border-amber-500 text-xs font-bold transition text-slate-700 dark:text-slate-200"
                          aria-label={`${ui("تحميل العقد PDF")} ${c.referenceNumber}`}
                          title={ui("تحميل العقد PDF")}
                        >
                          <Download
                            className="w-3.5 h-3.5 text-amber-500"
                            aria-hidden="true"
                          />
                          <span>{ui("تحميل")}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => openPdf(c)}
                          aria-label={`${ui("عرض PDF")} ${c.referenceNumber}`}
                          className="min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <FileText
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                          <span>{ui("عرض PDF")}</span>
                        </button>
                      </>
                    }
                  >
                    <MobileCardMetaGrid>
                      <MobileCardField
                        className="col-span-2 pb-2 border-b theme-border"
                        label={
                          <span className="inline-flex items-center gap-1">
                            <MapPin
                              className="w-3 h-3 text-emerald-500"
                              aria-hidden="true"
                            />
                            <span>{ui("مسار الرحلة")}</span>
                          </span>
                        }
                        value={
                          <span className="inline-flex flex-wrap items-center gap-1.5 leading-snug">
                            <bdi>{c.origin}</bdi>
                            {isRTL ? (
                              <ArrowLeft
                                className="w-3.5 h-3.5 text-amber-500 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <ArrowRight
                                className="w-3.5 h-3.5 text-amber-500 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <bdi>{c.destination}</bdi>
                          </span>
                        }
                      />
                      <MobileCardField
                        label={
                          <span className="inline-flex items-center gap-1">
                            <Calendar
                              className="w-3 h-3 text-amber-500"
                              aria-hidden="true"
                            />
                            <span>{ui("موعد الرحلة")}</span>
                          </span>
                        }
                        mono
                        value={
                          <bdi dir="ltr">
                            {c.tripDate}
                            {c.tripTime ? ` · ${c.tripTime}` : ""}
                          </bdi>
                        }
                      />
                      <MobileCardField
                        label={
                          <span className="inline-flex items-center gap-1">
                            <Users
                              className="w-3 h-3 text-amber-500"
                              aria-hidden="true"
                            />
                            <span>{ui("الركاب")}</span>
                          </span>
                        }
                        mono
                        value={`${c.passengers?.length || 0} ${ui("ركاب")}`}
                      />
                    </MobileCardMetaGrid>
                  </MobileRecordCard>
                );
              })}
            </div>

            {/* Desktop List View */}
            <div className="hidden md:block divide-y theme-border">
              {contracts.map((c) => {
                const pdfDownloadHref = backendUrl(
                  `/contracts/${encodeURIComponent(c.id)}/pdf?download=1`,
                );
                return (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                          <bdi>{c.referenceNumber}</bdi>
                        </span>
                        <StatusBadge
                          type="operation"
                          status={c.operationType}
                          size="sm"
                        />
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {ui("العميل:")} {c.customerName}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-3">
                        <span>
                          {ui("من:")} {c.origin}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>
                          {ui("إلى:")} {c.destination}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span className="font-mono" dir="ltr">
                          <bdi>{c.tripDate}</bdi>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {c.passengers?.length || 0} {ui("ركاب")}
                      </span>
                      <ReportTripButton contractId={c.id} />
                      <a
                        href={pdfDownloadHref}
                        download={`Contract_${c.referenceNumber}.pdf`}
                        className="inline-flex min-h-10 items-center gap-1.5 px-3 py-1.5 rounded-xl border theme-border hover:border-amber-500 text-xs font-bold transition text-slate-700 dark:text-slate-200"
                        aria-label={`${ui("تحميل العقد PDF")} ${c.referenceNumber}`}
                        title={ui("تحميل العقد PDF")}
                      >
                        <Download
                          className="w-3.5 h-3.5 text-amber-500"
                          aria-hidden="true"
                        />
                        {ui("تحميل")}
                      </a>
                      <button
                        type="button"
                        onClick={() => openPdf(c)}
                        aria-label={`${ui("عرض PDF")} ${c.referenceNumber}`}
                        className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-1.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        {ui("عرض PDF")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* PDF Modal */}
      {previewPdfId && (
        <PdfPreviewModal
          isOpen={!!previewPdfId}
          onClose={() => {
            setPreviewPdfId(null);
            setPreviewPdfUrl(null);
          }}
          contractId={previewPdfId}
          referenceNumber={previewPdfRef}
          pdfUrl={previewPdfUrl}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Full-Screen Captain Contract Builder */}
      <FullscreenDialog
        open={isCreateFullscreen}
        onClose={() => setIsCreateFullscreen(false)}
        title={ui("إنشاء عقد نقل بري رسمي")}
        subtitle={ui(
          "توليد العقد المعتمد من هيئة النقل (المادتين 39 و 40) مع كشف الركاب",
        )}
        variant="workspace"
        closedBy="closerequest"
        icon={<FilePlus2 className="h-5 w-5" aria-hidden="true" />}
      >
        <CaptainContractBuilder
          inModal
          onClose={() => setIsCreateFullscreen(false)}
          onCreated={() => void loadData(true)}
        />
      </FullscreenDialog>
    </div>
  );
}
