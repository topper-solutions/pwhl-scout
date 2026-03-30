import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface UpstreamResult {
  name: string;
  status: "ok" | "down";
  latencyMs: number;
  error?: string;
}

async function checkHockeyTech(): Promise<UpstreamResult> {
  const key = process.env.HOCKEYTECH_API_KEY;
  const client = process.env.HOCKEYTECH_CLIENT_CODE ?? "pwhl";

  if (!key) {
    return { name: "hockeytech", status: "down", latencyMs: 0, error: "credentials not configured" };
  }

  const url = `https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=scorebar&key=${key}&client_code=${client}&lang=en&fmt=json&numberofdaysback=0&numberofdaysahead=0`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { name: "hockeytech", status: "down", latencyMs, error: `HTTP ${res.status}` };
    }

    return { name: "hockeytech", status: "ok", latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "unknown error";
    return { name: "hockeytech", status: "down", latencyMs, error: message };
  }
}

async function checkFirebase(): Promise<UpstreamResult> {
  const authToken = process.env.FIREBASE_AUTH_TOKEN;
  const apiKey = process.env.FIREBASE_API_KEY;

  if (!authToken || !apiKey) {
    return { name: "firebase", status: "down", latencyMs: 0, error: "credentials not configured" };
  }

  const url = `https://leaguestat-b9523.firebaseio.com/svf/pwhl/runningclock.json?shallow=true&auth=${authToken}&key=${apiKey}`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { name: "firebase", status: "down", latencyMs, error: `HTTP ${res.status}` };
    }

    return { name: "firebase", status: "ok", latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "unknown error";
    return { name: "firebase", status: "down", latencyMs, error: message };
  }
}

export async function GET() {
  const upstreams = await Promise.all([checkHockeyTech(), checkFirebase()]);

  const downCount = upstreams.filter((u) => u.status === "down").length;
  const status = downCount === 0 ? "healthy" : downCount === upstreams.length ? "unhealthy" : "degraded";
  const httpStatus = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      upstreams,
    },
    { status: httpStatus },
  );
}
