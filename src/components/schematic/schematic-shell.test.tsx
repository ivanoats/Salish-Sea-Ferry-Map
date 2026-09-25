import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OPERATORS_BY_ID } from "@/data/operators";
import { ROUTES } from "@/data/routes";
import { SchematicShell } from "./schematic-shell";

const drawnRouteIds = (container: HTMLElement) =>
  [...container.querySelectorAll(".schematic-route")].map((g) => g.getAttribute("data-route-id"));

describe("SchematicShell", () => {
  it("draws every active route and marks the diagram as the current view", () => {
    const { container } = render(<SchematicShell />);

    const active = ROUTES.filter((route) => route.status !== "suspended");
    expect(drawnRouteIds(container)).toHaveLength(active.length);
    expect(screen.getByRole("img", { name: /route diagram/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Route diagram" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/");
  });

  it("hides an operator's routes when it is unchecked", async () => {
    const { container } = render(<SchematicShell />);

    fireEvent.click(screen.getByRole("checkbox", { name: "WSF" }));

    await waitFor(() => expect(drawnRouteIds(container).some((id) => id?.startsWith("wsf-"))).toBe(false));
    expect(drawnRouteIds(container)).toContain("bcf-tsawwassen-swartzbay");
  });

  it("draws suspended routes only when asked", async () => {
    const { container } = render(<SchematicShell />);
    expect(drawnRouteIds(container)).not.toContain("wsf-anacortes-sidney");

    fireEvent.click(screen.getByRole("checkbox", { name: "Show suspended routes" }));
    await waitFor(() => expect(drawnRouteIds(container)).toContain("wsf-anacortes-sidney"));
  });

  it("keys each drawn operator's color, dropping operators that are filtered out", async () => {
    const { container } = render(<SchematicShell />);
    const legend = () => within(container.querySelector(".schematic-legend") as HTMLElement);

    const swatch = (label: string) => legend().getByText(label).querySelector("path")?.getAttribute("stroke");
    expect(swatch("WSF")).toBe(OPERATORS_BY_ID.get("wsf")?.color);
    expect(swatch("BC Ferries")).toBe(OPERATORS_BY_ID.get("bc-ferries")?.color);

    fireEvent.click(screen.getByRole("checkbox", { name: "WSF" }));
    await waitFor(() => expect(legend().queryByText("WSF")).not.toBeInTheDocument());
  });
});
