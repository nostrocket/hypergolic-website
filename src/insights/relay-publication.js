import { randomBytes } from 'node:crypto';
import { finalizeEvent, generateSecretKey, verifyEvent } from 'nostr-tools/pure';

function exchange(url, packet, onFrame) {
  return new Promise(resolve => {
    const socket = new WebSocket(url);
    let complete = false;
    const timer = setTimeout(() => finish({ status: 'timeout' }), 8000);

    function finish(result) {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      socket.close();
      resolve(result);
    }

    socket.onopen = () => socket.send(JSON.stringify(packet));
    socket.onerror = () => finish({ status: 'connection_error' });
    socket.onclose = () => finish({ status: 'connection_closed' });
    socket.onmessage = ({ data }) => {
      try {
        const result = onFrame(JSON.parse(data));
        if (result) finish(result);
      } catch {
        // Ignore malformed responses and wait for the relay's reply.
      }
    };
  });
}

export function submitEvent(url, event) {
  return exchange(url, ['EVENT', event], ([type, id, accepted, message]) => {
    if (type === 'OK' && id === event.id && typeof accepted === 'boolean') {
      return { status: accepted ? 'accepted' : 'rejected', message: String(message ?? '').slice(0, 200) };
    }
  });
}

export function readBackEvent(url, event) {
  return exchange(url, ['REQ', 'insights-readback', { ids: [event.id], limit: 1 }], ([type, id, value]) => {
    if (id !== 'insights-readback') return;
    if (type === 'EVENT' && value?.id === event.id && verifyEvent(value)) return { status: 'verified' };
    if (type === 'EOSE') return { status: 'missing' };
    if (type === 'CLOSED') return { status: 'closed', message: String(value ?? '').slice(0, 200) };
  });
}

export async function probeSnapshotRelays(relays, kind, contentBytes) {
  const key = generateSecretKey();
  const now = Math.floor(Date.now() / 1000);
  return Promise.all(relays.map(async url => {
    const event = finalizeEvent({
      kind,
      created_at: now,
      tags: [['t', 'napplet-insights-relay-probe'], ['expiration', String(now + 600)], ['nonce-id', randomBytes(8).toString('hex')]],
      content: JSON.stringify({ probe: true, description: 'Temporary Napplet Insights relay compatibility check.', padding: ' '.repeat(contentBytes) }),
    }, key);
    const write = await submitEvent(url, event);
    const read = write.status === 'accepted' ? await readBackEvent(url, event) : null;
    return { url, eventId: event.id, write, read };
  }));
}

export async function publishSnapshot(relays, event) {
  return Promise.all(relays.map(async url => {
    const existing = await readBackEvent(url, event);
    if (existing.status === 'verified') return { url, write: { status: 'already_present' }, read: existing };
    const write = await submitEvent(url, event);
    const read = await readBackEvent(url, event);
    return { url, write, read };
  }));
}
