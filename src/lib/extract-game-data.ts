/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LivePenalty {
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

export interface ExtractedGameData {
  clock: string | null;
  period: string | null;
  homeGoals: number;
  visitorGoals: number;
  homeShots: number;
  visitorShots: number;
  homePenalties: LivePenalty[];
  visitorPenalties: LivePenalty[];
}

const PERIOD_SECONDS = 1200; // 20 minutes per period

export function extractGameData(data: any, gameKey: string, homeTeamId: string): ExtractedGameData {
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

  const pensRoot = Array.isArray(data?.penalties) ? data.penalties.find((p: any) => p?.games) : data?.penalties;
  const gamePens = pensRoot?.games?.[gameKey]?.GamePenalties;
  // Only process penalties when we have reliable clock data — without
  // a clock, remaining time can't be calculated accurately.
  if (gamePens && typeof gamePens === "object" && clock !== null && period) {
    const curPeriod = parseInt(period);
    const clockParts = clock.split(":");
    const clockSeconds = clockParts.length === 2
      ? parseInt(clockParts[0]) * 60 + parseInt(clockParts[1])
      : 0;
    const gameElapsed = (curPeriod - 1) * PERIOD_SECONDS + (PERIOD_SECONDS - clockSeconds);

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
          // IsHome = home team scored, so the penalty was against the visitor
          ppGoalTimes.push({ gameSecond: gGameSec, againstHome: !goal.IsHome });
        }
      }
    }

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
      const penGameSec = (penPeriod - 1) * PERIOD_SECONDS + (PERIOD_SECONDS - penClockSec);
      const penMinutes = pen.Minutes ?? 2;
      const durationSeconds = penMinutes * 60;
      // Misconduct (10 min) doesn't create a power play
      const isMisconduct = penMinutes === 10;
      const isMajor = penMinutes >= 5 && !isMisconduct;
      const isHome = !!pen.Home;

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

    // Coincidental penalties: same time, same duration, opposite teams.
    // These offset and don't create a power play.
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
