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

/**
 * The XP a unit is worth at the pass mark's reference point, before the score
 * factor. Not a ceiling — a perfect run is worth 1.2x this, plus the perfection
 * bonus on top.
 */
export const DIFFICULTY_BASE: Record<Difficulty, number> = {
  VERY_EASY: 30,
  EASY: 40,
  MEDIUM: 55,
  HARD: 75,
};

export const EFFORT_XP = 5;
export const EFFORT_DAILY_CAP = 3;

/**
 * Perfection pays a share of the unit's base rather than a flat amount.
 *
 * A flat bonus was worth +55% on a Very Easy unit and only +28% on a Hard one,
 * so perfection paid relatively more for the easiest work — the opposite of the
 * intended incentive. As a share it is the same premium everywhere.
 */
export const FLAWLESS_SHARE = 0.25;

export function flawlessBonus(difficulty: Difficulty): number {
  return Math.round(DIFFICULTY_BASE[difficulty] * FLAWLESS_SHARE);
}
export const AREA_COMPLETE_XP = 50;
/**
 * For returning to a unit whose content was regenerated after you passed it.
 *
 * Deliberately small — well under a unit's own value — because it exists to
 * make the trip worth taking, not to be a way of earning. It cannot be repeated:
 * the version stamp means one award per regeneration.
 */
export const CONTENT_REFRESH_XP = 10;
export const STREAK_DAY_XP = 5;
export const STREAK_MILESTONE_XP = 25;
export const STREAK_MILESTONE_EVERY = 7;

/**
 * Maps a passing score to a multiplier: 70% -> 0.70, 100% -> 1.20.
 *
 * Mildly convex, so each step toward mastery is worth more than the last — on
 * an Easy unit the three ten-point steps pay 5, 7 and 8 XP. The last points of
 * a unit are the hardest to win and should be the best paid.
 */
const FACTOR_FLOOR = 0.7;
const FACTOR_RANGE = 0.5;
const FACTOR_CURVE = 1.3;

export function scoreFactor(score: number): number {
  if (score < PASS_THRESHOLD) return 0;
  const clamped = Math.min(100, score);
  const t = (clamped - PASS_THRESHOLD) / (100 - PASS_THRESHOLD);
  return FACTOR_FLOOR + FACTOR_RANGE * Math.pow(t, FACTOR_CURVE);
}

/** Lifetime XP a unit is worth at a given best score. */
export function unitTarget(difficulty: Difficulty, score: number): number {
  if (score < PASS_THRESHOLD) return 0;
  return Math.round(DIFFICULTY_BASE[difficulty] * scoreFactor(score));
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
