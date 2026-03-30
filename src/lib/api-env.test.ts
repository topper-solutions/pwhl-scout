// Tests for api.ts code paths that depend on missing environment variables.
// These require dynamic imports with vi.resetModules() because the module
// reads env vars at load time (before vi.stubEnv can run).

describe("api.ts with missing env vars", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("HOCKEYTECH_API_KEY", "");
    vi.stubEnv("HOCKEYTECH_CLIENT_CODE", "");
    vi.stubEnv("FIREBASE_AUTH_TOKEN", "");
    vi.stubEnv("FIREBASE_API_KEY", "");
    delete process.env.HOCKEYTECH_CLIENT_CODE;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("validateEnv logs error when env vars are missing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await import("./api");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Missing required environment variables")
    );
  });

  it("htFetch throws when API key is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { getScorebar } = await import("./api");
    await expect(getScorebar()).rejects.toThrow("HOCKEYTECH_API_KEY is not set");
  });

  it("firebaseFetch throws when credentials are missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { getLiveData } = await import("./api");
    await expect(getLiveData()).rejects.toThrow("Firebase credentials are not set");
  });
});
