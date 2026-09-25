// Writes the Printful print files drawn by scripts/print-files.ts: a
// transparent PNG for each product, theme, and land style, plus the SVG it
// was rasterized from. The default resolution is 300 DPI.
//
//   node scripts/export-print-files.ts [--dpi 300] [--out print-files]
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { MIN_DPI, printFileSvg, printFileVariants, rasterizePrintFile } from "./print-files.ts";

const { values } = parseArgs({
  options: {
    dpi: { type: "string", default: "300" },
    out: { type: "string", default: "print-files" },
  },
});
const dpi = Number(values.dpi);
if (!Number.isFinite(dpi) || dpi < MIN_DPI) throw new Error(`--dpi must be at least ${MIN_DPI}, Printful's minimum`);
// Keep output inside the project, so a stray --out can't write elsewhere.
const outDir = resolve(values.out);
const fromRoot = relative(process.cwd(), outDir);
if (fromRoot === "" || fromRoot.startsWith("..") || resolve(fromRoot) !== outDir) {
  throw new Error("--out must be a folder inside the project");
}

await mkdir(outDir, { recursive: true });

for (const { product, themeName, landStyle, name } of printFileVariants()) {
  const svg = printFileSvg(product, themeName, landStyle);
  const png = await rasterizePrintFile(svg, dpi);
  const base = join(outDir, name);
  await writeFile(`${base}.svg`, svg);
  await writeFile(`${base}-${dpi}dpi.png`, png.data);
  console.log(`${relative(process.cwd(), base)}-${dpi}dpi.png  ${png.info.width} × ${png.info.height} px`);
}
