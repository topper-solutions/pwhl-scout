import { getTeamMeta, getTeamByAbbr, TEAM_LIST } from "./teams";

describe("getTeamMeta", () => {
  describe("numeric ID lookup", () => {
    it("returns Boston Fleet for ID 1", () => {
      const team = getTeamMeta(1);
      expect(team.abbr).toBe("BOS");
      expect(team.name).toBe("Fleet");
      expect(team.city).toBe("Boston");
    });

    it("returns Seattle Torrent for ID 8 (non-sequential)", () => {
      const team = getTeamMeta(8);
      expect(team.abbr).toBe("SEA");
      expect(team.name).toBe("Torrent");
    });

    it("returns Vancouver Goldeneyes for ID 9", () => {
      const team = getTeamMeta(9);
      expect(team.abbr).toBe("VAN");
    });
  });

  describe("string numeric ID lookup", () => {
    it("resolves string '3' to Montréal Victoire", () => {
      const team = getTeamMeta("3");
      expect(team.abbr).toBe("MTL");
    });
  });

  describe("abbreviation lookup", () => {
    it("resolves 'BOS' (uppercase)", () => {
      expect(getTeamMeta("BOS").city).toBe("Boston");
    });

    it("resolves 'bos' (lowercase)", () => {
      expect(getTeamMeta("bos").city).toBe("Boston");
    });

    it("resolves 'Min' (mixed case)", () => {
      expect(getTeamMeta("Min").city).toBe("Minnesota");
    });
  });

  describe("city name lookup", () => {
    it("resolves 'Boston'", () => {
      expect(getTeamMeta("Boston").abbr).toBe("BOS");
    });

    it("resolves 'Montréal' (with accent)", () => {
      expect(getTeamMeta("Montréal").abbr).toBe("MTL");
    });

    it("resolves 'Montreal' (without accent)", () => {
      expect(getTeamMeta("Montreal").abbr).toBe("MTL");
    });

    it("resolves 'minnesota' (lowercase)", () => {
      expect(getTeamMeta("minnesota").abbr).toBe("MIN");
    });
  });

  describe("fallback for unknown", () => {
    it("returns Unknown team for non-existent ID", () => {
      const team = getTeamMeta(999);
      expect(team.name).toBe("Unknown");
      expect(team.color).toBe("#666666");
    });

    it("preserves short string as abbr", () => {
      expect(getTeamMeta("XYZ").abbr).toBe("XYZ");
    });

    it("returns ??? for long unknown string", () => {
      expect(getTeamMeta("SomeLongName").abbr).toBe("???");
    });
  });
});

describe("getTeamByAbbr", () => {
  it("returns team for valid abbreviation", () => {
    const team = getTeamByAbbr("OTT");
    expect(team).toBeDefined();
    expect(team!.city).toBe("Ottawa");
  });

  it("is case-insensitive", () => {
    expect(getTeamByAbbr("tor")?.city).toBe("Toronto");
  });

  it("returns undefined for unknown abbreviation", () => {
    expect(getTeamByAbbr("ZZZ")).toBeUndefined();
  });
});

describe("TEAM_LIST", () => {
  it("contains 8 teams", () => {
    expect(TEAM_LIST).toHaveLength(8);
  });

  it("every team has required fields", () => {
    for (const team of TEAM_LIST) {
      expect(team.id).toBeGreaterThan(0);
      expect(team.abbr).toMatch(/^[A-Z]{2,3}$/);
      expect(team.name).toBeTruthy();
      expect(team.city).toBeTruthy();
      expect(team.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(team.colorAlt).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
