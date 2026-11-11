"use client";

import { MapPin, Truck, Users } from "lucide-react";
import { Card } from "@/app/_components/ui";
import { distanceDelta, TRANSPORT_SERVICE_LABELS, type TransportDetails } from "@/lib/invoice-transport";
import { useUiText } from "@/lib/ui-text";

interface TransportDetailsProps {
  value: TransportDetails;
}

export default function InvoiceTransportDetails({ value }: TransportDetailsProps) {
  const ui = useUiText();
  const passengers = value.passengers || [];
  const unit = value.distanceUnit === "MI" ? "ميل" : "كم";
  const actual = distanceDelta(value.odometerStart, value.odometerEnd);
  const fields: [string, string | number | undefined][] = [
    ["نوع الخدمة", value.serviceType ? ui(TRANSPORT_SERVICE_LABELS[value.serviceType]) : undefined],
    ["مرجع العقد", value.contractReference],
    ["المغادرة (السعودية)", `${value.tripDate} ${value.departureTime || ""}`.trim()],
    ["الوصول (السعودية)", value.arrivalDate ? `${value.arrivalDate} ${value.arrivalTime || ""}`.trim() : undefined],
    ["السائق", value.driverName],
    ["هاتف السائق", value.driverPhone],
    ["رخصة السائق", value.driverLicenseNumber],
    ["لوحة المركبة", value.vehiclePlate],
    ["المركبة", value.vehicleDescription],
    ["سعة المركبة", value.vehicleCapacity],
    ["مسؤول المجموعة / الضيف", value.contactName],
    ["هاتف التواصل", value.contactPhone],
    ["عدد الركاب", value.passengerCount ?? (passengers.length || undefined)],
    ["المسافة المفوترة", value.billedDistance ? `${value.billedDistance} ${ui(unit)}` : undefined],
    ["بداية العداد", value.odometerStart !== undefined ? `${value.odometerStart} ${ui(unit)}` : undefined],
    ["نهاية العداد", value.odometerEnd !== undefined ? `${value.odometerEnd} ${ui(unit)}` : undefined],
    ["مسافة العداد", actual !== undefined ? `${actual} ${ui(unit)}` : undefined],
    ["رحلة الطيران", [value.flightCarrier, value.flightNumber].filter(Boolean).join(" / ")],
  ];

  return (
    <section className="theme-card p-5 sm:p-6 rounded-2xl border theme-border space-y-4">
      <h2 className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2 border-b theme-border pb-3">
        <Truck className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
        <span>{ui("تفاصيل خدمة النقل والرحلة")}</span>
      </h2>

      <div className="theme-card-subtle rounded-xl p-4 flex items-center gap-2.5 text-sm font-semibold text-[var(--text-main)]">
        <MapPin className="w-4 h-4 text-[var(--accent-gold)] shrink-0" aria-hidden="true" />
        <span>
          {ui("من")} {value.origin} {ui("إلى")} {value.destination}
        </span>
      </div>

      <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs sm:text-sm">
        {fields
          .filter(([, field]) => field !== undefined && field !== "")
          .map(([label, field]) => (
            <div
              key={label}
              className="flex justify-between gap-4 border-b theme-border pb-2.5"
            >
              <dt className="text-[var(--text-muted)]">{ui(label)}</dt>
              <dd className="font-bold text-end break-words text-[var(--text-main)]" dir="auto">
                {field}
              </dd>
            </div>
          ))}
      </dl>

      {passengers.length > 0 && (
        <div className="pt-2 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>
              {ui("أسماء الركاب المسجلة (")}
              {passengers.length})
            </span>
          </h3>
          <div className="md:hidden space-y-2.5">
            {passengers.map((passenger, index) => (
              <Card key={index} className="theme-card border theme-border shadow-none p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-[var(--bg-card-subtle)] border theme-border font-mono font-bold text-[11px] flex items-center justify-center shrink-0 text-[var(--text-muted)]">
                    {index + 1}
                  </span>
                  <span className="font-bold text-[var(--text-main)] truncate">
                    {passenger.name}
                  </span>
                </div>
                <span className="text-[var(--text-muted)] shrink-0">
                  {passenger.nationality || "—"}
                </span>
              </Card>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-xl border theme-border">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-[var(--table-header-bg)] text-[var(--text-muted)] font-bold">
                <tr>
                  <th className="p-2.5 whitespace-nowrap">{ui("م")}</th>
                  <th className="p-2.5 whitespace-nowrap">{ui("الاسم")}</th>
                  <th className="p-2.5 whitespace-nowrap">{ui("الجنسية")}</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {passengers.map((passenger, index) => (
                  <tr key={index} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="p-2.5 font-mono text-[var(--text-muted)]">{index + 1}</td>
                    <td className="p-2.5 font-bold text-[var(--text-main)]">{passenger.name}</td>
                    <td className="p-2.5 text-[var(--text-muted)]">{passenger.nationality || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {value.notes && (
        <div className="p-3.5 rounded-xl bg-[var(--bg-card-subtle)] border theme-border text-xs sm:text-sm text-[var(--text-main)] whitespace-pre-wrap break-words">
          <strong className="text-[var(--accent-gold)] block mb-1">{ui("ملاحظات النقل:")}</strong>
          {value.notes}
        </div>
      )}
    </section>
  );
}
