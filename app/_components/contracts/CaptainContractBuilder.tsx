"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldArrayWithId,
  type FieldErrors,
  type UseFieldArrayAppend,
  type UseFieldArrayRemove,
  type UseFormRegister,
} from "react-hook-form";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Globe,
  CreditCard,
  MapPin,
  Plane,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import {
  getTodayInspection,
  getAllInspectionsList,
} from "@/app/_actions/inspection";
import { submitContract, ContractFormPayload } from "@/app/_actions/contract";
import { CustomInput } from "@/app/_components/form/CustomInput";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { CustomTimePicker } from "@/app/_components/form/CustomTimePicker";
import { CustomTextarea } from "@/app/_components/form/CustomTextarea";
import {
  MobileCollapsibleSection,
  MobileHorizontalStrip,
} from "@/app/_components/mobile";
import { useAuth } from "@/lib/authContext";
import {
  fetchCached,
  getCachedData,
  invalidateClientCache,
} from "@/lib/clientCache";
import {
  formatOfficialDate,
  getSaudiCurrentTimeStr,
  getSaudiTodayDateStr,
} from "@/lib/contractConstants";
import { inspectionMatchesDay } from "@/lib/inspection";
import { useLanguage } from "@/lib/languageContext";
import { OperationType, VehicleInspection } from "@/lib/types";
import { useUiText } from "@/lib/ui-text";
import { sanitizeContractPayload } from "@/lib/validations/contract";

const PdfPreviewModal = dynamic(
  () => import("@/app/_components/PdfPreviewModal"),
  { ssr: false },
);

export interface CaptainContractBuilderProps {
  inModal?: boolean;
  onClose?: () => void;
  onCreated?: (contract: {
    id: string;
    referenceNumber: string;
    pdfPath?: string | null;
  }) => void;
}

interface FormValues {
  operationType: OperationType | "";
  customerName: string;
  customerPhone: string;
  origin: string;
  destination: string;
  tripDate: string;
  tripTime: string;
  flightCarrier: string;
  flightNumber: string;
  vehiclePlate: string;
  notes: string;
  passengers: {
    name: string;
    nationality: string;
    idNumber: string;
  }[];
}

interface CaptainPassengerManifestProps {
  fields: FieldArrayWithId<FormValues, "passengers", "id">[];
  append: UseFieldArrayAppend<FormValues, "passengers">;
  remove: UseFieldArrayRemove;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  setTotalPassengers: (target: number) => void;
}

function CaptainPassengerManifest({
  fields,
  append,
  remove,
  register,
  errors,
  setTotalPassengers,
}: CaptainPassengerManifestProps) {
  const ui = useUiText();
  const { isRTL, language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b theme-border pb-4">
        <div className="hidden md:block">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <span>{ui("كشف الركاب المرافقين (الصفحة 2 من العقد)")}</span>
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {ui(
              "إدخال بيانات الضيوف بدقة لمطابقة هوياتهم الرسمية وتفادي المخالفات",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <MobileHorizontalStrip
            label={ui("عدد الركاب السريع")}
            className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border theme-border"
          >
            {[1, 4, 7, 12, 25, 45, 50].map((num) => (
              <button
                key={num}
                type="button"
                aria-pressed={fields.length === num}
                onClick={() => setTotalPassengers(num)}
                className={`min-h-11 min-w-11 shrink-0 snap-start px-3 rounded-lg text-sm font-bold transition font-mono cursor-pointer ${
                  fields.length === num
                    ? "bg-amber-700 text-white shadow-2xs"
                    : "text-[var(--text-muted)] dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300"
                }`}
                title={isRTL ? `${num} راكب` : `${num} passengers`}
              >
                {num}
              </button>
            ))}
          </MobileHorizontalStrip>

          <button
            type="button"
            onClick={() => {
              if (fields.length < 50) {
                append({ name: "", nationality: "", idNumber: "" });
              }
            }}
            disabled={fields.length >= 50}
            className="min-h-11 justify-center flex items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-sm font-bold transition shadow-xs disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{ui("إضافة راكب")}</span>
          </button>
        </div>
      </div>

      <div className="space-y-3.5">
        {fields.map((field, index) => {
          const isPrimary = index === 0;
          const passengerError = errors.passengers?.[index];

          return (
            <div
              key={field.id}
              className={`p-4 sm:p-5 rounded-2xl border transition ${
                isPrimary
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-slate-50/70 dark:bg-slate-900/50 theme-border hover:border-amber-500/30"
              }`}
            >
              {/* Mobile row header */}
              <div className="flex items-center justify-between sm:hidden pb-2.5 mb-3 border-b theme-border">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg font-mono font-bold text-sm flex items-center justify-center ${
                      isPrimary
                        ? "gold-gradient-btn"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {isPrimary
                      ? ui("الضيف الأساسي")
                      : text(`الراكب ${index + 1}`, `Passenger ${index + 1}`)}
                  </span>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="min-h-11 px-3 rounded-xl text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1.5 text-sm font-bold cursor-pointer"
                    aria-label={
                      isRTL
                        ? `حذف الراكب ${index + 1}`
                        : `Remove passenger ${index + 1}`
                    }
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>{ui("حذف")}</span>
                  </button>
                )}
              </div>

              {/* Fields layout */}
              <div className="flex items-start gap-3">
                <div
                  aria-hidden="true"
                  className={`hidden sm:flex w-9 h-9 rounded-xl font-mono font-bold text-sm items-center justify-center shrink-0 mt-7 ${
                    isPrimary
                      ? "gold-gradient-btn shadow-2xs"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <CustomInput
                    label={
                      isPrimary
                        ? text("الاسم الكامل", "Full name")
                        : text(
                            `اسم الراكب ${index + 1}`,
                            `Passenger ${index + 1} name`,
                          )
                    }
                    icon={<User className="w-4 h-4" />}
                    placeholder={
                      isPrimary
                        ? ui("اسم الضيف الأساسي")
                        : isRTL
                          ? `اسم الراكب ${index + 1}`
                          : `Passenger ${index + 1} name`
                    }
                    expandable
                    className="font-bold"
                    {...register(`passengers.${index}.name` as const)}
                    error={passengerError?.name?.message}
                  />

                  <CustomInput
                    label={text("الجنسية", "Nationality")}
                    icon={<Globe className="w-4 h-4" />}
                    placeholder={ui("الجنسية (مثال: سعودي)")}
                    expandable
                    {...register(`passengers.${index}.nationality` as const)}
                    error={passengerError?.nationality?.message}
                  />

                  <CustomInput
                    label={text("رقم الهوية أو الجواز", "ID / Passport number")}
                    icon={<CreditCard className="w-4 h-4" />}
                    placeholder={ui("رقم الهوية / الجواز")}
                    dir="ltr"
                    expandable
                    className="text-start font-mono"
                    {...register(`passengers.${index}.idNumber` as const)}
                    error={passengerError?.idNumber?.message}
                  />
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="hidden sm:flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 mt-7 cursor-pointer"
                    aria-label={
                      isRTL
                        ? `حذف الراكب ${index + 1}`
                        : `Remove passenger ${index + 1}`
                    }
                    title={ui("حذف هذا الراكب")}
                  >
                    <Trash2 className="w-4.5 h-4.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-sm text-[var(--text-muted)] font-bold text-end pt-2 border-t theme-border">
        {ui("إجمالي ركاب الرحلة:")}{" "}
        <span className="font-mono text-amber-700 dark:text-amber-400">
          {fields.length}
        </span>
      </div>
    </div>
  );
}

export default function CaptainContractBuilder({
  inModal = false,
  onClose,
  onCreated,
}: CaptainContractBuilderProps) {
  const ui = useUiText();
  const { isRTL, language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  const fieldId = useId();
  const { user } = useAuth();

  const [todayInspection, setTodayInspection] =
    useState<VehicleInspection | null>(() => {
      return user
        ? getCachedData<Awaited<ReturnType<typeof getTodayInspection>>>(
            `captain_inspection_${user.id}`,
          )?.inspection || null
        : null;
    });
  const [checkingInspection, setCheckingInspection] = useState(() => {
    return (
      !user ||
      !getCachedData<Awaited<ReturnType<typeof getTodayInspection>>>(
        `captain_inspection_${user.id}`,
      )
    );
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdContract, setCreatedContract] = useState<{
    id: string;
    referenceNumber: string;
    pdfPath?: string | null;
  } | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    trip: true,
    passengers: true,
  });

  const buildDefaultValues = (plate?: string): FormValues => ({
    operationType: "",
    customerName: "",
    customerPhone: "",
    origin: "مكة المكرمة",
    destination: "مطار الملك عبد العزيز بجدة",
    tripDate: getSaudiTodayDateStr(),
    tripTime: getSaudiCurrentTimeStr(),
    flightCarrier: "الخطوط السعودية",
    flightNumber: "",
    vehiclePlate:
      plate ??
      todayInspection?.vehiclePlate ??
      user?.assignedVehiclePlate ??
      "",
    notes: "",
    passengers: [{ name: "", nationality: "", idNumber: "" }],
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    shouldUnregister: false,
    defaultValues: buildDefaultValues(user?.assignedVehiclePlate || ""),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });

  const [watchedOperationType, watchedGuest, watchedOrigin, watchedDest] =
    useWatch({
      control,
      name: ["operationType", "customerName", "origin", "destination"],
    });

  const onFormInvalid = (formErrors: FieldErrors<FormValues>) => {
    const hasPassengerError = Boolean(formErrors.passengers);
    const firstTripField = (
      [
        "operationType",
        "customerName",
        "origin",
        "destination",
        "vehiclePlate",
        "tripDate",
        "tripTime",
      ] as const
    ).find((name) => Boolean(formErrors[name]));
    const hasTripError = Boolean(firstTripField);
    setOpenSections((prev) => ({
      trip: prev.trip || hasTripError,
      passengers: prev.passengers || hasPassengerError,
    }));
    setFormError("يرجى استكمال الحقول الإلزامية المطلوبة قبل اعتماد العقد.");
    if (firstTripField) {
      window.setTimeout(() => setFocus(firstTripField), 40);
    }
  };

  useEffect(() => {
    void import("@/app/_components/PdfPreviewModal");
    if (user?.id) {
      fetchCached(
        `captain_inspection_${user.id}`,
        () => getTodayInspection(user.id),
        { ttlMs: 60_000 },
      ).then(async (res) => {
        if (
          res.success &&
          res.inspection &&
          inspectionMatchesDay(
            res.inspection,
            getSaudiTodayDateStr(),
            user.assignedVehiclePlate || undefined,
          )
        ) {
          setTodayInspection(res.inspection);
          if (res.inspection.vehiclePlate) {
            setValue("vehiclePlate", res.inspection.vehiclePlate);
          }
          setCheckingInspection(false);
        } else {
          try {
            const listRes = await getAllInspectionsList({
              captainId: user.id,
              limit: 1,
            });
            if (
              listRes.success &&
              listRes.inspections?.[0] &&
              inspectionMatchesDay(
                listRes.inspections[0],
                getSaudiTodayDateStr(),
                user.assignedVehiclePlate || undefined,
              )
            ) {
              setTodayInspection(listRes.inspections[0]);
              if (listRes.inspections[0].vehiclePlate) {
                setValue("vehiclePlate", listRes.inspections[0].vehiclePlate);
              }
            }
          } catch (e) {
            console.error("Failed to load fallback inspection:", e);
          } finally {
            setCheckingInspection(false);
          }
        }
      });
    }
  }, [user, setValue]);

  const onFormSubmit = async (data: FormValues) => {
    if (!user) return;
    if (!data.operationType) {
      setFormError("نوع العملية التشغيلية مطلوب");
      setOpenSections((prev) => ({ ...prev, trip: true }));
      window.setTimeout(() => setFocus("operationType"), 40);
      return;
    }
    if (!data.customerName.trim()) {
      setFormError("اسم الضيف الأساسي مطلوب");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    if (
      !todayInspection ||
      !inspectionMatchesDay(
        todayInspection,
        getSaudiTodayDateStr(),
        data.vehiclePlate,
      )
    ) {
      setFormError("يجب إتمام الفحص اليومي للمركبة أولاً");
      setIsSubmitting(false);
      return;
    }
    const payload: ContractFormPayload = sanitizeContractPayload({
      ...data,
      captainId: user.id,
      issueDateMode: "AUTO",
      inspectionId: todayInspection.id,
    });

    const res = await submitContract(payload);
    setIsSubmitting(false);

    if (res.success && res.contract) {
      invalidateClientCache("captain_contracts_");
      invalidateClientCache("contracts_");
      invalidateClientCache("dashboard_stats");
      invalidateClientCache("inspections_");
      const created = {
        id: res.contract.id,
        referenceNumber: res.contract.referenceNumber,
        pdfPath: res.contract.pdfPath || null,
      };
      setCreatedContract(created);
      setIsPdfOpen(true);
      onCreated?.(created);
    } else {
      setFormError(res.error || "فشل إنشاء العقد");
    }
  };

  const setTotalPassengers = (target: number) => {
    const nextCount = Math.max(1, Math.min(50, Math.floor(target)));
    const currentCount = fields.length;

    if (nextCount > currentCount) {
      const diff = nextCount - currentCount;
      const newItems = Array.from({ length: diff }, () => ({
        name: "",
        nationality: "",
        idNumber: "",
      }));
      append(newItems);
    } else if (nextCount < currentCount) {
      for (let i = currentCount - 1; i >= nextCount; i--) {
        remove(i);
      }
    }
  };

  const inspectionBadge = todayInspection ? (
    <span className="min-h-10 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-sm font-bold inline-flex items-center gap-1.5">
      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        {ui("فحص المركبة معتمد (")}
        <bdi>{todayInspection.vehiclePlate}</bdi>) •{" "}
        <bdi dir="ltr">
          {formatOfficialDate(todayInspection.inspectionDate)}
        </bdi>
      </span>
    </span>
  ) : undefined;

  const pdfModal = createdContract && isPdfOpen && (
    <PdfPreviewModal
      isOpen={isPdfOpen}
      onClose={() => setIsPdfOpen(false)}
      contractId={createdContract.id}
      referenceNumber={createdContract.referenceNumber}
      pdfUrl={createdContract?.pdfPath}
    />
  );

  const loadingView = (
    <div className="flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm sm:text-base text-[var(--text-muted)]">
          {ui("التحقق من حالة فحص المركبة اليومي...")}
        </p>
      </div>
    </div>
  );

  const gatingView = !checkingInspection && !todayInspection && (
    <div className="theme-card rounded-3xl p-6 sm:p-10 border border-amber-500/30 text-center space-y-5 max-w-2xl mx-auto my-8 shadow-lg">
      <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
        <AlertTriangle className="w-8 h-8" aria-hidden="true" />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
        {ui("إجراء فحص المركبة اليومي إلزامي أولاً")}
      </h2>
      <p className="text-sm sm:text-base text-[var(--text-muted)] dark:text-slate-400 leading-relaxed">
        {ui(
          "بناءً على اشتراطات هيئة النقل للنقل المتخصص، لا يمكن إنشاء وتوثيق عقد نقل بري جديد إلا بعد توثيق فحص المركبة اليومي (الصفحة 3 من العقد الرسمي).",
        )}
      </p>
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        {inModal ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-12 flex items-center justify-center text-center px-6 py-2.5 rounded-xl border theme-card text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {ui("إغلاق")}
          </button>
        ) : (
          <Link
            href="/captain"
            className="w-full sm:w-auto min-h-12 flex items-center justify-center text-center px-6 py-2.5 rounded-xl border theme-card text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {ui("العودة للرئيسية")}
          </Link>
        )}
        <Link
          href="/captain/inspection"
          className="w-full sm:w-auto min-h-12 justify-center px-6 py-2.5 rounded-xl gold-gradient-btn text-sm font-bold transition shadow-md flex items-center gap-2"
        >
          <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
          {ui("إجراء فحص المركبة الآن")}
        </Link>
      </div>
    </div>
  );

  const createdView = createdContract && (
    <div className="theme-card rounded-3xl p-6 sm:p-10 border theme-border text-center space-y-5 max-w-2xl mx-auto my-8 shadow-xl">
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
        <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
        {ui("تم توثيق العقد بنجاح!")}
      </h2>
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-block font-mono font-semibold text-amber-700 dark:text-amber-400 text-2xl tracking-wider">
        {createdContract.referenceNumber}
      </div>
      <p className="text-sm sm:text-base text-[var(--text-muted)] dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
        {ui(
          "تم إنشاء العقد الرسمي المكون من 3 صفحات وتضمين كشف الركاب وتقرير الفحص المعتمد. يمكنك الآن تحميل أو طباعة نسخة الـ PDF.",
        )}
      </p>
      <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsPdfOpen(true)}
          className="w-full sm:w-auto min-h-12 px-6 py-2.5 rounded-xl gold-gradient-btn text-sm sm:text-base font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
          {ui("معاينة وتحميل العقد (PDF)")}
        </button>
        <a
          href={`/verify/contract/${encodeURIComponent(createdContract.referenceNumber)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto min-h-12 px-5 py-2.5 rounded-xl border theme-card hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 text-sm sm:text-base font-bold transition flex items-center justify-center gap-2"
        >
          <CheckCircle2
            className="w-4 h-4 text-emerald-500"
            aria-hidden="true"
          />
          {ui("صفحة التحقق الإلكتروني (QR)")}
        </a>
        <button
          type="button"
          onClick={() => {
            setCreatedContract(null);
            setFormError("");
            reset(
              buildDefaultValues(
                todayInspection?.vehiclePlate ||
                  user?.assignedVehiclePlate ||
                  "",
              ),
            );
          }}
          className="w-full sm:w-auto min-h-12 px-5 py-2.5 rounded-xl border theme-card text-sm sm:text-base font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          {ui("+ إنشاء عقد جديد")}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-12 px-5 py-2.5 rounded-xl border theme-card text-sm sm:text-base font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {text("إغلاق النافذة", "Close")}
          </button>
        )}
      </div>
    </div>
  );

  const formBody = !checkingInspection &&
    todayInspection &&
    !createdContract && (
      <form
        noValidate
        onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
        className="space-y-5 sm:space-y-6"
      >
        {formError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm font-bold"
          >
            {ui(formError)}
          </div>
        )}

        {/* Section 1: Trip & Operations Details */}
        <MobileCollapsibleSection
          stepNumber={1}
          title={ui("بيانات الرحلة والعملية التشغيلية")}
          summary={
            watchedGuest?.trim()
              ? `${watchedGuest} · ${watchedOrigin || ""} ${isRTL ? "←" : "→"} ${watchedDest || ""}`
              : ui("المسار، الموعد، بيانات الضيف")
          }
          isOpen={openSections.trip}
          onToggle={() => setOpenSections((s) => ({ ...s, trip: !s.trip }))}
          hasError={Boolean(
            errors.operationType ||
            errors.customerName ||
            errors.origin ||
            errors.destination ||
            errors.vehiclePlate ||
            errors.tripDate ||
            errors.tripTime,
          )}
          isComplete={Boolean(
            watchedOperationType &&
            watchedGuest?.trim() &&
            watchedOrigin?.trim() &&
            watchedDest?.trim(),
          )}
        >
          <div className="p-4 sm:p-6 space-y-5">
            <h2 className="hidden md:flex text-base sm:text-lg font-semibold text-slate-900 dark:text-white items-center gap-2 border-b theme-border pb-3">
              <MapPin
                className="w-5 h-5 text-amber-500"
                aria-hidden="true"
              />
              <span>
                {ui("بيانات الرحلة والعملية التشغيلية (الصفحة 1 من العقد)")}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Operation Type */}
              <Controller
                control={control}
                name="operationType"
                rules={{ required: "نوع العملية التشغيلية مطلوب" }}
                render={({ field, fieldState }) => (
                  <FullscreenSelect
                    id={`${fieldId}-opType`}
                    name={field.name}
                    buttonRef={field.ref}
                    label={ui("نوع العملية التشغيلية *")}
                    required
                    searchable={false}
                    placeholder={ui("بدون — اختر نوع العملية")}
                    value={field.value}
                    onChange={(nextValue) => field.onChange(nextValue)}
                    onBlur={field.onBlur}
                    ariaInvalid={fieldState.error ? true : undefined}
                    error={
                      fieldState.error?.message
                        ? ui(fieldState.error.message)
                        : undefined
                    }
                    options={[
                      {
                        value: "",
                        label: ui("بدون — اختر نوع العملية"),
                        disabled: true,
                      },
                      {
                        value: "AIRPORT_TRANSFER",
                        label: ui("توصيل مطار (Airport Transfer)"),
                      },
                      {
                        value: "CITY_TOUR",
                        label: ui("جولة سياحية (City Tour)"),
                      },
                      {
                        value: "INTERCITY",
                        label: ui("نقل بين المدن (Intercity)"),
                      },
                      {
                        value: "HAJJ_UMRAH",
                        label: ui("نقل زوار ومعتمرين (Hajj & Umrah)"),
                      },
                    ]}
                  />
                )}
              />

              {/* Customer Name */}
              <CustomInput
                id={`${fieldId}-customerName`}
                label={ui("اسم الضيف الأساسي (الطرف الثاني) *")}
                required
                expandable
                autoComplete="name"
                placeholder={ui("مثال: ماجد بن فيصل الحربي")}
                className="font-bold"
                {...register("customerName", { required: true })}
                error={
                  errors.customerName
                    ? ui("اسم الضيف الأساسي مطلوب")
                    : undefined
                }
              />

              {/* Customer Phone */}
              <CustomInput
                id={`${fieldId}-customerPhone`}
                label={ui("رقم جوال الضيف")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                expandable
                dir="ltr"
                placeholder="0559871234"
                className="text-start font-mono"
                {...register("customerPhone")}
              />

              {/* Origin */}
              <CustomInput
                id={`${fieldId}-origin`}
                label={ui("موقع الانطلاق (النقل من) *")}
                required
                expandable
                placeholder={ui("مكة المكرمة (فندق العنوان جبل عمر)")}
                {...register("origin", { required: true })}
                aria-invalid={errors.origin ? true : undefined}
                className={
                  errors.origin ? "border-rose-600 dark:border-rose-400" : ""
                }
              />

              {/* Destination */}
              <CustomInput
                id={`${fieldId}-destination`}
                label={ui("الجهة والوصول (وصولاً إلى) *")}
                required
                expandable
                placeholder={ui("مطار الملك عبد العزيز بجدة (صالة 1)")}
                {...register("destination", { required: true })}
                aria-invalid={errors.destination ? true : undefined}
                className={
                  errors.destination
                    ? "border-rose-600 dark:border-rose-400"
                    : ""
                }
              />

              {/* Vehicle Plate */}
              <CustomInput
                id={`${fieldId}-vehiclePlate`}
                label={ui("لوحة المركبة *")}
                required
                expandable
                placeholder={ui("ا ص ل 7223")}
                className={`font-mono font-bold ${errors.vehiclePlate ? "border-rose-600 dark:border-rose-400" : ""}`}
                {...register("vehiclePlate", { required: true })}
                aria-invalid={errors.vehiclePlate ? true : undefined}
              />

              {/* Trip Date */}
              <Controller
                control={control}
                name="tripDate"
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <CustomDatePicker
                    id={`${fieldId}-tripDate`}
                    buttonRef={field.ref}
                    label={ui("تاريخ الرحلة *")}
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={
                      fieldState.error ? ui("تاريخ الرحلة مطلوب") : undefined
                    }
                  />
                )}
              />

              {/* Trip Time */}
              <Controller
                control={control}
                name="tripTime"
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <CustomTimePicker
                    id={`${fieldId}-tripTime`}
                    buttonRef={field.ref}
                    label={ui("وقت الرحلة *")}
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={
                      fieldState.error ? ui("وقت الرحلة مطلوب") : undefined
                    }
                  />
                )}
              />

              {/* Flight Carrier */}
              <CustomInput
                id={`${fieldId}-flightCarrier`}
                label={ui("شركة الطيران (اختياري)")}
                expandable
                icon={<Plane className="w-4 h-4 text-blue-500" />}
                placeholder={ui("الخطوط السعودية")}
                {...register("flightCarrier")}
              />

              {/* Flight Number */}
              <CustomInput
                id={`${fieldId}-flightNumber`}
                label={ui("رقم الرحلة الجوية (اختياري)")}
                expandable
                dir="ltr"
                icon={<Plane className="w-4 h-4 text-blue-500" />}
                placeholder="SV841"
                className="text-start font-mono"
                {...register("flightNumber")}
              />

              {/* Notes */}
              <div className="sm:col-span-2 lg:col-span-3">
                <CustomTextarea
                  id={`${fieldId}-notes`}
                  label={ui("ملاحظات إضافية على العقد")}
                  placeholder={ui("استقبال VIP، مياه زمزم، نقل أمتعة...")}
                  rows={3}
                  {...register("notes")}
                />
              </div>
            </div>
          </div>
        </MobileCollapsibleSection>

        {/* Section 2: Dynamic Passenger Manifest */}
        <MobileCollapsibleSection
          stepNumber={2}
          title={ui("كشف الركاب المرافقين")}
          summary={`${fields.length} ${ui("راكب")}`}
          isOpen={openSections.passengers}
          onToggle={() =>
            setOpenSections((s) => ({ ...s, passengers: !s.passengers }))
          }
          hasError={Boolean(errors.passengers)}
          isComplete={fields.length > 0}
        >
          <CaptainPassengerManifest
            fields={fields}
            append={append}
            remove={remove}
            register={register}
            errors={errors}
            setTotalPassengers={setTotalPassengers}
          />
        </MobileCollapsibleSection>

        {/* Submit Actions */}
        <div className="contract-submit-bar justify-end">
          {inModal ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-12 px-5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center justify-center shrink-0 cursor-pointer"
            >
              {ui("إلغاء")}
            </button>
          ) : (
            <Link
              href="/captain"
              className="w-full sm:w-auto min-h-12 px-5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center justify-center shrink-0"
            >
              {ui("إلغاء")}
            </Link>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-12 justify-center px-6 sm:px-8 rounded-xl gold-gradient-btn text-sm sm:text-base font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <FilePlus2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>
              {ui(
                isSubmitting
                  ? "جاري توثيق وتوليد العقد..."
                  : "اعتماد وتوثيق العقد الرسمي",
              )}
            </span>
          </button>
        </div>
      </form>
    );

  const stageContent = checkingInspection
    ? loadingView
    : gatingView || createdView || formBody;

  if (inModal) {
    return (
      <div className="creation-workspace max-w-[1600px] mx-auto pb-6 space-y-5">
        {stageContent}
        {pdfModal}
      </div>
    );
  }

  return (
    <div className="creation-workspace space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/captain"
              aria-label={ui("العودة للرئيسية")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-card-subtle)] hover:text-slate-700 dark:hover:text-white transition"
            >
              <ArrowRight
                className="w-5 h-5 ltr:rotate-180"
                aria-hidden="true"
              />
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {ui("إنشاء عقد نقل بري رسمي")}
            </h1>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1 ms-13">
            {ui(
              "توليد العقد المعتمد من هيئة النقل (المادتين 39 و 40) مع كشف الركاب",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {inspectionBadge}
        </div>
      </div>

      {stageContent}
      {pdfModal}
    </div>
  );
}
