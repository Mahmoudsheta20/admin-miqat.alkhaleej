const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const sourceCode = fs.readFileSync(path.join(__dirname, '../lib/return-trip.ts'), 'utf8');
const compiled = ts.transpileModule(sourceCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleExports = {};
new Function('exports', compiled)(moduleExports);
const { returnTripPayload } = moduleExports;

const source = {
  id: 'outbound', referenceNumber: 'MQ-2026-001', operationType: 'INTERCITY',
  origin: 'Jeddah', destination: 'Makkah', customerName: 'Guest', customerPhone: '0500000000',
  captainId: 'original', vehiclePlate: 'OLD 123', tripDate: '2026-09-25', tripTime: '09:00',
  inspectionId: 'old-inspection', pdfPath: 'old.pdf', flightNumber: 'OUTBOUND-1',
  passengers: [{ id: 'old-passenger', sequence: 1, name: 'Guest', nationality: 'SA', idNumber: '123' }],
};
const selection = { captainId: 'original', vehiclePlate: 'OLD 123', tripDate: '2026-09-28', tripTime: '14:30' };

test('return trip reverses route and copies passengers without changing the original', () => {
  const snapshot = JSON.stringify(source);
  const result = returnTripPayload(source, selection);
  assert.equal(result.origin, 'Makkah');
  assert.equal(result.destination, 'Jeddah');
  assert.equal(result.tripDate, '2026-09-28');
  assert.equal(result.captainId, 'original');
  assert.deepEqual(result.passengers, [{ name: 'Guest', nationality: 'SA', idNumber: '123' }]);
  assert.equal(result.inspectionId, undefined);
  assert.equal(result.flightNumber, undefined);
  assert.equal(result.id, undefined);
  assert.equal(result.pdfPath, undefined);
  result.passengers[0].name = 'Changed draft';
  assert.equal(JSON.stringify(source), snapshot);
});

test('return trip honors a replacement captain and vehicle', () => {
  const result = returnTripPayload(source, { ...selection, captainId: 'replacement', vehiclePlate: 'NEW 456' });
  assert.equal(result.captainId, 'replacement');
  assert.equal(result.vehiclePlate, 'NEW 456');
  assert.equal(result.inspectionData.inspectionDate, selection.tripDate);
  assert.equal(result.tripTime, '14:30');
});

test('issue and inspection dates follow the selected return date', () => {
  for (const tripDate of ['2026-10-05', '2026-11-12']) {
    const result = returnTripPayload(source, { ...selection, tripDate });
    assert.equal(result.tripDate, tripDate);
    assert.equal(result.issueDate, tripDate);
    assert.equal(result.inspectionData.inspectionDate, tripDate);
  }
});
