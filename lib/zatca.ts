import type { BillingUnit, TransportDetails } from "./invoice-transport";
import { backendRequest, backendUrl, getAuthToken } from "./backend";
export const STATUS_LABELS: Record<string, string> = { DRAFT: "مسودة", READY: "جاهزة للتحقق الرسمي", GENERATED: "مولدة", PENDING_CLEARANCE: "بانتظار الاعتماد", CLEARED: "معتمدة", PENDING_REPORTING: "بانتظار الإبلاغ", REPORTED: "تم الإبلاغ", ACCEPTED_WITH_WARNINGS: "مقبولة بتحذيرات", REJECTED: "مرفوضة", TRANSMISSION_FAILED: "تعذر الإرسال" };
export const ENV_LABELS: Record<string, string> = { SANDBOX: "اختبار المطورين", SIMULATION: "المحاكاة", PRODUCTION: "الإنتاج" };
export interface Issuer { id: string; legalName: string; vatNumber: string }
export interface EgsUnit { id: string; issuerId: string; identity: string; environment: string; invoiceTypes: string; certificateStatus: string; certificateExpiresAt: string | null; credentialVersion: number; complianceChecks: string[]; productionEnabled: boolean; counter: number }
export interface ZatcaSettings { issuers: Issuer[]; egs: EgsUnit[]; sdkConfigured: boolean; productionPermitted: boolean }
export interface InvoiceRow { id: string; invoiceNumber: string | null; customerName: string; profile: string; kind: string; status: string; authorityOutcome: string | null; vatAmount: string; totalAmount: string; issueAt: string | null; createdAt: string; reportedAt: string | null; clearedAt: string | null; reportingDueAt: string | null; egs: { identity: string; environment: string } }
export interface InvoiceLineInput { billingUnit?: BillingUnit; code: string; description: string; quantity: string; unitPrice: string; discount: string; category: string; rate: string; exemptionCode?: string; exemptionReason?: string; component: string; taxReviewed: boolean }
export interface Buyer { name: string; vatNumber?: string; address?: { street: string; building: string; district: string; city: string; postalCode: string; country: string }; identification?: string; identificationScheme?: string }
export interface InvoiceSnapshot { issuer: { legalName: string; vatNumber: string }; input: { transport?: TransportDetails; buyer: Buyer; lines: InvoiceLineInput[]; egsId: string; paymentCode: string }; totals: { net: string; vat: string; gross: string }; original?: { number: string; uuid: string } }
export interface InvoiceDetail extends InvoiceRow { snapshot: InvoiceSnapshot; uuid: string | null; icv: number | null; invoiceHash: string | null; previousInvoiceHash: string | null; deliverable: boolean; isOverdue: boolean; contractId: string | null; adjustmentReason: string | null; submissions: { id: string; attempt: number; attemptedAt: string; httpStatus: number | null; outcome: string | null; response: unknown; errorCode: string | null; correlationId: string }[]; audit: { id: string; action: string; createdAt: string; actorId: string }[]; job: { state: string; attempts: number; availableAt: string } | null }
export const zatcaRequest = <T>(path: string, method = "GET", body?: unknown) => backendRequest<T>(`/zatca${path}`, method, body);
export function dateLabel(value: string | null): string { return value ? new Date(value).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", calendar: "gregory" }) : "—"; }
export async function downloadInvoice(id: string, kind: "PDF" | "XML" | "QR"): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(backendUrl(`/zatca/invoices/${encodeURIComponent(id)}/artifacts/${kind}`), { credentials: "include", cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error("تعذر تنزيل المستند؛ تحقق من حالة الفاتورة");
  const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
  link.href = url; link.download = `invoice-${id}.${kind === "QR" ? "txt" : kind.toLowerCase()}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const OUTCOME_LABELS: Record<string, string> = { ACCEPTED: "مقبولة", WARNING: "مقبولة بتحذيرات", RETRY: "ستعاد المحاولة", REJECTED: "مرفوضة", MANUAL: "تحتاج مراجعة", AMBIGUOUS: "استجابة غير مؤكدة" };
export const AUDIT_LABELS: Record<string, string> = { DRAFT_CREATED: "حفظ المسودة", DRAFT_REVIEWED: "مراجعة بيانات المسودة", SDK_VALIDATION_PASSED: "اجتياز التحقق الرسمي المحلي", INVOICE_GENERATED: "توليد الفاتورة وتثبيت هويتها", SUBMISSION_STARTED: "بدء الإرسال", SUBMISSION_FINISHED: "تسجيل نتيجة الإرسال", TRANSMISSION_RETRY_REQUESTED: "طلب إعادة الإرسال", ARTIFACT_DOWNLOADED: "تنزيل مستند", PDF_GENERATED: "توليد النسخة المقروءة" };
