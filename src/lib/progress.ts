/**
 * Recording a practice result: score, XP, streak, badges and unlocks.
 *
 * The client sends which activities it answered and how; the score and every
 * reward are computed here from the stored answer keys, so a tampered client
 * cannot award itself XP.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import {
  AREA_COMPLETE_XP,
  EFFORT_DAILY_CAP,
  EFFORT_XP,
  FLAWLESS_XP,
  PASS_THRESHOLD,
  advanceStreak,
  levelFromXp,
  localDay,
  unitAward,
} from "@/lib/xp";
import { areaComplete, isPassed } from "@/lib/unlock";
import type { XpReason } from "@/generated/prisma";

export type SubmittedAnswer = {
  activityId: string;
  /**
   * The chosen option's text, for the two multiple-choice types.
   *
   * Text rather than an index: options are shuffled per practice load, so an
   * index would refer to an order the server does not know.
   */
  optionText?: string;
  /** Spelled answer, for "type what you hear". */
  typed?: string;
};

export type GradedAnswer = {
  activityId: string;
  word: string;
  correct: boolean;
};

export type ResultSummary = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  attempt: number;
  bestScore: number;
  xpAwarded: number;
  xpBreakdown: Array<{ reason: XpReason; delta: number }>;
  totalXp: number;
  level: number;
  leveledUpTo: number | null;
  newBadges: string[];
  streak: number;
  missedWords: string[];
  areaCompleted: boolean;
  nextUnit: { id: string; name: string; sortOrder: number } | null;
};

function gradeOne(
  activity: {
    id: string;
    type: string;
    options: unknown;
    answerIndex: number;
    word: { text: string };
  },
  answer: SubmittedAnswer | undefined,
): GradedAnswer {
  const word = activity.word.text;
  if (!answer) return { activityId: activity.id, word, correct: false };

  if (activity.type === "TYPE_WHAT_YOU_HEAR") {
    const typed = (answer.typed ?? "").trim().toLowerCase();
    return {
      activityId: activity.id,
      word,
      correct: typed.length > 0 && typed === word.trim().toLowerCase(),
    };
  }
  const options = Array.isArray(activity.options)
    ? (activity.options as string[])
    : [];
  const correctText = options[activity.answerIndex];
  const chosen = (answer.optionText ?? "").trim();
  return {
    activityId: activity.id,
    word,
    correct: chosen.length > 0 && chosen === (correctText ?? "").trim(),
  };
}

/**
 * Grades and records one practice run.
 *
 * Everything that mutates the learner happens in a single transaction: a
 * partially applied result would leave XP and progress disagreeing.
 */
export async function recordPractice(
  learnerId: string,
  unitId: string,
  answers: SubmittedAnswer[],
  now = new Date(),
): Promise<ResultSummary> {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    include: {
      activities: {
        orderBy: { sortOrder: "asc" },
        include: { word: { select: { text: true } } },
      },
      area: {
        include: {
          units: {
            select: { id: true, name: true, sortOrder: true, isVisible: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      words: { select: { id: true } },
    },
  });

  const learner = await prisma.learner.findUniqueOrThrow({
    where: { id: learnerId },
  });

  const byId = new Map(answers.map((a) => [a.activityId, a]));
  const graded = unit.activities.map((activity) =>
    gradeOne(activity, byId.get(activity.id)),
  );
  const total = graded.length;
  const correct = graded.filter((g) => g.correct).length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = isPassed(score);
  const flawless = total > 0 && correct === total;

  const existing = await prisma.unitProgress.findUnique({
    where: { learnerId_unitId: { learnerId, unitId } },
  });
  const previousBest = existing?.bestScore ?? 0;
  const bestScore = Math.max(previousBest, score);
  const attempt = (existing?.attempts ?? 0) + 1;

  // ── XP ────────────────────────────────────────────────────────────────────
  const breakdown: Array<{ reason: XpReason; delta: number }> = [];

  const unitXp = unitAward(unit.difficulty, bestScore, existing?.xpAwarded ?? 0);
  if (unitXp > 0) {
    breakdown.push({
      reason: previousBest >= PASS_THRESHOLD ? "UNIT_IMPROVE" : "UNIT_PASS",
      delta: unitXp,
    });
  }

  if (flawless && !existing?.flawless) {
    breakdown.push({ reason: "FLAWLESS", delta: FLAWLESS_XP });
  }

  // Effort XP for a failed run, capped per unit per day so a learner cannot
  // farm it by replaying the same practice.
  if (!passed) {
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const todayEffort = await prisma.xpLedger.count({
      where: {
        learnerId,
        unitId,
        reason: "ATTEMPT_EFFORT",
        createdAt: { gte: dayStart },
      },
    });
    if (todayEffort < EFFORT_DAILY_CAP) {
      breakdown.push({ reason: "ATTEMPT_EFFORT", delta: EFFORT_XP });
    }
  }

  // ── Area completion ───────────────────────────────────────────────────────
  const otherScores = await prisma.unitProgress.findMany({
    where: { learnerId, unit: { areaId: unit.areaId } },
    select: { unitId: true, bestScore: true },
  });
  const scoreById = new Map(otherScores.map((p) => [p.unitId, p.bestScore]));
  scoreById.set(unitId, bestScore);

  const wasComplete = areaComplete(
    unit.area.units,
    new Map(otherScores.map((p) => [p.unitId, p.bestScore])),
  );
  const nowComplete = areaComplete(unit.area.units, scoreById);
  const areaCompleted = nowComplete && !wasComplete;
  if (areaCompleted) {
    breakdown.push({ reason: "AREA_COMPLETE", delta: AREA_COMPLETE_XP });
  }

  // ── Streak ────────────────────────────────────────────────────────────────
  const today = localDay(now, learner.timezone);
  const streak = advanceStreak(learner.streakCount, learner.streakLastDay, today);
  if (streak.dayXp) breakdown.push({ reason: "STREAK_DAY", delta: streak.dayXp });
  if (streak.milestoneXp) {
    breakdown.push({ reason: "STREAK_MILESTONE", delta: streak.milestoneXp });
  }

  const xpAwarded = breakdown.reduce((sum, b) => sum + b.delta, 0);
  const previousLevel = levelFromXp(learner.xp).level;
  const totalXp = learner.xp + xpAwarded;
  const level = levelFromXp(totalXp).level;

  // ── Persist ───────────────────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    await tx.unitProgress.upsert({
      where: { learnerId_unitId: { learnerId, unitId } },
      create: {
        learnerId,
        unitId,
        bestScore,
        attempts: 1,
        xpAwarded: unitXp,
        flawless,
        passedAt: passed ? now : null,
      },
      update: {
        bestScore,
        attempts: attempt,
        xpAwarded: (existing?.xpAwarded ?? 0) + unitXp,
        flawless: existing?.flawless || flawless,
        passedAt: existing?.passedAt ?? (passed ? now : null),
      },
    });

    if (graded.length) {
      await tx.activityAttempt.createMany({
        data: graded.map((g) => ({
          learnerId,
          activityId: g.activityId,
          correct: g.correct,
          answeredAt: now,
        })),
      });
    }

    if (breakdown.length) {
      await tx.xpLedger.createMany({
        data: breakdown.map((b) => ({
          learnerId,
          delta: b.delta,
          reason: b.reason,
          unitId: b.reason.startsWith("STREAK") ? null : unitId,
          createdAt: now,
        })),
      });
    }

    await tx.learner.update({
      where: { id: learnerId },
      data: {
        xp: totalXp,
        streakCount: streak.count,
        streakLastDay: today,
        lastActiveAt: now,
      },
    });
  });

  const newBadges = await evaluateBadges(learnerId);

  const visible = unit.area.units.filter((u) => u.isVisible);
  const index = visible.findIndex((u) => u.id === unitId);
  const nextUnit = index >= 0 ? (visible[index + 1] ?? null) : null;

  return {
    score,
    passed,
    correct,
    total,
    attempt,
    bestScore,
    xpAwarded,
    xpBreakdown: breakdown,
    totalXp,
    level,
    leveledUpTo: level > previousLevel ? level : null,
    newBadges,
    streak: streak.count,
    missedWords: [...new Set(graded.filter((g) => !g.correct).map((g) => g.word))],
    areaCompleted,
    nextUnit: nextUnit
      ? { id: nextUnit.id, name: nextUnit.name, sortOrder: nextUnit.sortOrder }
      : null,
  };
}

/**
 * Awards any badge whose condition is now met. Idempotent — the unique
 * (learner, badge) constraint makes re-evaluation cheap and safe.
 */
export async function evaluateBadges(learnerId: string): Promise<string[]> {
  const [learner, badges, progress, dictations] = await Promise.all([
    prisma.learner.findUniqueOrThrow({
      where: { id: learnerId },
      include: { badges: { include: { badge: true } } },
    }),
    prisma.badge.findMany(),
    prisma.unitProgress.findMany({
      where: { learnerId },
      select: {
        bestScore: true,
        flawless: true,
        unit: {
          select: {
            id: true,
            areaId: true,
            isVisible: true,
            sortOrder: true,
            _count: { select: { words: true } },
          },
        },
      },
    }),
    prisma.activityAttempt.count({
      where: {
        learnerId,
        correct: true,
        activity: { type: "TYPE_WHAT_YOU_HEAR" },
      },
    }),
  ]);

  const held = new Set(learner.badges.map((b) => b.badge.key));
  const passedRows = progress.filter((p) => isPassed(p.bestScore));
  const wordsLearned = passedRows.reduce((n, p) => n + p.unit._count.words, 0);

  // An area counts as complete when every visible unit in it has been passed.
  const areaIds = [...new Set(progress.map((p) => p.unit.areaId))];
  const areas = await prisma.area.findMany({
    where: { id: { in: areaIds } },
    select: {
      id: true,
      units: { select: { id: true, sortOrder: true, isVisible: true } },
    },
  });
  const scoreById = new Map(progress.map((p) => [p.unit.id, p.bestScore]));
  const anyAreaComplete = areas.some((a) => areaComplete(a.units, scoreById));

  const earned: Record<string, boolean> = {
    bd1: passedRows.length >= 1,
    bd2: learner.streakCount >= 10,
    bd3: anyAreaComplete,
    bd4: dictations >= 50,
    bd5: wordsLearned >= 100,
    bd6: progress.some((p) => p.flawless),
  };

  const toAward = badges.filter((b) => earned[b.key] && !held.has(b.key));
  if (toAward.length) {
    await prisma.learnerBadge.createMany({
      data: toAward.map((b) => ({ learnerId, badgeId: b.id })),
      skipDuplicates: true,
    });
  }
  return toAward.map((b) => b.key);
}

/** Words in every unit the learner has passed — the "words learned" metric. */
export async function wordsLearned(learnerId: string): Promise<number> {
  const rows = await prisma.unitProgress.findMany({
    where: { learnerId, bestScore: { gte: PASS_THRESHOLD } },
    select: { unit: { select: { _count: { select: { words: true } } } } },
  });
  return rows.reduce((n, r) => n + r.unit._count.words, 0);
}
