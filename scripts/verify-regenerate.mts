/**
 * In-place regeneration: replacing a unit's content must keep the unit, and so
 * keep every learner's progress on it, while the questions themselves change.
 *
 * Works on a throwaway organization so nothing real is touched.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { replaceGeneratedUnit } from "../src/lib/unit-persist";
import type { GeneratedUnit } from "../src/lib/unit-schema";

const prisma = new PrismaClient();
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✘"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

function draft(words: string[], title: string): GeneratedUnit {
  return {
    title,
    subtitle: `${words.length} palabras`,
    subtitleEs: `${words.length} words`,
    introParagraph: `${words.join(" ")} all appear here together in one paragraph.`,
    introParagraphEs: "Un párrafo.",
    words: words.map((text) => ({
      text,
      translation: `la ${text}`,
      definition: `The ${text}.`,
      definitionEs: `La ${text}.`,
      ipa: `/${text}/`,
      syllables: text,
      stress: text,
      pos: "sustantivo",
      exampleSentence: `This is a ${text}.`,
      exampleSentenceEs: `Esto es un ${text}.`,
    })),
    activities: [
      { type: "FILL_BLANK", word: words[0], prompt: "p", promptEs: "p", sentence: "A ______ here.", options: [words[0], words[1], words[2], words[3]], answerIndex: 0, note: "n", noteEs: "n" },
      { type: "IPA_MATCH", word: words[1], prompt: "p", promptEs: "p", sentence: null, options: [`/${words[1]}/`, "/x/", "/y/", "/z/"], answerIndex: 0, note: "n", noteEs: "n" },
      { type: "TYPE_WHAT_YOU_HEAR", word: words[2], prompt: "p", promptEs: "p", sentence: null, options: [], answerIndex: 0, note: "n", noteEs: "n" },
    ],
  };
}

const org = await prisma.organization.create({
  data: { name: "Regenerate Test Org", slug: `regen-${Date.now()}` },
});
const area = await prisma.area.create({
  data: { scope: "ORG", orgId: org.id, name: "Test Area", sortOrder: 0, isVisible: true },
});

// A hidden unit, third in its area, so we can prove those survive.
const before = await replaceGeneratedUnit(
  (
    await prisma.unit.create({
      data: { areaId: area.id, name: "Original", sortOrder: 2, isVisible: false, difficulty: "VERY_EASY" },
    })
  ).id,
  draft(["alpha", "bravo", "charlie", "delta"], "Original Content"),
  { difficulty: "VERY_EASY", visible: true, generationInput: { topic: "first" }, edited: false },
);
if ("error" in before) throw new Error(before.error);
const unitId = before.unitId;

// A learner with progress and answer history on it.
const user = await prisma.user.create({
  data: {
    email: `regen-${Date.now()}@test.local`,
    passwordHash: "x",
    name: "Regen Tester",
    role: "LEARNER",
    orgId: org.id,
    learner: { create: { orgId: org.id } },
  },
  include: { learner: true },
});
const learnerId = user.learner!.id;
await prisma.unitProgress.create({
  data: { learnerId, unitId, bestScore: 83, attempts: 4, xpAwarded: 21, passedAt: new Date() },
});
const activities = await prisma.activity.findMany({ where: { unitId } });
for (const activity of activities) {
  await prisma.activityAttempt.create({
    data: { learnerId, activityId: activity.id, correct: true },
  });
}

// XP the learner banked for this unit, and a badge they earned along the way.
await prisma.xpLedger.createMany({
  data: [
    { learnerId, unitId, delta: 21, reason: "UNIT_PASS" },
    { learnerId, unitId, delta: 15, reason: "FLAWLESS" },
    { learnerId, delta: 5, reason: "STREAK_DAY" },
  ],
});
await prisma.learner.update({ where: { id: learnerId }, data: { xp: 41 } });

const dictationBadge = await prisma.badge.findFirst({ where: { key: "bd4" } });
if (dictationBadge) {
  await prisma.learnerBadge.create({
    data: { learnerId, badgeId: dictationBadge.id },
  });
}

const wordsBefore = (
  await prisma.word.findMany({ where: { unitId }, orderBy: { sortOrder: "asc" } })
).map((w) => w.text);
check("starting words", wordsBefore, ["alpha", "bravo", "charlie", "delta"]);
check("starting attempt history", await prisma.activityAttempt.count({ where: { learnerId } }), 3);
check("starting XP ledger rows", await prisma.xpLedger.count({ where: { learnerId } }), 3);
check("starting badges", await prisma.learnerBadge.count({ where: { learnerId } }), dictationBadge ? 1 : 0);

// ── Regenerate ──────────────────────────────────────────────────────────────
const result = await replaceGeneratedUnit(
  unitId,
  draft(["echo", "foxtrot", "golf", "hotel", "india"], "Replaced Content"),
  { difficulty: "EASY", visible: true, generationInput: { topic: "second" }, edited: false },
);
check("replace succeeded", "error" in result ? result.error : true, true);

const after = await prisma.unit.findUniqueOrThrow({
  where: { id: unitId },
  include: { words: { orderBy: { sortOrder: "asc" } }, activities: true },
});

check("same unit row", after.id, unitId);
check("content replaced", after.words.map((w) => w.text), ["echo", "foxtrot", "golf", "hotel", "india"]);
check("no orphan words left behind", after.words.length, 5);
check("activities replaced, not appended", after.activities.length, 3);
check("name updated", after.name, "Replaced Content");
check("wordCount updated", after.wordCount, 5);
check("difficulty updated", after.difficulty, "EASY");
check("stored request updated", after.generationInput, { topic: "second" });

// The whole point: progress survives, position and visibility are not disturbed.
const progress = await prisma.unitProgress.findFirstOrThrow({ where: { learnerId, unitId } });
check("learner best score survives", progress.bestScore, 83);
check("learner attempt count survives", progress.attempts, 4);
check("learner XP for the unit survives", progress.xpAwarded, 21);
check("unit stays hidden", after.isVisible, false);
check("unit keeps its position", after.sortOrder, 2);

// Answers to questions that no longer exist go with them.
check(
  "answer history for deleted questions is gone",
  await prisma.activityAttempt.count({ where: { learnerId } }),
  0,
);

// ── What a learner keeps ───────────────────────────────────────────────────
// XP is banked in the ledger, which points at the unit but is not deleted with
// its questions, so nobody loses XP or leaderboard standing over a regeneration.
check("XP ledger rows survive", await prisma.xpLedger.count({ where: { learnerId } }), 3);
check(
  "banked XP still totals the same",
  (await prisma.xpLedger.aggregate({ where: { learnerId }, _sum: { delta: true } }))._sum.delta,
  41,
);
check(
  "the learner's XP balance is untouched",
  (await prisma.learner.findUniqueOrThrow({ where: { id: learnerId } })).xp,
  41,
);

// Badges are awarded, never revoked: evaluateBadges only ever inserts. So a
// badge whose underlying evidence was just deleted is still held.
check(
  "badges survive even when their evidence does not",
  await prisma.learnerBadge.count({ where: { learnerId } }),
  dictationBadge ? 1 : 0,
);

// The one number that does move: "words learned" is derived from the passed
// unit's current size, so changing the word count rewrites history a little.
const learned = await prisma.unitProgress.findMany({
  where: { learnerId, bestScore: { gte: 70 } },
  select: { unit: { select: { _count: { select: { words: true } } } } },
});
check(
  "words-learned follows the new word count, not the old",
  learned.reduce((n, r) => n + r.unit._count.words, 0),
  5,
);

await prisma.organization.delete({ where: { id: org.id } });
console.log(failures === 0 ? "\nall regeneration checks passed" : `\n${failures} check(s) failed`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 1);
