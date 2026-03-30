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
  getTeamRoster: vi.fn(),
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
    { id: 2, abbr: "MIN", name: "Frost", city: "Minnesota", color: "#2E8B57", colorAlt: "#B0C4DE", logo: "" },
  ],
}));

vi.mock("@/components/team-logo", () => ({
  TeamLogo: ({ team }: { team: { abbr: string } }) => (
    <span data-testid="team-logo">{team.abbr}</span>
  ),
}));

import TeamPage from "./page";
import { getTeamRoster, getTeamSchedule } from "@/lib/api";

describe("TeamPage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls notFound for invalid (NaN) team ID", async () => {
    await expect(
      TeamPage({ params: Promise.resolve({ id: "abc" }) })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("shows roster fallback when roster rejects and schedule succeeds", async () => {
    (getTeamRoster as Mock).mockRejectedValue(new Error("API down"));
    (getTeamSchedule as Mock).mockResolvedValue([
      {
        game_id: "200",
        date_with_day: "Fri Nov 21",
        home_team: "1",
        visiting_team: "2",
        home_team_city: "Boston",
        visiting_team_city: "Minnesota",
        game_status: "Final",
        home_goal_count: "3",
        visiting_goal_count: "1",
      },
    ]);

    const jsx = await TeamPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);

    expect(screen.getByText("Roster not available")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
  });

  it("shows schedule fallback when schedule rejects and roster succeeds", async () => {
    (getTeamRoster as Mock).mockResolvedValue([
      {
        id: "100",
        player_id: "10",
        first_name: "Jane",
        last_name: "Doe",
        position: "C",
        tp_jersey_number: "9",
      },
    ]);
    (getTeamSchedule as Mock).mockRejectedValue(new Error("API down"));

    const jsx = await TeamPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Schedule not available")).toBeInTheDocument();
  });

  it("renders full page when both succeed", async () => {
    (getTeamRoster as Mock).mockResolvedValue([
      {
        id: "100",
        player_id: "10",
        first_name: "Jane",
        last_name: "Doe",
        position: "C",
        tp_jersey_number: "9",
      },
      {
        id: "101",
        player_id: "11",
        first_name: "Alex",
        last_name: "Smith",
        position: "D",
        tp_jersey_number: "4",
      },
    ]);
    (getTeamSchedule as Mock).mockResolvedValue([
      {
        game_id: "200",
        date_with_day: "Fri Nov 21",
        home_team: "1",
        visiting_team: "2",
        home_team_city: "Boston",
        visiting_team_city: "Minnesota",
        game_status: "Final",
        home_goal_count: "3",
        visiting_goal_count: "1",
      },
    ]);

    const jsx = await TeamPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
  });
});
