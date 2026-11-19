import { createStore, aggregate, LIMITS } from './model.js';
import {
  lookup,
  catalogueURL,
  catalogueDate,
  checkedOn,
  schemaURL,
} from './catalogue.js';
import { startLive, LIVE_LIMITS } from './live.js';

const MODES = {
  required: 'Required',
  optionalOnly: 'Optional-only',
  union: 'Union',
};
const byId = (id) => document.getElementById(id);
const utc = (seconds) =>
  new Date(seconds * 1000).toISOString().replace('T', ' ').slice(0, 19) +
  ' UTC';
const now = () => Math.floor(Date.now() / 1000);
const percent = (count, total) => ((100 * count) / total).toFixed(1) + '%';

function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function link(text, href) {
  const el = element('a', text);
  el.href = href;
  return el;
}
function route(changes) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return url.pathname + url.search;
}
function facts(entries) {
  const dl = element('dl', undefined, 'facts');
  for (const [label, value] of entries) {
    dl.append(element('dt', label), element('dd', String(value)));
  }
  return dl;
}
function match(record, query) {
  return [
    record.title,
    record.key,
    record.event.pubkey,
    record.event.id,
    ...record.required,
    ...record.optional,
  ].some((item) => item.toLowerCase().includes(query));
}
function listPublications(records, query, page) {
  const box = element('div');
  const ordered = records
    .filter((r) => match(r, query))
    .sort(
      (a, b) =>
        b.event.created_at - a.event.created_at ||
        a.event.id.localeCompare(b.event.id),
    );
  const size = 30;
  const lastPage = Math.max(1, Math.ceil(ordered.length / size));
  const current = Math.min(page, lastPage);
  box.append(
    element(
      'p',
      ordered.length + ' matching publications · newest first',
      'result-note',
    ),
  );
  const ul = element('ul', undefined, 'record-list');
  for (const record of ordered.slice((current - 1) * size, current * size)) {
    const item = element('li');
    const title = record.title || record.key;
    item.append(
      link(title, route({ publication: record.key })),
      element('span', record.status),
      element(
        'small',
        'Kind ' +
          record.event.kind +
          ' · ' +
          utc(record.event.created_at) +
          ' · ' +
          record.event.pubkey.slice(0, 16) +
          '…',
      ),
    );
    ul.append(item);
  }
  box.append(ul);
  if (lastPage > 1)
    box.append(pagination(current, lastPage, 'Publication list pages'));
  return box;
}
function pagination(current, lastPage, label) {
  const pages = element('nav', undefined, 'explorer-nav');
  pages.setAttribute('aria-label', label);
  if (current > 1)
    pages.append(link('Previous', route({ page: String(current - 1) })));
  pages.append(element('span', 'Page ' + current + ' of ' + lastPage));
  if (current < lastPage)
    pages.append(link('Next', route({ page: String(current + 1) })));
  return pages;
}

function featureGrid(rows, denom, metric, query, page) {
  const grid = element('div', undefined, 'feature-grid');
  const result = rows
    .filter((r) => r.domain.toLowerCase().includes(query))
    .sort((a, b) => b[metric] - a[metric] || (a.domain < b.domain ? -1 : 1));
  const size = 48;
  const lastPage = Math.max(1, Math.ceil(result.length / size));
  const current = Math.min(page, lastPage);
  for (const row of result.slice((current - 1) * size, current * size)) {
    const count = row[metric];
    const share = denom ? count / denom : 0;
    const tile = link(
      '',
      route({ feature: row.domain, page: null, pubq: null }),
    );
    tile.className = 'heat';
    const color = [32, 42, 52].map((c, i) =>
      Math.round(c + ([255, 185, 100][i] - c) * share),
    );
    tile.style.setProperty('--surface', color.join(' '));
    const linear = color.map((v) => ((v / 255 + 0.055) / 1.055) ** 2.4);
    const luminance =
      0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    tile.style.setProperty('--ink', luminance > 0.179 ? '#000' : '#fff');
    tile.append(
      element('span', row.domain, 'domain'),
      element('strong', denom ? count + ' / ' + denom : '—'),
      element('small', denom ? percent(count, denom) : 'No sample'),
    );
    grid.append(tile);
  }
  const box = element('div');
  box.append(grid);
  if (lastPage > 1) box.append(pagination(current, lastPage, 'Feature pages'));
  return box;
}

function featureDetail(domain, eligible, metric, query, page) {
  const box = element('div');
  const info = lookup(domain);
  const r = eligible.filter((h) => h.required.includes(domain));
  const o = eligible.filter((h) => h.optional.includes(domain));
  const both = r.filter((h) => h.optional.includes(domain)).length;
  const union = r.length + o.length - both;
  const matching =
    metric === 'required'
      ? r
      : metric === 'optionalOnly'
        ? o.filter((h) => !h.required.includes(domain))
        : eligible.filter(
            (h) => h.required.includes(domain) || h.optional.includes(domain),
          );
  box.append(
    link(
      'All declared features',
      route({ feature: null, publication: null, pubq: null, page: null }),
    ),
    element('h2', domain),
    element('p', [info.name, info.status].filter(Boolean).join(' · ')),
  );
  const refs = element('p', undefined, 'subtle');
  refs.append(
    link('Catalogue · 377bf93', catalogueURL),
    ' · ' + catalogueDate.slice(0, 10) + ' · checked ' + checkedOn,
  );
  if (info.spec)
    refs.append(
      ' · ',
      link(
        info.sourceType +
          ' · ' +
          info.revision.slice(0, 7) +
          ' · header: ' +
          info.header,
        info.spec,
      ),
    );
  if (info.contextURL) refs.append(' · ', link(info.context, info.contextURL));
  if (!info.spec) refs.append(' · No pinned specification inspected.');
  if (!eligible.length) {
    box.append(
      refs,
      element(
        'p',
        'No comparable heads in the selected population. Counts are unavailable.',
      ),
    );
    return box;
  }
  box.append(
    refs,
    link(
      'Search the v0.2.0 support table for ' + domain,
      '/capabilities/?q=' + encodeURIComponent(domain),
    ),
    facts([
      ['Required only', r.length - both],
      ['Optional only', o.length - both],
      ['Both', both],
      ['Not declared', eligible.length - union],
    ]),
    element(
      'h3',
      MODES[metric] +
        ' · ' +
        matching.length +
        ' of ' +
        eligible.length +
        ' eligible heads',
    ),
    listPublications(matching, query, page),
  );
  return box;
}
function publicationDetail(record) {
  const box = element('div');
  box.append(link('Back to results', route({ publication: null })));
  if (!record) {
    box.append(
      element('h2', 'Publication outside this observation'),
      element(
        'p',
        'This session has not received that publication. Other relays or a different observation window can return different records.',
      ),
    );
    return box;
  }
  const { event } = record;
  box.append(
    element('h2', record.title || 'Publication evidence'),
    element('p', event.content),
    facts([
      ['Selection', record.status],
      ['Schema', record.schema],
      ['Reason', record.reason || record.status],
      ['Kind', event.kind],
      ['Publication identity', record.key],
      ['Publisher', event.pubkey],
      ['Event ID', event.id],
      ['Published', utc(event.created_at)],
      ['Observed', utc(record.observedAt)],
      ['Seen on', record.relays.join(', ')],
      ['Signature', 'Verified locally'],
      ['Declared artifact hash', record.artifactHash || 'Unavailable'],
      [
        'Declared expiry',
        record.expiresAt === null ? 'None' : String(record.expiresAt),
      ],
      ['Legacy requires', record.legacyRequires.join(', ') || '—'],
      [
        'Required',
        record.schema === 'current'
          ? record.required.join(', ') || 'None declared'
          : 'Not comparable',
      ],
      [
        'Optional',
        record.schema === 'current'
          ? record.optional.join(', ') || 'None declared'
          : 'Not comparable',
      ],
    ]),
  );
  const details = element('details');
  details.dataset.keep = 'raw-tags';
  details.append(
    element('summary', 'Signed tags (' + event.tags.length + ')'),
    element(
      'pre',
      event.tags.map((t, i) => i + '  ' + JSON.stringify(t)).join('\n'),
    ),
  );
  box.append(details);
  return box;
}

function coverageView(cov, snap) {
  const box = element('div');
  box.append(
    element('h2', 'Relay coverage'),
    element(
      'p',
      'Your browser reads from these public relays. End of stored events (EOSE) marks the end of a relay’s initial response. Event limits, relay retention and missing deletion requests can all affect what appears.',
    ),
  );
  if (!cov) return box;
  box.append(
    facts([
      ['Session started', utc(cov.startedAt)],
      ['Last session update', utc(cov.updatedAt)],
      ['Evaluation cutoff', utc(now())],
      [
        'Attempted / responded / failed',
        [cov.attempted, cov.responded, cov.failed].join(' / '),
      ],
      ['Limited responses', cov.limited + ' of ' + cov.responded],
      ['Verified events retained', snap.totalEvents],
      ['Rejected inputs', snap.rejected],
      [
        'Observation limits',
        snap.limited ? 'Some data omitted' : 'Within bounds',
      ],
    ]),
  );
  for (const r of cov.relays) {
    box.append(
      element('h3', r.url),
      facts([
        ['Connection', r.state + (r.reason ? ' · ' + r.reason : '')],
        ['Messages received', r.received],
        ['EOSE by kind', r.eose.join(', ') || 'Pending'],
        ['Saturated kinds', r.limitedKinds.join(', ') || 'None observed'],
        [
          'Relay hints',
          Object.entries(r.hints)
            .filter(([, h]) => h.length)
            .map(([k, h]) => k + ' ' + h.join(', '))
            .join(' · ') || 'None',
        ],
        ['Deletion coverage', r.deletions],
      ]),
    );
  }
  const details = element('details');
  details.dataset.keep = 'limits';
  details.append(
    element('summary', 'Read limits and source revisions'),
    element(
      'pre',
      JSON.stringify({ relay: LIVE_LIMITS, verification: LIMITS }, null, 2),
    ),
    link('Experimental NIP-5D · f60550c', schemaURL),
    ' · ',
    link('Feature catalogue · 377bf93', catalogueURL),
  );
  box.append(details);
  return box;
}

export function mountExplorer() {
  const explorer = byId('explorer');
  const tableDomains = explorer.dataset.domains.split(' ');
  explorer.hidden = false;
  const panel = byId('filter-panel');
  const narrow = matchMedia('(max-width: 600px)');
  const setPanel = () => {
    panel.open = !narrow.matches;
  };
  setPanel();
  narrow.addEventListener('change', setPanel);
  const results = byId('results');
  const query = byId('query');
  const metric = byId('metric');
  const kind = byId('kind');
  const status = byId('status');
  const action = byId('session-action');
  let store,
    coverage,
    stop,
    timer,
    stopped = false;
  function draw() {
    const p = new URLSearchParams(location.search);
    const view = ['features', 'publications', 'coverage'].includes(
      p.get('view'),
    )
      ? p.get('view')
      : 'features';
    const publication = p.get('publication');
    const feature = view === 'features' ? p.get('feature') : null;
    const queryKey = feature || view === 'publications' ? 'pubq' : 'q';
    const search = p.get(queryKey) || '';
    const countMode = Object.hasOwn(MODES, p.get('metric'))
      ? p.get('metric')
      : 'required';
    const kindOptions =
      view === 'publications' ? ['15129', '35129', '5129'] : ['15129', '35129'];
    const kindFilter = kindOptions.includes(p.get('kind'))
      ? Number(p.get('kind'))
      : 0;
    const page = Math.max(1, parseInt(p.get('page'), 10) || 1);
    const snapshot = store.snapshot(now());
    const eligible = snapshot.heads.filter(
      (h) =>
        h.status === 'eligible' && (!kindFilter || h.event.kind === kindFilter),
    );
    if (query.value !== search) query.value = search;
    query.dataset.key = queryKey;
    metric.value = countMode;
    kind.value = kindFilter ? String(kindFilter) : '';
    status.value = p.get('status') || 'all';
    if (!status.value) status.value = 'all';
    panel.hidden = view === 'coverage' || Boolean(publication);
    byId('metric-field').hidden = view !== 'features';
    byId('status-field').hidden = view !== 'publications';
    byId('snapshot-option').hidden = view !== 'publications';
    byId('search-label').textContent =
      queryKey === 'q' ? 'Search domains' : 'Search publications';
    for (const a of document.querySelectorAll('[data-view]')) {
      a.href = route({
        view: a.dataset.view,
        feature: null,
        publication: null,
        page: null,
      });
      if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    const live = coverage?.relays.some((r) => r.state === 'live');
    const active = coverage?.relays.some((r) =>
      ['loading', 'connecting', 'live'].includes(r.state),
    );
    const offline = coverage && !active;
    const stale = coverage && !live && now() - coverage.updatedAt >= 300;
    const stateLabel = stopped
      ? 'Session paused'
      : live
        ? 'Live relay observations'
        : offline
          ? 'Session ended'
          : 'Reading relays…';
    if (byId('live-state').textContent !== stateLabel)
      byId('live-state').textContent = stateLabel;
    byId('live-summary').textContent = [
      eligible.length +
        ' eligible heads' +
        (kindFilter ? ' in selected kind' : ''),
      snapshot.heads.length + ' observed identities',
      coverage
        ? coverage.responded + '/' + coverage.attempted + ' relays responded'
        : '',
      coverage?.limited ? coverage.limited + ' limited' : '',
      coverage?.failed ? coverage.failed + ' failed' : '',
      snapshot.limited ? 'Some data omitted' : '',
      coverage ? 'As of ' + utc(coverage.updatedAt) : '',
      stale ? 'Stale · over 5 minutes old' : '',
    ]
      .filter(Boolean)
      .join(' · ');
    action.disabled = false;
    action.textContent =
      stopped || offline ? 'Start a new session' : 'Pause live updates';
    const focus = results.contains(document.activeElement)
      ? document.activeElement.closest('a,summary')
      : null;
    const focusHref = focus?.getAttribute('href');
    const open = [...results.querySelectorAll('details[open]')].map(
      (d) => d.dataset.keep,
    );
    const fragment = document.createDocumentFragment();
    if (publication) {
      const records = [...snapshot.heads, ...snapshot.snapshots];
      fragment.append(
        publicationDetail(records.find((r) => r.key === publication)),
      );
    } else if (view === 'coverage')
      fragment.append(coverageView(coverage, snapshot));
    else if (feature)
      fragment.append(
        featureDetail(feature, eligible, countMode, search.toLowerCase(), page),
      );
    else if (view === 'publications') {
      const rows = kindFilter === 5129 ? snapshot.snapshots : snapshot.heads;
      fragment.append(
        element(
          'h2',
          kindFilter === 5129 ? 'Snapshot versions' : 'Observed publications',
        ),
        element(
          'p',
          snapshot.snapshots.length +
            ' observed snapshot versions are listed separately under Publication kind.',
          'result-note',
        ),
        listPublications(
          rows.filter(
            (r) =>
              (!kindFilter || r.event.kind === kindFilter) &&
              (status.value === 'all' || r.status === status.value),
          ),
          search.toLowerCase(),
          page,
        ),
      );
    } else {
      fragment.append(element('h2', MODES[countMode] + ' declarations'));
      const rows = aggregate(eligible);
      const observed = new Set(rows.map((row) => row.domain));
      const term = search.toLowerCase();
      const missing = tableDomains
        .filter((domain) => !observed.has(domain) && domain.includes(term))
        .map((domain) => ({ domain, required: 0, optionalOnly: 0, union: 0 }));
      const hasObserved = rows.some((row) => row.domain.includes(term));
      if (!eligible.length) {
        const message =
          offline && !coverage.responded
            ? 'No relay data available. Start a new session to retry.'
            : active && !coverage?.responded
              ? 'Waiting for verified publications…'
              : 'No comparable heads in the selected population. Open Publications to inspect observed records.';
        fragment.append(element('p', message, 'result-note'));
      }
      if (hasObserved) {
        const scale = element('p', undefined, 'scale');
        scale.append('Share of eligible heads · 0%', element('i'), '100%');
        fragment.append(
          scale,
          featureGrid(rows, eligible.length, countMode, term, page),
        );
      }
      if (missing.length) {
        fragment.append(
          element(
            'h3',
            eligible.length
              ? 'Table domains without observed declarations'
              : 'Capability table domains',
          ),
          element(
            'p',
            eligible.length
              ? 'None of the comparable heads in this sample declares these domains as required or optional.'
              : 'Each domain can be compared once this session has eligible publications.',
            'result-note',
          ),
          featureGrid(missing, eligible.length, countMode, term, 1),
        );
      } else if (!hasObserved)
        fragment.append(element('p', 'No domains match this search.'));
      fragment.append(
        element(
          'p',
          snapshot.heads.filter(
            (h) =>
              h.status !== 'eligible' &&
              (!kindFilter || h.event.kind === kindFilter),
          ).length + ' observed heads excluded from this population.',
          'result-note',
        ),
      );
    }
    results.replaceChildren(fragment);
    for (const d of results.querySelectorAll('details'))
      if (open.includes(d.dataset.keep)) d.open = true;
    if (focus) {
      const replacement = focusHref
        ? [...results.querySelectorAll('a')].find(
            (a) => a.getAttribute('href') === focusHref,
          )
        : results.querySelector('summary');
      replacement?.focus({ preventScroll: true });
    }
  }
  function queue() {
    if (!timer)
      timer = setTimeout(() => {
        timer = undefined;
        draw();
      }, 350);
  }
  function start() {
    stop?.();
    stopped = false;
    store = createStore();
    coverage = null;
    stop = startLive({
      onEvent: (event, relay, time) => {
        const result = store.ingest(event, relay, time);
        queue();
        return result;
      },
      onChange: (value) => {
        coverage = value;
        queue();
      },
    });
    draw();
  }
  function update(values, replace = false) {
    history[replace ? 'replaceState' : 'pushState'](null, '', route(values));
    draw();
  }
  byId('explorer').addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (
      !a ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      a.origin !== location.origin ||
      a.pathname !== location.pathname
    )
      return;
    e.preventDefault();
    history.pushState(null, '', a.href);
    draw();
    results.focus();
  });
  action.addEventListener('click', () => {
    if (action.textContent === 'Start a new session') start();
    else {
      stopped = true;
      stop?.();
      draw();
    }
  });
  query.addEventListener('input', () =>
    update({ [query.dataset.key]: query.value, page: null }, true),
  );
  for (const select of [metric, kind, status])
    select.addEventListener('change', () =>
      update({ [select.id]: select.value, page: null }),
    );
  window.addEventListener('popstate', draw);
  window.addEventListener('pagehide', () => {
    stopped = true;
    stop?.();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) draw();
  });
  setInterval(queue, 30000);
  start();
}
