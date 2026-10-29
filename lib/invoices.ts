import { backendRequest, backendUrl, getAuthToken } from "./backend";
import type { TransportDetails } from "./invoice-transport";
import type { Buyer, InvoiceLineInput } from "./zatca";
export type { Buyer, InvoiceLineInput } from "./zatca";
export const INVOICE_TYPE_LABELS = { BOOKING: "فاتورة حجز", PROFORMA: "فاتورة مبدئية", TAX: "مستند ضريبي" };
export type InvoiceDocumentType = keyof typeof INVOICE_TYPE_LABELS;
export interface InvoiceBankDetails { bankName: string; accountHolder: string; accountNumber?: string; iban?: string; swiftCode?: string }
export interface TaxDocument { kind: "INVOICE" | "CREDIT" | "DEBIT"; profile: "STANDARD" | "SIMPLIFIED"; supplyDate: string; originalInvoiceId?: string; adjustmentReason?: string; adjustmentEventDate?: string }
export function invoiceTitle(value: { documentType?: InvoiceDocumentType; taxDocument?: Pick<TaxDocument, "kind" | "profile"> }): string {
  if (value.documentType !== "TAX") return INVOICE_TYPE_LABELS[value.documentType || "BOOKING"];
  const title = value.taxDocument?.profile === "STANDARD" ? "فاتورة ضريبية" : "فاتورة ضريبية مبسطة";
  return value.taxDocument?.kind === "CREDIT" ? `إشعار دائن - ${title}` : value.taxDocument?.kind === "DEBIT" ? `إشعار مدين - ${title}` : title;
}
export interface InvoiceCompany { legalName: string; vatNumber?: string; commercialRegistration?: string; address?: Buyer["address"]; bankDetails?: InvoiceBankDetails | null; presentation?: { englishName: string; website: string; showSeal: boolean } }
export interface InvoiceSettings { company: InvoiceCompany | null }
export interface BookingInvoiceInput { taxDocument?: TaxDocument; documentType?: InvoiceDocumentType; bankDetails?: InvoiceBankDetails; operationKey: string; contractId?: string; invoiceDate: string; buyer: Buyer; paymentCode: string; accountingApproved: boolean; lines: InvoiceLineInput[]; transport?: TransportDetails }
export interface InvoiceRow { taxDocument?: TaxDocument; documentType?: InvoiceDocumentType; id: string; invoiceNumber: string; customerName: string; netAmount: string; vatAmount: string; totalAmount: string; invoiceDate: string; createdAt: string; status: "SAVED" }
export interface InvoiceDetail extends InvoiceRow { verificationUrl: string; snapshot: { issuer: InvoiceCompany; input: BookingInvoiceInput; totals: { net: string; vat: string; gross: string }; original?: { number: string; issueDate: string } }; contractId: string | null }
export const invoiceRequest = <T>(path = "", method = "GET", body?: unknown) => backendRequest<T>(`/invoices${path}`, method, body);
export function dateLabel(value: string): string { return new Date(value).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", calendar: "gregory" }); }
export async function downloadInvoice(id: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(backendUrl(`/invoices/${encodeURIComponent(id)}/pdf`), { credentials: "include", cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) throw new Error("تعذر تنزيل الفاتورة؛ حاول مرة أخرى");
  const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
  link.href = url; link.download = `invoice-${id}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
