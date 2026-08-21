/**
 * Exercises AI unit generation against the real OpenAI API, without the UI.
 *
 *   npm run try:generate                        # topic-based, 6 words
 *   npm run try:generate -- --words 8 --difficulty HARD --topic "Job interviews"
 *   npm run try:generate -- --list "boil,fry,chop,stir,slice,season"
 *
 * Reads OPENAI_API_KEY from .env. Prints the generated unit and then runs the
 * same validator the admin console uses, so a schema-valid but pedagogically
 * poor result is still visible as warnings. Writes nothing to the database.
 */
import "dotenv/config";
import { generateUnit, GenerationError } from "../src/lib/openai";
import { validateGeneratedUnit, hasBlockingIssue } from "../src/lib/unit-validate";
import type { Difficulty } from "../src/generated/prisma";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const wordCount = Number(arg("words", "6"));
const difficulty = (arg("difficulty", "EASY") as Difficulty) ?? "EASY";
const list = arg("list");
const topic = arg("topic", list ? undefined : "Everyday kitchen tools");
const model = arg("model", process.env.OPENAI_MODEL ?? "gpt-5")!;
const areaName = arg("area", "Food & Cooking")!;

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set. Add it to .env and try again.");
  process.exit(1);
}

console.log(
  `generating: ${wordCount} words · ${difficulty} · ${list ? `list "${list}"` : `topic "${topic}"`} · model ${model}\n`,
);

const started = Date.now();
try {
  const unit = await generateUnit(
    {
      wordCount,
      difficulty,
      topic,
      wordList: list ? list.split(",").map((w) => w.trim()) : undefined,
      areaName,
    },
    model,
  );
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`✔ "${unit.title}" — ${unit.subtitle}  (${elapsed}s)\n`);
  console.log(`${unit.introParagraph}\n`);
  console.log(`ES: ${unit.introParagraphEs}\n`);

  console.log(`words (${unit.words.length}):`);
  for (const w of unit.words) {
    console.log(`  ${w.text.padEnd(14)} ${w.ipa.padEnd(18)} ${w.syllables.padEnd(14)} ${w.translation}`);
    console.log(`  ${" ".repeat(14)} ${w.definitionEs}`);
    console.log(`  ${" ".repeat(14)} "${w.exampleSentence}"`);
  }

  console.log(`\nactivities (${unit.activities.length}):`);
  for (const a of unit.activities) {
    const answer = a.options.length ? ` → ${a.options[a.answerIndex]}` : "";
    console.log(`  ${a.type.padEnd(20)} ${a.word.padEnd(14)}${answer}`);
    if (a.sentence) console.log(`  ${" ".repeat(20)} ${a.sentence}`);
  }

  const issues = validateGeneratedUnit(unit, {
    wordCount,
    wordList: list ? list.split(",").map((w) => w.trim()) : undefined,
  });
  console.log(`\nvalidation: ${issues.length === 0 ? "no issues" : `${issues.length} issue(s)`}`);
  for (const issue of issues) {
    console.log(`  [${issue.level}] ${issue.message}`);
  }
  console.log(
    hasBlockingIssue(issues)
      ? "\n✘ would be BLOCKED from saving in the console"
      : "\n✔ would be saveable from the console",
  );
} catch (error) {
  if (error instanceof GenerationError) {
    console.error(`✘ ${error.code}: ${error.message}`);
    process.exit(1);
  }
  throw error;
}
