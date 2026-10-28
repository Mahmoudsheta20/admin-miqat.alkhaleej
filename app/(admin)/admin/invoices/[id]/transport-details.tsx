import { distanceDelta, TRANSPORT_SERVICE_LABELS, type TransportDetails } from "@/lib/invoice-transport";
interface TransportDetailsProps { value: TransportDetails }
export default function InvoiceTransportDetails({ value }: TransportDetailsProps) {
  const unit = value.distanceUnit === "MI" ? "ميل" : "كم";
  const actual = distanceDelta(value.odometerStart, value.odometerEnd);
  const fields = [
    ["نوع الخدمة", TRANSPORT_SERVICE_LABELS[value.serviceType]],
    ["مرجع العقد", value.contractReference],
    ["المغادرة (السعودية)", `${value.tripDate} ${value.departureTime || ""}`],
    ["الوصول (السعودية)", value.arrivalDate ? `${value.arrivalDate} ${value.arrivalTime || ""}` : undefined],
    ["السائق", value.driverName], ["هاتف السائق", value.driverPhone], ["رخصة السائق", value.driverLicenseNumber],
    ["لوحة المركبة", value.vehiclePlate], ["المركبة", value.vehicleDescription], ["سعة المركبة", value.vehicleCapacity],
    ["مسؤول المجموعة / الضيف", value.contactName], ["هاتف التواصل", value.contactPhone],
    ["عدد الركاب", value.passengerCount ?? (value.passengers.length || undefined)],
    ["المسافة المفوترة", value.billedDistance ? `${value.billedDistance} ${unit}` : undefined],
    ["بداية العداد", value.odometerStart !== undefined ? `${value.odometerStart} ${unit}` : undefined],
    ["نهاية العداد", value.odometerEnd !== undefined ? `${value.odometerEnd} ${unit}` : undefined],
    ["مسافة العداد", actual !== undefined ? `${actual} ${unit}` : undefined],
    ["رحلة الطيران", [value.flightCarrier, value.flightNumber].filter(Boolean).join(" / ")],
  ];
  return <section className="theme-card p-5 rounded-2xl space-y-4">
    <h2 className="text-lg font-bold">تفاصيل خدمة النقل</h2>
    <p className="theme-card-subtle rounded-xl p-4 font-bold">من {value.origin} إلى {value.destination}</p>
    <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">{fields.filter(([, field]) => field !== undefined && field !== "").map(([label, field]) => <div key={label} className="flex justify-between gap-4 border-b theme-border pb-2"><dt className="text-slate-500">{label}</dt><dd className="font-bold text-end break-words" dir="auto">{field}</dd></div>)}</dl>
    {value.passengers.length > 0 && <div className="overflow-x-auto"><h3 className="font-bold mb-3">أسماء الركاب المسجلة ({value.passengers.length})</h3><table className="w-full text-right"><thead><tr><th className="p-2">م</th><th className="p-2">الاسم</th><th className="p-2">الجنسية</th></tr></thead><tbody>{value.passengers.map((passenger, index) => <tr className="border-t theme-border" key={index}><td className="p-2">{index + 1}</td><td className="p-2">{passenger.name}</td><td className="p-2">{passenger.nationality || "—"}</td></tr>)}</tbody></table></div>}
    {value.notes && <p className="whitespace-pre-wrap break-words text-sm"><strong>ملاحظات النقل: </strong>{value.notes}</p>}
  </section>;
}
