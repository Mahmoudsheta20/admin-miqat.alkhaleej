import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const exports={};
new Function('require','exports',ts.transpileModule(fs.readFileSync('lib/commercial.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>({}),exports);
const {
  commissionPreview,
  commissionTotalPreview,
  emptyCommercial,
  emptyCommission,
  hasActiveCommission,
  hasActivePricing,
  hasAnyCommission,
  hasPositiveMoney,
  normalizeCommercialInput,
} = exports;

test('commission preview uses an independent basis and exact halala rounding',()=>{assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'800',percent:'10'}),'80.00');assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'0.10',percent:'15'}),'0.02');assert.equal(commissionPreview({mode:'FIXED',amount:'35.55',base:'0',percent:'0'}),'35.55');});
test('commission preview rejects malformed money instead of displaying a false total',()=>{assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'800',percent:'101'}),'—');assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'',percent:'10'}),'—');assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'1e3',percent:'10'}),'—');});

test('pricing and commission presence helpers distinguish empty defaults from active entries', () => {
  const blank = emptyCommercial();
  assert.equal(hasPositiveMoney('0'), false);
  assert.equal(hasPositiveMoney('0.00'), false);
  assert.equal(hasPositiveMoney(''), false);
  assert.equal(hasPositiveMoney('0.50'), true);
  assert.equal(hasActivePricing(blank), false);
  assert.equal(hasActivePricing({ netAmount: '0.00', taxCategory: 'Z' }), true);
  assert.equal(hasActivePricing({ netAmount: '100.00', taxCategory: 'S' }), true);
  assert.equal(hasActiveCommission(blank.driverCommission), false);
  assert.equal(hasAnyCommission(blank), false);
  assert.equal(
    hasAnyCommission({
      driverCommission: { mode: 'FIXED', amount: '25', base: '0', percent: '0' },
      representativeId: null,
      representativeCommission: emptyCommission(),
    }),
    true
  );
  assert.equal(
    hasAnyCommission({
      driverCommission: emptyCommission(),
      representativeId: 'rep-1',
      representativeCommission: emptyCommission(),
    }),
    true
  );
});

test('commission total preview sums driver and representative cents exactly and normalizes optional empty inputs', () => {
  assert.equal(
    commissionTotalPreview(
      { mode: 'FIXED', amount: '25.25', base: '0', percent: '0' },
      { mode: 'PERCENT', amount: '0', base: '800', percent: '10' }
    ),
    '105.25'
  );
  assert.equal(
    commissionTotalPreview(
      { mode: 'FIXED', amount: '', base: '0', percent: '0' },
      emptyCommission()
    ),
    '0.00'
  );
  assert.equal(
    commissionTotalPreview(
      { mode: 'FIXED', amount: 'bad', base: '0', percent: '0' },
      emptyCommission()
    ),
    '—'
  );

  const normalized = normalizeCommercialInput({
    customerId: null,
    netAmount: '',
    taxCategory: 'S',
    driverCommission: { mode: 'FIXED', amount: '', base: '0', percent: '0' },
    representativeId: null,
    representativeCommission: { mode: 'FIXED', amount: '30', base: '0', percent: '0' },
  });
  assert.deepEqual(normalized, {
    customerId: null,
    netAmount: '0',
    taxCategory: 'S',
    driverCommission: { mode: 'NONE', amount: '0', base: '0', percent: '0' },
    representativeId: null,
    representativeCommission: { mode: 'NONE', amount: '0', base: '0', percent: '0' },
  });
});
