"use client";
import { inspectionMatchesDay } from "@/lib/inspection";
import { sanitizeContractPayload } from "@/lib/validations/contract";
import { useUiText } from "@/lib/ui-text";

import dynamic from "next/dynamic";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { useForm, useFieldArray, useWatch, Controller, type FieldErrors } from "react-hook-form";
import { FilePlus2, Users, Plus, Trash2, Plane, MapPin, CheckCircle2, AlertTriangle, FileText, ArrowRight, ClipboardCheck } from "lucide-react";
import { MobileCollapsibleSection, MobileHorizontalStrip } from "@/app/_components/mobile";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/languageContext";
import { getTodayInspection, getAllInspectionsList } from "@/app/_actions/inspection";
import { submitContract, ContractFormPayload } from "@/app/_actions/contract";
import { OperationType, VehicleInspection } from "@/lib/types";
import { getSaudiTodayDateStr, getSaudiCurrentTimeStr, formatOfficialDate } from "@/lib/contractConstants";
const PdfPreviewModal = dynamic(() => import("@/app/_components/PdfPreviewModal"), { ssr: false });
import { fetchCached, getCachedData, invalidateClientCache } from "@/lib/clientCache";

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

export default function CaptainContractBuilderPage() {
  const ui = useUiText();
  const { isRTL } = useLanguage();
  const fieldId = useId();

  const { user } = useAuth();

  const [todayInspection, setTodayInspection] = useState<VehicleInspection | null>(() => {
    return user ? getCachedData<Awaited<ReturnType<typeof getTodayInspection>>>(`captain_inspection_${user.id}`)?.inspection || null : null;
  });
  const [checkingInspection, setCheckingInspection] = useState(() => {
    return !user || !getCachedData<Awaited<ReturnType<typeof getTodayInspection>>>(`captain_inspection_${user.id}`);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdContract, setCreatedContract] = useState<{ id: string; referenceNumber: string; pdfPath?: string | null } | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ trip: true, passengers: true });

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
    vehiclePlate: plate ?? todayInspection?.vehiclePlate ?? user?.assignedVehiclePlate ?? "",
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
    defaultValues: buildDefaultValues(user?.assignedVehiclePlate || ""),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });

  const [watchedOperationType, watchedGuest, watchedOrigin, watchedDest] = useWatch({
    control,
    name: ["operationType", "customerName", "origin", "destination"],
  });

  const onFormInvalid = (formErrors: FieldErrors<FormValues>) => {
    const hasPassengerError = Boolean(formErrors.passengers);
    const firstTripField = (
      ["operationType", "customerName", "origin", "destination", "vehiclePlate", "tripDate", "tripTime"] as const
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
    if (user?.id) {
      fetchCached(`captain_inspection_${user.id}`, () => getTodayInspection(user.id), { ttlMs: 60_000 }).then(async (res) => {
        if (res.success && res.inspection && inspectionMatchesDay(res.inspection, getSaudiTodayDateStr(), user.assignedVehiclePlate || undefined)) {
          setTodayInspection(res.inspection);
          if (res.inspection.vehiclePlate) {
            setValue("vehiclePlate", res.inspection.vehiclePlate);
          }
          setCheckingInspection(false);
        } else {
          try {
            const listRes = await getAllInspectionsList({ captainId: user.id, limit: 1 });
            if (listRes.success && listRes.inspections?.[0] && inspectionMatchesDay(listRes.inspections[0], getSaudiTodayDateStr(), user.assignedVehiclePlate || undefined)) {
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

    if (!todayInspection || !inspectionMatchesDay(todayInspection, getSaudiTodayDateStr(), data.vehiclePlate)) {
      setFormError("يجب إتمام الفحص اليومي للمركبة أولاً");
      setIsSubmitting(false);
      return;
    }
    const payload: ContractFormPayload = sanitizeContractPayload({ ...data, captainId: user.id, issueDateMode: "AUTO", inspectionId: todayInspection.id });

    const res = await submitContract(payload);
    setIsSubmitting(false);

    if (res.success && res.contract) {
      invalidateClientCache("captain_contracts_");
      invalidateClientCache("contracts_");
      invalidateClientCache("dashboard_stats");
      invalidateClientCache("inspections_");
      setCreatedContract({ id: res.contract.id, referenceNumber: res.contract.referenceNumber, pdfPath: res.contract.pdfPath || null });
      setIsPdfOpen(true);
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

  if (checkingInspection) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-muted)]">{ui("التحقق من حالة فحص المركبة اليومي...")}</p>
        </div>
      </div>
    );
  }

  // Inspection Gating Notice
  if (!todayInspection) {
    return (
      <div className="theme-card rounded-3xl p-6 sm:p-8 border border-amber-500/30 text-center space-y-4 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          {ui("إجراء فحص المركبة اليومي إلزامي أولاً")}</h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] dark:text-slate-400 leading-relaxed">
          {ui("بناءً على اشتراطات هيئة النقل للنقل المتخصص، لا يمكن إنشاء وتوثيق عقد نقل بري جديد إلا بعد توثيق فحص المركبة اليومي (الصفحة 3 من العقد الرسمي).")}</p>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/captain"
            className="w-full sm:w-auto min-h-11 flex items-center justify-center text-center px-5 py-2.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {ui("العودة للرئيسية")}</Link>
          <Link
            href="/captain/inspection"
            className="w-full sm:w-auto min-h-11 justify-center px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center gap-2"
          >
            <ClipboardCheck className="w-4 h-4" />
            {ui("إجراء فحص المركبة الآن")}</Link>
        </div>
      </div>
    );
  }

  // Created Success View
  if (createdContract) {
    return (
      <div className="theme-card rounded-3xl p-6 sm:p-8 border theme-border text-center space-y-4 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
          {ui("تم توثيق العقد بنجاح!")}</h2>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-block font-mono font-semibold text-amber-700 dark:text-amber-400 text-lg">
          {createdContract.referenceNumber}
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] dark:text-slate-400 max-w-md mx-auto">
          {ui("تم إنشاء العقد الرسمي المكون من 3 صفحات وتضمين كشف الركاب وتقرير الفحص المعتمد. يمكنك الآن تحميل أو طباعة نسخة الـ PDF.")}</p>
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {ui("معاينة وتحميل العقد (PDF)")}</button>
          <a
            href={`/verify/contract/${encodeURIComponent(createdContract.referenceNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl border theme-card hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            {ui("صفحة التحقق الإلكتروني (QR)")}</a>
          <button
            type="button"
            onClick={() => {
              setCreatedContract(null);
              setFormError("");
              reset(buildDefaultValues(todayInspection.vehiclePlate || user?.assignedVehiclePlate || ""));
            }}
            className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {ui("+ إنشاء عقد جديد")}</button>
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
              {ui("إنشاء عقد نقل بري رسمي")}</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] dark:text-slate-400 mt-1 ms-13">
            {ui("توليد العقد المعتمد من هيئة النقل (المادتين 39 و 40) مع كشف الركاب")}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="min-h-11 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {ui("فحص المركبة معتمد (")}
              <bdi>{todayInspection.vehiclePlate}</bdi>) •{" "}
              <bdi dir="ltr">{formatOfficialDate(todayInspection.inspectionDate)}</bdi>
            </span>
          </span>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit(onFormSubmit, onFormInvalid)} className="space-y-6">
        {formError && (
          <div role="alert" className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold">
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
          hasError={Boolean(errors.operationType || errors.customerName || errors.origin || errors.destination || errors.vehiclePlate || errors.tripDate || errors.tripTime)}
          isComplete={Boolean(watchedOperationType && watchedGuest?.trim() && watchedOrigin?.trim() && watchedDest?.trim())}
        >
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className="hidden md:flex text-sm font-semibold text-slate-900 dark:text-white items-center gap-2 border-b theme-border pb-3">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>{ui("بيانات الرحلة والعملية التشغيلية (الصفحة 1 من العقد)")}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Operation Type */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-opType`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("نوع العملية التشغيلية *")}</label>
                <Controller
                  control={control}
                  name="operationType"
                  rules={{ required: "نوع العملية التشغيلية مطلوب" }}
                  render={({ field, fieldState }) => (
                    <>
                      <select
                        id={`${fieldId}-opType`}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        required
                        aria-invalid={fieldState.error ? true : undefined}
                        aria-describedby={fieldState.error ? `${fieldId}-opType-error` : undefined}
                        className={`w-full min-h-11 px-3 py-2.5 text-base sm:text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden ${
                          fieldState.error ? "border-rose-500 dark:border-rose-400" : ""
                        }`}
                      >
                        <option value="" disabled>{ui("بدون — اختر نوع العملية")}</option>
                        <option value="AIRPORT_TRANSFER">{ui("توصيل مطار (Airport Transfer)")}</option>
                        <option value="CITY_TOUR">{ui("جولة سياحية (City Tour)")}</option>
                        <option value="INTERCITY">{ui("نقل بين المدن (Intercity)")}</option>
                        <option value="HAJJ_UMRAH">{ui("نقل زوار ومعتمرين (Hajj & Umrah)")}</option>
                      </select>
                      {fieldState.error?.message && (
                        <p
                          id={`${fieldId}-opType-error`}
                          role="alert"
                          className="text-xs text-rose-700 dark:text-rose-400"
                        >
                          {ui(fieldState.error.message)}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>

              {/* Customer Name */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-customerName`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("اسم الضيف الأساسي (الطرف الثاني) *")}</label>
                <input
                  id={`${fieldId}-customerName`}
                  type="text"
                  autoComplete="name"
                  aria-invalid={errors.customerName ? true : undefined}
                  {...register("customerName", { required: true })}
                  placeholder={ui("مثال: ماجد بن فيصل الحربي")}
                  className={`w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-bold ${
                    errors.customerName ? "border-rose-500 dark:border-rose-400" : ""
                  }`}
                />
              </div>

              {/* Customer Phone */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-customerPhone`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("رقم جوال الضيف")}</label>
                <input
                  id={`${fieldId}-customerPhone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  {...register("customerPhone")}
                  placeholder="0559871234"
                  dir="ltr"
                  className="w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start font-mono"
                />
              </div>

              {/* Origin */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-origin`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("موقع الانطلاق (النقل من) *")}</label>
                <input
                  id={`${fieldId}-origin`}
                  type="text"
                  aria-invalid={errors.origin ? true : undefined}
                  {...register("origin", { required: true })}
                  placeholder={ui("مكة المكرمة (فندق العنوان جبل عمر)")}
                  className={`w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden ${
                    errors.origin ? "border-rose-500 dark:border-rose-400" : ""
                  }`}
                />
              </div>

              {/* Destination */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-destination`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("الجهة والوصول (وصولاً إلى) *")}</label>
                <input
                  id={`${fieldId}-destination`}
                  type="text"
                  aria-invalid={errors.destination ? true : undefined}
                  {...register("destination", { required: true })}
                  placeholder={ui("مطار الملك عبد العزيز بجدة (صالة 1)")}
                  className={`w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden ${
                    errors.destination ? "border-rose-500 dark:border-rose-400" : ""
                  }`}
                />
              </div>

              {/* Vehicle Plate */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-vehiclePlate`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("لوحة المركبة *")}</label>
                <input
                  id={`${fieldId}-vehiclePlate`}
                  type="text"
                  aria-invalid={errors.vehiclePlate ? true : undefined}
                  {...register("vehiclePlate", { required: true })}
                  placeholder={ui("ا ص ل 7223")}
                  className={`w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono font-bold ${
                    errors.vehiclePlate ? "border-rose-500 dark:border-rose-400" : ""
                  }`}
                />
              </div>

              {/* Trip Date */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-tripDate`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("تاريخ الرحلة *")}</label>
                <input
                  id={`${fieldId}-tripDate`}
                  type="text"
                  dir="ltr"
                  aria-invalid={errors.tripDate ? true : undefined}
                  {...register("tripDate", { required: true })}
                  placeholder="2026/09/08"
                  className={`w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start font-mono ${
                    errors.tripDate ? "border-rose-500 dark:border-rose-400" : ""
                  }`}
                />
              </div>

              {/* Trip Time */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-tripTime`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("وقت الرحلة *")}</label>
                <input
                  id={`${fieldId}-tripTime`}
                  type="text"
                  dir="ltr"
                  aria-invalid={errors.tripTime ? true : undefined}
                  {...register("tripTime", { required: true })}
                  placeholder="14:30"
                  className={`w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start font-mono ${
                    errors.tripTime ? "border-rose-500 dark:border-rose-400" : ""
                  }`}
                />
              </div>

              {/* Flight Carrier */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-flightCarrier`} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5 text-blue-500" />
                  <span>{ui("شركة الطيران (اختياري)")}</span>
                </label>
                <input
                  id={`${fieldId}-flightCarrier`}
                  type="text"
                  {...register("flightCarrier")}
                  placeholder={ui("الخطوط السعودية")}
                  className="w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Flight Number */}
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-flightNumber`} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5 text-blue-500" />
                  <span>{ui("رقم الرحلة الجوية (اختياري)")}</span>
                </label>
                <input
                  id={`${fieldId}-flightNumber`}
                  type="text"
                  {...register("flightNumber")}
                  placeholder="SV841"
                  dir="ltr"
                  className="w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start font-mono"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label htmlFor={`${fieldId}-notes`} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ui("ملاحظات إضافية على العقد")}</label>
                <input
                  id={`${fieldId}-notes`}
                  type="text"
                  {...register("notes")}
                  placeholder={ui("استقبال VIP، مياه زمزم، نقل أمتعة...")}
                  className="w-full min-h-11 px-3 py-2.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
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
          onToggle={() => setOpenSections((s) => ({ ...s, passengers: !s.passengers }))}
          hasError={Boolean(errors.passengers)}
          isComplete={fields.length > 0}
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3">
              <div className="hidden md:block">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <span>{ui("كشف الركاب المرافقين (الصفحة 2 من العقد)")}</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {ui("إدخال بيانات الضيوف بدقة لمطابقة هوياتهم الرسمية وتفادي المخالفات")}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <MobileHorizontalStrip
                  label={ui("عدد الركاب السريع")}
                  className="bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border theme-border"
                >
                  {[1, 4, 7, 12, 25, 45, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      aria-pressed={fields.length === num}
                      onClick={() => setTotalPassengers(num)}
                      className={`min-h-10 min-w-10 shrink-0 snap-start px-2.5 rounded-lg text-xs font-bold transition font-mono cursor-pointer ${
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
                  className="min-h-11 justify-center flex items-center gap-1.5 px-4 py-2 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{ui("إضافة راكب")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border theme-border flex flex-col gap-3 transition"
                >
                  {/* Mobile row header */}
                  <div className="flex items-center justify-between sm:hidden pb-2 border-b border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {index === 0 ? ui("الضيف الأساسي") : isRTL ? `الراكب ${index + 1}` : `Passenger ${index + 1}`}
                      </span>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="min-h-11 px-2.5 rounded-xl text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                        aria-label={isRTL ? `حذف الراكب ${index + 1}` : `Remove passenger ${index + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{ui("حذف")}</span>
                      </button>
                    )}
                  </div>

                  {/* Fields layout */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-bold text-xs items-center justify-center shrink-0">
                      {index + 1}
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      <div>
                        <label
                          htmlFor={`${fieldId}-p-${index}-name`}
                          className="text-xs text-[var(--text-muted)] font-bold block sm:hidden mb-1"
                        >
                          {ui("الاسم الكامل")}</label>
                        <input
                          id={`${fieldId}-p-${index}-name`}
                          type="text"
                          {...register(`passengers.${index}.name` as const)}
                          placeholder={index === 0 ? ui("اسم الضيف الأساسي") : isRTL ? `اسم الراكب ${index + 1}` : `Passenger ${index + 1} name`}
                          aria-label={index === 0 ? ui("اسم الضيف الأساسي") : isRTL ? `اسم الراكب ${index + 1}` : `Passenger ${index + 1} name`}
                          className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-bold"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`${fieldId}-p-${index}-nat`}
                          className="text-xs text-[var(--text-muted)] font-bold block sm:hidden mb-1"
                        >
                          {ui("الجنسية")}</label>
                        <input
                          id={`${fieldId}-p-${index}-nat`}
                          type="text"
                          {...register(`passengers.${index}.nationality` as const)}
                          placeholder={ui("الجنسية (مثال: سعودي)")}
                          aria-label={isRTL ? `جنسية الراكب ${index + 1}` : `Passenger ${index + 1} nationality`}
                          className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`${fieldId}-p-${index}-id`}
                          className="text-xs text-[var(--text-muted)] font-bold block sm:hidden mb-1"
                        >
                          {ui("رقم الهوية أو الجواز")}</label>
                        <input
                          id={`${fieldId}-p-${index}-id`}
                          type="text"
                          {...register(`passengers.${index}.idNumber` as const)}
                          placeholder={ui("رقم الهوية / الجواز")}
                          aria-label={isRTL ? `هوية الراكب ${index + 1}` : `Passenger ${index + 1} ID or passport`}
                          dir="ltr"
                          className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-start font-mono"
                        />
                      </div>
                    </div>

                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="hidden sm:flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 cursor-pointer"
                        aria-label={isRTL ? `حذف الراكب ${index + 1}` : `Remove passenger ${index + 1}`}
                        title={ui("حذف هذا الراكب")}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-[var(--text-muted)] font-bold text-end pt-1">
              {ui("إجمالي ركاب الرحلة:")} {fields.length}
            </div>
          </div>
        </MobileCollapsibleSection>

        {/* Submit Actions (DOM & visual order match: Cancel first, primary Submit second; inline on mobile/tablet) */}
        <div className="contract-submit-bar justify-end">
          <Link
            href="/captain"
            className="w-full sm:w-auto min-h-11 px-4 sm:px-5 rounded-xl border theme-border bg-[var(--bg-card-subtle)] text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center justify-center shrink-0"
          >
            {ui("إلغاء")}</Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-11 justify-center px-6 sm:px-8 rounded-xl gold-gradient-btn text-xs sm:text-sm font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4 shrink-0" />
            <span>{ui(isSubmitting ? "جاري توثيق وتوليد العقد..." : "اعتماد وتوثيق العقد الرسمي")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
