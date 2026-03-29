import { getSkaterStats, getGoalieStats, extractSiteKit } from "@/lib/api";
import { getTeamMeta, TEAM_LIST } from "@/lib/teams";
import { val } from "@/lib/utils";
import { ErrorBanner } from "@/components/error-banner";
import Link from "next/link";

export const revalidate = 300;

export const metadata = {
  title: "Player Stats | PWHL Scout",
  description: "PWHL player statistics for the 2025-2026 season.",
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { view?: string; team?: string };
}) {
  const view = searchParams.view === "goalies" ? "goalies" : "skaters";
  const teamFilter = searchParams.team ? parseInt(searchParams.team) : null;

  let players: any[] = [];

  let fetchError = false;
  try {
    if (view === "goalies") {
      const data = await getGoalieStats();
      const raw = extractSiteKit(data, "Players");
      players = Array.isArray(raw) ? raw : [];
    } else {
      const data = await getSkaterStats();
      const raw = extractSiteKit(data, "Players");
      players = Array.isArray(raw) ? raw : [];
    }
  } catch (error) {
    console.error("[StatsPage] Failed to fetch player stats:", error);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Player Stats</h1>
        </div>
        <ErrorBanner message="Unable to load player stats." />
      </div>
    );
  }

  if (teamFilter) {
    // Filter by team_id or team_code
    const filterTeam = getTeamMeta(teamFilter);
    players = players.filter(
      (p: any) =>
        parseInt(p.team_id) === teamFilter ||
        p.team_code?.toUpperCase() === filterTeam.abbr
    );
  }

  const skaterCols = [
    { key: "rank", label: "#", cls: "w-8" },
    { key: "name", label: "Player" },
    { key: "team", label: "Team" },
    { key: "position", label: "Pos" },
    { key: "games_played", label: "GP", num: true },
    { key: "goals", label: "G", num: true },
    { key: "assists", label: "A", num: true },
    { key: "points", label: "PTS", num: true, bold: true },
    { key: "plus_minus", label: "+/-", num: true },
    { key: "penalty_minutes", label: "PIM", num: true },
    { key: "power_play_goals", label: "PPG", num: true },
    { key: "short_handed_goals", label: "SHG", num: true },
    { key: "game_winning_goals", label: "GWG", num: true },
    { key: "shots", label: "S", num: true },
    { key: "shooting_percentage", label: "S%", num: true },
  ];

  const goalieCols = [
    { key: "rank", label: "#", cls: "w-8" },
    { key: "name", label: "Player" },
    { key: "team", label: "Team" },
    { key: "games_played", label: "GP", num: true },
    { key: "wins", label: "W", num: true },
    { key: "losses", label: "L", num: true },
    { key: "ot_losses", label: "OTL", num: true },
    { key: "goals_against_average", label: "GAA", num: true, bold: true },
    { key: "save_percentage", label: "SV%", num: true, bold: true },
    { key: "shutouts", label: "SO", num: true },
    { key: "saves", label: "SV", num: true },
    { key: "shots_against", label: "SA", num: true },
  ];

  const cols = view === "goalies" ? goalieCols : skaterCols;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Player Stats</h1>
          <p className="text-sm text-gray-400 mt-1">
            2025–2026 PWHL Regular Season
          </p>
        </div>
      </div>

      {/* View toggle + team filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-rink-700/40">
          <Link
            href={`/stats?view=skaters${teamFilter ? `&team=${teamFilter}` : ""}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              view === "skaters"
                ? "bg-rink-700/60 text-white"
                : "bg-rink-900/40 text-gray-400 hover:text-white"
            }`}
          >
            Skaters
          </Link>
          <Link
            href={`/stats?view=goalies${teamFilter ? `&team=${teamFilter}` : ""}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              view === "goalies"
                ? "bg-rink-700/60 text-white"
                : "bg-rink-900/40 text-gray-400 hover:text-white"
            }`}
          >
            Goalies
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/stats?view=${view}`}
            className={`team-badge border transition-colors ${
              !teamFilter
                ? "border-ice/40 bg-rink-700/60 text-white"
                : "border-rink-700/30 bg-rink-900/40 text-gray-400 hover:text-white"
            }`}
          >
            All
          </Link>
          {TEAM_LIST.map((t) => (
            <Link
              key={t.id}
              href={`/stats?view=${view}&team=${t.id}`}
              className={`team-badge border transition-colors ${
                teamFilter === t.id
                  ? "text-white"
                  : "border-rink-700/30 bg-rink-900/40 text-gray-400 hover:text-white"
              }`}
              style={
                teamFilter === t.id
                  ? {
                      borderColor: t.color + "80",
                      backgroundColor: t.color + "30",
                    }
                  : undefined
              }
            >
              {t.abbr}
            </Link>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stat-table">
            <thead>
              <tr>
                {cols.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.num ? "num" : ""} ${col.cls ?? ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p: any, i: number) => {
                const team = getTeamMeta(p.team_id ?? p.team_code ?? 0);
                const name =
                  p.name ??
                  `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();

                return (
                  <tr key={p.player_id ?? i}>
                    <td className="text-gray-500 text-xs">{i + 1}</td>
                    <td>
                      <span className="font-medium text-sm text-white">
                        {name}
                      </span>
                    </td>
                    {view === "skaters" ? (
                      <>
                        <td>
                          <Link
                            href={`/team/${team.id}`}
                            className="team-badge border border-rink-700/30"
                            style={{
                              backgroundColor: team.color + "25",
                              borderColor: team.color + "40",
                            }}
                          >
                            {team.abbr}
                          </Link>
                        </td>
                        <td className="text-xs text-gray-400">
                          {val(p, "position")}
                        </td>
                        <td className="num">{val(p, "games_played", "gp")}</td>
                        <td className="num">{val(p, "goals", "g")}</td>
                        <td className="num">{val(p, "assists", "a")}</td>
                        <td className="num font-bold text-white">
                          {val(p, "points", "pts")}
                        </td>
                        <td className="num">
                          {val(p, "plus_minus", "plusminus")}
                        </td>
                        <td className="num">
                          {val(p, "penalty_minutes", "pim")}
                        </td>
                        <td className="num">
                          {val(p, "power_play_goals", "ppg")}
                        </td>
                        <td className="num">
                          {val(p, "short_handed_goals", "shg")}
                        </td>
                        <td className="num">
                          {val(p, "game_winning_goals", "gwg")}
                        </td>
                        <td className="num">{val(p, "shots", "s")}</td>
                        <td className="num">
                          {val(p, "shooting_percentage", "shooting_pct")}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <Link
                            href={`/team/${team.id}`}
                            className="team-badge border border-rink-700/30"
                            style={{
                              backgroundColor: team.color + "25",
                              borderColor: team.color + "40",
                            }}
                          >
                            {team.abbr}
                          </Link>
                        </td>
                        <td className="num">{val(p, "games_played", "gp")}</td>
                        <td className="num">{val(p, "wins", "w")}</td>
                        <td className="num">{val(p, "losses", "l")}</td>
                        <td className="num">
                          {val(p, "ot_losses", "overtime_losses")}
                        </td>
                        <td className="num font-bold text-white">
                          {val(p, "goals_against_average", "gaa")}
                        </td>
                        <td className="num font-bold text-white">
                          {val(p, "save_percentage", "svpct", "sv_percentage")}
                        </td>
                        <td className="num">{val(p, "shutouts", "so")}</td>
                        <td className="num">{val(p, "saves", "sv")}</td>
                        <td className="num">
                          {val(p, "shots_against", "sa")}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {players.length === 0 && (
        <div className="glass-card glass-card-inner text-center text-gray-400 py-12 mt-4">
          <p className="text-lg font-display">No players found</p>
        </div>
      )}
    </div>
  );
}
