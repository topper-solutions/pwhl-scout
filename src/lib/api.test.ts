// Env vars set in vitest.config.ts so they're available at module load time.
// Suppress validateEnv() and parseHockeyTechResponse warning output.
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => {
  vi.restoreAllMocks();
});

import {
  extractSiteKit,
  parseHockeyTechResponse,
  getScorebar,
  getSeasonSchedule,
  getTeamSchedule,
  getStandings,
  getGameSummary,
  getPlayByPlay,
  getSkaterStats,
  getGoalieStats,
  getTopScorers,
  getTeamRoster,
  getTeams,
  getSeasons,
  getLiveData,
  getLiveClock,
  getLiveGoals,
  getLivePenalties,
  getLiveShots,
} from "./api";

// --- extractSiteKit tests ---

describe("extractSiteKit", () => {
  it("extracts from SiteKit wrapper", () => {
    const data = { SiteKit: { Scorebar: [{ id: 1 }] } };
    expect(extractSiteKit(data, "Scorebar")).toEqual([{ id: 1 }]);
  });

  it("extracts from direct property", () => {
    const data = { Schedule: [{ id: 1 }] };
    expect(extractSiteKit(data, "Schedule")).toEqual([{ id: 1 }]);
  });

  it("extracts from array with SiteKit", () => {
    const data = [{ SiteKit: { Scorebar: [{ id: 1 }] } }];
    expect(extractSiteKit(data, "Scorebar")).toEqual([{ id: 1 }]);
  });

  it("extracts from GC wrapper", () => {
    const data = { GC: { Gamesummary: { home: "team1" } } };
    expect(extractSiteKit(data, "Gamesummary")).toEqual({ home: "team1" });
  });

  it("extracts from sections-based response", () => {
    const data = [
      {
        sections: [
          {
            data: [
              { row: { name: "Player1" } },
              { name: "Player2" },
            ],
          },
        ],
      },
    ];
    const result = extractSiteKit(data, "Players");
    expect(result).toEqual([{ name: "Player1" }, { name: "Player2" }]);
  });

  it("returns null for null input", () => {
    expect(extractSiteKit(null, "Anything")).toBeNull();
  });

  it("returns raw data when no wrapper matches", () => {
    const data = { someOtherKey: "value" };
    expect(extractSiteKit(data, "Missing")).toEqual(data);
  });
});

// --- parseHockeyTechResponse tests ---

describe("parseHockeyTechResponse", () => {
  it("parses named JSONP callback", () => {
    expect(parseHockeyTechResponse('Modulekit.callback({"key":"value"})')).toEqual({ key: "value" });
  });

  it("parses anonymous JSONP wrapper", () => {
    expect(parseHockeyTechResponse('([{"id":1}])')).toEqual([{ id: 1 }]);
  });

  it("parses raw JSON object", () => {
    expect(parseHockeyTechResponse('{"key":"value"}')).toEqual({ key: "value" });
  });

  it("parses raw JSON array", () => {
    expect(parseHockeyTechResponse("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("trims whitespace", () => {
    expect(parseHockeyTechResponse('  {"key":"value"}  ')).toEqual({ key: "value" });
  });

  it("warns on non-standard format before parsing", () => {
    expect(() => parseHockeyTechResponse("not json")).toThrow();
    expect(console.warn).toHaveBeenCalled();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseHockeyTechResponse("{broken")).toThrow();
  });
});

// --- Helpers for async tests ---

function mockFetchResponse(body: string, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Internal Server Error",
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  });
}

function siteKitResponse(viewKey: string, data: unknown) {
  return JSON.stringify({ SiteKit: { [viewKey]: data } });
}

function gcResponse(viewKey: string, data: unknown) {
  return JSON.stringify({ GC: { [viewKey]: data } });
}

function sectionsResponse(data: unknown[]) {
  // statviewfeed endpoints return JSONP-wrapped array with sections structure
  const inner = [{ sections: [{ data: data.map((d) => ({ row: d })) }] }];
  return `(${JSON.stringify(inner)})`;
}

// --- htFetch-based API function tests ---

describe("HockeyTech API functions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getScorebar", () => {
    it("returns scorebar array from SiteKit wrapper", async () => {
      const games = [{ ID: "1" }, { ID: "2" }];
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Scorebar", games)));
      const result = await getScorebar(3, 3);
      expect(result).toEqual(games);
      expect(fetch).toHaveBeenCalledOnce();
    });

    it("returns empty array when Scorebar is not an array", async () => {
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Scorebar", "not-array")));
      const result = await getScorebar();
      expect(result).toEqual([]);
    });

    it("throws on non-2xx response", async () => {
      vi.stubGlobal("fetch", mockFetchResponse("{}", false, 500));
      await expect(getScorebar()).rejects.toThrow("HockeyTech API error: 500");
    });
  });

  describe("getSeasonSchedule", () => {
    it("returns schedule array", async () => {
      const games = [{ game_id: "210" }];
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Schedule", games)));
      const result = await getSeasonSchedule();
      expect(result).toEqual(games);
    });
  });

  describe("getTeamSchedule", () => {
    it("returns team schedule from sections response", async () => {
      const games = [{ game_id: "210", home_team_city: "Boston" }];
      vi.stubGlobal("fetch", mockFetchResponse(sectionsResponse(games)));
      const result = await getTeamSchedule(1);
      expect(result).toEqual(games);
    });
  });

  describe("getStandings", () => {
    it("returns standings filtered to rows with team_id", async () => {
      const rows = [
        { repeatheader: 1, name: "PWHL" },
        { team_id: "1", team_name: "Boston Fleet", points: "48" },
        { team_id: "3", team_name: "Montréal Victoire", points: "46" },
      ];
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Statviewtype", rows)));
      const result = await getStandings();
      expect(result).toHaveLength(2);
      expect(result[0].team_name).toBe("Boston Fleet");
    });
  });

  describe("getGameSummary", () => {
    it("returns game summary from GC wrapper", async () => {
      const summary = { home: { team_id: "2" }, visitor: { team_id: "1" } };
      vi.stubGlobal("fetch", mockFetchResponse(gcResponse("Gamesummary", summary)));
      const result = await getGameSummary(302);
      expect(result).toEqual(summary);
    });
  });

  describe("getPlayByPlay", () => {
    it("returns PBP array from GC wrapper", async () => {
      const events = [{ event: "goal" }, { event: "faceoff" }];
      vi.stubGlobal("fetch", mockFetchResponse(gcResponse("Pxpverbose", events)));
      const result = await getPlayByPlay(302);
      expect(result).toEqual(events);
    });

    it("returns empty array when Pxpverbose is not an array", async () => {
      vi.stubGlobal("fetch", mockFetchResponse(gcResponse("Pxpverbose", null)));
      const result = await getPlayByPlay(302);
      expect(result).toEqual([]);
    });
  });

  describe("getSkaterStats", () => {
    it("returns players from sections response", async () => {
      const players = [{ name: "Kelly Pannek", points: "22" }];
      vi.stubGlobal("fetch", mockFetchResponse(sectionsResponse(players)));
      const result = await getSkaterStats();
      expect(result).toEqual(players);
    });
  });

  describe("getGoalieStats", () => {
    it("returns goalies from sections response", async () => {
      const goalies = [{ name: "Ann-Renée Desbiens", gaa: "1.50" }];
      vi.stubGlobal("fetch", mockFetchResponse(sectionsResponse(goalies)));
      const result = await getGoalieStats();
      expect(result).toEqual(goalies);
    });
  });

  describe("getTopScorers", () => {
    it("filters to entries with player name fields", async () => {
      const rows = [
        { player_name: "Kelly Pannek", points: "22" },
        { repeatheader: 1 },
      ];
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Statviewtype", rows)));
      const result = await getTopScorers();
      expect(result).toHaveLength(1);
      expect(result[0].player_name).toBe("Kelly Pannek");
    });
  });

  describe("getTeams", () => {
    it("returns teams data", async () => {
      const teams = [{ id: "1", code: "BOS" }];
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Teamsbyseason", teams)));
      const result = await getTeams();
      expect(result).toEqual(teams);
    });
  });

  describe("getTeamRoster", () => {
    it("returns filtered roster excluding non-player entries", async () => {
      const roster = [
        { first_name: "Marie-Philip", last_name: "Poulin", position: "F" },
        [1, 2, 3],
      ];
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Roster", roster)));
      const result = await getTeamRoster(3);
      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe("Marie-Philip");
    });

    it("returns empty array when Roster is not an array", async () => {
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Roster", null)));
      const result = await getTeamRoster(3);
      expect(result).toEqual([]);
    });

    it("flattens sections-based roster", async () => {
      const roster = [
        {
          first_name: "wrapper",
          sections: [
            { data: [{ first_name: "A" }, { first_name: "B" }] },
          ],
        },
      ];
      vi.stubGlobal("fetch", mockFetchResponse(siteKitResponse("Roster", roster)));
      const result = await getTeamRoster(3);
      expect(result).toEqual([{ first_name: "A" }, { first_name: "B" }]);
    });
  });

  describe("getSeasons", () => {
    it("returns raw htFetch result", async () => {
      const seasons = { SiteKit: { Seasons: [{ season_id: "8" }] } };
      vi.stubGlobal("fetch", mockFetchResponse(JSON.stringify(seasons)));
      const result = await getSeasons();
      expect(result).toEqual(seasons);
    });
  });
});

// --- Firebase API function tests ---

describe("Firebase API functions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getLiveData returns parsed JSON", async () => {
    const data = { runningclock: { games: {} } };
    vi.stubGlobal("fetch", mockFetchResponse(JSON.stringify(data)));
    const result = await getLiveData();
    expect(result).toEqual(data);
  });

  it("getLiveClock returns parsed JSON", async () => {
    const data = { games: { "302": { Clock: { Minutes: "05" } } } };
    vi.stubGlobal("fetch", mockFetchResponse(JSON.stringify(data)));
    const result = await getLiveClock();
    expect(result).toEqual(data);
  });

  it("getLiveGoals returns parsed JSON", async () => {
    const data = [null, { games: {} }];
    vi.stubGlobal("fetch", mockFetchResponse(JSON.stringify(data)));
    const result = await getLiveGoals();
    expect(result).toEqual(data);
  });

  it("getLivePenalties returns parsed JSON", async () => {
    const data = [null, { games: {} }];
    vi.stubGlobal("fetch", mockFetchResponse(JSON.stringify(data)));
    const result = await getLivePenalties();
    expect(result).toEqual(data);
  });

  it("getLiveShots returns parsed JSON", async () => {
    const data = [null, { games: {} }];
    vi.stubGlobal("fetch", mockFetchResponse(JSON.stringify(data)));
    const result = await getLiveShots();
    expect(result).toEqual(data);
  });

  it("throws on non-2xx Firebase response", async () => {
    vi.stubGlobal("fetch", mockFetchResponse("{}", false, 401));
    await expect(getLiveData()).rejects.toThrow("Firebase API error: 401");
  });
});
