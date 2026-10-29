import type { TransportDetails } from "./invoice-transport";

export const BOOKING_TYPE_LABELS = {
  ONE_WAY: "ذهاب فقط",
  ROUND_TRIP: "ذهاب وعودة",
  HOURLY: "حجز بالساعة",
  CUSTOM: "وجهات خاصة",
  MULTI_STOP: "وجهات متعددة",
};
export type BookingType = keyof typeof BOOKING_TYPE_LABELS;
export interface InvoiceBooking {
  type: BookingType;
  returnDate: string;
  returnTime: string;
  hours: string;
  stops: string[];
  email: string;
}
export function emptyBooking(): InvoiceBooking {
  return { type: "ONE_WAY", returnDate: "", returnTime: "", hours: "1", stops: [""], email: "" };
}
export function bookingNotes(booking: InvoiceBooking, transport: TransportDetails): string {
  const generated = [
    `نوع الحجز: ${BOOKING_TYPE_LABELS[booking.type]}`,
    booking.type === "ROUND_TRIP" ? `العودة: ${booking.returnDate} ${booking.returnTime} (السعودية)` : "",
    booking.type === "HOURLY" ? `مدة الحجز: ${booking.hours} ساعة` : "",
    booking.type === "MULTI_STOP" ? `الوجهات الإضافية: ${booking.stops.map(stop => stop.trim()).filter(Boolean).join(" ← ")}` : "",
    booking.email.trim() ? `البريد الإلكتروني: ${booking.email.trim()}` : "",
  ].filter(Boolean);
  const notes = (transport.notes || "").split("\n").filter(line => !generated.includes(line.trim())).join("\n").trim();
  return [...generated, notes].filter(Boolean).join("\n");
}
export function validateBooking(booking: InvoiceBooking, transport: TransportDetails): string | undefined {
  if (booking.type === "ROUND_TRIP") {
    if (!booking.returnDate || !booking.returnTime) return "أكمل تاريخ ووقت رحلة العودة.";
    if (`${booking.returnDate}T${booking.returnTime}` <= `${transport.tripDate}T${transport.departureTime || "00:00"}`) return "موعد العودة يجب أن يكون بعد موعد الذهاب.";
  }
  if (booking.type === "HOURLY" && !/^(?:[1-9]|[1-9]\d|1\d\d|200)$/.test(booking.hours)) return "أدخل مدة حجز من ساعة إلى 200 ساعة.";
  if (booking.type === "MULTI_STOP" && (!booking.stops.length || booking.stops.some(stop => !stop.trim()))) return "أكمل الوجهات الإضافية أو احذف الوجهات الفارغة.";
  if (bookingNotes(booking, transport).length > 1000) return "تفاصيل الحجز والملاحظات طويلة؛ اختصرها إلى 1000 حرف.";
  return undefined;
}
// Keep percentage discounts exact through multiplication and round once to halalas.
export function percentageDiscount(quantity: string, unitPrice: string, percentage: string): string | undefined {
  const decimalPattern = /^\d{1,10}(\.\d{1,6})?$/;
  if (![quantity, unitPrice].every(value => decimalPattern.test(value)) || !/^\d{1,3}(\.\d{1,2})?$/.test(percentage)) return undefined;
  const scaled = (value: string, places: number): bigint => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * BigInt(10) ** BigInt(places) + BigInt(fraction.padEnd(places, "0"));
  };
  const rate = scaled(percentage, 2);
  if (rate > BigInt(10000)) return undefined;
  const divisor = BigInt(10) ** BigInt(14);
  const halalas = (scaled(quantity, 6) * scaled(unitPrice, 6) * rate + divisor / BigInt(2)) / divisor;
  return `${halalas / BigInt(100)}.${String(halalas % BigInt(100)).padStart(2, "0")}`;
}
