import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("@/components/map/ferry-map", () => ({
  FerryMap: ({ basemapId, showMosquitoFleet }: { basemapId: string; showMosquitoFleet: boolean }) => (
    <div data-testid="ferry-map" data-basemap={basemapId} data-mosquito-fleet={showMosquitoFleet} />
  ),
}));

vi.mock("@/components/map/use-vessel-positions", () => ({
  useVesselPositions: () => ({ vessels: [], unavailable: false }),
}));

describe("AppShell", () => {
  it("lets visitors opt in to the 1908 layer", async () => {
    render(<AppShell />);

    const toggle = screen.getByRole("checkbox", { name: "Mosquito Fleet (1908)" });
    expect(toggle).not.toBeChecked();
    expect(screen.getByTestId("ferry-map")).toHaveAttribute("data-mosquito-fleet", "false");

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(screen.getByTestId("ferry-map")).toHaveAttribute("data-mosquito-fleet", "true");
    expect(screen.getByRole("link", { name: /Ted Sweeney/ })).toHaveAttribute(
      "href",
      "https://midtide.github.io/Lowtide-Seattle/",
    );

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(screen.getByTestId("ferry-map")).toHaveAttribute("data-mosquito-fleet", "false");
  });

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

  it("links to the sources and credits from the sidebar footer", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: "Sources and credits" })).toHaveAttribute(
      "href",
      "/about#sources"
    );
  });

  it("links to the route diagram", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: "Route diagram" })).toHaveAttribute("href", "/schematic");
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("aria-current", "page");
  });
});
