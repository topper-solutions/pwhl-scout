/* eslint-disable @typescript-eslint/no-explicit-any */

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
