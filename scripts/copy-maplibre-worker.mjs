// maplibre-gl otherwise derives its worker URL from `import.meta.url` at
// runtime, which under Turbopack points at a chunk path that is never
// emitted — the worker then 404s and every GeoJSON source stays unparsed,
// so route/terminal layers silently never draw. Staging the worker as a
// static public file and pointing maplibre at it directly (see
// ferry-map.tsx's `setWorkerUrl` call) sidesteps that.
//
// The `.mjs` worker is NOT self-contained: it is an ES module whose first
// statement is `import ... from "./maplibre-gl-shared.mjs"`. That sibling
// chunk has to land next to it in public/maplibre/ or the module worker
// fails to instantiate — silently, because a worker that never starts
// emits no map `error` event. The raster basemap keeps rendering (raster
// tiles are fetched on the main thread) while every GeoJSON-backed layer
// stays blank, which is a confusing failure to debug. Hence: copy the
// worker *and* everything it imports, and fail loudly if a dependency is
// missing rather than shipping a half-staged worker directory.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const candidates = [
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "node_modules/maplibre-gl/dist/maplibre-gl-csp-worker.js",
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.js",
];

const source = candidates.map((p) => join(root, p)).find((p) => existsSync(p));

if (source === undefined) {
  console.warn(
    "[copy-maplibre-worker] could not find a maplibre-gl worker build to copy; " +
      "run `npm install` first. The map will fall back to maplibre's default " +
      "worker resolution, which may not work under Turbopack."
  );
  process.exit(0);
}

/** Relative specifiers the given ES module imports from, e.g. "./maplibre-gl-shared.mjs". */
const relativeImportsOf = (file) => {
  const code = readFileSync(file, "utf8");
  const specifiers = new Set();
  // Minified output has no whitespace around `from`: `import{a as b}from"./x.mjs"`.
  for (const match of code.matchAll(/(?:^|[\s;}])(?:import|export)\s*(?:[^'"]*?from\s*)?["'](\.[^"']+)["']/g)) {
    specifiers.add(match[1]);
  }
  return [...specifiers];
};

const outDir = join(root, "public", "maplibre");
mkdirSync(outDir, { recursive: true });

const isEsm = source.endsWith(".mjs");
const dest = join(outDir, `maplibre-gl-worker${isEsm ? ".mjs" : ".js"}`);
copyFileSync(source, dest);
const copied = [dest];

// Walk the worker's import graph. In practice this is a single hop to
// maplibre-gl-shared.mjs, but following it properly means a future
// maplibre release that splits the chunk further doesn't silently
// reintroduce the blank-layers bug.
const pending = isEsm ? [source] : [];
const seen = new Set(pending);
while (pending.length > 0) {
  const file = pending.pop();
  for (const specifier of relativeImportsOf(file)) {
    const resolved = join(dirname(file), specifier);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!existsSync(resolved)) {
      console.error(
        `[copy-maplibre-worker] ${basename(file)} imports "${specifier}", which does not ` +
          `exist at ${resolved}. The worker would fail to start and every GeoJSON layer ` +
          "(routes, terminals, vessels) would render blank. Aborting."
      );
      process.exit(1);
    }
    const target = join(outDir, basename(resolved));
    copyFileSync(resolved, target);
    copied.push(target);
    pending.push(resolved);
  }
}

console.log(
  `[copy-maplibre-worker] staged ${copied.length} file(s) into public/maplibre/: ` +
    copied.map((p) => basename(p)).join(", ")
);
