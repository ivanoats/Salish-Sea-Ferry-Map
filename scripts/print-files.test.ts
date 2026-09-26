// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
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
