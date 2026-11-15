import { backendUrl, backendRequest } from "./backend";
export const EXPENSE_CATEGORIES = { FUEL: "وقود", MAINTENANCE_TIRES: "صيانة وإطارات", VEHICLE_INSURANCE: "تأمين المركبات", SUBCONTRACTED_TRANSPORT: "نقل من الباطن", DRIVER_PAYROLL: "رواتب وتريبات السائقين", GOVERNMENT_FEES: "رسوم حكومية وتراخيص", RENT_UTILITIES: "إيجارات ومرافق واتصالات", MARKETING_SOFTWARE: "تسويق واشتراكات تقنية", ADMIN: "مصروفات إدارية" };
export const TAX_TREATMENTS = { STANDARD: "خاضع للضريبة 15%", ZERO_RATED: "خاضع للنسبة الصفرية 0%", EXEMPT: "معفى من الضريبة", OUT_OF_SCOPE: "خارج نطاق الضريبة" };
export interface PurchaseInput { documentType?: "PURCHASE_INVOICE" | "PURCHASE_RETURN"; originalPurchaseId?: string; accountCode?: string; paymentAccountCode?: string; vehicleId?: string; postImmediately?: boolean; supplierName: string; supplierVatNumber?: string | null; invoiceNumber: string; issueDate: string; vatDate: string; category: keyof typeof EXPENSE_CATEGORIES; taxTreatment: keyof typeof TAX_TREATMENTS; netAmount: string; vatAmount: string; recoverablePercent: string; evidenceReference?: string; vehiclePlate?: string; notes?: string }
export interface PurchaseRow extends PurchaseInput { id: string; voucher: string; postingStatus: "POSTED" | "DRAFT" | "LEGACY"; totalAmount: string; recoverableVat: string; version: number; createdAt: string; updatedAt: string; voidedAt: string | null; voidReason: string | null }
export interface PurchaseAudit { id: string; action: string; createdAt: string; actorId: string }
export interface PurchaseDetail extends PurchaseRow { audit: PurchaseAudit[] }
export interface PurchaseList { items: PurchaseRow[]; total: number; page: number; totals: { netAmount: string; vatAmount: string; recoverableVat: string; totalAmount: string } }
export interface VatSettings { version: number; previousCorrection: string; carriedCredit: string; notes: string; filedOn: string | null; updatedAt: string | null }
export interface VatRow { box: number; label: string; section: "SALES" | "PURCHASES" | "NET"; amount: string | null; adjustment: string | null; vat: string; displayVat?: string; isTotal: boolean }
export interface VatPurchase { id: string; supplierName: string; invoiceNumber: string; taxTreatment: string; vatDate: string; netAmount: string; vatAmount: string; recoverableVat: string; documentType?: string }
export interface VatSale { id: string; number: string; source: string; kind: string; date: string; net: string; vat: string; isPriorPeriodAdjustment: boolean; customerName?: string; documentType?: string }
export interface VatReport { year: number; quarter: number; period: { start: string; endExclusive: string; endInclusive?: string; dueDate: string | null }; company: { legalName: string; vatNumber: string }; generatedAt: string; settings: VatSettings; rows: VatRow[]; sales: VatSale[]; purchases: VatPurchase[]; warnings: string[]; coverage: { legacyCount: number; proformaCount: number; otherIssuerCount: number; basis: string; domesticPurchasesOnly: boolean }; summary: { netSales: string; outputVat: string; netPurchases: string; recordedInputVat: string; recoverableInputVat: string; nonRecoverableInputVat: string; currentVatDue: string; netVatDue: string; creditNet: string; debitNet: string; excludedOutsideScope: string }; manualSelection?: boolean; availableSales?: VatSale[]; availablePurchases?: VatPurchase[] }
export type VatField = "amount" | "adjustment" | "vat";
export function vatDisplayValue(row: VatRow, field: VatField): string | null {
  if (field !== "vat") return row[field];
  const value = row.displayVat ?? row.vat;
  // Also support old API responses and frozen reports with a signed credit.
  return row.box === 15 ? value.replace(/^-/, "") : value;
}
export function vatCopyPurpose(row: VatRow, field: VatField): "ENTRY" | "REVIEW" {
  return field === "vat" ? (row.box === 14 ? "ENTRY" : "REVIEW")
    : row.box <= 12 && ![6, 12].includes(row.box) ? "ENTRY" : "REVIEW";
}
export function vatPeriodEnd(period: VatReport["period"]): string {
  if (period.endInclusive) return period.endInclusive;
  const end = new Date(`${period.endExclusive}T00:00:00Z`);
  if (!Number.isFinite(end.getTime())) return "—";
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}
export const accountingRequest = <T>(path: string, method = "GET", body?: unknown) => backendRequest<T>(`/accounting${path}`, method, body);
export function currentSaudiPeriod() { const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const part = (type: string) => parts.find(value => value.type === type)?.value || ""; const year = Number(part("year")), month = Number(part("month")); return { year, quarter: Math.ceil(month / 3), day: `${part("year")}-${part("month")}-${part("day")}` }; }
export function amountLabel(value: string | number) { const parsed = Number(value); if (!Number.isFinite(parsed)) return "0.00"; return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed); }
function minor(value: string): bigint { if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) return BigInt(0); const [whole, fraction = ""] = value.split("."); return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0")); }
function fixed(value: bigint) { return `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`; }
export function purchasePreview(net: string, vat?: string) { const n = minor(net), v = vat === undefined ? (n * BigInt(15) + BigInt(50)) / BigInt(100) : minor(vat); return { vat: fixed(v), total: fixed(n + v) }; }

export interface ReportPeriod { mode: "QUARTER" | "YEAR" | "CUSTOM"; year: number; quarter: number; startDate: string; endDate: string }
export function defaultReportPeriod(): ReportPeriod { const c = currentSaudiPeriod(); return { mode: "QUARTER", year: c.year, quarter: c.quarter, startDate: `${c.year}-01-01`, endDate: c.day }; }
export function periodQuery(p: ReportPeriod) { return new URLSearchParams(p.mode === "CUSTOM" ? { mode: p.mode, startDate:p.startDate, endDate:p.endDate } : {mode:p.mode,year:String(p.year),...(p.mode === "QUARTER" ? {quarter:String(p.quarter)} : {})}).toString(); }
export function periodBody(p:ReportPeriod) { return Object.fromEntries(new URLSearchParams(periodQuery(p))); }
export function purchaseInclusive(total: string, standard = true) { const gross=minor(total),net=standard?(gross*BigInt(100)+BigInt(57))/BigInt(115):gross;return {net:fixed(net),vat:fixed(gross-net),total:fixed(gross)}; }
export const CATEGORY_ACCOUNTS: Record<keyof typeof EXPENSE_CATEGORIES,string>={FUEL:"5101",MAINTENANCE_TIRES:"5102",SUBCONTRACTED_TRANSPORT:"5103",VEHICLE_INSURANCE:"5104",DRIVER_PAYROLL:"5105",GOVERNMENT_FEES:"5106",RENT_UTILITIES:"5201",MARKETING_SOFTWARE:"5202",ADMIN:"5203"};
export interface Account {id:string;code:string;nameAr:string;nameEn:string;parentId:string|null;type:string;normalBalance:string;isPosting:boolean;isActive:boolean;isSystem:boolean;profitSection:string}
export interface TrialRow {code:string;nameAr:string;nameEn?:string;type:string;profitSection:string;openingDebit:string;openingCredit:string;debit:string;credit:string;closingDebit:string;closingCredit:string}
export interface FinancialReport {range:{start:string;endInclusive:string};profit:{revenue:string;expenses:string;beforeTax:string;taxExpense:string;afterTax:string};trial:TrialRow[];totals:{debit:string;credit:string;closingDebit:string;closingCredit:string};vehicles:{plate:string;revenue:string;cost:string;profit:string}[];unpostedInvoices:{id:string;number:number;invoiceDate:string;customerName:string}[];generatedAt:string}
export interface Journal {id:string;number:number;entryDate:string;description:string;sourceType:string;reversesId:string|null;reversal:{id:string;number:number}|null;lines:{id:string;accountCode:string;account:{nameAr:string;nameEn?:string};debit:string;credit:string;description:string;vehiclePlate?:string|null}[]}
export interface AccountLedgerEntry {id:string;journalId:string;number:number;entryNumber?:number;date:string;accountCode:string;accountNameAr:string;description:string;journalDescription?:string;sourceType:string;sourceId?:string|null;vehiclePlate?:string|null;debit:string;credit:string;balance:string;reversesId?:string|null;reversedById?:string|null}
export interface AccountLedgerResponse {account:Account;from:string|null;to:string|null;page:number;pageSize:number;total:number;openingBalance:string;openingDebit:string;openingCredit:string;debit:string;credit:string;closingBalance:string;closingDebit:string;closingCredit:string;entries:AccountLedgerEntry[]}
export interface PaymentListItem {id:string;reference:string;amount:string;paymentDate:string;direction:string;documentType?:string;documentId?:string;cashAccount?:string;journal:{number:number}}
export interface PaymentListResponse {items:PaymentListItem[];total?:number;page?:number;pageSize?:number}
export interface AccountingFile {id:string;fileName:string;size:number;createdAt:string}
const NON_CASH_11XX_CODES=new Set(["1103","1104","1105"]);
/** Returns active posting cash/bank sub-accounts under parent 1100. */
export function filterCashBankAccounts(accounts?:readonly Account[]|null):Account[] {
  if(!accounts?.length)return [];
  return accounts.filter(a=>a.isPosting&&a.isActive&&a.type==="ASSET"&&a.code.startsWith("11")&&!NON_CASH_11XX_CODES.has(a.code));
}
/** Returns active posting revenue sub-accounts eligible for sale posting (41xx excluding 4103). */
export function filterSaleRevenueAccounts(accounts?:readonly Account[]|null):Account[] {
  if(!accounts?.length)return [];
  return accounts.filter(a=>a.isPosting&&a.isActive&&a.type==="REVENUE"&&a.code.startsWith("41")&&a.code!=="4103");
}
/** Formats a compact period filename suffix matching quarter, year, or custom ranges. */
export function reportPeriodSlug(p:ReportPeriod):string {
  if(p.mode==="YEAR")return String(p.year);
  if(p.mode==="CUSTOM")return `${p.startDate}_${p.endDate}`;
  return `${p.year}-Q${p.quarter}`;
}
/** Builds a query suffix excluding blank/nullish values, returning "" when empty. */
export function buildAccountingQuery(params:Record<string,string|number|undefined|null>):string {
  const search=new URLSearchParams();
  for(const [k,v] of Object.entries(params)){
    if(v===undefined||v===null)continue;
    const text=String(v).trim();
    if(!text)continue;
    search.set(k,text);
  }
  const qs=search.toString();
  return qs?`?${qs}`:"";
}
/** Builds the API path for fetching a paginated account ledger with optional date and text filters. */
export function buildAccountLedgerPath(accountCode:string,params:{from?:string;to?:string;page?:number;search?:string}={}):string {
  const code=encodeURIComponent(accountCode.trim());
  return `/accounting/accounts/${code}/ledger${buildAccountingQuery({from:params.from,to:params.to,page:params.page&&params.page>1?params.page:undefined,search:params.search})}`;
}
export function journalSourceTypeLabel(sourceType:string,isEn:boolean):string {
  const map:Record<string,[string,string]>={
    MANUAL:["قيد يدوي","Manual entry"],
    SALE:["فاتورة مبيعات","Sales invoice"],
    INVOICE:["فاتورة مبيعات","Sales invoice"],
    PAYMENT:["سند قبض / سداد","Payment voucher"],
    PURCHASE:["فاتورة مشتريات","Purchase invoice"],
    TRIP_COMMISSION:["تريب","Trip"],
    SALARY:["مسير رواتب","Payroll"],
    CREDIT_NOTE:["إشعار دائن","Credit note"],
    DEBIT_NOTE:["إشعار مدين","Debit note"],
    REVERSAL:["قيد عكسي","Reversal"],
  };
  const entry=map[sourceType];
  return entry?(isEn?entry[1]:entry[0]):sourceType;
}
function signedMinor(value:string):bigint {
  const clean=value.trim();
  if(!/^-?\d{1,12}(\.\d{1,2})?$/.test(clean))return BigInt(0);
  const neg=clean.startsWith("-");
  const [whole,fraction=""]=(neg?clean.slice(1):clean).split(".");
  const abs=BigInt(whole)*BigInt(100)+BigInt(fraction.padEnd(2,"0"));
  return neg?-abs:abs;
}
function signedFixed(value:bigint):string {
  const neg=value<BigInt(0);
  const abs=neg?-value:value;
  return `${neg?"-":""}${abs/BigInt(100)}.${String(abs%BigInt(100)).padStart(2,"0")}`;
}
/** Runtime validator ensuring an API or fixture payload contains all nested sections required to render a VAT report safely. */
export function isValidVatReport(value: unknown): value is VatReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const summary = v.summary;
  const company = v.company;
  const period = v.period;
  const settings = v.settings;
  const coverage = v.coverage;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return false;
  if (typeof (summary as Record<string, unknown>).netVatDue !== "string") return false;
  if (!company || typeof company !== "object" || Array.isArray(company)) return false;
  if (typeof (company as Record<string, unknown>).legalName !== "string") return false;
  if (!period || typeof period !== "object" || Array.isArray(period)) return false;
  if (typeof (period as Record<string, unknown>).start !== "string") return false;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) return false;
  return (
    Array.isArray(v.rows) &&
    Array.isArray(v.sales) &&
    Array.isArray(v.purchases) &&
    Array.isArray(v.warnings)
  );
}

/** Computes a localized manual VAT return preview using exact minor-unit arithmetic when manual API is unavailable or updating interactively. */
export function computeClientManualVatReport(
  base: VatReport,
  selectedSaleIds: readonly string[],
  selectedPurchaseIds: readonly string[] | null,
  extraSales: readonly VatSale[] = [],
): VatReport {
  if (!isValidVatReport(base)) return base;
  const salePool = new Map<string, VatSale>();
  for (const s of base.availableSales || base.sales || []) salePool.set(s.id, s);
  for (const s of extraSales) if (!salePool.has(s.id)) salePool.set(s.id, s);
  const selectedSaleSet = new Set(selectedSaleIds);
  const chosenSales = [...salePool.values()].filter((s) => selectedSaleSet.has(s.id));

  const purchasePool = base.availablePurchases || base.purchases || [];
  const purchaseSet = selectedPurchaseIds ? new Set(selectedPurchaseIds) : null;
  const chosenPurchases = purchaseSet ? purchasePool.filter((p) => purchaseSet.has(p.id)) : purchasePool;

  let b1Amt = BigInt(0), b1Adj = BigInt(0), b1Vat = BigInt(0);
  let b3Amt = BigInt(0), b3Adj = BigInt(0), b3Vat = BigInt(0);
  let creditNet = BigInt(0), debitNet = BigInt(0);
  for (const s of chosenSales) {
    const net = signedMinor(s.net), vat = signedMinor(s.vat);
    if (s.kind === "CREDIT") creditNet += net < BigInt(0) ? -net : net;
    if (s.kind === "DEBIT") debitNet += net;
    const isZero = vat === BigInt(0);
    if (isZero) {
      if (s.isPriorPeriodAdjustment) b3Adj -= net; else b3Amt += net;
      b3Vat += vat;
    } else {
      if (s.isPriorPeriodAdjustment) b1Adj -= net; else b1Amt += net;
      b1Vat += vat;
    }
  }
  const salesTotalAmt = b1Amt + b3Amt;
  const salesTotalAdj = b1Adj + b3Adj;
  const salesTotalVat = b1Vat + b3Vat;

  let pNet = BigInt(0), pRecVat = BigInt(0), pRecordedVat = BigInt(0);
  let b7Amt = BigInt(0), b7Adj = BigInt(0), b7Vat = BigInt(0);
  let b10Amt = BigInt(0), b10Adj = BigInt(0), b10Vat = BigInt(0);
  for (const p of chosenPurchases) {
    if (p.taxTreatment === "OUT_OF_SCOPE") continue;
    const factor = p.documentType === "PURCHASE_RETURN" ? BigInt(-1) : BigInt(1);
    const net = signedMinor(p.netAmount), vat = signedMinor(p.vatAmount), rec = signedMinor(p.recoverableVat);
    pNet += net * factor;
    pRecordedVat += vat * factor;
    pRecVat += rec * factor;
    if (p.taxTreatment === "STANDARD") {
      if (factor < BigInt(0)) b7Adj += net; else b7Amt += net;
      b7Vat += rec * factor;
    } else {
      if (factor < BigInt(0)) b10Adj += net; else b10Amt += net;
      b10Vat += rec * factor;
    }
  }
  const pTotalAmt = b7Amt + b10Amt;
  const pTotalAdj = b7Adj + b10Adj;
  const currentDue = salesTotalVat - pRecVat;
  const prevCorr = signedMinor(base.settings?.previousCorrection || "0.00");
  const carried = signedMinor(base.settings?.carriedCredit || "0.00");
  const netVatDue = currentDue + prevCorr - carried;

  const rows: VatRow[] = (base.rows || []).map((row) => {
    if (row.box === 1) return { ...row, amount: signedFixed(b1Amt), adjustment: signedFixed(b1Adj), vat: signedFixed(b1Vat), displayVat: signedFixed(b1Vat) };
    if (row.box === 3) return { ...row, amount: signedFixed(b3Amt), adjustment: signedFixed(b3Adj), vat: signedFixed(b3Vat), displayVat: signedFixed(b3Vat) };
    if (row.box === 6) return { ...row, amount: signedFixed(salesTotalAmt), adjustment: signedFixed(salesTotalAdj), vat: signedFixed(salesTotalVat), displayVat: signedFixed(salesTotalVat) };
    if (row.box === 7) return { ...row, amount: signedFixed(b7Amt), adjustment: signedFixed(b7Adj), vat: signedFixed(b7Vat), displayVat: signedFixed(b7Vat) };
    if (row.box === 10) return { ...row, amount: signedFixed(b10Amt), adjustment: signedFixed(b10Adj), vat: signedFixed(b10Vat), displayVat: signedFixed(b10Vat) };
    if (row.box === 12) return { ...row, amount: signedFixed(pTotalAmt), adjustment: signedFixed(pTotalAdj), vat: signedFixed(pRecVat), displayVat: signedFixed(pRecVat) };
    if (row.box === 13) return { ...row, vat: signedFixed(currentDue), displayVat: signedFixed(currentDue) };
    if (row.box === 14) return { ...row, vat: signedFixed(prevCorr), displayVat: signedFixed(prevCorr) };
    if (row.box === 15) return { ...row, vat: signedFixed(-carried), displayVat: signedFixed(carried) };
    if (row.box === 16) return { ...row, vat: signedFixed(netVatDue), displayVat: signedFixed(netVatDue) };
    return { ...row, amount: row.box > 12 ? null : "0.00", adjustment: row.box > 12 ? null : "0.00", vat: "0.00", displayVat: "0.00" };
  });

  return {
    ...base,
    manualSelection: true,
    availableSales: [...salePool.values()],
    availablePurchases: purchasePool,
    sales: chosenSales,
    purchases: chosenPurchases,
    rows,
    summary: {
      ...(base.summary || {}),
      netSales: signedFixed(salesTotalAmt - salesTotalAdj),
      outputVat: signedFixed(salesTotalVat),
      netPurchases: signedFixed(pNet),
      recordedInputVat: signedFixed(pRecordedVat),
      recoverableInputVat: signedFixed(pRecVat),
      nonRecoverableInputVat: signedFixed(pRecordedVat - pRecVat),
      currentVatDue: signedFixed(currentDue),
      netVatDue: signedFixed(netVatDue),
      creditNet: signedFixed(creditNet),
      debitNet: signedFixed(debitNet),
    },
  };
}
function escapeVatCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe =
    /^\s*[=+@\t\r]/.test(text) || (/^\s*-/.test(text) && !/^-[0-9]+(\.[0-9]+)?$/.test(text))
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
function buildClientVatCsv(vat: VatReport): string {
  const rows: unknown[][] = [
    [vat.company.legalName, vat.company.vatNumber],
    ["تقرير مراجعة ضريبة القيمة المضافة", vat.period.start, vatPeriodEnd(vat.period)],
    ["خانة VAT", "البيان", "المبلغ", "التعديل", "الضريبة / الرصيد"],
    ...vat.rows.map((row) => [row.box, row.label, row.amount, row.adjustment, vatDisplayValue(row, "vat")]),
    [],
    ["المستند", "المصدر", "النوع", "التاريخ", "الصافي", "الضريبة"],
    ...vat.sales.map((row) => [row.number, row.source, row.kind, row.date, row.net, row.vat]),
    [],
    ["فاتورة المورد", "المورد", "المعاملة الضريبية", "تاريخ VAT", "الصافي", "الضريبة", "القابل للخصم"],
    ...vat.purchases.map((row) => [row.invoiceNumber, row.supplierName, row.taxTreatment, row.vatDate, row.netAmount, row.vatAmount, row.recoverableVat]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeVatCsvCell).join(",")).join("\r\n")}`;
}
export async function downloadAccounting(path:string,name:string) { const response=await fetch(backendUrl(`/accounting${path}`),{credentials:"include",cache:"no-store"});if(!response.ok){const data=await response.json().catch(()=>null);throw new Error(data?.error||"تعذر تنزيل الملف");}const url=URL.createObjectURL(await response.blob()),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export async function downloadManualVatReturn(format:"csv"|"pdf",body:Record<string,unknown>,name:string,fallbackReport?:VatReport|null) {
  const response=await fetch(backendUrl("/accounting/vat-return/manual/export"),{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",cache:"no-store",body:JSON.stringify({...body,format})});
  if(response.status===404&&format==="csv"&&fallbackReport&&isValidVatReport(fallbackReport)){
    const blob=new Blob([buildClientVatCsv(fallbackReport)],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    return;
  }
  if(!response.ok){const data=await response.json().catch(()=>null);throw new Error(data?.error||"تعذر تنزيل الملف");}
  const url=URL.createObjectURL(await response.blob()),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
