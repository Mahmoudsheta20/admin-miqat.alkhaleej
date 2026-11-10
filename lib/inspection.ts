import type { VehicleInspection } from "./types";
export type InspectionCheckKey = keyof Pick<VehicleInspection, "fuelGauge" | "tempGauge" | "oilPressure" | "checkEngine" | "absLight" | "warningLights" | "tires" | "headlights" | "signals" | "mirrors" | "noLeaks" | "fireExtinguisher" | "warningTriangle" | "firstAidKit" | "glassHammer" | "seatBelts">;
export interface InspectionCheckItem { key: InspectionCheckKey; titleAr: string; titleEn: string; description: string; category: "dashboard" | "external" | "safety" }
export const DASHBOARD_ITEMS: InspectionCheckItem[] = [
  { key: "fuelGauge", titleAr: "مؤشر الوقود", titleEn: "Fuel Gauge", description: "كفاية الوقود للمسار المخطط", category: "dashboard" },
  { key: "tempGauge", titleAr: "مؤشر الحرارة", titleEn: "Temp Gauge", description: "حرارة المحرك في النطاق الطبيعي", category: "dashboard" },
  { key: "oilPressure", titleAr: "مؤشر ضغط الزيت", titleEn: "Oil Pressure", description: "ضغط دورة زيت المحرك سليم", category: "dashboard" },
  { key: "checkEngine", titleAr: "لمبة فحص المحرك", titleEn: "Check Engine", description: "عدم إضاءة لمبة العطل", category: "dashboard" },
  { key: "absLight", titleAr: "لمبة نظام الفرامل ABS", titleEn: "ABS Light", description: "نظام منع انغلاق المكابح سليم", category: "dashboard" },
  { key: "warningLights", titleAr: "لمبات التحذير العامة", titleEn: "Warning Lights", description: "خلو اللوحة من أي تنبيهات حرجة", category: "dashboard" },
];
export const EXTERNAL_ITEMS: InspectionCheckItem[] = [
  { key: "tires", titleAr: "الإطارات وضغط الهواء", titleEn: "Tires & Pressure", description: "عمق المداس وسلامة الإطار وضغط الهواء", category: "external" },
  { key: "headlights", titleAr: "الأنوار الأمامية والخلفية", titleEn: "Headlights & Taillights", description: "الإضاءة العالية والمنخفضة وأنوار الفرامل", category: "external" },
  { key: "signals", titleAr: "إشارات الانعطاف والتحذير", titleEn: "Turn & Hazard Signals", description: "عمل إشارات الغمازات وفلاشر الطوارئ", category: "external" },
  { key: "mirrors", titleAr: "الزجاج والمرايا الجانبية", titleEn: "Mirrors & Windshield", description: "نظافة الزجاج وخلو المرايا من الكسور", category: "external" },
  { key: "noLeaks", titleAr: "عدم وجود تسريبات أسفل الحافلة", titleEn: "No Fluid Leaks", description: "خلو أسفل المركبة من تسريب زيت أو ماء رديتر", category: "external" },
];
export const SAFETY_ITEMS: InspectionCheckItem[] = [
  { key: "fireExtinguisher", titleAr: "طفاية حريق سارية الصلاحية", titleEn: "Fire Extinguisher", description: "مؤشر الضغط في الأخضر وتاريخ الصلاحية سارٍ", category: "safety" },
  { key: "warningTriangle", titleAr: "المثلث العاكس للتحذير", titleEn: "Warning Triangle", description: "جاهز للطوارئ على الطرق السريعة", category: "safety" },
  { key: "firstAidKit", titleAr: "حقيبة الإسعافات الأولية", titleEn: "First Aid Kit", description: "مكتملة الضمادات والمطهرات الأساسية", category: "safety" },
  { key: "glassHammer", titleAr: "مطرقة كسر الزجاج", titleEn: "Glass Break Hammer", description: "مثبتة في مكانها المخصص للركاب", category: "safety" },
  { key: "seatBelts", titleAr: "أحزمة الأمان لجميع المقاعد", titleEn: "Seat Belts", description: "سلامة وأداء أقفال أحزمة الأمان", category: "safety" },
];
export const ALL_CHECK_ITEMS = [...DASHBOARD_ITEMS, ...EXTERNAL_ITEMS, ...SAFETY_ITEMS];
export const INSPECTION_GROUPS = [
  { id: "dashboard", ar: "لوحة العدادات والتنبيهات", en: "Dashboard & warnings", items: DASHBOARD_ITEMS },
  { id: "external", ar: "الفحص الخارجي والمركبة", en: "Vehicle exterior", items: EXTERNAL_ITEMS },
  { id: "safety", ar: "معدات السلامة والطوارئ", en: "Safety equipment", items: SAFETY_ITEMS },
];
/** A historical report is never proof of readiness for a different Saudi business day. */
export function inspectionMatchesDay(inspection: Pick<VehicleInspection, "inspectionDate" | "vehiclePlate"> | null, day: string, plate?: string): boolean {
  if (!inspection || (plate && inspection.vehiclePlate !== plate)) return false;
  const normalizedDay = day.trim().replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDay)) return false;
  const date = new Date(inspection.inspectionDate);
  if (!Number.isFinite(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}` === normalizedDay;
}
