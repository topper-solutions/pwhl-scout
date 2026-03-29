import { getGameSummary, getPlayByPlay } from "@/lib/api";
import { getTeamMeta } from "@/lib/teams";
import { val, playerName, isGameLive } from "@/lib/utils";
import { LiveGameOverlay } from "@/components/live-game-overlay";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Game #${id} | PWHL Scout`,
    description: `PWHL game details and box score for game ${id}.`,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function GoalRow({ goal }: { goal: any }) {
  const team = getTeamMeta(goal.team_id ?? goal.team ?? 0);
  const scorerName = typeof goal.goal_scorer === "object"
    ? playerName(goal.goal_scorer)
    : goal.goal_scorer ?? "Goal";
  const assists = [goal.assist1_player, goal.assist2_player]
    .filter((a) => a?.player_id)
    .map((a) => playerName(a));

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-rink-800/30 last:border-0">
      <div
        className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white mt-0.5 shrink-0"
        style={{ backgroundColor: team.color }}
      >
        {team.abbr}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-white">
            {scorerName}
          </span>
          <span className="text-xs text-gray-500">
            {goal.time ?? ""}
          </span>
        </div>
        {assists.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            Assists: {assists.join(", ")}
          </p>
        )}
        <div className="flex gap-2 mt-0.5">
          {goal.power_play === "1" && (
            <span className="text-[10px] font-bold text-amber-400 uppercase">
              PP
            </span>
          )}
          {goal.short_handed === "1" && (
            <span className="text-[10px] font-bold text-cyan-400 uppercase">
              SH
            </span>
          )}
          {goal.empty_net === "1" && (
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              EN
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PenaltyRow({ pen }: { pen: any }) {
  const team = getTeamMeta(pen.team_id ?? pen.team ?? 0);
  const penPlayerName = pen.player_penalized_info
    ? playerName(pen.player_penalized_info)
    : pen.player_penalized_name ?? "Player";

  return (
    <div className="flex items-start gap-3 py-2 border-b border-rink-800/30 last:border-0">
      <div
        className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white mt-0.5 shrink-0"
        style={{ backgroundColor: team.color }}
      >
        {team.abbr}
      </div>
      <div className="flex-1">
        <span className="text-sm text-gray-300">{penPlayerName}</span>
        <span className="text-xs text-gray-500 ml-2">
          {pen.minutes_formatted ?? `${pen.minutes ?? 2} min`} —{" "}
          {pen.lang_penalty_description ?? pen.offence ?? "Penalty"}
        </span>
        <span className="text-xs text-gray-600 ml-2">
          {pen.period ?? ""} {pen.time_off_formatted ?? ""}
        </span>
      </div>
    </div>
  );
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = parseInt(id);
  if (isNaN(gameId) || gameId < 1) notFound();

  const [summaryResult, pbpResult] = await Promise.allSettled([
    getGameSummary(gameId),
    getPlayByPlay(gameId),
  ]);

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const pbp = pbpResult.status === "fulfilled" ? pbpResult.value : [];

  if (summaryResult.status === "rejected") console.error(`[GamePage] Failed to fetch summary for game ${gameId}:`, summaryResult.reason);
  if (pbpResult.status === "rejected") console.error(`[GamePage] Failed to fetch PBP for game ${gameId}:`, pbpResult.reason);

  if (!summary) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Game #{gameId}</h1>
        </div>
        <div className="glass-card glass-card-inner text-center text-gray-400 py-12">
          <p className="text-lg font-display">Game data not available</p>
          <Link href="/" className="text-ice-dim hover:text-ice text-sm mt-2 inline-block">
            &larr; Back to scores
          </Link>
        </div>
      </div>
    );
  }

  const homeTeam = getTeamMeta(
    summary.home?.team_id ?? summary.home?.id ?? summary.home_team ?? 0
  );
  const awayTeam = getTeamMeta(
    summary.visitor?.team_id ?? summary.visitor?.id ?? summary.visiting_team ?? 0
  );
  const homeScore =
    summary.totalGoals?.home ?? summary.home_goal_count ?? "0";
  const awayScore =
    summary.totalGoals?.visitor ?? summary.visiting_goal_count ?? "0";
  const status = summary.status_value ?? summary.game_status ?? "Final";
  const gameDate = summary.game_date ?? "";
  const venue = summary.venue ?? "";

  const goals: any[] = summary.goals ?? [];
  const penalties: any[] = summary.penalties ?? [];
  const threeStars: any[] = (summary.mvps ?? summary.three_stars ?? []).filter(Boolean);

  // Group goals by period
  const goalsByPeriod: Record<string, any[]> = {};
  for (const g of goals) {
    const period = g.period_id ?? g.period ?? "1";
    const label =
      period === "1"
        ? "1st Period"
        : period === "2"
        ? "2nd Period"
        : period === "3"
        ? "3rd Period"
        : period === "4"
        ? "Overtime"
        : `Period ${period}`;
    if (!goalsByPeriod[label]) goalsByPeriod[label] = [];
    goalsByPeriod[label].push(g);
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/"
        className="text-xs text-ice-dim hover:text-ice transition-colors mb-4 inline-block"
      >
        &larr; Back to scores
      </Link>

      {/* Scoreboard header */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {gameDate}
            </span>
            <span
              className={`text-xs font-bold uppercase ${
                status?.toLowerCase()?.includes("progress")
                  ? "text-live"
                  : "text-gray-400"
              }`}
            >
              {status}
            </span>
          </div>

          <div className="flex items-center justify-center gap-8 py-6">
            {/* Away */}
            <div className="flex flex-col items-center gap-3">
              <Link href={`/team/${awayTeam.id}`}>
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-xl"
                  style={{ backgroundColor: awayTeam.color }}
                >
                  {awayTeam.abbr}
                </div>
              </Link>
              <span className="text-sm font-medium text-gray-300">
                {summary.visitor?.name ?? `${awayTeam.city} ${awayTeam.name}`}
              </span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4">
              <span className="font-mono text-5xl font-black text-white tabular-nums">
                {awayScore}
              </span>
              <span className="text-2xl text-gray-600 font-light">–</span>
              <span className="font-mono text-5xl font-black text-white tabular-nums">
                {homeScore}
              </span>
            </div>

            {/* Home */}
            <div className="flex flex-col items-center gap-3">
              <Link href={`/team/${homeTeam.id}`}>
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-xl"
                  style={{ backgroundColor: homeTeam.color }}
                >
                  {homeTeam.abbr}
                </div>
              </Link>
              <span className="text-sm font-medium text-gray-300">
                {summary.home?.name ?? `${homeTeam.city} ${homeTeam.name}`}
              </span>
            </div>
          </div>

          {venue && (
            <p className="text-center text-xs text-gray-500">{venue}</p>
          )}
        </div>
      </div>

      <LiveGameOverlay
        gameId={gameId}
        homeTeamId={String(summary.home?.team_id ?? summary.home?.id ?? 0)}
        visitorTeamId={String(summary.visitor?.team_id ?? summary.visitor?.id ?? 0)}
        isLive={isGameLive(status)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scoring summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3 border-b border-rink-700/30">
              <h2 className="section-title text-base">Scoring Summary</h2>
            </div>
            <div className="p-4">
              {Object.keys(goalsByPeriod).length > 0 ? (
                Object.entries(goalsByPeriod).map(([period, periodGoals]) => (
                  <div key={period} className="mb-4 last:mb-0">
                    <h3 className="text-xs font-display font-semibold text-ice-dim uppercase tracking-wider mb-2">
                      {period}
                    </h3>
                    {periodGoals.map((g: any, i: number) => (
                      <GoalRow key={i} goal={g} />
                    ))}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No scoring data available
                </p>
              )}
            </div>
          </div>

          {/* Penalties */}
          {penalties.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-rink-700/30">
                <h2 className="section-title text-base">Penalties</h2>
              </div>
              <div className="p-4">
                {penalties.map((pen: any, i: number) => (
                  <PenaltyRow key={i} pen={pen} />
                ))}
              </div>
            </div>
          )}

          {/* Play-by-play */}
          {pbp.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-rink-700/30">
                <h2 className="section-title text-base">Play-by-Play</h2>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto space-y-1">
                {pbp.slice(0, 100).map((event: any, i: number) => (
                  <div
                    key={i}
                    className="flex gap-3 py-1 text-xs border-b border-rink-800/20 last:border-0"
                  >
                    <span className="text-gray-600 font-mono w-12 shrink-0">
                      {val(event, "time_formatted", "time", "s")}
                    </span>
                    <span className="text-gray-400">
                      {val(
                        event,
                        "event",
                        "description",
                        "details",
                        "event_type"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Three Stars */}
          {threeStars.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-rink-700/30">
                <h2 className="section-title text-base">Three Stars</h2>
              </div>
              <div className="p-4 space-y-3">
                {threeStars.map((star: any, i: number) => {
                  // mvps have home=0/1 to indicate visitor/home team
                  const starTeam = star.home === 1 || star.home === "1"
                    ? homeTeam
                    : awayTeam;
                  const starLabel = i === 0 ? "\u2605" : i === 1 ? "\u2605\u2605" : "\u2605\u2605\u2605";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-display font-bold text-ice-dim w-10 shrink-0">
                        {starLabel}
                      </span>
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white"
                        style={{ backgroundColor: starTeam.color }}
                      >
                        {starTeam.abbr}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {playerName(star)}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          #{star.jersey_number ?? ""} &middot; {starTeam.city}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shot totals */}
          {(summary.shotsByPeriod || summary.shots) && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-rink-700/30">
                <h2 className="section-title text-base">Shots on Goal</h2>
              </div>
              <div className="p-4">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-sm font-medium">{awayTeam.abbr}</td>
                      <td className="num font-bold">
                        {summary.totalShots?.visitor ??
                          summary.visiting_shots ??
                          "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-sm font-medium">{homeTeam.abbr}</td>
                      <td className="num font-bold">
                        {summary.totalShots?.home ??
                          summary.home_shots ??
                          "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
