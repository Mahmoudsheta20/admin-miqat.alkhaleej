import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../lib/invoice-transport.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {}; new Function('exports', compiled)(exports);
const { distanceDelta, transportPayload, emptyTransport, validateTransportDraft } = exports;
test('transport form odometer preview matches exact decimal math without converting units', () => {
  assert.equal(distanceDelta('120000.1', '120100.3'), '100.2');
  assert.equal(distanceDelta('900', '1000'), '100');
  assert.equal(distanceDelta('0.1', '0.3'), '0.2');
  assert.equal(distanceDelta('0', '0'), '0');
  for (const values of [['2', '1'], ['', '10'], ['1e2', '200'], ['0.0001', '1']]) assert.equal(distanceDelta(...values), undefined);
});
test('transport submission removes blank optional values and preserves explicit units/counts/readings', () => {
  const data = { ...emptyTransport(), driverName: '', notes: '', passengerCount: 8, odometerStart: '0', odometerEnd: '100', distanceUnit: 'MI', passengers: [{ name: ' راكب ', nationality: '' }] };
  const result = transportPayload(data);
  assert.equal(result.driverName, undefined); assert.equal(result.notes, undefined);
  assert.equal(result.distanceUnit, 'MI'); assert.equal(result.odometerStart, '0'); assert.equal(result.passengerCount, 8);
  assert.deepEqual(result.passengers, [{ name: 'راكب' }]); assert.equal(data.passengers[0].name, ' راكب ');
});

test('transport draft checks expose inconsistent readings, counts and arrival fields before saving', () => {
  const trip = { ...emptyTransport(), tripDate: '2026-10-29', departureTime: '16:00' };
  assert.equal(validateTransportDraft(trip), undefined);
  for (const change of [
    { odometerStart: '0' }, { odometerStart: '2', odometerEnd: '1' },
    { passengerCount: 1, passengers: [{ name: 'First' }, { name: 'Second' }] },
    { vehicleCapacity: 4, passengerCount: 5 }, { arrivalDate: '2026-10-29' },
    { arrivalDate: '2026-10-29', arrivalTime: '15:00' },
    { passengers: [{ name: ' ' }] },
  ]) assert.equal(typeof validateTransportDraft({ ...trip, ...change }), 'string');
  assert.equal(validateTransportDraft({ ...trip, odometerStart: '0', odometerEnd: '0', arrivalDate: '2026-10-30', arrivalTime: '01:00', passengerCount: 5, vehicleCapacity: 5 }), undefined);
});
