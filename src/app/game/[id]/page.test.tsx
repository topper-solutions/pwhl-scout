import { render, screen } from "@testing-library/react";
import { vi, type Mock } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/api", () => ({
  getGameSummary: vi.fn(),
  getPlayByPlay: vi.fn(),
}));

vi.mock("@/lib/teams", () => ({
  getTeamMeta: vi.fn((id: unknown) => {
    const numId = typeof id === "string" ? parseInt(id) : Number(id);
    if (numId === 2) {
      return {
        id: 2,
        abbr: "MIN",
        name: "Frost",
        city: "Minnesota",
        color: "#2E8B57",
        colorAlt: "#B0C4DE",
        logo: "",
      };
    }
    return {
      id: 1,
      abbr: "BOS",
      name: "Fleet",
      city: "Boston",
      color: "#154734",
      colorAlt: "#C5B783",
      logo: "",
    };
  }),
}));

vi.mock("@/components/team-logo", () => ({
  TeamLogo: ({ team }: { team: { abbr: string } }) => (
    <span data-testid="team-logo">{team.abbr}</span>
  ),
}));

vi.mock("@/components/live-scoreboard", () => ({
  LiveScoreboard: () => <div data-testid="live-scoreboard" />,
}));

import GamePage, { generateMetadata } from "./page";
import { getGameSummary, getPlayByPlay } from "@/lib/api";

function baseSummary(overrides: Record<string, unknown> = {}) {
  return {
    home: { team_id: "1", id: "1", name: "Boston Fleet" },
    visitor: { team_id: "2", id: "2", name: "Minnesota Frost" },
    totalGoals: { home: 3, visitor: 1 },
    goals: [],
    penalties: [],
    mvps: [],
    status_value: "Final",
    game_date: "2025-12-01",
    venue: "TD Garden",
    ...overrides,
  };
}

describe("GamePage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls notFound for invalid (NaN) game ID", async () => {
    await expect(
      GamePage({ params: Promise.resolve({ id: "abc" }) })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("renders fallback when summary rejects", async () => {
    (getGameSummary as Mock).mockRejectedValue(new Error("API down"));
    (getPlayByPlay as Mock).mockRejectedValue(new Error("API down"));

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByText("Game data not available")).toBeInTheDocument();
  });

  it("renders game page without PBP when PBP rejects", async () => {
    (getGameSummary as Mock).mockResolvedValue(baseSummary());
    (getPlayByPlay as Mock).mockRejectedValue(new Error("PBP down"));

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByTestId("live-scoreboard")).toBeInTheDocument();
    expect(screen.queryByText("Play-by-Play")).not.toBeInTheDocument();
  });

  it("renders full game page when both succeed", async () => {
    (getGameSummary as Mock).mockResolvedValue(
      baseSummary({
        goals: [
          {
            event: "goal",
            time: "5:30",
            team_id: "1",
            home: "1",
            period_id: "1",
            power_play: "0",
            short_handed: "0",
            empty_net: "0",
            goal_scorer: {
              player_id: "10",
              first_name: "Jane",
              last_name: "Doe",
              jersey_number: "9",
              team_id: "1",
              team_code: "BOS",
            },
            assist1_player: { player_id: null, first_name: null, last_name: null },
            assist2_player: { player_id: null, first_name: null, last_name: null },
          },
        ],
      })
    );
    (getPlayByPlay as Mock).mockResolvedValue([
      { event: "goal", time: "5:30", time_formatted: "5:30" },
    ]);

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByTestId("live-scoreboard")).toBeInTheDocument();
    expect(screen.getByText("Scoring Summary")).toBeInTheDocument();
    expect(screen.getByText("Play-by-Play")).toBeInTheDocument();
  });

  it("renders GoalRow with PP, SH, and EN badges", async () => {
    (getGameSummary as Mock).mockResolvedValue(
      baseSummary({
        goals: [
          {
            event: "goal",
            time: "10:00",
            team_id: "1",
            home: "1",
            period_id: "1",
            power_play: "1",
            short_handed: "0",
            empty_net: "0",
            goal_scorer: { player_id: "10", first_name: "Jane", last_name: "Doe" },
            assist1_player: { player_id: "11", first_name: "Alex", last_name: "Smith" },
            assist2_player: { player_id: "12", first_name: "Sam", last_name: "Lee" },
          },
          {
            event: "goal",
            time: "15:00",
            team_id: "2",
            home: "0",
            period_id: "2",
            power_play: "0",
            short_handed: "1",
            empty_net: "0",
            goal_scorer: { player_id: "20", first_name: "Kim", last_name: "Park" },
            assist1_player: { player_id: null, first_name: null, last_name: null },
            assist2_player: { player_id: null, first_name: null, last_name: null },
          },
          {
            event: "goal",
            time: "19:00",
            team_id: "1",
            home: "1",
            period_id: "3",
            power_play: "0",
            short_handed: "0",
            empty_net: "1",
            goal_scorer: { player_id: "30", first_name: "Erin", last_name: "Cole" },
            assist1_player: { player_id: null, first_name: null, last_name: null },
            assist2_player: { player_id: null, first_name: null, last_name: null },
          },
        ],
      })
    );
    (getPlayByPlay as Mock).mockResolvedValue([]);

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByText("PP")).toBeInTheDocument();
    expect(screen.getByText("SH")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText(/Assists:/)).toBeInTheDocument();
  });

  it("renders Three Stars section when mvps are present", async () => {
    (getGameSummary as Mock).mockResolvedValue(
      baseSummary({
        mvps: [
          { player_id: "10", first_name: "Jane", last_name: "Doe", jersey_number: "9", home: "1" },
          { player_id: "20", first_name: "Kim", last_name: "Park", jersey_number: "7", home: "0" },
          { player_id: "30", first_name: "Erin", last_name: "Cole", jersey_number: "5", home: "1" },
        ],
      })
    );
    (getPlayByPlay as Mock).mockResolvedValue([]);

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByText("Three Stars")).toBeInTheDocument();
    expect(screen.getByText("1st Star")).toBeInTheDocument();
    expect(screen.getByText("2nd Star")).toBeInTheDocument();
    expect(screen.getByText("3rd Star")).toBeInTheDocument();
  });

  it("renders Shots on Goal section when shot data is present", async () => {
    (getGameSummary as Mock).mockResolvedValue(
      baseSummary({
        shotsByPeriod: {
          visitor: { "1": 10, "2": 8, "3": 12 },
          home: { "1": 12, "2": 9, "3": 11 },
        },
        totalShots: { visitor: 30, home: 32 },
      })
    );
    (getPlayByPlay as Mock).mockResolvedValue([]);

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByText("Shots on Goal")).toBeInTheDocument();
  });

  it("renders Penalties section when penalties are present", async () => {
    (getGameSummary as Mock).mockResolvedValue(
      baseSummary({
        penalties: [
          {
            team_id: "1",
            player_penalized_info: { player_id: "10", first_name: "Jane", last_name: "Doe" },
            minutes_formatted: "2:00",
            lang_penalty_description: "Tripping",
            period: "1st",
            time_off_formatted: "10:00",
          },
        ],
      })
    );
    (getPlayByPlay as Mock).mockResolvedValue([]);

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByText("Penalties")).toBeInTheDocument();
    expect(screen.getByText(/Tripping/)).toBeInTheDocument();
  });

  it("renders Linescore with OT period when OT goals exist", async () => {
    (getGameSummary as Mock).mockResolvedValue(
      baseSummary({
        totalGoals: { home: 2, visitor: 1 },
        goals: [
          {
            event: "goal", time: "5:00", team_id: "1", home: "1", period_id: "1",
            power_play: "0", short_handed: "0", empty_net: "0",
            goal_scorer: { player_id: "10", first_name: "Jane", last_name: "Doe" },
            assist1_player: { player_id: null }, assist2_player: { player_id: null },
          },
          {
            event: "goal", time: "10:00", team_id: "2", home: "0", period_id: "2",
            power_play: "0", short_handed: "0", empty_net: "0",
            goal_scorer: { player_id: "20", first_name: "Kim", last_name: "Park" },
            assist1_player: { player_id: null }, assist2_player: { player_id: null },
          },
          {
            event: "goal", time: "3:00", team_id: "1", home: "1", period_id: "4",
            power_play: "0", short_handed: "0", empty_net: "0",
            goal_scorer: { player_id: "10", first_name: "Jane", last_name: "Doe" },
            assist1_player: { player_id: null }, assist2_player: { player_id: null },
          },
        ],
      })
    );
    (getPlayByPlay as Mock).mockResolvedValue([]);

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByText("OT")).toBeInTheDocument();
    expect(screen.getByText("Overtime")).toBeInTheDocument();
  });
});

describe("generateMetadata", () => {
  it("returns title and description with game ID", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "42" }),
    });

    expect(metadata.title).toBe("Game #42 | PWHL Gameday");
    expect(metadata.description).toContain("42");
  });
});
