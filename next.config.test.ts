import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it('enables Next.js standalone output for container builds', () => {
    expect(nextConfig.output).toBe("standalone");
  });
});
