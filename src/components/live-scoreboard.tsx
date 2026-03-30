"use client";

import { useEffect, useRef, useState } from "react";
import { getTeamMeta } from "@/lib/teams";
import { PERIOD_LABELS } from "@/lib/utils";
import { extractGameData } from "@/lib/extract-game-data";
import type { LivePenalty } from "@/lib/extract-game-data";
import { TeamLogo } from "@/components/team-logo";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  wasConnected: boolean;
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
    wasConnected: false,
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
          setLive({ ...extractGameData(p.data, gameKey, homeTeamId), connected: true, wasConnected: true });
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
          setLive({ ...extractGameData(fullDataRef.current, gameKey, homeTeamId), connected: true, wasConnected: true });
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
              <TeamLogo team={awayTeam} size="xl" />
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
              <TeamLogo team={homeTeam} size="xl" />
            </Link>
            <span className="text-xs sm:text-sm font-medium text-gray-300">{homeName}</span>
            {live.connected && <PenBadges penalties={live.homePenalties} />}
          </div>
        </div>

        {live.connected && (() => {
          // Derive game situation from active non-coincidental, non-misconduct penalties
          const homePPPens = live.homePenalties.filter(p => !p.isCoincidental && !p.isMisconduct);
          const awayPPPens = live.visitorPenalties.filter(p => !p.isCoincidental && !p.isMisconduct);
          const homeInBox = homePPPens.length;
          const awayInBox = awayPPPens.length;
          let situation: string | null = null;
          let situationClass = "text-gray-400";
          if (homeInBox > 0 && awayInBox === 0) {
            situation = homeInBox >= 2 ? `5-on-3 ${awayTeam.abbr}` : `PP ${awayTeam.abbr}`;
            situationClass = "text-amber-400";
          } else if (awayInBox > 0 && homeInBox === 0) {
            situation = awayInBox >= 2 ? `5-on-3 ${homeTeam.abbr}` : `PP ${homeTeam.abbr}`;
            situationClass = "text-amber-400";
          } else if (homeInBox > 0 && awayInBox > 0) {
            if (homeInBox > awayInBox) {
              situation = `PP ${awayTeam.abbr}`;
              situationClass = "text-amber-400";
            } else if (awayInBox > homeInBox) {
              situation = `PP ${homeTeam.abbr}`;
              situationClass = "text-amber-400";
            } else {
              situation = `${5 - homeInBox}-on-${5 - awayInBox}`;
              situationClass = "text-sky-400";
            }
          }

          return (
            <div className="flex items-center justify-center gap-4 text-xs mt-1">
              {situation && (
                <>
                  <span className={`font-bold uppercase ${situationClass}`}>{situation}</span>
                  {(live.homeShots > 0 || live.visitorShots > 0) && <span className="text-gray-600">|</span>}
                </>
              )}
              {(live.homeShots > 0 || live.visitorShots > 0) && (
                <span className="text-gray-400">
                  SOG: {awayTeam.abbr} {live.visitorShots} — {homeTeam.abbr} {live.homeShots}
                </span>
              )}
            </div>
          );
        })()}

        {isLive && !live.connected && (
          <p className={`text-center text-[10px] mt-2 ${live.wasConnected ? "text-amber-500" : "text-amber-500/60"}`}>
            {live.wasConnected ? "Reconnecting to live data..." : "Connecting to live data..."}
          </p>
        )}

        {venue && <p className="text-center text-xs text-gray-500 mt-3">{venue}</p>}
      </div>
    </div>
  );
}
