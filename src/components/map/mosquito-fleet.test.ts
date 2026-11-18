import { within } from "@testing-library/dom";
import { expect, it } from "vitest";
import { createMosquitoFleetPopup } from "./mosquito-fleet";

it("shows the ordered stops and chart credit for a reconstructed run", () => {
  const sheetUrl = "https://example.com/chart";
  const popup = within(createMosquitoFleetPopup({
    name: "Seattle to Victoria",
    stops: "Seattle → Port Townsend → Victoria",
    sheetUrl,
    sheetCredit: "1908 source chart",
  }, false));

  expect(popup.queryByText("Seattle to Victoria")).not.toBeNull();
  expect(popup.queryByText(/Reconstructed steamer route/)).not.toBeNull();
  expect(popup.queryByText("Seattle → Port Townsend → Victoria")).not.toBeNull();
  expect(popup.getByRole("link", { name: "1908 source chart" })).toHaveAttribute("href", sheetUrl);
});

it("warns when a landing is approximate and omits non-HTTPS chart links", () => {
  const popup = within(createMosquitoFleetPopup({
    name: "Historic Landing",
    approximate: true,
    positionSource: "Estimated from the historical chart",
    sheetUrl: "http://example.com/chart",
  }, true));

  expect(popup.queryByText(/Approximate landing/)).not.toBeNull();
  expect(popup.queryByText("Estimated from the historical chart")).not.toBeNull();
  expect(popup.queryByRole("link")).toBeNull();
});
