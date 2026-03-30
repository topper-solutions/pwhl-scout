"use client";

import { useEffect, useRef, useState } from "react";
import { getTeamMeta, type TeamMeta } from "@/lib/teams";
import Image from "next/image";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface LivePenalty {
  playerName: string;
  jerseyNumber: number;
  isHome: boolean;
  minutes: number;
  offence: string;
  remainingSeconds: number;
  isMajor: boolean;
  isMisconduct: boolean;
  isCoincidental: boolean;
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

const PERIOD_LABELS: Record<string, string> = {
  "1": "1st", "2": "2nd", "3": "3rd", "4": "OT",
};

export function extractGameData(data: any, gameKey: string, homeTeamId: string) {
  let clock: string | null = null;
  let period: string | null = null;
  let homeGoals = 0, visitorGoals = 0, homeShots = 0, visitorShots = 0;
  const homePenalties: LivePenalty[] = [];
  const visitorPenalties: LivePenalty[] = [];

  const clockGames = data?.runningclock?.games ?? data?.runningclock;
  const gc = clockGames?.[gameKey];
  if (gc?.Clock) {
    clock = `${gc.Clock.Minutes ?? "00"}:${gc.Clock.Seconds ?? "00"}`;
    period = String(gc.Clock.period ?? "");
  }

  const goalsRoot = Array.isArray(data?.goals) ? data.goals.find((g: any) => g?.games) : data?.goals;
  const gameGoals = goalsRoot?.games?.[gameKey]?.GameGoals;
  if (gameGoals && typeof gameGoals === "object") {
    for (const goal of Object.values(gameGoals) as any[]) {
      if (goal.IsHome) homeGoals++; else visitorGoals++;
    }
  }

  const shotsRoot = Array.isArray(data?.shotssummary) ? data.shotssummary.find((s: any) => s?.games) : data?.shotssummary;
  const gs = shotsRoot?.games?.[gameKey]?.GameShotSummary;
  if (gs && typeof gs === "object") {
    if (gs.HomeShots !== undefined) {
      homeShots = Number(gs.HomeShots) || 0;
      visitorShots = Number(gs.VisitorShots) || 0;
    } else {
      for (const pd of Object.values(gs) as any[]) {
        if (typeof pd === "object" && pd) {
          for (const [tid, c] of Object.entries(pd)) {
            if (String(tid) === String(homeTeamId)) homeShots += Number(c) || 0;
            else visitorShots += Number(c) || 0;
          }
        }
      }
    }
  }

  const PERIOD_SECONDS = 1200; // 20 minutes per period
  const pensRoot = Array.isArray(data?.penalties) ? data.penalties.find((p: any) => p?.games) : data?.penalties;
  const gamePens = pensRoot?.games?.[gameKey]?.GamePenalties;
  // #60: Only process penalties when we have reliable clock data.
  // Without a clock, we can't calculate remaining time accurately.
  if (gamePens && typeof gamePens === "object" && clock !== null && period) {
    const curPeriod = parseInt(period);
    const clockParts = clock.split(":");
    const clockSeconds = clockParts.length === 2
      ? parseInt(clockParts[0]) * 60 + parseInt(clockParts[1])
      : 0;
    // Absolute game seconds elapsed: how far into the game we are
    const gameElapsed = (curPeriod - 1) * PERIOD_SECONDS + (PERIOD_SECONDS - clockSeconds);

    // Collect PP goals with their absolute game time for minor termination
    const ppGoalTimes: { gameSecond: number; againstHome: boolean }[] = [];
    if (gameGoals && typeof gameGoals === "object") {
      for (const goal of Object.values(gameGoals) as any[]) {
        if (goal.PowerPlay) {
          const gPeriod = parseInt(goal.Period ?? "1");
          const gTimeParts = (goal.Time ?? "").split(":");
          const gClockSec = gTimeParts.length === 2
            ? parseInt(gTimeParts[0]) * 60 + parseInt(gTimeParts[1])
            : 0;
          const gGameSec = (gPeriod - 1) * PERIOD_SECONDS + (PERIOD_SECONDS - gClockSec);
          // A PP goal is scored against the team that committed the penalty
          // goal.IsHome means the HOME team scored, so the penalty was on the VISITOR
          ppGoalTimes.push({ gameSecond: gGameSec, againstHome: !goal.IsHome });
        }
      }
    }

    // First pass: parse all penalties with their timing
    interface ParsedPenalty {
      playerName: string;
      jerseyNumber: number;
      isHome: boolean;
      minutes: number;
      offence: string;
      isMajor: boolean;
      isMisconduct: boolean;
      penGameSec: number;
      expiryGameSec: number;
    }
    const parsedPens: ParsedPenalty[] = [];

    for (const pen of Object.values(gamePens) as any[]) {
      const penPeriod = parseInt(pen.Period ?? "0");
      const penTimeParts = (pen.Time ?? "").split(":");
      const penClockSec = penTimeParts.length === 2
        ? parseInt(penTimeParts[0]) * 60 + parseInt(penTimeParts[1])
        : 0;
      // Absolute game second when penalty was called
      const penGameSec = (penPeriod - 1) * PERIOD_SECONDS + (PERIOD_SECONDS - penClockSec);
      const penMinutes = pen.Minutes ?? 2;
      const durationSeconds = penMinutes * 60;
      // #58: Misconduct = 10 min. Doesn't create a power play.
      const isMisconduct = penMinutes === 10;
      const isMajor = penMinutes >= 5 && !isMisconduct;
      const isHome = !!pen.Home;

      // Natural expiry time (absolute game seconds)
      let expiryGameSec = penGameSec + durationSeconds;

      // PP goal termination only applies to minor penalties (2 min).
      // Majors (5 min) are served in full. Misconducts don't create PPs.
      if (!isMajor && !isMisconduct) {
        for (const ppg of ppGoalTimes) {
          if (ppg.againstHome === isHome &&
              ppg.gameSecond > penGameSec &&
              ppg.gameSecond < expiryGameSec) {
            expiryGameSec = ppg.gameSecond;
            break; // Only the first PP goal ends the penalty
          }
        }
      }

      // Still active?
      if (gameElapsed < expiryGameSec) {
        parsedPens.push({
          playerName: `${pen.PenalizedPlayerFirstName ?? ""} ${pen.PenalizedPlayerLastName ?? ""}`.trim(),
          jerseyNumber: pen.PenalizedPlayerJerseyNumber ?? 0,
          isHome,
          minutes: penMinutes,
          offence: pen.OffenceDescription ?? "Penalty",
          isMajor,
          isMisconduct,
          penGameSec,
          expiryGameSec,
        });
      }
    }

    // #57: Detect coincidental penalties — penalties on opposite teams assessed
    // at the same game second. These offset and don't create a power play.
    const coincidentalSet = new Set<number>();
    for (let i = 0; i < parsedPens.length; i++) {
      for (let j = i + 1; j < parsedPens.length; j++) {
        const a = parsedPens[i], b = parsedPens[j];
        if (a.isHome !== b.isHome &&
            a.penGameSec === b.penGameSec &&
            a.minutes === b.minutes) {
          coincidentalSet.add(i);
          coincidentalSet.add(j);
        }
      }
    }

    // Build final penalty lists
    for (let i = 0; i < parsedPens.length; i++) {
      const p = parsedPens[i];
      const isCoincidental = coincidentalSet.has(i);
      const livePen: LivePenalty = {
        playerName: p.playerName,
        jerseyNumber: p.jerseyNumber,
        isHome: p.isHome,
        minutes: p.minutes,
        offence: p.offence,
        remainingSeconds: p.expiryGameSec - gameElapsed,
        isMajor: p.isMajor,
        isMisconduct: p.isMisconduct,
        isCoincidental,
      };
      if (p.isHome) homePenalties.push(livePen);
      else visitorPenalties.push(livePen);
    }
  }

  return { clock, period, homeGoals, visitorGoals, homeShots, visitorShots, homePenalties, visitorPenalties };
}

export function LiveScoreboard({
  gameId,
  homeTeamId,
  visitorTeamId,
  isLive,
  initialHomeScore,
  initialAwayScore,
  status,
  gameDate,
  venue,
  homeName,
  visitorName,
}: {
  gameId: number;
  homeTeamId: string;
  visitorTeamId: string;
  isLive: boolean;
  initialHomeScore: number | string;
  initialAwayScore: number | string;
  status: string;
  gameDate: string;
  venue: string;
  homeName: string;
  visitorName: string;
}) {
  const homeTeam = getTeamMeta(homeTeamId);
  const awayTeam = getTeamMeta(visitorTeamId);
  const gameKey = String(gameId);
  const fullDataRef = useRef<any>(null);

  const [live, setLive] = useState<LiveState>({
    clock: null, period: null,
    homeGoals: 0, visitorGoals: 0,
    homeShots: 0, visitorShots: 0,
    homePenalties: [], visitorPenalties: [],
    connected: false,
  });

  useEffect(() => {
    if (!isLive) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const es = new EventSource(`${basePath}/api/live`);

    es.addEventListener("put", (event: MessageEvent) => {
      try {
        const p = JSON.parse(event.data);
        if (p.path === "/" && p.data) {
          fullDataRef.current = p.data;
          setLive({ ...extractGameData(p.data, gameKey, homeTeamId), connected: true });
        }
      } catch { /* ignore */ }
    });

    es.addEventListener("patch", (event: MessageEvent) => {
      try {
        const p = JSON.parse(event.data);
        if (p.data && fullDataRef.current) {
          const path = p.path?.replace(/^\//, "");
          if (path) {
            const parts = path.split("/");
            let target = fullDataRef.current;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!target[parts[i]]) target[parts[i]] = {};
              target = target[parts[i]];
            }
            const last = parts[parts.length - 1];
            target[last] = typeof p.data === "object" && p.data !== null
              ? { ...target[last], ...p.data } : p.data;
          } else {
            fullDataRef.current = { ...fullDataRef.current, ...p.data };
          }
          setLive({ ...extractGameData(fullDataRef.current, gameKey, homeTeamId), connected: true });
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => setLive((prev) => ({ ...prev, connected: false }));
    return () => es.close();
  }, [isLive, gameKey, homeTeamId]);

  const displayAwayScore = live.connected ? live.visitorGoals : initialAwayScore;
  const displayHomeScore = live.connected ? live.homeGoals : initialHomeScore;

  function PenBadges({ penalties }: { penalties: LivePenalty[] }) {
    if (penalties.length === 0) return null;
    return (
      <div className="space-y-1 w-full max-w-[180px]">
        {penalties.map((pen, i) => {
          const mins = Math.floor(pen.remainingSeconds / 60);
          const secs = pen.remainingSeconds % 60;
          const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

          // Visual distinction: major (red), misconduct (gray), coincidental (blue), minor (amber)
          let badgeClass: string;
          let labelClass: string;
          let label: string;
          if (pen.isMajor) {
            badgeClass = "bg-red-900/20 border-red-800/30";
            labelClass = "text-red-400";
            label = "MAJ";
          } else if (pen.isMisconduct) {
            badgeClass = "bg-gray-800/30 border-gray-700/30";
            labelClass = "text-gray-400";
            label = "MIS";
          } else if (pen.isCoincidental) {
            badgeClass = "bg-sky-900/20 border-sky-800/30";
            labelClass = "text-sky-400";
            label = "4v4";
          } else {
            badgeClass = "bg-amber-900/20 border-amber-800/30";
            labelClass = "text-amber-400";
            label = "PEN";
          }

          return (
            <div key={i} className={`flex items-center gap-1 rounded border px-1.5 py-0.5 ${badgeClass}`}>
              <span className={`text-[9px] font-bold ${labelClass}`}>
                {label}
              </span>
              <span className="text-[9px] text-gray-300 truncate">
                #{pen.jerseyNumber} {pen.playerName}
              </span>
              <span className="text-[9px] font-mono text-gray-500 shrink-0">
                {timeStr}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden mb-6">
      <div className="h-1.5" style={{
        background: `linear-gradient(to right, ${awayTeam.color}, ${awayTeam.color} 48%, transparent 48%, transparent 52%, ${homeTeam.color} 52%)`,
      }} />

      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">{gameDate}</span>
          {live.connected ? (
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-live">
              <span className="live-dot" />
              {live.period ? PERIOD_LABELS[live.period] ?? `P${live.period}` : ""} {live.clock ?? ""}
            </span>
          ) : (
            <span className={`text-xs font-bold uppercase ${isLive ? "text-live" : "text-gray-400"}`}>
              {status}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 sm:gap-8 py-4">
          <div className="flex flex-col items-center gap-2">
            <Link href={`/team/${awayTeam.id}`}>
              {awayTeam.logo ? (
                <Image src={awayTeam.logo} alt={`${awayTeam.city} ${awayTeam.name}`} width={64} height={64} className="rounded-xl object-contain" />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-base sm:text-lg font-black text-white shadow-xl" style={{ backgroundColor: awayTeam.color }}>{awayTeam.abbr}</div>
              )}
            </Link>
            <span className="text-xs sm:text-sm font-medium text-gray-300">{visitorName}</span>
            {live.connected && <PenBadges penalties={live.visitorPenalties} />}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="font-mono text-4xl sm:text-5xl font-black text-white tabular-nums">{displayAwayScore}</span>
            <span className="text-xl text-gray-600 font-light">–</span>
            <span className="font-mono text-4xl sm:text-5xl font-black text-white tabular-nums">{displayHomeScore}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Link href={`/team/${homeTeam.id}`}>
              {homeTeam.logo ? (
                <Image src={homeTeam.logo} alt={`${homeTeam.city} ${homeTeam.name}`} width={64} height={64} className="rounded-xl object-contain" />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-base sm:text-lg font-black text-white shadow-xl" style={{ backgroundColor: homeTeam.color }}>{homeTeam.abbr}</div>
              )}
            </Link>
            <span className="text-xs sm:text-sm font-medium text-gray-300">{homeName}</span>
            {live.connected && <PenBadges penalties={live.homePenalties} />}
          </div>
        </div>

        {live.connected && (live.homeShots > 0 || live.visitorShots > 0) && (
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400 mt-1">
            <span>SOG: {awayTeam.abbr} {live.visitorShots}</span>
            <span className="text-gray-600">|</span>
            <span>{homeTeam.abbr} {live.homeShots}</span>
          </div>
        )}

        {isLive && !live.connected && (
          <p className="text-center text-[10px] text-amber-500/60 mt-2">
            Connecting to live data...
          </p>
        )}

        {venue && <p className="text-center text-xs text-gray-500 mt-3">{venue}</p>}
      </div>
    </div>
  );
}
