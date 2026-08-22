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
  MATCH_PAIRS,
  MAX_ITEMS,
  MAX_WORDS,
  MIN_WORDS,
  UNIT_JSON_SCHEMA,
  UnitSchema,
  type GeneratedUnit,
} from "@/lib/unit-schema";
import type { Difficulty } from "@/generated/prisma";

export { MAX_WORDS, MIN_WORDS };
export type { GeneratedActivity, GeneratedUnit } from "@/lib/unit-schema";

const TIMEOUT_MS = 150_000;

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
    `- "ipa" is American English IPA between slashes, e.g. /ˈaɪ.braʊ/. Use American conventions consistently: ɚ rather than ər, and no length marks (ː).`,
    `- "syllables" splits the word's ORDINARY SPELLING, not its pronunciation, marking the stressed syllable in caps and separating with a middle dot: EYE·brow, SEA·son, MAR·i·nate. Never write phonetic symbols here. Single-syllable words are just the word, in lower case. For a two-word entry, split each word and keep the space between them: DIN·ing room, LIV·ing room.`,
    `- "stress" is the stressed syllable on its own, lowercase.`,
    `- "pos" is the part of speech in Spanish (sustantivo, verbo, adjetivo, adverbio).`,
    `- "definition" is English, "definitionEs" is Spanish; both must define the word as used in this unit's context.`,
    `- "title" names THIS unit, not the area: "Grandparents and grandchildren", never "${input.areaName}". A learner scrolling the area sees these one under the other, so two units must never share a title.`,
    `- "subtitle" is a short Spanish subtitle like "6 palabras · la cabeza"; "subtitleEs" is its English twin like "6 words · the head". The part after the dot names what THIS unit covers, not the area as a whole.`,
    `- introParagraph is English and must use as many of the unit's words as reads naturally; introParagraphEs is a faithful Spanish rendering of it.`,
    ``,
    `Activities — generate exactly three kinds, in this proportion:`,
    `- FILL_BLANK: "sentence" contains ______ where the word belongs, quoted with curly quotes. "options" holds 4 candidate words, one correct. Set answerIndex to the correct index, "pairs" null.`,
    `- IPA_MATCH: "options" holds 4 IPA transcriptions (or 4 words when the prompt gives the IPA), one correct. "pairs" null.`,
    `- TYPE_WHAT_YOU_HEAR: the learner spells the word from audio. "options" must be an empty array, answerIndex 0, "sentence" null, "pairs" null. Entries of one or two parts are both fine — a hyphen counts as a separator like a space, the keypad shows a gap there and the learner types letters only — but never choose an entry of three parts or more ("father-in-law", "maid of honor"). NEVER choose an entry whose letters, counted without spaces or hyphens, come to more than 14: the slots overflow the screen. Count before you choose — "tomorrow morning" is 15 and "yesterday afternoon" is 18, both too long, while "tonight" and "sunset" are fine.`,
    `- Never use IPA_MATCH or TYPE_WHAT_YOU_HEAR on a word that sounds the same as another word in this unit ("fiance" and "fiancee" share /ˌfiːɑːnˈseɪ/). The learner cannot hear the difference, so the question has no answer. Teach those words through FILL_BLANK or the MATCH_UP instead, where the context or the definition tells them apart.`,
    `- MATCH_UP: the learner pairs ${MATCH_PAIRS} English words with their Spanish DEFINITIONS. Fill "pairs" with exactly ${MATCH_PAIRS} objects of {en, es}, where "en" is one of this unit's words. Set "word" to the first pair's English word, "options" to an empty array, answerIndex 0, "sentence" null.`,
    `- "es" in a pair must be a short Spanish definition that describes what the word IS — "Órgano que bombea la sangre por el cuerpo", not "el corazón". Never put the translation there: pairing a word with its own translation is recognition, not comprehension, and a learner can solve it without understanding anything. Aim for 5 to 12 words, and do not name the word itself inside its definition.`,
    `- The ${MATCH_PAIRS} definitions must be clearly different from one another, or the exercise is guesswork.`,
    // Budgeted, not "about N". A match-up is three gradeable items, so the
    // shape we want is (MAX_ITEMS - MATCH_PAIRS) single questions plus one
    // match-up. Coverage is what the unit is graded on, and the cap cannot be
    // trimmed later: the score is correct/activities over the whole unit.
    `Produce exactly one MATCH_UP activity, plus at most ${MAX_ITEMS - MATCH_PAIRS} single-word activities (FILL_BLANK, IPA_MATCH or TYPE_WHAT_YOU_HEAR), with at least one of each of those three kinds.`,
    `Practise EVERY word in the unit. 70% is the floor below which the unit is rejected, not the target — use the whole budget above. Only leave a word unpractised when the item limit makes it impossible, which happens solely when the unit has more words than the limit allows.`,
    `Give the MATCH_UP three words that NO other activity uses, so it adds three words to the coverage rather than repeating them. Never practise the same word twice while another word has no activity at all.`,
    `- "prompt" is English instruction text, "promptEs" its Spanish twin. "note"/"noteEs" explain the answer in one sentence after the learner answers.`,
    `- Vary which position holds the correct answer across activities; do not always put it first. (The app shuffles options anyway, but the stored data should not be lopsided.)`,
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
    // Token usage is the only handle on what generation costs. Logging it here
    // makes that visible in the server logs for every unit an admin creates.
    if (response.usage) {
      console.info(
        `[openai] ${model} · ${response.usage.prompt_tokens} in / ${response.usage.completion_tokens} out / ${response.usage.total_tokens} total`,
      );
    }
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
