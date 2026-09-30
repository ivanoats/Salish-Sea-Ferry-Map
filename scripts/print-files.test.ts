// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CELL, diagramView } from "../src/components/schematic/schematic-geometry.ts";
import { SCHEMATIC_INSETS, SCHEMATIC_LAYOUT } from "../src/data/schematic-layout.ts";
import { MIN_DPI, PRODUCTS, printFileSvg, printFileVariants, rasterizePrintFile, type Product } from "./print-files.ts";

const product = (id: Product["id"]): Product => {
  const found = PRODUCTS.find((p) => p.id === id);
  if (found === undefined) throw new Error(`no product ${id}`);
  return found;
};

describe("print file SVGs", () => {
  it.each(printFileVariants())("$name is sized in inches to its print area", ({ product: p, themeName, landStyle }) => {
    const svg = printFileSvg(p, themeName, landStyle);
    expect(svg).toContain(`width="${p.printArea.width}in" height="${p.printArea.height}in"`);
  });
});

// These rasterize at full size, which is the point: the unitless raster
// dimensions and sharp's density are coupled, and only a real render shows
// whether they still multiply out to the print area.
describe("print file PNGs", () => {
  it.each([
    { id: "tee", dpi: 300, width: 3600, height: 4800 },
    { id: "tee", dpi: MIN_DPI, width: 1800, height: 2400 },
    { id: "tote", dpi: 300, width: 2850, height: 2850 },
  ] as const)("$id at $dpi DPI is $width × $height px", async ({ id, dpi, width, height }) => {
    const png = await rasterizePrintFile(printFileSvg(product(id), "light", "fill"), dpi);
    expect(png.info).toMatchObject({ format: "png", width, height });

    // Read the written file back, not sharp's in-memory info: what Printful
    // sees is the PNG's own header and pHYs chunk.
    const metadata = await sharp(png.data).metadata();
    expect(metadata).toMatchObject({ format: "png", width, height, space: "srgb", hasAlpha: true });
    expect(metadata.density).toBeCloseTo(dpi, 0);
  }, 30_000);

  it("refuses resolutions below Printful's minimum", async () => {
    await expect(rasterizePrintFile(printFileSvg(product("tote"), "light", "fill"), MIN_DPI - 1)).rejects.toThrow(/at least/);
  });
});

// The False Creek inset draws its own land over a box of the main land.
// Print files have no background to paint over the main land with, so it is
// clipped out of the box instead, and the inset's land is clipped to it.
// Nothing about the output size changes if that breaks, so check it directly.
describe("print file insets", () => {
  it.each(["fill", "waterline"] as const)("clips the main land out of each inset box and the inset's land into it (%s)", (landStyle) => {
    const svg = printFileSvg(product("tee"), "light", landStyle);
    expect(svg).toMatch(/<clipPath id="outside-insets"><path clip-rule="evenodd" d="M[^"]+Z(M[^"]+Z){1,}"\/><\/clipPath>/);
    SCHEMATIC_INSETS.forEach((_, i) => {
      expect(svg).toContain(`<clipPath id="inset-${i}">`);
      expect(svg).toMatch(new RegExp(`<g clip-path="url\\(#inset-${i}\\)"><path class="land"`));
    });
    expect(svg).toMatch(/<g clip-path="url\(#outside-insets\)"><path class="land"/);
    expect(svg).toContain('class="inset-frame"');
    if (landStyle === "waterline") {
      const mask = svg.slice(svg.indexOf('<mask id="waterlines"'), svg.indexOf("</mask>"));
      expect(mask).toContain('clip-path="url(#outside-insets)"');
      expect(mask).toContain('clip-path="url(#inset-0)"');
    }
  });

  // Where a grid point lands in a rendered tee, following the nested SVG's
  // viewBox and xMidYMid meet fit.
  const DPI = 150;
  const tee = product("tee");
  const view = diagramView(SCHEMATIC_LAYOUT);
  const inchesPerUnit = Math.min(tee.printArea.width / view.width, tee.printArea.height / view.height);
  const toPixel = (gx: number, gy: number): [number, number] => [
    Math.round(((tee.printArea.width - view.width * inchesPerUnit) / 2 + (gx * CELL - view.minX) * inchesPerUnit) * DPI),
    Math.round(((tee.printArea.height - view.height * inchesPerUnit) / 2 + (gy * CELL - view.minY) * inchesPerUnit) * DPI),
  ];
  const render = async (landStyle: "fill" | "waterline") => {
    const png = await rasterizePrintFile(printFileSvg(tee, "light", landStyle), DPI);
    const { data, info } = await sharp(png.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return (gx: number, gy: number) => {
      const [x, y] = toPixel(gx, gy);
      return data[(y * info.width + x) * info.channels + 3] ?? 0;
    };
  };

  // Open water in the inset's English Bay, clear of its label and routes:
  // main land underneath, so it only stays empty if the cut-out works.
  const englishBay: [number, number] = [16, 3.6];

  it("leaves the inset's water empty and draws its land (fill)", async () => {
    const alphaAt = await render("fill");
    expect(alphaAt(...englishBay)).toBe(0);
    expect(alphaAt(30, 4)).toBe(255);
  }, 30_000);

  it("draws the inset's own water lines (waterline)", async () => {
    const alphaAt = await render("waterline");
    expect(alphaAt(...englishBay)).toBe(0);
    // Just off the north shore (row 5) at x = 27, clear of routes and labels:
    // the water lines sit 6 and 12 px offshore. If the main land's mask were
    // not clipped out of the box, it would black them out.
    const column = Array.from({ length: 20 }, (_, i) => alphaAt(27, 5.12 + i * 0.025));
    expect(Math.max(...column)).toBeGreaterThan(128);
  }, 30_000);
});

