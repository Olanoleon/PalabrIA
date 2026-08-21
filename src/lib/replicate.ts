/**
 * Global Template -> Organization replication.
 *
 * The mandatory product rule is independence: once template content is
 * instantiated for an organization, the copy is its own thing. Nothing here
 * ever writes back up to the template, and template edits never reach an
 * existing organization copy. `sourceAreaId` / `sourceUnitId` are provenance
 * only — no code follows them to synchronize.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Deep-copies every area of a template into an organization.
 *
 * Areas arrive hidden (`isVisible: false`) so an administrator decides when
 * learners see them, per the PRD default.
 */
export async function replicateTemplateToOrg(
  templateId: string,
  orgId: string,
): Promise<{ areas: number; units: number; words: number; activities: number }> {
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

  const counts = { areas: 0, units: 0, words: 0, activities: 0 };

  for (const area of areas) {
    await prisma.$transaction(async (tx) => {
      const copy = await tx.area.create({
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
        const unitCopy = await tx.unit.create({
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
            generationInput: unit.generationInput ?? undefined,
            generatedAt: unit.generatedAt,
          },
        });
        counts.units++;

        // Words first, so activities can be re-pointed at the copies.
        const wordIdByOriginal = new Map<string, string>();
        for (const word of unit.words) {
          const created = await tx.word.create({
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
          if (!wordId) continue; // activity pointed outside its own unit; skip it
          await tx.activity.create({
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
    });
  }

  return counts;
}

/** The single seeded template. v1 has exactly one; there is no UI to add more. */
export async function defaultTemplateId(): Promise<string | null> {
  const template = await prisma.globalTemplate.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return template?.id ?? null;
}
