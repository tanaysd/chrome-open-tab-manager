import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExportPayload,
  chunkTabs,
  dedupeTabs,
  encryptPayload,
  decryptPayload,
  normalizeTabsForExport,
  parseImportPayload,
  EXPORT_SCHEMA_VERSION
} from '../lib.js';

test('normalizeTabsForExport keeps only http/https tabs', () => {
  const out = normalizeTabsForExport([
    { url: 'https://a.com', title: 'A', pinned: true },
    { url: 'chrome://settings', title: 'Settings', pinned: false },
    { url: 'http://b.com', title: 'B', pinned: false }
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].pinned, true);
});

test('dedupeTabs removes duplicate urls', () => {
  const out = dedupeTabs([{ url: 'https://a.com' }, { url: 'https://a.com' }, { url: 'https://b.com' }]);
  assert.deepEqual(out.map((t) => t.url), ['https://a.com', 'https://b.com']);
});

test('parseImportPayload validates structure', () => {
  assert.throws(() => parseImportPayload('{}'));
  assert.throws(() => parseImportPayload('{"version":"x","tabs":[]}'));
  const out = parseImportPayload('{"version":2,"tabs":[{"url":"https://a.com"}]}');
  assert.equal(out.tabs.length, 1);
});

test('buildExportPayload sets schema version', () => {
  const out = buildExportPayload([{ url: 'https://a.com' }]);
  assert.equal(out.version, EXPORT_SCHEMA_VERSION);
});

test('chunkTabs splits arrays', () => {
  const out = chunkTabs([1, 2, 3, 4, 5], 2);
  assert.deepEqual(out, [[1, 2], [3, 4], [5]]);
});

test('encrypt/decrypt roundtrip', async () => {
  const payload = { version: 2, tabs: [{ url: 'https://a.com' }] };
  const enc = await encryptPayload(payload, 'secret');
  const dec = await decryptPayload(enc, 'secret');
  assert.deepEqual(dec, payload);
});
