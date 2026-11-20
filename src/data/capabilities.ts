export const releaseSource = 'https://github.com/nostrocket/hypergolic/blob/v0.2.0';

const draftSource = 'https://github.com/napplet/naps/blob';

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
  verification?: { platform: string; evidence: string };
  estimates: Estimate[];
  references: { label: string; url: string }[];
};

export const capabilities: Capability[] = [
  {
    domain: 'storage', status: 'full',
    detail: 'All four storage operations (get, set, remove, keys) in both shared and per-instance storage.',
    remaining: 'Verify persistence across restarts and isolation between instances on iOS.',
    verification: { platform: 'Android 16 phone', evidence: '/capabilities/v0.2.0/tests/#storage' },
    estimates: [],
    references: [
      { label: 'Release contract', url: `${releaseSource}/docs/capability-contract.md` },
      { label: 'Storage operations', url: `${releaseSource}/src/runtime/capability-broker.ts#L42-L50` },
      { label: 'Storage draft', url: `${draftSource}/f71e84ebca7474db260346cbfc2d88f41b4e421e/naps/NAP-STORAGE.md` },
    ],
  },
  {
    domain: 'common', status: 'full',
    detail: 'All eight operations, including NIP-19 conversion, profile and follow reads, follow changes, reactions and reports. Social writes require approval. Each signed event must fit within 8 KiB.',
    remaining: 'Repeat all eight operations on physical Android and iOS devices with a real signer and public relays.',
    verification: { platform: 'Android 16 emulator', evidence: '/capabilities/v0.2.0/tests/#common' },
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release social operations', url: `${releaseSource}/docs/common-social.md` },
      { label: 'Social publication', url: `${releaseSource}/src/common/social-plan.ts#L51-L74` },
      { label: 'Common draft', url: `${draftSource}/8cd0eae8550575771bb616a384e2dfbcade31673/naps/NAP-COMMON.md#L143` },
    ],
  },
  {
    domain: 'config', status: 'partial',
    detail: 'Saved per-napplet settings using a supported subset of configuration schemas.',
    remaining: 'Return a closable subscription from onSchemaError. Support valid schemas that exceed the release’s string and array limits, then verify registration and updates on devices.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release behavior', url: `${releaseSource}/docs/notifications-configuration.md` },
      { label: 'Schema validation', url: `${releaseSource}/src/presentation/config-schema.ts#L101-L108` },
      { label: 'Config draft', url: `${draftSource}/bed9cb5b1e7c9b5babee8870aa18b12949af1d62/naps/NAP-CONFIG.md#L55` },
    ],
  },
  {
    domain: 'cvm', status: 'partial',
    detail: 'Encrypted requests to known, free providers. Discovery, registry execution, and payments are unavailable.',
    remaining: 'Implement provider discovery and registry lookup, description and execution. Verify direct calls with a real free provider. Paid calls also need budgets, consent and settlement.',
    estimates: [{ size: 'S', scope: 'Free-provider profile' }, { size: 'XXL', tokens: '900k–2M', scope: 'Broader paid ecosystem' }],
    references: [
      { label: 'CVM profile', url: `${releaseSource}/docs/cvm.md` },
      { label: 'CVM request dispatch', url: `${releaseSource}/src/cvm/cvm-session.ts#L49-L55` },
      { label: 'CVM draft', url: `${draftSource}/28cf1bdb5c6412bfbfcecb79a5a5121e18376f2f/naps/NAP-CVM.md#L21` },
    ],
  },
  {
    domain: 'identity', status: 'partial',
    detail: 'Public profile, relay preferences, follows, mutes and selected lists for the active account.',
    remaining: 'Add blocked-user and zap-history reads. Both currently return an error. The estimate covers read-only history.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release identity coverage', url: `${releaseSource}/docs/public-identity-data.md` },
      { label: 'Identity reads', url: `${releaseSource}/src/identity/identity-projection.ts#L50-L65` },
      { label: 'Identity draft', url: `${draftSource}/5ac0490461ca6fec2f0d2e45b4835cf9bc08de24/naps/NAP-IDENTITY.md#L23` },
    ],
  },
  {
    domain: 'inc', status: 'partial',
    detail: 'Messages and channels between active napplet sessions.',
    remaining: 'Address each running instance separately. The release uses an app label, so two instances of the same napplet cannot be targeted independently. Verify delivery and closure between instances.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release routing', url: `${releaseSource}/docs/intent-inc.md` },
      { label: 'Channel routing', url: `${releaseSource}/src/routing/routing-broker.ts#L185-L193` },
      { label: 'INC draft', url: `${draftSource}/2578336467bb80fdcd60b250c7159f281f6b9cc9/naps/NAP-INC.md#L74` },
    ],
  },
  {
    domain: 'intent', status: 'partial',
    detail: 'Dispatch to installed handlers. Discovery of uninstalled handlers is unavailable.',
    remaining: 'Resolve root manifests (kind 15129) alongside named manifests and snapshots. Verify discovery, installation consent and delivery to a previously uninstalled handler.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release routing', url: `${releaseSource}/docs/intent-inc.md` },
      { label: 'Manifest selection', url: `${releaseSource}/src/napplets/verified-artifact.ts#L141-L151` },
      { label: 'Intent draft', url: `${draftSource}/33ac4ae790da8dc265d00823d65bd1147f45894b/naps/NAP-INTENT.md#L171` },
    ],
  },
  {
    domain: 'keys', status: 'partial',
    detail: 'Hardware keyboard actions and shortcuts for the focused napplet.',
    remaining: 'Forward eligible unbound key combinations to the shell. The release drops every combination with a modifier. Verify forwarding, bindings and reserved shortcuts with physical keyboards.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release key policy', url: `${releaseSource}/docs/capability-contract.md` },
      { label: 'Key forwarding', url: `${releaseSource}/runtime/patches/@kehto__shell@0.20.0.patch#L199-L211` },
      { label: 'Keys draft', url: `${draftSource}/8869a4cf77b023f4b049f47c546910a0280dc1a6/naps/NAP-KEYS.md#L95` },
    ],
  },
  {
    domain: 'link', status: 'full',
    detail: 'Opens an approved HTTPS link with the device’s handler and reports the outcome. The release allows HTTPS only.',
    remaining: 'Verify refusal, HTTPS handoff and the result returned to the calling napplet on iOS.',
    verification: { platform: 'Android 16 phone', evidence: '/capabilities/v0.2.0/tests/#link' },
    estimates: [{ size: 'XS' }],
    references: [
      { label: 'Release link policy', url: `${releaseSource}/docs/external-links.md` },
      { label: 'Link request handling', url: `${releaseSource}/runtime/src/link-adapter.ts#L4-L12` },
      { label: 'Link draft', url: `${draftSource}/100e5c939ae6b1ea82cc58587c6da45a1cf8a760/naps/NAP-LINK.md#L76` },
    ],
  },
  {
    domain: 'media', status: 'partial',
    detail: 'Foreground HTTPS MP4 playback and bounded MP3 radio.',
    remaining: 'Deliver session metadata updates to the player. The guest can send an update, but the runtime drops it. Verify title changes and playback controls on both native players.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Release playback profile', url: `${releaseSource}/docs/media-playback.md` },
      { label: 'Media message handling', url: `${releaseSource}/runtime/src/media-wire.ts#L53-L61` },
      { label: 'Media draft', url: `${draftSource}/7806f438530251fce5129f8e6239d6b642278759/naps/NAP-MEDIA.md#L181` },
    ],
  },
  {
    domain: 'notify', status: 'full',
    detail: 'In-app notifications with channel permissions, badges, action buttons, body clicks and dismissals.',
    remaining: 'Verify channel and general permissions, badge updates, callbacks and cleanup on iOS.',
    verification: { platform: 'Android 16 phone', evidence: '/capabilities/v0.2.0/tests/#notify' },
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release behavior', url: `${releaseSource}/docs/notifications-configuration.md` },
      { label: 'Notification centre', url: `${releaseSource}/src/shell/Notifications.tsx#L18` },
      { label: 'Notify draft', url: `${draftSource}/67877ef6c31ec8acee3125c1d8b4c781010e37dc/naps/NAP-NOTIFY.md#L227` },
    ],
  },
  {
    domain: 'outbox', status: 'partial',
    detail: 'Relay resolution, event lookup, queries, subscriptions, and approved publication under the release’s routing limits.',
    remaining: 'Limit each publication to the single signed event allowed by the draft. The release can also send a signed relay list. Verify routing with real relays on both platforms.',
    estimates: [{ size: 'S' }],
    references: [
      { label: 'Release routing and divergence', url: `${releaseSource}/docs/outbox-routing.md` },
      { label: 'Publication plan', url: `${releaseSource}/src/outbox/publication-plan.ts#L41` },
      { label: 'Outbox draft', url: `${draftSource}/8865f73d52a4864afee145f28d26520476273927/naps/NAP-OUTBOX.md#L285` },
    ],
  },
  {
    domain: 'relay', status: 'partial',
    detail: 'Queries, subscriptions, and approved publication. Encrypted publication is unavailable.',
    remaining: 'Implement encrypted publication and decrypt incoming encrypted events for the intended recipient. Verify both directions with real relays.',
    estimates: [{ size: 'L' }],
    references: [
      { label: 'Release contract', url: `${releaseSource}/docs/capability-contract.md` },
      { label: 'Subscription delivery', url: `${releaseSource}/src/network/relay-subscriptions.ts#L34-L38` },
      { label: 'Relay draft', url: `${draftSource}/9f30b3505335a52c574ff570576687d6467021ff/naps/NAP-RELAY.md#L257` },
    ],
  },
  {
    domain: 'resource', status: 'partial',
    detail: 'Bounded HTTPS, Blossom, one-hop Nostr, and data: reads.',
    remaining: 'Return canonical base64 in public byte results. The release returns a Blob. Check the revised format for single reads, bulk results and cancellation.',
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release resource profile', url: `${releaseSource}/docs/resource-access.md` },
      { label: 'Resource response', url: `${releaseSource}/runtime/src/resource-adapter.ts#L49-L69` },
      { label: 'Resource draft', url: `${draftSource}/ae5b9c64ab8a4d8909f288829a01e99d6bd713bc/naps/NAP-RESOURCE.md#L85` },
    ],
  },
  {
    domain: 'shell', status: 'partial',
    detail: 'Startup handshake and capability discovery for the calling napplet.',
    remaining: 'Allow an authenticated napplet to use its other granted domains before the shell handshake completes. The release waits for the handshake. Verify early calls on both platforms.',
    estimates: [{ size: 'XS' }],
    references: [
      { label: 'Extension', url: 'https://github.com/napplet/naps/pull/142' },
      { label: 'Session readiness', url: `${releaseSource}/runtime/src/main.ts#L301-L314` },
      { label: 'Shell draft', url: `${draftSource}/04d433674bce16795e860f9006bfa87a8e02e25c/naps/NAP-SHELL.md#L120` },
    ],
  },
  {
    domain: 'theme', status: 'full',
    detail: 'Supplies background, text and primary colours and broadcasts changes when the system switches appearance.',
    remaining: 'Verify initial colours and light/dark callbacks for an optional theme grant on iOS.',
    verification: { platform: 'Android 16 phone', evidence: '/capabilities/v0.2.0/tests/#theme' },
    estimates: [{ size: 'XS' }],
    references: [
      { label: 'Theme service', url: `${releaseSource}/runtime/src/shell-theme.ts#L6-L20` },
      { label: 'Theme draft', url: `${draftSource}/50f918ccdcb5b94a6465c84e12036275e8984da7/naps/NAP-THEME.md#L129` },
    ],
  },
  {
    domain: 'upload', status: 'full',
    detail: 'Uploads approved raw bytes to Blossom, reports progress and returns a URL, SHA-256 hash, size and media type.',
    remaining: 'Verify approval, progress, completion and independent Blossom readback on physical Android and iOS devices.',
    verification: { platform: 'Android 16 emulator', evidence: '/capabilities/v0.2.0/tests/#upload' },
    estimates: [{ size: 'M' }],
    references: [
      { label: 'Release upload workflow', url: `${releaseSource}/docs/upload-access.md` },
      { label: 'Upload completion', url: `${releaseSource}/src/uploads/upload-service.ts#L238-L252` },
      { label: 'Upload draft', url: `${draftSource}/f5cc981e527e2cc1572793a7a6e5082e5271ac49/naps/NAP-UPLOAD.md#L269` },
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
