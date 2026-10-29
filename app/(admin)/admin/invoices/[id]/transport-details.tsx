import { MapPin, Truck, Users } from "lucide-react";
import { distanceDelta, TRANSPORT_SERVICE_LABELS, type TransportDetails } from "@/lib/invoice-transport";

interface TransportDetailsProps {
  value: TransportDetails;
}

export default function InvoiceTransportDetails({ value }: TransportDetailsProps) {
  const unit = value.distanceUnit === "MI" ? "ميل" : "كم";
  const actual = distanceDelta(value.odometerStart, value.odometerEnd);
  const fields = [
    ["نوع الخدمة", TRANSPORT_SERVICE_LABELS[value.serviceType]],
    ["مرجع العقد", value.contractReference],
    ["المغادرة (السعودية)", `${value.tripDate} ${value.departureTime || ""}`],
    ["الوصول (السعودية)", value.arrivalDate ? `${value.arrivalDate} ${value.arrivalTime || ""}` : undefined],
    ["السائق", value.driverName],
    ["هاتف السائق", value.driverPhone],
    ["رخصة السائق", value.driverLicenseNumber],
    ["لوحة المركبة", value.vehiclePlate],
    ["المركبة", value.vehicleDescription],
    ["سعة المركبة", value.vehicleCapacity],
    ["مسؤول المجموعة / الضيف", value.contactName],
    ["هاتف التواصل", value.contactPhone],
    ["عدد الركاب", value.passengerCount ?? (value.passengers.length || undefined)],
    ["المسافة المفوترة", value.billedDistance ? `${value.billedDistance} ${unit}` : undefined],
    ["بداية العداد", value.odometerStart !== undefined ? `${value.odometerStart} ${unit}` : undefined],
    ["نهاية العداد", value.odometerEnd !== undefined ? `${value.odometerEnd} ${unit}` : undefined],
    ["مسافة العداد", actual !== undefined ? `${actual} ${unit}` : undefined],
    ["رحلة الطيران", [value.flightCarrier, value.flightNumber].filter(Boolean).join(" / ")],
  ];

  return (
    <section className="theme-card p-5 sm:p-6 rounded-2xl border theme-border space-y-4">
      <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 border-b theme-border pb-3">
        <Truck className="w-4 h-4 text-amber-500" />
        <span>تفاصيل خدمة النقل والرحلة</span>
      </h2>

      <div className="theme-card-subtle rounded-xl p-4 flex items-center gap-2.5 text-sm font-black text-slate-900 dark:text-white">
        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          من {value.origin} إلى {value.destination}
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
              <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="font-bold text-end break-words text-slate-900 dark:text-white" dir="auto">
                {field}
              </dd>
            </div>
          ))}
      </dl>

      {value.passengers.length > 0 && (
        <div className="pt-2 space-y-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-amber-500" />
            <span>أسماء الركاب المسجلة ({value.passengers.length})</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border theme-border">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold">
                <tr>
                  <th className="p-2.5">م</th>
                  <th className="p-2.5">الاسم</th>
                  <th className="p-2.5">الجنسية</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {value.passengers.map((passenger, index) => (
                  <tr key={index}>
                    <td className="p-2.5 font-mono text-slate-400">{index + 1}</td>
                    <td className="p-2.5 font-bold">{passenger.name}</td>
                    <td className="p-2.5 text-slate-500">{passenger.nationality || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {value.notes && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border theme-border text-xs sm:text-sm whitespace-pre-wrap break-words">
          <strong className="text-amber-700 dark:text-amber-400 block mb-1">ملاحظات النقل:</strong>
          {value.notes}
        </div>
      )}
    </section>
  );
}
