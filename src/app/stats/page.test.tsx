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

vi.mock("@/lib/api", () => ({
  getSkaterStats: vi.fn(),
  getGoalieStats: vi.fn(),
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
  TEAM_LIST: [
    { id: 1, abbr: "BOS", name: "Fleet", city: "Boston", color: "#154734", colorAlt: "#C5B783", logo: "" },
  ],
}));

vi.mock("@/components/team-filter", () => ({
  TeamFilter: () => <div data-testid="team-filter" />,
}));

import StatsPage from "./page";
import { getSkaterStats, getGoalieStats } from "@/lib/api";

describe("StatsPage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders error banner when fetch throws", async () => {
    (getSkaterStats as Mock).mockRejectedValue(new Error("API down"));

    const jsx = await StatsPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText(/unable to load player stats/i)).toBeInTheDocument();
  });

  it("renders skater stats table by default", async () => {
    (getSkaterStats as Mock).mockResolvedValue([
      {
        player_id: "10",
        first_name: "Jane",
        last_name: "Doe",
        name: "Jane Doe",
        position: "C",
        team_id: "1",
        games_played: "20",
        goals: "15",
        assists: "20",
        points: "35",
      },
    ]);

    const jsx = await StatsPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText("Player Stats")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("filters players by team when team param is set", async () => {
    (getSkaterStats as Mock).mockResolvedValue([
      {
        player_id: "10",
        first_name: "Jane",
        last_name: "Doe",
        name: "Jane Doe",
        position: "C",
        team_id: "1",
        team_code: "BOS",
        games_played: "20",
        goals: "15",
        assists: "20",
        points: "35",
      },
      {
        player_id: "20",
        first_name: "Kim",
        last_name: "Park",
        name: "Kim Park",
        position: "D",
        team_id: "2",
        team_code: "MIN",
        games_played: "18",
        goals: "5",
        assists: "10",
        points: "15",
      },
    ]);

    const jsx = await StatsPage({
      searchParams: Promise.resolve({ team: "1" }),
    });
    render(jsx);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Kim Park")).not.toBeInTheDocument();
  });

  it("renders goalie stats when view=goalies", async () => {
    (getGoalieStats as Mock).mockResolvedValue([
      {
        player_id: "20",
        first_name: "Alex",
        last_name: "Smith",
        name: "Alex Smith",
        position: "G",
        team_id: "1",
        games_played: "18",
        wins: "10",
        losses: "5",
        goals_against_average: "2.10",
        save_percentage: ".920",
        goals: "0",
        assists: "0",
        points: "0",
      },
    ]);

    const jsx = await StatsPage({
      searchParams: Promise.resolve({ view: "goalies" }),
    });
    render(jsx);

    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
  });
});
