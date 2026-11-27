import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { verifyEvent } from 'nostr-tools/pure';
import { prototypeKind, publisherKey, seriesTag } from './snapshot.js';
import { createPostPreview } from './post.js';

export async function loadEditions() {
  const drafts = process.env.INSIGHTS_PREVIEW_DRAFTS === '1';
  const directory = resolve(process.env.INSIGHTS_DIRECTORY ?? (drafts ? '.insights-queue' : 'data/insights'));
  const names = await readdir(directory).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return [];
  });
  const editions = [];
  for (const name of names.filter(name => /^\d{4}-\d\d-\d\d\.json$/.test(name)).sort()) {
    const edition = JSON.parse(await readFile(join(directory, name), 'utf8'));
    const event = edition.event;
    if (event) {
      if (event.pubkey !== publisherKey || event.kind !== prototypeKind || !verifyEvent(event) ||
          !event.tags.some(([key, value]) => key === 't' && value === seriesTag)) {
        throw new Error('Invalid Exosquare snapshot event: ' + name);
      }
    } else if (!drafts) {
      continue;
    }
    const snapshot = JSON.parse((event ?? edition.unsigned).content);
    if (snapshot.schemaVersion !== 1 || name !== snapshot.weekStartUtc + '.json' ||
        snapshot.manifestSha256 !== createHash('sha256').update(JSON.stringify(edition.manifest)).digest('hex')) {
      throw new Error('Snapshot date, version, or manifest digest mismatch: ' + name);
    }
    const napplets = await Promise.all(edition.manifest.napplets.map(async record => {
      const { hash, mime } = record.icon ?? {};
      if (!/^[0-9a-f]{64}$/.test(hash) || !['image/png', 'image/jpeg', 'image/webp'].includes(mime)) return record;
      const bytes = await readFile(join(directory, 'icons', hash)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
        return null;
      });
      if (!bytes || bytes.length > 131072 || createHash('sha256').update(bytes).digest('hex') !== hash) return record;
      return { ...record, iconUrl: 'data:' + mime + ';base64,' + bytes.toString('base64') };
    }));
    const imagePath = '/assets/insights/' + snapshot.weekStartUtc + '.png';
    const hasImage = await access(resolve('public', '.' + imagePath)).then(() => true, error => {
      if (error.code !== 'ENOENT') throw error;
      return false;
    });
    editions.push({
      snapshot,
      manifest: { ...edition.manifest, napplets },
      draft: !event,
      event,
      shareImage: hasImage ? { path: imagePath, alt: createPostPreview(snapshot).alt } : undefined,
    });
  }
  return editions;
}
