"use client";
import { DASHBOARD_ITEMS, EXTERNAL_ITEMS, SAFETY_ITEMS, inspectionMatchesDay } from "@/lib/inspection";
import InspectionChecklist from "@/app/_components/form/InspectionChecklist";
import { MobileCardField, MobileCardMetaGrid, MobileRecordCard } from "@/app/_components/mobile";
import { Badge } from "@/app/_components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { useUiText } from "@/lib/ui-text";
import { useLanguage } from "@/lib/languageContext";

import dynamic from "next/dynamic";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import InspectionDownloadButton from "@/app/_components/InspectionDownloadButton";
import type { VehicleInspection, Vehicle } from "@/lib/types";
import { ClipboardCheck, CheckCircle2, AlertCircle, FilePlus2, Check, ArrowRight, Sparkles, Edit3, Calendar, Clock, Eye, RotateCw } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { submitInspection, getTodayInspection, getAllInspectionsList, InspectionInput, InspectionWithMeta } from "@/app/_actions/inspection";
import { getVehicles } from "@/app/_actions/fleet";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { getSaudiTodayDateStr, formatOfficialDate } from "@/lib/contractConstants";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

const InspectionPdfPreviewModal = dynamic(
  () => import("@/app/_components/InspectionPdfPreviewModal"),
  { ssr: false }
);

export default function CaptainInspectionPage() {
  const ui = useUiText();
  const { isRTL } = useLanguage();
  const fieldId = useId();
  const plateInputRef = useRef<HTMLInputElement>(null);
  const declarationRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  const [vehiclePlateOverride, setVehiclePlateOverride] = useState<string | null>(null);
  const vehiclePlate = vehiclePlateOverride ?? user?.assignedVehiclePlate ?? "";
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const cached = getCachedData<Awaited<ReturnType<typeof getVehicles>>>("fleet_vehicles");
    if (cached && typeof cached === "object" && Array.isArray(cached.vehicles)) {
      return cached.vehicles;
    }
    return [];
  });

  // Date selection: Auto vs Manual
  const [inspectionDateMode, setInspectionDateMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [inspectionDate, setInspectionDate] = useState(() => getSaudiTodayDateStr());

  const [driverDeclared, setDriverDeclared] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [inspection, setInspection] = useState<VehicleInspection | null>(() =>
    user ? getCachedData<Awaited<ReturnType<typeof getTodayInspection>>>(`captain_inspection_${user.id}`)?.inspection || null : null
  );
  const [historyList, setHistoryList] = useState<InspectionWithMeta[]>(() => {
    if (!user) return [];
    const cached = getCachedData<Awaited<ReturnType<typeof getAllInspectionsList>>>(`captain_inspections_history_${user.id}`);
    if (cached && typeof cached === "object" && Array.isArray(cached.inspections)) {
      return cached.inspections;
    }
    return [];
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(() => {
    return !user || !getCachedData<Awaited<ReturnType<typeof getAllInspectionsList>>>(`captain_inspections_history_${user.id}`);
  });

  // PDF Preview Modal
  const [previewInspection, setPreviewInspection] = useState<{
    id: string;
    vehiclePlate?: string;
    pdfPath?: string | null;
  } | null>(null);

  const alreadyInspected = inspectionMatchesDay(
    inspection,
    getSaudiTodayDateStr(),
    user?.assignedVehiclePlate || undefined
  );

  // 16 boolean flags
  const [checks, setChecks] = useState<Record<string, boolean>>({
    fuelGauge: true,
    tempGauge: true,
    oilPressure: true,
    checkEngine: true,
    absLight: true,
    warningLights: true,
    tires: true,
    headlights: true,
    signals: true,
    mirrors: true,
    noLeaks: true,
    fireExtinguisher: true,
    warningTriangle: true,
    firstAidKit: true,
    glassHammer: true,
    seatBelts: true,
  });

  useEffect(() => {
    if (!user?.id) return;

    // 1. Fetch Today's Inspection (with history fallback matching contract builder)
    fetchCached(`captain_inspection_${user.id}`, () => getTodayInspection(user.id), { ttlMs: 60_000 }).then(
      async (res) => {
        const todayStr = getSaudiTodayDateStr();
        if (
          res.success &&
          res.inspection &&
          inspectionMatchesDay(res.inspection, todayStr, user.assignedVehiclePlate || undefined)
        ) {
          setInspection(res.inspection);
          return;
        }
        try {
          const listRes = await getAllInspectionsList({ captainId: user.id, limit: 1 });
          if (
            listRes.success &&
            listRes.inspections?.[0] &&
            inspectionMatchesDay(listRes.inspections[0], todayStr, user.assignedVehiclePlate || undefined)
          ) {
            setInspection(listRes.inspections[0]);
          }
        } catch (err) {
          console.error("Failed to load fallback inspection:", err);
        }
      }
    );

    // 2. Fetch Captain's Inspection History
    fetchCached(
      `captain_inspections_history_${user.id}`,
      () => getAllInspectionsList({ captainId: user.id, limit: 30 }),
      { ttlMs: 60_000 }
    ).then((res) => {
      if (res.success && res.inspections) {
        setHistoryList(res.inspections);
      }
      setIsLoadingHistory(false);
    });

    // 3. Fetch Fleet Vehicles for quick selector
    fetchCached("fleet_vehicles", getVehicles, { ttlMs: 120_000 }).then((res) => {
      if (res.success && res.vehicles) {
        setVehicles(res.vehicles);
      }
    });
  }, [user]);



  const setAllSound = (sound: boolean) => {
    const updated: Record<string, boolean> = {};
    [...DASHBOARD_ITEMS, ...EXTERNAL_ITEMS, ...SAFETY_ITEMS].forEach((item) => {
      updated[item.key] = sound;
    });
    setChecks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!vehiclePlate.trim()) {
      setErrorMessage("يرجى إدخال أو اختيار رقم لوحة المركبة");
      plateInputRef.current?.focus();
      plateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!driverDeclared) {
      setErrorMessage("يجب الموافقة على التعهد والإقرار قبل إرسال الفحص");
      declarationRef.current?.focus();
      declarationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const payload: InspectionInput = {
      captainId: user.id,
      vehiclePlate: vehiclePlate.trim(),
      fuelGauge: checks.fuelGauge,
      tempGauge: checks.tempGauge,
      oilPressure: checks.oilPressure,
      checkEngine: checks.checkEngine,
      absLight: checks.absLight,
      warningLights: checks.warningLights,
      tires: checks.tires,
      headlights: checks.headlights,
      signals: checks.signals,
      mirrors: checks.mirrors,
      noLeaks: checks.noLeaks,
      fireExtinguisher: checks.fireExtinguisher,
      warningTriangle: checks.warningTriangle,
      firstAidKit: checks.firstAidKit,
      glassHammer: checks.glassHammer,
      seatBelts: checks.seatBelts,
      driverDeclared,
      notes,
      inspectionDate:
        inspectionDateMode === "MANUAL" && inspectionDate
          ? inspectionDate.replace(/\//g, "-")
          : undefined,
    };

    const res = await submitInspection(payload);
    setIsSubmitting(false);

    if (res.success && res.inspection) {
      const savedInsp = res.inspection;
      invalidateClientCache("captain_inspection_");
      invalidateClientCache("captain_inspections_history_");
      invalidateClientCache("inspections_");
      invalidateClientCache("captains_list");
      invalidateClientCache("dashboard_stats");
      setSubmittedSuccess(true);
      setInspection(savedInsp);
      // Prepend to history list for instant feedback
      const createdItem: InspectionWithMeta = {
        ...savedInsp,
        captainPhone: user.phone || null,
        captainAvatar: user.avatarUrl || null,
        contractCount: 0,
      };
      setHistoryList((prev) => [createdItem, ...prev.filter((item) => item.id !== savedInsp.id)]);
    } else {
      setErrorMessage(res.error || "فشل تسجيل الفحص");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/captain"
              aria-label={ui("العودة للرئيسية")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)] hover:text-slate-700 dark:hover:text-white transition"
            >
              <ArrowRight className="w-5 h-5 ltr:rotate-180" aria-hidden="true" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {ui("سجل الفحص التشغيلي للمركبة")}</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] dark:text-slate-400 mt-1 ms-13">
            {ui("الفحص الإلزامي قبل التشغيل (16 بنداً معتمداً في الصفحة 3 من العقد الرسمي) • يدوي وتلقائي")}</p>
        </div>

        {activeTab === "form" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setAllSound(true)}
              className="w-full sm:w-auto min-h-11 justify-center px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              {ui("تحديد الكل سليم")}</button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 border-b theme-border pb-2.5">
        <button
          type="button"
          aria-pressed={activeTab === "form"}
          onClick={() => setActiveTab("form")}
          className={`flex-1 sm:flex-none min-h-11 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "form"
              ? "gold-gradient-btn shadow-xs"
              : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {ui("تسجيل فحص جديد")} <span className="hidden sm:inline">{ui("(تلقائي / يدوي)")}</span>
          </span>
        </button>

        <button
          type="button"
          aria-pressed={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          className={`flex-1 sm:flex-none min-h-11 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "history"
              ? "gold-gradient-btn shadow-xs"
              : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{ui("سجل الفحوصات السابقة")}</span>
          {historyList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-900 shrink-0">
              {historyList.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FORM */}
      {activeTab === "form" && (
        <div className="space-y-6">
          {inspection && !submittedSuccess && (
            <InspectionDownloadButton key={inspection.id} inspectionId={inspection.id} />
          )}

          {alreadyInspected && !submittedSuccess && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900 dark:text-blue-200 text-xs">
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" />
                <span>
                  {ui("لقد قمت بالفعل بتسجيل فحص اليوم بنجاح. يمكنك تحديث الفحص أو اختيار نمط «يدوي» لتسجيل فحص بتاريخ مخصص.")}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectionDateMode("MANUAL")}
                  className="min-h-11 px-3 py-2 rounded-lg border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                  {ui("تحديد تاريخ يدوي")}</button>
                <Link
                  href="/captain/contract"
                  className="min-h-11 px-3.5 py-2 rounded-lg gold-gradient-btn text-xs font-bold inline-flex items-center"
                >
                  {ui("الانتقال للعقد ←")}</Link>
              </div>
            </div>
          )}

          {submittedSuccess ? (
            <div className="theme-card rounded-2xl p-6 sm:p-8 border theme-border text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {ui("تم توثيق فحص المركبة بنجاح!")}</h2>
              <p className="text-sm text-[var(--text-muted)] dark:text-slate-400 max-w-md mx-auto">
                {isRTL
                  ? `تم اعتماد جاهزية الحافلة (${vehiclePlate}) ${inspectionDateMode === "MANUAL" ? `بتاريخ (${formatOfficialDate(inspectionDate)})` : "ليومنا هذا"}. تم فتح صلاحية إصدار عقود النقل البري وكشف الركاب.`
                  : `Vehicle (${vehiclePlate}) has been cleared ${inspectionDateMode === "MANUAL" ? `for (${formatOfficialDate(inspectionDate)})` : "for today"}. You can now issue transport contracts and passenger manifests.`}
              </p>
              <div className="pt-4 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3">
                {inspection && <InspectionDownloadButton key={inspection.id} inspectionId={inspection.id} />}
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setInspectionDateMode("AUTO");
                  }}
                  className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                  {ui("إجراء فحص جديد")}</button>
                <Link
                  href="/captain/contract"
                  className="w-full sm:w-auto min-h-11 justify-center px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center gap-2"
                >
                  <FilePlus2 className="w-4 h-4" aria-hidden="true" />
                  {ui("إنشاء عقد رحلة الآن")}</Link>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div role="alert" className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {ui(errorMessage)}
                </div>
              )}

              {/* Vehicle & Captain Info Card */}
              <div className="theme-card p-4 sm:p-5 rounded-2xl border theme-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-[var(--text-muted)] font-bold block mb-1">
                    {ui("اسم الكابتن الفاحص")}</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {user?.name || "—"}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[var(--text-muted)] font-bold block mb-1">
                    {ui("رقم الهوية الوطنية")}</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm" dir="ltr">
                    <bdi>{user?.nationalId || "—"}</bdi>
                  </div>
                </div>

                <div>
                  <label htmlFor={`${fieldId}-plate`} className="text-xs text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    {ui("رقم لوحة المركبة *")}</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id={`${fieldId}-plate`}
                      ref={plateInputRef}
                      type="text"
                      required
                      aria-invalid={!vehiclePlate.trim() && Boolean(errorMessage) ? true : undefined}
                      value={vehiclePlate}
                      onChange={(e) => {
                        setVehiclePlateOverride(e.target.value);
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder={ui("ا ص ل 7223")}
                      className="flex-1 min-h-11 px-3 py-2 text-xs font-mono font-bold rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                    />
                    {vehicles.length > 0 && (
                      <select
                        id={`${fieldId}-fleet`}
                        aria-label={ui("اختيار مركبة من الأسطول")}
                        onChange={(e) => {
                          if (e.target.value) {
                            setVehiclePlateOverride(e.target.value);
                            if (errorMessage) setErrorMessage("");
                          }
                        }}
                        value=""
                        className="min-h-11 px-2.5 py-2 text-xs rounded-xl border theme-card font-mono text-[var(--text-muted)] dark:text-slate-400 focus:border-amber-500 focus:outline-hidden"
                      >
                        <option value="">{ui("من الأسطول...")}</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.plateNumberAr}>
                            {v.plateNumberAr} ({v.make} {v.model})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Inspection Date Mode & Manual Date Selection */}
              <div className="theme-card p-4 sm:p-5 rounded-2xl border theme-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      {ui("تاريخ الفحص التشغيلي المعتمد (يدوي / مانيوال)")}</span>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {ui("يمكن اعتماد تاريخ اليوم الفعلي تلقائياً أو اختيار تاريخ يدوي مخصص في السجلات")}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:flex w-full sm:w-auto items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border theme-border shadow-2xs">
                    <button
                      type="button"
                      aria-pressed={inspectionDateMode === "AUTO"}
                      onClick={() => setInspectionDateMode("AUTO")}
                      className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        inspectionDateMode === "AUTO"
                          ? "gold-gradient-btn shadow-xs"
                          : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {ui("اليوم (تلقائي)")}</button>
                    <button
                      type="button"
                      aria-pressed={inspectionDateMode === "MANUAL"}
                      onClick={() => setInspectionDateMode("MANUAL")}
                      className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        inspectionDateMode === "MANUAL"
                          ? "gold-gradient-btn shadow-xs"
                          : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {ui("يدوي (تاريخ مخصص)")}</button>
                  </div>
                </div>

                {inspectionDateMode === "AUTO" ? (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t theme-border text-xs">
                    <span className="text-[var(--text-muted)] dark:text-slate-400">
                      {ui("تاريخ الفحص المعتمد في السجلات والوثيقة:")}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <bdi dir="ltr">{formatOfficialDate(getSaudiTodayDateStr())}</bdi> {ui("(تاريخ اليوم الفعلي بتوقيت المملكة)")}</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t theme-border">
                    <div className="w-full sm:w-64">
                      <CustomDatePicker
                        label={ui("تاريخ الفحص المعتمد (يدوي)")}
                        required
                        value={inspectionDate}
                        onChange={setInspectionDate}
                      />
                    </div>
                    <div className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 sm:self-end min-h-11">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                      <span>
                        {ui("سيتم توثيق الفحص واعتماده بهذا التاريخ المخصص في السجلات وتقارير الفحص ووثيقة الـ PDF الرسمية.")}</span>
                    </div>
                  </div>
                )}
              </div>

              <section className="theme-card rounded-2xl p-4 sm:p-6"><InspectionChecklist checks={checks} onChange={(key, value) => setChecks(previous => ({ ...previous, [key]: value }))} /></section>

              {/* Notes & Declaration */}
              <div className="theme-card p-4 sm:p-6 rounded-2xl border theme-border space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor={`${fieldId}-notes`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ui("ملاحظات الفحص الإضافية (اختياري)")}</label>
                  <textarea
                    id={`${fieldId}-notes`}
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={ui("أية ملاحظات ميدانية عن حالة المركبة...")}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden resize-y"
                  />
                </div>

                {/* Official Legal Declaration Checkbox */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <label htmlFor={`${fieldId}-declaration`} className="flex min-h-11 items-start gap-3 cursor-pointer select-none">
                    <Checkbox
                      id={`${fieldId}-declaration`}
                      ref={declarationRef}
                      required
                      checked={driverDeclared}
                      aria-invalid={!driverDeclared && Boolean(errorMessage) ? true : undefined}
                      onChange={(e) => {
                        setDriverDeclared(e.target.checked);
                        if (errorMessage) setErrorMessage("");
                      }}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                        {ui("إقرار وتعهد الكابتن (مدرج رسمياً في نموذج هيئة النقل)")}</span>
                      <p className="text-[var(--text-muted)] dark:text-slate-300 leading-relaxed">
                        {ui("«أقر أنا السائق أعلاه بأنني قمت بفحص الحافلة والتأكد من سلامتها وجاهزيتها التامة قبل التشغيل والانطلاق على الطرق البرية.»")}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Action (DOM & visual order match: Cancel first, primary Submit second; inline on mobile/tablet) */}
              <div className="contract-submit-bar justify-end">
                <Link
                  href="/captain"
                  className="w-full sm:w-auto min-h-11 px-4 sm:px-5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center justify-center shrink-0"
                >
                  {ui("إلغاء")}</Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-h-11 justify-center px-6 sm:px-7 rounded-xl gold-gradient-btn text-xs sm:text-sm font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{ui(isSubmitting ? "جاري اعتماد وتوثيق الفحص..." : "اعتماد وتوثيق الفحص التشغيلي")}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: INSPECTION HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" aria-hidden="true" />
              {ui("سجل الفحوصات التشغيلية المعتمدة")}</h2>
            <span className="text-xs text-[var(--text-muted)]">
              {historyList.length} {ui("فحص موثق")}</span>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center theme-card rounded-2xl border theme-border">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
              <p className="text-xs text-[var(--text-muted)] mt-2">{ui("جاري تحميل سجل الفحوصات...")}</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-8 text-center theme-card rounded-2xl border theme-border space-y-3">
              <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {ui("لا توجد فحوصات تشغيلية مسجلة حتى الآن")}</p>
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className="min-h-11 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {ui("تسجيل أول فحص تشغيلي الآن")}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {historyList.map((item) => {
                const shortCode = item.id.replace(/-/g, "").slice(0, 8).toUpperCase();
                const allChecklistItems = [...DASHBOARD_ITEMS, ...EXTERNAL_ITEMS, ...SAFETY_ITEMS];
                const passedCount = allChecklistItems.filter((def) =>
                  Boolean(item[def.key as keyof InspectionWithMeta])
                ).length;
                const totalChecks = allChecklistItems.length;
                return (
                  <MobileRecordCard
                    key={item.id}
                    title={
                      <span className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span>{ui("حافلة")}: {item.vehiclePlate}</span>
                      </span>
                    }
                    subtitle={
                      <span className="font-mono font-bold text-[11px]" dir="ltr">
                        #<bdi>{shortCode}</bdi>
                      </span>
                    }
                    badge={
                      <Badge variant={passedCount === totalChecks ? "success" : "warning"} className="text-xs">
                        <bdi dir="ltr">{passedCount}/{totalChecks}</bdi>{" "}
                        {passedCount === totalChecks ? ui("سليم") : isRTL ? "يحتاج مراجعة" : "Needs review"}
                      </Badge>
                    }
                    footer={
                      <div className="mobile-card-actions w-full flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewInspection({
                              id: item.id,
                              vehiclePlate: item.vehiclePlate,
                              pdfPath: item.pdfPath,
                            })
                          }
                          aria-label={`${ui("معاينة الوثيقة")} #${shortCode}`}
                          className="flex-1 min-h-11 px-3 rounded-xl border theme-border bg-[var(--bg-card-subtle)] hover:border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                          <span>{ui("معاينة الوثيقة")}</span>
                        </button>
                        <div className="shrink-0">
                          <InspectionDownloadButton inspectionId={item.id} />
                        </div>
                      </div>
                    }
                  >
                    <MobileCardMetaGrid columns={2}>
                      <MobileCardField
                        label={ui("تاريخ الفحص")}
                        value={<bdi dir="ltr">{formatOfficialDate(item.inspectionDate)}</bdi>}
                        mono
                      />
                      <MobileCardField
                        label={ui("لوحة المركبة")}
                        value={item.vehiclePlate}
                        mono
                        alignEnd
                      />
                    </MobileCardMetaGrid>

                    {item.notes && (
                      <p className="text-xs text-[var(--text-muted)] dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border theme-border line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </MobileRecordCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewInspection && (
        <InspectionPdfPreviewModal
          isOpen={Boolean(previewInspection)}
          onClose={() => setPreviewInspection(null)}
          inspectionId={previewInspection.id}
          captainName={user?.name || "الكابتن"}
          vehiclePlate={previewInspection.vehiclePlate}
          pdfUrl={previewInspection.pdfPath}
        />
      )}
    </div>
  );
}
