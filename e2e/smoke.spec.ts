import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// Basemaps come from third-party tile servers. Stub every off-site request so
// the suite neither depends on them nor hits them from CI: style documents
// get an empty style (so MapLibre still fires style.load and adds the ferry
// layers), and tiles are refused.
const EMPTY_STYLE = { version: 8, sources: {}, layers: [] };

async function stubBasemaps(page: Page) {
  await page.route(
    (url) => url.hostname !== "localhost",
    (route) => {
      const url = route.request().url();
      if (/\/styles\/|style\.json$/.test(url)) return route.fulfill({ json: EMPTY_STYLE });
      return route.abort();
    }
  );
}

/** Uncaught exceptions on the page — MapLibre failing to get a WebGL context lands here. */
function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

/**
 * How much the map's middle varies in colour. With the basemap stubbed to
 * nothing, only the ferry layers draw, so this is ~0 for an empty map and
 * well above it once routes render. The middle is cropped to leave out the
 * zoom controls and attribution in the corners.
 */
async function mapInk(page: Page): Promise<number> {
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
  // stats() reads the input image, not the pipeline, so crop to a buffer first.
  const cropped = await sharp(shot).extract(middle).toBuffer();
  const { channels } = await sharp(cropped).stats();
  return Math.max(...channels.slice(0, 3).map((channel) => channel.stdev));
}

async function routeCount(page: Page): Promise<number> {
  return Number(await page.locator(".route-count-number").textContent());
}

test.describe("map", () => {
  test("renders the routes and filters them by operator", async ({ page }) => {
    const errors = collectPageErrors(page);
    await stubBasemaps(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your way");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await expect.poll(() => mapInk(page), { message: "ferry routes drawn on the map" }).toBeGreaterThan(5);

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
    await expect.poll(() => mapInk(page), { message: "map cleared of routes" }).toBeLessThan(1);

    await operators.getByRole("button", { name: "Show all" }).click();
    await expect(page.locator(".route-count-number")).toHaveText(String(total));

    expect(errors).toEqual([]);
  });

  test("tells the viewer when live vessel positions are unavailable", async ({ page }) => {
    await stubBasemaps(page);
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
