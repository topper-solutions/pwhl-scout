/* eslint-disable @typescript-eslint/no-explicit-any */

export function playerName(p: any): string {
  if (p?.name) return p.name;
  const full = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
  return full || "Unknown";
}

// GameStatus codes: 1=Not Started, 2=In Progress, 3=Intermission, 4=Final
export function isGameLive(status: string | number): boolean {
  const s = String(status);
  return s === "2" || s === "3" || s.toLowerCase().includes("progress");
}

export function isGameFinal(status: string | number): boolean {
  const s = String(status);
  return s === "4" || s.toLowerCase().includes("final");
}

export function val(obj: any, ...keys: string[]) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return "—";
}

export function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      console.warn(`[utils] Failed to parse date: "${dateStr}"`);
      return dateStr;
    }
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.warn(`[utils] Date formatting error for "${dateStr}":`, error);
    return dateStr;
  }
}
