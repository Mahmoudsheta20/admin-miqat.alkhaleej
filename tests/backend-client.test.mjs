import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const output = ts.transpileModule(fs.readFileSync(new URL('../lib/backend.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(fetch) {
  const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
  const context = { exports: {}, process: { env: { NEXT_PUBLIC_BACKEND_URL: 'https://backend.example/api/' } }, window: { location: { protocol: 'https:' } }, document: { cookie: '' }, localStorage: storage(), sessionStorage: storage(), fetch, AbortSignal, FormData, URLSearchParams };
  vm.runInNewContext(output, context);
  return { ...context, api: context.exports };
}

test('remember me uses one storage and clears the previous account token', () => {
  const { api, localStorage, sessionStorage, document } = setup();
  api.setAuthToken('persistent', true);
  assert.equal(localStorage.getItem('miqat_token'), 'persistent');
  api.setAuthToken('session-only', false);
  assert.equal(localStorage.getItem('miqat_token'), null);
  assert.equal(sessionStorage.getItem('miqat_token'), 'session-only');
  assert.equal(document.cookie.includes('max-age='), false);
  api.setAuthToken(null);
  assert.equal(api.getAuthToken(), null);
});

test('normalizes a configured /api base without duplicating the prefix', () => {
  const { api } = setup();
  assert.equal(api.backendUrl('/contracts'), 'https://backend.example/api/contracts');
  assert.equal(api.backendUrl('/api/contracts'), 'https://backend.example/api/contracts');
});

test('failed API responses never persist returned tokens', async () => {
  const { api } = setup(async () => new Response(JSON.stringify({ success: false, token: 'unexpected' }), { status: 401, headers: { 'content-type': 'application/json' } }));
  const response = await api.backendRequest('/auth/login', 'POST', { rememberMe: false });
  assert.equal(response.success, false);
  assert.equal(response.status, 401);
  assert.equal(api.getAuthToken(), null);
});

test('successful session-only login honors rememberMe in the API payload', async () => {
  const { api, localStorage, sessionStorage } = setup(async () => new Response(JSON.stringify({ success: true, data: { token: 'session-token' } }), { headers: { 'content-type': 'application/json' } }));
  await api.backendRequest('/auth/login', 'POST', { rememberMe: false });
  assert.equal(localStorage.getItem('miqat_token'), null);
  assert.equal(sessionStorage.getItem('miqat_token'), 'session-token');
});

test('HTML gateway failures produce a readable error instead of a JSON exception', async () => {
  const { api } = setup(async () => new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } }));
  const response = await api.backendRequest('/contracts');
  assert.equal(response.success, false);
  assert.equal(response.status, 502);
  assert.match(response.error, /الخادم/);
});
