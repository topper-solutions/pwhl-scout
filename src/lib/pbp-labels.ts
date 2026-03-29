// Human-readable labels and colors for play-by-play event types
const PBP_MAP: Record<string, { label: string; color: string }> = {
  goal: { label: "Goal", color: "text-live" },
  shot: { label: "Shot on Goal", color: "text-sky-400" },
  blocked_shot: { label: "Blocked Shot", color: "text-sky-600" },
  faceoff: { label: "Faceoff", color: "text-gray-500" },
  hit: { label: "Hit", color: "text-orange-400" },
  penalty: { label: "Penalty", color: "text-amber-400" },
  goalie_change: { label: "Goaltender Change", color: "text-purple-400" },
  stoppage: { label: "Whistle", color: "text-gray-600" },
  period_start: { label: "Period Start", color: "text-ice-dim" },
  period_end: { label: "Period End", color: "text-ice-dim" },
};

export function getPbpLabel(eventType: string): { label: string; color: string } {
  return PBP_MAP[eventType] ?? { label: eventType.replace(/_/g, " "), color: "text-gray-500" };
}
