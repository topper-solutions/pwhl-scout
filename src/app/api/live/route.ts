import { NextRequest } from "next/server";

const FIREBASE_BASE = "https://leaguestat-b9523.firebaseio.com/svf/pwhl";
const FIREBASE_AUTH_TOKEN = process.env.FIREBASE_AUTH_TOKEN;
const FIREBASE_KEY = process.env.FIREBASE_API_KEY;

// Proxy Firebase SSE to the client so credentials stay server-side.
// Client connects to /api/live and receives the same SSE stream.
export async function GET(request: NextRequest) {
  if (!FIREBASE_AUTH_TOKEN || !FIREBASE_KEY) {
    return new Response("Firebase credentials not configured", { status: 500 });
  }

  const url = `${FIREBASE_BASE}.json?auth=${FIREBASE_AUTH_TOKEN}&key=${FIREBASE_KEY}`;

  const upstream = await fetch(url, {
    headers: { Accept: "text/event-stream" },
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Failed to connect to live data", {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
