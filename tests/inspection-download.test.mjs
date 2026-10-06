import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(fs.readFileSync(new URL('../lib/download-pdf.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(response) {
  const requests = [];
  const links = [];
  const revoked = [];
  const scheduled = [];
  const context = {
    exports: {}, Blob, AbortSignal,
    require: () => ({ backendUrl: path => `https://api.example/api${path}`, getAuthToken: () => 'test-session' }),
    fetch: async (url, init) => { requests.push({ url, init }); return response; },
    URL: { createObjectURL: () => 'blob:inspection', revokeObjectURL: url => revoked.push(url) },
    window: { setTimeout: callback => scheduled.push(callback) },
    document: {
      body: { appendChild: () => {} },
      createElement: () => {
        const link = { click() { this.clicked = true; }, remove() { this.removed = true; } };
        links.push(link); return link;
      },
    },
  };
  vm.runInNewContext(compiled, context);
  return { download: context.exports.downloadInspectionPdf, requests, links, revoked, scheduled };
}

test('downloads the inspection separately using header authentication and releases the blob', async () => {
  const state = setup(new Response('%PDF-1.7\ninspection', { headers: { 'content-type': 'application/pdf' } }));
  await state.download('abcd-1234');
  assert.equal(state.requests[0].url, 'https://api.example/api/inspections/abcd-1234/pdf?download=1');
  assert.equal(state.requests[0].init.headers.Authorization, 'Bearer test-session');
  assert.equal(state.requests[0].init.credentials, 'include');
  assert.equal(state.links[0].download, 'inspection-ABCD1234.pdf');
  assert.equal(state.links[0].clicked, true);
  assert.equal(state.links[0].removed, true);
  state.scheduled[0]();
  assert.deepEqual(state.revoked, ['blob:inspection']);
});

test('an expired session cannot download a document', async () => {
  const state = setup(new Response('unauthorized', { status: 401 }));
  await assert.rejects(state.download('inspection-id'), /الجلسة/);
  assert.equal(state.links.length, 0);
});

test('an invalid PDF cannot be saved as an inspection', async () => {
  const state = setup(new Response('<html>error</html>'));
  await assert.rejects(state.download('inspection-id'), /PDF/);
  assert.equal(state.links.length, 0);
});
