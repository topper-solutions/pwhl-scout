import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// Dynamic import so env stubs take effect before module-level reads
async function getHandler() {
  const mod = await import("./route");
  return mod.GET;
}

function mockFetch(impl: typeof globalThis.fetch) {
  vi.stubGlobal("fetch", impl);
}

function okResponse() {
  return new Response("ok", { status: 200 });
}

function errorResponse(status = 500) {
  return new Response("error", { status, statusText: "Internal Server Error" });
}

describe("/api/health", () => {
  beforeEach(() => {
    vi.stubEnv("HOCKEYTECH_API_KEY", "test-key");
    vi.stubEnv("HOCKEYTECH_CLIENT_CODE", "pwhl");
    vi.stubEnv("FIREBASE_AUTH_TOKEN", "test-firebase-auth");
    vi.stubEnv("FIREBASE_API_KEY", "test-firebase-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns healthy when both upstreams respond 200", async () => {
    mockFetch(vi.fn().mockResolvedValue(okResponse()));
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.upstreams).toHaveLength(2);
    expect(body.upstreams[0]).toMatchObject({ name: "hockeytech", status: "ok" });
    expect(body.upstreams[1]).toMatchObject({ name: "firebase", status: "ok" });
    expect(body.timestamp).toBeTruthy();
  });

  it("returns degraded when HockeyTech fails but Firebase is OK", async () => {
    mockFetch(
      vi.fn()
        .mockResolvedValueOnce(errorResponse(500))
        .mockResolvedValueOnce(okResponse()),
    );
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.upstreams[0]).toMatchObject({ name: "hockeytech", status: "down" });
    expect(body.upstreams[1]).toMatchObject({ name: "firebase", status: "ok" });
  });

  it("returns unhealthy with 503 when both upstreams fail", async () => {
    mockFetch(vi.fn().mockResolvedValue(errorResponse(500)));
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.upstreams[0]).toMatchObject({ name: "hockeytech", status: "down" });
    expect(body.upstreams[1]).toMatchObject({ name: "firebase", status: "down" });
  });

  it("reports upstream as down when fetch throws (e.g. timeout)", async () => {
    mockFetch(
      vi.fn()
        .mockRejectedValueOnce(new Error("The operation was aborted due to timeout"))
        .mockResolvedValueOnce(okResponse()),
    );
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.upstreams[0]).toMatchObject({
      name: "hockeytech",
      status: "down",
      error: "The operation was aborted due to timeout",
    });
    expect(body.upstreams[1]).toMatchObject({ name: "firebase", status: "ok" });
  });

  it("reports upstream as down with descriptive error when credentials are missing", async () => {
    vi.stubEnv("HOCKEYTECH_API_KEY", "");
    vi.stubEnv("FIREBASE_AUTH_TOKEN", "");
    vi.stubEnv("FIREBASE_API_KEY", "");

    mockFetch(vi.fn().mockResolvedValue(okResponse()));
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.upstreams[0]).toMatchObject({
      name: "hockeytech",
      status: "down",
      error: "credentials not configured",
    });
    expect(body.upstreams[1]).toMatchObject({
      name: "firebase",
      status: "down",
      error: "credentials not configured",
    });
  });

  it("reports Firebase as down when fetch throws a network error", async () => {
    mockFetch(
      vi.fn()
        .mockResolvedValueOnce(okResponse())
        .mockRejectedValueOnce(new Error("Failed to fetch")),
    );
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.upstreams[0]).toMatchObject({ name: "hockeytech", status: "ok" });
    expect(body.upstreams[1]).toMatchObject({
      name: "firebase",
      status: "down",
      error: "Failed to fetch",
    });
  });

  it("includes positive latency values for successful checks", async () => {
    mockFetch(vi.fn().mockResolvedValue(okResponse()));
    const GET = await getHandler();
    const res = await GET();
    const body = await res.json();

    for (const upstream of body.upstreams) {
      expect(typeof upstream.latencyMs).toBe("number");
      expect(upstream.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });
});
