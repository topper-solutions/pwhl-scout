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
  getScorebar: vi.fn(),
  getStandings: vi.fn(),
  getTopScorers: vi.fn(),
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

import HomePage from "./page";
import { getScorebar, getStandings, getTopScorers } from "@/lib/api";

describe("HomePage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders error banner when scorebar API rejects", async () => {
    (getScorebar as Mock).mockRejectedValue(new Error("API down"));
    (getStandings as Mock).mockResolvedValue([]);
    (getTopScorers as Mock).mockResolvedValue([]);

    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByText(/unable to load scores/i)).toBeInTheDocument();
  });

  it("renders scorebar but not standings when standings rejects", async () => {
    (getScorebar as Mock).mockResolvedValue([
      {
        ID: "100",
        HomeID: "1",
        VisitorID: "2",
        HomeGoals: "3",
        VisitorGoals: "1",
        GameStatusStringLong: "Final",
        GameStatus: "4",
        GameDate: "2025-12-01",
        HomeLongName: "Boston Fleet",
        VisitorLongName: "Minnesota Frost",
      },
    ]);
    (getStandings as Mock).mockRejectedValue(new Error("API down"));
    (getTopScorers as Mock).mockResolvedValue([]);

    const jsx = await HomePage();
    render(jsx);

    expect(screen.queryByText(/unable to load scores/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Standings")).not.toBeInTheDocument();
  });

  it("renders score cards, standings, and top scorers on success", async () => {
    (getScorebar as Mock).mockResolvedValue([
      {
        ID: "100",
        HomeID: "1",
        VisitorID: "2",
        HomeGoals: "3",
        VisitorGoals: "1",
        GameStatusStringLong: "Final",
        GameStatus: "4",
        GameDate: "2025-12-01",
        HomeLongName: "Boston Fleet",
        VisitorLongName: "Minnesota Frost",
      },
    ]);
    (getStandings as Mock).mockResolvedValue([
      {
        team_id: "1",
        team_name: "Boston",
        rank: 1,
        games_played: "20",
        wins: "12",
        losses: "5",
        points: "39",
      },
    ]);
    (getTopScorers as Mock).mockResolvedValue([
      {
        player_id: "10",
        first_name: "Jane",
        last_name: "Doe",
        team_id: "1",
        goals: "15",
        assists: "20",
        points: "35",
      },
    ]);

    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByText("Standings")).toBeInTheDocument();
    expect(screen.getByText("Top Scorers")).toBeInTheDocument();
    expect(screen.getByText("Boston Fleet")).toBeInTheDocument();
  });

  it("renders empty state when scorebar returns empty array", async () => {
    (getScorebar as Mock).mockResolvedValue([]);
    (getStandings as Mock).mockResolvedValue([]);
    (getTopScorers as Mock).mockResolvedValue([]);

    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByText("No games scheduled today")).toBeInTheDocument();
  });

  it("renders error banner and no standings/scorers when all reject", async () => {
    (getScorebar as Mock).mockRejectedValue(new Error("fail"));
    (getStandings as Mock).mockRejectedValue(new Error("fail"));
    (getTopScorers as Mock).mockRejectedValue(new Error("fail"));

    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByText(/unable to load scores/i)).toBeInTheDocument();
    expect(screen.queryByText("Standings")).not.toBeInTheDocument();
    expect(screen.queryByText("Top Scorers")).not.toBeInTheDocument();
  });
});
