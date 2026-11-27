const site = 'https://hypergolic.sh';
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]);

export function capabilityRows(snapshot) {
  return Object.entries(snapshot.capabilities).map(([name, counts]) => ({
    name, count: counts.requiredOnly + counts.optionalOnly + counts.both,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function editionLabel(snapshot) {
  const start = new Date(snapshot.weekStartUtc + 'T00:00:00Z');
  const end = new Date(Date.parse(snapshot.weekEndExclusiveUtc + 'T00:00:00Z') - 86400000);
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(start, end);
}

export function createPostPreview(snapshot) {
  const url = site + '/insights/' + snapshot.weekStartUtc + '/';
  const rows = capabilityRows(snapshot).slice(0, 4);
  const date = editionLabel(snapshot);
  const stats = [
    [snapshot.totals.observed, 'napplets observed'],
    [snapshot.totals.new ?? 'Baseline', snapshot.totals.new === null ? 'first weekly observation' : 'new napplets'],
  ];
  const coverage = snapshot.coverage.responded + '/' + snapshot.coverage.attempted + ' relays returned data'
    + (snapshot.coverage.status === 'partial' ? ' · partial coverage' : '');
  const title = 'Napplet Insights · ' + date;
  const alt = title + '. ' + snapshot.totals.observed + ' napplets observed. '
    + (snapshot.totals.new === null ? 'Baseline edition. ' : snapshot.totals.new + ' new napplets. ')
    + coverage + '. ' + rows.map(({ name, count }) => name + ': ' + count).join(', ');
  const image = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">
<title>${escape(alt)}</title>
<rect width="1200" height="630" fill="#090d13"/>
<g font-family="Arial,sans-serif" fill="#f8efe0">
<text x="64" y="72" font-size="25" fill="#ffb964">Hypergolic · ${escape(date)}</text>
<text x="64" y="148" font-size="62" font-weight="700">Napplet Insights</text>
${stats.map(([value, label], index) => `<text x="${64 + 530 * index}" y="278" font-size="104" font-weight="700" fill="#ffb964">${value}</text>
<text x="${68 + 530 * index}" y="318" font-size="27">${label}</text>`).join('')}
<text x="64" y="403" font-size="25">Capabilities declared</text>
${rows.map(({ name, count }, index) => {
  const x = 64 + index * 272;
  return `<rect x="${x}" y="426" width="256" height="97" fill="${['#ffb964','#ab6636','#554044','#263340'][index]}"/>
<text x="${x + 14}" y="464" font-size="23" fill="${index === 0 ? '#090d13' : '#fff7e8'}">${escape(name.slice(0, 21))}</text>
<text x="${x + 14}" y="504" font-size="32" font-weight="700" fill="${index === 0 ? '#090d13' : '#fff7e8'}">${count}</text>`;
}).join('')}
<text x="64" y="583" font-size="23" fill="#c5c7cd">${escape(coverage)}</text>
<text x="1136" y="583" text-anchor="end" font-size="23" fill="#ffb964">hypergolic.sh/insights</text>
</g></svg>\n`;

  return { image, alt, text: title + '\n\n' + url + '\n' };
}
