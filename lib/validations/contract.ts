import { z } from "zod";
import { OperationType } from "@/lib/types";
import { ContractFormPayload } from "@/app/_actions/contract";

/**
 * Normalizes Eastern Arabic numerals (٠-٩) to Western Arabic (0-9)
 */
export function normalizeArabicNumerals(str?: string | null): string {
  if (!str) return "";
  return str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/**
 * Zod validation schema for Admin Contract creation form
 */
export const adminContractSchema = z.object({
  operationType: z
    .string({ required_error: "نوع العملية التشغيلية مطلوب" })
    .trim()
    .min(1, "نوع العملية التشغيلية مطلوب"),
  customerName: z
    .string()
    .trim()
    .min(2, "اسم الضيف الأساسي يجب ألا يقل عن حرفين")
    .max(100, "اسم الضيف لا يمكن أن يتجاوز 100 حرف"),
  customerPhone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val || val.length === 0) return true;
        const normalized = normalizeArabicNumerals(val).replace(/[\s\-]/g, "");
        return /^[+]?[0-9]{7,16}$/.test(normalized);
      },
      { message: "رقم الجوال غير صحيح (مثال: 0551234567)" }
    ),
  origin: z
    .string()
    .trim()
    .min(2, "موقع الانطلاق مطلوب"),
  destination: z
    .string()
    .trim()
    .min(2, "موقع الوصول مطلوب"),
  tripDate: z
    .string()
    .trim()
    .min(8, "تاريخ الرحلة مطلوب"),
  tripTime: z
    .string()
    .trim()
    .min(3, "وقت الرحلة مطلوب"),
  flightCarrier: z.string().trim().optional(),
  flightNumber: z.string().trim().optional(),
  captainId: z
    .string()
    .trim()
    .min(1, "يجب اختيار كابتن للرحلة"),
  vehiclePlate: z
    .string()
    .trim()
    .min(2, "لوحة المركبة مطلوبة"),
  notes: z.string().trim().max(500, "الملاحظات لا تتجاوز 500 حرف").optional(),
  issueDateMode: z.enum(["AUTO", "MANUAL"]).default("AUTO").optional(),
  issueDate: z.string().trim().optional(),
  inspectionId: z.string().optional(),
  passengers: z
    .array(
      z.object({
        name: z.string(),
        nationality: z.string(),
        idNumber: z.string(),
      })
    )
    .max(50, "لا يمكن إضافة أكثر من 50 راكباً في العقد الواحد"),
});

export type AdminContractFormValues = z.infer<typeof adminContractSchema>;

/**
 * Maps free-form text or custom operation input to a valid OperationType enum
 */
export function parseOperationType(val?: string | null): OperationType {
  if (!val) return "AIRPORT_TRANSFER";
  const str = val.trim().toLowerCase();

  if (
    str === "airport_transfer" ||
    str.includes("مطار") ||
    str.includes("استقبال") ||
    str.includes("توصيل") ||
    str.includes("airport")
  ) {
    return "AIRPORT_TRANSFER";
  }
  if (
    str === "city_tour" ||
    str.includes("سياح") ||
    str.includes("جولة") ||
    str.includes("tour") ||
    str.includes("زيار")
  ) {
    return "CITY_TOUR";
  }
  if (
    str === "intercity" ||
    str.includes("مدن") ||
    str.includes("بين") ||
    str.includes("intercity") ||
    str.includes("سفر")
  ) {
    return "INTERCITY";
  }
  if (
    str === "hajj_umrah" ||
    str.includes("عمر") ||
    str.includes("حج") ||
    str.includes("hajj") ||
    str.includes("umrah")
  ) {
    return "HAJJ_UMRAH";
  }
  return "AIRPORT_TRANSFER";
}

/**
 * Cleans and transforms form values into a robust ContractFormPayload
 * ready for server action processing.
 */
export function sanitizeContractPayload(
  data: AdminContractFormValues,
  overrideInspectionId?: string | null
): ContractFormPayload {
  const cleanOptional = (val?: string | null): string | undefined => {
    if (!val) return undefined;
    const trimmed = val.trim();
    if (!trimmed || trimmed === "$undefined" || trimmed === "undefined" || trimmed === "null") {
      return undefined;
    }
    return trimmed;
  };

  // Normalize phone digits
  const rawPhone = cleanOptional(data.customerPhone);
  const normalizedPhone = rawPhone ? normalizeArabicNumerals(rawPhone).replace(/\s+/g, "") : undefined;

  // Normalize date and time
  const cleanDate = normalizeArabicNumerals(data.tripDate.trim());
  const cleanTime = normalizeArabicNumerals(data.tripTime.trim());

  // Clean passengers (filter out completely empty rows)
  const validPassengers = (data.passengers || [])
    .map((p) => ({
      name: p.name.trim(),
      nationality: p.nationality?.trim() || "سعودي",
      idNumber: normalizeArabicNumerals(p.idNumber?.trim() || ""),
    }))
    .filter((p) => p.name.length > 0 || p.idNumber.length > 0);

  const finalInspectionId = overrideInspectionId
    ? cleanOptional(overrideInspectionId)
    : cleanOptional(data.inspectionId);

  const cleanIssueDate =
    data.issueDateMode === "MANUAL" && data.issueDate
      ? normalizeArabicNumerals(data.issueDate.trim())
      : undefined;

  return {
    operationType: parseOperationType(data.operationType),
    origin: data.origin.trim(),
    destination: data.destination.trim(),
    tripDate: cleanDate,
    tripTime: cleanTime,
    flightCarrier: cleanOptional(data.flightCarrier),
    flightNumber: cleanOptional(data.flightNumber),
    customerName: data.customerName.trim(),
    customerPhone: normalizedPhone,
    notes: cleanOptional(data.notes),
    issueDate: cleanIssueDate,
    captainId: data.captainId.trim(),
    vehiclePlate: data.vehiclePlate.trim() || "ا ص ل 7223",
    inspectionId: finalInspectionId,
    passengers: validPassengers,
  };
}
