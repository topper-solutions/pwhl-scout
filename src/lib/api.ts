// SECURITY NOTE: These APIs require credentials as URL query parameters.
// This is inherent to the HockeyTech and Firebase REST APIs — there is no
// header-based auth option. All fetch calls are server-side only (no "use client"
// directive, no NEXT_PUBLIC_ prefix), so credentials never reach the client bundle.
// The keys themselves are publicly visible in thepwhl.com's client-side JS.
// Ensure logging/monitoring tools strip query params from these request URLs.
const HOCKEYTECH_BASE = "https://lscluster.hockeytech.com/feed/index.php";
const HOCKEYTECH_KEY = process.env.HOCKEYTECH_API_KEY;
const HOCKEYTECH_CLIENT = process.env.HOCKEYTECH_CLIENT_CODE ?? "pwhl";

const FIREBASE_BASE = "https://leaguestat-b9523.firebaseio.com/svf/pwhl";
const FIREBASE_AUTH_TOKEN = process.env.FIREBASE_AUTH_TOKEN;
const FIREBASE_KEY = process.env.FIREBASE_API_KEY;

const FETCH_TIMEOUT_MS = 10_000;

export const CURRENT_SEASON_ID = 8;

// Validate required env vars at module load — fails fast at startup
function validateEnv() {
  const missing: string[] = [];
  if (!HOCKEYTECH_KEY) missing.push("HOCKEYTECH_API_KEY");
  if (!FIREBASE_AUTH_TOKEN) missing.push("FIREBASE_AUTH_TOKEN");
  if (!FIREBASE_KEY) missing.push("FIREBASE_API_KEY");
  if (missing.length > 0) {
    console.error(
      `[api] Missing required environment variables: ${missing.join(", ")}. See .env.example`
    );
  }
}
validateEnv();

import type {
  ScorebarGame,
  StandingsRow,
  PlayerStatsRow,
  ScheduleGame,
  GameSummary,
  PbpEvent,
  RosterPlayer,
} from "./types";

// Extract data from HockeyTech SiteKit wrapper.
// Response shape is either {SiteKit: {ViewName: data}} or just raw data.
export function extractSiteKit(data: unknown, viewKey: string): unknown {
  if (!data) return null;
  const d = data as Record<string, unknown>;
  // Direct SiteKit wrapper
  const siteKit = d.SiteKit as Record<string, unknown> | undefined;
  if (siteKit?.[viewKey] !== undefined) return siteKit[viewKey];
  // Maybe it's already the data
  if (d[viewKey] !== undefined) return d[viewKey];
  // Array wrapper (some endpoints)
  if (Array.isArray(data)) {
    const first = data[0] as Record<string, unknown> | undefined;
    const firstSiteKit = first?.SiteKit as Record<string, unknown> | undefined;
    if (firstSiteKit?.[viewKey] !== undefined) return firstSiteKit[viewKey];
  }
  // GC wrapper (game center endpoints)
  const gc = d.GC as Record<string, unknown> | undefined;
  if (gc?.[viewKey] !== undefined) return gc[viewKey];
  // Sections-based response (statviewfeed endpoints): [{sections: [{data: [{row: {...}}]}]}]
  if (Array.isArray(data)) {
    const first = data[0] as Record<string, unknown> | undefined;
    const sections = first?.sections as Array<Record<string, unknown>> | undefined;
    const sectionData = sections?.[0]?.data as Array<Record<string, unknown>> | undefined;
    if (sectionData) {
      return sectionData.map((item) => (item.row as Record<string, unknown>) ?? item);
    }
  }
  return data;
}

export function parseHockeyTechResponse(body: string) {
  const trimmed = body.trim();
  // JSONP with named callback: Modulekit.callback({...})
  const namedMatch = trimmed.match(/^\w+\.callback\(([\s\S]+)\)$/);
  if (namedMatch) return JSON.parse(namedMatch[1]);
  // JSONP with anonymous wrapper: ([{...}])
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return JSON.parse(trimmed.slice(1, -1));
  }
  // Attempt raw JSON parse — log if it doesn't look like standard JSON
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    console.warn(
      "[api] HockeyTech response is not recognized JSON or JSONP format. " +
      `First 100 chars: ${trimmed.slice(0, 100)}`
    );
  }
  return JSON.parse(trimmed);
}

function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// Rate limiting: Next.js ISR (revalidate: 60) limits upstream calls to at most
// once per 60 seconds per route per server instance. For higher traffic, consider
// adding a circuit breaker to stop calling a failing upstream after repeated errors.
async function htFetch(params: string) {
  if (!HOCKEYTECH_KEY) throw new Error("HOCKEYTECH_API_KEY is not set");
  const url = `${HOCKEYTECH_BASE}?${params}&key=${HOCKEYTECH_KEY}&client_code=${HOCKEYTECH_CLIENT}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HockeyTech API error: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseHockeyTechResponse(text);
}

async function firebaseFetch(path: string) {
  if (!FIREBASE_AUTH_TOKEN || !FIREBASE_KEY) {
    throw new Error("Firebase credentials are not set");
  }
  const url = `${FIREBASE_BASE}${path}.json?auth=${FIREBASE_AUTH_TOKEN}&key=${FIREBASE_KEY}`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Firebase API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Scorebar ---
export async function getScorebar(daysBack = 1, daysAhead = 1): Promise<ScorebarGame[]> {
  const data = await htFetch(
    `feed=modulekit&view=scorebar&numberofdaysback=${daysBack}&numberofdaysahead=${daysAhead}`
  );
  return ensureArray(extractSiteKit(data, "Scorebar")) as ScorebarGame[];
}

// --- Schedule ---
export async function getSeasonSchedule(seasonId = CURRENT_SEASON_ID): Promise<ScheduleGame[]> {
  const data = await htFetch(`feed=modulekit&view=schedule&season_id=${seasonId}`);
  return ensureArray(extractSiteKit(data, "Schedule")) as ScheduleGame[];
}

export async function getTeamSchedule(
  teamId: number,
  seasonId = CURRENT_SEASON_ID
): Promise<ScheduleGame[]> {
  const data = await htFetch(
    `feed=statviewfeed&view=schedule&team=${teamId}&season=${seasonId}&month=-1`
  );
  return ensureArray(extractSiteKit(data, "Schedule")) as ScheduleGame[];
}

// --- Standings ---
export async function getStandings(seasonId = CURRENT_SEASON_ID): Promise<StandingsRow[]> {
  const data = await htFetch(
    `feed=modulekit&view=statviewtype&stat=conference&type=standings&season_id=${seasonId}`
  );
  return ensureArray(extractSiteKit(data, "Statviewtype")).filter(
    (r): r is StandingsRow => typeof r === "object" && r !== null && "team_id" in r
  );
}

// --- Game Detail ---
export async function getGameSummary(gameId: number): Promise<GameSummary> {
  const data = await htFetch(
    `feed=gc&tab=gamesummary&game_id=${gameId}&site_id=0&lang=en`
  );
  return extractSiteKit(data, "Gamesummary") as GameSummary;
}

export async function getGameClock(gameId: number): Promise<unknown> {
  return htFetch(`feed=gc&tab=clock&game_id=${gameId}`);
}

export async function getPlayByPlay(gameId: number): Promise<PbpEvent[]> {
  const data = await htFetch(`feed=gc&tab=pxpverbose&game_id=${gameId}`);
  return ensureArray(extractSiteKit(data, "Pxpverbose")) as PbpEvent[];
}

export async function getGamePreview(gameId: number): Promise<unknown> {
  return htFetch(`feed=gc&tab=preview&game_id=${gameId}`);
}

// --- Player Stats ---
export async function getSkaterStats(seasonId = CURRENT_SEASON_ID): Promise<PlayerStatsRow[]> {
  const data = await htFetch(
    `feed=statviewfeed&view=players&season=${seasonId}&team=all&position=skaters&rookies=0&statsType=standard&rosterstatus=undefined&site_id=0&league_id=1&lang=en&division=-1&conference=-1&limit=500&sort=points`
  );
  return ensureArray(extractSiteKit(data, "Players")) as PlayerStatsRow[];
}

export async function getGoalieStats(seasonId = CURRENT_SEASON_ID): Promise<PlayerStatsRow[]> {
  const data = await htFetch(
    `feed=statviewfeed&view=players&season=${seasonId}&team=all&position=goalies&rookies=0&statsType=standard&rosterstatus=undefined&site_id=0&first=0&limit=500&sort=gaa&league_id=1&lang=en&division=-1&conference=-1&qualified=all`
  );
  return ensureArray(extractSiteKit(data, "Players")) as PlayerStatsRow[];
}

export async function getTopScorers(seasonId = CURRENT_SEASON_ID): Promise<PlayerStatsRow[]> {
  const data = await htFetch(
    `feed=modulekit&view=statviewtype&type=topscorers&first=0&limit=100&season_id=${seasonId}`
  );
  return ensureArray(extractSiteKit(data, "Statviewtype")).filter(
    (r): r is PlayerStatsRow => {
      const row = r as Record<string, unknown>;
      return !!(row.player_name || row.name || row.first_name);
    }
  );
}

// --- Teams ---
export async function getTeams(seasonId = CURRENT_SEASON_ID): Promise<unknown> {
  const data = await htFetch(
    `feed=modulekit&view=teamsbyseason&season_id=${seasonId}`
  );
  return extractSiteKit(data, "Teamsbyseason");
}

export async function getTeamRoster(
  teamId: number,
  seasonId = CURRENT_SEASON_ID
): Promise<RosterPlayer[]> {
  const data = await htFetch(
    `feed=modulekit&view=roster&team_id=${teamId}&season_id=${seasonId}`
  );
  const raw = ensureArray(extractSiteKit(data, "Roster"));
  if (raw.length === 0) return [];
  const roster = raw.filter(
    (p): p is Record<string, unknown> =>
      typeof p === "object" && p !== null && !Array.isArray(p) && "first_name" in p
  );
  if (roster.length > 0 && roster[0]?.sections) {
    const sections = roster[0].sections as Array<Record<string, unknown>>;
    return sections.flatMap((s) => (s.data ?? []) as RosterPlayer[]);
  }
  return roster as unknown as RosterPlayer[];
}

// --- Players ---
export async function getPlayerProfile(playerId: number): Promise<unknown> {
  return htFetch(
    `feed=modulekit&view=player&category=profile&player_id=${playerId}`
  );
}

export async function getPlayerGameByGame(
  playerId: number,
  seasonId = CURRENT_SEASON_ID
): Promise<unknown> {
  return htFetch(
    `feed=modulekit&view=player&category=gamebygame&season_id=${seasonId}&player_id=${playerId}`
  );
}

// --- Seasons ---
export async function getSeasons(): Promise<unknown> {
  return htFetch("feed=modulekit&view=seasons");
}

// --- Firebase Live ---
export async function getLiveData(): Promise<unknown> {
  return firebaseFetch("");
}

export async function getLiveClock(): Promise<unknown> {
  return firebaseFetch("/runningclock");
}

export async function getLiveGoals(): Promise<unknown> {
  return firebaseFetch("/goals");
}

export async function getLivePenalties(): Promise<unknown> {
  return firebaseFetch("/penalties");
}

export async function getLiveShots(): Promise<unknown> {
  return firebaseFetch("/shotssummary");
}
