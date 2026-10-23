import { defaultExclude, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // `.agents/` and `.claude/` hold vendored agent skills, each with its own
    // toolchain and test suite (the clarity skill ships a whole Astro site).
    // Those are upstream's to run, not this project's — without this, vitest
    // collects them and reports a dozen failures that have nothing to do with
    // the map.
    // `e2e/` holds the Playwright suite, which runs in a real browser
    // against a production build — see playwright.config.ts.
    exclude: [...defaultExclude, ".agents/**", ".claude/**", "e2e/**"],
    coverage: {
      provider: "v8",
      // Listed by extension so the Python GTFS tooling in scripts/ isn't
      // handed to the JS parser, which fails the whole report.
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,mjs}"],
      exclude: ["**/*.test.{ts,tsx}", "**/__tests__/**"],
      reporter: ["text-summary", "text", "html", "lcov"],
      // Floors a little under the coverage when they were added (Oct 2026:
      // 80% statements, 73% branches, 84% functions, 82% lines), so CI fails
      // on a real drop rather than on noise. Raise them as coverage improves.
      thresholds: {
        statements: 77,
        branches: 70,
        functions: 80,
        lines: 79,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "styled-system": path.resolve(import.meta.dirname, "./styled-system"),
    },
  },
});
