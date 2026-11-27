import { createHash } from 'node:crypto';
import { aggregate } from '../explorer/model.js';
import { getEventHash, verifyEvent } from 'nostr-tools/pure';
import { decode } from 'nostr-tools/nip19';

export const publisher = 'npub1r6rs2v9s3lsw6ta6y6gst4f3ad903s208gwkmw4zs0nsd0cpe5ysmu8ac4';
export const publisherKey = decode(publisher).data;
export const prototypeKind = 7801;
export const seriesTag = 'hypergolic-napplet-insights';

const day = 86400000;

export function observationWeek(now = new Date()) {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = midnight - ((now.getUTCDay() + 6) % 7) * day;
  return {
    weekStartUtc: new Date(start).toISOString().slice(0, 10),
    weekEndExclusiveUtc: new Date(start + 7 * day).toISOString().slice(0, 10),
  };
}

export function createEdition({ store, coverage, observedAt, week, previous, kind }) {
  const records = store.snapshot(Date.parse(observedAt) / 1000);
  const heads = records.heads.filter(({ status }) => !['deleted', 'expired', 'schema-invalid'].includes(status));
  const comparable = heads.filter(({ status }) => status === 'eligible');
  const hasBaseline = previous.some(edition => edition.snapshot.coverage.status !== 'failed');
  const seen = new Set(previous.flatMap(edition => edition.manifest.napplets.map(record => record.coordinate)));

  const napplets = heads.map(record => {
    const icons = record.event.tags.filter(([tag]) => tag === 'icon');
    const [, hash, mime] = icons.length === 1 && icons[0].length === 3 ? icons[0] : [];
    const icon = /^[0-9a-f]{64}$/.test(hash) && ['image/png', 'image/jpeg', 'image/webp'].includes(mime)
      ? { hash, mime } : null;
    return {
      coordinate: record.key,
      eventId: record.event.id,
      title: record.title,
      status: record.status,
      description: record.schema === 'current' ? record.event.content : '',
      icon,
      firstSeen: hasBaseline && !seen.has(record.key),
    };
  }).sort((a, b) => a.title.localeCompare(b.title, 'en') || a.coordinate.localeCompare(b.coordinate, 'en'));
  const manifest = { weekStartUtc: week.weekStartUtc, napplets };
  const manifestJson = JSON.stringify(manifest);

  const relays = coverage.relays.map(relay => ({
    url: relay.url,
    status: !relay.eose.length ? 'failed'
      : relay.state === 'live' && !relay.limited && !records.limited && relay.deletions === 'Listening for targeted deletions'
        ? 'complete' : 'limited',
  }));
  const attempted = relays.length;
  const responded = relays.filter(relay => relay.status !== 'failed').length;
  const status = responded === 0 ? 'failed' : relays.every(relay => relay.status === 'complete') ? 'complete' : 'partial';
  if (status === 'failed') throw new Error('No relay returned a complete response for any publication kind. Existing drafts were preserved.');
  const snapshot = {
    schemaVersion: 1,
    methodVersion: 1,
    ...week,
    observedAt,
    coverage: { status, attempted, responded, relays },
    totals: {
      observed: napplets.length,
      new: hasBaseline ? napplets.filter(record => record.firstSeen).length : null,
      comparable: comparable.length,
      withNoDeclarations: comparable.filter(record => !record.required.length && !record.optional.length).length,
    },
    capabilities: Object.fromEntries(aggregate(heads).map(row => [
      row.domain, { requiredOnly: row.required - row.both, optionalOnly: row.optionalOnly, both: row.both },
    ])),
    manifestSha256: createHash('sha256').update(manifestJson).digest('hex'),
    supersedes: null,
  };

  return {
    publisher,
    snapshot,
    manifest,
    unsigned: {
      kind,
      created_at: Math.floor(Date.parse(observedAt) / 1000),
      tags: [['t', seriesTag]],
      content: JSON.stringify(snapshot),
    },
  };
}

export function verifyApproval(event, unsigned, expectedPubkey) {
  return event.pubkey === expectedPubkey &&
    event.id === getEventHash({ ...unsigned, pubkey: expectedPubkey }) &&
    verifyEvent(structuredClone(event));
}
