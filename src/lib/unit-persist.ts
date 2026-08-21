/**
 * Writing a reviewed AI draft into an area.
 *
 * Deliberately free of auth and framework concerns so both the console's server
 * action (which checks permissions first) and the content seeding script can
 * write units through exactly the same path.
 */
import { prisma } from "@/lib/prisma";
import { hasBlockingIssue, validateGeneratedUnit } from "@/lib/unit-validate";
import type { GeneratedUnit } from "@/lib/unit-schema";
import type { Difficulty } from "@/generated/prisma";

export type PersistOptions = {
  difficulty: Difficulty;
  visible: boolean;
  generationInput: unknown;
  edited: boolean;
};

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

    const wordIds = new Map<string, string>();
    for (const [index, word] of draft.words.entries()) {
      const row = await tx.word.create({
        data: { ...word, unitId: created.id, sortOrder: index },
      });
      wordIds.set(word.text.toLowerCase(), row.id);
    }

    for (const [index, activity] of draft.activities.entries()) {
      const wordId = wordIds.get(activity.word.toLowerCase());
      if (!wordId) continue; // validation already flagged it; skip rather than fail
      await tx.activity.create({
        data: {
          unitId: created.id,
          wordId,
          type: activity.type,
          prompt: activity.prompt,
          promptEs: activity.promptEs,
          sentence: activity.type === "TYPE_WHAT_YOU_HEAR" ? null : activity.sentence,
          options: activity.type === "TYPE_WHAT_YOU_HEAR" ? [] : activity.options,
          answerIndex: activity.type === "TYPE_WHAT_YOU_HEAR" ? 0 : activity.answerIndex,
          note: activity.note,
          noteEs: activity.noteEs,
          mono: activity.type === "IPA_MATCH",
          sortOrder: index,
        },
      });
    }
    return created;
  });

  return { unitId: unit.id };
}
