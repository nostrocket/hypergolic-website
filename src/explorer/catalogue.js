const repo = 'https://github.com/napplet/naps';
export const catalogueRevision = '377bf939c6c906817084b43dd21d424de646dbc2';
export const catalogueURL = `${repo}/blob/${catalogueRevision}/README.md`;
export const catalogueDate = '2026-11-13T10:19:59Z';
export const checkedOn = '2026-11-19';
export const schemaURL = 'https://github.com/dskvr/nips/blob/f60550c3409d6d81a875088ec83e660571e10504/5D.md#manifest';
const unlisted = 'Not listed in pinned catalogue';

// Each source is pinned independently: the root catalogue references several proposal branches.
// Names follow the individual specification headings. Catalogue and header statuses are separate.
const entries = new Map([
  ['shell', ['Optional Shell Environment and Readiness', catalogueRevision]],
  ['intent', ['Archetype Intent Dispatcher', catalogueRevision]],
  ['inc', ['Inter-Napplet Communication', catalogueRevision]],
  ['theme', ['Shell-Provided Theming', catalogueRevision]],
  ['relay', ['Relay Proxy', '9f30b3505335a52c574ff570576687d6467021ff']],
  ['identity', ['Read-Only User Identity Queries', catalogueRevision]],
  ['storage', ['Scoped Key-Value Storage', '4f4cf0ca7ecbd24c284a5d63bcd85e3de6af37ca']],
  ['keys', ['Keyboard Forwarding and Action Keybindings', '8869a4cf77b023f4b049f47c546910a0280dc1a6']],
  ['media', ['Media Session Control', '7806f438530251fce5129f8e6239d6b642278759']],
  ['notify', ['Shell-Rendered Notifications', '67877ef6c31ec8acee3125c1d8b4c781010e37dc']],
  ['resource', ['Sandboxed Resource Fetching', '8c0645d32ceb159bc3e8bcec1107a92862b7e86a']],
  ['config', ['Per-Napplet Declarative Configuration', 'bed9cb5b1e7c9b5babee8870aa18b12949af1d62']],
  ['upload', ['Media and Blob Upload', 'f5cc981e527e2cc1572793a7a6e5082e5271ac49']],
  ['value', ['Value Transfer', 'e468764d9f8a4f40107244cebed921bbebc0a0bf']],
  ['outbox', ['Outbox-Aware Relay Access', '8865f73d52a4864afee145f28d26520476273927']],
  ['cvm', ['ContextVM Bridge', '28cf1bdb5c6412bfbfcecb79a5a5121e18376f2f']],
  ['link', ['Shell-Mediated Link Opening', '100e5c939ae6b1ea82cc58587c6da45a1cf8a760']],
  ['pow', ['NIP-13 Proof-of-Work Miner', 'd85b4252f26fccd6c61bba18429ca9a6c0559210']],
  ['display', ['Runtime-Controlled Pixel Displays', '2c2e1b5ca3849dbab8c3a721704e30646a641079']],
  ['class', ['Napplet Class Authority', '4828279800dc1696452abd329a24ddb37e292bc5', 'Deferred']],
  ['connect', ['User-Gated Direct Network Access', 'ec81a3a4a1fc4da1ad2601215353b7f822e44b8f', 'Deferred']],
  ['mesh', ['Hop-Limited Circle Publish and Subscribe', 'bf9a4722244e29661c06d2fb4db7d3c7346d064a', unlisted]],
  ['neighbor', ['Neighborhoods and Addresses', '7b81774ae8d0ab5c8dc66778d5fe0aae3b4005c3', unlisted]],
]);

const context = {
  mesh: ['Retracted by its author on 13 November 2026. Neighbor is a distinct successor proposal.', `${repo}/pull/122#issuecomment-6829371653`],
  neighbor: ['Draft successor proposal to mesh. Its catalogue registration is a separate proposal.', `${repo}/pull/146`],
  resource: ['File at the merged proposal revision. The pinned catalogue tree lacks this file.', `${repo}/pull/13`],
};

export function lookup(domain) {
  const row = entries.get(domain);
  if (!row) return { name: domain, status: unlisted, spec: null, revision: null, header: null, context: '', contextURL: null };
  const [name, revision, status = 'Draft'] = row;
  const details = Object.hasOwn(context, domain) ? context[domain] : [];
  return { name, status, revision, header: 'draft', spec: `${repo}/blob/${revision}/naps/NAP-${domain.toUpperCase()}.md`,
    sourceType: revision === catalogueRevision ? 'Catalogue revision' : 'Proposal revision', context: details[0] ?? '', contextURL: details[1] ?? null };
}
