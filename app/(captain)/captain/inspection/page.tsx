"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FilePlus2,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import {
  submitInspection,
  getTodayInspection,
  InspectionInput,
} from "@/app/_actions/inspection";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

interface CheckItemConfig {
  key: keyof Omit<
    InspectionInput,
    "captainId" | "vehiclePlate" | "driverDeclared" | "notes"
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

  const [vehiclePlate, setVehiclePlate] = useState(
    user?.assignedVehiclePlate || ""
  );
  const [driverDeclared, setDriverDeclared] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyInspected, setAlreadyInspected] = useState(() => {
    return Boolean(user && getCachedData<Awaited<ReturnType<typeof getTodayInspection>>>(`captain_inspection_${user.id}`)?.inspection);
  });

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
      fetchCached(`captain_inspection_${user.id}`, () => getTodayInspection(user.id), { ttlMs: 60_000 }).then((res) => {
        if (res.success && res.inspection) {
          setAlreadyInspected(true);
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
    };

    const res = await submitInspection(payload);
    setIsSubmitting(false);

    if (res.success) {
      invalidateClientCache("captain_inspection_");
      invalidateClientCache("inspections_");
      invalidateClientCache("captains_list");
      invalidateClientCache("dashboard_stats");
      setSubmittedSuccess(true);
      setAlreadyInspected(true);
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
              سجل الفحص اليومي للمركبة
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mr-7">
            الفحص الإلزامي قبل التشغيل (16 بنداً معتمداً في الصفحة 3 من العقد الرسمي)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAllSound(true)}
            className="w-full sm:w-auto justify-center px-3.5 py-2 sm:py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            تحديد الكل سليم ✓
          </button>
        </div>
      </div>

      {alreadyInspected && !submittedSuccess && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900 dark:text-blue-200 text-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>لقد قمت بالفعل بتسجيل فحص اليوم بنجاح. يمكنك إعادة الفحص أو التحديث عند الحاجة.</span>
          </div>
          <Link
            href="/captain/contract"
            className="w-full sm:w-auto text-center px-3 py-2 rounded-lg gold-gradient-btn text-xs font-bold shrink-0"
          >
            الانتقال للعقد ←
          </Link>
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
            تم اعتماد جاهزية الحافلة ({vehiclePlate}) لليوم. تم فتح صلاحية إصدار عقود النقل البري وكشف الركاب.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/captain"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
            >
              العودة للرئيسية
            </Link>
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
              <input
                type="text"
                required
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="ا ص ل 7223"
                className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
              />
            </div>
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
                  className="mt-0.5 w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500"
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
              className="w-full sm:w-auto justify-center px-7 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <ClipboardCheck className="w-4 h-4" />
              {isSubmitting ? "جاري اعتماد وتوثيق الفحص..." : "اعتماد وتوثيق الفحص اليومي"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
