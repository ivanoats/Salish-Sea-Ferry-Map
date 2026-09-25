import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("@/components/map/ferry-map", () => ({
  FerryMap: ({ basemapId }: { basemapId: string }) => <div data-testid="ferry-map" data-basemap={basemapId} />,
}));

vi.mock("@/components/map/use-vessel-positions", () => ({
  useVesselPositions: () => ({ vessels: [], unavailable: false }),
}));

describe("AppShell", () => {
  it("defaults to Positron and passes basemap selections to the map", () => {
    render(<AppShell />);

    const selector = screen.getByRole("combobox", { name: "Basemap" });
    expect(selector).toHaveValue("positron");
    expect(screen.getByTestId("ferry-map")).toHaveAttribute("data-basemap", "positron");

    fireEvent.change(selector, { target: { value: "dark" } });
    expect(screen.getByTestId("ferry-map")).toHaveAttribute("data-basemap", "dark");

    fireEvent.change(selector, { target: { value: "osm" } });
    expect(screen.getByTestId("ferry-map")).toHaveAttribute("data-basemap", "osm");
  });

  it("links visitors to the about page", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: /about this map/i })).toHaveAttribute(
      "href",
      "/about"
    );
  });
});
