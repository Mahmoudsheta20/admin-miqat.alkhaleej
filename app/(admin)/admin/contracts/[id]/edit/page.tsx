"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Save,
  Sparkles,
  Eye,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Calendar,
  Car,
  Trash2,
  Download,
} from "lucide-react";
import { getCaptains } from "@/app/_actions/captain";
import { getVehicles } from "@/app/_actions/fleet";
import { getContractById, updateContract, deleteContract } from "@/app/_actions/contract";
import { Contract, Vehicle } from "@/lib/types";
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
import ConfirmDialog from "@/app/_components/ConfirmDialog";
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

const OPERATION_TYPES = [
  "توصيل واستقبال مطار",
  "جولة سياحية وزيارات",
  "نقل بين المدن",
  "خدمات الحج والعمرة",
];

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
    title: "الفحص الخارجي وهيكل المركبة",
    items: [
      { key: "tires", label: "الإطارات والضغط" },
      { key: "headlights", label: "الأنوار الأمامية والخلفية" },
      { key: "signals", label: "إشارات الطوارئ" },
      { key: "mirrors", label: "الزجاج والمرايا" },
      { key: "noLeaks", label: "خلو التسريبات" },
    ],
  },
  {
    title: "أدوات ومعدات السلامة الإلزامية",
    items: [
      { key: "fireExtinguisher", label: "طفاية الحريق" },
      { key: "warningTriangle", label: "مثلث الطوارئ" },
      { key: "firstAidKit", label: "حقيبة الإسعافات" },
      { key: "glassHammer", label: "مطرقة الزجاج" },
      { key: "seatBelts", label: "أحزمة الأمان" },
    ],
  },
];

function mapOperationToLabel(type: string): string {
  switch (type) {
    case "AIRPORT_TRANSFER":
      return "توصيل واستقبال مطار";
    case "CITY_TOUR":
      return "جولة سياحية وزيارات";
    case "INTERCITY":
      return "نقل بين المدن";
    case "HAJJ_UMRAH":
      return "خدمات الحج والعمرة";
    default:
      return type || "توصيل واستقبال مطار";
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditContractPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  // Loading & State
  const [contract, setContract] = useState<Contract | null>(null);
  const [captains, setCaptains] = useState<CaptainWithMeta[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteContract = async () => {
    if (!contract) return;
    setIsDeleting(true);
    try {
      const res = await deleteContract(contract.id);
      setIsDeleting(false);
      if (res.success) {
        setIsDeleteDialogOpen(false);
        router.push("/admin/contracts");
      } else {
        alert(res.error || "فشل حذف العقد");
      }
    } catch (err) {
      setIsDeleting(false);
      console.error("Delete contract error:", err);
      alert("حدث خطأ أثناء محاولة حذف العقد");
    }
  };

  const todayStr = getSaudiTodayDateStr();
  const timeNow = getSaudiCurrentTimeStr();

  // Vehicle Inspection State
  const [inspectionDate, setInspectionDate] = useState(() => todayStr);
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
  const [driverDeclared, setDriverDeclared] = useState(true);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [showDetailedChecks, setShowDetailedChecks] = useState(true);

  const passedChecksCount = Object.values(checks).filter(Boolean).length;

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
      origin: "",
      destination: "",
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

  // Load contract, captains & vehicles
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [contractRes, capsRes, vehsRes] = await Promise.all([
          getContractById(id),
          getCaptains(),
          getVehicles(),
        ]);

        if (!isMounted) return;

        if (vehsRes.success && vehsRes.vehicles) {
          setVehicles(vehsRes.vehicles);
        }

        if (capsRes.success && capsRes.captains) {
          const mapped: CaptainWithMeta[] = capsRes.captains.map((c) => ({
            ...c,
            contractCount: c.contractCount || 0,
            hasTodayInspection: c.hasTodayInspection || false,
          }));
          setCaptains(mapped);
        }

        if (contractRes.success && contractRes.contract) {
          const c = contractRes.contract;
          setContract(c);

          const rawPassengers =
            c.passengers && c.passengers.length > 0
              ? c.passengers.map((p) => ({
                  name: p.name || "",
                  nationality: p.nationality || "",
                  idNumber: p.idNumber || "",
                }))
              : [{ name: "", nationality: "", idNumber: "" }];

          reset({
            operationType: mapOperationToLabel(c.operationType),
            customerName: c.customerName || "",
            customerPhone: c.customerPhone || "",
            origin: c.origin || "",
            destination: c.destination || "",
            tripDate: c.tripDate || todayStr,
            tripTime: c.tripTime || timeNow,
            issueDateMode: c.issueDate ? "MANUAL" : "AUTO",
            issueDate: c.issueDate || todayStr,
            flightCarrier: c.flightCarrier || "الخطوط السعودية",
            flightNumber: c.flightNumber || "",
            captainId: c.captainId || "",
            vehiclePlate: c.vehiclePlate || "",
            notes: c.notes || "",
            passengers: rawPassengers,
          });

          if (c.inspection) {
            const insp = c.inspection;
            if (insp.inspectionDate) {
              const dStr =
                typeof insp.inspectionDate === "string"
                  ? insp.inspectionDate.split("T")[0]
                  : new Date(insp.inspectionDate).toISOString().split("T")[0];
              setInspectionDate(dStr);
            }
            setChecks({
              fuelGauge: insp.fuelGauge ?? true,
              tempGauge: insp.tempGauge ?? true,
              oilPressure: insp.oilPressure ?? true,
              checkEngine: insp.checkEngine ?? true,
              absLight: insp.absLight ?? true,
              warningLights: insp.warningLights ?? true,
              tires: insp.tires ?? true,
              headlights: insp.headlights ?? true,
              signals: insp.signals ?? true,
              mirrors: insp.mirrors ?? true,
              noLeaks: insp.noLeaks ?? true,
              fireExtinguisher: insp.fireExtinguisher ?? true,
              warningTriangle: insp.warningTriangle ?? true,
              firstAidKit: insp.firstAidKit ?? true,
              glassHammer: insp.glassHammer ?? true,
              seatBelts: insp.seatBelts ?? true,
            });
            setDriverDeclared(insp.driverDeclared ?? true);
            setInspectionNotes(insp.notes || "");
          }
        } else {
          setServerError(contractRes.error || "لم يتم العثور على العقد المطلوب");
        }
      } catch (err) {
        console.error("Failed to load contract:", err);
        setServerError("حدث خطأ أثناء تحميل بيانات العقد");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, reset, todayStr, timeNow]);

  // Form Submission
  const onFormSubmit = async (data: AdminContractFormValues) => {
    try {
      setIsSubmitting(true);
      setServerError("");
      setSuccessMessage("");

      const payload = sanitizeContractPayload(data, contract?.inspectionId);
      payload.inspectionData = {
        inspectionDate,
        ...checks,
        driverDeclared,
        notes: inspectionNotes || null,
      };
      const res = await updateContract(id, payload);

      setIsSubmitting(false);

      if (res.success && res.contract) {
        setContract(res.contract);
        if (res.contract.inspection) {
          const insp = res.contract.inspection;
          if (insp.inspectionDate) {
            const dStr =
              typeof insp.inspectionDate === "string"
                ? insp.inspectionDate.split("T")[0]
                : new Date(insp.inspectionDate).toISOString().split("T")[0];
            setInspectionDate(dStr);
          }
          setChecks({
            fuelGauge: insp.fuelGauge ?? true,
            tempGauge: insp.tempGauge ?? true,
            oilPressure: insp.oilPressure ?? true,
            checkEngine: insp.checkEngine ?? true,
            absLight: insp.absLight ?? true,
            warningLights: insp.warningLights ?? true,
            tires: insp.tires ?? true,
            headlights: insp.headlights ?? true,
            signals: insp.signals ?? true,
            mirrors: insp.mirrors ?? true,
            noLeaks: insp.noLeaks ?? true,
            fireExtinguisher: insp.fireExtinguisher ?? true,
            warningTriangle: insp.warningTriangle ?? true,
            firstAidKit: insp.firstAidKit ?? true,
            glassHammer: insp.glassHammer ?? true,
            seatBelts: insp.seatBelts ?? true,
          });
          setDriverDeclared(insp.driverDeclared ?? true);
          setInspectionNotes(insp.notes || "");
        }
        setSuccessMessage("تم حفظ وتحديث بيانات العقد والوثيقة الرسمية بنجاح!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setServerError(res.error || "فشل تحديث العقد");
      }
    } catch (err) {
      setIsSubmitting(false);
      setServerError("حدث خطأ غير متوقع أثناء معالجة التحديث");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            جاري تحميل بيانات العقد والأسطول...
          </p>
        </div>
      </div>
    );
  }

  if (!contract && serverError) {
    return (
      <div className="max-w-2xl mx-auto p-8 my-12 text-center theme-card rounded-3xl border theme-border space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {serverError}
        </h2>
        <p className="text-xs text-slate-400">
          تأكد من صحة رقم العقد أو المعرف المطلوب، أو عد إلى سجل العقود.
        </p>
        <Link
          href="/admin/contracts"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى سجل العقود</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link
              href="/admin/contracts"
              className="hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              سجل العقود
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {contract?.referenceNumber}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-amber-600 dark:text-amber-400">تعديل</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>تعديل العقد الرسمي</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 text-lg">
                  {contract?.referenceNumber}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تحديث بيانات الرحلة، الركاب، والتوجيه التشغيلي مع إعادة توليد الـ PDF تلقائياً
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/contracts/pdf?contractId=${id}&download=1`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-600 transition"
            title="توليد وتحميل وثيقة الـ PDF الرسمية مباشرة من السيرفر"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span>تنزيل من السيرفر</span>
          </a>
          <button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
          >
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>معاينة العقد</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card hover:border-rose-500 hover:bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 transition"
            title="حذف هذا العقد نهائياً"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف العقد</span>
          </button>
          <Link
            href="/admin/contracts"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border theme-card hover:border-slate-400 text-xs font-bold text-slate-600 dark:text-slate-400 transition"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للقائمة</span>
          </Link>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            <button
              onClick={() => setIsPdfOpen(true)}
              className="px-3 py-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة العقد المحدث</span>
            </button>
            <Link
              href="/admin/contracts"
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-slate-100"
            >
              سجل العقود
            </Link>
          </div>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Section 1: Operation & Client Info */}
        <div className="theme-card rounded-3xl border theme-border p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b theme-border pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  بيانات العملية والعميل (الطرف الثاني)
                </h2>
                <p className="text-[11px] text-slate-400">
                  نوع الخدمة التشغيلية واسم الضيف ورقم التواصل
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              مرجع: {contract?.referenceNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Operation Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع العملية التشغيلية <span className="text-rose-500">*</span>
              </label>
              <select
                {...register("operationType")}
                className="w-full bg-slate-50 dark:bg-slate-900/80 border theme-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500 transition"
              >
                {OPERATION_TYPES.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Name */}
            <CustomInput
              label="اسم العميل / الضيف الأساسي"
              required
              placeholder="مثال: محمد عبد الله"
              {...register("customerName")}
              error={errors.customerName?.message}
            />

            {/* Customer Phone */}
            <CustomInput
              label="رقم هاتف العميل (اختياري)"
              placeholder="مثال: 0501234567"
              dir="ltr"
              {...register("customerPhone")}
              error={errors.customerPhone?.message}
            />
          </div>
        </div>

        {/* Section 2: Route, Schedule & Release Date */}
        <div className="theme-card rounded-3xl border theme-border p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b theme-border pb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                مسار الرحلة والجدول الزمني وتاريخ الإصدار
              </h2>
              <p className="text-[11px] text-slate-400">
                محطات الانطلاق والوصول، موعد الرحلة، وتاريخ إصدار العقد
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Origin */}
            <CustomInput
              label="نقطة / محطة الانطلاق"
              required
              placeholder="مثال: مكة المكرمة"
              {...register("origin")}
              error={errors.origin?.message}
            />

            {/* Destination */}
            <CustomInput
              label="محطة / وجهة الوصول"
              required
              placeholder="مثال: مطار الملك عبد العزيز بجدة"
              {...register("destination")}
              error={errors.destination?.message}
            />

            {/* Trip Date Picker */}
            <Controller
              control={control}
              name="tripDate"
              render={({ field, fieldState }) => (
                <CustomDatePicker
                  label="تاريخ الرحلة"
                  required
                  value={field.value || todayStr}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Trip Time Picker */}
            <Controller
              control={control}
              name="tripTime"
              render={({ field, fieldState }) => (
                <CustomTimePicker
                  label="وقت وتوقيت الرحلة"
                  required
                  value={field.value || timeNow}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Flight Carrier */}
            <CustomInput
              label="الناقل الجوي (لخدمات المطار)"
              placeholder="مثال: الخطوط السعودية"
              {...register("flightCarrier")}
              error={errors.flightCarrier?.message}
            />

            {/* Flight Number */}
            <CustomInput
              label="رقم الرحلة الجوية"
              placeholder="مثال: SV841"
              dir="ltr"
              {...register("flightNumber")}
              error={errors.flightNumber?.message}
            />

            {/* Release Date (تاريخ الإصدار) Mode Toggle & Picker */}
            <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border theme-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    تاريخ إصدار العقد (Release Date في الترويسة)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    يمكن إبقاء تاريخ اليوم الفعلي أو تحديد تاريخ مخصص لوثيقة العقد الرسمية
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border theme-border self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setValue("issueDateMode", "AUTO", { shouldDirty: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      issueDateMode === "AUTO"
                        ? "gold-gradient-btn text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    اليوم (تلقائي)
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("issueDateMode", "MANUAL", { shouldDirty: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      issueDateMode === "MANUAL"
                        ? "gold-gradient-btn text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    يدوي (تاريخ مخصص)
                  </button>
                </div>
              </div>

              {issueDateMode === "AUTO" ? (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t theme-border text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    تاريخ الإصدار المعتمد في ترويسة العقد:
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {formatOfficialDate(todayStr)} (تاريخ اليوم الفعلي بتوقيت المملكة)
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t theme-border">
                  <div className="w-full sm:w-64">
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
                      سيظهر هذا التاريخ في وثيقة الـ PDF تحت "تاريخ الإصدار"، مع الحفاظ على تاريخ الإنشاء الأصلي في قاعدة البيانات.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <CustomTextarea
                label="ملاحظات وتوجيهات خاصة بالعقد"
                placeholder="أي شروط إضافية، تعليمات الكابتن، أو متطلبات خاصة بالرحلة..."
                rows={2}
                {...register("notes")}
                error={errors.notes?.message}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Captain & Vehicle Assignment */}
        <div className="theme-card rounded-3xl border theme-border p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b theme-border pb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                تعيين الكابتن والمركبة
              </h2>
              <p className="text-[11px] text-slate-400">
                اختيار الكابتن المعتمد وتحديد لوحة المركبة المنفذة للرحلة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    captainPlate={captains.find((c) => c.id === selectedCaptainId)?.assignedVehiclePlate}
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

        {/* Section 4: Passenger Manifest Manager */}
        <div className="theme-card rounded-3xl border theme-border p-5 sm:p-6 space-y-5">
          <PassengerManifestManager control={control} register={register} errors={errors} />
        </div>

        {/* Section 5: Vehicle Inspection & Operational Declaration */}
        <div className="theme-card rounded-3xl border theme-border p-5 sm:p-6 space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    الفحص الفني والإقرار التشغيلي للمركبة
                  </h2>
                  {(contract?.inspection?.id || contract?.inspectionId) && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border theme-border">
                      #{((contract.inspection?.id || contract.inspectionId) as string).slice(0, 8)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تعديل واعتماد بنود الفحص الفني، تاريخ الفحص، والملاحظات التشغيلية التي تظهر في وثيقة العقد الرسمية
                </p>
              </div>
            </div>

            {/* Compliance Badge & Quick Select Button */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                  passedChecksCount === 16
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{passedChecksCount} من 16 بند سليم</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  const allPassed = Object.keys(checks).reduce(
                    (acc, k) => ({ ...acc, [k]: true }),
                    {}
                  );
                  setChecks(allPassed);
                }}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border theme-border cursor-pointer"
                title="تحديد كافة البنود الـ 16 كسليمة ومطابقة"
              >
                تحديد الكل سليم (100%)
              </button>
            </div>
          </div>

          {/* Date Picker & Vehicle Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end bg-slate-50/60 dark:bg-slate-900/40 p-4 rounded-2xl border theme-border">
            <div>
              <CustomDatePicker
                label="تاريخ الفحص التشغيلي المعتمد"
                required
                value={inspectionDate}
                onChange={setInspectionDate}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  لوحة المركبة المفحوصة:{" "}
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {selectedVehiclePlate || "غير محددة"}
                  </span>
                </p>
                <p>
                  يتم توثيق بنود الفحص في الصفحة الثالثة من وثيقة عقد التشغيل الرسمية.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailedChecks(!showDetailedChecks)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border theme-border bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer self-stretch sm:self-auto justify-center"
              >
                {showDetailedChecks ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-amber-500" />
                    <span>طي بنود الفحص</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-amber-500" />
                    <span>تعديل بنود الفحص (16 بنداً)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed 16 Checklist Items */}
          {showDetailedChecks && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {INSPECTION_CATEGORIES.map((category) => (
                  <div
                    key={category.title}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border theme-border space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b theme-border pb-2">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {category.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {category.items.filter((it) => checks[it.key]).length}/{category.items.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {category.items.map((item) => {
                        const isPassed = checks[item.key] ?? true;
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition ${
                              isPassed
                                ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-slate-800 dark:text-slate-200"
                                : "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isPassed}
                                onChange={(e) =>
                                  setChecks((prev) => ({
                                    ...prev,
                                    [item.key]: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                              />
                              <span>{item.label}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                isPassed
                                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                  : "text-rose-700 dark:text-rose-400 bg-rose-500/10"
                              }`}
                            >
                              {isPassed ? "سليم" : "غير سليم"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operational Notes */}
          <div>
            <CustomTextarea
              label="ملاحظات الفاحص التشغيلية (المسجلة في صفحة الفحص بالعقد)"
              placeholder="مثال: تم فحص المركبة والتأكد من مطابقتها لكافة معايير السلامة التشغيلية المعتمدة..."
              rows={2}
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              hint="تظهر هذه الملاحظات في خانة ملاحظات الفاحص في الصفحة الثالثة من ملف الـ PDF الرسمي"
            />
          </div>

          {/* Driver Declaration Checkbox */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border theme-border cursor-pointer hover:border-amber-500/50 transition">
            <input
              type="checkbox"
              checked={driverDeclared}
              onChange={(e) => setDriverDeclared(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 mt-0.5 cursor-pointer shrink-0"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                إقرار وتأكيد الفحص التشغيلي المعتمد للعقد
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                أقر وأؤكد بأن الفحص الفني للمركبة معتمد ومكتمل وفق الشروط والمعايير المحددة أعلاه، والمركبة جاهزة تماماً للتشغيل لنقل الركاب.
              </p>
            </div>
          </label>
        </div>

        {/* Bottom Submission Bar */}
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border theme-border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              عند حفظ التعديلات، سيتم تحديث قاعدة البيانات وإعادة إنشاء وثيقة الـ PDF الرسمية فوراً.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف العقد</span>
            </button>
            <Link
              href="/admin/contracts"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border theme-card hover:border-slate-400 text-xs font-bold text-slate-700 dark:text-slate-300 transition text-center"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري حفظ التعديلات والـ PDF...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات وتحديث العقد</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* PDF Preview Modal */}
      {isPdfOpen && contract && (
        <PdfPreviewModal
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          contractId={contract.id}
          referenceNumber={contract.referenceNumber}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="تأكيد حذف العقد"
        message={
          contract
            ? `هل أنت متأكد من رغبتك في حذف العقد رقم (${contract.referenceNumber}) نهائياً؟ سيتم حذف بيانات الركاب وملف الـ PDF المرتبط به ولا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel={isDeleting ? "جاري الحذف..." : "نعم، احذف العقد"}
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDeleteContract}
        onCancel={() => {
          if (!isDeleting) setIsDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}
