import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  oxc: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      reporter: ["text", "json-summary"],
      reportOnFailure: true,
    },
    env: {
      HOCKEYTECH_API_KEY: "test-key",
      HOCKEYTECH_CLIENT_CODE: "pwhl",
      FIREBASE_AUTH_TOKEN: "test-firebase-auth",
      FIREBASE_API_KEY: "test-firebase-key",
    },
  },
});
