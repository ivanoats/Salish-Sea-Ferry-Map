import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const isCI = process.env.CI !== undefined;

/**
 * Browser smoke tests against a production build, served by the standalone
 * server the Docker image runs (scripts/start-standalone.mjs). CI builds in
 * an earlier step and only starts the server here; locally the server is
 * built first, so a run never tests a stale `.next/`. Port 3100 rather than
 * 3000 keeps it clear of a `npm run dev` left running.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: isCI ? "node scripts/start-standalone.mjs" : "npm run build && node scripts/start-standalone.mjs",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
    // No WSDOT key: /api/vessels must report itself unavailable, not crash.
    env: { PORT: String(PORT), HOSTNAME: "localhost", WSF_API_KEY: "" },
  },
});
