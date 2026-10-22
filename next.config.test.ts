import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it('enables Next.js standalone output for container builds', () => {
    expect(nextConfig.output).toBe("standalone");
  });

  it("serves the CUGOS talk deck at its bare path", async () => {
    const rewrites = await nextConfig.rewrites?.();
    expect(rewrites).toContainEqual({ source: "/talks/cugos", destination: "/talks/cugos/index.html" });
  });
});
