# Hypergolic website

[![MIT license](https://img.shields.io/badge/license-MIT-237647)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/built_with-Astro-8328cb?logo=astro&logoColor=white)](astro.config.mjs)
[![GitHub Pages workflow](https://img.shields.io/badge/deploy-GitHub_Pages-24292f?logo=github&logoColor=white)](.github/workflows/deploy.yml)
[![Latest Android release](https://img.shields.io/github/v/release/nostrocket/hypergolic?label=Android&color=396343)](https://github.com/nostrocket/hypergolic/releases/latest)

Hypergolic brings small Nostr apps called *napplets* into one Android workspace. This repository contains the Astro source for its website, where visitors can explore the app and download the signed Android release.

[Visit hypergolic.sh](https://hypergolic.sh/) · [Explore the app source](https://github.com/nostrocket/hypergolic) · [Download for Android](https://github.com/nostrocket/hypergolic/releases/latest)

![Hypergolic’s four-point spark above a night launch. Nostr, beyond the feed.](public/assets/social-preview.jpg)

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
| `pnpm run build:pages` | Build and verify the homepage, custom domain, and linked assets. Requires Python 3. |
| `pnpm run package:pages` | Run the Pages checks and create `artifact.tar`. Requires Python 3 and `tar`. |

Pull requests targeting `main` build and package the site. Pushes to `main` publish the verified artifact to GitHub Pages. [Deployment workflow](.github/workflows/deploy.yml)

## Contributing

Homepage copy and Android release links live in [src/pages/index.astro](src/pages/index.astro). The responsive layout and typography live in [src/styles/site.css](src/styles/site.css), and the site’s images and fonts live in [public/assets](public/assets/). Run `pnpm run build:pages` to check your changes before opening a pull request.

## License

The website source is available under the [MIT License](LICENSE). Barlow and JetBrains Mono are distributed under the SIL Open Font License 1.1. [Barlow notice](public/assets/fonts/Barlow-OFL.txt) · [JetBrains Mono notice](public/assets/fonts/JetBrainsMono-OFL.txt)
