import { TEAM_LIST } from "@/lib/teams";
import Link from "next/link";

export function TeamFilter({
  baseHref,
  activeTeamId,
}: {
  baseHref: string;
  activeTeamId: number | null;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href={baseHref}
        className={`team-badge border transition-colors ${
          !activeTeamId
            ? "border-ice/40 bg-rink-700/60 text-white"
            : "border-rink-700/30 bg-rink-900/40 text-gray-400 hover:text-white"
        }`}
      >
        All
      </Link>
      {TEAM_LIST.map((t) => (
        <Link
          key={t.id}
          href={`${baseHref}${baseHref.includes("?") ? "&" : "?"}team=${t.id}`}
          className={`team-badge border transition-colors ${
            activeTeamId === t.id
              ? "text-white"
              : "border-rink-700/30 bg-rink-900/40 text-gray-400 hover:text-white"
          }`}
          style={
            activeTeamId === t.id
              ? {
                  borderColor: t.color + "80",
                  backgroundColor: t.color + "30",
                }
              : undefined
          }
        >
          {t.abbr}
        </Link>
      ))}
    </div>
  );
}
