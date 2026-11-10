"use client";
import { useUiText } from "@/lib/ui-text";

import {
  ArrowLeft,
  ArrowLeftRight,
  Clock3,
  MapPin,
  Plus,
  Route,
  Trash2,
} from "lucide-react";
import {
  BOOKING_TYPE_LABELS,
  type InvoiceBooking,
} from "@/lib/invoice-booking";
import type { TransportDetails } from "@/lib/invoice-transport";
import type { Vehicle } from "@/lib/types";

import { ExpandableField } from "@/app/_components/form/FullscreenFieldModal";
import { FullscreenSelect } from "@/app/_components/form/FullscreenSelect";
import { CustomDatePicker } from "@/app/_components/form/CustomDatePicker";
import { CustomTimePicker } from "@/app/_components/form/CustomTimePicker";

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
const INLINE_INPUT =
  "theme-input min-h-12 w-full min-w-0 rounded-xl px-3.5 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/30";
const ICONS = {
  ONE_WAY: ArrowLeft,
  ROUND_TRIP: ArrowLeftRight,
  HOURLY: Clock3,
  CUSTOM: MapPin,
  MULTI_STOP: Route,
};

export default function BookingFields({
  booking,
  transport,
  vehicles,
  isLoadingVehicles,
  vehicleError,
  onRetryVehicles,
  onBookingChange,
  onTransportChange,
}: BookingFieldsProps) {
  const ui = useUiText();

  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.plateNumberAr === transport.vehiclePlate,
  );
  return (
    <div>
      <fieldset>
        <legend className="mb-3 text-sm sm:text-base font-semibold">
          {ui("نوع الرحلة")}
        </legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          {Object.entries(BOOKING_TYPE_LABELS).map(([key, label]) => {
            const type = key as InvoiceBooking["type"],
              Icon = ICONS[type],
              isSelected = booking.type === type;
            return (
              <label
                key={key}
                className={`relative flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-3 text-sm font-bold transition-all duration-200 has-focus-visible:ring-2 has-focus-visible:ring-amber-500 motion-reduce:transition-none ${isSelected ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" : "theme-border text-[var(--text-muted)] hover:border-amber-400 dark:text-slate-400"}`}
              >
                <input
                  type="radio"
                  name="bookingType"
                  value={key}
                  checked={isSelected}
                  onChange={() => onBookingChange({ type })}
                  className="sr-only"
                />
                <Icon
                  className={`size-4 shrink-0 ${type === "ONE_WAY" ? "ltr:rotate-180" : ""}`}
                  aria-hidden="true"
                />
                <span>{ui(label)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ExpandableField
          label={ui("عنوان الانطلاق")}
          required
          maxLength={160}
          placeholder={ui("المدينة، الفندق أو المطار")}
          value={transport.origin}
          onApply={(origin) => onTransportChange({ origin })}
        >
          <input
            required
            maxLength={160}
            placeholder={ui("المدينة، الفندق أو المطار")}
            className={INLINE_INPUT}
            value={transport.origin}
            onChange={(event) =>
              onTransportChange({ origin: event.target.value })
            }
          />
        </ExpandableField>
        <ExpandableField
          label={ui("عنوان الوصول")}
          required
          maxLength={160}
          placeholder={ui("حدد وجهة الوصول")}
          value={transport.destination}
          onApply={(destination) => onTransportChange({ destination })}
        >
          <input
            required
            maxLength={160}
            placeholder={ui("حدد وجهة الوصول")}
            className={INLINE_INPUT}
            value={transport.destination}
            onChange={(event) =>
              onTransportChange({ destination: event.target.value })
            }
          />
        </ExpandableField>
        {booking.type === "MULTI_STOP" && (
          <div className="rounded-xl border border-dashed theme-border p-4 sm:col-span-2 space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              {ui("الوجهات بين الانطلاق والوصول، حسب ترتيب الزيارة.")}
            </p>
            {booking.stops.map((stop, index) => (
              <ExpandableField
                key={index}
                label={`${ui("الوجهة الإضافية")} ${index + 1}`}
                required
                maxLength={160}
                value={stop}
                onApply={(nextStop) =>
                  onBookingChange({
                    stops: booking.stops.map((item, position) =>
                      position === index ? nextStop : item,
                    ),
                  })
                }
                suffix={
                  <button
                    type="button"
                    aria-label={ui(`حذف الوجهة ${index + 1}`)}
                    disabled={booking.stops.length === 1}
                    className="min-h-12 min-w-12 inline-flex items-center justify-center rounded-xl p-2.5 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer shrink-0"
                    onClick={() =>
                      onBookingChange({
                        stops: booking.stops.filter(
                          (_, position) => position !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                }
              >
                <input
                  required
                  maxLength={160}
                  className={INLINE_INPUT}
                  value={stop}
                  onChange={(event) =>
                    onBookingChange({
                      stops: booking.stops.map((item, position) =>
                        position === index ? event.target.value : item,
                      ),
                    })
                  }
                />
              </ExpandableField>
            ))}
            <button
              type="button"
              disabled={booking.stops.length >= 5}
              className="min-h-11 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold text-amber-700 disabled:opacity-40 dark:text-amber-400 cursor-pointer"
              onClick={() => onBookingChange({ stops: [...booking.stops, ""] })}
            >
              <Plus className="size-4" aria-hidden="true" />
              {ui("إضافة وجهة")}
            </button>
          </div>
        )}
        <CustomDatePicker
          label={ui("تاريخ الذهاب")}
          required
          value={transport.tripDate}
          onChange={(tripDate) =>
            onTransportChange({ tripDate: tripDate.replace(/\//g, "-") })
          }
        />
        <CustomTimePicker
          label={ui("وقت الذهاب")}
          required
          clearable
          value={transport.departureTime || ""}
          onChange={(departureTime) => onTransportChange({ departureTime })}
        />
        {booking.type === "ROUND_TRIP" && (
          <>
            <CustomDatePicker
              label={ui("تاريخ العودة")}
              required
              minDate={transport.tripDate || undefined}
              value={booking.returnDate}
              onChange={(returnDate) =>
                onBookingChange({ returnDate: returnDate.replace(/\//g, "-") })
              }
            />
            <CustomTimePicker
              label={ui("وقت العودة")}
              required
              clearable
              value={booking.returnTime}
              onChange={(returnTime) => onBookingChange({ returnTime })}
            />
          </>
        )}
        {booking.type === "HOURLY" && (
          <ExpandableField
            label={ui("عدد ساعات الحجز")}
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            step={1}
            dir="ltr"
            value={booking.hours}
            onApply={(hours) => onBookingChange({ hours })}
          >
            <input
              required
              type="number"
              min={1}
              max={200}
              step={1}
              dir="ltr"
              className={`${INLINE_INPUT} font-mono`}
              value={booking.hours}
              onChange={(event) =>
                onBookingChange({ hours: event.target.value })
              }
            />
          </ExpandableField>
        )}
        <FullscreenSelect
          label={ui("المركبة")}
          badge={ui("(اختياري)")}
          placeholder={ui(
            isLoadingVehicles
              ? "جارٍ تحميل المركبات…"
              : "اختر مركبة من الأسطول",
          )}
          disabled={isLoadingVehicles}
          searchable
          clearable
          value={selectedVehicle?.id || ""}
          onChange={(nextId) => {
            const vehicle = vehicles.find((item) => item.id === nextId);
            onTransportChange({
              vehiclePlate: vehicle?.plateNumberAr || "",
              vehicleDescription: vehicle
                ? `${vehicle.make} ${vehicle.model}`
                : "",
            });
          }}
          options={vehicles.map((vehicle) => ({
            value: vehicle.id,
            label: `${vehicle.make} ${vehicle.model}`,
            description: `${vehicle.plateNumberAr}${vehicle.plateNumberEn ? ` · ${vehicle.plateNumberEn}` : ""}`,
            badge: vehicle.plateNumberAr,
            keywords: `${vehicle.make} ${vehicle.model} ${vehicle.plateNumberAr} ${vehicle.plateNumberEn || ""}`,
          }))}
        />
        <ExpandableField
          label={ui("نوع المركبة / الطراز")}
          maxLength={160}
          placeholder={ui("مثال: حافلة، سيارة عائلية")}
          value={transport.vehicleDescription || ""}
          onApply={(vehicleDescription) =>
            onTransportChange({ vehicleDescription })
          }
        >
          <input
            maxLength={160}
            placeholder={ui("مثال: حافلة، سيارة عائلية")}
            className={INLINE_INPUT}
            value={transport.vehicleDescription || ""}
            onChange={(event) =>
              onTransportChange({ vehicleDescription: event.target.value })
            }
          />
        </ExpandableField>
      </div>
      {vehicleError && (
        <p
          role="status"
          className="mt-3 text-sm text-amber-700 dark:text-amber-400"
        >
          {ui("تعذر تحميل الأسطول؛ يمكنك إدخال نوع المركبة يدويًا.")}
          <button
            type="button"
            className="rounded px-1.5 font-bold underline cursor-pointer"
            onClick={onRetryVehicles}
          >
            {ui("إعادة المحاولة")}
          </button>
        </p>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
        <Clock3 className="size-4 shrink-0" />
        {ui("جميع مواعيد الرحلة بتوقيت السعودية")}
      </p>
    </div>
  );
}
