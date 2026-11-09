"use client";
import { ContractGuestFields, ContractJourneyFields, ContractIssueDate } from "@/app/_components/form/ContractFields";
import InspectionChecklist from "@/app/_components/form/InspectionChecklist";
import { useUiText } from "@/lib/ui-text";

import dynamic from "next/dynamic";
import { CommercialFields } from "@/app/_components/commercial/contract-finance";
import {
  commissionTotalPreview,
  emptyCommercial,
  hasAnyCommission,
  hasPositiveMoney,
  normalizeCommercialInput,
  type CommercialInput,
} from "@/lib/commercial";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm, Controller, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2, MapPin, CheckCircle2, FileText, ArrowRight, ShieldAlert, Car, RotateCcw, Briefcase, ShieldCheck, AlertCircle, AlertTriangle, ClipboardCheck, ChevronDown, ChevronUp, Sparkles, Edit3 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/languageContext";
import { getCaptains } from "@/app/_actions/captain";
import { getVehicles } from "@/app/_actions/fleet";
import { submitContract } from "@/app/_actions/contract";
import { getTodayInspection, submitInspection } from "@/app/_actions/inspection";
import { Vehicle, VehicleInspection } from "@/lib/types";
import { adminContractSchema, AdminContractFormValues, sanitizeContractPayload } from "@/lib/validations/contract";
import { getSaudiTodayDateStr, getSaudiCurrentTimeStr } from "@/lib/contractConstants";
const PdfPreviewModal = dynamic(() => import("@/app/_components/PdfPreviewModal"), { ssr: false });
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";
import { CustomInput } from "@/app/_components/form/CustomInput";
import { CustomTextarea } from "@/app/_components/form/CustomTextarea";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";

import { CaptainSelector, CaptainWithMeta } from "@/app/_components/form/CaptainSelector";
import { VehicleSelector } from "@/app/_components/form/VehicleSelector";
import { PassengerManifestManager } from "@/app/_components/form/PassengerManifestManager";
import { MobileCollapsibleSection, MobileHorizontalStrip } from "@/app/_components/mobile";



export default function AdminContractBuilderPage() {
  const ui = useUiText();
  const { isRTL } = useLanguage();
  const [commercial,setCommercial]=useState<CommercialInput>(emptyCommercial);

  const cachedCaptains = getCachedData<Awaited<ReturnType<typeof getCaptains>>>("captains_list");
  const cachedVehicles = getCachedData<Awaited<ReturnType<typeof getVehicles>>>("fleet_vehicles");

  const [captains, setCaptains] = useState<CaptainWithMeta[]>(() => {
    if (Array.isArray(cachedCaptains)) return cachedCaptains;
    if (cachedCaptains && typeof cachedCaptains === "object" && Array.isArray(cachedCaptains.captains)) {
      return cachedCaptains.captains;
    }
    return [];
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (Array.isArray(cachedVehicles)) return cachedVehicles;
    if (cachedVehicles && typeof cachedVehicles === "object" && Array.isArray(cachedVehicles.vehicles)) {
      return cachedVehicles.vehicles;
    }
    return [];
  });
  const [isLoadingCaptains, setIsLoadingCaptains] = useState(
    () => !cachedCaptains || !cachedVehicles
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [createdContract, setCreatedContract] = useState<{ id: string; referenceNumber: string; pdfPath?: string | null } | null>(null);
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
  const watchedOperationType = useWatch({ control, name: "operationType" });
  const watchedCustomerName = useWatch({ control, name: "customerName" });
  const watchedOrigin = useWatch({ control, name: "origin" });
  const watchedDestination = useWatch({ control, name: "destination" });
  const watchedPassengers = useWatch({ control, name: "passengers" });

  const [openSections, setOpenSections] = useState({
    section1: true,
    section2: true,
    section3: false,
    section4: false,
    section5: false,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const safeCaptains = Array.isArray(captains) ? captains : [];
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const currentCaptain = safeCaptains.find((c) => c.id === selectedCaptainId);

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
          setIsConfirmed(true);
        } else {
          setCaptainInspection(null);
          setValue("inspectionId", undefined);
          setIsConfirmed(true);
        }
      });
    }

    return () => {
      isCurrent = false;
    };
  }, [selectedCaptainId, setValue]);

  // Fetch registered captains and fleet vehicles in parallel with client-side caching
  useEffect(() => {
    Promise.all([
      fetchCached("captains_list", getCaptains, { ttlMs: 120_000 }),
      fetchCached("fleet_vehicles", getVehicles, { ttlMs: 120_000 }),
    ]).then(([capRes, vehRes]) => {
      let loadedCaptains: CaptainWithMeta[] = [];
      let loadedVehicles: Vehicle[] = [];

      if (capRes?.success && Array.isArray(capRes?.captains)) {
        loadedCaptains = capRes.captains;
        setCaptains(capRes.captains);
      }
      if (vehRes?.success && Array.isArray(vehRes?.vehicles)) {
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
        "";

      if (!plate.trim()) throw new Error("اختر المركبة قبل تسجيل الفحص");

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
          isRTL
            ? `تم إرسال وتوثيق الفحص التشغيلي بنجاح (كود الفحص #${res.inspection.id.slice(0, 8)}) بتاريخ ${displayDate} وتم اعتماده للرحلة`
            : `Operational inspection documented (#${res.inspection.id.slice(0, 8)}) on ${displayDate} and approved for this trip`
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

  // Auto-open collapsed mobile sections that contain RHF validation errors
  const onFormInvalid = (formErrors: FieldErrors<AdminContractFormValues>) => {
    const sec1Error = Boolean(formErrors.captainId || formErrors.vehiclePlate);
    const sec2Error = Boolean(
      formErrors.operationType ||
        formErrors.customerName ||
        formErrors.customerPhone ||
        formErrors.origin ||
        formErrors.destination ||
        formErrors.tripDate ||
        formErrors.tripTime ||
        formErrors.notes
    );
    const sec3Error = Boolean(formErrors.passengers);

    setOpenSections((prev) => ({
      ...prev,
      section1: prev.section1 || sec1Error,
      section2: prev.section2 || sec2Error,
      section3: prev.section3 || sec3Error,
      section4: prev.section4 || !isConfirmed,
    }));

    if (!isConfirmed) {
      setConfirmError("يجب إتمام وتأكيد الإقرار والفحص التشغيلي أدناه قبل إنشاء وتوثيق العقد");
    }
  };

  // Handle Form Submission
  const onFormSubmit = async (data: AdminContractFormValues) => {
    if (!isConfirmed) {
      setConfirmError("يجب إتمام وتأكيد الإقرار والفحص التشغيلي أدناه قبل إنشاء وتوثيق العقد");
      setOpenSections((prev) => ({ ...prev, section4: true }));
      return;
    }

    setConfirmError("");
    setIsSubmitting(true);
    setServerError("");

    try {
      // Resolve inspection ID: captain inspection, pre-submitted admin inspection, or auto-document now directly from form!
      let resolvedInspectionId = effectiveCaptainInspection?.id || adminInspectionId || null;

      // If no resolved inspection ID yet, create and document the real inspection now directly from this form!
      if (!resolvedInspectionId) {
        const plate =
          data.vehiclePlate ||
          currentCaptain?.assignedVehiclePlate ||
          "";

        if (!plate.trim()) throw new Error("اختر المركبة قبل تسجيل الفحص");

        const nowTime = getSaudiCurrentTimeStr();
        const effectiveInspectionDate =
          adminInspectionMode === "MANUAL"
            ? `${adminInspectionDate.replace(/\//g, "-")}T${nowTime}:00`
            : new Date().toISOString();

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
          notes: "تم تقديم وتوثيق الفحص التشغيلي الفعلي مباشرة من نموذج إنشاء العقد",
          inspectionDate: effectiveInspectionDate,
        });

        if (inspRes.success && inspRes.inspection) {
          resolvedInspectionId = inspRes.inspection.id;
          setAdminInspectionId(inspRes.inspection.id);
          setValue("inspectionId", inspRes.inspection.id);
        } else {
          setIsSubmitting(false);
          setConfirmError(
            inspRes.error ||
              "تعذر تقديم وتوثيق الفحص الفني للمركبة. يرجى توثيق الفحص أولاً."
          );
          setOpenSections((prev) => ({ ...prev, section4: true }));
          return;
        }
      }

      // Final guard: Guarantee that an inspection ID is present
      if (!resolvedInspectionId) {
        setIsSubmitting(false);
        setConfirmError(
          "يجب تقديم فحص فعلي للمركبة مرتبط بالكابتن قبل إنشاء العقد. يرجى توثيق الفحص التشغيلي أولاً."
        );
        setOpenSections((prev) => ({ ...prev, section4: true }));
        return;
      }

      // 1. Clean and normalize payload with resolved inspection ID
      const payload = sanitizeContractPayload(data, resolvedInspectionId);

      // 2. Submit contract action
      const res = await submitContract({
        ...payload,
        commercial: normalizeCommercialInput(commercial),
      });
      setIsSubmitting(false);

      if (res.success && res.contract) {
        invalidateClientCache("contracts_");
        invalidateClientCache("dashboard_stats");
        invalidateClientCache("inspections_");
        setCreatedContract({ id: res.contract.id, referenceNumber: res.contract.referenceNumber, pdfPath: res.contract.pdfPath || null });
        setIsPdfOpen(true);
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
    setCommercial(emptyCommercial());
    setIsConfirmed(false);
    setConfirmError("");
    setAdminInspectionId(null);
    setAdminInspectionSuccessMsg("");
    setAdminInspectionMode("AUTO");
    setShowDetailedChecks(false);
    const defaultCap = safeCaptains.length > 0 ? safeCaptains[0] : null;
    const defaultPlate =
      defaultCap?.assignedVehiclePlate ||
      (safeVehicles.length > 0 ? safeVehicles[0].plateNumberAr : "");

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
          <p className="text-xs text-[var(--text-muted)]">{ui("جاري تحميل بيانات الأسطول والكباتن...")}</p>
        </div>
      </div>
    );
  }

  // Contract Success View
  if (createdContract) {
    return (
      <div className="theme-card rounded-3xl p-6 sm:p-10 border theme-border text-center space-y-5 max-w-xl mx-auto my-8 shadow-xl">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {ui("تم توثيق العقد بنجاح!")}</h2>
          <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">
            {ui("تم تسجيل العقد وإسناده للكابتن وتوليد وثيقة الـ PDF المعتمدة")}</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-block font-mono font-semibold text-amber-700 dark:text-amber-400 text-xl tracking-wider">
          {createdContract.referenceNumber}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {ui("معاينة وتحميل العقد (PDF)")}</button>

          <button
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {ui("إنشاء عقد إضافي آخر")}</button>
        </div>

        {isPdfOpen && (
          <PdfPreviewModal
            isOpen={isPdfOpen}
            onClose={() => setIsPdfOpen(false)}
            contractId={createdContract.id}
            referenceNumber={createdContract.referenceNumber}
            pdfUrl={createdContract?.pdfPath}
          />
        )}
      </div>
    );
  }

  const section1Summary = currentCaptain
    ? `${currentCaptain.name}${selectedVehiclePlate ? ` · ${selectedVehiclePlate}` : ""}`
    : ui("اختر الكابتن والمركبة");

  const section2Summary =
    [
      watchedCustomerName?.trim(),
      watchedOrigin && watchedDestination
        ? `${watchedOrigin} ${isRTL ? "←" : "→"} ${watchedDestination}`
        : watchedOperationType,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  const section3Count = Array.isArray(watchedPassengers) ? watchedPassengers.length : 1;
  const section3Summary = `${section3Count} ${ui("ركاب")}`;

  const section4Summary =
    effectiveCaptainInspection || adminInspectionId
      ? ui("معتمد وجاهز للتوثيق")
      : isConfirmed
        ? ui("سيتم التوثيق تلقائياً عند الحفظ")
        : ui("بانتظار التأكيد");

  const totalCommissionSummary = commissionTotalPreview(
    commercial.driverCommission,
    commercial.representativeCommission
  );
  const section5Parts = [
    hasPositiveMoney(commercial.netAmount) ? `${commercial.netAmount} SAR` : "",
    hasAnyCommission(commercial) && totalCommissionSummary !== "—"
      ? `${ui("العمولات")}: ${totalCommissionSummary} SAR`
      : "",
  ].filter(Boolean);
  const section5Summary =
    section5Parts.join(" · ") || ui("بيانات داخلية وعمولات (اختياري)");

  const section1Error = Boolean(errors.captainId || errors.vehiclePlate);
  const section2Error = Boolean(
    errors.operationType ||
      errors.customerName ||
      errors.customerPhone ||
      errors.origin ||
      errors.destination ||
      errors.tripDate ||
      errors.tripTime ||
      errors.notes
  );
  const section3Error = Boolean(errors.passengers);

  return (
    <div className="contract-editor space-y-5 sm:space-y-6 max-w-6xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/contracts"
              className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={ui("رجوع لقائمة العقود")}
            >
              <ArrowRight className="w-5 h-5 ltr:rotate-180" aria-hidden="true" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {ui("إنشاء وتوثيق عقد نقل رسمي")}</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] dark:text-slate-400 mt-1 ms-11">
            {ui("إصدار عقود الرحلات الفورية وإسنادها للكباتن بصلاحيات الإدارة المباشرة")}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {ui("صلاحيات الإدارة (تخطي الفحص)")}</span>
        </div>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
        className="space-y-4 sm:space-y-6"
      >
        {serverError && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{ui(serverError)}</span>
          </div>
        )}

        {/* Section 1: Captain & Vehicle Assignment */}
        <MobileCollapsibleSection
          stepNumber={1}
          title={ui("إسناد الرحلة والمركبة")}
          summary={section1Summary}
          isOpen={openSections.section1}
          onToggle={() => toggleSection("section1")}
          hasError={section1Error}
          isComplete={Boolean(selectedCaptainId && selectedVehiclePlate && !section1Error)}
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div className="hidden md:flex items-center justify-between border-b theme-border pb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-500" />
                {ui("إسناد الرحلة والمركبة")}</h2>
              <span className="text-xs text-[var(--text-muted)]">
                {ui("اختر الكابتن المتاح للرحلة وسيتم ربط مركبته تلقائياً")}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Custom Captain Selector */}
              <div>
                <Controller
                  control={control}
                  name="captainId"
                  render={({ field, fieldState }) => (
                    <CaptainSelector
                      label={ui("الكابتن المسؤول عن التنفيذ")}
                      required
                      captains={safeCaptains}
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
                      label={ui("المركبة المسندة للرحلة")}
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
        </MobileCollapsibleSection>

        {/* Section 2: Trip & Client Details */}
        <MobileCollapsibleSection
          stepNumber={2}
          title={ui("بيانات الرحلة والعميل الأساسي")}
          summary={section2Summary}
          isOpen={openSections.section2}
          onToggle={() => toggleSection("section2")}
          hasError={section2Error}
          isComplete={Boolean(watchedCustomerName?.trim() && watchedOrigin?.trim() && watchedDestination?.trim() && !section2Error)}
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:border-b theme-border md:pb-3">
              <div className="hidden md:block">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  {ui("بيانات الرحلة والعميل الأساسي")}</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {ui("تحديد المسار والمواعيد وفق التذاكر أو الحجوزات")}</p>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5 min-w-0">
                <span className="text-xs text-[var(--text-muted)] font-bold block sm:inline me-1">
                  {ui("قوالب العمليات:")}
                </span>
                <MobileHorizontalStrip
                  label={ui("قوالب العمليات")}
                  className="sm:flex-wrap pb-0"
                >
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
                      className="min-h-10 sm:min-h-8 shrink-0 snap-start whitespace-nowrap text-xs font-bold px-3 py-1 rounded-lg bg-slate-100 hover:bg-amber-500/15 dark:bg-slate-800 dark:hover:bg-amber-500/20 text-[var(--text-muted)] dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      + {ui(tag)}
                    </button>
                  ))}
                </MobileHorizontalStrip>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Operation Type - Clean and Simple Text Input */}
              <CustomInput
                label={ui("نوع العملية التشغيلية")}
                required
                icon={<Briefcase className="w-3.5 h-3.5 text-amber-500" />}
                placeholder={ui("توصيل مطار، جولة سياحية، نقل بين المدن...")}
                clearable
                onClear={() => setValue("operationType", "", { shouldValidate: true })}
                {...register("operationType")}
                error={errors.operationType?.message}
              />

              <ContractGuestFields register={register} errors={errors} />
              <ContractJourneyFields control={control} register={register} errors={errors} />

              {/* Contract Release Date (تاريخ إصدار العقد المعتمد في الوثيقة) */}
              <ContractIssueDate control={control} setValue={setValue} />

              {/* Contract Notes */}
              <div className="sm:col-span-2 lg:col-span-3">
                <CustomTextarea
                  label={ui("ملاحظات وتوجيهات خاصة بالعقد")}
                  placeholder={ui("تعليمات الاستقبال VIP، نقطة التجمع، أو تفاصيل إضافية...")}
                  rows={2}
                  maxLength={500}
                  showCount
                  {...register("notes")}
                  error={errors.notes?.message}
                />
              </div>
            </div>
          </div>
        </MobileCollapsibleSection>

        {/* Section 3: Passenger Manifest List */}
        <MobileCollapsibleSection
          stepNumber={3}
          title={ui("كشف الركاب والمرافقين")}
          summary={section3Summary}
          isOpen={openSections.section3}
          onToggle={() => toggleSection("section3")}
          hasError={section3Error}
          isComplete={Boolean(Array.isArray(watchedPassengers) && watchedPassengers.some((p) => p?.name?.trim()) && !section3Error)}
        >
          <PassengerManifestManager
            embedded
            control={control}
            register={register}
            errors={errors}
          />
        </MobileCollapsibleSection>

        {/* Section 4: Mandatory Operational & Technical Inspection Check */}
        <MobileCollapsibleSection
          stepNumber={4}
          title={ui("الفحص والإقرار التشغيلي الإلزامي")}
          summary={section4Summary}
          isOpen={openSections.section4}
          onToggle={() => toggleSection("section4")}
          hasError={Boolean(confirmError)}
          isComplete={Boolean(isConfirmed)}
        >
          <div
            className={`p-4 sm:p-6 transition-all duration-200 space-y-4 ${
              isConfirmed
                ? "bg-emerald-500/5 dark:bg-emerald-950/10"
                : confirmError
                ? "bg-rose-500/5"
                : ""
            }`}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
              <div className="hidden md:flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isConfirmed
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    {ui("الفحص والإقرار التشغيلي الإلزامي (التحقق قبل التوثيق)")}</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {ui("تأكيد رسمي بمطابقة الفحص الفني للمركبة وسلامة المسار والركاب")}</p>
                </div>
              </div>

              <div className="shrink-0">
                {isCheckingInspection ? (
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] text-xs font-bold inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    {ui("جاري التحقق من الفحص...")}</span>
                ) : effectiveCaptainInspection ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {ui("تم الفحص مسبقاً من الكابتن")}</span>
                ) : adminInspectionId ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {ui("تم الاعتماد والإرسال من الإدارة")}</span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    {ui("بانتظار الاعتماد التشغيلي")}</span>
                )}
              </div>
            </div>

            {/* Inspection Mode Toggle: Auto vs Manual */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border theme-border">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  {ui("طريقة اعتماد وتوثيق الفحص التشغيلي:")}</span>
                <span className="text-xs text-[var(--text-muted)] dark:text-slate-400 block">
                  {ui("اختر الاعتماد الآلي (فحص الكابتن اليومي أو اللحظة الحالية) أو التخصيص اليدوي للوقت والتاريخ")}</span>
              </div>

              <div className="grid grid-cols-2 sm:inline-flex p-1 rounded-xl bg-white dark:bg-slate-800 border theme-border shrink-0 w-full sm:w-auto shadow-2xs gap-1">
                <button
                  type="button"
                  aria-pressed={adminInspectionMode === "AUTO"}
                  onClick={() => setAdminInspectionMode("AUTO")}
                  className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    adminInspectionMode === "AUTO"
                      ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs border border-amber-500/30"
                      : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                  <span className="truncate">{ui("تلقائي (فحص الكابتن / الآن)")}</span>
                </button>

                <button
                  type="button"
                  aria-pressed={adminInspectionMode === "MANUAL"}
                  onClick={() => setAdminInspectionMode("MANUAL")}
                  className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    adminInspectionMode === "MANUAL"
                      ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs border border-amber-500/30"
                      : "text-[var(--text-muted)] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{ui("يدوي (تحديد موعد مخصص)")}</span>
                </button>
              </div>
            </div>

            {/* Mode-dependent Content */}
            {adminInspectionMode === "AUTO" ? (
              effectiveCaptainInspection ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block">
                        {ui("تم استلام واعتماد فحص المركبة اليومي تلقائياً من الكابتن (")}{currentCaptain?.name || ui("الكابتن")})
                      </span>
                      <span className="text-xs text-emerald-700/80 dark:text-emerald-400/80 block">
                        {ui("لوحة المركبة المفحوصة:")} <strong className="font-mono">{effectiveCaptainInspection.vehiclePlate}</strong> {ui("• تاريخ الفحص:")} <strong className="font-mono" dir="ltr">{new Date(effectiveCaptainInspection.inspectionDate).toLocaleDateString("en-GB")}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono">
                    {ui("كود الفحص #")}<bdi dir="ltr">{effectiveCaptainInspection.id.slice(0, 8)}</bdi>
                  </span>
                </div>
              ) : adminInspectionId ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block">
                        {ui("تم إرسال وتوثيق الفحص التشغيلي بنجاح من إدارة العمليات")}</span>
                      <span className="text-xs text-emerald-700/80 dark:text-emerald-400/80 block">
                        {ui("تم اعتماد الفحص الفني لمركبة الكابتن")} {currentCaptain?.name || ""} {ui("وربطه بالعقد رسمياً • تاريخ الفحص:")} <strong className="font-mono" dir="ltr">{new Date().toLocaleDateString("en-GB")}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono">
                    {ui("كود الفحص #")}<bdi dir="ltr">{adminInspectionId.slice(0, 8)}</bdi>
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold block">
                        {ui("الكابتن (")}{currentCaptain?.name || ui("المحدد")}{ui(") لم يرسل الفحص اليومي للمركبة لهذا اليوم")}</span>
                      <span className="text-xs text-amber-800 dark:text-amber-300 block mt-0.5">
                        {ui("في الوضع التلقائي، سيتم اعتماد وتوثيق الفحص التشغيلي باللحظة الحالية فوراً وربطه بالعقد، أو يمكنك توثيقه مسبقاً الآن:")}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-500/20">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-amber-800 dark:text-amber-300 font-medium">{ui("موعد الفحص الآلي:")}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono font-bold border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        {ui("الآن (")}<span dir="ltr">{new Date().toLocaleDateString("en-GB")} • {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>)
                      </span>
                      <span className="text-xs text-amber-700/70 dark:text-amber-400/70">
                        {ui("(تسجيل الفحص باللحظة الحالية فوراً)")}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendAdminInspection}
                      disabled={isSubmittingAdminInspection || !selectedCaptainId}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap cursor-pointer"
                      title={ui("إرسال وتوثيق الفحص التشغيلي من الإدارة الآن")}
                    >
                      {isSubmittingAdminInspection ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" />
                          <span>{ui("جاري التوثيق...")}</span>
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
                          <span>{ui("توثيق الفحص الآن")}</span>
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
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Edit3 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      {ui("تخصيص تاريخ الفحص التشغيلي المعتمد (يدوي)")}</span>
                    <span className="text-xs text-[var(--text-muted)] dark:text-slate-400 block mt-0.5">
                      {ui("حدد تاريخ الفحص التشغيلي الذي ترغب في اعتماده وربطه بمركبة الكابتن")} {currentCaptain?.name || ""} {ui("في هذا العقد:")}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t theme-border">
                  <div className="flex-1 sm:max-w-xs">
                    <CustomDatePicker
                      label={ui("تاريخ الفحص")}
                      value={adminInspectionDate}
                      onChange={setAdminInspectionDate}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendAdminInspection}
                    disabled={isSubmittingAdminInspection || !selectedCaptainId}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap cursor-pointer sm:self-end"
                    title={ui("اعتماد وتوثيق الفحص التشغيلي بالتاريخ المحدد")}
                  >
                    {isSubmittingAdminInspection ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" />
                        <span>{ui("جاري التوثيق...")}</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
                        <span>{ui("توثيق الفحص المخصص")}</span>
                      </>
                    )}
                  </button>
                </div>

                {adminInspectionId && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    <span>
                      {ui("تم توثيق الفحص التشغيلي برقم #")}<bdi dir="ltr">{adminInspectionId.slice(0, 8)}</bdi> {ui("بتاريخ:")} <bdi dir="ltr">{adminInspectionDate}</bdi>
                    </span>
                  </div>
                )}
              </div>
            )}

            {adminInspectionSuccessMsg && (
              <div role="status" className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>{adminInspectionSuccessMsg}</span>
              </div>
            )}

            {/* High-level verification summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-[var(--text-muted)]"}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ui("سلامة الإطارات والفرامل")}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-[var(--text-muted)]"}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ui("الأنوار وأجهزة الطوارئ")}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-[var(--text-muted)]"}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ui("مطابقة كشف الركاب")}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border theme-border flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isConfirmed ? "text-emerald-500" : "text-[var(--text-muted)]"}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ui("جاهزية الكابتن المعتمد")}</span>
              </div>
            </div>

            {/* Toggle Detailed 16-check Inspection Drawer */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDetailedChecks(!showDetailedChecks)}
                className="min-h-10 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1.5 transition cursor-pointer"
              >
                {showDetailedChecks ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>{ui("إخفاء تفاصيل بنود الفحص الفني (16 بنداً)")}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>{ui("عرض وتخصيص بنود الفحص الفني (16 بنداً)")}</span>
                  </>
                )}
              </button>

              {showDetailedChecks && (
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/70 border theme-border space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-2">
                    <span className="text-xs font-bold text-[var(--text-muted)] dark:text-slate-300">
                      {ui("بنود الفحص الفني المعتمدة وفق اشتراطات هيئة النقل")}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allPassed = Object.keys(checks).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                        setChecks(allPassed);
                      }}
                      className="min-h-10 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {ui("تحديد الكل سليم (100%)")}</button>
                  </div>

                  <InspectionChecklist checks={checks} onChange={(key, value) => setChecks(previous => ({ ...previous, [key]: value }))} />
                </div>
              )}
            </div>

            {/* Interactive Declaration Checkbox */}
            <label className="flex min-h-11 items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border theme-border cursor-pointer hover:border-amber-500/60 transition shadow-2xs">
              <Checkbox
                checked={isConfirmed}
                onChange={(e) => {
                  setIsConfirmed(e.target.checked);
                  if (e.target.checked) setConfirmError("");
                }}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block leading-relaxed">
                  {ui("أقر وأؤكد بأن الفحص الفني للمركبة معتمد ومكتمل، وكافة بيانات الرحلة والمسار والركاب مدخلة بدقة ومسؤولية تشغيلية كاملة.")}</span>
                <span className="text-xs text-[var(--text-muted)] block">
                  {ui(effectiveCaptainInspection
                    ? `* تم ربط فحص الكابتن المعتمد اليوم (كود #${effectiveCaptainInspection.id.slice(0, 8)}) بالوثيقة الرسمية.`
                    : adminInspectionId
                    ? `* تم توثيق واعتماد الفحص الفني للمركبة من الإدارة (كود #${adminInspectionId.slice(0, 8)}) وربطه بالعقد.`
                    : `* سيتم توثيق وتقديم فحص فعلي معتمد للمركبة مرتبط بالكابتن آلياً من النموذج وربطه بالعقد.`)}
                </span>
              </div>
            </label>

            {confirmError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{ui(confirmError)}</span>
              </div>
            )}
          </div>
        </MobileCollapsibleSection>

        {/* Section 5: Commercial & Commissions (Internal Data) */}
        <MobileCollapsibleSection
          stepNumber={5}
          title={ui("العميل ومستحقات الرحلة — بيانات داخلية")}
          summary={section5Summary}
          isOpen={openSections.section5}
          onToggle={() => toggleSection("section5")}
          isComplete={Boolean(
            commercial.customerId ||
              hasPositiveMoney(commercial.netAmount) ||
              hasAnyCommission(commercial)
          )}
        >
          <CommercialFields
            embedded
            value={commercial}
            onChange={setCommercial}
            onGuest={(name, phone) => {
              setValue("customerName", name);
              setValue("customerPhone", phone);
              setValue("passengers.0.name", name);
            }}
          />
        </MobileCollapsibleSection>

        {/* Form Bottom Submission Bar (docked above mobile bottom nav; single type="submit" button) */}
        <div className="contract-submit-bar">
          <p className="hidden sm:block flex-1 text-xs text-[var(--text-muted)]">
            {ui("سيُحفظ العقد وتُعتمد وثيقة PDF تلقائياً بصفة ساري.")}
          </p>
          <Link
            href="/admin/contracts"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border theme-border px-4 sm:px-5 text-xs sm:text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {ui("إلغاء والعودة")}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !isConfirmed}
            className="inline-flex min-h-12 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl gold-gradient-btn px-6 sm:px-8 text-xs sm:text-sm font-bold transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" />
                <span>{ui("جاري معالجة وتوثيق العقد...")}</span>
              </>
            ) : (
              <>
                <FilePlus2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{ui("اعتماد وتوثيق العقد الرسمي (PDF)")}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
