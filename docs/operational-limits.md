# Operational Limits

Every scale ceiling in the PWHL Gameday application. Each entry follows
**Ceiling --> Symptom at ceiling --> Fix**.

---

## 1. Data Fetch Timeout

| Parameter | Value |
|---|---|
| `FETCH_TIMEOUT_MS` | **10 000 ms** (10 s) |
| Mechanism | `AbortSignal.timeout(FETCH_TIMEOUT_MS)` on every `htFetch` and `firebaseFetch` call |

**Symptom:** Upstream latency > 10 s aborts the request; page renders an `<ErrorBanner>` for that data section.

**Fix:** Increase `FETCH_TIMEOUT_MS` in `src/lib/api.ts`. Consider adding per-endpoint overrides if only one upstream is slow.

---

## 2. ISR Revalidation Windows

### Per-page `revalidate` exports

| Route | Page-level `revalidate` |
|---|---|
| `/` (home) | 60 s |
| `/game/[id]` | 60 s |
| `/standings` | 120 s |
| `/team/[id]` | 300 s |
| `/schedule` | 300 s |
| `/stats` | 300 s |

### htFetch hardcoded revalidate

Every HockeyTech call in `htFetch` passes `next: { revalidate: 60 }` to the
fetch options. This is the **Next.js Data Cache TTL** and operates independently
from the page-level `revalidate` export.

**Interaction:** The page-level value controls how often the *page shell* is
regenerated. The `htFetch` value controls how often the *underlying fetch
response* is considered stale. Whichever is shorter wins in practice. This means
pages with `revalidate: 300` (team, schedule, stats) still hit HockeyTech at
most once per 60 s per route per server instance, because the fetch cache expires
first.

**Firebase fetches** use `cache: "no-store"` -- they bypass the Next.js Data
Cache entirely and always call upstream.

**Symptom:** During high traffic, many routes revalidating simultaneously may
spike upstream API calls (see Thundering Herd below).

**Fix:** To reduce upstream call volume, increase the `revalidate: 60` value in
`htFetch`. To make pages fresher, decrease the page-level export. Align both
values when you want predictable behavior.

---

## 3. ISR Thundering Herd

With N server instances and M distinct routes (including dynamic segments like
`/game/[id]`), worst-case revalidation is **N x M requests per revalidation
window**.

| Variable | Current state |
|---|---|
| HockeyTech fetch cache TTL | 60 s |
| Unique game pages (season) | ~120 (PWHL regular season) |
| Unique team pages | 8 |
| Static routes | 4 (`/`, `/standings`, `/schedule`, `/stats`) |

For a single instance, worst case is ~132 upstream calls per 60 s. Each
additional instance multiplies this linearly because ISR caches are per-instance.

**Symptom:** HockeyTech returns 429 or connection resets under sustained
multi-instance deployments.

**Fix:** Put a shared cache (Redis, CDN) in front of the upstream, or use
Next.js shared ISR cache (e.g., `@neshca/cache-handler`). The comment in
`api.ts` also suggests adding a circuit breaker for failing upstreams.

---

## 4. SSE Connection Limits

| Component | Behavior |
|---|---|
| `/api/live` route | Opens **one Firebase SSE connection per inbound client request** |
| `LiveScoreboard` client | Opens **one `EventSource` per browser tab** |
| Fan-out / multiplexing | **None** -- each tab = one server connection = one Firebase connection |

**Symptom:** With C concurrent viewers, the server holds C open connections to
Firebase and C open SSE responses to clients. Node.js default
`maxConnections` is not set, but OS file descriptor limits (typically 1024
soft) will cap connections first.

**Fix:** Add a server-side fan-out layer: one upstream Firebase SSE connection
shared across all clients. Broadcast to connected `EventSource` clients via an
in-memory pub/sub or use a dedicated SSE broadcast library. Increase `ulimit -n`
for the process as a short-term measure.

---

## 5. HockeyTech API Rate Limits

HockeyTech does not publish rate limit documentation. The effective ceiling is
bounded by ISR:

| Scenario | Max upstream call rate |
|---|---|
| Single instance, single route | 1 request / 60 s |
| Single instance, all routes | ~132 requests / 60 s (~2.2/s) |
| N instances, all routes | ~132 x N requests / 60 s |

**Symptom:** Unknown -- likely 429 responses or IP-based throttling.

**Fix:** Monitor for 429s. If hit, increase `revalidate` values or add a shared
cache layer. The `htFetch` function should be extended with retry + exponential
backoff.

---

## 6. Firebase REST API Limits

| Limit | Value |
|---|---|
| Simultaneous connections (default project) | **200 000** |
| Download bandwidth | 10 GB / month (Spark plan) or pay-as-you-go (Blaze) |
| SSE idle timeout | Firebase closes idle connections after ~60 s of no data |

**Symptom:** Exceeding 200K simultaneous SSE connections returns 429 from
Firebase. On Spark plan, bandwidth exhaustion silently stops serving data.

**Fix:** Fan-out (see SSE section above) reduces Firebase connections to 1
regardless of viewer count. Upgrade to Blaze plan for bandwidth.

---

## 7. Display Limits

Hard `.slice()` caps in rendering code:

| Location | Slice | What is truncated |
|---|---|---|
| `game/[id]/page.tsx` | `.slice(0, 100)` | Play-by-play events |
| `team/[id]/page.tsx` | `.slice(0, 30)` | Team schedule sidebar games |
| `page.tsx` (home) | `.slice(0, 8)` | Standings preview rows |
| `page.tsx` (home) | `.slice(0, 10)` | Top scorers preview rows |

### API-side query limits

| Function | `limit` param | What it caps |
|---|---|---|
| `getSkaterStats()` | `limit=500` | Skater stats rows returned |
| `getGoalieStats()` | `limit=500` | Goalie stats rows returned |
| `getTopScorers()` | `limit=100` | Top scorers rows returned |
| `getScorebar()` | `daysBack=3, daysAhead=3` | Scorebar window (default call from home page) |

**Symptom:** Data beyond the slice/limit is silently dropped. Users see no
indication that more data exists (no "show more" or pagination).

**Fix:** Add pagination or "show all" toggles. Increase `limit` params if the
upstream supports it. For PBP, 100 events covers most games but may truncate
overtime or high-event games.

---

## 8. Memory Profile

| Factor | Detail |
|---|---|
| Build output | `output: "standalone"` in `next.config.mjs` -- minimal node_modules copied |
| ISR cache | Stored in-memory by default (no external cache configured) |
| ISR cache growth | One cached entry per unique route + one per unique fetch response |
| Client components | Only 2: `error.tsx` and `live-scoreboard.tsx` -- minimal client JS bundle |
| SSE proxy | Each `/api/live` connection holds a `ReadableStream` pipe in memory for the duration of the game |

**Symptom:** On long-running instances with many cached routes, memory grows
monotonically. SSE connections during game days add per-connection overhead.

**Fix:** Set `isrMemoryCacheSize` in `next.config.mjs` to cap the in-memory
ISR cache (e.g., `isrMemoryCacheSize: 50 * 1024 * 1024` for 50 MB). For
production, use an external ISR cache handler. Monitor RSS and set container
memory limits with restart policies.
