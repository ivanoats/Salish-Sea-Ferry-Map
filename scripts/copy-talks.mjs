// Stages each talk's web build into public/ so the site serves it, e.g.
// talks/2026-10-cugos/web/ -> public/talks/cugos/ -> salishseaferrymap.com/talks/cugos.
// The talk folder stays the single copy in git; public/talks/ is gitignored
// and rebuilt by `npm run dev` / `npm run build`, like public/maplibre/.
// The path itself is mapped to index.html by a rewrite in next.config.ts.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** talks/<folder>/web -> public/talks/<slug> */
export const TALKS = [{ folder: "2026-10-cugos", slug: "cugos" }];

for (const { folder, slug } of TALKS) {
  const source = join(root, "talks", folder, "web");
  if (!existsSync(join(source, "index.html"))) {
    throw new Error(`[copy-talks] ${source}/index.html is missing; /talks/${slug} would 404.`);
  }
  const dest = join(root, "public", "talks", slug);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, { recursive: true });
  console.log(`[copy-talks] staged talks/${folder}/web into public/talks/${slug}/`);
}
