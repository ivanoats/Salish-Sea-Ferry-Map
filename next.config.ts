import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Talk decks are static files staged into public/talks/<slug>/ by
  // scripts/copy-talks.mjs. Next serves public files only by exact path,
  // so map the bare talk URL to its index.html.
  rewrites: () =>
    Promise.resolve([{ source: "/talks/cugos", destination: "/talks/cugos/index.html" }]),
};

export default nextConfig;
