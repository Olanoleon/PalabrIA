/**
 * End-to-end check of the practice engine against the real database:
 * grading, the XP ratchet, unlocks, streaks and badges.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { recordPractice } from "../src/lib/progress";
import { unitStates } from "../src/lib/unlock";
import { unitTarget } from "../src/lib/xp";

const prisma = new PrismaClient();
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✘"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

const learner = await prisma.learner.findFirstOrThrow({
  where: { user: { email: "ana.rueda@arkusnexus.com" } },
});

const area = await prisma.area.findFirstOrThrow({
  where: { scope: "ORG", org: { slug: "arkus" }, name: "Food & Cooking" },
  include: {
    units: {
      orderBy: { sortOrder: "asc" },
      include: { activities: { orderBy: { sortOrder: "asc" }, include: { word: true } } },
    },
  },
});
const [unit, nextUnit] = area.units;

/** Builds answers where the first `correctCount` questions are right. */
function answersFor(correctCount: number) {
  return unit.activities.map((activity, index) => {
    const right = index < correctCount;
    if (activity.type === "TYPE_WHAT_YOU_HEAR") {
      return { activityId: activity.id, typed: right ? activity.word.text : "zzzz" };
    }
    const wrong = (activity.answerIndex + 1) % Math.max(2, (activity.options as string[]).length);
    return { activityId: activity.id, optionIndex: right ? activity.answerIndex : wrong };
  });
}

async function reset() {
  await prisma.unitProgress.deleteMany({ where: { learnerId: learner.id, unit: { areaId: area.id } } });
  await prisma.xpLedger.deleteMany({ where: { learnerId: learner.id, unit: { areaId: area.id } } });
  await prisma.activityAttempt.deleteMany({ where: { learnerId: learner.id, activity: { unit: { areaId: area.id } } } });
  // The area badge is awarded once and only reported as "new" once, so a
  // repeatable run has to hand it back.
  await prisma.learnerBadge.deleteMany({
    where: { learnerId: learner.id, badge: { key: "bd3" } },
  });
  await prisma.learner.update({
    where: { id: learner.id },
    data: { xp: 840, streakCount: 12, streakLastDay: null },
  });
}

const total = unit.activities.length;
console.log(`unit "${unit.name}" (${unit.difficulty}) with ${total} activities\n`);

// ── A failing run ───────────────────────────────────────────────────────────
await reset();
let r = await recordPractice(learner.id, unit.id, answersFor(2));
check("failing run score", r.score, Math.round((2 / total) * 100));
check("failing run does not pass", r.passed, false);
check("failing run pays no unit XP", r.xpBreakdown.filter((b) => b.reason.startsWith("UNIT")).length, 0);
check("failing run pays effort XP", r.xpBreakdown.some((b) => b.reason === "ATTEMPT_EFFORT"), true);
check("next unit still locked", (() => {
  const scores = new Map([[unit.id, r.bestScore]]);
  return unitStates(area.units, scores).find((s) => s.unit.id === nextUnit.id)?.state;
})(), "locked");

// ── Passing at the threshold ────────────────────────────────────────────────
await reset();
const passCount = Math.ceil((70 / 100) * total);
r = await recordPractice(learner.id, unit.id, answersFor(passCount));
const firstAward = r.xpBreakdown.find((b) => b.reason === "UNIT_PASS")?.delta ?? 0;
check("threshold run passes", r.passed, true);
check("threshold run XP matches the formula", firstAward, unitTarget(unit.difficulty, r.score));
check("next unit unlocked", (() => {
  const scores = new Map([[unit.id, r.bestScore]]);
  return unitStates(area.units, scores).find((s) => s.unit.id === nextUnit.id)?.state;
})(), "current");
check("result names the next unit", r.nextUnit?.id, nextUnit.id);

// ── Improving pays only the difference ──────────────────────────────────────
r = await recordPractice(learner.id, unit.id, answersFor(total));
const improve = r.xpBreakdown.find((b) => b.reason === "UNIT_IMPROVE")?.delta ?? 0;
check("perfect run best score", r.bestScore, 100);
check("improvement pays the difference only", improve, unitTarget(unit.difficulty, 100) - firstAward);
check("flawless bonus awarded once", r.xpBreakdown.filter((b) => b.reason === "FLAWLESS").length, 1);
const lifetime = (await prisma.unitProgress.findFirstOrThrow({
  where: { learnerId: learner.id, unitId: unit.id },
})).xpAwarded;
check("lifetime unit XP equals a single perfect run", lifetime, unitTarget(unit.difficulty, 100));

// ── A worse retry pays nothing and never lowers the record ──────────────────
r = await recordPractice(learner.id, unit.id, answersFor(passCount));
check("worse retry keeps best score", r.bestScore, 100);
check("worse retry pays no unit XP", r.xpBreakdown.filter((b) => b.reason.startsWith("UNIT")).length, 0);
check("flawless bonus not repeated", r.xpBreakdown.filter((b) => b.reason === "FLAWLESS").length, 0);

// ── Streak XP is once per day ──────────────────────────────────────────────
const streakAwards = r.xpBreakdown.filter((b) => b.reason === "STREAK_DAY").length;
check("streak XP not paid twice in one day", streakAwards, 0);

// ── Area completion ────────────────────────────────────────────────────────
r = await recordPractice(learner.id, nextUnit.id, [
  ...(await prisma.activity.findMany({
    where: { unitId: nextUnit.id },
    orderBy: { sortOrder: "asc" },
    include: { word: true },
  })).map((a) =>
    a.type === "TYPE_WHAT_YOU_HEAR"
      ? { activityId: a.id, typed: a.word.text }
      : { activityId: a.id, optionIndex: a.answerIndex },
  ),
]);
check("area completion bonus awarded", r.xpBreakdown.some((b) => b.reason === "AREA_COMPLETE"), true);
check("area completion reported", r.areaCompleted, true);
check("no next unit at the end of an area", r.nextUnit, null);
check("area badge earned", r.newBadges.includes("bd3"), true);

// ── Effort XP daily cap ────────────────────────────────────────────────────
await reset();
const efforts: number[] = [];
for (let i = 0; i < 5; i++) {
  const run = await recordPractice(learner.id, unit.id, answersFor(0));
  efforts.push(run.xpBreakdown.filter((b) => b.reason === "ATTEMPT_EFFORT").length);
}
check("effort XP capped at 3 per day", efforts, [1, 1, 1, 0, 0]);

await reset();
// Leave the demo learner's badges consistent with her remaining progress.
const { evaluateBadges } = await import("../src/lib/progress");
await evaluateBadges(learner.id);

console.log(failures === 0 ? "\nall progress checks passed" : `\n${failures} check(s) failed`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 1);
