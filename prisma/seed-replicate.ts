/**
 * Replication used by the seed.
 *
 * `src/lib/replicate.ts` is marked `server-only`, which a plain tsx script
 * cannot import, so the same deep copy lives here against a passed-in client.
 * Both must stay in step: areas arrive hidden, activities are re-pointed at the
 * copied words, and nothing links back to the template except provenance ids.
 */
import type { PrismaClient } from "../src/generated/prisma";

export async function replicate(
  prisma: PrismaClient,
  templateId: string,
  orgId: string,
): Promise<{ areas: number; units: number; words: number; activities: number }> {
  const counts = { areas: 0, units: 0, words: 0, activities: 0 };
  const areas = await prisma.area.findMany({
    where: { scope: "GLOBAL", templateId },
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { sortOrder: "asc" },
        include: {
          words: { orderBy: { sortOrder: "asc" } },
          activities: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  for (const area of areas) {
    const copy = await prisma.area.create({
      data: {
        scope: "ORG",
        orgId,
        name: area.name,
        nameEs: area.nameEs,
        description: area.description,
        iconKey: area.iconKey,
        tint: area.tint,
        sortOrder: area.sortOrder,
        isVisible: false,
        sourceAreaId: area.id,
      },
    });
    counts.areas++;

    for (const unit of area.units) {
      const unitCopy = await prisma.unit.create({
        data: {
          areaId: copy.id,
          name: unit.name,
          subtitle: unit.subtitle,
          subtitleEn: unit.subtitleEn,
          sortOrder: unit.sortOrder,
          isVisible: unit.isVisible,
          difficulty: unit.difficulty,
          wordCount: unit.wordCount,
          introParagraph: unit.introParagraph,
          introParagraphEs: unit.introParagraphEs,
          sourceUnitId: unit.id,
        },
      });
      counts.units++;

      const wordIdByOriginal = new Map<string, string>();
      for (const word of unit.words) {
        const created = await prisma.word.create({
          data: {
            unitId: unitCopy.id,
            text: word.text,
            translation: word.translation,
            definition: word.definition,
            definitionEs: word.definitionEs,
            ipa: word.ipa,
            syllables: word.syllables,
            stress: word.stress,
            pos: word.pos,
            exampleSentence: word.exampleSentence,
            exampleSentenceEs: word.exampleSentenceEs,
            sortOrder: word.sortOrder,
          },
        });
        wordIdByOriginal.set(word.id, created.id);
        counts.words++;
      }

      for (const activity of unit.activities) {
        const wordId = wordIdByOriginal.get(activity.wordId);
        if (!wordId) continue;
        await prisma.activity.create({
          data: {
            unitId: unitCopy.id,
            wordId,
            type: activity.type,
            prompt: activity.prompt,
            promptEs: activity.promptEs,
            sentence: activity.sentence,
            options: activity.options ?? [],
            answerIndex: activity.answerIndex,
            note: activity.note,
            noteEs: activity.noteEs,
            mono: activity.mono,
            sortOrder: activity.sortOrder,
          },
        });
        counts.activities++;
      }
    }
  }
  return counts;
}
