"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import {
  FilePlus2,
  Users,
  Plus,
  Trash2,
  Plane,
  MapPin,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { getCaptains } from "@/app/_actions/captain";
import { submitContract, ContractFormPayload } from "@/app/_actions/contract";
import { OperationType, SystemUser } from "@/lib/types";
import PdfPreviewModal from "@/app/_components/PdfPreviewModal";

interface FormValues {
  operationType: OperationType;
  customerName: string;
  customerPhone: string;
  origin: string;
  destination: string;
  tripDate: string;
  tripTime: string;
  flightCarrier: string;
  flightNumber: string;
  captainId: string;
  vehiclePlate: string;
  notes: string;
  passengers: {
    name: string;
    nationality: string;
    idNumber: string;
  }[];
}

export default function AdminContractBuilderPage() {
  const router = useRouter();

  const [captains, setCaptains] = useState<SystemUser[]>([]);
  const [isLoadingCaptains, setIsLoadingCaptains] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdContract, setCreatedContract] = useState<{ id: string; referenceNumber: string } | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "/");
  const timeNow = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      operationType: "AIRPORT_TRANSFER",
      customerName: "",
      customerPhone: "",
      origin: "مكة المكرمة",
      destination: "مطار الملك عبد العزيز بجدة",
      tripDate: todayStr,
      tripTime: timeNow,
      flightCarrier: "الخطوط السعودية",
      flightNumber: "",
      captainId: "",
      vehiclePlate: "",
      notes: "",
      passengers: [
        { name: "", nationality: "سعودي", idNumber: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });

  useEffect(() => {
    getCaptains().then((res) => {
      if (res.success && res.captains) {
        setCaptains(res.captains);
        if (res.captains.length > 0) {
          setValue("captainId", res.captains[0].id);
          setValue("vehiclePlate", res.captains[0].assignedVehiclePlate || "");
        }
      }
      setIsLoadingCaptains(false);
    });
  }, [setValue]);

  // When captainId changes, automatically update the vehicle plate
  const selectedCaptainId = watch("captainId");
  useEffect(() => {
    if (selectedCaptainId && captains.length > 0) {
      const cap = captains.find(c => c.id === selectedCaptainId);
      if (cap && cap.assignedVehiclePlate) {
        setValue("vehiclePlate", cap.assignedVehiclePlate);
      }
    }
  }, [selectedCaptainId, captains, setValue]);


  const onFormSubmit = async (data: FormValues) => {
    if (!data.customerName.trim()) {
      setFormError("اسم الضيف الأساسي مطلوب");
      return;
    }
    if (!data.captainId) {
      setFormError("يجب اختيار كابتن للرحلة");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const payload: ContractFormPayload = {
      operationType: data.operationType,
      origin: data.origin.trim(),
      destination: data.destination.trim(),
      tripDate: data.tripDate,
      tripTime: data.tripTime,
      flightCarrier: data.flightCarrier?.trim() || undefined,
      flightNumber: data.flightNumber?.trim() || undefined,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      captainId: data.captainId,
      vehiclePlate: data.vehiclePlate.trim() || "ا ص ل 7223",
      // Note: Admin bypasses the inspection requirement
      inspectionId: undefined, 
      passengers: data.passengers.map((p) => ({
        name: p.name.trim(),
        nationality: p.nationality.trim() || "سعودي",
        idNumber: p.idNumber.trim(),
      })),
    };

    const res = await submitContract(payload);
    setIsSubmitting(false);

    if (res.success && res.contract) {
      setCreatedContract({
        id: res.contract.id,
        referenceNumber: res.contract.referenceNumber,
      });
    } else {
      setFormError(res.error || "فشل إنشاء العقد");
    }
  };

  const addFivePassengers = () => {
    for (let i = 0; i < 5; i++) {
      append({ name: "", nationality: "سعودي", idNumber: "" });
    }
  };

  if (isLoadingCaptains) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // Created Success View
  if (createdContract) {
    return (
      <div className="theme-card rounded-3xl p-6 sm:p-8 border theme-border text-center space-y-4 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          تم توثيق العقد بنجاح!
        </h2>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-block font-mono font-black text-amber-600 dark:text-amber-400 text-lg">
          {createdContract.referenceNumber}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          تم إنشاء العقد الرسمي وإسناده للكابتن. يمكنك الآن تحميل أو طباعة نسخة الـ PDF.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            onClick={() => setIsPdfOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            معاينة وتحميل العقد (PDF)
          </button>
          <button
            onClick={() => {
              setCreatedContract(null);
              setValue("customerName", "");
              setValue("customerPhone", "");
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            + إنشاء عقد جديد آخر
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/contracts"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              إنشاء عقد نقل جديد (صلاحيات الإدارة)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mr-7">
            إنشاء وإسناد عقد رحلة بشكل مباشر لأحد الكباتن بدون اشتراط الفحص اليومي
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            نمط الإدارة الاستثنائي
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
            {formError}
          </div>
        )}

        {/* Section 1: Trip & Operations Details */}
        <div className="theme-card p-6 rounded-2xl border theme-border space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b theme-border pb-3">
            <MapPin className="w-4 h-4 text-amber-500" />
            بيانات الرحلة وإسناد الكابتن
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Captain Selection */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-bold text-amber-700 dark:text-amber-500">
                إسناد الرحلة للكابتن *
              </label>
              <select
                {...register("captainId", { required: true })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 font-bold focus:border-amber-500 focus:outline-hidden"
              >
                {captains.map((cap) => (
                  <option key={cap.id} value={cap.id}>
                    {cap.name} ({cap.assignedVehiclePlate || "بدون مركبة"})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Plate */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                لوحة المركبة *
              </label>
              <input
                type="text"
                {...register("vehiclePlate", { required: true })}
                placeholder="ا ص ل 7223"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono font-bold"
              />
            </div>

            {/* Operation Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                نوع العملية التشغيلية *
              </label>
              <select
                {...register("operationType", { required: true })}
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
              >
                <option value="AIRPORT_TRANSFER">توصيل مطار (Airport Transfer)</option>
                <option value="CITY_TOUR">جولة سياحية (City Tour)</option>
                <option value="INTERCITY">نقل بين المدن (Intercity)</option>
                <option value="HAJJ_UMRAH">نقل زوار ومعتمرين (Hajj & Umrah)</option>
              </select>
            </div>

            {/* Customer Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                اسم الضيف الأساسي (الطرف الثاني) *
              </label>
              <input
                type="text"
                {...register("customerName", { required: true })}
                placeholder="مثال: ماجد بن فيصل الحربي"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-bold"
              />
            </div>

            {/* Customer Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                رقم جوال الضيف
              </label>
              <input
                type="tel"
                {...register("customerPhone")}
                placeholder="0559871234"
                dir="ltr"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right font-mono"
              />
            </div>

            {/* Origin */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                موقع الانطلاق (النقل من) *
              </label>
              <input
                type="text"
                {...register("origin", { required: true })}
                placeholder="مكة المكرمة (فندق العنوان جبل عمر)"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Destination */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الجهة والوصول (وصولاً إلى) *
              </label>
              <input
                type="text"
                {...register("destination", { required: true })}
                placeholder="مطار الملك عبد العزيز بجدة (صالة 1)"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Trip Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                تاريخ الرحلة *
              </label>
              <input
                type="text"
                {...register("tripDate", { required: true })}
                placeholder="2026/09/08"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono"
              />
            </div>

            {/* Trip Time */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                وقت الرحلة *
              </label>
              <input
                type="text"
                {...register("tripTime", { required: true })}
                placeholder="14:30"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-mono"
              />
            </div>

            {/* Flight Carrier */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Plane className="w-3.5 h-3.5 text-blue-500" />
                شركة الطيران (اختياري)
              </label>
              <input
                type="text"
                {...register("flightCarrier")}
                placeholder="الخطوط السعودية"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Flight Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Plane className="w-3.5 h-3.5 text-blue-500" />
                رقم الرحلة الجوية (اختياري)
              </label>
              <input
                type="text"
                {...register("flightNumber")}
                placeholder="SV841"
                dir="ltr"
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right font-mono"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ملاحظات إضافية على العقد
              </label>
              <input
                type="text"
                {...register("notes")}
                placeholder="استقبال VIP، مياه زمزم، نقل أمتعة..."
                className="w-full px-3 py-2 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic Passenger Manifest */}
        <div className="theme-card p-4 sm:p-6 rounded-2xl border theme-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                كشف الركاب المرافقين
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إدخال بيانات الضيوف بدقة لمطابقة هوياتهم الرسمية وتفادي المخالفات
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={addFivePassengers}
                className="flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-xl border theme-card hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
              >
                + إضافة 5 ركاب
              </button>
              <button
                type="button"
                onClick={() => append({ name: "", nationality: "سعودي", idNumber: "" })}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة راكب
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
                    <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {index === 0 ? "الضيف الأساسي" : `الراكب ${index + 1}`}
                    </span>
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1 text-[11px] font-bold"
                      title="حذف هذا الراكب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
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
                      <label className="text-[10px] text-slate-400 font-bold block sm:hidden mb-1">
                        الاسم الكامل
                      </label>
                      <input
                        type="text"
                        {...register(`passengers.${index}.name` as const)}
                        placeholder={index === 0 ? "اسم الضيف الأساسي" : `اسم الراكب ${index + 1}`}
                        className="w-full px-3 py-2 sm:py-1.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block sm:hidden mb-1">
                        الجنسية
                      </label>
                      <input
                        type="text"
                        {...register(`passengers.${index}.nationality` as const)}
                        placeholder="الجنسية (مثال: سعودي)"
                        className="w-full px-3 py-2 sm:py-1.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block sm:hidden mb-1">
                        رقم الهوية أو الجواز
                      </label>
                      <input
                        type="text"
                        {...register(`passengers.${index}.idNumber` as const)}
                        placeholder="رقم الهوية / الجواز"
                        dir="ltr"
                        className="w-full px-3 py-2 sm:py-1.5 text-xs rounded-xl border theme-card focus:border-amber-500 focus:outline-hidden text-right font-mono"
                      />
                    </div>
                  </div>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                      title="حذف هذا الراكب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-bold text-left pt-1">
            إجمالي ركاب الرحلة: {fields.length}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3">
          <Link
            href="/admin/contracts"
            className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl border theme-card text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto justify-center px-8 py-3 rounded-xl gold-gradient-btn text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <FilePlus2 className="w-4 h-4" />
            {isSubmitting ? "جاري الإنشاء..." : "اعتماد وتوثيق العقد الرسمي"}
          </button>
        </div>
      </form>
    </div>
  );
}
