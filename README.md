# PWHL Scout

[![Dependency Review](https://github.com/topper-solutions/pwhl-scout/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/topper-solutions/pwhl-scout/actions/workflows/dependency-review.yml)

Unofficial stats tracker for the Professional Women's Hockey League. Live scores, standings, player stats, schedules, and game details with real-time updates during active games.

## Getting Started

```bash
cp .env.example .env.local   # Add API keys (see .env.example for details)
npm install
npm run dev                   # http://localhost:3000
```

## Tech Stack

- **Next.js 15** / React 19 / TypeScript
- **Tailwind CSS** with custom dark rink theme
- **HockeyTech API** for scores, standings, stats, schedules
- **Firebase Realtime API** (SSE) for live game updates
