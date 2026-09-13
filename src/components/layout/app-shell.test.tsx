"use client";

import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";

vi.mock("@/components/map/ferry-map", () => ({
  FerryMap: () => <div data-testid="ferry-map" />,
}));

vi.mock("@/components/map/use-vessel-positions", () => ({
  useVesselPositions: () => ({ vessels: [], unavailable: false }),
}));

describe("AppShell", () => {
  it("links visitors to the about page", () => {
    render(<AppShell />);

    expect(screen.getByRole("link", { name: /about this map/i })).toHaveAttribute(
      "href",
      "/about"
    );
  });
});
