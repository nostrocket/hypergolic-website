import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, link, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { generateSecretKey, getPublicKey, nip19, SimplePool } from 'nostr-tools';
import { BunkerSigner, createNostrConnectURI } from 'nostr-tools/nip46';
import { createStore } from '../src/explorer/model.js';
import { LIVE_LIMITS, RELAYS, startLive } from '../src/explorer/live.js';
import { createEdition, observationWeek, prototypeKind, publisherKey, verifyApproval } from '../src/insights/snapshot.js';
import { createPostPreview, shareImagePath } from '../src/insights/post.js';
import { probeSnapshotRelays, publishSnapshot } from '../src/insights/relay-publication.js';

const { positionals: [command, editionDate], values } = parseArgs({
  allowPositionals: true,
  options: {
    queue: { type: 'string', default: '.insights-queue' },
    relay: { type: 'string' },
    chrome: { type: 'string' },
    'test-npub': { type: 'string' },
  },
});
const queue = resolve(values.queue);

async function within(task, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out waiting for Amber. Open the signer and try again.')), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function collect() {
  const store = createStore();
  return new Promise(resolve => {
    let stop, last, done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      const coverage = last;
      stop();
      resolve({ store, coverage, observedAt: new Date().toISOString() });
    };
    const deadline = setTimeout(finish, 2 * LIVE_LIMITS.initialSeconds * 1000 + 2000);
    stop = startLive({
      onEvent: (event, relay, observedAt) => store.ingest(event, relay, observedAt),
      onChange(coverage) {
        last = coverage;
        if (coverage.relays.every(relay => ['failed', 'limited'].includes(relay.state)
          || (relay.state === 'live' && (relay.deletions.startsWith('Listening') || relay.limited)))) {
          queueMicrotask(finish);
        }
      },
    });
  });
}

async function queueEdition() {
  await mkdir(queue, { recursive: true, mode: 0o700 });
  const week = observationWeek();
  const filenames = (await readdir(queue)).filter(name => /^\d{4}-\d\d-\d\d\.json$/.test(name)).sort();
  const file = join(queue, week.weekStartUtc + '.json');
  if (filenames.includes(week.weekStartUtc + '.json')) {
    await writePost(file, JSON.parse(await readFile(file, 'utf8')));
    console.log('Existing draft:', file);
    return;
  }
  const previous = await Promise.all(filenames.filter(name => name < week.weekStartUtc).map(async name => (
    JSON.parse(await readFile(join(queue, name), 'utf8'))
  )));
  let edition = createEdition({ ...await collect(), week, previous, kind: prototypeKind });
  const scratch = await mkdtemp(join(queue, 'write-'));
  try {
    const candidate = join(scratch, 'edition.json');
    await writeFile(candidate, JSON.stringify(edition, null, 2) + '\n', { mode: 0o600 });
    await link(candidate, file);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    edition = JSON.parse(await readFile(file, 'utf8'));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  await writePost(file, edition);
  console.log('Unsigned draft:', file);
  console.log(JSON.stringify({ ...edition.snapshot.totals, coverage: edition.snapshot.coverage }, null, 2));
}

async function writePost(file, edition) {
  const backdrop = await readFile(new URL('../public/assets/launch-wide-1600.webp', import.meta.url));
  const { image, alt, text } = createPostPreview(edition.snapshot, backdrop);
  await Promise.all([
    writeFile(file.replace(/\.json$/, '.svg'), image),
    writeFile(file.replace(/\.json$/, '.txt'), text),
    writeFile(file.replace(/\.json$/, '.alt.txt'), alt + '\n'),
  ]);
}

function editionFile(suffix = '') {
  if (!/^\d{4}-\d\d-\d\d$/.test(editionDate ?? '')) throw new Error('Specify an edition date as YYYY-MM-DD.');
  return join(queue, editionDate + suffix + '.json');
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function writeJson(file, value, flag = 'w') {
  await writeFile(file, JSON.stringify(value, null, 2) + '\n', { flag, mode: 0o600 });
}

async function checkPublicationRelays() {
  const draft = await loadJson(editionFile());
  const bytes = Buffer.byteLength(draft.unsigned.content);
  const results = await probeSnapshotRelays(RELAYS, prototypeKind, bytes);
  await writeJson(editionFile('.relay-check'), { kind: prototypeKind, bytes, checkedAt: new Date().toISOString(), results });
  console.log(JSON.stringify(results, null, 2));
  if (!results.some(row => row.write.status === 'accepted' && row.read?.status === 'verified')) {
    throw new Error('No candidate relay accepted the probe and served it back.');
  }
}

async function queueRelease() {
  const draft = await loadJson(editionFile());
  const check = await loadJson(editionFile('.relay-check')).catch(error => {
    if (error.code === 'ENOENT') throw new Error('Run the relay write and read-back check before queuing publication.');
    throw error;
  });
  const checkedAt = Date.parse(check.checkedAt);
  if (draft.unsigned.kind !== prototypeKind || check.kind !== prototypeKind ||
      check.bytes < Buffer.byteLength(draft.unsigned.content) ||
      !Number.isFinite(checkedAt) || Math.abs(Date.now() - checkedAt) >= 86400000) {
    throw new Error('Run a fresh relay check for this draft and kind before queuing publication.');
  }
  const relays = check.results.filter(row =>
    RELAYS.includes(row.url) && row.write.status === 'accepted' && row.read?.status === 'verified').map(row => row.url);
  if (!relays.length) throw new Error('No verified publishing relays.');
  await writeJson(editionFile('.release'), { ...draft, expectedPubkey: publisherKey, relays, relayCheck: check.checkedAt }, 'wx');
  console.log('Queued for Exosquare approval:', editionFile('.release'));
  console.log('Verified publishing relays:', relays.join(', '));
}

async function publishRelease() {
  const release = await loadJson(editionFile('.release'));
  const { event } = await loadJson(editionFile('.approved'));
  if (!verifyApproval(event, release.unsigned, publisherKey)) {
    throw new Error('The approved event does not match the queued Exosquare release.');
  }
  if (!release.relays.length || release.relays.some(url => !RELAYS.includes(url))) {
    throw new Error('The release has invalid publication destinations.');
  }
  const results = await publishSnapshot(release.relays, event);
  await writeJson(editionFile('.publication'), { id: event.id, results, checkedAt: new Date().toISOString() });
  console.log(JSON.stringify(results, null, 2));
  if (results.some(row => row.read.status !== 'verified')) {
    throw new Error('Some relays could not serve the snapshot. See the publication receipt before retrying.');
  }
  console.log('Verified the Exosquare snapshot on every queued publishing relay.');
}

async function queuePost() {
  const approved = await loadJson(editionFile('.approved'));
  const release = await loadJson(editionFile('.release'));
  const receipt = await loadJson(editionFile('.publication'));
  if (!verifyApproval(approved.event, release.unsigned, publisherKey) ||
      receipt.id !== approved.event.id || !receipt.results.some(row => row.read.status === 'verified')) {
    throw new Error('The official edition must be signed and verified on a relay before queuing the post.');
  }

  const base = 'https://hypergolic.sh';
  const editionUrl = base + '/insights/' + editionDate + '/';
  const imagePath = shareImagePath(editionDate);
  const imageUrl = base + imagePath;
  const getLive = async url => {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('The edition or its asset is not live at ' + url);
    return response;
  };

  const [page, event, png, localImage, draft] = await Promise.all([
    getLive(editionUrl).then(response => response.text()),
    getLive(editionUrl + 'snapshot.json').then(response => response.json()),
    getLive(imageUrl).then(async response => {
      if (response.headers.get('content-type')?.split(';')[0] !== 'image/png') throw new Error('Expected a live PNG share card.');
      return Buffer.from(await response.arrayBuffer());
    }),
    readFile(resolve('public', '.' + imagePath)),
    readFile(join(queue, editionDate + '.nostr-post.txt'), 'utf8'),
  ]);
  if (event.id !== approved.event.id || !verifyApproval(event, release.unsigned, publisherKey) ||
      !page.includes('content="' + imageUrl + '"') || !png.equals(localImage)) {
    throw new Error('The live edition, signed snapshot, and share card did not match the prepared release.');
  }
  if (!draft.trim().endsWith(editionUrl)) throw new Error('The prepared post must end with its dated edition URL.');
  const { alt } = createPostPreview(JSON.parse(event.content));
  const unsigned = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    content: draft.trim() + '\n\n' + imageUrl,
    tags: [
      ['imeta', 'url ' + imageUrl, 'm image/png', 'dim ' + png.readUInt32BE(16) + 'x' + png.readUInt32BE(20),
        'alt ' + alt, 'x ' + createHash('sha256').update(png).digest('hex')],
    ],
  };
  await writeJson(editionFile('.post-queued'), { expectedPubkey: publisherKey, unsigned }, 'wx');
  console.log('Queued Exosquare Nostr post:', editionFile('.post-queued'));
  console.log(unsigned.content);
}

async function signEdition({ production = false, social = false } = {}) {
  if (!values.relay || new URL(values.relay).protocol !== 'wss:') throw new Error('Specify a secure signing relay.');
  const expected = values['test-npub'];
  const fingerprint = expected?.match(/^(npub1[023456789acdefghjklmnpqrstuvwxyz]{3,}):([023456789acdefghjklmnpqrstuvwxyz]{8,})$/);
  const account = production || fingerprint ? null : nip19.decode(expected ?? '');
  if (!production && account && (account.type !== 'npub' || account.data === publisherKey)) {
    throw new Error('Use a throwaway npub for test-sign.');
  }
  const edition = await loadJson(editionFile(social ? '.post-queued' : production ? '.release' : ''));
  if (production && (edition.expectedPubkey !== publisherKey || edition.unsigned.kind !== (social ? 1 : prototypeKind))) {
    throw new Error('The queued release does not match the configured official publisher and kind.');
  }
  const unsigned = edition.unsigned;
  const label = social ? 'Nostr post' : 'snapshot';
  const key = generateSecretKey();
  const uri = createNostrConnectURI({
    clientPubkey: getPublicKey(key), relays: [values.relay],
    secret: randomBytes(16).toString('hex'),
    name: social ? 'Exosquare Insights post' : production ? 'Exosquare Napplet Insights' : 'Napplet Insights throwaway test',
  });
  const pairingDirectory = await mkdtemp(join(queue, 'pairing-'));
  const qr = join(pairingDirectory, 'amber.png');
  const pool = new SimplePool();
  let signer;
  try {
    if (process.platform === 'darwin') {
      const swift = fileURLToPath(new URL('./insights-qr.swift', import.meta.url));
      const cache = join(queue, 'swift-cache');
      await mkdir(cache, { recursive: true });
      const rendered = spawnSync('swift', ['-module-cache-path', cache, swift, qr], { input: uri + '\n', encoding: 'utf8' });
      if (rendered.status !== 0) throw new Error('Unable to render the Amber pairing QR with Swift.');
      console.log('Scan the private Amber pairing QR:', qr);
    } else {
      console.log('Open this one-time connection in Amber:\n' + uri);
    }
    const pairingTimeout = AbortSignal.timeout(180000);
    try {
      signer = await BunkerSigner.fromURI(key, uri, { pool }, pairingTimeout);
    } catch (error) {
      if (pairingTimeout.aborted) throw new Error('Amber pairing expired before approval.');
      throw error;
    }
    const signerKey = await within(signer.getPublicKey(), 15000);
    const signerNpub = nip19.npubEncode(signerKey);
    const matchesTest = !production && signerKey !== publisherKey && (fingerprint
      ? signerNpub.startsWith(fingerprint[1]) && signerNpub.endsWith(fingerprint[2])
      : signerKey === account.data);
    if (production ? signerKey !== publisherKey : !matchesTest) throw new Error('Amber selected a different account.');
    console.log((production ? 'Official Exosquare' : 'Throwaway') + ' account matched. Review and approve the ' + label + ' in Amber.');
    const signed = await within(signer.signEvent(unsigned), 180000);
    if (!verifyApproval(signed, unsigned, signerKey)) throw new Error('Signer response did not match the queued ' + label + '.');
    if (social) {
      await writeJson(editionFile('.post-approved'), { event: signed }, 'wx');
      console.log('Exosquare signature verified. The signed Nostr post was saved locally.');
    } else if (production) {
      await writeJson(editionFile('.approved'), { event: signed, manifest: edition.manifest }, 'wx');
      console.log('Exosquare signature verified. The official snapshot is ready for relay publication.');
    } else {
      await writeJson(editionFile('.test-signed'), signed);
      console.log('Throwaway signature verified and saved locally.');
    }
  } finally {
    await signer?.close();
    pool.destroy();
    await rm(pairingDirectory, { recursive: true, force: true });
  }
  // Some relay clients can retain reconnect timers after their sockets close.
  await new Promise(resolve => process.stdout.write('', resolve));
  process.exit(0);
}

async function renderPost() {
  if (!/^\d{4}-\d\d-\d\d$/.test(editionDate ?? '')) throw new Error('Usage: insights.mjs render-post YYYY-MM-DD [--chrome /path/to/chrome]');
  const input = join(queue, editionDate + '.svg');
  await readFile(input);
  const output = join(queue, editionDate + '.png');
  const profile = await mkdtemp(join(queue, 'render-'));
  const chrome = values.chrome ?? (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'chromium');
  try {
    const result = spawnSync(chrome, [
      '--headless', '--disable-gpu', '--disable-background-networking', '--no-first-run',
      '--hide-scrollbars', '--window-size=1200,630', '--user-data-dir=' + profile,
      '--screenshot=' + output, pathToFileURL(input).href,
    ], { encoding: 'utf8', timeout: 30000 });
    if (result.error || result.status !== 0) throw new Error('Share image render failed: ' + (result.error?.message ?? result.stderr));
    const image = await readFile(output);
    if (image.readUInt32BE(16) !== 1200 || image.readUInt32BE(20) !== 630) throw new Error('Expected a 1200×630 share image.');
    console.log(output);
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

try {
  if (command === 'collect') await queueEdition();
  else if (command === 'test-sign') await signEdition();
  else if (command === 'probe-relays') await checkPublicationRelays();
  else if (command === 'queue-release') await queueRelease();
  else if (command === 'approve') await signEdition({ production: true });
  else if (command === 'queue-post') await queuePost();
  else if (command === 'approve-post') await signEdition({ production: true, social: true });
  else if (command === 'publish') await publishRelease();
  else if (command === 'render-post') await renderPost();
  else throw new Error('Commands: collect, render-post, test-sign, probe-relays, queue-release, approve, publish, queue-post, approve-post');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
