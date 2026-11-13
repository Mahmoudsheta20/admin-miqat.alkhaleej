import { backendRequest } from "./backend";
export interface WhatsAppTrip {
  contractId: string;
  tripId: string;
  contract: { referenceNumber: string; origin: string; destination: string };
  driverName: string;
  status: string;
  scheduledAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  lateAlerted: boolean;
  pollDispatch: string;
  masterDispatch: string;
  updatedAt: string;
}
export interface WhatsAppTripNotice {
  id: string;
  contractId: string;
  state: string;
  error: string | null;
  createdAt: string;
}
export async function assignWhatsAppTrip(contractId: string): Promise<void> {
  const result = await backendRequest("/whatsapp/trips/" + encodeURIComponent(contractId) + "/assign", "POST");
  if (!result.success) throw new Error(result.status ? result.error || result.message || "تعذر إرسال استطلاع السائق" : "تعذر تأكيد الإرسال؛ تحقق من الاستلام قبل أي محاولة أخرى / Dispatch unconfirmed; check receipt before retrying.");
}
export function tripStatusLabel(status: string, arabic: boolean): string {
  const labels: Record<string, [string, string]> = {
    ASSIGNED: ["بانتظار تحديث السائق", "Awaiting driver update"],
    ARRIVED_AT_PICKUP: ["وصل للموقع", "Arrived at pickup"],
    IN_PROGRESS: ["جاري تنفيذ الرحلة", "In progress"],
    COMPLETED: ["مكتملة", "Completed"],
    SUPPORT_REQUESTED: ["طلب مساعدة", "Support requested"],
  };
  return labels[status]?.[arabic ? 0 : 1] ?? status;
}
export function dispatchNeedsReview(state: string): boolean {
  return state === "DISPATCHING" || state === "REVIEW_REQUIRED";
}
