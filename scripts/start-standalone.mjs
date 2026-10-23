// Runs the production build the way the Docker image does: Next's standalone
// server, with the static assets and public/ copied in beside it (the
// standalone output leaves both out, expecting a CDN or the Dockerfile's COPY
// steps to supply them). `next start` also serves a standalone build but
// warns that it isn't supported, so the e2e suite runs this instead.
// Run `npm run build` first; PORT picks the port (default 3000).
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  throw new Error("[start-standalone] .next/standalone/server.js is missing; run `npm run build` first.");
}

cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });
cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });

// A file URL, not a path: on Windows the ESM loader reads `C:\…` as a URL scheme.
await import(pathToFileURL(join(standalone, "server.js")).href);
