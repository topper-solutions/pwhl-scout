import { getStandings, extractSiteKit } from "@/lib/api";
import { getTeamMeta } from "@/lib/teams";
import { ErrorBanner } from "@/components/error-banner";
import Link from "next/link";

export const revalidate = 120;

export const metadata = {
  title: "Standings | PWHL Scout",
  description: "PWHL league standings for the 2025-2026 season.",
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function StandingsPage() {
  let standings: any[] = [];
  let fetchError = false;

  try {
    const data = await getStandings();
    const raw = extractSiteKit(data, "Statviewtype");
    standings = Array.isArray(raw)
      ? raw.filter((r: any) => r.team_id)
      : [];
  } catch (error) {
    console.error("[StandingsPage] Failed to fetch standings:", error);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Standings</h1>
        </div>
        <ErrorBanner message="Unable to load standings." />
      </div>
    );
  }

  const columns = [
    { key: "rank", label: "#", cls: "w-8" },
    { key: "team", label: "Team" },
    { key: "games_played", label: "GP", num: true },
    { key: "wins", label: "W", num: true },
    { key: "losses", label: "L", num: true },
    { key: "ot_losses", label: "OTL", num: true },
    { key: "points", label: "PTS", num: true, bold: true },
    { key: "goals_for", label: "GF", num: true },
    { key: "goals_against", label: "GA", num: true },
    { key: "goal_diff", label: "DIFF", num: true },
    { key: "streak", label: "STRK", num: true },
    { key: "past_10", label: "L10", num: true },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Standings</h1>
        <p className="text-sm text-gray-400 mt-1">
          2025–2026 PWHL Regular Season &middot; 3-2-1-0 points system
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stat-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`${col.num ? "num" : ""} ${col.cls ?? ""}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((row: any, i: number) => {
                const team = getTeamMeta(row.team_id ?? 0);
                const inPlayoffSpot = i < 4;
                const diff =
                  (parseInt(row.goals_for) || 0) -
                  (parseInt(row.goals_against) || 0);
                return (
                  <tr
                    key={i}
                    className={inPlayoffSpot ? "bg-rink-800/20" : ""}
                  >
                    <td className="text-gray-500 text-xs">
                      {row.rank ?? i + 1}
                    </td>
                    <td>
                      <Link
                        href={`/team/${team.id}`}
                        className="flex items-center gap-2.5 hover:text-white transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.abbr}
                        </div>
                        <span className="font-medium text-sm">
                          {row.team_name ?? `${team.city} ${team.name}`}
                        </span>
                      </Link>
                    </td>
                    <td className="num">{row.games_played ?? "—"}</td>
                    <td className="num">{row.wins ?? "—"}</td>
                    <td className="num">{row.losses ?? "—"}</td>
                    <td className="num">{row.ot_losses ?? row.overtime_losses ?? "—"}</td>
                    <td className="num font-bold text-white">
                      {row.points ?? "—"}
                    </td>
                    <td className="num">{row.goals_for ?? "—"}</td>
                    <td className="num">{row.goals_against ?? "—"}</td>
                    <td
                      className={`num ${
                        diff > 0
                          ? "text-emerald-400"
                          : diff < 0
                          ? "text-red-400"
                          : ""
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="num">{row.streak ?? "—"}</td>
                    <td className="num text-gray-400">
                      {row.past_10 ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {standings.length > 4 && (
          <div className="px-5 py-2.5 border-t border-rink-700/30 text-xs text-gray-500 flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rink-800/60" />
            <span>Top 4 qualify for playoffs</span>
          </div>
        )}
      </div>
    </div>
  );
}
