/**
 * Validation of an AI-generated unit before an administrator saves it.
 *
 * Errors block the save; warnings are surfaced but the administrator may accept
 * them, since "the model found only 7 good words for this topic" is a judgement
 * call, not a bug.
 */
import {
  MAX_WORDS,
  MIN_WORDS,
  type GeneratedUnit,
} from "@/lib/unit-schema";

export type Issue = { level: "error" | "warning"; message: string };

export type ValidateInput = {
  wordCount: number;
  wordList?: string[];
};

const normalize = (s: string) => s.trim().toLowerCase();

export function validateGeneratedUnit(
  unit: GeneratedUnit,
  input: ValidateInput,
): Issue[] {
  const issues: Issue[] = [];
  const words = unit.words.map((w) => normalize(w.text));

  // ── Word count ────────────────────────────────────────────────────────────
  // An explicit list outranks the requested count, so the expected size is the
  // larger of the two.
  const expected = Math.max(input.wordCount, input.wordList?.length ?? 0);
  if (words.length < MIN_WORDS) {
    issues.push({
      level: "error",
      message: `Only ${words.length} words were generated; a unit needs at least ${MIN_WORDS}.`,
    });
  } else if (words.length > MAX_WORDS) {
    issues.push({
      level: "error",
      message: `${words.length} words were generated; the maximum is ${MAX_WORDS}.`,
    });
  } else if (words.length !== expected) {
    issues.push({
      level: "warning",
      message: `${words.length} words were generated, ${expected} were requested.`,
    });
  }

  // ── Duplicates ────────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const w of words) {
    if (seen.has(w)) duplicates.add(w);
    seen.add(w);
  }
  if (duplicates.size) {
    issues.push({
      level: "error",
      message: `Duplicate words: ${[...duplicates].join(", ")}.`,
    });
  }

  // ── Mandatory list honoured ───────────────────────────────────────────────
  if (input.wordList?.length) {
    const missing = input.wordList
      .map(normalize)
      .filter((w) => w && !seen.has(w));
    if (missing.length) {
      issues.push({
        level: "error",
        message: `These requested words are missing: ${missing.join(", ")}.`,
      });
    }
  }

  // ── Per-word completeness ─────────────────────────────────────────────────
  for (const w of unit.words) {
    if (!w.ipa.includes("/")) {
      issues.push({
        level: "warning",
        message: `"${w.text}" has an IPA transcription without slashes: ${w.ipa}`,
      });
    }
  }

  // ── Activities ────────────────────────────────────────────────────────────
  if (!unit.activities.length) {
    issues.push({ level: "error", message: "No practice activities were generated." });
  }

  const orphans = unit.activities
    .map((a) => normalize(a.word))
    .filter((w) => !seen.has(w));
  if (orphans.length) {
    issues.push({
      level: "error",
      message: `Activities reference words that are not in the unit: ${[
        ...new Set(orphans),
      ].join(", ")}.`,
    });
  }

  for (const a of unit.activities) {
    if (a.type === "TYPE_WHAT_YOU_HEAR") {
      if (a.options.length) {
        issues.push({
          level: "warning",
          message: `"Type what you hear" for "${a.word}" came back with options; they will be dropped.`,
        });
      }
      continue;
    }
    if (a.options.length < 2) {
      issues.push({
        level: "error",
        message: `Activity for "${a.word}" has fewer than 2 options.`,
      });
      continue;
    }
    if (a.answerIndex < 0 || a.answerIndex >= a.options.length) {
      issues.push({
        level: "error",
        message: `Activity for "${a.word}" points at option ${a.answerIndex}, which does not exist.`,
      });
    }
    if (new Set(a.options.map(normalize)).size !== a.options.length) {
      issues.push({
        level: "warning",
        message: `Activity for "${a.word}" repeats an option.`,
      });
    }
    if (a.type === "FILL_BLANK" && !a.sentence?.includes("___")) {
      issues.push({
        level: "warning",
        message: `Fill-in-the-blank for "${a.word}" has no blank in its sentence.`,
      });
    }
  }

  const kinds = new Set(unit.activities.map((a) => a.type));
  for (const kind of ["FILL_BLANK", "IPA_MATCH", "TYPE_WHAT_YOU_HEAR"] as const) {
    if (!kinds.has(kind)) {
      issues.push({
        level: "warning",
        message: `No ${kind} activity was generated.`,
      });
    }
  }

  // ── Paragraph coverage ────────────────────────────────────────────────────
  const paragraph = normalize(unit.introParagraph);
  const uncovered = words.filter((w) => !paragraph.includes(w.slice(0, Math.max(4, w.length - 2))));
  if (uncovered.length > Math.floor(words.length / 2)) {
    issues.push({
      level: "warning",
      message: `The paragraph uses few of the unit words (missing ${uncovered.length} of ${words.length}).`,
    });
  }

  return issues;
}

export function hasBlockingIssue(issues: Issue[]): boolean {
  return issues.some((i) => i.level === "error");
}
