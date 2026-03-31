import { playerName, isGameLive, isGameFinal, val, formatDate, PERIOD_LABELS, periodLabel } from "./utils";

describe("playerName", () => {
  it("returns name property when present", () => {
    expect(playerName({ name: "Marie-Philip Poulin" })).toBe("Marie-Philip Poulin");
  });

  it("concatenates first_name and last_name", () => {
    expect(playerName({ first_name: "Marie-Philip", last_name: "Poulin" })).toBe("Marie-Philip Poulin");
  });

  it("handles first_name only", () => {
    expect(playerName({ first_name: "Marie-Philip" })).toBe("Marie-Philip");
  });

  it("handles last_name only", () => {
    expect(playerName({ last_name: "Poulin" })).toBe("Poulin");
  });

  it("prefers name over first/last", () => {
    expect(playerName({ name: "Display Name", first_name: "First", last_name: "Last" })).toBe("Display Name");
  });

  it("returns Unknown for empty object", () => {
    expect(playerName({})).toBe("Unknown");
  });

  it("returns Unknown for null/undefined", () => {
    expect(playerName(null)).toBe("Unknown");
    expect(playerName(undefined)).toBe("Unknown");
  });
});

describe("isGameLive", () => {
  it("returns true for status code 2 (In Progress)", () => {
    expect(isGameLive("2")).toBe(true);
    expect(isGameLive(2)).toBe(true);
  });

  it("returns true for status code 3 (Intermission)", () => {
    expect(isGameLive("3")).toBe(true);
    expect(isGameLive(3)).toBe(true);
  });

  it("returns true for string containing 'progress'", () => {
    expect(isGameLive("In Progress")).toBe(true);
    expect(isGameLive("IN PROGRESS (5:00 remaining in 2nd)")).toBe(true);
  });

  it("returns false for other statuses", () => {
    expect(isGameLive("1")).toBe(false);
    expect(isGameLive("4")).toBe(false);
    expect(isGameLive("Final")).toBe(false);
    expect(isGameLive("Scheduled")).toBe(false);
  });
});

describe("isGameFinal", () => {
  it("returns true for status code 4", () => {
    expect(isGameFinal("4")).toBe(true);
    expect(isGameFinal(4)).toBe(true);
  });

  it("returns true for strings containing 'final'", () => {
    expect(isGameFinal("Final")).toBe(true);
    expect(isGameFinal("Final OT")).toBe(true);
    expect(isGameFinal("FINAL SO")).toBe(true);
  });

  it("returns false for other statuses", () => {
    expect(isGameFinal("1")).toBe(false);
    expect(isGameFinal("2")).toBe(false);
    expect(isGameFinal("In Progress")).toBe(false);
  });
});

describe("val", () => {
  it("returns first matching key value", () => {
    expect(val({ a: "hello", b: "world" }, "a", "b")).toBe("hello");
  });

  it("skips null and undefined values", () => {
    expect(val({ a: null, b: undefined, c: "found" }, "a", "b", "c")).toBe("found");
  });

  it("skips empty string values", () => {
    expect(val({ a: "", b: "found" }, "a", "b")).toBe("found");
  });

  it("returns em-dash when obj is null or undefined", () => {
    expect(val(null, "a")).toBe("—");
    expect(val(undefined, "a")).toBe("—");
  });

  it("returns em-dash when no keys match", () => {
    expect(val({}, "a", "b")).toBe("—");
    expect(val({ x: null }, "a")).toBe("—");
  });

  it("returns 0 (falsy but valid)", () => {
    expect(val({ a: 0 }, "a")).toBe(0);
  });

  it("returns false (falsy but valid)", () => {
    expect(val({ a: false }, "a")).toBe(false);
  });
});

describe("formatDate", () => {
  it("returns empty string for empty input", () => {
    expect(formatDate("")).toBe("");
  });

  it("formats a valid ISO date", () => {
    const result = formatDate("2025-11-21T12:00:00");
    expect(result).toContain("Nov");
    expect(result).toContain("21");
  });

  it("returns raw string and warns for unparseable date", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = formatDate("not-a-date");
    expect(result).toBe("not-a-date");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns raw string when toLocaleDateString throws", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const origToLocale = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = () => { throw new Error("locale error"); };
    const result = formatDate("2025-11-21T12:00:00");
    expect(result).toBe("2025-11-21T12:00:00");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Date formatting error"),
      expect.any(Error)
    );
    Date.prototype.toLocaleDateString = origToLocale;
    spy.mockRestore();
  });
});

describe("PERIOD_LABELS", () => {
  it("maps period numbers to short labels", () => {
    expect(PERIOD_LABELS["1"]).toBe("1st");
    expect(PERIOD_LABELS["2"]).toBe("2nd");
    expect(PERIOD_LABELS["3"]).toBe("3rd");
    expect(PERIOD_LABELS["4"]).toBe("OT");
  });
});

describe("periodLabel", () => {
  it("returns short label for known periods", () => {
    expect(periodLabel("1")).toBe("1st");
    expect(periodLabel(2)).toBe("2nd");
    expect(periodLabel("3")).toBe("3rd");
    expect(periodLabel(4)).toBe("OT");
  });

  it("returns fallback for unknown periods", () => {
    expect(periodLabel("5")).toBe("P5");
    expect(periodLabel(6)).toBe("P6");
  });
});
