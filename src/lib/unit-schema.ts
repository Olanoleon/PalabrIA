/**
 * The shape of an AI-generated unit, with no framework or SDK imports so both
 * the server-side generator and the pure validator can share it.
 */
import { z } from "zod";

export const MIN_WORDS = 4;
export const MAX_WORDS = 12;

export const ACTIVITY_TYPES = [
  "FILL_BLANK",
  "IPA_MATCH",
  "TYPE_WHAT_YOU_HEAR",
] as const;

export const WordSchema = z.object({
  text: z.string().min(1),
  translation: z.string().min(1),
  definition: z.string().min(1),
  definitionEs: z.string().min(1),
  ipa: z.string().min(1),
  syllables: z.string().min(1),
  stress: z.string().min(1),
  pos: z.string().min(1),
  exampleSentence: z.string().min(1),
  exampleSentenceEs: z.string().min(1),
});

export const ActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  word: z.string().min(1),
  prompt: z.string().min(1),
  promptEs: z.string().min(1),
  sentence: z.string().nullable(),
  options: z.array(z.string()),
  answerIndex: z.number().int().min(0),
  note: z.string().min(1),
  noteEs: z.string().min(1),
});

export const UnitSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  subtitleEs: z.string().min(1),
  introParagraph: z.string().min(1),
  introParagraphEs: z.string().min(1),
  words: z.array(WordSchema).min(1),
  activities: z.array(ActivitySchema).min(1),
});

export type GeneratedWord = z.infer<typeof WordSchema>;
export type GeneratedActivity = z.infer<typeof ActivitySchema>;
export type GeneratedUnit = z.infer<typeof UnitSchema>;

/**
 * JSON schema for OpenAI structured outputs, written by hand rather than
 * derived: strict mode requires `additionalProperties: false` and every
 * property listed as required, which generic zod converters tend to get subtly
 * wrong.
 */
export const UNIT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "subtitle",
    "subtitleEs",
    "introParagraph",
    "introParagraphEs",
    "words",
    "activities",
  ],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    subtitleEs: { type: "string" },
    introParagraph: { type: "string" },
    introParagraphEs: { type: "string" },
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "text",
          "translation",
          "definition",
          "definitionEs",
          "ipa",
          "syllables",
          "stress",
          "pos",
          "exampleSentence",
          "exampleSentenceEs",
        ],
        properties: {
          text: { type: "string" },
          translation: { type: "string" },
          definition: { type: "string" },
          definitionEs: { type: "string" },
          ipa: { type: "string" },
          syllables: { type: "string" },
          stress: { type: "string" },
          pos: { type: "string" },
          exampleSentence: { type: "string" },
          exampleSentenceEs: { type: "string" },
        },
      },
    },
    activities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "word",
          "prompt",
          "promptEs",
          "sentence",
          "options",
          "answerIndex",
          "note",
          "noteEs",
        ],
        properties: {
          type: { type: "string", enum: ACTIVITY_TYPES },
          word: { type: "string" },
          prompt: { type: "string" },
          promptEs: { type: "string" },
          sentence: { type: ["string", "null"] },
          options: { type: "array", items: { type: "string" } },
          answerIndex: { type: "integer" },
          note: { type: "string" },
          noteEs: { type: "string" },
        },
      },
    },
  },
} as const;
