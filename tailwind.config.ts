import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rink: {
          950: "#04080f",
          900: "#0a1628",
          850: "#0e1e35",
          800: "#132842",
          700: "#1a3a5c",
          600: "#234d78",
          500: "#2d6194",
          400: "#4a8ac4",
          300: "#7ab3e0",
          200: "#a8d4f0",
          100: "#d4eaf8",
        },
        ice: {
          DEFAULT: "#c8e6f5",
          bright: "#e8f4fc",
          dim: "#8bbdd9",
        },
        live: "#ef4444",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pulse-live": "pulse-live 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
