import test from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_LIMITS, RELAYS, startLive } from '../src/explorer/live.js';

function setup(t) {
  const sockets = [];
  class Socket {
    sent = [];
    constructor(url) { this.url = url; sockets.push(this); }
    send(packet) { this.sent.push(JSON.parse(packet)); }
    close() { this.closed = true; }
    frame(...message) { this.onmessage({ data: JSON.stringify(message) }); }
  }
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1800000000000 });
  const originalSocket = globalThis.WebSocket;
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = originalSocket; });
  const coverage = [];
  const events = [];
  const stop = startLive({
    onChange: c => coverage.push(c),
    onEvent(event, relay, at) {
      events.push({ event, relay, at });
      return event.content === 'bad signature' ? 'rejected' : 'accepted';
    },
  });
  t.after(stop);
  return { sockets, coverage, events, stop };
}

test('queries kinds independently, keeps live updates, and exposes saturation and NIP-67 hints', t => {
  const { sockets, coverage, events, stop } = setup(t);
  assert.deepEqual(sockets.map(s => s.url), RELAYS);
  const relay = sockets[0];
  relay.onopen();
  for (const [k, limit] of Object.entries(LIVE_LIMITS.perKind))
    assert.ok(relay.sent.some(([cmd, id, filter]) => cmd === 'REQ' && id === 'pub-' + k && filter.limit === limit && filter.kinds[0] === Number(k)));
  relay.frame('EOSE', 'pub-15129', ['finish']);
  relay.frame('EOSE', 'pub-5129');
  relay.frame('EOSE', 'pub-35129', ['more', 'unknown']);
  relay.frame('EVENT', 'pub-35129', { id: '1'.repeat(64), kind: 35129, pubkey: 'f'.repeat(64), tags: [['d', 'live']] });
  relay.frame('EVENT', 'pub-35129', { kind: 1 });
  t.mock.timers.tick(130);
  let state = coverage.at(-1);
  assert.equal(events.length, 1);
  assert.equal(events[0].relay, RELAYS[0]);
  assert.equal(state.relays[0].state, 'live');
  assert.deepEqual(state.relays[0].limitedKinds, [35129]);
  assert.deepEqual(state.relays[0].hints[35129], ['more']);
  assert.equal(state.responded, 1);
  assert.equal(state.limited, 1);
  stop();
  assert.ok(sockets.every(s => s.closed && !s.onmessage));
  assert.ok(coverage.at(-1).stoppedAt);
});

test('looks up signed publication IDs and addresses across the relay set; ignores unrelated deletion traffic', t => {
  const { sockets, events, coverage } = setup(t);
  for (const socket of sockets) socket.onopen();
  const publisher = 'a'.repeat(64);
  const id = '1'.repeat(64);
  const address = '35129:' + publisher + ':my:app';
  sockets[0].frame('EVENT', 'pub-35129', { id, kind: 35129, pubkey: publisher, tags: [['d', 'my:app']] });
  sockets[0].frame('EVENT', 'pub-35129', { id: '2'.repeat(64), kind: 35129, content: 'bad signature' });
  t.mock.timers.tick(1000);
  for (const socket of sockets) {
    const req = socket.sent.find(([, name]) => name.startsWith('deletions-'));
    assert.ok(req);
    assert.deepEqual(req[2]['#e'], [id]);
    assert.deepEqual(req[3]['#a'], [address]);
  }
  const target = sockets[2];
  target.frame('EOSE', 'deletions-1');
  target.frame('EVENT', 'deletions-1', { kind: 5, tags: [['a', address]] });
  target.frame('EVENT', 'deletions-1', { kind: 5, tags: [['a', 'other']] });
  target.frame('EVENT', 'bogus-sub', { kind: 5, tags: [['a', address]] });
  t.mock.timers.tick(200);
  assert.equal(events.length, 3);
  assert.equal(events.at(-1).relay, RELAYS[2]);
  assert.equal(coverage.at(-1).relays[2].deletions, 'Listening for targeted deletions');
});

test('retains useful peers while identifying failed, timed-out and oversized responses', t => {
  const { sockets, coverage } = setup(t);
  sockets[0].onerror();
  sockets[1].onopen();
  sockets[1].onmessage({ data: 'a'.repeat(LIVE_LIMITS.frameBytes + 1) });
  assert.equal(sockets[1].closed, undefined);
  for (const k of Object.keys(LIVE_LIMITS.perKind)) sockets[1].frame('EOSE', 'pub-' + k);
  t.mock.timers.tick(LIVE_LIMITS.initialSeconds * 1000 + 1);
  t.mock.timers.tick(121);
  const latest = coverage.at(-1);
  assert.equal(latest.failed, 2);
  assert.equal(latest.responded, 1);
  assert.equal(latest.limited, 1);
  assert.equal(latest.stoppedAt, null);
  assert.equal(latest.relays[1].state, 'live');
  assert.equal(latest.relays[1].skippedOversized, 1);
  assert.match(latest.relays[2].reason, /timed out/);
  sockets[1].onmessage({ data: 'x'.repeat(LIVE_LIMITS.perRelayBytes) });
  t.mock.timers.tick(121);
  assert.ok(coverage.at(-1).stoppedAt);
  assert.equal(coverage.at(-1).relays[1].state, 'limited');
  assert.ok(sockets.every(s => s.closed));
});
