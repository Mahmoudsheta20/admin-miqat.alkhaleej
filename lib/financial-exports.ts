import {
  accountingRequest,
  type EXPENSE_CATEGORIES,
  type ReportPeriod,
  type VatRow,
} from "./accounting";
import { backendUrl, type ApiResult } from "./backend";
import { hasClientPermission, type PermissionModule } from "./permissions";
import type { SystemUser } from "./types";

export const ALL_EXPORT_SECTIONS = [
  "INVOICES",
  "PURCHASES",
  "PAYMENTS",
  "INCOME_STATEMENT",
  "TRIAL_BALANCE",
  "JOURNALS",
  "VAT_RETURN",
  "VEHICLES",
  "ACCOUNTS",
] as const;

export type ExportSectionId = (typeof ALL_EXPORT_SECTIONS)[number];
export type ExportFormat = "csv" | "pdf" | "json";
export type ExportLanguage = "ar" | "en";

export const SECTION_REQUIRED_PERMISSIONS: Record<
  ExportSectionId,
  readonly PermissionModule[]
> = {
  INVOICES: ["invoices", "accounting"],
  PURCHASES: ["purchases", "accounting"],
  PAYMENTS: ["accounting"],
  INCOME_STATEMENT: ["accounting"],
  TRIAL_BALANCE: ["accounting"],
  JOURNALS: ["accounting"],
  VAT_RETURN: ["vatReturns", "accounting"],
  VEHICLES: ["accounting"],
  ACCOUNTS: ["accounts", "accounting"],
};

export interface SectionMetadata {
  id: ExportSectionId;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const EXPORT_SECTION_META: Record<ExportSectionId, SectionMetadata> = {
  INVOICES: {
    id: "INVOICES",
    ar: "فواتير المبيعات والإشعارات",
    en: "Sales Invoices & Notes",
    descriptionAr: "الفواتير الضريبية والحجوزات وإشعارات الدائن/المدين وحالة التحصيل",
    descriptionEn: "Tax/booking invoices, proformas, credit/debit notes, and payment status",
  },
  PURCHASES: {
    id: "PURCHASES",
    ar: "المشتريات ومصروفات الأسطول",
    en: "Purchases & Fleet Expenses",
    descriptionAr: "فواتير الموردين، التصنيف، المركبة، ضريبة المدخلات وحالة السداد",
    descriptionEn: "Supplier bills, categories, vehicle plates, recoverable VAT, and balances",
  },
  PAYMENTS: {
    id: "PAYMENTS",
    ar: "سندات القبض والصرف",
    en: "Receipts & Payments",
    descriptionAr: "حركات التحصيل من العملاء وسداد الموردين عبر البنك والصندوق",
    descriptionEn: "Customer receipts and supplier disbursements across cash/bank accounts",
  },
  INCOME_STATEMENT: {
    id: "INCOME_STATEMENT",
    ar: "قائمة الدخل والأرباح",
    en: "Income Statement (P&L)",
    descriptionAr: "الإيرادات التشغيلية والمصروفات وصافي الربح قبل وبعد المخصص",
    descriptionEn: "Operating revenues, expenses, and net profit before/after tax provision",
  },
  TRIAL_BALANCE: {
    id: "TRIAL_BALANCE",
    ar: "ميزان المراجعة",
    en: "Trial Balance",
    descriptionAr: "الأرصدة الافتتاحية وحركة الفترة والأرصدة الختامية لجميع الحسابات",
    descriptionEn: "Opening, period movements, and closing balances across accounts",
  },
  JOURNALS: {
    id: "JOURNALS",
    ar: "دفتر القيود اليومية",
    en: "Journal Entries",
    descriptionAr: "تفاصيل أسطر القيود المرحّلة والمصادر وأرقام المركبات",
    descriptionEn: "Posted double-entry journal lines, sources, and linked vehicles",
  },
  VAT_RETURN: {
    id: "VAT_RETURN",
    ar: "الإقرار الضريبي (1–16)",
    en: "VAT Return (Boxes 1–16)",
    descriptionAr: "ملخص وخانات إقرار ضريبة القيمة المضافة للمطابقة والمراجعة",
    descriptionEn: "ZATCA VAT boxes 1–16, recoverable tax, and net VAT position",
  },
  VEHICLES: {
    id: "VEHICLES",
    ar: "ربحية المركبات والأسطول",
    en: "Vehicle Profitability",
    descriptionAr: "إيرادات وتكاليف وصافي الربح وهامش كل لوحة مركبة",
    descriptionEn: "Per-plate revenue, direct operating cost, profit, and margin %",
  },
  ACCOUNTS: {
    id: "ACCOUNTS",
    ar: "دليل الحسابات",
    en: "Chart of Accounts",
    descriptionAr: "هيكل الحسابات والرموز المحاسبية وحالة التفعيل والترحيل",
    descriptionEn: "Account hierarchy, codes, normal balances, and posting status",
  },
};

export interface ExportPreset {
  id: "COMPLETE_AUDIT" | "ZATCA_VAT_PACK" | "CASH_RECEIVABLES" | "MANAGEMENT_PNL";
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
  sections: ExportSectionId[];
}

export const EXPORT_PRESETS: readonly ExportPreset[] = [
  {
    id: "COMPLETE_AUDIT",
    ar: "ملف المراجعة الشامل",
    en: "Complete Audit Pack",
    descriptionAr: "كافة الأقسام الـ 9 في تقرير موحد للمحاسب والمراجعة",
    descriptionEn: "All 9 financial datasets bundled for full external/internal audit",
    sections: [...ALL_EXPORT_SECTIONS],
  },
  {
    id: "ZATCA_VAT_PACK",
    ar: "حزمة الضريبة والزكاة",
    en: "ZATCA VAT & Tax Pack",
    descriptionAr: "الإقرار (1–16) مع فواتير المبيعات والمشتريات الخاضعة",
    descriptionEn: "VAT Return boxes 1–16 backed by sales invoices and purchases",
    sections: ["VAT_RETURN", "INVOICES", "PURCHASES"],
  },
  {
    id: "CASH_RECEIVABLES",
    ar: "النقدية والذمم والتحصيل",
    en: "Cash & Receivables Pack",
    descriptionAr: "سندات القبض والصرف والفواتير ومستحقات الموردين",
    descriptionEn: "Cash/bank receipts, disbursements, customer invoices, and bills",
    sections: ["PAYMENTS", "INVOICES", "PURCHASES"],
  },
  {
    id: "MANAGEMENT_PNL",
    ar: "تقرير الإدارة والربحية",
    en: "Management & Fleet P&L",
    descriptionAr: "قائمة الدخل وربحية المركبات وميزان المراجعة",
    descriptionEn: "Income statement, fleet profitability by vehicle, and trial balance",
    sections: ["INCOME_STATEMENT", "VEHICLES", "TRIAL_BALANCE"],
  },
];

export interface FinancialExportFilters {
  search: string;
  invoiceType: "ALL" | "TAX" | "BOOKING" | "PROFORMA" | "NOTES";
  invoicePaymentStatus:
    | "ALL"
    | "PAID"
    | "PARTIAL"
    | "UNPAID"
    | "REFUND_DUE"
    | "UNPOSTED";
  customerSearch: string;
  includeArchivedInvoices: boolean;
  purchaseCategory: "" | keyof typeof EXPENSE_CATEGORIES;
  purchaseDocumentType: "ALL" | "PURCHASE_INVOICE" | "PURCHASE_RETURN";
  purchasePostingStatus: "ALL" | "POSTED" | "DRAFT" | "LEGACY";
  purchasePaymentStatus: "ALL" | "PAID" | "PARTIAL" | "UNPAID" | "REFUND_DUE";
  supplierSearch: string;
  includeVoidedPurchases: boolean;
  paymentDirection: "ALL" | "RECEIPT" | "PAYMENT";
  paymentDocumentType: "ALL" | "SALE" | "PURCHASE";
  cashAccount: string;
  journalSourceType: string;
  accountCode: string;
  vehiclePlate: string;
  minAmount: string;
  maxAmount: string;
  nonZeroTrialOnly: boolean;
}

export const DEFAULT_EXPORT_FILTERS: FinancialExportFilters = {
  search: "",
  invoiceType: "ALL",
  invoicePaymentStatus: "ALL",
  customerSearch: "",
  includeArchivedInvoices: false,
  purchaseCategory: "",
  purchaseDocumentType: "ALL",
  purchasePostingStatus: "ALL",
  purchasePaymentStatus: "ALL",
  supplierSearch: "",
  includeVoidedPurchases: false,
  paymentDirection: "ALL",
  paymentDocumentType: "ALL",
  cashAccount: "",
  journalSourceType: "",
  accountCode: "",
  vehiclePlate: "",
  minAmount: "",
  maxAmount: "",
  nonZeroTrialOnly: true,
};

export interface ExportInvoicePreviewRow {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  documentType: string;
  taxKind: string | null;
  profile: string | null;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  paymentStatus: string | null;
  settledAmount: string;
  remainingBalance: string;
  isArchived: boolean;
}

export interface ExportPurchasePreviewRow {
  id: string;
  voucher: string;
  invoiceNumber: string;
  supplierName: string;
  supplierVatNumber: string | null;
  documentType: string;
  postingStatus: string;
  category: string;
  taxTreatment: string;
  issueDate: string;
  vatDate: string;
  vehiclePlate: string | null;
  paymentAccountCode: string;
  netAmount: string;
  vatAmount: string;
  recoverableVat: string;
  totalAmount: string;
  paymentStatus: string | null;
  remainingBalance: string;
  isVoided: boolean;
}

export interface ExportPaymentPreviewRow {
  id: string;
  paymentDate: string;
  direction: string;
  documentType: string;
  documentId: string;
  documentRef: string;
  cashAccount: string;
  reference: string;
  amount: string;
  journalNumber: string;
}

export interface ExportIncomePreviewRow {
  code: string;
  nameAr: string;
  nameEn: string | null;
  type: string;
  profitSection: string;
  debit: string;
  credit: string;
  net: string;
}

export interface ExportTrialPreviewRow {
  code: string;
  nameAr: string;
  nameEn: string | null;
  type: string;
  openingDebit: string;
  openingCredit: string;
  debit: string;
  credit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface ExportJournalPreviewRow {
  id: string;
  journalNumber: string;
  date: string;
  sourceType: string;
  sourceId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string | null;
  vehiclePlate: string | null;
  description: string;
  debit: string;
  credit: string;
}

export interface ExportVehiclePreviewRow {
  plate: string;
  revenue: string;
  cost: string;
  profit: string;
  marginPercent: string;
}

export interface ExportAccountPreviewRow {
  code: string;
  nameAr: string;
  nameEn: string;
  type: string;
  normalBalance: string;
  isPosting: boolean;
  isActive: boolean;
  profitSection: string;
}

export interface PreviewSectionData<Row, Totals = Record<string, string>> {
  count: number;
  truncated: boolean;
  rows: Row[];
  totals: Totals;
}

export interface FinancialExportPreviewResponse {
  meta: {
    generatedAt: string;
    period: ReportPeriod;
    sections: ExportSectionId[];
    previewLimit: number | null;
  };
  range: {
    mode: "QUARTER" | "YEAR" | "CUSTOM";
    start: string;
    endInclusive: string;
    year: number;
    quarter: number;
  };
  company: {
    legalName: string;
    vatNumber: string | null;
    commercialRegistration: string | null;
  };
  filters: FinancialExportFilters;
  summary: {
    totalSalesTotal: string;
    totalSalesVat: string;
    totalPurchasesTotal: string;
    totalRecoverableVat: string;
    totalReceipts: string;
    totalDisbursements: string;
    netProfitBeforeTax: string;
    netVatDue: string;
  };
  sections: {
    INVOICES?: PreviewSectionData<ExportInvoicePreviewRow>;
    PURCHASES?: PreviewSectionData<ExportPurchasePreviewRow>;
    PAYMENTS?: PreviewSectionData<ExportPaymentPreviewRow>;
    INCOME_STATEMENT?: PreviewSectionData<ExportIncomePreviewRow>;
    TRIAL_BALANCE?: PreviewSectionData<ExportTrialPreviewRow>;
    JOURNALS?: PreviewSectionData<ExportJournalPreviewRow>;
    VAT_RETURN?: {
      count: number;
      truncated: boolean;
      rows: VatRow[];
      summary: Record<string, string>;
      warnings: string[];
      totals: Record<string, string>;
    };
    VEHICLES?: PreviewSectionData<ExportVehiclePreviewRow>;
    ACCOUNTS?: PreviewSectionData<ExportAccountPreviewRow>;
  };
}

export interface FinancialExportPreviewPayload {
  period:
    | { mode: "QUARTER"; year: number; quarter: number }
    | { mode: "YEAR"; year: number }
    | { mode: "CUSTOM"; startDate: string; endDate: string };
  sections: ExportSectionId[];
  filters: FinancialExportFilters;
}

export interface FinancialExportDownloadPayload
  extends FinancialExportPreviewPayload {
  format: ExportFormat;
  language: ExportLanguage;
}

export function serializeReportPeriod(
  period: ReportPeriod,
): FinancialExportPreviewPayload["period"] {
  if (period.mode === "CUSTOM") {
    return {
      mode: "CUSTOM",
      startDate: period.startDate,
      endDate: period.endDate,
    };
  }
  if (period.mode === "YEAR") {
    return { mode: "YEAR", year: period.year };
  }
  return { mode: "QUARTER", year: period.year, quarter: period.quarter };
}

export function allowedExportSections(
  user: Pick<SystemUser, "role" | "email" | "permissions"> | null | undefined,
): ExportSectionId[] {
  if (!user || user.role !== "ADMIN") return [];
  return ALL_EXPORT_SECTIONS.filter((section) =>
    SECTION_REQUIRED_PERMISSIONS[section].some((mod) =>
      hasClientPermission(user, mod, "view"),
    ),
  );
}

export function resolvePresetSections(
  preset: ExportPreset,
  allowed: readonly ExportSectionId[],
): ExportSectionId[] {
  const allowedSet = new Set(allowed);
  return preset.sections.filter((s) => allowedSet.has(s));
}

export function countActiveAdvancedFilters(
  filters: FinancialExportFilters,
): number {
  let count = 0;
  if (filters.invoiceType !== "ALL") count++;
  if (filters.invoicePaymentStatus !== "ALL") count++;
  if (filters.customerSearch.trim()) count++;
  if (filters.includeArchivedInvoices) count++;
  if (filters.purchaseCategory) count++;
  if (filters.purchaseDocumentType !== "ALL") count++;
  if (filters.purchasePostingStatus !== "ALL") count++;
  if (filters.purchasePaymentStatus !== "ALL") count++;
  if (filters.supplierSearch.trim()) count++;
  if (filters.includeVoidedPurchases) count++;
  if (filters.paymentDirection !== "ALL") count++;
  if (filters.paymentDocumentType !== "ALL") count++;
  if (filters.cashAccount) count++;
  if (filters.journalSourceType) count++;
  if (filters.accountCode) count++;
  if (filters.vehiclePlate.trim()) count++;
  if (filters.minAmount.trim() || filters.maxAmount.trim()) count++;
  if (!filters.nonZeroTrialOnly) count++;
  return count;
}

export function buildPeriodShortcut(
  shortcut: "THIS_MONTH" | "THIS_QUARTER" | "THIS_YEAR",
  todayIso: string,
): ReportPeriod {
  const year = Number(todayIso.slice(0, 4)) || 2026;
  const month = Number(todayIso.slice(5, 7)) || 1;
  const quarter = Math.ceil(month / 3);
  if (shortcut === "THIS_YEAR") {
    return {
      mode: "YEAR",
      year,
      quarter,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }
  if (shortcut === "THIS_QUARTER") {
    return {
      mode: "QUARTER",
      year,
      quarter,
      startDate: `${year}-01-01`,
      endDate: todayIso,
    };
  }
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    mode: "CUSTOM",
    year,
    quarter,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export async function previewFinancialExport(
  payload: FinancialExportPreviewPayload,
): Promise<ApiResult<FinancialExportPreviewResponse>> {
  return accountingRequest<FinancialExportPreviewResponse>(
    "/exports/preview",
    "POST",
    payload,
  );
}

export async function downloadFinancialExport(
  payload: FinancialExportDownloadPayload,
  filename: string,
): Promise<void> {
  const response = await fetch(backendUrl("/accounting/exports/download"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      data?.error ||
        (payload.language === "en"
          ? "Failed to export financial bundle"
          : "تعذر تصدير الملف المالي"),
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
