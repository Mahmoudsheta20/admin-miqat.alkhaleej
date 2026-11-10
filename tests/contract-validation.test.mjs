import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const modules = new Map();

function loadTs(filePath) {
  if (modules.has(filePath)) return modules.get(filePath);
  const exports = {};
  modules.set(filePath, exports);
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', transpiled)((specifier) => {
    if (specifier === '@/lib/contractConstants') return loadTs('lib/contractConstants.ts');
    if (specifier === '@/lib/types') return {};
    if (specifier === '@/app/_actions/contract') return {};
    return req(specifier);
  }, exports);
  return exports;
}

const { adminContractSchema, OPERATION_TYPE_LABELS, parseOperationType, sanitizeContractPayload } = loadTs('lib/validations/contract.ts');

const baseValidForm = {
  operationType: 'جولة سياحية',
  customerName: 'ضيف الاختبار',
  customerPhone: '0551234567',
  origin: 'مكة المكرمة',
  destination: 'جدة',
  tripDate: '2026/11/10',
  tripTime: '14:30',
  captainId: 'captain-1',
  vehiclePlate: 'أ ب ج 1234',
  passengers: [{ name: 'ضيف الاختبار', nationality: 'سعودي', idNumber: '1234567890' }],
};

test('adminContractSchema rejects empty or whitespace Service type so None default forces selection', () => {
  for (const blankType of ['', '   ', '\t']) {
    const parsed = adminContractSchema.safeParse({ ...baseValidForm, operationType: blankType });
    assert.equal(parsed.success, false);
    assert.equal(parsed.error.issues[0]?.message, 'نوع العملية التشغيلية مطلوب');
  }
});

test('adminContractSchema accepts valid Service type and sanitizeContractPayload maps enum cleanly', () => {
  const cases = [
    ['توصيل واستقبال مطار', 'AIRPORT_TRANSFER'],
    ['جولة سياحية', 'CITY_TOUR'],
    ['نقل بين المدن', 'INTERCITY'],
    ['نقل معتمرين وزوار', 'HAJJ_UMRAH'],
  ];

  for (const [input, expectedEnum] of cases) {
    const parsed = adminContractSchema.safeParse({ ...baseValidForm, operationType: input });
    assert.equal(parsed.success, true, `expected "${input}" to validate`);
    const payload = sanitizeContractPayload(parsed.data, 'insp-1');
    assert.equal(payload.operationType, expectedEnum);
  }
});

test('parseOperationType handles Arabic, English, edit labels, and compound phrases accurately', () => {
  const cases = [
    ['AIRPORT_TRANSFER', 'AIRPORT_TRANSFER'],
    ['CITY_TOUR', 'CITY_TOUR'],
    ['INTERCITY', 'INTERCITY'],
    ['HAJJ_UMRAH', 'HAJJ_UMRAH'],
    ['استقبال مطار', 'AIRPORT_TRANSFER'],
    ['Airport Transfer', 'AIRPORT_TRANSFER'],
    ['جولة سياحية وزيارات', 'CITY_TOUR'],
    ['City Tour', 'CITY_TOUR'],
    ['توصيل لجولة سياحية', 'CITY_TOUR'],
    ['Intercity', 'INTERCITY'],
    ['توصيل بين المدن', 'INTERCITY'],
    ['خدمات الحج والعمرة', 'HAJJ_UMRAH'],
    ['نقل زوار ومعتمرين', 'HAJJ_UMRAH'],
    ['توصيل معتمرين', 'HAJJ_UMRAH'],
    ['زيارة عمرة', 'HAJJ_UMRAH'],
    ['Hajj & Umrah', 'HAJJ_UMRAH'],
  ];

  for (const [input, expectedEnum] of cases) {
    assert.equal(parseOperationType(input), expectedEnum, `expected "${input}" -> ${expectedEnum}`);
    assert.ok(OPERATION_TYPE_LABELS[expectedEnum]);
  }
});

