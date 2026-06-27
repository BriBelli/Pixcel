# Fonts

The system uses **IBM Plex Sans** (UI + brand) and **IBM Plex Mono** (code / tokens).

## How fonts resolve at runtime

`colors_and_type.css` declares two `@font-face` blocks below (only active when the local files exist), and **also** loads IBM Plex from Google Fonts via `@import`. The browser will:

1. Check this folder first for the local `.woff2` files.
2. Fall back to the Google Fonts CDN if nothing matches.

This way the project works out of the box, but you can switch to fully self-hosted by dropping in the right files — no code change needed.

## What to upload

Pull from the official IBM Plex release ZIP: [github.com/IBM/plex/releases](https://github.com/IBM/plex/releases)

| File you need (place in this folder)     | What it gives you                       |
| ---------------------------------------- | --------------------------------------- |
| `IBMPlexSans-Regular.woff2`              | Regular (400) — body text               |
| `IBMPlexSans-Medium.woff2`               | Medium (500) — wordmark, UI labels      |
| `IBMPlexSans-SemiBold.woff2`             | SemiBold (600) — alert titles           |
| `IBMPlexSans-Bold.woff2`                 | Bold (700) — h1, stat values            |
| `IBMPlexMono-Regular.woff2`              | Regular (400) — code, tokens            |
| `IBMPlexMono-Medium.woff2`               | Medium (500) — inline emphasis          |

The web zip on the release page is the easiest source. (For Illustrator, grab `OpenType.zip` instead and double-click each `.otf` to install.)

## License

Open Font License (OFL), 2017–2022 IBM Corp.
Free for commercial use, modification, redistribution. No attribution required.
