"use client";

import { useEffect, useRef, useState } from "react";
import { getTeamMeta } from "@/lib/teams";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface LivePenalty {
  playerName: string;
  jerseyNumber: number;
  offence: string;
  minutes: number;
  period: number;
  time: string;
  isHome: boolean;
}

interface LiveState {
  clock: string | null;
  period: string | null;
  homeGoals: number;
  visitorGoals: number;
  homeShots: number;
  visitorShots: number;
  homePenalties: LivePenalty[];
  visitorPenalties: LivePenalty[];
  connected: boolean;
}

function extractGameData(
  data: any,
  gameKey: string,
  homeTeamId: string
): Omit<LiveState, "connected"> {
  let clock: string | null = null;
  let period: string | null = null;
  let homeGoals = 0;
  let visitorGoals = 0;
  let homeShots = 0;
  let visitorShots = 0;
  const homePenalties: LivePenalty[] = [];
  const visitorPenalties: LivePenalty[] = [];

  // Clock: {games: {"302": {Clock: {Minutes, Seconds, period}}}}
  const clockGames = data?.runningclock?.games ?? data?.runningclock;
  const gameClock = clockGames?.[gameKey];
  if (gameClock?.Clock) {
    clock = `${gameClock.Clock.Minutes ?? "00"}:${gameClock.Clock.Seconds ?? "00"}`;
    period = String(gameClock.Clock.period ?? "");
  }

  // Goals: [null, {games: {"302": {GameGoals: {...}}}}]
  const goalsRoot = Array.isArray(data?.goals)
    ? data.goals.find((g: any) => g?.games)
    : data?.goals;
  const gameGoals = goalsRoot?.games?.[gameKey]?.GameGoals;
  if (gameGoals && typeof gameGoals === "object") {
    for (const goal of Object.values(gameGoals) as any[]) {
      if (goal.IsHome) homeGoals++;
      else visitorGoals++;
    }
  }

  // Shots: [null, {games: {"302": {GameShotSummary: {...}}}}]
  const shotsRoot = Array.isArray(data?.shotssummary)
    ? data.shotssummary.find((s: any) => s?.games)
    : data?.shotssummary;
  const gameShotSummary = shotsRoot?.games?.[gameKey]?.GameShotSummary;
  if (gameShotSummary && typeof gameShotSummary === "object") {
    if (gameShotSummary.HomeShots !== undefined) {
      homeShots = Number(gameShotSummary.HomeShots) || 0;
      visitorShots = Number(gameShotSummary.VisitorShots) || 0;
    } else {
      for (const periodData of Object.values(gameShotSummary) as any[]) {
        if (typeof periodData === "object" && periodData) {
          for (const [teamId, count] of Object.entries(periodData)) {
            if (String(teamId) === String(homeTeamId))
              homeShots += Number(count) || 0;
            else visitorShots += Number(count) || 0;
          }
        }
      }
    }
  }

  // Penalties: [null, {games: {"302": {GamePenalties: {...}}}}]
  const pensRoot = Array.isArray(data?.penalties)
    ? data.penalties.find((p: any) => p?.games)
    : data?.penalties;
  const gamePenalties = pensRoot?.games?.[gameKey]?.GamePenalties;
  if (gamePenalties && typeof gamePenalties === "object") {
    const currentPeriod = parseInt(period ?? "0");
    for (const pen of Object.values(gamePenalties) as any[]) {
      // Show penalties from current period or previous period (could still be active)
      if (pen.Period >= currentPeriod - 1) {
        const entry: LivePenalty = {
          playerName: `${pen.PenalizedPlayerFirstName ?? ""} ${pen.PenalizedPlayerLastName ?? ""}`.trim(),
          jerseyNumber: pen.PenalizedPlayerJerseyNumber ?? 0,
          offence: pen.OffenceDescription ?? "Penalty",
          minutes: pen.Minutes ?? 2,
          period: pen.Period ?? 0,
          time: pen.Time ?? "",
          isHome: !!pen.Home,
        };
        if (entry.isHome) homePenalties.push(entry);
        else visitorPenalties.push(entry);
      }
    }
  }

  return {
    clock, period, homeGoals, visitorGoals, homeShots, visitorShots,
    homePenalties, visitorPenalties,
  };
}

export function LiveGameOverlay({
  gameId,
  homeTeamId,
  visitorTeamId,
  isLive,
}: {
  gameId: number;
  homeTeamId: string;
  visitorTeamId: string;
  isLive: boolean;
}) {
  const [live, setLive] = useState<LiveState>({
    clock: null,
    period: null,
    homeGoals: 0,
    visitorGoals: 0,
    homeShots: 0,
    visitorShots: 0,
    homePenalties: [],
    visitorPenalties: [],
    connected: false,
  });

  const homeTeam = getTeamMeta(homeTeamId);
  const visitorTeam = getTeamMeta(visitorTeamId);
  const gameKey = String(gameId);

  // Store the full Firebase tree so patch events can be merged
  const fullDataRef = useRef<any>(null);

  useEffect(() => {
    if (!isLive) return;

    const eventSource = new EventSource("/api/live");

    eventSource.addEventListener("put", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.path === "/" && payload.data) {
          fullDataRef.current = payload.data;
          const extracted = extractGameData(payload.data, gameKey, homeTeamId);
          if (extracted.clock !== null || extracted.homeGoals > 0 || extracted.visitorGoals > 0) {
            setLive({ ...extracted, connected: true });
          }
        }
      } catch {
        // Ignore malformed events
      }
    });

    eventSource.addEventListener("patch", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.data && fullDataRef.current) {
          // Merge patch into full data at the given path
          const path = payload.path?.replace(/^\//, "");
          if (path) {
            const parts = path.split("/");
            let target = fullDataRef.current;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!target[parts[i]]) target[parts[i]] = {};
              target = target[parts[i]];
            }
            const lastKey = parts[parts.length - 1];
            if (typeof payload.data === "object" && payload.data !== null) {
              target[lastKey] = { ...target[lastKey], ...payload.data };
            } else {
              target[lastKey] = payload.data;
            }
          } else {
            fullDataRef.current = { ...fullDataRef.current, ...payload.data };
          }

          // Re-extract from merged data
          const extracted = extractGameData(fullDataRef.current, gameKey, homeTeamId);
          if (extracted.clock !== null || extracted.homeGoals > 0 || extracted.visitorGoals > 0) {
            setLive({ ...extracted, connected: true });
          }
        }
      } catch {
        // Ignore malformed events
      }
    });

    eventSource.onerror = () => {
      setLive((prev) => ({ ...prev, connected: false }));
    };

    return () => {
      eventSource.close();
    };
  }, [isLive, gameKey, homeTeamId]);

  if (!isLive || !live.connected) return null;

  const periodLabel =
    live.period === "1"
      ? "1st"
      : live.period === "2"
      ? "2nd"
      : live.period === "3"
      ? "3rd"
      : live.period
      ? "OT"
      : "";

  return (
    <div className="glass-card border-rink-600/30 overflow-hidden mb-4 animate-fade-in">
      <div className="px-4 py-3 flex items-center justify-between bg-rink-800/30">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-xs font-bold uppercase text-live tracking-wider">
            Live
          </span>
        </div>
        <span className="text-xs font-mono text-ice-dim">
          {periodLabel} {live.clock ?? ""}
        </span>
      </div>

      <div className="px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        {/* Visitor side */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white"
              style={{ backgroundColor: visitorTeam.color }}
            >
              {visitorTeam.abbr}
            </div>
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              {live.visitorGoals}
            </span>
          </div>
          {live.visitorPenalties.length > 0 && (
            <div className="w-full space-y-1">
              {live.visitorPenalties.map((pen, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded bg-amber-900/20 border border-amber-800/30 px-2 py-1"
                >
                  <span className="text-[10px] font-bold text-amber-400 uppercase shrink-0">
                    PEN
                  </span>
                  <span className="text-[10px] text-gray-300 truncate">
                    #{pen.jerseyNumber} {pen.playerName}
                  </span>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {pen.minutes}min
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <span className="text-gray-600 text-sm mt-1.5">&mdash;</span>

        {/* Home side */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              {live.homeGoals}
            </span>
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white"
              style={{ backgroundColor: homeTeam.color }}
            >
              {homeTeam.abbr}
            </div>
          </div>
          {live.homePenalties.length > 0 && (
            <div className="w-full space-y-1">
              {live.homePenalties.map((pen, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded bg-amber-900/20 border border-amber-800/30 px-2 py-1"
                >
                  <span className="text-[10px] font-bold text-amber-400 uppercase shrink-0">
                    PEN
                  </span>
                  <span className="text-[10px] text-gray-300 truncate">
                    #{pen.jerseyNumber} {pen.playerName}
                  </span>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {pen.minutes}min
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(live.homeShots > 0 || live.visitorShots > 0) && (
        <div className="px-4 pb-3 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span>
            SOG: {visitorTeam.abbr} {live.visitorShots}
          </span>
          <span className="text-gray-600">|</span>
          <span>
            {homeTeam.abbr} {live.homeShots}
          </span>
        </div>
      )}
    </div>
  );
}
