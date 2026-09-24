import { describe, expect, it } from "vitest";
import {
  REGENERATION_STALE_MIN,
  isRegenerating,
  regenerationState,
} from "@/lib/regeneration";

const NOW = new Date("2026-09-24T12:00:00Z");
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000);

describe("regenerationState", () => {
  it("is idle when nothing is running", () => {
    expect(regenerationState(null, NOW)).toBe("idle");
    expect(isRegenerating(null, NOW)).toBe(false);
  });

  it("is running while the work is young enough to still be alive", () => {
    expect(regenerationState(minutesAgo(2), NOW)).toBe("running");
    expect(isRegenerating(minutesAgo(2), NOW)).toBe(true);
  });

  // The work is a detached promise: a deploy mid-run leaves the column set
  // with nobody to clear it, and the unit would be locked for good.
  it("goes stale rather than locking a unit forever", () => {
    const dead = minutesAgo(REGENERATION_STALE_MIN + 1);
    expect(regenerationState(dead, NOW)).toBe("stale");
    expect(isRegenerating(dead, NOW)).toBe(false);
  });
});
