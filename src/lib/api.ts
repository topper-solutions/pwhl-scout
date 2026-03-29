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

/* eslint-disable @typescript-eslint/no-explicit-any */

// Extract data from HockeyTech SiteKit wrapper.
// Response shape is either {SiteKit: {ViewName: data}} or just raw data.
export function extractSiteKit(data: any, viewKey: string): any {
  if (!data) return null;
  // Direct SiteKit wrapper
  if (data?.SiteKit?.[viewKey] !== undefined) return data.SiteKit[viewKey];
  // Maybe it's already the data
  if (data?.[viewKey] !== undefined) return data[viewKey];
  // Array wrapper (some endpoints)
  if (Array.isArray(data) && data[0]?.SiteKit?.[viewKey] !== undefined) {
    return data[0].SiteKit[viewKey];
  }
  // GC wrapper (game center endpoints)
  if (data?.GC?.[viewKey] !== undefined) return data.GC[viewKey];
  // Sections-based response (statviewfeed endpoints): [{sections: [{data: [{row: {...}}]}]}]
  if (Array.isArray(data) && data[0]?.sections?.[0]?.data) {
    return data[0].sections[0].data.map((d: any) => d.row ?? d);
  }
  return data;
}

function parseHockeyTechResponse(body: string) {
  const trimmed = body.trim();
  // JSONP with named callback: Modulekit.callback({...})
  const namedMatch = trimmed.match(/^\w+\.callback\(([\s\S]+)\)$/);
  if (namedMatch) return JSON.parse(namedMatch[1]);
  // JSONP with anonymous wrapper: ([{...}])
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return JSON.parse(trimmed.slice(1, -1));
  }
  return JSON.parse(trimmed);
}

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
export async function getScorebar(daysBack = 1, daysAhead = 1) {
  return htFetch(
    `feed=modulekit&view=scorebar&numberofdaysback=${daysBack}&numberofdaysahead=${daysAhead}`
  );
}

// --- Schedule ---
export async function getSeasonSchedule(seasonId = CURRENT_SEASON_ID) {
  return htFetch(`feed=modulekit&view=schedule&season_id=${seasonId}`);
}

export async function getTeamSchedule(
  teamId: number,
  seasonId = CURRENT_SEASON_ID
) {
  return htFetch(
    `feed=statviewfeed&view=schedule&team=${teamId}&season=${seasonId}&month=-1`
  );
}

// --- Standings ---
export async function getStandings(seasonId = CURRENT_SEASON_ID) {
  return htFetch(
    `feed=modulekit&view=statviewtype&stat=conference&type=standings&season_id=${seasonId}`
  );
}

// --- Game Detail ---
export async function getGameSummary(gameId: number) {
  return htFetch(
    `feed=gc&tab=gamesummary&game_id=${gameId}&site_id=0&lang=en`
  );
}

export async function getGameClock(gameId: number) {
  return htFetch(`feed=gc&tab=clock&game_id=${gameId}`);
}

export async function getPlayByPlay(gameId: number) {
  return htFetch(`feed=gc&tab=pxpverbose&game_id=${gameId}`);
}

export async function getGamePreview(gameId: number) {
  return htFetch(`feed=gc&tab=preview&game_id=${gameId}`);
}

// --- Player Stats ---
export async function getSkaterStats(seasonId = CURRENT_SEASON_ID) {
  return htFetch(
    `feed=statviewfeed&view=players&season=${seasonId}&team=all&position=skaters&rookies=0&statsType=standard&rosterstatus=undefined&site_id=0&league_id=1&lang=en&division=-1&conference=-1&limit=500&sort=points`
  );
}

export async function getGoalieStats(seasonId = CURRENT_SEASON_ID) {
  return htFetch(
    `feed=statviewfeed&view=players&season=${seasonId}&team=all&position=goalies&rookies=0&statsType=standard&rosterstatus=undefined&site_id=0&first=0&limit=500&sort=gaa&league_id=1&lang=en&division=-1&conference=-1&qualified=all`
  );
}

export async function getTopScorers(seasonId = CURRENT_SEASON_ID) {
  return htFetch(
    `feed=modulekit&view=statviewtype&type=topscorers&first=0&limit=100&season_id=${seasonId}`
  );
}

// --- Teams ---
export async function getTeams(seasonId = CURRENT_SEASON_ID) {
  return htFetch(
    `feed=modulekit&view=teamsbyseason&season_id=${seasonId}`
  );
}

export async function getTeamRoster(
  teamId: number,
  seasonId = CURRENT_SEASON_ID
) {
  return htFetch(
    `feed=modulekit&view=roster&team_id=${teamId}&season_id=${seasonId}`
  );
}

// --- Players ---
export async function getPlayerProfile(playerId: number) {
  return htFetch(
    `feed=modulekit&view=player&category=profile&player_id=${playerId}`
  );
}

export async function getPlayerGameByGame(
  playerId: number,
  seasonId = CURRENT_SEASON_ID
) {
  return htFetch(
    `feed=modulekit&view=player&category=gamebygame&season_id=${seasonId}&player_id=${playerId}`
  );
}

// --- Seasons ---
export async function getSeasons() {
  return htFetch("feed=modulekit&view=seasons");
}

// --- Firebase Live ---
export async function getLiveData() {
  return firebaseFetch("");
}

export async function getLiveClock() {
  return firebaseFetch("/runningclock");
}

export async function getLiveGoals() {
  return firebaseFetch("/goals");
}

export async function getLivePenalties() {
  return firebaseFetch("/penalties");
}

export async function getLiveShots() {
  return firebaseFetch("/shotssummary");
}
