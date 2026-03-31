# PWHL Gameday

[![CI](https://github.com/topper-solutions/pwhl-gameday/actions/workflows/ci.yml/badge.svg)](https://github.com/topper-solutions/pwhl-gameday/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/murphy-platforms/8e2b3b269fe2a325c4bf2a222685a573/raw/pwhl-gameday-coverage.json)](https://github.com/topper-solutions/pwhl-gameday/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[Live Demo](https://topper.solutions/pwhl-gameday)**

Unofficial stats tracker for the Professional Women's Hockey League. Live scores, standings, player stats, schedules, and game details with real-time updates during active games.

## Features

- **Live scores** — real-time clock, score, shots on goal, and active penalty tracking via Firebase SSE
- **Standings** — full league standings with the PWHL 3-2-1-0 points system
- **Player stats** — sortable skater and goalie stats, filterable by team
- **Game detail** — box score, goals, penalties, shots by period, three stars, and play-by-play
- **Schedule** — season schedule with team filter and completed game scores
- **Team pages** — roster, schedule, and quick-nav between teams
- **Data freshness** — staleness indicator warns when ISR-cached data may be outdated
- **Health monitoring** — `/api/health` endpoint checks upstream API reachability

## Widget

A [Scriptable](https://scriptable.app) widget for your iPhone Home Screen shows live scores, results, and upcoming games at a glance — no app required.

[Setup instructions](docs/scriptable-widget.md) · [Download script](widget/PWHL-Gameday-Widget.js)

## Getting Started

```bash
cp .env.example .env.local   # Add API keys (see .env.example for details)
npm install
npm run dev                   # http://localhost:3000
```

## Architecture

### Why This Stack

This project tracks a live sports league — pages need to load fast, data must stay fresh, and live games demand real-time updates without page reloads. Every technology choice flows from those constraints.

**Next.js 15 App Router with React 19** — Server components eliminate client-side data fetching waterfalls. Each page makes its API calls on the server and streams finished HTML to the browser. Users see rendered standings and scores immediately instead of loading spinners. The App Router's per-route ISR (Incremental Static Regeneration) lets us tune freshness per page: standings revalidate every 2 minutes, live scoreboards every 60 seconds. Pages that aren't being requested don't hit the upstream APIs at all.

**TypeScript** — The HockeyTech API returns deeply nested JSONP responses in at least five different wrapper formats. TypeScript catches shape mismatches at build time rather than at 2am during a playoff game. Every API response type is defined in `src/lib/types.ts` with `[key: string]: unknown` escape hatches so the build doesn't break when the upstream API adds new fields mid-season.

**Tailwind CSS** — Team colors are applied dynamically via inline styles from `teams.ts`. Tailwind's utility classes compose cleanly with this pattern — a `.glass-card` base class gets team-colored borders and gradients at render time without generating per-team CSS. The dark "rink" theme uses CSS custom properties so the entire palette is defined in one place.

**Server-Side Only API Calls** — Both upstream APIs (HockeyTech and Firebase) require credentials as URL query parameters — there's no header-based auth option. By keeping all fetch calls in server components, credentials never appear in the client bundle or browser network tab. The one exception is the live game SSE stream, which is proxied through a Next.js API route (`/api/live`) specifically to keep Firebase tokens server-side.

### Data Flow

```
Browser request
  → Next.js server component (page.tsx)
    → api.ts fetch function (htFetch / firebaseFetch)
      → HockeyTech or Firebase REST API
    ← parseHockeyTechResponse() strips JSONP wrappers
    ← extractSiteKit() normalizes 5 response formats into clean data
    ← teams.ts resolves team IDs to colors, logos, abbreviations
  ← Rendered HTML with Tailwind classes + inline team colors
```

Pages use `Promise.allSettled` for parallel API calls. If standings load but scores fail, the page still renders standings with an error banner for scores instead of showing nothing.

### API Layer (`src/lib/api.ts`)

Two upstream APIs power the site:

**HockeyTech** provides schedules, scores, standings, stats, and game summaries. Responses are JSONP-wrapped in two formats — named callbacks (`Modulekit.callback({...})`) and anonymous wrappers (`([{...}])`) — parsed by `parseHockeyTechResponse()`. The critical abstraction is `extractSiteKit()`, which handles five different response envelope formats so every page gets clean, unwrapped data regardless of which HockeyTech endpoint it came from.

**Firebase Realtime Database** provides live game data — clock, goals, penalties, and shots — during active games. REST fetches use `cache: "no-store"` since live data must never be cached.

All fetch calls enforce a 10-second `AbortSignal.timeout` so a slow upstream never blocks page rendering indefinitely.

### Live Game Updates

Real-time updates are the most architecturally interesting piece. The challenge: Firebase SSE requires auth credentials, but `EventSource` is a browser API that can't be wrapped in a server component.

The solution is a three-layer design:

1. **`/api/live` route** — A Next.js API route that opens an SSE connection to Firebase with credentials and pipes the raw event stream back to the client. This is the only place Firebase tokens touch a network request visible to the browser.

2. **Full-tree storage** — Firebase sends an initial `PUT` event with the complete data tree, then incremental `PATCH` events for changes. The `LiveScoreboard` component stores the full tree in a `useRef` and deep-merges patches at arbitrary paths, so the component always has a complete, current snapshot.

3. **Penalty tracking with absolute game time** — Hockey penalties carry over across periods (a penalty assessed with 30 seconds left in the 2nd period runs into the 3rd). The penalty logic converts all times to absolute game seconds (`(period - 1) * 1200 + elapsed`) so cross-period calculations work correctly. It also checks power-play goals to terminate minor penalties early — a 2-minute minor ends immediately when the opposing team scores on the power play, but a 5-minute major does not.

### Team Metadata (`src/lib/teams.ts`)

`getTeamMeta()` accepts a numeric ID, team abbreviation (`"BOS"`), or city name (`"Boston"`, `"Montreal"`, `"Montréal"`) and returns colors, logo URL, abbreviation, and full name. The current season has 8 teams with IDs 1-6, 8, 9 (no ID 7). Logo images are served from HockeyTech's CDN via `next/image` with `remotePatterns` restricted to `assets.leaguestat.com/pwhl/logos/`.

### Error Handling

Every page uses `Promise.allSettled` so a single API failure doesn't crash the entire page. Failed calls log with `console.error("[PageName] ...")` and render an `<ErrorBanner>` component. This makes "no data exists" visually distinct from "the API is down." A global `error.tsx` boundary catches unhandled render errors, and `not-found.tsx` handles invalid route params.

### Project Structure

```
src/
  app/
    page.tsx              # Homepage — scores, standings, top scorers
    standings/page.tsx    # Full standings table
    stats/page.tsx        # Skater and goalie stats
    schedule/page.tsx     # Season schedule with team filter
    game/[id]/page.tsx    # Game detail — box score, PBP, three stars
    team/[id]/page.tsx    # Team page — roster and schedule
    api/live/route.ts     # SSE proxy for Firebase live data
    api/health/route.ts   # Upstream health check endpoint
    error.tsx             # Global error boundary (client component)
    not-found.tsx         # 404 page
    globals.css           # Tailwind base + component classes
    layout.tsx            # Root layout with nav, fonts, metadata
  components/
    live-scoreboard.tsx   # Real-time game scoreboard (client component)
    data-freshness.tsx    # ISR staleness indicator (client component)
    team-logo.tsx         # Team logo with fallback
    error-banner.tsx      # API failure message
  lib/
    api.ts                # All upstream API calls + response parsing
    extract-game-data.ts  # Firebase live game data parser (extracted for testability)
    teams.ts              # Team metadata (colors, logos, names)
    types.ts              # TypeScript interfaces for API responses
    utils.ts              # Shared pure functions
    pbp-labels.ts         # Play-by-play event type labels
```

## Development

```bash
npm run dev            # Start dev server on port 3000
npm run build          # Production build (types + lint + pages)
npm run lint           # ESLint only
npm test               # Run all tests (vitest run)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report (v8)
```

183 tests across 15 test files with 100% coverage (statements, branches, functions, lines). Tests use Vitest 4 with React Testing Library and jsdom.

## Environment Variables

Required in `.env.local` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `HOCKEYTECH_API_KEY` | HockeyTech API access |
| `HOCKEYTECH_CLIENT_CODE` | Client identifier (defaults to `"pwhl"`) |
| `FIREBASE_AUTH_TOKEN` | Firebase Realtime Database auth |
| `FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_BASE_PATH` | Optional — set when deploying under a subpath (e.g., `/pwhl-gameday`) |

These keys are publicly visible in thepwhl.com's client-side JavaScript. They are kept in env vars for rotation support, not secrecy.

## Security

- **Headers** — CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (configured in `next.config.mjs`)
- **Branch protection** — required reviews, signed commits, enforce admins, linear history, no force push
- **Dependency review** — GitHub Action runs on all PRs
- **Zero audit vulnerabilities** — `npm audit` should always return 0
- **Server-side credentials** — API keys never reach the client bundle; live data proxied through `/api/live`
- **Image allowlist** — `next/image` `remotePatterns` restricted to `assets.leaguestat.com/pwhl/logos/`

## License

MIT — see [LICENSE](LICENSE) for details.
