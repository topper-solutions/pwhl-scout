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
  getSeasonSchedule: vi.fn(),
  getTeamSchedule: vi.fn(),
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

vi.mock("@/components/team-logo", () => ({
  TeamLogo: ({ team }: { team: { abbr: string } }) => (
    <span data-testid="team-logo">{team.abbr}</span>
  ),
}));

vi.mock("@/components/team-filter", () => ({
  TeamFilter: () => <div data-testid="team-filter" />,
}));

import SchedulePage from "./page";
import { getSeasonSchedule } from "@/lib/api";

describe("SchedulePage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders error banner when fetch throws", async () => {
    (getSeasonSchedule as Mock).mockRejectedValue(new Error("API down"));

    const jsx = await SchedulePage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText(/unable to load schedule/i)).toBeInTheDocument();
  });

  it("renders games grouped by month on success", async () => {
    (getSeasonSchedule as Mock).mockResolvedValue([
      {
        game_id: "200",
        date_played: "2025-11-21",
        date_with_day: "Fri Nov 21",
        home_team: "1",
        visiting_team: "2",
        home_goal_count: "3",
        visiting_goal_count: "1",
        game_status: "Final",
      },
    ]);

    const jsx = await SchedulePage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText("November 2025")).toBeInTheDocument();
  });

  it("renders empty state when no games found", async () => {
    (getSeasonSchedule as Mock).mockResolvedValue([]);

    const jsx = await SchedulePage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText("No games found")).toBeInTheDocument();
  });
});
