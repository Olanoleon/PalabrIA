/**
 * Writing a reviewed AI draft into an area.
 *
 * Deliberately free of auth and framework concerns so both the console's server
 * action (which checks permissions first) and the content seeding script can
 * write units through exactly the same path.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { hasBlockingIssue, validateGeneratedUnit } from "@/lib/unit-validate";
import type { GeneratedUnit } from "@/lib/unit-schema";
import type { Difficulty } from "@/generated/prisma";

/** Word-lookup key. Must match `normalize` in unit-validate. */
const key = (text: string) => text.trim().toLowerCase();

export type PersistOptions = {
  difficulty: Difficulty;
  visible: boolean;
  generationInput: unknown;
  edited: boolean;
};

/**
 * Writes a draft's words and activities under a unit.
 *
 * Shared by both entry points, which used to carry byte-identical copies of
 * this loop — and the copies had already started to drift in their comments.
 *
 * A match-up is expanded here rather than stored whole: its three pairings
 * become three ordinary rows sharing a `matchGroup`, each with its own real
 * `wordId` and its own answer among the same three meanings. Everything
 * downstream — grading, partial credit, coverage counting, attempt history —
 * then works with no special case, and only the practice screen has to know
 * that rows sharing a group are drawn together.
 */
async function writeContent(
  tx: Prisma.TransactionClient,
  unitId: string,
  draft: GeneratedUnit,
) {
  const wordIds = new Map<string, string>();
  for (const [index, word] of draft.words.entries()) {
    const row = await tx.word.create({
      data: { ...word, unitId, sortOrder: index },
    });
    // Trimmed as well as lower-cased, matching `normalize` in unit-validate.
    // Without the trim a word with stray whitespace validates but then fails
    // to resolve here, and the activity vanishes from a "successful" save.
    wordIds.set(key(word.text), row.id);
  }

  const resolve = (text: string) => {
    const id = wordIds.get(key(text));
    // Unreachable in practice: the orphan check blocks the save first. Loud
    // rather than silent, because the old `continue` dropped the activity and
    // still reported success.
    if (!id) {
      throw new Error(`No word "${text}" in this unit to attach an activity to.`);
    }
    return id;
  };

  let sortOrder = 0;
  for (const activity of draft.activities) {
    if (activity.type === "MATCH_UP") {
      const pairs = activity.pairs ?? [];
      const matchGroup = randomUUID();
      const meanings = pairs.map((pair) => pair.es);
      for (const [i, pair] of pairs.entries()) {
        await tx.activity.create({
          data: {
            unitId,
            wordId: resolve(pair.en),
            type: "MATCH_UP",
            prompt: activity.prompt,
            promptEs: activity.promptEs,
            sentence: null,
            // Every row offers the same meanings; only the answer differs.
            options: meanings,
            answerIndex: i,
            note: activity.note,
            noteEs: activity.noteEs,
            mono: false,
            matchGroup,
            sortOrder: sortOrder++,
          },
        });
      }
      continue;
    }

    const dictation = activity.type === "TYPE_WHAT_YOU_HEAR";
    await tx.activity.create({
      data: {
        unitId,
        wordId: resolve(activity.word),
        type: activity.type,
        prompt: activity.prompt,
        promptEs: activity.promptEs,
        sentence: dictation ? null : activity.sentence,
        options: dictation ? [] : activity.options,
        answerIndex: dictation ? 0 : activity.answerIndex,
        note: activity.note,
        noteEs: activity.noteEs,
        mono: activity.type === "IPA_MATCH",
        sortOrder: sortOrder++,
      },
    });
  }
}

/**
 * Replaces a unit's teachable content in place, keeping the unit itself.
 *
 * The row survives, so UnitProgress — a learner's best score, attempts and pass
 * date — survives with it. Per-activity attempt history does not: the old
 * Activity rows are deleted and their ActivityAttempt records cascade away,
 * because those answers were to questions that no longer exist.
 */
export async function replaceGeneratedUnit(
  unitId: string,
  draft: GeneratedUnit,
  options: PersistOptions,
): Promise<{ unitId: string } | { error: string }> {
  const issues = validateGeneratedUnit(draft, { wordCount: draft.words.length });
  if (hasBlockingIssue(issues)) {
    return { error: issues.find((i) => i.level === "error")!.message };
  }

  await prisma.$transaction(async (tx) => {
    // Activities first: they reference the words.
    await tx.activity.deleteMany({ where: { unitId } });
    await tx.word.deleteMany({ where: { unitId } });

    await tx.unit.update({
      where: { id: unitId },
      data: {
        name: draft.title,
        subtitle: draft.subtitle,
        subtitleEn: draft.subtitleEs,
        difficulty: options.difficulty,
        wordCount: draft.words.length,
        introParagraph: draft.introParagraph,
        introParagraphEs: draft.introParagraphEs,
        generationInput: options.generationInput as never,
        generatedAt: new Date(),
        editedAfterGen: options.edited,
        // Only regeneration bumps this. Editing a word or fixing a typo in the
        // unit editor must not summon every learner back.
        contentVersion: { increment: 1 },
        // sortOrder and isVisible are deliberately untouched: regenerating the
        // content is not a reason to move the unit or reveal a hidden one.
      },
    });

    await writeContent(tx, unitId, draft);
  });

  return { unitId };
}

export async function persistGeneratedUnit(
  areaId: string,
  draft: GeneratedUnit,
  options: PersistOptions,
): Promise<{ unitId: string } | { error: string }> {
  const issues = validateGeneratedUnit(draft, { wordCount: draft.words.length });
  if (hasBlockingIssue(issues)) {
    return { error: issues.find((i) => i.level === "error")!.message };
  }

  const count = await prisma.unit.count({ where: { areaId } });

  const unit = await prisma.$transaction(async (tx) => {
    const created = await tx.unit.create({
      data: {
        areaId,
        name: draft.title,
        subtitle: draft.subtitle,
        subtitleEn: draft.subtitleEs,
        sortOrder: count,
        isVisible: options.visible,
        difficulty: options.difficulty,
        wordCount: draft.words.length,
        introParagraph: draft.introParagraph,
        introParagraphEs: draft.introParagraphEs,
        generationInput: options.generationInput as never,
        generatedAt: new Date(),
        editedAfterGen: options.edited,
      },
    });

    await writeContent(tx, created.id, draft);
    return created;
  });

  return { unitId: unit.id };
}
