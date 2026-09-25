// Renders the octolinear route diagram as print files for Printful:
//
//   tee   Stanley/Stella STTU169, front print area 12″ × 16″ — the whole diagram
//   tote  Econscious EC8000, front print area 9.5″ × 9.5″ — cropped to Puget
//         Sound, since the whole diagram squeezed into a square prints its
//         labels at about 4 pt, too small for DTG
//
// Each comes in a light theme (white or natural fabric) and a dark one
// (black fabric), as a transparent PNG plus the SVG it was rasterized from.
// The tee also gets versions with the land drawn as a coastline rather
// than filled, which puts far less ink on the shirt: one with the coast
// alone, and one water-lined like an old chart.
// Printful wants PNG, sRGB, at least 150 DPI; the default here is 300.
//
//   node scripts/export-print-files.ts [--dpi 300] [--out print-files]
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import {
  CELL,
  LABEL_DIRECTIONS,
  LANE_WIDTH,
  LINE_WIDTH,
  diagramView,
  pathData,
  px,
  roundedOutline,
  terminalRadius,
  type DiagramView,
} from "../src/components/schematic/schematic-geometry.ts";
import { OPERATORS_BY_ID } from "../src/data/operators.ts";
import { ROUTES } from "../src/data/routes.ts";
import {
  SCHEMATIC_BORDER,
  SCHEMATIC_LAND,
  SCHEMATIC_LAND_LINKS,
  SCHEMATIC_LAYOUT,
  SCHEMATIC_WATER_LABELS,
} from "../src/data/schematic-layout.ts";
import { buildSchematicDiagram, strokeToPixels } from "../src/domain/schematic.ts";

/**
 * Colors from globals.css. Printful advises against semi-transparency in
 * DTG, so everything is opaque, and the dark theme drops the label halo:
 * a near-black halo on black fabric only prints as a gray smudge.
 */
const THEMES = {
  light: { land: "#dde9d2", coast: "#8fb07e", ink: "#18362d", inkMuted: "#60756d", surface: "#fffef8", halo: "#f5f4ed" },
  dark: { land: "#1a3128", coast: "#4f7d66", ink: "#e8eee7", inkMuted: "#a5b7af", surface: "#13251f", halo: undefined },
} as const;
type Theme = (typeof THEMES)[keyof typeof THEMES];

/**
 * "fill" is the land as the page draws it. "outline" traces only the
 * coasts: the land polygons run past the edge of the view, so their
 * outer sides are clipped away and never print as a frame. "waterline"
 * adds thinner lines following the coast out into the water, the way
 * engraved charts told sea from land without any fill.
 */
type LandStyle = "fill" | "outline" | "waterline";
/** Coastline weight in diagram pixels: about 0.6 mm on the tee. */
const COAST_WIDTH = 2.5;
/**
 * Water lines as distance offshore and weight, in diagram pixels. 1.25 is
 * about 0.3 mm on the tee, around the finest line DTG holds reliably.
 */
const WATERLINES = [
  { offset: 6, width: 1.25 },
  { offset: 12, width: 1.25 },
] as const;

/**
 * Water lines as a mask over a coast-colored rect. Each line is the ring
 * between two strokes of the coastline, one a line-width wider than twice
 * its offset and one narrower. That ring runs on both sides of the coast,
 * so the land is masked out last, leaving only the half out on the water.
 * Outermost first, or a nearer line's inner stroke would erase it.
 */
const waterlineMarkup = (coasts: readonly string[], view: DiagramView): string => {
  const strokes = (color: string, width: number) =>
    coasts.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"/>`).join("");
  const rings = [...WATERLINES]
    .sort((a, b) => b.offset - a.offset)
    .map(({ offset, width }) => strokes("white", 2 * offset + width) + strokes("black", 2 * offset - width));
  const land = coasts.map((d) => `<path d="${d}" fill="black"/>`).join("");
  const box = `x="${view.minX}" y="${view.minY}" width="${view.width}" height="${view.height}"`;
  return `<mask id="waterlines" maskUnits="userSpaceOnUse" ${box}>${rings.join("")}${land}</mask>`
    + `<rect class="waterline" ${box} mask="url(#waterlines)"/>`;
};

/** A region of the diagram in grid units, labels included, shaped like the print area it fills. */
interface GridBox { readonly x: readonly [number, number]; readonly y: readonly [number, number] }

/** Central and South Puget Sound: Port Townsend and Everett down to Steilacoom. */
const PUGET_SOUND: GridBox = { x: [13, 42], y: [37.2, 66.2] };

const PRODUCTS = [
  { id: "tee", printArea: { width: 12, height: 16 }, crop: undefined, landStyles: ["fill", "outline", "waterline"] },
  { id: "tote", printArea: { width: 9.5, height: 9.5 }, crop: PUGET_SOUND, landStyles: ["fill"] },
] as const;

const { values } = parseArgs({
  options: {
    dpi: { type: "string", default: "300" },
    out: { type: "string", default: "print-files" },
  },
});
const dpi = Number(values.dpi);
if (!Number.isFinite(dpi) || dpi < 150) throw new Error("--dpi must be at least 150, Printful's minimum");
// Keep output inside the project, so a stray --out can't write elsewhere.
const outDir = resolve(values.out);
const fromRoot = relative(process.cwd(), outDir);
if (fromRoot === "" || fromRoot.startsWith("..") || resolve(fromRoot) !== outDir) {
  throw new Error("--out must be a folder inside the project");
}

const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cropView = ({ x, y }: GridBox): DiagramView => ({
  minX: x[0] * CELL,
  minY: y[0] * CELL,
  width: (x[1] - x[0]) * CELL,
  height: (y[1] - y[0]) * CELL,
});

const styles = (theme: Theme, landStyle: LandStyle): string => {
  const halo = theme.halo === undefined
    ? ""
    : `paint-order: stroke; stroke: ${theme.halo}; stroke-width: 3px; stroke-linejoin: round;`;
  return `
    .land { ${landStyle === "fill"
    ? `fill: ${theme.land};`
    : `fill: none; stroke: ${theme.coast}; stroke-width: ${COAST_WIDTH}; stroke-linejoin: round;`} }
    .waterline { fill: ${theme.coast}; }
    .water { fill: ${theme.inkMuted}; font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; letter-spacing: .04em; }
    .border { fill: none; stroke: ${theme.inkMuted}; stroke-width: 1.25; stroke-dasharray: 2 4; stroke-linecap: round; }
    .border-label { fill: ${theme.inkMuted}; font-family: Arial, Helvetica, sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .18em; }
    .route { fill: none; stroke-width: ${LINE_WIDTH}; stroke-linecap: round; stroke-linejoin: round; }
    .link-outer { stroke: ${theme.ink}; stroke-width: 8; stroke-linecap: round; }
    .link-inner { stroke: ${theme.surface}; stroke-width: 4; stroke-linecap: round; }
    .terminal { fill: ${theme.surface}; stroke: ${theme.ink}; stroke-width: 2; }
    .label { fill: ${theme.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 400; ${halo} }
    .label.interchange { font-weight: 700; }
  `;
};

/**
 * The diagram drawn the way schematic-diagram.tsx draws it (active routes,
 * as the page shows by default), with `view` fitted and centered in a print
 * area measured in inches. Everything is clipped to `view`: the inner
 * <svg> only clips to the print area, which is wider than a view that
 * doesn't share its shape, and the land would spill into that margin.
 */
function diagramSvg(
  theme: Theme,
  landStyle: LandStyle,
  view: DiagramView,
  printArea: { width: number; height: number },
): string {
  const routes = ROUTES.filter((route) => route.status !== "suspended");
  const diagram = buildSchematicDiagram(routes, SCHEMATIC_LAYOUT);
  const shownTerminalIds = new Set(diagram.terminals.map((t) => t.terminalId));
  const landLinks = SCHEMATIC_LAND_LINKS.filter(([a, b]) => shownTerminalIds.has(a) && shownTerminalIds.has(b));
  const landLinked = new Set(landLinks.flat());

  const coasts = SCHEMATIC_LAND.map(({ outline }) => roundedOutline(outline.map(px)));
  const land = coasts.map((d) => `<path class="land" d="${d}"/>`);
  if (landStyle === "waterline") land.unshift(waterlineMarkup(coasts, view));

  const waterLabels = SCHEMATIC_WATER_LABELS.map(({ text, position }) => {
    const [x, y] = px(position);
    return `<text class="water" x="${x}" y="${y}" text-anchor="middle">${escapeXml(text)}</text>`;
  });

  const border = [
    `<path class="border" d="${pathData(SCHEMATIC_BORDER.line.map(px))}"/>`,
    ...SCHEMATIC_BORDER.labels.map(({ text, position }) => {
      const [x, y] = px(position);
      return `<text class="border-label" x="${x}" y="${y}" text-anchor="end">${escapeXml(text)}</text>`;
    }),
  ];

  const lines = diagram.lines.flatMap((line) => {
    const color = OPERATORS_BY_ID.get(line.route.operatorId)?.color ?? theme.ink;
    return line.strokes.map((stroke) =>
      `<path class="route" stroke="${color}" d="${pathData(strokeToPixels(stroke, CELL, LANE_WIDTH))}"/>`);
  });

  const links = landLinks.flatMap(([a, b]) => {
    const from = SCHEMATIC_LAYOUT.terminals[a]?.position;
    const to = SCHEMATIC_LAYOUT.terminals[b]?.position;
    if (from === undefined || to === undefined) return [];
    const linkPath = pathData([px(from), px(to)]);
    return [`<path class="link-outer" d="${linkPath}"/>`, `<path class="link-inner" d="${linkPath}"/>`];
  });

  const terminals = diagram.terminals.map(({ terminalId, terminal, routeCount, maxLane }) => {
    const [x, y] = px(terminal.position);
    const interchange = routeCount > 1 || landLinked.has(terminalId);
    const radius = terminalRadius(interchange, maxLane);
    const soleRoute = interchange ? undefined : routes.find((r) => r.terminalIds.includes(terminalId));
    const ring = soleRoute === undefined ? undefined : OPERATORS_BY_ID.get(soleRoute.operatorId)?.color;
    const label = LABEL_DIRECTIONS[terminal.labelSide];
    const gap = radius + 5;
    const ringStyle = ring === undefined ? "" : ` style="stroke: ${ring}"`;
    // librsvg ignores dominant-baseline, so center the label with dy instead.
    return [
      `<circle class="terminal" cx="${x}" cy="${y}" r="${radius}"${ringStyle}/>`,
      `<text class="label${interchange ? " interchange" : ""}" x="${(x + label.dx * gap).toFixed(1)}" y="${(y + label.dy * gap).toFixed(1)}" dy="0.35em" text-anchor="${label.anchor}">${escapeXml(terminal.label)}</text>`,
    ].join("");
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${printArea.width}in" height="${printArea.height}in" viewBox="0 0 ${printArea.width} ${printArea.height}">
  <title>Salish Sea ferry route diagram</title>
  <svg width="${printArea.width}" height="${printArea.height}" viewBox="${view.minX} ${view.minY} ${view.width} ${view.height}" preserveAspectRatio="xMidYMid meet">
    <style>${styles(theme, landStyle)}</style>
    <clipPath id="view"><rect x="${view.minX}" y="${view.minY}" width="${view.width}" height="${view.height}"/></clipPath>
    <g clip-path="url(#view)">
      <g>${land.join("")}</g>
      <g>${waterLabels.join("")}</g>
      <g>${border.join("")}</g>
      <g>${lines.join("")}</g>
      <g>${links.join("")}</g>
      <g>${terminals.join("")}</g>
    </g>
  </svg>
</svg>
`;
}

await mkdir(outDir, { recursive: true });

for (const product of PRODUCTS) {
  const view = product.crop === undefined ? diagramView(SCHEMATIC_LAYOUT) : cropView(product.crop);
  const size = `${product.printArea.width}x${product.printArea.height}in`;
  for (const [themeName, theme] of Object.entries(THEMES)) {
    for (const landStyle of product.landStyles) {
      const svg = diagramSvg(theme, landStyle, view, product.printArea);
      const variant = landStyle === "fill" ? themeName : `${themeName}-${landStyle}`;
      const base = join(outDir, `${product.id}-front-${variant}-${size}`);
      // sharp scales an SVG by density / 72 *after* librsvg has already
      // applied the density to inch units, so the copy that gets rasterized
      // is sized in unitless 72-per-inch pixels instead.
      const rasterSvg = svg.replace(
        /width="([\d.]+)in" height="([\d.]+)in"/,
        (_, w: string, h: string) => `width="${Number(w) * 72}" height="${Number(h) * 72}"`,
      );
      const png = await sharp(Buffer.from(rasterSvg), { density: dpi })
        .toColorspace("srgb")
        .withMetadata({ density: dpi })
        .png()
        .toBuffer({ resolveWithObject: true });
      await writeFile(`${base}.svg`, svg);
      await writeFile(`${base}-${dpi}dpi.png`, png.data);
      console.log(`${relative(process.cwd(), base)}-${dpi}dpi.png  ${png.info.width} × ${png.info.height} px`);
    }
  }
}
