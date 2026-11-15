import { backendRequest, backendUrl, queryString } from "./backend";
import type { TransportDetails } from "./invoice-transport";
import { moneyDecimal, signedMoneyMinor } from "./money";
import type { Buyer, InvoiceLineInput } from "./zatca";
export type { Buyer, InvoiceLineInput } from "./zatca";
export const INVOICE_TYPE_LABELS = { BOOKING: "فاتورة حجز", PROFORMA: "فاتورة مبدئية", TAX: "مستند ضريبي" };
export type InvoiceDocumentType = keyof typeof INVOICE_TYPE_LABELS;
export type InvoiceListFilterType = "ALL" | "BOOKING" | "PROFORMA" | "TAX" | "NOTES";
export interface InvoiceBankDetails { bankName: string; accountHolder: string; accountNumber?: string; iban?: string; swiftCode?: string }
export interface TaxDocument { kind: "INVOICE" | "CREDIT" | "DEBIT"; profile: "STANDARD" | "SIMPLIFIED"; supplyDate: string; originalInvoiceId?: string; adjustmentReason?: string; adjustmentEventDate?: string }
export function invoiceTitle(value: { documentType?: InvoiceDocumentType; taxDocument?: Pick<TaxDocument, "kind" | "profile"> }): string {
  if (value.documentType !== "TAX") return INVOICE_TYPE_LABELS[value.documentType || "BOOKING"];
  const title = value.taxDocument?.profile === "STANDARD" ? "فاتورة ضريبية" : "فاتورة ضريبية مبسطة";
  return value.taxDocument?.kind === "CREDIT" ? `إشعار دائن - ${title}` : value.taxDocument?.kind === "DEBIT" ? `إشعار مدين - ${title}` : title;
}
export interface InvoiceCompany { legalName: string; vatNumber?: string; commercialRegistration?: string; address?: Buyer["address"]; bankDetails?: InvoiceBankDetails | null; presentation?: { englishName: string; website: string; showSeal: boolean } }
export interface InvoiceSettings { company: InvoiceCompany | null }
export interface BookingInvoiceInput { customerId?:string; contractIds?:string[]; contractVersions?:Record<string,number>; accounting?: { revenueAccountCode: string; settlementAccountCode: string }; taxDocument?: TaxDocument; documentType?: InvoiceDocumentType; bankDetails?: InvoiceBankDetails; operationKey: string; contractId?: string; invoiceDate: string; buyer: Buyer; paymentCode: string; accountingApproved: boolean; lines: InvoiceLineInput[]; transport?: TransportDetails }
export interface InvoiceVisibility {isArchived:boolean;reason:string;changedAt:string;version:number}
export interface InvoiceAdjustmentSummary { id: string; invoiceNumber: string; kind: "CREDIT" | "DEBIT"; invoiceDate: string; netAmount: string; vatAmount: string; totalAmount: string; adjustmentReason?: string }
export interface OriginalInvoiceSummary { id: string; invoiceNumber: string; invoiceDate: string; netAmount: string; vatAmount: string; totalAmount: string }
export interface TaxOriginalRow { id: string; invoiceNumber: string; customerName: string; profile: "STANDARD" | "SIMPLIFIED"; invoiceDate: string; netAmount: string; vatAmount: string; totalAmount: string; remainingNet: string; remainingVat: string; remainingGross: string }
export interface InvoiceCreditBucketBalance { category: InvoiceLineInput["category"]; rate: string; exemptionCode?: string; remainingNet: string; remainingVat: string }
export interface InvoiceCreditBalance { availableNet: string; availableVat: string; availableGross: string; creditedNet: string; creditedVat: string; creditedGross: string; debitedNet: string; debitedVat: string; debitedGross: string; adjustmentsCount: number; remainingGroups: InvoiceCreditBucketBalance[] }
export interface CalculatedInvoiceLine extends InvoiceLineInput { net: string; vat: string; gross: string }
export interface InvoiceTaxGroup { category: InvoiceLineInput["category"]; rate: string; exemptionCode?: string; exemptionReason?: string; taxable: string; tax: string }
export interface InvoiceTripSnapshot { contractId: string; reference: string; date: string; time: string; origin: string; destination: string; guestName: string; vehiclePlate: string; netAmount: string }
export interface InvoiceRow { visibility?:InvoiceVisibility|null; taxDocument?: TaxDocument; documentType?: InvoiceDocumentType; id: string; invoiceNumber: string; customerName: string; netAmount: string; vatAmount: string; totalAmount: string; invoiceDate: string; createdAt: string; status: "SAVED" }
export interface InvoiceDetail extends InvoiceRow { verificationUrl: string; snapshot: { trips?: InvoiceTripSnapshot[]; issuer: InvoiceCompany; input: BookingInvoiceInput; totals: { net: string; vat: string; gross: string; lines?: CalculatedInvoiceLine[]; groups?: InvoiceTaxGroup[] }; original?: { number: string; issueDate: string } }; contractId: string | null; adjustments?: InvoiceAdjustmentSummary[]; creditBalance?: InvoiceCreditBalance; originalInvoice?: OriginalInvoiceSummary }
export const invoiceRequest = <T>(path = "", method = "GET", body?: unknown) => backendRequest<T>(`/invoices${path}`, method, body);
export function dateLabel(value: string, language: "ar"|"en" = "ar"): string { return new Date(value).toLocaleString(language === "en"?"en-GB":"ar-SA", { timeZone: "Asia/Riyadh", calendar: "gregory" }); }

export function isValidIsoDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

export function hasInvertedDateRange(fromDate: string, toDate: string): boolean {
  return isValidIsoDateString(fromDate) && isValidIsoDateString(toDate) && fromDate.trim() > toDate.trim();
}

export function invoiceRiyadhDateKey(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

/** Builds a `/invoices?...` path preserving pagination, archive toggle, type filter, search, and valid date bounds. */
export function buildInvoiceListQueryPath(params: {
  page?: number;
  archived?: boolean;
  type?: InvoiceListFilterType;
  search?: string;
  fromDate?: string;
  toDate?: string;
}): string {
  const page = typeof params.page === "number" && Number.isInteger(params.page) && params.page > 0 ? params.page : 1;
  const fromDate = params.fromDate && isValidIsoDateString(params.fromDate) ? params.fromDate.trim() : "";
  const toDate = params.toDate && isValidIsoDateString(params.toDate) ? params.toDate.trim() : "";
  const dateRangeValid = !fromDate || !toDate || fromDate <= toDate;
  const trimmedSearch = params.search?.trim() || "";

  let documentType: "BOOKING" | "PROFORMA" | "TAX" | undefined;
  let kind: "INVOICE" | "NOTES" | undefined;
  if (params.type === "BOOKING") {
    documentType = "BOOKING";
  } else if (params.type === "PROFORMA") {
    documentType = "PROFORMA";
  } else if (params.type === "TAX") {
    documentType = "TAX";
    kind = "INVOICE";
  } else if (params.type === "NOTES") {
    kind = "NOTES";
  }

  return `/invoices${queryString({
    page,
    archived: params.archived ? "true" : "false",
    documentType,
    kind,
    search: trimmedSearch || undefined,
    fromDate: dateRangeValid && fromDate ? fromDate : undefined,
    toDate: dateRangeValid && toDate ? toDate : undefined,
  })}`;
}

/** Client-side filter fallback for fixture/in-memory pages and instant search feedback. */
export function filterInvoiceRows(
  rows: InvoiceRow[],
  params: {
    type?: InvoiceListFilterType;
    search?: string;
    fromDate?: string;
    toDate?: string;
  },
): InvoiceRow[] {
  const q = params.search?.trim().toLowerCase() || "";
  const fromDate = params.fromDate && isValidIsoDateString(params.fromDate) ? params.fromDate.trim() : "";
  const toDate = params.toDate && isValidIsoDateString(params.toDate) ? params.toDate.trim() : "";
  const applyDateRange = !fromDate || !toDate || fromDate <= toDate;

  return rows.filter((row) => {
    const docType = row.documentType || "BOOKING";
    const isNote = row.taxDocument?.kind === "CREDIT" || row.taxDocument?.kind === "DEBIT";

    if (params.type === "BOOKING" && (docType !== "BOOKING" || isNote)) return false;
    if (params.type === "PROFORMA" && docType !== "PROFORMA") return false;
    if (params.type === "TAX" && (docType !== "TAX" || isNote)) return false;
    if (params.type === "NOTES" && !isNote) return false;

    if (applyDateRange && (fromDate || toDate)) {
      const dateKey = invoiceRiyadhDateKey(row.invoiceDate);
      if (fromDate && dateKey < fromDate) return false;
      if (toDate && dateKey > toDate) return false;
    }

    if (!q) return true;
    return (
      row.invoiceNumber.toLowerCase().includes(q) ||
      row.customerName.toLowerCase().includes(q) ||
      row.totalAmount.includes(q)
    );
  });
}

/** Summarizes counts and exact decimal totals using minor-unit BigInt arithmetic. */
export function summarizeInvoicePage(rows: InvoiceRow[], serverTotal?: number) {
  let bookingCount = 0;
  let proformaCount = 0;
  let taxCount = 0;
  let notesCount = 0;
  let netMinor = BigInt(0);
  let vatMinor = BigInt(0);
  let grossMinor = BigInt(0);

  for (const item of rows) {
    const docType = item.documentType || "BOOKING";
    const isNote = item.taxDocument?.kind === "CREDIT" || item.taxDocument?.kind === "DEBIT";

    if (isNote) {
      notesCount += 1;
    } else if (docType === "PROFORMA") {
      proformaCount += 1;
    } else if (docType === "TAX") {
      taxCount += 1;
    } else {
      bookingCount += 1;
    }

    if (docType === "PROFORMA") continue;
    const sign = item.taxDocument?.kind === "CREDIT" ? -BigInt(1) : BigInt(1);
    netMinor += sign * signedMoneyMinor(item.netAmount);
    vatMinor += sign * signedMoneyMinor(item.vatAmount);
    grossMinor += sign * signedMoneyMinor(item.totalAmount);
  }

  return {
    total: typeof serverTotal === "number" ? serverTotal : rows.length,
    bookingCount,
    proformaCount,
    taxCount,
    notesCount,
    pageNetSum: moneyDecimal(netMinor),
    pageVatSum: moneyDecimal(vatMinor),
    pageGrossSum: moneyDecimal(grossMinor),
  };
}

/** Derives a single tax rate label when invoice lines share one rate, or flags mixed rates. */
export function normalizeInvoiceTaxRateLabel(lines: InvoiceLineInput[] | undefined): {
  displayRate: string;
  isMixed: boolean;
  isZeroOnly: boolean;
} {
  if (!lines || lines.length === 0) {
    return { displayRate: "15%", isMixed: false, isZeroOnly: false };
  }
  const rates = new Set(
    lines.map((line) => (line.category === "S" ? `${line.rate?.trim() || "15"}%` : "0%")),
  );
  if (rates.size > 1) {
    return { displayRate: "", isMixed: true, isZeroOnly: false };
  }
  const [onlyRate] = [...rates];
  return {
    displayRate: onlyRate || "15%",
    isMixed: false,
    isZeroOnly: onlyRate === "0%",
  };
}

/** Only active TAX invoices (never BOOKING, PROFORMA, or existing notes) can receive Credit/Debit notes. */
export function canIssueTaxAdjustment(
  detail: Pick<InvoiceDetail, "documentType" | "taxDocument" | "visibility">,
): boolean {
  return !detail.visibility?.isArchived && detail.documentType === "TAX" && detail.taxDocument?.kind === "INVOICE";
}

/** Validates whether a Credit Note gross amount fits within remaining creditable balance. */
export function creditLimitError(
  noteGross: string,
  balance: { availableGross?: string; remainingGross?: string } | null | undefined,
  isEnglish = false,
): string {
  if (!balance) return "";
  const availableRaw = balance.availableGross ?? balance.remainingGross;
  if (availableRaw === undefined) return "";
  const availableMinor = signedMoneyMinor(availableRaw);
  if (availableMinor <= BigInt(0)) {
    return isEnglish
      ? "The original invoice has no remaining creditable balance."
      : "لا يوجد رصيد متبقٍ قابل للاسترداد أو التخفيض على الفاتورة الأصلية.";
  }
  const noteMinor = signedMoneyMinor(noteGross);
  if (noteMinor > availableMinor) {
    const formattedAvailable = moneyDecimal(availableMinor);
    return isEnglish
      ? `Credit note total exceeds remaining creditable balance (${formattedAvailable} SAR).`
      : `إجمالي الإشعار الدائن يتجاوز الرصيد المتاح للتخفيض (${formattedAvailable} ر.س).`;
  }
  return "";
}

export async function downloadInvoice(id: string): Promise<void> {
  const response = await fetch(backendUrl(`/invoices/${encodeURIComponent(id)}/pdf`), { credentials: "include", cache: "no-store" });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) throw new Error("تعذر تنزيل الفاتورة؛ حاول مرة أخرى");
  const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
  link.href = url; link.download = `invoice-${id}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
