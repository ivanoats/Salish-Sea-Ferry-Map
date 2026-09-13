import Link from "next/link";
import type { Metadata } from "next";
import { css } from "styled-system/css";

export const metadata: Metadata = {
  title: "About | Salish Sea Ferry Map",
  description:
    "Why the Salish Sea Ferry Map exists and what ferry routes across the region it covers.",
};

const operatorCoverage = [
  "Washington State Ferries — all 8 active routes plus the currently suspended Anacortes–Sidney, BC run",
  "BC Ferries — every route within the Salish Sea proper, from the major Strait of Georgia crossings to the Gulf Islands and central Vancouver Island runs",
  "Black Ball Ferry Line — the MV Coho between Port Angeles and Victoria",
  "Kitsap Transit — the Bremerton, Kingston, and Southworth fast passenger ferries to Seattle",
  "Pierce County — the Steilacoom ↔ Anderson Island car ferry, including the Ketron Island request stop",
  "Victoria Clipper — passenger-only service between Seattle and Victoria",
  "Skagit County — the Guemes Island ferry",
  "Whatcom County — the Whatcom Chief between Gooseberry Point and Lummi Island",
] as const;

const proseClassName = css({
  fontSize: "sm",
  lineHeight: "tall",
  color: "fg.default",
});

const sectionClassName = css({
  display: "grid",
  gap: "3",
});

const linkClassName = css({
  color: "colorPalette.9",
  fontWeight: "medium",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
});

export default function AboutPage() {
  return (
    <main
      className={css({
        minHeight: "100dvh",
        bg: "bg.canvas",
        color: "fg.default",
        px: "4",
        py: { base: "6", md: "10" },
      })}
    >
      <div
        className={css({
          maxWidth: "3xl",
          mx: "auto",
          display: "grid",
          gap: "8",
        })}
      >
        <div className={css({ display: "grid", gap: "3" })}>
          <Link href="/" className={linkClassName}>
            ← Back to the map
          </Link>
          <div className={css({ display: "grid", gap: "2" })}>
            <h1 className={css({ fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold", lineHeight: "shorter" })}>
              About this map
            </h1>
            <p className={proseClassName}>
              A reference map of ferry routes across the Salish Sea, gathered into one place.
            </p>
          </div>
        </div>

        <section className={sectionClassName}>
          <h2 className={css({ fontSize: "xl", fontWeight: "semibold", lineHeight: "short" })}>
            Why this exists
          </h2>
          <p className={proseClassName}>
            Good ferry maps around the Salish Sea usually stop at a single operator. This project
            exists to show Washington State Ferries, BC Ferries, Black Ball, Kitsap Transit,
            Victoria Clipper, and the county ferries together on one map so visitors can see the
            whole network at a glance.
          </p>
          <p className={proseClassName}>
            It is especially meant for trip ideas that mix bikes, foot passengers, and multiple
            agencies. Instead of piecing together several operator sites by hand, you can see how a
            loop or crossing fits into the broader shape of the Salish Sea.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className={css({ fontSize: "xl", fontWeight: "semibold", lineHeight: "short" })}>
            What it covers
          </h2>
          <p className={proseClassName}>
            The map covers ferry routes across Puget Sound, the Strait of Georgia, and the Strait
            of Juan de Fuca, including both vehicle ferries and passenger-only services.
          </p>
          <ul className={css({ margin: 0, paddingLeft: "5", display: "grid", gap: "2" })}>
            {operatorCoverage.map((entry) => (
              <li key={entry} className={proseClassName}>
                {entry}
              </li>
            ))}
          </ul>
          <p className={proseClassName}>
            This is a route map, not a trip planner: schedules and fares are intentionally out of
            scope. Route lines and terminal locations are approximate and for reference only —{" "}
            <strong>not for navigation.</strong>
          </p>
        </section>
      </div>
    </main>
  );
}
