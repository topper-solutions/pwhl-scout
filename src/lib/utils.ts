export function playerName(p: Record<string, unknown> | null | undefined): string {
  if (p?.name) return String(p.name);
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

export function val(obj: Record<string, unknown> | null | undefined, ...keys: string[]): string | number | boolean {
  if (!obj) return "—";
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v as string | number | boolean;
  }
  return "—";
}

export const PERIOD_LABELS: Record<string, string> = {
  "1": "1st",
  "2": "2nd",
  "3": "3rd",
  "4": "OT",
};

export function periodLabel(p: string | number): string {
  return PERIOD_LABELS[String(p)] ?? `P${p}`;
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
