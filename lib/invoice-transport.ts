export type BillingUnit = "TRIP" | "PASSENGER" | "KM" | "MILE" | "HOUR" | "DAY";
export const BILLING_UNIT_LABELS: Record<BillingUnit, string> = { TRIP: "رحلة", PASSENGER: "راكب", KM: "كيلومتر", MILE: "ميل", HOUR: "ساعة", DAY: "يوم" };
export const TRANSPORT_SERVICE_LABELS = { AIRPORT_TRANSFER: "استقبال / توصيل مطار", CITY_TOUR: "جولة داخل المدينة", INTERCITY: "نقل بين المدن", HAJJ_UMRAH: "نقل الحج والعمرة", OTHER: "خدمة نقل" };
export interface InvoicePassenger { name: string; nationality?: string }
export interface TransportDetails {
  serviceType: keyof typeof TRANSPORT_SERVICE_LABELS;
  contractReference?: string;
  origin: string;
  destination: string;
  tripDate: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  driverName?: string;
  driverPhone?: string;
  driverLicenseNumber?: string;
  vehiclePlate?: string;
  vehicleDescription?: string;
  vehicleCapacity?: number;
  contactName?: string;
  contactPhone?: string;
  passengerCount?: number;
  passengers: InvoicePassenger[];
  distanceUnit: "KM" | "MI";
  billedDistance?: string;
  odometerStart?: string;
  odometerEnd?: string;
  flightCarrier?: string;
  flightNumber?: string;
  notes?: string;
}
export interface TransportDefaults { customerName: string; transport: TransportDetails }
export function emptyTransport(): TransportDetails {
  return { serviceType: "OTHER", origin: "", destination: "", tripDate: "", distanceUnit: "KM", passengers: [] };
}
// Parse distance exactly in thousandths; never calculate meter deltas with binary floats.
export function distanceDelta(start?: string, end?: string): string | undefined {
  if (!start || !end || !/^\d{1,9}(\.\d{1,3})?$/.test(start) || !/^\d{1,9}(\.\d{1,3})?$/.test(end)) return undefined;
  const scaled = (value: string) => { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0")); };
  const delta = scaled(end) - scaled(start);
  if (delta < BigInt(0)) return undefined;
  const whole = delta / BigInt(1000), fraction = (delta % BigInt(1000)).toString().padStart(3, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
export function transportPayload(value: TransportDetails): TransportDetails {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== "" && field !== undefined).map(([key, field]) => [key, key === "passengers" ? value.passengers.map(passenger => ({ name: passenger.name.trim(), ...(passenger.nationality?.trim() ? { nationality: passenger.nationality.trim() } : {}) })) : field])) as unknown as TransportDetails;
}
export function validateTransportDraft(value: TransportDetails): string | undefined {
  if (Boolean(value.odometerStart) !== Boolean(value.odometerEnd)) return "أدخل قراءتي بداية ونهاية العداد معًا في تفاصيل النقل الإضافية.";
  if (value.odometerStart && value.odometerEnd && distanceDelta(value.odometerStart, value.odometerEnd) === undefined) return "راجع قراءات العداد؛ يجب أن تكون النهاية أكبر من البداية أو مساوية لها.";
  if (value.passengerCount !== undefined && value.passengers.length > value.passengerCount) return "عدد الركاب أقل من عدد الأسماء المسجلة.";
  if (value.vehicleCapacity !== undefined && Math.max(value.passengerCount || 0, value.passengers.length) > value.vehicleCapacity) return "عدد الركاب يتجاوز سعة المركبة.";
  if (Boolean(value.arrivalDate) !== Boolean(value.arrivalTime)) return "أكمل تاريخ ووقت الوصول في تفاصيل النقل الإضافية.";
  if (value.arrivalDate && (value.arrivalDate < value.tripDate || (value.arrivalDate === value.tripDate && value.arrivalTime && value.departureTime && value.arrivalTime < value.departureTime))) return "موعد الوصول يسبق موعد المغادرة.";
  if (value.passengers.some(passenger => !passenger.name.trim())) return "أكمل أسماء الركاب المسجلة أو احذف الصفوف الفارغة.";
  return undefined;
}
