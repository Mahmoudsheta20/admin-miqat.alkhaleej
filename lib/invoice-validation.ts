import type { InvoiceLineInput, TaxDocument } from "./invoices";
import type { TransportDetails } from "./invoice-transport";

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
const VAT_NUMBER_PATTERN = /^3\d{13}3$/;
const IDENTIFICATION_PATTERN = /^[A-Za-z0-9-]{1,30}$/;
const BUILDING_PATTERN = /^\d{4}$/;
const POSTAL_PATTERN = /^\d{5}$/;
const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DISTANCE_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;
const EXEMPTION_CODE_PATTERN = /^VATEX-SA-[A-Z0-9-]+$/;
const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9-]{4,34}$/;
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const SWIFT_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

const VALID_LINE_COMPONENTS = new Set([
  "OWN_SUPPLY",
  "SUPPLIER_CHARGE",
  "AGENCY_FEE",
  "COMMISSION",
]);

const VALID_TAX_CATEGORIES = new Set(["S", "Z_NO_REASON", "Z", "E", "O"]);

export interface BuyerValidationInput {
  name: string;
  vatNumber: string;
  street: string;
  building: string;
  district: string;
  city: string;
  postalCode: string;
  commercialRegistration: string;
}

export interface BankValidationInput {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
}

export interface Stage1ValidationResult {
  error: string;
  openBuyerDetails?: boolean;
}

export interface Stage2ValidationResult {
  error: string;
  isTransportError?: boolean;
}

function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Normalizes arbitrary bank detail JSON from settings into safe trimmed string fields. */
export function sanitizeBankForm(raw: unknown): BankValidationInput {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const field = (key: keyof BankValidationInput): string =>
    typeof source[key] === "string" ? source[key].trim() : "";
  return {
    bankName: field("bankName"),
    accountHolder: field("accountHolder"),
    accountNumber: field("accountNumber"),
    iban: field("iban"),
    swiftCode: field("swiftCode"),
  };
}

/** Checks whether preloaded bank details form a complete, sendable bank block. */
export function hasCompleteBankDetails(bank: BankValidationInput): boolean {
  return Boolean(
    bank.bankName.trim() &&
      bank.accountHolder.trim() &&
      (bank.accountNumber.trim() || bank.iban.trim()),
  );
}

/** Validates Stage 1 (document type, buyer identity, phone, national address, and passenger count). */
export function validateStage1Fields(params: {
  isTaxMode: boolean;
  taxDocument: Pick<TaxDocument, "kind" | "profile" | "adjustmentReason">;
  hasOriginal: boolean;
  buyer: BuyerValidationInput;
  contactPhone?: string;
  passengerCount?: number;
}): Stage1ValidationResult | null {
  const { isTaxMode, taxDocument, hasOriginal, buyer, contactPhone, passengerCount } = params;

  if (
    isTaxMode &&
    taxDocument.kind !== "INVOICE" &&
    (!hasOriginal || !taxDocument.adjustmentReason?.trim())
  ) {
    return {
      error: "اختر الفاتورة الأصلية وأدخل سبب إصدار الإشعار في المرحلة الأولى.",
    };
  }

  const buyerName = buyer.name.trim();
  if (!buyerName || buyerName.length > 200 || CONTROL_CHARS.test(buyerName)) {
    return { error: "أدخل اسم العميل أو المنشأة في المرحلة الأولى." };
  }

  if (!contactPhone) {
    return {
      error: "أدخل رقم جوال صحيحًا مع اختيار كود الدولة المناسب في المرحلة الأولى.",
    };
  }

  const vat = buyer.vatNumber.trim();
  if (vat && !VAT_NUMBER_PATTERN.test(vat)) {
    return {
      error: "الرقم الضريبي للمشتري يجب أن يتكون من 15 رقمًا ويبدأ وينتهي بالرقم 3.",
    };
  }

  const crn = buyer.commercialRegistration.trim();
  if (crn && !IDENTIFICATION_PATTERN.test(crn)) {
    return {
      error:
        "رقم السجل التجاري / المعرف يجب أن يحتوي على أحرف إنجليزية أو أرقام فقط (حتى 30 خانة).",
    };
  }

  const addressParts = [
    buyer.street,
    buyer.building,
    buyer.district,
    buyer.city,
    buyer.postalCode,
  ];
  const hasAnyAddress = addressParts.some((value) => value.trim().length > 0);
  const hasFullAddress = addressParts.every((value) => value.trim().length > 0);

  if (hasAnyAddress && !hasFullAddress) {
    return {
      error: "أكمل عنوان العميل: الشارع والمبنى والحي والمدينة والرمز البريدي.",
      openBuyerDetails: true,
    };
  }

  if (hasFullAddress) {
    if (!BUILDING_PATTERN.test(buyer.building.trim())) {
      return {
        error: "رقم المبنى في عنوان العميل يجب أن يتكون من 4 أرقام.",
        openBuyerDetails: true,
      };
    }
    if (!POSTAL_PATTERN.test(buyer.postalCode.trim())) {
      return {
        error: "الرمز البريدي في عنوان العميل يجب أن يتكون من 5 أرقام.",
        openBuyerDetails: true,
      };
    }
    if (
      [buyer.street, buyer.district, buyer.city].some(
        (v) => v.trim().length > 200 || CONTROL_CHARS.test(v),
      )
    ) {
      return {
        error: "راجع بيانات الشارع والحي والمدينة في عنوان العميل.",
        openBuyerDetails: true,
      };
    }
  }

  if (
    isTaxMode &&
    taxDocument.profile === "STANDARD" &&
    ((!vat && !crn) || !hasFullAddress)
  ) {
    return {
      error: "أكمل عنوان ومعرف المشتري في المرحلة الأولى.",
      openBuyerDetails: true,
    };
  }

  if (
    passengerCount !== undefined &&
    (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 100)
  ) {
    return { error: "عدد الركاب يجب أن يكون رقمًا صحيحًا من 1 إلى 100." };
  }

  return null;
}

/** Validates Stage 2 (trip route, dates, booking mode, and supplemental transport fields). */
export function validateStage2Fields(params: {
  transport: TransportDetails;
  bookingError?: string;
  transportError?: string;
}): Stage2ValidationResult | null {
  const { transport, bookingError, transportError } = params;

  const origin = transport.origin.trim();
  if (!origin || origin.length > 160 || CONTROL_CHARS.test(origin)) {
    return { error: "أدخل عنوان الانطلاق للمتابعة إلى السعر والضريبة." };
  }

  const destination = transport.destination.trim();
  if (!destination || destination.length > 160 || CONTROL_CHARS.test(destination)) {
    return { error: "أدخل عنوان الوصول للمتابعة إلى السعر والضريبة." };
  }

  if (!isValidIsoCalendarDate(transport.tripDate)) {
    return { error: "اختر تاريخ الذهاب للرحلة بصيغة صحيحة في المرحلة الثانية." };
  }

  if (transport.departureTime && !TIME_24H_PATTERN.test(transport.departureTime)) {
    return { error: "صيغة وقت الذهاب غير صالحة." };
  }

  if (transport.arrivalDate && !isValidIsoCalendarDate(transport.arrivalDate)) {
    return { error: "تاريخ الوصول غير صالح في المرحلة الثانية.", isTransportError: true };
  }

  if (transport.arrivalTime && !TIME_24H_PATTERN.test(transport.arrivalTime)) {
    return { error: "صيغة وقت الوصول غير صالحة.", isTransportError: true };
  }

  if (
    transport.vehicleCapacity !== undefined &&
    (!Number.isInteger(transport.vehicleCapacity) ||
      transport.vehicleCapacity < 1 ||
      transport.vehicleCapacity > 100)
  ) {
    return {
      error: "سعة المركبة يجب أن تكون رقمًا صحيحًا من 1 إلى 100.",
      isTransportError: true,
    };
  }

  if (
    transport.billedDistance?.trim() &&
    !DISTANCE_PATTERN.test(transport.billedDistance.trim())
  ) {
    return {
      error: "أدخل المسافة المفوترة بأرقام صحيحة أو عشرية (حتى 3 منازل).",
      isTransportError: true,
    };
  }

  if (bookingError) {
    return { error: bookingError };
  }

  if (transportError) {
    return { error: transportError, isTransportError: true };
  }

  return null;
}

/** Validates Stage 3 (service line descriptions/codes/tax exemptions and optional bank details). */
export function validateStage3Fields(params: {
  lines: InvoiceLineInput[];
  estimateValid: boolean;
  estimateError?: string;
  checkBank: boolean;
  bankDetails: BankValidationInput;
}): string | null {
  const { lines, estimateValid, estimateError, checkBank, bankDetails } = params;

  if (!lines.length) {
    return "أضف خدمة واحدة على الأقل في المرحلة الثالثة.";
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const rowNum = i + 1;
    const desc = (line.description || "").trim();
    if (!desc || desc.length > 200 || CONTROL_CHARS.test(desc)) {
      return `أدخل وصف الخدمة للبند رقم ${rowNum} في المرحلة الثالثة.`;
    }
    const code = (line.code || "").trim();
    if (!code || code.length > 200 || CONTROL_CHARS.test(code)) {
      return `أدخل رمز الخدمة للبند رقم ${rowNum} في المرحلة الثالثة.`;
    }
    if (!VALID_LINE_COMPONENTS.has(line.component)) {
      return `اختر طبيعة التوريد للبند رقم ${rowNum} في المرحلة الثالثة.`;
    }
    if (!line.category || !VALID_TAX_CATEGORIES.has(line.category)) {
      return `اختر المعاملة الضريبية للبند رقم ${rowNum} في المرحلة الثالثة.`;
    }
    if (line.category !== "S" && line.category !== "Z_NO_REASON") {
      const exCode = (line.exemptionCode || "").trim();
      if (exCode && !EXEMPTION_CODE_PATTERN.test(exCode)) {
        return `رمز الإعفاء الضريبي للبند رقم ${rowNum} يجب أن يبدأ بـ VATEX-SA- (أحرف إنجليزية وأرقام فقط).`;
      }
      if (line.exemptionReason && CONTROL_CHARS.test(line.exemptionReason)) {
        return `راجع سبب الإعفاء الضريبي للبند رقم ${rowNum}.`;
      }
    }
  }

  if (!estimateValid) {
    return estimateError || "راجع قيم الخدمات في المرحلة الثالثة.";
  }

  if (checkBank) {
    const bankName = bankDetails.bankName.trim();
    const accountHolder = bankDetails.accountHolder.trim();
    const accountNumber = bankDetails.accountNumber.trim();
    const iban = bankDetails.iban.replace(/\s/g, "").toUpperCase();
    const swiftCode = bankDetails.swiftCode.trim().toUpperCase();

    if (!bankName || bankName.length > 200 || CONTROL_CHARS.test(bankName)) {
      return "أدخل اسم البنك في بيانات التحويل البنكي بالمرحلة الثالثة أو أزل تفعيل خيار التحويل البنكي.";
    }
    if (
      !accountHolder ||
      accountHolder.length > 200 ||
      CONTROL_CHARS.test(accountHolder)
    ) {
      return "أدخل اسم صاحب الحساب في بيانات التحويل البنكي بالمرحلة الثالثة.";
    }
    if (!accountNumber && !iban) {
      return "أدخل رقم الحساب أو الآيبان (IBAN) في بيانات التحويل البنكي بالمرحلة الثالثة.";
    }
    if (accountNumber && !ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      return "رقم الحساب البنكي يجب أن يتكون من 4 إلى 34 حرفًا أو رقمًا إنجليزيًا.";
    }
    if (iban && !IBAN_PATTERN.test(iban)) {
      return "رقم الآيبان (IBAN) غير صالح (مثال: SA متبوعة بـ 22 رقمًا دون أحرف عربية).";
    }
    if (swiftCode && !SWIFT_PATTERN.test(swiftCode)) {
      return "رمز السويفت (SWIFT) يجب أن يتكون من 8 أو 11 خانة بالأحرف الإنجليزية والأرقام.";
    }
  }

  return null;
}
