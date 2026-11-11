"use client";
import { ContractGuestFields, ContractJourneyFields, ContractIssueDate } from "@/app/_components/form/ContractFields";
import InspectionChecklist from "@/app/_components/form/InspectionChecklist";
import { useUiText } from "@/lib/ui-text";

import dynamic from "next/dynamic";

import { useState, useEffect, use, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, MapPin, CheckCircle2, ArrowRight, AlertCircle, Save, Sparkles, Eye, ChevronRight, ChevronDown, ChevronUp, ClipboardCheck, Car, Trash2, ArrowLeftRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getCaptains } from "@/app/_actions/captain";
import { getVehicles } from "@/app/_actions/fleet";
import { getContractById, updateContract, deleteContract } from "@/app/_actions/contract";
import { Contract, Vehicle } from "@/lib/types";
import { adminContractSchema, AdminContractFormValues, sanitizeContractPayload } from "@/lib/validations/contract";
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";
import { getSaudiTodayDateStr, getSaudiCurrentTimeStr } from "@/lib/contractConstants";
const PdfPreviewModal = dynamic(() => import("@/app/_components/PdfPreviewModal"), { ssr: false });
import ReverseTripModal from "@/app/_components/ReverseTripModal";
import ConfirmDialog from "@/app/_components/ConfirmDialog";

import { CustomTextarea } from "@/app/_components/form/CustomTextarea";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";

import { CaptainSelector, CaptainWithMeta } from "@/app/_components/form/CaptainSelector";
import { VehicleSelector } from "@/app/_components/form/VehicleSelector";
import { PassengerManifestManager } from "@/app/_components/form/PassengerManifestManager";

const OPERATION_TYPES = [
  "توصيل واستقبال مطار",
  "جولة سياحية وزيارات",
  "نقل بين المدن",
  "خدمات الحج والعمرة",
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
  const ui = useUiText();
  const operationTypeId = useId();

  const { id } = use(params);
  const router = useRouter();

  // Loading & State
  const [contract, setContract] = useState<Contract | null>(null);
  const [captains, setCaptains] = useState<CaptainWithMeta[]>(() => {
    const cached = getCachedData<Awaited<ReturnType<typeof getCaptains>>>("captains_list");
    if (Array.isArray(cached)) return cached;
    if (cached && typeof cached === "object" && Array.isArray(cached.captains)) {
      return cached.captains.map((c) => ({
        ...c,
        contractCount: c.contractCount || 0,
        hasTodayInspection: c.hasTodayInspection || false,
      }));
    }
    return [];
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const cached = getCachedData<Awaited<ReturnType<typeof getVehicles>>>("fleet_vehicles");
    if (Array.isArray(cached)) return cached;
    if (cached && typeof cached === "object" && Array.isArray(cached.vehicles)) {
      return cached.vehicles;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isReverseOpen, setIsReverseOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteContract = async () => {
    if (!contract) return;
    setIsDeleting(true);
    try {
      const res = await deleteContract(contract.id);
      if (res.success) {
        invalidateClientCache("contracts_");
        invalidateClientCache("dashboard_stats");
        invalidateClientCache("inspections_");
        invalidateClientCache("captains_list");
        setIsDeleteDialogOpen(false);
        router.push("/admin/contracts");
      } else {
        throw new Error(res.error || "فشل حذف العقد");
      }
    } catch (err) {
      console.error("Delete contract error:", err);
      throw err instanceof Error ? err : new Error("حدث خطأ أثناء محاولة حذف العقد");
    } finally {
      setIsDeleting(false);
    }
  };

  const [todayStr] = useState(getSaudiTodayDateStr);
  const [timeNow] = useState(getSaudiCurrentTimeStr);

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
  const watchedOperationType = useWatch({ control, name: "operationType" });

  // Load contract, captains & vehicles
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [contractRes, capsRes, vehsRes] = await Promise.all([
          getContractById(id),
          fetchCached("captains_list", getCaptains, { ttlMs: 120_000 }),
          fetchCached("fleet_vehicles", getVehicles, { ttlMs: 120_000 }),
        ]);

        if (!isMounted) return;

        if (vehsRes?.success && Array.isArray(vehsRes?.vehicles)) {
          setVehicles(vehsRes.vehicles);
        }

        if (capsRes?.success && Array.isArray(capsRes?.captains)) {
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
      setIsPdfOpen(false);
      setServerError("");
      setSuccessMessage("");

      const payload = sanitizeContractPayload(data, contract?.inspectionId);
      payload.inspectionData = {
        inspectionDate,
        ...checks,
        driverDeclared,
        notes: inspectionNotes || undefined,
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
        invalidateClientCache("contracts_");
        invalidateClientCache("dashboard_stats");
        invalidateClientCache("inspections_");
        invalidateClientCache("captains_list");
        setSuccessMessage(res.contract.pdfPath
          ? "تم حفظ التعديلات وتحديث ملف PDF في التخزين بنجاح."
          : "تم حفظ بيانات العقد.");
        if (!res.contract.pdfPath) setServerError("تعذر تحديث ملف PDF. افتح المعاينة لإعادة تجهيز الوثيقة المحفوظة.");
        document.getElementById("contract-edit-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <div className="w-9 h-9 border-3 border-[var(--accent-gold)]/20 border-t-[var(--accent-gold)] rounded-full animate-spin" />
          <p className="text-xs font-bold text-[var(--text-muted)]">
            {ui("جاري تحميل بيانات العقد والأسطول...")}</p>
        </div>
      </div>
    );
  }

  if (!contract && serverError) {
    return (
      <div role="alert" className="max-w-2xl mx-auto p-8 my-12 text-center theme-card rounded-3xl border theme-border space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-main)]">
          {ui(serverError)}
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          {ui("تأكد من صحة رقم العقد أو المعرف المطلوب، أو عد إلى سجل العقود.")}</p>
        <Link
          href="/admin/contracts"
          className="inline-flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold"
        >
          <ArrowRight className="w-4 h-4 ltr:rotate-180" aria-hidden="true" />
          <span>{ui("العودة إلى سجل العقود")}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="contract-editor space-y-4 sm:space-y-6 pb-8 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
            <Link
              href="/admin/contracts"
              className="hover:text-[var(--accent-gold)] transition"
            >
              {ui("سجل العقود")}</Link>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            <span className="font-mono text-[var(--text-main)]">
              <bdi>{contract?.referenceNumber}</bdi>
            </span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            <span className="text-[var(--accent-gold)]">{ui("تعديل")}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/25 flex items-center justify-center text-[var(--accent-gold)] font-bold shrink-0">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 id="contract-edit-heading" className="text-xl sm:text-2xl font-semibold text-[var(--text-main)] flex flex-wrap items-center gap-2">
                <span>{ui("تعديل العقد الرسمي")}</span>
                <span className="font-mono text-[var(--accent-gold)] text-sm sm:text-lg break-all">
                  <bdi>{contract?.referenceNumber}</bdi>
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {ui("تحديث بيانات الرحلة، الركاب، والتوجيه التشغيلي مع إعادة توليد الـ PDF تلقائياً")}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--control-border)] theme-card hover:border-[var(--accent-gold)] text-xs font-bold text-[var(--text-main)] transition shadow-2xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("معاينة")}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--control-border)] theme-card hover:border-rose-500 hover:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-400 transition shadow-2xs cursor-pointer"
            title={ui("حذف هذا العقد نهائياً")}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{ui("حذف")}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsReverseOpen(true)}
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--control-border)] theme-card hover:border-[var(--accent-gold)] text-xs font-bold text-[var(--text-main)] transition shadow-2xs cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{ui("رحلة عودة")}</span>
          </button>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successMessage && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-500/12 dark:bg-emerald-950/45 border border-emerald-600/35 dark:border-emerald-500/35 text-[var(--text-main)] text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
            <span>{ui(successMessage)}</span>
          </div>
          <div className="flex items-center gap-2 ms-auto sm:ms-0">
            <button
              type="button"
              onClick={() => setIsPdfOpen(true)}
              className="min-h-11 sm:min-h-9 px-3 py-1.5 rounded-xl bg-emerald-800 text-white hover:bg-emerald-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{ui("معاينة العقد المحدث")}</span>
            </button>
            <Link
              href="/admin/contracts"
              className="min-h-11 sm:min-h-9 inline-flex items-center px-3 py-1.5 rounded-xl bg-[var(--bg-card)] text-[var(--text-main)] text-xs font-bold transition hover:border-[var(--accent-gold)] hover:bg-[var(--bg-card-subtle)] border border-[var(--control-border)]"
            >
              {ui("سجل العقود")}</Link>
          </div>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
          <span>{ui(serverError)}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit(onFormSubmit)} aria-busy={isSubmitting} className="space-y-6">
        <fieldset disabled={isSubmitting} className={`min-w-0 border-0 p-0 m-0 ${isSubmitting ? "pointer-events-none" : ""}`}>
        <div className="space-y-4 sm:space-y-6">
        {/* Section 1: Operation & Client Info */}
        <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                  {ui("بيانات العملية والعميل (الطرف الثاني)")}</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {ui("نوع الخدمة التشغيلية واسم الضيف ورقم التواصل")}</p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[var(--bg-card-subtle)] text-[var(--text-main)] border theme-border">
              {ui("مرجع:")} <bdi>{contract?.referenceNumber}</bdi>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Operation Type */}
            <div>
              <Controller
                control={control}
                name="operationType"
                render={({ field, fieldState }) => {
                  const opOptions = [
                    ...(watchedOperationType && !OPERATION_TYPES.includes(watchedOperationType)
                      ? [{ value: watchedOperationType, label: watchedOperationType }]
                      : []),
                    ...OPERATION_TYPES.map((op) => ({
                      value: op,
                      label: ui(op),
                    })),
                  ];
                  return (
                    <FullscreenSelect
                      id={operationTypeId}
                      name={field.name}
                      label={ui("نوع العملية التشغيلية")}
                      required
                      searchable={false}
                      value={field.value || ""}
                      onChange={(nextValue) => field.onChange(nextValue)}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      options={opOptions}
                    />
                  );
                }}
              />
            </div>

            <ContractGuestFields register={register} errors={errors} />

          </div>
        </div>

        {/* Section 2: Route, Schedule & Release Date */}
        <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b theme-border pb-4">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                {ui("مسار الرحلة والجدول الزمني وتاريخ الإصدار")}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {ui("محطات الانطلاق والوصول، موعد الرحلة، وتاريخ إصدار العقد")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ContractJourneyFields control={control} register={register} errors={errors} />

            {/* Release Date (تاريخ الإصدار) Mode Toggle & Picker */}
            <ContractIssueDate control={control} setValue={setValue} />

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <CustomTextarea
                label={ui("ملاحظات وتوجيهات خاصة بالعقد")}
                placeholder={ui("أي شروط إضافية، تعليمات الكابتن، أو متطلبات خاصة بالرحلة...")}
                rows={2}
                {...register("notes")}
                error={errors.notes?.message}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Captain & Vehicle Assignment */}
        <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b theme-border pb-4">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center font-bold">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                {ui("تعيين الكابتن والمركبة")}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {ui("اختيار الكابتن المعتمد وتحديد لوحة المركبة المنفذة للرحلة")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Controller
                control={control}
                name="captainId"
                render={({ field, fieldState }) => (
                  <CaptainSelector
                    label={ui("الكابتن المسؤول عن التنفيذ")}
                    required
                    captains={captains.filter(captain => captain.active)}
                    selectedCaptainId={field.value}
                    onSelectCaptain={(cap) => {
                      field.onChange(cap.id);
                      setValue("vehiclePlate", cap.assignedVehiclePlate || "", { shouldValidate: true });
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
                    label={ui("المركبة المسندة للرحلة")}
                    required
                    vehicles={vehicles}
                    selectedPlate={field.value}
                    captainPlate={(Array.isArray(captains) ? captains : []).find((c) => c.id === selectedCaptainId)?.assignedVehiclePlate}
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
        <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border p-4 sm:p-6 space-y-5">
          <PassengerManifestManager control={control} register={register} errors={errors} />
        </div>

        {/* Section 5: Vehicle Inspection & Operational Declaration */}
        <div className="theme-card rounded-2xl sm:rounded-3xl border theme-border p-4 sm:p-6 space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                    {ui("الفحص الفني والإقرار التشغيلي للمركبة")}</h2>
                  {(contract?.inspection?.id || contract?.inspectionId) && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--bg-card-subtle)] text-[var(--text-muted)] border theme-border" dir="ltr">
                      #{((contract.inspection?.id || contract.inspectionId) as string).slice(0, 8)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {ui("تعديل واعتماد بنود الفحص الفني، تاريخ الفحص، والملاحظات التشغيلية التي تظهر في وثيقة العقد الرسمية")}</p>
              </div>
            </div>

            {/* Compliance Badge & Quick Select Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                  passedChecksCount === 16
                    ? "bg-emerald-500/12 text-emerald-800 border-emerald-600/35 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-500/35"
                    : "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)]/30"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{passedChecksCount} {ui("من 16 بند سليم")}</span>
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
                className="min-h-11 sm:min-h-9 px-3 py-1.5 rounded-full bg-[var(--bg-card-subtle)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-surface)] text-[var(--text-main)] text-xs font-bold transition border border-[var(--control-border)] cursor-pointer"
                title={ui("تحديد كافة البنود الـ 16 كسليمة ومطابقة")}
              >
                {ui("تحديد الكل سليم (100%)")}</button>
            </div>
          </div>

          {/* Date Picker & Vehicle Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end bg-[var(--bg-card-subtle)] p-4 rounded-2xl border theme-border">
            <div>
              <CustomDatePicker
                label={ui("تاريخ الفحص التشغيلي المعتمد")}
                required
                value={inspectionDate}
                onChange={setInspectionDate}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-xs text-[var(--text-muted)] space-y-0.5">
                <p className="font-semibold text-[var(--text-main)]">
                  {ui("لوحة المركبة المفحوصة:")}{" "}
                  <span className="font-mono font-bold text-[var(--accent-gold)]">
                    {selectedVehiclePlate || ui("غير محددة")}
                  </span>
                </p>
                <p>
                  {ui("يتم توثيق بنود الفحص في الصفحة الثالثة من وثيقة عقد التشغيل الرسمية.")}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailedChecks(!showDetailedChecks)}
                className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--control-border)] bg-[var(--bg-card)] text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-gold)] transition cursor-pointer self-stretch sm:self-auto justify-center"
              >
                {showDetailedChecks ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>{ui("طي بنود الفحص")}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>{ui("تعديل بنود الفحص (16 بنداً)")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed 16 Checklist Items */}
          {showDetailedChecks && (
            <div className="space-y-4 pt-1">
              <InspectionChecklist checks={checks} onChange={(key, value) => setChecks(previous => ({ ...previous, [key]: value }))} />
            </div>
          )}

          {/* Operational Notes */}
          <div>
            <CustomTextarea
              label={ui("ملاحظات الفاحص التشغيلية (المسجلة في صفحة الفحص بالعقد)")}
              placeholder={ui("مثال: تم فحص المركبة والتأكد من مطابقتها لكافة معايير السلامة التشغيلية المعتمدة...")}
              rows={2}
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              hint="تظهر هذه الملاحظات في خانة ملاحظات الفاحص في الصفحة الثالثة من ملف الـ PDF الرسمي"
            />
          </div>

          {/* Driver Declaration Checkbox */}
          <label className="flex min-h-11 items-start gap-3 p-4 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border cursor-pointer hover:border-[var(--accent-gold)] transition">
            <Checkbox
              checked={driverDeclared}
              onChange={(e) => setDriverDeclared(e.target.checked)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                {ui("إقرار وتأكيد الفحص التشغيلي المعتمد للعقد")}</span>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {ui("أقر وأؤكد بأن الفحص الفني للمركبة معتمد ومكتمل وفق الشروط والمعايير المحددة أعلاه، والمركبة جاهزة تماماً للتشغيل لنقل الركاب.")}</p>
            </div>
          </label>
        </div>

        {/* Inline submit bar on mobile/tablet so form fields stay clear; sticky on desktop lg+. */}
        <div className="contract-submit-bar">
          <p className="hidden sm:block flex-1 text-xs text-[var(--text-muted)]">{ui("سيُحفظ العقد وتُحدّث وثيقة PDF في التخزين.")}</p>
          <Link href="/admin/contracts" className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-xl secondary-btn px-4 text-sm font-bold">{ui("إلغاء")}</Link>
          <button type="submit" disabled={isSubmitting || !driverDeclared} className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl gold-gradient-btn px-5 text-sm font-bold disabled:opacity-50 cursor-pointer">
            <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{ui(isSubmitting ? "جاري الحفظ وتحديث PDF..." : "حفظ وتحديث PDF")}</span>
          </button>
        </div>
        </div>
        </fieldset>
      </form>

      {isReverseOpen && contract && (
        <ReverseTripModal isOpen onClose={() => setIsReverseOpen(false)} contract={contract} />
      )}

      {/* PDF Preview Modal */}
      {isPdfOpen && contract && (
        <PdfPreviewModal
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          contractId={contract.id}
          referenceNumber={contract.referenceNumber}
          pdfUrl={contract.pdfPath}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={ui("تأكيد حذف العقد")}
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
