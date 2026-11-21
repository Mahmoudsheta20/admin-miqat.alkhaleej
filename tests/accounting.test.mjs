import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../lib/accounting.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {}; new Function('exports', 'require', compiled)(exports, () => ({}));
test('purchase preview uses integer cents and supplier VAT overrides without floating-point drift', () => {
  assert.deepEqual(exports.purchasePreview('0.10'), { vat: '0.02', total: '0.12' });
  assert.deepEqual(exports.purchasePreview('300'), { vat: '45.00', total: '345.00' });
  assert.deepEqual(exports.purchasePreview('300', '0'), { vat: '0.00', total: '300.00' });
  assert.deepEqual(exports.purchasePreview('300', '45.01'), { vat: '45.01', total: '345.01' });
  assert.deepEqual(exports.purchasePreview('999999999999.99'), { vat: '150000000000.00', total: '1149999999999.99' });
  assert.deepEqual(exports.purchasePreview('1e4'), { vat: '0.00', total: '0.00' });
});
test('Saudi period always exposes an ISO date and a supported quarter', () => {
  const period = exports.currentSaudiPeriod();
  assert.match(period.day, /^\d{4}-\d{2}-\d{2}$/); assert.ok(period.quarter >= 1 && period.quarter <= 4);
  assert.equal(period.year, Number(period.day.slice(0, 4)));
});
test('inclusive VAT extraction preserves receipt total and round-trips integer cents', () => {
  assert.deepEqual(exports.purchaseInclusive('115'), {net:'100.00',vat:'15.00',total:'115.00'});
  assert.deepEqual(exports.purchaseInclusive('345.01'), {net:'300.01',vat:'45.00',total:'345.01'});
  assert.deepEqual(exports.purchaseInclusive('0.10'), {net:'0.09',vat:'0.01',total:'0.10'});
  assert.deepEqual(exports.purchaseInclusive('115',false), {net:'115.00',vat:'0.00',total:'115.00'});
  for(let cents=1;cents<10000;cents++){const total=(cents/100).toFixed(2),p=exports.purchaseInclusive(total);assert.equal(exports.purchasePreview(p.net,p.vat).total,total);}
});
test('report query retains only the fields required by its mode', () => {
 const p={mode:'YEAR',year:2026,quarter:3,startDate:'2026-01-01',endDate:'2026-10-01'};
 assert.equal(exports.periodQuery(p),'mode=YEAR&year=2026');
 assert.equal(exports.periodQuery({...p,mode:'CUSTOM'}),'mode=CUSTOM&startDate=2026-01-01&endDate=2026-10-01');
});
test('VAT display separates available credit from its signed effect without mutating archived rows', () => {
 const oldRow=Object.freeze({box:15,vat:'-20.00',amount:null,adjustment:null});
 assert.equal(exports.vatDisplayValue(oldRow,'vat'),'20.00');
 assert.equal(oldRow.vat,'-20.00');
 assert.equal(exports.vatDisplayValue({...oldRow,vat:'-999999999999.99'},'vat'),'999999999999.99');
 assert.equal(exports.vatDisplayValue({...oldRow,vat:'-0.00'},'vat'),'0.00');
 assert.equal(exports.vatDisplayValue({...oldRow,displayVat:'20.00'},'vat'),'20.00');
 assert.equal(exports.vatDisplayValue({...oldRow,box:16,vat:'-5.00'},'vat'),'-5.00');
 assert.equal(exports.vatDisplayValue(oldRow,'amount'),null);
 assert.equal(exports.vatDisplayValue({box:1,amount:'0.00'},'amount'),'0.00');
});
test('calculated VAT and totals are copied for review while editable fields retain entry copy', () => {
 for(const box of [1,3,7,8,9,10,11]) {
   assert.equal(exports.vatCopyPurpose({box},'amount'),'ENTRY');
   assert.equal(exports.vatCopyPurpose({box},'adjustment'),'ENTRY');
   assert.equal(exports.vatCopyPurpose({box},'vat'),'REVIEW');
 }
 for(const box of [6,12,13,15,16]) {
   assert.equal(exports.vatCopyPurpose({box},'vat'),'REVIEW');
   assert.equal(exports.vatCopyPurpose({box},'amount'),'REVIEW');
 }
 assert.equal(exports.vatCopyPurpose({box:14},'vat'),'ENTRY');
});
test('VAT period display uses the final included day across quarters, leap years and legacy responses', () => {
 assert.equal(exports.vatPeriodEnd({endExclusive:'2026-07-01'}),'2026-06-30');
 assert.equal(exports.vatPeriodEnd({endExclusive:'2027-01-01'}),'2026-12-31');
 assert.equal(exports.vatPeriodEnd({endExclusive:'2024-03-01'}),'2024-02-29');
 assert.equal(exports.vatPeriodEnd({endExclusive:'2026-07-01',endInclusive:'2026-06-30'}),'2026-06-30');
 assert.equal(exports.vatPeriodEnd({endExclusive:'invalid'}),'—');
});
test('dynamic cash/bank and revenue account filters match backend ledger rules', () => {
 const accounts = [
  { code: '1100', type: 'ASSET', isPosting: false, isActive: true },
  { code: '1101', type: 'ASSET', isPosting: true, isActive: true },
  { code: '1102', type: 'ASSET', isPosting: true, isActive: true },
  { code: '1103', type: 'ASSET', isPosting: true, isActive: true },
  { code: '1104', type: 'ASSET', isPosting: true, isActive: true },
  { code: '1105', type: 'ASSET', isPosting: true, isActive: true },
  { code: '1106', type: 'ASSET', isPosting: true, isActive: true },
  { code: '1107', type: 'ASSET', isPosting: true, isActive: false },
  { code: '2101', type: 'LIABILITY', isPosting: true, isActive: true },
  { code: '4101', type: 'REVENUE', isPosting: true, isActive: true },
  { code: '4103', type: 'REVENUE', isPosting: true, isActive: true },
  { code: '4104', type: 'REVENUE', isPosting: true, isActive: true },
  { code: '4105', type: 'REVENUE', isPosting: true, isActive: false },
 ];
 assert.deepEqual(exports.filterCashBankAccounts(accounts).map((a) => a.code), ['1101', '1102', '1106']);
 assert.deepEqual(exports.filterCashBankAccounts(null), []);
 assert.deepEqual(exports.filterSaleRevenueAccounts(accounts).map((a) => a.code), ['4101', '4104']);
});
test('period slugs, query builders, ledger paths, and source labels format consistently', () => {
 assert.equal(exports.reportPeriodSlug({ mode: 'QUARTER', year: 2026, quarter: 2, startDate: '2026-01-01', endDate: '2026-06-30' }), '2026-Q2');
 assert.equal(exports.reportPeriodSlug({ mode: 'YEAR', year: 2026, quarter: 2, startDate: '2026-01-01', endDate: '2026-06-30' }), '2026');
 assert.equal(exports.reportPeriodSlug({ mode: 'CUSTOM', year: 2026, quarter: 2, startDate: '2026-04-01', endDate: '2026-05-15' }), '2026-04-01_2026-05-15');
 assert.equal(exports.buildAccountingQuery({ page: 1, search: '  ', empty: null }), '?page=1');
 assert.equal(exports.buildAccountingQuery({ search: '', nothing: undefined }), '');
 assert.equal(exports.buildAccountLedgerPath(' 1102 ', { page: 1 }), '/accounting/accounts/1102/ledger');
 assert.equal(exports.buildAccountLedgerPath('1102', { from: '2026-01-01', to: '2026-03-31', page: 2, search: 'SNB' }), '/accounting/accounts/1102/ledger?from=2026-01-01&to=2026-03-31&page=2&search=SNB');
 assert.equal(exports.journalSourceTypeLabel('PAYMENT', true), 'Payment voucher');
 assert.equal(exports.journalSourceTypeLabel('CUSTOM_TYPE', false), 'CUSTOM_TYPE');
});
test('computeClientManualVatReport calculates exact BigInt Boxes 1-16 for selected sales, extra invoices, and purchases', () => {
 const base = {
  year: 2026,
  quarter: 2,
  period: { start: '2026-04-01', endExclusive: '2026-07-01', endInclusive: '2026-06-30', dueDate: '2026-07-31' },
  company: { legalName: 'Miqat', vatNumber: '310000000000003' },
  generatedAt: '2026-06-30T12:00:00Z',
  settings: { version: 1, previousCorrection: '10.00', carriedCredit: '20.00', notes: 'Adj', filedOn: null, updatedAt: null },
  rows: Array.from({ length: 16 }, (_, i) => ({
   box: i + 1,
   label: `Box ${i + 1}`,
   section: i < 6 ? 'SALES' : i < 12 ? 'PURCHASES' : 'NET',
   amount: i >= 12 ? null : '0.00',
   adjustment: i >= 12 ? null : '0.00',
   vat: '0.00',
   isTotal: [6, 12, 13, 16].includes(i + 1),
  })),
  sales: [
   { id: 's1', number: 'TAX-1', source: 'LOCAL', kind: 'INVOICE', date: '2026-04-10', net: '1000.00', vat: '150.00', isPriorPeriodAdjustment: false },
   { id: 's2', number: 'TAX-2', source: 'LOCAL', kind: 'INVOICE', date: '2026-04-12', net: '2000.00', vat: '300.00', isPriorPeriodAdjustment: false },
  ],
  purchases: [
   { id: 'p1', supplierName: 'Fuel', invoiceNumber: 'F-1', taxTreatment: 'STANDARD', vatDate: '2026-04-05', netAmount: '400.00', vatAmount: '60.00', recoverableVat: '60.00' },
  ],
  warnings: [],
  coverage: { legacyCount: 0, proformaCount: 0, otherIssuerCount: 0, basis: 'ACCRUAL', domesticPurchasesOnly: true },
  summary: { netSales: '3000.00', outputVat: '450.00', netPurchases: '400.00', recordedInputVat: '60.00', recoverableInputVat: '60.00', nonRecoverableInputVat: '0.00', currentVatDue: '390.00', netVatDue: '380.00', creditNet: '0.00', debitNet: '0.00', excludedOutsideScope: '0.00' },
 };
 const extra = [{ id: 's3', number: 'TAX-3', source: 'LOCAL', kind: 'CREDIT', date: '2026-03-10', net: '-100.00', vat: '-15.00', isPriorPeriodAdjustment: false }];
 const manual = exports.computeClientManualVatReport(base, ['s1', 's3'], ['p1'], extra);
 assert.equal(manual.manualSelection, true);
 assert.equal(manual.sales.length, 2);
 assert.equal(manual.summary.netSales, '900.00');
 assert.equal(manual.summary.outputVat, '135.00');
 assert.equal(manual.summary.recoverableInputVat, '60.00');
 assert.equal(manual.summary.currentVatDue, '75.00');
 assert.equal(manual.summary.netVatDue, '65.00');
 assert.equal(manual.rows[14].displayVat, '20.00');
 assert.equal(manual.rows[14].vat, '-20.00');
 assert.equal(manual.rows[15].vat, '65.00');
  const zeroPurchases = exports.computeClientManualVatReport(base, ['s1'], []);
  assert.equal(zeroPurchases.summary.recoverableInputVat, '0.00');
  assert.equal(zeroPurchases.summary.netVatDue, '140.00');
});
test('isValidVatReport accepts complete VAT reports and rejects malformed or unrelated payloads', () => {
  const valid = {
    year: 2026,
    quarter: 2,
    period: { start: '2026-04-01', endExclusive: '2026-07-01', endInclusive: '2026-06-30', dueDate: '2026-07-31' },
    company: { legalName: 'Miqat', vatNumber: '310000000000003' },
    generatedAt: '2026-06-30T12:00:00Z',
    settings: { version: 1, previousCorrection: '0.00', carriedCredit: '0.00', notes: '', filedOn: null, updatedAt: null },
    rows: [],
    sales: [],
    purchases: [],
    warnings: [],
    coverage: { legacyCount: 0, proformaCount: 0, otherIssuerCount: 0, basis: 'ACCRUAL', domesticPurchasesOnly: true },
    summary: { netSales: '0.00', outputVat: '0.00', netPurchases: '0.00', recordedInputVat: '0.00', recoverableInputVat: '0.00', nonRecoverableInputVat: '0.00', currentVatDue: '0.00', netVatDue: '0.00', creditNet: '0.00', debitNet: '0.00', excludedOutsideScope: '0.00' },
  };
  assert.equal(exports.isValidVatReport(valid), true);
  assert.equal(exports.isValidVatReport(null), false);
  assert.equal(exports.isValidVatReport(undefined), false);
  assert.equal(exports.isValidVatReport([]), false);
  assert.equal(exports.isValidVatReport({ items: [], total: 0 }), false);
  assert.equal(exports.isValidVatReport({ ...valid, summary: undefined }), false);
  assert.equal(exports.isValidVatReport({ ...valid, summary: { netSales: '0.00' } }), false);
  assert.equal(exports.isValidVatReport({ ...valid, company: undefined }), false);
  assert.equal(exports.isValidVatReport({ ...valid, period: undefined }), false);
  assert.equal(exports.isValidVatReport({ ...valid, rows: null }), false);
  assert.equal(exports.computeClientManualVatReport({ items: [], total: 0 }, [], null).items.length, 0);
});

test('paymentStatusMeta maps AR/EN labels, variants, and canPay for SALE and PURCHASE', () => {
  assert.deepEqual(exports.paymentStatusMeta('PAID', true, 'SALE'), {
    label: 'Paid',
    variant: 'success',
    canPay: false,
  });
  assert.deepEqual(exports.paymentStatusMeta('PARTIAL', false, 'PURCHASE'), {
    label: 'مدفوعة جزئياً',
    variant: 'warning',
    canPay: true,
  });
  assert.deepEqual(exports.paymentStatusMeta('UNPAID', true, 'PURCHASE'), {
    label: 'Unpaid',
    variant: 'destructive',
    canPay: true,
  });
  assert.deepEqual(exports.paymentStatusMeta('REFUND_DUE', true, 'SALE'), {
    label: 'Refund due',
    variant: 'secondary',
    canPay: false,
  });
  assert.deepEqual(exports.paymentStatusMeta('REFUND_DUE', false, 'PURCHASE'), {
    label: 'رصيد لدى المورد',
    variant: 'secondary',
    canPay: false,
  });
  assert.deepEqual(exports.paymentStatusMeta('UNPOSTED', true, 'SALE'), {
    label: 'Needs review',
    variant: 'outline',
    canPay: false,
  });
  assert.deepEqual(exports.paymentStatusMeta(null, false, 'SALE'), {
    label: 'غير مدفوعة',
    variant: 'destructive',
    canPay: true,
  });
});

test('buildPurchasesQueryPath builds QUARTER, YEAR, CUSTOM, legacy and optional filters cleanly', () => {
  assert.equal(
    exports.buildPurchasesQueryPath({
      period: { mode: 'QUARTER', year: 2026, quarter: 2, startDate: '', endDate: '' },
      page: 2,
      search: ' Fuel ',
      includeVoided: true,
      category: 'FUEL',
      documentType: 'PURCHASE_INVOICE',
      postingStatus: 'POSTED',
      paymentAccountCode: '1102',
    }),
    '/purchases?mode=QUARTER&year=2026&quarter=2&page=2&search=Fuel&includeVoided=true&category=FUEL&documentType=PURCHASE_INVOICE&postingStatus=POSTED&paymentAccountCode=1102',
  );
  assert.equal(
    exports.buildPurchasesQueryPath({
      period: { mode: 'YEAR', year: 2026, quarter: 1, startDate: '', endDate: '' },
    }),
    '/purchases?mode=YEAR&year=2026&page=1&search=&includeVoided=false',
  );
  assert.equal(
    exports.buildPurchasesQueryPath({
      period: { mode: 'CUSTOM', year: 2026, quarter: 1, startDate: '2026-01-01', endDate: '2026-01-31' },
    }),
    '/purchases?mode=CUSTOM&startDate=2026-01-01&endDate=2026-01-31&page=1&search=&includeVoided=false',
  );
  assert.equal(
    exports.buildPurchasesQueryPath({ year: 2025, quarter: 4 }),
    '/purchases?year=2025&quarter=4&page=1&search=&includeVoided=false',
  );
});
