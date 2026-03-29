import { getPbpLabel } from "./pbp-labels";

describe("getPbpLabel", () => {
  it.each([
    ["goal", "Goal", "text-live"],
    ["shot", "Shot on Goal", "text-sky-400"],
    ["blocked_shot", "Blocked Shot", "text-sky-600"],
    ["faceoff", "Faceoff", "text-gray-500"],
    ["hit", "Hit", "text-orange-400"],
    ["penalty", "Penalty", "text-amber-400"],
    ["goalie_change", "Goaltender Change", "text-purple-400"],
    ["stoppage", "Whistle", "text-gray-600"],
    ["period_start", "Period Start", "text-ice-dim"],
    ["period_end", "Period End", "text-ice-dim"],
  ])("maps %s to label=%s color=%s", (event, label, color) => {
    expect(getPbpLabel(event)).toEqual({ label, color });
  });

  it("returns humanized fallback for unknown events", () => {
    const result = getPbpLabel("unknown_event_type");
    expect(result.label).toBe("unknown event type");
    expect(result.color).toBe("text-gray-500");
  });

  it("handles empty string", () => {
    const result = getPbpLabel("");
    expect(result.label).toBe("");
    expect(result.color).toBe("text-gray-500");
  });
});
