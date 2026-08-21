/**
 * AI unit generation. Runs server-side only — the OpenAI key must never reach
 * the client (PRD non-functional requirement).
 *
 * The model is asked for a strict JSON schema and the result is validated with
 * zod before it is shown to an administrator, so a malformed or short response
 * surfaces as a retryable error rather than a half-built unit.
 */
import "server-only";
import OpenAI from "openai";
import {
  MAX_WORDS,
  MIN_WORDS,
  UNIT_JSON_SCHEMA,
  UnitSchema,
  type GeneratedUnit,
} from "@/lib/unit-schema";
import type { Difficulty } from "@/generated/prisma";

export { MAX_WORDS, MIN_WORDS };
export type { GeneratedActivity, GeneratedUnit } from "@/lib/unit-schema";

const TIMEOUT_MS = 90_000;

export const DIFFICULTY_BRIEF: Record<Difficulty, string> = {
  VERY_EASY:
    "CEFR A1. Very short simple sentences, present tense only, 60-90 words total.",
  EASY: "CEFR A2. Simple sentences, common connectors, 90-130 words total.",
  MEDIUM:
    "CEFR B1. Varied sentence length, some subordinate clauses, 130-180 words total.",
  HARD: "CEFR B2-C1. Rich syntax, idiomatic phrasing, 180-230 words total.",
};

export type GenerationInput = {
  wordCount: number;
  difficulty: Difficulty;
  topic?: string;
  wordList?: string[];
  areaName: string;
  existingWords?: string[];
};

export class GenerationError extends Error {
  constructor(
    public code:
      | "not_configured"
      | "timeout"
      | "invalid_response"
      | "api_error"
      | "empty",
    message: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

function prompt(input: GenerationInput): string {
  const lines: string[] = [
    `You are building one vocabulary unit for a Spanish-speaking learner of English, inside the vocabulary area "${input.areaName}".`,
    ``,
    `Target number of vocabulary words: ${input.wordCount}. This is the highest-priority constraint.`,
    `Introductory paragraph difficulty: ${input.difficulty} — ${DIFFICULTY_BRIEF[input.difficulty]}`,
  ];

  if (input.wordList?.length) {
    lines.push(
      ``,
      `Use these words, and treat them as mandatory:`,
      input.wordList.map((w) => `- ${w}`).join("\n"),
      input.wordList.length < input.wordCount
        ? `Add relevant words of your own until the unit has ${input.wordCount} words.`
        : `The supplied list takes priority over the target count: include all ${input.wordList.length} of them.`,
    );
  } else {
    lines.push(``, `Topic: ${input.topic}`, `Choose vocabulary that a learner actually needs for this topic.`);
  }

  if (input.existingWords?.length) {
    lines.push(
      ``,
      `Do NOT reuse any of these words, which already exist elsewhere in this area:`,
      input.existingWords.join(", "),
    );
  }

  lines.push(
    ``,
    `Rules:`,
    `- No duplicate words. Every word must be distinct in lemma, not just in spelling.`,
    `- "ipa" is American English IPA between slashes, e.g. /ˈaɪ.braʊ/.`,
    `- "syllables" marks the stressed syllable in caps and separates with a middle dot, e.g. EYE·brow. Single-syllable words are just the word.`,
    `- "stress" is the stressed syllable on its own, lowercase.`,
    `- "pos" is the part of speech in Spanish (sustantivo, verbo, adjetivo, adverbio).`,
    `- "definition" is English, "definitionEs" is Spanish; both must define the word as used in this unit's context.`,
    `- "subtitle" is a short Spanish subtitle like "6 palabras · la cabeza"; "subtitleEs" is its English twin like "6 words · the head".`,
    `- introParagraph is English and must use as many of the unit's words as reads naturally; introParagraphEs is a faithful Spanish rendering of it.`,
    ``,
    `Activities — generate exactly three kinds, in this proportion:`,
    `- FILL_BLANK: "sentence" contains ______ where the word belongs, quoted with curly quotes. "options" holds 4 candidate words, one correct. Set answerIndex to the correct index.`,
    `- IPA_MATCH: "options" holds 4 IPA transcriptions (or 4 words when the prompt gives the IPA), one correct.`,
    `- TYPE_WHAT_YOU_HEAR: the learner spells the word from audio. "options" must be an empty array, answerIndex 0, "sentence" null.`,
    `Produce about ${Math.max(4, Math.min(10, input.wordCount))} activities covering as many distinct words as possible, at least one of each kind.`,
    `- "prompt" is English instruction text, "promptEs" its Spanish twin. "note"/"noteEs" explain the answer in one sentence after the learner answers.`,
  );
  return lines.join("\n");
}

export async function generateUnit(
  input: GenerationInput,
  model: string,
): Promise<GeneratedUnit> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new GenerationError(
      "not_configured",
      "OPENAI_API_KEY is not set on the server.",
    );
  }
  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });

  let raw: string | null | undefined;
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You generate structured vocabulary-learning content. Reply only with data that satisfies the schema.",
        },
        { role: "user", content: prompt(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "vocabulary_unit",
          strict: true,
          schema: UNIT_JSON_SCHEMA,
        },
      },
    });
    raw = response.choices[0]?.message?.content;
  } catch (error) {
    const err = error as { status?: number; name?: string; message?: string };
    if (err.name === "APIConnectionTimeoutError" || err.status === 408) {
      throw new GenerationError("timeout", "The model took too long to answer.");
    }
    throw new GenerationError("api_error", err.message ?? "OpenAI request failed.");
  }

  if (!raw) throw new GenerationError("empty", "The model returned nothing.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GenerationError("invalid_response", "The model returned invalid JSON.");
  }

  const result = UnitSchema.safeParse(parsed);
  if (!result.success) {
    throw new GenerationError(
      "invalid_response",
      `The model's answer did not match the schema: ${result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}
