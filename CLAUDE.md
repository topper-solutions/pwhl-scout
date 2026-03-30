# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server on port 3000
npm run build          # Production build (type checking + linting + static pages)
npm run lint           # ESLint only
npm test               # Run all tests (vitest run)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report (v8)
npm audit              # Check for dependency vulnerabilities (should return 0)
```

Tests use **Vitest 4** with React Testing Library and jsdom. 183 tests across 15 test files covering lib functions, components, API routes, and page-level error handling (100% coverage across statements, branches, functions, and lines). Run a single test file with `npx vitest run src/lib/utils.test.ts`.

## Architecture

Next.js 15 App Router project (React 19, TypeScript, Tailwind CSS) that tracks the Professional Women's Hockey League. All pages are **server components**. Client components (`"use client"`) are limited to `error.tsx`, `live-scoreboard.tsx`, and `data-freshness.tsx`. Data is fetched server-side so API credentials never reach the client bundle.

### Data flow

```
Page (server component) → api.ts fetch function → HockeyTech or Firebase REST API
                        → extractSiteKit() unwraps response
                        → teams.ts resolves team colors/names
                        → renders with Tailwind component classes from globals.css
```

### API layer (`src/lib/api.ts`)

Two upstream APIs, both requiring credentials as URL query parameters (inherent to these APIs, not a design choice):

- **HockeyTech** — schedules, scores, standings, stats, game summaries. Responses are JSONP-wrapped (either `Modulekit.callback({...})` or `([{...}])`) and parsed by `parseHockeyTechResponse()`.
- **Firebase** — real-time game clock, live goals, penalties, shots during active games.

`extractSiteKit(data, viewKey)` is the critical abstraction — it handles five different response wrapper formats:
1. `{SiteKit: {ViewName: data}}` — most modulekit endpoints
2. `{GC: {ViewName: data}}` — game center endpoints (summary, PBP)
3. `[{sections: [{data: [{row: {...}}]}]}]` — statviewfeed endpoints (player stats, team schedule)
4. `[data]` — array-wrapped responses
5. Raw data — fallback

All fetch calls have a 10-second `AbortSignal.timeout`. ISR revalidation is set per page (60s for live scores, 120-300s for static data).

### Health endpoint (`src/app/api/health/route.ts`)

`/api/health` checks HockeyTech and Firebase reachability in parallel (5s timeout each). Returns `healthy`, `degraded`, or `unhealthy` status with per-upstream latency. HTTP 200 for healthy/degraded, 503 for unhealthy.

### Live game updates (`src/components/live-scoreboard.tsx`, `src/lib/extract-game-data.ts`, `src/app/api/live/route.ts`)

Real-time updates during active games use Firebase Realtime Database via Server-Sent Events (SSE):
1. `/api/live` route proxies the Firebase SSE stream, keeping credentials server-side
2. `LiveScoreboard` client component connects via `EventSource`, stores the full Firebase tree in a `useRef`, and merges PATCH events incrementally
3. `extractGameData()` in `src/lib/extract-game-data.ts` parses clock, goals, shots, and penalties from the Firebase tree (extracted from LiveScoreboard for independent testability)
4. Penalty tracking uses **absolute game seconds** (`(period-1) × 1200 + elapsed`) for correct cross-period carry-over, and checks power-play goals to terminate minor penalties early

### Team metadata (`src/lib/teams.ts`)

`getTeamMeta(id)` accepts a numeric ID, team code ("BOS"), or city name ("Boston"/"Montréal"/"Montreal") and returns colors, abbreviation, and full name. The current season has 8 teams with IDs 1-6, 8, 9 (no ID 7). Season ID is `CURRENT_SEASON_ID = 8` in api.ts — this must be updated each season.

### Error handling pattern

Pages use `Promise.allSettled` for parallel API calls, log failures with `console.error("[PageName] ...")`, and render `<ErrorBanner>` on failure. This distinguishes "no data" from "API is down." Global `error.tsx` catches unhandled render errors. `not-found.tsx` handles invalid route params.

### CSS component classes (`src/app/globals.css`)

Tailwind `@layer components` defines reusable classes: `.stat-table` (data tables), `.glass-card` (frosted glass panels), `.team-badge` (colored team chips), `.nav-link`, `.live-dot`, `.page-title`, `.text-live` (red pulse for live indicators). Team colors are applied dynamically via inline `style` attributes using values from `teams.ts`.

### Fonts

Oswald (display/headings), Source Sans 3 (body), JetBrains Mono (stats/numbers) — loaded via `next/font/google` and applied through CSS variables `--font-display`, `--font-body`, `--font-mono`.

## Environment variables

Required in `.env.local` (see `.env.example`):

```
HOCKEYTECH_API_KEY
HOCKEYTECH_CLIENT_CODE    # defaults to "pwhl"
FIREBASE_AUTH_TOKEN
FIREBASE_API_KEY
```

These keys are publicly visible in thepwhl.com's client-side JavaScript. They are kept in env vars for rotation support, not secrecy. Missing vars are logged at startup but don't prevent boot (pages will show error banners instead).

### Reusable components

- `TeamLogo` — renders team logo via `next/image` (5 sizes: xs/sm/md/lg/xl) with colored abbreviation fallback
- `ErrorBanner` — red-tinted glass card for API failure messages
- `LiveScoreboard` — client component for real-time game score, clock, shots, and penalty badges
- `DataFreshness` — client component showing "Updated {time}" with staleness warning when data exceeds 2x the revalidation interval

### Types (`src/lib/types.ts`)

TypeScript interfaces for all API response shapes: `ScorebarGame`, `StandingsRow`, `PlayerStatsRow`, `ScheduleGame`, `GameSummary`, `GameGoal`, `GamePenalty`, `GameMvp`, `RosterPlayer`, `PbpEvent`. All include `[key: string]: unknown` for API schema flexibility.

## Testing

Vitest 4 with jsdom and React Testing Library. Config in `vitest.config.ts` with separate `tsconfig.test.json` to avoid polluting the Next.js build with test types. Test env vars are set in `vitest.config.ts` `test.env` section (module-level `process.env` reads happen at import time, before `vi.stubEnv` runs).

Test files are colocated with source:
- `src/lib/utils.test.ts` — playerName, isGameLive/Final, val, formatDate
- `src/lib/teams.test.ts` — getTeamMeta (ID/abbr/city/fallback), getTeamByAbbr, TEAM_LIST
- `src/lib/pbp-labels.test.ts` — all event type labels + fallback
- `src/lib/api.test.ts` — extractSiteKit (5 formats), parseHockeyTechResponse (JSONP), fetch functions with mocked fetch
- `src/lib/api-env.test.ts` — missing env var validation, credential-gated error paths
- `src/lib/extract-game-data.test.ts` — clock parsing, goal/shot counting, penalty math, PP goal termination, coincidental detection
- `src/components/error-banner.test.tsx` — render + content assertions
- `src/components/data-freshness.test.tsx` — staleness threshold, interval updates
- `src/app/api/health/route.test.ts` — upstream checks, degraded/unhealthy states, timeouts
- `src/app/page.test.tsx` — homepage error handling, partial failures
- `src/app/standings/page.test.tsx` — standings error/success paths
- `src/app/schedule/page.test.tsx` — schedule error/success paths
- `src/app/stats/page.test.tsx` — stats error/success, view switching
- `src/app/game/[id]/page.test.tsx` — game detail error/success, invalid ID
- `src/app/team/[id]/page.test.tsx` — team page error/success, invalid ID

## Security

- All security headers configured in `next.config.mjs` (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy)
- Branch protection on `main`: required reviews, signed commits, enforce admins, linear history, no force push
- Dependency review GitHub Action runs on all PRs
- `npm audit` should always return 0 vulnerabilities
- Team logos loaded via `next/image` with `remotePatterns` restricted to `assets.leaguestat.com/pwhl/logos/`
