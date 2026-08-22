/**
 * Validation of an AI-generated unit before an administrator saves it.
 *
 * Errors block the save; warnings are surfaced but the administrator may accept
 * them, since "the model found only 7 good words for this topic" is a judgement
 * call, not a bug.
 */
import { lettersOnly, wordCountOf } from "@/lib/answer";
import {
  ACTIVITY_TYPES,
  MATCH_PAIRS,
  MAX_ITEMS,
  MAX_WORDS,
  MIN_COVERAGE,
  MIN_WORDS,
  type GeneratedActivity,
  type GeneratedUnit,
} from "@/lib/unit-schema";

export type Issue = { level: "error" | "warning"; message: string };

export type ValidateInput = {
  wordCount: number;
  wordList?: string[];
};

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Every word an activity actually practises.
 *
 * One for the single-answer types; all three for a match-up, whose `word` field
 * is only an anchor for the first pair.
 */
/** IPA stripped of slashes and spacing, for comparing two transcriptions. */
const ipaKey = (ipa: string) => ipa.replace(/[\s/]+/g, "").toLowerCase();

function practisedWords(a: GeneratedActivity): string[] {
  if (a.type === "MATCH_UP") return (a.pairs ?? []).map((p) => normalize(p.en));
  return [normalize(a.word)];
}

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
    .flatMap(practisedWords)
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
    if (a.type === "MATCH_UP") {
      const pairs = a.pairs ?? [];
      if (pairs.length !== MATCH_PAIRS) {
        issues.push({
          level: "error",
          message: `Match-up has ${pairs.length} pairs; it needs exactly ${MATCH_PAIRS}.`,
        });
      }
      if (new Set(pairs.map((pair) => normalize(pair.en))).size !== pairs.length) {
        issues.push({
          level: "error",
          message: "Match-up repeats an English word.",
        });
      }
      // Two identical meanings make one of the pairings unanswerable rather
      // than merely hard.
      if (new Set(pairs.map((pair) => normalize(pair.es))).size !== pairs.length) {
        issues.push({
          level: "error",
          message: "Match-up repeats a Spanish meaning, so a pairing is ambiguous.",
        });
      }
      for (const pair of pairs) {
        // Pairing a word with its own translation is recognition, not
        // comprehension — the learner can solve it without understanding
        // anything. The exercise is word-to-definition.
        const entry = unit.words.find((w) => normalize(w.text) === normalize(pair.en));
        if (entry && normalize(pair.es) === normalize(entry.translation)) {
          issues.push({
            level: "error",
            message: `Match-up pairs "${pair.en}" with its translation ("${pair.es}") instead of a definition.`,
          });
        }
        if (pair.es.trim().split(/\s+/).length < 3) {
          issues.push({
            level: "warning",
            message: `Match-up definition for "${pair.en}" is very short ("${pair.es}"); it should describe the word, not name it.`,
          });
        }
      }
      continue;
    }
    if (a.type === "TYPE_WHAT_YOU_HEAR") {
      if (a.options.length) {
        issues.push({
          level: "warning",
          message: `"Type what you hear" for "${a.word}" came back with options; they will be dropped.`,
        });
      }
      // The keypad has no space key, but it does not need one: the slots are
      // drawn as one group per word and the learner types letters only. Two
      // words fit on a phone; three run off the edge.
      // Past 14 letters the slots wrap to a third row and crowd out the
      // keypad. This was a warning first, on the theory that a small unit
      // might have nothing shorter — but the model kept reaching for
      // "great-grandfather" in a unit where every other word was shorter, and
      // a preference it ignores is not a rule. Blocking costs a retry; a unit
      // with genuinely nothing shorter loses its dictation, which is only a
      // missing-kind warning.
      if (lettersOnly(a.word).length > 14) {
        issues.push({
          level: "error",
          message: `"Type what you hear" cannot use "${a.word}": ${lettersOnly(a.word).length} letters overflows the slots on a phone. Choose a shorter word.`,
        });
      }
      if (wordCountOf(a.word) > 2) {
        issues.push({
          level: "error",
          message: `"Type what you hear" cannot use "${a.word}": the letter keypad handles at most two words.`,
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

  // ── Homophones ────────────────────────────────────────────────────────────
  // Two words that sound identical ("fiance" and "fiancee", /ˌfiːɑːnˈseɪ/)
  // cannot be told apart by ear, so the two phonetic exercise types become
  // unanswerable — the learner is guessing, not demonstrating anything. Both
  // words are still perfectly good in a sentence or against a definition,
  // which is where the distinction actually lives.
  const byIpa = new Map<string, string[]>();
  for (const w of unit.words) {
    const key = ipaKey(w.ipa);
    byIpa.set(key, [...(byIpa.get(key) ?? []), w.text]);
  }
  const homophones = new Set(
    [...byIpa.values()]
      .filter((group) => group.length > 1)
      .flatMap((group) => group.map(normalize)),
  );
  for (const a of unit.activities) {
    if (a.type !== "IPA_MATCH" && a.type !== "TYPE_WHAT_YOU_HEAR") continue;
    if (!homophones.has(normalize(a.word))) continue;
    const twins = unit.words
      .filter((w) => ipaKey(w.ipa) === ipaKey(
        unit.words.find((x) => normalize(x.text) === normalize(a.word))?.ipa ?? "",
      ))
      .map((w) => w.text);
    issues.push({
      level: "error",
      message: `${a.type} cannot use "${a.word}": it sounds identical to ${twins
        .filter((t) => normalize(t) !== normalize(a.word))
        .join(", ")} in this unit, so the answer cannot be heard.`,
    });
  }

  const kinds = new Set(unit.activities.map((a) => a.type));
  // Iterating the enum rather than a hand-kept list, so a future type cannot be
  // silently forgotten here.
  for (const kind of ACTIVITY_TYPES) {
    if (kind === "MATCH_UP") continue;
    if (!kinds.has(kind)) {
      issues.push({
        level: "warning",
        message: `No ${kind} activity was generated.`,
      });
    }
  }

  // ── Match-up, item budget and word coverage ───────────────────────────────
  const matchUps = unit.activities.filter((a) => a.type === "MATCH_UP");
  if (matchUps.length !== 1) {
    issues.push({
      level: "error",
      message: `A unit needs exactly one match-up activity; this one has ${matchUps.length}.`,
    });
  }

  const items = unit.activities.reduce(
    (total, a) => total + (a.type === "MATCH_UP" ? (a.pairs?.length ?? 0) : 1),
    0,
  );
  if (items > MAX_ITEMS) {
    issues.push({
      level: "error",
      message: `The unit has ${items} gradeable items; the maximum is ${MAX_ITEMS} (a match-up counts as its ${MATCH_PAIRS} pairs).`,
    });
  }

  // Distinct words, not activity rows: ten activities on two words is not
  // coverage. A match-up contributes all three of its words.
  const practised = new Set(unit.activities.flatMap(practisedWords));
  const covered = words.filter((w) => practised.has(w)).length;
  const required = Math.ceil(words.length * MIN_COVERAGE);
  if (words.length > 0 && covered < required) {
    issues.push({
      level: "error",
      message: `Only ${covered} of ${words.length} words are practised; at least ${required} must be.`,
    });
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
