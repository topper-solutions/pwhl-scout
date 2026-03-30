import type { Metadata } from "next";
import { Oswald, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PWHL Gameday — Live Scores, Stats & Standings",
  description:
    "Track the Professional Women's Hockey League. Live scores, standings, player stats, schedules, and game details.",
};

const NAV_LINKS = [
  { href: "/", label: "Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/stats", label: "Stats" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="font-body min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 border-b border-rink-700/40 bg-rink-950/90 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <svg viewBox="0 0 100 80" className="w-8 h-8" aria-hidden="true">
                <polygon points="5,80 30,30 55,80" fill="#6BB3FF" opacity="0.35"/>
                <polygon points="20,80 48,14 76,80" fill="#6BB3FF" opacity="0.7"/>
                <polygon points="36,80 66,2 96,80" fill="#FFFFFF"/>
              </svg>
              <span className="font-display text-lg font-bold tracking-wide text-white group-hover:text-ice transition-colors">
                PWHL GAMEDAY
              </span>
            </Link>

            <nav aria-label="Main navigation" className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-rink-800/40 py-6 mt-auto">
          <div className="mx-auto max-w-7xl px-4 flex items-center justify-between text-xs text-gray-500">
            <span className="flex flex-col items-start gap-1">
              <span>PWHL Gameday — Built for Keira</span>
              <span className="flex items-center gap-1">
                By:
                <svg viewBox="0 0 380 80" className="h-3.5 w-auto" aria-label="Topper.Solutions">
                  <polygon points="5,80 30,30 55,80" fill="#6BB3FF" opacity="0.35"/>
                  <polygon points="20,80 48,14 76,80" fill="#6BB3FF" opacity="0.7"/>
                  <polygon points="36,80 66,2 96,80" fill="#FFFFFF"/>
                  <text x="114" y="56" fontFamily="Inter, -apple-system, sans-serif" fontSize="32" fontWeight="700" fill="#FFFFFF" letterSpacing="-0.5">Topper</text>
                  <text x="228" y="56" fontFamily="Inter, -apple-system, sans-serif" fontSize="32" fontWeight="400" fill="#6BB3FF" letterSpacing="-0.5">.Solutions</text>
                </svg>
              </span>
            </span>
            <span>
              Data via HockeyTech
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
