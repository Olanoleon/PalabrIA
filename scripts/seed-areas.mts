/**
 * Builds a curriculum for one organization using the platform's own AI
 * generation — the same call, validator and writer the console uses.
 *
 *   npm run seed:areas -- --org leo-s-friends
 *   npm run seed:areas -- --org leo-s-friends --dry     # cost/plan only
 *
 * Skips anything that already exists, so it is safe to re-run: an interrupted
 * run resumes rather than duplicating.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { generateUnit, GenerationError } from "../src/lib/openai";
import { persistGeneratedUnit } from "../src/lib/unit-persist";
import type { Difficulty } from "../src/generated/prisma";

const prisma = new PrismaClient();

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const ORG_SLUG = arg("org", "leo-s-friends")!;
const DRY = process.argv.includes("--dry");
const MODEL = arg("model");

type UnitSpec = { topic: string; words: number };
type AreaSpec = {
  name: string;
  nameEs: string;
  description: string;
  iconKey: string;
  tint: string;
  difficulty: Difficulty;
  units: UnitSpec[];
};

/**
 * Everyday ground, ordered so a learner meets the concrete before the abstract.
 * Difficulty is per area: the paragraph is what changes, not the vocabulary's
 * usefulness.
 */
const PLAN: AreaSpec[] = [
  {
    name: "Animals",
    nameEs: "Los animales",
    description:
      "Los animales que ves todos los días y los que solo ves en fotos: mascotas, granja y vida salvaje.",
    iconKey: "sparkle",
    tint: "#E3F0E8",
    difficulty: "VERY_EASY",
    units: [
      { topic: "Common pets and the animals you see in a house or street", words: 6 },
      { topic: "Farm animals and the sounds and work associated with them", words: 6 },
    ],
  },
  {
    name: "The Home",
    nameEs: "La casa",
    description:
      "Las habitaciones de una casa y los objetos que usas en cada una, de la cocina al dormitorio.",
    iconKey: "sparkle",
    tint: "#FFEDD5",
    difficulty: "VERY_EASY",
    units: [
      { topic: "The rooms of a house and what each one is for", words: 6 },
      { topic: "Everyday furniture and household objects", words: 6 },
    ],
  },
  {
    name: "Travel",
    nameEs: "Viajes",
    description:
      "Moverte por el mundo: el aeropuerto, el transporte de la ciudad y lo que necesitas para llegar.",
    iconKey: "sparkle",
    tint: "#EAF0FB",
    difficulty: "EASY",
    units: [
      { topic: "At the airport: checking in, boarding and luggage", words: 7 },
      { topic: "Getting around a city: public transport and directions", words: 7 },
    ],
  },
  {
    name: "Work & Office",
    nameEs: "Trabajo y oficina",
    description:
      "El vocabulario de la vida laboral: la oficina, las reuniones y los roles de un equipo.",
    iconKey: "sparkle",
    tint: "#FBF3DE",
    difficulty: "EASY",
    units: [
      { topic: "Things and places in an office, and the tools people use", words: 7 },
      { topic: "Jobs, roles and what people do in a team", words: 7 },
    ],
  },
  {
    name: "Health & Wellbeing",
    nameEs: "Salud y bienestar",
    description:
      "Hablar de cómo te sientes: síntomas, la consulta médica y los hábitos que te cuidan.",
    iconKey: "sparkle",
    tint: "#E9F3F7",
    difficulty: "MEDIUM",
    units: [
      { topic: "At the doctor: describing symptoms and understanding advice", words: 8 },
      { topic: "Habits, rest and looking after your wellbeing", words: 8 },
    ],
  },
];

async function main() {
  const org = await prisma.organization.findFirstOrThrow({
    where: { slug: ORG_SLUG },
  });
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  const model = MODEL ?? settings?.openaiModel ?? "gpt-5.6-luna";

  const totalUnits = PLAN.reduce((n, a) => n + a.units.length, 0);
  console.log(`organization: ${org.name}`);
  console.log(`model: ${model}`);
  console.log(`plan: ${PLAN.length} areas, ${totalUnits} units\n`);
  for (const area of PLAN) {
    console.log(`  ${area.name.padEnd(20)} ${area.difficulty.padEnd(10)} ${area.units.length} units`);
  }
  if (DRY) {
    console.log("\n--dry: nothing written, no model calls made.");
    return;
  }
  console.log("");

  let made = 0;
  let skipped = 0;
  const started = Date.now();

  for (const [areaIndex, spec] of PLAN.entries()) {
    let area = await prisma.area.findFirst({
      where: { scope: "ORG", orgId: org.id, name: spec.name },
    });

    if (!area) {
      const sortOrder = await prisma.area.count({ where: { orgId: org.id } });
      area = await prisma.area.create({
        data: {
          scope: "ORG",
          orgId: org.id,
          name: spec.name,
          nameEs: spec.nameEs,
          description: spec.description,
          iconKey: spec.iconKey,
          tint: spec.tint,
          sortOrder,
          isVisible: true,
        },
      });
      console.log(`✔ area ${areaIndex + 1}/${PLAN.length}: ${spec.name}`);
    } else {
      console.log(`• area ${areaIndex + 1}/${PLAN.length}: ${spec.name} (already there)`);
    }

    const existingWords = (
      await prisma.word.findMany({
        where: { unit: { area: { orgId: org.id } } },
        select: { text: true },
      })
    ).map((w) => w.text);

    for (const unit of spec.units) {
      const already = await prisma.unit.count({ where: { areaId: area.id } });
      if (already >= spec.units.length) {
        skipped++;
        continue;
      }

      const input = {
        wordCount: unit.words,
        difficulty: spec.difficulty,
        topic: unit.topic,
        areaName: spec.name,
        existingWords,
      };

      try {
        const at = Date.now();
        const draft = await generateUnit(input, model);
        const saved = await persistGeneratedUnit(area.id, draft, {
          difficulty: spec.difficulty,
          visible: true,
          generationInput: { ...input, existingWords: undefined },
          edited: false,
        });
        if ("error" in saved) {
          console.log(`  ✘ ${unit.topic.slice(0, 44)} → rejected: ${saved.error}`);
          continue;
        }
        made++;
        console.log(
          `  ✔ ${draft.title} (${draft.words.length} words, ${draft.activities.length} activities, ${((Date.now() - at) / 1000).toFixed(0)}s)`,
        );
      } catch (error) {
        if (error instanceof GenerationError) {
          console.log(`  ✘ ${unit.topic.slice(0, 44)} → ${error.code}: ${error.message}`);
          continue;
        }
        throw error;
      }
    }
  }

  console.log(
    `\n${made} unit(s) generated, ${skipped} skipped, in ${((Date.now() - started) / 1000 / 60).toFixed(1)} min.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
