import { describe, expect, it } from "vitest";
import {
  advanceStreak,
  levelFromXp,
  localDay,
  streakAlive,
  flawlessBonus,
  scoreFactor,
  unitAward,
  unitTarget,
  xpForLevel,
} from "@/lib/xp";

describe("unit XP", () => {
  it("pays 28 for an easy unit at the 70% pass mark", () => {
    expect(unitTarget("EASY", 70)).toBe(28);
  });

  it("pays 48 for an easy unit at 100%", () => {
    expect(unitTarget("EASY", 100)).toBe(48);
  });

  it("pays progressively more for each step toward mastery", () => {
    // The last points of a unit are the hardest to win, so they must be the
    // best paid — a linear factor would make 70->80 worth as much as 90->100.
    const steps = [70, 80, 90, 100].map((s) => unitTarget("EASY", s));
    const gains = steps.slice(1).map((v, i) => v - steps[i]);
    expect(gains).toEqual([...gains].sort((a, b) => a - b));
    expect(new Set(gains).size).toBeGreaterThan(1);
  });

  it("pays a perfect run 1.2x the unit base", () => {
    expect(scoreFactor(70)).toBeCloseTo(0.7);
    expect(scoreFactor(100)).toBeCloseTo(1.2);
    // A score above 100 cannot buy more than a perfect one.
    expect(scoreFactor(120)).toBeCloseTo(1.2);
  });

  it("pays the same perfection premium at every difficulty", () => {
    // A flat bonus was worth +55% on a Very Easy unit and +28% on a Hard one,
    // which paid perfection best where it was easiest to reach.
    const premiums = (["VERY_EASY", "EASY", "MEDIUM", "HARD"] as const).map(
      (d) =>
        (unitTarget(d, 100) + flawlessBonus(d)) / unitTarget(d, 95) - 1,
    );
    for (const p of premiums) expect(p).toBeCloseTo(premiums[0], 1);
  });

  it("pays nothing below the pass threshold", () => {
    expect(unitTarget("EASY", 69)).toBe(0);
    expect(unitAward("EASY", 69, 0)).toBe(0);
  });

  it("pays 90 for a hard unit at 100%", () => {
    expect(unitTarget("HARD", 100)).toBe(90);
  });

  it("ratchets: 70 -> 90 -> 100 sums to the same total as one 100% run", () => {
    let awarded = 0;
    for (const score of [70, 90, 100]) {
      awarded += unitAward("EASY", score, awarded);
    }
    expect(awarded).toBe(unitTarget("EASY", 100));
    expect(awarded).toBe(48);
  });

  it("pays each improvement exactly once", () => {
    const first = unitAward("EASY", 70, 0);
    const second = unitAward("EASY", 90, first);
    expect(first).toBe(28);
    expect(second).toBe(unitTarget("EASY", 90) - 28);
    expect(unitAward("EASY", 90, first + second)).toBe(0);
  });

  it("pays nothing for a worse retry", () => {
    const awarded = unitAward("EASY", 100, 0);
    expect(unitAward("EASY", 75, awarded)).toBe(0);
  });

  it("scales with difficulty at equal score", () => {
    const caps = (["VERY_EASY", "EASY", "MEDIUM", "HARD"] as const).map((d) =>
      unitTarget(d, 100),
    );
    expect(caps).toEqual([...caps].sort((a, b) => a - b));
    expect(new Set(caps).size).toBe(4);
  });
});

describe("levels", () => {
  it("is a soft exponential with widening bands", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(25);
    expect(xpForLevel(3)).toBe(115);
    expect(xpForLevel(4)).toBe(280);
    const bands = [2, 3, 4, 5, 6].map((n) => xpForLevel(n + 1) - xpForLevel(n));
    expect(bands).toEqual([...bands].sort((a, b) => a - b));
  });

  it("puts level 2 within reach of a single passed unit", () => {
    // The weakest possible first pass — a Very Easy unit at exactly 70%, plus
    // the day's streak — must cross it, so the level-up lands while the
    // gamification is being introduced.
    const weakestFirstPass = unitTarget("VERY_EASY", 70) + 5;
    expect(weakestFirstPass).toBeGreaterThan(xpForLevel(2));
    expect(levelFromXp(weakestFirstPass).level).toBe(2);
  });

  it("still makes the later levels demanding", () => {
    // Level 10 should be a long way past casual use.
    expect(xpForLevel(10)).toBeGreaterThan(3000);
    expect(xpForLevel(15)).toBeGreaterThan(8000);
  });

  it("never reports level 0 or negative progress", () => {
    const info = levelFromXp(0);
    expect(info.level).toBe(1);
    expect(info.progress).toBe(0);
  });

  it("levels up exactly at the threshold", () => {
    expect(levelFromXp(24).level).toBe(1);
    expect(levelFromXp(25).level).toBe(2);
  });
});

describe("streaks", () => {
  it("increments on consecutive days", () => {
    const r = advanceStreak(11, "2026-08-20", "2026-08-21");
    expect(r.count).toBe(12);
    expect(r.dayXp).toBe(5);
    expect(r.milestoneXp).toBe(0);
  });

  it("is a no-op twice in one day", () => {
    const r = advanceStreak(12, "2026-08-21", "2026-08-21");
    expect(r).toEqual({ count: 12, changed: false, dayXp: 0, milestoneXp: 0 });
  });

  it("resets after a missed day", () => {
    expect(advanceStreak(12, "2026-08-18", "2026-08-21").count).toBe(1);
  });

  it("pays a milestone every 7th day", () => {
    expect(advanceStreak(6, "2026-08-20", "2026-08-21").milestoneXp).toBe(25);
    expect(advanceStreak(13, "2026-08-20", "2026-08-21").milestoneXp).toBe(25);
    expect(advanceStreak(7, "2026-08-20", "2026-08-21").milestoneXp).toBe(0);
  });

  it("crosses month boundaries", () => {
    expect(advanceStreak(3, "2026-07-31", "2026-08-01").count).toBe(4);
    expect(advanceStreak(3, "2026-08-01", "2026-08-01").changed).toBe(false);
  });

  it("counts days in the learner's timezone", () => {
    // 03:00 UTC on the 21st is still the 20th in Bogota (UTC-5).
    expect(localDay(new Date("2026-08-21T03:00:00Z"), "America/Bogota")).toBe(
      "2026-08-20",
    );
    expect(localDay(new Date("2026-08-21T03:00:00Z"), "UTC")).toBe("2026-08-21");
  });

  it("treats yesterday's streak as still alive", () => {
    expect(streakAlive("2026-08-20", "2026-08-21")).toBe(true);
    expect(streakAlive("2026-08-19", "2026-08-21")).toBe(false);
    expect(streakAlive(null, "2026-08-21")).toBe(false);
  });
});
