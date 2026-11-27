# Hypergolic website

[![MIT license](https://img.shields.io/badge/license-MIT-237647)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/built_with-Astro-8328cb?logo=astro&logoColor=white)](astro.config.mjs)
[![GitHub Pages workflow](https://img.shields.io/badge/deploy-GitHub_Pages-24292f?logo=github&logoColor=white)](.github/workflows/deploy.yml)
[![Latest Android release](https://img.shields.io/github/v/release/nostrocket/hypergolic?label=Android&color=396343)](https://github.com/nostrocket/hypergolic/releases/latest)

Hypergolic brings small Nostr apps called *napplets* into one Android workspace. This repository contains the Astro source for its website, where visitors can explore the app and download the signed Android release.

[Visit hypergolic.sh](https://hypergolic.sh/) · [Explore the app source](https://github.com/nostrocket/hypergolic) · [Download for Android](https://github.com/nostrocket/hypergolic/releases/latest)

![Hypergolic’s four-point spark above a night launch. Nostr, beyond the feed.](public/assets/social-preview.jpg)

## Capabilities and relay data

The [capability table](https://hypergolic.sh/capabilities/) documents Android v0.2.0 and links to its release sources. The [napplet explorer](https://hypergolic.sh/explorer/) opens read-only WebSocket connections from the visitor’s browser to nos.lol, relay.ditto.pub and relay.primal.net. Opening the explorer shares the visitor’s IP address with those relays. A visitor can pause the session or start a fresh observation.

The explorer verifies signed events before selecting the latest root or named publication per Nostr identity. Its heatmap covers every domain in the release table plus additional domains observed on the relays. Counts show required and optional declarations on comparable heads. Snapshot versions, legacy publications and exclusions are available under Publications. Coverage lists the observation window, per-relay limits, failures and targeted deletion checks. Results vary with the relay set, session time and retention. Opening a shared URL repeats the query against the current observation.

## Local development

Use Node.js 26 and pnpm 12.18.0. From the repository root, install dependencies and start Astro.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address Astro prints in your terminal. Edits to the homepage and styles appear as you save.

## Production build

| Command | Result |
| --- | --- |
| `pnpm build` | Generate the static site in `dist/`. |
| `pnpm preview` | Serve the production build locally. |
| `pnpm test` | Run the offline publication and relay tests. |
| `pnpm run build:pages` | Test the explorer, build all three routes, and verify canonical URLs, the custom domain, and linked assets. Requires Python 3. |
| `pnpm run package:pages` | Run the Pages checks and create `artifact.tar`. Requires Python 3 and `tar`. |

Pull requests targeting `main` build and package the site. Pushes to `main` publish the verified artifact to GitHub Pages. [Deployment workflow](.github/workflows/deploy.yml)

## Contributing

Release highlights, upcoming features and the current Android download asset live in [src/data/releases.ts](src/data/releases.ts). Homepage layout and copy live in [src/pages/index.astro](src/pages/index.astro). The responsive layout and typography live in [src/styles/site.css](src/styles/site.css), and the site’s images and fonts live in [public/assets](public/assets/). Run `pnpm run build:pages` to check your changes before opening a pull request.

## License

The website source is available under the [MIT License](LICENSE). Barlow and JetBrains Mono are distributed under the SIL Open Font License 1.1. [Barlow notice](public/assets/fonts/Barlow-OFL.txt) · [JetBrains Mono notice](public/assets/fonts/JetBrainsMono-OFL.txt)

## Napplet Insights prototype

Collect a bounded, read-only relay observation for the current UTC week:

```sh
node scripts/insights.mjs collect
```

The local `.insights-queue/` holds one unsigned JSON snapshot and its publication
manifest per week, plus the share card (SVG), caption and alt text. Run `node scripts/insights.mjs render-post YYYY-MM-DD`
to render the card to PNG with Chrome or Chromium. A repeat run
for the same UTC week reuses the queued snapshot. The first edition is a baseline
with no new-napplet count. Schedule collection near the end of each UTC week to
keep the observation times comparable.

Preview the queued editions locally with `INSIGHTS_PREVIEW_DRAFTS=1 pnpm dev`
and open `/insights/`. Standard builds read `data/insights/` and require a
verified signature from the pinned Exosquare key, the expected kind and series
tag, and a matching manifest digest. Set `INSIGHTS_DIRECTORY` to change the
input directory. Each edition's URL uses its UTC week start.

To test Amber, create or select a disposable account in Amber and use its public
npub. The command shows a private pairing QR on macOS (Swift/Xcode Command Line
Tools required), or a one-time pairing URI elsewhere:

```sh
node scripts/insights.mjs test-sign 2026-11-23 --relay wss://relay.example --test-npub npub1...
```

Scan to pair, then approve the signing request in Amber. The CLI checks the
selected account, exact event hash and signature, then saves the signed test
event locally. The signing relay carries the encrypted NIP-46 messages.
The prototype snapshot kind is provisional. Confirm its registry status and
read/write support on the intended publication relays before a public release.

A release entry under `data/insights/` is named `YYYY-MM-DD.json` and
contains the signed snapshot as `event` and the matching `manifest`. For card
artwork, put each available icon under `data/insights/icons/<sha256>`. The
build checks the bytes against the signed manifest's hash and renders a
letter fallback when an icon is unavailable.

### Publish an official Exosquare edition

After authorizing public compatibility probes, run these commands with the
queued edition date:

```sh
node scripts/insights.mjs probe-relays YYYY-MM-DD
node scripts/insights.mjs queue-release YYYY-MM-DD
node scripts/insights.mjs approve YYYY-MM-DD --relay wss://relay.nip46.com
node scripts/insights.mjs publish YYYY-MM-DD
```

The first command sends a labeled kind probe with a ten-minute expiration from
a disposable key to each candidate relay. The release queue includes only
relays that accepted and served their probe. Select the official Exosquare
account in Amber for the approval. The CLI checks the account and the exact
event before saving the signed release and matching manifest. The separate
publish command submits that approved event, verifies read-back on a fresh
connection and records a per-relay receipt. Rerunning publish reuses the same
signed event and skips relays already serving it. The short social post is a
separate event.

### Prepare and sign an edition announcement

Host the rendered PNG at `public/assets/insights/YYYY-MM-DD-share.png`. Once
the dated page and image are live, save the post copy in
`.insights-queue/YYYY-MM-DD.nostr-post.txt`, ending with the dated edition URL.

```sh
node scripts/insights.mjs queue-post YYYY-MM-DD
node scripts/insights.mjs approve-post YYYY-MM-DD --relay wss://relay.nip46.com
```

Queueing verifies the live page, signed snapshot, and PNG before adding the
image URL and its media metadata to the note. Amber approval saves the signed
note locally.
