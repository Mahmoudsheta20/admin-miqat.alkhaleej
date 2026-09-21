"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FilePlus2,
  Plane,
  MapPin,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldAlert,
  Car,
  User,
  Phone,
  RotateCcw,
  Briefcase,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
  Edit3,
} from "lucide-react";
import { getCaptains } from "@/app/_actions/captain";
import { getVehicles } from "@/app/_actions/fleet";
import { submitContract } from "@/app/_actions/contract";
import { getTodayInspection, submitInspection } from "@/app/_actions/inspection";
import { Vehicle, VehicleInspection } from "@/lib/types";
import {
  adminContractSchema,
  AdminContractFormValues,
  sanitizeContractPayload,
} from "@/lib/validations/contract";
import {
  getSaudiTodayDateStr,
  getSaudiCurrentTimeStr,
  formatOfficialDate,
} from "@/lib/contractConstants";
import PdfPreviewModal from "@/app/_components/PdfPreviewModal";
import { CustomInput } from "@/app/_components/form/CustomInput";
import { CustomTextarea } from "@/app/_components/form/CustomTextarea";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { CustomTimePicker } from "@/app/_components/form/CustomTimePicker";
import {
  CaptainSelector,
  CaptainWithMeta,
} from "@/app/_components/form/CaptainSelector";
import { VehicleSelector } from "@/app/_components/form/VehicleSelector";
import { PassengerManifestManager } from "@/app/_components/form/PassengerManifestManager";

const INSPECTION_CATEGORIES = [
  {
    title: "لوحة العدادات والتنبيهات",
    items: [
      { key: "fuelGauge", label: "مؤشر الوقود" },
      { key: "tempGauge", label: "مؤشر الحرارة" },
      { key: "oilPressure", label: "ضغط الزيت" },
      { key: "checkEngine", label: "فحص المحرك" },
      { key: "absLight", label: "فرامل ABS" },
      { key: "warningLights", label: "لمبات التحذير" },
    ],
  },
  {
    title: "الفحص الخارجي والمركبة",
    items: [
      { key: "tires", label: "الإطارات والضغط" },
      { key: "headlights", label: "الأنوار الأمامية والخلفية" },
      { key: "signals", label: "إشارات الطوارئ" },
      { key: "mirrors", label: "الزجاج والمرايا" },
      { key: "noLeaks", label: "خلو التسريبات" },
    ],
  },
  {
    title: "معدات السلامة والطوارئ",
    items: [
      { key: "fireExtinguisher", label: "طفاية الحريق" },
      { key: "warningTriangle", label: "مثلث الطوارئ" },
      { key: "firstAidKit", label: "حقيبة الإسعافات" },
      { key: "glassHammer", label: "مطرقة الزجاج" },
      { key: "seatBelts", label: "أحزمة الأمان" },
    ],
  },
];

export default function AdminContractBuilderPage() {
  const [captains, setCaptains] = useState<CaptainWithMeta[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingCaptains, setIsLoadingCaptains] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [createdContract, setCreatedContract] = useState<{
    id: string;
    referenceNumber: string;
  } | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // Captain & Admin Inspection States
  const [captainInspection, setCaptainInspection] = useState<VehicleInspection | null>(null);
  const [checkedCaptainId, setCheckedCaptainId] = useState<string | null>(null);
  const [adminInspectionId, setAdminInspectionId] = useState<string | null>(null);
  const [isSubmittingAdminInspection, setIsSubmittingAdminInspection] = useState(false);
  const [adminInspectionSuccessMsg, setAdminInspectionSuccessMsg] = useState("");
  const [showDetailedChecks, setShowDetailedChecks] = useState(false);
  const [adminInspectionMode, setAdminInspectionMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [adminInspectionDate, setAdminInspectionDate] = useState(() => getSaudiTodayDateStr());

  // 16 technical check items (all default to true = 100% compliant)
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

  const todayStr = getSaudiTodayDateStr();
  const timeNow = getSaudiCurrentTimeStr();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdminContractFormValues>({
    resolver: zodResolver(adminContractSchema),
    defaultValues: {
      operationType: "توصيل واستقبال مطار",
      customerName: "",
      customerPhone: "",
      origin: "مكة المكرمة",
      destination: "مطار الملك عبد العزيز بجدة",
      tripDate: todayStr,
      tripTime: timeNow,
      issueDateMode: "AUTO",
      issueDate: todayStr,
      flightCarrier: "الخطوط السعودية",
      flightNumber: "",
      captainId: "",
      vehiclePlate: "",
      notes: "",
      passengers: [{ name: "", nationality: "", idNumber: "" }],
    },
  });

  const selectedCaptainId = useWatch({ control, name: "captainId" });
  const selectedVehiclePlate = useWatch({ control, name: "vehiclePlate" });
  const issueDateMode = useWatch({ control, name: "issueDateMode" }) || "AUTO";
  const currentCaptain = captains.find((c) => c.id === selectedCaptainId);

  const isCheckingInspection = Boolean(selectedCaptainId && checkedCaptainId !== selectedCaptainId);
  const effectiveCaptainInspection =
    selectedCaptainId && captainInspection?.captainId === selectedCaptainId ? captainInspection : null;

  // Check today's inspection status whenever selected captain changes
  useEffect(() => {
    let isCurrent = true;

    if (selectedCaptainId) {
      getTodayInspection(selectedCaptainId).then((res) => {
        if (!isCurrent) return;
        setCheckedCaptainId(selectedCaptainId);
        setAdminInspectionId(null);
        setAdminInspectionSuccessMsg("");

        if (res.success && res.inspection) {
          setCaptainInspection(res.inspection);
          setValue("inspectionId", res.inspection.id);
        } else {
          setCaptainInspection(null);
          setValue("inspectionId", undefined);
        }
      });
    }

    return () => {
      isCurrent = false;
    };
  }, [selectedCaptainId, setValue]);

  // Fetch registered captains and fleet vehicles in parallel
  useEffect(() => {
    Promise.all([getCaptains(), getVehicles()]).then(([capRes, vehRes]) => {
      let loadedCaptains: CaptainWithMeta[] = [];
      let loadedVehicles: Vehicle[] = [];

      if (capRes.success && capRes.captains) {
        loadedCaptains = capRes.captains;
        setCaptains(capRes.captains);
      }
      if (vehRes.success && vehRes.vehicles) {
        loadedVehicles = vehRes.vehicles;
        setVehicles(vehRes.vehicles);
      }

      if (loadedCaptains.length > 0) {
        const firstCap = loadedCaptains[0];
        setValue("captainId", firstCap.id);
        if (firstCap.assignedVehiclePlate) {
          setValue("vehiclePlate", firstCap.assignedVehiclePlate);
        } else if (loadedVehicles.length > 0) {
          setValue("vehiclePlate", loadedVehicles[0].plateNumberAr);
        }
      } else if (loadedVehicles.length > 0) {
        setValue("vehiclePlate", loadedVehicles[0].plateNumberAr);
      }

      setIsLoadingCaptains(false);
    });
  }, [setValue]);

  // Explicitly Send & Document Inspection from Admin
  const handleSendAdminInspection = async () => {
    if (!selectedCaptainId) {
      setConfirmError("يجب اختيار كابتن للرحلة أولاً قبل توثيق الفحص التشغيلي");
      return;
    }

    setIsSubmittingAdminInspection(true);
    setConfirmError("");
    setAdminInspectionSuccessMsg("");

    try {
      const plate =
        selectedVehiclePlate ||
        currentCaptain?.assignedVehiclePlate ||
        (vehicles.length > 0 ? vehicles[0].plateNumberAr : "ا ص ل 7223");

      const nowTime = getSaudiCurrentTimeStr();
      const effectiveInspectionDate =
        adminInspectionMode === "MANUAL"
          ? `${adminInspectionDate.replace(/\//g, "-")}T${nowTime}:00`
          : new Date().toISOString();

      const res = await submitInspection({
        captainId: selectedCaptainId,
        vehiclePlate: plate,
        fuelGauge: checks.fuelGauge ?? true,
        tempGauge: checks.tempGauge ?? true,
        oilPressure: checks.oilPressure ?? true,
        checkEngine: checks.checkEngine ?? true,
        absLight: checks.absLight ?? true,
        warningLights: checks.warningLights ?? true,
        tires: checks.tires ?? true,
        headlights: checks.headlights ?? true,
        signals: checks.signals ?? true,
        mirrors: checks.mirrors ?? true,
        noLeaks: checks.noLeaks ?? true,
        fireExtinguisher: checks.fireExtinguisher ?? true,
        warningTriangle: checks.warningTriangle ?? true,
        firstAidKit: checks.firstAidKit ?? true,
        glassHammer: checks.glassHammer ?? true,
        seatBelts: checks.seatBelts ?? true,
        driverDeclared: true,
        notes: "تم الفحص والاعتماد التشغيلي رسمياً من قبل إدارة العمليات",
        inspectionDate: effectiveInspectionDate,
      });

      if (res.success && res.inspection) {
        setAdminInspectionId(res.inspection.id);
        setValue("inspectionId", res.inspection.id);
        setIsConfirmed(true);
        const displayDate =
          adminInspectionMode === "MANUAL"
            ? adminInspectionDate
            : new Date().toLocaleDateString("en-GB");
        setAdminInspectionSuccessMsg(
          `تم إرسال وتوثيق الفحص التشغيلي بنجاح (كود الفحص #${res.inspection.id.slice(0, 8)}) بتاريخ ${displayDate} وتم اعتماده للرحلة`
        );
      } else {
        setConfirmError(res.error || "تعذر إرسال الفحص التشغيلي");
      }
    } catch (err) {
      console.error("Admin inspection error:", err);
      setConfirmError("حدث خطأ غير متوقع أثناء إرسال الفحص التشغيلي");
    } finally {
      setIsSubmittingAdminInspection(false);
    }
  };

  // Handle Form Submission
  const onFormSubmit = async (data: AdminContractFormValues) => {
    if (!isConfirmed) {
      setConfirmError("يجب إتمام وتأكيد الفحص التشغيلي أدناه قبل إنشاء وتوثيق العقد");
      return;
    }

    setConfirmError("");
    setIsSubmitting(true);
    setServerError("");

    try {
      let resolvedInspectionId: string | null = null;
      if (adminInspectionMode === "AUTO") {
        resolvedInspectionId = effectiveCaptainInspection?.id || adminInspectionId || null;
      } else {
        resolvedInspectionId = adminInspectionId || null;
      }

      // If no resolved inspection ID yet, create and document it now based on mode!
      if (!resolvedInspectionId) {
        const plate =
          data.vehiclePlate ||
          currentCaptain?.assignedVehiclePlate ||
          (vehicles.length > 0 ? vehicles[0].plateNumberAr : "ا ص ل 7223");

        const inspRes = await submitInspection({
          captainId: data.captainId,
          vehiclePlate: plate,
          fuelGauge: checks.fuelGauge ?? true,
          tempGauge: checks.tempGauge ?? true,
          oilPressure: checks.oilPressure ?? true,
          checkEngine: checks.checkEngine ?? true,
          absLight: checks.absLight ?? true,
          warningLights: checks.warningLights ?? true,
          tires: checks.tires ?? true,
          headlights: checks.headlights ?? true,
          signals: checks.signals ?? true,
          mirrors: checks.mirrors ?? true,
          noLeaks: checks.noLeaks ?? true,
          fireExtinguisher: checks.fireExtinguisher ?? true,
          warningTriangle: checks.warningTriangle ?? true,
          firstAidKit: checks.firstAidKit ?? true,
          glassHammer: checks.glassHammer ?? true,
          seatBelts: checks.seatBelts ?? true,
          driverDeclared: true,
          notes: "تم الفحص والاعتماد التشغيلي رسمياً من قبل إدارة العمليات عند توثيق العقد",
          inspectionDate:
            adminInspectionMode === "MANUAL"
              ? `${adminInspectionDate.replace(/\//g, "-")}T${getSaudiCurrentTimeStr()}:00`
              : new Date().toISOString(),
        });

        if (inspRes.success && inspRes.inspection) {
          resolvedInspectionId = inspRes.inspection.id;
          setAdminInspectionId(inspRes.inspection.id);
        } else {
          // CRITICAL: Abort submission if inspection could not be documented!
          setIsSubmitting(false);
          setConfirmError(
            inspRes.error ||
              "تعذر توثيق الفحص التشغيلي الإلزامي. لا يمكن إنشاء وتوثيق أي عقد بدون فحص تشغيلي وإقرار معتمد."
          );
          return;
        }
      }

      // Final guard: Guarantee that an inspection ID is present
      if (!resolvedInspectionId) {
        setIsSubmitting(false);
        setConfirmError(
          "لا يمكن إنشاء وتوثيق أي عقد دون إتمام الفحص والإقرار التشغيلي الإلزامي (التحقق قبل التوثيق)."
        );
        return;
      }

      // 1. Clean and normalize payload with resolved inspection ID
      const payload = sanitizeContractPayload(data, resolvedInspectionId);

      // 2. Submit contract action
      const res = await submitContract(payload);
      setIsSubmitting(false);

      if (res.success && res.contract) {
        setCreatedContract({
          id: res.contract.id,
          referenceNumber: res.contract.referenceNumber,
        });
      } else {
        setServerError(res.error || "فشل إنشاء وتوثيق العقد الرسمي");
      }
    } catch (err) {
      setIsSubmitting(false);
      setServerError("حدث خطأ غير متوقع أثناء معالجة الطلب");
      console.error(err);
    }
  };

  const handleResetForm = () => {
    setCreatedContract(null);
    setIsConfirmed(false);
    setConfirmError("");
    setAdminInspectionId(null);
    setAdminInspectionSuccessMsg("");
    setAdminInspectionMode("AUTO");
    setShowDetailedChecks(false);
    const defaultCap = captains.length > 0 ? captains[0] : null;
    const defaultPlate =
      defaultCap?.assignedVehiclePlate ||
      (vehicles.length > 0 ? vehicles[0].plateNumberAr : "");

    reset({
      operationType: "توصيل واستقبال مطار",
      customerName: "",
      customerPhone: "",
      origin: "مكة المكرمة",
      destination: "مطار الملك عبد العزيز بجدة",
      tripDate: todayStr,
      tripTime: timeNow,
      issueDateMode: "AUTO",
      issueDate: todayStr,
      flightCarrier: "الخطوط السعودية",
      flightNumber: "",
      captainId: defaultCap ? defaultCap.id : "",
      vehiclePlate: defaultPlate,
      notes: "",
      passengers: [{ name: "", nationality: "", idNumber: "" }],
    });
  };

  if (isLoadingCaptains) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">جاري تحميل بيانات الأسطول والكباتن...</p>
        </div>
      </div>
    );
  }

  // Contract Success View
  if (createdContract) {
    return (
      <div className="theme-card rounded-3xl p-6 sm:p-10 border theme-border text-center space-y-5 max-w-xl mx-auto my-8 shadow-xl">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            تم توثيق العقد بنجاح!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تم تسجيل العقد وإسناده للكابتن وتوليد وثيقة الـ PDF المعتمدة
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-block font-mono font-black text-amber-600 dark:text-amber-400 text-xl tracking-wider">
          {createdContract.referenceNumber}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            معاينة وتحميل العقد (PDF)
          </button>

          <button
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إنشاء عقد إضافي آخر
          </button>
        </div>

        {isPdfOpen && (
          <PdfPreviewModal
            isOpen={isPdfOpen}
            onClose={() => setIsPdfOpen(false)}
            contractId={createdContract.id}
            referenceNumber={createdContract.referenceNumber}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/contracts"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="رجوع لقائمة العقود"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              إنشاء وتوثيق عقد نقل رسمي
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mr-9">
            إصدار عقود الرحلات الفورية وإسنادها للكباتن بصلاحيات الإدارة المباشرة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            صلاحيات الإدارة (تخطي الفحص)
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {serverError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Section 1: Captain & Vehicle Assignment */}
        <div className="theme-card p-5 sm:p-6 rounded-3xl border theme-border space-y-4">
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-500" />
              إسناد الرحلة والمركبة
            </h3>
            <span className="text-[11px] text-slate-400">
              اختر الكابتن المتاح للرحلة وسيتم ربط مركبته تلقائياً
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Custom Captain Selector */}
            <div>
              <Controller
                control={control}
                name="captainId"
                render={({ field, fieldState }) => (
                  <CaptainSelector
                    label="الكابتن المسؤول عن التنفيذ"
                    required
                    captains={captains}
                    selectedCaptainId={field.value}
                    onSelectCaptain={(cap) => {
                      field.onChange(cap.id);
                      if (cap.assignedVehiclePlate) {
                        setValue("vehiclePlate", cap.assignedVehiclePlate, {
                          shouldValidate: true,
                        });
                      } else if (vehicles.length > 0) {
                        setValue("vehiclePlate", vehicles[0].plateNumberAr, {
                          shouldValidate: true,
                        });
                      }
                    }}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>

            {/* Custom Vehicle Selector (Retrieved from registered Fleet) */}
            <div>
              <Controller
                control={control}
                name="vehiclePlate"
                render={({ field, fieldState }) => (
                  <VehicleSelector
                    label="المركبة المسندة للرحلة"
                    required
                    vehicles={vehicles}
                    selectedPlate={field.value}
                    captainPlate={currentCaptain?.assignedVehiclePlate}
                    onSelectVehicle={(veh) => {
                      field.onChange(veh.plateNumberAr);
                    }}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Trip & Client Details */}
        <div className="theme-card p-5 sm:p-6 rounded-3xl border theme-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                بيانات الرحلة والعميل الأساسي
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تحديد المسار والمواعيد وفق التذاكر أو الحجوزات
              </p>
            </div>

            {/* Quick Template Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold ml-1">قوالب العمليات:</span>
              {[
                "توصيل واستقبال مطار",
                "جولة سياحية",
                "نقل بين المدن",
                "نقل معتمرين وزوار",
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setValue("operationType", tag, { shouldValidate: true })
                  }
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-500/15 dark:bg-slate-800 dark:hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Operation Type - Clean and Simple Text Input */}
            <CustomInput
              label="نوع العملية التشغيلية"
              required
              icon={<Briefcase className="w-3.5 h-3.5 text-amber-500" />}
              placeholder="توصيل مطار، جولة سياحية، نقل بين المدن..."
              clearable
              onClear={() => setValue("operationType", "", { shouldValidate: true })}
              {...register("operationType")}
              error={errors.operationType?.message}
            />

            {/* Customer Name */}
            <CustomInput
              label="اسم الضيف الأساسي (الطرف الثاني)"
              required
              icon={<User className="w-3.5 h-3.5" />}
              placeholder="مثال: فهد بن عبد العزيز الحربي"
              {...register("customerName")}
              error={errors.customerName?.message}
            />

            {/* Customer Phone */}
            <CustomInput
              label="رقم جوال الضيف للتواصل"
              icon={<Phone className="w-3.5 h-3.5" />}
              placeholder="0551234567"
              dir="ltr"
              className="text-right font-mono"
              clearable
              onClear={() => setValue("customerPhone", "")}
              {...register("customerPhone")}
              error={errors.customerPhone?.message}
            />

            {/* Origin */}
            <CustomInput
              label="موقع الانطلاق (من)"
              required
              icon={<MapPin className="w-3.5 h-3.5 text-amber-500" />}
              placeholder="مكة المكرمة (فندق العنوان جبل عمر)"
              {...register("origin")}
              error={errors.origin?.message}
            />

            {/* Destination */}
            <CustomInput
              label="الجهة والوصول (إلى)"
              required
              icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />}
              placeholder="مطار الملك عبد العزيز بجدة (الصالة 1)"
              {...register("destination")}
              error={errors.destination?.message}
            />

            {/* Trip Date using CustomDatePicker */}
            <Controller
              control={control}
              name="tripDate"
              render={({ field, fieldState }) => (
                <CustomDatePicker
                  label="تاريخ الرحلة"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Trip Time using CustomTimePicker */}
            <Controller
              control={control}
              name="tripTime"
              render={({ field, fieldState }) => (
                <CustomTimePicker
                  label="وقت الرحلة"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Flight Carrier */}
            <CustomInput
              label="شركة الطيران (اختياري)"
              icon={<Plane className="w-3.5 h-3.5 text-blue-500" />}
              placeholder="الخطوط السعودية"
              {...register("flightCarrier")}
              error={errors.flightCarrier?.message}
            />

            {/* Flight Number */}
            <CustomInput
              label="رقم الرحلة الجوية (اختياري)"
              icon={<Plane className="w-3.5 h-3.5 text-blue-500" />}
              placeholder="SV841"
              dir="ltr"
              className="text-right font-mono"
              {...register("flightNumber")}
              error={errors.flightNumber?.message}
            />

            {/* Contract Release Date (تاريخ إصدار العقد المعتمد في الوثيقة) */}
            <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border theme-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      تاريخ إصدار العقد (Release Date في وثيقة PDF)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    اختر توثيق الإصدار بتاريخ اليوم الفعلي تلقائياً أو حدد تاريخاً مخصصاً (ويسجل النظام تاريخ التسجيل الفعلي في السجلات بدقة)
                  </p>
                </div>

                {/* Mode Selector Toggle */}
                <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border theme-border shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setValue("issueDateMode", "AUTO")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      issueDateMode === "AUTO"
                        ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>تلقائي (اليوم الفعلي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue("issueDateMode", "MANUAL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      issueDateMode === "MANUAL"
                        ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>يدوي (تاريخ مخصص)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Content based on issueDateMode */}
              {issueDateMode === "AUTO" ? (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t theme-border text-xs">
                  <span className="text-slate-500 dark:text-slate-400">تاريخ الإصدار المعتمد في ترويسة العقد:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {formatOfficialDate(todayStr)} (تاريخ اليوم الفعلي)
                  </span>
                  <span className="text-[11px] text-slate-400 mr-auto">
                    * يسجل النظام تاريخ ووقت الإنشاء الفعلي تلقائياً في السجلات
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t theme-border">
                  <div className="w-full sm:w-60">
                    <Controller
                      control={control}
                      name="issueDate"
                      render={({ field, fieldState }) => (
                        <CustomDatePicker
                          label="تاريخ الإصدار المعتمد في العقد"
                          required
                          value={field.value || todayStr}
                          onChange={field.onChange}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 sm:self-end h-11">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>
                      سيظهر هذا التاريخ في وثيقة الـ PDF تحت "تاريخ الإصدار"، بينما يحتفظ النظام بتاريخ ووقت التسجيل الفعلي في قاعدة البيانات.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Contract Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <CustomTextarea
                label="ملاحظات وتوجيهات خاصة بالعقد"
                placeholder="تعليمات الاستقبال VIP، نقطة التجمع، أو تفاصيل إضافية..."
                rows={2}
                maxLength={500}
                showCount
                {...register("notes")}
                error={errors.notes?.message}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Passenger Manifest List */}
        <PassengerManifestManager
          control={control}
          register={register}
          errors={errors}
        />

        {/* Section 4: Mandatory Operational & Technical Inspection Check */}
        <div
          className={`p-5 rounded-3xl border transition-all duration-200 space-y-4 ${
            isConfirmed
              ? "bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/10"
              : confirmError
              ? "bg-rose-500/5 border-rose-500/40"
              : "theme-card theme-border"
          }`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isConfirmed
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  الفحص والإقرار التشغيلي الإلزامي (التحقق قبل التوثيق)
                </h4>
                <p className="text-[11px] text-slate-400">
                  تأكيد رسمي بمطابقة الفحص الفني للمركبة وسلامة المسار والركاب
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isCheckingInspection ? (
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  جاري التحقق من الفحص...
                </span>
              ) : effectiveCaptainInspection ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم الفحص مسبقاً من الكابتن
                </span>
              ) : adminInspectionId ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم الاعتماد والإرسال من الإدارة
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  بانتظار الاعتماد التشغيلي
                </span>
              )}
            </div>
          </div>

          {/* Inspection Mode Toggle: Auto vs Manual (Always Visible in Section 4) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border theme-border">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                طريقة اعتماد وتوثيق الفحص التشغيلي:
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                اختر الاعتماد الآلي (فحص الكابتن اليومي أو اللحظة الحالية) أو التخصيص اليدوي للوقت والتاريخ
              </span>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-800 border theme-border shrink-0 self-start sm:self-center shadow-2xs">
              <button
                type="button"
                onClick={() => setAdminInspectionMode("AUTO")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminInspectionMode === "AUTO"
                    ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs border border-amber-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>تلقائي (فحص الكابتن / الآن)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminInspectionMode("MANUAL")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminInspectionMode === "MANUAL"
                    ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs border border-amber-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>يدوي (تحديد موعد مخصص)</span>
              </button>
            </div>
          </div>

          {/* Mode-dependent Content */}
          {adminInspectionMode === "AUTO" ? (
            effectiveCaptainInspection ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black block">
                      تم استلام واعتماد فحص المركبة اليومي تلقائياً من الكابتن ({currentCaptain?.name || "الكابتن"})
                    </span>
                    <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 block">
                      لوحة المركبة المفحوصة: <strong className="font-mono">{effectiveCaptainInspection.vehiclePlate}</strong> • تاريخ الفحص: <strong className="font-mono" dir="ltr">{new Date(effectiveCaptainInspection.inspectionDate).toLocaleDateString("en-GB")}</strong>
                    </span>
                  </div>
                </div>
                <span className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono">
                  كود الفحص #{effectiveCaptainInspection.id.slice(0, 8)}
                </span>
              </div>
            ) : adminInspectionId ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black block">
                      تم إرسال وتوثيق الفحص التشغيلي بنجاح من إدارة العمليات
                    </span>
                    <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 block">
                      تم اعتماد الفحص الفني لمركبة الكابتن {currentCaptain?.name} وربطه بالعقد رسمياً • تاريخ الفحص: <strong className="font-mono" dir="ltr">{new Date().toLocaleDateString("en-GB")}</strong>
                    </span>
                  </div>
                </div>
                <span className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono">
                  كود الفحص #{adminInspectionId.slice(0, 8)}
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black block">
                      الكابتن ({currentCaptain?.name || "المحدد"}) لم يرسل الفحص اليومي للمركبة لهذا اليوم
                    </span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 block mt-0.5">
                      في الوضع التلقائي، سيتم اعتماد وتوثيق الفحص التشغيلي باللحظة الحالية فوراً وربطه بالعقد، أو يمكنك توثيقه مسبقاً الآن:
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-500/20">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-amber-800 dark:text-amber-300 font-medium">موعد الفحص الآلي:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      الآن ({new Date().toLocaleDateString("en-GB")} • {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})
                    </span>
                    <span className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                      (تسجيل الفحص باللحظة الحالية فوراً)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendAdminInspection}
                    disabled={isSubmittingAdminInspection || !selectedCaptainId}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap cursor-pointer"
                    title="إرسال وتوثيق الفحص التشغيلي من الإدارة الآن"
                  >
                    {isSubmittingAdminInspection ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>جاري التوثيق...</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4" />
                        <span>توثيق الفحص الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          ) : (
            /* MANUAL MODE */
            <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 border theme-border space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    تخصيص تاريخ الفحص التشغيلي المعتمد (يدوي)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    حدد تاريخ الفحص التشغيلي الذي ترغب في اعتماده وربطه بمركبة الكابتن {currentCaptain?.name} في هذا العقد:
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t theme-border">
                <div className="flex-1 sm:max-w-xs">
                  <CustomDatePicker
                    label="تاريخ الفحص"
                    value={adminInspectionDate}
                    onChange={setAdminInspectionDate}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendAdminInspection}
                  disabled={isSubmittingAdminInspection || !selectedCaptainId}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap cursor-pointer sm:self-end"
                  title="اعتماد وتوثيق الفحص التشغيلي بالتاريخ المحدد"
                >
                  {isSubmittingAdminInspection ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>جاري التوثيق...</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      <span>توثيق الفحص المخصص</span>
                    </>
                  )}
                </button>
              </div>

              {adminInspectionId && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    تم توثيق الفحص التشغيلي برقم #{adminInspectionId.slice(0, 8)} بتاريخ: {adminInspectionDate}
                  </span>
                </div>
              )}
            </div>
          )}

          {adminInspectionSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{adminInspectionSuccessMsg}</span>
            </div>
          )}

          {/* High-level verification summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-slate-400"}`} />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">سلامة الإطارات والفرامل</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-slate-400"}`} />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">الأنوار وأجهزة الطوارئ</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-slate-400"}`} />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">مطابقة كشف الركاب</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-slate-400"}`} />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">جاهزية الكابتن المعتمد</span>
            </div>
          </div>

          {/* Toggle Detailed 16-check Inspection Drawer */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDetailedChecks(!showDetailedChecks)}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1.5 transition"
            >
              {showDetailedChecks ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>إخفاء تفاصيل بنود الفحص الفني (16 بنداً)</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>عرض وتخصيص بنود الفحص الفني (16 بنداً)</span>
                </>
              )}
            </button>

            {showDetailedChecks && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/70 border theme-border space-y-3">
                <div className="flex items-center justify-between border-b theme-border pb-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    بنود الفحص الفني المعتمدة وفق اشتراطات هيئة النقل
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allPassed = Object.keys(checks).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                      setChecks(allPassed);
                    }}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    تحديد الكل سليم (100%)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {INSPECTION_CATEGORIES.map((cat) => (
                    <div key={cat.title} className="space-y-1.5">
                      <span className="text-[11px] font-black text-slate-500 block mb-1">
                        {cat.title}
                      </span>
                      <div className="space-y-1">
                        {cat.items.map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border theme-border cursor-pointer hover:border-amber-500/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition"
                          >
                            <input
                              type="checkbox"
                              checked={checks[item.key] ?? true}
                              onChange={(e) =>
                                setChecks((prev) => ({
                                  ...prev,
                                  [item.key]: e.target.checked,
                                }))
                              }
                              className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Declaration Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border theme-border cursor-pointer hover:border-amber-500/60 transition shadow-2xs">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => {
                setIsConfirmed(e.target.checked);
                if (e.target.checked) setConfirmError("");
              }}
              className="w-5 h-5 rounded-md text-amber-600 focus:ring-amber-500 focus:ring-2 mt-0.5 cursor-pointer accent-amber-500 shrink-0"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-900 dark:text-white block leading-relaxed">
                أقر وأؤكد بأن الفحص الفني للمركبة معتمد ومكتمل، وكافة بيانات الرحلة والمسار والركاب مدخلة بدقة ومسؤولية تشغيلية كاملة.
              </span>
              <span className="text-[11px] text-slate-400 block">
                * في حال لم يكن الكابتن قد أرسل الفحص اليومي، سيتم توثيق الفحص التشغيلي المعتمد آلياً من إدارة العمليات وربطه بالعقد فوراً.
              </span>
            </div>
          </label>

          {confirmError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{confirmError}</span>
            </div>
          )}
        </div>

        {/* Form Bottom Submission Bar */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3">
          <Link
            href="/admin/contracts"
            className="w-full sm:w-auto text-center px-6 py-3.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            إلغاء والعودة
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !isConfirmed}
            className="w-full sm:w-auto justify-center px-9 py-3.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري معالجة وتوثيق العقد...</span>
              </>
            ) : (
              <>
                <FilePlus2 className="w-4 h-4" />
                <span>اعتماد وتوثيق العقد الرسمي (PDF)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
