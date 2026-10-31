import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/workspaceModeContext.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }
}).outputText;

const exports = {};
new Function('exports', 'require', compiled)(exports, (id) => {
  if (id === 'react') return { createContext: () => ({ Provider: () => null }), useContext: () => ({}), useEffect: () => {}, useRef: () => ({ current: null }), useCallback: (fn) => fn };
  if (id === 'next/navigation') return { usePathname: () => '/admin', useRouter: () => ({ push: () => {} }) };
  if (id === './useStoredPreference') return { useStoredPreference: () => 'OPERATIONS', setStoredPreference: () => {} };
  return {};
});

test('identifies finance routes accurately by prefix', () => {
  assert.equal(exports.isFinanceRoute('/admin/invoices'), true);
  assert.equal(exports.isFinanceRoute('/admin/invoices/new'), true);
  assert.equal(exports.isFinanceRoute('/admin/invoices/106'), true);
  assert.equal(exports.isFinanceRoute('/admin/purchases'), true);
  assert.equal(exports.isFinanceRoute('/admin/accounting'), true);
  assert.equal(exports.isFinanceRoute('/admin/vat-returns'), true);
  assert.equal(exports.isFinanceRoute('/admin/accounts'), true);
  assert.equal(exports.isFinanceRoute('/admin/zatca'), true);

  assert.equal(exports.isFinanceRoute('/admin'), false);
  assert.equal(exports.isFinanceRoute('/admin/contracts'), false);
  assert.equal(exports.isFinanceRoute('/admin/contracts/new'), false);
  assert.equal(exports.isFinanceRoute('/admin/captains'), false);
  assert.equal(exports.isFinanceRoute('/admin/fleet'), false);
  assert.equal(exports.isFinanceRoute('/admin/inspections'), false);
  assert.equal(exports.isFinanceRoute('/captain'), false);
});

test('identifies operations routes accurately for non-finance admin paths', () => {
  assert.equal(exports.isOperationsRoute('/admin'), true);
  assert.equal(exports.isOperationsRoute('/admin/contracts'), true);
  assert.equal(exports.isOperationsRoute('/admin/contracts/new'), true);
  assert.equal(exports.isOperationsRoute('/admin/captains'), true);
  assert.equal(exports.isOperationsRoute('/admin/fleet'), true);
  assert.equal(exports.isOperationsRoute('/admin/inspections'), true);

  // Finance routes are not classified as operations routes
  assert.equal(exports.isOperationsRoute('/admin/invoices'), false);
  assert.equal(exports.isOperationsRoute('/admin/invoices/new'), false);
  assert.equal(exports.isOperationsRoute('/admin/purchases'), false);
  assert.equal(exports.isOperationsRoute('/captain'), false);
});

