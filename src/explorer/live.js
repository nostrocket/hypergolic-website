// Public, read-only relays which returned verified publication events during selection.
export const RELAYS = Object.freeze(['wss://nos.lol', 'wss://relay.ditto.pub', 'wss://relay.primal.net']);
export const LIVE_LIMITS = Object.freeze({
  perKind: Object.freeze({ 15129: 100, 35129: 200, 5129: 40 }),
  perRelayBytes: 4 * 1024 * 1024,
  perRelayFrames: 1200,
  frameBytes: 72 * 1024,
  initialSeconds: 20,
  sessionMinutes: 30,
  deletionTargets: 500,
  deletionFilterLimit: 64,
  addressFilterBytes: 24 * 1024,
});
const kinds = Object.keys(LIVE_LIMITS.perKind).map(Number);
const now = () => Math.floor(Date.now() / 1000);
const encoder = new TextEncoder();

function initialRow(url) {
  return {
    url, state: 'connecting', responded: false, limited: false, reason: '', received: 0,
    bytes: 0, frames: 0, skippedOversized: 0, eose: [], hints: {}, limitedKinds: [], deletions: 'Awaiting publications',
  };
}

// Reconnects are user initiated. Each call starts a separate, bounded observation session.
export function startLive({ onEvent, onChange }) {
  const startedAt = now();
  const peers = RELAYS.map(url => ({
    row: initialRow(url), socket: null, done: false, history: new Map(),
    deletionId: '', deletionSerial: 0, deletionCount: 0, deletionCaughtUp: false,
  }));
  const ids = new Set();
  const addresses = new Set();
  let stoppedAt = null;
  let deletionTimer, notifyTimer, sessionTimer;
  let lastDeletionRequest = 0;
  let targetCap = false;
  let addressFilterBytes = 0;

  function emit() {
    clearTimeout(notifyTimer);
    notifyTimer = null;
    const relays = peers.map(({ row }) => ({
      ...row, eose: [...row.eose], limitedKinds: [...row.limitedKinds], hints: { ...row.hints },
    }));
    onChange({
      startedAt, updatedAt: now(), stoppedAt, attempted: relays.length, limits: LIVE_LIMITS,
      responded: relays.filter(row => row.responded).length,
      failed: relays.filter(row => row.state === 'failed').length,
      limited: relays.filter(row => row.responded && row.limited).length, relays,
    });
  }

  function notify() {
    if (!notifyTimer) notifyTimer = setTimeout(emit, 120);
  }

  function closePeer(peer, state, reason) {
    if (peer.done) return;
    peer.done = true;
    peer.row.state = state;
    peer.row.reason = reason;
    if (state === 'limited') peer.row.limited = true;
    clearTimeout(peer.initialTimer);
    clearTimeout(peer.deletionDeadline);
    const socket = peer.socket;
    if (socket) {
      socket.onmessage = socket.onopen = socket.onclose = socket.onerror = null;
      socket.close();
    }
    if (peers.every(other => other.done)) {
      stoppedAt ??= now();
      clearTimeout(sessionTimer);
      clearTimeout(deletionTimer);
      globalThis.removeEventListener?.('pagehide', stop);
    }
    notify();
  }

  function send(peer, packet) {
    try {
      peer.socket.send(JSON.stringify(packet));
    } catch {
      closePeer(peer, 'failed', 'Could not send a relay request');
    }
  }

  function queryDeletions(peer) {
    if (peer.done || !peer.row.responded || !ids.size) return;
    if (peer.deletionId) send(peer, ['CLOSE', peer.deletionId]);
    if (peer.done) return;
    // Both filters are targeted. Keeping the subscription open also catches future deletion requests.
    peer.deletionId = 'deletions-' + (++peer.deletionSerial);
    peer.deletionCount = 0;
    peer.deletionCaughtUp = false;
    peer.row.deletions = targetCap ? 'Checking bounded publication targets' : 'Checking observed publications';
    const filters = [{ kinds: [5], '#e': [...ids], limit: LIVE_LIMITS.deletionFilterLimit }];
    if (addresses.size) filters.push({ kinds: [5], '#a': [...addresses], limit: LIVE_LIMITS.deletionFilterLimit });
    clearTimeout(peer.deletionDeadline);
    peer.deletionDeadline = setTimeout(() => {
      peer.row.limited = true;
      peer.row.deletions = 'Initial deletion query timed out';
      notify();
    }, LIVE_LIMITS.initialSeconds * 1000);
    send(peer, ['REQ', peer.deletionId, ...filters]);
  }

  function rememberPublication(event) {
    if (ids.has(event.id)) return;
    if (ids.size >= LIVE_LIMITS.deletionTargets) {
      targetCap = true;
      for (const peer of peers) {
        if (!peer.row.responded) continue;
        peer.row.limited = true;
        peer.row.deletions = 'Limited to first 500 publication IDs';
      }
      return;
    }
    ids.add(event.id);
    if (event.kind !== 5129) {
      const d = event.kind === 35129 ? event.tags.find(tag => tag[0] === 'd')?.[1] ?? '' : '';
      const address = event.kind + ':' + event.pubkey + ':' + d;
      if (!addresses.has(address)) {
        const bytes = encoder.encode(JSON.stringify(address)).length + 1;
        if (addressFilterBytes + bytes <= LIVE_LIMITS.addressFilterBytes) {
          addresses.add(address);
          addressFilterBytes += bytes;
        } else {
          targetCap = true;
          for (const peer of peers) if (peer.row.responded) peer.row.limited = true;
        }
      }
    }
    if (deletionTimer) return;
    // Coalesce initial batches and pace subscription updates for newly discovered live publications.
    const delay = Math.max(800, lastDeletionRequest + 12000 - Date.now());
    deletionTimer = setTimeout(() => {
      deletionTimer = null;
      lastDeletionRequest = Date.now();
      for (const peer of peers) queryDeletions(peer);
      notify();
    }, delay);
  }

  function skipOversized(row) {
    row.limited = true;
    row.skippedOversized++;
    row.reason = 'Oversized records skipped: ' + row.skippedOversized;
    notify();
  }

  function receive(peer, data) {
    const row = peer.row;
    if (typeof data !== 'string') return closePeer(peer, 'failed', 'Unexpected binary frame');
    row.frames++;
    if (row.frames > LIVE_LIMITS.perRelayFrames) {
      return closePeer(peer, 'limited', 'Session frame count limit reached');
    }
    // Avoid encoding an unbounded string. Its UTF-16 length is a lower bound on UTF-8 bytes.
    if (data.length > LIVE_LIMITS.perRelayBytes - row.bytes) {
      return closePeer(peer, 'limited', 'Session byte limit reached');
    }
    const size = encoder.encode(data).length;
    row.bytes += size;
    if (row.bytes > LIVE_LIMITS.perRelayBytes) {
      return closePeer(peer, 'limited', 'Session byte limit reached');
    }
    if (size > LIVE_LIMITS.frameBytes) return skipOversized(row);
    let message;
    try { message = JSON.parse(data); } catch { return closePeer(peer, 'failed', 'Invalid relay JSON'); }
    if (!Array.isArray(message)) return;
    const [type, id, payload] = message;
    const kind = kinds.find(k => id === 'pub-' + k);
    const deletion = Boolean(peer.deletionId && id === peer.deletionId);
    if (!kind && !deletion) return;

    if (type === 'CLOSED') {
      if (!deletion) return closePeer(peer, 'failed', 'Publication subscription refused or closed');
      clearTimeout(peer.deletionDeadline);
      row.deletions = 'Relay closed deletion query';
      row.limited = true;
    }

    if (type === 'EOSE') {
      const hints = ['finish', 'more', 'auth'].filter(h => Array.isArray(payload) && payload.includes(h));
      if (deletion) {
        peer.deletionCaughtUp = true;
        clearTimeout(peer.deletionDeadline);
        const capped = targetCap || hints.includes('more') || hints.includes('auth') ||
          (!hints.includes('finish') && peer.deletionCount >= LIVE_LIMITS.deletionFilterLimit);
        row.deletions = capped ? 'Listening · bounded deletion coverage' : 'Listening for targeted deletions';
        if (capped) row.limited = true;
      } else if (!row.eose.includes(kind)) {
        row.eose.push(kind);
        row.hints[kind] = hints;
        if (hints.includes('more') || hints.includes('auth') ||
            (!hints.includes('finish') && peer.history.get(kind) >= LIVE_LIMITS.perKind[kind])) {
          row.limited = true;
          row.limitedKinds.push(kind);
        }
        if (row.eose.length === kinds.length) {
          clearTimeout(peer.initialTimer);
          row.state = 'live';
        }
      }
    }

    if (type === 'EVENT' && payload && typeof payload === 'object') {
      if (deletion) {
        if (payload.kind !== 5 || !Array.isArray(payload.tags) ||
            !payload.tags.some(t => Array.isArray(t) && ((t[0] === 'e' && ids.has(t[1])) ||
                                                        (t[0] === 'a' && addresses.has(t[1]))))) return;
        if (!peer.deletionCaughtUp) peer.deletionCount++;
      } else {
        if (payload.kind !== kind) return;
        if (!row.eose.includes(kind)) {
          const count = (peer.history.get(kind) ?? 0) + 1;
          peer.history.set(kind, count);
          if (count > LIVE_LIMITS.perKind[kind]) {
            return closePeer(peer, 'limited', 'Relay exceeded requested history limit');
          }
        }
      }
      row.received++;
      const result = onEvent(payload, row.url, now());
      if (result === 'oversized') {
        skipOversized(row);
      } else if (result === 'limited') {
        for (const p of peers) closePeer(p, 'limited', 'Retained observation limit reached');
      } else if (!deletion && (result === 'accepted' || result === 'duplicate')) {
        rememberPublication(payload);
      }
    }
    notify();
  }

  function stop() {
    for (const peer of peers) closePeer(peer, 'paused', 'Paused');
    emit();
  }
  sessionTimer = setTimeout(() => {
    for (const peer of peers) closePeer(peer, 'limited', '30-minute observation window ended');
  }, LIVE_LIMITS.sessionMinutes * 60000);
  globalThis.addEventListener?.('pagehide', stop);
  for (const peer of peers) {
    try {
      const socket = new WebSocket(peer.row.url);
      peer.socket = socket;
      peer.initialTimer = setTimeout(() => closePeer(peer, 'failed', 'Initial relay query timed out'), LIVE_LIMITS.initialSeconds * 1000);
      socket.onopen = () => {
        peer.row.responded = true;
        peer.row.state = 'loading';
        for (const kind of kinds) send(peer, ['REQ', 'pub-' + kind, { kinds: [kind], limit: LIVE_LIMITS.perKind[kind] }]);
        if (ids.size && !deletionTimer) queryDeletions(peer);
        notify();
      };
      socket.onmessage = ({ data }) => receive(peer, data);
      socket.onerror = () => closePeer(peer, 'failed', 'WebSocket connection failed');
      socket.onclose = () => closePeer(peer, 'failed', 'Relay disconnected');
    } catch {
      closePeer(peer, 'failed', 'WebSocket unavailable');
    }
  }
  emit();
  return stop;
}
