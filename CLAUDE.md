# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build (also runs type checking + linting)
npm run lint         # ESLint only
npm audit            # Check for dependency vulnerabilities (should return 0)
```

No test framework is configured yet. `npm run build` is the primary verification step — it compiles TypeScript, runs ESLint, and generates static pages.

## Architecture

Next.js 15 App Router project (React 19, TypeScript, Tailwind CSS) that tracks the Professional Women's Hockey League. All pages are **server components** — no `"use client"` except `error.tsx`. Data is fetched server-side so API credentials never reach the client bundle.

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

`extractSiteKit(data, viewKey)` is the critical abstraction — it handles four different response wrapper formats:
1. `{SiteKit: {ViewName: data}}` — most modulekit endpoints
2. `{GC: {ViewName: data}}` — game center endpoints (summary, PBP)
3. `[{sections: [{data: [{row: {...}}]}]}]` — statviewfeed endpoints (player stats, team schedule)
4. Raw data — fallback

All fetch calls have a 10-second `AbortSignal.timeout`. ISR revalidation is set per page (60s for live scores, 120-300s for static data).

### Team metadata (`src/lib/teams.ts`)

`getTeamMeta(id)` accepts a numeric ID, team code ("BOS"), or city name ("Boston"/"Montréal"/"Montreal") and returns colors, abbreviation, and full name. The current season has 8 teams with IDs 1-6, 8, 9 (no ID 7). Season ID is `CURRENT_SEASON_ID = 8` in api.ts — this must be updated each season.

### Error handling pattern

Pages use try-catch around API calls with `console.error("[PageName] ...")` logging and render `<ErrorBanner>` on failure. This distinguishes "no data" from "API is down." Global `error.tsx` catches unhandled render errors. `not-found.tsx` handles invalid route params.

### CSS component classes (`src/app/globals.css`)

Tailwind `@layer components` defines reusable classes: `.stat-table` (data tables), `.glass-card` (frosted glass panels), `.team-badge` (colored team chips), `.nav-link`, `.live-dot`, `.page-title`. Team colors are applied dynamically via inline `style` attributes using values from `teams.ts`.

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

## Security

- All security headers configured in `next.config.mjs` (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy)
- Branch protection on `main`: required reviews, signed commits, enforce admins, linear history, no force push
- Dependency review GitHub Action runs on all PRs
- `npm audit` should always return 0 vulnerabilities
