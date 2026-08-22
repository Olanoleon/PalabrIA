/**
 * Builds one area from an institution's vocabulary page.
 *
 *   npm run seed:page -- --all --dry        # every page, nothing written
 *   npm run seed:page -- --all               # every page, in curriculum order
 *   npm run seed:page -- --page content/vocab-pages/page-03-family.json
 *
 * The page file carries the vocabulary a real curriculum already teaches; the
 * model supplies everything around it — IPA, definitions, examples, activities
 * and the match-up. The words are passed as a mandatory list, so validation
 * blocks the save if the model quietly drops one.
 *
 * Distinct from `seed:areas`, which generates a curriculum from topics alone.
 * Here the vocabulary is the input and is not the model's to choose.
 *
 * Creates the organization and the area if they do not exist, and skips any
 * unit already generated, so an interrupted run resumes rather than
 * duplicating — and so `--all` can be re-run after adding a page without
 * paying for the ones already built.
 *
 * Pages are processed in filename order, which is why they are numbered: an
 * area's position in the learner's path is its creation order.
 *
 * Writes to whatever DATABASE_URL/DIRECT_URL point at. Prisma reads
 * `directUrl`, not `url`, so changing only DATABASE_URL leaves this pointed
 * somewhere you did not intend — change both.
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../src/generated/prisma";
import { generateUnit, GenerationError } from "../src/lib/openai";
import { persistGeneratedUnit } from "../src/lib/unit-persist";
import { validateGeneratedUnit } from "../src/lib/unit-validate";
import { trimToBudget } from "../src/lib/unit-trim";
import type { Difficulty } from "../src/generated/prisma";

const prisma = new PrismaClient();

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const PAGE = arg("page");
const ALL = process.argv.includes("--all");
const DRY = process.argv.includes("--dry");
const MODEL = arg("model");
const PAGES_DIR = "content/vocab-pages";

type Page = {
  source: string;
  org: { name: string; slug: string };
  area: {
    name: string;
    nameEs: string;
    description: string;
    iconKey: string;
    tint: string;
    difficulty: Difficulty;
    visible: boolean;
  };
  units: Array<{
    name: string;
    topic: string;
    words: string[];
    /**
     * Overrides the area's difficulty for this unit alone, so a course can
     * ramp: the vocabulary stays as useful, the intro paragraph gets harder.
     */
    difficulty?: Difficulty;
  }>;
};

if (!PAGE && !ALL) {
  console.error(`Pass --page <file.json>, or --all for everything in ${PAGES_DIR}.`);
  process.exit(1);
}

const files = PAGE
  ? [PAGE]
  : readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => join(PAGES_DIR, f));

if (!files.length) {
  console.error(`No page files in ${PAGES_DIR}.`);
  process.exit(1);
}

async function seedPage(page: Page) {
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  const model = MODEL ?? settings?.openaiModel ?? "gpt-5.6-luna";
  const totalWords = page.units.reduce((n, u) => n + u.words.length, 0);

  console.log(`source: ${page.source}`);
  console.log(`org:    ${page.org.name} (${page.org.slug})`);
  console.log(`area:   ${page.area.name} · ${page.area.difficulty} · ${page.area.visible ? "visible" : "hidden"}`);
  console.log(`model:  ${model}`);
  console.log(`plan:   ${page.units.length} units, ${totalWords} words\n`);
  for (const [i, unit] of page.units.entries()) {
    const level = unit.difficulty ?? page.area.difficulty;
    console.log(`  ${String(i + 1).padStart(2)}. ${unit.name}  [${level}]`);
    console.log(`      ${String(unit.words.length).padStart(2)} words  ${unit.words.join(", ")}`);
  }

  const duplicates = page.units
    .flatMap((u) => u.words.map((w) => w.trim().toLowerCase()))
    .filter((w, i, all) => all.indexOf(w) !== i);
  if (duplicates.length) {
    console.error(`\n✘ the same word appears in more than one unit: ${[...new Set(duplicates)].join(", ")}`);
    process.exit(1);
  }

  if (DRY) {
    console.log("\n--dry: nothing written, no model calls made.");
    return;
  }
  console.log("");

  const org =
    (await prisma.organization.findFirst({ where: { slug: page.org.slug } })) ??
    (await prisma.organization.create({
      data: { name: page.org.name, slug: page.org.slug },
    }));
  console.log(`organization: ${org.name}`);

  let area = await prisma.area.findFirst({
    where: { scope: "ORG", orgId: org.id, name: page.area.name },
  });
  if (!area) {
    const sortOrder = await prisma.area.count({ where: { orgId: org.id } });
    area = await prisma.area.create({
      data: {
        scope: "ORG",
        orgId: org.id,
        name: page.area.name,
        nameEs: page.area.nameEs,
        description: page.area.description,
        iconKey: page.area.iconKey,
        tint: page.area.tint,
        sortOrder,
        isVisible: page.area.visible,
      },
    });
    console.log(`✔ area created: ${area.name}\n`);
  } else {
    console.log(`• area already there: ${area.name}\n`);
  }

  let made = 0;
  let skipped = 0;
  let failed = 0;
  const started = Date.now();

  for (const [index, spec] of page.units.entries()) {
    const label = `${String(index + 1).padStart(2)}/${page.units.length}`;

    // Resume rather than duplicate: a unit is identified by the topic it was
    // generated from, which is recorded on the row.
    const existing = await prisma.unit.findFirst({
      where: {
        areaId: area.id,
        generationInput: { path: ["topic"], equals: spec.topic },
      },
      select: { id: true, name: true },
    });
    if (existing) {
      console.log(`• ${label} already there: ${existing.name}`);
      skipped++;
      continue;
    }

    const difficulty = spec.difficulty ?? page.area.difficulty;
    const input = {
      wordCount: spec.words.length,
      difficulty,
      topic: spec.topic,
      wordList: spec.words,
      areaName: page.area.name,
    };

    // One retry: a generation can miss the coverage or item rules by chance,
    // and a second attempt is far cheaper than a failed run.
    let saved = false;
    for (let attempt = 1; attempt <= 2 && !saved; attempt++) {
      const at = Date.now();
      try {
        const draft = await generateUnit(input, model);
        // The curriculum names its own units. Left to itself the model titles
        // every unit after the area, so the area screen reads as eight copies
        // of the same heading.
        draft.title = spec.name;

        // A large unit tempts the model over the item budget. Trim the surplus
        // instead of throwing away a draft that is otherwise good.
        const { unit: fitted, dropped } = trimToBudget(draft);
        for (const word of dropped) {
          console.log(`      trim   dropped a spare activity for "${word}" to fit the session`);
        }

        const issues = validateGeneratedUnit(fitted, {
          wordCount: input.wordCount,
          wordList: input.wordList,
        });

        const written = await persistGeneratedUnit(area.id, fitted, {
          difficulty,
          visible: page.area.visible,
          generationInput: input,
          edited: false,
        });
        if ("error" in written) {
          console.log(`  ✘ ${label} attempt ${attempt} rejected: ${written.error}`);
          continue;
        }

        saved = true;
        made++;
        const match = fitted.activities.find((a) => a.type === "MATCH_UP");
        console.log(
          `✔ ${label} ${fitted.title} — ${fitted.words.length} words, ${fitted.activities.length} activities, ${((Date.now() - at) / 1000).toFixed(0)}s`,
        );
        for (const pair of match?.pairs ?? []) {
          console.log(`      match  ${pair.en} → ${pair.es}`);
        }
        for (const issue of issues.filter((i) => i.level === "warning")) {
          console.log(`      warn   ${issue.message}`);
        }
      } catch (error) {
        if (error instanceof GenerationError) {
          console.log(`  ✘ ${label} attempt ${attempt} ${error.code}: ${error.message}`);
          continue;
        }
        throw error;
      }
    }
    if (!saved) failed++;
  }

  // Renumber to the plan's order.
  //
  // `persistGeneratedUnit` appends — it takes sortOrder from the current unit
  // count — so a unit regenerated after being deleted from the middle lands at
  // the end and collides with whatever already holds that number. Unit order
  // is the unlock chain, so a tie there is a learner stuck behind the wrong
  // unit. Rewriting the whole area from the plan is cheap and self-healing.
  const rows = await prisma.unit.findMany({
    where: { areaId: area.id },
    select: { id: true, name: true, sortOrder: true },
  });
  const planOrder = new Map(page.units.map((u, i) => [u.name, i]));
  const ordered = [...rows].sort(
    (a, b) =>
      (planOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
        (planOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER) ||
      a.sortOrder - b.sortOrder,
  );
  let moved = 0;
  for (const [index, row] of ordered.entries()) {
    if (row.sortOrder === index) continue;
    await prisma.unit.update({ where: { id: row.id }, data: { sortOrder: index } });
    moved++;
  }
  if (moved) console.log(`↻ renumbered ${moved} unit(s) into the plan's order`);

  console.log(
    `\n${made} unit(s) generated, ${skipped} skipped, ${failed} failed, in ${((Date.now() - started) / 1000 / 60).toFixed(1)} min.`,
  );
  return { made, skipped, failed };
}

async function main() {
  const totals = { made: 0, skipped: 0, failed: 0 };
  for (const [i, file] of files.entries()) {
    if (files.length > 1) {
      console.log(`\n${"─".repeat(72)}\npage ${i + 1}/${files.length}: ${file}\n`);
    }
    const page: Page = JSON.parse(readFileSync(file, "utf8"));
    const result = await seedPage(page);
    if (result) {
      totals.made += result.made;
      totals.skipped += result.skipped;
      totals.failed += result.failed;
    }
  }
  if (files.length > 1 && !DRY) {
    console.log(
      `\n${"═".repeat(72)}\nall pages: ${totals.made} generated, ${totals.skipped} skipped, ${totals.failed} failed.`,
    );
  }
  if (totals.failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
