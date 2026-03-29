import { getScorebar, getStandings, getTopScorers, extractSiteKit } from "@/lib/api";
import { getTeamMeta } from "@/lib/teams";
import Link from "next/link";

export const revalidate = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

function GameStatus({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  if (s.includes("progress") || s.includes("live")) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-live">
        <span className="live-dot" />
        Live
      </span>
    );
  }
  if (s.includes("final")) {
    return (
      <span className="text-xs font-semibold uppercase text-gray-400">
        {status}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-gray-500 uppercase">
      {status || "Scheduled"}
    </span>
  );
}

function ScoreCard({ game }: { game: any }) {
  const homeTeam = getTeamMeta(game.HomeID ?? game.home_team ?? 0);
  const awayTeam = getTeamMeta(game.VisitorID ?? game.visiting_team ?? 0);
  const homeScore = game.HomeGoals ?? game.home_goal_count ?? "—";
  const awayScore = game.VisitorGoals ?? game.visiting_goal_count ?? "—";
  const statusStr = game.GameStatusStringLong ?? game.GameStatusString ?? game.game_status ?? "";
  const statusCode = String(game.GameStatus ?? "");
  const gameId = game.ID ?? game.game_id;
  const gameDate = game.GameDate ?? game.date_with_day ?? "";
  const gameTime = game.ScheduledFormattedTime ?? game.schedule_time ?? "";
  // GameStatus codes: 1=Not Started, 2=In Progress, 3=Intermission, 4=Final
  const isLive = statusCode === "2" || statusCode === "3" || statusStr.toLowerCase().includes("progress");
  const isFinal = statusCode === "4" || statusStr.toLowerCase().includes("final");

  return (
    <Link
      href={`/game/${gameId}`}
      className={`glass-card block transition-all hover:scale-[1.02] hover:border-rink-600/50 ${
        isLive ? "ring-1 ring-live/30" : ""
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <GameStatus status={statusStr || (isFinal ? "Final" : isLive ? "In Progress" : "Scheduled")} />
          {gameDate && (
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
              {gameDate}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-md"
              style={{ backgroundColor: awayTeam.color }}
            >
              {awayTeam.abbr}
            </div>
            <span className="font-semibold text-sm text-gray-200">
              {game.VisitorLongName ?? `${awayTeam.city} ${awayTeam.name}`}
            </span>
          </div>
          {(isLive || isFinal) && (
            <span className="font-mono text-xl font-bold text-white tabular-nums">
              {awayScore}
            </span>
          )}
        </div>

        {/* Home team */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-md"
              style={{ backgroundColor: homeTeam.color }}
            >
              {homeTeam.abbr}
            </div>
            <span className="font-semibold text-sm text-gray-200">
              {game.HomeLongName ?? `${homeTeam.city} ${homeTeam.name}`}
            </span>
          </div>
          {(isLive || isFinal) && (
            <span className="font-mono text-xl font-bold text-white tabular-nums">
              {homeScore}
            </span>
          )}
        </div>

        {isLive && (
          <div className="mt-2 text-center">
            <span className="text-xs font-mono text-ice-dim">
              {game.PeriodNameLong ?? game.PeriodNameShort ?? ""}{" "}
              {game.GameClock ?? ""}
            </span>
          </div>
        )}

        {!isLive && !isFinal && gameTime && (
          <div className="mt-2 text-center">
            <span className="text-sm font-mono text-ice-dim">{gameTime}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function StandingsPreview({ standings }: { standings: any[] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3 border-b border-rink-700/30 flex items-center justify-between">
        <h2 className="section-title text-base">Standings</h2>
        <Link
          href="/standings"
          className="text-xs text-ice-dim hover:text-ice transition-colors"
        >
          Full standings &rarr;
        </Link>
      </div>
      <table className="stat-table">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th>Team</th>
            <th className="num">GP</th>
            <th className="num">W</th>
            <th className="num">L</th>
            <th className="num">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.slice(0, 8).map((row: any, i: number) => {
            const team = getTeamMeta(row.team_id ?? 0);
            return (
              <tr key={i}>
                <td className="text-gray-500 text-xs">{row.rank ?? i + 1}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-5 rounded-sm"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-medium text-sm">
                      {row.team_name ?? team.city}
                    </span>
                  </div>
                </td>
                <td className="num">{row.games_played ?? "—"}</td>
                <td className="num">{row.wins ?? "—"}</td>
                <td className="num">{row.losses ?? "—"}</td>
                <td className="num font-bold text-white">
                  {row.points ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TopScorersPreview({ scorers }: { scorers: any[] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3 border-b border-rink-700/30 flex items-center justify-between">
        <h2 className="section-title text-base">Top Scorers</h2>
        <Link
          href="/stats"
          className="text-xs text-ice-dim hover:text-ice transition-colors"
        >
          All stats &rarr;
        </Link>
      </div>
      <table className="stat-table">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th>Player</th>
            <th className="num">G</th>
            <th className="num">A</th>
            <th className="num">PTS</th>
          </tr>
        </thead>
        <tbody>
          {scorers.slice(0, 10).map((p: any, i: number) => {
            const team = getTeamMeta(p.team_id ?? 0);
            return (
              <tr key={i}>
                <td className="text-gray-500 text-xs">{i + 1}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-4 rounded-sm"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <span className="font-medium text-sm">
                        {p.player_name ??
                          p.name ??
                          `${p.first_name ?? ""} ${p.last_name ?? ""}`}
                      </span>
                      <span className="ml-1.5 text-[10px] text-gray-500">
                        {team.abbr}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="num">{p.goals ?? "—"}</td>
                <td className="num">{p.assists ?? "—"}</td>
                <td className="num font-bold text-white">
                  {p.points ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function HomePage() {
  let scorebar: any[] = [];
  let standings: any[] = [];
  let topScorers: any[] = [];

  try {
    const scoreData = await getScorebar(3, 3);
    const raw = extractSiteKit(scoreData, "Scorebar");
    scorebar = Array.isArray(raw) ? raw : [];
  } catch {
    scorebar = [];
  }

  try {
    const standData = await getStandings();
    const raw = extractSiteKit(standData, "Statviewtype");
    // First element is a header row with repeatheader, skip it
    standings = Array.isArray(raw)
      ? raw.filter((r: any) => r.team_id)
      : [];
  } catch {
    standings = [];
  }

  try {
    const scorerData = await getTopScorers();
    const raw = extractSiteKit(scorerData, "Statviewtype");
    topScorers = Array.isArray(raw)
      ? raw.filter((r: any) => r.player_name || r.name || r.first_name)
      : [];
  } catch {
    topScorers = [];
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Today&apos;s Games</h1>
        <p className="text-sm text-gray-400 mt-1">
          Live scores and recent results from the PWHL
        </p>
      </div>

      {scorebar.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scorebar.map((game: any, i: number) => (
            <ScoreCard key={game.game_id ?? game.GameID ?? i} game={game} />
          ))}
        </div>
      ) : (
        <div className="glass-card glass-card-inner text-center text-gray-400 py-12">
          <p className="text-lg font-display">No games scheduled today</p>
          <p className="text-sm mt-1">
            Check the{" "}
            <Link
              href="/schedule"
              className="text-ice-dim hover:text-ice underline"
            >
              full schedule
            </Link>{" "}
            for upcoming games.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {standings.length > 0 && <StandingsPreview standings={standings} />}
        {topScorers.length > 0 && <TopScorersPreview scorers={topScorers} />}
      </div>
    </div>
  );
}
