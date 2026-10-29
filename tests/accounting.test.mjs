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
