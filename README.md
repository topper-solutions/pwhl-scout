# PWHL Scout

[![CI](https://github.com/topper-solutions/pwhl-scout/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/topper-solutions/pwhl-scout/actions/workflows/dependency-review.yml)

Unofficial stats tracker for the Professional Women's Hockey League. Live scores, standings, player stats, schedules, and game details with real-time updates during active games.

## Features

- **Live scores** — real-time clock, score, shots on goal, and active penalty tracking via Firebase SSE
- **Standings** — full league standings with the PWHL 3-2-1-0 points system
- **Player stats** — sortable skater and goalie stats, filterable by team
- **Game detail** — box score, goals, penalties, shots by period, three stars, and play-by-play
- **Schedule** — season schedule with team filter and completed game scores
- **Team pages** — roster, schedule, and quick-nav between teams

## Getting Started

```bash
cp .env.example .env.local   # Add API keys (see .env.example for details)
npm install
npm run dev                   # http://localhost:3000
```

## Tech Stack

- **Next.js 15** / React 19 / TypeScript
- **Tailwind CSS** with custom dark rink theme
- **Vitest 4** / React Testing Library (93 tests, ~92% coverage)
- **HockeyTech API** for scores, standings, stats, schedules
- **Firebase Realtime API** (SSE) for live game updates

## Architecture

All pages are server components with ISR. Live game updates use a client-side `EventSource` connected to `/api/live`, which proxies Firebase SSE to keep credentials server-side. The `LiveScoreboard` component stores the full Firebase data tree and merges incremental PATCH events for real-time clock, score, shot, and penalty updates.

Data flows through `src/lib/api.ts`, which handles JSONP unwrapping and five different HockeyTech response formats via `extractSiteKit()`. Team metadata (colors, logos, abbreviations) is resolved by `src/lib/teams.ts`.

## Development

```bash
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run build          # Full production build (types + lint + pages)
npm run lint           # ESLint only
```

## Security

- Security headers: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy
- Branch protection on `main` with required reviews, signed commits, and linear history
- Dependency review action on all PRs
- API credentials kept server-side via env vars and SSE proxy

## License

Private project. Not licensed for redistribution.
