import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { createStore } from '../src/explorer/model.js';
import { createEdition, observationWeek, prototypeKind, verifyApproval } from '../src/insights/snapshot.js';
import { createPostPreview } from '../src/insights/post.js';

const relay = 'wss://example.com';
const coverage = { relays: [{ url: relay, eose: [35129], state: 'live', limited: true }] };
const observedAt = '2026-11-27T04:00:00.000Z';

test('queues a UTC edition, counts publication coordinates across relays, and binds the manifest', () => {
  const key = generateSecretKey();
  const store = createStore();
  const publication = finalizeEvent({
    kind: 35129, created_at: 1795737600, content: 'Example description',
    tags: [['d', 'relay-scout'], ['x', 'a'.repeat(64)], ['title', 'Relay Scout'], ['R', 'relay'], ['O', 'relay'], ['icon', 'b'.repeat(64), 'image/png']],
  }, key);
  assert.equal(store.ingest(publication, relay), 'accepted');
  assert.equal(store.ingest(publication, 'wss://other.example'), 'duplicate');
  const week = observationWeek(new Date(observedAt));
  assert.deepEqual(week, { weekStartUtc: '2026-11-23', weekEndExclusiveUtc: '2026-11-30' });
  const draft = createEdition({ store, coverage, observedAt, week, previous: [], kind: prototypeKind });
  assert.equal(draft.snapshot.totals.observed, 1);
  assert.equal(draft.snapshot.totals.new, null);
  assert.equal(draft.snapshot.coverage.status, 'partial');
  assert.deepEqual(draft.snapshot.capabilities.relay, { requiredOnly: 0, optionalOnly: 0, both: 1 });
  assert.deepEqual(draft.manifest.napplets[0].icon, { hash: 'b'.repeat(64), mime: 'image/png' });
  assert.equal(draft.snapshot.manifestSha256, createHash('sha256').update(JSON.stringify(draft.manifest)).digest('hex'));
  assert.equal(draft.unsigned.sig, undefined);
  const next = createEdition({
    store, coverage, week: observationWeek(new Date('2026-12-01')), observedAt: '2026-12-01T04:00:00.000Z',
    previous: [draft], kind: prototypeKind,
  });
  assert.equal(next.snapshot.totals.new, 0);
  const post = createPostPreview(draft.snapshot);
  assert.match(post.text, /https:\/\/hypergolic\.sh\/insights\/2026-11-23\//);
  assert.match(post.image, /partial coverage/);
});

test('checks the exact queued payload and account with a disposable signing key', () => {
  const key = generateSecretKey();
  const unsigned = { kind: prototypeKind, created_at: 1795737600, tags: [], content: '{"edition":"fixture"}' };
  const signed = finalizeEvent(unsigned, key);
  assert.equal(verifyApproval(signed, unsigned, getPublicKey(key)), true);
  assert.equal(verifyApproval(signed, { ...unsigned, content: '{}' }, getPublicKey(key)), false);
  assert.equal(verifyApproval(signed, unsigned, getPublicKey(generateSecretKey())), false);
  assert.equal(verifyApproval({ ...signed, sig: '0'.repeat(128) }, unsigned, getPublicKey(key)), false);
});

test('relay submission matches the event ID and read-back verifies its signature', async t => {
  const { submitEvent, readBackEvent, publishSnapshot } = await import('../src/insights/relay-publication.js');
  const event = finalizeEvent({
    kind: prototypeKind, created_at: 1795737600, content: 'snapshot test', tags: [],
  }, generateSecretKey());
  let frames;
  let writes = 0;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
  t.after(() => Object.defineProperty(globalThis, 'WebSocket', descriptor));
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: class FakeSocket {
    constructor() { queueMicrotask(() => this.onopen()); }
    close() {}
    send(packet) {
      const [type, request] = JSON.parse(packet);
      if (type === 'EVENT') writes++;
      queueMicrotask(() => {
        for (const frame of frames(type, request)) this.onmessage({ data: JSON.stringify(frame) });
      });
    }
  } });

  frames = () => [['OK', event.id, false, 'blocked: unsupported kind']];
  assert.equal((await submitEvent(relay, event)).status, 'rejected');

  frames = (_, request) => [
    ['EVENT', request, { ...event, sig: '0'.repeat(128) }],
    ['EOSE', request],
  ];
  assert.equal((await readBackEvent(relay, event)).status, 'missing');

  frames = (_, request) => [['EVENT', request, structuredClone(event)]];
  const [result] = await publishSnapshot([relay], event);
  assert.equal(result.write.status, 'already_present');
  assert.equal(result.read.status, 'verified');
  assert.equal(writes, 1);
});
