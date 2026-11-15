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

const backendMod = loadTsModule('../lib/backend.ts', () => ({}));
const zatcaMod = loadTsModule('../lib/zatca.ts', (id) => {
  if (id === './backend') return backendMod;
  if (id === './invoice-transport') return {};
  throw new Error(`Unexpected import in zatca.ts test shim: ${id}`);
});
const helpersMod = loadTsModule('../app/(admin)/admin/zatca/zatca-helpers.ts', (id) => {
  if (id === '@/lib/backend') return backendMod;
  if (id === '@/lib/zatca') return zatcaMod;
  throw new Error(`Unexpected import in test: ${id}`);
});

const {
  buildZatcaInvoicesQueryPath,
  computeEgsStageProgress,
  zatcaQrImageUrl,
} = helpersMod;

test('buildZatcaInvoicesQueryPath omits blank filters and formats active filters', () => {
  assert.equal(
    buildZatcaInvoicesQueryPath({ page: 1 }),
    '/zatca/invoices?page=1',
  );
  assert.equal(
    buildZatcaInvoicesQueryPath({
      page: 3,
      status: 'REJECTED',
      kind: 'CREDIT',
      profile: 'STANDARD',
      egsId: 'egs-1',
      overdue: true,
      deliverableOnly: true,
      search: '  INV-100  ',
    }),
    '/zatca/invoices?page=3&status=REJECTED&kind=CREDIT&profile=STANDARD&egsId=egs-1&overdue=true&deliverableOnly=true&search=INV-100',
  );
});

test('computeEgsStageProgress evaluates readiness stages from NEEDS_CSR through ACTIVE', () => {
  const base = {
    id: 'egs-1',
    identity: 'MIQAT-EGS-01',
    environment: 'SANDBOX',
    invoiceTypes: '1100',
    productionEnabled: false,
    counter: 0,
    csrReady: false,
    complianceReady: false,
    productionReady: false,
    complianceChecks: null,
  };

  assert.deepEqual(computeEgsStageProgress(base), {
    completedSteps: 0,
    totalSteps: 5,
    currentStage: 'NEEDS_CSR',
    supportedProfiles: ['STANDARD', 'SIMPLIFIED'],
    passedChecksCount: 0,
  });

  const withChecks = computeEgsStageProgress({
    ...base,
    invoiceTypes: '0100',
    csrReady: true,
    complianceReady: true,
    complianceChecks: { SIMPLIFIED_INVOICE: { passed: true } },
  });
  assert.equal(withChecks.completedSteps, 3);
  assert.equal(withChecks.currentStage, 'NEEDS_PRODUCTION_CSID');
  assert.deepEqual(withChecks.supportedProfiles, ['SIMPLIFIED']);
  assert.equal(withChecks.passedChecksCount, 1);

  const active = computeEgsStageProgress({
    ...base,
    csrReady: true,
    complianceReady: true,
    complianceChecks: [{ profile: 'STANDARD', kind: 'INVOICE', passed: true }],
    productionReady: true,
    productionEnabled: true,
  });
  assert.equal(active.completedSteps, 5);
  assert.equal(active.currentStage, 'ACTIVE');
});

test('zatcaQrImageUrl encodes invoice ID safely', () => {
  const url = zatcaQrImageUrl('inv/123');
  assert.match(url, /\/zatca\/invoices\/inv%2F123\/qr\.png$/);
});
