/**
 * Read models for the learner app. Every query is scoped to the learner's own
 * organization and to content marked visible, so a hidden area or unit simply
 * does not exist as far as these functions are concerned.
 */
import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, viewFor } from "@/lib/billing";
import { levelFromXp, PASS_THRESHOLD } from "@/lib/xp";
import { areaComplete, passedCount, unitStates, type UnitState } from "@/lib/unlock";
import { wordsLearned } from "@/lib/progress";
import { requireLearner } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";

export type LearnerContext = Awaited<ReturnType<typeof learnerContext>>;

/**
 * Everything a learner screen needs before it queries anything specific.
 *
 * `requireAccess` is what enforces payment: a suspended or administratively
 * disabled learner is sent to the payments screen instead of the lesson. The
 * payments and profile screens deliberately omit it so a suspended learner can
 * still reach them.
 */
export async function learnerContext(options?: { requireAccess?: boolean }) {
  const [{ user, learner }, { lang, d }, settings] = await Promise.all([
    requireLearner(),
    currentDict(),
    getSettings(),
  ]);
  const billing = viewFor(learner, settings);
  if (options?.requireAccess && !billing.access) redirect("/payments");
  return { user, learner, lang, d, settings, billing, level: levelFromXp(learner.xp) };
}

export type AreaCardData = {
  id: string;
  name: string;
  nameEs: string | null;
  description: string;
  iconKey: string;
  tint: string;
  sortOrder: number;
  totalUnits: number;
  doneUnits: number;
  totalWords: number;
  complete: boolean;
  progress: number;
  /** Passed units whose content has been regenerated since. */
  updatedUnits: number;
};

type ProgressRow = {
  bestScore: number;
  passed: boolean;
  seenContentVersion: number;
};

async function progressMap(learnerId: string): Promise<Map<string, ProgressRow>> {
  const rows = await prisma.unitProgress.findMany({
    where: { learnerId },
    select: {
      unitId: true,
      bestScore: true,
      passedAt: true,
      seenContentVersion: true,
    },
  });
  return new Map(
    rows.map((r) => [
      r.unitId,
      {
        bestScore: r.bestScore,
        passed: r.passedAt !== null,
        seenContentVersion: r.seenContentVersion,
      },
    ]),
  );
}

function scoresOf(progress: Map<string, ProgressRow>): Map<string, number> {
  return new Map([...progress].map(([id, p]) => [id, p.bestScore]));
}

/**
 * A learner is behind on a unit when they passed it and its content has been
 * regenerated since. Only then is there anything new for them to see.
 */
function isBehind(
  progress: Map<string, ProgressRow>,
  unitId: string,
  contentVersion: number,
): boolean {
  const row = progress.get(unitId);
  return !!row && row.passed && row.seenContentVersion < contentVersion;
}

export async function visibleAreas(
  orgId: string,
  learnerId: string,
): Promise<AreaCardData[]> {
  const [areas, progress] = await Promise.all([
    prisma.area.findMany({
      where: { scope: "ORG", orgId, isVisible: true },
      orderBy: { sortOrder: "asc" },
      include: {
        units: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            sortOrder: true,
            isVisible: true,
            contentVersion: true,
            _count: { select: { words: true } },
          },
        },
      },
    }),
    progressMap(learnerId),
  ]);
  const scores = scoresOf(progress);

  return areas.map((area) => {
    const total = area.units.length;
    const done = passedCount(area.units, scores);
    return {
      id: area.id,
      name: area.name,
      nameEs: area.nameEs,
      description: area.description,
      iconKey: area.iconKey,
      tint: area.tint,
      sortOrder: area.sortOrder,
      totalUnits: total,
      doneUnits: done,
      totalWords: area.units.reduce((n, u) => n + u._count.words, 0),
      complete: total > 0 && areaComplete(area.units, scores),
      progress: total > 0 ? done / total : 0,
      updatedUnits: area.units.filter((u) =>
        isBehind(progress, u.id, u.contentVersion),
      ).length,
    };
  });
}

export type UnitRowData = {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  subtitleEn: string;
  state: UnitState;
  score: number;
  difficulty: string;
  /** Passed, but the content has changed since. */
  updated: boolean;
};

export type AreaDetail = {
  id: string;
  name: string;
  nameEs: string | null;
  tint: string;
  sortOrder: number;
  totalWords: number;
  doneUnits: number;
  totalUnits: number;
  complete: boolean;
  units: UnitRowData[];
  blockingNumber: number;
};

/** Null when the area does not exist, is hidden, or belongs to another org. */
export async function areaDetail(
  orgId: string,
  learnerId: string,
  areaId: string,
): Promise<AreaDetail | null> {
  const area = await prisma.area.findFirst({
    where: { id: areaId, scope: "ORG", orgId, isVisible: true },
    include: {
      units: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          subtitle: true,
          subtitleEn: true,
          sortOrder: true,
          isVisible: true,
          difficulty: true,
          contentVersion: true,
          _count: { select: { words: true } },
        },
      },
    },
  });
  if (!area) return null;

  const progress = await progressMap(learnerId);
  const scores = scoresOf(progress);
  const states = unitStates(area.units, scores);
  const units: UnitRowData[] = states.map((s) => ({
    id: s.unit.id,
    number: s.index + 1,
    name: s.unit.name,
    subtitle: s.unit.subtitle,
    subtitleEn: s.unit.subtitleEn,
    state: s.state,
    score: s.score,
    difficulty: s.unit.difficulty,
    updated: isBehind(progress, s.unit.id, s.unit.contentVersion),
  }));

  return {
    id: area.id,
    name: area.name,
    nameEs: area.nameEs,
    tint: area.tint,
    sortOrder: area.sortOrder,
    totalWords: area.units.reduce((n, u) => n + u._count.words, 0),
    doneUnits: units.filter((u) => u.state === "passed").length,
    totalUnits: units.length,
    complete: units.length > 0 && units.every((u) => u.state === "passed"),
    units,
    blockingNumber: (states.find((s) => s.state === "current")?.index ?? 0) + 1,
  };
}

export type UnitDetail = {
  id: string;
  number: number;
  name: string;
  areaId: string;
  areaName: string;
  areaSortOrder: number;
  difficulty: string;
  introParagraph: string;
  introParagraphEs: string;
  bestScore: number;
  activityCount: number;
  words: Array<{
    id: string;
    text: string;
    translation: string;
    definition: string;
    definitionEs: string;
    ipa: string;
    syllables: string;
    stress: string;
    pos: string;
    exampleSentence: string;
    exampleSentenceEs: string;
  }>;
  locked: boolean;
};

export async function unitDetail(
  orgId: string,
  learnerId: string,
  unitId: string,
): Promise<UnitDetail | null> {
  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      isVisible: true,
      area: { scope: "ORG", orgId, isVisible: true },
    },
    include: {
      words: { orderBy: { sortOrder: "asc" } },
      area: {
        select: {
          id: true,
          name: true,
          sortOrder: true,
          units: {
            where: { isVisible: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, sortOrder: true, isVisible: true },
          },
        },
      },
      _count: { select: { activities: true } },
    },
  });
  if (!unit) return null;

  const scores = scoresOf(await progressMap(learnerId));
  const states = unitStates(unit.area.units, scores);
  const own = states.find((s) => s.unit.id === unitId);

  return {
    id: unit.id,
    number: (own?.index ?? 0) + 1,
    name: unit.name,
    areaId: unit.area.id,
    areaName: unit.area.name,
    areaSortOrder: unit.area.sortOrder,
    difficulty: unit.difficulty,
    introParagraph: unit.introParagraph,
    introParagraphEs: unit.introParagraphEs,
    bestScore: own?.score ?? 0,
    activityCount: unit._count.activities,
    words: unit.words.map((w) => ({
      id: w.id,
      text: w.text,
      translation: w.translation,
      definition: w.definition,
      definitionEs: w.definitionEs,
      ipa: w.ipa,
      syllables: w.syllables,
      stress: w.stress,
      pos: w.pos,
      exampleSentence: w.exampleSentence,
      exampleSentenceEs: w.exampleSentenceEs,
    })),
    locked: own?.state === "locked" || !own,
  };
}

/** Fisher-Yates. Server-side, so the order cannot be predicted by the client. */
function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Practice questions. Answer keys are deliberately left out: the client posts
 * answers back and the server grades them.
 *
 * Options are shuffled on every load. Both the seeded content and the model's
 * output tend to put the correct answer first, which is trivially learnable —
 * and because grading compares the chosen *text*, not its position, shuffling
 * here cannot desynchronise from the stored answer.
 */
export type PracticeQuestion = {
  id: string;
  type: "FILL_BLANK" | "IPA_MATCH" | "TYPE_WHAT_YOU_HEAR";
  prompt: string;
  promptEs: string;
  sentence: string | null;
  options: string[];
  mono: boolean;
  /** Only sent for the dictation type, where the client needs the length. */
  wordLength: number;
  word: string | null;
};

export async function practiceQuestions(
  unitId: string,
): Promise<PracticeQuestion[]> {
  const activities = await prisma.activity.findMany({
    where: { unitId },
    orderBy: { sortOrder: "asc" },
    include: { word: { select: { text: true } } },
  });

  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    prompt: a.prompt,
    promptEs: a.promptEs,
    sentence: a.sentence,
    options: shuffled(Array.isArray(a.options) ? (a.options as string[]) : []),
    mono: a.mono,
    wordLength: a.word.text.length,
    // The dictation type needs the word client-side to speak it and to build
    // the letter bank; the two multiple-choice types never receive it.
    word: a.type === "TYPE_WHAT_YOU_HEAR" ? a.word.text : null,
  }));
}

export type BoardRow = {
  rank: number;
  learnerId: string;
  name: string;
  team: string | null;
  monthlyXp: number;
  words: number;
  isMe: boolean;
};

/**
 * Monthly leaderboard for one organization, summing the XP ledger for the
 * current calendar month. The board resets naturally on the 1st.
 */
export async function monthlyBoard(
  orgId: string,
  meId: string,
  now = new Date(),
): Promise<{ rows: BoardRow[]; me: BoardRow | null; total: number }> {
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [learners, ledger, passed] = await Promise.all([
    prisma.learner.findMany({
      where: { orgId, user: { isActive: true } },
      select: {
        id: true,
        team: true,
        user: { select: { name: true } },
      },
    }),
    prisma.xpLedger.groupBy({
      by: ["learnerId"],
      where: { createdAt: { gte: monthStart }, learner: { orgId } },
      _sum: { delta: true },
    }),
    prisma.unitProgress.findMany({
      where: { learner: { orgId }, bestScore: { gte: PASS_THRESHOLD } },
      select: {
        learnerId: true,
        unit: { select: { _count: { select: { words: true } } } },
      },
    }),
  ]);

  const xpByLearner = new Map(
    ledger.map((row) => [row.learnerId, row._sum.delta ?? 0]),
  );
  const wordsByLearner = new Map<string, number>();
  for (const row of passed) {
    wordsByLearner.set(
      row.learnerId,
      (wordsByLearner.get(row.learnerId) ?? 0) + row.unit._count.words,
    );
  }

  const rows = learners
    .map((learner) => ({
      learnerId: learner.id,
      name: learner.user.name,
      team: learner.team,
      monthlyXp: xpByLearner.get(learner.id) ?? 0,
      words: wordsByLearner.get(learner.id) ?? 0,
      isMe: learner.id === meId,
    }))
    .sort((a, b) => b.monthlyXp - a.monthlyXp || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    rows,
    me: rows.find((r) => r.isMe) ?? null,
    total: rows.length,
  };
}

export type ProfileData = {
  name: string;
  email: string;
  level: ReturnType<typeof levelFromXp>;
  streak: number;
  wordsLearned: number;
  badgeCount: number;
  badgeTotal: number;
  week: Array<{ active: boolean; isToday: boolean }>;
  areas: AreaCardData[];
};

/**
 * The seven-day strip. Built from XP ledger activity so a day counts when the
 * learner actually practised, not merely opened the app.
 */
export async function weekActivity(
  learnerId: string,
  timezone: string,
  now = new Date(),
): Promise<Array<{ active: boolean; isToday: boolean }>> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(now);
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const mondayMs = new Date(`${today}T12:00:00Z`).getTime() - dow * 86_400_000;

  const rows = await prisma.xpLedger.findMany({
    where: { learnerId, createdAt: { gte: new Date(mondayMs - 86_400_000) } },
    select: { createdAt: true },
  });
  const activeDays = new Set(rows.map((r) => fmt.format(r.createdAt)));

  return Array.from({ length: 7 }, (_, index) => {
    const day = fmt.format(new Date(mondayMs + index * 86_400_000));
    return { active: activeDays.has(day), isToday: day === today };
  });
}

export async function badgeState(learnerId: string) {
  const [badges, earned] = await Promise.all([
    prisma.badge.findMany({ orderBy: { order: "asc" } }),
    prisma.learnerBadge.findMany({
      where: { learnerId },
      select: { badgeId: true, earnedAt: true },
    }),
  ]);
  const earnedById = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));
  return badges.map((badge) => ({
    key: badge.key,
    svgPath: badge.svgPath,
    earned: earnedById.has(badge.id),
    earnedAt: earnedById.get(badge.id) ?? null,
  }));
}

export async function paymentsData(learnerId: string) {
  const [settings, learner, payments] = await Promise.all([
    getSettings(),
    prisma.learner.findUniqueOrThrow({ where: { id: learnerId } }),
    prisma.payment.findMany({
      where: { learnerId },
      orderBy: { declaredAt: "desc" },
      take: 12,
    }),
  ]);
  return { settings, learner, payments, billing: viewFor(learner, settings) };
}

export { wordsLearned };
