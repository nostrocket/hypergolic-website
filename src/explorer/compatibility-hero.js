import { countCompatibility, referenceSample } from './compatibility.js';
import { LIVE_LIMITS, RELAYS, startLive } from './live.js';
import { createStore } from './model.js';

const publicationKinds = Object.keys(LIVE_LIMITS.perKind).length;
const observationDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'UTC', timeZoneName: 'short',
});

function readSample(key) {
  try {
    const sample = JSON.parse(localStorage.getItem(key));
    if (sample && Number.isSafeInteger(sample.total) && sample.total >= 0 &&
        Number.isSafeInteger(sample.matched) && sample.matched >= 0 && sample.matched <= sample.total &&
        Number.isInteger(sample.relays) && sample.relays >= 1 && sample.relays <= RELAYS.length &&
        Number.isInteger(sample.observedAt) && sample.observedAt >= referenceSample.observedAt &&
        sample.observedAt <= Date.now() / 1000) return sample;
  } catch { /* Storage can be disabled or contain an outdated observation. */ }
  return referenceSample;
}

export function mountCompatibilityHero(root) {
  const supported = new Set(root.dataset.supportedDomains.split(' ').filter(Boolean));
  const key = 'hypergolic:compatibility:v1:' + [...supported].sort().join(',');
  const percent = root.querySelector('[data-percent]');
  const sign = root.querySelector('[data-percent-sign]');
  const population = root.querySelector('[data-population]');
  const observation = root.querySelector('[data-observation]');
  let sample = readSample(key);
  let stopSession;

  function render(label) {
    const { matched, total, relays, observedAt } = sample;
    percent.textContent = total ? String(Math.round(100 * matched / total)) : '—';
    sign.hidden = !total;
    population.textContent = total
      ? matched + ' of ' + total + ' sampled napplets match on required capabilities.'
      : 'No comparable napplets in this relay sample.';
    observation.textContent = [label, relays + (relays === 1 ? ' relay' : ' relays'),
      observationDate.format(observedAt * 1000)].join(' · ');
  }

  function start() {
    stopSession?.();
    if (!navigator.onLine) {
      render('Offline · Last observation');
      return;
    }
    const store = createStore();
    let coverage;
    let firstObservation = true;
    let disposed = false;
    const timer = setInterval(refresh, 30_000);
    function refresh() {
      if (disposed || !coverage) return;
      if (coverage.stoppedAt !== null) clearInterval(timer);
      const rows = coverage.relays;
      const pending = rows.some(row => row.state === 'connecting' || row.state === 'loading');
      const completed = rows.filter(row => row.eose.length === publicationKinds);
      if (pending || !completed.length) {
        render(pending ? 'Checking relays · Last observation' : 'Relays unavailable · Last observation');
        return;
      }

      const live = rows.some(row => row.state === 'live');
      const now = Math.floor(Date.now() / 1000);
      const { matched, total } = countCompatibility(store.snapshot(now).heads, supported);
      // Include peers that supplied publications even if they missed the end-of-history marker.
      const relays = rows.filter(row => row.received > 0 || row.eose.length === publicationKinds).length;
      if (firstObservation || matched !== sample.matched || total !== sample.total || relays !== sample.relays) {
        firstObservation = false;
        sample = { matched, total, relays, observedAt: now };
        try { localStorage.setItem(key, JSON.stringify(sample)); } catch { /* Private browsing. */ }
      }
      render(live ? 'Live sample' : 'Last observation');
    }
    const stop = startLive({
      onEvent: store.ingest,
      onChange(value) { coverage = value; refresh(); },
    });
    stopSession = () => {
      stopSession = undefined;
      disposed = true;
      clearInterval(timer);
      stop();
    };
  }

  window.addEventListener('pagehide', () => stopSession?.());
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
  window.addEventListener('online', start);
  window.addEventListener('offline', () => {
    stopSession?.();
    render('Offline · Last observation');
  });
  start();
}
