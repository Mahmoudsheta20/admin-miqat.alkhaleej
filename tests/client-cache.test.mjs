import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../lib/clientCache.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const cache = {};
new Function('exports', output)(cache);
const { fetchCached, invalidateClientCache } = cache;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('deduplicates concurrent reads and does not cache failure responses', async () => {
  invalidateClientCache();
  let calls = 0;
  const read = () => { calls++; return Promise.resolve({ success: true }); };
  await Promise.all([fetchCached('a', read), fetchCached('a', read)]);
  await fetchCached('a', read);
  assert.equal(calls, 1);
  await fetchCached('b', () => Promise.resolve({ success: false }));
  assert.equal(await fetchCached('b', () => Promise.resolve('retried')), 'retried');
});

test('an invalidated request cannot replace a newer cached result', async () => {
  invalidateClientCache();
  const old = deferred();
  const previous = fetchCached('contracts', () => old.promise);
  invalidateClientCache('contracts');
  await fetchCached('contracts', () => Promise.resolve('new'));
  old.resolve('old');
  await previous;
  assert.equal(await fetchCached('contracts', () => Promise.resolve('unexpected')), 'new');
});

test('prefix invalidation preserves unrelated pending requests', async () => {
  invalidateClientCache();
  const pending = deferred();
  const read = fetchCached('fleet', () => pending.promise);
  invalidateClientCache('contracts');
  let repeated = false;
  const other = fetchCached('fleet', () => { repeated = true; return Promise.resolve('wrong'); });
  pending.resolve('fleet data');
  assert.deepEqual(await Promise.all([read, other]), ['fleet data', 'fleet data']);
  assert.equal(repeated, false);
});

test('a synchronously thrown fetcher can be retried', async () => {
  invalidateClientCache();
  await assert.rejects(fetchCached('retry', () => { throw new Error('offline'); }));
  assert.equal(await fetchCached('retry', () => Promise.resolve('online')), 'online');
});
