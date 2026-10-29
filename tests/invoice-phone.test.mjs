import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../lib/invoice-phone.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {}; new Function('exports', 'require', compiled)(exports, createRequire(import.meta.url));
const { PHONE_COUNTRIES, invoicePhoneFrom, updateInvoicePhone, invoicePhoneNumber } = exports;
test('invoice phone defaults to Saudi Arabia and preserves national prefixes correctly for each country', () => {
  assert.deepEqual(invoicePhoneFrom(), { country: 'SA', number: '' });
  assert.equal(PHONE_COUNTRIES[0].country, 'SA'); assert.equal(PHONE_COUNTRIES[0].callingCode, '966');
  assert.ok(PHONE_COUNTRIES.length > 200);
  for (const [country, number, expected] of [
    ['SA', '0551234567', '+966551234567'], ['SA', '551234567', '+966551234567'],
    ['EG', '01012345678', '+201012345678'], ['AE', '0501234567', '+971501234567'],
    ['GB', '07700900123', '+447700900123'], ['US', '2025550123', '+12025550123'],
    ['IT', '0669821234', '+390669821234'],
  ]) assert.equal(invoicePhoneNumber({ country, number }), expected);
});
test('pasting international and imported contract phones selects the correct country without duplicate prefixes', () => {
  for (const [raw, country, expected] of [
    ['+966 55 123 4567', 'SA', '+966551234567'], ['0044 7700 900123', 'GB', '+447700900123'],
    ['+20 10 1234 5678', 'EG', '+201012345678'], ['+1 416 555 0123', 'CA', '+14165550123'],
    ['0551234567', 'SA', '+966551234567'],
  ]) { const phone = invoicePhoneFrom(raw); assert.equal(phone.country, country); assert.equal(invoicePhoneNumber(phone), expected); }
  const pasted = updateInvoicePhone({ country: 'SA', number: '' }, '+971 50 123 4567');
  assert.equal(pasted.country, 'AE'); assert.equal(pasted.number, '501234567');
  assert.equal(invoicePhoneNumber(pasted), '+971501234567');
});
test('Arabic and Persian digits normalize while malformed, short and mismatched country numbers are rejected', () => {
  for (const number of ['٠٥٥١٢٣٤٥٦٧', '۰۵۵۱۲۳۴۵۶۷', '(055) 123-4567']) assert.equal(invoicePhoneNumber({ country: 'SA', number }), '+966551234567');
  for (const number of ['', '123', 'call 0551234567', '1e10', '0551234567 ext 12', '9'.repeat(25), '+201012345678']) assert.equal(invoicePhoneNumber({ country: 'SA', number }), undefined);
  assert.deepEqual(updateInvoicePhone({ country: 'EG', number: '' }, '0101'), { country: 'EG', number: '0101' });
});
