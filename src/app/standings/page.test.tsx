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
  getStandings: vi.fn(),
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

import StandingsPage from "./page";
import { getStandings } from "@/lib/api";

describe("StandingsPage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders error banner when getStandings throws", async () => {
    (getStandings as Mock).mockRejectedValue(new Error("API down"));

    const jsx = await StandingsPage();
    render(jsx);

    expect(screen.getByText(/unable to load standings/i)).toBeInTheDocument();
  });

  it("renders standings table on success", async () => {
    (getStandings as Mock).mockResolvedValue([
      {
        team_id: "1",
        team_name: "Boston",
        rank: 1,
        games_played: "20",
        wins: "12",
        losses: "5",
        ot_losses: "3",
        points: "39",
        goals_for: "60",
        goals_against: "40",
        streak: "W3",
        past_10: "7-2-1",
      },
    ]);

    const jsx = await StandingsPage();
    render(jsx);

    expect(screen.getByText("Standings")).toBeInTheDocument();
    expect(screen.getByText("Boston")).toBeInTheDocument();
    expect(screen.getByText("39")).toBeInTheDocument();
  });

  it("renders empty table when standings array is empty", async () => {
    (getStandings as Mock).mockResolvedValue([]);

    const jsx = await StandingsPage();
    render(jsx);

    expect(screen.getByText("Standings")).toBeInTheDocument();
    // No playoff indicator when fewer than 5 teams
    expect(screen.queryByText(/qualify for playoffs/i)).not.toBeInTheDocument();
  });
});
