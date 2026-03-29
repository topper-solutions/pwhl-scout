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
  lastUpdated: number;
}

function extractGameData(
  data: any,
  gameKey: string,
  homeTeamId: string
): Omit<LiveState, "connected" | "lastUpdated"> {
  let clock: string | null = null;
  let period: string | null = null;
  let homeGoals = 0;
  let visitorGoals = 0;
  let homeShots = 0;
  let visitorShots = 0;
  const homePenalties: LivePenalty[] = [];
  const visitorPenalties: LivePenalty[] = [];

  const clockGames = data?.runningclock?.games ?? data?.runningclock;
  const gameClock = clockGames?.[gameKey];
  if (gameClock?.Clock) {
    clock = `${gameClock.Clock.Minutes ?? "00"}:${gameClock.Clock.Seconds ?? "00"}`;
    period = String(gameClock.Clock.period ?? "");
  }

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

  const pensRoot = Array.isArray(data?.penalties)
    ? data.penalties.find((p: any) => p?.games)
    : data?.penalties;
  const gamePenalties = pensRoot?.games?.[gameKey]?.GamePenalties;
  if (gamePenalties && typeof gamePenalties === "object") {
    const currentPeriod = parseInt(period ?? "0");
    for (const pen of Object.values(gamePenalties) as any[]) {
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

// Renders inline within the scoreboard — not a standalone card
export function LiveGameOverlay({
  gameId,
  homeTeamId,
  visitorTeamId,
  isLive,
  children,
}: {
  gameId: number;
  homeTeamId: string;
  visitorTeamId: string;
  isLive: boolean;
  children: (live: LiveState) => React.ReactNode;
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
    lastUpdated: 0,
  });

  const homeTeam = getTeamMeta(homeTeamId);
  const visitorTeam = getTeamMeta(visitorTeamId);
  const gameKey = String(gameId);
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
          setLive({ ...extracted, connected: true, lastUpdated: Date.now() });
        }
      } catch { /* ignore */ }
    });

    eventSource.addEventListener("patch", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.data && fullDataRef.current) {
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
          const extracted = extractGameData(fullDataRef.current, gameKey, homeTeamId);
          setLive({ ...extracted, connected: true, lastUpdated: Date.now() });
        }
      } catch { /* ignore */ }
    });

    eventSource.onerror = () => {
      setLive((prev) => ({ ...prev, connected: false }));
    };

    return () => { eventSource.close(); };
  }, [isLive, gameKey, homeTeamId]);

  // Expose live data + team info to parent via render prop
  void homeTeam;
  void visitorTeam;

  return <>{children(live)}</>;
}
