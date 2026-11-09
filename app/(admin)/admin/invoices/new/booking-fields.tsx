"use client";
import { useUiText } from "@/lib/ui-text";


import { ArrowLeft, ArrowLeftRight, Clock3, MapPin, Plus, Route, Trash2 } from "lucide-react";
import { BOOKING_TYPE_LABELS, type InvoiceBooking } from "@/lib/invoice-booking";
import type { TransportDetails } from "@/lib/invoice-transport";
import type { Vehicle } from "@/lib/types";

interface BookingFieldsProps {
  booking: InvoiceBooking;
  transport: TransportDetails;
  vehicles: Vehicle[];
  isLoadingVehicles: boolean;
  vehicleError: string;
  onRetryVehicles: () => void;
  onBookingChange: (change: Partial<InvoiceBooking>) => void;
  onTransportChange: (change: Partial<TransportDetails>) => void;
}
const INPUT = "theme-input mt-2 h-11 w-full min-w-0 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";
const ICONS = { ONE_WAY: ArrowLeft, ROUND_TRIP: ArrowLeftRight, HOURLY: Clock3, CUSTOM: MapPin, MULTI_STOP: Route };

export default function BookingFields({ booking, transport, vehicles, isLoadingVehicles, vehicleError, onRetryVehicles, onBookingChange, onTransportChange }: BookingFieldsProps) {
  const ui = useUiText();

  const selectedVehicle = vehicles.find(vehicle => vehicle.plateNumberAr === transport.vehiclePlate);
  return <div>
    <fieldset>
      <legend className="mb-3 text-sm font-bold">{ui("نوع الرحلة")}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {Object.entries(BOOKING_TYPE_LABELS).map(([key, label]) => {
          const type = key as InvoiceBooking["type"], Icon = ICONS[type], isSelected = booking.type === type;
          return <label key={key} className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition-all duration-200 has-focus-visible:ring-2 has-focus-visible:ring-amber-500 motion-reduce:transition-none ${isSelected ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" : "theme-border text-[var(--text-muted)] hover:border-amber-400 dark:text-slate-400"}`}>
            <input type="radio" name="bookingType" value={key} checked={isSelected} onChange={() => onBookingChange({ type })} className="sr-only" />
            <Icon className={`size-4 shrink-0 ${type === "ONE_WAY" ? "ltr:rotate-180" : ""}`} aria-hidden="true" /><span>{ui(label)}</span>
          </label>;
        })}
      </div>
    </fieldset>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">{ui("عنوان الانطلاق")}<span className="ms-0.5 text-amber-700" aria-hidden="true">*</span><input required maxLength={160} placeholder={ui("المدينة، الفندق أو المطار")} className={INPUT} value={transport.origin} onChange={event => onTransportChange({ origin: event.target.value })} /></label>
      <label className="text-sm font-bold">{ui("عنوان الوصول")}<span className="ms-0.5 text-amber-700" aria-hidden="true">*</span><input required maxLength={160} placeholder={ui("حدد وجهة الوصول")} className={INPUT} value={transport.destination} onChange={event => onTransportChange({ destination: event.target.value })} /></label>
      {booking.type === "MULTI_STOP" && <div className="rounded-xl border border-dashed theme-border p-4 sm:col-span-2">
        <p className="mb-3 text-xs text-[var(--text-muted)]">{ui("الوجهات بين الانطلاق والوصول، حسب ترتيب الزيارة.")}</p>
        {booking.stops.map((stop, index) => <div key={index} className="mb-3 flex items-end gap-2"><label className="flex-1 text-xs font-bold text-[var(--text-muted)]">{ui("الوجهة الإضافية")} {index + 1}<input required maxLength={160} className={INPUT} value={stop} onChange={event => onBookingChange({ stops: booking.stops.map((item, position) => position === index ? event.target.value : item) })} /></label><button type="button" aria-label={ui(`حذف الوجهة ${index + 1}`)} disabled={booking.stops.length === 1} className="min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 inline-flex items-center justify-center rounded-xl p-2.5 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer" onClick={() => onBookingChange({ stops: booking.stops.filter((_, position) => position !== index) })}><Trash2 className="size-4" aria-hidden="true" /></button></div>)}
        <button type="button" disabled={booking.stops.length >= 5} className="min-h-11 flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-amber-700 disabled:opacity-40 dark:text-amber-400 cursor-pointer" onClick={() => onBookingChange({ stops: [...booking.stops, ""] })}><Plus className="size-4" aria-hidden="true" />{ui("إضافة وجهة")}</button>
      </div>}
      <label className="text-sm font-bold">{ui("تاريخ الذهاب")}<span className="ms-0.5 text-amber-700" aria-hidden="true">*</span><input required type="date" className={`${INPUT} font-mono`} value={transport.tripDate} onChange={event => onTransportChange({ tripDate: event.target.value })} /></label>
      <label className="text-sm font-bold">{ui("وقت الذهاب")}<span className="ms-0.5 text-amber-700" aria-hidden="true">*</span><input required type="time" className={`${INPUT} font-mono`} value={transport.departureTime || ""} onChange={event => onTransportChange({ departureTime: event.target.value })} /></label>
      {booking.type === "ROUND_TRIP" && <><label className="text-sm font-bold">{ui("تاريخ العودة")}<span className="ms-0.5 text-amber-700" aria-hidden="true">*</span><input required type="date" min={transport.tripDate || undefined} className={`${INPUT} font-mono`} value={booking.returnDate} onChange={event => onBookingChange({ returnDate: event.target.value })} /></label><label className="text-sm font-bold">{ui("وقت العودة")}<span className="ms-0.5 text-amber-700" aria-hidden="true">*</span><input required type="time" className={`${INPUT} font-mono`} value={booking.returnTime} onChange={event => onBookingChange({ returnTime: event.target.value })} /></label></>}
      {booking.type === "HOURLY" && <label className="text-sm font-bold">{ui("عدد ساعات الحجز")}<span className="ms-0.5 text-amber-700" aria-hidden="true">*</span><input required type="number" min={1} max={200} step={1} className={`${INPUT} font-mono`} value={booking.hours} onChange={event => onBookingChange({ hours: event.target.value })} /></label>}
      <label className="text-sm font-bold">{ui("المركبة")}<span className="ms-1 font-normal text-[var(--text-muted)]">{ui("(اختياري)")}</span><select className={INPUT} disabled={isLoadingVehicles} value={selectedVehicle?.id || ""} onChange={event => {
        const vehicle = vehicles.find(item => item.id === event.target.value);
        onTransportChange({ vehiclePlate: vehicle?.plateNumberAr || "", vehicleDescription: vehicle ? `${vehicle.make} ${vehicle.model}` : "" });
      }}><option value="">{ui(isLoadingVehicles ? "جارٍ تحميل المركبات…" : "اختر مركبة من الأسطول")}</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.plateNumberAr}</option>)}</select></label>
      <label className="text-sm font-bold">{ui("نوع المركبة / الطراز")}<input maxLength={160} placeholder={ui("مثال: حافلة، سيارة عائلية")} className={INPUT} value={transport.vehicleDescription || ""} onChange={event => onTransportChange({ vehicleDescription: event.target.value })} /></label>
    </div>
    {vehicleError && <p role="status" className="mt-3 text-xs text-amber-700 dark:text-amber-400">{ui("تعذر تحميل الأسطول؛ يمكنك إدخال نوع المركبة يدويًا.")}<button type="button" className="rounded px-1 font-bold underline" onClick={onRetryVehicles}>{ui("إعادة المحاولة")}</button></p>}
    <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><Clock3 className="size-3.5" />{ui("جميع مواعيد الرحلة بتوقيت السعودية")}</p>
  </div>;
}
