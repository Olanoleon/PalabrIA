/**
 * XP, levels and streaks.
 *
 * Unit XP is score-scaled and difficulty-scaled, with a best-score ratchet:
 * every unit has a lifetime target determined by the learner's best score, and
 * an attempt pays only the difference between that target and what has already
 * been awarded. Improving a score therefore always pays, exactly once, and a
 * worse retry pays nothing. Total XP is identical whether the learner reaches
 * 100% in one attempt or four.
 */
import type { Difficulty } from "@/generated/prisma";

/** Minimum score that passes a unit and unlocks the next one. */
export const PASS_THRESHOLD = 70;

/** Lifetime XP ceiling per unit, before the score factor. */
export const DIFFICULTY_CAP: Record<Difficulty, number> = {
  VERY_EASY: 30,
  EASY: 40,
  MEDIUM: 55,
  HARD: 75,
};

export const EFFORT_XP = 5;
export const EFFORT_DAILY_CAP = 3;
export const FLAWLESS_XP = 15;
export const AREA_COMPLETE_XP = 50;
export const STREAK_DAY_XP = 5;
export const STREAK_MILESTONE_XP = 25;
export const STREAK_MILESTONE_EVERY = 7;

/** 70% -> 0.70 … 100% -> 1.10. Quality is rewarded, not just completion. */
export function scoreFactor(score: number): number {
  if (score < PASS_THRESHOLD) return 0;
  const clamped = Math.min(100, score);
  return 0.7 + ((clamped - PASS_THRESHOLD) / (100 - PASS_THRESHOLD)) * 0.4;
}

/** Lifetime XP a unit is worth at a given best score. */
export function unitTarget(difficulty: Difficulty, score: number): number {
  if (score < PASS_THRESHOLD) return 0;
  return Math.round(DIFFICULTY_CAP[difficulty] * scoreFactor(score));
}

/** The ratchet: what this attempt pays, given what the unit has already paid. */
export function unitAward(
  difficulty: Difficulty,
  bestScore: number,
  alreadyAwarded: number,
): number {
  return Math.max(0, unitTarget(difficulty, bestScore) - alreadyAwarded);
}

// ── Levels ──────────────────────────────────────────────────────────────────
//
// Soft exponential: 25 / 115 / 280 / 528 / 862 … so level 2 is an onboarding
// moment, the early levels still arrive quickly, and later ones take months of
// consistency. No wall.

// Level 1 is deliberately tiny: 25 XP is less than a single passed unit earns
// even at the 70% pass mark, so every learner levels up on their first pass and
// meets the gamification while it is still being explained to them. The steep
// exponent then restores meaning to the later levels.
const LEVEL_COEFFICIENT = 25;
const LEVEL_EXPONENT = 2.2;

/** Cumulative XP required to reach `level`. Level 1 starts at 0. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(LEVEL_COEFFICIENT * Math.pow(level - 1, LEVEL_EXPONENT));
}

export type LevelInfo = {
  level: number;
  xp: number;
  levelStart: number;
  nextLevelAt: number;
  xpIntoLevel: number;
  xpToNext: number;
  progress: number; // 0..1
};

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const levelStart = xpForLevel(level);
  const nextLevelAt = xpForLevel(level + 1);
  const band = nextLevelAt - levelStart;
  const xpIntoLevel = xp - levelStart;
  return {
    level,
    xp,
    levelStart,
    nextLevelAt,
    xpIntoLevel,
    xpToNext: nextLevelAt - xp,
    progress: band > 0 ? xpIntoLevel / band : 0,
  };
}

// ── Streaks ─────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in a given IANA timezone. Streaks are counted in the learner's day. */
export function localDay(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayBefore(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export type StreakResult = {
  count: number;
  changed: boolean;
  dayXp: number;
  milestoneXp: number;
};

/**
 * Advance a streak for activity on `today`. Same-day activity is a no-op, so
 * XP is never awarded twice for one day.
 */
export function advanceStreak(
  previousCount: number,
  previousDay: string | null,
  today: string,
): StreakResult {
  if (previousDay === today) {
    return { count: previousCount, changed: false, dayXp: 0, milestoneXp: 0 };
  }
  const continued = previousDay === dayBefore(today);
  const count = continued ? previousCount + 1 : 1;
  const milestone = count % STREAK_MILESTONE_EVERY === 0;
  return {
    count,
    changed: true,
    dayXp: STREAK_DAY_XP,
    milestoneXp: milestone ? STREAK_MILESTONE_XP : 0,
  };
}

/** True when a streak recorded on `lastDay` is still alive on `today`. */
export function streakAlive(lastDay: string | null, today: string): boolean {
  return lastDay === today || lastDay === dayBefore(today);
}
