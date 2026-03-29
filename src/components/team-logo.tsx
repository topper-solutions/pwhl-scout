import Image from "next/image";
import { type TeamMeta } from "@/lib/teams";

const SIZES = {
  xs: { wh: 20, text: "text-[7px]", rounded: "rounded" },
  sm: { wh: 24, text: "text-[8px]", rounded: "rounded" },
  md: { wh: 28, text: "text-[10px]", rounded: "rounded-md" },
  lg: { wh: 56, text: "text-base", rounded: "rounded-xl" },
  xl: { wh: 64, text: "text-lg", rounded: "rounded-xl" },
} as const;

type LogoSize = keyof typeof SIZES;

export function TeamLogo({
  team,
  size = "md",
  className = "",
}: {
  team: TeamMeta;
  size?: LogoSize;
  className?: string;
}) {
  const { wh, text, rounded } = SIZES[size];

  if (team.logo) {
    return (
      <Image
        src={team.logo}
        alt={`${team.city} ${team.name}`}
        width={wh}
        height={wh}
        className={`${rounded} object-contain ${className}`}
      />
    );
  }

  // Fallback: colored abbreviation block
  return (
    <div
      className={`flex items-center justify-center ${text} font-black text-white ${rounded} shadow-md ${className}`}
      style={{ width: wh, height: wh, backgroundColor: team.color }}
    >
      {team.abbr}
    </div>
  );
}
