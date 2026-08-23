/**
 * Copies generated content from one database into another.
 *
 *   TARGET_DATABASE_URL="<prod pooled>" npm run promote -- --org camil --dry
 *   TARGET_DATABASE_URL="<prod pooled>" npm run promote -- --org camil
 *
 * Reads from DATABASE_URL and writes to TARGET_DATABASE_URL. Makes no model
 * calls at all.
 *
 * Why this exists: running the seeder twice, once locally and once against
 * production, generates the content twice. That costs double, but the real
 * problem is that the two results are different text — same words and units,
 * but the model was asked again, so the definitions, sentences and match-up
 * pairs differ. Reviewing the local copy then said nothing about what learners
 * would actually see. Generate once, review that, copy exactly it.
 *
 * Only ever creates. A unit that already exists in the target is left alone,
 * because replacing it would overwrite content learners may already have
 * progress against — that is what `seed:page --update` is for, deliberately,
 * on a unit you have decided to rebuild.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const ORG = arg("org", "camil")!;
const DRY = process.argv.includes("--dry");
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!TARGET_URL) {
  console.error("Set TARGET_DATABASE_URL to the database to copy into.");
  process.exit(1);
}
if (TARGET_URL === process.env.DATABASE_URL) {
  console.error("TARGET_DATABASE_URL is the same as DATABASE_URL — nothing to do.");
  process.exit(1);
}

const source = new PrismaClient();
const target = new PrismaClient({ datasourceUrl: TARGET_URL });

async function main() {
  const org = await source.organization.findFirst({ where: { slug: ORG } });
  if (!org) {
    console.error(`No organization "${ORG}" in the source database.`);
    process.exitCode = 1;
    return;
  }

  const areas = await source.area.findMany({
    where: { orgId: org.id },
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

  console.log(`source: ${org.name} — ${areas.length} areas, ${areas.reduce((n, a) => n + a.units.length, 0)} units`);
  console.log(`target: ${TARGET_URL!.replace(/\/\/[^@]*@/, "//***@")}\n`);

  let created = 0;
  let skipped = 0;
  let areasMade = 0;

  const targetOrg =
    (await target.organization.findFirst({ where: { slug: org.slug } })) ??
    (DRY
      ? null
      : await target.organization.create({ data: { name: org.name, slug: org.slug } }));
  if (!targetOrg && !DRY) throw new Error("could not resolve the target organization");
  if (!targetOrg) console.log(`+ would create organization ${org.name}`);

  for (const area of areas) {
    let targetArea = targetOrg
      ? await target.area.findFirst({
          where: { scope: "ORG", orgId: targetOrg.id, name: area.name },
        })
      : null;

    if (!targetArea) {
      if (DRY || !targetOrg) {
        console.log(`+ would create area ${area.name} (${area.units.length} units)`);
      } else {
        targetArea = await target.area.create({
          data: {
            scope: "ORG",
            orgId: targetOrg.id,
            name: area.name,
            nameEs: area.nameEs,
            description: area.description,
            iconKey: area.iconKey,
            tint: area.tint,
            sortOrder: area.sortOrder,
            isVisible: area.isVisible,
          },
        });
        areasMade++;
        console.log(`✔ area ${area.name}`);
      }
    } else {
      console.log(`• area ${area.name} already there`);
    }

    for (const unit of area.units) {
      const existing = targetArea
        ? await target.unit.findFirst({
            where: { areaId: targetArea.id, name: unit.name },
            select: { id: true },
          })
        : null;
      if (existing) {
        skipped++;
        continue;
      }
      if (DRY || !targetArea) {
        console.log(`  + would copy ${unit.name} (${unit.words.length} words, ${unit.activities.length} activities)`);
        created++;
        continue;
      }

      await target.$transaction(async (tx) => {
        const madeUnit = await tx.unit.create({
          data: {
            areaId: targetArea!.id,
            name: unit.name,
            subtitle: unit.subtitle,
            subtitleEn: unit.subtitleEn,
            sortOrder: unit.sortOrder,
            isVisible: unit.isVisible,
            difficulty: unit.difficulty,
            wordCount: unit.wordCount,
            introParagraph: unit.introParagraph,
            introParagraphEs: unit.introParagraphEs,
            contentVersion: unit.contentVersion,
            generationInput: unit.generationInput ?? undefined,
            generatedAt: unit.generatedAt,
            editedAfterGen: unit.editedAfterGen,
          },
        });

        // Activities point at words by id, so the copies need their own map.
        const wordIds = new Map<string, string>();
        for (const w of unit.words) {
          const row = await tx.word.create({
            data: {
              unitId: madeUnit.id,
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
              sortOrder: w.sortOrder,
            },
          });
          wordIds.set(w.id, row.id);
        }

        for (const a of unit.activities) {
          const wordId = wordIds.get(a.wordId);
          if (!wordId) throw new Error(`activity in "${unit.name}" points at a word not in the unit`);
          await tx.activity.create({
            data: {
              unitId: madeUnit.id,
              wordId,
              type: a.type,
              prompt: a.prompt,
              promptEs: a.promptEs,
              sentence: a.sentence,
              options: a.options ?? undefined,
              answerIndex: a.answerIndex,
              note: a.note,
              noteEs: a.noteEs,
              mono: a.mono,
              // A group id only has to be consistent within the unit, and the
              // rows are written together, so carrying it across is enough.
              matchGroup: a.matchGroup,
              sortOrder: a.sortOrder,
            },
          });
        }
      });

      created++;
      console.log(`  ✔ ${unit.name} (${unit.words.length} words, ${unit.activities.length} activities)`);
    }
  }

  console.log(
    `\n${DRY ? "--dry: " : ""}${areasMade} area(s) created, ${created} unit(s) ${DRY ? "would be " : ""}copied, ${skipped} already there.`,
  );
  if (DRY) console.log("Nothing was written.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
