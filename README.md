# Novastrum Landing Page

A dark, premium marketing landing page for a transparent automated trading platform. The experience is built as a Vite + vanilla JavaScript project and focuses on a disciplined trading narrative: paper trading first, user-defined risk controls, and full transparency around every position.

## Overview

Novastrum presents itself as a trading automation platform designed to give users control instead of black-box automation. The landing page highlights:

- Paper trading before live deployment
- User-configurable risk limits
- Trade-only API access for funding safety
- Clear transparency into why positions are opened and closed
- A premium fintech-style visual identity

## Product positioning

The project is positioned around a clear principle: automation should reduce emotional mistakes without removing user oversight. The page emphasizes that users choose whether they are in paper or live mode, set their guardrails, and can monitor trade activity with explanation-rich reporting.

## Features

- Responsive landing-page layout with dark/light theme support
- Animated market ticker and chart visuals
- Sections for value proposition, how it works, transparency, FAQ, and waitlist CTA
- Interactive world map visual for geographic branding
- Built with semantic HTML and modular CSS
- Lightweight static site optimized for fast delivery

## Tech stack

- Vite
- JavaScript (ES modules)
- CSS custom properties and component styling
- SVG-based chart and visual artwork
- `world-atlas` and `d3-geo` for map rendering

## Project structure

```text
.
├── index.html
├── styles.css
├── main.js
├── package.json
├── README.md
├── public/
│   ├── site.webmanifest
│   ├── world.json
│   ├── flags/
│   ├── icons/
│   └── mockups/
│       ├── dashboard-overview.svg
│       ├── mobile-trading-app.svg
│       └── trade-logic-board.svg
├── assets/
│   └── icons/
├── scripts/
│   └── build-map.mjs
└── dist/
```

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview the production build:

```bash
npm run preview
```

## Scripts

- `npm run dev` — starts the local Vite dev server
- `npm run build` — builds the production bundle
- `npm run preview` — serves the built site locally
- `npm run build:map` — rebuilds the world map data used by the landing page

## Theme and design notes

The project uses a dark fintech aesthetic with:

- deep navy backgrounds
- bright green and red accents for gains and risk
- clean typography with sans-serif and mono blends
- card-based layout for trust, strategy, and risk sections
- subtle chart-inspired animation for product storytelling

## Mockup gallery

These mockup files are included to support product storytelling, pitch decks, and design review discussions:

- [Dashboard overview](public/mockups/dashboard-overview.svg)
- [Mobile trading app](public/mockups/mobile-trading-app.svg)
- [Trade logic board](public/mockups/trade-logic-board.svg)

## Notes for contributors

This project is intentionally lightweight and static. If you are making design or messaging updates, aim to keep the branding consistent with the existing voice:

- disciplined
- transparent
- premium
- risk-aware
- no-nonsense

The landing page reads like a high-trust product narrative rather than a generic SaaS template, so refinements should preserve that tone.

## License

The project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
