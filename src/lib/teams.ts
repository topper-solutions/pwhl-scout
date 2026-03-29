export interface TeamMeta {
  id: number;
  abbr: string;
  name: string;
  city: string;
  color: string;
  colorAlt: string;
  logo: string;
}

export const TEAMS: Record<number, TeamMeta> = {
  1: {
    id: 1,
    abbr: "BOS",
    name: "Fleet",
    city: "Boston",
    color: "#154734",
    colorAlt: "#C5B783",
    logo: "https://assets.leaguestat.com/pwhl/logos/1.png",
  },
  2: {
    id: 2,
    abbr: "MIN",
    name: "Frost",
    city: "Minnesota",
    color: "#2E8B57",
    colorAlt: "#B0C4DE",
    logo: "https://assets.leaguestat.com/pwhl/logos/2.jpg",
  },
  3: {
    id: 3,
    abbr: "MTL",
    name: "Victoire",
    city: "Montréal",
    color: "#862633",
    colorAlt: "#FFFFFF",
    logo: "https://assets.leaguestat.com/pwhl/logos/3.png",
  },
  4: {
    id: 4,
    abbr: "NY",
    name: "Sirens",
    city: "New York",
    color: "#FF6B35",
    colorAlt: "#1B3A5C",
    logo: "https://assets.leaguestat.com/pwhl/logos/4.png",
  },
  5: {
    id: 5,
    abbr: "OTT",
    name: "Charge",
    city: "Ottawa",
    color: "#C8102E",
    colorAlt: "#1D1D1B",
    logo: "https://assets.leaguestat.com/pwhl/logos/5.png",
  },
  6: {
    id: 6,
    abbr: "TOR",
    name: "Sceptres",
    city: "Toronto",
    color: "#00205B",
    colorAlt: "#C4A14A",
    logo: "https://assets.leaguestat.com/pwhl/logos/6.png",
  },
  8: {
    id: 8,
    abbr: "SEA",
    name: "Torrent",
    city: "Seattle",
    color: "#003D5C",
    colorAlt: "#69BE94",
    logo: "https://assets.leaguestat.com/pwhl/logos/8.png",
  },
  9: {
    id: 9,
    abbr: "VAN",
    name: "Goldeneyes",
    city: "Vancouver",
    color: "#00843D",
    colorAlt: "#FFD700",
    logo: "https://assets.leaguestat.com/pwhl/logos/9.png",
  },
};

// Also map by team code and city for API responses
const TEAMS_BY_CODE: Record<string, TeamMeta> = {};
const TEAMS_BY_CITY: Record<string, TeamMeta> = {};
for (const t of Object.values(TEAMS)) {
  TEAMS_BY_CODE[t.abbr] = t;
  TEAMS_BY_CITY[t.city.toLowerCase()] = t;
}
// Handle alternate city spellings
TEAMS_BY_CITY["montreal"] = TEAMS_BY_CITY["montréal"];

export function getTeamMeta(id: number | string): TeamMeta {
  const strId = String(id);
  // Try numeric ID first
  const numId = parseInt(strId, 10);
  if (TEAMS[numId]) return TEAMS[numId];
  // Try team code
  if (TEAMS_BY_CODE[strId.toUpperCase()]) return TEAMS_BY_CODE[strId.toUpperCase()];
  // Try city name
  if (TEAMS_BY_CITY[strId.toLowerCase()]) return TEAMS_BY_CITY[strId.toLowerCase()];
  return {
    id: numId || 0,
    abbr: strId.length <= 3 ? strId.toUpperCase() : "???",
    name: "Unknown",
    city: "Unknown",
    color: "#666666",
    colorAlt: "#999999",
    logo: "",
  };
}

export function getTeamByAbbr(abbr: string): TeamMeta | undefined {
  return TEAMS_BY_CODE[abbr.toUpperCase()];
}

export const TEAM_LIST = Object.values(TEAMS);
