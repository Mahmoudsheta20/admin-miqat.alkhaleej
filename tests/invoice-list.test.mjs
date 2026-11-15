import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadTsModule(relPath, customRequire) {
  const source = fs.readFileSync(new URL(relPath, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const fn = new Function('exports', 'module', 'require', output);
  fn(mod.exports, mod, customRequire);
  return mod.exports;
}

const moneyMod = loadTsModule('../lib/money.ts', () => ({}));
const backendMod = loadTsModule('../lib/backend.ts', () => ({}));
const invoicesMod = loadTsModule('../lib/invoices.ts', (id) => {
  if (id === './money') return moneyMod;
  if (id === './backend') return backendMod;
  throw new Error(`Unexpected import in test: ${id}`);
});

const {
  buildInvoiceListQueryPath,
  canIssueTaxAdjustment,
  creditLimitError,
  filterInvoiceRows,
  hasInvertedDateRange,
  invoiceRiyadhDateKey,
  isValidIsoDateString,
  normalizeInvoiceTaxRateLabel,
  summarizeInvoicePage,
} = invoicesMod;

test('date helpers validate calendar dates and Riyadh timezone boundaries', () => {
  assert.equal(isValidIsoDateString('2026-11-14'), true);
  assert.equal(isValidIsoDateString('2026-02-30'), false);
  assert.equal(isValidIsoDateString('14-11-2026'), false);
  assert.equal(hasInvertedDateRange('2026-11-15', '2026-11-14'), true);
  assert.equal(hasInvertedDateRange('2026-11-14', '2026-11-14'), false);
  assert.equal(invoiceRiyadhDateKey('2026-06-14T22:00:00.000Z'), '2026-06-15');
});

test('buildInvoiceListQueryPath encodes type, search, pagination, and skips invalid/inverted dates', () => {
  assert.equal(
    buildInvoiceListQueryPath({ page: 2, archived: false, type: 'TAX', search: '  TAX-001  ' }),
    '/invoices?page=2&archived=false&documentType=TAX&kind=INVOICE&search=TAX-001',
  );
  assert.equal(
    buildInvoiceListQueryPath({ page: 1, archived: true, type: 'NOTES' }),
    '/invoices?page=1&archived=true&kind=NOTES',
  );
  assert.equal(
    buildInvoiceListQueryPath({
      page: 1,
      type: 'BOOKING',
      fromDate: '2026-11-01',
      toDate: '2026-11-30',
    }),
    '/invoices?page=1&archived=false&documentType=BOOKING&fromDate=2026-11-01&toDate=2026-11-30',
  );
  // Inverted range is safely omitted instead of triggering backend 400
  assert.equal(
    buildInvoiceListQueryPath({
      page: 1,
      type: 'ALL',
      fromDate: '2026-11-20',
      toDate: '2026-11-01',
    }),
    '/invoices?page=1&archived=false',
  );
});

test('filterInvoiceRows separates TAX, BOOKING, PROFORMA, NOTES, search, and Riyadh dates', () => {
  const rows = [
    {
      id: '1',
      invoiceNumber: 'INV-000001',
      customerName: 'Booking Co',
      documentType: 'BOOKING',
      netAmount: '100.00',
      vatAmount: '15.00',
      totalAmount: '115.00',
      invoiceDate: '2026-11-10T10:00:00+03:00',
      createdAt: '2026-11-10T10:00:00Z',
      status: 'SAVED',
    },
    {
      id: '2',
      invoiceNumber: 'TAX-000002',
      customerName: 'Tax Client',
      documentType: 'TAX',
      taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED', supplyDate: '2026-11-12' },
      netAmount: '200.00',
      vatAmount: '30.00',
      totalAmount: '230.00',
      invoiceDate: '2026-11-12T10:00:00+03:00',
      createdAt: '2026-11-12T10:00:00Z',
      status: 'SAVED',
    },
    {
      id: '3',
      invoiceNumber: 'PRO-000003',
      customerName: 'Proforma Guest',
      documentType: 'PROFORMA',
      netAmount: '500.00',
      vatAmount: '75.00',
      totalAmount: '575.00',
      invoiceDate: '2026-11-13T10:00:00+03:00',
      createdAt: '2026-11-13T10:00:00Z',
      status: 'SAVED',
    },
    {
      id: '4',
      invoiceNumber: 'CN-000001',
      customerName: 'Tax Client',
      documentType: 'TAX',
      taxDocument: { kind: 'CREDIT', profile: 'SIMPLIFIED', supplyDate: '2026-11-14', originalInvoiceId: '2' },
      netAmount: '50.00',
      vatAmount: '7.50',
      totalAmount: '57.50',
      invoiceDate: '2026-11-14T10:00:00+03:00',
      createdAt: '2026-11-14T10:00:00Z',
      status: 'SAVED',
    },
  ];

  assert.deepEqual(filterInvoiceRows(rows, { type: 'TAX' }).map((r) => r.id), ['2']);
  assert.deepEqual(filterInvoiceRows(rows, { type: 'BOOKING' }).map((r) => r.id), ['1']);
  assert.deepEqual(filterInvoiceRows(rows, { type: 'PROFORMA' }).map((r) => r.id), ['3']);
  assert.deepEqual(filterInvoiceRows(rows, { type: 'NOTES' }).map((r) => r.id), ['4']);
  assert.deepEqual(
    filterInvoiceRows(rows, { search: 'tax client', fromDate: '2026-11-12', toDate: '2026-11-13' }).map((r) => r.id),
    ['2'],
  );
});

test('summarizeInvoicePage computes exact decimal BigInt sums without float drift and skips proformas', () => {
  const rows = [
    {
      id: 'a',
      invoiceNumber: 'TAX-000001',
      customerName: 'One',
      documentType: 'TAX',
      taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED', supplyDate: '2026-11-10' },
      netAmount: '0.10',
      vatAmount: '0.02',
      totalAmount: '0.12',
      invoiceDate: '2026-11-10T10:00:00+03:00',
      createdAt: '2026-11-10T10:00:00Z',
      status: 'SAVED',
    },
    {
      id: 'b',
      invoiceNumber: 'INV-000002',
      customerName: 'Two',
      documentType: 'BOOKING',
      netAmount: '0.20',
      vatAmount: '0.03',
      totalAmount: '0.23',
      invoiceDate: '2026-11-10T10:00:00+03:00',
      createdAt: '2026-11-10T10:00:00Z',
      status: 'SAVED',
    },
    {
      id: 'c',
      invoiceNumber: 'CN-000001',
      customerName: 'One',
      documentType: 'TAX',
      taxDocument: { kind: 'CREDIT', profile: 'SIMPLIFIED', supplyDate: '2026-11-11' },
      netAmount: '0.05',
      vatAmount: '0.01',
      totalAmount: '0.06',
      invoiceDate: '2026-11-11T10:00:00+03:00',
      createdAt: '2026-11-11T10:00:00Z',
      status: 'SAVED',
    },
    {
      id: 'd',
      invoiceNumber: 'PRO-000004',
      customerName: 'Quote',
      documentType: 'PROFORMA',
      netAmount: '9999.99',
      vatAmount: '1500.00',
      totalAmount: '11499.99',
      invoiceDate: '2026-11-12T10:00:00+03:00',
      createdAt: '2026-11-12T10:00:00Z',
      status: 'SAVED',
    },
  ];

  const stats = summarizeInvoicePage(rows, 42);
  assert.equal(stats.total, 42);
  assert.equal(stats.taxCount, 1);
  assert.equal(stats.bookingCount, 1);
  assert.equal(stats.proformaCount, 1);
  assert.equal(stats.notesCount, 1);
  assert.equal(stats.pageNetSum, '0.25');
  assert.equal(stats.pageVatSum, '0.04');
  assert.equal(stats.pageGrossSum, '0.29');
});

test('normalizeInvoiceTaxRateLabel detects uniform 15%, 0%, and mixed rates accurately', () => {
  assert.deepEqual(
    normalizeInvoiceTaxRateLabel([{ category: 'S', rate: '15' }]),
    { displayRate: '15%', isMixed: false, isZeroOnly: false },
  );
  assert.deepEqual(
    normalizeInvoiceTaxRateLabel([{ category: 'Z', rate: '0' }]),
    { displayRate: '0%', isMixed: false, isZeroOnly: true },
  );
  assert.deepEqual(
    normalizeInvoiceTaxRateLabel([{ category: 'S', rate: '15' }, { category: 'E', rate: '0' }]),
    { displayRate: '', isMixed: true, isZeroOnly: false },
  );
});

test('canIssueTaxAdjustment allows active TAX INVOICE only and excludes BOOKING, PROFORMA, notes, archived', () => {
  assert.equal(
    canIssueTaxAdjustment({ documentType: 'TAX', taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED', supplyDate: '2026-11-10' }, visibility: null }),
    true,
  );
  assert.equal(
    canIssueTaxAdjustment({ documentType: 'BOOKING', visibility: null }),
    false,
  );
  assert.equal(
    canIssueTaxAdjustment({ documentType: 'PROFORMA', visibility: null }),
    false,
  );
  assert.equal(
    canIssueTaxAdjustment({ documentType: 'TAX', taxDocument: { kind: 'CREDIT', profile: 'SIMPLIFIED', supplyDate: '2026-11-10' }, visibility: null }),
    false,
  );
  assert.equal(
    canIssueTaxAdjustment({ documentType: 'TAX', taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED', supplyDate: '2026-11-10' }, visibility: { isArchived: true, reason: 'dup', changedAt: '', version: 1 } }),
    false,
  );
});

test('creditLimitError enforces exact decimal remaining balance ceiling', () => {
  assert.equal(creditLimitError('115.00', { availableGross: '115.00' }, true), '');
  assert.match(creditLimitError('115.01', { availableGross: '115.00' }, true), /115\.00 SAR/);
  assert.match(creditLimitError('10.00', { availableGross: '0.00' }, false), /لا يوجد رصيد/);
});
