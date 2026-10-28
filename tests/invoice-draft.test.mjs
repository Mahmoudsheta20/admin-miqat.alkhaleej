import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(fs.readFileSync(new URL('../lib/invoice-draft.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {}; new Function('exports', output)(exports);
const { estimateInvoice, saudiDateTimeInput, emptyInvoiceLine } = exports;
const line = (changes = {}) => ({ ...emptyInvoiceLine(), quantity: '1', unitPrice: '300.00', category: 'S', rate: '15', ...changes });
test('live invoice estimate matches exact invoice 106 and invoice 42 amounts', () => {
  const first = estimateInvoice([line()]);
  assert.equal(first.isValid, true); assert.equal(first.net, '300.00'); assert.equal(first.vat, '45.00'); assert.equal(first.gross, '345.00');
  const second = estimateInvoice([line({ unitPrice: '739.130435' })]);
  assert.equal(second.net, '739.13'); assert.equal(second.vat, '110.87'); assert.equal(second.gross, '850.00');
});
test('estimate rounds VAT per category and supports discounts and mixed zero-rated supplies', () => {
  assert.equal(estimateInvoice([line({ unitPrice: '0.03' }), line({ unitPrice: '0.03' })]).vat, '0.01');
  const result = estimateInvoice([line({ quantity: '2', unitPrice: '100', discount: '10' }), line({ unitPrice: '50', category: 'Z', rate: '0' })]);
  assert.equal(result.net, '240.00'); assert.equal(result.vat, '28.50'); assert.equal(result.gross, '268.50');
  assert.equal(estimateInvoice([line({ unitPrice: '0.1', quantity: '3' })]).net, '0.30');
});
test('missing tax selection, invalid amounts, negative discounts and overflow never show a valid total', () => {
  for (const change of [{ category: '', rate: '' }, { quantity: '0' }, { unitPrice: '1e3' }, { unitPrice: '' }, { discount: '-1' }, { discount: '301' }, { rate: '0' }, { category: 'E', rate: '15' }, { discount: '0.001' }, { quantity: '9999999999', unitPrice: '9999999999' }]) {
    const result = estimateInvoice([line(change)]); assert.equal(result.isValid, false, JSON.stringify(change)); assert.equal(result.gross, '—');
  }
});
test('large estimates avoid double rounding and Saudi datetime defaults use the business timezone', () => {
  const result = estimateInvoice([line({ quantity: '9999999999.000001', unitPrice: '999999.995000', category: 'Z', rate: '0' })]);
  assert.equal(result.net, '9999999949000001.00');
  assert.equal(saudiDateTimeInput(new Date('2026-10-28T22:30:00Z')), '2026-10-29T01:30');
  assert.equal(emptyInvoiceLine(12).code, 'TRP-12'); assert.equal(emptyInvoiceLine().category, '');
});
