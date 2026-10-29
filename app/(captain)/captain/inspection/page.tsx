"use client";
import dynamic from "next/dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import InspectionDownloadButton from "@/app/_components/InspectionDownloadButton";
import type { VehicleInspection, Vehicle } from "@/lib/types";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FilePlus2,
  Check,
  ArrowRight,
  Sparkles,
  Edit3,
  Calendar,
  Clock,
  Eye,
  RotateCw,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import {
  submitInspection,
  getTodayInspection,
  getAllInspectionsList,
  InspectionInput,
  InspectionWithMeta,
} from "@/app/_actions/inspection";
import { getVehicles } from "@/app/_actions/fleet";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { getSaudiTodayDateStr, formatOfficialDate } from "@/lib/contractConstants";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

const InspectionPdfPreviewModal = dynamic(
  () => import("@/app/_components/InspectionPdfPreviewModal"),
  { ssr: false }
);

interface CheckItemConfig {
  key: keyof Omit<
    InspectionInput,
    "captainId" | "vehiclePlate" | "driverDeclared" | "notes" | "inspectionDate"
  >;
  titleAr: string;
  titleEn: string;
  description: string;
}

const DASHBOARD_ITEMS: CheckItemConfig[] = [
  { key: "fuelGauge", titleAr: "مؤشر الوقود", titleEn: "Fuel Gauge", description: "كفاية الوقود للمسار المخطط" },
  { key: "tempGauge", titleAr: "مؤشر الحرارة", titleEn: "Temp Gauge", description: "حرارة المحرك في النطاق الطبيعي" },
  { key: "oilPressure", titleAr: "مؤشر ضغط الزيت", titleEn: "Oil Pressure", description: "ضغط دورة زيت المحرك سليم" },
  { key: "checkEngine", titleAr: "لمبة فحص المحرك", titleEn: "Check Engine", description: "عدم إضاءة لمبة العطل" },
  { key: "absLight", titleAr: "لمبة نظام الفرامل ABS", titleEn: "ABS Light", description: "نظام منع انغلاق المكابح سليم" },
  { key: "warningLights", titleAr: "لمبات التحذير العامة", titleEn: "Warning Lights", description: "خلو اللوحة من أي تنبيهات حرجة" },
];

const EXTERNAL_ITEMS: CheckItemConfig[] = [
  { key: "tires", titleAr: "الإطارات وضغط الهواء", titleEn: "Tires & Pressure", description: "عمق المداس وسلامة الإطار وضغط الهواء" },
  { key: "headlights", titleAr: "الأنوار الأمامية والخلفية", titleEn: "Headlights & Taillights", description: "الإضاءة العالية والمنخفضة وأنوار الفرامل" },
  { key: "signals", titleAr: "إشارات الانعطاف والتحذير", titleEn: "Turn & Hazard Signals", description: "عمل إشارات الغمازات وفلاشر الطوارئ" },
  { key: "mirrors", titleAr: "الزجاج والمرايا الجانبية", titleEn: "Mirrors & Windshield", description: "نظافة الزجاج وخلو المرايا من الكسور" },
  { key: "noLeaks", titleAr: "عدم وجود تسريبات أسفل الحافلة", titleEn: "No Fluid Leaks", description: "خلو أسفل المركبة من تسريب زيت أو ماء رديتر" },
];

const SAFETY_ITEMS: CheckItemConfig[] = [
  { key: "fireExtinguisher", titleAr: "طفاية حريق سارية الصلاحية", titleEn: "Fire Extinguisher", description: "مؤشر الضغط في الأخضر وتاريخ الصلاحية سارٍ" },
  { key: "warningTriangle", titleAr: "المثلث العاكس للتحذير", titleEn: "Warning Triangle", description: "جاهز للطوارئ على الطرق السريعة" },
  { key: "firstAidKit", titleAr: "حقيبة الإسعافات الأولية", titleEn: "First Aid Kit", description: "مكتملة الضمادات والمطهرات الأساسية" },
  { key: "glassHammer", titleAr: "مطرقة كسر الزجاج", titleEn: "Glass Break Hammer", description: "مثبتة في مكانها المخصص للركاب" },
  { key: "seatBelts", titleAr: "أحزمة الأمان لجميع المقاعد", titleEn: "Seat Belts", description: "سلامة وأداء أقفال أحزمة الأمان" },
];

export default function CaptainInspectionPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  const [vehiclePlate, setVehiclePlate] = useState(
    user?.assignedVehiclePlate || ""
  );
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

  const [driverDeclared, setDriverDeclared] = useState(true);
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // PDF Preview Modal
  const [previewInspection, setPreviewInspection] = useState<{
    id: string;
    vehiclePlate?: string;
    pdfPath?: string | null;
  } | null>(null);

  const alreadyInspected = Boolean(inspection);

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
    if (user?.id) {
      // 1. Fetch Today's Inspection
      fetchCached(`captain_inspection_${user.id}`, () => getTodayInspection(user.id), { ttlMs: 60_000 }).then((res) => {
        if (res.success && res.inspection) {
          setInspection(res.inspection);
        }
      });

      // 2. Fetch Captain's Inspection History
      fetchCached(`captain_inspections_history_${user.id}`, () => getAllInspectionsList({ captainId: user.id, limit: 30 }), { ttlMs: 60_000 }).then((res) => {
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
    }
  }, [user]);

  const toggleCheck = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    if (!driverDeclared) {
      setErrorMessage("يجب الموافقة على التعهد والإقرار قبل إرسال الفحص");
      return;
    }
    if (!vehiclePlate.trim()) {
      setErrorMessage("يرجى إدخال أو اختيار رقم لوحة المركبة");
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
      inspectionDate: inspectionDateMode === "MANUAL" && inspectionDate ? inspectionDate : undefined,
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
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              سجل الفحص التشغيلي للمركبة
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mr-7">
            الفحص الإلزامي قبل التشغيل (16 بنداً معتمداً في الصفحة 3 من العقد الرسمي) • يدوي وتلقائي
          </p>
        </div>

        {activeTab === "form" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setAllSound(true)}
              className="w-full sm:w-auto justify-center px-3.5 py-2 sm:py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              تحديد الكل سليم ✓
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b theme-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "form"
              ? "gold-gradient-btn text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>تسجيل فحص جديد (تلقائي / يدوي)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "history"
              ? "gold-gradient-btn text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل الفحوصات السابقة</span>
          {historyList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
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
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  لقد قمت بالفعل بتسجيل فحص اليوم بنجاح. يمكنك تحديث الفحص أو اختيار نمط &quot;يدوي&quot; لتسجيل فحص بتاريخ مخصص.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectionDateMode("MANUAL")}
                  className="px-3 py-1.5 rounded-lg border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                  تحديد تاريخ يدوي
                </button>
                <Link
                  href="/captain/contract"
                  className="px-3 py-1.5 rounded-lg gold-gradient-btn text-xs font-bold"
                >
                  الانتقال للعقد ←
                </Link>
              </div>
            </div>
          )}

          {submittedSuccess ? (
            <div className="theme-card rounded-3xl p-6 sm:p-8 border theme-border text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                تم توثيق فحص المركبة بنجاح!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                تم اعتماد جاهزية الحافلة ({vehiclePlate}) {inspectionDateMode === "MANUAL" ? `بتاريخ (${formatOfficialDate(inspectionDate)})` : "ليومنا هذا"}. تم فتح صلاحية إصدار عقود النقل البري وكشف الركاب.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3">
                {inspection && <InspectionDownloadButton key={inspection.id} inspectionId={inspection.id} />}
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setInspectionDateMode("AUTO");
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  إجراء فحص جديد
                </button>
                <Link
                  href="/captain/contract"
                  className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center gap-2"
                >
                  <FilePlus2 className="w-4 h-4" />
                  إنشاء عقد رحلة الآن
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Vehicle & Captain Info Card */}
              <div className="theme-card p-5 rounded-2xl border theme-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">
                    اسم الكابتن الفاحص
                  </label>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {user?.name}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">
                    رقم الهوية الوطنية
                  </label>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm" dir="ltr">
                    {user?.nationalId || "2553660073"}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    رقم لوحة المركبة *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="ا ص ل 7223"
                      className="flex-1 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                    />
                    {vehicles.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setVehiclePlate(e.target.value);
                        }}
                        value=""
                        className="px-2 py-1.5 text-xs rounded-xl border theme-card font-mono text-slate-500 dark:text-slate-400 focus:border-amber-500 focus:outline-hidden"
                      >
                        <option value="">من الأسطول...</option>
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
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      تاريخ الفحص التشغيلي المعتمد (يدوي / مانيوال)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      يمكن اعتماد تاريخ اليوم الفعلي تلقائياً أو اختيار تاريخ يدوي مخصص في السجلات
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border theme-border self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setInspectionDateMode("AUTO")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        inspectionDateMode === "AUTO"
                          ? "gold-gradient-btn text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      اليوم (تلقائي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionDateMode("MANUAL")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        inspectionDateMode === "MANUAL"
                          ? "gold-gradient-btn text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      يدوي (تاريخ مخصص)
                    </button>
                  </div>
                </div>

                {inspectionDateMode === "AUTO" ? (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t theme-border text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      تاريخ الفحص المعتمد في السجلات والوثيقة:
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {formatOfficialDate(getSaudiTodayDateStr())} (تاريخ اليوم الفعلي بتوقيت المملكة)
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t theme-border">
                    <div className="w-full sm:w-64">
                      <CustomDatePicker
                        label="تاريخ الفحص المعتمد (يدوي)"
                        required
                        value={inspectionDate}
                        onChange={setInspectionDate}
                      />
                    </div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 sm:self-end h-11">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>
                        سيتم توثيق الفحص واعتماده بهذا التاريخ المخصص في السجلات وتقارير الفحص ووثيقة الـ PDF الرسمية.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 1: Dashboard */}
              <div className="theme-card rounded-2xl border theme-border overflow-hidden">
                <div className="p-4 border-b theme-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      أولاً: فحص مؤشرات لوحة القيادة
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      First Check the dashboard indicator
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    6 بنود
                  </span>
                </div>

                <div className="divide-y theme-border">
                  {DASHBOARD_ITEMS.map((item) => {
                    const isSound = checks[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleCheck(item.key)}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition select-none"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            {item.titleAr}
                            <span className="text-xs text-slate-400 font-normal font-mono" dir="ltr">
                              ({item.titleEn})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChecks((prev) => ({ ...prev, [item.key]: true }));
                            }}
                            className={`flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                              isSound
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            سليم
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChecks((prev) => ({ ...prev, [item.key]: false }));
                            }}
                            className={`flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                              !isSound
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            غير سليم
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: External */}
              <div className="theme-card rounded-2xl border theme-border overflow-hidden">
                <div className="p-4 border-b theme-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      ثانياً: الفحص الخارجي للحافلة
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Second External inspection
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    5 بنود
                  </span>
                </div>

                <div className="divide-y theme-border">
                  {EXTERNAL_ITEMS.map((item) => {
                    const isSound = checks[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleCheck(item.key)}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition select-none"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            {item.titleAr}
                            <span className="text-xs text-slate-400 font-normal font-mono" dir="ltr">
                              ({item.titleEn})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChecks((prev) => ({ ...prev, [item.key]: true }));
                            }}
                            className={`flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                              isSound
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            سليم
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChecks((prev) => ({ ...prev, [item.key]: false }));
                            }}
                            className={`flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                              !isSound
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            غير سليم
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Safety Tools */}
              <div className="theme-card rounded-2xl border theme-border overflow-hidden">
                <div className="p-4 border-b theme-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      ثالثاً: أدوات ومتطلبات الأمن والسلامة
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Third Safety and security tools
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    5 بنود
                  </span>
                </div>

                <div className="divide-y theme-border">
                  {SAFETY_ITEMS.map((item) => {
                    const isSound = checks[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleCheck(item.key)}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition select-none"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            {item.titleAr}
                            <span className="text-xs text-slate-400 font-normal font-mono" dir="ltr">
                              ({item.titleEn})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChecks((prev) => ({ ...prev, [item.key]: true }));
                            }}
                            className={`flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                              isSound
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            سليم
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChecks((prev) => ({ ...prev, [item.key]: false }));
                            }}
                            className={`flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                              !isSound
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            غير سليم
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes & Declaration */}
              <div className="theme-card p-6 rounded-2xl border theme-border space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ملاحظات الفحص الإضافية (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أية ملاحظات ميدانية عن حالة المركبة..."
                    className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden resize-none"
                  />
                </div>

                {/* Official Legal Declaration Checkbox */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={driverDeclared}
                      onChange={(e) => setDriverDeclared(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                        إقرار وتعهد الكابتن (مدرج رسمياً في نموذج هيئة النقل)
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        &quot;أقر أنا السائق أعلاه بأنني قمت بفحص الحافلة والتأكد من سلامتها وجاهزيتها التامة قبل التشغيل والانطلاق على الطرق البرية.&quot;
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <Link
                  href="/captain"
                  className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  إلغاء
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || !driverDeclared}
                  className="w-full sm:w-auto justify-center px-7 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {isSubmitting ? "جاري اعتماد وتوثيق الفحص..." : "اعتماد وتوثيق الفحص التشغيلي"}
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
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              سجل الفحوصات التشغيلية المعتمدة
            </h2>
            <span className="text-xs text-slate-400">
              {historyList.length} فحص موثق
            </span>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center theme-card rounded-2xl border theme-border">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
              <p className="text-xs text-slate-400 mt-2">جاري تحميل سجل الفحوصات...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-8 text-center theme-card rounded-2xl border theme-border space-y-3">
              <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد فحوصات تشغيلية مسجلة حتى الآن
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className="px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                تسجيل أول فحص تشغيلي الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {historyList.map((item) => {
                const shortCode = item.id.replace(/-/g, "").slice(0, 8).toUpperCase();
                return (
                  <div
                    key={item.id}
                    className="theme-card p-4 rounded-2xl border theme-border space-y-3 hover:border-amber-500/50 transition flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              حافلة {item.vehiclePlate}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border theme-border font-bold">
                              #{shortCode}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            <span>تاريخ الفحص: </span>
                            <strong className="font-mono font-bold text-slate-700 dark:text-slate-200" dir="ltr">
                              {formatOfficialDate(item.inspectionDate)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        16/16 سليم
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border theme-border line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t theme-border flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewInspection({
                            id: item.id,
                            vehiclePlate: item.vehiclePlate,
                            pdfPath: item.pdfPath,
                          })
                        }
                        className="flex-1 px-3 py-1.5 rounded-xl border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                        معاينة الوثيقة
                      </button>

                      <div className="shrink-0">
                        <InspectionDownloadButton inspectionId={item.id} />
                      </div>
                    </div>
                  </div>
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
