"use client";

import { useEffect, useState } from "react";

function formatRelativeTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function DataFreshness({
  renderedAt,
  revalidateSeconds,
}: {
  renderedAt: number;
  revalidateSeconds: number;
}) {
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const age = now - renderedAt;
  const stale = age > revalidateSeconds * 2 * 1000;

  return (
    <p className="text-xs text-white/50">
      Updated {formatRelativeTime(age)}
      {stale && (
        <span className="text-amber-400"> &middot; may be outdated</span>
      )}
    </p>
  );
}
