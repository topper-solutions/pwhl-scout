import { getSeasonSchedule, getTeamSchedule } from "@/lib/api";
import { getTeamMeta, TEAM_LIST } from "@/lib/teams";
import { formatDate } from "@/lib/utils";
import { ErrorBanner } from "@/components/error-banner";
import Link from "next/link";

export const revalidate = 300;

export const metadata = {
  title: "Schedule | PWHL Scout",
  description: "PWHL game schedule for the 2025-2026 season.",
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const resolvedParams = await searchParams;
  let games: any[] = [];

  const teamFilter = resolvedParams.team ? parseInt(resolvedParams.team) : null;

  let fetchError = false;
  try {
    games = teamFilter
      ? await getTeamSchedule(teamFilter)
      : await getSeasonSchedule();
  } catch (error) {
    console.error("[SchedulePage] Failed to fetch schedule:", error);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Schedule</h1>
        </div>
        <ErrorBanner message="Unable to load schedule." />
      </div>
    );
  }

  // Group by month using ISO date (date_played: "2025-11-21")
  const byMonth: Record<string, any[]> = {};
  for (const game of games) {
    const isoDate = game.date_played ?? game.game_date ?? "";
    let monthKey = "Unknown";
    if (isoDate) {
      const [year, month] = isoDate.split("-");
      if (year && month) {
        const d = new Date(parseInt(year), parseInt(month) - 1);
        monthKey = d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
    }
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(game);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="text-sm text-gray-400 mt-1">
            2025–2026 PWHL Regular Season
          </p>
        </div>

        {/* Team filter */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/schedule"
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
              href={`/schedule?team=${t.id}`}
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

      {Object.entries(byMonth).map(([month, monthGames]) => (
        <div key={month} className="mb-8">
          <h2 className="text-sm font-display font-semibold text-ice-dim uppercase tracking-wider mb-3 px-1">
            {month}
          </h2>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Away</th>
                    <th className="num">Score</th>
                    <th>Home</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthGames.map((g: any, i: number) => {
                    const home = getTeamMeta(g.home_team ?? 0);
                    const away = getTeamMeta(g.visiting_team ?? 0);
                    const status = g.game_status ?? "Scheduled";
                    const isFinal = status
                      ?.toLowerCase()
                      ?.includes("final");
                    const gameId = g.game_id ?? g.ID;
                    const date = formatDate(
                      g.date_with_day ?? g.game_date ?? ""
                    );
                    const time = g.schedule_time ?? "";

                    return (
                      <tr key={i}>
                        <td className="text-sm text-gray-300">
                          <Link
                            href={`/game/${gameId}`}
                            className="hover:text-white transition-colors"
                          >
                            {date}
                          </Link>
                        </td>
                        <td>
                          <Link
                            href={`/team/${away.id}`}
                            className="flex items-center gap-2 hover:text-white transition-colors"
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white"
                              style={{ backgroundColor: away.color }}
                            >
                              {away.abbr}
                            </div>
                            <span className="text-sm font-medium">
                              {away.city}
                            </span>
                          </Link>
                        </td>
                        <td className="num">
                          {isFinal ? (
                            <Link
                              href={`/game/${gameId}`}
                              className="font-mono text-sm font-bold text-white hover:text-ice transition-colors"
                            >
                              {g.visiting_goal_count ?? "0"} –{" "}
                              {g.home_goal_count ?? "0"}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500 font-mono">
                              {time || "—"}
                            </span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/team/${home.id}`}
                            className="flex items-center gap-2 hover:text-white transition-colors"
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white"
                              style={{ backgroundColor: home.color }}
                            >
                              {home.abbr}
                            </div>
                            <span className="text-sm font-medium">
                              {home.city}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <span
                            className={`text-xs ${
                              status?.toLowerCase()?.includes("final")
                                ? "text-gray-500"
                                : status
                                    ?.toLowerCase()
                                    ?.includes("progress")
                                ? "text-live font-bold"
                                : "text-gray-600"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {games.length === 0 && (
        <div className="glass-card glass-card-inner text-center text-gray-400 py-12">
          <p className="text-lg font-display">No games found</p>
        </div>
      )}
    </div>
  );
}
