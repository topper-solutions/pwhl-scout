import { getGameSummary, getPlayByPlay } from "@/lib/api";
import { getTeamMeta } from "@/lib/teams";
import { val, playerName, isGameLive, isGameFinal } from "@/lib/utils";
import { getPbpLabel } from "@/lib/pbp-labels";
import { LiveScoreboard } from "@/components/live-scoreboard";
import { TeamLogo } from "@/components/team-logo";
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

const PERIOD_LABELS: Record<string, string> = {
  "1": "1st",
  "2": "2nd",
  "3": "3rd",
  "4": "OT",
};

function periodLabel(p: string | number) {
  return PERIOD_LABELS[String(p)] ?? `P${p}`;
}

function GoalRow({ goal }: { goal: any }) {
  const team = getTeamMeta(goal.team_id ?? goal.team ?? 0);
  const scorerName =
    typeof goal.goal_scorer === "object"
      ? playerName(goal.goal_scorer)
      : (goal.goal_scorer ?? "Goal");
  const assists = [goal.assist1_player, goal.assist2_player]
    .filter((a) => a?.player_id)
    .map((a) => playerName(a));

  const isPP = goal.power_play === "1";
  const isSH = goal.short_handed === "1";
  const isEN = goal.empty_net === "1";

  return (
    <div
      className={`flex items-start gap-3 py-2.5 border-b border-rink-800/30 last:border-0 rounded ${
        isPP
          ? "border-l-2 border-l-amber-500/60 bg-amber-950/10 pl-3"
          : isSH
          ? "border-l-2 border-l-cyan-500/60 bg-cyan-950/10 pl-3"
          : isEN
          ? "opacity-60"
          : ""
      }`}
    >
      <TeamLogo team={team} size="sm" className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-white">{scorerName}</span>
          <span className="text-xs text-gray-500">{goal.time ?? ""}</span>
          {isPP && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">
              PP
            </span>
          )}
          {isSH && (
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded">
              SH
            </span>
          )}
          {isEN && (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded">
              EN
            </span>
          )}
        </div>
        {assists.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            Assists: {assists.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function PenaltyRow({ pen }: { pen: any }) {
  const team = getTeamMeta(pen.team_id ?? pen.team ?? 0);
  const penName = pen.player_penalized_info
    ? playerName(pen.player_penalized_info)
    : (pen.player_penalized_name ?? "Player");

  return (
    <div className="flex items-start gap-3 py-2 border-b border-rink-800/30 last:border-0">
      <TeamLogo team={team} size="sm" className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <span className="text-sm text-gray-300">{penName}</span>
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

function Linescore({
  goals,
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
}: {
  goals: any[];
  awayTeam: any;
  homeTeam: any;
  awayScore: number | string;
  homeScore: number | string;
}) {
  const periods = ["1", "2", "3"];
  const hasOT = goals.some(
    (g) => String(g.period_id ?? g.period) === "4"
  );
  if (hasOT) periods.push("OT");

  const awayByPeriod: Record<string, number> = {};
  const homeByPeriod: Record<string, number> = {};
  for (const g of goals) {
    const p = String(g.period_id ?? g.period ?? "1");
    const key = p === "4" ? "OT" : p;
    const isHome = String(g.home) === "1" || String(g.team_id) === String(homeTeam.id);
    if (isHome) homeByPeriod[key] = (homeByPeriod[key] ?? 0) + 1;
    else awayByPeriod[key] = (awayByPeriod[key] ?? 0) + 1;
  }

  return (
    <table className="w-full text-xs mt-4">
      <thead>
        <tr className="text-gray-500">
          <th className="text-left w-16 py-1"></th>
          {periods.map((p) => (
            <th key={p} className="text-center w-8 py-1">
              {periodLabel(p === "OT" ? "4" : p)}
            </th>
          ))}
          <th className="text-center w-8 py-1 font-bold text-gray-400">T</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-rink-800/30">
          <td className="py-1.5 font-bold text-gray-300">{awayTeam.abbr}</td>
          {periods.map((p) => (
            <td key={p} className="text-center text-gray-400 font-mono">
              {awayByPeriod[p] ?? 0}
            </td>
          ))}
          <td className="text-center font-bold text-white font-mono">{awayScore}</td>
        </tr>
        <tr className="border-t border-rink-800/30">
          <td className="py-1.5 font-bold text-gray-300">{homeTeam.abbr}</td>
          {periods.map((p) => (
            <td key={p} className="text-center text-gray-400 font-mono">
              {homeByPeriod[p] ?? 0}
            </td>
          ))}
          <td className="text-center font-bold text-white font-mono">{homeScore}</td>
        </tr>
      </tbody>
    </table>
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

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const pbp = pbpResult.status === "fulfilled" ? pbpResult.value : [];

  if (summaryResult.status === "rejected")
    console.error(`[GamePage] Failed to fetch summary for game ${gameId}:`, summaryResult.reason);
  if (pbpResult.status === "rejected")
    console.error(`[GamePage] Failed to fetch PBP for game ${gameId}:`, pbpResult.reason);

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
  const homeScore = summary.totalGoals?.home ?? summary.home_goal_count ?? "0";
  const awayScore = summary.totalGoals?.visitor ?? summary.visiting_goal_count ?? "0";
  const status = summary.status_value ?? summary.game_status ?? "Final";
  const gameDate = summary.game_date ?? "";
  const venue = summary.venue ?? "";
  const live = isGameLive(status);
  const final_ = isGameFinal(status);

  const goals: any[] = summary.goals ?? [];
  const penalties: any[] = summary.penalties ?? [];
  const threeStars: any[] = (summary.mvps ?? summary.three_stars ?? []).filter(Boolean);

  const goalsByPeriod: Record<string, any[]> = {};
  for (const g of goals) {
    const period = g.period_id ?? g.period ?? "1";
    const label =
      period === "1" ? "1st Period"
        : period === "2" ? "2nd Period"
        : period === "3" ? "3rd Period"
        : period === "4" ? "Overtime"
        : `Period ${period}`;
    if (!goalsByPeriod[label]) goalsByPeriod[label] = [];
    goalsByPeriod[label].push(g);
  }

  const starStyles = [
    { color: "text-amber-400", glow: "drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]", size: "text-2xl", label: "1st Star" },
    { color: "text-gray-300", glow: "drop-shadow-[0_0_4px_rgba(209,213,219,0.3)]", size: "text-lg", label: "2nd Star" },
    { color: "text-orange-700", glow: "", size: "text-base", label: "3rd Star" },
  ];

  return (
    <div className="animate-fade-in">
      <Link
        href="/"
        className="text-xs text-ice-dim hover:text-ice transition-colors mb-4 inline-block"
      >
        &larr; Back to scores
      </Link>

      <LiveScoreboard
        gameId={gameId}
        homeTeamId={String(summary.home?.team_id ?? summary.home?.id ?? 0)}
        visitorTeamId={String(summary.visitor?.team_id ?? summary.visitor?.id ?? 0)}
        isLive={live}
        initialHomeScore={homeScore}
        initialAwayScore={awayScore}
        status={status}
        gameDate={gameDate}
        venue={venue}
        homeName={summary.home?.name ?? `${homeTeam.city} ${homeTeam.name}`}
        visitorName={summary.visitor?.name ?? `${awayTeam.city} ${awayTeam.name}`}
      />

      {/* Linescore */}
      {goals.length > 0 && (
        <div className="glass-card overflow-hidden mb-6 px-5 py-3">
          <Linescore
            goals={goals}
            awayTeam={awayTeam}
            homeTeam={homeTeam}
            awayScore={awayScore}
            homeScore={homeScore}
          />
        </div>
      )}

      {/* Content grid — layout differs for live vs completed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* On mobile: three stars + shots first (before long content), on desktop: sidebar */}
        <div className="order-1 lg:order-2 space-y-4">
          {threeStars.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-rink-700/30">
                <h2 className="section-title text-base">Three Stars</h2>
              </div>
              <div className="p-4 space-y-1">
                {threeStars.map((star: any, i: number) => {
                  const starTeam =
                    star.home === 1 || star.home === "1" ? homeTeam : awayTeam;
                  const style = starStyles[i] ?? { color: "text-gray-500", glow: "", size: "text-sm", label: "" };
                  const isFirst = i === 0;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-lg transition-colors ${
                        isFirst ? "bg-amber-950/15 border border-amber-800/20 p-3" : "p-2.5"
                      }`}
                    >
                      <span
                        className={`${style.size} font-display font-bold ${style.color} ${style.glow} w-9 shrink-0 text-center`}
                      >
                        ★
                      </span>
                      <TeamLogo team={starTeam} size={isFirst ? "md" : "sm"} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-white ${isFirst ? "text-base" : "text-sm"}`}>
                          {playerName(star)}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          #{star.jersey_number ?? ""} &middot; {starTeam.city}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${style.color} opacity-60 shrink-0`}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(summary.shotsByPeriod || summary.totalShots) && (() => {
            const visitorShots = summary.shotsByPeriod?.visitor ?? {};
            const homeShots = summary.shotsByPeriod?.home ?? {};
            const periods = Object.keys(visitorShots);
            const totalVisitor = Number(summary.totalShots?.visitor) || 0;
            const totalHome = Number(summary.totalShots?.home) || 0;
            const totalShots = totalVisitor + totalHome;
            const visitorPct = totalShots > 0 ? (totalVisitor / totalShots) * 100 : 50;

            return (
              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3 border-b border-rink-700/30">
                  <h2 className="section-title text-base">Shots on Goal</h2>
                </div>
                <div className="p-4">
                  {periods.length > 0 && (
                    <table className="w-full text-xs mb-4">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left w-16 py-1"></th>
                          {periods.map((p) => (
                            <th key={p} className="text-center w-8 py-1">
                              {periodLabel(p)}
                            </th>
                          ))}
                          <th className="text-center w-8 py-1 font-bold text-gray-400">T</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-rink-800/30">
                          <td className="py-1.5 font-bold text-gray-300">{awayTeam.abbr}</td>
                          {periods.map((p) => (
                            <td key={p} className="text-center text-gray-400 font-mono">
                              {visitorShots[p] ?? 0}
                            </td>
                          ))}
                          <td className="text-center font-bold text-white font-mono">{totalVisitor}</td>
                        </tr>
                        <tr className="border-t border-rink-800/30">
                          <td className="py-1.5 font-bold text-gray-300">{homeTeam.abbr}</td>
                          {periods.map((p) => (
                            <td key={p} className="text-center text-gray-400 font-mono">
                              {homeShots[p] ?? 0}
                            </td>
                          ))}
                          <td className="text-center font-bold text-white font-mono">{totalHome}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {totalShots > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-gray-300 w-10 text-right">{awayTeam.abbr}</span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden bg-rink-800/50 flex">
                        <div
                          className="h-full rounded-l-full transition-all"
                          style={{ width: `${visitorPct}%`, backgroundColor: awayTeam.color }}
                        />
                        <div
                          className="h-full rounded-r-full transition-all"
                          style={{ width: `${100 - visitorPct}%`, backgroundColor: homeTeam.color }}
                        />
                      </div>
                      <span className="font-bold text-gray-300 w-10">{homeTeam.abbr}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Main content */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-4">
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

          {/* Play-by-play — collapsible on mobile via details/summary */}
          {pbp.length > 0 && (
            <div className="glass-card overflow-hidden">
              <details className="lg:open" open={final_ ? undefined : true}>
                <summary className="px-5 py-3 border-b border-rink-700/30 cursor-pointer hover:bg-rink-800/20 transition-colors list-none">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title text-base">Play-by-Play</h2>
                    <span className="text-[10px] text-gray-500 lg:hidden">
                      Tap to expand
                    </span>
                  </div>
                </summary>
                <div className="p-4 max-h-96 overflow-y-auto space-y-0.5">
                  {pbp.slice(0, 100).map((event: any, i: number) => {
                    const eventType = val(event, "event", "event_type");
                    const { label, color } = getPbpLabel(eventType);
                    return (
                      <div
                        key={i}
                        className="flex gap-3 py-1 text-xs border-b border-rink-800/20 last:border-0"
                      >
                        <span className="text-gray-600 font-mono w-12 shrink-0">
                          {val(event, "time_formatted", "time", "s")}
                        </span>
                        <span className={`${color} capitalize`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
