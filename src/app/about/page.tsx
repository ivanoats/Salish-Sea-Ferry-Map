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
  "BC Ferries — every route within the Salish Sea proper: the three major Strait of Georgia crossings, the Sunshine Coast/Howe Sound routes, the Southern Gulf Islands, and the smaller central-Vancouver-Island crossings",
  "Black Ball Ferry Line — the MV Coho between Port Angeles and Victoria",
  "Kitsap Transit — the Bremerton, Kingston, and Southworth fast passenger ferries to Seattle",
  "Pierce County — the Steilacoom ↔ Anderson Island car ferry, including the Ketron Island request stop",
  "Victoria Clipper — passenger-only service between Seattle and Victoria",
  "Skagit County — the Guemes Island ferry",
  "Whatcom County — the Whatcom Chief between Gooseberry Point and Lummi Island",
] as const;

const proseClassName = css({
  fontSize: "sm",
  lineHeight: "relaxed",
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

const backLinkClassName = `${linkClassName} ${css({ marginBottom: "1" })}`;

const sectionHeadingClassName = css({
  fontSize: "xl",
  fontWeight: "semibold",
  lineHeight: "tight",
});

function CoverageList() {
  return (
    <ul className={css({ margin: 0, paddingLeft: "5", display: "grid", gap: "2", listStyleType: "disc" })}>
      {operatorCoverage.map((entry) => (
        <li key={entry} className={proseClassName}>
          {entry}
        </li>
      ))}
    </ul>
  );
}

function AboutHeader() {
  return (
    <div className={css({ display: "grid", gap: "2" })}>
      <Link href="/" className={backLinkClassName}>
        ← Back to the map
      </Link>
      <h1 className={css({ fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold", lineHeight: "tight" })}>
        About this map
      </h1>
      <p className={proseClassName}>
        A reference map of ferry routes across the Salish Sea, gathered into one place.
      </p>
    </div>
  );
}

function WhyThisExists() {
  return (
    <section className={sectionClassName}>
      <h2 className={sectionHeadingClassName}>Why this exists</h2>
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
  );
}

function WhatItCovers() {
  return (
    <section className={sectionClassName}>
      <h2 className={sectionHeadingClassName}>What it covers</h2>
      <p className={proseClassName}>
        The map covers ferry routes across Puget Sound, the Strait of Georgia, and the Strait
        of Juan de Fuca, including both vehicle ferries and passenger-only services.
      </p>
      <CoverageList />
      <p className={proseClassName}>
        This is a route map, not a trip planner: schedules and fares are intentionally out of
        scope. Route lines and terminal locations are approximate and for reference only —{" "}
        <strong>not for navigation.</strong>
      </p>
    </section>
  );
}

function WhoIAm() {
  return (
    <section className={sectionClassName}>
      <h2 className={sectionHeadingClassName}>Who I am</h2>
      <p className={proseClassName}>
        I&rsquo;m Ivan Storck. I build software in Seattle and spend as much time as I can on the
        water around it, sailing and paddling the Salish Sea and flying a camera drone over
        interesting places. Most of the terminals on this map are
        ones I have waited at.
      </p>
      <p className={proseClassName}>
        By day I am a Senior Solutions Architect at lululemon, working on content management,
        design systems, and brand technology. The rest of the time I take a small number of fractional CTO engagements
        and work on sustainability tooling for the web, including{" "}
        <a
          href="https://www.npmjs.com/package/wsg-check"
          className={linkClassName}
          target="_blank"
          rel="noreferrer"
        >
          wsg-check
        </a>
        , a checker for the W3C Web Sustainability Guidelines. Before that I co-founded Code
        Fellows, taught Ruby and JavaScript to several hundred bootcamp students, and spent six
        years on the teaching faculty of the University of Washington&rsquo;s Rails certificate
        program.
      </p>
      <p className={proseClassName}>
        This map sits where those two halves meet: geospatial data, a region I know well, and a
        small page that tries not to ask much of the network it travels over. More of my work is
        at{" "}
        <a
          href="https://ivanstorck.com"
          className={linkClassName}
          target="_blank"
          rel="noreferrer"
        >
          ivanstorck.com
        </a>
        .
      </p>
    </section>
  );
}

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
        <AboutHeader />
        <WhyThisExists />
        <WhatItCovers />
        <WhoIAm />
      </div>
    </main>
  );
}
