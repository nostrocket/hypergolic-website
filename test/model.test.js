import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { createStore, aggregate, LIMITS } from '../src/explorer/model.js';
import { lookup } from '../src/explorer/catalogue.js';

// SYNTHETIC signed events. Keys, identifiers and descriptions below exist only in tests.
const key = Uint8Array.from({ length: 32 }, () => 1);
const otherKey = Uint8Array.from({ length: 32 }, () => 2);
const hash = 'f'.repeat(64);
const now = 2000;
const relay = 'wss://relay.example';
const pubkey = getPublicKey(key);
function sign(kind, tags, created_at = 1000, content = 'Synthetic example', secret = key) {
  return finalizeEvent({ kind, tags, content, created_at }, secret);
}
function named(d, tags = [], time = 1000, secret = key) {
  return sign(35129, [['d', d], ['x', hash], ...tags], time, 'Synthetic example', secret);
}
const R = value => ['R', value];
const O = value => ['O', value];
function load(events) {
  const store = createStore();
  for (const event of events) assert.equal(store.ingest(event, relay, 1500), 'accepted');
  return store;
}

test('SYNTHETIC reference dataset reproduces all three measures and retains the excluded identities', () => {
  const eligible = [
    named('P01', [R('cvm'), R('relay'), R('relay'), O('neighbor'), O('lablink')]),
    named('P02', [R('relay'), O('cvm'), O('mesh')]),
    named('P03', [R('cvm'), O('cvm'), R('relay')]),
    named('P04', [R('neighbor'), R('relay')]),
    named('P05', [R('neighbor'), O('relay')]),
    named('P06', [R('mesh')]),
  ];
  const deleted = named('P11', [R('private')]);
  const excluded = [
    named('P07', [R('older')], 999), sign(35129, [['d', 'P07'], ['x', 'bad'], R('broken')]),
    named('P08', [R('older')], 999), named('P08', [R('nap:cvm')]),
    sign(35129, [['d','P09'], ['path', '/index.html', hash], ['x', hash, 'aggregate'], ['requires', 'relay']]),
    sign(35129, [['d','P10'], ['odd', 'schema']]), deleted, sign(5, [['e', deleted.id]]),
    named('P12', [['expiration', '1900'], R('too-old')]),
  ];
  const versions = [1,2,3].map(n => sign(5129, [['x',hash], R('snap-only')], 1000 + n));
  const result = load([...eligible, ...excluded, ...versions]).snapshot(now);
  assert.equal(result.heads.length, 12);
  assert.equal(result.snapshots.length, 3);
  assert.equal(result.heads.filter(r => r.status === 'eligible').length, 6);
  assert.deepEqual(result.heads.filter(r => r.status !== 'eligible').map(r => r.status).sort(),
    ['deleted', 'expired', 'legacy', 'schema-invalid', 'schema-invalid', 'unknown']);
  const rows = aggregate([...result.heads, ...result.snapshots]);
  assert.deepEqual(rows.map(r => [r.domain, r.required, r.optionalOnly, r.union]), [
    ['relay',4,1,5], ['cvm',2,1,3], ['neighbor',2,1,3], ['mesh',1,1,2], ['lablink',0,1,1],
  ]);
  const cvm = rows.find(r => r.domain === 'cvm');
  assert.equal(cvm.both, 1);
  const getIds = predicate => result.heads.filter(r => r.status === 'eligible' && predicate(r)).map(r => r.title).sort();
  assert.deepEqual(getIds(r => r.required.includes('cvm')), ['P01','P03']);
  assert.deepEqual(getIds(r => r.optional.includes('cvm') && !r.required.includes('cvm')), ['P02']);
  assert.deepEqual(getIds(r => !r.optional.includes('cvm') && !r.required.includes('cvm')), ['P04','P05','P06']);
  assert.deepEqual(result.heads.find(r => r.title === 'P09').legacyRequires, ['relay']);
  assert.deepEqual(aggregate([]), []);
});

test('invalid signatures and IDs cannot supersede a verified head or forge relay provenance', () => {
  const first = named('stable', [O('theme')]);
  const newer = named('stable', [R('bogus')], 1001);
  const store = load([first]);
  assert.equal(store.ingest({ ...newer, sig: '0'.repeat(128) }, relay), 'rejected');
  assert.equal(store.ingest({ ...newer, id: '0'.repeat(64) }, relay), 'rejected');
  assert.equal(store.ingest({ ...first, sig: '0'.repeat(128) }, 'wss://false.example'), 'rejected');
  assert.equal(store.ingest(first, 'wss://second.example', 1499), 'duplicate');
  const result = store.snapshot(now);
  assert.equal(result.rejected, 3);
  assert.equal(result.totalEvents, 1);
  assert.deepEqual(result.heads[0].relays, [relay, 'wss://second.example']);
  assert.equal(result.heads[0].observedAt, 1499);
  assert.deepEqual(result.heads[0].required, []);
  first.tags[0][1] = 'tamper';
  assert.equal(store.snapshot(now).heads[0].event.tags[0][1], 'stable');
});

test('roots, named publications, publishers and snapshots have independent identities and stable ties', () => {
  const namedA = named('root', [R('abc')]);
  const tied = named('root', [R('xyz')]);
  const anotherPublisher = named('root', [], 1000, otherKey);
  const anotherName = named('ROOT');
  const root = sign(15129, [['x', hash]]);
  const snap = sign(5129, [['x',hash], ['a', `15129:${pubkey}:`]]);
  const events = [namedA, tied, anotherPublisher, anotherName, root, snap];
  const a = load(events).snapshot(now), b = load(events.reverse()).snapshot(now);
  assert.deepEqual(a,b);
  assert.equal(a.heads.length, 4);
  assert.equal(a.snapshots[0].status, 'snapshot');
  assert.equal(a.heads.find(r => r.key === `35129:${pubkey}:root`).event.id, [namedA.id,tied.id].sort()[0]);
  assert.deepEqual(a.heads.find(r => r.key === `15129:${pubkey}:`).required, []);
});

test('signed malformed newer heads win selection but cannot be counted', () => {
  const unaddressable = sign(35129, [['x',hash], R('isolated')]);
  const cases = [
    named('m', [R('before')], 800),
    named('m', [['d','other'], R('after')]),
    sign(15129, [['d','bad-on-root'], ['x',hash]]), unaddressable,
    sign(35129, [['d','mixed'], ['path','/index.html',hash], R('mesh')]),
    sign(35129, [['d','empty-content'], ['x',hash]], 1000, '  '),
    named('bad-arity', [['R','relay','extra']]), named('lineage', [['A','unknown']]),
    named('unknown-domain', [R('external-domain'), ['i','napplet:test/open'], ['z','arc'], ['N','fake']]),
    named('bad-source', [['source','invalid'],['preview','invalid'],['icon','invalid']]),
  ];
  const result = load(cases).snapshot(now);
  assert.equal(result.heads.find(r => r.key === unaddressable.id).status,'schema-invalid');
  assert.equal(result.heads.find(r => r.title === 'mixed').status,'mixed');
  assert.equal(result.heads.filter(r => r.status === 'schema-invalid').length, 6);
  assert.deepEqual(aggregate(result.heads).map(r => r.domain), ['external-domain']);
});

test('author-scoped deletion, cutoff, post-deletion updates and expiry apply after head selection', () => {
  const coordinate = `35129:${pubkey}:a:b`;
  const old = named('a:b', [], 900), head = named('a:b', [R('relay')], 1000);
  const early = sign(5, [['a', coordinate]], 999);
  const wrongAuthor = sign(5, [['a', coordinate], ['e',head.id]], 1000, '', otherKey);
  const store = load([old, head, early, wrongAuthor]);
  assert.equal(store.snapshot(now).heads[0].status, 'eligible');
  store.ingest(sign(5, [['a', coordinate]], 1000), relay);
  assert.equal(store.snapshot(now).heads[0].status, 'deleted');
  const recovery = named('a:b', [['expiration','1300']], 1100);
  store.ingest(recovery, relay);
  assert.equal(store.snapshot(1099).heads[0].status, 'deleted');
  assert.equal(store.snapshot(1100).heads[0].status, 'eligible');
  assert.equal(store.snapshot(1300).heads[0].status, 'expired');
  // Exact-ID deletion targets only the same author's matching version; a later head still wins.
  store.ingest(sign(5, [['e',head.id]], 1500), relay);
  assert.equal(store.snapshot(now).heads[0].event.id, recovery.id);
});

test('limits and malformed shapes cannot enter the dataset', () => {
  const store = createStore(), e = named('bounds');
  for (const bad of [null, {...e, created_at: -1}, {...e, kind: 1}, {...e, tags:[[42]]}, {...e, pubkey: 'x'}]) {
    assert.equal(store.ingest(bad, relay), 'rejected');
  }
  assert.equal(store.ingest({...e,tags:Array(LIMITS.tags + 1).fill([])}, relay),'oversized');
  assert.equal(store.ingest({...e,content:'月'.repeat(25000)}, relay),'oversized');
  assert.deepEqual(store.snapshot(now), {heads:[], snapshots:[], rejected:5, limited:true, totalEvents:0});
});

test('catalogue status stays independent of declarations, header and historical proposal context', () => {
  assert.equal(lookup('cvm').status, 'Draft');
  assert.equal(lookup('class').status, 'Deferred');
  assert.equal(lookup('class').header, 'draft');
  assert.equal(lookup('mesh').status, 'Not listed in pinned catalogue');
  assert.match(lookup('mesh').context, /Retracted/);
  assert.notEqual(lookup('mesh').spec, lookup('neighbor').spec);
  assert.equal(lookup('lablink').spec, null);
  assert.equal(lookup('constructor').spec, null);
});

test('a single oversize event is skipped, while the shared retained-byte cap stops new identities', () => {
  const store = createStore();
  assert.equal(store.ingest({ ...named('large'), content: 'a'.repeat(LIMITS.eventBytes + 1) }, relay), 'oversized');
  const content = 'a'.repeat(63000);
  let first, count = 0, outcome;
  for (let i = 0; i <= Math.ceil(LIMITS.bytes / content.length); i++) {
    const event = sign(35129, [['d', `size-${i}`], ['x',hash]], 1100, content);
    first ??= event;
    outcome = store.ingest(event, relay);
    if (outcome === 'limited') break;
    assert.equal(outcome, 'accepted');
    count++;
  }
  assert.equal(outcome, 'limited');
  assert.ok(count > 0 && count < LIMITS.events);
  assert.equal(store.ingest(first, 'wss://second.example'), 'duplicate');
  assert.equal(store.snapshot(now).heads.length, count);
});
