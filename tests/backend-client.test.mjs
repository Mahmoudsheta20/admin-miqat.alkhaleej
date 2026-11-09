import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const output = ts.transpileModule(fs.readFileSync(new URL('../lib/backend.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(fetch, browser = true) {
  const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
  const context = { exports: {}, process: { env: { NEXT_PUBLIC_BACKEND_URL: 'https://backend.example/api/' } }, ...(browser ? { window: { location: { protocol: 'https:' } } } : {}), document: { cookie: '' }, localStorage: storage(), sessionStorage: storage(), fetch, AbortSignal, FormData, URLSearchParams };
  vm.runInNewContext(output, context);
  return { ...context, api: context.exports };
}
test('legacy browser credentials are retired without persisting new tokens', () => {
  const { api, localStorage, sessionStorage } = setup();
  localStorage.setItem('miqat_token', 'legacy'); sessionStorage.setItem('miqat_auth_user', 'legacy-user');
  api.clearLegacyCredentials();
  assert.equal(localStorage.getItem('miqat_token'), null);
  assert.equal(sessionStorage.getItem('miqat_auth_user'), null);
  assert.equal(api.setAuthToken, undefined);
});
test('all browser requests including documents use the same-origin proxy', () => {
  const { api } = setup();
  assert.equal(api.backendUrl('/contracts'), '/api/proxy/contracts');
  assert.equal(api.backendUrl('/api/contracts/a/pdf?download=1'), '/api/proxy/contracts/a/pdf?download=1');
});
test('server requests normalize a configured /api base', () => {
  const { api } = setup(undefined, false);
  assert.equal(api.backendUrl('/contracts'), 'https://backend.example/api/contracts');
});
test('session-only login sends rememberMe and includes cookies without an Authorization header', async () => {
  let init;
  const { api } = setup(async (_url, options) => { init = options; return new Response(JSON.stringify({ success: true, data: { user: { id: 'captain' } } }), { headers: { 'content-type': 'application/json' } }); });
  const result = await api.backendRequest('/auth/login', 'POST', { rememberMe: false });
  assert.equal(result.success, true); assert.equal(init.credentials, 'include');
  assert.equal(JSON.parse(init.body).rememberMe, false); assert.equal(init.headers.Authorization, undefined);
});
test('failed API and HTML gateway responses preserve status and readable errors', async () => {
  const { api } = setup(async () => new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } }));
  const response = await api.backendRequest('/contracts');
  assert.equal(response.success, false); assert.equal(response.status, 502); assert.match(response.error, /الخادم/);
});
