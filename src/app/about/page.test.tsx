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
    expect(
      screen.getByRole("heading", { level: 2, name: "Who I am" })
    ).toBeInTheDocument();
    expect(screen.getByText(/I.m Ivan Storck/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to the map/i })).toHaveAttribute("href", "/");
  });

  it("links external sites in a new tab with an announced accessible name", () => {
    render(<AboutPage />);

    const externalLinks: Array<[RegExp, string]> = [
      [/^sustainability tooling for the web/, "https://sustainablewebsites.com"],
      [/^wsg-check/, "https://wsg-check.com"],
      [/^W3C Web Sustainability Guidelines/, "https://w3c.github.io/sustainableweb-wsg/"],
      [/^Code Fellows/, "https://www.codefellows.org"],
      [/^ivanstorck\.com/, "https://www.ivanstorck.com"],
    ];

    for (const [name, href] of externalLinks) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAccessibleName(expect.stringMatching(/\(opens in a new tab\)$/));
    }

    expect(screen.getByRole("link", { name: /^ivanstorck\.com/ })).toHaveAttribute(
      "rel",
      "me noreferrer"
    );
  });
});
