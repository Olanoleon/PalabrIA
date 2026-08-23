/**
 * Read-only report on the content of one organization.
 *
 *   npm run audit -- --org camil
 *   DATABASE_URL="..." DIRECT_URL="..." npm run audit -- --org camil
 *
 * Answers the question you actually have after seeding: did every unit arrive,
 * is every word practised, and is anything outside the rules the app enforces.
 *
 * Reads and prints. It writes nothing, so it is safe to point at production —
 * unlike db:seed, db:reset and the verify:* suites, which are not.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { lettersOnly, wordCountOf } from "../src/lib/answer";
import { MAX_ITEMS, MIN_COVERAGE } from "../src/lib/unit-schema";

const prisma = new PrismaClient();
const i = process.argv.indexOf("--org");
const ORG = i >= 0 ? process.argv[i + 1] : "camil";

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: ORG } });
  if (!org) {
    console.error(`No organization with slug "${ORG}".`);
    process.exitCode = 1;
    return;
  }

  const areas = await prisma.area.findMany({
    where: { orgId: org.id },
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { sortOrder: "asc" },
        include: { words: true, activities: { include: { word: true } } },
      },
    },
  });

  let units = 0;
  let words = 0;
  const problems: string[] = [];

  // Area order is the order the learner meets the areas in, and `promote`
  // carries sortOrder across from another database, so a tie is possible.
  const areaPositions = new Map<number, string[]>();
  for (const area of areas) {
    areaPositions.set(area.sortOrder, [
      ...(areaPositions.get(area.sortOrder) ?? []),
      area.name,
    ]);
  }
  for (const [position, names] of areaPositions) {
    if (names.length > 1) {
      problems.push(`areas share position ${position}: ${names.join(", ")}`);
    }
  }

  for (const area of areas) {
    const areaWords = area.units.reduce((n, u) => n + u.words.length, 0);
    console.log(
      `\n[${String(area.sortOrder).padStart(2)}] ${area.name}  —  ${area.units.length} units, ${areaWords} words, ${area.isVisible ? "visible" : "hidden"}`,
    );
    const positions = new Set<number>();

    for (const u of area.units) {
      units++;
      words += u.words.length;

      if (positions.has(u.sortOrder)) {
        problems.push(`${area.name} / ${u.name}: duplicate position ${u.sortOrder}`);
      }
      positions.add(u.sortOrder);

      const covered = new Set(u.activities.map((a) => a.word.text.toLowerCase()));
      const missing = u.words
        .filter((w) => !covered.has(w.text.toLowerCase()))
        .map((w) => w.text);
      const pct = u.words.length ? covered.size / u.words.length : 0;
      const items = u.activities.length;

      if (!u.activities.length) problems.push(`${area.name} / ${u.name}: no activities`);
      if (items > MAX_ITEMS) problems.push(`${area.name} / ${u.name}: ${items} items over the ${MAX_ITEMS} cap`);
      if (pct < MIN_COVERAGE) problems.push(`${area.name} / ${u.name}: ${Math.round(pct * 100)}% coverage`);
      if (!u.activities.some((a) => a.type === "MATCH_UP")) {
        problems.push(`${area.name} / ${u.name}: no match-up`);
      }

      for (const a of u.activities.filter((x) => x.type === "TYPE_WHAT_YOU_HEAR")) {
        if (lettersOnly(a.word.text).length > 14) {
          problems.push(`${area.name} / ${u.name}: dictation on "${a.word.text}" is too long`);
        }
        if (wordCountOf(a.word.text) > 2) {
          problems.push(`${area.name} / ${u.name}: dictation on "${a.word.text}" has too many parts`);
        }
      }

      console.log(
        `   ${String(u.sortOrder).padStart(2)}  ${u.name.padEnd(38)} ${u.difficulty.padEnd(10)} ${String(covered.size).padStart(2)}/${String(u.words.length).padEnd(2)} (${String(Math.round(pct * 100)).padStart(3)}%) · ${String(items).padStart(2)} items` +
          (missing.length ? `  · not practised: ${missing.join(", ")}` : ""),
      );
    }
  }

  const levels = await prisma.unit.groupBy({
    by: ["difficulty"],
    where: { area: { orgId: org.id } },
    _count: true,
  });

  console.log(
    `\n${org.name}: ${areas.length} areas · ${units} units · ${words} words`,
  );
  console.log(
    `difficulty: ${levels.map((l) => `${l.difficulty}=${l._count}`).join(", ") || "none"}`,
  );

  if (problems.length) {
    console.log(`\n✘ ${problems.length} problem(s):`);
    for (const p of problems) console.log(`   ${p}`);
    process.exitCode = 1;
  } else {
    console.log("✔ every unit within the rules");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
