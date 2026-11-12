"use client";
import { useUiText } from "@/lib/ui-text";

import {
  ArrowLeft,
  ArrowLeftRight,
  Clock3,
  FileText,
  MapPin,
  Plus,
  RotateCcw,
  Route,
  Trash2,
} from "lucide-react";
import {
  BOOKING_TYPE_LABELS,
  type InvoiceBooking,
} from "@/lib/invoice-booking";
import type { TransportDetails } from "@/lib/invoice-transport";
import type { Vehicle } from "@/lib/types";
import {
  ContractRouteImportButton,
  type InvoiceContractOption,
} from "./contract-picker";

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
  selectedContract?: InvoiceContractOption | null;
  onSelectContract?: (contract: InvoiceContractOption) => void;
  onRetryVehicles: () => void;
  onBookingChange: (change: Partial<InvoiceBooking>) => void;
  onTransportChange: (change: Partial<TransportDetails>) => void;
}
const INLINE_INPUT =
  "theme-input min-h-11 sm:min-h-9 w-full min-w-0 rounded-lg px-3 py-1.5 text-base sm:text-[0.8125rem]";
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
  selectedContract,
  onSelectContract,
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
        <legend className="mb-2.5 text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]">
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
                className={`relative flex min-h-11 sm:min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 has-focus-visible:ring-2 has-focus-visible:ring-[var(--focus-color)] motion-reduce:transition-none ${isSelected ? "border-[var(--accent-gold)] bg-[var(--accent-surface)] text-[var(--accent-gold)]" : "border-[var(--control-border)] bg-[var(--bg-card-subtle)] text-[var(--text-main)] hover:border-[var(--accent-gold)]"}`}
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
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-[0.8125rem] font-semibold text-[var(--text-main)]">
              {ui("مسار الرحلة")}
            </span>
            {selectedContract && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-surface)] border border-[var(--accent-gold)]/35 px-2.5 py-1 text-xs font-semibold text-[var(--accent-gold)]">
                <FileText className="size-3.5 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
                <span className="font-mono">{selectedContract.referenceNumber}</span>
                {selectedContract.origin && selectedContract.destination && (
                  <span className="text-[var(--text-muted)] text-[0.6875rem]">
                    ({selectedContract.origin} ← {selectedContract.destination})
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedContract &&
              (selectedContract.origin !== transport.origin ||
                selectedContract.destination !== transport.destination) && (
                <button
                  type="button"
                  onClick={() => {
                    onTransportChange({
                      origin: selectedContract.origin,
                      destination: selectedContract.destination,
                      tripDate: selectedContract.tripDate || transport.tripDate,
                    });
                  }}
                  className="min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/50 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] px-2.5 py-1 text-xs font-bold text-[var(--accent-gold)] transition cursor-pointer"
                  title={ui("استعادة مسار العقد الأصلي")}
                >
                  <RotateCcw
                    className="size-3.5 text-[var(--accent-gold)]"
                    aria-hidden="true"
                  />
                  <span>{ui("استعادة مسار العقد")}</span>
                </button>
              )}

            {!selectedContract && onSelectContract && (
              <ContractRouteImportButton onSelect={onSelectContract} />
            )}

            <button
              type="button"
              onClick={() => {
                const currentOrigin = transport.origin;
                const currentDestination = transport.destination;
                onTransportChange({
                  origin: currentDestination,
                  destination: currentOrigin,
                });
              }}
              className="min-h-11 sm:min-h-8 inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-surface)] hover:border-[var(--accent-gold)] px-3 py-1 text-xs font-bold text-[var(--accent-gold)] transition cursor-pointer"
              title={ui("عكس نقطة الانطلاق ووجهة الوصول")}
            >
              <ArrowLeftRight
                className="size-3.5 text-[var(--accent-gold)]"
                aria-hidden="true"
              />
              <span>{ui("عكس المسار")}</span>
            </button>
          </div>
        </div>

        <ExpandableField
          label={ui("عنوان الانطلاق")}
          required
          maxLength={160}
          placeholder={ui("المدينة، الفندق أو المطار")}
          value={transport.origin || ""}
          onApply={(origin) => onTransportChange({ origin: origin || "" })}
        >
          <input
            required
            maxLength={160}
            placeholder={ui("المدينة، الفندق أو المطار")}
            className={INLINE_INPUT}
            value={transport.origin || ""}
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
          value={transport.destination || ""}
          onApply={(destination) =>
            onTransportChange({ destination: destination || "" })
          }
        >
          <input
            required
            maxLength={160}
            placeholder={ui("حدد وجهة الوصول")}
            className={INLINE_INPUT}
            value={transport.destination || ""}
            onChange={(event) =>
              onTransportChange({ destination: event.target.value })
            }
          />
        </ExpandableField>
        {booking.type === "MULTI_STOP" && (
          <div className="rounded-xl border border-dashed theme-border p-3.5 sm:col-span-2 space-y-3">
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
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
                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-lg p-2 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer shrink-0"
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
              className="min-h-11 sm:min-h-9 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-[var(--accent-gold)] hover:underline disabled:opacity-40 cursor-pointer"
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
          value={transport.tripDate || ""}
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
              value={booking.returnDate || ""}
              onChange={(returnDate) =>
                onBookingChange({ returnDate: returnDate.replace(/\//g, "-") })
              }
            />
            <CustomTimePicker
              label={ui("وقت العودة")}
              required
              clearable
              value={booking.returnTime || ""}
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
            value={booking.hours || ""}
            onApply={(hours) => onBookingChange({ hours: hours || "" })}
          >
            <input
              required
              type="number"
              min={1}
              max={200}
              step={1}
              dir="ltr"
              className={`${INLINE_INPUT} font-mono`}
              value={booking.hours || ""}
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
          className="mt-3 text-xs sm:text-sm text-[var(--accent-gold)] font-medium"
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
      <p className="mt-3.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Clock3 className="size-4 shrink-0" />
        {ui("جميع مواعيد الرحلة بتوقيت السعودية")}
      </p>
    </div>
  );
}
