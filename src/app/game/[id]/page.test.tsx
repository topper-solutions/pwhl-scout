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
  getTeamMeta: vi.fn(() => ({
    id: 1,
    abbr: "BOS",
    name: "Fleet",
    city: "Boston",
    color: "#154734",
    colorAlt: "#C5B783",
    logo: "",
  })),
}));

vi.mock("@/components/team-logo", () => ({
  TeamLogo: ({ team }: { team: { abbr: string } }) => (
    <span data-testid="team-logo">{team.abbr}</span>
  ),
}));

vi.mock("@/components/live-scoreboard", () => ({
  LiveScoreboard: () => <div data-testid="live-scoreboard" />,
}));

import GamePage from "./page";
import { getGameSummary, getPlayByPlay } from "@/lib/api";

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
    (getGameSummary as Mock).mockResolvedValue({
      home: { team_id: "1", id: "1", name: "Boston Fleet" },
      visitor: { team_id: "2", id: "2", name: "Minnesota Frost" },
      totalGoals: { home: 3, visitor: 1 },
      goals: [],
      penalties: [],
      mvps: [],
      status_value: "Final",
      game_date: "2025-12-01",
      venue: "TD Garden",
    });
    (getPlayByPlay as Mock).mockRejectedValue(new Error("PBP down"));

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByTestId("live-scoreboard")).toBeInTheDocument();
    expect(screen.queryByText("Play-by-Play")).not.toBeInTheDocument();
  });

  it("renders full game page when both succeed", async () => {
    (getGameSummary as Mock).mockResolvedValue({
      home: { team_id: "1", id: "1", name: "Boston Fleet" },
      visitor: { team_id: "2", id: "2", name: "Minnesota Frost" },
      totalGoals: { home: 3, visitor: 1 },
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
      penalties: [],
      mvps: [],
      status_value: "Final",
      game_date: "2025-12-01",
      venue: "TD Garden",
    });
    (getPlayByPlay as Mock).mockResolvedValue([
      { event: "goal", time: "5:30", time_formatted: "5:30" },
    ]);

    const jsx = await GamePage({ params: Promise.resolve({ id: "100" }) });
    render(jsx);

    expect(screen.getByTestId("live-scoreboard")).toBeInTheDocument();
    expect(screen.getByText("Scoring Summary")).toBeInTheDocument();
    expect(screen.getByText("Play-by-Play")).toBeInTheDocument();
  });
});
