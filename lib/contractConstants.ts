/**
 * Default Contract, Passenger Manifest & Vehicle Inspection Constants
 * Matching the official 3-page document of Miqat Al Khaleej Company
 */

export interface CompanyInfo {
  nameAr: string;
  nameEn: string;
  unifiedNumber: string;
  crNumber: string;
  licenseNumber: string;
  cityAr: string;
  cityEn: string;
  phoneDisplay: string;
  phoneRaw: string;
}

export interface ContractInfo {
  referenceNumber: string;
  operationType: string;
  issueDate: string;
  tripNumber: string;
  date: string;
  time?: string;
  flightCarrier?: string;
  firstParty: string;
  secondParty: string;
  secondPartyPhone?: string;
  passengerCount?: number;
  origin: string;
  destination: string;
  preamble: string;
  agreementClause: string;
  cancellationPolicy: string;
  electronicBookingClause: string;
  warningNotice: string;
  qrCodeDataUri?: string;
  verificationUrl?: string;
  pdfPath?: string | null;
}

export interface DriverContractInfo {
  name: string;
  role: string;
  nationalId: string;
  mobile: string;
  plateNumber: string;
  photoUrl: string;
  signatureUrl?: string;
}

export interface PassengerManifestItem {
  id: number;
  name: string;
  nationality: string;
  idNumber: string;
}

export interface InspectionCheckItem {
  id: string;
  nameAr: string;
  nameEn?: string;
  sound: boolean;
  notes: string;
}

export interface InspectionInfo {
  date: string;
  time?: string;
  dashboard: InspectionCheckItem[];
  external: InspectionCheckItem[];
  safety: InspectionCheckItem[];
  declarationText: string;
}

export interface ContractOptions {
  showStamp: boolean;
  showSignature: boolean;
  showFooterLogo: boolean;
  accentColor: string;
}

export interface FullContractData {
  company: CompanyInfo;
  contract: ContractInfo;
  driver: DriverContractInfo;
  passengers: PassengerManifestItem[];
  inspection: InspectionInfo;
  options: ContractOptions;
}

export const DEFAULT_CONTRACT_DATA: FullContractData = {
  company: {
    nameAr: "شركة ميقات الخليج للنقل البري",
    nameEn: "MIQAT AL-KHALEEJ COMPANY FOR THE LAND TRANSPORT",
    unifiedNumber: "7054842252",
    crNumber: "7054842252",
    licenseNumber: "35/00009318",
    cityAr: "مكة المكرمة",
    cityEn: "MakkahAl-Mukarramah",
    phoneDisplay: "+966 55 229 3398",
    phoneRaw: "966552293398",
  },
  contract: {
    referenceNumber: "40169",
    operationType: "استقبال",
    issueDate: "08/09/2026",
    tripNumber: "SV841",
    date: "2026-09-08",
    time: "22 : 01",
    flightCarrier: "الخطوط السعودية",
    firstParty: "شركة ميقات الخليج للنقل البري ترخيص رقم : 35/00009318",
    secondParty: "ماجد",
    secondPartyPhone: "+966 0501347193",
    passengerCount: 3,
    origin: "مطار الملك عبدالعزيز الدولي - جدة",
    destination: "مكة المكرمة - سويس المقام",
    preamble:
      "تم إبرام هذا العقد بين المتعاقدين بناءً على المادة (39) التاسعة والثلاثين من اللائحة المنظمة لنشاط النقل المتخصص وتأجير وتوجيه الحافلات، وبناءً على الفقرة (1) من المادة (39) التي تنص على أنه يجب على الناقل إبرام عقد نقل مع الأطراف المحددين في المادة (40) قبل تنفيذ عمليات النقل على الطرق البرية، وبما لا يخالف أحكام هذه اللائحة ووفقاً للضوابط التي تحددها هيئة النقل.\nوبناءً على ما سبق، تم إبرام عقد النقل بين الأطراف الآتية :",
    agreementClause:
      "اتفق الطرفان على أن ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقاً مع الطرف الثاني وتوصيلهم إلى الوجهة المحددة في العقد.",
    cancellationPolicy:
      "في حال إلغاء التعاقد لأي سبب شخصي أو أسباب أخرى تتعلق في الحجوزات أو الأنظمة تكون سياسة الإلغاء والاستبدال حسب نظام وزارة التجارة السعودية. في حالة الحجز وتم الإلغاء قبل موعد الرحلة بأكثر من 24 ساعة يتم استرداد المبلغ كامل.",
    electronicBookingClause:
      "في حال طلب الطرف الثاني الحجز من خلال الموقع الإلكتروني للمؤسسة، يعتبر هذا الحجز وموافقته على الشروط والأحكام بالموقع الإلكتروني هو موافقة على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف الأول بواسطة حافلات المؤسسة المرخصة والمتوافقة مع الاشتراطات المقررة من هيئة النقل.",
    warningNotice:
      "في حال عدم تطابق بيانات الضيف مع الاثبات نكن عرضه للجزاء وهذا تعهد منا بذلك",
  },
  driver: {
    name: "علي أحمد غلام أحمد",
    role: "السائق الأساسي",
    nationalId: "2553660073",
    mobile: "0542273515",
    plateNumber: "ا ص ل 7223",
    photoUrl: "/taxi-driver.png",
    signatureUrl: "",
  },
  passengers: [
    { id: 1, name: "ماجد", nationality: "سعودي", idNumber: "X2328689" },
    { id: 2, name: "ونجود", nationality: "سعودي", idNumber: "X5638429" },
    { id: 3, name: "وداد", nationality: "سعودي", idNumber: "X747885588" },
  ],
  inspection: {
    date: "08/09/2026",
    time: "14:41",
    dashboard: [
      { id: "fuel", nameAr: "مؤشر الوقود", sound: true, notes: "" },
      { id: "temp", nameAr: "مؤشر الحرارة", sound: true, notes: "" },
      { id: "oil_pressure", nameAr: "مؤشر ضغط الزيت", sound: true, notes: "" },
      { id: "check_engine", nameAr: "لمبة فحص المحرك", sound: true, notes: "" },
      { id: "abs", nameAr: "ABS", sound: true, notes: "" },
      { id: "warning_light", nameAr: "لمبات التحذير", sound: true, notes: "" },
    ],
    external: [
      { id: "tires", nameAr: "الإطارات وضغط الهواء", sound: true, notes: "" },
      { id: "lights", nameAr: "الأنوار الأمامية و الخلفية", sound: true, notes: "" },
      { id: "signals", nameAr: "الإشارات التحذيرية", sound: true, notes: "" },
      { id: "glass", nameAr: "الزجاج والمرايا", sound: true, notes: "" },
      { id: "leaks", nameAr: "عدم وجود تسريبات", sound: true, notes: "" },
    ],
    safety: [
      { id: "extinguisher", nameAr: "طفاية حريق", sound: true, notes: "" },
      { id: "triangle", nameAr: "مثلث تحذيري", sound: true, notes: "" },
      { id: "first_aid", nameAr: "حقيبة اسعافات أولية", sound: true, notes: "" },
      { id: "hammer", nameAr: "مطرقة كسر الزجاج", sound: true, notes: "" },
      { id: "belts", nameAr: "أحزمة الأمان", sound: true, notes: "" },
    ],
    declarationText: "أقر انا السائق أعلاه بأنني قمت بفحص الحافلة و التأكد من سلامتها وجاهزيتها قبل التشغيل.",
  },
  options: {
    showStamp: true,
    showSignature: true,
    showFooterLogo: true,
    accentColor: "#f1f5f9",
  },
};

/**
 * Returns the current date in Saudi Arabia (Asia/Riyadh) as YYYY/MM/DD
 */
export function getSaudiTodayDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // en-CA gives YYYY-MM-DD
  return parts.replace(/-/g, "/");
}

/**
 * Returns the current time in Saudi Arabia (Asia/Riyadh) as HH:MM (24-hour format)
 */
export function getSaudiCurrentTimeStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Formats any date input into the official DD/MM/YYYY for Saudi transport contract display.
 * Accurately handles YYYY/MM/DD, DD/MM/YYYY, ISO timestamp strings (with "T"), and Date objects in Asia/Riyadh.
 */
export function formatOfficialDate(val?: string | Date | null): string {
  if (!val) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Riyadh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    // If it is a plain date string without time ("T")
    if (!trimmed.includes("T")) {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }
      const parts = trimmed.replace(/-/g, "/").split("/");
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
      }
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
      }
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

