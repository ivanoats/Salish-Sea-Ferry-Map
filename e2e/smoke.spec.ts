import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// Basemaps come from third-party tile servers. Stub every off-site request so
// the suite neither depends on them nor hits them from CI: style documents
// get an empty style (so MapLibre still fires style.load and adds the ferry
// layers), and tiles are refused.
const EMPTY_STYLE = { version: 8, sources: {}, layers: [] };

// Every test, including ones that only reach the map by following a link.
test.beforeEach(async ({ page }) => {
  await page.route(
    (url) => url.hostname !== "localhost",
    (route) => {
      const url = route.request().url();
      if (/\/styles\/|style\.json$/.test(url)) return route.fulfill({ json: EMPTY_STYLE });
      return route.abort();
    }
  );
});

/** Uncaught exceptions on the page — MapLibre failing to get a WebGL context lands here. */
function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

/** Max minus min channel: the cream background and the slate-and-white terminal dots stay well under this. */
const ROUTE_CHROMA = 80;

/**
 * Pixels in the map's middle strongly coloured enough to be a route line.
 * With the basemap stubbed out, the only colour on the map comes from the
 * operator-coloured lines; terminal dots are slate with a white stroke
 * (TERMINAL_DOT_COLOR), so they don't count. The middle is cropped to leave
 * out the zoom controls and attribution in the corners.
 */
async function routePixels(page: Page): Promise<number> {
  // An element screenshot scrolls the map into view first; on phones it sits
  // below the sidebar.
  const shot = await page.getByRole("region", { name: "Salish Sea ferry route map" }).screenshot();
  const { width = 0, height = 0 } = await sharp(shot).metadata();
  const middle = {
    left: Math.round(width * 0.15),
    top: Math.round(height * 0.15),
    width: Math.round(width * 0.7),
    height: Math.round(height * 0.7),
  };
  const { data, info } = await sharp(shot).extract(middle).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const red = data[i] ?? 0;
    const green = data[i + 1] ?? 0;
    const blue = data[i + 2] ?? 0;
    if (Math.max(red, green, blue) - Math.min(red, green, blue) >= ROUTE_CHROMA) count += 1;
  }
  return count;
}

async function routeCount(page: Page): Promise<number> {
  return Number(await page.locator(".route-count-number").textContent());
}

test.describe("map", () => {
  test("renders the routes and filters them by operator", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your way");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await expect.poll(() => routePixels(page), { message: "ferry route lines drawn on the map" }).toBeGreaterThan(500);

    const total = await routeCount(page);
    expect(total).toBeGreaterThan(0);

    // Ark's checkbox input is visually hidden under its styled control, so
    // click the row the way a viewer would rather than the input itself.
    const operators = page.getByRole("region", { name: "Operators" });
    const checkedRows = operators.locator(".operator-row").filter({ has: page.getByRole("checkbox", { checked: true }) });
    await checkedRows.first().click();
    await expect.poll(() => routeCount(page)).toBeLessThan(total);

    // Every operator off: nothing left to draw.
    while ((await checkedRows.count()) > 0) await checkedRows.first().click();
    await expect(page.locator(".route-count-number")).toHaveText("0");
    await expect.poll(() => routePixels(page), { message: "map cleared of route lines" }).toBe(0);

    await operators.getByRole("button", { name: "Show all" }).click();
    await expect(page.locator(".route-count-number")).toHaveText(String(total));
    await expect.poll(() => routePixels(page), { message: "route lines drawn again" }).toBeGreaterThan(500);

    expect(errors).toEqual([]);
  });

  test("tells the viewer when live vessel positions are unavailable", async ({ page }) => {
    await page.goto("/");
    await page.getByText("WSF vessel positions").click();
    await expect(page.getByText("Live positions need a free WSDOT API key")).toBeVisible();
  });
});

test("route diagram renders and zooms", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/schematic");

  await expect(page.getByRole("link", { name: "Route diagram" })).toHaveAttribute("aria-current", "page");
  const diagram = page.getByRole("img", { name: "Salish Sea ferry route diagram" });
  await expect(diagram).toBeVisible();

  const fit = page.getByRole("button", { name: "Fit" });
  await expect(fit).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(fit).toHaveAttribute("aria-pressed", "false");

  expect(errors).toEqual([]);
});

test("about page links back to the map", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("About this map");
  await page.getByRole("link", { name: "← Back to the map" }).click();
  await expect(page).toHaveURL("/");
});

test("vessel API reports a missing key instead of failing", async ({ request }) => {
  const response = await request.get("/api/vessels");
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({ vessels: [] });
});

test("CUGOS talk deck is served at its bare path", async ({ request }) => {
  const response = await request.get("/talks/cugos");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("text/html");
});
