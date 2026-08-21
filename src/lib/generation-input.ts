import type { Difficulty } from "@/generated/prisma";

export type StoredGenerationInput = {
  wordCount?: number;
  difficulty?: Difficulty;
  topic?: string;
  wordList?: string[];
};

const DIFFICULTIES = ["VERY_EASY", "EASY", "MEDIUM", "HARD"] as const;

/**
 * Reads back the request that produced a unit.
 *
 * Deliberately forgiving: the column is Json, units seeded by hand have none at
 * all, and the shape has already differed slightly between the console and the
 * seeding script. Anything unrecognised simply comes back undefined and the
 * form falls back to its own defaults.
 */
export function readGenerationInput(value: unknown): StoredGenerationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  const wordCount =
    typeof raw.wordCount === "number" && Number.isFinite(raw.wordCount)
      ? raw.wordCount
      : undefined;

  const difficulty = DIFFICULTIES.includes(raw.difficulty as Difficulty)
    ? (raw.difficulty as Difficulty)
    : undefined;

  const topic = typeof raw.topic === "string" && raw.topic ? raw.topic : undefined;

  const wordList = Array.isArray(raw.wordList)
    ? raw.wordList.filter((w): w is string => typeof w === "string")
    : undefined;

  return { wordCount, difficulty, topic, wordList: wordList?.length ? wordList : undefined };
}
