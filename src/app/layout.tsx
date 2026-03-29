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
  title: "PWHL Scout — Live Scores, Stats & Standings",
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
        {/* Top bar */}
        <header className="sticky top-0 z-50 border-b border-rink-700/40 bg-rink-950/90 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rink-400 to-rink-600 flex items-center justify-center shadow-lg shadow-rink-500/20">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-5 h-5 text-white"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              </div>
              <span className="font-display text-lg font-bold tracking-wide text-white group-hover:text-ice transition-colors">
                PWHL SCOUT
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-rink-800/40 py-6 mt-auto">
          <div className="mx-auto max-w-7xl px-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              PWHL Scout — Unofficial stats tracker
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
