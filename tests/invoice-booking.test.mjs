import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../lib/invoice-booking.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {}; new Function('exports', compiled)(exports);
const { percentageDiscount, emptyBooking, bookingNotes, validateBooking } = exports;
const transport = { tripDate: '2026-10-29', departureTime: '15:00', notes: 'استقبال من بوابة 3' };

test('percentage discount rounds once to halalas and rejects unsupported percentages', () => {
  assert.equal(percentageDiscount('2', '300', '10'), '60.00');
  assert.equal(percentageDiscount('1', '0.10', '5'), '0.01');
  assert.equal(percentageDiscount('0.3', '0.2', '50'), '0.03');
  assert.equal(percentageDiscount('3', '99.99', '12.50'), '37.50');
  assert.equal(percentageDiscount('1', '300', '100'), '300.00');
  for (const rate of ['100.01', '-1', 'NaN', '1.001']) assert.equal(percentageDiscount('1', '300', rate), undefined);
  assert.equal(percentageDiscount('1', '', '10'), undefined);
});

test('return trip must follow departure, including same-day times', () => {
  const booking = { ...emptyBooking(), type: 'ROUND_TRIP', returnDate: '2026-10-29', returnTime: '14:00' };
  assert.ok(validateBooking(booking, transport));
  assert.ok(validateBooking({ ...booking, returnTime: '15:00' }, transport));
  assert.equal(validateBooking({ ...booking, returnTime: '16:00' }, transport), undefined);
  assert.equal(validateBooking({ ...booking, returnDate: '2026-10-30', returnTime: '01:00' }, transport), undefined);
});

test('booking notes preserve selected trip details, email and manual notes for the existing API', () => {
  const booking = { ...emptyBooking(), type: 'MULTI_STOP', stops: [' مكة ', 'جدة'], email: ' guest@example.test ' };
  const notes = bookingNotes(booking, transport);
  assert.match(notes, /مكة ← جدة/);
  assert.match(notes, /guest@example.test/);
  assert.match(notes, /استقبال من بوابة 3/);
  assert.equal(validateBooking(booking, transport), undefined);
  assert.ok(validateBooking({ ...booking, stops: [''] }, transport));
  assert.ok(validateBooking(booking, { ...transport, notes: 'x'.repeat(1000) }));
  assert.ok(validateBooking({ ...booking, type: 'HOURLY', hours: '0' }, transport));
  assert.equal(validateBooking({ ...booking, type: 'HOURLY', hours: '200' }, transport), undefined);
});

test('copying an original invoice into a note does not duplicate generated booking metadata', () => {
  const booking = emptyBooking();
  const notes = bookingNotes(booking, transport);
  assert.equal(bookingNotes(booking, { ...transport, notes }), notes);
});
