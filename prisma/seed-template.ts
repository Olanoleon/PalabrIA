/**
 * Builds the single Global Template from `seed-content.ts`.
 *
 * Shared by the demo seed (`prisma/seed.ts`, which wipes first) and the
 * additive owner seed (`scripts/seed-owner.mts`, which destroys nothing), so
 * there is only one definition of what the template contains.
 */
import type { PrismaClient } from "../src/generated/prisma";
import { SEED_AREAS, SEED_BADGES, TEMPLATE_NAME } from "./seed-content";

/** Creates the six badge rows if they are not already present. */
export async function ensureBadges(prisma: PrismaClient) {
  await prisma.badge.createMany({ data: SEED_BADGES, skipDuplicates: true });
  return prisma.badge.findMany();
}

/**
 * Returns the existing template, or builds it. Never duplicates: v1 has exactly
 * one template and no UI to create more.
 */
export async function ensureTemplate(
  prisma: PrismaClient,
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.globalTemplate.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const template = await prisma.globalTemplate.create({
    data: { name: TEMPLATE_NAME },
  });
  await buildTemplateContent(prisma, template.id);
  return { id: template.id, created: true };
}

/** Writes every area, unit, word and activity of the template. */
export async function buildTemplateContent(
  prisma: PrismaClient,
  templateId: string,
) {
  for (const [areaIndex, area] of SEED_AREAS.entries()) {
    const createdArea = await prisma.area.create({
      data: {
        scope: "GLOBAL",
        templateId,
        name: area.name,
        nameEs: area.nameEs,
        description: area.description,
        iconKey: area.iconKey,
        tint: area.tint,
        sortOrder: areaIndex,
        isVisible: true,
      },
    });

    for (const [unitIndex, unit] of area.units.entries()) {
      const createdUnit = await prisma.unit.create({
        data: {
          areaId: createdArea.id,
          name: unit.name,
          subtitle: unit.subtitle,
          subtitleEn: unit.subtitleEn,
          sortOrder: unitIndex,
          isVisible: true,
          difficulty: unit.difficulty,
          wordCount: unit.words.length,
          introParagraph: unit.introParagraph,
          introParagraphEs: unit.introParagraphEs,
        },
      });

      const wordIds = new Map<string, string>();
      for (const [wordIndex, word] of unit.words.entries()) {
        const created = await prisma.word.create({
          data: { ...word, unitId: createdUnit.id, sortOrder: wordIndex },
        });
        wordIds.set(word.text.toLowerCase(), created.id);
      }

      for (const [activityIndex, activity] of unit.activities.entries()) {
        const wordId = wordIds.get(activity.word.toLowerCase());
        if (!wordId) {
          throw new Error(
            `Activity in "${unit.name}" references unknown word "${activity.word}"`,
          );
        }
        await prisma.activity.create({
          data: {
            unitId: createdUnit.id,
            wordId,
            type: activity.type,
            prompt: activity.prompt,
            promptEs: activity.promptEs,
            sentence: activity.sentence ?? null,
            options: activity.options ?? [],
            answerIndex: activity.answerIndex ?? 0,
            note: activity.note,
            noteEs: activity.noteEs,
            mono: activity.mono ?? false,
            sortOrder: activityIndex,
          },
        });
      }
    }
  }
}
