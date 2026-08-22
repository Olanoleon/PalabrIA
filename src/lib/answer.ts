/**
 * How a typed answer is compared with the word it should spell.
 *
 * Pure and shared, because this comparison exists in three places — the
 * authoritative grader in `progress.ts`, the feedback-only grader in
 * `actions/practice.ts`, and the client that decides when the slots are full.
 * They drifting apart is exactly the bug `grading.test.ts` was written to
 * catch.
 *
 * Whitespace and hyphens are dropped on both sides. Vocabulary entries may be
 * two parts ("dining room", "in-laws"), but the letter keypad has only letters:
 * the learner types letters alone and the gap between slot groups is drawn for
 * them. A hyphen is a separator the learner cannot tap, so it is treated
 * exactly like a space rather than becoming an untypeable tile.
 */

/** Splits an entry into its typeable parts: "father-in-law" -> 3 parts. */
const SEPARATOR = /[\s\u2010-\u2015-]+/;

/** The word with every separator removed, lower-cased. */
export function lettersOnly(text: string): string {
  return text.replace(new RegExp(SEPARATOR, "g"), "").toLowerCase();
}

/**
 * Letters per part, so "dining room" is [6, 4] and "in-laws" is [2, 4].
 *
 * Drives the slot groups on the dictation screen; the gap between groups
 * stands in for the space or hyphen.
 */
export function segmentsOf(text: string): number[] {
  return text
    .trim()
    .split(SEPARATOR)
    .filter(Boolean)
    .map((part) => part.length);
}

/** How many parts the entry has. Two is the most the dictation UI supports. */
export function wordCountOf(text: string): number {
  return segmentsOf(text).length;
}

/** Whether a typed answer spells the target, ignoring spacing and case. */
export function sameSpelling(typed: string, target: string): boolean {
  const a = lettersOnly(typed);
  return a.length > 0 && a === lettersOnly(target);
}
