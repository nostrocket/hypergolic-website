export const releaseSource = 'https://github.com/nostrocket/hypergolic/blob/v0.2.0';

export const support = {
  full: { label: 'Full support', symbol: '●' },
  partial: { label: 'Partial support', symbol: '◐' },
  none: { label: 'No support', symbol: '○' },
} as const;

export const tokenBands = {
  XXS: 'under 15k',
  XS: '15k–40k',
  S: '40k–100k',
  M: '100k–250k',
  L: '250k–500k',
  XL: '500k–900k',
  XXL: '900k–2M+',
} as const;

type Estimate = {
  size: keyof typeof tokenBands;
  scope?: string;
  tokens?: string;
};

type Capability = {
  domain: string;
  status: keyof typeof support;
  detail: string;
  remaining: string;
  estimates: Estimate[];
  references: { label: string; url: string }[];
};

export const capabilities: Capability[] = [
  {
    domain: 'storage', status: 'full',
    detail: 'All four storage operations (get, set, remove, keys) in both shared and per-instance storage.',
    remaining: 'All four draft operations are implemented in both storage scopes.',
    estimates: [],
    references: [
      { label: 'Release contract', url: `${releaseSource}/docs/capability-contract.md` },
      { label: 'Storage draft', url: 'https://github.com/napplet/naps/pull/3' },
    ],
  },
  {
    domain: 'common', status: 'partial',
    detail: 'NIP-19 helpers, profile and follow reads, and selected social writes with approval.',
    remaining: 'Verify all eight operation families on real relays, including follow-list replacement, custom emoji reactions and event reports.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release social operations', url: `${releaseSource}/docs/common-social.md` },
      { label: 'Common draft', url: 'https://github.com/napplet/naps/pull/67' },
    ],
  },
  {
    domain: 'config', status: 'partial',
    detail: 'Saved per-napplet settings using a supported subset of configuration schemas.',
    remaining: 'Compare supported keywords and x-napplet-* extensions with the draft’s Core Subset. Close confirmed gaps in rendering, validation, migration or update ordering.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release behavior', url: `${releaseSource}/docs/notifications-configuration.md` },
      { label: 'Config draft', url: 'https://github.com/napplet/naps/pull/14' },
    ],
  },
  {
    domain: 'cvm', status: 'partial',
    detail: 'Encrypted requests to known, free providers. Discovery, registry execution, and payments are unavailable.',
    remaining: 'Verify consent, replies, cancellation and cross-card use with a real free provider. The broader draft adds discovery, schema-hash tool selection and registry execution. Paid calls also need budgets, consent and settlement.',
    estimates: [{ size: 'S', scope: 'Free-provider profile' }, { size: 'XXL', tokens: '900k–2M', scope: 'Broader paid ecosystem' }],
    references: [
      { label: 'CVM profile', url: `${releaseSource}/docs/cvm.md` },
      { label: 'CVM draft', url: 'https://github.com/napplet/naps/pull/31' },
    ],
  },
  {
    domain: 'identity', status: 'partial',
    detail: 'Read-only public identity data.',
    remaining: 'Resolve the source and meaning of blocked-user reads, add zap-history reads and verify both against the selected account. The estimate covers read-only history.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release identity coverage', url: `${releaseSource}/docs/public-identity-data.md` },
    ],
  },
  {
    domain: 'inc', status: 'partial',
    detail: 'Messages and channels between active napplet sessions.',
    remaining: 'Verify sender identity, topic delivery, message order and channel closure between two published napplets. Background delivery depends on the chosen contract.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release routing', url: `${releaseSource}/docs/intent-inc.md` },
      { label: 'INC draft', url: 'https://github.com/napplet/naps/pull/104' },
    ],
  },
  {
    domain: 'intent', status: 'partial',
    detail: 'Dispatch to installed handlers. Discovery of uninstalled handlers is unavailable.',
    remaining: 'Complete manifest and handler resolution, including root-manifest references. Verify discovery, installation consent and delivery to a previously uninstalled handler.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release routing', url: `${releaseSource}/docs/intent-inc.md` },
      { label: 'Intent draft', url: 'https://github.com/napplet/naps/pull/91' },
    ],
  },
  {
    domain: 'keys', status: 'partial',
    detail: 'Hardware keyboard actions and shortcuts for the focused napplet.',
    remaining: 'Check keystroke forwarding, assigned bindings, binding-change notifications and action dispatch. Exercise physical keyboards on both platforms, including text entry and OS shortcuts.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release key policy', url: `${releaseSource}/docs/capability-contract.md` },
      { label: 'Keys draft', url: 'https://github.com/napplet/naps/pull/9' },
    ],
  },
  {
    domain: 'link', status: 'partial',
    detail: 'User-approved HTTPS links open through the device.',
    remaining: 'Verify URL handling, refusal and handoff results on each OS. Supporting further URL schemes is a separate policy decision.',
    estimates: [{ size: 'XS' }],
    references: [
      { label: 'Release link policy', url: `${releaseSource}/docs/external-links.md` },
      { label: 'Link draft', url: 'https://github.com/napplet/naps/pull/53' },
    ],
  },
  {
    domain: 'media', status: 'partial',
    detail: 'Foreground HTTPS MP4 playback and bounded MP3 radio.',
    remaining: 'Add napplet-owned playback sessions, queues and controls. Reconcile shell controls with pause, stop and failure on both native players.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Release playback profile', url: `${releaseSource}/docs/media-playback.md` },
      { label: 'Media draft', url: 'https://github.com/napplet/naps/pull/10' },
    ],
  },
  {
    domain: 'notify', status: 'partial',
    detail: 'Foreground notifications inside Hypergolic.',
    remaining: 'Verify channel permissions, badges, click, action and dismissal callbacks, and revocation in the existing notification centre.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release behavior', url: `${releaseSource}/docs/notifications-configuration.md` },
      { label: 'Notify draft', url: 'https://github.com/napplet/naps/pull/11' },
    ],
  },
  {
    domain: 'outbox', status: 'partial',
    detail: 'Relay resolution, event lookup, queries, subscriptions, and approved publication under the release’s routing limits.',
    remaining: 'Resolve the release’s option to redistribute a signed relay-list event alongside a publication. Its pinned draft permits one signed event. Verify routing with real relays on both platforms.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release routing and divergence', url: `${releaseSource}/docs/outbox-routing.md` },
    ],
  },
  {
    domain: 'relay', status: 'partial',
    detail: 'Queries, subscriptions, and approved publication. Encrypted publication is unavailable.',
    remaining: 'Implement publishEncrypted with recipient selection, approved signing methods, encryption, approval and failure handling. Verify the recipient can decrypt the published event.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Release contract', url: `${releaseSource}/docs/capability-contract.md` },
      { label: 'Relay draft', url: 'https://github.com/napplet/naps/pull/2' },
    ],
  },
  {
    domain: 'resource', status: 'partial',
    detail: 'Bounded HTTPS, Blossom, one-hop Nostr, and data: reads.',
    remaining: 'Reconcile wire formats and verify canonical base64, decoded-byte limits, bulk results, cancellation and Blob conversion. Hashtree support and SVG rendering add scope.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release resource profile', url: `${releaseSource}/docs/resource-access.md` },
      { label: 'Updated draft', url: 'https://github.com/napplet/naps/pull/80' },
    ],
  },
  {
    domain: 'shell', status: 'partial',
    detail: 'Startup handshake and capability discovery for the calling napplet.',
    remaining: 'Verify startup, environment delivery and domain discovery with a published napplet on both platforms. The domain-listing and target-compatibility extension has separate scope.',
    estimates: [{ size: 'XS' }],
    references: [
      { label: 'Base draft', url: 'https://github.com/napplet/naps/pull/101' },
      { label: 'Extension', url: 'https://github.com/napplet/naps/pull/142' },
    ],
  },
  {
    domain: 'theme', status: 'partial',
    detail: 'Shell colours through the release’s theme profile.',
    remaining: 'Verify initial theme delivery and onChanged updates for every granted napplet, including optional declarations.',
    estimates: [{ size: 'XS' }],
    references: [
      { label: 'Theme draft', url: 'https://github.com/napplet/naps/pull/103' },
    ],
  },
  {
    domain: 'upload', status: 'partial',
    detail: 'User-approved Blossom uploads.',
    remaining: 'Check raw bytes, status, progress and results against the draft. Bridge confirmed gaps while preserving approval for the exact bytes. The estimate assumes Blossom.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release upload workflow', url: `${releaseSource}/docs/upload-access.md` },
      { label: 'Upload draft', url: 'https://github.com/napplet/naps/pull/33' },
    ],
  },
  {
    domain: 'neighbor', status: 'none',
    detail: 'No Neighbor API in v0.2.0.',
    remaining: 'Let users choose peers per neighborhood, issue per-napplet addresses, route events and blobs, and revoke access across reconnects. Production sizing assumes one working transport on both platforms. FIPS interoperability also requires an iOS peer connection and event exchange with Myco.',
    estimates: [{ size: 'XL', scope: 'Production, one transport' }, { size: 'M', scope: 'Two-phone LAN prototype' }, { size: 'XXL', scope: 'FIPS + Myco interoperability' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/146' },
    ],
  },
  {
    domain: 'mesh', status: 'none',
    detail: 'Historical, withdrawn proposal. Experimental LAN code is present but unavailable to napplets in ordinary builds.',
    remaining: 'Hypothetical completion of the withdrawn draft would integrate paired LAN components in ordinary builds and verify pairing, delivery, forwarding and revocation on devices.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Mesh implementation guide', url: `${releaseSource}/docs/mesh-lan-profile.md` },
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/122' },
    ],
  },
  {
    domain: 'value', status: 'none',
    detail: 'No value-transfer or zap API.',
    remaining: 'Integrate one wallet backend for quotes, approval, sending and status. Recover interrupted payments without paying twice when the first outcome is unknown.',
    estimates: [{ size: 'XL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/30' },
    ],
  },
  {
    domain: 'pow', status: 'none',
    detail: 'No proof-of-work API.',
    remaining: 'Implement queued, cancellable proof-of-work jobs with progress, pause, resume and approved publication. Test battery use and foreground transitions on devices.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/39' },
    ],
  },
  {
    domain: 'blossom', status: 'none',
    detail: 'Blossom reads and uploads are available through resource and upload. The standalone Blossom API is unavailable.',
    remaining: 'Extend existing verified reads and approved uploads with standalone endpoints, server lists, authorization and blob management, including deletion.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/71' },
    ],
  },
  {
    domain: 'hashtree', status: 'none',
    detail: 'No standalone API.',
    remaining: 'Resolve mutable roots, verify and traverse trees, read and write files, publish roots and manage pins, transfers and jobs. Assumes a reusable HTS-01 library.',
    estimates: [{ size: 'XL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/73' },
    ],
  },
  {
    domain: 'fs', status: 'none',
    detail: 'No standalone API.',
    remaining: 'Implement a virtual filesystem with scoped paths, atomic writes, revisions, watches and consent for shared or destructive changes.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/88' },
    ],
  },
  {
    domain: 'torrent', status: 'none',
    detail: 'No standalone API.',
    remaining: 'Embed a torrent engine on both platforms. Add retained jobs, file selection, verified range reads, seeding, recovery and storage controls.',
    estimates: [{ size: 'XXL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/72' },
    ],
  },
  {
    domain: 'nzb', status: 'none',
    detail: 'No standalone API.',
    remaining: 'Integrate an external downloader, queue, history and job controls. Authorize access to completed output separately. An embedded Usenet engine would add scope.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/136' },
    ],
  },
  {
    domain: 'soulseek', status: 'none',
    detail: 'No standalone API.',
    remaining: 'Integrate a reusable Soulseek engine for search, peer browsing, downloads, transfer controls and bounded access to completed files.',
    estimates: [{ size: 'XL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/135' },
    ],
  },
  {
    domain: 'git', status: 'none',
    detail: 'No standalone API.',
    remaining: 'Integrate scoped repository handles and object reads. The estimate includes writes and publication. The five required read and lifetime operations would take less work.',
    estimates: [{ size: 'XL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/137' },
    ],
  },
  {
    domain: 'catalog', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Expose the existing verified catalogue as a read-only snapshot. Return opaque IDs that select the same publisher and handler in Intent.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/95' },
    ],
  },
  {
    domain: 'count', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Add relay filter counts, distinguish an unavailable count from zero and avoid counting the same result twice across sources.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/69' },
    ],
  },
  {
    domain: 'dm', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Integrate one encrypted messaging protocol end to end, including history, sending, live delivery, account-isolated storage and relay recovery.',
    estimates: [{ size: 'XL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/74' },
    ],
  },
  {
    domain: 'email', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Implement accounts, credentials, mailbox and thread reads, composition and sending. Give reader and composer napplets separate grants.',
    estimates: [{ size: 'XL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/139' },
    ],
  },
  {
    domain: 'lists', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Extend follow-list mutation to NIP-51 and NIP-65 lists. Preserve unrelated entries and relay markers, then recheck the latest list before signing.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/68' },
    ],
  },
  {
    domain: 'navigation', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Keep per-instance history of committed intent locations. Replay Back and Forward to the same instance and reconcile the location it reports.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/126' },
    ],
  },
  {
    domain: 'ble', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Add device selection, scoped GATT sessions, service discovery, reads, writes, notifications and teardown. Test real peripherals on both platforms.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/62' },
    ],
  },
  {
    domain: 'capture', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Add microphone consent, native recording, bounded encoded output, cancellation and teardown on interruption or account change. Test physical microphones on both platforms.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/94' },
    ],
  },
  {
    domain: 'display', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Integrate one documented display backend. Enumerate devices, issue opaque IDs, translate logical RGB updates and handle disconnects.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/97' },
    ],
  },
  {
    domain: 'gamepad', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Route physical controller input through the shell to the focused napplet. Test connection changes and focus transfers with real controllers.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/130' },
    ],
  },
  {
    domain: 'location', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Mediate coarse, precise and background access separately. Reconcile OS permissions and grants and enforce the restriction on direct WebView geolocation.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/125' },
    ],
  },
  {
    domain: 'motion', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Mediate native sensor sampling with permission and focus checks. Verify that unfocused frames cannot keep reading sensors directly.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/124' },
    ],
  },
  {
    domain: 'serial', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Implement device selection, open, read, write, close, permissions and disconnect recovery. Assumes a chosen accessory with a viable transport on both platforms.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/61' },
    ],
  },
  {
    domain: 'webrtc', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Implement shell-owned sessions and Nostr signaling for negotiation, send, receive and termination. Test two devices across different networks.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/59' },
    ],
  },
  {
    domain: 'llm', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Integrate one hosted model provider, shell-owned credentials, prompt-disclosure consent, generation, partial results and cancellation.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/134' },
    ],
  },
  {
    domain: 'system', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Expose scoped diagnostics for capabilities, services, relays, cache and media. Verify isolation of each napplet’s private state.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/64' },
    ],
  },
  {
    domain: 'webmcp', status: 'none',
    detail: 'No napplet-facing API.',
    remaining: 'Let a napplet register tools for an authorized agent. Add consumer authorization, attribution, schema validation, invocation, progress and cancellation.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/150' },
    ],
  },
  {
    domain: 'worker', status: 'none',
    detail: 'No napplet-facing API. Local browser workers are available separately.',
    remaining: 'Add runtime-owned worker creation, isolated execution, ordered messaging, termination and cleanup.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Worker policy', url: `${releaseSource}/docs/local-workers.md` },
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/107' },
    ],
  },
  {
    domain: 'class', status: 'none',
    detail: 'This deferred domain is unavailable.',
    remaining: 'Settle how the deferred class proposal fits current manifests and grants, then implement posture assignment and reporting. Sizing assumes a settled contract.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/16' },
    ],
  },
  {
    domain: 'connect', status: 'none',
    detail: 'This deferred domain is unavailable.',
    remaining: 'Resolve the class model, then enforce reviewed per-origin grants for fetch, sockets and event streams. Verify revocation and isolation in both WebViews.',
    estimates: [{ size: 'XL' }],
    references: [
      { label: 'Proposal', url: 'https://github.com/napplet/naps/pull/19' },
    ],
  },
];
