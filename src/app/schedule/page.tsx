import { getSeasonSchedule, getTeamSchedule } from "@/lib/api";
import { getTeamMeta } from "@/lib/teams";
import { TeamFilter } from "@/components/team-filter";
import { formatDate, isGameLive, isGameFinal } from "@/lib/utils";
import { ErrorBanner } from "@/components/error-banner";
import { DataFreshness } from "@/components/data-freshness";
import { TeamLogo } from "@/components/team-logo";
import Link from "next/link";

export const revalidate = 300;

export const metadata = {
  title: "Schedule | PWHL Gameday",
  description: "PWHL game schedule for the 2025-2026 season.",
};

import type { ScheduleGame } from "@/lib/types";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const resolvedParams = await searchParams;
  let games: ScheduleGame[] = [];

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
  const monthKeyCache: Record<string, string> = {};
  const byMonth: Record<string, ScheduleGame[]> = {};
  for (const game of games) {
    const isoDate = game.date_played || String(game.game_date ?? "");
    const ym = isoDate?.slice(0, 7) ?? ""; // "2025-11"
    let monthKey = "Unknown";
    if (ym && ym.includes("-")) {
      if (monthKeyCache[ym]) {
        monthKey = monthKeyCache[ym];
      } else {
        const [year, month] = ym.split("-");
        const d = new Date(parseInt(year), parseInt(month) - 1);
        monthKey = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        monthKeyCache[ym] = monthKey;
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
          <DataFreshness renderedAt={Date.now()} revalidateSeconds={300} />
        </div>

        <TeamFilter baseHref="/schedule" activeTeamId={teamFilter} />
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
                  {monthGames.map((g: ScheduleGame, i: number) => {
                    const home = getTeamMeta(g.home_team ?? 0);
                    const away = getTeamMeta(g.visiting_team ?? 0);
                    const status = g.game_status ?? "Scheduled";
                    const isFinal = isGameFinal(status);
                    const gameId = g.game_id ?? g.id ?? String(g.ID ?? "");
                    const date = formatDate(
                      g.date_with_day || String(g.game_date ?? "")
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
                            <TeamLogo team={away} size="xs" />
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
                            <TeamLogo team={home} size="xs" />
                            <span className="text-sm font-medium">
                              {home.city}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <span
                            className={`text-xs ${
                              isGameFinal(status)
                                ? "text-gray-500"
                                : isGameLive(status)
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
