import { getTeamRoster, getTeamSchedule } from "@/lib/api";
import { getTeamMeta, TEAM_LIST } from "@/lib/teams";
import { TeamLogo } from "@/components/team-logo";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

export const revalidate = 300;

import { formatDate, playerName } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const team = getTeamMeta(parseInt(id));
  return {
    title: `${team.city} ${team.name} | PWHL Gameday`,
    description: `Roster, schedule, and stats for the ${team.city} ${team.name}.`,
  };
}

import type { RosterPlayer, ScheduleGame } from "@/lib/types";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = parseInt(id);
  if (isNaN(teamId) || teamId < 1) notFound();
  const team = getTeamMeta(teamId);

  let roster: RosterPlayer[] = [];
  let schedule: ScheduleGame[] = [];

  const [rosterResult, scheduleResult] = await Promise.allSettled([
    getTeamRoster(teamId),
    getTeamSchedule(teamId),
  ]);

  roster = rosterResult.status === "fulfilled" ? rosterResult.value : [];
  schedule = scheduleResult.status === "fulfilled" ? scheduleResult.value : [];

  if (rosterResult.status === "rejected") console.error(`[TeamPage] Failed to fetch roster for team ${teamId}:`, rosterResult.reason);
  if (scheduleResult.status === "rejected") console.error(`[TeamPage] Failed to fetch schedule for team ${teamId}:`, scheduleResult.reason);

  // Separate roster by position
  const forwards = roster.filter((p: RosterPlayer) =>
    ["C", "LW", "RW", "F"].includes(p.position?.toUpperCase())
  );
  const defense = roster.filter(
    (p: RosterPlayer) => p.position?.toUpperCase() === "D"
  );
  const goalies = roster.filter(
    (p: RosterPlayer) => p.position?.toUpperCase() === "G"
  );
  const other = roster.filter(
    (p: RosterPlayer) =>
      !["C", "LW", "RW", "F", "D", "G"].includes(p.position?.toUpperCase())
  );

  function RosterSection({
    title,
    players,
  }: {
    title: string;
    players: RosterPlayer[];
  }) {
    if (players.length === 0) return null;
    return (
      <div className="mb-6 last:mb-0">
        <h3 className="text-xs font-display font-semibold text-ice-dim uppercase tracking-wider mb-2 px-1">
          {title}
        </h3>
        <div className="overflow-x-auto">
          <table className="stat-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Player</th>
                <th>Pos</th>
                <th>Shoots</th>
                <th className="hidden sm:table-cell">Birthdate</th>
                <th className="hidden sm:table-cell">Hometown</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p: RosterPlayer, i: number) => (
                <tr key={p.player_id ?? i}>
                  <td className="font-mono text-sm text-gray-400">
                    {p.tp_jersey_number ?? p.jersey_number ?? "—"}
                  </td>
                  <td>
                    <span className="font-medium text-sm text-white">
                      {playerName(p)}
                    </span>
                  </td>
                  <td className="text-xs text-gray-400">
                    {p.position ?? "—"}
                  </td>
                  <td className="text-xs text-gray-400">
                    {p.shoots ?? p.catches ?? "—"}
                  </td>
                  <td className="text-xs text-gray-500 hidden sm:table-cell">
                    {p.birthdate ?? "—"}
                  </td>
                  <td className="text-xs text-gray-500 hidden sm:table-cell">
                    {p.hometown ??
                      ([p.birth_city, p.birth_state, p.birth_country]
                        .filter(Boolean)
                        .join(", ") ||
                      "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Team header */}
      <div className="glass-card overflow-hidden mb-8">
        <div
          className="h-2"
          style={{
            background: `linear-gradient(to right, ${team.color}, ${team.colorAlt})`,
          }}
        />
        <div className="p-6 flex items-center gap-5">
          <TeamLogo team={team} size="xl" className="shadow-xl" />
          <div>
            <h1 className="text-3xl font-display font-black text-white">
              {team.city} {team.name}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              2025–2026 PWHL Season
            </p>
          </div>
        </div>

        {/* Team nav */}
        <div className="px-6 pb-4 flex gap-2">
          {TEAM_LIST.filter((t) => t.id !== teamId).map((t) => (
            <Link
              key={t.id}
              href={`/team/${t.id}`}
              className="team-badge border border-rink-700/30 bg-rink-900/40 text-gray-400 hover:text-white transition-colors"
            >
              {t.abbr}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster */}
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3 border-b border-rink-700/30">
              <h2 className="section-title text-base">Roster</h2>
            </div>
            <div className="p-4">
              {roster.length > 0 ? (
                <>
                  <RosterSection title="Forwards" players={forwards} />
                  <RosterSection title="Defense" players={defense} />
                  <RosterSection title="Goaltenders" players={goalies} />
                  {other.length > 0 && (
                    <RosterSection title="Other" players={other} />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Roster not available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Schedule sidebar */}
        <div>
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3 border-b border-rink-700/30 flex items-center justify-between">
              <h2 className="section-title text-base">Schedule</h2>
              <Link
                href={`/schedule?team=${teamId}`}
                className="text-xs text-ice-dim hover:text-ice transition-colors"
              >
                Full schedule &rarr;
              </Link>
            </div>
            <div className="p-3 max-h-[600px] overflow-y-auto space-y-1">
              {schedule.slice(0, 30).map((g: ScheduleGame, i: number) => {
                // statviewfeed schedule uses city names, not IDs
                const homeCity = g.home_team_city ?? "";
                const visitCity = g.visiting_team_city ?? "";
                const isHome =
                  parseInt(g.home_team) === teamId ||
                  getTeamMeta(homeCity).id === teamId;
                const opponentKey = isHome
                  ? g.visiting_team ?? visitCity
                  : g.home_team ?? homeCity;
                const opponent = getTeamMeta(opponentKey);
                const isFinal = g.game_status
                  ?.toLowerCase()
                  ?.includes("final");
                const date = formatDate(
                  g.date_with_day || String(g.game_date ?? "")
                );

                return (
                  <Link
                    key={i}
                    href={`/game/${g.game_id ?? g.id ?? String(g.ID ?? "")}`}
                    className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-rink-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16 shrink-0">
                        {date}
                      </span>
                      <span className="text-[10px] text-gray-600 w-6">
                        {isHome ? "vs" : "@"}
                      </span>
                      <TeamLogo team={opponent} size="xs" />
                      <span className="text-xs text-gray-300">
                        {opponent.city}
                      </span>
                    </div>
                    {isFinal && (
                      <span className="text-xs font-mono text-gray-400">
                        {isHome
                          ? `${g.visiting_goal_count ?? 0}–${g.home_goal_count ?? 0}`
                          : `${g.home_goal_count ?? 0}–${g.visiting_goal_count ?? 0}`}
                      </span>
                    )}
                  </Link>
                );
              })}
              {schedule.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Schedule not available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
