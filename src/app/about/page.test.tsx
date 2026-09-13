import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("shows the why and coverage content from the project overview", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "About this map" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Why this exists" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "What it covers" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/show Washington State Ferries, BC Ferries, Black Ball/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/This is a route map, not a trip planner/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to the map/i })).toHaveAttribute("href", "/");
  });
});
