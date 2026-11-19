import { verifyEvent } from 'nostr-tools/pure';

export const LIMITS = Object.freeze({ events: 1200, bytes: 8 * 1024 * 1024, eventBytes: 65536, tags: 256 });
const allowedKinds = new Set([5, 5129, 15129, 35129]);
const hex64 = /^[a-f0-9]{64}$/;
const hex128 = /^[a-f0-9]{128}$/;
const bareDomain = /^[a-z][a-z0-9-]*$/;
const encode = new TextEncoder();
const unixTime = n => Number.isSafeInteger(n) && n >= 0;
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const tagsOf = (event, name) => event.tags.filter(tag => tag[0] === name);

function inspectEvent(input) {
  if (!input || !allowedKinds.has(input.kind) || !unixTime(input.created_at) ||
      typeof input.id !== 'string' || !hex64.test(input.id) ||
      typeof input.pubkey !== 'string' || !hex64.test(input.pubkey) ||
      typeof input.sig !== 'string' || !hex128.test(input.sig) ||
      typeof input.content !== 'string' || !Array.isArray(input.tags)) return 'rejected';
  if (input.tags.length > LIMITS.tags || input.content.length > LIMITS.eventBytes) return 'oversized';
  let chars = input.content.length;
  for (const tag of input.tags) {
    if (!Array.isArray(tag)) return 'rejected';
    if (tag.length > 128) return 'oversized';
    for (const value of tag) {
      if (typeof value !== 'string') return 'rejected';
      chars += value.length;
      if (chars > LIMITS.eventBytes) return 'oversized';
    }
  }
  // Project only signed fields and detach tags from the caller and any verification cache.
  const { id, pubkey, sig, kind, created_at, content } = input;
  const event = { id, pubkey, sig, kind, created_at, content, tags: input.tags.map(t => [...t]) };
  const bytes = encode.encode(JSON.stringify(event)).length;
  if (bytes > LIMITS.eventBytes) return 'oversized';
  if (!verifyEvent(event)) return 'rejected';
  for (const tag of event.tags) Object.freeze(tag);
  Object.freeze(event.tags);
  return { event: Object.freeze(event), bytes };
}

function coordinate(event) {
  if (event.kind === 15129) return `15129:${event.pubkey}:`;
  if (event.kind === 35129) {
    const d = event.tags.find(tag => tag[0] === 'd')?.[1];
    if (d !== undefined) return `35129:${event.pubkey}:${d}`;
  }
  // Snapshots and signed but unaddressable named manifests remain individually inspectable.
  return event.id;
}

function classify(event) {
  const labels = new Set(event.tags.map(tag => tag[0]));
  const ids = tagsOf(event, 'd');
  const hashes = tagsOf(event, 'x');
  const paths = tagsOf(event, 'path');
  const hasLegacy = ['path', 'requires', 'archetype', 'description'].some(tag => labels.has(tag));
  const currentHash = hashes.length === 1 && hashes[0].length === 2 && hex64.test(hashes[0][1]);
  const hasCurrent = ['R', 'O', 'z'].some(tag => labels.has(tag)) || currentHash;
  const idValid = event.kind === 35129 ? ids.length === 1 && ids[0].length === 2 : ids.length === 0;
  if (!idValid) return ['schema-invalid', 'Expected one d tag on a named manifest and none on a root or snapshot.'];
  if (hasLegacy && hasCurrent) return ['mixed', 'Contains both legacy and current manifest fields.'];
  if (hasLegacy) {
    const legacyPath = paths.length === 1 && paths[0].length === 3 && paths[0][1] === '/index.html' && hex64.test(paths[0][2]);
    const aggregate = hashes.length === 0 || (hashes.length === 1 && hashes[0].length === 3 &&
      hex64.test(hashes[0][1]) && hashes[0][2] === 'aggregate');
    if (legacyPath && aggregate) return ['legacy', 'Recognised single-file path manifest. Legacy requires tags are shown as evidence.'];
    return ['unknown', 'Legacy fields are present without a recognised single-file path manifest.'];
  }
  if (!hasCurrent && !hashes.length) return ['unknown', 'No current artifact or capability marker identifies the schema.'];
  if (!currentHash || !event.content.trim()) return ['schema-invalid', 'A current manifest requires one lowercase artifact hash and a nonempty description.'];
  if (event.kind !== 5129 && (labels.has('a') || labels.has('A'))) return ['schema-invalid', 'Only a snapshot can carry parent or root lineage.'];
  if (event.tags.some(tag => (tag[0] === 'R' || tag[0] === 'O') && (tag.length !== 2 || !bareDomain.test(tag[1])))) {
    return ['schema-invalid', 'Every R or O tag must name one bare domain.'];
  }
  return ['current', 'Signed current-schema manifest.'];
}

function expiration(event) {
  const times = tagsOf(event, 'expiration').filter(t => t.length === 2 && /^\d+$/.test(t[1])).map(t => Number(t[1])).filter(unixTime);
  return times.length ? Math.min(...times) : null;
}

function materialize(entry, deleted, now) {
  const { event, observedAt, schema, reason: schemaReason } = entry;
  const expiresAt = expiration(event);
  let status = schema, reason = schemaReason;
  if (deleted) { status = 'deleted'; reason = 'An author-signed deletion request covers this version.'; }
  else if (expiresAt !== null && expiresAt <= now) { status = 'expired'; reason = 'This version has reached its signed expiration time.'; }
  else if (schema === 'current') status = event.kind === 5129 ? 'snapshot' : 'eligible';
  const values = name => [...new Set(tagsOf(event, name).map(tag => tag[1]).filter(v => typeof v === 'string'))].sort(compareText);
  const title = event.tags.find(t => t[0] === 'title' && t[1]?.trim())?.[1] ||
    event.tags.find(t => t[0] === 'd' && t[1])?.[1] || `${event.kind === 5129 ? 'Snapshot' : 'Publication'} ${event.id.slice(0, 10)}`;
  return { key: coordinate(event), event, status, schema, title, reason, observedAt, expiresAt,
    relays: [...entry.relays].sort(compareText), required: schema === 'current' ? values('R') : [],
    optional: schema === 'current' ? values('O') : [], legacyRequires: values('requires'),
    artifactHash: schema === 'current' ? tagsOf(event, 'x')[0][1] : null };
}

export function createStore() {
  const events = new Map();
  let retainedBytes = 0, rejected = 0, limited = false;

  function ingest(input, relay, observedAt = Math.floor(Date.now() / 1000)) {
    const checked = inspectEvent(input);
    if (checked === 'rejected' || !unixTime(observedAt) || typeof relay !== 'string' || relay.length > 255) {
      rejected++;
      return 'rejected';
    }
    if (checked === 'oversized') { limited = true; return 'oversized'; }
    const { event, bytes } = checked;
    const stored = events.get(event.id);
    if (stored) {
      stored.relays.add(relay);
      stored.observedAt = Math.min(stored.observedAt, observedAt);
      return 'duplicate';
    }
    if (events.size >= LIMITS.events || retainedBytes + bytes > LIMITS.bytes) { limited = true; return 'limited'; }
    const [schema, reason] = event.kind === 5 ? ['deletion', ''] : classify(event);
    events.set(event.id, { event, schema, reason, observedAt, relays: new Set([relay]) });
    retainedBytes += bytes;
    return 'accepted';
  }

  function snapshot(now = Math.floor(Date.now() / 1000)) {
    const current = new Map(), versions = [], byId = new Set(), byAddress = new Map();
    for (const entry of events.values()) {
      const { event } = entry;
      if (event.created_at > now) continue;
      if (event.kind === 5) {
        for (const [tag, target] of event.tags) {
          if (tag === 'e') byId.add(`${event.pubkey}:${target}`);
          if (tag === 'a' && target?.split(':', 2)[1] === event.pubkey) {
            byAddress.set(target, Math.max(byAddress.get(target) ?? -1, event.created_at));
          }
        }
      } else if (event.kind === 5129) versions.push(entry);
      else {
        const key = coordinate(event), prev = current.get(key)?.event;
        if (!prev || event.created_at > prev.created_at || (event.created_at === prev.created_at && event.id < prev.id)) current.set(key, entry);
      }
    }
    const records = entries => Array.from(entries, entry => {
      const e = entry.event;
      const deleted = byId.has(`${e.pubkey}:${e.id}`) || e.created_at <= (byAddress.get(coordinate(e)) ?? -1);
      return materialize(entry, deleted, now);
    }).sort((a,b) => b.event.created_at - a.event.created_at || compareText(a.event.id, b.event.id));
    return { heads: records(current.values()), snapshots: records(versions), rejected, limited, totalEvents: events.size };
  }
  return { ingest, snapshot };
}

export function aggregate(records) {
  const domains = new Map();
  for (const record of records) {
    if (record.status !== 'eligible') continue;
    const required = new Set(record.required), optional = new Set(record.optional);
    for (const domain of new Set([...required, ...optional])) {
      const row = domains.get(domain) ?? { domain, required: 0, optionalOnly: 0, both: 0, union: 0 };
      if (required.has(domain)) row.required++;
      else row.optionalOnly++;
      if (required.has(domain) && optional.has(domain)) row.both++;
      row.union++;
      domains.set(domain, row);
    }
  }
  return [...domains.values()].sort((a, b) => b.required - a.required || compareText(a.domain, b.domain));
}
