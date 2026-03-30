import { extractGameData } from "./extract-game-data";
import type { ExtractedGameData, LivePenalty } from "./extract-game-data";

const GAME_KEY = "100";
const HOME_TEAM_ID = "1";

/** Helper to build a minimal Firebase tree with clock data. */
function makeData(overrides: Record<string, unknown> = {}) {
  return {
    runningclock: {
      [GAME_KEY]: {
        Clock: { Minutes: "15", Seconds: "00", period: "1" },
      },
    },
    ...overrides,
  };
}

/** Helper to build a penalty entry. */
function makePenalty(overrides: Record<string, unknown> = {}) {
  return {
    Period: "1",
    Time: "18:00",
    Minutes: 2,
    Home: true,
    PenalizedPlayerFirstName: "Jane",
    PenalizedPlayerLastName: "Doe",
    PenalizedPlayerJerseyNumber: 12,
    OffenceDescription: "Tripping",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Clock parsing
// ---------------------------------------------------------------------------
describe("clock parsing", () => {
  it("parses a valid clock with minutes and seconds", () => {
    const result = extractGameData(makeData(), GAME_KEY, HOME_TEAM_ID);
    expect(result.clock).toBe("15:00");
    expect(result.period).toBe("1");
  });

  it("defaults missing Minutes/Seconds to 00", () => {
    const data = {
      runningclock: { [GAME_KEY]: { Clock: { period: "2" } } },
    };
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.clock).toBe("00:00");
    expect(result.period).toBe("2");
  });

  it("returns null clock when clock data is missing", () => {
    const result = extractGameData({ runningclock: {} }, GAME_KEY, HOME_TEAM_ID);
    expect(result.clock).toBeNull();
    expect(result.period).toBeNull();
  });

  it("returns null clock when data is null", () => {
    const result = extractGameData(null, GAME_KEY, HOME_TEAM_ID);
    expect(result.clock).toBeNull();
    expect(result.period).toBeNull();
  });

  it("returns null clock when data is undefined", () => {
    const result = extractGameData(undefined, GAME_KEY, HOME_TEAM_ID);
    expect(result.clock).toBeNull();
  });

  it("handles runningclock with nested games key", () => {
    const data = {
      runningclock: {
        games: { [GAME_KEY]: { Clock: { Minutes: "05", Seconds: "30", period: "3" } } },
      },
    };
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.clock).toBe("05:30");
    expect(result.period).toBe("3");
  });
});

// ---------------------------------------------------------------------------
// Goal counting
// ---------------------------------------------------------------------------
describe("goal counting", () => {
  it("counts home goals only", () => {
    const data = makeData({
      goals: {
        games: {
          [GAME_KEY]: {
            GameGoals: { g1: { IsHome: true }, g2: { IsHome: true } },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeGoals).toBe(2);
    expect(result.visitorGoals).toBe(0);
  });

  it("counts visitor goals only", () => {
    const data = makeData({
      goals: {
        games: {
          [GAME_KEY]: {
            GameGoals: { g1: { IsHome: false }, g2: { IsHome: false } },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeGoals).toBe(0);
    expect(result.visitorGoals).toBe(2);
  });

  it("counts mixed home and visitor goals", () => {
    const data = makeData({
      goals: {
        games: {
          [GAME_KEY]: {
            GameGoals: {
              g1: { IsHome: true },
              g2: { IsHome: false },
              g3: { IsHome: true },
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeGoals).toBe(2);
    expect(result.visitorGoals).toBe(1);
  });

  it("returns zero goals when GameGoals is empty", () => {
    const data = makeData({
      goals: { games: { [GAME_KEY]: { GameGoals: {} } } },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeGoals).toBe(0);
    expect(result.visitorGoals).toBe(0);
  });

  it("returns zero goals when goals is null", () => {
    const data = makeData({ goals: null });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeGoals).toBe(0);
    expect(result.visitorGoals).toBe(0);
  });

  it("handles array-wrapped goals root", () => {
    const data = makeData({
      goals: [
        { games: { [GAME_KEY]: { GameGoals: { g1: { IsHome: true } } } } },
      ],
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeGoals).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Shot counting
// ---------------------------------------------------------------------------
describe("shot counting", () => {
  it("reads direct HomeShots/VisitorShots fields", () => {
    const data = makeData({
      shotssummary: {
        games: {
          [GAME_KEY]: { GameShotSummary: { HomeShots: 25, VisitorShots: 18 } },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeShots).toBe(25);
    expect(result.visitorShots).toBe(18);
  });

  it("accumulates per-period shots by team ID", () => {
    const data = makeData({
      shotssummary: {
        games: {
          [GAME_KEY]: {
            GameShotSummary: {
              P1: { "1": 8, "2": 6 },
              P2: { "1": 10, "2": 7 },
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeShots).toBe(18);  // 8 + 10
    expect(result.visitorShots).toBe(13);  // 6 + 7
  });

  it("returns zero shots when shotssummary is empty", () => {
    const data = makeData({
      shotssummary: { games: { [GAME_KEY]: { GameShotSummary: {} } } },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeShots).toBe(0);
    expect(result.visitorShots).toBe(0);
  });

  it("returns zero shots for non-numeric values", () => {
    const data = makeData({
      shotssummary: {
        games: {
          [GAME_KEY]: { GameShotSummary: { HomeShots: "abc", VisitorShots: null } },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeShots).toBe(0);
    expect(result.visitorShots).toBe(0);
  });

  it("handles array-wrapped shots root", () => {
    const data = makeData({
      shotssummary: [
        { games: { [GAME_KEY]: { GameShotSummary: { HomeShots: 12, VisitorShots: 9 } } } },
      ],
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeShots).toBe(12);
    expect(result.visitorShots).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// Penalty remaining time
// ---------------------------------------------------------------------------
describe("penalty remaining time", () => {
  it("calculates remaining seconds for a basic minor penalty", () => {
    // Clock at 15:00 in P1 => elapsed = 300s. Penalty at 18:00 P1 => penGameSec = 120s.
    // Expiry = 120 + 120 = 240s. Since 300 > 240 the penalty is expired.
    // Use a penalty at 16:00 instead => penGameSec = 240s. Expiry = 240 + 120 = 360s.
    // Remaining = 360 - 300 = 60s.
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1" }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
    expect(result.homePenalties[0].remainingSeconds).toBe(60);
  });

  it("handles cross-period penalty carry-over", () => {
    // Penalty at 00:30 in P1 => penGameSec = 1170. Expiry = 1170 + 120 = 1290.
    // Clock at 19:00 P2 => gameElapsed = 1200 + 60 = 1260.
    // Remaining = 1290 - 1260 = 30s.
    const data = {
      runningclock: {
        [GAME_KEY]: {
          Clock: { Minutes: "19", Seconds: "00", period: "2" },
        },
      },
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "00:30", Period: "1" }),
            },
          },
        },
      },
    };
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
    expect(result.homePenalties[0].remainingSeconds).toBe(30);
  });

  it("excludes expired penalties", () => {
    // Penalty at 18:00 P1 => penGameSec = 120. Expiry = 120 + 120 = 240.
    // Clock at 15:00 P1 => elapsed = 300. 300 >= 240 => expired.
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "18:00", Period: "1" }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(0);
  });

  it("skips penalties when clock is missing", () => {
    const data = {
      runningclock: {},
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty(),
            },
          },
        },
      },
    };
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(0);
    expect(result.visitorPenalties).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PP goal termination
// ---------------------------------------------------------------------------
describe("PP goal termination", () => {
  it("terminates a minor penalty early on a PP goal", () => {
    // Home penalty at 16:00 P1 => penGameSec = 240. Normal expiry = 360.
    // PP goal (visitor scores, IsHome=false) at 15:30 P1 => gGameSec = 270.
    // New expiry = 270. Clock at 15:00 P1 => elapsed = 300. 300 >= 270 => expired.
    // But let's use clock at 15:40 => elapsed = 260. Remaining = 270 - 260 = 10.
    const data = {
      runningclock: {
        [GAME_KEY]: {
          Clock: { Minutes: "15", Seconds: "40", period: "1" },
        },
      },
      goals: {
        games: {
          [GAME_KEY]: {
            GameGoals: {
              g1: { IsHome: false, PowerPlay: true, Period: "1", Time: "15:30" },
            },
          },
        },
      },
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1", Home: true }),
            },
          },
        },
      },
    };
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
    expect(result.homePenalties[0].remainingSeconds).toBe(10);
  });

  it("does NOT terminate a major penalty on a PP goal", () => {
    // Major (5 min) at 16:00 P1 => penGameSec = 240. Expiry = 240 + 300 = 540.
    // PP goal at 15:30 P1 => 270. Should NOT terminate.
    // Clock at 15:00 P1 => elapsed = 300. Remaining = 540 - 300 = 240.
    const data = makeData({
      goals: {
        games: {
          [GAME_KEY]: {
            GameGoals: {
              g1: { IsHome: false, PowerPlay: true, Period: "1", Time: "15:30" },
            },
          },
        },
      },
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1", Minutes: 5, Home: true }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
    expect(result.homePenalties[0].remainingSeconds).toBe(240);
    expect(result.homePenalties[0].isMajor).toBe(true);
  });

  it("does NOT terminate a misconduct penalty on a PP goal", () => {
    // Misconduct (10 min) at 16:00 P1 => penGameSec = 240. Expiry = 240 + 600 = 840.
    // PP goal at 15:30 P1 => should NOT terminate.
    // Clock at 15:00 P1 => elapsed = 300. Remaining = 840 - 300 = 540.
    const data = makeData({
      goals: {
        games: {
          [GAME_KEY]: {
            GameGoals: {
              g1: { IsHome: false, PowerPlay: true, Period: "1", Time: "15:30" },
            },
          },
        },
      },
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1", Minutes: 10, Home: true }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
    expect(result.homePenalties[0].remainingSeconds).toBe(540);
    expect(result.homePenalties[0].isMisconduct).toBe(true);
  });

  it("PP goal after expiry has no effect on penalty", () => {
    // Minor at 16:00 P1 => penGameSec = 240. Expiry = 360.
    // PP goal at 13:00 P1 => gGameSec = 420. 420 > 360 => after expiry, no effect.
    // Clock at 15:00 P1 => elapsed = 300. Remaining = 360 - 300 = 60.
    const data = makeData({
      goals: {
        games: {
          [GAME_KEY]: {
            GameGoals: {
              g1: { IsHome: false, PowerPlay: true, Period: "1", Time: "13:00" },
            },
          },
        },
      },
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1", Home: true }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
    expect(result.homePenalties[0].remainingSeconds).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Coincidental penalties
// ---------------------------------------------------------------------------
describe("coincidental penalties", () => {
  it("marks matching opposite-team penalties as coincidental", () => {
    // Two penalties: same time (16:00 P1), same duration (2 min), opposite teams.
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1", Home: true }),
              p2: makePenalty({ Time: "16:00", Period: "1", Home: false }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
    expect(result.visitorPenalties).toHaveLength(1);
    expect(result.homePenalties[0].isCoincidental).toBe(true);
    expect(result.visitorPenalties[0].isCoincidental).toBe(true);
  });

  it("does NOT mark same-team penalties as coincidental", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1", Home: true }),
              p2: makePenalty({ Time: "16:00", Period: "1", Home: true, PenalizedPlayerLastName: "Smith" }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(2);
    expect(result.homePenalties[0].isCoincidental).toBe(false);
    expect(result.homePenalties[1].isCoincidental).toBe(false);
  });

  it("does NOT mark different-duration penalties as coincidental", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Period: "1", Minutes: 2, Home: true }),
              p2: makePenalty({ Time: "16:00", Period: "1", Minutes: 5, Home: false }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    const allPens = [...result.homePenalties, ...result.visitorPenalties];
    expect(allPens.every(p => !p.isCoincidental)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Penalty type flags
// ---------------------------------------------------------------------------
describe("penalty type flags", () => {
  it("classifies 2-minute penalty as minor", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: { p1: makePenalty({ Time: "16:00", Minutes: 2 }) },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties[0].isMajor).toBe(false);
    expect(result.homePenalties[0].isMisconduct).toBe(false);
    expect(result.homePenalties[0].minutes).toBe(2);
  });

  it("classifies 5-minute penalty as major", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: { p1: makePenalty({ Time: "16:00", Minutes: 5 }) },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties[0].isMajor).toBe(true);
    expect(result.homePenalties[0].isMisconduct).toBe(false);
  });

  it("classifies 10-minute penalty as misconduct", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: { p1: makePenalty({ Time: "16:00", Minutes: 10 }) },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties[0].isMisconduct).toBe(true);
    expect(result.homePenalties[0].isMajor).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Penalty player info
// ---------------------------------------------------------------------------
describe("penalty player info", () => {
  it("combines first and last name", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({
                Time: "16:00",
                PenalizedPlayerFirstName: "Marie-Philip",
                PenalizedPlayerLastName: "Poulin",
              }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties[0].playerName).toBe("Marie-Philip Poulin");
  });

  it("defaults missing name fields gracefully", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({
                Time: "16:00",
                PenalizedPlayerFirstName: undefined,
                PenalizedPlayerLastName: undefined,
              }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties[0].playerName).toBe("");
  });

  it("defaults jersey number to 0 when missing", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", PenalizedPlayerJerseyNumber: undefined }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties[0].jerseyNumber).toBe(0);
  });

  it("defaults offence to 'Penalty' when missing", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", OffenceDescription: undefined }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties[0].offence).toBe("Penalty");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("edge cases", () => {
  it("returns defaults for null data", () => {
    const result = extractGameData(null, GAME_KEY, HOME_TEAM_ID);
    expect(result).toEqual<ExtractedGameData>({
      clock: null,
      period: null,
      homeGoals: 0,
      visitorGoals: 0,
      homeShots: 0,
      visitorShots: 0,
      homePenalties: [],
      visitorPenalties: [],
    });
  });

  it("returns defaults for empty object", () => {
    const result = extractGameData({}, GAME_KEY, HOME_TEAM_ID);
    expect(result).toEqual<ExtractedGameData>({
      clock: null,
      period: null,
      homeGoals: 0,
      visitorGoals: 0,
      homeShots: 0,
      visitorShots: 0,
      homePenalties: [],
      visitorPenalties: [],
    });
  });

  it("handles a missing gameKey gracefully (no match)", () => {
    const data = makeData({
      goals: { games: { "999": { GameGoals: { g1: { IsHome: true } } } } },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homeGoals).toBe(0);
  });

  it("handles array-wrapped data roots", () => {
    const data = makeData({
      penalties: [
        {
          games: {
            [GAME_KEY]: {
              GamePenalties: {
                p1: makePenalty({ Time: "16:00" }),
              },
            },
          },
        },
      ],
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    expect(result.homePenalties).toHaveLength(1);
  });

  it("separates home and visitor penalties correctly", () => {
    const data = makeData({
      penalties: {
        games: {
          [GAME_KEY]: {
            GamePenalties: {
              p1: makePenalty({ Time: "16:00", Home: true }),
              p2: makePenalty({ Time: "16:00", Home: false, PenalizedPlayerLastName: "Away" }),
            },
          },
        },
      },
    });
    const result = extractGameData(data, GAME_KEY, HOME_TEAM_ID);
    // These are coincidental (same time, same duration, opposite teams)
    // but they should still be in separate arrays.
    expect(result.homePenalties).toHaveLength(1);
    expect(result.visitorPenalties).toHaveLength(1);
    expect(result.homePenalties[0].isHome).toBe(true);
    expect(result.visitorPenalties[0].isHome).toBe(false);
  });
});
