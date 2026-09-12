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
    exclude: [...defaultExclude, ".agents/**", ".claude/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
