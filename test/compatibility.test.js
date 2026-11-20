import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeEvent } from 'nostr-tools/pure';
import { countCompatibility } from '../src/explorer/compatibility.js';
import { createStore } from '../src/explorer/model.js';

// SYNTHETIC publications signed with a fixture key. Storage is Full and relay is Partial in v0.2.0.
const key = new Uint8Array(32).fill(1);
const supported = new Set(['storage', 'relay']);
const hash = 'f'.repeat(64);
function storeEvent(store, kind, tags, time = 100) {
  const event = finalizeEvent({ kind, tags, content: 'Synthetic publication', created_at: time }, key);
  assert.equal(store.ingest(event, 'wss://relay.example', time), 'accepted');
  return event;
}

test('counts only eligible heads and compares every exact required domain', () => {
  const store = createStore();
  assert.deepEqual(countCompatibility(store.snapshot(100).heads, supported), { matched: 0, total: 0 });
  const cases = [
    ['full-partial', ['R', 'storage'], ['R', 'relay'], ['O', 'unlisted']],
    ['optional-only', ['O', 'fs']],
    ['no-declarations'],
    ['none-required', ['R', 'storage'], ['R', 'fs']],
    ['unknown-required', ['R', 'relay-other']],
  ];
  for (const [id, ...tags] of cases) storeEvent(store, 35129, [['d', id], ['x', hash], ...tags]);
  storeEvent(store, 15129, [['x', hash], ['R', 'relay'], ['O', 'relay']]);
  storeEvent(store, 35129, [['d', 'unknown-schema']]);
  storeEvent(store, 5129, [['x', hash]]);
  assert.deepEqual(countCompatibility(store.snapshot(100).heads, supported), { matched: 4, total: 6 });
});

test('recomputes matches when the selected head changes, expires or is deleted', () => {
  const store = createStore();
  const base = [['d', 'changing'], ['x', hash]];
  storeEvent(store, 35129, [...base, ['R', 'storage']], 100);
  storeEvent(store, 35129, [...base, ['R', 'fs']], 110);
  storeEvent(store, 35129, [...base, ['expiration', '130']], 120);
  const newer = storeEvent(store, 35129, base, 140);
  storeEvent(store, 5, [['e', newer.id]], 150);
  for (const [time, matched, total] of [[100, 1, 1], [110, 0, 1], [120, 1, 1], [130, 0, 0], [140, 1, 1], [150, 0, 0]]) {
    assert.deepEqual(countCompatibility(store.snapshot(time).heads, supported), { matched, total });
  }
});
