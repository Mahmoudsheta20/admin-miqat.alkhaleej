"use client";
import {
  ContractGuestFields,
  ContractJourneyFields,
  ContractIssueDate,
} from "@/app/_components/form/ContractFields";
import InspectionChecklist from "@/app/_components/form/InspectionChecklist";
import { useWhatsAppStatus } from "@/lib/use-whatsapp-status";
import { useAuth } from "@/lib/authContext";
import { hasClientPermission } from "@/lib/permissions";
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

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  useForm,
  Controller,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FilePlus2,
  MapPin,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldAlert,
  Car,
  RotateCcw,
  Briefcase,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Edit3,
  MessageSquare,
} from "lucide-react";
import {
  fetchWhatsAppFlowOverview,
  fetchWhatsAppStatus,
  type WhatsAppAutoSendResult,
} from "@/lib/whatsapp";
import AutoSendWhatsAppCard from "@/app/_components/AutoSendWhatsAppCard";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/languageContext";
import { getCaptains } from "@/app/_actions/captain";
import { getVehicles } from "@/app/_actions/fleet";
import { submitContract } from "@/app/_actions/contract";
import {
  getTodayInspection,
  submitInspection,
} from "@/app/_actions/inspection";
import { Vehicle, VehicleInspection } from "@/lib/types";
import {
  adminContractSchema,
  AdminContractFormValues,
  OPERATION_TYPE_LABELS,
  parseOperationType,
  sanitizeContractPayload,
} from "@/lib/validations/contract";
import {
  getSaudiTodayDateStr,
  getSaudiCurrentTimeStr,
  CONTRACT_SERVICE_OPTIONS,
  CONTRACT_QUICK_PRESETS,
} from "@/lib/contractConstants";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
const PdfPreviewModal = dynamic(
  () => import("@/app/_components/PdfPreviewModal"),
  { ssr: false },
);
const SendWhatsAppModal = dynamic(
  () => import("@/app/_components/SendWhatsAppModal"),
  { ssr: false },
);
import {
  fetchCached,
  getCachedData,
  invalidateClientCache,
} from "@/lib/clientCache";
import { CustomInput } from "@/app/_components/form/CustomInput";
import { CustomTextarea } from "@/app/_components/form/CustomTextarea";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";

import {
  CaptainSelector,
  CaptainWithMeta,
} from "@/app/_components/form/CaptainSelector";
import { VehicleSelector } from "@/app/_components/form/VehicleSelector";
import { PassengerManifestManager } from "@/app/_components/form/PassengerManifestManager";
import {
  MobileCollapsibleSection,
  MobileHorizontalStrip,
} from "@/app/_components/mobile";

export interface AdminContractBuilderProps {
  inModal?: boolean;
  onClose?: () => void;
  onCreated?: (contract: {
    id: string;
    referenceNumber: string;
    pdfPath?: string | null;
  }) => void;
}

export default function AdminContractBuilder({
  inModal = false,
  onClose,
  onCreated,
}: AdminContractBuilderProps) {
  const ui = useUiText();
  const whatsappStatus = useWhatsAppStatus();
  const driverPollMode = whatsappStatus.data?.driverWorkflow?.enabled === true;
  const { isRTL, language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [commercial, setCommercial] =
    useState<CommercialInput>(emptyCommercial);

  const cachedCaptains =
    getCachedData<Awaited<ReturnType<typeof getCaptains>>>("captains_list");
  const cachedVehicles =
    getCachedData<Awaited<ReturnType<typeof getVehicles>>>("fleet_vehicles");

  const [captains, setCaptains] = useState<CaptainWithMeta[]>(() => {
    if (Array.isArray(cachedCaptains)) return cachedCaptains;
    if (
      cachedCaptains &&
      typeof cachedCaptains === "object" &&
      Array.isArray(cachedCaptains.captains)
    ) {
      return cachedCaptains.captains;
    }
    return [];
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (Array.isArray(cachedVehicles)) return cachedVehicles;
    if (
      cachedVehicles &&
      typeof cachedVehicles === "object" &&
      Array.isArray(cachedVehicles.vehicles)
    ) {
      return cachedVehicles.vehicles;
    }
    return [];
  });
  const [isLoadingCaptains, setIsLoadingCaptains] = useState(
    () => !cachedCaptains || !cachedVehicles,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [createdContract, setCreatedContract] = useState<{
    id: string;
    referenceNumber: string;
    pdfPath?: string | null;
    captainName?: string;
    captainPhone?: string;
    customerName?: string;
    customerPhone?: string;
    whatsAppAutoSend?: WhatsAppAutoSendResult;
  } | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(false);
  const [whatsAppPhoneOverride, setWhatsAppPhoneOverride] = useState("");
  const [includeGuestPhoneInWhatsApp, setIncludeGuestPhoneInWhatsApp] = useState(true);
  const [sendWhatsAppToGuest, setSendWhatsAppToGuest] = useState(false);
  const [whatsAppMeta, setWhatsAppMeta] = useState<{
    connected: boolean;
    adminFlowPhone: string;
  } | null>(null);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const autoSendTouchedRef = useRef(false);

  // Captain & Admin Inspection States
  const [captainInspection, setCaptainInspection] =
    useState<VehicleInspection | null>(null);
  const [checkedCaptainId, setCheckedCaptainId] = useState<string | null>(null);
  const [adminInspectionId, setAdminInspectionId] = useState<string | null>(
    null,
  );
  const [isSubmittingAdminInspection, setIsSubmittingAdminInspection] =
    useState(false);
  const [adminInspectionSuccessMsg, setAdminInspectionSuccessMsg] =
    useState("");
  const [showDetailedChecks, setShowDetailedChecks] = useState(false);
  const [adminInspectionMode, setAdminInspectionMode] = useState<
    "AUTO" | "MANUAL"
  >("AUTO");
  const [adminInspectionDate, setAdminInspectionDate] = useState(() =>
    getSaudiTodayDateStr(),
  );

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
    getValues,
    setFocus,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<AdminContractFormValues>({
    resolver: zodResolver(adminContractSchema),
    shouldUnregister: false,
    defaultValues: {
      operationType: "",
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
  const watchedCustomerPhone = useWatch({ control, name: "customerPhone" });
  const watchedOrigin = useWatch({ control, name: "origin" });
  const watchedDestination = useWatch({ control, name: "destination" });
  const watchedPassengers = useWatch({ control, name: "passengers" });

  // Auto-sync lead guest name into primary passenger when primary passenger is empty or matches prior synced name
  const { user, isLoading: authLoading } = useAuth();
  const canViewWhatsApp = hasClientPermission(user, "whatsapp", "view");
  const syncedPrimaryGuestRef = useRef("");
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    void Promise.allSettled([
      fetchWhatsAppStatus(),
      canViewWhatsApp ? fetchWhatsAppFlowOverview() : Promise.resolve(null),
    ]).then(([statusRes, flowRes]) => {
      if (!active) return;
      const connected =
        statusRes.status === "fulfilled" && statusRes.value.status === "connected";
      const flowConfig =
        flowRes.status === "fulfilled" ? flowRes.value?.config ?? null : null;
      setWhatsAppMeta({
        connected,
        adminFlowPhone: flowConfig?.adminPhone || "+966577842926",
      });
      if (flowConfig?.autoSendContractDefault && !autoSendTouchedRef.current) {
        setAutoSendWhatsApp(true);
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, canViewWhatsApp]);

  useEffect(() => {
    const nextGuest = (watchedCustomerName ?? "").trim();
    const currentPrimary = (getValues("passengers.0.name") ?? "").trim();
    if (!currentPrimary || currentPrimary === syncedPrimaryGuestRef.current) {
      setValue("passengers.0.name", nextGuest, { shouldDirty: false });
      syncedPrimaryGuestRef.current = nextGuest;
    }
  }, [watchedCustomerName, getValues, setValue]);

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

  const isCheckingInspection = Boolean(
    selectedCaptainId && checkedCaptainId !== selectedCaptainId,
  );
  const effectiveCaptainInspection =
    selectedCaptainId && captainInspection?.captainId === selectedCaptainId
      ? captainInspection
      : null;

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
    void import("@/app/_components/PdfPreviewModal");
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
        if (!getValues("captainId")) {
          setValue("captainId", firstCap.id);
        }
        if (!getValues("vehiclePlate")) {
          if (firstCap.assignedVehiclePlate) {
            setValue("vehiclePlate", firstCap.assignedVehiclePlate);
          } else if (loadedVehicles.length > 0) {
            setValue("vehiclePlate", loadedVehicles[0].plateNumberAr);
          }
        }
      } else if (loadedVehicles.length > 0 && !getValues("vehiclePlate")) {
        setValue("vehiclePlate", loadedVehicles[0].plateNumberAr);
      }

      setIsLoadingCaptains(false);
    });
  }, [getValues, setValue]);

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
        selectedVehiclePlate || currentCaptain?.assignedVehiclePlate || "";

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
            : `Operational inspection documented (#${res.inspection.id.slice(0, 8)}) on ${displayDate} and approved for this trip`,
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
      formErrors.notes,
    );
    const sec3Error = Boolean(formErrors.passengers);

    setOpenSections((prev) => ({
      ...prev,
      section1: prev.section1 || sec1Error,
      section2: prev.section2 || sec2Error,
      section3: prev.section3 || sec3Error,
      section4: prev.section4 || !isConfirmed,
    }));

    const firstInvalidField = (
      [
        "captainId",
        "vehiclePlate",
        "operationType",
        "customerName",
        "customerPhone",
        "origin",
        "destination",
        "tripDate",
        "tripTime",
        "notes",
      ] as const
    ).find((name) => Boolean(formErrors[name]));

    if (firstInvalidField) {
      window.setTimeout(() => setFocus(firstInvalidField), 40);
    }

    if (!isConfirmed) {
      setConfirmError(
        "يجب إتمام وتأكيد الإقرار والفحص التشغيلي أدناه قبل إنشاء وتوثيق العقد",
      );
    }
  };

  // Handle Form Submission
  const onFormSubmit = async (data: AdminContractFormValues) => {
    if (!isConfirmed) {
      setConfirmError(
        "يجب إتمام وتأكيد الإقرار والفحص التشغيلي أدناه قبل إنشاء وتوثيق العقد",
      );
      setOpenSections((prev) => ({ ...prev, section4: true }));
      return;
    }

    setConfirmError("");
    setIsSubmitting(true);
    setServerError("");

    try {
      let resolvedInspectionId =
        effectiveCaptainInspection?.id || adminInspectionId || null;

      if (!resolvedInspectionId) {
        const plate =
          data.vehiclePlate || currentCaptain?.assignedVehiclePlate || "";

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
          notes:
            "تم تقديم وتوثيق الفحص التشغيلي الفعلي مباشرة من نموذج إنشاء العقد",
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
              "تعذر تقديم وتوثيق الفحص الفني للمركبة. يرجى توثيق الفحص أولاً.",
          );
          setOpenSections((prev) => ({ ...prev, section4: true }));
          return;
        }
      }

      if (!resolvedInspectionId) {
        setIsSubmitting(false);
        setConfirmError(
          "يجب تقديم فحص فعلي للمركبة مرتبط بالكابتن قبل إنشاء العقد. يرجى توثيق الفحص التشغيلي أولاً.",
        );
        setOpenSections((prev) => ({ ...prev, section4: true }));
        return;
      }

      const payload = sanitizeContractPayload(data, resolvedInspectionId);
      const cleanedGuestPhone = (data.customerPhone || "").trim();

      const res = await submitContract({
        ...payload,
        commercial: normalizeCommercialInput(commercial),
        includeGuestPhoneInWhatsApp,
        ...(sendWhatsAppToGuest
          ? {
              sendWhatsAppToGuest: true,
              ...(cleanedGuestPhone ? { guestWhatsAppPhone: cleanedGuestPhone } : {}),
            }
          : {}),
        ...(autoSendWhatsApp && !driverPollMode
          ? {
              autoSendWhatsApp: true,
              ...(whatsAppPhoneOverride.trim()
                ? { whatsAppPhone: whatsAppPhoneOverride.trim() }
                : {}),
            }
          : {}),
      });
      setIsSubmitting(false);

      if (res.success && res.contract) {
        invalidateClientCache("contracts_");
        invalidateClientCache("dashboard_stats");
        invalidateClientCache("inspections_");
        const created = {
          id: res.contract.id,
          referenceNumber: res.contract.referenceNumber,
          pdfPath: res.contract.pdfPath || null,
          captainName: currentCaptain?.name || res.contract.captain?.name,
          captainPhone:
            whatsAppPhoneOverride.trim() ||
            res.contract.captain?.phone ||
            currentCaptain?.phone ||
            "",
          customerName: res.contract.customerName || data.customerName,
          customerPhone: res.contract.customerPhone || cleanedGuestPhone || "",
          whatsAppAutoSend: res.contract.whatsAppAutoSend,
        };
        setCreatedContract(created);
        setIsPdfOpen(true);
        onCreated?.(created);
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
    setWhatsAppModalOpen(false);
    setWhatsAppPhoneOverride("");
    setIncludeGuestPhoneInWhatsApp(true);
    setSendWhatsAppToGuest(false);
    setCommercial(emptyCommercial());
    setIsConfirmed(true);
    setConfirmError("");
    setAdminInspectionId(null);
    setAdminInspectionSuccessMsg("");
    setAdminInspectionMode("AUTO");
    setShowDetailedChecks(false);
    syncedPrimaryGuestRef.current = "";
    const defaultCap = safeCaptains.length > 0 ? safeCaptains[0] : null;
    const defaultPlate =
      defaultCap?.assignedVehiclePlate ||
      (safeVehicles.length > 0 ? safeVehicles[0].plateNumberAr : "");

    reset({
      operationType: "",
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

  const loadingView = (
    <div className="flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--accent-gold)]/25 border-t-[var(--accent-gold)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">
          {ui("جاري تحميل بيانات الأسطول والكباتن...")}
        </p>
      </div>
    </div>
  );

  const adminPrivilegeBadge = (
    <span className="px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-sm font-bold inline-flex items-center gap-1.5">
      <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{ui("صلاحيات الإدارة (تخطي الفحص)")}</span>
    </span>
  );

  const pdfModal = createdContract && isPdfOpen && (
    <PdfPreviewModal
      isOpen={isPdfOpen}
      onClose={() => setIsPdfOpen(false)}
      contractId={createdContract.id}
      referenceNumber={createdContract.referenceNumber}
      pdfUrl={createdContract?.pdfPath}
    />
  );

  const whatsAppModal = createdContract && whatsAppModalOpen && (
    <SendWhatsAppModal
      isOpen={whatsAppModalOpen}
      onClose={() => setWhatsAppModalOpen(false)}
      type="CONTRACT"
      targetId={createdContract.id}
      targetTitle={createdContract.referenceNumber}
      recipientName={createdContract.captainName || text("الكابتن", "Captain")}
      defaultPhone={createdContract.captainPhone || ""}
      guestPhone={createdContract.customerPhone || undefined}
      guestName={createdContract.customerName || undefined}
    />
  );

  if (isLoadingCaptains) {
    return inModal ? (
      loadingView
    ) : (
      <div className="creation-workspace">{loadingView}</div>
    );
  }

  const createdView = createdContract && (
    <div className="theme-card rounded-3xl p-6 sm:p-10 border theme-border text-center space-y-5 max-w-2xl mx-auto my-8 shadow-xl">
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-500/30">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold text-[var(--text-main)]">
          {ui("تم توثيق العقد بنجاح!")}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          {ui("تم تسجيل العقد وإسناده للكابتن وتوليد وثيقة الـ PDF المعتمدة")}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 inline-block font-mono font-semibold text-[var(--accent-gold)] text-2xl tracking-wider">
        {createdContract.referenceNumber}
      </div>

      {driverPollMode && <p className="rounded-xl border theme-border p-3 text-sm">{text("تم حفظ العقد. يُرسل ملف العقد PDF واستطلاع السائق عند الإسناد وتُتابع التحديثات من صفحة واتساب.", "Contract saved. The contract PDF and driver poll dispatch on assignment; track trip updates on the WhatsApp page.")} <Link className="underline min-h-11 inline-flex items-center" href="/admin/whatsapp">{text("متابعة الرحلة", "Track trip")}</Link></p>}
      {createdContract.whatsAppAutoSend?.attempted && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs sm:text-sm text-start flex flex-wrap items-center justify-between gap-2 ${
            createdContract.whatsAppAutoSend.success
              ? "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-300"
          }`}
        >
          <div className="space-y-0.5">
            <p className="font-bold">
              {createdContract.whatsAppAutoSend.success
                ? text(
                    `تم إرسال العقد تلقائياً عبر واتساب إلى ${createdContract.whatsAppAutoSend.phone || createdContract.captainPhone || "الكابتن"}`,
                    `Contract auto-sent via WhatsApp to ${createdContract.whatsAppAutoSend.phone || createdContract.captainPhone || "captain"}`,
                  )
                : text(
                    `تم حفظ العقد، لكن تعذّر الإرسال التلقائي عبر واتساب: ${createdContract.whatsAppAutoSend.error || ""}`,
                    `Contract saved, but WhatsApp auto-send failed: ${createdContract.whatsAppAutoSend.error || ""}`,
                  )}
            </p>
            {createdContract.whatsAppAutoSend.success &&
              createdContract.whatsAppAutoSend.adminNotified && (
                <p className="text-xs opacity-90">
                  {text(
                    `تمت جدولة إشعار الإدارة (${createdContract.whatsAppAutoSend.adminPhone || "+966577842926"}). تابع سجل الأحداث لتأكيد الإرسال.`,
                    `Admin notification queued for ${createdContract.whatsAppAutoSend.adminPhone || "+966577842926"}. Check the event log for dispatch confirmation.`,
                  )}
                </p>
              )}
          </div>
          {!createdContract.whatsAppAutoSend.success && (
            <button
              type="button"
              onClick={() => setWhatsAppModalOpen(true)}
              className="min-h-9 px-3 py-1 rounded-lg border border-current/30 font-bold text-xs hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              {text("إعادة المحاولة", "Retry WhatsApp")}
            </button>
          )}
        </div>
      )}

      {createdContract.whatsAppAutoSend?.guestSend?.attempted && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs sm:text-sm text-start flex flex-wrap items-center justify-between gap-2 ${
            createdContract.whatsAppAutoSend.guestSend.success
              ? "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-300"
          }`}
        >
          <p className="font-bold">
            {createdContract.whatsAppAutoSend.guestSend.success
              ? text(
                  `تم إرسال نسخة العقد للضيف عبر واتساب (${createdContract.whatsAppAutoSend.guestSend.phone || createdContract.customerPhone || ""})`,
                  `Contract copy sent via WhatsApp to guest (${createdContract.whatsAppAutoSend.guestSend.phone || createdContract.customerPhone || ""})`,
                )
              : text(
                  `تعذّر إرسال نسخة العقد لجوال الضيف: ${createdContract.whatsAppAutoSend.guestSend.error || ""}`,
                  `Could not send contract copy to guest phone: ${createdContract.whatsAppAutoSend.guestSend.error || ""}`,
                )}
          </p>
        </div>
      )}

      <div className="pt-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsPdfOpen(true)}
          className="w-full sm:w-auto min-h-11 sm:min-h-9 px-5 py-2 rounded-xl gold-gradient-btn text-xs sm:text-sm font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          {ui("معاينة وتحميل العقد (PDF)")}
        </button>

        <button
          type="button"
          onClick={() => setWhatsAppModalOpen(true)}
          className="w-full sm:w-auto min-h-11 sm:min-h-9 px-4 py-2 rounded-xl border border-emerald-600/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold hover:bg-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          {text("إرسال عبر واتساب", "Send via WhatsApp")}
        </button>

        <button
          type="button"
          onClick={handleResetForm}
          className="w-full sm:w-auto min-h-11 sm:min-h-9 px-4 py-2 rounded-xl border theme-card text-[var(--text-main)] text-xs sm:text-sm font-bold hover:bg-[var(--bg-card-subtle)] transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          {ui("إنشاء عقد إضافي آخر")}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-11 sm:min-h-9 px-4 py-2 rounded-xl border theme-card text-[var(--text-main)] text-xs sm:text-sm font-semibold hover:bg-[var(--bg-card-subtle)] transition cursor-pointer"
          >
            {text("إغلاق النافذة", "Close")}
          </button>
        )}
      </div>
    </div>
  );

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

  const section3Count = Array.isArray(watchedPassengers)
    ? watchedPassengers.length
    : 1;
  const section3Summary = `${section3Count} ${ui("ركاب")}`;

  const section4Summary =
    effectiveCaptainInspection || adminInspectionId
      ? ui("معتمد وجاهز للتوثيق")
      : isConfirmed
        ? ui("سيتم التوثيق تلقائياً عند الحفظ")
        : ui("بانتظار التأكيد");

  const totalCommissionSummary = commissionTotalPreview(
    commercial.driverCommission,
    commercial.representativeCommission,
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
    errors.notes,
  );
  const section3Error = Boolean(errors.passengers);

  const formBody = !createdContract && (
    <form
      noValidate
      onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
      className="space-y-5 sm:space-y-6"
    >
      {serverError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-sm font-bold flex items-center gap-2 animate-shake"
        >
          <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
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
        isComplete={Boolean(
          selectedCaptainId && selectedVehiclePlate && !section1Error,
        )}
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="hidden md:flex items-center justify-between border-b theme-border pb-3">
            <h2 className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
              <Car className="w-4 h-4 text-[var(--accent-gold)]" />
              {ui("إسناد الرحلة والمركبة")}
            </h2>
            <span className="text-xs sm:text-sm text-[var(--text-muted)]">
              {ui("اختر الكابتن المتاح للرحلة وسيتم ربط مركبته تلقائياً")}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
        isComplete={Boolean(
          watchedOperationType?.trim() &&
          watchedCustomerName?.trim() &&
          watchedOrigin?.trim() &&
          watchedDestination?.trim() &&
          !section2Error,
        )}
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:border-b theme-border md:pb-3">
            <div className="hidden md:block">
              <h2 className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--accent-gold)]" />
                {ui("بيانات الرحلة والعميل الأساسي")}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                {ui("تحديد المسار والمواعيد وفق التذاكر أو الحجوزات")}
              </p>
            </div>

            {/* Quick Template Chips */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2 min-w-0">
              <span className="text-xs sm:text-sm text-[var(--text-muted)] font-bold block sm:inline me-1">
                {ui("قوالب العمليات:")}
              </span>
              <MobileHorizontalStrip
                label={ui("قوالب العمليات")}
                className="sm:flex-wrap pb-0"
              >
                {CONTRACT_QUICK_PRESETS.map((tag) => {
                  const isSelected =
                    (watchedOperationType ?? "").trim() === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setValue("operationType", isSelected ? "" : tag, {
                          shouldValidate: !isSelected || isSubmitted,
                          shouldDirty: true,
                        })
                      }
                      className={`min-h-11 sm:min-h-8 shrink-0 snap-start whitespace-nowrap text-xs sm:text-[0.8125rem] font-bold px-3 py-1 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-2xs"
                          : "bg-[var(--bg-card-subtle)] hover:bg-[var(--accent-surface)] text-[var(--text-main)] hover:text-[var(--accent-gold)] border-[var(--control-border)]"
                      }`}
                    >
                      {isSelected ? ui(tag) : `+ ${ui(tag)}`}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const currentOrig = getValues("origin") || "";
                    const currentDest = getValues("destination") || "";
                    setValue("origin", currentDest, { shouldDirty: true, shouldValidate: isSubmitted });
                    setValue("destination", currentOrig, { shouldDirty: true, shouldValidate: isSubmitted });
                  }}
                  className="min-h-11 sm:min-h-8 shrink-0 snap-start inline-flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-[0.8125rem] font-bold px-3 py-1 rounded-lg border border-[var(--accent-gold)]/45 bg-[var(--accent-surface)] text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition cursor-pointer"
                  title={text("عكس نقطة الانطلاق ووجهة الوصول", "Swap departure and destination")}
                >
                  <span>⇄</span>
                  <span>{text("عكس المسار", "Swap route")}</span>
                </button>
              </MobileHorizontalStrip>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Controller
              control={control}
              name="operationType"
              render={({ field, fieldState }) => {
                const trimmedValue = (field.value ?? "").trim();
                const resolvedLabel = trimmedValue
                  ? OPERATION_TYPE_LABELS[parseOperationType(trimmedValue)]
                  : "";
                const showPdfPreviewHint =
                  Boolean(trimmedValue) && trimmedValue !== resolvedLabel;

                return (
                  <div className="space-y-2">
                    <CustomInput
                      ref={field.ref}
                      name={field.name}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      label={ui("نوع العملية التشغيلية")}
                      required
                      expandable
                      icon={<Briefcase className="w-4 h-4 text-[var(--accent-gold)]" />}
                      placeholder={ui("بدون — اختر أو اكتب نوع العملية")}
                      clearable
                      onClear={() =>
                        setValue("operationType", "", {
                          shouldValidate: isSubmitted,
                          shouldDirty: true,
                        })
                      }
                      error={fieldState.error?.message}
                    />

                    {/* Quick Options Dropdown Selector */}
                    <div className="pt-0.5">
                      <FullscreenSelect
                        id="admin-operation-type-preset-picker"
                        name="operationTypePresetPicker"
                        label={ui("اختيار سريع من العمليات المعتمدة")}
                        searchable={false}
                        placeholder={ui("اختر نوع العملية التشغيلية...")}
                        value={
                          CONTRACT_SERVICE_OPTIONS.some((o) => o.value === trimmedValue)
                            ? trimmedValue
                            : ""
                        }
                        onChange={(val) => {
                          if (val === "CUSTOM") {
                            setValue("operationType", "", {
                              shouldValidate: isSubmitted,
                              shouldDirty: true,
                            });
                          } else if (val) {
                            setValue("operationType", val, {
                              shouldValidate: isSubmitted,
                              shouldDirty: true,
                            });
                          }
                        }}
                        options={CONTRACT_SERVICE_OPTIONS.map((opt) => ({
                          value: opt.value,
                          label: ui(opt.label),
                          description: opt.description ? ui(opt.description) : undefined,
                          badge: opt.badge ? ui(opt.badge) : undefined,
                        }))}
                      />
                    </div>

                    {showPdfPreviewHint && (
                      <p className="mt-1.5 text-xs text-[var(--text-muted)] px-1">
                        {ui("نوع التشغيل في الـ PDF:")}{" "}
                        <span className="font-bold text-[var(--text-main)]">
                          {ui(resolvedLabel)}
                        </span>
                      </p>
                    )}
                  </div>
                );
              }}
            />

            <ContractGuestFields register={register} errors={errors} />
            <ContractJourneyFields
              control={control}
              register={register}
              errors={errors}
            />

            <ContractIssueDate control={control} setValue={setValue} />

            {/* Contract Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <CustomTextarea
                label={ui("ملاحظات وتوجيهات خاصة بالعقد")}
                placeholder={ui(
                  "تعليمات الاستقبال VIP، نقطة التجمع، أو تفاصيل إضافية...",
                )}
                rows={3}
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
        isComplete={Boolean(
          Array.isArray(watchedPassengers) &&
          watchedPassengers.some((p) => p?.name?.trim()) &&
          !section3Error,
        )}
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
          className={`p-4 sm:p-5 transition-all duration-200 space-y-4 ${
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
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-[var(--accent-surface)] text-[var(--accent-gold)]"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-main)]">
                  {ui("الفحص والإقرار التشغيلي الإلزامي (التحقق قبل التوثيق)")}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                  {ui(
                    "تأكيد رسمي بمطابقة الفحص الفني للمركبة وسلامة المسار والركاب",
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isCheckingInspection ? (
                <span className="px-3 py-1 rounded-full bg-[var(--bg-card-subtle)] text-[var(--text-muted)] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-3.5 h-3.5 border-2 border-[var(--accent-gold)]/40 border-t-[var(--accent-gold)] rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  {ui("جاري التحقق من الفحص...")}
                </span>
              ) : effectiveCaptainInspection ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  {ui("تم الفحص مسبقاً من الكابتن")}
                </span>
              ) : adminInspectionId ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  {ui("تم الاعتماد والإرسال من الإدارة")}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-[var(--accent-surface)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  {ui("بانتظار الاعتماد التشغيلي")}
                </span>
              )}
            </div>
          </div>

          {/* Inspection Mode Toggle: Auto vs Manual */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-[var(--text-main)] block">
                {ui("طريقة اعتماد وتوثيق الفحص التشغيلي:")}
              </span>
              <span className="text-xs sm:text-sm text-[var(--text-muted)] block">
                {ui(
                  "اختر الاعتماد الآلي (فحص الكابتن اليومي أو اللحظة الحالية) أو التخصيص اليدوي للوقت والتاريخ",
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:inline-flex p-1 rounded-xl bg-[var(--bg-card)] border theme-border shrink-0 w-full sm:w-auto shadow-2xs gap-1">
              <button
                type="button"
                aria-pressed={adminInspectionMode === "AUTO"}
                onClick={() => setAdminInspectionMode("AUTO")}
                className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  adminInspectionMode === "AUTO"
                    ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] shadow-xs border border-[var(--accent-gold)]/40"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <Sparkles
                  className="w-4 h-4 text-[var(--accent-gold)] shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {ui("تلقائي (فحص الكابتن / الآن)")}
                </span>
              </button>

              <button
                type="button"
                aria-pressed={adminInspectionMode === "MANUAL"}
                onClick={() => setAdminInspectionMode("MANUAL")}
                className={`min-h-11 sm:min-h-9 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  adminInspectionMode === "MANUAL"
                    ? "bg-[var(--accent-surface)] text-[var(--accent-gold)] shadow-xs border border-[var(--accent-gold)]/40"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <Edit3 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{ui("يدوي (تحديد موعد مخصص)")}</span>
              </button>
            </div>
          </div>

          {/* Mode-dependent Content */}
          {adminInspectionMode === "AUTO" ? (
            effectiveCaptainInspection ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/12 dark:bg-emerald-950/45 border border-emerald-600/35 dark:border-emerald-500/35 text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">
                      {ui(
                        "تم استلام واعتماد فحص المركبة اليومي تلقائياً من الكابتن (",
                      )}
                      {currentCaptain?.name || ui("الكابتن")})
                    </span>
                    <span className="text-sm text-emerald-800 dark:text-emerald-300 block">
                      {ui("لوحة المركبة المفحوصة:")}{" "}
                      <strong className="font-mono">
                        {effectiveCaptainInspection.vehiclePlate}
                      </strong>{" "}
                      {ui("• تاريخ الفحص:")}{" "}
                      <strong className="font-mono" dir="ltr">
                        {new Date(
                          effectiveCaptainInspection.inspectionDate,
                        ).toLocaleDateString("en-GB")}
                      </strong>
                    </span>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm font-bold font-mono">
                  {ui("كود الفحص #")}
                  <bdi dir="ltr">
                    {effectiveCaptainInspection.id.slice(0, 8)}
                  </bdi>
                </span>
              </div>
            ) : adminInspectionId ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/12 dark:bg-emerald-950/45 border border-emerald-600/35 dark:border-emerald-500/35 text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">
                      {ui(
                        "تم إرسال وتوثيق الفحص التشغيلي بنجاح من إدارة العمليات",
                      )}
                    </span>
                    <span className="text-sm text-emerald-800 dark:text-emerald-300 block">
                      {ui("تم اعتماد الفحص الفني لمركبة الكابتن")}{" "}
                      {currentCaptain?.name || ""}{" "}
                      {ui("وربطه بالعقد رسمياً • تاريخ الفحص:")}{" "}
                      <strong className="font-mono" dir="ltr">
                        {new Date().toLocaleDateString("en-GB")}
                      </strong>
                    </span>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm font-bold font-mono">
                  {ui("كود الفحص #")}
                  <bdi dir="ltr">{adminInspectionId.slice(0, 8)}</bdi>
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-gold)]/30 text-[var(--text-main)] space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold block">
                      {ui("الكابتن (")}
                      {currentCaptain?.name || ui("المحدد")}
                      {ui(") لم يرسل الفحص اليومي للمركبة لهذا اليوم")}
                    </span>
                    <span className="text-sm text-[var(--text-muted)] block mt-0.5">
                      {ui(
                        "في الوضع التلقائي، سيتم اعتماد وتوثيق الفحص التشغيلي باللحظة الحالية فوراً وربطه بالعقد، أو يمكنك توثيقه مسبقاً الآن:",
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--accent-gold)]/20">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-[var(--accent-gold)] font-semibold">
                      {ui("موعد الفحص الآلي:")}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0"
                        aria-hidden="true"
                      />
                      {ui("الآن (")}
                      <span dir="ltr">
                        {new Date().toLocaleDateString("en-GB")} •{" "}
                        {new Date().toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      )
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">
                      {ui("(تسجيل الفحص باللحظة الحالية فوراً)")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendAdminInspection}
                    disabled={isSubmittingAdminInspection || !selectedCaptainId}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 min-h-11 sm:min-h-9 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold transition shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap cursor-pointer"
                    title={ui("إرسال وتوثيق الفحص التشغيلي من الإدارة الآن")}
                  >
                    {isSubmittingAdminInspection ? (
                      <>
                        <span
                          className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
                          aria-hidden="true"
                        />
                        <span>{ui("جاري التوثيق...")}</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck
                          className="w-4 h-4"
                          aria-hidden="true"
                        />
                        <span>{ui("توثيق الفحص الآن")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border theme-border space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-surface)] text-[var(--accent-gold)] flex items-center justify-center shrink-0 mt-0.5">
                  <Edit3 className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-[var(--text-main)] block">
                    {ui("تخصيص تاريخ الفحص التشغيلي المعتمد (يدوي)")}
                  </span>
                  <span className="text-xs sm:text-sm text-[var(--text-muted)] block mt-0.5">
                    {ui(
                      "حدد تاريخ الفحص التشغيلي الذي ترغب في اعتماده وربطه بمركبة الكابتن",
                    )}{" "}
                    {currentCaptain?.name || ""} {ui("في هذا العقد:")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t theme-border">
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
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 min-h-11 sm:min-h-9 rounded-lg gold-gradient-btn text-xs sm:text-sm font-bold transition shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap cursor-pointer sm:self-end"
                  title={ui("اعتماد وتوثيق الفحص التشغيلي بالتاريخ المحدد")}
                >
                  {isSubmittingAdminInspection ? (
                    <>
                      <span
                        className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
                        aria-hidden="true"
                      />
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
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {ui("تم توثيق الفحص التشغيلي برقم #")}
                    <bdi dir="ltr">{adminInspectionId.slice(0, 8)}</bdi>{" "}
                    {ui("بتاريخ:")} <bdi dir="ltr">{adminInspectionDate}</bdi>
                  </span>
                </div>
              )}
            </div>
          )}

          {adminInspectionSuccessMsg && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
              <span>{adminInspectionSuccessMsg}</span>
            </div>
          )}

          {/* High-level verification summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${isConfirmed ? "text-emerald-700 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
              />
              <span className="text-sm font-bold text-[var(--text-main)]">
                {ui("سلامة الإطارات والفرامل")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${isConfirmed ? "text-emerald-700 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
              />
              <span className="text-sm font-bold text-[var(--text-main)]">
                {ui("الأنوار وأجهزة الطوارئ")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${isConfirmed ? "text-emerald-700 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
              />
              <span className="text-sm font-bold text-[var(--text-main)]">
                {ui("مطابقة كشف الركاب")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${isConfirmed ? "text-emerald-700 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
              />
              <span className="text-sm font-bold text-[var(--text-main)]">
                {ui("جاهزية الكابتن المعتمد")}
              </span>
            </div>
          </div>

          {/* Toggle Detailed 16-check Inspection Drawer */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDetailedChecks(!showDetailedChecks)}
              className="min-h-11 text-sm font-bold text-[var(--accent-gold)] hover:underline flex items-center gap-1.5 transition cursor-pointer"
            >
              {showDetailedChecks ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>{ui("إخفاء تفاصيل بنود الفحص الفني (16 بنداً)")}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>{ui("عرض وتخصيص بنود الفحص الفني (16 بنداً)")}</span>
                </>
              )}
            </button>

            {showDetailedChecks && (
              <div className="mt-3 p-4 rounded-2xl bg-[var(--bg-card-subtle)] border theme-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-2">
                  <span className="text-sm font-bold text-[var(--text-main)]">
                    {ui("بنود الفحص الفني المعتمدة وفق اشتراطات هيئة النقل")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allPassed = Object.keys(checks).reduce(
                        (acc, k) => ({ ...acc, [k]: true }),
                        {},
                      );
                      setChecks(allPassed);
                    }}
                    className="min-h-11 text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                  >
                    {ui("تحديد الكل سليم (100%)")}
                  </button>
                </div>

                <InspectionChecklist
                  checks={checks}
                  onChange={(key, value) =>
                    setChecks((previous) => ({ ...previous, [key]: value }))
                  }
                />
              </div>
            )}
          </div>

          {/* Interactive Declaration Checkbox */}
          <label className="flex min-h-11 items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--control-border)] cursor-pointer hover:border-[var(--accent-gold)] transition shadow-2xs">
            <Checkbox
              checked={isConfirmed}
              onChange={(e) => {
                setIsConfirmed(e.target.checked);
                if (e.target.checked) setConfirmError("");
              }}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)] block leading-relaxed">
                {ui(
                  "أقر وأؤكد بأن الفحص الفني للمركبة معتمد ومكتمل، وكافة بيانات الرحلة والمسار والركاب مدخلة بدقة ومسؤولية تشغيلية كاملة.",
                )}
              </span>
              <span className="text-xs sm:text-sm text-[var(--text-muted)] block">
                {ui(
                  effectiveCaptainInspection
                    ? `* تم ربط فحص الكابتن المعتمد اليوم (كود #${effectiveCaptainInspection.id.slice(0, 8)}) بالوثيقة الرسمية.`
                    : adminInspectionId
                      ? `* تم توثيق واعتماد الفحص الفني للمركبة من الإدارة (كود #${adminInspectionId.slice(0, 8)}) وربطه بالعقد.`
                      : `* سيتم توثيق وتقديم فحص فعلي معتمد للمركبة مرتبط بالكابتن آلياً من النموذج وربطه بالعقد.`,
                )}
              </span>
            </div>
          </label>

          {confirmError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2 animate-shake"
            >
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
          hasAnyCommission(commercial),
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

      {/* Auto-Send Contract via WhatsApp + Flow Option */}
      <AutoSendWhatsAppCard
        documentType="CONTRACT"
        checked={autoSendWhatsApp}
        onCheckedChange={(next) => {
          autoSendTouchedRef.current = true;
          setAutoSendWhatsApp(next);
        }}
        phone={whatsAppPhoneOverride}
        onPhoneChange={setWhatsAppPhoneOverride}
        defaultPhoneHint={currentCaptain?.phone || ""}
        recipientLabel={text("هاتف الكابتن", "Captain Phone")}
        titleAr="إرسال العقد تلقائياً للكابتن عبر واتساب فور التوثيق"
        subtitleAr="عند التفعيل سيُرسل ملف العقد مع أزرار المتابعة التفاعلية للكابتن ويُخطر رقم الإدارة ضمن مسار التدفق دون تعطيل حفظ العقد إذا كان الواتساب غير متصل."
        waConnected={whatsAppMeta ? whatsAppMeta.connected : null}
        adminFlowPhone={whatsAppMeta?.adminFlowPhone}
        disabled={isSubmitting}
        guestPhone={watchedCustomerPhone ?? ""}
        onGuestPhoneChange={(nextPhone) =>
          setValue("customerPhone", nextPhone, {
            shouldDirty: true,
            shouldValidate: isSubmitted,
          })
        }
        includeGuestPhoneInCaptainMsg={includeGuestPhoneInWhatsApp}
        onIncludeGuestPhoneChange={setIncludeGuestPhoneInWhatsApp}
        sendToGuest={sendWhatsAppToGuest}
        onSendToGuestChange={setSendWhatsAppToGuest}
      />

      {/* Form Bottom Submission Bar */}
      <div className="contract-submit-bar">
        <p className="hidden sm:block flex-1 text-xs sm:text-sm text-[var(--text-muted)]">
          {ui("سيُحفظ العقد وتُعتمد وثيقة PDF تلقائياً بصفة ساري.")}
        </p>
        {inModal ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 sm:min-h-9 w-full sm:w-auto items-center justify-center rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-4 text-xs sm:text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-card-subtle)] transition cursor-pointer"
          >
            {ui("إلغاء والعودة")}
          </button>
        ) : (
          <Link
            href="/admin/contracts"
            className="inline-flex min-h-11 sm:min-h-9 w-full sm:w-auto items-center justify-center rounded-lg border border-[var(--control-border)] bg-[var(--bg-card)] px-4 text-xs sm:text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-card-subtle)] transition"
          >
            {ui("إلغاء والعودة")}
          </Link>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !isConfirmed}
          className="inline-flex min-h-11 sm:min-h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-lg gold-gradient-btn px-5 sm:px-6 text-xs sm:text-sm font-bold transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span
                className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
                aria-hidden="true"
              />
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
  );

  if (inModal) {
    return (
      <div className="creation-workspace max-w-[1640px] mx-auto pb-6 space-y-5">
        {createdView || formBody}
        {pdfModal}
        {whatsAppModal}
      </div>
    );
  }

  return (
    <div className="creation-workspace contract-editor space-y-5 sm:space-y-6 max-w-[1640px] mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/contracts"
              className="p-2 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-subtle)] transition"
              title={ui("رجوع لقائمة العقود")}
            >
              <ArrowRight
                className="w-4 h-4 ltr:rotate-180"
                aria-hidden="true"
              />
            </Link>
            <h1 className="text-lg sm:text-2xl font-semibold text-[var(--text-main)]">
              {ui("إنشاء وتوثيق عقد نقل رسمي")}
            </h1>
          </div>
          <p className="hidden sm:block text-xs sm:text-sm text-[var(--text-muted)] mt-1 ms-11">
            {ui(
              "إصدار عقود الرحلات الفورية وإسنادها للكباتن بصلاحيات الإدارة المباشرة",
            )}
          </p>
        </div>

        <div className="hidden sm:flex flex-wrap items-center gap-2.5">
          {adminPrivilegeBadge}
        </div>
      </div>

      {createdView || formBody}
      {pdfModal}
      {whatsAppModal}
    </div>
  );
}
