import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const cache = new Map();
function loadTs(relPath) {
  const file = path.resolve(relPath);
  if (cache.has(file)) return cache.get(file);
  const exportsObj = {};
  cache.set(file, exportsObj);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', code)(exportsObj, (id) => {
    if (id.startsWith('./') || id.startsWith('../')) {
      return loadTs(path.resolve(path.dirname(file), id + '.ts'));
    }
    throw new Error(`Unexpected module load: ${id}`);
  });
  return exportsObj;
}

const analytics = loadTs('lib/dashboard-analytics.ts');

test('normalizes slash, DD/MM/YYYY, and ISO dates accurately', () => {
  assert.equal(analytics.normalizeIsoDay('2026/11/09'), '2026-11-09');
  assert.equal(analytics.normalizeIsoDay('09/11/2026'), '2026-11-09');
  assert.equal(analytics.normalizeIsoDay('2026-11-09T12:00:00+03:00'), '2026-11-09');
  assert.equal(analytics.diffCalendarDays('2026-11-19', '2026-11-09'), 10);
  assert.equal(analytics.diffCalendarDays('04/11/2026', '2026-11-09'), -5);
  assert.equal(analytics.shiftIsoDay('2026-11-09', -6), '2026-11-03');
});

test('builds continuous daily contract & passenger trend series', () => {
  const trend = analytics.buildContractTrend(
    [
      { tripDate: '2026-11-09', createdAt: '2026-11-09T09:00:00Z', passengers: [{}, {}] },
      { tripDate: '2026/11/07', createdAt: '2026-11-07T09:00:00Z', passengersCount: 5 },
      { tripDate: '2026-10-01', createdAt: '2026-10-01T09:00:00Z', passengersCount: 3 },
    ],
    '2026-11-09',
    7,
    'en'
  );
  assert.equal(trend.length, 7);
  assert.equal(trend[0].date, '2026-11-03');
  assert.equal(trend[6].date, '2026-11-09');
  assert.equal(trend[6].contracts, 1);
  assert.equal(trend[6].passengers, 2);
  assert.equal(trend[4].contracts, 1);
  assert.equal(trend[4].passengers, 5);
});

test('detects fleet status counts, capacity, and document expiry alerts sorted by urgency', () => {
  const fleet = analytics.buildFleetAnalytics(
    [
      {
        id: 'v1', plateNumberAr: 'أ ب ج 1', plateNumberEn: 'ABC 1', make: 'Toyota', model: 'Hiace',
        year: 2025, category: 'VAN', capacity: 12, status: 'AVAILABLE',
        registrationExpiry: '2026-11-20', insuranceExpiry: '2028-01-01',
      },
      {
        id: 'v2', plateNumberAr: 'د هـ و 2', plateNumberEn: 'DEF 2', make: 'Hyundai', model: 'Staria',
        year: 2025, category: 'VAN', capacity: 9, status: 'MAINTENANCE',
        registrationExpiry: '2026-11-01', insuranceExpiry: '2026-11-15',
      },
    ],
    '2026-11-09',
    30
  );
  assert.equal(fleet.total, 2);
  assert.equal(fleet.available, 1);
  assert.equal(fleet.maintenance, 1);
  assert.equal(fleet.totalSeats, 21);
  assert.equal(fleet.alerts.length, 3);
  assert.equal(fleet.alerts[0].daysRemaining, -8);
  assert.equal(fleet.alerts[0].document, 'registration');
  assert.equal(fleet.alerts[1].daysRemaining, 6);
  assert.equal(fleet.alerts[2].daysRemaining, 11);
});

test('summarizes signed profit minor units without floating point errors', () => {
  const summary = analytics.summarizeProfit({
    revenue: '1000.00',
    expenses: '250.50',
    beforeTax: '749.50',
    taxExpense: '0.00',
    afterTax: '749.50',
  });
  assert.equal(summary.revenueMinor, 100000n);
  assert.equal(summary.expensesMinor, 25050n);
  assert.equal(summary.afterTaxMinor, 74950n);
  assert.equal(summary.marginPercent, 74.9);
  assert.equal(analytics.formatSignedMinor(-1255n), '-12.55');

  const lossSummary = analytics.summarizeProfit({
    revenue: '500.00',
    expenses: '625.00',
    beforeTax: '-125.00',
    taxExpense: '0.00',
    afterTax: '-125.00',
  });
  assert.equal(lossSummary.afterTaxMinor, -12500n);
  assert.equal(lossSummary.marginPercent, -25);
});

test('computes operation breakdown percentages summing cleanly to 100 or 0 when empty', () => {
  const empty = analytics.buildOperationBreakdown([]);
  assert.equal(empty.length, 4);
  assert.ok(empty.every((row) => row.count === 0 && row.percentage === 0));

  const unknownOnly = analytics.buildOperationBreakdown([{ operationType: 'OTHER' }]);
  assert.ok(unknownOnly.every((row) => row.count === 0 && row.percentage === 0));

  const split = analytics.buildOperationBreakdown([
    { operationType: 'AIRPORT_TRANSFER' },
    { operationType: 'CITY_TOUR' },
    { operationType: 'INTERCITY' },
  ]);
  assert.deepEqual(
    split.map((row) => [row.type, row.count, row.percentage]),
    [
      ['AIRPORT_TRANSFER', 1, 34],
      ['CITY_TOUR', 1, 33],
      ['INTERCITY', 1, 33],
      ['HAJJ_UMRAH', 0, 0],
    ]
  );
  assert.equal(split.reduce((sum, row) => sum + row.percentage, 0), 100);
});

