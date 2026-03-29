// Suppress validateEnv() console.error on module import (env vars not set in test)
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => {
  vi.restoreAllMocks();
});

import { extractSiteKit, parseHockeyTechResponse } from "./api";

describe("extractSiteKit", () => {
  it("extracts from SiteKit wrapper", () => {
    const data = { SiteKit: { Scorebar: [{ id: 1 }] } };
    expect(extractSiteKit(data, "Scorebar")).toEqual([{ id: 1 }]);
  });

  it("extracts from direct property", () => {
    const data = { Schedule: [{ id: 1 }] };
    expect(extractSiteKit(data, "Schedule")).toEqual([{ id: 1 }]);
  });

  it("extracts from array with SiteKit", () => {
    const data = [{ SiteKit: { Scorebar: [{ id: 1 }] } }];
    expect(extractSiteKit(data, "Scorebar")).toEqual([{ id: 1 }]);
  });

  it("extracts from GC wrapper", () => {
    const data = { GC: { Gamesummary: { home: "team1" } } };
    expect(extractSiteKit(data, "Gamesummary")).toEqual({ home: "team1" });
  });

  it("extracts from sections-based response", () => {
    const data = [
      {
        sections: [
          {
            data: [
              { row: { name: "Player1" } },
              { name: "Player2" },
            ],
          },
        ],
      },
    ];
    const result = extractSiteKit(data, "Players");
    expect(result).toEqual([{ name: "Player1" }, { name: "Player2" }]);
  });

  it("returns null for null input", () => {
    expect(extractSiteKit(null, "Anything")).toBeNull();
  });

  it("returns raw data when no wrapper matches", () => {
    const data = { someOtherKey: "value" };
    expect(extractSiteKit(data, "Missing")).toEqual(data);
  });
});

describe("parseHockeyTechResponse", () => {
  it("parses named JSONP callback", () => {
    const body = 'Modulekit.callback({"key":"value"})';
    expect(parseHockeyTechResponse(body)).toEqual({ key: "value" });
  });

  it("parses anonymous JSONP wrapper", () => {
    const body = '([{"id":1}])';
    expect(parseHockeyTechResponse(body)).toEqual([{ id: 1 }]);
  });

  it("parses raw JSON object", () => {
    const body = '{"key":"value"}';
    expect(parseHockeyTechResponse(body)).toEqual({ key: "value" });
  });

  it("parses raw JSON array", () => {
    const body = '[1,2,3]';
    expect(parseHockeyTechResponse(body)).toEqual([1, 2, 3]);
  });

  it("trims whitespace", () => {
    const body = '  {"key":"value"}  ';
    expect(parseHockeyTechResponse(body)).toEqual({ key: "value" });
  });

  it("warns on non-standard format before parsing", () => {
    expect(() => parseHockeyTechResponse("not json")).toThrow();
    expect(console.warn).toHaveBeenCalled();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseHockeyTechResponse("{broken")).toThrow();
  });
});
