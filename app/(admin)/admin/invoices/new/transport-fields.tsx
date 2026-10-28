"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { distanceDelta, TRANSPORT_SERVICE_LABELS, type TransportDetails } from "@/lib/invoice-transport";
interface TransportFieldsProps { value: TransportDetails; onChange: (value: TransportDetails) => void; hasValidationError?: boolean; isSupplemental?: boolean }
interface TransportField { key: keyof TransportDetails; label: string; type?: string; required?: boolean }
const INPUT = "theme-input mt-1.5 h-11 w-full min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";
const CORE: TransportField[] = [
  { key: "origin", label: "من", required: true }, { key: "destination", label: "إلى", required: true },
  { key: "tripDate", label: "تاريخ الرحلة", type: "date", required: true }, { key: "departureTime", label: "المغادرة (السعودية)", type: "time" },
  { key: "driverName", label: "السائق" }, { key: "vehiclePlate", label: "لوحة المركبة" },
];
const EXTRA: TransportField[] = [
  { key: "driverPhone", label: "هاتف السائق", type: "tel" }, { key: "driverLicenseNumber", label: "رقم رخصة السائق" },
  { key: "vehicleDescription", label: "نوع المركبة / الطراز" }, { key: "contactName", label: "مسؤول المجموعة / الضيف" },
  { key: "contactPhone", label: "هاتف التواصل", type: "tel" }, { key: "arrivalDate", label: "تاريخ الوصول", type: "date" },
  { key: "arrivalTime", label: "الوصول (السعودية)", type: "time" }, { key: "flightCarrier", label: "شركة الطيران" }, { key: "flightNumber", label: "رقم رحلة الطيران" },
];
export default function TransportFields({ value, onChange, hasValidationError = false, isSupplemental = false }: TransportFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false), [hasNames, setHasNames] = useState(false);
  const update = (change: Partial<TransportDetails>) => onChange({ ...value, ...change });
  const delta = distanceDelta(value.odometerStart, value.odometerEnd), unit = value.distanceUnit === "MI" ? "ميل" : "كم";
  const expanded = isExpanded || hasValidationError;
  const field = (item: TransportField) => <label key={item.key} className="text-sm font-bold">{item.label}<input type={item.type || "text"} required={item.required} maxLength={160} className={INPUT} value={String(value[item.key] ?? "")} onChange={event => update({ [item.key]: event.target.value })} /></label>;
  return <div>
    <div className="grid gap-4 sm:grid-cols-2">{(isSupplemental ? CORE.filter(item => item.key === "driverName" || item.key === "vehiclePlate") : CORE).map(field)}</div>
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {!isSupplemental && <label className="text-sm font-bold">عدد الركاب<input type="number" min={1} max={100} step={1} className={INPUT} value={value.passengerCount ?? ""} onChange={event => update({ passengerCount: event.target.value ? Number(event.target.value) : undefined })} placeholder="اختياري" /></label>}
      <label className="text-sm font-bold">المسافة المفوترة<input inputMode="decimal" pattern="\d{1,9}(\.\d{1,3})?" className={`${INPUT} font-mono`} value={value.billedDistance || ""} onChange={event => update({ billedDistance: event.target.value })} placeholder="اختياري" /></label>
      <label className="text-sm font-bold">وحدة المسافة<select className={INPUT} value={value.distanceUnit} onChange={event => update({ distanceUnit: event.target.value as "KM" | "MI", billedDistance: undefined, odometerStart: undefined, odometerEnd: undefined })}><option value="KM">كيلومتر</option><option value="MI">ميل</option></select></label>
    </div>
    {isSupplemental && <label className="mt-4 block text-sm font-bold">ملاحظات الحجز<textarea rows={3} maxLength={350} placeholder="تعليمات الاستقبال أو أي تفاصيل إضافية…" className="theme-input mt-2 w-full rounded-xl p-3 text-sm" value={value.notes || ""} onChange={event => update({ notes: event.target.value })} /><span className="mt-1 block text-end font-mono text-[11px] font-normal text-slate-400">{value.notes?.length || 0} / 350</span></label>}
    <button type="button" aria-expanded={expanded} onClick={() => setIsExpanded(!isExpanded)} className="mt-5 flex items-center gap-2 rounded-lg py-1 text-xs font-bold text-slate-500 hover:text-amber-700 dark:hover:text-amber-400">تفاصيل إضافية للنقل<ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
    {expanded && <div className="mt-4 space-y-5 border-t theme-border pt-5">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">نوع الخدمة<select className={INPUT} value={value.serviceType} onChange={event => update({ serviceType: event.target.value as TransportDetails["serviceType"] })}>{Object.entries(TRANSPORT_SERVICE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{(isSupplemental ? EXTRA.filter(item => !["contactName", "contactPhone", "vehicleDescription"].includes(item.key)) : EXTRA).map(field)}<label className="text-sm font-bold">سعة المركبة<input type="number" min={1} max={100} className={INPUT} value={value.vehicleCapacity ?? ""} onChange={event => update({ vehicleCapacity: event.target.value ? Number(event.target.value) : undefined })} /></label></div>
      <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60"><h3 className="mb-3 text-sm font-bold">قراءات العداد ({unit})</h3><div className="grid grid-cols-2 gap-4">{([{ key: "odometerStart", label: "بداية العداد" }, { key: "odometerEnd", label: "نهاية العداد" }] as const).map(item => <label key={item.key} className="text-xs font-bold text-slate-500">{item.label}<input inputMode="decimal" pattern="\d{1,9}(\.\d{1,3})?" className={`${INPUT} font-mono`} value={value[item.key] || ""} onChange={event => update({ [item.key]: event.target.value })} /></label>)}</div><p className="mt-3 text-xs text-slate-500">مسافة العداد: <b className="font-mono">{delta ?? "—"}</b> {unit} · تُراجع المسافة المفوترة حسب الاتفاق.</p></div>
      {!isSupplemental && <label className="block text-sm font-bold">ملاحظات الخدمة<textarea rows={3} maxLength={1000} className="theme-input mt-1.5 w-full rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" value={value.notes || ""} onChange={event => update({ notes: event.target.value })} /></label>}
      <div><button type="button" aria-expanded={hasNames || hasValidationError} onClick={() => setHasNames(!hasNames)} className="flex items-center gap-2 text-xs font-bold text-slate-500">أسماء الركاب المسجلة ({value.passengers.length})<ChevronDown className={`size-4 ${hasNames ? "rotate-180" : ""}`} /></button>
        {(hasNames || hasValidationError) && <div className="mt-4 space-y-3">{value.passengers.map((passenger, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3"><label className="text-xs font-bold text-slate-500">الراكب {index + 1}<input required maxLength={160} className={INPUT} value={passenger.name} onChange={event => update({ passengers: value.passengers.map((item, position) => position === index ? { ...item, name: event.target.value } : item) })} /></label><label className="text-xs font-bold text-slate-500">الجنسية<input maxLength={160} className={INPUT} value={passenger.nationality || ""} onChange={event => update({ passengers: value.passengers.map((item, position) => position === index ? { ...item, nationality: event.target.value } : item) })} /></label><button type="button" aria-label={`حذف الراكب ${index + 1}`} className="pb-3 text-xs text-rose-600" onClick={() => update({ passengers: value.passengers.filter((_, position) => position !== index) })}>حذف</button></div>)}<button type="button" disabled={value.passengers.length >= 100} className="rounded-lg border theme-border px-3 py-2 text-xs font-bold disabled:opacity-40" onClick={() => update({ passengers: [...value.passengers, { name: "" }] })}>إضافة اسم</button><p className="text-xs text-slate-400">أسماء الركاب لا تُطبع في نسخة العميل.</p></div>}
      </div>
    </div>}
  </div>;
}
